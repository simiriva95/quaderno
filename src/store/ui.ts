import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Mode = 'text' | 'draw'

/** Dove stava il dorso sulla mensola quando il quaderno è stato aperto:
 *  serve al ritorno, per rimetterlo esattamente al suo posto. */
export interface ShelfRect {
  x: number
  y: number
  width: number
  height: number
}

interface UiStore {
  /** Stato effimero della sessione: sopravvive a un reload, non a un riavvio. */
  pageIndex: number
  mode: Mode
  toast: string | null
  shelfRect: ShelfRect | null
  setPageIndex: (i: number) => void
  setMode: (m: Mode) => void
  showToast: (t: string | null) => void
  setShelfRect: (r: ShelfRect | null) => void
}

export const useUi = create<UiStore>()(
  persist(
    (set) => ({
      pageIndex: 0,
      mode: 'text',
      toast: null,
      shelfRect: null,
      setPageIndex: (pageIndex) => set({ pageIndex }),
      setMode: (mode) => set({ mode }),
      showToast: (toast) => set({ toast }),
      setShelfRect: (shelfRect) => set({ shelfRect }),
    }),
    {
      name: 'quaderno:ui',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ pageIndex: s.pageIndex, mode: s.mode, shelfRect: s.shelfRect }),
    },
  ),
)
