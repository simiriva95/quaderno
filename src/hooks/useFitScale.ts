import { useLayoutEffect, useRef, useState } from 'react'

/** La pagina è disegnata a dimensione fissa; è il contenitore che si adatta.
 *  Una sola trasformazione, zero ricalcoli di layout interni. */
export function useFitScale(contentW: number, contentH: number, marginX = 32, marginY = marginX) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [size, setSize] = useState({ w: 0, h: 0 })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const { width, height } = el.getBoundingClientRect()
      const avail = { w: width - marginX * 2, h: height - marginY * 2 }
      setScale(Math.min(avail.w / contentW, avail.h / contentH, 1.25))
      setSize({ w: width, h: height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [contentW, contentH, marginX, marginY])

  return { ref, scale, size }
}
