import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { PAGE_H, PAGE_W } from '../../lib/constants'

export interface Leaf {
  key: string
  /** Faccia visibile prima di girare (la pagina che stiamo lasciando). */
  front: ReactNode
  /** Faccia che compare girando (la pagina che arriva). */
  back: ReactNode
  direction: 1 | -1
  /** Doppia pagina: il cardine è la piega centrale. Pagina singola: il cardine
   *  è il bordo sinistro, come un blocco ad anelli. */
  spread: boolean
}

const DURATION = 0.62
const EASE = [0.36, 0, 0.2, 1] as const

/** Il foglio che gira. Cardine sulla piega, curvatura simulata da un gradiente
 *  che scorre sulla faccia: è l'ombra a raccontare che la carta si piega, non
 *  una geometria 3D — molto più economica e visivamente indistinguibile.
 *
 *  `onDone` arriva da `onAnimationComplete`, non da AnimatePresence: il foglio
 *  è già stato disegnato sopra le pagine di arrivo, quindi può sparire secco. */
export function PageFlip({ leaf, onDone }: { leaf: Leaf | null; onDone: () => void }) {
  if (!leaf) return null
  const fwd = leaf.direction === 1
  const { spread } = leaf

  // spread: avanti gira la pagina destra sulla piega, indietro la sinistra.
  // singola: il foglio sta sempre sul bordo sinistro; avanti se ne va a
  // sinistra e svanisce, indietro rientra da lì.
  const origin = spread && !fwd ? 'right center' : 'left center'
  const left = spread && fwd ? '50%' : 0
  const from = spread || fwd ? 0 : -180
  const to = spread ? (fwd ? -180 : 180) : fwd ? -180 : 0
  const opacity = spread ? 1 : fwd ? [1, 1, 0] : [0, 1, 1]
  const times = spread ? undefined : fwd ? [0, 0.55, 1] : [0, 0.45, 1]

  return (
    <motion.div
      key={leaf.key}
      className="pointer-events-none absolute top-0"
      style={{
        width: PAGE_W,
        height: PAGE_H,
        transformStyle: 'preserve-3d',
        transformOrigin: origin,
        left,
        zIndex: 20,
      }}
      initial={{ rotateY: from, opacity: spread ? 1 : fwd ? 1 : 0 }}
      animate={{ rotateY: to, opacity }}
      transition={{ duration: DURATION, ease: EASE, opacity: { duration: DURATION, times } }}
      onAnimationComplete={onDone}
    >
      <Face>{leaf.front}</Face>
      <Face flipped>{leaf.back}</Face>
      <motion.div
        className="absolute inset-0"
        style={{ borderRadius: 14 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.34, 0] }}
        transition={{ duration: DURATION, times: [0, 0.5, 1] }}
      >
        <div
          className="size-full"
          style={{
            borderRadius: 14,
            background: fwd
              ? 'linear-gradient(to left, rgb(var(--sh-tint) / .55), transparent 62%)'
              : 'linear-gradient(to right, rgb(var(--sh-tint) / .55), transparent 62%)',
          }}
        />
      </motion.div>
    </motion.div>
  )
}

function Face({ children, flipped }: { children: ReactNode; flipped?: boolean }) {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        backfaceVisibility: 'hidden',
        transform: flipped ? 'rotateY(180deg)' : undefined,
      }}
    >
      {children}
    </div>
  )
}
