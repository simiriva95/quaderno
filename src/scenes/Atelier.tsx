import { ArrowLeft, Check } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { useNavigate } from '../lib/router'
import { NotebookPreview } from '../components/atelier/NotebookPreview'
import { Sticker } from '../components/atelier/Stickers'
import { stickerLabel } from '../lib/stickers'
import { PaperPage } from '../components/notebook/PaperPage'
import { COVER_COLORS, COVER_LABELS, SPRING, STICKERS } from '../lib/constants'
import { defaultCover, useNotebooks } from '../store/notebooks'
import type { CoverColor, CoverPattern, PaperKind } from '../types'

const PATTERNS: { id: CoverPattern; label: string }[] = [
  { id: 'plain', label: 'Tinta unita' },
  { id: 'dots', label: 'Pois' },
  { id: 'stripes', label: 'Righe' },
  { id: 'gingham', label: 'Quadretti vichy' },
  { id: 'stars', label: 'Stelline' },
  { id: 'clouds', label: 'Nuvolette' },
]

const PAPERS: { id: PaperKind; label: string }[] = [
  { id: 'lined', label: 'A righe' },
  { id: 'grid', label: 'A quadretti' },
  { id: 'blank', label: 'Bianca' },
]

export default function Atelier() {
  const navigate = useNavigate()
  const createNotebook = useNotebooks((s) => s.createNotebook)

  const [title, setTitle] = useState('')
  const [cover, setCover] = useState(defaultCover())
  const [paper, setPaper] = useState<PaperKind>('lined')

  const patch = (p: Partial<typeof cover>) => setCover((c) => ({ ...c, ...p }))

  return (
    <main className="min-h-dvh bg-desk">
      <header className="flex items-center gap-sm px-md py-xs">
        <button
          type="button"
          onClick={() => navigate('/')}
          aria-label="Torna alla mensola"
          className="flex h-11 items-center gap-2xs rounded-md px-sm text-xs text-graphite hover:bg-paper"
        >
          <ArrowLeft size={18} strokeWidth={1.75} />
          <span className="hidden sm:inline">Mensola</span>
        </button>
        <h1 className="font-hand text-lg text-ink">Un quaderno nuovo</h1>
      </header>

      <div className="mx-auto grid max-w-6xl gap-xl px-md pb-4xl lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:items-start">
        {/* la scrivania: il quaderno al centro, grande, che risponde a ogni scelta */}
        <div className="flex flex-col items-center gap-lg py-xl">
          <NotebookPreview
            cover={cover}
            title={title}
            pulseKey={`${cover.color}-${cover.pattern}-${cover.spineColor}`}
            width={280}
          />
          <div
            className="overflow-hidden rounded-md shadow-paper"
            style={{ width: 180, height: 252 }}
            aria-label={`Anteprima della carta: ${PAPERS.find((p) => p.id === paper)?.label}`}
          >
            <div style={{ transform: 'scale(0.3)', transformOrigin: 'top left' }}>
              <PaperPage paper={paper} side="single" />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-lg pb-xl">
          <Field label="Come lo chiami?">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Appunti di…"
              maxLength={40}
              className="h-12 w-full rounded-md bg-paper px-md font-hand text-base text-ink shadow-paper outline-none placeholder:opacity-35"
            />
          </Field>

          <Field label="Copertina">
            <Swatches
              value={cover.color}
              onChange={(color) => patch({ color })}
              labelPrefix="Copertina"
            />
          </Field>

          <Field label="Motivo">
            <div className="flex flex-wrap gap-2xs">
              {PATTERNS.map(({ id, label }) => (
                <Chip
                  key={id}
                  active={cover.pattern === id}
                  onClick={() => patch({ pattern: id })}
                  label={label}
                />
              ))}
            </div>
          </Field>

          <Field label="Adesivo">
            <div className="flex flex-wrap gap-2xs">
              <button
                type="button"
                aria-pressed={!cover.sticker}
                onClick={() => patch({ sticker: undefined })}
                className={`h-11 rounded-md px-sm text-xs ${!cover.sticker ? 'bg-paper text-ink shadow-paper' : 'text-graphite opacity-70'}`}
              >
                Nessuno
              </button>
              {STICKERS.map((id) => (
                <button
                  key={id}
                  type="button"
                  aria-label={stickerLabel(id)}
                  title={stickerLabel(id)}
                  aria-pressed={cover.sticker === id}
                  onClick={() => patch({ sticker: id })}
                  className="grid size-11 place-items-center rounded-md text-graphite"
                  style={{
                    backgroundColor: cover.sticker === id ? 'var(--c-paper)' : 'transparent',
                    boxShadow: cover.sticker === id ? 'var(--sh-paper)' : undefined,
                  }}
                >
                  <Sticker id={id} size={22} />
                </button>
              ))}
            </div>
          </Field>

          <Field label="Dorso">
            <Swatches
              value={cover.spineColor}
              onChange={(spineColor) => patch({ spineColor })}
              labelPrefix="Dorso"
            />
          </Field>

          <Field label="Carta">
            <div className="flex flex-wrap gap-2xs">
              {PAPERS.map(({ id, label }) => (
                <Chip key={id} active={paper === id} onClick={() => setPaper(id)} label={label} />
              ))}
            </div>
          </Field>

          <label className="flex h-12 cursor-pointer items-center gap-sm rounded-md bg-paper px-md text-xs shadow-paper">
            <input
              type="checkbox"
              checked={cover.elastic}
              onChange={(e) => patch({ elastic: e.target.checked })}
              className="size-5 accent-[var(--c-ink)]"
            />
            Elastico di chiusura
          </label>

          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            transition={SPRING}
            onClick={() => {
              const id = createNotebook({
                title: title.trim() || 'Senza titolo',
                cover,
                paper,
              })
              navigate(`/q/${id}`)
            }}
            className="flex h-14 items-center justify-center gap-xs rounded-md bg-ink px-lg text-sm font-semibold text-paper shadow-lift"
          >
            <Check size={20} strokeWidth={2} />
            Metti sulla mensola
          </motion.button>
        </div>
      </div>
    </main>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-xs">
      <h2 className="text-2xs font-semibold tracking-wide text-graphite opacity-70">{label}</h2>
      {children}
    </section>
  )
}

function Chip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`h-11 rounded-md px-md text-xs transition-colors ${
        active ? 'bg-paper text-ink shadow-paper' : 'text-graphite opacity-70 hover:opacity-100'
      }`}
    >
      {label}
    </button>
  )
}

function Swatches({
  value,
  onChange,
  labelPrefix,
}: {
  value: CoverColor
  onChange: (c: CoverColor) => void
  labelPrefix: string
}) {
  return (
    <div className="flex flex-wrap gap-2xs">
      {COVER_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`${labelPrefix} ${COVER_LABELS[c]}`}
          title={COVER_LABELS[c]}
          aria-pressed={value === c}
          onClick={() => onChange(c)}
          className="grid size-11 place-items-center rounded-md"
        >
          <motion.span
            animate={{ scale: value === c ? 1 : 0.82 }}
            transition={SPRING}
            className="block size-7 rounded-full"
            style={{
              backgroundColor: `var(--c-cover-${c})`,
              boxShadow: value === c ? '0 0 0 2px var(--c-ink)' : 'var(--sh-sunk)',
            }}
          />
        </button>
      ))}
    </div>
  )
}
