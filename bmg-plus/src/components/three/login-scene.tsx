'use client'

import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/** Seeded pseudo-random generator (mulberry32) for deterministic particle positions. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeParticlePositions(count: number): Float32Array {
  const rng = mulberry32(42)
  const pos = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (rng() - 0.5) * 10
    pos[i * 3 + 1] = (rng() - 0.5) * 10
    pos[i * 3 + 2] = (rng() - 0.5) * 10
  }
  return pos
}

function Particles({ count = 2000, sharedPositions }: { count?: number; sharedPositions?: Float32Array }) {
  const mesh = useRef<THREE.Points>(null)

  // Lazy-init: computed once and never changes (stable across re-renders)
  const [positions] = useState(() => sharedPositions ?? makeParticlePositions(count))

  useFrame(({ clock, pointer }) => {
    if (!mesh.current) return
    mesh.current.rotation.y = clock.getElapsedTime() * 0.005 + pointer.x * 0.1
    mesh.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.3) * 0.02 + pointer.y * 0.05
  })

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        color="#66cfd0"
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

function ConnectionLines({ positions, count }: { positions: Float32Array; count: number }) {
  const lineRef = useRef<THREE.LineSegments>(null)
  const MAX_DISTANCE = 1.5
  const MAX_CONNECTIONS = 200
  // Only check first 200 particles for performance
  const CHECK_COUNT = Math.min(count, 200)

  useFrame(() => {
    if (!lineRef.current) return
    const linePositions: number[] = []
    let connections = 0

    for (let i = 0; i < CHECK_COUNT && connections < MAX_CONNECTIONS; i++) {
      for (let j = i + 1; j < CHECK_COUNT && connections < MAX_CONNECTIONS; j++) {
        const dx = positions[i * 3] - positions[j * 3]
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1]
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (dist < MAX_DISTANCE) {
          linePositions.push(
            positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
            positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]
          )
          connections++
        }
      }
    }

    const geo = lineRef.current.geometry
    geo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
    geo.attributes.position.needsUpdate = true
  })

  return (
    <lineSegments ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial color="#66cfd0" transparent opacity={0.08} />
    </lineSegments>
  )
}

function FloatingOrb({ position, color, scale = 1, opacity = 0.08 }: { position: [number, number, number], color: string, scale?: number, opacity?: number }) {
  const mesh = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!mesh.current) return
    const t = clock.getElapsedTime()
    mesh.current.position.y = position[1] + Math.sin(t * 0.5) * 0.3
    mesh.current.position.x = position[0] + Math.cos(t * 0.3) * 0.2
  })

  return (
    <mesh ref={mesh} position={position} scale={scale}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </mesh>
  )
}

function ParticleNetwork({ count = 2000 }) {
  const [positions] = useState(() => makeParticlePositions(count))

  return (
    <>
      <Particles count={count} sharedPositions={positions} />
      <ConnectionLines positions={positions} count={count} />
    </>
  )
}

export default function LoginScene() {
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        style={{ background: 'transparent' }}
        gl={{ antialias: true, alpha: true }}
      >
        <ParticleNetwork count={2000} />
        <FloatingOrb position={[-2, 1, -2]} color="#fa5058" scale={1.5} />
        <FloatingOrb position={[2, -1, -3]} color="#66cfd0" scale={1.2} />
        <FloatingOrb position={[0, 2, -4]} color="#222831" scale={1} opacity={0.15} />
      </Canvas>
    </div>
  )
}
