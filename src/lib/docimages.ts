import type { JSONContent } from '@tiptap/core'
import { getBlob } from './blobs'

/** ── Le due frontiere dell'immagine ────────────────────────────────────────
 *  Nel documento salvato l'immagine è `qimg:<id>`: un `blob:` URL muore al
 *  reload, e un data URL riporterebbe i megabyte dentro localStorage. La
 *  conversione avviene solo ai bordi della persistenza — `hydrate` quando il
 *  documento si apre, `dehydrate` quando si salva — così l'editor lavora con
 *  URL veri e non sa niente di IndexedDB.                                    */

export const QIMG = /^qimg:([A-Za-z0-9_-]+)$/

function walk(node: JSONContent, fn: (n: JSONContent) => void): void {
  fn(node)
  for (const child of node.content ?? []) walk(child, fn)
}

const srcOf = (n: JSONContent): string | null => {
  const src: unknown = n.attrs?.['src']
  return typeof src === 'string' ? src : null
}

/** `qimg:<id>` → `blob:`. Muta `doc`: passagli una copia. Gli URL creati
 *  finiscono in `urls`, che è anche il registro da revocare allo smontaggio.
 *  Un blob mancante lascia il `src` com'è: immagine rotta, non pagina rotta. */
export async function hydrate(doc: JSONContent, urls: Map<string, string>): Promise<JSONContent> {
  const ids = new Set<string>()
  walk(doc, (n) => {
    const id = srcOf(n)?.match(QIMG)?.[1]
    if (id) ids.add(id)
  })

  for (const id of ids) {
    if (urls.has(id)) continue
    const blob = await getBlob(id)
    if (blob) urls.set(id, URL.createObjectURL(blob))
  }

  walk(doc, (n) => {
    const id = srcOf(n)?.match(QIMG)?.[1]
    const url = id && urls.get(id)
    if (url && n.attrs) n.attrs['src'] = url
  })
  return doc
}

/** `blob:` → `qimg:<id>`. Muta `doc`: passagli una copia. */
export function dehydrate(doc: JSONContent, urls: Map<string, string>): JSONContent {
  const byUrl = new Map([...urls].map(([id, url]) => [url, id]))
  walk(doc, (n) => {
    const src = srcOf(n)
    if (!src || !n.attrs) return
    const id = byUrl.get(src)
    if (id) {
      n.attrs['src'] = `qimg:${id}`
      return
    }
    // Rete di sicurezza: un `data:` che sia sfuggito all'adozione porterebbe
    // megabyte dentro localStorage, che è la cosa che questo quaderno esiste
    // per non fare.
    if (src.startsWith('data:')) delete n.attrs['src']
  })
  return doc
}

/** Gli id citati da un testo salvato, letti dalla stringa senza parsarla: la
 *  raccolta dei blob orfani deve funzionare su qualunque forma di documento. */
export function citedIds(stored: string, into: Set<string>): void {
  for (const m of stored.matchAll(/qimg:([A-Za-z0-9_-]+)/g)) if (m[1]) into.add(m[1])
}

/** Un file importato può contenere qualsiasi cosa. La struttura la controlla
 *  ProseMirror quando carica il documento (i nodi fuori schema non passano),
 *  ma gli attributi restano stringhe libere: `src` e `href` si ripuliscono qui.
 *  Fatto a mano e senza schema apposta — la validazione vera vive nel chunk
 *  dell'editor, e tirarla sul percorso di import porterebbe 165 KB nel bundle
 *  iniziale. */
export function scrub(doc: JSONContent): JSONContent {
  walk(doc, (n) => {
    if (!n.attrs) return
    const src = srcOf(n)
    if (src !== null && !QIMG.test(src)) delete n.attrs['src']
    const href: unknown = n.attrs['href']
    if (typeof href === 'string' && !/^(https?:|mailto:)/i.test(href)) delete n.attrs['href']
    for (const mark of n.marks ?? []) {
      const mh: unknown = mark.attrs?.['href']
      if (typeof mh === 'string' && !/^(https?:|mailto:)/i.test(mh)) delete mark.attrs?.['href']
    }
  })
  return doc
}
