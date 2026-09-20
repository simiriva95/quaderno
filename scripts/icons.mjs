#!/usr/bin/env node
/**
 * Le icone dell'app installata. Il disegno del quaderno vive qui una volta
 * sola: da lì escono public/icon.svg (quella nitida a ogni misura), i PNG
 * che iOS e Android pretendono comunque, e win/quaderno.ico per Windows.
 *
 *   node scripts/icons.mjs
 */
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const OUT = resolve(process.cwd(), 'public')
const WIN = resolve(process.cwd(), 'win')

// Il quaderno, in una griglia di 32: copertina, dorso, etichetta, due righe.
const quaderno = `
  <rect x="6" y="3" width="21" height="26" rx="3" fill="#CFE3D0"/>
  <rect x="5" y="3" width="5" height="26" rx="2" fill="#E8B4A0"/>
  <rect x="13" y="9" width="11" height="6" rx="1.4" fill="#FBF7F0"/>
  <g stroke="#2F3E6B" stroke-width="1.3" stroke-linecap="round" opacity=".55">
    <path d="M14 20h9M14 23.5h6"/>
  </g>`

/** scala: quanto del lato occupa il quaderno (1 = tutto). */
const svg = (scala, sfondo) => {
  const lato = 100
  const k = (lato * scala) / 32
  const margine = (lato - lato * scala) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lato} ${lato}">
  ${sfondo ? `<rect width="${lato}" height="${lato}" fill="${sfondo}"/>` : ''}
  <g transform="translate(${margine} ${margine}) scale(${k})">${quaderno}</g>
</svg>`
}

const scatta = async (page, markup, size) => {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(
    `<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${markup}`,
  )
  return page.screenshot({ omitBackground: true })
}

const png = async (page, markup, size, file) => {
  writeFileSync(resolve(OUT, file), await scatta(page, markup, size))
  console.log(file)
}

/**
 * Un .ico è un indice e dei PNG in fila: sei byte di testata, sedici per
 * immagine, poi i file uno dietro l'altro. Windows lo legge così dal 2007,
 * e scriverlo a mano costa meno di una dipendenza che lo faccia per noi.
 */
const ico = (immagini) => {
  const indice = Buffer.alloc(6 + 16 * immagini.length)
  indice.writeUInt16LE(1, 2) // 1 = icona (2 sarebbe un cursore)
  indice.writeUInt16LE(immagini.length, 4)
  let salto = indice.length
  immagini.forEach(({ lato, dati }, i) => {
    const v = 6 + 16 * i
    indice[v] = lato % 256 // 256 si scrive 0: il campo è un byte solo
    indice[v + 1] = lato % 256
    indice.writeUInt16LE(1, v + 4) // piani
    indice.writeUInt16LE(32, v + 6) // bit per pixel
    indice.writeUInt32LE(dati.length, v + 8)
    indice.writeUInt32LE(salto, v + 12)
    salto += dati.length
  })
  return Buffer.concat([indice, ...immagini.map((i) => i.dati)])
}

const browser = await chromium.launch()
const page = await browser.newPage()

// SVG: nessuno sfondo, il quaderno pieno. Chrome la usa a ogni dimensione.
writeFileSync(resolve(OUT, 'icon.svg'), svg(1, null) + '\n')
console.log('icon.svg')

// PNG di riserva per chi il manifest SVG non lo legge.
await png(page, svg(1, null), 512, 'icon-512.png')
// Maskable: Android ritaglia fino al cerchio, il disegno resta nel 60% centrale.
await png(page, svg(0.6, '#EFE6DA'), 512, 'icon-maskable-512.png')
// iOS arrotonda e basta: sfondo pieno, margine più stretto.
await png(page, svg(0.72, '#EFE6DA'), 180, 'apple-touch-icon.png')

// Windows vuole un .ico solo, con dentro tutte le misure che userà: sedici
// nell'area di notifica, trentadue e quarantotto nelle liste, duecentocinquantasei
// dove le icone sono grandi.
const lati = [16, 32, 48, 256]
const dentro = []
for (const lato of lati) dentro.push({ lato, dati: await scatta(page, svg(1, null), lato) })
mkdirSync(WIN, { recursive: true })
writeFileSync(resolve(WIN, 'quaderno.ico'), ico(dentro))
console.log('../win/quaderno.ico')

await browser.close()
