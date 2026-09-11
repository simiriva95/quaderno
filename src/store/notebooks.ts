import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Cover, Notebook, Page, PaperKind, Stroke } from '../types'
import { newId } from '../lib/id'

const STORAGE_KEY = 'quaderno:v1'
const SCHEMA_VERSION = 1

export const emptyPage = (): Page => ({
  id: newId(),
  text: '',
  strokes: [],
  createdAt: Date.now(),
})

export const defaultCover = (): Cover => ({
  color: 'salvia',
  pattern: 'dots',
  labelText: '',
  spineColor: 'terracotta',
  elastic: true,
})

interface NotebooksStore {
  notebooks: Notebook[]
  /** Alzato dal wrapper di storage quando localStorage rifiuta la scrittura. */
  quotaExceeded: boolean
  createNotebook: (draft: { title: string; cover: Cover; paper: PaperKind }) => string
  removeNotebook: (id: string) => void
  renameNotebook: (id: string, title: string) => void
  setPageText: (notebookId: string, pageIndex: number, text: string) => void
  setPageStrokes: (notebookId: string, pageIndex: number, strokes: Stroke[]) => void
  appendPage: (notebookId: string) => void
  setLastOpenedPage: (notebookId: string, index: number) => void
  replaceAll: (notebooks: Notebook[]) => void
  clearQuotaFlag: () => void
}

/** localStorage che non esplode: se la quota è piena lo stato resta in RAM
 *  e l'utente vede un invito a esportare, invece di perdere la sessione. */
const safeStorage: Storage = {
  get length() {
    return localStorage.length
  },
  clear: () => localStorage.clear(),
  key: (i) => localStorage.key(i),
  getItem: (k) => localStorage.getItem(k),
  removeItem: (k) => localStorage.removeItem(k),
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v)
    } catch {
      useNotebooks.setState({ quotaExceeded: true })
    }
  },
}

/** Applica `fn` alla pagina indicata, creandola se l'indice supera la fine. */
const withPage = (
  notebooks: Notebook[],
  notebookId: string,
  pageIndex: number,
  fn: (page: Page) => Page,
): Notebook[] =>
  notebooks.map((n) => {
    if (n.id !== notebookId) return n
    const pages = [...n.pages]
    while (pages.length <= pageIndex) pages.push(emptyPage())
    const page = pages[pageIndex]
    if (!page) return n
    pages[pageIndex] = fn(page)
    return { ...n, pages, updatedAt: Date.now() }
  })

export const useNotebooks = create<NotebooksStore>()(
  persist(
    (set, get) => ({
      notebooks: [],
      quotaExceeded: false,

      createNotebook: ({ title, cover, paper }) => {
        const id = newId()
        const now = Date.now()
        set({
          notebooks: [
            ...get().notebooks,
            {
              id,
              title,
              createdAt: now,
              updatedAt: now,
              cover: { ...cover, labelText: cover.labelText || title },
              paper,
              lastOpenedPageIndex: 0,
              pages: [emptyPage()],
            },
          ],
        })
        return id
      },

      removeNotebook: (id) => set({ notebooks: get().notebooks.filter((n) => n.id !== id) }),

      renameNotebook: (id, title) =>
        set({
          notebooks: get().notebooks.map((n) =>
            n.id === id
              ? { ...n, title, cover: { ...n.cover, labelText: title }, updatedAt: Date.now() }
              : n,
          ),
        }),

      setPageText: (notebookId, pageIndex, text) =>
        set({
          notebooks: withPage(get().notebooks, notebookId, pageIndex, (p) => ({ ...p, text })),
        }),

      setPageStrokes: (notebookId, pageIndex, strokes) =>
        set({
          notebooks: withPage(get().notebooks, notebookId, pageIndex, (p) => ({ ...p, strokes })),
        }),

      appendPage: (notebookId) =>
        set({
          notebooks: get().notebooks.map((n) =>
            n.id === notebookId
              ? { ...n, pages: [...n.pages, emptyPage()], updatedAt: Date.now() }
              : n,
          ),
        }),

      setLastOpenedPage: (notebookId, index) => {
        // senza questa guardia ogni scrittura crea un nuovo oggetto quaderno,
        // e l'effetto che la chiama si richiamerebbe all'infinito
        const current = get().notebooks.find((n) => n.id === notebookId)
        if (!current || current.lastOpenedPageIndex === index) return
        set({
          notebooks: get().notebooks.map((n) =>
            n.id === notebookId ? { ...n, lastOpenedPageIndex: index } : n,
          ),
        })
      },

      replaceAll: (notebooks) => set({ notebooks }),

      clearQuotaFlag: () => set({ quotaExceeded: false }),
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ notebooks: s.notebooks }),
      // Da qui in poi ogni cambio di forma dei dati aggiunge un ramo,
      // invece di buttare i quaderni di chi aggiorna.
      migrate: (persisted, version) => {
        if (version < 1) return { notebooks: [] }
        return persisted as { notebooks: Notebook[] }
      },
    },
  ),
)

export const selectNotebook = (id: string | undefined) => (s: NotebooksStore) =>
  s.notebooks.find((n) => n.id === id)
