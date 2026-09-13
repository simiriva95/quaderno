/** ── Le immagini non stanno in localStorage ────────────────────────────────
 *  `persist` di zustand riserializza l'intero array dei quaderni e scrive in
 *  modo sincrono a ogni tasto: uno screenshot in base64 sarebbe un
 *  JSON.stringify da megabyte a ogni battuta. IndexedDB salva il Blob com'è,
 *  in modo asincrono, e la quota è di centinaia di MB invece che 5.
 *  Niente wrapper: cinque operazioni su un solo object store non giustificano
 *  una dipendenza.                                                           */

const DB = 'quaderno-blobs'
const STORE = 'img'

let dbp: Promise<IDBDatabase> | null = null

const open = (): Promise<IDBDatabase> =>
  (dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }))

const tx = <T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> =>
  open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = fn(db.transaction(STORE, mode).objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      }),
  )

export const putBlob = (id: string, blob: Blob): Promise<IDBValidKey> =>
  tx('readwrite', (s) => s.put(blob, id))

export const getBlob = (id: string): Promise<Blob | undefined> =>
  tx<Blob | undefined>('readonly', (s) => s.get(id))

export const delBlob = (id: string): Promise<undefined> =>
  tx<undefined>('readwrite', (s) => s.delete(id))

export const allIds = (): Promise<string[]> =>
  tx<IDBValidKey[]>('readonly', (s) => s.getAllKeys()).then((ks) => ks.map(String))

/** Mark & sweep: se ne va tutto ciò che nessun documento cita più. Una sola
 *  raccolta copre ogni percorso di cancellazione — quaderno eliminato, pagina
 *  svuotata, import che sostituisce tutto, e quelli non ancora scritti.
 *  Idempotente: il doppio mount di StrictMode è innocuo. */
export async function sweep(keep: Set<string>): Promise<number> {
  const dead = (await allIds()).filter((id) => !keep.has(id))
  for (const id of dead) await delBlob(id)
  return dead.length
}

/** Uno screenshot da schermo Retina è largo 3000px e pesa 2 MB. Si rimpicciolisce
 *  con le API del browser: nessuna dipendenza, e il webp lo porta a ~150 KB. */
export async function shrink(file: Blob, max = 1600): Promise<Blob> {
  if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined')
    return file
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  if (k === 1 && file.size < 300_000) {
    bmp.close()
    return file
  }
  const canvas = new OffscreenCanvas(Math.round(bmp.width * k), Math.round(bmp.height * k))
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bmp.close()
    return file
  }
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  bmp.close()
  return canvas.convertToBlob({ type: 'image/webp', quality: 0.82 })
}
