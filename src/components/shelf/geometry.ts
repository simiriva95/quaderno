import type { Notebook } from '../../types'

export const BOOK_W = 0.17 // spessore del dorso
/** Il raccoglitore è più grosso, ma non tanto da sfondare il passo della fila:
 *  lo scarto resta sotto il GAP, quindi i vicini non si toccano. */
export const BINDER_W = BOOK_W * 1.12
export const BOOK_H = 1.0
export const BOOK_D = 0.72
export const GAP = 0.025
/** Quanti quaderni stanno su un ripiano. Su schermi stretti se ne mettono
 *  meno: la fila è più corta, la camera può avvicinarsi e i quaderni restano
 *  leggibili invece di diventare fiammiferi in fondo alla stanza. */
export const PER_SHELF = 8
export const PER_SHELF_NARROW = 4
export const SHELF_GAP_Y = 1.34

/** Quaderni tutti uguali sarebbero finti. Un'altezza e un'inclinazione appena
 *  diverse, derivate dall'id: stabili fra un render e l'altro, mai casuali. */
export function jitter(id: string): { height: number; tilt: number; depth: number } {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  const a = ((h >>> 0) % 1000) / 1000
  const b = ((h >>> 10) % 1000) / 1000
  return {
    height: BOOK_H * (0.93 + a * 0.12),
    tilt: (b - 0.5) * 0.035,
    depth: BOOK_D * (0.96 + b * 0.06),
  }
}

export interface Slot {
  x: number
  y: number
  shelf: number
}

export function slotFor(index: number, total: number, perShelf = PER_SHELF): Slot {
  const shelf = Math.floor(index / perShelf)
  const inShelf = index % perShelf
  const onThisShelf = Math.min(perShelf, total - shelf * perShelf)
  const rowWidth = onThisShelf * (BOOK_W + GAP) - GAP
  return {
    x: -rowWidth / 2 + inShelf * (BOOK_W + GAP) + BOOK_W / 2,
    y: -shelf * SHELF_GAP_Y,
    shelf,
  }
}

export const shelfCount = (total: number, perShelf = PER_SHELF) =>
  Math.max(1, Math.ceil((total + 1) / perShelf))

/** Larghezza del ripiano: sempre un po' più larga della fila, mai al millimetro. */
export const plankWidth = (total: number, perShelf = PER_SHELF) =>
  Math.max(perShelf * 0.4, Math.min(perShelf, total) * (BOOK_W + GAP) + 0.95)

export const notebookKey = (n: Notebook) =>
  `${n.id}:${n.kind ?? 'paper'}:${n.cover.color}:${n.cover.pattern}:${n.title}`
