import { useEffect } from 'react'
import { usePrefs, type TextSize } from '../store/prefs'

/** Corpo del testo a mano e taratura della riga, misurati a coppie: la
 *  baseline di Caveat a 32px di line-height cade a 23/24/26px dal bordo alto
 *  per 22/26/30px di corpo, e la riga sta 2px sotto la baseline.
 *  Vive su :root perché anche lo specchio di paginate.ts (appeso a body)
 *  deve leggere lo stesso corpo, o misura un testo diverso da quello che vedi. */
export const HAND_SIZES: Record<TextSize, { size: number; lift: number; label: string }> = {
  S: { size: 22, lift: 7, label: 'Scrittura piccola' },
  M: { size: 26, lift: 6, label: 'Scrittura media' },
  L: { size: 30, lift: 4, label: 'Scrittura grande' },
}

export function useHandSize(): TextSize {
  const textSize = usePrefs((s) => s.textSize)
  useEffect(() => {
    const { size, lift } = HAND_SIZES[textSize]
    const root = document.documentElement.style
    root.setProperty('--hand-size', `${size}px`)
    root.setProperty('--hand-lift', `${lift}px`)
  }, [textSize])
  return textSize
}
