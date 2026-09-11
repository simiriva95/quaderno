import type { CoverColor, InkColor, StickerId } from '../types'

/** Spazio logico della pagina. Gli strokes vivono qui, non in pixel schermo:
 *  il disegno resta identico a ogni dimensione e occupa meno localStorage. */
export const PAGE_W = 600
export const PAGE_H = 840

/** Passo delle righe, in unità logiche e in px CSS (sono lo stesso numero
 *  per costruzione: la pagina è renderizzata a scala 1 sul suo lato lungo). */
export const RULE_STEP = 32

export const COVER_COLORS: CoverColor[] = [
  'cipria',
  'pesca',
  'burro',
  'salvia',
  'menta',
  'cielo',
  'lavanda',
  'malva',
  'terracotta',
  'lino',
]

export const COVER_LABELS: Record<CoverColor, string> = {
  cipria: 'Cipria',
  pesca: 'Pesca',
  burro: 'Burro',
  salvia: 'Salvia',
  menta: 'Menta',
  cielo: 'Cielo',
  lavanda: 'Lavanda',
  malva: 'Malva',
  terracotta: 'Terracotta',
  lino: 'Lino',
}

export const STICKERS: StickerId[] = [
  'stella',
  'nuvola',
  'gatto',
  'tazza',
  'foglia',
  'luna',
  'fiore',
  'cuore',
  'pesce',
  'fungo',
]

export const INK_COLORS: { id: InkColor; label: string }[] = [
  { id: 'ink', label: 'Blu' },
  { id: 'graphite', label: 'Grafite' },
  { id: 'ink-green', label: 'Verde' },
  { id: 'ink-red', label: 'Rosso' },
  { id: 'ink-violet', label: 'Viola' },
]

/** Spessori: 3 preset, in unità logiche di pagina. */
export const STROKE_SIZES = [2.5, 5, 9]

/** Spring condivisa per tutto ciò che ha un peso fisico.
 *  damping 26 = micro-assestamento, non rimbalzo da cartone animato. */
export const SPRING = { type: 'spring', stiffness: 260, damping: 26, mass: 1 } as const
export const SPRING_SOFT = { type: 'spring', stiffness: 180, damping: 24, mass: 1 } as const

/** Geometria della pagina, in unità logiche. La pagina è SEMPRE 600×840 px CSS:
 *  una sola `scale()` sullo spread la adatta al viewport. Così righe, font,
 *  strokes e canvas vivono tutti nello stesso spazio e restano allineati. */
export const PAGE_PAD_X = 56
export const PAGE_PAD_TOP = 40
export const PAGE_PAD_BOTTOM = 32
export const TEXT_W = PAGE_W - PAGE_PAD_X * 2 // 488
export const TEXT_H = PAGE_H - PAGE_PAD_TOP - PAGE_PAD_BOTTOM // 768 = 24 righe
export const LINES_PER_PAGE = TEXT_H / RULE_STEP

/** Le due pagine si toccano: la piega è un'ombra, non uno spazio. */
export const GUTTER = 0
