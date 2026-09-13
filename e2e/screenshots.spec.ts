import { test, type Page } from '@playwright/test'
import { DEMO_NOTEBOOK, DEMO_RACCOGLITORE, seed } from './seed'

/** Uno scarabocchio deterministico: una spirale e una sottolineatura. */
const demoStrokes = [
  {
    tool: 'pencil',
    color: '#2F3E6B',
    size: 1,
    points: Array.from({ length: 90 }, (_, i) => {
      const a = i / 9
      const r = 20 + i * 1.5
      return [300 + Math.cos(a) * r, 300 + Math.sin(a) * r * 0.8, 0.45 + (i % 7) * 0.05]
    }),
  },
  {
    tool: 'marker',
    color: '#E8B4A0',
    size: 2,
    points: Array.from({ length: 40 }, (_, i) => [120 + i * 9, 620 + Math.sin(i / 4) * 6, 0.6]),
  },
  {
    tool: 'highlighter',
    color: '#FFE98A',
    size: 2,
    points: Array.from({ length: 30 }, (_, i) => [140 + i * 11, 700, 0.5]),
  },
]

const manyNotebooks = [
  'cipria',
  'pesca',
  'burro',
  'salvia',
  'menta',
  'cielo',
  'lavanda',
  'malva',
  'terracotta',
].map((color, i) => ({
  ...DEMO_NOTEBOOK,
  id: `n${i}`,
  // due raccoglitori in mezzo ai quaderni: sulla mensola devono distinguersi
  ...(i === 3 || i === 7 ? { kind: 'web' as const } : {}),
  title: [
    'Storia',
    'Matematica',
    'Latino',
    'Fisica',
    'Ricette',
    'Sogni',
    'Inglese',
    'Filosofia',
    'Chimica',
  ][i],
  cover: {
    ...DEMO_NOTEBOOK.cover,
    color,
    pattern: ['plain', 'dots', 'stripes', 'gingham', 'stars', 'clouds', 'dots', 'stars', 'plain'][
      i
    ],
    spineColor: [
      'terracotta',
      'lino',
      'salvia',
      'cipria',
      'cielo',
      'burro',
      'malva',
      'menta',
      'pesca',
    ][i],
    sticker: ['stella', 'gatto', 'foglia', 'luna', 'tazza', 'nuvola', 'fiore', 'cuore', 'fungo'][i],
  },
}))

/** Non è un test di regressione: è come le schermate finiscono in /screenshots
 *  per la review visiva a fine milestone. */
const shots: { name: string; go: (p: Page) => Promise<void> }[] = [
  {
    name: 'mensola',
    go: async (p) => {
      await p.goto('/#/')
    },
  },
  {
    name: 'mensola-piena',
    go: async (p) => {
      await seed(p, manyNotebooks)
      await p.goto('/#/')
      await p.waitForTimeout(1400)
    },
  },
  {
    name: 'atelier',
    go: async (p) => {
      await p.goto('/#/nuovo')
    },
  },
  {
    name: 'quaderno-testo',
    go: async (p) => {
      await seed(p)
      await p.goto('/#/q/demo')
      await p.waitForSelector('.paper')
    },
  },
  {
    name: 'quaderno-disegno',
    go: async (p) => {
      await seed(p, [
        {
          ...DEMO_NOTEBOOK,
          paper: 'grid',
          pages: [{ ...DEMO_NOTEBOOK.pages[0], text: '', strokes: demoStrokes }],
        },
      ])
      await p.goto('/#/q/demo')
      await p.waitForSelector('.paper')
      await p.getByRole('radio', { name: 'Disegno' }).click()
      await p.waitForTimeout(600)
    },
  },
  {
    name: 'raccoglitore',
    go: async (p) => {
      await seed(p, [DEMO_RACCOGLITORE])
      await p.goto('/#/w/raccoglitore')
      await p.waitForSelector('.mermaid-figure svg', { timeout: 15000 })
    },
  },
  {
    name: 'mensola-vuota',
    go: async (p) => {
      await seed(p, [])
      await p.goto('/#/')
    },
  },
]

for (const theme of ['light', 'dark'] as const) {
  for (const { name, go } of shots) {
    test(`${name} — ${theme}`, async ({ page }, info) => {
      await page.emulateMedia({ colorScheme: theme })
      await go(page)
      await page.waitForTimeout(500)
      await page.screenshot({ path: `screenshots/${name}-${theme}-${info.project.name}.png` })
    })
  }
}
