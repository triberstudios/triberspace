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
    modelUrl?: string;
}

const Character = React.forwardRef<THREE.Group, CharacterProps>(({
    animation = 'idle',
    position = [0, 2, 0],
    color = '#4080ff',
    rigidBodyRef,
    modelUrl = '/assets/TriberCharacterThinner.glb'
}, characterRef) => {
    const { scene, animations } = useGLTF(modelUrl);
    const [mixer, setMixer] = useState<THREE.AnimationMixer | null>(null);
    const internalRigidBodyRef = useRef<any>(null);
    const actualRigidBodyRef = rigidBodyRef || internalRigidBodyRef;
    const [physicsReady, setPhysicsReady] = useState(false);

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
            const clip = animations.find((clip) => clip.name === animation);
            if (clip) {
                const action = mixer.clipAction(clip);
                action.play();
            }
        }
    }, [mixer, animation, animations]);

    // Update animation mixer
    useFrame((_, deltaTime) => {
        if (mixer) {
            mixer.update(deltaTime);
        }
    });

    // Set character color
    useEffect(() => {
        if (scene) {
            scene.traverse((child) => {
                if (child.isMesh && child.material) {
                    (child.material as THREE.MeshStandardMaterial).color.set(color);
                    if ((child.material as THREE.MeshStandardMaterial).emissive) {
                        (child.material as THREE.MeshStandardMaterial).emissive.set(color);
                        (child.material as THREE.MeshStandardMaterial).emissiveIntensity = 200;
                    }
                }
            });
        }
    }, [scene, color]);

    // Physics ready timer
    useEffect(() => {
        const timer = setTimeout(() => {
            setPhysicsReady(true);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    // Character initialization complete

    return (
        <>
            {physicsReady && (
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
                    dominanceGroup={1000}
                >
                    <CapsuleCollider position={[0, 1.2, 0]} args={[0.85, 0.4]} />
                    <group
                        ref={characterRef}
                        scale={[0.35, 0.35, 0.35]}
                        rotation={[0, Math.PI, 0]}
                        position={[0, 0, 0]}
                        dispose={null}
                        renderOrder={1002}
                    >
                        <primitive object={scene} dispose={null} />
                    </group>
                </RigidBody>
            )}
        </>
    );
});

Character.displayName = 'Character';

export default Character;