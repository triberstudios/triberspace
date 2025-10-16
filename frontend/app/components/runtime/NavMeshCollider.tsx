'use client';

import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import * as THREE from 'three';

interface NavMeshColliderProps {
    modelPath: string;
}

export function NavMeshCollider({ modelPath }: NavMeshColliderProps) {
    const { scene } = useGLTF(modelPath);
    const groupRef = useRef<THREE.Group>(null);

    useEffect(() => {
        console.log('🗺️ NavMesh loaded:', {
            modelPath,
            childrenCount: scene.children.length
        });

        // Mark the group as camCollidable for camera collision detection
        if (groupRef.current) {
            (groupRef.current as any).camCollidable = true;
            console.log('🗺️ NavMesh marked as camCollidable');
        }
    }, [scene]);

    return (
        <group ref={groupRef}>
            {scene.children.map((child, index) => {
                // Only process meshes
                if (!(child as THREE.Mesh).isMesh) return null;

                const mesh = child as THREE.Mesh;
                const geometry = mesh.geometry;

                // Make sure geometry has position attribute
                if (!geometry.attributes.position) {
                    console.warn('🗺️ NavMesh child has no position attribute:', mesh.name);
                    return null;
                }

                console.log('🗺️ Creating trimesh collider for:', mesh.name || `mesh-${index}`, {
                    vertices: geometry.attributes.position.count,
                    hasIndices: !!geometry.index
                });

                // Get vertices
                const vertices = new Float32Array(geometry.attributes.position.array);

                // Get indices (if available, otherwise create sequential indices)
                let indices: number[];
                if (geometry.index) {
                    indices = Array.from(geometry.index.array);
                } else {
                    // Create indices for non-indexed geometry
                    indices = Array.from({ length: vertices.length / 3 }, (_, i) => i);
                }

                return (
                    <RigidBody
                        key={`navmesh-${index}`}
                        type="fixed"
                        colliders="trimesh"
                        position={[mesh.position.x, mesh.position.y, mesh.position.z]}
                        rotation={[mesh.rotation.x, mesh.rotation.y, mesh.rotation.z]}
                        scale={[mesh.scale.x, mesh.scale.y, mesh.scale.z]}
                    >
                        <mesh geometry={geometry} visible={false}>
                            <meshBasicMaterial transparent opacity={0} />
                        </mesh>
                    </RigidBody>
                );
            })}
        </group>
    );
}

// Preload the model
export function preloadNavMesh(modelPath: string) {
    useGLTF.preload(modelPath);
}
