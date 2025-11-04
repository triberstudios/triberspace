'use client';

import { useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Keyboard controls hook
function useKeyboardControls() {
    const [keys, setKeys] = useState({
        up: false,
        down: false,
        left: false,
        right: false,
        shift: false
    });

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            switch (event.code) {
                case 'KeyW':
                case 'ArrowUp':
                    setKeys(prev => ({ ...prev, up: true }));
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    setKeys(prev => ({ ...prev, down: true }));
                    break;
                case 'KeyA':
                case 'ArrowLeft':
                    setKeys(prev => ({ ...prev, left: true }));
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    setKeys(prev => ({ ...prev, right: true }));
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    setKeys(prev => ({ ...prev, shift: true }));
                    break;
            }
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            switch (event.code) {
                case 'KeyW':
                case 'ArrowUp':
                    setKeys(prev => ({ ...prev, up: false }));
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    setKeys(prev => ({ ...prev, down: false }));
                    break;
                case 'KeyA':
                case 'ArrowLeft':
                    setKeys(prev => ({ ...prev, left: false }));
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    setKeys(prev => ({ ...prev, right: false }));
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    setKeys(prev => ({ ...prev, shift: false }));
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    return keys;
}

interface UseCharacterControlsProps {
    characterRef: React.RefObject<THREE.Group>;
    rigidBodyRef: React.RefObject<any>;
    cameraAngle: number;
    setCameraAngle: (angle: number | ((prevAngle: number) => number)) => void;
    joystickData?: { angle: number; force: number } | null;
}

export function useCharacterControls({
    characterRef,
    rigidBodyRef,
    cameraAngle,
    setCameraAngle,
    joystickData
}: UseCharacterControlsProps) {
    const [animation, setAnimation] = useState('idle');
    const keys = useKeyboardControls();
    const [lastDesiredRotationAngle, setLastDesiredRotationAngle] = useState(cameraAngle);
    const currentRotationRef = useRef(cameraAngle); // Track actual character rotation

    // Movement parameters
    const walkSpeed = 5;
    const runSpeed = 8;
    const smoothness = 0.15;

    useFrame(() => {
        if (!characterRef.current || !rigidBodyRef.current) {
            // Character refs not ready yet
            return;
        }

        let desiredRotationAngle = 0;
        const movementSpeed = 7; // V2World speed
        const rotationSpeed = 0.03; // V2World rotation speed
        const character = characterRef.current;
        const rigidBody = rigidBodyRef.current;
        let isMoving = false;

        // Handle joystick input (mobile)
        if (joystickData && joystickData.force > 0.1) {
            const maxForce = 1;
            const joystickAngle = joystickData.angle - Math.PI / 2;
            const clampedForce = Math.min(joystickData.force, maxForce);

            // Calculate movement direction based on joystick angle + camera angle
            const moveDirection = new THREE.Vector3(
                Math.sin(joystickAngle + cameraAngle),
                0,
                Math.cos(joystickAngle + cameraAngle)
            );

            rigidBody.setLinvel({
                x: moveDirection.x * movementSpeed * clampedForce,
                y: 0,
                z: moveDirection.z * movementSpeed * clampedForce
            }, true);

            desiredRotationAngle = joystickAngle + cameraAngle;
            setLastDesiredRotationAngle(desiredRotationAngle);
            isMoving = true;
        }
        // Handle keyboard input (desktop)
        else if (keys.up || keys.down || keys.left || keys.right) {
            // Handle left and right rotation (LEFT/RIGHT keys)
            if (keys.left || keys.right) {
                const rotationDirection = keys.left ? 1 : -1;
                setCameraAngle(cameraAngle + rotationSpeed * rotationDirection);
            }

            // Determine the desired rotation angle based on keyboard input
            desiredRotationAngle = keys.up
                ? cameraAngle
                : keys.down
                ? cameraAngle + Math.PI
                : lastDesiredRotationAngle;

            // Update the last desired rotation angle for smooth transitions
            if (keys.up || keys.down) {
                setLastDesiredRotationAngle(desiredRotationAngle);
            }

            // Calculate movement direction from desiredRotationAngle (not character quaternion)
            // This ensures straight-line movement while visual rotation smoothly catches up
            // Uses same coordinate system as joystick for consistency
            const forward = new THREE.Vector3(
                Math.sin(desiredRotationAngle),
                0,
                Math.cos(desiredRotationAngle)
            );

            // Handle forward and backward movement (UP/DOWN keys)
            if (keys.up || keys.down) {
                // Apply velocity directly (same as joystick, no negation needed)
                rigidBody.setLinvel({
                    x: forward.x * movementSpeed,
                    y: 0,
                    z: forward.z * movementSpeed
                }, true);
            } else {
                // Stop movement if neither forward nor backward keys are pressed
                rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
            }

            isMoving = keys.up || keys.down;
        }
        // No input - stop movement
        else {
            rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
            desiredRotationAngle = lastDesiredRotationAngle;
        }

        // Apply smooth rotation to the character visual (decoupled from movement)
        const targetQuaternion = new THREE.Quaternion();
        targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), desiredRotationAngle);

        const currentQuat = character.quaternion.clone();
        currentQuat.slerp(targetQuaternion, 0.15); // Smooth rotation lerp
        character.quaternion.copy(currentQuat);

        // Store the actual character rotation for multiplayer sync
        currentRotationRef.current = desiredRotationAngle;

        // Update the animation state based on movement (only idle/walk, no run)
        const animationState = isMoving ? 'walk' : 'idle';

        if (animation !== animationState) {
            setAnimation(animationState);
        }
    });

    return {
        animation,
        rotation: currentRotationRef.current, // Actual character rotation for multiplayer
        isMoving: keys.up || keys.down,
        isRunning: false // V2World doesn't have running
    };
}