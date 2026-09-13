import type { Page } from '@playwright/test'

const demoPage = (text: string) => ({
  id: Math.random().toString(36).slice(2),
  text,
  strokes: [],
  createdAt: 1700000000000,
})

const DOC = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: {
        level: 2,
      },
      content: [
        {
          type: 'text',
          text: 'RAG, in due minuti',
        },
      ],
    },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Il retriever cerca i ',
        },
        {
          type: 'text',
          marks: [
            {
              type: 'code',
            },
          ],
          text: 'k',
        },
        {
          type: 'text',
          text: ' pezzi più vicini nello spazio degli embedding e li mette nel prompt. Più contesto non è meglio: conta la densità.',
        },
      ],
    },
    {
      type: 'codeBlock',
      attrs: {
        language: 'mermaid',
      },
      content: [
        {
          type: 'text',
          text: 'flowchart LR\n  Q[Domanda] --> E[Embedding]\n  E --> V[(Vector DB)]\n  V --> C[Contesto]\n  C --> L[LLM] --> R[Risposta]',
        },
      ],
    },
    {
      type: 'codeBlock',
      attrs: {
        language: 'python',
      },
      content: [
        {
          type: 'text',
          text: 'hits = index.query(embed(domanda), top_k=4)\ncontesto = "\\n\\n".join(h.text for h in hits)\nrisposta = llm(PROMPT.format(contesto=contesto, domanda=domanda))',
        },
      ],
    },
    {
      type: 'taskList',
      content: [
        {
          type: 'taskItem',
          attrs: {
            checked: true,
          },
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'provare chunk da 400 e da 800 token',
                },
              ],
            },
          ],
        },
        {
          type: 'taskItem',
          attrs: {
            checked: false,
          },
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'misurare il recall con le domande della lezione 12',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}

export const DEMO_NOTEBOOK = {
  id: 'demo',
  title: 'Appunti di Storia',
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  cover: {
    color: 'salvia',
    pattern: 'dots',
    sticker: 'stella',
    labelText: 'Appunti di Storia',
    spineColor: 'terracotta',
    elastic: true,
  },
  paper: 'lined',
  lastOpenedPageIndex: 0,
  pages: [
    demoPage(
      '<span class="hand-title">La rivoluzione industriale</span><div><br></div>' +
        '<div>Il vapore cambia tutto: prima la <mark class="hl-giallo">filatura</mark>, poi il trasporto.</div>' +
        '<div>Manchester passa da 25.000 a 300.000 abitanti in ottant’anni.</div><div><br></div>' +
        '<div><span class="ink-rosso">Da ricordare:</span> il telaio meccanico e la macchina di Watt.</div>' +
        '<div><br></div><div><label class="todo" contenteditable="false"><input type="checkbox" checked /></label>&nbsp;leggere il capitolo 4</div>' +
        '<div><label class="todo" contenteditable="false"><input type="checkbox" /></label>&nbsp;rifare lo schema delle date</div>',
    ),
    demoPage('<div>Le <u>enclosures</u> svuotano le campagne.</div>'),
  ],
}

/** Il raccoglitore: foglio unico, JSON di TipTap dentro `pages[0].text`. */
export const DEMO_RACCOGLITORE = {
  id: 'raccoglitore',
  title: 'AI Engineering',
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
  kind: 'web',
  cover: {
    color: 'cielo',
    pattern: 'plain',
    labelText: 'AI Engineering',
    spineColor: 'lino',
    elastic: false,
  },
  paper: 'blank',
  lastOpenedPageIndex: 0,
  pages: [
    {
      id: 'doc',
      text: JSON.stringify(DOC),
      strokes: [],
      createdAt: 1700000000000,
    },
  ],
}

export async function seed(page: Page, notebooks: unknown[] = [DEMO_NOTEBOOK]) {
  await page.addInitScript((nbs) => {
    localStorage.setItem('quaderno:v1', JSON.stringify({ state: { notebooks: nbs }, version: 1 }))
  }, notebooks)
}
