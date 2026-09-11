/** Il cursore va seguito attraverso le riscritture dell'HTML dovute alla
 *  paginazione. Lo teniamo come offset in caratteri: sopravvive a qualsiasi
 *  ristrutturazione del DOM. */

export function getCaretOffset(root: HTMLElement): number | null {
  const sel = document.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0)
  if (!root.contains(range.startContainer)) return null
  const pre = range.cloneRange()
  pre.selectNodeContents(root)
  pre.setEnd(range.startContainer, range.startOffset)
  return pre.toString().length
}

export function setCaretOffset(root: HTMLElement, offset: number): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let seen = 0
  let node = walker.nextNode() as Text | null

  while (node) {
    const len = node.data.length
    if (seen + len >= offset) {
      const range = document.createRange()
      range.setStart(node, Math.max(0, offset - seen))
      range.collapse(true)
      const sel = document.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
      return
    }
    seen += len
    node = walker.nextNode() as Text | null
  }

  // oltre la fine: in coda
  const range = document.createRange()
  range.selectNodeContents(root)
  range.collapse(false)
  const sel = document.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
}
