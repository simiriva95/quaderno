#!/usr/bin/env node
/**
 * Audit del portale: percorre TUTTI i casi d'uso come farebbe una studentessa
 * — mensola vuota, crea, scrivi, formatta, ingrandisci, disegna, sfoglia,
 * impostazioni, esporta, mensola piena, sera, telefono — e a ogni passo
 * raccoglie: screenshot, violazioni di accessibilità (axe-core), bersagli
 * tattili sotto 44px, testi sotto 12px, overflow orizzontale, errori in
 * console, tempi di caricamento. Alla fine scrive .audit/report.md e
 * report.json: la materia prima per il piano di miglioramento.
 *
 *   node scripts/audit.mjs [baseURL] [--out=.audit]
 */
import { chromium } from '@playwright/test'
import { createRequire } from 'node:module'
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { resolve } from 'node:path'

const require = createRequire(import.meta.url)
const AXE = require.resolve('axe-core/axe.min.js')

const args = process.argv.slice(2)
const base = args.find((a) => !a.startsWith('--')) ?? 'http://localhost:4173'
const OUT = resolve(args.find((a) => a.startsWith('--out='))?.split('=')[1] ?? '.audit')
mkdirSync(OUT, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const PROFILES = [
  { name: 'desktop', theme: 'light', viewport: { width: 1440, height: 900 } },
  { name: 'desktop-sera', theme: 'dark', viewport: { width: 1440, height: 900 } },
  { name: 'tablet', theme: 'light', viewport: { width: 1024, height: 768 } },
  {
    name: 'telefono',
    theme: 'light',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  },
]

const COLORS = [
  'menta',
  'pesca',
  'cielo',
  'lavanda',
  'burro',
  'terracotta',
  'salvia',
  'malva',
  'cipria',
]
const PATTERNS = ['plain', 'dots', 'stripes', 'gingham', 'stars', 'clouds']
const STICKERS = ['stella', 'nuvola', 'gatto', 'tazza', 'foglia', undefined]
const TITLES = [
  'Storia',
  'Matematica',
  'Idee',
  'Ricette',
  'Poesie',
  'Diario',
  'Fisica',
  'Latino',
  'Viaggi',
]
const seedNotebooks = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: `nb${i}`,
    title: TITLES[i % TITLES.length],
    createdAt: 1e12 + i,
    updatedAt: 1e12 + i,
    cover: {
      color: COLORS[i % COLORS.length],
      pattern: PATTERNS[i % PATTERNS.length],
      sticker: STICKERS[i % STICKERS.length],
      labelText: '',
      spineColor: COLORS[(i + 3) % COLORS.length],
      elastic: i % 2 === 0,
    },
    paper: ['lined', 'grid', 'blank'][i % 3],
    lastOpenedPageIndex: 0,
    pages: [{ id: `p${i}`, text: '', strokes: [], createdAt: 1e12 }],
  }))

const report = { generatedAt: new Date().toISOString(), base, profiles: [] }

class Audit {
  constructor(browser, profile) {
    this.browser = browser
    this.profile = profile
    this.steps = []
    this.errors = []
    this.dir = `${OUT}/${profile.name}`
    mkdirSync(this.dir, { recursive: true })
  }

  async open() {
    this.ctx = await this.browser.newContext({
      viewport: this.profile.viewport,
      isMobile: this.profile.isMobile,
      hasTouch: this.profile.hasTouch,
      deviceScaleFactor: this.profile.deviceScaleFactor,
      colorScheme: this.profile.theme,
    })
    this.page = await this.ctx.newPage()
    this.page.on('console', (m) => m.type() === 'error' && this.errors.push(m.text()))
    this.page.on('pageerror', (e) => this.errors.push(`pageerror: ${e.message}`))
    const t0 = Date.now()
    await this.page.goto(base + '/#/')
    await this.page.waitForLoadState('load')
    const timing = await this.page.evaluate(() => {
      const n = performance.getEntriesByType('navigation')[0]
      return n
        ? {
            domContentLoaded: Math.round(n.domContentLoadedEventEnd),
            load: Math.round(n.loadEventEnd),
          }
        : null
    })
    // quando compare la scena (canvas) o il fallback
    await this.page
      .waitForSelector('canvas, [role=img][aria-label*="mensola" i]', { timeout: 15000 })
      .catch(() => {})
    this.firstScene = Date.now() - t0
    this.timing = timing
    await this.page.evaluate((theme) => {
      localStorage.setItem(
        'quaderno:prefs:v1',
        JSON.stringify({
          state: {
            theme,
            sounds: false,
            tool: 'pencil',
            toolColor: 'ink',
            toolSize: 1,
            ink: 'ink',
            textSize: 'M',
          },
          version: 1,
        }),
      )
    }, this.profile.theme)
    await this.page.reload()
    await this.page.waitForLoadState('networkidle')
  }

  async axe() {
    const p = this.page
    await p.addScriptTag({ path: AXE }).catch(() => {})
    return p.evaluate(async () => {
      if (!window.axe) return []
      const r = await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] },
        resultTypes: ['violations'],
      })
      return r.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.length,
        sample: v.nodes[0]?.target?.join(' ') ?? '',
      }))
    })
  }

  async metrics() {
    return this.page.evaluate(() => {
      const vis = (el) => {
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        return (
          r.width > 0 &&
          r.height > 0 &&
          cs.visibility !== 'hidden' &&
          cs.display !== 'none' &&
          r.bottom > 0 &&
          r.top < innerHeight
        )
      }
      const targets = Array.from(
        document.querySelectorAll('button, a, input, [role=button], [role=radio], [role=menuitem]'),
      )
        .filter(vis)
        .map((el) => {
          const r = el.getBoundingClientRect()
          return {
            label: (
              el.getAttribute('aria-label') ||
              el.textContent ||
              el.getAttribute('placeholder') ||
              el.tagName
            )
              .trim()
              .slice(0, 40),
            w: Math.round(r.width),
            h: Math.round(r.height),
          }
        })
      const small = targets.filter((t) => t.w < 44 || t.h < 44)
      const texts = new Map()
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
      let node
      while ((node = walker.nextNode())) {
        const el = node.parentElement
        if (!el || !node.textContent.trim() || !vis(el)) continue
        if (el.closest('.sr-only, svg, canvas')) continue
        const fs = parseFloat(getComputedStyle(el).fontSize)
        if (fs < 12) texts.set(node.textContent.trim().slice(0, 30), Math.round(fs * 10) / 10)
      }
      return {
        targets: targets.length,
        smallTargets: small,
        smallTexts: Array.from(texts, ([t, fs]) => ({ text: t, px: fs })),
        overflowX: document.documentElement.scrollWidth - innerWidth,
      }
    })
  }

  async step(name, fn) {
    try {
      await fn()
    } catch (e) {
      this.errors.push(`step ${name}: ${String(e.message ?? e).split('\n')[0]}`)
    }
    await sleep(350)
    const shot = `${this.dir}/${String(this.steps.length + 1).padStart(2, '0')}-${name}.png`
    await this.page.screenshot({ path: shot }).catch(() => {})
    const [axe, metrics] = await Promise.all([this.axe(), this.metrics()])
    this.steps.push({ name, shot, axe, ...metrics, consoleErrors: this.errors.splice(0) })
    process.stdout.write(
      `  · ${this.profile.name}/${name}: axe ${axe.length}, piccoli ${metrics.smallTargets.length}\n`,
    )
  }

  // ── il percorso ──────────────────────────────────────────────────────
  async run() {
    const p = this.page
    const lens = (n) => p.locator(`button[aria-label="${n}"]:visible`)

    await this.step('mensola-vuota', async () => {})
    await this.step('atelier', async () => {
      await p.getByRole('button', { name: 'Crea il tuo primo quaderno' }).click()
      await p.waitForURL(/nuovo/)
    })
    await this.step('atelier-personalizzato', async () => {
      await p.getByPlaceholder('Appunti di…').fill('Letteratura')
      await p.getByRole('button', { name: 'Copertina Lavanda' }).click()
      await p.getByRole('button', { name: 'Stelline' }).click()
      await p.getByRole('button', { name: 'Gattino' }).click()
    })
    await this.step('quaderno-aperto', async () => {
      await p.getByRole('button', { name: 'Metti sulla mensola' }).click()
      await p.waitForURL(/#\/q\//)
      await sleep(1800)
    })
    await this.step('scrittura', async () => {
      const ed = p.getByRole('textbox', { name: 'Testo della pagina 1' })
      await ed.click()
      await p.keyboard.insertText('Il Romanticismo')
      await p.keyboard.press('Shift+Home')
      await p.getByRole('button', { name: 'Titolo' }).click()
      await p.keyboard.press('End')
      await p.keyboard.press('Enter')
      await p.keyboard.insertText('Movimento culturale nato in Germania alla fine del Settecento. ')
      await p.keyboard.insertText('Temi: la natura, il sentimento, il sublime, la nazione. ')
      await p.keyboard.press('Enter')
      await p.getByRole('button', { name: 'Casella da spuntare' }).click()
      await p.keyboard.insertText(' Leggere Leopardi, "L\'infinito"')
      await p.keyboard.press('Enter')
      await p.getByRole('button', { name: 'Casella da spuntare' }).click()
      await p.keyboard.insertText(' Ripassare Foscolo per venerdì')
      await p.keyboard.press('Shift+Home')
      await p.getByRole('button', { name: 'Evidenziatore giallo' }).click()
      await p.keyboard.press('End')
    })
    await this.step('corpo-grande', async () => {
      await p.getByRole('radio', { name: /Scrittura grande/ }).click()
    })
    await this.step('zoom-pagina', async () => {
      await lens('Aumenta zoom').click()
    })
    await this.step('zoom-quarto', async () => {
      if (await lens('Aumenta zoom').count()) await lens('Aumenta zoom').click()
    })
    await this.step('zoom-tutto', async () => {
      for (let i = 0; i < 3 && (await lens('Riduci zoom').count()); i++) {
        if (await lens('Riduci zoom').isDisabled()) break
        await lens('Riduci zoom').click()
        await sleep(200)
      }
      await p.getByRole('radio', { name: /Scrittura media/ }).click()
    })
    await this.step('disegno', async () => {
      await p.getByRole('radio', { name: 'Disegno' }).click()
      await sleep(300)
      const canvas = p.getByRole('img', { name: /Area di disegno/ }).first()
      const b = await canvas.boundingBox()
      if (!b) return
      const draw = async (pts) => {
        await p.mouse.move(b.x + b.width * pts[0][0], b.y + b.height * pts[0][1])
        await p.mouse.down()
        for (const [fx, fy] of pts.slice(1))
          await p.mouse.move(b.x + b.width * fx, b.y + b.height * fy, { steps: 4 })
        await p.mouse.up()
      }
      await draw([
        [0.2, 0.55],
        [0.3, 0.5],
        [0.4, 0.58],
        [0.5, 0.52],
        [0.6, 0.6],
      ])
      await p
        .getByRole('radio', { name: /Pennarello|Marker/i })
        .first()
        .click()
        .catch(() => {})
      await draw([
        [0.2, 0.7],
        [0.7, 0.7],
      ])
      await p
        .getByRole('radio', { name: /Evidenziatore/i })
        .first()
        .click()
        .catch(() => {})
      await draw([
        [0.2, 0.8],
        [0.7, 0.8],
      ])
    })
    await this.step('sfoglia', async () => {
      await p.getByRole('radio', { name: 'Testo' }).click()
      const next = p
        .getByRole('button', { name: /pagina successiva/i })
        .filter({ visible: true })
        .first()
      await next.click()
      await sleep(900)
    })
    await this.step('menu-azioni', async () => {
      await p.getByRole('button', { name: 'Altre azioni' }).click()
    })
    await this.step('torna-mensola', async () => {
      await p.keyboard.press('Escape')
      await p.getByRole('button', { name: 'Torna alla mensola' }).click()
      await p.waitForURL(/#\/$/)
      await sleep(1500)
    })
    await this.step('impostazioni', async () => {
      await p.getByRole('button', { name: /Impostazioni/ }).click()
    })
    await this.step('mensola-piena', async () => {
      await p.keyboard.press('Escape')
      await p.evaluate((nbs) => {
        localStorage.setItem(
          'quaderno:v1',
          JSON.stringify({ state: { notebooks: nbs, quotaExceeded: false }, version: 1 }),
        )
      }, seedNotebooks(9))
      await p.reload()
      await p.waitForLoadState('networkidle')
      await sleep(2200)
      const c = await p.locator('canvas').first().boundingBox()
      if (c) await p.mouse.move(c.x + c.width * 0.5, c.y + c.height * 0.45)
    })
  }
}

/** Dimensioni del bundle, se c'è una build: gzip di ogni chunk. */
function bundle() {
  try {
    const dir = resolve('dist/assets')
    return readdirSync(dir)
      .filter((f) => f.endsWith('.js') || f.endsWith('.css'))
      .map((f) => {
        const buf = readFileSync(`${dir}/${f}`)
        return {
          file: f.replace(/-[A-Za-z0-9_-]{8}\./, '.'),
          kb: +(statSync(`${dir}/${f}`).size / 1024).toFixed(1),
          gzipKb: +(gzipSync(buf).length / 1024).toFixed(1),
        }
      })
      .sort((a, b) => b.gzipKb - a.gzipKb)
  } catch {
    return []
  }
}

const browser = await chromium.launch({ channel: 'chromium' })
for (const profile of PROFILES) {
  console.log(`▶ ${profile.name}`)
  const a = new Audit(browser, profile)
  await a.open()
  await a.run()
  report.profiles.push({
    name: profile.name,
    theme: profile.theme,
    viewport: profile.viewport,
    timing: a.timing,
    firstSceneMs: a.firstScene,
    steps: a.steps,
  })
  await a.ctx.close()
}
await browser.close()
report.bundle = bundle()
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))

// ── report.md ────────────────────────────────────────────────────────────
const md = []
md.push(
  `# Audit del portale — ${report.generatedAt.slice(0, 16).replace('T', ' ')}`,
  '',
  `Base: ${base}`,
  '',
)
const uniq = (xs, key) => Array.from(new Map(xs.map((x) => [key(x), x])).values())
for (const pr of report.profiles) {
  md.push(`## ${pr.name} (${pr.viewport.width}×${pr.viewport.height}, ${pr.theme})`, '')
  if (pr.timing)
    md.push(
      `Caricamento: DOMContentLoaded ${pr.timing.domContentLoaded}ms · load ${pr.timing.load}ms · prima scena ${pr.firstSceneMs}ms`,
      '',
    )
  md.push(
    '| Passo | axe | bersagli <44px | testi <12px | overflow | console |',
    '|---|---|---|---|---|---|',
  )
  for (const s of pr.steps)
    md.push(
      `| ${s.name} | ${s.axe.length} | ${s.smallTargets.length} | ${s.smallTexts.length} | ${s.overflowX > 0 ? s.overflowX + 'px' : '—'} | ${s.consoleErrors.length} |`,
    )
  md.push('')
  const axeAll = uniq(
    pr.steps.flatMap((s) => s.axe.map((v) => ({ ...v, step: s.name }))),
    (v) => v.id + v.sample,
  )
  if (axeAll.length) {
    md.push('### Accessibilità (axe)', '')
    for (const v of axeAll)
      md.push(
        `- **${v.id}** (${v.impact}) — ${v.help} · ${v.nodes} nodi · es. \`${v.sample}\` · in _${v.step}_`,
      )
    md.push('')
  }
  const small = uniq(
    pr.steps.flatMap((s) => s.smallTargets.map((t) => ({ ...t, step: s.name }))),
    (t) => t.label + t.w + t.h,
  )
  if (small.length) {
    md.push('### Bersagli sotto 44px', '')
    for (const t of small) md.push(`- ${t.label} — ${t.w}×${t.h} · in _${t.step}_`)
    md.push('')
  }
  const texts = uniq(
    pr.steps.flatMap((s) => s.smallTexts),
    (t) => t.text,
  )
  if (texts.length) {
    md.push('### Testi sotto 12px', '')
    for (const t of texts) md.push(`- "${t.text}" — ${t.px}px`)
    md.push('')
  }
  const errs = pr.steps.flatMap((s) => s.consoleErrors.map((e) => `${s.name}: ${e.slice(0, 160)}`))
  if (errs.length) {
    md.push('### Console', '')
    for (const e of errs) md.push(`- ${e}`)
    md.push('')
  }
  md.push('### Screenshot', '')
  for (const s of pr.steps) md.push(`- ${s.name}: \`${s.shot.replace(OUT + '/', '')}\``)
  md.push('')
}
if (report.bundle.length) {
  md.push('## Bundle (dist/)', '', '| File | KB | gzip KB |', '|---|---|---|')
  for (const b of report.bundle) md.push(`| ${b.file} | ${b.kb} | ${b.gzipKb} |`)
  md.push('')
}
writeFileSync(`${OUT}/report.md`, md.join('\n'))
console.log(`\n✓ report: ${OUT}/report.md`)
