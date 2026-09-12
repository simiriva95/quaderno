#!/usr/bin/env node
/**
 * Screenshot curati per README e GitHub: quaderni veri con testo e disegni,
 * luce e sera, desktop e telefono. Deterministici: stessi dati, stesse
 * posizioni. Rigenerare con `node scripts/screens.mjs [baseURL]`.
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const base = process.argv[2] ?? 'http://localhost:4173'
const OUT = 'docs/screenshots'
mkdirSync(OUT, { recursive: true })

const nb = (i, title, color, pattern, sticker, spine, paper, text, strokes = []) => ({
  id: `nb${i}`,
  title,
  createdAt: 1.7e12 + i * 1e6,
  updatedAt: 1.7e12 + i * 1e6,
  cover: { color, pattern, sticker, labelText: '', spineColor: spine, elastic: i % 2 === 0 },
  paper,
  lastOpenedPageIndex: 0,
  pages: [
    { id: `p${i}a`, text, strokes, createdAt: 1.7e12 },
    { id: `p${i}b`, text: '', strokes: [], createdAt: 1.7e12 },
  ],
})

// una curva a mano: onda + freccia, in spazio pagina 600×840
const wave = (y0, color, tool = 'pen', size = 1) => ({
  tool,
  color: `var(--c-${color})`,
  size,
  points: Array.from({ length: 40 }, (_, k) => {
    const t = k / 39
    return [+(80 + t * 440).toFixed(1), +(y0 + Math.sin(t * Math.PI * 2) * 28).toFixed(1), 0.6]
  }),
})
const line = (y, x0, x1, color, tool, size) => ({
  tool,
  color: `var(--c-${color})`,
  size,
  points: Array.from({ length: 12 }, (_, k) => [
    +(x0 + ((x1 - x0) * k) / 11).toFixed(1),
    +(y + Math.sin(k) * 1.5).toFixed(1),
    0.7,
  ]),
})

const NOTE_TEXT =
  '<span class="hand-title">Il Romanticismo</span>​Movimento culturale nato in Germania alla fine del Settecento, poi in tutta Europa.<div>Temi: <mark class="hl-giallo">la natura, il sentimento, il sublime</mark>, la nazione.</div><div><br></div><div><span class="hand-title">Da ricordare</span>​</div><div><label class="todo" contenteditable="false"><input type="checkbox" aria-label="Fatto" checked /></label>&nbsp;Leggere Leopardi, <u>L\'infinito</u></div><div><label class="todo" contenteditable="false"><input type="checkbox" aria-label="Fatto" /></label>&nbsp;Ripassare Foscolo per <span class="ink-rosso">venerdì</span></div><div><label class="todo" contenteditable="false"><input type="checkbox" aria-label="Fatto" /></label>&nbsp;Schema dei Sepolcri</div>'

const MATH_TEXT =
  '<span class="hand-title">Derivate</span>​<mark class="hl-menta">f\'(x) = lim (f(x+h) − f(x)) / h</mark><div><br></div><div>Regole:</div><div>· (xⁿ)\' = n·xⁿ⁻¹</div><div>· (sin x)\' = cos x</div><div>· (eˣ)\' = eˣ</div><div><br></div><div><span class="ink-viola">Esercizi pag. 214, n. 3–9</span></div>'

const notebooks = [
  nb(0, 'Letteratura', 'lavanda', 'stars', 'gatto', 'malva', 'lined', NOTE_TEXT, [
    wave(600, 'ink', 'pen', 1),
    line(660, 90, 500, 'ink-red', 'marker', 1),
  ]),
  nb(1, 'Matematica', 'burro', 'gingham', 'stella', 'terracotta', 'grid', MATH_TEXT, [
    wave(560, 'ink-violet', 'pencil', 1),
    line(640, 90, 300, 'hl-yellow', 'highlighter', 2),
  ]),
  nb(2, 'Storia', 'menta', 'dots', 'nuvola', 'salvia', 'lined', ''),
  nb(3, 'Ricette', 'pesca', 'plain', 'tazza', 'cipria', 'blank', ''),
  nb(4, 'Idee', 'cielo', 'clouds', 'luna', 'lavanda', 'grid', ''),
  nb(5, 'Diario', 'cipria', 'stripes', 'cuore', 'pesca', 'lined', ''),
  nb(6, 'Biologia', 'salvia', 'dots', 'foglia', 'menta', 'lined', ''),
]

const browser = await chromium.launch({ channel: 'chromium' })
const seed = async (page, theme) => {
  await page.goto(base + '/#/')
  await page.evaluate(
    ([nbs, theme]) => {
      localStorage.setItem(
        'quaderno:v1',
        JSON.stringify({ state: { notebooks: nbs, quotaExceeded: false }, version: 1 }),
      )
      localStorage.setItem(
        'quaderno:prefs:v1',
        JSON.stringify({
          state: {
            theme,
            sounds: false,
            tool: 'pen',
            toolColor: 'ink',
            toolSize: 1,
            ink: 'ink',
            textSize: 'M',
          },
          version: 1,
        }),
      )
      sessionStorage.clear()
    },
    [notebooks, theme],
  )
  await page.reload()
  await page.waitForLoadState('networkidle')
}

const desktop = { viewport: { width: 1440, height: 900 } }
const phone = {
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
}

for (const theme of ['light', 'dark']) {
  const p = await browser.newPage(desktop)
  await seed(p, theme)
  await p.waitForTimeout(2600)
  await p.mouse.move(720, 300)
  await p.waitForTimeout(500)
  await p.screenshot({ path: `${OUT}/mensola-${theme}.png` })
  // apri Letteratura
  await p.goto(base + '/#/q/nb0')
  await p.waitForTimeout(1500)
  await p.screenshot({ path: `${OUT}/quaderno-testo-${theme}.png` })
  await p.getByRole('radio', { name: 'Disegno' }).first().click()
  await p.waitForTimeout(700)
  await p.screenshot({ path: `${OUT}/quaderno-disegno-${theme}.png` })
  await p.close()
}

// atelier e zoom, luce
{
  const p = await browser.newPage(desktop)
  await seed(p, 'light')
  await p.goto(base + '/#/nuovo')
  await p.waitForTimeout(600)
  await p.getByPlaceholder('Appunti di…').fill('Filosofia')
  await p.getByRole('button', { name: 'Copertina Cielo' }).click()
  await p.getByRole('button', { name: 'Nuvolette' }).click()
  await p
    .getByRole('button', { name: 'Lunetta' })
    .click()
    .catch(() =>
      p
        .getByRole('button', { name: /Luna/ })
        .click()
        .catch(() => {}),
    )
  await p.waitForTimeout(600)
  await p.screenshot({ path: `${OUT}/atelier.png` })
  await p.goto(base + '/#/q/nb1')
  await p.waitForTimeout(1400)
  await p.locator('button[aria-label="Aumenta zoom"]:visible').click()
  await p.waitForTimeout(400)
  await p.locator('button[aria-label="Aumenta zoom"]:visible').click()
  await p.waitForTimeout(500)
  await p.screenshot({ path: `${OUT}/zoom-quarto.png` })
  await p.close()
}

// telefono
{
  const p = await browser.newPage(phone)
  await seed(p, 'light')
  await p.waitForTimeout(2600)
  await p.screenshot({ path: `${OUT}/telefono-mensola.png` })
  await p.goto(base + '/#/q/nb0')
  await p.waitForTimeout(1500)
  await p.screenshot({ path: `${OUT}/telefono-testo.png` })
  await p.getByRole('radio', { name: 'Disegno' }).first().click()
  await p.waitForTimeout(700)
  await p.screenshot({ path: `${OUT}/telefono-disegno.png` })
  await p.close()
}
await browser.close()
console.log('✓ screenshot in', OUT)
