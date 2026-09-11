#!/usr/bin/env node
/**
 * Debugger del portale: apre l'app in un browser vero (niente reducedMotion),
 * la usa come farebbe una persona — crea, scrive, sfoglia, disegna, torna,
 * ricarica — e dopo OGNI azione verifica gli invarianti. Poi fa una fase
 * "scimmia": azioni a caso, stessi controlli. Ogni violazione diventa un bug
 * con screenshot. Esce con codice 1 se ne trova.
 *
 *   node scripts/debugger.mjs [baseURL] [--monkey=40] [--seed=7]
 *
 * Default baseURL: http://localhost:4173 (npm run preview).
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
const base = args.find((a) => !a.startsWith('--')) ?? 'http://localhost:4173'
const opt = (k, d) => Number(args.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d)
const MONKEY = opt('monkey', 40)
let seed = opt('seed', 7)
const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32
const pick = (xs) => xs[Math.floor(rand() * xs.length)]

const OUT = resolve('.debugger')
mkdirSync(OUT, { recursive: true })

const bugs = []
let shotN = 0

const FLIP_MS = 900

/** Un profilo = un viewport. Gli stessi controlli girano su entrambi. */
const PROFILES = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  {
    name: 'mobile',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const this_is_touch = (s) => Boolean(s.profile.hasTouch)

class Session {
  constructor(browser, profile) {
    this.browser = browser
    this.profile = profile
    this.errors = []
    this.step = 'init'
  }

  async open() {
    this.ctx = await this.browser.newContext({ ...this.profile })
    this.page = await this.ctx.newPage()
    this.page.on('console', async (m) => {
      if (m.type() !== 'error') return
      // gli argomenti veri, non il formato con %s: serve sapere QUALE hook
      const parts = await Promise.all(m.args().map((a) => a.jsonValue().catch(() => '?'))).catch(
        () => [],
      )
      this.errors.push(parts.length ? parts.map(String).join(' ') : m.text())
    })
    this.page.on('pageerror', (e) => this.errors.push(`pageerror: ${e.message}`))
    await this.page.goto(base + '/#/')
    await this.page.waitForLoadState('networkidle')
  }

  async bug(title, detail = '') {
    const file = `${OUT}/${String(++shotN).padStart(2, '0')}-${this.profile.name}-${title.replace(/[^a-z0-9]+/gi, '_').slice(0, 40)}.png`
    await this.page.screenshot({ path: file }).catch(() => {})
    bugs.push({ profile: this.profile.name, step: this.step, title, detail, file })
    console.log(`  ✗ [${this.profile.name}] ${this.step}: ${title}${detail ? ` — ${detail}` : ''}`)
  }

  // ── letture di stato ───────────────────────────────────────────────
  notebooks() {
    return this.page.evaluate(() => {
      const raw = localStorage.getItem('quaderno:v1')
      return raw ? JSON.parse(raw).state.notebooks : []
    })
  }
  async current() {
    const id = (await this.page.evaluate(() => location.hash)).match(/#\/q\/(.+)$/)?.[1]
    const all = await this.notebooks()
    return all.find((n) => n.id === id)
  }
  label() {
    return this.page
      .locator('header p')
      .textContent()
      .catch(() => null)
  }
  inReader() {
    return this.page.evaluate(() => /#\/q\//.test(location.hash))
  }

  // ── invarianti, verificati dopo ogni azione ────────────────────────
  async check() {
    const p = this.page
    if (this.errors.length) {
      await this.bug('errori in console', this.errors.splice(0).join(' | ').slice(0, 400))
    }
    if (!(await this.inReader())) return

    // 1. nessun foglio rimasto a mezz'aria
    const leaves = await p.locator('[style*="preserve-3d"]').count()
    if (leaves > 0) await this.bug('foglio del flip rimasto nel DOM', `${leaves} foglio/i`)

    // 2. etichetta coerente con lo stato salvato
    const nb = await this.current()
    if (!nb) return await this.bug('quaderno corrente non trovato in localStorage')
    const label = (await this.label()) ?? ''
    const m = label.match(/Pagin[ae] (\d+)(?:–(\d+))? di (\d+)/)
    if (!m) await this.bug('etichetta pagina illeggibile', JSON.stringify(label))
    else {
      const [, first, , tot] = m.map(Number)
      if (tot !== nb.pages.length)
        await this.bug('etichetta: totale pagine ≠ storage', `${tot} vs ${nb.pages.length}`)
      if (first - 1 !== nb.lastOpenedPageIndex)
        await this.bug(
          'etichetta: pagina corrente ≠ lastOpenedPageIndex',
          `${first - 1} vs ${nb.lastOpenedPageIndex}`,
        )
    }

    // 3. la pagina corrente è davvero a schermo (numero stampato)
    const printed = await p
      .locator('.paper > span[aria-hidden]')
      .allTextContents()
      .then((xs) => xs.map(Number))
    if (printed.length && !printed.includes(nb.lastOpenedPageIndex + 1))
      await this.bug(
        'pagina corrente non visibile',
        `stampate ${printed.join(',')}, attesa ${nb.lastOpenedPageIndex + 1}`,
      )

    // 4. mai una scrollbar dentro la carta
    const overflow = await p.evaluate(() =>
      Array.from(document.querySelectorAll('[contenteditable]')).map(
        (el) => el.scrollHeight - el.clientHeight,
      ),
    )
    if (overflow.some((o) => o > 1)) await this.bug('scrollbar dentro la carta', overflow.join(','))

    // 5. il testo a schermo coincide con lo storage (per le pagine visibili)
    const shown = await p.evaluate(() =>
      Array.from(document.querySelectorAll('[contenteditable]')).map((el) => ({
        page: Number(el.getAttribute('aria-label')?.match(/\d+/)?.[0]) - 1,
        text: el.textContent,
      })),
    )
    for (const s of shown) {
      const stored = nb.pages[s.page]?.text ?? ''
      const plain = stored.replace(/<[^>]+>/g, '')
      if (s.text.trim() !== plain.trim())
        await this.bug(
          `testo pagina ${s.page + 1} ≠ storage`,
          `dom="${s.text.slice(0, 40)}" storage="${plain.slice(0, 40)}"`,
        )
    }

    // zoomati, pagina fuori dal viewport e frecce sempre attive sono voluti
    const zoomed =
      (await p
        .locator('[aria-live=polite]')
        .textContent()
        .catch(() => 'Tutto')) !== 'Tutto'

    // 6. la pagina sta dentro il viewport
    const box = await p.locator('.paper').first().boundingBox()
    const vp = this.profile.viewport
    if (!zoomed && box && (box.x < -1 || box.x + box.width > vp.width + 1))
      await this.bug('la pagina sfonda il viewport', JSON.stringify(box))

    // 7. frecce: disabilitate solo quando ha senso
    const nextDisabled = await p
      .getByRole('button', { name: 'Pagina successiva', exact: true })
      .isDisabled()
      .catch(() => null)
    const last = nb.pages[nb.pages.length - 1]
    const lastHasContent = Boolean(last && (last.text || last.strokes?.length))
    const step = vp.width >= 900 ? 2 : 1
    const canNext = nb.lastOpenedPageIndex + step < nb.pages.length || lastHasContent
    if (!zoomed && nextDisabled !== null && nextDisabled === canNext)
      await this.bug(
        'freccia avanti in stato sbagliato',
        `disabled=${nextDisabled} canNext=${canNext}`,
      )
  }

  // ── azioni ─────────────────────────────────────────────────────────
  async act(name, fn) {
    this.step = name
    process.stdout.write(`  · ${name}\n`)
    try {
      // nessuna azione può bloccare il giro: se non finisce, è un bug anche quello
      await Promise.race([fn(), sleep(25000).then(() => Promise.reject(new Error('timeout 25s')))])
    } catch (e) {
      await this.bug(`azione fallita: ${name}`, String(e.message ?? e).split('\n')[0])
    }
    await this.check()
  }

  async next() {
    const btn = this.page.getByRole('button', { name: 'Pagina successiva', exact: true })
    if (await btn.isVisible()) {
      if (await btn.isDisabled()) return
      await btn.click()
    } else {
      const corner = this.page.getByRole('button', { name: 'Gira alla pagina successiva' })
      if (!(await corner.count())) return
      await corner.click()
    }
    await sleep(FLIP_MS)
  }
  async prev() {
    const btn = this.page.getByRole('button', { name: 'Pagina precedente', exact: true })
    if (await btn.isVisible()) {
      if (await btn.isDisabled()) return
      await btn.click()
    } else {
      const corner = this.page.getByRole('button', { name: 'Gira alla pagina precedente' })
      if (!(await corner.count())) return
      await corner.click()
    }
    await sleep(FLIP_MS)
  }
  async type(text) {
    const eds = this.page.getByRole('textbox', { name: /Testo della pagina/ })
    const n = await eds.count()
    if (!n) return
    // zoomati, una delle due pagine può stare fuori dal contenitore: si
    // scrive su quella che si vede, come farebbe una persona
    const vp = this.profile.viewport
    let spot = null
    for (let i = 0; i < n; i++) {
      const b = await eds.nth(i).boundingBox()
      if (!b) continue
      // il pezzo di pagina davvero a schermo: si clicca lì in mezzo
      const x0 = Math.max(b.x, 8)
      const x1 = Math.min(b.x + b.width, vp.width - 8)
      const y0 = Math.max(b.y, 80)
      const y1 = Math.min(b.y + b.height, vp.height - 120)
      if (x1 - x0 > 60 && y1 - y0 > 60) {
        spot = { x: (x0 + x1) / 2, y: (y0 + y1) / 2 }
        break
      }
    }
    if (!spot) return
    await this.page.mouse.click(spot.x, spot.y)
    await this.page.keyboard.insertText(text)
    await sleep(250)
  }
  async setMode(mode) {
    await this.page.getByRole('radio', { name: mode === 'draw' ? 'Disegno' : 'Testo' }).click()
    await sleep(200)
  }
  async stroke(dx = 120, dy = 0) {
    const canvas = this.page.getByRole('img', { name: /Area di disegno/ }).first()
    const box = await canvas.boundingBox()
    if (!box) return
    const x = box.x + box.width * 0.3
    const y = box.y + box.height * 0.5
    await this.page.mouse.move(x, y)
    await this.page.mouse.down()
    for (let i = 1; i <= 10; i++) await this.page.mouse.move(x + (dx * i) / 10, y + (dy * i) / 10)
    await this.page.mouse.up()
    await sleep(300)
  }
  async swipe(dir) {
    if (!this.profile.hasTouch) return
    const vp = this.profile.viewport
    const y = vp.height * 0.5
    const x0 = vp.width * (dir === 1 ? 0.8 : 0.2)
    const x1 = vp.width * (dir === 1 ? 0.2 : 0.8)
    await this.page.evaluate(
      ([x0, x1, y]) => {
        const el = document.elementFromPoint(x0, y)
        const mk = (type, x) =>
          new TouchEvent(type, {
            bubbles: true,
            touches:
              type === 'touchend'
                ? []
                : [new Touch({ identifier: 1, target: el, clientX: x, clientY: y })],
            changedTouches: [new Touch({ identifier: 1, target: el, clientX: x, clientY: y })],
          })
        el.dispatchEvent(mk('touchstart', x0))
        el.dispatchEvent(mk('touchend', x1))
      },
      [x0, x1, y],
    )
    await sleep(FLIP_MS)
  }
}

// ── scenario guidato ───────────────────────────────────────────────────
async function scripted(s) {
  const p = s.page
  console.log(`\n▶ ${s.profile.name}: scenario guidato`)

  await s.act('mensola vuota', async () => {
    await p.getByRole('button', { name: 'Crea il tuo primo quaderno' }).click()
  })
  await s.act('atelier → crea', async () => {
    await p.getByPlaceholder('Appunti di…').fill('Debug')
    await p.getByRole('button', { name: 'Copertina Menta' }).click()
    await p.getByRole('button', { name: 'Metti sulla mensola' }).click()
    await p.waitForURL(/#\/q\//)
    await sleep(1800) // apertura
  })
  await s.act('scrivi pagina 1', () => s.type('Appunti del debugger, pagina uno. '))
  await s.act('avanti (crea pagina)', () => s.next())
  await s.act('avanti di nuovo', () => s.next())
  await s.act('indietro', () => s.prev())
  await s.act('indietro fino in fondo', async () => {
    for (let i = 0; i < 4; i++) await s.prev()
  })
  // il testo di pagina 1 è ancora lì?
  await s.act('testo pagina 1 sopravvive allo sfoglio', async () => {
    const nb = await s.current()
    if (!nb.pages[0].text.includes('pagina uno'))
      await s.bug('testo di pagina 1 perso dopo lo sfoglio', nb.pages[0].text.slice(0, 60))
  })
  await s.act('doppio click veloce su avanti', async () => {
    const btn = p.getByRole('button', { name: 'Pagina successiva', exact: true })
    if (await btn.isVisible()) {
      await btn.click()
      await btn.click({ force: true }).catch(() => {})
    }
    await sleep(FLIP_MS)
  })
  await s.act('frecce da tastiera', async () => {
    await p.keyboard.press('Escape')
    await p
      .locator('body')
      .click({ position: { x: 5, y: 5 } })
      .catch(() => {})
    await p.keyboard.press('ArrowRight')
    await sleep(FLIP_MS)
    await p.keyboard.press('ArrowLeft')
    await sleep(FLIP_MS)
  })
  await s.act('modalità disegno + tratto orizzontale', async () => {
    const before = (await s.current()).lastOpenedPageIndex
    await s.setMode('draw')
    await s.stroke(140, 4)
    const nb = await s.current()
    if (nb.lastOpenedPageIndex !== before)
      await s.bug('un tratto orizzontale ha girato pagina', `${before} → ${nb.lastOpenedPageIndex}`)
    const strokes = nb.pages[nb.lastOpenedPageIndex]?.strokes?.length ?? 0
    if (strokes < 1) await s.bug('il tratto non è stato salvato')
  })
  await s.act('undo / redo', async () => {
    await p.getByRole('button', { name: 'Annulla' }).click()
    await sleep(150)
    if ((await s.current()).pages.flatMap((x) => x.strokes).length !== 0)
      await s.bug('undo non ha rimosso il tratto')
    await p.getByRole('button', { name: 'Ripristina' }).click()
    await sleep(150)
    if ((await s.current()).pages.flatMap((x) => x.strokes).length !== 1)
      await s.bug('redo non ha ripristinato il tratto')
  })
  await s.act('sfoglia in disegno', async () => {
    await s.next()
    await s.prev()
  })
  await s.act('torna al testo', () => s.setMode('text'))
  await s.act('zoom: pagina → quarti → torna tutto', async () => {
    const zin = p.locator('button[aria-label="Aumenta zoom"]:visible')
    const zout = p.locator('button[aria-label="Riduci zoom"]:visible')
    await zin.click()
    await sleep(350)
    if ((await zin.count()) && !(await zin.isDisabled())) await zin.click()
    await sleep(350)
    // le frecce scorrono le zone: l'etichetta della pagina non deve saltare.
    // Da tastiera, perché sul telefono le frecce a schermo non ci sono.
    const before = await s.label()
    await p
      .locator('body')
      .click({ position: { x: 5, y: 5 } })
      .catch(() => {})
    await p.keyboard.press('ArrowRight')
    await sleep(350)
    if ((await s.label()) !== before)
      await s.bug('la freccia zoomata ha girato pagina alla prima zona')
    for (let i = 0; i < 3 && (await zout.count()) && !(await zout.isDisabled()); i++) {
      await zout.click()
      await sleep(300)
    }
    const t = await p
      .locator('.paper')
      .first()
      .evaluate((el) => {
        // la scatola è quella con la translate: dentro c'è la scala di adattamento
        const box = el.closest('[style*="translate("]')
        return box ? box.style.transform : ''
      })
    if (!/scale\(1\)/.test(t)) await s.bug('zoom non tornato a 1', t)
  })
  await s.act('swipe (solo touch)', () => s.swipe(1))
  await s.act('reload: riapre sulla stessa pagina', async () => {
    const before = (await s.current()).lastOpenedPageIndex
    await p.reload()
    await p.waitForLoadState('networkidle')
    await sleep(600)
    const after = (await s.current()).lastOpenedPageIndex
    if (before !== after) await s.bug('reload cambia pagina', `${before} → ${after}`)
  })
  await s.act('torna alla mensola', async () => {
    await p.getByRole('button', { name: 'Torna alla mensola' }).click()
    await p.waitForURL(/#\/$/, { timeout: 5000 })
    await sleep(1200)
  })
  await s.act('mensola: il quaderno c’è', async () => {
    const canvas = p.locator('canvas').first()
    if (!(await canvas.isVisible())) await s.bug('mensola senza canvas')
    const title = await p.locator('h1, [aria-live]').allTextContents()
    void title
  })
  await s.act('riapri dalla mensola', async () => {
    // fallback 2D: bottoni. 3D: cerco il dorso passando il mouse sulla scena
    // finché il cursore diventa "pointer" — è quello che farebbe una mano.
    // la lista sr-only ha gli stessi bottoni "Apri …": si guarda se c'è la scena
    const has3D = (await p.locator('canvas').count()) > 0
    if (!has3D)
      await p
        .locator('main :not(.sr-only) > button', { hasText: /Apri|quaderno/ })
        .first()
        .click()
    else if (this_is_touch(s)) {
      // niente hover sul touch: si passa dalla lista accessibile, che è la
      // stessa strada di uno screen reader
      await p
        .locator('.sr-only button')
        .first()
        .evaluate((b) => b.click())
    } else {
      const c = p.locator('canvas').first()
      const b = await c.boundingBox()
      let hit = null
      const deadline = Date.now() + 20000
      for (let fy = 0.35; fy <= 0.7 && !hit && Date.now() < deadline; fy += 0.07) {
        for (let x = b.x + 10; x < b.x + b.width - 10; x += 8) {
          await p.mouse.move(x, b.y + b.height * fy)
          await sleep(16)
          if ((await p.evaluate(() => document.body.style.cursor)) === 'pointer') {
            hit = { x, y: b.y + b.height * fy }
            break
          }
        }
      }
      if (!hit) return await s.bug('nessun quaderno cliccabile sulla mensola 3D')
      await p.mouse.click(hit.x, hit.y)
    }
    await p.waitForURL(/#\/q\//, { timeout: 6000 })
    await sleep(1800)
  })
}

// ── fase scimmia ───────────────────────────────────────────────────────
async function monkey(s) {
  console.log(`▶ ${s.profile.name}: scimmia ×${MONKEY}`)
  const actions = [
    ['avanti', () => s.next()],
    ['avanti', () => s.next()],
    ['indietro', () => s.prev()],
    ['scrivi', () => s.type(pick(['lorem ', 'ipsum dolor ', 'sit amet, ', 'consectetur ']))],
    [
      'tastiera →',
      async () => {
        await s.page.keyboard.press('Escape')
        await s.page
          .locator('body')
          .click({ position: { x: 5, y: 5 } })
          .catch(() => {})
        await s.page.keyboard.press('ArrowRight')
        await sleep(FLIP_MS)
      },
    ],
    [
      'tastiera ←',
      async () => {
        await s.page
          .locator('body')
          .click({ position: { x: 5, y: 5 } })
          .catch(() => {})
        await s.page.keyboard.press('ArrowLeft')
        await sleep(FLIP_MS)
      },
    ],
    [
      'disegna',
      async () => {
        await s.setMode('draw')
        await s.stroke(80, 60)
        await s.setMode('text')
      },
    ],
    ['swipe', () => s.swipe(pick([1, -1]))],
    [
      'zoom +',
      async () => {
        const b = s.page.locator('button[aria-label="Aumenta zoom"]:visible')
        if ((await b.count()) && !(await b.isDisabled())) await b.click()
        await sleep(350)
      },
    ],
    [
      'zoom −',
      async () => {
        const b = s.page.locator('button[aria-label="Riduci zoom"]:visible')
        if ((await b.count()) && !(await b.isDisabled())) await b.click()
        await sleep(350)
      },
    ],
    [
      'corpo testo',
      async () => {
        const r = s.page.getByRole('radio', { name: /Scrittura/ })
        if (await r.count()) await r.nth(Math.floor(rand() * 3)).click()
        await sleep(300)
      },
    ],
  ]
  for (let i = 0; i < MONKEY; i++) {
    const [name, fn] = pick(actions)
    await s.act(`scimmia #${i + 1} ${name}`, fn)
    if (!(await s.inReader())) break
  }
}

const only = args.find((a) => a.startsWith('--profile='))?.split('=')[1]
const browser = await chromium.launch({ channel: 'chromium' })
for (const profile of PROFILES.filter((p) => !only || p.name === only)) {
  const s = new Session(browser, profile)
  await s.open()
  await scripted(s)
  await monkey(s)
  await s.ctx.close()
}
await browser.close()

console.log('\n════════════════════════════════════════')
if (!bugs.length) {
  console.log('✓ nessun bug trovato')
  process.exit(0)
}
console.log(`✗ ${bugs.length} bug:`)
for (const b of bugs)
  console.log(
    `- [${b.profile}] ${b.step}: ${b.title}${b.detail ? ` — ${b.detail}` : ''}\n    ${b.file}`,
  )
process.exit(1)
