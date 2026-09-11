import { useEffect } from 'react'
import { usePrefs } from '../store/prefs'
import { forgetResolvedColors } from '../lib/covers'

/** Scrive data-theme sull'html. Tutto il resto (CSS, scena 3D) legge da lì. */
export function useTheme(): void {
  const theme = usePrefs((s) => s.theme)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const resolved = theme === 'system' ? (mq.matches ? 'dark' : 'light') : theme
      document.documentElement.dataset.theme = resolved
      forgetResolvedColors()
    }
    apply()
    if (theme !== 'system') return
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}
