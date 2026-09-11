/** ── Traboccamento ─────────────────────────────────────────────────────────
 *  Su un quaderno vero il testo non scrolla: finisce la pagina e si gira.
 *  Qui misuriamo su uno specchio fuori schermo — identico per larghezza, font
 *  e interlinea alla pagina reale — e tagliamo al carattere esatto in cui il
 *  testo supera l'ultima riga. Il taglio è sul DOM, quindi inchiostri ed
 *  evidenziatori sopravvivono al passaggio di pagina.                        */

let mirror: HTMLDivElement | null = null

function getMirror(width: number): HTMLDivElement {
  if (!mirror) {
    mirror = document.createElement('div')
    mirror.className = 'hand-text'
    mirror.setAttribute('aria-hidden', 'true')
    mirror.style.cssText =
      'position:fixed;left:-99999px;top:0;visibility:hidden;overflow:visible;height:auto;'
    document.body.appendChild(mirror)
  }
  mirror.style.width = `${width}px`
  return mirror
}

/** Primo offset di carattere la cui riga sfora `maxHeight`. */
function findOverflowPoint(
  root: HTMLElement,
  maxHeight: number,
): { node: Text; offset: number } | null {
  const top = root.getBoundingClientRect().top
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const range = document.createRange()

  let node = walker.nextNode() as Text | null
  while (node) {
    // il nodo intero sta dentro? avanti
    range.selectNodeContents(node)
    const rects = range.getClientRects()
    const last = rects[rects.length - 1]
    if (last && last.bottom - top <= maxHeight) {
      node = walker.nextNode() as Text | null
      continue
    }

    // dentro questo nodo: ricerca binaria del primo carattere che sfora
    let lo = 0
    let hi = node.data.length
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      range.setStart(node, 0)
      range.setEnd(node, mid + 1)
      const r = range.getClientRects()
      const bottom = r[r.length - 1]?.bottom ?? top
      if (bottom - top <= maxHeight) lo = mid + 1
      else hi = mid
    }

    // arretra al confine di parola più vicino: non si spezzano le parole
    let cut = lo
    while (cut > 0 && !/\s/.test(node.data[cut - 1] ?? '')) cut--
    if (cut === 0 && lo > 0) cut = lo // parola più lunga di una riga: si spezza

    return { node, offset: cut }
  }

  return null
}

export interface SplitResult {
  kept: string
  overflow: string
  /** quanti caratteri restano nella pagina, per riposizionare il cursore */
  keptLength: number
}

/** Divide `html` in ciò che entra in `maxHeight` e ciò che trabocca. */
export function splitAtHeight(html: string, width: number, maxHeight: number): SplitResult {
  const m = getMirror(width)
  m.innerHTML = html

  if (m.scrollHeight <= maxHeight) {
    return { kept: html, overflow: '', keptLength: m.textContent?.length ?? 0 }
  }

  const point = findOverflowPoint(m, maxHeight)
  if (!point) return { kept: html, overflow: '', keptLength: m.textContent?.length ?? 0 }

  const tail = document.createRange()
  tail.setStart(point.node, point.offset)
  tail.setEndAfter(m.lastChild ?? point.node)

  const fragment = tail.extractContents()
  const box = document.createElement('div')
  box.appendChild(fragment)

  return {
    kept: m.innerHTML,
    overflow: box.innerHTML,
    keptLength: m.textContent?.length ?? 0,
  }
}
