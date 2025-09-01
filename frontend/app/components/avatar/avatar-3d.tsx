"use client"

import { useRef, useState, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { LoopOnce } from 'three'

interface OutfitCache {
  meshes: THREE.SkinnedMesh[]
  lastUsed: number
}

interface Avatar3DProps {
  color?: string
  baseModelPath: string
  outfitModelPath?: string | null
  onOutfitLoading?: (loading: boolean) => void
  enableColorCustomization?: boolean
  currentEmote?: string | null
  onEmoteComplete?: () => void
}

export function Avatar3D({ 
  color = '#ffffff', 
  baseModelPath,
  outfitModelPath = null,
  onOutfitLoading,
  enableColorCustomization = true,
  currentEmote = null,
  onEmoteComplete
}: Avatar3DProps) {
  const { gl } = useThree()
  const [mixer, setMixer] = useState<THREE.AnimationMixer | null>(null)
  const [baseSkinnedMesh, setBaseSkinnedMesh] = useState<THREE.SkinnedMesh | null>(null)
  const [currentOutfitId, setCurrentOutfitId] = useState<string>("off")
  const [idleAction, setIdleAction] = useState<THREE.AnimationAction | null>(null)
  const [currentAction, setCurrentAction] = useState<THREE.AnimationAction | null>(null)
  
  // Outfit caching system
  const outfitCacheRef = useRef<Map<string, OutfitCache>>(new Map())

  // Always load base avatar (instant on page load)
  const baseGLTF = useGLTF(baseModelPath)
  const { scene: baseScene, animations } = baseGLTF


  useEffect(() => {
    gl.setClearColor('#0E0E0E')
  }, [gl])

  // Setup base avatar
  useEffect(() => {
    if (baseScene) {
      // Clean up old mixer
      if (mixer) {
        mixer.stopAllAction()
        mixer.uncacheRoot(mixer.getRoot())
      }
      
      // Find and setup base avatar's SkinnedMesh
      let foundBaseSkinnedMesh: THREE.SkinnedMesh | null = null
      baseScene.traverse((child: any) => {
        if (child.isSkinnedMesh) {
          foundBaseSkinnedMesh = child
          child.userData.isBaseAvatar = true
        }
      })
      setBaseSkinnedMesh(foundBaseSkinnedMesh)
      
      // Create mixer and start animation
      const newMixer = new THREE.AnimationMixer(baseScene)
      setMixer(newMixer)
      
      if (animations.length > 0) {
        const idleAnimation = animations.find(anim => 
          anim.name.toLowerCase().includes('idle')
        ) || animations[0]
        
        const action = newMixer.clipAction(idleAnimation)
        action.reset()
        action.setEffectiveWeight(1)
        action.play()
        
        // Store idle action for later use
        setIdleAction(action)
        setCurrentAction(action)
      }
    }

    return () => {
      if (mixer) {
        mixer.stopAllAction()
        mixer.uncacheRoot(mixer.getRoot())
      }
    }
  }, [baseScene, animations, baseModelPath])

  // Simpler approach: Use conditional useGLTF hook
  const outfitGLTF = outfitModelPath ? useGLTF(outfitModelPath) : null

  // Handle outfit loading and visibility switching
  useEffect(() => {
    // Hide all cached outfits first
    outfitCacheRef.current.forEach((cache) => {
      cache.meshes.forEach(mesh => {
        mesh.visible = false
      })
    })

    // Handle "no outfit" case
    if (!outfitModelPath) {
      setCurrentOutfitId("off")
      return
    }

    // Handle outfit loading
    if (outfitGLTF && outfitGLTF.scene && baseScene && baseSkinnedMesh) {
      const outfitId = outfitModelPath.split('/').pop()?.replace('.glb', '') || 'unknown'
      
      // Check if already cached
      if (outfitCacheRef.current.has(outfitId)) {
        const cached = outfitCacheRef.current.get(outfitId)!
        cached.meshes.forEach(mesh => mesh.visible = true)
        cached.lastUsed = Date.now()
        setCurrentOutfitId(outfitId)
        return
      }

      // Load new outfit
      const outfitScene = outfitGLTF.scene.clone()
      const outfitMeshes: THREE.SkinnedMesh[] = []
      
      // First collect all meshes without modifying the scene
      const meshesToAdd: THREE.SkinnedMesh[] = []
      outfitScene.traverse((child: any) => {
        if (child.isSkinnedMesh) {
          meshesToAdd.push(child)
        }
      })
      
      // Now process the collected meshes (after traversal is complete)
      meshesToAdd.forEach(mesh => {
        // Mark as outfit and make visible
        mesh.userData.isOutfit = true
        mesh.visible = true
        
        // Share the base avatar's animated skeleton
        if (mesh.skeleton && baseSkinnedMesh.skeleton) {
          // Simple skeleton replacement - both should have same bone structure
          mesh.skeleton = baseSkinnedMesh.skeleton
        }
        
        // Add to scene and collect
        baseScene.add(mesh)
        outfitMeshes.push(mesh)
      })
      
      // Cache the outfit
      outfitCacheRef.current.set(outfitId, {
        meshes: outfitMeshes,
        lastUsed: Date.now()
      })
      
      setCurrentOutfitId(outfitId)
    }
  }, [outfitModelPath, outfitGLTF, baseScene, baseSkinnedMesh])

  // Handle color changes - only apply to base avatar meshes, exclude outfits
  useEffect(() => {
    if (baseScene) {
      baseScene.traverse((child: any) => {
        if (child.isMesh && child.userData.isBaseAvatar && !child.userData.isOutfit) {
          if (enableColorCustomization) {
            // Apply color customization
            child.material.color.set(color)
            child.material.emissive.set(color)
            child.material.emissiveIntensity = 115
          } else {
            // Reset to default appearance (no emissive glow)
            child.material.color.set('#ffffff')
            child.material.emissive.set('#000000')
            child.material.emissiveIntensity = 0
          }
        }
      })
    }
  }, [color, baseScene, enableColorCustomization])

  // Handle emote animation changes
  useEffect(() => {
    if (!mixer || !animations || !baseScene) return
    
    if (currentEmote) {
      // Find the emote animation (check for exact match or contains)
      const emoteAnimation = animations.find(anim => 
        anim.name.toLowerCase() === currentEmote.toLowerCase() ||
        anim.name.toLowerCase().includes(currentEmote.toLowerCase())
      )
      
      if (emoteAnimation) {
        // Stop current animation
        if (currentAction) {
          currentAction.stop()
        }
        
        // Play emote animation
        const emoteAction = mixer.clipAction(emoteAnimation)
        emoteAction.reset()
        emoteAction.setLoop(LoopOnce, 1)
        emoteAction.clampWhenFinished = false // Don't clamp, let it finish naturally
        emoteAction.play()
        
        setCurrentAction(emoteAction)
        
        // Set up completion handler for this specific action
        const handleFinished = (e: any) => {
          // Make sure this is the right action finishing
          if (e.action === emoteAction) {
            emoteAction.stop()
            if (idleAction) {
              idleAction.reset()
              idleAction.play()
              setCurrentAction(idleAction)
            }
            if (onEmoteComplete) {
              onEmoteComplete()
            }
          }
        }
        
        mixer.addEventListener('finished', handleFinished)
        
        // Cleanup
        return () => {
          mixer.removeEventListener('finished', handleFinished)
        }
      }
    }
  }, [currentEmote, mixer, animations, baseScene, idleAction, onEmoteComplete])

  useFrame((state, delta) => {
    if (mixer) {
      mixer.update(delta)
    }
  })

  return <primitive object={baseScene} />
}