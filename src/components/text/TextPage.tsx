import { useEffect, useRef, useState } from 'react'
import { getCaretOffset, setCaretOffset } from '../../lib/caret'
import { PAGE_PAD_TOP, PAGE_PAD_X, TEXT_H, TEXT_W } from '../../lib/constants'

export interface CaretTarget {
  page: number
  offset: number
}

interface Props {
  pageIndex: number
  html: string
  readOnly?: boolean
  caretTarget: CaretTarget | null
  onCaretApplied: () => void
  onInput: (html: string, caret: number | null) => void
}

export function TextPage({
  pageIndex,
  html,
  readOnly,
  caretTarget,
  onCaretApplied,
  onInput,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const wasEmpty = useRef(html === '')
  const [drying, setDrying] = useState(false)

  // La prima riga scritta su una pagina bianca "asciuga": l'inchiostro parte
  // scarico e si assesta. Solo la prima: dopo sarebbe un lampeggio.
  useEffect(() => {
    if (wasEmpty.current && html !== '') {
      wasEmpty.current = false
      setDrying(true)
      const t = setTimeout(() => setDrying(false), 240)
      return () => clearTimeout(t)
    }
    if (html === '') wasEmpty.current = true
  }, [html])

  // L'HTML viene scritto a mano, non da React: rirenderizzare un
  // contenteditable a ogni tasto distruggerebbe il cursore.
  useEffect(() => {
    const el = ref.current
    if (!el || el.innerHTML === html) return
    el.innerHTML = html
  }, [html])

  useEffect(() => {
    const el = ref.current
    if (!el || !caretTarget || caretTarget.page !== pageIndex) return
    el.focus({ preventScroll: true })
    setCaretOffset(el, caretTarget.offset)
    onCaretApplied()
  }, [caretTarget, pageIndex, onCaretApplied])

  return (
    <div
      ref={ref}
      className={`hand-text absolute${drying ? ' ink-drying' : ''}${readOnly ? ' pointer-events-none' : ''}`}
      style={{
        left: PAGE_PAD_X,
        top: PAGE_PAD_TOP,
        width: TEXT_W,
        height: TEXT_H,
        zIndex: 3,
      }}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      role={readOnly ? undefined : 'textbox'}
      aria-multiline={readOnly ? undefined : 'true'}
      aria-label={readOnly ? undefined : `Testo della pagina ${pageIndex + 1}`}
      spellCheck={false}
      data-placeholder={pageIndex === 0 ? 'Inizia a scrivere…' : ''}
      onKeyDown={(e) => {
        // Invio dentro un titolo: si esce dal titolo, non se ne apre un altro.
        // Il browser altrimenti continua lo span e tutto il resto della pagina
        // nasce in grassetto a due righe.
        if (e.key !== 'Enter') return
        const sel = document.getSelection()
        const node = sel?.anchorNode
        const el = node instanceof Element ? node : node?.parentElement
        const title = el?.closest('.hand-title')
        if (!title || !e.currentTarget.contains(title) || !sel) return
        e.preventDefault()
        const out = document.createTextNode('\u200B')
        title.after(out)
        const range = document.createRange()
        range.setStart(out, 1)
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)
        const target = e.currentTarget
        onInput(target.innerHTML, getCaretOffset(target))
      }}
      onInput={(e) => {
        const el = e.currentTarget
        pruneEmptyInline(el)
        onInput(el.innerHTML, getCaretOffset(el))
      }}
      onChange={(e) => {
        // le checkbox del to-do vivono dentro il testo: l'attributo va
        // sincronizzato o il loro stato non arriva in localStorage
        const target = e.target as HTMLInputElement
        if (target.type !== 'checkbox') return
        if (target.checked) target.setAttribute('checked', '')
        else target.removeAttribute('checked')
        const el = e.currentTarget
        onInput(el.innerHTML, null)
      }}
    />
  )
}

/** Un evidenziatore o un inchiostro "preso in mano" e poi lasciato lì è uno
 *  span con dentro solo uno spazio a larghezza zero: sulla carta è una macchia.
 *  Si toglie appena il cursore se n'è andato altrove. */
function pruneEmptyInline(root: HTMLElement) {
  const sel = document.getSelection()
  const anchor = sel?.anchorNode ?? null
  for (const el of Array.from(root.querySelectorAll('mark, span[class^="ink-"], u'))) {
    if ((el.textContent ?? '').replace(/[\s\u200B]/g, '') !== '') continue
    if (anchor && el.contains(anchor)) continue
    el.remove()
  }
}
