import { getStroke } from 'perfect-freehand'
import type { DrawTool, Stroke, StrokePoint } from '../types'
import { STROKE_SIZES } from './constants'

interface ToolProfile {
  /** moltiplicatore sullo spessore base del preset */
  scale: number
  thinning: number
  smoothing: number
  streamline: number
  opacity: number
  blend: GlobalCompositeOperation
  taper: number
}

/** Ogni strumento ha una fisica sua. Sono questi sei numeri a far sembrare la
 *  matita una matita e il pennarello un pennarello — non la texture. */
const PROFILES: Record<DrawTool, ToolProfile> = {
  pencil: {
    scale: 1,
    thinning: 0.62,
    smoothing: 0.5,
    streamline: 0.42,
    opacity: 0.82,
    blend: 'source-over',
    taper: 12,
  },
  pen: {
    scale: 1.05,
    thinning: 0.28,
    smoothing: 0.62,
    streamline: 0.52,
    opacity: 1,
    blend: 'source-over',
    taper: 4,
  },
  marker: {
    scale: 1.9,
    thinning: 0.06,
    smoothing: 0.7,
    streamline: 0.58,
    opacity: 0.95,
    blend: 'source-over',
    taper: 0,
  },
  highlighter: {
    scale: 3.4,
    thinning: 0,
    smoothing: 0.74,
    streamline: 0.62,
    opacity: 0.42,
    blend: 'multiply',
    taper: 0,
  },
  eraser: {
    scale: 3,
    thinning: 0,
    smoothing: 0.6,
    streamline: 0.5,
    opacity: 1,
    blend: 'destination-out',
    taper: 0,
  },
}

export function strokePath(stroke: Stroke): Path2D {
  const p = PROFILES[stroke.tool]
  const outline = getStroke(stroke.points as number[][], {
    size: (STROKE_SIZES[stroke.size] ?? STROKE_SIZES[1]!) * p.scale,
    thinning: p.thinning,
    smoothing: p.smoothing,
    streamline: p.streamline,
    start: { taper: p.taper, cap: true },
    end: { taper: p.taper, cap: true },
  })

  const path = new Path2D()
  if (outline.length === 0) return path
  path.moveTo(outline[0]![0], outline[0]![1])
  for (let i = 1; i < outline.length; i++) path.lineTo(outline[i]![0], outline[i]![1])
  path.closePath()
  return path
}

export function paintStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
  const p = PROFILES[stroke.tool]
  ctx.save()
  ctx.globalCompositeOperation = p.blend
  ctx.globalAlpha = p.opacity
  ctx.fillStyle = stroke.color
  ctx.fill(strokePath(stroke))
  ctx.restore()
}

export function paintAll(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  upTo = strokes.length,
): void {
  for (let i = 0; i < upTo; i++) paintStroke(ctx, strokes[i]!)
}

/** I punti vivono in spazio logico pagina e arrotondati: un decimale è sotto
 *  la soglia visibile e dimezza il peso in localStorage. */
export const roundPoint = ([x, y, p]: StrokePoint): StrokePoint => [
  Math.round(x * 10) / 10,
  Math.round(y * 10) / 10,
  Math.round(p * 100) / 100,
]
