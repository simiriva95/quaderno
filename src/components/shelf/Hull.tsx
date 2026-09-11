import type { ReactNode } from 'react'
import { BackSide } from 'three'
import { cssVar } from '../../lib/covers'

/** Contorno a inchiostro alla vecchia maniera: la stessa forma, un filo più
 *  grande, disegnata dal lato interno. Dove l'oggetto copre il guscio non si
 *  vede niente; lungo la silhouette resta una riga. */
export const OUTLINE = 0.009

export function Hull({
  children,
  scale = 1,
  position,
  rotation,
}: {
  /** la geometria da rivestire */
  children: ReactNode
  scale?: number | [number, number, number]
  position?: [number, number, number]
  rotation?: [number, number, number]
}) {
  return (
    <mesh scale={scale} position={position} rotation={rotation}>
      {children}
      <meshBasicMaterial color={cssVar('--c-ink')} side={BackSide} toneMapped={false} />
    </mesh>
  )
}
