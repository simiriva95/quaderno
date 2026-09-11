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
      className={`hand-text absolute${drying ? ' ink-drying' : ''}`}
      style={{
        left: PAGE_PAD_X,
        top: PAGE_PAD_TOP,
        width: TEXT_W,
        height: TEXT_H,
        zIndex: 3,
      }}
      contentEditable={!readOnly}
      suppressContentEditableWarning
      role="textbox"
      aria-multiline="true"
      aria-label={`Testo della pagina ${pageIndex + 1}`}
      spellCheck={false}
      data-placeholder={pageIndex === 0 ? 'Inizia a scrivere…' : ''}
      onInput={(e) => {
        const el = e.currentTarget
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
