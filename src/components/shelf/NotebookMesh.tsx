import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import { BoxGeometry, Vector3, type Group, type LineSegments } from 'three'
import { BOOK_W, jitter, slotFor } from './geometry'
import { useSpring3 } from './useSpring3'
import { useCoverTextures } from './useCoverTextures'
import { useToonGradient } from './toon'
import { Hull, OUTLINE } from './Hull'
import { coverColor, cssVar } from '../../lib/covers'
import type { Notebook } from '../../types'

interface Props {
  notebook: Notebook
  index: number
  total: number
  perShelf: number
  focused: boolean
  /** Entra dall'alto invece di apparire: è appena stato creato. */
  dropIn: boolean
  themeTick: number
  onOpen: (rect: { x: number; y: number; width: number; height: number }) => void
  onHover: (title: string | null) => void
}

/** spessore di una copertina cartonata */
const COVER_T = 0.014

export function NotebookMesh({
  notebook,
  index,
  total,
  perShelf,
  focused,
  dropIn,
  themeTick,
  onOpen,
  onHover,
}: Props) {
  const group = useRef<Group>(null)
  const { camera, gl } = useThree()
  const outline = useRef<LineSegments>(null)
  const [hovered, setHovered] = useState(false)
  const { height, tilt, depth } = jitter(notebook.id)
  const maps = useCoverTextures(notebook, themeTick)
  const toon = useToonGradient()

  const pos = useSpring3(240, 24)
  const lift = useSpring3(300, 28)
  const slot = slotFor(index, total, perShelf)
  const restY = slot.y + height / 2

  // Il quaderno appena creato scende da sopra il ripiano e si assesta;
  // gli altri sono già al loro posto.
  useEffect(() => {
    if (dropIn) pos.setFrom([slot.x, restY + 1.8, 0], [slot.x, restY, 0])
    else pos.setTarget([slot.x, restY, 0])
    // solo al montaggio: dopo, le posizioni le insegue la molla nel frame loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame(() => {
    pos.setTarget([slot.x, restY, 0])
    lift.setTarget([0, 0, hovered || focused ? 0.14 : 0])
    const g = group.current
    if (!g) return
    // Il sollevamento va VERSO la camera, non lungo z: con la camera di tre
    // quarti un passo lungo z appariva come uno scivolamento di lato sopra il
    // vicino, e hover e click rimbalzavano fra quaderni adiacenti.
    const [px, py] = pos.value.current
    const l = lift.value.current[2]
    const dx = camera.position.x - px
    const dz = camera.position.z
    const len = Math.hypot(dx, dz) || 1
    g.position.set(px + (dx / len) * l, py, (dz / len) * l)
    // si inclina verso lo spettatore, come quando lo sfili con un dito
    g.rotation.x = tilt + (l / 0.14) * 0.12
    g.rotation.z = tilt * 0.5
    if (outline.current) outline.current.visible = focused
  })

  /** Dove sta il dorso, in pixel di finestra: è da lì che parte l'apertura. */
  const screenRect = () => {
    const g = group.current
    const canvas = gl.domElement.getBoundingClientRect()
    const toPx = (p: Vector3) => {
      const q = p.clone().project(camera)
      return {
        x: canvas.left + ((q.x + 1) / 2) * canvas.width,
        y: canvas.top + ((1 - q.y) / 2) * canvas.height,
      }
    }
    // il rettangolo che racchiude il dorso proiettato: la faccia +z del
    // quaderno, con i suoi quattro vertici in coordinate di mondo. Vale per
    // qualunque angolo di camera.
    const corners: Vector3[] = []
    for (const sx of [-1, 1])
      for (const sy of [-1, 1])
        corners.push(new Vector3((sx * BOOK_W) / 2, (sy * height) / 2, depth / 2))
    const pts = corners.map((v) => toPx(g ? g.localToWorld(v) : v))
    const xs = pts.map((q) => q.x)
    const ys = pts.map((q) => q.y)
    const x = Math.min(...xs)
    const y = Math.min(...ys)
    return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
  }

  const base = coverColor(notebook.cover.color)
  const spineBase = coverColor(notebook.cover.spineColor)
  const innerW = BOOK_W - COVER_T * 2

  return (
    <group
      ref={group}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        onHover(notebook.title)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        onHover(null)
        document.body.style.cursor = ''
      }}
      onClick={(e) => {
        e.stopPropagation()
        onOpen(screenRect())
      }}
    >
      {/* Il materiale nasce insieme alla sua texture: assegnare una map a un
          materiale già compilato non ricompila lo shader, e il quaderno
          resterebbe bianco. Con la key three ricostruisce tutto. */}
      <group key={maps ? 'textured' : 'plain'}>
        {/* blocco delle pagine: appena più piccolo delle copertine, così dal
            taglio si vede il bordo del cartone e poi i fogli */}
        <mesh position={[0, -0.006, -0.012]}>
          <boxGeometry args={[innerW, height - 0.03, depth - 0.02]} />
          {maps ? (
            <meshToonMaterial gradientMap={toon} map={maps.pages} />
          ) : (
            <meshToonMaterial gradientMap={toon} color="#EFE6DA" />
          )}
        </mesh>

        {/* le due copertine: la faccia esterna porta la texture, il taglio
            resta del colore del cartone */}
        {[1, -1].map((s) => (
          <mesh key={s} position={[s * (BOOK_W / 2 - COVER_T / 2), 0, 0]}>
            <boxGeometry args={[COVER_T, height, depth]} />
            {maps ? (
              <>
                <meshToonMaterial
                  gradientMap={toon}
                  attach="material-0"
                  map={s === 1 ? maps.cover : undefined}
                  color={s === 1 ? '#fff' : base}
                />
                <meshToonMaterial
                  gradientMap={toon}
                  attach="material-1"
                  map={s === -1 ? maps.cover : undefined}
                  color={s === -1 ? '#fff' : base}
                />
                <meshToonMaterial gradientMap={toon} attach="material-2" color={base} />
                <meshToonMaterial gradientMap={toon} attach="material-3" color={base} />
                <meshToonMaterial gradientMap={toon} attach="material-4" color={base} />
                <meshToonMaterial gradientMap={toon} attach="material-5" color={base} />
              </>
            ) : (
              <meshToonMaterial gradientMap={toon} color={base} />
            )}
          </mesh>
        ))}

        {/* dorso: leggermente sporgente, con la texture del titolo */}
        <mesh position={[0, 0, depth / 2 - COVER_T / 2 + 0.004]}>
          <boxGeometry args={[BOOK_W + 0.004, height + 0.004, COVER_T]} />
          {maps ? (
            <>
              <meshToonMaterial gradientMap={toon} attach="material-0" color={spineBase} />
              <meshToonMaterial gradientMap={toon} attach="material-1" color={spineBase} />
              <meshToonMaterial gradientMap={toon} attach="material-2" color={spineBase} />
              <meshToonMaterial gradientMap={toon} attach="material-3" color={spineBase} />
              <meshToonMaterial gradientMap={toon} attach="material-4" map={maps.spine} />
              <meshToonMaterial gradientMap={toon} attach="material-5" color={spineBase} />
            </>
          ) : (
            <meshToonMaterial gradientMap={toon} color={spineBase} />
          )}
        </mesh>

        {/* contorno a inchiostro: un guscio grande come il quaderno intero;
            uno per mesh farebbe righe fra copertina e pagine */}
        <Hull>
          <boxGeometry
            args={[BOOK_W + 0.004 + OUTLINE * 2, height + 0.004 + OUTLINE * 2, depth + OUTLINE * 2]}
          />
        </Hull>

        {/* l'elastico, sul taglio davanti: una striscia scura che gira
            attorno al quaderno */}
        {notebook.cover.elastic && (
          <mesh position={[0, 0, -depth / 2 + depth * 0.12]}>
            <boxGeometry args={[BOOK_W + 0.006, height + 0.004, 0.012]} />
            <meshToonMaterial gradientMap={toon} color={cssVar('--c-ink')} />
          </mesh>
        )}
      </group>

      {/* anello di focus: disegnato in scena, non il contorno di sistema */}
      {/* raycast spento: three non guarda `visible` e per le linee usa una
          soglia di 1 unità — l'anello catturava click grandi come la mensola */}
      <lineSegments ref={outline} visible={false} raycast={() => null}>
        <edgesGeometry args={[new BoxGeometry(BOOK_W + 0.05, height + 0.05, depth + 0.05)]} />
        <lineBasicMaterial color={cssVar('--c-ink')} />
      </lineSegments>
    </group>
  )
}
