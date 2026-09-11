import { useCallback, useRef } from 'react'
import { usePrefs } from '../store/prefs'

export type SoundName = 'page' | 'pencil' | 'thump'

/** I suoni sono sintetizzati, non file. Tre campioni brevi costerebbero ~90 KB
 *  e un giro di rete; qui sono venti righe di WebAudio, pesano zero e si
 *  accordano da soli col tema sonoro (tutto morbido, niente attacchi duri). */
export function useSound() {
  const enabled = usePrefs((s) => s.sounds)
  const ctxRef = useRef<AudioContext | null>(null)

  return useCallback(
    (name: SoundName) => {
      if (!enabled) return
      const Ctx =
        window.AudioContext ??
        (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctx) return
      const ctx = (ctxRef.current ??= new Ctx())
      if (ctx.state === 'suspended') void ctx.resume()

      const now = ctx.currentTime
      const gain = ctx.createGain()
      gain.connect(ctx.destination)

      if (name === 'thump') {
        // il quaderno che si posa: una sinusoide bassa che decade subito
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(140, now)
        osc.frequency.exponentialRampToValueAtTime(52, now + 0.13)
        gain.gain.setValueAtTime(0.16, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22)
        osc.connect(gain)
        osc.start(now)
        osc.stop(now + 0.24)
        return
      }

      // fruscio e matita: rumore filtrato, durata e taglio diversi
      const isPage = name === 'page'
      const duration = isPage ? 0.26 : 0.05
      const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < data.length; i++) {
        const t = i / data.length
        data[i] = (Math.random() * 2 - 1) * (isPage ? Math.sin(Math.PI * t) : 1 - t)
      }
      const source = ctx.createBufferSource()
      source.buffer = buffer

      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.value = isPage ? 2400 : 5200
      filter.Q.value = isPage ? 0.7 : 2.2

      gain.gain.value = isPage ? 0.09 : 0.05
      source.connect(filter)
      filter.connect(gain)
      source.start(now)
    },
    [enabled],
  )
}
