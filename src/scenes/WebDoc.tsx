import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NotebookHeader } from '../components/notebook/NotebookHeader'
import { OpeningTransition } from '../components/notebook/OpeningTransition'
import { Editor } from '../components/webdoc/Editor'
import { useAutosaveIndicator } from '../hooks/useAutosaveIndicator'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { citedIds } from '../lib/docimages'
import { sweep } from '../lib/blobs'
import { useNavigate } from '../lib/router'
import { useNotebooks } from '../store/notebooks'
import { useUi } from '../store/ui'
import '../styles/webdoc.css'

/** ── Il raccoglitore ──────────────────────────────────────────────────────
 *  Un foglio solo, che scorre. Non c'è impaginazione: uno screenshot alto
 *  novecento pixel e quaranta righe di Python non si tagliano a metà, e
 *  `splitAtHeight` non saprebbe dove farlo. Le pagine numerate, lo zoom a
 *  passi e la matita restano al quaderno di carta.                          */

export default function WebDoc({ id }: { id: string }) {
  const navigate = useNavigate()
  const notebook = useNotebooks((s) => s.notebooks.find((n) => n.id === id))
  const renameNotebook = useNotebooks((s) => s.renameNotebook)
  const setPageText = useNotebooks((s) => s.setPageText)
  const clearPage = useNotebooks((s) => s.clearPage)
  const removeNotebook = useNotebooks((s) => s.removeNotebook)

  const shelfRect = useUi((s) => s.shelfRect)
  const reduced = useReducedMotion()
  const [closing, setClosing] = useState(false)
  const { state: saveState, ping } = useAutosaveIndicator()

  // Il documento si monta una volta sola: da lì in poi la verità sta
  // nell'editor, e rileggere lo store rimpiazzerebbe il testo sotto il cursore.
  // Per ripartire da zero si cambia la `key`: è l'unico momento in cui lo
  // store torna a comandare.
  const [initial, setInitial] = useState(() => notebook?.pages[0]?.text ?? '')
  const [epoch, setEpoch] = useState(0)

  // Svuotando il foglio l'editor vecchio si smonta, e smontandosi sciacqua il
  // suo debounce: senza questa guardia l'ultimo salvataggio del morto
  // resusciterebbe il testo appena cancellato.
  // In layout, non in render e non in un effetto passivo: la pulizia
  // dell'editor smontato è passiva, e arriverebbe prima dell'aggiornamento.
  const epochRef = useRef(0)
  useLayoutEffect(() => {
    epochRef.current = epoch
  }, [epoch])
  const save = useCallback(
    (json: string, gen: number) => {
      if (gen !== epochRef.current) return
      setPageText(id, 0, json)
    },
    [id, setPageText],
  )

  // I blob che nessun documento cita più se ne vanno, una volta per sessione.
  // Una sola raccolta copre ogni modo di cancellare, anche quelli futuri.
  useEffect(() => {
    const collect = () => {
      const keep = new Set<string>()
      for (const n of useNotebooks.getState().notebooks)
        for (const p of n.pages) citedIds(p.text, keep)
      void sweep(keep)
    }
    const handle =
      typeof requestIdleCallback === 'function'
        ? requestIdleCallback(collect)
        : window.setTimeout(collect, 2000)
    return () => {
      if (typeof cancelIdleCallback === 'function') cancelIdleCallback(handle as number)
      else clearTimeout(handle as number)
    }
  }, [])

  if (!notebook) {
    return (
      <main className="grid min-h-dvh place-items-center p-lg">
        <p className="font-hand text-lg text-ink">Questo quaderno non c'è più.</p>
      </main>
    )
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-desk">
      <h1 className="sr-only">{notebook.title || 'Raccoglitore'}</h1>
      <NotebookHeader
        title={notebook.title}
        onTitleChange={(t) => renameNotebook(notebook.id, t)}
        pageLabel="Foglio unico"
        onBack={() => {
          if (reduced || !shelfRect) navigate('/')
          else setClosing(true)
        }}
        saveState={saveState}
        clearLabel="Svuota questo foglio"
        onClearPages={() => {
          clearPage(notebook.id, 0)
          setInitial('')
          setEpoch((e) => e + 1)
          ping()
        }}
        onDelete={() => {
          removeNotebook(notebook.id)
          navigate('/')
        }}
      />

      {/* La scrollbar sta qui, sul foglio, non dentro l'editor: così la
          barra in basso resta ferma mentre il documento scorre. */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Editor key={epoch} stored={initial} onSave={(json) => save(json, epoch)} onPing={ping} />
      </div>

      {closing && shelfRect && (
        <OpeningTransition
          notebook={notebook}
          from={shelfRect}
          direction="close"
          onDone={() => navigate('/')}
        />
      )}
    </main>
  )
}
