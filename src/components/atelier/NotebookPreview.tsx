import { AnimatePresence, motion } from 'motion/react'
import { useCoverTexture } from '../../hooks/useCoverTexture'
import { SPRING, SPRING_SOFT } from '../../lib/constants'
import type { Cover, NotebookKind } from '../../types'
import { Sticker } from './Stickers'
import { stickerTint } from '../../lib/stickers'

interface Props {
  cover: Cover
  title: string
  /** Cresce ogni volta che cambia il colore: fa "respirare" la copertina. */
  pulseKey: string
  width?: number
  /** Il raccoglitore: etichetta stampata, anelli sul dorso, niente elastico. */
  kind?: NotebookKind
}

/** Pseudo-3D in CSS. A questa scala è indistinguibile da una scena Three e non
 *  lega la schermata di creazione al chunk di three.js. */
export function NotebookPreview({ cover, title, pulseKey, width = 260, kind }: Props) {
  const texture = useCoverTexture(cover.color, cover.pattern)
  const binder = kind === 'web'
  const height = width * 1.38
  const spine = width * (binder ? 0.085 : 0.07)

  return (
    <motion.div
      className="relative"
      style={{ width: width + spine, height, perspective: 1400 }}
      initial={false}
    >
      <motion.div
        key={pulseKey}
        className="absolute inset-0"
        style={{ transformStyle: 'preserve-3d' }}
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.018, 1], rotateY: [-16, -16], rotateX: [4, 4] }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* blocco pagine: sbuca di lato, è ciò che dà spessore */}
        <div
          className="absolute rounded-r-[6px] bg-paper"
          style={{
            left: spine,
            top: 6,
            width: width - 4,
            height: height - 12,
            boxShadow: 'inset -6px 0 10px -6px rgb(var(--sh-tint) / .35)',
          }}
        />

        {/* dorso */}
        <div
          className="absolute rounded-l-[8px]"
          style={{
            left: 0,
            top: 0,
            width: spine,
            height,
            backgroundColor: `var(--c-cover-${cover.spineColor})`,
            boxShadow: 'inset -3px 0 6px -3px rgb(var(--sh-tint) / .45)',
          }}
        />

        {/* copertina */}
        <div
          className="absolute overflow-hidden"
          style={{
            left: spine,
            top: 0,
            width,
            height,
            borderRadius: '3px 16px 16px 3px',
            backgroundImage: texture ? `url(${texture})` : undefined,
            backgroundColor: `var(--c-cover-${cover.color})`,
            backgroundSize: '150% 150%',
            boxShadow: 'var(--sh-lift)',
          }}
        >
          <div
            className="absolute inset-0"
            style={{ backgroundImage: 'var(--grain)', opacity: 0.06, mixBlendMode: 'multiply' }}
          />

          {/* etichetta cucita */}
          <div
            className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center rounded-[4px] bg-paper px-sm text-center"
            style={{
              top: height * 0.3,
              width: width * 0.66,
              minHeight: height * 0.16,
              boxShadow: 'var(--sh-paper)',
              border: binder
                ? '1px solid color-mix(in oklab, var(--c-graphite) 38%, transparent)'
                : '1px dashed color-mix(in oklab, var(--c-graphite) 28%, transparent)',
            }}
          >
            <span
              className={`text-base leading-tight text-ink ${binder ? 'font-semibold' : 'font-hand'}`}
            >
              {title || cover.labelText || 'Senza titolo'}
            </span>
          </div>

          <AnimatePresence mode="wait">
            {cover.sticker && (
              <motion.span
                key={cover.sticker}
                className="absolute grid place-items-center rounded-full"
                style={{
                  left: width * 0.62,
                  top: height * 0.58,
                  width: width * 0.22,
                  height: width * 0.22,
                  backgroundColor: stickerTint(cover.sticker),
                  color: 'var(--c-graphite)',
                  boxShadow: 'var(--sh-paper)',
                }}
                // lo sticker atterra: scende ruotato, si appiattisce, l'ombra collassa
                initial={{ opacity: 0, y: -26, rotate: -12, scaleY: 1.14 }}
                animate={{ opacity: 1, y: 0, rotate: -6, scaleY: 1 }}
                exit={{ opacity: 0, scale: 0.86, transition: { duration: 0.16 } }}
                transition={SPRING}
              >
                <Sticker id={cover.sticker} size={width * 0.13} />
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* gli anelli, attorno al dorso */}
        {binder &&
          [0.2, 0.5, 0.8].map((f) => (
            <span
              key={f}
              aria-hidden="true"
              className="absolute rounded-full"
              style={{
                left: -spine * 0.3,
                top: height * f - spine * 0.4,
                width: spine * 2.1,
                height: spine * 0.8,
                backgroundColor: '#C7CAD1',
                boxShadow: 'inset 0 -1px 2px rgb(var(--sh-tint) / .35)',
              }}
            />
          ))}

        {/* elastico */}
        <AnimatePresence>
          {cover.elastic && !binder && (
            <motion.div
              className="absolute"
              style={{
                // l'elastico sta vicino al taglio, non in mezzo alla copertina:
                // a metà leggeva come una riga stampata
                left: spine + width * 0.9,
                top: -5,
                width: 7,
                height: height + 10,
                borderRadius: 4,
                backgroundColor: 'color-mix(in oklab, var(--c-graphite) 62%, var(--c-desk))',
                boxShadow:
                  'inset 0 0 0 1px rgb(var(--sh-tint) / .25), 0 1px 4px rgb(var(--sh-tint) / .35)',
              }}
              initial={{ scaleY: 0.6, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 0.9 }}
              exit={{ scaleY: 0.6, opacity: 0, transition: { duration: 0.16 } }}
              transition={SPRING_SOFT}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
