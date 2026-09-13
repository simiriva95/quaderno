import { getBlob, putBlob } from './blobs'
import { sanitizeHtml } from './sanitize'
import { citedIds } from './docimages'
import type { Notebook, NotebooksSnapshot } from '../types'

const SCHEMA_VERSION = 2

const toDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })

export const exportNotebooks = async (notebooks: Notebook[]): Promise<void> => {
  // Le immagini stanno in IndexedDB: un export senza di loro sarebbe un
  // backup che perde gli screenshot. Vanno in base64 nello stesso file —
  // uno zip vorrebbe una libreria o una tabella CRC32 scritta a mano, e
  // l'inflazione del 33% qui costa memoria per un istante, non spazio.
  const ids = new Set<string>()
  for (const n of notebooks) for (const p of n.pages) citedIds(p.text, ids)

  const blobs: Record<string, string> = {}
  for (const id of ids) {
    const blob = await getBlob(id)
    if (blob) blobs[id] = await toDataUrl(blob)
  }

  const snapshot: NotebooksSnapshot = { version: SCHEMA_VERSION, notebooks }
  if (ids.size > 0) snapshot.blobs = blobs

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

/** Validazione allo spessore giusto: abbastanza da non far esplodere la UI su
 *  un file sbagliato, non abbastanza da riscrivere uno schema validator. */
export const parseSnapshot = (raw: string): NotebooksSnapshot => {
  const data: unknown = JSON.parse(raw)
  if (typeof data !== 'object' || data === null) throw new Error('File non valido')
  const { notebooks, blobs } = data as Partial<NotebooksSnapshot>
  if (!Array.isArray(notebooks)) throw new Error('Nessun quaderno in questo file')
  for (const n of notebooks) {
    if (typeof n?.id !== 'string' || !Array.isArray(n?.pages)) {
      throw new Error('Il file non ha la forma di un quaderno')
    }
    // Le pagine di carta finiscono in `dangerouslySetInnerHTML`: l'allowlist
    // esisteva già in `sanitize.ts` ma nessuno la chiamava, e un file preparato
    // ad arte eseguiva script all'import. Il raccoglitore non passa di qui: il
    // suo testo è JSON, e ripulirlo come HTML lo corromperebbe.
    if (n.kind !== 'web') {
      for (const page of n.pages) {
        if (typeof page?.text === 'string') page.text = sanitizeHtml(page.text)
      }
    }
  }
  return { version: SCHEMA_VERSION, notebooks, ...(blobs ? { blobs } : {}) }
}

/** I blob vanno in IndexedDB **prima** che i quaderni entrino nello store: al
 *  primo render il documento cerca le immagini, e un magazzino vuoto darebbe
 *  una pagina di riquadri rotti fino al reload.
 *  Il file è una frontiera di fiducia: passa solo ciò che è davvero
 *  un'immagine, con una chiave della forma che ci aspettiamo. */
export const restoreBlobs = async (blobs: Record<string, string> | undefined): Promise<void> => {
  if (!blobs) return
  for (const [id, dataUrl] of Object.entries(blobs)) {
    if (!/^[A-Za-z0-9_-]+$/.test(id)) continue
    if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) continue
    const blob = await fetch(dataUrl).then((r) => r.blob())
    await putBlob(id, blob)
  }
}
