'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function Particles({ count = 2000 }) {
  const mesh = useRef<THREE.Points>(null)

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10
    }
    return pos
  }, [count])

  useFrame(({ clock }) => {
    if (!mesh.current) return
    const time = clock.getElapsedTime() * 0.1
    mesh.current.rotation.y = time * 0.05
    mesh.current.rotation.x = Math.sin(time * 0.3) * 0.02
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
        color="#6366f1"
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

function FloatingOrb({ position, color, scale = 1 }: { position: [number, number, number], color: string, scale?: number }) {
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
      <meshBasicMaterial color={color} transparent opacity={0.08} />
    </mesh>
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
        <Particles count={2000} />
        <FloatingOrb position={[-2, 1, -2]} color="#3b82f6" scale={1.5} />
        <FloatingOrb position={[2, -1, -3]} color="#8b5cf6" scale={1.2} />
        <FloatingOrb position={[0, 2, -4]} color="#06b6d4" scale={1} />
      </Canvas>
    </div>
  )
}
