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
  const { ref: fitRef, scale } = useFitScale(contentW, PAGE_H, wide ? 72 : 8)
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
  const { viewport, handlers: zoomHandlers, zoomed } = useZoomPan(drawing)

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
      const target = index + dir * step
      if (target < 0) return
      if (dir === 1 && !canGoNext) return
      play('page')

      // in doppia pagina il salto è di due: si rilegano tutte quelle che servono
      for (let k = total; k <= target; k++) appendPage(notebook.id)

      if (reduced) {
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
    [notebook, leaf, index, step, total, canGoNext, appendPage, reduced, isSpread, play], // eslint-disable-line react-hooks/exhaustive-deps
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
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go])

  const swipe = useRef(0)

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
  const pageLabel =
    isSpread && index + 1 < total
      ? `Pagine ${index + 1}–${index + 2} di ${total}`
      : `Pagina ${index + 1} di ${total}`

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-desk">
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
        <div ref={fitRef} className="relative grid h-full min-w-0 flex-1 place-items-center">
          {/* le frecce stanno accanto al quaderno, non ai bordi dello schermo */}
          <NavArrow
            side="left"
            offset={(contentW * scale) / 2}
            disabled={!canGoBack}
            onClick={() => go(-1)}
          />
          {/* la scatola occupa esattamente la pagina scalata: è lei che sta nel
              layout, la pagina dentro è a 600×840 e viene solo ridotta */}
          <div
            style={{
              width: contentW * scale,
              height: PAGE_H * scale,
              transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
              transition: zoomed ? undefined : 'transform 220ms var(--ease-quint)',
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
                      <PaperPage
                        paper={notebook.paper}
                        side={side}
                        number={page ? pageIndex + 1 : undefined}
                      >
                        {page && drawing && (
                          <DrawCanvas
                            pageIndex={pageIndex}
                            strokes={page.strokes}
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
                        {page && !drawing && (
                          <TextPage
                            pageIndex={pageIndex}
                            html={page.text}
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
              {!drawing && canGoBack && <PageCorner side="left" onClick={() => go(-1)} />}
              {!drawing && canGoNext && <PageCorner side="right" onClick={() => go(1)} />}
            </div>
          </div>
          <NavArrow
            side="right"
            offset={(contentW * scale) / 2}
            disabled={!canGoNext}
            onClick={() => go(1)}
          />
        </div>

        {drawing && (
          <div className="absolute inset-x-0 bottom-md z-30 flex justify-center md:static md:order-first md:shrink-0">
            <PencilCase
              onUndo={() => activeApi()?.undo()}
              onRedo={() => activeApi()?.redo()}
              onClear={() => activeApi()?.clear()}
              canUndo={(pages[activeDrawPage]?.strokes.length ?? 0) > 0}
              canRedo={activeApi()?.canRedo ?? false}
            />
          </div>
        )}
      </div>

      {closing && shelfRect && (
        <OpeningTransition
          notebook={notebook}
          from={shelfRect}
          direction="close"
          onDone={() => navigate('/')}
        />
      )}

      {/* L'astuccio sta di lato su desktop e in basso su mobile: in colonna,
          dentro la barra inferiore, schiacciava la pagina. Il portapenne del
          testo resta invece orizzontale — è un vassoio, non un astuccio. */}
      {mode === 'text' && (
        <div className="flex justify-center pb-md">
          <InkToolbar
            getEditor={() =>
              editorsRef.current?.querySelector<HTMLElement>('[contenteditable="true"]') ?? null
            }
            onChanged={() => {
              const el = editorsRef.current?.querySelector<HTMLElement>('[contenteditable="true"]')
              if (el) handleInput(visible[0] ?? 0, el.innerHTML, null)
            }}
          />
        </div>
      )}
    </main>
  )
}

function NavArrow({
  side,
  offset,
  onClick,
  disabled,
}: {
  side: 'left' | 'right'
  /** metà larghezza del quaderno a schermo: la freccia si appoggia lì fuori */
  offset: number
  onClick: () => void
  disabled?: boolean
}) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={side === 'left' ? 'Pagina precedente' : 'Pagina successiva'}
      style={{ [side]: `calc(50% - ${offset + 62}px)` }}
      className="absolute top-1/2 z-30 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-paper text-ink shadow-paper transition-[opacity,transform] hover:scale-105 disabled:pointer-events-none disabled:opacity-20 sm:grid"
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
