import { Heading, ListChecks, RemoveFormatting, Underline } from 'lucide-react'
import { motion } from 'motion/react'
import { INK_COLORS, SPRING } from '../../lib/constants'
import { clearFormatting, TODO_HTML, wrapSelection } from '../../lib/richtext'
import { usePrefs, type TextSize } from '../../store/prefs'
import { HAND_SIZES } from '../../hooks/useHandSize'
import type { InkColor } from '../../types'

const INK_CLASS: Record<InkColor, string> = {
  ink: 'ink-blu',
  graphite: 'ink-grafite',
  'ink-green': 'ink-verde',
  'ink-red': 'ink-rosso',
  'ink-violet': 'ink-viola',
}

const HIGHLIGHTERS = [
  { cls: 'hl-giallo', label: 'Evidenziatore giallo', color: 'var(--c-hl-yellow)' },
  { cls: 'hl-menta', label: 'Evidenziatore menta', color: 'var(--c-hl-mint)' },
  { cls: 'hl-rosa', label: 'Evidenziatore rosa', color: 'var(--c-hl-pink)' },
]

interface Props {
  /** L'editor attivo: serve per normalizzare dopo il cancellino. */
  getEditor: () => HTMLElement | null
  onChanged: () => void
}

export function InkToolbar({ getEditor, onChanged }: Props) {
  const ink = usePrefs((s) => s.ink)
  const setInk = usePrefs((s) => s.setInk)
  const textSize = usePrefs((s) => s.textSize)
  const setTextSize = usePrefs((s) => s.setTextSize)

  const run = (fn: () => void) => {
    fn()
    onChanged()
  }

  return (
    <div
      role="toolbar"
      aria-label="Strumenti di scrittura"
      className="mx-md flex max-w-[calc(100vw-2rem)] flex-nowrap items-center gap-2xs overflow-x-auto rounded-lg bg-paper px-sm py-2xs shadow-paper sm:flex-wrap sm:justify-center sm:overflow-visible"
      // mousedown invece di click: non si perde la selezione nel testo
      onMouseDown={(e) => e.preventDefault()}
    >
      {INK_COLORS.map(({ id, label }) => (
        <motion.button
          key={id}
          type="button"
          aria-label={`Inchiostro ${label}`}
          aria-pressed={ink === id}
          animate={{ y: ink === id ? -4 : 0 }}
          transition={SPRING}
          className="grid size-11 place-items-center rounded-sm"
          onClick={() => {
            setInk(id)
            run(() => wrapSelection('span', INK_CLASS[id]))
          }}
        >
          <Nib color={`var(--c-${id})`} />
        </motion.button>
      ))}

      <Divider />

      {HIGHLIGHTERS.map((h) => (
        <button
          key={h.cls}
          type="button"
          aria-label={h.label}
          className="grid size-11 place-items-center rounded-sm"
          onClick={() => run(() => wrapSelection('mark', h.cls))}
        >
          <span
            className="block h-5 w-6 rounded-[4px_7px_5px_8px/9px_5px_10px_4px]"
            style={{ backgroundColor: h.color }}
          />
        </button>
      ))}

      <Divider />

      {/* corpo della scrittura: tre "A" a grandezza crescente, come su un
          e-reader. Il passo delle righe non cambia, cambia l'inchiostro. */}
      <div role="radiogroup" aria-label="Corpo del testo" className="flex items-center">
        {(Object.keys(HAND_SIZES) as TextSize[]).map((k, i) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={textSize === k}
            aria-label={HAND_SIZES[k].label}
            title={HAND_SIZES[k].label}
            onClick={() => setTextSize(k)}
            className={`grid size-11 place-items-center rounded-sm font-hand transition-colors hover:bg-desk ${
              textSize === k ? 'bg-desk text-ink' : 'text-graphite'
            }`}
            style={{ fontSize: 14 + i * 5, lineHeight: 1 }}
          >
            A
          </button>
        ))}
      </div>

      <Divider />

      <ToolButton label="Titolo" onClick={() => run(() => wrapSelection('span', 'hand-title'))}>
        <Heading size={20} strokeWidth={1.75} />
      </ToolButton>
      <ToolButton label="Sottolinea" onClick={() => run(() => wrapSelection('u'))}>
        <Underline size={20} strokeWidth={1.75} />
      </ToolButton>
      <ToolButton
        label="Casella da spuntare"
        onClick={() =>
          run(() => {
            const sel = document.getSelection()
            if (!sel || sel.rangeCount === 0) return
            const range = sel.getRangeAt(0)
            const box = document.createElement('span')
            box.innerHTML = TODO_HTML
            range.insertNode(box)
            range.collapse(false)
          })
        }
      >
        <ListChecks size={20} strokeWidth={1.75} />
      </ToolButton>
      <ToolButton
        label="Cancellino: toglie la formattazione"
        onClick={() => {
          const editor = getEditor()
          if (editor) run(() => clearFormatting(editor))
        }}
      >
        <RemoveFormatting size={20} strokeWidth={1.75} />
      </ToolButton>
    </div>
  )
}

function ToolButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-11 place-items-center rounded-sm text-graphite transition-colors hover:bg-desk"
    >
      {children}
    </button>
  )
}

const Divider = () => (
  <span className="mx-2xs h-6 w-px bg-desk-deep opacity-60" aria-hidden="true" />
)

/** Pennino: il colore sta sulla punta, come su una penna vera. */
function Nib({ color }: { color: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <path d="M11 3.2 L14.4 12 L11 14.4 L7.6 12 Z" fill={color} />
      <path d="M11 14.4 L11 18.4" stroke={color} strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}
