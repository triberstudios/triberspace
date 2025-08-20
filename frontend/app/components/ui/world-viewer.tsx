"use client"

import { useRef, useEffect } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Stars } from "@react-three/drei"
import { EffectComposer, Bloom } from "@react-three/postprocessing"
import * as THREE from "three"

// Simple Globe component
function Globe() {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2
    }
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 32, 32]} />
      <meshStandardMaterial 
        color="#4A9EFF" 
        emissive="#1a3a6b"
        emissiveIntensity={0.1}
        roughness={0.3}
        metalness={0.7}
      />
    </mesh>
  )
}

// Wireframe Sphere component
interface WireframeSphereProps {
  color?: string
}

function WireframeSphere({ color = "white" }: WireframeSphereProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.1
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.05
    }
  })

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[2, 16, 16]} />
      <meshBasicMaterial 
        color={color} 
        wireframe 
        transparent 
        opacity={0.8}
      />
    </mesh>
  )
}

// Camera controller component
interface CameraControllerProps {
  currentIndex: number
  worlds: Array<{ position: [number, number, number] }>
}

function CameraController({ currentIndex, worlds }: CameraControllerProps) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    const targetPosition = new THREE.Vector3(
      worlds[currentIndex].position[0],
      worlds[currentIndex].position[1],
      7
    )

    const initialPosition = camera.position.clone()
    const lerpSpeed = 0.02
    let lerpAlpha = 0

    function animateCamera() {
      lerpAlpha += lerpSpeed
      if (lerpAlpha > 1) lerpAlpha = 1
      camera.position.lerpVectors(initialPosition, targetPosition, lerpAlpha)

      if (controlsRef.current) {
        controlsRef.current.target.lerp(
          new THREE.Vector3(
            worlds[currentIndex].position[0], 
            worlds[currentIndex].position[1], 
            0
          ),
          lerpAlpha
        )
        controlsRef.current.update()
      }

      if (lerpAlpha < 1) {
        requestAnimationFrame(animateCamera)
      }
    }

    animateCamera()
  }, [currentIndex, camera, worlds])

  return (
    <OrbitControls 
      ref={controlsRef} 
      enablePan={false} 
      enableZoom={false}
      enableRotate={false}
    />
  )
}

// Main world viewer component
interface World {
  name: string
  brand: string
  position: [number, number, number]
  type: string
  color?: string
}

interface WorldViewerProps {
  worlds: World[]
  currentIndex: number
}

export function WorldViewer({ worlds, currentIndex }: WorldViewerProps) {
  return (
    <div className="h-full w-full">
      <Canvas camera={{ position: [0, 0, 7], fov: 60 }}>
        <CameraController currentIndex={currentIndex} worlds={worlds} />
        
        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        {/* Background stars */}
        <Stars 
          radius={100} 
          depth={50} 
          count={5000} 
          factor={8} 
          saturation={0} 
          fade 
        />
        
        {/* World objects */}
        <group>
          {worlds.map((world, index) => (
            <group key={index} position={world.position}>
              {world.type === "globe" ? (
                <Globe />
              ) : (
                <WireframeSphere color={world.color} />
              )}
            </group>
          ))}
        </group>
        
        {/* Post-processing effects */}
        <EffectComposer>
          <Bloom 
            intensity={0.7} 
            kernelSize={2} 
            luminanceThreshold={0.85} 
            luminanceSmoothing={0.05} 
            mipmapBlur 
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}