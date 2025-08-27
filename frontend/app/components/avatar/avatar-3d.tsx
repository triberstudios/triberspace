"use client"

import { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface Avatar3DProps {
  color?: string
  modelPath?: string
  selectedOutfits?: string[]
}

export function Avatar3D({ 
  color = '#ffffff', 
  modelPath = '/TriberCharacter.glb',
  selectedOutfits = []
}: Avatar3DProps) {
  const { gl } = useThree()

  // Handle blank avatar case - return null if no model path
  if (!modelPath) {
    return null
  }

  const { scene, animations } = useGLTF(modelPath)
  const [mixer] = useState(() => new THREE.AnimationMixer(scene))

  useEffect(() => {
    gl.setClearColor('#0E0E0E')
  }, [gl])

  useEffect(() => {
    if (mixer && animations.length > 0) {
      // Look for idle animation specifically, fallback to first animation
      const idleAnimation = animations.find(anim => 
        anim.name.toLowerCase().includes('idle')
      ) || animations[0]
      
      const action = mixer.clipAction(idleAnimation)
      action.play()
      console.log('Playing animation:', idleAnimation.name)
    }
  }, [animations, mixer])

  // Handle color changes - completely exclude outfit meshes
  useEffect(() => {
    if (scene) {
      console.log('=== Debugging mesh names and hierarchy ===')
      scene.traverse((child: any) => {
        if (child.isMesh) {
          console.log('Mesh name:', child.name, 'Parent:', child.parent?.name, 'Material:', child.material?.name)
          
          if (!child.name.startsWith('outfitTest')) {
            // Only modify non-outfit meshes (base character)
            child.material.color.set(color)
            child.material.emissive.set(color)
            child.material.emissiveIntensity = 115
            console.log('Applied color to:', child.name)
          } else {
            console.log('Skipped outfit mesh:', child.name)
          }
        }
      })
    }
  }, [color, scene])

  // Handle outfit visibility
  useEffect(() => {
    if (scene) {
      scene.traverse((child: any) => {
        if (child.name === 'outfitTest') {
          child.visible = selectedOutfits.includes('on')
        }
      })
    }
  }, [selectedOutfits, scene])

  useFrame((state, delta) => {
    mixer.update(delta)
  })

  return <primitive object={scene} />
}