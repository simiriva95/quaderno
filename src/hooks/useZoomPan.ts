import { useCallback, useRef, useState } from 'react'

export interface Viewport {
  zoom: number
  x: number
  y: number
}

const IDLE: Viewport = { zoom: 1, x: 0, y: 0 }

/** Pinch con due dita, pan con due dita, doppio tap per tornare a posto.
 *  Un dito solo non fa niente: quello sta disegnando. */
export function useZoomPan(enabled: boolean) {
  const [viewport, setViewport] = useState<Viewport>(IDLE)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ dist: number; cx: number; cy: number; start: Viewport } | null>(null)
  const lastTap = useRef(0)

  const reset = useCallback(() => setViewport(IDLE), [])

  const metrics = () => {
    const [a, b] = Array.from(pointers.current.values())
    if (!a || !b) return null
    return {
      dist: Math.hypot(b.x - a.x, b.y - a.y),
      cx: (a.x + b.x) / 2,
      cy: (a.y + b.y) / 2,
    }
  }

  const handlers = enabled
    ? {
        onPointerDown: (e: React.PointerEvent) => {
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
          if (pointers.current.size === 2) {
            const m = metrics()
            if (m) gesture.current = { ...m, start: viewport }
          }
          const now = performance.now()
          if (now - lastTap.current < 280) reset()
          lastTap.current = now
        },
        onPointerMove: (e: React.PointerEvent) => {
          if (!pointers.current.has(e.pointerId)) return
          pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
          const g = gesture.current
          if (pointers.current.size !== 2 || !g) return
          const m = metrics()
          if (!m || g.dist === 0) return
          const ratio = m.dist / g.dist
          setViewport({
            // zoom "leggero": si avvicina, non si perde la pagina
            zoom: Math.min(2.5, Math.max(1, g.start.zoom * ratio)),
            x: g.start.x + (m.cx - g.cx),
            y: g.start.y + (m.cy - g.cy),
          })
        },
        onPointerUp: (e: React.PointerEvent) => {
          pointers.current.delete(e.pointerId)
          if (pointers.current.size < 2) gesture.current = null
        },
        onPointerCancel: (e: React.PointerEvent) => {
          pointers.current.delete(e.pointerId)
          gesture.current = null
        },
      }
    : {}

  return { viewport, handlers, reset, zoomed: viewport.zoom !== 1 }
}
