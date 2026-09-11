import { motion } from 'motion/react'
import { useEffect } from 'react'
import { useCoverTexture } from '../../hooks/useCoverTexture'
import { Sticker } from '../atelier/Stickers'
import { stickerTint } from '../../lib/stickers'
import type { Notebook } from '../../types'

/** ── Il momento ───────────────────────────────────────────────────────────
 *  Il quaderno esce dalla fila, gira su sé stesso mostrando la copertina,
 *  la copertina si apre sul cardine e le pagine sfogliano.
 *
 *  Tutto in DOM, anche quando la mensola è in Three.js. Il piano iniziale
 *  prevedeva di girare in 3D e passare il testimone al DOM a metà strada:
 *  la consegna avviene invece al primo frame, partendo dal rettangolo che il
 *  dorso occupa sullo schermo. Stesso effetto, e nessuna cucitura possibile —
 *  non ci sono due rendering da far combaciare.
 */

export interface FlyRect {
  x: number
  y: number
  width: number
  height: number
}

const COVER_W = 300
const COVER_H = 414

interface Props {
  notebook: Notebook
  /** Il rettangolo del dorso sulla mensola: punto di partenza o di arrivo. */
  from: FlyRect
  /** 'close' è la stessa scena al contrario, e più svelta: le uscite durano
   *  circa due terzi delle entrate, o sembrano lente. */
  direction?: 'open' | 'close'
  onDone: () => void
}

export function OpeningTransition({ notebook, from, direction = 'open', onDone }: Props) {
  const texture = useCoverTexture(notebook.cover.color, notebook.cover.pattern)
  const closing = direction === 'close'

  useEffect(() => {
    const t = setTimeout(onDone, closing ? 900 : 1400)
    return () => clearTimeout(t)
  }, [onDone, closing])

  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2

  const onShelf = {
    x: from.x + from.width / 2 - COVER_W / 2,
    y: from.y + from.height / 2 - COVER_H / 2,
    scaleX: Math.max(0.04, from.width / COVER_W),
    scaleY: from.height / COVER_H,
    rotateY: -84,
  }
  const centred = { x: cx - COVER_W / 2, y: cy - COVER_H / 2, scaleX: 1, scaleY: 1, rotateY: 0 }

  return (
    <motion.div
      className="fixed inset-0 z-50"
      style={{ perspective: 1800 }}
      initial={{ backgroundColor: closing ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0)' }}
      animate={{ backgroundColor: closing ? 'rgba(0,0,0,0)' : 'rgba(0,0,0,0.10)' }}
      transition={{ duration: closing ? 0.34 : 0.5 }}
      aria-hidden="true"
    >
      <motion.div
        className="absolute"
        style={{ transformStyle: 'preserve-3d', width: COVER_W, height: COVER_H }}
        initial={closing ? centred : onShelf}
        animate={closing ? onShelf : centred}
        transition={
          closing
            ? { duration: 0.62, delay: 0.24, ease: [0.5, 0, 0.2, 1] }
            : { type: 'spring', stiffness: 175, damping: 23, mass: 1 }
        }
      >
        {/* La prima pagina, che resta quando la copertina si apre.
            `position` e `inset` inline: `.paper` dichiara position:relative e
            vincerebbe sulla utility di Tailwind (stessa specificità, caricata dopo).
            Il passo delle righe è ridotto: qui la pagina è mezza dimensione. */}
        <div
          className="paper paper--lined"
          style={{
            position: 'absolute',
            inset: 0,
            ['--rule-step' as string]: '17px',
            ['--pad-x' as string]: '28px',
            ['--pad-top' as string]: '20px',
            borderRadius: '4px 14px 14px 4px',
            boxShadow: 'var(--sh-lift)',
          }}
        />

        {/* la copertina, incernierata sul dorso */}
        <motion.div
          className="absolute inset-0"
          style={{
            transformOrigin: 'left center',
            transformStyle: 'preserve-3d',
          }}
          initial={{ rotateY: closing ? -164 : 0 }}
          animate={closing ? { rotateY: 0 } : { rotateY: [0, 0, -164] }}
          transition={
            closing
              ? { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
              : { duration: 1.05, times: [0, 0.52, 1], ease: [0.4, 0, 0.16, 1] }
          }
        >
          {/* il rovescio: l'interno della copertina, non il fronte a specchio */}
          <div
            className="absolute inset-0"
            style={{
              transform: 'rotateY(180deg)',
              backfaceVisibility: 'hidden',
              borderRadius: '14px 3px 3px 14px',
              backgroundColor: 'var(--c-paper-edge)',
              boxShadow: 'inset 0 0 24px rgb(var(--sh-tint) / .12)',
            }}
          />

          <div
            className="absolute inset-0 overflow-hidden"
            style={{
              backfaceVisibility: 'hidden',
              borderRadius: '3px 14px 14px 3px',
              backgroundColor: `var(--c-cover-${notebook.cover.color})`,
              backgroundImage: texture ? `url(${texture})` : undefined,
              backgroundSize: '160% 160%',
              boxShadow: 'var(--sh-lift)',
            }}
          >
            <div
              className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center rounded-[4px] bg-paper px-sm text-center"
              style={{
                top: COVER_H * 0.28,
                width: COVER_W * 0.66,
                minHeight: COVER_H * 0.15,
                boxShadow: 'var(--sh-paper)',
                border: '1px dashed color-mix(in oklab, var(--c-graphite) 28%, transparent)',
              }}
            >
              <span className="font-hand text-base leading-tight text-ink">{notebook.title}</span>
            </div>

            {notebook.cover.sticker && (
              <span
                className="absolute grid place-items-center rounded-full"
                style={{
                  left: COVER_W * 0.62,
                  top: COVER_H * 0.58,
                  width: COVER_W * 0.22,
                  height: COVER_W * 0.22,
                  backgroundColor: stickerTint(notebook.cover.sticker),
                  color: 'var(--c-graphite)',
                  transform: 'rotate(-6deg)',
                  boxShadow: 'var(--sh-paper)',
                }}
              >
                <Sticker id={notebook.cover.sticker} size={COVER_W * 0.13} />
              </span>
            )}
          </div>
        </motion.div>

        {/* Lo sfoglio. I fogli hanno un bordo proprio e restano visibili anche
            di rovescio: senza, lo sfoglio è un solo lenzuolo bianco. */}
        {!closing &&
          [0, 1, 2, 3, 4].map((i) => (
            <motion.div
              key={i}
              className="paper paper--lined"
              style={{
                position: 'absolute',
                inset: 0,
                ['--rule-step' as string]: '17px',
                ['--pad-x' as string]: '28px',
                ['--pad-top' as string]: '20px',
                transformOrigin: 'left center',
                borderRadius: '4px 14px 14px 4px',
                boxShadow: '1px 0 0 rgb(var(--sh-tint) / .12), var(--sh-paper)',
              }}
              initial={{ rotateY: 0, opacity: 0 }}
              animate={{ rotateY: [0, 0, -172], opacity: [0, 1, 1] }}
              transition={{
                duration: 0.42,
                delay: 0.74 + i * 0.1,
                times: [0, 0.02, 1],
                // decelera: l'ultima pagina si posa, non sbatte
                ease: [0.32, 0, 0.2, 1],
              }}
            />
          ))}
      </motion.div>
    </motion.div>
  )
}
