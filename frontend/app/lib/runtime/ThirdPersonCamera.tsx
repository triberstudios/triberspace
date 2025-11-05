'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import Character from './Character';
import { useCharacterControls } from './useCharacterControls';
import { PartyKitContext } from '@/contexts/multiplayer/PartyKitContext';

interface ThirdPersonCameraProps {
    initialPosition?: [number, number, number];
    characterColor?: string;
    initialCameraAngle?: number;
}

const ThirdPersonCamera: React.FC<ThirdPersonCameraProps> = ({
    initialPosition = [0, 2, 0],
    characterColor = '#4080ff',
    initialCameraAngle = 0
}) => {
    // console.log('ThirdPersonCamera initialized with:', { initialPosition, characterColor });
    const { scene } = useThree();
    const cameraRef = useRef<THREE.PerspectiveCamera>(null);
    const characterRef = useRef<THREE.Group>(null);
    const rigidBodyRef = useRef<any>(null);
    const raycaster = useRef(new THREE.Raycaster());

    // Camera configuration (V2World values)
    const cameraDistance = 4;
    const cameraHeight = 3;
    const smoothness = 0.5;

    // Camera control state
    const [cameraAngle, setCameraAngle] = useState(initialCameraAngle);
    const [cameraVerticalAngle, setCameraVerticalAngle] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [lastClientX, setLastClientX] = useState(0);
    const [lastClientY, setLastClientY] = useState(0);
    const [joystickData, setJoystickData] = useState<{ angle: number; force: number } | null>(null);

    // Multiplayer integration (optional - only for published spaces)
    // Use context directly to avoid error when provider is not present (preview mode)
    const partyKitContext = React.useContext(PartyKitContext);
    const sendPlayerUpdate = partyKitContext?.sendPlayerUpdate;
    const isConnected = partyKitContext?.isConnected || false;
    const lastUpdateRef = useRef<number>(0);
    const lastPositionRef = useRef<THREE.Vector3>(new THREE.Vector3(...initialPosition));
    const lastRotationRef = useRef<number>(initialCameraAngle);
    const lastAnimationRef = useRef<string>('idle');

    // Poll joystick data from localStorage for mobile controls
    useEffect(() => {
        const intervalId = setInterval(() => {
            const joystickDataStorage = localStorage.getItem('joystickData');
            if (joystickDataStorage && joystickDataStorage !== 'null') {
                try {
                    setJoystickData(JSON.parse(joystickDataStorage));
                } catch (e) {
                    setJoystickData(null);
                }
            } else {
                setJoystickData(null);
            }
        }, 100);

        return () => clearInterval(intervalId);
    }, []);

    // Log camera angle on key press (P key)
    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.code === 'KeyP') {
                console.log('📐 Current camera angle:', cameraAngle);
                console.log('📐 Current camera angle (degrees):', (cameraAngle * 180 / Math.PI).toFixed(2) + '°');
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [cameraAngle]);

    // Character controls
    const { animation, rotation: characterRotation } = useCharacterControls({
        characterRef,
        rigidBodyRef,
        cameraAngle,
        setCameraAngle,
        joystickData
    });

    // Mouse/touch controls for camera
    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            // console.log('Pointer down detected');
            setIsDragging(true);
            setLastClientX(event.clientX);
            setLastClientY(event.clientY);
        };

        const handlePointerMove = (event: PointerEvent) => {
            if (!isDragging) return;

            const deltaX = event.clientX - lastClientX;
            const deltaY = event.clientY - lastClientY;
            const dragSpeedScaler = 0.003;

            setCameraAngle(prevAngle => prevAngle - deltaX * dragSpeedScaler);
            setCameraVerticalAngle(prevAngle =>
                Math.max(Math.min(prevAngle + deltaY * dragSpeedScaler, Math.PI / 10), -Math.PI / 5)
            );

            setLastClientX(event.clientX);
            setLastClientY(event.clientY);
        };

        const handlePointerUp = () => {
            setIsDragging(false);
        };

        const handleTouchMove = (event: TouchEvent) => {
            // Prevent scrolling when touching the canvas
            event.preventDefault();
        };

        // Attach event listeners to canvas
        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvas.addEventListener('pointerdown', handlePointerDown);
            canvas.addEventListener('pointermove', handlePointerMove);
            canvas.addEventListener('pointerup', handlePointerUp);
            canvas.addEventListener('pointercancel', handlePointerUp);

            // Prevent context menu on right click
            canvas.addEventListener('contextmenu', (e) => e.preventDefault());

            // Prevent touch scrolling on canvas
            canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

            // Set touch-action CSS to prevent default touch behaviors
            canvas.style.touchAction = 'none';
        }

        return () => {
            if (canvas) {
                canvas.removeEventListener('pointerdown', handlePointerDown);
                canvas.removeEventListener('pointermove', handlePointerMove);
                canvas.removeEventListener('pointerup', handlePointerUp);
                canvas.removeEventListener('pointercancel', handlePointerUp);
                canvas.removeEventListener('touchmove', handleTouchMove);
                canvas.style.touchAction = '';
            }
        };
    }, [isDragging, lastClientX, lastClientY]);

    // Camera follow logic (V2World style)
    useFrame(() => {
        if (!characterRef.current || !cameraRef.current || !rigidBodyRef.current) return;

        const characterBody = rigidBodyRef.current;
        const characterPosition = characterBody.translation();

        const camera = cameraRef.current;
        const cameraOrientationAngle = cameraAngle + Math.PI;
        const yOffset = 2.5;

        // Calculate 3P camera position/angle (V2World style)
        const horizontalDistance = Math.cos(cameraVerticalAngle) * cameraDistance;
        const verticalDistance = Math.sin(cameraVerticalAngle) * cameraDistance;
        const desiredPosition = new THREE.Vector3(
            characterPosition.x + Math.sin(cameraOrientationAngle) * horizontalDistance,
            characterPosition.y + cameraHeight + verticalDistance,
            characterPosition.z + Math.cos(cameraOrientationAngle) * horizontalDistance
        );

        // Collision detection logic - set up raycaster (V2World style)
        const rayCastOffset = new THREE.Vector3(characterPosition.x, characterPosition.y + 2, characterPosition.z);
        const castStartPos = rayCastOffset;
        const directionVec = new THREE.Vector3().subVectors(desiredPosition, castStartPos);
        const directionVecMag = directionVec.length();
        const directionVecNormalized = directionVec.normalize();
        raycaster.current.set(castStartPos, directionVecNormalized);
        raycaster.current.far = directionVecMag;

        // Grab all items that can collide with cam (V2World style)
        const checklist = scene.children.filter(child => (child as any).camCollidable);

        // Use raycaster to see if there's an intersection with collidable items
        const newIntersects = raycaster.current.intersectObjects(checklist, true);

        // Create a clone of desired position - in the case of intersection, move cam position to final position
        let finalPosition = desiredPosition.clone();

        if (newIntersects.length > 0) {
            const closestIntersect = newIntersects[0];
            if (closestIntersect.distance < directionVecMag) {
                finalPosition = castStartPos.add(directionVecNormalized.multiplyScalar(closestIntersect.distance - 0.1));
            }
        }

        // Use final position as the cam destination
        camera.position.lerp(finalPosition, smoothness);
        camera.lookAt(characterPosition.x, characterPosition.y + yOffset, characterPosition.z);

        // Send position updates to multiplayer server (only when changed, throttled to ~30Hz)
        if (isConnected) {
            const now = Date.now();

            // Check if position, rotation, or animation has changed significantly
            const currentPosition = new THREE.Vector3(characterPosition.x, characterPosition.y, characterPosition.z);
            const positionChanged = currentPosition.distanceTo(lastPositionRef.current) > 0.01; // 1cm threshold
            const rotationChanged = Math.abs(characterRotation - lastRotationRef.current) > 0.01; // ~0.57 degree threshold
            const animationChanged = animation !== lastAnimationRef.current;

            // Only send if something changed AND throttle time has passed
            if ((positionChanged || rotationChanged || animationChanged) && now - lastUpdateRef.current > 33) {
                sendPlayerUpdate?.({
                    position: {
                        x: characterPosition.x,
                        y: characterPosition.y,
                        z: characterPosition.z
                    },
                    rotation: characterRotation,
                    animation: animation
                });

                // Update last known state
                lastPositionRef.current.copy(currentPosition);
                lastRotationRef.current = characterRotation;
                lastAnimationRef.current = animation;
                lastUpdateRef.current = now;
            }
        }
    });

    return (
        <>
            <Character
                ref={characterRef}
                animation={animation}
                position={initialPosition}
                color={characterColor}
                rigidBodyRef={rigidBodyRef}
            />
            <PerspectiveCamera
                ref={cameraRef}
                makeDefault
                fov={75}
                near={0.05}
                far={1000}
            />
        </>
    );
};

export default ThirdPersonCamera;