'use client';

import { useEffect, useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BehaviorExecutor } from './BehaviorExecutor';

interface SceneData {
    scene: any;
    camera: any;
    compiledBehaviors: {
        behaviors: Array<{
            objectUuid: string;
            objectName: string;
            behaviors: Array<{
                type: 'spin' | 'pulse';
                nodeId: string;
                objectUuid: string;
                [key: string]: any;
            }>;
            updateFunction: {
                code: string;
                execute: Function;
            };
        }>;
        errors: Array<any>;
        metadata: any;
    };
    environment?: string;
    project?: any;
}

interface SceneLoaderProps {
    sceneId: string;
    onLoadingChange?: (loading: boolean) => void;
    onError?: (error: string) => void;
}

export function SceneLoader({ sceneId, onLoadingChange, onError }: SceneLoaderProps) {
    const [sceneData, setSceneData] = useState<SceneData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const groupRef = useRef<THREE.Group>(null);
    const objectMapRef = useRef<Map<string, THREE.Object3D>>(new Map());
    const behaviorExecutorRef = useRef<BehaviorExecutor | null>(null);

    // Load scene data
    useEffect(() => {
        loadSceneData();
    }, [sceneId]);

    // Initialize behaviors when scene data loads
    useEffect(() => {
        if (sceneData?.compiledBehaviors && groupRef.current) {
            initializeBehaviors();
        }
    }, [sceneData]);

    async function loadSceneData() {
        try {
            setLoading(true);
            setError(null);
            onLoadingChange?.(true);
            onError?.(null);

            // For MVP, we'll simulate loading from a temporary storage
            // In the future, this will fetch from the actual API endpoint
            const response = await fetch(`http://localhost:3001/api/v1/runtime/scenes/${sceneId}`);

            if (!response.ok) {
                throw new Error(`Failed to load scene: ${response.statusText}`);
            }

            const data = await response.json();
            setSceneData(data);
        } catch (err) {
            console.error('Failed to load scene:', err);
            const errorMessage = err instanceof Error ? err.message : 'Failed to load scene';
            setError(errorMessage);
            onError?.(errorMessage);
        } finally {
            setLoading(false);
            onLoadingChange?.(false);
        }
    }

    function initializeBehaviors() {
        if (!sceneData?.compiledBehaviors || !groupRef.current) return;

        // Build object map for UUID lookup
        const objectMap = new Map<string, THREE.Object3D>();
        groupRef.current.traverse((object) => {
            if (object.uuid) {
                objectMap.set(object.uuid, object);
            }
        });
        objectMapRef.current = objectMap;

        // Initialize behavior executor
        behaviorExecutorRef.current = new BehaviorExecutor(
            sceneData.compiledBehaviors,
            objectMap
        );

        console.log('Initialized behaviors for', sceneData.compiledBehaviors.behaviors.length, 'objects');
    }

    // Animation loop
    useFrame((state, delta) => {
        if (behaviorExecutorRef.current) {
            behaviorExecutorRef.current.update(delta);
        }
    });

    if (loading) {
        return (
            <mesh position={[0, 1, 0]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#4444ff" />
            </mesh>
        );
    }

    if (error) {
        return (
            <group>
                <mesh position={[0, 1, 0]}>
                    <boxGeometry args={[1, 1, 1]} />
                    <meshStandardMaterial color="#ff4444" />
                </mesh>
                <mesh position={[0, 2.5, 0]}>
                    <boxGeometry args={[2, 0.1, 0.1]} />
                    <meshStandardMaterial color="#ffffff" />
                </mesh>
            </group>
        );
    }

    if (!sceneData?.scene) {
        return null;
    }

    return (
        <group ref={groupRef}>
            <SceneContent sceneData={sceneData} />
        </group>
    );
}

// Component to render the actual Three.js scene content
function SceneContent({ sceneData }: { sceneData: SceneData }) {
    const groupRef = useRef<THREE.Group>(null);

    useEffect(() => {
        if (!groupRef.current || !sceneData.scene) return;

        // Load the Three.js scene
        const loader = new THREE.ObjectLoader();

        try {
            const loadedScene = loader.parse(sceneData.scene);

            // Clear existing content
            while (groupRef.current.children.length > 0) {
                groupRef.current.remove(groupRef.current.children[0]);
            }

            // Add scene objects to our group
            while (loadedScene.children.length > 0) {
                const child = loadedScene.children[0];
                loadedScene.remove(child);
                groupRef.current.add(child);
            }

            console.log('Loaded scene with', groupRef.current.children.length, 'objects');

        } catch (error) {
            console.error('Failed to parse scene:', error);
        }
    }, [sceneData]);

    return <group ref={groupRef} />;
}

// Development helper component
export function SceneDebugInfo({ sceneData }: { sceneData: SceneData | null }) {
    if (!sceneData || process.env.NODE_ENV !== 'development') {
        return null;
    }

    return (
        <div className="absolute bottom-4 left-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono max-w-sm">
            <div>Scene Objects: {sceneData.scene?.children?.length || 0}</div>
            <div>Behaviors: {sceneData.compiledBehaviors?.behaviors?.length || 0}</div>
            <div>Errors: {sceneData.compiledBehaviors?.errors?.length || 0}</div>
            {sceneData.compiledBehaviors?.errors?.length > 0 && (
                <details className="mt-2">
                    <summary className="cursor-pointer text-red-400">Behavior Errors</summary>
                    <div className="mt-1 text-red-300">
                        {sceneData.compiledBehaviors.errors.map((error, i) => (
                            <div key={i} className="text-xs">{error.message}</div>
                        ))}
                    </div>
                </details>
            )}
        </div>
    );
}