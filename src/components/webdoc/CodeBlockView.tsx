import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/core'
import { MermaidPreview } from './MermaidPreview'

const LANGUAGES = [
  { id: 'plaintext', label: 'Testo' },
  { id: 'python', label: 'Python' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'sql', label: 'SQL' },
  { id: 'bash', label: 'Shell' },
  { id: 'json', label: 'JSON' },
  { id: 'yaml', label: 'YAML' },
  { id: 'mermaid', label: 'Diagramma' },
]

export function CodeBlockView({ node, updateAttributes }: NodeViewProps) {
  const language = typeof node.attrs['language'] === 'string' ? node.attrs['language'] : 'plaintext'

  return (
    <NodeViewWrapper className="relative">
      {/* Il selettore sta sopra il blocco e pesa poco: è un'etichetta, non un
          controllo da premere spesso. L'area di click resta di 44px. */}
      <div contentEditable={false} className="-mb-2xs flex justify-end">
        <select
          value={language}
          onChange={(e) => updateAttributes({ language: e.target.value })}
          aria-label="Linguaggio del blocco di codice"
          className="h-11 cursor-pointer rounded-md bg-transparent px-xs text-2xs text-graphite transition-colors hover:bg-desk"
        >
          {LANGUAGES.map(({ id, label }) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <pre>
        <NodeViewContent<'code'> as="code" />
      </pre>
      {/* Il diagramma è un blocco di codice come gli altri: si scrive il
          sorgente e si vede sotto. Nessun nodo nuovo da migrare. */}
      {language === 'mermaid' && <MermaidPreview text={node.textContent} />}
    </NodeViewWrapper>
  )
}
