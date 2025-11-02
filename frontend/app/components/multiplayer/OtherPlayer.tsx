"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RigidBody, CapsuleCollider } from "@react-three/rapier";
import { Html } from "@react-three/drei";
import * as THREE from "three";

interface OtherPlayerProps {
  player: {
    id: string;
    username: string;
    position: { x: number; y: number; z: number };
    rotation: number;
    animation: string;
    color: string;
    lastMessage?: string;
  };
}

export function OtherPlayer({ player }: OtherPlayerProps) {
  const rigidBodyRef = useRef<any>();
  const meshRef = useRef<THREE.Mesh>(null);

  // Smoothly interpolate to target position
  useFrame(() => {
    if (!rigidBodyRef.current || !meshRef.current) return;

    const currentPos = rigidBodyRef.current.translation();
    const targetPos = new THREE.Vector3(
      player.position.x,
      player.position.y,
      player.position.z
    );

    // Calculate direction and distance
    const direction = targetPos.clone().sub(
      new THREE.Vector3(currentPos.x, currentPos.y, currentPos.z)
    );
    const distance = direction.length();

    // Smooth movement with velocity-based interpolation
    if (distance > 0.01) {
      direction.normalize();
      const speed = Math.min(distance * 10, 5); // Cap speed at 5 units/sec
      rigidBodyRef.current.setLinvel(
        { x: direction.x * speed, y: direction.y * speed, z: direction.z * speed },
        true
      );
    } else {
      // Stop if very close
      rigidBodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
    }

    // Set rotation
    meshRef.current.rotation.y = player.rotation;
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

      {/* Simple capsule character */}
      <mesh ref={meshRef} castShadow position={[0, 1.2, 0]}>
        <capsuleGeometry args={[0.5, 1.5, 4, 8]} />
        <meshStandardMaterial
          color={player.color}
          emissive={player.color}
          emissiveIntensity={0.2}
        />
      </mesh>

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
