import { useMemo } from 'react'
import { DataTexture, NearestFilter, RedFormat } from 'three'

/** Cel shading: la luce non sfuma, scatta su tre toni. È la texture che
 *  MeshToonMaterial legge con N·L: ombra, mezzo tono, luce. */
export function useToonGradient() {
  return useMemo(() => {
    const steps = new Uint8Array([120, 190, 255])
    const t = new DataTexture(steps, steps.length, 1, RedFormat)
    t.minFilter = t.magFilter = NearestFilter
    t.generateMipmaps = false
    t.needsUpdate = true
    return t
  }, [])
}
