import { useEffect } from 'react'
import { useDrawingCanvas } from '../../hooks/useDrawingCanvas'
import { PAGE_H, PAGE_W } from '../../lib/constants'
import type { Stroke } from '../../types'

interface Props {
  pageIndex: number
  strokes: Stroke[]
  onCommit: (strokes: Stroke[]) => void
  tool: Stroke['tool']
  color: string
  size: number
  replay: boolean
  /** In modalità testo i tratti si vedono ma non si toccano: la matita è posata. */
  readOnly?: boolean
  /** La palette vive fuori dalla pagina: le passiamo i comandi da qui. */
  registerApi: (pageIndex: number, api: ReturnType<typeof useDrawingCanvas>) => void
  onActivate: (pageIndex: number) => void
}

export function DrawCanvas({
  pageIndex,
  strokes,
  onCommit,
  tool,
  color,
  size,
  replay,
  readOnly = false,
  registerApi,
  onActivate,
}: Props) {
  const { baseRef, liveRef, handlers, ...api } = useDrawingCanvas({
    strokes,
    onCommit,
    tool,
    color,
    size,
    replay,
    onActivate: () => onActivate(pageIndex),
  })
  const announced =
    strokes.length === 0
      ? 'Pagina senza disegni.'
      : `Disegno con ${strokes.length} ${strokes.length === 1 ? 'tratto' : 'tratti'}.`

  // il registro vive in un ref del genitore: nessun render, nessun ciclo
  useEffect(() => {
    registerApi(pageIndex, { baseRef, liveRef, handlers, ...api })
  })

  return (
    <div
      className={`absolute inset-0${readOnly ? ' pointer-events-none' : ''}`}
      style={{ zIndex: 4 }}
    >
      <canvas
        ref={baseRef}
        width={PAGE_W}
        height={PAGE_H}
        className="absolute inset-0 size-full"
        aria-hidden="true"
      />
      <canvas
        ref={liveRef}
        width={PAGE_W}
        height={PAGE_H}
        className="absolute inset-0 size-full touch-none"
        style={{ cursor: 'crosshair' }}
        role="img"
        aria-label={`Area di disegno, pagina ${pageIndex + 1}. ${announced}`}
        {...handlers}
      />
      {/* alternativa testuale: il disegno non è leggibile, ma la sua esistenza sì */}
      <p className="sr-only" aria-live="polite">
        {announced}
      </p>
    </div>
  )
}
