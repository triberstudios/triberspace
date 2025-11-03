"use client";

import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CapsuleCollider } from "@react-three/rapier";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface OtherPlayerProps {
  player: {
    id: string;
    username: string;
    position: { x: number; y: number; z: number };
    rotation: number;
    animation: string;
    color: string;
    lastMessage?: string;
    avatar?: {
      baseModelUrl: string;
      primaryColor?: string;
    };
  };
}

export function OtherPlayer({ player }: OtherPlayerProps) {
  const rigidBodyRef = useRef<any>();
  const characterRef = useRef<THREE.Group>(null);

  // Model loading state
  const [scene, setScene] = useState<THREE.Group | null>(null);
  const [animations, setAnimations] = useState<THREE.AnimationClip[]>([]);
  const [mixer, setMixer] = useState<THREE.AnimationMixer | null>(null);

  // Use separate model to avoid conflicts
  const modelUrl = "/assets/TriberOtherCharacter.glb";

  // Load GLB model using GLTFLoader
  useEffect(() => {
    const loader = new GLTFLoader();
    const color = player.avatar?.primaryColor || player.color;

    loader.load(
      modelUrl,
      (gltf) => {
        const loadedScene = gltf.scene;

        // CRITICAL: Clone materials to ensure uniqueness per player
        // This prevents geometry/material ownership conflicts
        loadedScene.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const material = child.material.clone(); // Clone material for this player
            material.color.set(color);
            if (material.emissive) {
              material.emissive.set(color);
              material.emissiveIntensity = 200;
            }
            child.material = material;
          }
        });

        setScene(loadedScene);
        setAnimations(gltf.animations || []);
      },
      undefined,
      (error) => {
        console.error('Error loading other player model:', error);
      }
    );

    return () => {
      if (scene) {
        scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose());
            } else {
              child.material?.dispose();
            }
          }
        });
      }
    };
  }, [modelUrl, player.color, player.avatar?.primaryColor]);

  // Initialize animation mixer
  useEffect(() => {
    if (scene) {
      const mixerInstance = new THREE.AnimationMixer(scene);
      setMixer(mixerInstance);
    }
  }, [scene]);

  // Handle animation changes
  useEffect(() => {
    if (mixer && animations.length > 0) {
      mixer.stopAllAction();
      const clip = animations.find((clip) => clip.name === player.animation);
      if (clip) {
        const action = mixer.clipAction(clip);
        action.play();
      }
    }
  }, [mixer, player.animation, animations]);

  // Color is now applied during model load (no separate useEffect needed)

  // Smoothly interpolate to target position and update animation (V2World approach)
  useFrame((_, delta) => {
    if (!rigidBodyRef.current || !characterRef.current) return;

    // Update animation mixer
    if (mixer) {
      mixer.update(delta);
    }

    // Apply rotation to character group using quaternion (V2World approach)
    // Convert single rotation angle to quaternion for proper 3D rotation
    const quaternion = new THREE.Quaternion();
    quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), player.rotation);
    characterRef.current.quaternion.copy(quaternion);
    characterRef.current.position.set(0, 0, 0);

    // Smooth position interpolation using velocity
    const currentPos = rigidBodyRef.current.translation();
    const currentPosition = new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z);
    const targetPosition = new THREE.Vector3(player.position.x, player.position.y, player.position.z);

    const direction = targetPosition.clone().sub(currentPosition).normalize();
    const distance = currentPosition.distanceTo(targetPosition);

    // Delta-time based velocity for smooth, frame-rate independent movement
    const speed = 7;
    const desiredVelocity = direction.multiplyScalar(Math.min(distance, speed * delta));

    rigidBodyRef.current.setLinvel(
      { x: desiredVelocity.x, y: desiredVelocity.y, z: desiredVelocity.z },
      true
    );
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      gravityScale={15}
      colliders={false}
      position={[player.position.x, player.position.y, player.position.z]}
      type="kinematicPosition"
      lockRotations
    >
      <CapsuleCollider args={[0.5, 0.75]} position={[0, 1.2, 0]} />

      {/* Remote player character model */}
      {scene && (
        <group
          ref={characterRef}
          scale={[0.35, 0.35, 0.35]}
          rotation={[0, Math.PI, 0]}
          position={[0, 0, 0]}
          dispose={null}
        >
          <primitive object={scene} />
        </group>
      )}

      {/* Nametag */}
      <Html position={[0, 2.77, 0]} center>
        <div style={{
          backgroundColor: 'rgba(31, 31, 31, 0.8)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '8px',
          fontFamily: 'Work Sans, sans-serif',
          fontSize: '14px',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          userSelect: 'none'
        }}>
          {player.username}
        </div>
      </Html>

      {/* Chat bubble (if player has a message) */}
      {player.lastMessage && (
        <Html position={[0, 3.2, 0]} center>
          <div style={{
            position: 'relative',
            backgroundColor: '#222',
            padding: '6px 10px',
            borderRadius: '8px',
            fontFamily: 'Work Sans, sans-serif',
            fontSize: '14px',
            color: 'white',
            textAlign: 'center',
            maxWidth: '200px',
            wordWrap: 'break-word',
            pointerEvents: 'none',
            userSelect: 'none'
          }}>
            {player.lastMessage}
            {/* Chat bubble arrow */}
            <div style={{
              position: 'absolute',
              bottom: '-8px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '0',
              height: '0',
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid #222',
            }} />
          </div>
        </Html>
      )}
    </RigidBody>
  );
}
