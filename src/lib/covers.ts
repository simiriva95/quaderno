import type { Cover, CoverColor, CoverPattern } from '../types'

/** Una sola implementazione della copertina, usata sia dal DOM (data-URL) sia
 *  dalla texture 3D. Non è pigrizia: nel passaggio mensola → quaderno aperto le
 *  due copertine devono combaciare al pixel, e due implementazioni non lo fanno.
 */

/** I token sono in OKLCH, ma three.js non sa leggere `oklch()` e, quando non
 *  capisce un colore, lascia il materiale bianco senza dire niente. Nemmeno
 *  getComputedStyle aiuta: in CSS Color 4 il valore calcolato di un colore
 *  oklch resta oklch. Lo facciamo dipingere a un canvas 1×1 e leggiamo i byte:
 *  è l'unico modo che funziona per entrambi i mondi. */
let probeCtx: CanvasRenderingContext2D | null = null
const resolved = new Map<string, string>()

export function resolveColor(value: string): string {
  const cached = resolved.get(value)
  if (cached) return cached

  if (!probeCtx) {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    probeCtx = canvas.getContext('2d', { willReadFrequently: true })
  }
  if (!probeCtx) return '#FBF7F0'

  probeCtx.clearRect(0, 0, 1, 1)
  probeCtx.fillStyle = '#000'
  probeCtx.fillStyle = value
  probeCtx.fillRect(0, 0, 1, 1)
  const [r, g, b] = probeCtx.getImageData(0, 0, 1, 1).data
  // esadecimale, non `rgb()`: three.js non accetta la sintassi con gli spazi
  // e quando non capisce un colore lascia il materiale bianco, in silenzio.
  const hex = `#${[r, g, b].map((c) => (c ?? 0).toString(16).padStart(2, '0')).join('')}`
  resolved.set(value, hex)
  return hex
}

/** Il tema cambia i token: la cache va buttata, o resta la palette di prima. */
export const forgetResolvedColors = () => resolved.clear()

export const cssVar = (name: string): string =>
  resolveColor(getComputedStyle(document.documentElement).getPropertyValue(name).trim())

export const coverColor = (c: CoverColor): string => cssVar(`--c-cover-${c}`)

const parseHex = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]

/** Inchiostro del motivo: lo stesso colore, più scuro. Si moltiplica, non si
 *  mescola con un grigio: mescolando, ogni pastello finisce per virare al fango. */
const patternInk = (base: string, alpha: number): string => {
  const [r, g, b] = parseHex(base)
  const k = 1 - (1 - alpha) * 1.9
  const d = (c: number) => Math.max(0, Math.round(c * k))
  return `rgb(${d(r)}, ${d(g)}, ${d(b)})`
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.44
    const a = (Math.PI / 5) * i - Math.PI / 2
    const px = x + Math.cos(a) * rad
    const py = y + Math.sin(a) * rad
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
}

function cloud(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.arc(x - r * 0.7, y, r * 0.62, 0, Math.PI * 2)
  ctx.arc(x, y - r * 0.3, r * 0.82, 0, Math.PI * 2)
  ctx.arc(x + r * 0.75, y, r * 0.58, 0, Math.PI * 2)
  ctx.fill()
}

const drawPattern: Record<
  CoverPattern,
  (ctx: CanvasRenderingContext2D, w: number, h: number, base: string) => void
> = {
  plain: () => {},

  dots: (ctx, w, h, base) => {
    ctx.fillStyle = patternInk(base, 0.86)
    const step = w / 9
    for (let y = step * 0.6; y < h; y += step) {
      for (let x = step * 0.6; x < w; x += step) {
        ctx.beginPath()
        ctx.arc(x, y, step * 0.09, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  },

  stripes: (ctx, w, h, base) => {
    ctx.fillStyle = patternInk(base, 0.9)
    const band = w / 11
    ctx.save()
    ctx.translate(-h, 0)
    ctx.rotate(-0.42)
    for (let x = 0; x < (w + h) * 2; x += band * 2) ctx.fillRect(x, -h, band, h * 3)
    ctx.restore()
  },

  gingham: (ctx, w, h, base) => {
    ctx.fillStyle = patternInk(base, 0.93)
    const band = w / 8
    for (let x = 0; x < w; x += band * 2) ctx.fillRect(x, 0, band, h)
    for (let y = 0; y < h; y += band * 2) ctx.fillRect(0, y, w, band)
  },

  stars: (ctx, w, h, base) => {
    ctx.fillStyle = patternInk(base, 0.84)
    const step = w / 4.5
    let row = 0
    for (let y = step * 0.55; y < h; y += step) {
      for (let x = step * (row % 2 ? 1 : 0.5); x < w; x += step) star(ctx, x, y, step * 0.15)
      row++
    }
  },

  clouds: (ctx, w, h, base) => {
    ctx.fillStyle = patternInk(base, 0.9)
    const step = w / 3.2
    let row = 0
    for (let y = step * 0.6; y < h; y += step) {
      for (let x = step * (row % 2 ? 0.9 : 0.3); x < w; x += step) cloud(ctx, x, y, step * 0.17)
      row++
    }
  },
}

export function paintCover(
  ctx: CanvasRenderingContext2D,
  cover: Pick<Cover, 'color' | 'pattern'>,
  w: number,
  h: number,
): void {
  const base = coverColor(cover.color)
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)
  ctx.save()
  drawPattern[cover.pattern](ctx, w, h, base)
  ctx.restore()
}

/** Texture pronta: `background-image` per il DOM, `CanvasTexture` per il 3D. */
export function coverCanvas(
  cover: Pick<Cover, 'color' | 'pattern'>,
  size = 512,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) paintCover(ctx, cover, size, size)
  return canvas
}

/** ── Facce per il 3D ──────────────────────────────────────────────────────
 *  La copertina completa (motivo + etichetta + adesivo) e il dorso con il
 *  titolo. Sono le stesse funzioni che alimentano l'anteprima DOM: nel
 *  passaggio mensola → quaderno aperto le due devono combaciare.            */

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** Il raccoglitore ha l'etichetta stampata, non scritta a mano: stesso posto,
 *  altro carattere. È il segno che si legge da lontano sulla mensola. */
const labelFont = (size: number, printed: boolean): string =>
  printed
    ? `700 ${size}px 'Nunito Variable', system-ui, sans-serif`
    : `600 ${size}px 'Caveat Variable', cursive`

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  max: number,
  start: number,
  printed = false,
): number {
  let size = start
  while (size > 10) {
    ctx.font = labelFont(size, printed)
    if (ctx.measureText(text).width <= max) break
    size -= 2
  }
  return size
}

export function paintCoverFace(
  ctx: CanvasRenderingContext2D,
  cover: Cover,
  title: string,
  w: number,
  h: number,
  printed = false,
): void {
  paintCover(ctx, cover, w, h)

  // etichetta cucita
  const labelW = w * 0.66
  const labelH = h * 0.15
  const labelX = (w - labelW) / 2
  const labelY = h * 0.28
  ctx.fillStyle = cssVar('--c-paper')
  roundRect(ctx, labelX, labelY, labelW, labelH, 6)
  ctx.fill()
  ctx.strokeStyle = cssVar('--c-graphite')
  // cucita sul quaderno a mano, in una tasca stampata sul raccoglitore
  ctx.globalAlpha = printed ? 0.4 : 0.28
  if (!printed) ctx.setLineDash([6, 5])
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.setLineDash([])
  ctx.globalAlpha = 1

  const text = (title || cover.labelText || 'Senza titolo').slice(0, 28)
  const size = fitText(ctx, text, labelW - 24, labelH * 0.62, printed)
  ctx.fillStyle = cssVar('--c-ink')
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = labelFont(size, printed)
  ctx.fillText(text, w / 2, labelY + labelH / 2)
}

/** L'adesivo arriva come immagine: è un disegno vettoriale, non un glifo. */
export async function paintSticker(
  ctx: CanvasRenderingContext2D,
  markup: string,
  tint: string,
  cx: number,
  cy: number,
  r: number,
): Promise<void> {
  ctx.fillStyle = tint
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  const img = new Image()
  img.src = `data:image/svg+xml;utf8,${encodeURIComponent(markup)}`
  await img.decode().catch(() => {})
  const s = r * 1.25
  ctx.drawImage(img, cx - s / 2, cy - s / 2, s, s)
}

export function paintSpine(
  ctx: CanvasRenderingContext2D,
  cover: Cover,
  title: string,
  w: number,
  h: number,
  printed = false,
): void {
  ctx.clearRect(0, 0, w, h)
  ctx.fillStyle = coverColor(cover.spineColor)
  ctx.fillRect(0, 0, w, h)

  // titolo scritto lungo il dorso, come sui quaderni veri
  const text = (title || cover.labelText || '').slice(0, 30)
  if (!text) return
  ctx.save()
  ctx.translate(w / 2, h * 0.9)
  ctx.rotate(-Math.PI / 2)
  const size = fitText(ctx, text, h * 0.74, w * 0.5, printed)
  ctx.font = labelFont(size, printed)
  ctx.fillStyle = cssVar('--c-ink')
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 0, 0)
  ctx.restore()
}
