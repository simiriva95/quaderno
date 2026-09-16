import {
  Bold,
  Code,
  Heading2,
  Heading3,
  Highlighter,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  Minus,
  Plus,
  Quote,
  Redo2,
  RemoveFormatting,
  SeparatorHorizontal,
  SquareCode,
  Table as TableIcon,
  Undo2,
  Workflow,
} from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useEditorState } from '@tiptap/react'
import type { Editor as TiptapEditor } from '@tiptap/core'

/** ── Il vassoio ───────────────────────────────────────────────────────────
 *  Nel quaderno a mano gli strumenti sono penne colorate: si capiscono a
 *  vista. Qui le icone sono astratte — due parentesi angolari sono "codice",
 *  ma quale dei due? — quindi ogni tasto dice il suo nome: con una targhetta
 *  al passaggio del mouse o del focus, e per esteso nel menu "Inserisci",
 *  che è l'unico posto dove i blocchi si scelgono leggendo.               */

const WIDTH_STEP = 80

const MAC = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.userAgent)
/** "Mod+Alt+C" → "⌘⌥C" oppure "Ctrl+Alt+C" */
const keys = (combo: string): string =>
  combo
    .split('+')
    .map((k) =>
      k === 'Mod'
        ? MAC
          ? '⌘'
          : 'Ctrl+'
        : k === 'Alt'
          ? MAC
            ? '⌥'
            : 'Alt+'
          : k === 'Shift'
            ? '⇧'
            : k,
    )
    .join('')

const MERMAID_ESEMPIO = 'flowchart LR\n  A[Domanda] --> B[Contesto] --> C[Risposta]'

/** La barra scorre in orizzontale sul telefono, e un contenitore che scorre
 *  ritaglia anche in verticale: targhette e menu, che vivono sopra la barra,
 *  sparivano. Vanno in un portale, ancorati al tasto in coordinate di
 *  finestra. */
function Floating({
  anchor,
  open,
  children,
}: {
  anchor: React.RefObject<HTMLElement | null>
  open: boolean
  children: ReactNode
}) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  // La posizione si misura sul DOM: è l'unico modo di sapere dov'è il tasto.
  // In layout e non in un effetto normale, o la targhetta lampeggia
  // nell'angolo prima di mettersi a posto. Chiudendo non si azzera niente:
  // non si disegna nulla, e alla riapertura la misura arriva prima del paint.
  useLayoutEffect(() => {
    if (!open || !anchor.current) return
    const place = () => {
      const r = anchor.current?.getBoundingClientRect()
      if (r) setPos({ x: r.left + r.width / 2, y: r.top })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, anchor])

  if (!open || !pos) return null
  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y - 8,
        transform: 'translate(-50%, -100%)',
      }}
      className="z-50"
    >
      {children}
    </div>,
    // dentro <main>, non in fondo al body: axe chiede che ogni contenuto stia
    // in un punto di riferimento della pagina, e la posizione è comunque fissa
    document.querySelector('main') ?? document.body,
  )
}

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
            highlight: e.isActive('highlight'),
            code: e.isActive('code'),
            link: e.isActive('link'),
            href: String(e.getAttributes('link')['href'] ?? ''),
            image: e.isActive('image'),
            imageWidth: Number(e.getAttributes('image')['width']) || 0,
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
          }
        : null,
  })

  if (!editor || !state) return <div className="h-[3.75rem] shrink-0" />

  // Le maniglie di ridimensionamento sono solo per il mouse: da tastiera la
  // larghezza si cambia da qui.
  const resize = (delta: number) => {
    const next = Math.max(WIDTH_STEP, (state.imageWidth || 320) + delta)
    editor.chain().focus().updateAttributes('image', { width: next }).run()
  }

  return (
    <div className="sticky bottom-0 flex h-[3.75rem] shrink-0 items-start justify-center px-md pb-2xs">
      <div
        role="toolbar"
        aria-label="Strumenti del documento"
        className="flex max-w-full items-center gap-2xs overflow-x-auto rounded-lg bg-paper p-2xs shadow-paper"
      >
        <Tool
          label="Grassetto"
          shortcut="Mod+B"
          active={state.bold}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={19} strokeWidth={1.75} />
        </Tool>
        <Tool
          label="Corsivo"
          shortcut="Mod+I"
          active={state.italic}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={19} strokeWidth={1.75} />
        </Tool>
        <Tool
          label="Evidenzia"
          shortcut="Mod+Shift+H"
          active={state.highlight}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
        >
          <Highlighter size={19} strokeWidth={1.75} />
        </Tool>
        <Tool
          label="Codice in mezzo al testo"
          shortcut="Mod+E"
          active={state.code}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code size={19} strokeWidth={1.75} />
        </Tool>
        <LinkButton editor={editor} active={state.link} href={state.href} />

        <Rule />

        <InsertMenu editor={editor} onPickImage={() => file.current?.click()} />
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
            <Tool label="Immagine più piccola" onClick={() => resize(-WIDTH_STEP)}>
              <Minus size={19} strokeWidth={1.75} />
            </Tool>
            <Tool label="Immagine più grande" onClick={() => resize(WIDTH_STEP)}>
              <Plus size={19} strokeWidth={1.75} />
            </Tool>
          </>
        )}

        <Rule />

        <Tool
          label="Annulla"
          shortcut="Mod+Z"
          disabled={!state.canUndo}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 size={19} strokeWidth={1.75} />
        </Tool>
        <Tool
          label="Rifai"
          shortcut="Mod+Shift+Z"
          disabled={!state.canRedo}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 size={19} strokeWidth={1.75} />
        </Tool>
      </div>
    </div>
  )
}

/** ── Inserisci ────────────────────────────────────────────────────────────
 *  I blocchi si scelgono per nome, non indovinando l'icona. È anche l'unico
 *  posto dove si scopre che il diagramma esiste.                          */
function InsertMenu({ editor, onPickImage }: { editor: TiptapEditor; onPickImage: () => void }) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      const t = e.target as Node
      if (!box.current?.contains(t) && !panel.current?.contains(t)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', esc)
    }
  }, [open])

  const c = () => editor.chain().focus()
  const items: {
    icon: ReactNode
    label: string
    hint?: string
    shortcut?: string
    run: () => void
  }[] = [
    {
      icon: <Heading2 size={17} strokeWidth={1.75} />,
      label: 'Titolo',
      shortcut: 'Mod+Alt+2',
      run: () => c().toggleHeading({ level: 2 }).run(),
    },
    {
      icon: <Heading3 size={17} strokeWidth={1.75} />,
      label: 'Sottotitolo',
      shortcut: 'Mod+Alt+3',
      run: () => c().toggleHeading({ level: 3 }).run(),
    },
    {
      icon: <List size={17} strokeWidth={1.75} />,
      label: 'Elenco puntato',
      shortcut: 'Mod+Shift+8',
      run: () => c().toggleBulletList().run(),
    },
    {
      icon: <ListOrdered size={17} strokeWidth={1.75} />,
      label: 'Elenco numerato',
      shortcut: 'Mod+Shift+7',
      run: () => c().toggleOrderedList().run(),
    },
    {
      icon: <ListTodo size={17} strokeWidth={1.75} />,
      label: 'Cose da fare',
      shortcut: 'Mod+Shift+9',
      run: () => c().toggleTaskList().run(),
    },
    {
      icon: <Quote size={17} strokeWidth={1.75} />,
      label: 'Citazione',
      shortcut: 'Mod+Shift+B',
      run: () => c().toggleBlockquote().run(),
    },
    {
      icon: <SquareCode size={17} strokeWidth={1.75} />,
      label: 'Blocco di codice',
      hint: 'anche con ``` a inizio riga',
      shortcut: 'Mod+Alt+C',
      run: () => c().toggleCodeBlock().run(),
    },
    {
      icon: <Workflow size={17} strokeWidth={1.75} />,
      label: 'Diagramma',
      hint: 'uno schema scritto, in Mermaid',
      run: () =>
        c()
          .insertContent({
            type: 'codeBlock',
            attrs: { language: 'mermaid' },
            content: [{ type: 'text', text: MERMAID_ESEMPIO }],
          })
          .run(),
    },
    {
      icon: <TableIcon size={17} strokeWidth={1.75} />,
      label: 'Tabella',
      run: () =>
        c()
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .insertContent('Colonna 1')
          .goToNextCell()
          .insertContent('Colonna 2')
          .goToNextCell()
          .insertContent('Colonna 3')
          .run(),
    },
    {
      icon: <ImagePlus size={17} strokeWidth={1.75} />,
      label: 'Immagine',
      hint: 'o incollala e basta',
      run: onPickImage,
    },
    {
      icon: <SeparatorHorizontal size={17} strokeWidth={1.75} />,
      label: 'Riga di separazione',
      run: () => c().setHorizontalRule().run(),
    },
    {
      icon: <RemoveFormatting size={17} strokeWidth={1.75} />,
      label: 'Togli la formattazione',
      run: () => c().unsetAllMarks().clearNodes().run(),
    },
  ]

  return (
    <div ref={box} className="shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`flex h-11 shrink-0 items-center gap-2xs rounded-md px-sm text-xs transition-colors ${
          open ? 'bg-desk text-ink' : 'text-graphite hover:bg-desk'
        }`}
      >
        <Plus size={18} strokeWidth={2} />
        Inserisci
      </button>
      <Floating anchor={box} open={open}>
        <div
          ref={panel}
          role="menu"
          aria-label="Cosa inserire"
          className="flex max-h-[62dvh] w-72 flex-col gap-2xs overflow-y-auto rounded-lg bg-paper p-xs shadow-lift"
        >
          {items.map(({ icon, label, hint, shortcut, run }) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              onClick={() => {
                run()
                setOpen(false)
              }}
              className="flex h-12 shrink-0 items-center gap-sm rounded-md px-sm text-left text-xs text-graphite transition-colors hover:bg-desk"
            >
              <span className="shrink-0">{icon}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-ink">{label}</span>
                {hint && <span className="block truncate text-2xs text-graphite">{hint}</span>}
              </span>
              {/* la scorciatoia è testo da leggere: smorzata con l'opacità
                  cadeva sotto il contrasto AA */}
              {shortcut && <kbd className="shrink-0 text-2xs text-graphite">{keys(shortcut)}</kbd>}
            </button>
          ))}
        </div>
      </Floating>
    </div>
  )
}

/** Il link chiede l'indirizzo sul posto: niente `prompt()` di sistema. */
function LinkButton({
  editor,
  active,
  href,
}: {
  editor: TiptapEditor
  active: boolean
  href: string
}) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const box = useRef<HTMLDivElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const t = window.setTimeout(() => input.current?.focus(), 0)
    const close = (e: PointerEvent) => {
      const n = e.target as Node
      if (!box.current?.contains(n) && !panel.current?.contains(n)) setOpen(false)
    }
    window.addEventListener('pointerdown', close)
    return () => {
      clearTimeout(t)
      window.removeEventListener('pointerdown', close)
    }
  }, [open])

  const apply = () => {
    const url = value.trim()
    const chain = editor.chain().focus().extendMarkRange('link')
    if (!url) {
      chain.unsetLink().run()
    } else {
      const href = /^[a-z]+:/i.test(url) ? url : `https://${url}`
      // senza niente di selezionato il collegamento non avrebbe su cosa
      // posarsi: si scrive l'indirizzo stesso, che è quello che si voleva
      if (editor.state.selection.empty) {
        chain
          .insertContent({ type: 'text', text: url, marks: [{ type: 'link', attrs: { href } }] })
          .run()
      } else {
        chain.setLink({ href }).run()
      }
    }
    setOpen(false)
  }

  return (
    <div ref={box} className="shrink-0">
      <Tool
        label="Collegamento"
        shortcut="Mod+K"
        active={active}
        onClick={() => {
          // l'indirizzo di partenza è quello del link sotto il cursore
          setValue(href)
          setOpen((o) => !o)
        }}
      >
        <Link2 size={19} strokeWidth={1.75} />
      </Tool>
      <Floating anchor={box} open={open}>
        <div
          ref={panel}
          className="flex w-72 items-center gap-2xs rounded-lg bg-paper p-xs shadow-lift"
        >
          <input
            ref={input}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') apply()
              if (e.key === 'Escape') setOpen(false)
            }}
            placeholder="incolla un indirizzo"
            aria-label="Indirizzo del collegamento"
            className="h-11 min-w-0 flex-1 rounded-md bg-desk px-sm text-xs text-ink outline-none"
          />
          <button
            type="button"
            onClick={apply}
            className="h-11 shrink-0 rounded-md px-sm text-xs text-graphite hover:bg-desk"
          >
            {value.trim() ? 'Applica' : 'Togli'}
          </button>
        </div>
      </Floating>
    </div>
  )
}

const Rule = () => <span aria-hidden="true" className="mx-2xs h-6 w-px shrink-0 bg-graphite/20" />

/** Un tasto che dice come si chiama, al passaggio del mouse e col focus da
 *  tastiera. `title` da solo arriva dopo un secondo e non si vede mai. */
function Tool({
  label,
  shortcut,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  shortcut?: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  const [show, setShow] = useState(false)
  const box = useRef<HTMLSpanElement>(null)
  return (
    <span ref={box} className="inline-flex shrink-0">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-pressed={active}
        onPointerEnter={() => setShow(true)}
        onPointerLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className={`grid size-11 shrink-0 place-items-center rounded-md transition-colors disabled:opacity-30 ${
          active ? 'bg-desk text-ink' : 'text-graphite hover:bg-desk'
        }`}
      >
        {children}
      </button>
      <Floating anchor={box} open={show && !disabled}>
        <span
          role="tooltip"
          className="pointer-events-none block whitespace-nowrap rounded-md bg-ink px-xs py-2xs text-2xs text-paper shadow-lift"
        >
          {label}
          {shortcut && <span className="ml-xs opacity-60">{keys(shortcut)}</span>}
        </span>
      </Floating>
    </span>
  )
}
