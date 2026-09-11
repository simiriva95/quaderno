import { CanvasTexture, RepeatWrapping, SRGBColorSpace, type Texture } from 'three'
import { cssVar } from '../../lib/covers'

/** Texture procedurali della stanza. Dipinte su canvas, non scaricate: la
 *  palette arriva dai token CSS, così legno e intonaco cambiano col tema. */

/** Rumore deterministico: la venatura è la stessa a ogni render. */
function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}

function texture(c: HTMLCanvasElement, repeat = false): Texture {
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  t.anisotropy = 8
  if (repeat) t.wrapS = t.wrapT = RepeatWrapping
  return t
}

/** Legno: venature lunghe e ondulate, qualche anello più scuro, una vena
 *  chiara ogni tanto. Restituisce mappa colore e mappa di rugosità. */
export function woodTextures(): { map: Texture; roughnessMap: Texture } {
  const W = 1024
  const H = 256
  const [c, ctx] = canvas(W, H)
  const [rc, rctx] = canvas(W, H)
  const rand = rng(7)

  const base = cssVar('--c-wood')
  const deep = cssVar('--c-wood-deep')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, W, H)

  // il legno è più chiaro dove la luce cade: un gradiente appena percettibile
  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, 'rgba(255,255,255,0.10)')
  g.addColorStop(1, 'rgba(0,0,0,0.06)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  rctx.fillStyle = '#9a9a9a'
  rctx.fillRect(0, 0, W, H)

  // venature: tratti lunghi con ondulazione lenta e larghezza variabile
  for (let i = 0; i < 260; i++) {
    const y = rand() * H
    const amp = 1.5 + rand() * 4
    const freq = 0.004 + rand() * 0.006
    const phase = rand() * Math.PI * 2
    const dark = rand() > 0.22
    const alpha = dark ? 0.08 + rand() * 0.22 : 0.1 + rand() * 0.16
    ctx.strokeStyle = dark ? deep : '#fff'
    ctx.globalAlpha = alpha
    ctx.lineWidth = 0.5 + rand() * (dark ? 2.2 : 1.1)
    ctx.beginPath()
    for (let x = -16; x <= W + 16; x += 12) {
      const yy = y + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 3.1 + phase) * amp * 0.3
      if (x === -16) ctx.moveTo(x, yy)
      else ctx.lineTo(x, yy)
    }
    ctx.stroke()

    // le vene scure sono più ruvide, quelle chiare più lisce
    rctx.strokeStyle = dark ? '#c8c8c8' : '#6a6a6a'
    rctx.globalAlpha = alpha * 0.9
    rctx.lineWidth = ctx.lineWidth * 1.6
    rctx.beginPath()
    for (let x = -16; x <= W + 16; x += 12) {
      const yy = y + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 3.1 + phase) * amp * 0.3
      if (x === -16) rctx.moveTo(x, yy)
      else rctx.lineTo(x, yy)
    }
    rctx.stroke()
  }
  ctx.globalAlpha = 1

  // due o tre nodi appena accennati
  for (let i = 0; i < 3; i++) {
    const x = rand() * W
    const y = rand() * H
    const r = 10 + rand() * 18
    const kg = ctx.createRadialGradient(x, y, 0, x, y, r)
    kg.addColorStop(0, deep)
    kg.addColorStop(0.6, 'rgba(0,0,0,0.05)')
    kg.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.globalAlpha = 0.22
    ctx.fillStyle = kg
    ctx.beginPath()
    ctx.ellipse(x, y, r * 2.2, r * 0.7, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  return { map: texture(c, true), roughnessMap: texture(rc, true) }
}

/** Il taglio delle pagine: righe sottilissime, una per foglio, con qualche
 *  foglio che sporge di un pelo. È quello che fa "quaderno" e non "mattone". */
export function pageEdgeTexture(): Texture {
  const W = 256
  const H = 64
  const [c, ctx] = canvas(W, H)
  const rand = rng(3)
  ctx.fillStyle = cssVar('--c-paper')
  ctx.fillRect(0, 0, W, H)
  const edge = cssVar('--c-paper-edge')
  for (let x = 0; x < W; x += 2) {
    ctx.globalAlpha = 0.35 + rand() * 0.5
    ctx.fillStyle = edge
    ctx.fillRect(x, 0, 1, H)
    if (rand() > 0.9) {
      ctx.globalAlpha = 0.5
      ctx.fillStyle = '#fff'
      ctx.fillRect(x + 1, 0, 1, H)
    }
  }
  ctx.globalAlpha = 1
  const t = texture(c, true)
  t.repeat.set(1, 1)
  return t
}

/** Terracotta del vaso: un colore con una velatura più chiara in alto. */
export function terracottaTexture(): Texture {
  const [c, ctx] = canvas(128, 128)
  const rand = rng(11)
  ctx.fillStyle = '#C97C5D'
  ctx.fillRect(0, 0, 128, 128)
  for (let i = 0; i < 400; i++) {
    ctx.globalAlpha = 0.04 + rand() * 0.06
    ctx.fillStyle = rand() > 0.5 ? '#fff' : '#000'
    ctx.fillRect(rand() * 128, rand() * 128, 1 + rand() * 3, 1)
  }
  ctx.globalAlpha = 1
  return texture(c, true)
}
