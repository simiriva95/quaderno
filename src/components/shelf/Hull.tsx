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
  // di sera l'inchiostro dei token è crema e i contorni leggevano come bordi
  // bianchi: il tratto a china resta scuro, sempre
  const dark = document.documentElement.dataset.theme === 'dark'
  return (
    <mesh scale={scale} position={position} rotation={rotation}>
      {children}
      <meshBasicMaterial
        color={dark ? '#1F1813' : cssVar('--c-ink')}
        side={BackSide}
        toneMapped={false}
      />
    </mesh>
  )
}
