import { Brush, Eraser, Highlighter, Pen, Pencil, Redo2, Trash2, Undo2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { COVER_COLORS, INK_COLORS, SPRING, STROKE_SIZES } from '../../lib/constants'
import { usePrefs } from '../../store/prefs'
import type { DrawTool } from '../../types'

const TOOLS: { id: DrawTool; label: string; Icon: typeof Pencil }[] = [
  { id: 'pencil', label: 'Matita', Icon: Pencil },
  { id: 'pen', label: 'Penna', Icon: Pen },
  { id: 'marker', label: 'Pennarello', Icon: Brush },
  { id: 'highlighter', label: 'Evidenziatore', Icon: Highlighter },
  { id: 'eraser', label: 'Gomma', Icon: Eraser },
]

const SWATCHES = [
  ...INK_COLORS.map((i) => ({ token: i.id, label: i.label })),
  ...COVER_COLORS.slice(0, 5).map((c) => ({ token: `cover-${c}`, label: c })),
]

interface Props {
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
  canUndo: boolean
  canRedo: boolean
}

/** L'astuccio: un vassoio in basso, su tutti gli schermi, nello stesso posto
 *  del portapenne del testo — così la pagina non si muove cambiando modalità.
 *  Lo strumento scelto si solleva, e il colore attivo sta sulla sua punta. */
export function PencilCase({ onUndo, onRedo, onClear, canUndo, canRedo }: Props) {
  const { tool, setTool, toolColor, setToolColor, toolSize, setToolSize } = usePrefs()
  const [confirming, setConfirming] = useState(false)

  return (
    <div
      role="toolbar"
      aria-label="Astuccio"
      // su mobile è un cassetto che manda a capo: 17 strumenti in fila non
      // stanno in 390px e finirebbero uno sopra l'altro
      className="mx-md flex max-w-[calc(100vw-2rem)] flex-nowrap items-center gap-2xs overflow-x-auto rounded-lg bg-paper px-sm py-2xs shadow-paper sm:flex-wrap sm:justify-center sm:overflow-visible"
    >
      {TOOLS.map(({ id, label, Icon }) => (
        <motion.button
          key={id}
          type="button"
          aria-label={label}
          title={label}
          aria-pressed={tool === id}
          onClick={() => setTool(id)}
          animate={{ y: tool === id ? -3 : 0 }}
          transition={SPRING}
          className={`relative flex h-14 w-[4.2rem] shrink-0 flex-col items-center justify-center gap-px rounded-sm transition-colors hover:bg-desk ${
            tool === id ? 'text-ink' : 'text-graphite'
          }`}
        >
          <Icon size={20} strokeWidth={1.75} />
          {/* il nome sotto: pennarello ed evidenziatore non si distinguono a icona */}
          <span className="text-2xs leading-none">{label}</span>
          {tool === id && id !== 'eraser' && (
            <motion.span
              layoutId="tool-tip"
              transition={SPRING}
              className="absolute right-2 top-1.5 size-2 rounded-full"
              style={{ backgroundColor: `var(--c-${toolColor})` }}
            />
          )}
        </motion.button>
      ))}

      <Divider />

      <div className="flex gap-2xs" role="group" aria-label="Colore">
        {SWATCHES.slice(0, 6).map(({ token, label }) => (
          <button
            key={token}
            type="button"
            aria-label={`Colore ${label}`}
            aria-pressed={toolColor === token}
            onClick={() => setToolColor(token)}
            className="grid size-11 place-items-center rounded-sm"
          >
            <span
              className="block size-5 rounded-full ring-offset-2 ring-offset-paper"
              style={{
                backgroundColor: `var(--c-${token})`,
                boxShadow: toolColor === token ? '0 0 0 2px var(--c-ink)' : 'var(--sh-sunk)',
              }}
            />
          </button>
        ))}
      </div>

      <Divider />

      <div className="flex gap-2xs" role="group" aria-label="Spessore">
        {STROKE_SIZES.map((s, i) => (
          <button
            key={s}
            type="button"
            aria-label={`Spessore ${i + 1}`}
            aria-pressed={toolSize === i}
            onClick={() => setToolSize(i)}
            className="grid size-11 place-items-center rounded-sm"
          >
            <span
              className="block rounded-full bg-graphite"
              style={{
                width: 4 + i * 5,
                height: 4 + i * 5,
                opacity: toolSize === i ? 1 : 0.35,
              }}
            />
          </button>
        ))}
      </div>

      <Divider />

      <div className="flex gap-2xs">
        <button
          type="button"
          aria-label="Annulla"
          onClick={onUndo}
          disabled={!canUndo}
          className="grid size-11 place-items-center rounded-sm text-graphite hover:bg-desk disabled:opacity-30"
        >
          <Undo2 size={19} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label="Ripristina"
          onClick={onRedo}
          disabled={!canRedo}
          className="grid size-11 place-items-center rounded-sm text-graphite hover:bg-desk disabled:opacity-30"
        >
          <Redo2 size={19} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label={confirming ? 'Confermi? Pulisce tutta la pagina' : 'Pulisci pagina'}
          onClick={() => {
            if (!confirming) {
              setConfirming(true)
              setTimeout(() => setConfirming(false), 3000)
              return
            }
            onClear()
            setConfirming(false)
          }}
          className={`grid size-11 place-items-center rounded-sm hover:bg-desk ${confirming ? 'text-ink-red' : 'text-graphite'}`}
        >
          <Trash2 size={19} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}

const Divider = () => (
  <span className="mx-2xs h-6 w-px bg-desk-deep opacity-60" aria-hidden="true" />
)
