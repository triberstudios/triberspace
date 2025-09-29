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
    onSceneDataChange?: (sceneData: SceneData | null) => void;
}

// Media texture restoration function for media planes (videos and images)
function restoreMediaTextures(sceneRoot: THREE.Object3D) {
    console.log('🎬 RestoreMediaTextures: Starting media texture restoration in React runtime...');

    let foundMediaPlanes = 0;
    let restoredVideos = 0;
    let restoredImages = 0;

    // Find objects that should have media textures based on userData
    sceneRoot.traverse((object: THREE.Object3D) => {
        if (object.userData && object.userData.isMediaPlane) {
            const mediaType = object.userData.mediaType;

            if (mediaType === 'video' || mediaType === 'image') {
                foundMediaPlanes++;
                console.log('🎬 Found media plane:', object.name, {
                    hasRestoreInfo: !!object.userData.mediaRestoreInfo,
                    mediaType: mediaType,
                    userData: object.userData
                });

                // Handle video restoration
                if (mediaType === 'video' && object.userData.mediaRestoreInfo && object.userData.mediaRestoreInfo.hasVideoTexture) {
                    const videoSrc = object.userData.mediaRestoreInfo.videoSrc;
                    console.log('🎬 Attempting to restore video from:', videoSrc);

                    if (videoSrc && (object as any).material) {
                    // Create video element
                    const video = document.createElement('video');
                    video.crossOrigin = 'anonymous';
                    video.autoplay = object.userData.autoplay !== false;
                    video.loop = object.userData.loop !== false;
                    video.muted = object.userData.muted !== false;
                    video.playsInline = true;
                    video.preload = 'metadata';

                    // Hide video element
                    video.style.position = 'absolute';
                    video.style.width = '1px';
                    video.style.height = '1px';
                    video.style.left = '-9999px';
                    video.style.opacity = '0';
                    video.style.pointerEvents = 'none';
                    document.body.appendChild(video);

                    video.src = videoSrc;
                    video.load();

                    video.onloadeddata = function() {
                        console.log('🎬 Video loaded successfully, creating texture...');

                        // Create new video texture
                        const texture = new THREE.VideoTexture(video);
                        texture.minFilter = THREE.LinearFilter;
                        texture.magFilter = THREE.LinearFilter;
                        texture.format = THREE.RGBAFormat;
                        texture.generateMipmaps = false;
                        texture.wrapS = THREE.ClampToEdgeWrapping;
                        texture.wrapT = THREE.ClampToEdgeWrapping;
                        texture.needsUpdate = true;

                        // Apply texture to material
                        (object as any).material.map = texture;
                        (object as any).material.needsUpdate = true;

                        // Update userData
                        object.userData.mediaSource = texture;

                        console.log('🎬 Video texture applied to material:', object.name);
                        restoredVideos++;

                        // Start playing if autoplay is enabled
                        if (object.userData.autoplay !== false) {
                            console.log('🎬 Starting video playback...');
                            setTimeout(() => {
                                video.play().then(() => {
                                    console.log('🎬 Video playback started successfully');
                                }).catch(e => {
                                    console.warn('🎬 Video autoplay failed during restore:', e);
                                    video.muted = true;
                                    video.play().then(() => {
                                        console.log('🎬 Video playback started after muting');
                                    }).catch(e2 => {
                                        console.warn('🎬 Video playback failed even after muting:', e2);
                                    });
                                });
                            }, 100);
                        }
                    };

                    video.onerror = function() {
                        console.error('🎬 Failed to load video during restore:', videoSrc);
                    };
                    }
                }

                // Handle image restoration
                if (mediaType === 'image' && object.userData.mediaRestoreInfo && object.userData.mediaRestoreInfo.hasImageTexture) {
                    const imageSrc = object.userData.mediaRestoreInfo.imageSrc;
                    console.log('🖼️ Attempting to restore image from:', imageSrc);

                    if (imageSrc && (object as any).material) {
                        // Create image element
                        const image = new Image();
                        image.crossOrigin = 'anonymous';

                        image.onload = function() {
                            console.log('🖼️ Image loaded successfully, creating texture...');

                            // Create new texture
                            const texture = new THREE.Texture(image);
                            texture.needsUpdate = true;

                            // Apply texture to material
                            (object as any).material.map = texture;
                            (object as any).material.needsUpdate = true;

                            // Update userData
                            object.userData.mediaSource = texture;

                            console.log('🖼️ Image texture applied to material:', object.name);
                            restoredImages++;
                        };

                        image.onerror = function() {
                            console.error('🖼️ Failed to load image during restore:', imageSrc);
                        };

                        // Load image from R2 URL
                        image.src = imageSrc;
                    }
                }
            }
        }
    });

    console.log(`🎬 RestoreMediaTextures: Complete. Found ${foundMediaPlanes} media planes, restored ${restoredVideos} videos and ${restoredImages} images`);
}

export function SceneLoader({ sceneId, onLoadingChange, onError, onSceneDataChange }: SceneLoaderProps) {
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

    // Initialize behaviors when scene objects are actually loaded
    const handleSceneLoaded = () => {
        if (sceneData?.compiledBehaviors && groupRef.current) {
            // console.log('🎬 SceneLoader: Scene objects loaded, initializing behaviors');
            initializeBehaviors();
        }
    };

    async function loadSceneData() {
        try {
            setLoading(true);
            setError(null);
            onLoadingChange?.(true);
            onError?.(null);

            // console.log('SceneLoader: Loading scene', sceneId);

            // Fetch scene data from backend API
            const response = await fetch(`http://localhost:3001/api/v1/runtime/scenes/${sceneId}`);

            if (!response.ok) {
                throw new Error(`Failed to load scene: ${response.statusText}`);
            }

            const data = await response.json();
            // console.log('SceneLoader: Received data', {
            //     hasScene: !!data.scene,
            //     hasCamera: !!data.camera,
            //     hasCompiledBehaviors: !!data.compiledBehaviors,
            //     behaviorCount: data.compiledBehaviors?.behaviors?.length || 0,
            //     sceneChildrenCount: data.scene?.children?.length || 0
            // });
            setSceneData(data);
            onSceneDataChange?.(data);
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
        if (!sceneData?.compiledBehaviors || !groupRef.current) {
            // console.log('🎬 SceneLoader: Cannot initialize behaviors', {
            //     hasSceneData: !!sceneData,
            //     hasCompiledBehaviors: !!sceneData?.compiledBehaviors,
            //     hasGroup: !!groupRef.current
            // });
            return;
        }

        // console.log('🎬 SceneLoader: Starting behavior initialization', {
        //     behaviorCount: sceneData.compiledBehaviors.behaviors?.length || 0,
        //     errorCount: sceneData.compiledBehaviors.errors?.length || 0,
        //     groupChildren: groupRef.current.children.length
        // });

        // Build object map for UUID lookup
        const objectMap = new Map<string, THREE.Object3D>();
        const allObjects: Array<{uuid: string, type: string, name: string}> = [];

        groupRef.current.traverse((object) => {
            if (object.uuid) {
                objectMap.set(object.uuid, object);
                allObjects.push({
                    uuid: object.uuid,
                    type: object.type,
                    name: object.name || 'unnamed'
                });
            }
        });
        objectMapRef.current = objectMap;

        // console.log('🎬 SceneLoader: Built object map', {
        //     objectMapSize: objectMap.size,
        //     allObjects: allObjects,
        //     behaviorTargets: sceneData.compiledBehaviors.behaviors?.map(b => ({
        //         objectName: b.objectName,
        //         objectUuid: b.objectUuid,
        //         found: objectMap.has(b.objectUuid)
        //     }))
        // });

        // Initialize behavior executor
        behaviorExecutorRef.current = new BehaviorExecutor(
            sceneData.compiledBehaviors,
            objectMap
        );

        // console.log('🎬 SceneLoader: Behavior initialization complete', {
        //     behaviorExecutorCreated: !!behaviorExecutorRef.current,
        //     behaviorsWithObjects: sceneData.compiledBehaviors.behaviors?.filter(b => objectMap.has(b.objectUuid)).length || 0,
        //     behaviorsWithoutObjects: sceneData.compiledBehaviors.behaviors?.filter(b => !objectMap.has(b.objectUuid)).length || 0
        // });
    }

    // Animation loop
    useFrame((state, delta) => {
        if (behaviorExecutorRef.current) {
            behaviorExecutorRef.current.update(delta);
        } // Remove occasional logging when no executor
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
            <SceneContent sceneData={sceneData} onSceneLoaded={handleSceneLoaded} />
        </group>
    );
}

// Component to render the actual Three.js scene content
function SceneContent({ sceneData, onSceneLoaded }: { sceneData: SceneData, onSceneLoaded?: () => void }) {
    const groupRef = useRef<THREE.Group>(null);

    useEffect(() => {
        if (!groupRef.current || !sceneData.scene) return;

        // Load the Three.js scene
        const loader = new THREE.ObjectLoader();

        try {
            // console.log('SceneContent: Parsing scene data', {
            //     hasSceneData: !!sceneData.scene,
            //     sceneDataType: typeof sceneData.scene,
            //     sceneDataKeys: sceneData.scene ? Object.keys(sceneData.scene) : null
            // });

            const loadedScene = loader.parse(sceneData.scene);

            // console.log('SceneContent: Scene parsed successfully', {
            //     loadedSceneType: loadedScene.type,
            //     loadedSceneChildren: loadedScene.children.length,
            //     childrenTypes: loadedScene.children.map(child => ({
            //         type: child.type,
            //         name: child.name,
            //         uuid: child.uuid,
            //         position: child.position
            //     }))
            // });

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

            // console.log('SceneContent: Loaded scene with', groupRef.current.children.length, 'objects in group');

            // Debug: Log all lights in the scene
            const lights: any[] = [];
            groupRef.current.traverse((object) => {
                if (object.type.includes('Light')) {
                    lights.push({
                        type: object.type,
                        name: object.name,
                        uuid: object.uuid,
                        intensity: (object as any).intensity,
                        color: (object as any).color?.getHexString(),
                        position: object.position
                    });
                }
            });
            // console.log('🔆 SceneContent: Lights in scene:', lights);

            // Restore media textures for media planes (videos and images)
            restoreMediaTextures(groupRef.current);

            // Notify that scene objects are loaded and ready for behavior initialization
            if (onSceneLoaded) {
                onSceneLoaded();
            }

        } catch (error) {
            console.error('SceneContent: Failed to parse scene:', error);
            console.log('SceneContent: Scene data that failed to parse:', sceneData.scene);
        }
    }, [sceneData, onSceneLoaded]);

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