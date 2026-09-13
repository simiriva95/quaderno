import { useSyncExternalStore } from 'react'

/** Tre rotte, nessuna annidata, nessun loader, nessun data layer: react-router
 *  costava ~18 KB gzip nel bundle iniziale per fare questo. L'hash basta, e il
 *  brief lo prevedeva come alternativa. */

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

const read = () => window.location.hash.slice(1) || '/'

export const useRoute = (): string => useSyncExternalStore(subscribe, read, () => '/')

export const navigate = (to: string): void => {
  window.location.hash = to
}

export const useNavigate = () => navigate

/** Il raccoglitore vive sotto `#/w/`, non `#/q/`: gli invarianti del
 *  `debug:portale` valgono solo dentro `#/q/` e due di loro — «mai una
 *  scrollbar dentro la carta» e «testo a schermo uguale allo storage» — sono
 *  la negazione di un foglio che scorre con dentro un documento JSON. */
export const notebookPath = (n: { id: string; kind?: 'paper' | 'web' }): string =>
  `${n.kind === 'web' ? '/w/' : '/q/'}${n.id}`
