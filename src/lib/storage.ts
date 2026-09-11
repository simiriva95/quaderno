import type { Notebook, NotebooksSnapshot } from '../types'

const SCHEMA_VERSION = 1

export const exportNotebooks = (notebooks: Notebook[]): void => {
  const snapshot: NotebooksSnapshot = { version: SCHEMA_VERSION, notebooks }
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `quaderni-${new Date().toISOString().slice(0, 10)}.json`
  // l'ancora va nel documento e l'URL si revoca dopo: un click su un elemento
  // staccato viene ignorato, e revocare subito annulla il download in corso
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Validazione allo spessore giusto: abbastanza da non far esplodere la UI su un
 *  file sbagliato, non abbastanza da riscrivere uno schema validator. */
export const parseSnapshot = (raw: string): Notebook[] => {
  const data: unknown = JSON.parse(raw)
  if (typeof data !== 'object' || data === null) throw new Error('File non valido')
  const { notebooks } = data as Partial<NotebooksSnapshot>
  if (!Array.isArray(notebooks)) throw new Error('Nessun quaderno in questo file')
  for (const n of notebooks) {
    if (typeof n?.id !== 'string' || !Array.isArray(n?.pages)) {
      throw new Error('Il file non ha la forma di un quaderno')
    }
  }
  return notebooks
}
