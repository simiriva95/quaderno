import { useCallback } from 'react'
import { splitAtHeight } from '../lib/paginate'
import { useNotebooks } from '../store/notebooks'
import type { Notebook } from '../types'

export interface Reflow {
  /** pagina in cui è finito il cursore dopo il riversamento */
  caretPage: number
  caretOffset: number
}

/** Riversa il testo in eccesso sulle pagine successive, a cascata, creandone
 *  di nuove quando servono. Restituisce dove è finito il cursore. */
export function useTextPagination(
  notebook: Notebook | undefined,
  width: number,
  maxHeight: number,
) {
  const setPageText = useNotebooks((s) => s.setPageText)

  return useCallback(
    (pageIndex: number, html: string, caretOffset: number | null): Reflow => {
      if (!notebook) return { caretPage: pageIndex, caretOffset: caretOffset ?? 0 }

      let index = pageIndex
      let current = html
      let caretPage = pageIndex
      let caret = caretOffset ?? 0
      const texts = notebook.pages.map((p) => p.text)

      // il ciclo non può girare all'infinito: ogni giro sposta testo in avanti
      for (let guard = 0; guard < 64; guard++) {
        const { kept, overflow, keptLength } = splitAtHeight(current, width, maxHeight)
        texts[index] = kept
        setPageText(notebook.id, index, kept)

        if (!overflow) break

        // il cursore ha seguito il testo sulla pagina dopo?
        if (caretPage === index && caret > keptLength) {
          caretPage = index + 1
          caret -= keptLength
        }

        index += 1
        current = overflow + (texts[index] ?? '')
      }

      return { caretPage, caretOffset: caret }
    },
    [notebook, width, maxHeight, setPageText],
  )
}
