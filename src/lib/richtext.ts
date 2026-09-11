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

  try {
    range.surroundContents(el)
  } catch {
    // selezione a cavallo di più nodi: estrai e reinserisci
    el.appendChild(range.extractContents())
    range.insertNode(el)
  }
  sel.removeAllRanges()
  sel.selectAllChildren(el)
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
  '<label class="todo" contenteditable="false"><input type="checkbox" /></label>&nbsp;'
