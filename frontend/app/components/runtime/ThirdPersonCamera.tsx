'use client';

import React, { useRef, useState, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import Character from './Character';
import { useCharacterControls } from './useCharacterControls';

interface ThirdPersonCameraProps {
    initialPosition?: [number, number, number];
    characterColor?: string;
}

const ThirdPersonCamera: React.FC<ThirdPersonCameraProps> = ({
    initialPosition = [0, 2, 0],
    characterColor = '#4080ff'
}) => {
    console.log('ThirdPersonCamera initialized with:', { initialPosition, characterColor });
    const { setDefaultCamera, scene } = useThree();
    const cameraRef = useRef<THREE.PerspectiveCamera>(null);
    const characterRef = useRef<THREE.Group>(null);
    const rigidBodyRef = useRef<any>(null);
    const raycaster = useRef(new THREE.Raycaster());

    // Camera configuration
    const cameraDistance = 4;
    const cameraHeight = 3;
    const smoothness = 0.1;

    // Camera control state
    const [cameraAngle, setCameraAngle] = useState(0);
    const [cameraVerticalAngle, setCameraVerticalAngle] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [lastClientX, setLastClientX] = useState(0);
    const [lastClientY, setLastClientY] = useState(0);

    // Character controls
    const { animation } = useCharacterControls({
        characterRef,
        rigidBodyRef,
        cameraAngle
    });

    // Mouse/touch controls for camera
    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            console.log('Pointer down detected');
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

        // Attach event listeners to canvas
        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvas.addEventListener('pointerdown', handlePointerDown);
            canvas.addEventListener('pointermove', handlePointerMove);
            canvas.addEventListener('pointerup', handlePointerUp);
            canvas.addEventListener('pointercancel', handlePointerUp);

            // Prevent context menu on right click
            canvas.addEventListener('contextmenu', (e) => e.preventDefault());
        }

        return () => {
            if (canvas) {
                canvas.removeEventListener('pointerdown', handlePointerDown);
                canvas.removeEventListener('pointermove', handlePointerMove);
                canvas.removeEventListener('pointerup', handlePointerUp);
                canvas.removeEventListener('pointercancel', handlePointerUp);
            }
        };
    }, [isDragging, lastClientX, lastClientY]);

    // Camera follow logic
    useFrame(() => {
        if (!characterRef.current || !cameraRef.current || !rigidBodyRef.current) return;

        const characterBody = rigidBodyRef.current;
        const characterPosition = characterBody.translation();
        const camera = cameraRef.current;

        // Calculate camera orientation
        const cameraOrientationAngle = cameraAngle + Math.PI;
        const yOffset = 2.5;

        // Calculate desired camera position
        const horizontalDistance = Math.cos(cameraVerticalAngle) * cameraDistance;
        const verticalDistance = Math.sin(cameraVerticalAngle) * cameraDistance;

        const desiredPosition = new THREE.Vector3(
            characterPosition.x + Math.sin(cameraOrientationAngle) * horizontalDistance,
            characterPosition.y + cameraHeight + verticalDistance,
            characterPosition.z + Math.cos(cameraOrientationAngle) * horizontalDistance
        );

        // Collision detection for camera
        const rayCastOffset = new THREE.Vector3(
            characterPosition.x,
            characterPosition.y + 2,
            characterPosition.z
        );
        const directionVec = new THREE.Vector3().subVectors(desiredPosition, rayCastOffset);
        const directionVecMag = directionVec.length();
        const directionVecNormalized = directionVec.normalize();

        raycaster.current.set(rayCastOffset, directionVecNormalized);
        raycaster.current.far = directionVecMag;

        // Find objects that can collide with camera (objects with camCollidable property)
        const collidableObjects = scene.children.filter(child =>
            (child as any).camCollidable || child.userData.camCollidable
        );

        // Check for intersections
        const intersects = raycaster.current.intersectObjects(collidableObjects, true);
        let finalPosition = desiredPosition.clone();

        if (intersects.length > 0) {
            const closestIntersect = intersects[0];
            if (closestIntersect.distance < directionVecMag) {
                finalPosition = rayCastOffset.clone().add(
                    directionVecNormalized.multiplyScalar(closestIntersect.distance - 0.1)
                );
            }
        }

        // Smoothly move camera to final position
        camera.position.lerp(finalPosition, smoothness);

        // Look at character
        camera.lookAt(
            characterPosition.x,
            characterPosition.y + yOffset,
            characterPosition.z
        );
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
                onUpdate={setDefaultCamera}
            />
        </>
    );
};

export default ThirdPersonCamera;