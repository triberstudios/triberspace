'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { CapsuleCollider, RigidBody } from '@react-three/rapier';

interface CharacterProps {
    animation?: string;
    position?: [number, number, number];
    color?: string;
    rigidBodyRef?: React.RefObject<any>;
}

const Character = React.forwardRef<THREE.Group, CharacterProps>(({
    animation = 'idle',
    position = [0, 2, 0],
    color = '#4080ff',
    rigidBodyRef
}, characterRef) => {
    // For MVP, we'll use a simple geometry instead of loading an external GLB
    // In production, you could load the TriberCharacterThinner.glb
    const [mixer, setMixer] = useState<THREE.AnimationMixer | null>(null);
    const internalRigidBodyRef = useRef<any>(null);
    const actualRigidBodyRef = rigidBodyRef || internalRigidBodyRef;
    const meshRef = useRef<THREE.Mesh>(null);

    // Create a simple character geometry (can be replaced with GLB later)
    useEffect(() => {
        if (meshRef.current) {
            // Set character color
            if (meshRef.current.material && 'color' in meshRef.current.material) {
                (meshRef.current.material as THREE.MeshStandardMaterial).color.set(color);
            }
        }
    }, [color]);

    // Animation system (simplified for MVP)
    useEffect(() => {
        // In a full implementation, you would load animations from the GLB file
        // For now, we'll just handle the animation state
        console.log(`Character animation: ${animation}`);
    }, [animation]);

    // Debug logging
    useEffect(() => {
        console.log('Character component mounted at position:', position);
        console.log('Character color:', color);
    }, []);

    useEffect(() => {
        if (actualRigidBodyRef.current) {
            console.log('Character rigid body initialized');
        }
    }, [actualRigidBodyRef.current]);

    return (
        <RigidBody
            ref={actualRigidBodyRef}
            colliders={false}
            type="dynamic"
            lockRotations={true}
            position={position}
            friction={1}
            linearDamping={0.5}
            angularDamping={0.5}
            gravityScale={15}
        >
            <CapsuleCollider position={[0, 1.2, 0]} args={[0.5, 0.75]} />
            <group
                ref={characterRef}
                scale={[1, 1, 1]}
                rotation={[0, 0, 0]}
                position={[0, 0, 0]}
            >
                {/* Simple character representation - replace with GLB model */}
                <mesh ref={meshRef} position={[0, 1, 0]} castShadow>
                    <capsuleGeometry args={[0.5, 1.5]} />
                    <meshStandardMaterial color={color} />
                </mesh>

                {/* Head */}
                <mesh position={[0, 2.2, 0]} castShadow>
                    <sphereGeometry args={[0.4]} />
                    <meshStandardMaterial color={color} />
                </mesh>

                {/* Arms */}
                <mesh position={[-0.7, 1.5, 0]} rotation={[0, 0, Math.PI / 6]} castShadow>
                    <capsuleGeometry args={[0.15, 0.8]} />
                    <meshStandardMaterial color={color} />
                </mesh>
                <mesh position={[0.7, 1.5, 0]} rotation={[0, 0, -Math.PI / 6]} castShadow>
                    <capsuleGeometry args={[0.15, 0.8]} />
                    <meshStandardMaterial color={color} />
                </mesh>

                {/* Legs */}
                <mesh position={[-0.25, 0.2, 0]} castShadow>
                    <capsuleGeometry args={[0.2, 0.8]} />
                    <meshStandardMaterial color={color} />
                </mesh>
                <mesh position={[0.25, 0.2, 0]} castShadow>
                    <capsuleGeometry args={[0.2, 0.8]} />
                    <meshStandardMaterial color={color} />
                </mesh>
            </group>
        </RigidBody>
    );
});

Character.displayName = 'Character';

export default Character;