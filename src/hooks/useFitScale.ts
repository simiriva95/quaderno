import { useLayoutEffect, useRef, useState, type RefObject } from 'react'

interface Barre {
  /** quanto è alta la più alta fra le barre che galleggiano sulla carta */
  chrome: number
  /** il bordo bianco della carta: lì le barre possono poggiare senza coprire niente */
  pad: number
}

/** La pagina è disegnata a dimensione fissa; è il contenitore che si adatta.
 *  Una sola trasformazione, zero ricalcoli di layout interni.
 *
 *  Il margine verticale non è un numero deciso a tavolino: le barre
 *  galleggiano sopra la carta, e quanto possono rientrare dipende da quanto
 *  misura il bordo bianco della pagina a quella scala — che dipende dal
 *  margine. Il giro si chiude con una stima: la scala che ci sarebbe se le
 *  barre non si sovrapponessero affatto. È sempre la più prudente delle due,
 *  quindi il testo non finisce mai sotto una barra. */
export function useFitScale(contentW: number, contentH: number, marginX = 32, barre?: Barre) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const chrome = barre?.chrome ?? marginX
  const pad = barre?.pad ?? 0

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const { width, height } = el.getBoundingClientRect()
      const stima = Math.max(0, height - chrome * 2) / contentH
      const marginY = Math.max(0, chrome - pad * stima)
      const avail = { w: width - marginX * 2, h: height - marginY * 2 }
      // nessun tetto: il quaderno aperto si prende tutto lo spazio che trova
      setScale(Math.max(0, Math.min(avail.w / contentW, avail.h / contentH)))
      setSize({ w: width, h: height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [contentW, contentH, marginX, chrome, pad])

  return { ref, scale, size }
}

/** L'altezza di un elemento, aggiornata quando cambia. Serve alle barre che
 *  galleggiano: sul telefono l'intestazione va a capo e diventa il doppio. */
export function useHeight(ref: RefObject<HTMLElement | null>): number {
  const [h, setH] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const misura = () => setH(el.getBoundingClientRect().height)
    misura()
    const ro = new ResizeObserver(misura)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return h
}
