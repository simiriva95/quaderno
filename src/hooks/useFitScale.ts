import { useLayoutEffect, useRef, useState } from 'react'

/** La pagina è disegnata a dimensione fissa; è il contenitore che si adatta.
 *  Una sola trasformazione, zero ricalcoli di layout interni. */
export function useFitScale(contentW: number, contentH: number, margin = 32) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const { width, height } = el.getBoundingClientRect()
      const avail = { w: width - margin * 2, h: height - margin * 2 }
      setScale(Math.min(avail.w / contentW, avail.h / contentH, 1.25))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [contentW, contentH, margin])

  return { ref, scale }
}
