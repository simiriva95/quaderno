import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useNavigate } from '../lib/router'
import { AnimatePresence, motion } from 'motion/react'
import { OpeningTransition, type FlyRect } from '../components/notebook/OpeningTransition'
import { Shelf2DFallback } from '../components/shelf/Shelf2DFallback'
import { ShelfEmpty, ShelfSkeleton } from '../components/shelf/ShelfSkeleton'
import { SettingsSheet } from '../components/ui/SettingsSheet'
import { useSound } from '../hooks/useSound'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { PER_SHELF, PER_SHELF_NARROW } from '../components/shelf/geometry'
import { useNotebooks } from '../store/notebooks'
import { useUi } from '../store/ui'

// three vive in un chunk suo: la mensola è l'unica schermata che lo paga.
const ShelfScene = lazy(() => import('../components/shelf/ShelfScene'))

const hasWebGL = (): boolean => {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export default function Shelf() {
  const navigate = useNavigate()
  const notebooks = useNotebooks((s) => s.notebooks)
  const reduced = useReducedMotion()
  const wide = useMediaQuery('(min-width: 700px)')
  const perShelf = wide ? PER_SHELF : PER_SHELF_NARROW
  const [webgl] = useState(hasWebGL)
  const setShelfRect = useUi((s) => s.setShelfRect)
  const play = useSound()
  const [focusIndex, setFocusIndex] = useState(0)
  const [keyboardNav, setKeyboardNav] = useState(false)
  const [hoverTitle, setHoverTitle] = useState<string | null>(null)

  // Il quaderno appena creato cade dall'alto: lo sappiamo perché è il più
  // recente e non l'abbiamo ancora visto atterrare in questa sessione.
  const [justCreatedId] = useState(() => {
    const last = notebooks[notebooks.length - 1]
    if (!last) return null
    return Date.now() - last.createdAt < 4000 ? last.id : null
  })

  // L'apertura non è una navigazione: è un quaderno che esce dalla fila.
  // La rotta cambia solo quando l'animazione ha finito.
  const [opening, setOpening] = useState<{ id: string; from: FlyRect } | null>(null)

  // il "tump" del quaderno che si posa, una volta sola
  useEffect(() => {
    if (justCreatedId) play('thump')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const open = useCallback(
    (id: string, from?: FlyRect) => {
      setShelfRect(from ?? null)
      play('page')
      if (reduced || !from) {
        navigate(`/q/${id}`)
        return
      }
      setOpening({ id, from })
    },
    [navigate, reduced, setShelfRect, play],
  )
  const add = useCallback(() => navigate('/nuovo'), [navigate])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (notebooks.length === 0) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        setKeyboardNav(true)
        setFocusIndex((i) => (keyboardNav ? Math.min(notebooks.length - 1, i + 1) : i))
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setKeyboardNav(true)
        setFocusIndex((i) => (keyboardNav ? Math.max(0, i - 1) : i))
      }
      if (e.key === 'Enter') {
        const n = notebooks[focusIndex]
        if (n) open(n.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [notebooks, focusIndex, keyboardNav, open])

  const use3D = webgl && !reduced
  const openingNotebook = notebooks.find((n) => n.id === opening?.id)

  return (
    <main className="relative flex h-dvh flex-col bg-desk">
      <header className="flex items-center justify-between px-lg py-md">
        <h1 className="font-hand text-xl text-ink">I miei quaderni</h1>
        <div className="flex items-center gap-sm">
          {notebooks.length > 0 && (
            <p className="text-xs text-graphite">
              {notebooks.length} {notebooks.length === 1 ? 'quaderno' : 'quaderni'}
            </p>
          )}
          <SettingsSheet />
        </div>
      </header>

      {/* Le frecce muovono la selezione, Invio apre: la mensola si usa da tastiera
          come si usa col mouse. La lista sotto è ciò che legge uno screen reader. */}
      <section
        className="relative min-h-0 flex-1"
        tabIndex={notebooks.length ? 0 : -1}
        role="application"
        aria-label="Mensola dei quaderni. Frecce per scegliere, Invio per aprire."
      >
        {/* La mensola vuota è comunque la stanza in 3D: il posto tratteggiato
            aspetta, la tazza e la pianta ci sono già. Il 2D resta per chi non
            ha WebGL o preferisce meno movimento. */}
        {notebooks.length === 0 && !use3D ? (
          <ShelfEmpty onCreate={add} />
        ) : use3D ? (
          <Suspense fallback={<ShelfSkeleton />}>
            <ShelfScene
              notebooks={notebooks}
              focusIndex={keyboardNav ? focusIndex : -1}
              justCreatedId={justCreatedId}
              leavingId={opening?.id ?? null}
              perShelf={perShelf}
              onOpen={open}
              onHover={setHoverTitle}
              onAdd={add}
            />
          </Suspense>
        ) : (
          <Shelf2DFallback
            notebooks={notebooks}
            focusIndex={keyboardNav ? focusIndex : -1}
            perShelf={perShelf}
            onOpen={open}
            onAdd={add}
          />
        )}

        {notebooks.length === 0 && use3D && (
          <div className="pointer-events-none absolute inset-x-0 bottom-[7%] flex flex-col items-center gap-sm">
            <p className="font-hand text-lg text-ink">La mensola aspetta il primo quaderno.</p>
            <button
              type="button"
              onClick={add}
              className="pointer-events-auto h-14 rounded-md bg-ink px-xl text-sm font-semibold text-paper shadow-lift transition-transform hover:-translate-y-0.5"
            >
              Crea il tuo primo quaderno
            </button>
          </div>
        )}

        <AnimatePresence>
          {hoverTitle && (
            <motion.p
              key={hoverTitle}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-none absolute inset-x-0 bottom-lg text-center font-hand text-base text-ink"
            >
              {hoverTitle}
            </motion.p>
          )}
        </AnimatePresence>
      </section>

      {opening && openingNotebook && (
        <OpeningTransition
          notebook={openingNotebook}
          from={opening.from}
          onDone={() => navigate(`/q/${opening.id}`)}
        />
      )}

      {/* Elenco testuale: la scena 3D non è navigabile da screen reader, questa sì. */}
      {notebooks.length > 0 && (
        <ul className="sr-only">
          {notebooks.map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => open(n.id)}>
                Apri {n.title}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
