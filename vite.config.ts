import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // niente manualChunks: forzare three in un chunk nominato lo faceva
    // diventare una dipendenza statica dell'entry, e veniva precaricato anche
    // sulla mensola vuota. Lasciando decidere il bundler resta dentro il chunk
    // dinamico della scena, che si scarica solo quando serve davvero.
    // three + R3F stanno in un chunk dinamico da ~240 KB gzip che si scarica
    // solo quando la mensola 3D entra in scena: l'avviso non si applica
    chunkSizeWarningLimit: 1000,
  },
})
