import { Plus } from 'lucide-react'
import { useCoverTexture } from '../../hooks/useCoverTexture'
import { jitter } from './geometry'
import type { Notebook } from '../../types'

/** Stessa composizione della scena 3D, in CSS: serve quando WebGL non c'è o
 *  quando l'utente ha chiesto meno movimento. Non è una versione ridotta —
 *  è la stessa mensola, ferma. */
export function Shelf2DFallback({
  notebooks,
  focusIndex,
  onOpen,
  onAdd,
  perShelf,
}: {
  notebooks: Notebook[]
  focusIndex: number
  onOpen: (id: string, rect: DOMRect) => void
  onAdd: () => void
  perShelf: number
}) {
  const rows: Notebook[][] = []
  for (let i = 0; i < notebooks.length; i += perShelf) rows.push(notebooks.slice(i, i + perShelf))
  if (rows.length === 0) rows.push([])

  return (
    <div className="flex w-full flex-col items-center gap-xl overflow-y-auto py-xl">
      {rows.map((row, r) => (
        <div key={r} className="w-full max-w-4xl px-lg">
          <div className="flex items-end justify-center gap-[3px]" style={{ minHeight: 176 }}>
            {row.map((n) => (
              <Spine
                key={n.id}
                notebook={n}
                focused={notebooks.indexOf(n) === focusIndex}
                onOpen={(rect) => onOpen(n.id, rect)}
              />
            ))}
            {r === rows.length - 1 && (
              <button
                type="button"
                onClick={onAdd}
                aria-label="Aggiungi un quaderno"
                className="grid h-[150px] w-[30px] place-items-center rounded-[3px_6px_6px_3px] border border-dashed border-graphite/40 bg-paper/50 text-graphite transition-transform hover:-translate-y-1"
              >
                <Plus size={16} strokeWidth={1.75} />
              </button>
            )}
          </div>
          <div className="h-[10px] rounded-[3px] bg-wood shadow-paper" />
          <div className="h-[4px] rounded-b-[3px] bg-wood-deep" />
        </div>
      ))}
    </div>
  )
}

function Spine({
  notebook,
  focused,
  onOpen,
}: {
  notebook: Notebook
  focused: boolean
  onOpen: (rect: DOMRect) => void
}) {
  const texture = useCoverTexture(notebook.cover.spineColor, 'plain', 64)
  const { height } = jitter(notebook.id)
  const binder = notebook.kind === 'web'

  return (
    <button
      type="button"
      onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
      title={notebook.title}
      aria-label={`Apri ${notebook.title}`}
      className="relative shrink-0 rounded-[3px_6px_6px_3px] transition-transform duration-200 ease-[cubic-bezier(.22,1,.36,1)] hover:-translate-y-[6px]"
      style={{
        width: binder ? 34 : 30,
        height: height * 150,
        backgroundColor: `var(--c-cover-${notebook.cover.spineColor})`,
        backgroundImage: texture ? `url(${texture})` : undefined,
        boxShadow: focused ? '0 0 0 2px var(--c-ink), var(--sh-paper)' : 'var(--sh-paper)',
        transform: focused ? 'translateY(-6px)' : undefined,
      }}
    >
      {/* Il raccoglitore, anche qui: la tasca dell'etichetta e due anelli. */}
      {binder && (
        <>
          <span
            aria-hidden="true"
            className="absolute inset-x-[4px] rounded-[3px] bg-paper"
            style={{
              top: '26%',
              height: '48%',
              boxShadow: 'inset 0 0 0 1px color-mix(in oklab, var(--c-graphite) 32%, transparent)',
            }}
          />
          {[0.14, 0.86].map((f) => (
            <span
              key={f}
              aria-hidden="true"
              className="absolute left-1/2 h-[5px] w-[16px] -translate-x-1/2 rounded-full"
              style={{ top: `${f * 100}%`, backgroundColor: '#8A8F9B' }}
            />
          ))}
        </>
      )}
      <span
        className={`absolute inset-x-0 origin-center overflow-hidden whitespace-nowrap text-ink ${
          binder ? 'bottom-[26%] text-[9px] font-semibold' : 'bottom-2 text-2xs font-hand'
        }`}
        style={{ writingMode: 'vertical-rl', height: binder ? '48%' : '82%' }}
      >
        {notebook.title}
      </span>
    </button>
  )
}
