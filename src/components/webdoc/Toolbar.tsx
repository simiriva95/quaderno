import {
  Bold,
  Code,
  Heading2,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Plus,
  Redo2,
  SquareCode,
  Table as TableIcon,
  Undo2,
} from 'lucide-react'
import { useRef, type ReactNode } from 'react'
import { useEditorState } from '@tiptap/react'
import type { Editor as TiptapEditor } from '@tiptap/core'

/** Il vassoio in basso, come nel quaderno di carta: stessa altezza, sempre lì,
 *  bottoni da 44px. Le icone da 28px del gusto Notion qui sarebbero un
 *  bersaglio che il telefono non prende. */

const WIDTH_STEP = 80

interface Props {
  editor: TiptapEditor | null
  onInsertImage: (files: FileList | null) => void
}

export function Toolbar({ editor, onInsertImage }: Props) {
  const file = useRef<HTMLInputElement>(null)

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive('bold'),
            italic: e.isActive('italic'),
            code: e.isActive('code'),
            heading: e.isActive('heading', { level: 2 }),
            bullet: e.isActive('bulletList'),
            ordered: e.isActive('orderedList'),
            task: e.isActive('taskList'),
            codeBlock: e.isActive('codeBlock'),
            image: e.isActive('image'),
            imageWidth: Number(e.getAttributes('image')['width']) || 0,
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
          }
        : null,
  })

  if (!editor || !state) return <div className="h-[5.25rem] shrink-0" />

  // Le maniglie di ridimensionamento sono solo per il mouse: da tastiera la
  // larghezza si cambia da qui.
  const resize = (delta: number) => {
    const next = Math.max(WIDTH_STEP, (state.imageWidth || 320) + delta)
    editor.chain().focus().updateAttributes('image', { width: next }).run()
  }

  return (
    <div className="flex h-[5.25rem] shrink-0 items-start justify-center overflow-x-auto pb-xs">
      <div
        role="toolbar"
        aria-label="Strumenti del documento"
        className="flex items-center gap-2xs rounded-lg bg-paper p-2xs shadow-paper"
      >
        <Tool
          label="Grassetto"
          active={state.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={19} strokeWidth={1.75} />
        </Tool>
        <Tool
          label="Corsivo"
          active={state.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={19} strokeWidth={1.75} />
        </Tool>
        <Tool
          label="Codice in linea"
          active={state.code}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code size={19} strokeWidth={1.75} />
        </Tool>
        <Tool
          label="Titolo"
          active={state.heading}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 size={19} strokeWidth={1.75} />
        </Tool>

        <Rule />

        <Tool
          label="Elenco puntato"
          active={state.bullet}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={19} strokeWidth={1.75} />
        </Tool>
        <Tool
          label="Elenco numerato"
          active={state.ordered}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={19} strokeWidth={1.75} />
        </Tool>
        <Tool
          label="Cose da fare"
          active={state.task}
          onClick={() => editor.chain().focus().toggleTaskList().run()}
        >
          <ListTodo size={19} strokeWidth={1.75} />
        </Tool>

        <Rule />

        <Tool
          label="Blocco di codice"
          active={state.codeBlock}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <SquareCode size={19} strokeWidth={1.75} />
        </Tool>
        <Tool
          label="Tabella"
          // Le intestazioni nascono con un nome: vuote sono una violazione
          // axe (`empty-table-header`), e comunque si riscrivono al volo.
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .insertContent('Colonna 1')
              .goToNextCell()
              .insertContent('Colonna 2')
              .goToNextCell()
              .insertContent('Colonna 3')
              .run()
          }
        >
          <TableIcon size={19} strokeWidth={1.75} />
        </Tool>
        <Tool label="Immagine" onClick={() => file.current?.click()}>
          <ImagePlus size={19} strokeWidth={1.75} />
        </Tool>
        <input
          ref={file}
          type="file"
          accept="image/*"
          multiple
          aria-label="Aggiungi un'immagine"
          className="sr-only"
          onChange={(e) => {
            onInsertImage(e.target.files)
            e.target.value = ''
          }}
        />

        {state.image && (
          <>
            <Rule />
            <Tool label="Rimpicciolisci l'immagine" onClick={() => resize(-WIDTH_STEP)}>
              <Minus size={19} strokeWidth={1.75} />
            </Tool>
            <Tool label="Ingrandisci l'immagine" onClick={() => resize(WIDTH_STEP)}>
              <Plus size={19} strokeWidth={1.75} />
            </Tool>
          </>
        )}

        <Rule />

        <Tool
          label="Annulla"
          disabled={!state.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 size={19} strokeWidth={1.75} />
        </Tool>
        <Tool
          label="Rifai"
          disabled={!state.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 size={19} strokeWidth={1.75} />
        </Tool>
      </div>
    </div>
  )
}

const Rule = () => <span aria-hidden="true" className="mx-2xs h-6 w-px bg-graphite/20 shrink-0" />

function Tool({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`grid size-11 shrink-0 place-items-center rounded-md transition-colors disabled:opacity-30 ${
        active ? 'bg-desk text-ink' : 'text-graphite hover:bg-desk'
      }`}
    >
      {children}
    </button>
  )
}
