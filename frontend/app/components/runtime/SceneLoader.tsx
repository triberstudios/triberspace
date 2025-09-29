'use client';

import { useEffect, useState, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
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

/**
 * Runtime media restoration utilities for Three.js scenes
 */
class MediaRestoreUtils {

    /**
     * Create hidden media element for processing
     * @param tagName - 'video' or 'img'
     * @returns The created element
     */
    static createHiddenMediaElement<T extends 'video' | 'img'>(
        tagName: T
    ): T extends 'video' ? HTMLVideoElement : HTMLImageElement {
        const element = document.createElement(tagName) as T extends 'video'
            ? HTMLVideoElement
            : HTMLImageElement;

        if (tagName === 'video') {
            const video = element as HTMLVideoElement;
            video.crossOrigin = 'anonymous';
            video.playsInline = true;
            video.preload = 'metadata';
        } else {
            const image = element as HTMLImageElement;
            image.crossOrigin = 'anonymous';
        }

        // Hide element
        element.style.position = 'absolute';
        element.style.width = '1px';
        element.style.height = '1px';
        element.style.left = '-9999px';
        element.style.opacity = '0';
        element.style.pointerEvents = 'none';

        document.body.appendChild(element);
        return element as T extends 'video' ? HTMLVideoElement : HTMLImageElement;
    }

    /**
     * Configure video element with user settings
     * @param video - The video element
     * @param userData - User configuration
     */
    static configureVideoElement(video: HTMLVideoElement, userData: any) {
        video.autoplay = userData.autoplay !== false;
        video.loop = userData.loop !== false;
        video.muted = userData.muted !== false;
    }

    /**
     * Create Three.js texture from media element
     * @param element - The media element
     * @param mediaType - 'video' or 'image'
     * @returns The created texture
     */
    static createTexture(
        element: HTMLVideoElement | HTMLImageElement,
        mediaType: 'video' | 'image'
    ): THREE.VideoTexture | THREE.Texture {
        const texture = mediaType === 'video'
            ? new THREE.VideoTexture(element as HTMLVideoElement)
            : new THREE.Texture(element as HTMLImageElement);

        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.needsUpdate = true;

        if (mediaType === 'video') {
            const videoTexture = texture as THREE.VideoTexture;
            videoTexture.format = THREE.RGBAFormat;
            videoTexture.generateMipmaps = false;
        }

        return texture;
    }

    /**
     * Apply texture to Three.js object material
     * @param object - The Three.js object
     * @param texture - The texture to apply
     */
    static applyTexture(object: THREE.Object3D, texture: THREE.Texture) {
        const materialObject = object as any;
        if (materialObject.material) {
            materialObject.material.map = texture;
            materialObject.material.needsUpdate = true;
            object.userData.mediaSource = texture;
        }
    }

    /**
     * Handle video autoplay with fallback to muted
     * @param video - The video element
     * @param shouldAutoplay - Whether autoplay should be attempted
     */
    static async handleVideoAutoplay(video: HTMLVideoElement, shouldAutoplay: boolean) {
        if (!shouldAutoplay) return;

        try {
            await video.play();
            console.log('🎬 Video playback started successfully');
        } catch (e) {
            console.warn('🎬 Video autoplay failed, trying with mute:', e);
            video.muted = true;
            try {
                await video.play();
                console.log('🎬 Video playback started after muting');
            } catch (e2) {
                console.warn('🎬 Video playback failed even after muting:', e2);
            }
        }
    }

    /**
     * Check if browser supports screen sharing
     * @returns True if screen sharing is supported
     */
    static supportsScreenShare(): boolean {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
    }

    /**
     * Start screen sharing capture
     * @param options - Screen capture options
     * @returns The screen capture stream
     */
    static async startScreenShare(options: { audio?: boolean } = {}): Promise<MediaStream> {
        if (!MediaRestoreUtils.supportsScreenShare()) {
            throw new Error('Screen sharing not supported in this browser');
        }

        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    cursor: 'always' as const
                },
                audio: options.audio || false
            });

            console.log('🖥️ Screen share started:', {
                videoTracks: stream.getVideoTracks().length,
                audioTracks: stream.getAudioTracks().length
            });

            return stream;
        } catch (error) {
            console.error('🖥️ Screen share failed:', error);
            throw error;
        }
    }

    /**
     * Stop screen sharing
     * @param stream - The stream to stop
     */
    static stopScreenShare(stream: MediaStream) {
        if (stream) {
            stream.getTracks().forEach(track => {
                track.stop();
                console.log('🖥️ Stopped track:', track.kind);
            });
            console.log('🖥️ Screen share stopped');
        }
    }

    /**
     * Get the aspect ratio from a Three.js object
     * @param object - The Three.js object
     * @returns The aspect ratio (width/height)
     */
    static getObjectAspectRatio(object: THREE.Object3D): number {
        // Try to get from geometry if it's a plane
        const mesh = object as any;
        if (mesh.geometry && mesh.geometry.parameters) {
            const { width, height } = mesh.geometry.parameters;
            if (width && height) {
                return width / height;
            }
        }

        // Fallback to default 2:1 ratio
        return 2.0;
    }

    /**
     * Create a default "Click to share screen" texture
     * @param aspectRatio - The aspect ratio (width/height) of the target plane
     * @returns The default screenshare texture
     */
    static createDefaultScreenshareTexture(aspectRatio: number = 2.0): THREE.CanvasTexture {
        const canvas = document.createElement('canvas');

        // Create canvas with the correct aspect ratio
        const baseHeight = 256;
        canvas.height = baseHeight;
        canvas.width = Math.round(baseHeight * aspectRatio);

        const ctx = canvas.getContext('2d')!;

        // Dark background (matching the image)
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Play button circle
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2 - 20; // Slightly above center to leave room for text
        const circleRadius = 40;

        // Circle background (light gray)
        ctx.fillStyle = '#d0d0d0';
        ctx.beginPath();
        ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
        ctx.fill();

        // Play triangle
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath();
        const triangleSize = 20;
        // Move triangle slightly right to center it visually
        const triangleX = centerX + 3;
        ctx.moveTo(triangleX - triangleSize/2, centerY - triangleSize/2);
        ctx.lineTo(triangleX - triangleSize/2, centerY + triangleSize/2);
        ctx.lineTo(triangleX + triangleSize/2, centerY);
        ctx.closePath();
        ctx.fill();

        // Text below the play button
        ctx.fillStyle = '#ffffff';
        ctx.font = '24px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Click to share screen', centerX, centerY + circleRadius + 35);

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    /**
     * Handle click event for screenshare-enabled media planes
     * @param object - The clicked Three.js object
     * @param includeAudio - Whether to include audio
     */
    static async handleScreenshareClick(object: THREE.Object3D, includeAudio: boolean = false) {
        console.log('🖥️ Starting screenshare for media plane:', object.name);

        try {
            // Check if already screensharing
            const userData = object.userData;
            if (userData.activeScreenStream) {
                // Stop existing screenshare
                MediaRestoreUtils.stopScreenShare(userData.activeScreenStream);
                delete userData.activeScreenStream;
                delete userData.mediaSource;

                // Reset material to default screenshare texture
                const materialObject = object as any;
                if (materialObject.material) {
                    const aspectRatio = MediaRestoreUtils.getObjectAspectRatio(object);
                    const defaultTexture = MediaRestoreUtils.createDefaultScreenshareTexture(aspectRatio);
                    materialObject.material.map = defaultTexture;
                    materialObject.material.needsUpdate = true;
                }

                console.log('🖥️ Stopped screenshare');
                return;
            }

            // Start new screenshare
            const stream = await MediaRestoreUtils.startScreenShare({ audio: includeAudio });

            // Create video element from stream
            const video = MediaRestoreUtils.createHiddenMediaElement('video');
            video.srcObject = stream;
            video.autoplay = true;
            video.muted = true; // Always mute screenshare to prevent feedback
            await video.play();

            // Create texture
            const texture = MediaRestoreUtils.createTexture(video, 'video');
            MediaRestoreUtils.applyTexture(object, texture);

            // Store stream reference for cleanup
            object.userData.activeScreenStream = stream;
            object.userData.mediaSource = texture;
            object.userData.mediaType = 'screenshare';

            // Listen for stream end (user stops sharing from browser)
            stream.getVideoTracks()[0].addEventListener('ended', () => {
                console.log('🖥️ User stopped screenshare from browser');
                delete object.userData.activeScreenStream;
                delete object.userData.mediaSource;

                // Reset material to default screenshare texture
                const materialObject = object as any;
                if (materialObject.material) {
                    const aspectRatio = MediaRestoreUtils.getObjectAspectRatio(object);
                    const defaultTexture = MediaRestoreUtils.createDefaultScreenshareTexture(aspectRatio);
                    materialObject.material.map = defaultTexture;
                    materialObject.material.needsUpdate = true;
                }
            });

            console.log('🖥️ Screenshare texture applied to media plane');

        } catch (error) {
            console.error('🖥️ Screenshare failed:', error);
        }
    }
}

/**
 * Set up click handling for screenshare-enabled media planes
 * @param sceneRoot - The root object to traverse
 * @param camera - The Three.js camera for raycasting
 * @param domElement - The canvas DOM element for mouse events
 */
function setupScreenshareClickHandling(sceneRoot: THREE.Object3D, camera: THREE.Camera, domElement: HTMLElement) {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let currentlyHovered: THREE.Object3D | null = null;

    function updateMousePosition(event: MouseEvent) {
        // Calculate mouse position in normalized device coordinates (-1 to +1)
        const rect = domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    function getScreenshareObjects(): THREE.Object3D[] {
        const screenshareObjects: THREE.Object3D[] = [];
        sceneRoot.traverse((object) => {
            // Check for both new mediaSourceType and legacy screenshareEnabled
            const isScreenshare = object.userData?.mediaSourceType === 'screenshare' ||
                                 object.userData?.screenshareEnabled;

            if (object.userData?.isMediaPlane && isScreenshare) {
                screenshareObjects.push(object);
            }
        });
        return screenshareObjects;
    }

    function onMouseClick(event: MouseEvent) {
        updateMousePosition(event);

        // Update the raycaster with the camera and mouse position
        raycaster.setFromCamera(mouse, camera);

        // Calculate objects intersecting the ray
        const intersects = raycaster.intersectObjects(getScreenshareObjects(), false);

        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            console.log('🖥️ Clicked screenshare-enabled media plane:', clickedObject.name);

            // Handle screenshare click
            MediaRestoreUtils.handleScreenshareClick(clickedObject);
        }
    }

    function onMouseMove(event: MouseEvent) {
        updateMousePosition(event);

        // Update the raycaster with the camera and mouse position
        raycaster.setFromCamera(mouse, camera);

        // Calculate objects intersecting the ray
        const intersects = raycaster.intersectObjects(getScreenshareObjects(), false);

        if (intersects.length > 0) {
            const hoveredObject = intersects[0].object;

            // Change cursor to pointer to indicate clickable
            domElement.style.cursor = 'pointer';

            // Add hover effect if not already hovering this object
            if (currentlyHovered !== hoveredObject) {
                // Remove hover effect from previously hovered object
                if (currentlyHovered) {
                    removeHoverEffect(currentlyHovered);
                }

                // Add hover effect to new object
                addHoverEffect(hoveredObject);
                currentlyHovered = hoveredObject;
            }
        } else {
            // Reset cursor
            domElement.style.cursor = 'default';

            // Remove hover effect if there was one
            if (currentlyHovered) {
                removeHoverEffect(currentlyHovered);
                currentlyHovered = null;
            }
        }
    }

    function addHoverEffect(object: THREE.Object3D) {
        const materialObject = object as any;
        if (materialObject.material) {
            // Store original emissive value if not already stored
            if (!materialObject.userData.originalEmissive) {
                materialObject.userData.originalEmissive = materialObject.material.emissive ?
                    materialObject.material.emissive.clone() :
                    new THREE.Color(0x000000);
            }

            // Add subtle blue glow to indicate screenshare capability
            materialObject.material.emissive = new THREE.Color(0x004080);
            materialObject.material.needsUpdate = true;
        }
    }

    function removeHoverEffect(object: THREE.Object3D) {
        const materialObject = object as any;
        if (materialObject.material && materialObject.userData.originalEmissive) {
            // Restore original emissive value
            materialObject.material.emissive = materialObject.userData.originalEmissive;
            materialObject.material.needsUpdate = true;
        }
    }

    // Add event listeners
    domElement.addEventListener('click', onMouseClick);
    domElement.addEventListener('mousemove', onMouseMove);

    // Return cleanup function
    return () => {
        domElement.removeEventListener('click', onMouseClick);
        domElement.removeEventListener('mousemove', onMouseMove);
        domElement.style.cursor = 'default';

        // Clean up any remaining hover effects
        if (currentlyHovered) {
            removeHoverEffect(currentlyHovered);
        }
    };
}

/**
 * Restore media textures for media planes in a Three.js scene
 * @param sceneRoot - The root object to traverse
 */
function restoreMediaTextures(sceneRoot: THREE.Object3D) {
    console.log('🎬 Starting media texture restoration...');

    const stats = { found: 0, restoredVideos: 0, restoredImages: 0 };

    sceneRoot.traverse((object: THREE.Object3D) => {
        if (!object.userData?.isMediaPlane) {
            return;
        }

        // Check for both mediaSourceType (new) and mediaType (legacy)
        const sourceType = object.userData.mediaSourceType || object.userData.mediaType;
        if (!sourceType) {
            return;
        }

        const { mediaRestoreInfo } = object.userData;

        if (sourceType === 'video' || sourceType === 'image') {
            stats.found++;
            console.log(`🎬 Found ${sourceType} plane:`, object.name);

            if (sourceType === 'video' && mediaRestoreInfo?.hasVideoTexture) {
                restoreVideoTexture(object, mediaRestoreInfo.videoSrc, stats);
            } else if (sourceType === 'image' && mediaRestoreInfo?.hasImageTexture) {
                restoreImageTexture(object, mediaRestoreInfo.imageSrc, stats);
            }
        } else if (sourceType === 'screenshare') {
            stats.found++;
            console.log(`🎬 Found screenshare plane:`, object.name);

            // Apply default screenshare texture with correct aspect ratio
            const aspectRatio = MediaRestoreUtils.getObjectAspectRatio(object);
            const defaultTexture = MediaRestoreUtils.createDefaultScreenshareTexture(aspectRatio);
            MediaRestoreUtils.applyTexture(object, defaultTexture);

            // Store reference for click handling
            object.userData.isScreenshareReady = true;
        }
    });

    console.log(`🎬 Media restoration complete: ${stats.found} found, ${stats.restoredVideos} videos, ${stats.restoredImages} images restored`);
}

/**
 * Restore video texture for a media plane
 * @param object - The Three.js object
 * @param videoSrc - The video source URL
 * @param stats - Statistics tracking object
 */
function restoreVideoTexture(object: THREE.Object3D, videoSrc: string, stats: any) {
    if (!videoSrc || !(object as any).material) {
        return;
    }

    console.log('🎬 Restoring video from:', videoSrc);

    const video = MediaRestoreUtils.createHiddenMediaElement('video');
    MediaRestoreUtils.configureVideoElement(video, object.userData);

    video.onloadeddata = () => {
        console.log('🎬 Video loaded, creating texture...');

        const texture = MediaRestoreUtils.createTexture(video, 'video');
        MediaRestoreUtils.applyTexture(object, texture);

        stats.restoredVideos++;
        console.log('🎬 Video texture applied:', object.name);

        // Handle autoplay with delay for texture readiness
        setTimeout(() => {
            MediaRestoreUtils.handleVideoAutoplay(video, object.userData.autoplay !== false);
        }, 100);
    };

    video.onerror = () => {
        console.error('🎬 Failed to load video:', videoSrc);
    };

    video.src = videoSrc;
    video.load();
}

/**
 * Restore image texture for a media plane
 * @param object - The Three.js object
 * @param imageSrc - The image source URL
 * @param stats - Statistics tracking object
 */
function restoreImageTexture(object: THREE.Object3D, imageSrc: string, stats: any) {
    if (!imageSrc || !(object as any).material) {
        return;
    }

    console.log('🖼️ Restoring image from:', imageSrc);

    const image = MediaRestoreUtils.createHiddenMediaElement('img');

    image.onload = () => {
        console.log('🖼️ Image loaded, creating texture...');

        const texture = MediaRestoreUtils.createTexture(image, 'image');
        MediaRestoreUtils.applyTexture(object, texture);

        stats.restoredImages++;
        console.log('🖼️ Image texture applied:', object.name);
    };

    image.onerror = () => {
        console.error('🖼️ Failed to load image:', imageSrc);
    };

    image.src = imageSrc;
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
    const { camera, gl, scene } = useThree();

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

            // Set up click handling for screenshare-enabled media planes
            const cleanupClickHandling = setupScreenshareClickHandling(groupRef.current, camera, gl.domElement);

            // Notify that scene objects are loaded and ready for behavior initialization
            if (onSceneLoaded) {
                onSceneLoaded();
            }

            // Return cleanup function
            return cleanupClickHandling;

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