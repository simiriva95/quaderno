import type { StickerId } from '../types'

/** Dieci disegni, stessa mano, tratto 1.75. Niente emoji: cambiano faccia a
 *  ogni sistema operativo e non si possono colorare.
 *  I tracciati stanno come stringhe perché servono due volte: in JSX per il DOM
 *  e serializzati in SVG per la texture della copertina 3D. Una sola fonte. */

interface StickerDef {
  label: string
  tint: string
  paths: { d: string; w?: number }[]
}

export const STICKER_DEFS: Record<StickerId, StickerDef> = {
  stella: {
    label: 'Stellina',
    tint: '--c-hl-yellow',
    paths: [
      {
        d: 'M12 3.6 14.7 9.3 21 10.1 16.4 14.4 17.6 20.6 12 17.6 6.4 20.6 7.6 14.4 3 10.1 9.3 9.3Z',
      },
    ],
  },
  nuvola: {
    label: 'Nuvola',
    tint: '--c-cover-cielo',
    paths: [{ d: 'M7 17h10a3.4 3.4 0 0 0 .3-6.8A5 5 0 0 0 8 8.6 3.7 3.7 0 0 0 7 17Z' }],
  },
  gatto: {
    label: 'Gattino',
    tint: '--c-cover-pesca',
    paths: [
      { d: 'M5.4 9.6 4.8 5l4 2.4a7.6 7.6 0 0 1 6.4 0l4-2.4-.6 4.6a6.6 6.6 0 1 1-13.2 0Z' },
      { d: 'M9.4 12.4h.01M14.6 12.4h.01', w: 2.4 },
      { d: 'M12 14.6v1M9.6 16.4h4.8' },
    ],
  },
  tazza: {
    label: 'Tazza',
    tint: '--c-cover-terracotta',
    paths: [
      { d: 'M5 9h11v6.4A3.6 3.6 0 0 1 12.4 19H8.6A3.6 3.6 0 0 1 5 15.4Z' },
      { d: 'M16 10.6h1.6a2.4 2.4 0 0 1 0 4.8H16' },
      { d: 'M8.6 5.6c0 1-.8 1-.8 2M12 5c0 1-.8 1-.8 2' },
    ],
  },
  foglia: {
    label: 'Foglia',
    tint: '--c-cover-salvia',
    paths: [{ d: 'M5 19C5 10.6 10.4 5.4 19 5c.4 8.6-4.8 14-13 14Z' }, { d: 'M8.4 15.6 16 8' }],
  },
  luna: {
    label: 'Luna',
    tint: '--c-cover-lavanda',
    paths: [{ d: 'M19 14.2A7.6 7.6 0 0 1 9.8 5 7.6 7.6 0 1 0 19 14.2Z' }],
  },
  fiore: {
    label: 'Fiore',
    tint: '--c-cover-malva',
    paths: [
      { d: 'M12 7.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4Z' },
      {
        d: 'M12 4.4a2.8 2.8 0 0 1 0 3.4M12 15.6a2.8 2.8 0 0 1 0-3.4M6.6 7.2a2.8 2.8 0 0 1 3 1.6M17.4 12.8a2.8 2.8 0 0 1-3-1.6M6.6 12.8a2.8 2.8 0 0 0 3-1.6M17.4 7.2a2.8 2.8 0 0 0-3 1.6',
      },
      { d: 'M12 12.4V20' },
    ],
  },
  cuore: {
    label: 'Cuore',
    tint: '--c-cover-cipria',
    paths: [
      {
        d: 'M12 19.4S4.6 15 4.6 9.9A3.9 3.9 0 0 1 12 8.2a3.9 3.9 0 0 1 7.4 1.7c0 5.1-7.4 9.5-7.4 9.5Z',
      },
    ],
  },
  pesce: {
    label: 'Pesciolino',
    tint: '--c-cover-menta',
    paths: [
      {
        d: 'M3.6 12c2.6-3.8 6-5.6 9.4-5.6S18.8 8.2 20.4 12c-1.6 3.8-4 5.6-7.4 5.6S6.2 15.8 3.6 12Z',
      },
      { d: 'M20.4 12 23 9.4v5.2Z' },
      { d: 'M8.4 10.4h.01', w: 2.4 },
    ],
  },
  fungo: {
    label: 'Funghetto',
    tint: '--c-cover-burro',
    paths: [
      { d: 'M4.6 11.4a7.4 7.4 0 0 1 14.8 0Z' },
      { d: 'M9.6 11.4v5a2.4 2.4 0 0 0 4.8 0v-5' },
      { d: 'M9 8.6h.01M14.6 9.4h.01', w: 2.4 },
    ],
  },
}

export const stickerLabel = (id: StickerId) => STICKER_DEFS[id].label
export const stickerTint = (id: StickerId) => `var(${STICKER_DEFS[id].tint})`

/** Lo stesso disegno, per il canvas della copertina 3D. */
export function stickerSvgMarkup(id: StickerId, stroke: string): string {
  const paths = STICKER_DEFS[id].paths
    .map(
      (p) =>
        `<path d="${p.d}" fill="none" stroke="${stroke}" stroke-width="${p.w ?? 1.75}" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">${paths}</svg>`
}
