import { useCallback, useEffect, useRef, useState } from 'react'
import { paintAll, paintStroke, roundPoint } from '../lib/strokes'
import { PAGE_H, PAGE_W } from '../lib/constants'
import type { Stroke, StrokePoint } from '../types'

const MAX_HISTORY = 30
const DPR = () => Math.min(2, window.devicePixelRatio || 1)

function setup(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const dpr = DPR()
  canvas.width = PAGE_W * dpr
  canvas.height = PAGE_H * dpr
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  return ctx
}

interface Options {
  strokes: Stroke[]
  onCommit: (strokes: Stroke[]) => void
  tool: Stroke['tool']
  color: string
  size: number
  /** Replay in fast-forward all'apertura della pagina. */
  replay: boolean
  /** La pagina toccata diventa quella su cui agiscono undo/redo/pulisci. */
  onActivate?: () => void
}

export function useDrawingCanvas({
  strokes,
  onCommit,
  tool,
  color,
  size,
  replay,
  onActivate,
}: Options) {
  const baseRef = useRef<HTMLCanvasElement>(null)
  const liveRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef<StrokePoint[] | null>(null)
  const [redoStack, setRedoStack] = useState<Stroke[]>([])

  const redrawBase = useCallback(
    (upTo?: number) => {
      const canvas = baseRef.current
      if (!canvas) return
      const ctx = setup(canvas)
      ctx.clearRect(0, 0, PAGE_W, PAGE_H)
      paintAll(ctx, strokes, upTo)
    },
    [strokes],
  )

  // Signature moment: i tratti si riscrivono da soli, velocissimi.
  useEffect(() => {
    if (!replay || strokes.length === 0) {
      redrawBase()
      return
    }
    let raf = 0
    const start = performance.now()
    const DURATION = 380
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION)
      const eased = 1 - Math.pow(1 - t, 3)
      redrawBase(Math.ceil(eased * strokes.length))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [replay, strokes, redrawBase])

  const toLogical = (e: React.PointerEvent<HTMLCanvasElement>): StrokePoint => {
    const rect = e.currentTarget.getBoundingClientRect()
    return [
      ((e.clientX - rect.left) / rect.width) * PAGE_W,
      ((e.clientY - rect.top) / rect.height) * PAGE_H,
      // il dito non ha pressione: 0.5 è il valore che i browser riportano
      e.pressure > 0 && e.pressure !== 0.5 ? e.pressure : 0.42,
    ]
  }

  const paintLive = useCallback(() => {
    const canvas = liveRef.current
    const points = drawing.current
    if (!canvas || !points) return
    const ctx = setup(canvas)
    ctx.clearRect(0, 0, PAGE_W, PAGE_H)
    paintStroke(ctx, { tool, color, size, points })
  }, [tool, color, size])

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!e.isPrimary) return
    onActivate?.()
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = [roundPoint(toLogical(e))]
    paintLive()
  }

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    // getCoalescedEvents: su penna e trackpad ad alta frequenza il tratto
    // perderebbe metà dei punti senza questo.
    const events =
      typeof e.nativeEvent.getCoalescedEvents === 'function'
        ? e.nativeEvent.getCoalescedEvents()
        : [e.nativeEvent]
    const rect = e.currentTarget.getBoundingClientRect()
    for (const ev of events) {
      drawing.current.push(
        roundPoint([
          ((ev.clientX - rect.left) / rect.width) * PAGE_W,
          ((ev.clientY - rect.top) / rect.height) * PAGE_H,
          ev.pressure > 0 && ev.pressure !== 0.5 ? ev.pressure : 0.42,
        ]),
      )
    }
    paintLive()
  }

  const endStroke = () => {
    const points = drawing.current
    drawing.current = null
    const live = liveRef.current
    if (live) setup(live).clearRect(0, 0, PAGE_W, PAGE_H)
    if (!points || points.length < 2) return
    setRedoStack([])
    onCommit([...strokes, { tool, color, size, points }].slice(-400))
  }

  const undo = useCallback(() => {
    if (strokes.length === 0) return
    const last = strokes[strokes.length - 1]!
    setRedoStack((r) => [last, ...r].slice(0, MAX_HISTORY))
    onCommit(strokes.slice(0, -1))
  }, [strokes, onCommit])

  const redo = useCallback(() => {
    const [next, ...rest] = redoStack
    if (!next) return
    setRedoStack(rest)
    onCommit([...strokes, next])
  }, [strokes, redoStack, onCommit])

  const clear = useCallback(() => {
    setRedoStack([])
    onCommit([])
  }, [onCommit])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return
      e.preventDefault()
      if (e.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  return {
    baseRef,
    liveRef,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endStroke,
      onPointerCancel: endStroke,
      onPointerLeave: endStroke,
    },
    undo,
    redo,
    clear,
    canUndo: strokes.length > 0,
    canRedo: redoStack.length > 0,
  }
}
