import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { DrawTool, InkColor } from '../types'

export type ThemeChoice = 'system' | 'light' | 'dark'

interface PrefsStore {
  theme: ThemeChoice
  sounds: boolean
  tool: DrawTool
  toolColor: string
  toolSize: number
  ink: InkColor
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
