import { useCallback, useRef, useState } from 'react'

export type SaveState = 'idle' | 'saving' | 'saved'

/** Il salvataggio è istantaneo (è localStorage). Quello che manca è la
 *  *sensazione* che qualcuno abbia preso nota: matita, poi segno, poi via. */
export function useAutosaveIndicator() {
  const [state, setState] = useState<SaveState>('idle')
  const timers = useRef<number[]>([])

  const ping = useCallback(() => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setState('saving')
    timers.current.push(
      window.setTimeout(() => setState('saved'), 520),
      window.setTimeout(() => setState('idle'), 1900),
    )
  }, [])

  return { state, ping }
}
