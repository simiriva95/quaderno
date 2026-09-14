import { EditorContent, useEditor } from '@tiptap/react'
import type { Editor as TiptapEditor, JSONContent } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extensions/placeholder'
import { Image } from '@tiptap/extension-image'
import { Highlight } from '@tiptap/extension-highlight'
import { useEffect, useRef } from 'react'
import { putBlob, shrink } from '../../lib/blobs'
import { dehydrate, hydrate, scrub } from '../../lib/docimages'
import { newId } from '../../lib/id'
import { CodeBlock } from './codeblock'
import { TaskItem, TaskList } from './tasks'
import { Table, TableCell, TableHeader, TableRow } from './table'
import { Toolbar } from './Toolbar'

const PLACEHOLDER = 'Scrivi, incolla uno screenshot, apri un blocco di codice con ```'

/** Il salvataggio non può stare su ogni tasto come sulla carta: `persist`
 *  riscrive l'intero array dei quaderni, e qui il documento è 50–200 KB. */
const SAVE_DELAY = 500

interface Props {
  /** il documento salvato: JSON di TipTap, o '' per un foglio nuovo */
  stored: string
  onSave: (json: string) => void
  onPing: () => void
}

export function Editor({ stored, onSave, onPing }: Props) {
  // Gli object URL delle immagini: creati qui, revocati allo smontaggio.
  const urls = useRef(new Map<string, string>())
  const timer = useRef<number | null>(null)
  const latest = useRef<JSONContent | null>(null)
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  const flush = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current)
      timer.current = null
    }
    const doc = latest.current
    if (!doc) return
    latest.current = null
    onSaveRef.current(JSON.stringify(dehydrate(structuredClone(doc), urls.current)))
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        link: { protocols: ['http', 'https', 'mailto'], openOnClick: false },
      }),
      Placeholder.configure({ placeholder: PLACEHOLDER }),
      // L'evidenziatore è il gesto di chi ripassa: il quaderno a mano ne ha
      // tre, qui basta un colore.
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlock,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        allowBase64: false,
        resize: { enabled: true, minWidth: 80, alwaysPreserveAspectRatio: true },
      }),
    ],
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': 'Documento',
        class: 'tiptap',
      },
      handlePaste: (_view, event) => insert(editorRef.current, event.clipboardData?.files, urls),
      handleDrop: (_view, event) =>
        insert(editorRef.current, (event as DragEvent).dataTransfer?.files, urls),
    },
    onUpdate: ({ editor: e }) => {
      latest.current = e.getJSON()
      onPing()
      if (timer.current !== null) clearTimeout(timer.current)
      timer.current = window.setTimeout(flush, SAVE_DELAY)
    },
    onBlur: flush,
  })

  const editorRef = useRef<TiptapEditor | null>(null)
  editorRef.current = editor

  // Il documento salvato cita `qimg:<id>`: i blob arrivano da IndexedDB e
  // diventano object URL solo qui dentro, e muoiono con l'effetto.
  useEffect(() => {
    if (!editor || !stored) return
    const map = urls.current
    let alive = true
    let parsed: JSONContent | null = null
    try {
      parsed = JSON.parse(stored) as JSONContent
    } catch {
      parsed = null
    }
    if (parsed) {
      void hydrate(scrub(parsed), map).then((doc) => {
        if (alive) editor.commands.setContent(doc, { emitUpdate: false })
      })
    }
    return () => {
      alive = false
    }
    // solo al primo montaggio dell'editor: dopo, la verità è nell'editor
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor])

  // Gli URL vivono quanto il componente. StrictMode monta due volte: creare
  // e revocare devono stare nello stesso effetto.
  useEffect(() => {
    const map = urls.current
    return () => {
      for (const url of map.values()) URL.revokeObjectURL(url)
      map.clear()
    }
  }, [])

  // Chiudere la scheda con il debounce ancora in volo perderebbe l'ultimo
  // mezzo secondo di scrittura.
  useEffect(() => {
    const save = () => flush()
    window.addEventListener('beforeunload', save)
    return () => {
      window.removeEventListener('beforeunload', save)
      save()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <>
      {/* Un foglio vero, non testo sulla scrivania: il resto dell'app è fatto
          di oggetti che poggiano da qualche parte, e questo non può essere
          l'unico che galleggia. */}
      <div className="web-doc mx-auto my-sm w-full max-w-[72ch] bg-paper px-md py-lg shadow-lift sm:rounded-lg sm:px-lg">
        <EditorContent editor={editor} />
      </div>
      <Toolbar editor={editor} onInsertImage={(files) => insert(editor, files, urls)} />
    </>
  )
}

/** Incolla o trascina: si rimpicciolisce, si mostra subito con un object URL,
 *  e il blob scende in IndexedDB per conto suo. Il `true` ferma la gestione
 *  di ProseMirror, che altrimenti incollerebbe il nome del file. */
function insert(
  editor: TiptapEditor | null,
  files: FileList | null | undefined,
  urls: { current: Map<string, string> },
): boolean {
  const images = Array.from(files ?? []).filter((f) => f.type.startsWith('image/'))
  if (!editor || images.length === 0) return false

  void (async () => {
    for (const file of images) {
      const blob = await shrink(file)
      const id = newId()
      const url = URL.createObjectURL(blob)
      urls.current.set(id, url)
      editor
        .chain()
        .focus()
        .setImage({ src: url, alt: file.name || 'Immagine' })
        .run()
      await putBlob(id, blob)
    }
  })()
  return true
}
