import {
  ArrowLeft,
  FileX,
  MoreHorizontal,
  PencilLine,
  Trash2,
  Type,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { DangerButton } from '../ui/DangerButton'
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
  zoom: { canIn: boolean; canOut: boolean; onIn: () => void; onOut: () => void; label: string }
  /** le azioni che cancellano, dietro un menu: non si premono per sbaglio */
  onClearPages: () => void
  clearLabel: string
  onDelete: () => void
}

export function NotebookHeader({
  title,
  onTitleChange,
  pageLabel,
  mode,
  onModeChange,
  onBack,
  saveState,
  zoom,
  onClearPages,
  clearLabel,
  onDelete,
}: Props) {
  const [menu, setMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!menu) return
    const close = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', esc)
    }
  }, [menu])
  return (
    <header className="flex flex-wrap items-center gap-x-sm gap-y-2xs px-md py-xs">
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

      <p className="hidden text-xs text-graphite sm:block">{pageLabel}</p>

      {/* La lente: pagina intera, poi un quarto. Le frecce scorrono le zone. */}
      <div
        role="group"
        aria-label="Zoom"
        className="hidden items-center rounded-md bg-paper p-2xs shadow-paper sm:flex"
      >
        <button
          type="button"
          onClick={zoom.onOut}
          disabled={!zoom.canOut}
          aria-label="Riduci zoom"
          title="Riduci zoom (−)"
          className="grid size-11 place-items-center rounded-sm text-graphite transition-colors hover:bg-desk disabled:opacity-30"
        >
          <ZoomOut size={19} strokeWidth={1.75} />
        </button>
        <span
          className="hidden min-w-[3.2rem] text-center text-2xs text-graphite md:block"
          aria-live="polite"
        >
          {zoom.label}
        </span>
        <button
          type="button"
          onClick={zoom.onIn}
          disabled={!zoom.canIn}
          aria-label="Aumenta zoom"
          title="Aumenta zoom (+)"
          className="grid size-11 place-items-center rounded-sm text-graphite transition-colors hover:bg-desk disabled:opacity-30"
        >
          <ZoomIn size={19} strokeWidth={1.75} />
        </button>
      </div>

      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-label="Altre azioni"
          aria-expanded={menu}
          aria-haspopup="menu"
          className="grid size-11 place-items-center rounded-md bg-paper text-graphite shadow-paper hover:bg-desk"
        >
          <MoreHorizontal size={19} strokeWidth={1.75} />
        </button>
        {menu && (
          <div
            role="group"
            aria-label="Azioni sul quaderno"
            className="absolute right-0 top-full z-40 mt-2xs flex w-64 flex-col gap-2xs rounded-lg bg-paper p-xs shadow-lift"
          >
            <button
              type="button"
              onClick={() => {
                onClearPages()
                setMenu(false)
              }}
              className="flex h-12 items-center gap-sm rounded-md px-md text-xs text-graphite hover:bg-desk"
            >
              <FileX size={17} strokeWidth={1.75} />
              {clearLabel}
            </button>
            <DangerButton
              label="Elimina questo quaderno"
              confirmLabel="Sicuro? Sparisce per sempre"
              icon={<Trash2 size={17} strokeWidth={1.75} />}
              onConfirm={() => {
                setMenu(false)
                onDelete()
              }}
            />
          </div>
        )}
      </div>

      <ModeGroup
        mode={mode}
        onModeChange={onModeChange}
        layoutId="mode-pill"
        className="hidden sm:flex"
      />

      {/* Sul telefono la seconda riga: lente, "Pagina 2 di 5", T/matita.
          Così il titolo in prima riga resta leggibile per intero. */}
      <div className="flex basis-full items-center justify-between sm:hidden">
        <button
          type="button"
          onClick={zoom.canOut ? zoom.onOut : zoom.onIn}
          aria-label={zoom.canOut ? 'Riduci zoom' : 'Aumenta zoom'}
          className="grid size-11 place-items-center rounded-md bg-paper text-graphite shadow-paper"
        >
          {zoom.canOut ? (
            <ZoomOut size={19} strokeWidth={1.75} />
          ) : (
            <ZoomIn size={19} strokeWidth={1.75} />
          )}
        </button>
        <p className="text-xs text-graphite">{pageLabel}</p>
        <ModeGroup
          mode={mode}
          onModeChange={onModeChange}
          layoutId="mode-pill-m"
          className="flex"
        />
      </div>
    </header>
  )
}

function ModeGroup({
  mode,
  onModeChange,
  layoutId,
  className,
}: {
  mode: Mode
  onModeChange: (m: Mode) => void
  layoutId: string
  className: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Modalità"
      className={`relative rounded-md bg-paper p-2xs shadow-paper ${className}`}
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
              layoutId={layoutId}
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
  )
}
