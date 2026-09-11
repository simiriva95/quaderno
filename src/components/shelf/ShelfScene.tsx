import { ContactShadows, Sparkles } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BoxGeometry, NoToneMapping, Vector3, type PerspectiveCamera } from 'three'
import { BOOK_D, SHELF_GAP_Y, plankWidth, shelfCount, slotFor } from './geometry'
import { NotebookMesh } from './NotebookMesh'
import { Cup, PencilCup, Plant } from './Props'
import { woodTextures } from './textures'
import { makeWallMaterial } from './WallMaterial'
import { useToonGradient } from './toon'
import { Hull, OUTLINE } from './Hull'
import { cssVar } from '../../lib/covers'
import type { Notebook } from '../../types'

interface Props {
  notebooks: Notebook[]
  focusIndex: number
  justCreatedId: string | null
  onOpen: (id: string, rect: { x: number; y: number; width: number; height: number }) => void
  /** Il quaderno che sta volando via non deve restare anche nella fila. */
  leavingId: string | null
  onHover: (title: string | null) => void
  onAdd: () => void
  perShelf: number
}

const PLANK_T = 0.07
/** angolo di vista, in radianti: 30° di tre quarti, da sinistra. Da sinistra
 *  lo slot "nuovo", ultimo a destra, è il più lontano e non copre nessuno. */
const AZIMUTH = -Math.PI / 6
const PLANK_D = BOOK_D + 0.22

/** Parete: intonaco in GLSL (vedi WallMaterial). Fondale, non superficie:
 *  le ombre le dipinge, non le riceve. */
function Wall({
  shelves,
  width,
  themeTick,
}: {
  shelves: number
  width: number
  themeTick: number
}) {
  const dark = document.documentElement.dataset.theme === 'dark'
  const material = useMemo(
    () =>
      makeWallMaterial(
        Array.from({ length: shelves }, (_, i) => -i * SHELF_GAP_Y - 0.03),
        width / 2,
        dark,
      ),
    // themeTick: al cambio tema i token cambiano e il materiale va ridipinto
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shelves, width, dark, themeTick],
  )
  useEffect(() => () => material.dispose(), [material])
  return (
    <mesh position={[0, -shelves * 0.55 + 0.4, -0.75]} material={material}>
      <planeGeometry args={[60, 24]} />
    </mesh>
  )
}

/** Ripiano: una tavola di legno vero — venatura procedurale, bordo smussato
 *  da un listello frontale, due reggimensola sotto. */
function Plank({ y, width, themeTick }: { y: number; width: number; themeTick: number }) {
  const wood = useMemo(() => woodTextures(), [themeTick]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () => () => {
      wood.map.dispose()
      wood.roughnessMap.dispose()
    },
    [wood],
  )
  wood.map.repeat.set(width / 2.2, 1)
  wood.roughnessMap.repeat.set(width / 2.2, 1)

  const bracket = cssVar('--c-wood-deep')
  const toon = useToonGradient()
  return (
    <group position={[0, y - PLANK_T / 2, 0]}>
      <Hull>
        <boxGeometry args={[width + OUTLINE * 2, PLANK_T + OUTLINE * 2, PLANK_D + OUTLINE * 2]} />
      </Hull>
      <mesh>
        <boxGeometry args={[width, PLANK_T, PLANK_D]} />
        <meshToonMaterial map={wood.map} gradientMap={toon} />
      </mesh>
      {/* listello frontale appena più scuro: è la costa della tavola */}
      <mesh position={[0, 0, PLANK_D / 2 + 0.004]}>
        <boxGeometry args={[width, PLANK_T * 0.96, 0.008]} />
        <meshToonMaterial color={bracket} gradientMap={toon} />
      </mesh>
      {/* reggimensola: due cunei sotto, verso la parete */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * (width / 2 - 0.34), -PLANK_T / 2 - 0.09, -PLANK_D / 2 + 0.11]}
          rotation={[0, 0, 0]}
        >
          <boxGeometry args={[0.05, 0.18, 0.2]} />
          <meshToonMaterial color={bracket} gradientMap={toon} />
        </mesh>
      ))}
    </group>
  )
}

/** Il posto vuoto in fondo alla fila: un quaderno tratteggiato da riempire. */
function AddSlot({
  index,
  total,
  perShelf,
  onAdd,
}: {
  index: number
  total: number
  perShelf: number
  onAdd: () => void
}) {
  const slot = slotFor(index, total, perShelf)
  const [hover, setHover] = useState(false)
  const ink = cssVar('--c-graphite')
  return (
    <group
      position={[slot.x, slot.y + 0.5, 0]}
      onClick={(e) => {
        e.stopPropagation()
        onAdd()
      }}
      onPointerOver={() => {
        setHover(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHover(false)
        document.body.style.cursor = ''
      }}
    >
      <mesh>
        <boxGeometry args={[0.17, 1, BOOK_D]} />
        <meshToonMaterial color={cssVar('--c-paper')} transparent opacity={hover ? 0.4 : 0.2} />
      </mesh>
      <lineSegments raycast={() => null}>
        <edgesGeometry args={[new BoxGeometry(0.17, 1, BOOK_D)]} />
        <lineBasicMaterial color={ink} transparent opacity={hover ? 0.6 : 0.38} />
      </lineSegments>
      <mesh position={[0, 0, BOOK_D / 2 + 0.004]}>
        <planeGeometry args={[0.075, 0.008]} />
        <meshBasicMaterial color={ink} />
      </mesh>
      <mesh position={[0, 0, BOOK_D / 2 + 0.004]} rotation={[0, 0, Math.PI / 2]}>
        <planeGeometry args={[0.075, 0.008]} />
        <meshBasicMaterial color={ink} />
      </mesh>
    </group>
  )
}

/** La camera arretra quando nasce un secondo ripiano: la stanza è la stessa,
 *  ci si fa solo un passo indietro. E segue il mouse di un soffio: la stanza
 *  ha una profondità, non è un poster. */
function CameraRig({ shelves, width }: { shelves: number; width: number }) {
  const { camera, size, pointer } = useThree()
  const base = useRef({ x: 0, y: 0, z: 3, cy: 0 })

  useEffect(() => {
    const cam = camera as PerspectiveCamera
    const contentH = shelves * SHELF_GAP_Y + 0.5
    const vFov = (cam.fov * Math.PI) / 180
    const centerY = -((shelves - 1) * SHELF_GAP_Y) / 2 + 0.34
    // prima stima dall'altezza, poi si proiettano gli otto vertici della
    // mensola e si arretra finché stanno tutti nel quadro: il lato vicino
    // alla camera, di tre quarti, è più grande di quanto dica la trigonometria
    let z = (contentH / 2 / Math.tan(vFov / 2)) * 1.08
    const corners: Vector3[] = []
    for (const sx of [-1, 1])
      for (const sy of [0, 1])
        for (const sz of [-1, 1])
          corners.push(
            new Vector3(
              (sx * width) / 2,
              sy ? 1.2 : -(shelves - 1) * SHELF_GAP_Y - 0.3,
              (sz * PLANK_D) / 2,
            ),
          )
    for (let i = 0; i < 3; i++) {
      cam.position.set(Math.sin(AZIMUTH) * z, centerY + z * 0.16, Math.cos(AZIMUTH) * z)
      cam.lookAt(0, centerY, 0)
      cam.updateMatrixWorld()
      cam.updateProjectionMatrix()
      let m = 0
      for (const c of corners) {
        const q = c.clone().project(cam)
        m = Math.max(m, Math.abs(q.x), Math.abs(q.y))
      }
      z *= Math.max(1, m / 0.9)
    }
    base.current = { x: 0, y: centerY + z * 0.16, z, cy: centerY }
    camera.position.set(Math.sin(AZIMUTH) * z, base.current.y, Math.cos(AZIMUTH) * z)
    camera.lookAt(0, centerY, 0)
  }, [camera, shelves, width, size.width, size.height])

  useFrame(({ clock }, dt) => {
    const b = base.current
    const k = 1 - Math.exp(-dt * 3)
    // ondeggio lento: mezzo grado di azimut, un soffio in altezza
    const t = clock.elapsedTime
    const az = AZIMUTH + Math.sin(t * 0.25) * 0.01 + pointer.x * 0.05
    const ty = b.y + Math.sin(t * 0.4) * 0.012 + pointer.y * 0.02 * b.z * 0.3
    camera.position.x += (Math.sin(az) * b.z - camera.position.x) * k
    camera.position.z += (Math.cos(az) * b.z - camera.position.z) * k
    camera.position.y += (ty - camera.position.y) * k
    camera.lookAt(0, b.cy, 0)
  })
  return null
}

export default function ShelfScene({
  notebooks,
  focusIndex,
  justCreatedId,
  leavingId,
  onOpen,
  onHover,
  onAdd,
  perShelf,
}: Props) {
  const total = notebooks.length
  const shelves = shelfCount(total, perShelf)
  const width = useMemo(() => plankWidth(total + 1, perShelf), [total, perShelf])

  // Le texture leggono le variabili CSS: al cambio tema vanno ridipinte.
  const [themeTick, setThemeTick] = useState(0)
  const dark = document.documentElement.dataset.theme === 'dark'
  useEffect(() => {
    const observer = new MutationObserver(() => setThemeTick((t) => t + 1))
    observer.observe(document.documentElement, { attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, toneMapping: NoToneMapping }}
      camera={{ fov: 34, position: [0, 0.55, 3.1] }}
      onPointerMissed={() => onHover(null)}
    >
      <CameraRig shelves={shelves} width={width} />

      {/* Luce da finestra: calda, di taglio. Somma delle intensità intorno a 1:
          con NoToneMapping, scelto per tenere i pastelli fedeli al CSS, tutto
          sopra sbianca. */}
      <hemisphereLight
        intensity={0.5}
        color={cssVar('--c-paper-warm')}
        groundColor={cssVar('--c-wood-deep')}
      />
      <ambientLight intensity={0.22} />
      <directionalLight
        position={[-2.2, 2.8, 4.2]}
        intensity={dark ? 0.35 : 0.85}
        color="#FFE7C4"
      />
      <directionalLight position={[2.8, 0.6, 2.4]} intensity={0.16} color="#CFE0F5" />
      {dark && (
        <pointLight position={[1.4, 0.9, 1.6]} intensity={2.4} distance={6} color="#FFC98A" />
      )}

      <Wall shelves={shelves} width={width} themeTick={themeTick} />

      {Array.from({ length: shelves }, (_, i) => (
        <group key={i}>
          <Plank y={-i * SHELF_GAP_Y} width={width} themeTick={themeTick} />
          {/* ombra di contatto: morbida, come quella che un oggetto fa
              davvero sul piano su cui poggia */}
          <ContactShadows
            position={[0, -i * SHELF_GAP_Y + 0.002, 0.02]}
            width={width}
            height={PLANK_D}
            far={1.3}
            blur={2.2}
            opacity={dark ? 0.55 : 0.42}
            color={dark ? '#000' : '#3a2718'}
            resolution={512}
          />
        </group>
      ))}

      {notebooks.map((n, i) =>
        n.id === leavingId ? null : (
          <NotebookMesh
            key={n.id}
            notebook={n}
            index={i}
            total={total + 1}
            perShelf={perShelf}
            focused={focusIndex === i}
            dropIn={n.id === justCreatedId}
            themeTick={themeTick}
            onOpen={(rect) => onOpen(n.id, rect)}
            onHover={onHover}
          />
        ),
      )}

      <AddSlot index={total} total={total + 1} perShelf={perShelf} onAdd={onAdd} />

      <Plant position={[width / 2 - 0.3, 0, 0.02]} themeTick={themeTick} />
      <Cup position={[-width / 2 + 0.27, 0, 0.1]} />
      {shelves > 1 && <PencilCup position={[width / 2 - 0.28, -SHELF_GAP_Y, 0.08]} />}
      {total > perShelf && (
        <Plant position={[-width / 2 + 0.3, -SHELF_GAP_Y, 0.02]} themeTick={themeTick} small />
      )}

      {/* pulviscolo nella luce: pochissimo, lento */}
      <Sparkles
        count={28}
        scale={[width + 1, shelves * SHELF_GAP_Y + 1.2, 1.4]}
        position={[0, -((shelves - 1) * SHELF_GAP_Y) / 2 + 0.4, 0.4]}
        size={1.6}
        speed={0.12}
        opacity={dark ? 0.35 : 0.22}
        color={cssVar('--c-paper-warm')}
        noise={0.4}
      />
    </Canvas>
  )
}
