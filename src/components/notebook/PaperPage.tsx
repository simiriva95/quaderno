import type { ReactNode } from 'react'
import { PAGE_H, PAGE_W } from '../../lib/constants'
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
