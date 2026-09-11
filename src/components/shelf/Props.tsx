import { useEffect, useMemo } from 'react'
import { Vector2 } from 'three'
import { terracottaTexture } from './textures'

/** Oggetti di cartoleria perché la mensola stia in una stanza, non nel vuoto.
 *  Forme tornite (lathe) e materiali opachi: niente fotorealismo, ma nemmeno
 *  primitive nude. */

/** Profilo di un vaso: base stretta, bocca larga, bordo rialzato. */
const POT_PROFILE = [
  [0, 0],
  [0.095, 0],
  [0.105, 0.02],
  [0.125, 0.19],
  [0.138, 0.2],
  [0.138, 0.225],
  [0.126, 0.225],
  [0.12, 0.2],
].map(([x, y]) => new Vector2(x!, y!))

/** Le foglie di una pianta grassa: ellissoidi schiacciati disposti a rosetta,
 *  i più interni più dritti, i più esterni più aperti. */
function Rosette({ leaves, scale = 1 }: { leaves: number; scale?: number }) {
  const items = useMemo(
    () =>
      Array.from({ length: leaves }, (_, i) => {
        const ring = i < leaves * 0.4 ? 0 : 1
        const inRing = ring === 0 ? i : i - Math.floor(leaves * 0.4)
        const count = ring === 0 ? Math.floor(leaves * 0.4) : leaves - Math.floor(leaves * 0.4)
        const a = (inRing / count) * Math.PI * 2 + ring * 0.4
        const r = ring === 0 ? 0.035 : 0.075
        const open = ring === 0 ? 0.35 : 0.85
        return { a, r, open, len: ring === 0 ? 0.13 : 0.17, hue: ring }
      }),
    [leaves],
  )
  // colori propri, non token: di sera è la luce a cambiare, non la pianta
  const green = '#8DB588'
  const deep = '#557F5B'
  return (
    <group scale={scale}>
      {items.map(({ a, r, open, len, hue }, i) => (
        <group key={i} rotation={[0, a, 0]}>
          <mesh position={[r, len * 0.45, 0]} rotation={[0, 0, -open]} scale={[0.45, 1, 0.16]}>
            <sphereGeometry args={[len * 0.55, 14, 10]} />
            <meshStandardMaterial
              color={hue === 0 ? green : deep}
              roughness={0.72}
              envMapIntensity={0.3}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export function Plant({
  position,
  themeTick = 0,
  small,
}: {
  position: [number, number, number]
  themeTick?: number
  small?: boolean
}) {
  const clay = useMemo(() => terracottaTexture(), [themeTick]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => clay.dispose(), [clay])
  const s = small ? 0.78 : 1
  return (
    <group position={position} scale={s}>
      <mesh>
        <latheGeometry args={[POT_PROFILE, 28]} />
        <meshStandardMaterial map={clay} roughness={0.9} envMapIntensity={0.15} />
      </mesh>
      {/* terra */}
      <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.118, 24]} />
        <meshStandardMaterial color="#4A3628" roughness={1} />
      </mesh>
      <group position={[0, 0.2, 0]}>
        <Rosette leaves={small ? 9 : 13} scale={small ? 0.9 : 1} />
      </group>
    </group>
  )
}

const CUP_PROFILE = [
  [0, 0],
  [0.082, 0],
  [0.088, 0.008],
  [0.1, 0.17],
  [0.104, 0.178],
  [0.094, 0.178],
  [0.09, 0.17],
  [0.082, 0.02],
  [0, 0.02],
].map(([x, y]) => new Vector2(x!, y!))

export function Cup({ position }: { position: [number, number, number] }) {
  const glaze = '#F3EBDD'
  return (
    <group position={position} rotation={[0, -0.5, 0]}>
      <mesh>
        <latheGeometry args={[CUP_PROFILE, 32]} />
        <meshStandardMaterial
          color={glaze}
          roughness={0.28}
          metalness={0}
          envMapIntensity={0.9}
          side={2}
        />
      </mesh>
      {/* manico */}
      <mesh position={[0.12, 0.09, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.042, 0.013, 10, 24, Math.PI]} />
        <meshStandardMaterial color={glaze} roughness={0.28} envMapIntensity={0.9} />
      </mesh>
      {/* caffè: piatto, quasi a specchio */}
      <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.092, 32]} />
        <meshStandardMaterial color="#5B3A22" roughness={0.12} envMapIntensity={1.2} />
      </mesh>
      {/* piattino di riga: una striscia colorata sul bordo */}
      <mesh position={[0, 0.176, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.094, 0.104, 32]} />
        <meshStandardMaterial color="#D08A6E" roughness={0.4} />
      </mesh>
    </group>
  )
}

/** Un bicchiere portamatite con tre matite e un pennarello. */
export function PencilCup({ position }: { position: [number, number, number] }) {
  const pencils = [
    { x: -0.02, z: 0.01, tilt: -0.12, color: '#F2D77A', h: 0.34 },
    { x: 0.025, z: -0.015, tilt: 0.1, color: '#B8483C', h: 0.3 },
    { x: 0.0, z: 0.03, tilt: 0.03, color: '#3D4F86', h: 0.32 },
    { x: -0.03, z: -0.03, tilt: -0.05, color: '#9FD3C0', h: 0.28 },
  ]
  return (
    <group position={position}>
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.07, 0.06, 0.18, 24, 1, true]} />
        <meshStandardMaterial color="#E6DCCB" roughness={0.6} envMapIntensity={0.4} side={2} />
      </mesh>
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.06, 24]} />
        <meshStandardMaterial color="#E6DCCB" roughness={0.7} />
      </mesh>
      {pencils.map((p, i) => (
        <group key={i} position={[p.x, 0.02, p.z]} rotation={[p.tilt * 0.5, 0, p.tilt]}>
          <mesh position={[0, p.h / 2, 0]}>
            <cylinderGeometry args={[0.009, 0.009, p.h, 6]} />
            <meshStandardMaterial color={p.color} roughness={0.55} envMapIntensity={0.4} />
          </mesh>
          <mesh position={[0, p.h + 0.012, 0]}>
            <coneGeometry args={[0.009, 0.026, 6]} />
            <meshStandardMaterial color="#E9D8B8" roughness={0.9} />
          </mesh>
          <mesh position={[0, p.h + 0.028, 0]}>
            <coneGeometry args={[0.003, 0.008, 6]} />
            <meshStandardMaterial color="#3B3B3B" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
