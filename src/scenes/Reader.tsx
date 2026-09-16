import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from '../lib/router'
import { NotebookHeader } from '../components/notebook/NotebookHeader'
import { OpeningTransition } from '../components/notebook/OpeningTransition'
import { PageFlip, type Leaf } from '../components/notebook/PageFlip'
import { PaperPage } from '../components/notebook/PaperPage'
import { DrawCanvas } from '../components/draw/DrawCanvas'
import { PencilCase } from '../components/draw/PencilCase'
import { InkToolbar } from '../components/text/InkToolbar'
import { TextPage, type CaretTarget } from '../components/text/TextPage'
import { useAutosaveIndicator } from '../hooks/useAutosaveIndicator'
import { useFitScale } from '../hooks/useFitScale'
import { useHandSize } from '../hooks/useHandSize'
import { useIsSpread, useMediaQuery } from '../hooks/useMediaQuery'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useSound } from '../hooks/useSound'
import { useTextPagination } from '../hooks/useTextPagination'
import { useZoomPan } from '../hooks/useZoomPan'
import type { useDrawingCanvas } from '../hooks/useDrawingCanvas'
import { GUTTER, PAGE_H, PAGE_W, TEXT_H, TEXT_W } from '../lib/constants'
import { usePrefs } from '../store/prefs'
import { useNotebooks } from '../store/notebooks'
import { useUi } from '../store/ui'

export default function Reader({ id }: { id: string }) {
  const navigate = useNavigate()
  const notebook = useNotebooks((s) => s.notebooks.find((n) => n.id === id))
  const renameNotebook = useNotebooks((s) => s.renameNotebook)
  const appendPage = useNotebooks((s) => s.appendPage)
  const setPageStrokes = useNotebooks((s) => s.setPageStrokes)
  const setLastOpenedPage = useNotebooks((s) => s.setLastOpenedPage)
  const clearPage = useNotebooks((s) => s.clearPage)
  const removeNotebook = useNotebooks((s) => s.removeNotebook)

  const shelfRect = useUi((s) => s.shelfRect)
  const [closing, setClosing] = useState(false)
  const mode = useUi((s) => s.mode)
  const setMode = useUi((s) => s.setMode)
  const tool = usePrefs((s) => s.tool)
  const toolColor = usePrefs((s) => s.toolColor)
  const toolSize = usePrefs((s) => s.toolSize)

  const isSpread = useIsSpread()
  const wide = useMediaQuery('(min-width: 640px)')
  const reduced = useReducedMotion()
  const step = isSpread ? 2 : 1
  const contentW = isSpread ? PAGE_W * 2 + GUTTER : PAGE_W
  const drawing = mode === 'draw'

  const [index, setIndex] = useState(() => notebook?.lastOpenedPageIndex ?? 0)
  const [pending, setPending] = useState<number | null>(null)
  const [leaf, setLeaf] = useState<Leaf | null>(null)
  const [caretTarget, setCaretTarget] = useState<CaretTarget | null>(null)

  // il margine lascia posto all'astuccio laterale e alle frecce; sul telefono
  // le frecce non ci sono (angoli e swipe) e la pagina si prende tutto
  // ai lati il margine fa posto alle frecce; sopra e sotto solo un filo d'aria:
  // il quaderno aperto si prende tutto lo spazio che c'è
  const { ref: fitRef, scale, size: fitSize } = useFitScale(contentW, PAGE_H, wide ? 56 : 6, 6)
  const { state: saveState, ping } = useAutosaveIndicator()
  const reflow = useTextPagination(notebook, TEXT_W, TEXT_H)
  const play = useSound()
  const editorsRef = useRef<HTMLDivElement>(null)

  // Registro delle API di disegno, una per pagina visibile. Vive in un ref:
  // l'astuccio deve poter chiamare undo senza far rirenderizzare la pagina.
  type DrawApi = ReturnType<typeof useDrawingCanvas>
  const drawApis = useRef(new Map<number, DrawApi>())
  const [activeDrawPage, setActiveDrawPage] = useState(0)
  const activeApi = () => drawApis.current.get(activeDrawPage)
  // ── Zoom a passi ──────────────────────────────────────────────────────
  // Livelli: tutto → una pagina → un quarto di pagina. Sul telefono la
  // pagina è già tutto, quindi si va dritti ai quarti. Le frecce, quando si
  // è zoomati, scorrono le zone in ordine di lettura e poi girano pagina.
  type ZoomLevel = 'page' | 'quarter'
  type Region = { level: ZoomLevel; page: number; quad: number }
  const [zoom, setZoom] = useState<Region | null>(null)
  const regionsRef = useRef<Region[]>([])
  const { viewport, handlers: zoomHandlers, zoomed: pinched } = useZoomPan(drawing && !zoom)
  const textSize = useHandSize()

  const pages = notebook?.pages ?? []
  const total = pages.length

  // l'indice di partenza arriva dal quaderno, ma va allineato allo spread
  useEffect(() => {
    if (!notebook) return
    const start = Math.min(notebook.lastOpenedPageIndex, Math.max(0, notebook.pages.length - 1))
    setIndex(isSpread ? start - (start % 2) : start)
  }, [notebook?.id, isSpread]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (notebook) setLastOpenedPage(notebook.id, index)
  }, [notebook?.id, index, setLastOpenedPage]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cambiato il corpo, le pagine erano tagliate per un altro: si riversano.
  // Ogni chiamata fa cascata fin dove serve; le successive trovano già tutto
  // al suo posto e si fermano subito.
  useEffect(() => {
    if (!notebook) return
    const n = notebook.pages.length
    for (let i = 0; i < n; i++) {
      const fresh = useNotebooks.getState().notebooks.find((x) => x.id === notebook.id)
      const text = fresh?.pages[i]?.text
      if (text) reflow(i, text, null)
    }
  }, [textSize, notebook?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Si può andare avanti se c'è una pagina dopo, oppure se l'ultima ha
  // qualcosa scritto: allora il quaderno ne aggiunge una, come se fosse
  // rilegato. Un'ultima pagina bianca non ne chiama un'altra.
  const lastHasContent = (() => {
    const last = pages[total - 1]
    return Boolean(last && (last.text || last.strokes.length))
  })()
  const canGoBack = index > 0
  const canGoNext = index + step < total || lastHasContent

  const go = useCallback(
    (dir: 1 | -1) => {
      if (!notebook || leaf) return

      // zoomati: prima si scorrono le zone della pagina, poi si gira
      if (zoom) {
        const list = regionsRef.current
        const i = list.findIndex((r) => r.page === zoom.page && r.quad === zoom.quad)
        const next = list[i + dir]
        if (next) {
          setZoom(next)
          return
        }
      }

      const target = index + dir * step
      if (target < 0) return
      if (dir === 1 && !canGoNext) return
      play('page')

      // in doppia pagina il salto è di due: si rilegano tutte quelle che servono
      for (let k = total; k <= target; k++) appendPage(notebook.id)

      // zoomati si riparte dalla prima (o ultima) zona della nuova pagina,
      // e la pagina cambia secca: il foglio che gira non si legge da vicino
      if (zoom) {
        const list = regionsRef.current
        setZoom(dir === 1 ? list[0]! : list[list.length - 1]!)
      }

      if (reduced || zoom) {
        setIndex(target)
        return
      }

      // spread: gira la pagina destra (avanti) o la sinistra (indietro).
      // singola: avanti se ne va la pagina corrente, indietro rientra quella nuova.
      const front = isSpread ? (dir === 1 ? index + 1 : index) : dir === 1 ? index : target
      const back = isSpread ? (dir === 1 ? index + 2 : index - 1) : -1
      setPending(target)
      setLeaf({
        key: `${index}-${dir}`,
        direction: dir,
        spread: isSpread,
        front: (
          <StaticPage
            pageIndex={front}
            side={isSpread ? (dir === 1 ? 'right' : 'left') : 'single'}
          />
        ),
        back: <StaticPage pageIndex={back} side={dir === 1 ? 'left' : 'right'} />,
      })
    },
    // StaticPage è definita sotto e chiude su `pages`/`notebook`: la dipendenza
    // reale è il quaderno, non il componente.
    [notebook, leaf, index, step, total, canGoNext, appendPage, reduced, isSpread, play, zoom], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const finishFlip = useCallback(() => {
    setIndex((i) => pending ?? i)
    setPending(null)
    setLeaf(null)
  }, [pending])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      if (el instanceof HTMLElement && (el.isContentEditable || el.tagName === 'INPUT')) return
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === '+' || e.key === '=') zoomInRef.current()
      if (e.key === '-') zoomOutRef.current()
      if (e.key === 'Escape') setZoom(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const swipe = useRef(0)
  // le funzioni di zoom sono definite più sotto (dipendono dal layout):
  // il listener da tastiera le raggiunge tramite ref
  const zoomInRef = useRef<() => void>(() => {})
  const zoomOutRef = useRef<() => void>(() => {})

  const handleInput = useCallback(
    (pageIndex: number, html: string, caret: number | null) => {
      const result = reflow(pageIndex, html, caret)
      ping()
      play('pencil')
      if (result.caretPage !== pageIndex) {
        const targetSpread = isSpread ? result.caretPage - (result.caretPage % 2) : result.caretPage
        if (targetSpread !== index) setIndex(targetSpread)
        setCaretTarget({ page: result.caretPage, offset: result.caretOffset })
      }
    },
    [reflow, ping, isSpread, index, play],
  )

  const pagesOnScreen = isSpread ? 2 : 1
  const regions: Region[] = []
  if (zoom?.level === 'page')
    for (let p = 0; p < pagesOnScreen; p++) regions.push({ level: 'page', page: p, quad: 0 })
  if (zoom?.level === 'quarter')
    for (let p = 0; p < pagesOnScreen; p++)
      for (let q = 0; q < 4; q++) regions.push({ level: 'quarter', page: p, quad: q })
  regionsRef.current = regions
  const sameRegion = (a: Region | null, b: Region | undefined) =>
    !!a && !!b && a.page === b.page && a.quad === b.quad
  const atFirstRegion = sameRegion(zoom, regions[0])
  const atLastRegion = sameRegion(zoom, regions[regions.length - 1])

  /** Dove sta il cursore: pagina (0/1 a schermo) e quarto. Se non c'è, 0. */
  const caretSpot = () => {
    const sel = document.getSelection()
    const node = sel?.anchorNode
    const el = node instanceof Element ? node : node?.parentElement
    const editor = el?.closest<HTMLElement>('[contenteditable]')
    const box = editorsRef.current?.getBoundingClientRect()
    if (!editor || !box || !sel || sel.rangeCount === 0) return { page: 0, quad: 0 }
    const r = sel.getRangeAt(0).getBoundingClientRect()
    const rect = r.width || r.height ? r : editor.getBoundingClientRect()
    const fx = (rect.left - box.left) / box.width
    const fy = (rect.top - box.top) / box.height
    const page = Math.min(pagesOnScreen - 1, Math.max(0, Math.floor(fx * pagesOnScreen)))
    const inPage = fx * pagesOnScreen - page
    const quad = (inPage < 0.5 ? 0 : 1) + (fy < 0.5 ? 0 : 2)
    return { page, quad }
  }
  const zoomIn = () => {
    const spot = caretSpot()
    if (!zoom)
      setZoom(
        isSpread ? { level: 'page', page: spot.page, quad: 0 } : { level: 'quarter', ...spot },
      )
    else if (zoom.level === 'page')
      setZoom({
        level: 'quarter',
        page: zoom.page,
        quad: spot.page === zoom.page ? spot.quad : 0,
      })
  }
  const zoomOut = () => {
    if (!zoom) return
    if (zoom.level === 'quarter' && isSpread) setZoom({ level: 'page', page: zoom.page, quad: 0 })
    else setZoom(null)
  }
  const zoomLabel = !zoom ? 'Tutto' : zoom.level === 'page' ? 'Pagina' : 'Quarto'
  zoomInRef.current = zoomIn
  zoomOutRef.current = zoomOut

  // trasformazione della scatola: la zona scelta riempie il contenitore
  const boxW = contentW * scale
  const boxH = PAGE_H * scale
  let boxTransform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`
  if (zoom && fitSize.w > 0) {
    const pw = boxW / pagesOnScreen
    const rw = zoom.level === 'page' ? pw : pw / 2
    const rh = zoom.level === 'page' ? boxH : boxH / 2
    const rx = zoom.page * pw + (zoom.level === 'quarter' ? (zoom.quad % 2) * rw : 0)
    const ry = zoom.level === 'quarter' ? Math.floor(zoom.quad / 2) * rh : 0
    const z = Math.min((fitSize.w - 24) / rw, (fitSize.h - 24) / rh)
    const cx = rx + rw / 2 - boxW / 2
    const cy = ry + rh / 2 - boxH / 2
    boxTransform = `translate(${-cx * z}px, ${-cy * z}px) scale(${z})`
  }

  if (!notebook) {
    return (
      <main className="grid min-h-dvh place-items-center p-lg">
        <p className="font-hand text-lg text-ink">Questo quaderno non c'è più.</p>
      </main>
    )
  }

  /** Una pagina "ferma": usata per le facce del foglio che gira. */
  function StaticPage({
    pageIndex,
    side,
  }: {
    pageIndex: number
    side: 'left' | 'right' | 'single'
  }) {
    const page = pages[pageIndex]
    if (!page) return <PaperPage paper={notebook!.paper} side={side} />
    return (
      <PaperPage paper={notebook!.paper} side={side} number={pageIndex + 1}>
        <div
          className="hand-text pointer-events-none absolute"
          style={{ left: 56, top: 40, width: TEXT_W, height: TEXT_H, zIndex: 3 }}
          dangerouslySetInnerHTML={{ __html: page.text }}
        />
      </PaperPage>
    )
  }

  // Sotto il foglio che gira sta già la pagina di arrivo: quando il foglio
  // sparisce non deve cambiare niente.
  const leftIndex = leaf?.direction === -1 && pending !== null ? pending : index
  const rightIndex = leaf?.direction === 1 && pending !== null ? pending + 1 : index + 1
  const singleIndex = leaf?.direction === 1 && pending !== null ? pending : index
  const visible = isSpread ? [leftIndex, rightIndex] : [singleIndex]
  // in doppia pagina la destra si vede anche se non è ancora nata: conta
  const shown = isSpread ? Math.max(total, index + 2) : total
  const pageLabel = isSpread
    ? `Pagine ${index + 1}–${index + 2} di ${shown}`
    : `Pagina ${index + 1} di ${shown}`

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-desk">
      <h1 className="sr-only">{notebook.title || 'Quaderno'}</h1>
      <NotebookHeader
        title={notebook.title}
        onTitleChange={(t) => renameNotebook(notebook.id, t)}
        pageLabel={pageLabel}
        mode={mode}
        onModeChange={setMode}
        onBack={() => {
          if (reduced || !shelfRect) navigate('/')
          else setClosing(true)
        }}
        saveState={saveState}
        zoom={{
          canIn: !zoom || (zoom.level === 'page' && isSpread),
          canOut: zoom !== null,
          onIn: zoomIn,
          onOut: zoomOut,
          label: zoomLabel,
        }}
        clearLabel={isSpread ? 'Svuota le due pagine aperte' : 'Svuota questa pagina'}
        onClearPages={() => {
          for (const i of visible) if (pages[i]) clearPage(notebook.id, i)
          drawApis.current.forEach((api) => api.clear())
          ping()
        }}
        onDelete={() => {
          removeNotebook(notebook.id)
          navigate('/')
        }}
      />

      {/* Una riga: [astuccio] [freccia] [pagina] [freccia]. La pagina misura lo
          spazio che resta fra i vicini, così niente le si sovrappone mai. */}
      <div
        className="relative flex min-h-0 min-w-0 flex-1 items-center gap-xs overflow-hidden px-xs md:gap-sm md:px-sm"
        onTouchStart={(e) => (swipe.current = e.touches[0]?.clientX ?? 0)}
        onTouchEnd={(e) => {
          // un tratto orizzontale di matita non è uno swipe
          if (drawing) return
          const dx = (e.changedTouches[0]?.clientX ?? 0) - swipe.current
          if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1)
        }}
      >
        <div
          ref={fitRef}
          className="relative grid min-h-0 min-w-0 flex-1 self-stretch place-items-center"
        >
          {/* le frecce stanno accanto al quaderno, non ai bordi dello schermo */}
          <NavArrow
            side="left"
            offset={zoom ? fitSize.w / 2 - 60 : (contentW * scale) / 2}
            always={zoom !== null}
            disabled={!canGoBack && (!zoom || atFirstRegion)}
            onClick={() => go(-1)}
          />
          {/* la scatola occupa esattamente la pagina scalata: è lei che sta nel
              layout, la pagina dentro è a 600×840 e viene solo ridotta */}
          <div
            style={{
              width: boxW,
              height: boxH,
              transform: boxTransform,
              transition: pinched ? undefined : 'transform 260ms var(--ease-quint)',
            }}
            className="relative shrink-0 touch-none"
            {...zoomHandlers}
          >
            <div
              ref={editorsRef}
              style={{
                width: contentW,
                height: PAGE_H,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                perspective: 2400,
              }}
              className="absolute left-0 top-0"
            >
              {/* l'ombra sta sul quaderno intero, non sulle singole pagine:
                  due ombre affiancate disegnerebbero una fessura al centro */}
              <div
                className="flex h-full items-stretch"
                style={{
                  gap: isSpread ? GUTTER : 0,
                  boxShadow: 'var(--sh-lift)',
                  borderRadius: 15,
                }}
              >
                {visible.map((pageIndex, slot) => {
                  const page = pages[pageIndex]
                  const side = isSpread ? (slot === 0 ? 'left' : 'right') : 'single'
                  return (
                    <div key={`${pageIndex}-${slot}`} className="relative">
                      <PaperPage paper={notebook.paper} side={side} number={pageIndex + 1}>
                        {/* Testo e tratti convivono sempre, come su carta: in
                            disegno il testo è sotto, in sola lettura; in testo i
                            tratti restano visibili ma la matita è posata. Anche una
                            pagina che ancora non esiste si scrive: nasce al primo
                            segno (withPage la crea). */}
                        {(drawing || (page?.strokes.length ?? 0) > 0) && (
                          <DrawCanvas
                            readOnly={!drawing}
                            pageIndex={pageIndex}
                            strokes={page?.strokes ?? []}
                            onCommit={(strokes) => {
                              setPageStrokes(notebook.id, pageIndex, strokes)
                              ping()
                            }}
                            tool={tool}
                            color={`var(--c-${toolColor})`}
                            size={toolSize}
                            replay={!reduced}
                            registerApi={(i, api) => drawApis.current.set(i, api)}
                            onActivate={setActiveDrawPage}
                          />
                        )}
                        {(!drawing || (page?.text ?? '') !== '') && (
                          <TextPage
                            pageIndex={pageIndex}
                            readOnly={drawing}
                            html={page?.text ?? ''}
                            caretTarget={caretTarget}
                            onCaretApplied={() => setCaretTarget(null)}
                            onInput={(html, caret) => handleInput(pageIndex, html, caret)}
                          />
                        )}
                      </PaperPage>
                    </div>
                  )
                })}
              </div>

              {isSpread && (
                <div
                  className="spread-gutter pointer-events-none absolute inset-y-0 left-1/2 w-[56px] -translate-x-1/2"
                  aria-hidden="true"
                />
              )}

              <PageFlip leaf={leaf} onDone={finishFlip} />

              {/* Gli angoli si girano con un dito, come sulla carta: è l'affordance
                  che le frecce da sole non danno. In disegno restano fuori dai piedi. */}
              {!drawing && !zoom && canGoBack && <PageCorner side="left" onClick={() => go(-1)} />}
              {!drawing && !zoom && canGoNext && <PageCorner side="right" onClick={() => go(1)} />}
            </div>
          </div>
          <NavArrow
            side="right"
            offset={zoom ? fitSize.w / 2 - 60 : (contentW * scale) / 2}
            always={zoom !== null}
            disabled={!canGoNext && (!zoom || atLastRegion)}
            onClick={() => go(1)}
          />
        </div>
      </div>

      {closing && shelfRect && (
        <OpeningTransition
          notebook={notebook}
          from={shelfRect}
          direction="close"
          onDone={() => navigate('/')}
        />
      )}

      {/* Lo stesso vassoio in basso per testo e disegno: la pagina non si
          sposta quando prendi la matita. Altezza fissa, contenuto che cambia. */}
      <div className="flex h-[3.75rem] shrink-0 items-start justify-center pb-2xs">
        {drawing ? (
          <PencilCase
            onUndo={() => activeApi()?.undo()}
            onRedo={() => activeApi()?.redo()}
            onClear={() => activeApi()?.clear()}
            canUndo={(pages[activeDrawPage]?.strokes.length ?? 0) > 0}
            canRedo={activeApi()?.canRedo ?? false}
          />
        ) : (
          <InkToolbar
            getEditor={() =>
              editorsRef.current?.querySelector<HTMLElement>('[contenteditable="true"]') ?? null
            }
            onChanged={() => {
              const el = editorsRef.current?.querySelector<HTMLElement>('[contenteditable="true"]')
              if (el) handleInput(visible[0] ?? 0, el.innerHTML, null)
            }}
          />
        )}
      </div>
    </main>
  )
}

function NavArrow({
  side,
  offset,
  onClick,
  disabled,
  always,
}: {
  side: 'left' | 'right'
  /** metà larghezza del quaderno a schermo: la freccia si appoggia lì fuori */
  offset: number
  onClick: () => void
  disabled?: boolean
  /** anche sul telefono: zoomati, gli angoli non ci sono e serve un appiglio */
  always?: boolean
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'left' ? 'Pagina precedente' : 'Pagina successiva'}
      style={{ [side]: `calc(50% - ${offset + 62}px)` }}
      className={`absolute top-1/2 z-30 size-12 -translate-y-1/2 place-items-center rounded-full bg-paper text-ink shadow-paper transition-[opacity,transform] hover:scale-105 disabled:pointer-events-none disabled:opacity-20 ${
        always ? 'grid' : 'hidden sm:grid'
      }`}
    >
      <Icon size={24} strokeWidth={2} />
    </button>
  )
}

/** L'angolo in basso della pagina: al passaggio si solleva un po', al click
 *  gira. Vive nello spazio logico della pagina, quindi scala con lei. */
function PageCorner({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Gira alla pagina precedente' : 'Gira alla pagina successiva'}
      className={`page-corner page-corner--${side}`}
    />
  )
}
