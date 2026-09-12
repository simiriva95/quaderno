/** Formattazione su selezione. Niente execCommand (deprecato e imprevedibile
 *  sui bordi di selezione): Range diretto, sempre lo stesso comportamento. */

export function wrapSelection(tag: string, className?: string): void {
  const sel = document.getSelection()
  if (!sel || sel.rangeCount === 0) return
  const range = sel.getRangeAt(0)

  const el = document.createElement(tag)
  if (className) el.className = className

  if (range.collapsed) {
    // niente di selezionato: lo strumento resta "in mano", si scrive dentro
    el.appendChild(document.createTextNode('​'))
    range.insertNode(el)
    const after = document.createRange()
    after.setStart(el.firstChild!, 1)
    after.collapse(true)
    sel.removeAllRanges()
    sel.addRange(after)
    return
  }

  // un solo nodo di testo: si avvolge e basta. Se la selezione contiene
  // elementi (a capo, blocchi, caselle) si passa nodo per nodo.
  const simple =
    range.startContainer === range.endContainer && range.startContainer.nodeType === Node.TEXT_NODE
  try {
    if (!simple) throw new Error('multi')
    range.surroundContents(el)
    sel.removeAllRanges()
    sel.selectAllChildren(el)
    return
  } catch {
    // selezione a cavallo di più nodi: si avvolge OGNI nodo di testo per
    // conto suo, saltando quelli fatti solo di spazi e ritorni a capo. Un
    // unico wrapper attorno al frammento portava dentro blocchi e righe vuote,
    // e l'evidenziatore lasciava strisce gialle dove non c'erano parole.
  }
  const start = range.startContainer
  const end = range.endContainer
  if (start.nodeType === Node.TEXT_NODE && range.startOffset > 0)
    (start as Text).splitText(range.startOffset)
  if (end.nodeType === Node.TEXT_NODE && range.endOffset < (end as Text).length)
    (end as Text).splitText(range.endOffset)

  const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT)
  const texts: Text[] = []
  let node: Node | null
  while ((node = walker.nextNode())) {
    if (range.intersectsNode(node) && (node.textContent ?? '').replace(/[\s\u200B]/g, '') !== '')
      texts.push(node as Text)
  }
  // il primo nodo dopo lo split del confine iniziale è quello selezionato
  const wrapped: HTMLElement[] = []
  for (const t of texts) {
    if (start.nodeType === Node.TEXT_NODE && t === start && range.startOffset > 0) continue
    const w = el.cloneNode(false) as HTMLElement
    t.replaceWith(w)
    w.appendChild(t)
    wrapped.push(w)
  }
  sel.removeAllRanges()
  if (wrapped.length) {
    const r = document.createRange()
    r.setStartBefore(wrapped[0]!)
    r.setEndAfter(wrapped[wrapped.length - 1]!)
    sel.addRange(r)
  }
}

/** Il cancellino del testo: toglie la formattazione, lascia le parole. */
export function clearFormatting(root: HTMLElement): void {
  const sel = document.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return
  const range = sel.getRangeAt(0)

  const fragment = range.extractContents()
  const box = document.createElement('div')
  box.appendChild(fragment)
  for (const el of Array.from(box.querySelectorAll('span, mark, u, strong, em'))) {
    el.replaceWith(...Array.from(el.childNodes))
  }
  const flat = document.createDocumentFragment()
  flat.append(...Array.from(box.childNodes))
  range.insertNode(flat)
  root.normalize()
}

export const TODO_HTML =
  '<label class="todo" contenteditable="false"><input type="checkbox" aria-label="Fatto" /></label>&nbsp;'
