import { ArrowLeft, PencilLine, Type } from 'lucide-react'
import { motion } from 'motion/react'
import { SaveIndicator } from '../ui/SaveIndicator'
import type { SaveState } from '../../hooks/useAutosaveIndicator'
import type { Mode } from '../../store/ui'
import { SPRING } from '../../lib/constants'

interface Props {
  title: string
  onTitleChange: (t: string) => void
  pageLabel: string
  mode: Mode
  onModeChange: (m: Mode) => void
  onBack: () => void
  saveState: SaveState
}

export function NotebookHeader({
  title,
  onTitleChange,
  pageLabel,
  mode,
  onModeChange,
  onBack,
  saveState,
}: Props) {
  return (
    <header className="flex items-center gap-sm px-md py-xs">
      <button
        type="button"
        onClick={onBack}
        aria-label="Torna alla mensola"
        className="flex h-11 items-center gap-2xs rounded-md px-sm text-xs text-graphite transition-colors hover:bg-paper"
      >
        <ArrowLeft size={18} strokeWidth={1.75} />
        <span className="hidden sm:inline">Mensola</span>
      </button>

      <input
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        aria-label="Titolo del quaderno"
        className="min-w-0 flex-1 truncate rounded-sm bg-transparent px-2xs font-hand text-lg text-ink outline-none hover:bg-paper/60 focus:bg-paper"
      />

      <SaveIndicator state={saveState} />

      <p className="hidden text-2xs text-graphite opacity-65 sm:block">{pageLabel}</p>

      <div
        role="radiogroup"
        aria-label="Modalità"
        className="relative flex rounded-md bg-paper p-2xs shadow-paper"
      >
        {[
          { id: 'text' as const, label: 'Testo', Icon: Type },
          { id: 'draw' as const, label: 'Disegno', Icon: PencilLine },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={mode === id}
            aria-label={label}
            onClick={() => onModeChange(id)}
            className="relative grid size-11 place-items-center rounded-sm"
          >
            {mode === id && (
              <motion.span
                layoutId="mode-pill"
                transition={SPRING}
                className="absolute inset-0 rounded-sm bg-desk"
              />
            )}
            <Icon
              size={19}
              strokeWidth={1.75}
              className={`relative ${mode === id ? 'text-ink' : 'text-graphite opacity-60'}`}
            />
          </button>
        ))}
      </div>
    </header>
  )
}
