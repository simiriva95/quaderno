import type { StickerId } from '../../types'
import { STICKER_DEFS } from '../../lib/stickers'

export function Sticker({ id, size = 24 }: { id: StickerId; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {STICKER_DEFS[id].paths.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill="none"
          stroke="currentColor"
          strokeWidth={p.w ?? 1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}
