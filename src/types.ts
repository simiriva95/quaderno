export type PaperKind = 'lined' | 'grid' | 'blank'

export type CoverPattern = 'plain' | 'dots' | 'stripes' | 'gingham' | 'stars' | 'clouds'

export type CoverColor =
  | 'cipria'
  | 'pesca'
  | 'burro'
  | 'salvia'
  | 'menta'
  | 'cielo'
  | 'lavanda'
  | 'malva'
  | 'terracotta'
  | 'lino'

export type StickerId =
  | 'stella'
  | 'nuvola'
  | 'gatto'
  | 'tazza'
  | 'foglia'
  | 'luna'
  | 'fiore'
  | 'cuore'
  | 'pesce'
  | 'fungo'

export type DrawTool = 'pencil' | 'pen' | 'marker' | 'highlighter' | 'eraser'

export type InkColor = 'ink' | 'graphite' | 'ink-green' | 'ink-red' | 'ink-violet'

/** x, y in spazio logico pagina (PAGE_W x PAGE_H), pressure 0..1 */
export type StrokePoint = [number, number, number]

export interface Stroke {
  tool: DrawTool
  color: string
  /** indice preset 0..2 */
  size: number
  points: StrokePoint[]
}

export interface Page {
  id: string
  text: string
  strokes: Stroke[]
  createdAt: number
}

export interface Cover {
  color: CoverColor
  pattern: CoverPattern
  sticker?: StickerId
  labelText: string
  spineColor: CoverColor
  elastic: boolean
}

export interface Notebook {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  cover: Cover
  paper: PaperKind
  lastOpenedPageIndex: number
  pages: Page[]
}

export interface NotebooksSnapshot {
  version: number
  notebooks: Notebook[]
}
