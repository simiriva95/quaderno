#!/usr/bin/env node
/**
 * Le icone dell'app installata. Il disegno del quaderno vive qui una volta
 * sola: da lì escono public/icon.svg (quella nitida a ogni misura) e i PNG
 * che iOS e Android pretendono comunque.
 *
 *   node scripts/icons.mjs
 */
import { chromium } from '@playwright/test'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const OUT = resolve(process.cwd(), 'public')

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

const png = async (page, markup, size, file) => {
  await page.setViewportSize({ width: size, height: size })
  await page.setContent(
    `<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${markup}`,
  )
  await page.screenshot({ path: resolve(OUT, file), omitBackground: true })
  console.log(file)
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

await browser.close()
