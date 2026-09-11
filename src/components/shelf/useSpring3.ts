import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

/** Molla critica-ish su tre assi. Non serve una libreria: sono sei righe e
 *  gira dentro il frame loop di R3F, senza un secondo scheduler. */
export function useSpring3(stiffness = 260, damping = 26) {
  const value = useRef<[number, number, number]>([0, 0, 0])
  const velocity = useRef<[number, number, number]>([0, 0, 0])
  const target = useRef<[number, number, number]>([0, 0, 0])
  const started = useRef(false)

  useFrame((_, rawDelta) => {
    // passi fissi: un frame lungo (tab in background) non deve far esplodere
    const delta = Math.min(rawDelta, 1 / 30)
    for (let i = 0; i < 3; i++) {
      const dx = target.current[i]! - value.current[i]!
      const v = velocity.current[i]! + (stiffness * dx - damping * velocity.current[i]!) * delta
      velocity.current[i] = v
      value.current[i] = value.current[i]! + v * delta
    }
  })

  const setTarget = (next: [number, number, number]) => {
    target.current = next
    if (!started.current) {
      value.current = [...next]
      velocity.current = [0, 0, 0]
      started.current = true
    }
  }

  /** Posizione di partenza esplicita: serve al quaderno che cade dall'alto. */
  const setFrom = (from: [number, number, number], to: [number, number, number]) => {
    value.current = [...from]
    velocity.current = [0, 0, 0]
    target.current = to
    started.current = true
  }

  return { value, setTarget, setFrom }
}
