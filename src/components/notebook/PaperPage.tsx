import type { ReactNode } from 'react'
import { PAGE_H, PAGE_PAD_TOP, PAGE_PAD_X, PAGE_W, RULE_STEP } from '../../lib/constants'
import type { PaperKind } from '../../types'

interface Props {
  paper: PaperKind
  side: 'left' | 'right' | 'single'
  children?: ReactNode
  /** numero di pagina stampato in basso, come sui quaderni veri */
  number?: number
}

export function PaperPage({ paper, side, children, number }: Props) {
  return (
    <div
      className={`paper paper--${paper} relative shrink-0 overflow-hidden`}
      style={{
        width: PAGE_W,
        height: PAGE_H,
        borderRadius: side === 'left' ? '14px 4px 4px 14px' : '4px 14px 14px 4px',
      }}
    >
      <Rules paper={paper} />
      {side === 'single' && (
        <div className="binding-holes" style={{ insetInlineStart: 18 }} aria-hidden="true">
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} />
          ))}
        </div>
      )}
      {children}
      {number !== undefined && (
        <span
          className="pointer-events-none absolute bottom-2xs w-full text-center font-hand text-2xs opacity-35"
          style={{ zIndex: 2 }}
          aria-hidden="true"
        >
          {number}
        </span>
      )}
    </div>
  )
}

/** Le righe sono un SVG, non un gradiente ripetuto: sotto lo scale() della
 *  pagina Chrome arrotonda al pixel intero ogni tessera del gradiente, il passo
 *  diventa 30–31px invece di 32 e il testo, che resta a 32, deriva riga dopo
 *  riga. Un'unica immagine vettoriale scala tutta insieme, come il testo.
 *  La taratura verticale (--rule-lift) arriva via CSS transform. */
function Rules({ paper }: { paper: PaperKind }) {
  if (paper === 'blank') return null
  const ys: number[] = []
  for (let y = PAGE_PAD_TOP; y <= PAGE_H + RULE_STEP; y += RULE_STEP) ys.push(y)
  const xs: number[] = []
  if (paper === 'grid') for (let x = PAGE_PAD_X % RULE_STEP; x <= PAGE_W; x += RULE_STEP) xs.push(x)
  return (
    <svg
      className="paper-rules"
      width={PAGE_W}
      height={PAGE_H}
      viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}
      aria-hidden="true"
    >
      {ys.map((y) => (
        <line key={`h${y}`} x1={0} x2={PAGE_W} y1={y} y2={y} />
      ))}
      {xs.map((x) => (
        <line key={`v${x}`} className="paper-rules__v" x1={x} x2={x} y1={0} y2={PAGE_H} />
      ))}
    </svg>
  )
}
