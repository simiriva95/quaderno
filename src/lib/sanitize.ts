/** L'HTML della pagina lo generiamo noi, ma l'import JSON è una frontiera di
 *  fiducia: un file può contenere qualsiasi cosa. Allowlist stretta, tutto il
 *  resto scende a testo. Nessuna dipendenza: l'insieme dei tag è chiuso. */

const ALLOWED_TAGS = new Set(['SPAN', 'MARK', 'STRONG', 'EM', 'U', 'BR', 'DIV', 'LABEL', 'INPUT'])

const ALLOWED_CLASSES = new Set([
  'ink-blu',
  'ink-grafite',
  'ink-verde',
  'ink-rosso',
  'ink-viola',
  'hl-giallo',
  'hl-menta',
  'hl-rosa',
  'hand-title',
  'todo',
])

function clean(node: Node, out: Node): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      out.appendChild(child.cloneNode())
      continue
    }
    if (child.nodeType !== Node.ELEMENT_NODE) continue

    const el = child as Element
    if (!ALLOWED_TAGS.has(el.tagName)) {
      // tag sconosciuto: teniamo il contenuto, buttiamo l'involucro
      clean(el, out)
      continue
    }

    const copy = document.createElement(el.tagName.toLowerCase())
    const classes = Array.from(el.classList).filter((c) => ALLOWED_CLASSES.has(c))
    if (classes.length) copy.className = classes.join(' ')

    if (el.tagName === 'INPUT') {
      // solo la checkbox del to-do, e solo quella
      if (el.getAttribute('type') !== 'checkbox') {
        clean(el, out)
        continue
      }
      copy.setAttribute('type', 'checkbox')
      if (el.hasAttribute('checked')) copy.setAttribute('checked', '')
    }

    clean(el, copy)
    out.appendChild(copy)
  }
}

export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  const out = document.createElement('div')
  clean(doc.body, out)
  return out.innerHTML
}
