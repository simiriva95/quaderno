import { useEffect, useState } from 'react'
import { coverCanvas } from '../lib/covers'
import type { CoverColor, CoverPattern } from '../types'

/** La copertina come data-URL. Dipende dal tema: in "sera in cameretta" i
 *  pastelli cambiano, e la copertina deve seguirli. */
export function useCoverTexture(color: CoverColor, pattern: CoverPattern, size = 512): string {
  const [url, setUrl] = useState('')

  useEffect(() => {
    const render = () => setUrl(coverCanvas({ color, pattern }, size).toDataURL())
    render()
    const observer = new MutationObserver(render)
    observer.observe(document.documentElement, { attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [color, pattern, size])

  return url
}
