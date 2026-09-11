/** Non uno spinner: la mensola vuota, già al suo posto, che aspetta i quaderni.
 *  Compare entro il primo frame, mentre three.js arriva. */
export function ShelfSkeleton() {
  return (
    <div className="grid size-full place-items-center" aria-hidden="true">
      <svg viewBox="0 0 320 200" className="w-[min(70vw,520px)] opacity-70">
        <defs>
          <linearGradient id="sun" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--c-paper-warm)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--c-paper-warm)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d="M40 0 L150 0 L90 120 L0 120 Z" fill="url(#sun)" />
        <rect x="34" y="132" width="252" height="11" rx="3" fill="var(--c-wood)" />
        <rect x="34" y="143" width="252" height="4" rx="2" fill="var(--c-wood-deep)" />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={i}
            x={70 + i * 26}
            y={132 - 62 - (i % 3) * 5}
            width="18"
            height={62 + (i % 3) * 5}
            rx="3"
            fill="var(--c-desk-deep)"
            opacity={0.35}
          >
            <animate
              attributeName="opacity"
              values="0.2;0.42;0.2"
              dur="1.8s"
              begin={`${i * 0.14}s`}
              repeatCount="indefinite"
            />
          </rect>
        ))}
      </svg>
    </div>
  )
}

/** Mensola davvero vuota: nessun testo motivazionale, un solo invito. */
export function ShelfEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="grid size-full place-items-center px-md">
      <div className="flex flex-col items-center gap-xl">
        <svg
          viewBox="0 0 360 210"
          className="w-[min(78vw,480px)]"
          role="img"
          aria-label="Una mensola vuota, un raggio di sole e una piantina"
        >
          <defs>
            <linearGradient id="beam" x1="0.15" y1="0" x2="0.55" y2="1">
              <stop offset="0%" stopColor="var(--c-hl-yellow)" stopOpacity="0.42" />
              <stop offset="70%" stopColor="var(--c-hl-yellow)" stopOpacity="0.06" />
              <stop offset="100%" stopColor="var(--c-hl-yellow)" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="pool" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0%" stopColor="var(--c-hl-yellow)" stopOpacity="0.34" />
              <stop offset="100%" stopColor="var(--c-hl-yellow)" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* raggio dalla finestra, morbido ai bordi */}
          <path d="M96 0 L176 0 L138 156 L30 156 Z" fill="url(#beam)" />
          <ellipse cx="118" cy="158" rx="96" ry="14" fill="url(#pool)" />

          {/* il ripiano */}
          <rect x="36" y="156" width="288" height="11" rx="3.5" fill="var(--c-wood)" />
          <rect x="36" y="166" width="288" height="5" rx="2.5" fill="var(--c-wood-deep)" />

          {/* il posto che aspetta */}
          <g>
            <rect
              x="150"
              y="98"
              width="30"
              height="58"
              rx="4"
              fill="var(--c-paper)"
              fillOpacity="0.55"
              stroke="var(--c-graphite)"
              strokeOpacity="0.35"
              strokeWidth="1.75"
              strokeDasharray="5 4.5"
            />
            <path
              d="M165 119v16M157 127h16"
              stroke="var(--c-graphite)"
              strokeOpacity="0.42"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </g>

          {/* la piantina, appoggiata sul ripiano */}
          <g transform="translate(268 0)">
            <path d="M-13 156 L-10 131 h20 l3 25 Z" fill="var(--c-cover-terracotta)" />
            <rect x="-14" y="127" width="28" height="6" rx="2.5" fill="var(--c-cover-terracotta)" />
            <circle cx="-6" cy="119" r="10" fill="var(--c-cover-salvia)" />
            <circle cx="7" cy="122" r="8" fill="var(--c-cover-salvia)" fillOpacity="0.9" />
            <circle cx="1" cy="110" r="9" fill="var(--c-cover-salvia)" />
          </g>

          {/* una tazza dimenticata */}
          <g transform="translate(70 0)">
            <path
              d="M-11 134 h20 v14 a5 5 0 0 1 -5 5 h-10 a5 5 0 0 1 -5 -5 Z"
              fill="var(--c-paper)"
            />
            <path
              d="M9 138 h4 a4 4 0 0 1 0 8 h-4"
              fill="none"
              stroke="var(--c-paper)"
              strokeWidth="3"
            />
            <ellipse cx="-1" cy="134" rx="10" ry="2.6" fill="var(--c-cover-terracotta)" />
          </g>
        </svg>

        <button
          type="button"
          onClick={onCreate}
          className="h-14 rounded-md bg-ink px-xl text-sm font-semibold text-paper shadow-lift transition-transform hover:-translate-y-0.5"
        >
          Crea il tuo primo quaderno
        </button>
      </div>
    </div>
  )
}
