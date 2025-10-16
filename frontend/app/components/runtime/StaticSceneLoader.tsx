'use client';

import { useEffect, useState, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { BehaviorExecutor } from './BehaviorExecutor';

/**
 * Restore media textures for media planes with R2 URLs
 */
function restoreMediaTextures(sceneRoot: THREE.Object3D) {
    console.log('🎬 StaticSceneLoader: Starting media texture restoration...');

    const stats = { found: 0, restoredVideos: 0, restoredImages: 0 };

    sceneRoot.traverse((object: THREE.Object3D) => {
        if (!object.userData?.isMediaPlane) {
            return;
        }

        const sourceType = object.userData.mediaSourceType || object.userData.mediaType;
        const actualMediaType = object.userData.mediaType;
        const { mediaRestoreInfo } = object.userData;

        if (sourceType === 'upload' && mediaRestoreInfo) {
            stats.found++;
            console.log(`🎬 Found ${actualMediaType} media plane:`, object.name, mediaRestoreInfo);

            if (actualMediaType === 'video' && mediaRestoreInfo.hasVideoTexture && mediaRestoreInfo.videoSrc) {
                restoreVideoTexture(object, mediaRestoreInfo.videoSrc, stats);
            } else if (actualMediaType === 'image' && mediaRestoreInfo.hasImageTexture && mediaRestoreInfo.imageSrc) {
                restoreImageTexture(object, mediaRestoreInfo.imageSrc, stats);
            }
        }
    });

    console.log(`🎬 Media restoration complete: ${stats.found} found, ${stats.restoredVideos} videos, ${stats.restoredImages} images restored`);
}

function restoreVideoTexture(object: THREE.Object3D, videoSrc: string, stats: any) {
    if (!videoSrc || !(object as any).material) return;

    console.log('🎬 Restoring video from:', videoSrc);

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.playsInline = true;
    video.preload = 'metadata';
    video.autoplay = object.userData.autoplay !== false;
    video.loop = object.userData.loop !== false;
    video.muted = object.userData.muted !== false;

    // Hide video element
    video.style.position = 'absolute';
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.left = '-9999px';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    document.body.appendChild(video);

    video.onloadeddata = () => {
        console.log('🎬 Video loaded, creating texture...');

        const texture = new THREE.VideoTexture(video);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.format = THREE.RGBAFormat;
        texture.needsUpdate = true;

        const materialObject = object as any;
        if (materialObject.material) {
            materialObject.material.map = texture;
            materialObject.material.needsUpdate = true;
            object.userData.mediaSource = texture;
        }

        stats.restoredVideos++;
        console.log('🎬 Video texture applied:', object.name);

        // Handle autoplay - force muted for mobile compatibility
        if (object.userData.autoplay !== false) {
            video.muted = true; // Always start muted for mobile
            video.play().catch(e => {
                console.warn('🎬 Video autoplay failed:', e);
                // Try again on user interaction
                const playOnInteraction = () => {
                    video.play().catch(e2 => console.warn('🎬 Video play on interaction failed:', e2));
                    document.removeEventListener('touchstart', playOnInteraction);
                    document.removeEventListener('click', playOnInteraction);
                };
                document.addEventListener('touchstart', playOnInteraction, { once: true });
                document.addEventListener('click', playOnInteraction, { once: true });
            });
        }
    };

    video.onerror = () => {
        console.error('🎬 Failed to load video:', videoSrc);
    };

    video.src = videoSrc;
    video.load();
}

function restoreImageTexture(object: THREE.Object3D, imageSrc: string, stats: any) {
    if (!imageSrc || !(object as any).material) return;

    console.log('🖼️ Restoring image from:', imageSrc);

    const image = document.createElement('img');

    // Hide image element
    image.style.position = 'absolute';
    image.style.width = '1px';
    image.style.height = '1px';
    image.style.left = '-9999px';
    image.style.opacity = '0';
    image.style.pointerEvents = 'none';
    document.body.appendChild(image);

    image.onload = () => {
        console.log('🖼️ Image loaded, creating texture...');

        const texture = new THREE.Texture(image);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.needsUpdate = true;

        const materialObject = object as any;
        if (materialObject.material) {
            materialObject.material.map = texture;
            materialObject.material.needsUpdate = true;
        }

        stats.restoredImages++;
        console.log('🖼️ Image texture applied:', object.name);
    };

    image.onerror = () => {
        console.error('🖼️ Failed to load image:', imageSrc);
    };

    // Set crossOrigin BEFORE setting src
    image.crossOrigin = 'anonymous';
    image.src = imageSrc;
}

interface StaticSceneLoaderProps {
    sceneJsonPath: string;
    onLoadingChange?: (loading: boolean) => void;
    onError?: (error: string) => void;
    onSceneDataChange?: (data: any) => void;
    onMetadataClick?: (metadata: any) => void;
}

/**
 * Set up click handling for media objects with metadata
 */
function setupMetadataClickHandling(
    sceneRoot: THREE.Object3D,
    camera: THREE.Camera,
    domElement: HTMLElement,
    onMetadataClick: (metadata: any) => void
) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let currentlyHovered: THREE.Object3D | null = null;

    function updateMousePosition(event: MouseEvent) {
        const rect = domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function getMetadataObjects(): THREE.Object3D[] {
        const metadataObjects: THREE.Object3D[] = [];
        sceneRoot.traverse((object) => {
            if (object.userData?.isMediaPlane &&
                object.userData?.metadata &&
                Object.keys(object.userData.metadata).length > 0) {
                metadataObjects.push(object);
            }
        });
        return metadataObjects;
    }

    function onMouseClick(event: MouseEvent) {
        updateMousePosition(event);
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(getMetadataObjects(), false);

        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            console.log('🖼️ Clicked media object with metadata:', clickedObject.name, clickedObject.userData.metadata);

            if (clickedObject.userData.metadata) {
                let videoElement: HTMLVideoElement | undefined;
                let mediaUrl: string | undefined;

                if (clickedObject.userData.mediaType === 'video' && clickedObject.userData.mediaSource) {
                    const texture = clickedObject.userData.mediaSource as THREE.VideoTexture;
                    videoElement = texture.image as HTMLVideoElement;
                } else {
                    mediaUrl = clickedObject.userData.mediaRestoreInfo?.imageSrc;
                }

                const enrichedMetadata = {
                    ...clickedObject.userData.metadata,
                    videoElement,
                    mediaUrl,
                    mediaType: clickedObject.userData.mediaType
                };

                onMetadataClick(enrichedMetadata);
            }
        }
    }

    function onMouseMove(event: MouseEvent) {
        updateMousePosition(event);
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(getMetadataObjects(), false);

        if (intersects.length > 0) {
            const hoveredObject = intersects[0].object;
            domElement.style.cursor = 'pointer';

            if (currentlyHovered !== hoveredObject) {
                if (currentlyHovered) {
                    removeHoverEffect(currentlyHovered);
                }
                addHoverEffect(hoveredObject);
                currentlyHovered = hoveredObject;
            }
        } else {
            domElement.style.cursor = 'default';
            if (currentlyHovered) {
                removeHoverEffect(currentlyHovered);
                currentlyHovered = null;
            }
        }
    }

    function addHoverEffect(object: THREE.Object3D) {
        const materialObject = object as any;
        if (materialObject.material) {
            if (!materialObject.userData.originalEmissive) {
                materialObject.userData.originalEmissive = materialObject.material.emissive ?
                    materialObject.material.emissive.clone() :
                    new THREE.Color(0x000000);
            }
            materialObject.material.emissive = new THREE.Color(0x4080ff);
            materialObject.material.needsUpdate = true;
        }
    }

    function removeHoverEffect(object: THREE.Object3D) {
        const materialObject = object as any;
        if (materialObject.material && materialObject.userData.originalEmissive) {
            materialObject.material.emissive = materialObject.userData.originalEmissive;
            materialObject.material.needsUpdate = true;
        }
    }

    domElement.addEventListener('click', onMouseClick);
    domElement.addEventListener('mousemove', onMouseMove);

    return () => {
        domElement.removeEventListener('click', onMouseClick);
        domElement.removeEventListener('mousemove', onMouseMove);
        domElement.style.cursor = 'default';
        if (currentlyHovered) {
            removeHoverEffect(currentlyHovered);
        }
    };
}

// Component to render the actual Three.js scene content
function StaticSceneContent({
    sceneData,
    onMetadataClick
}: {
    sceneData: any;
    onMetadataClick?: (metadata: any) => void;
}) {
    const groupRef = useRef<THREE.Group>(null);
    const behaviorExecutorRef = useRef<BehaviorExecutor | null>(null);
    const { scene, camera, gl } = useThree();

    useEffect(() => {
        if (!groupRef.current || !sceneData?.scene) return;

        const loader = new THREE.ObjectLoader();

        try {
            console.log('🎬 StaticSceneContent: Parsing scene data');

            const loadedScene = loader.parse(sceneData.scene);

            console.log('🎬 StaticSceneContent: Scene parsed, adding to group', {
                childrenCount: loadedScene.children.length
            });

            // Clear existing content in group
            while (groupRef.current.children.length > 0) {
                groupRef.current.remove(groupRef.current.children[0]);
            }

            // Add all scene children to the group
            while (loadedScene.children.length > 0) {
                const child = loadedScene.children[0];
                loadedScene.remove(child);
                groupRef.current.add(child);
            }

            console.log('🎬 StaticSceneContent: Scene loaded successfully');

            // Restore media textures (videos/images from R2)
            restoreMediaTextures(groupRef.current);

            // Set up click handling for media objects with metadata
            const cleanupMetadataHandling = onMetadataClick
                ? setupMetadataClickHandling(groupRef.current, camera, gl.domElement, onMetadataClick)
                : () => {};

            console.log('🖼️ Metadata click handling enabled');

            // Initialize behaviors if compiledBehaviors exist
            if (sceneData.compiledBehaviors) {
                console.log('🎬 StaticSceneContent: Initializing behaviors', {
                    behaviorCount: sceneData.compiledBehaviors.behaviors?.length || 0
                });

                // Build object map for UUID lookup
                const objectMap = new Map<string, THREE.Object3D>();
                groupRef.current.traverse((object) => {
                    if (object.uuid) {
                        objectMap.set(object.uuid, object);
                    }
                });

                console.log('🎬 StaticSceneContent: Built object map', {
                    objectMapSize: objectMap.size
                });

                // Initialize behavior executor
                behaviorExecutorRef.current = new BehaviorExecutor(
                    sceneData.compiledBehaviors,
                    objectMap
                );

                console.log('🎬 StaticSceneContent: Behavior initialization complete');
            }

            // Return cleanup function
            return () => {
                cleanupMetadataHandling();
            };

        } catch (error) {
            console.error('🎬 StaticSceneContent: Failed to parse scene:', error);
        }
    }, [sceneData]); // Removed onMetadataClick to prevent re-renders on modal open/close

    // Animation loop for behavior execution
    useFrame((state, delta) => {
        if (behaviorExecutorRef.current) {
            behaviorExecutorRef.current.update(delta);
        }
    });

    return <group ref={groupRef} />;
}

export function StaticSceneLoader({
    sceneJsonPath,
    onLoadingChange,
    onError,
    onSceneDataChange,
    onMetadataClick
}: StaticSceneLoaderProps) {
    const [sceneData, setSceneData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const loadedRef = useRef(false);

    useEffect(() => {
        if (loadedRef.current) return;
        loadedRef.current = true;

        console.log('🎬 StaticSceneLoader: Loading scene from:', sceneJsonPath);

        const loadScene = async () => {
            try {
                setIsLoading(true);
                onLoadingChange?.(true);

                // Fetch scene JSON from public directory
                const response = await fetch(sceneJsonPath);
                if (!response.ok) {
                    throw new Error(`Failed to load scene: ${response.statusText}`);
                }

                const data = await response.json();
                console.log('🎬 StaticSceneLoader: Scene data loaded', {
                    hasScene: !!data.scene,
                    hasCamera: !!data.camera,
                    hasCompiledBehaviors: !!data.compiledBehaviors,
                    sceneId: data.id
                });

                setSceneData(data);
                onSceneDataChange?.(data);

                setIsLoading(false);
                onLoadingChange?.(false);

            } catch (error) {
                console.error('🎬 StaticSceneLoader: Failed to load scene:', error);
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                onError?.(errorMessage);
                setIsLoading(false);
                onLoadingChange?.(false);
            }
        };

        loadScene();
    }, [sceneJsonPath, onLoadingChange, onError, onSceneDataChange]);

    if (isLoading) {
        return (
            <mesh position={[0, 1, 0]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="#4444ff" />
            </mesh>
        );
    }

    if (!sceneData?.scene) {
        return null;
    }

    return <StaticSceneContent sceneData={sceneData} onMetadataClick={onMetadataClick} />;
}

export interface SceneDebugInfo {
    sceneId?: string;
    objectCount: number;
    hasCompiledBehaviors: boolean;
    behaviorCount: number;
    errorCount: number;
}
