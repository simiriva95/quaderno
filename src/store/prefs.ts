import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DrawTool, InkColor } from '../types'

export type ThemeChoice = 'system' | 'light' | 'dark'

/** Corpo della scrittura a mano: piccolo, medio, grande. Il passo delle
 *  righe non cambia mai; cambia quanto inchiostro ci sta dentro. */
export type TextSize = 'S' | 'M' | 'L'

interface PrefsStore {
  theme: ThemeChoice
  sounds: boolean
  tool: DrawTool
  toolColor: string
  toolSize: number
  ink: InkColor
  textSize: TextSize
  setTextSize: (s: TextSize) => void
  setTheme: (t: ThemeChoice) => void
  toggleSounds: () => void
  setTool: (t: DrawTool) => void
  setToolColor: (c: string) => void
  setToolSize: (s: number) => void
  setInk: (i: InkColor) => void
}

export const usePrefs = create<PrefsStore>()(
  persist(
    (set, get) => ({
      theme: 'system',
      sounds: false, // il suono è un invito, non un'imposizione
      tool: 'pencil',
      toolColor: 'graphite',
      toolSize: 1,
      ink: 'ink',
      textSize: 'M',
      setTextSize: (textSize) => set({ textSize }),
      setTheme: (theme) => set({ theme }),
      toggleSounds: () => set({ sounds: !get().sounds }),
      setTool: (tool) => set({ tool }),
      setToolColor: (toolColor) => set({ toolColor }),
      setToolSize: (toolSize) => set({ toolSize }),
      setInk: (ink) => set({ ink }),
    }),
    { name: 'quaderno:prefs:v1', version: 1 },
  ),
)
