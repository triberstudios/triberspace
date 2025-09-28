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
            console.log('Key down:', event.code);
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
}

export function useCharacterControls({
    characterRef,
    rigidBodyRef,
    cameraAngle
}: UseCharacterControlsProps) {
    const [animation, setAnimation] = useState('idle');
    const keys = useKeyboardControls();
    const [lastDesiredRotationAngle, setLastDesiredRotationAngle] = useState(0);

    // Movement parameters
    const walkSpeed = 5;
    const runSpeed = 8;
    const smoothness = 0.15;

    useFrame(() => {
        if (!characterRef.current || !rigidBodyRef.current) {
            console.log('useFrame: Missing refs', {
                hasCharacterRef: !!characterRef.current,
                hasRigidBodyRef: !!rigidBodyRef.current
            });
            return;
        }

        const character = characterRef.current;
        const rigidBody = rigidBodyRef.current;

        // Calculate movement direction
        let moveX = 0;
        let moveZ = 0;

        if (keys.up) moveZ += 1;
        if (keys.down) moveZ -= 1;
        if (keys.left) moveX -= 1;
        if (keys.right) moveX += 1;

        // Determine if character is moving
        const isMoving = moveX !== 0 || moveZ !== 0;
        const isRunning = keys.shift && isMoving;

        // Update animation based on movement
        if (!isMoving) {
            setAnimation('idle');
        } else if (isRunning) {
            setAnimation('run');
        } else {
            setAnimation('walk');
        }

        if (isMoving) {
            // Normalize movement vector
            const moveLength = Math.sqrt(moveX * moveX + moveZ * moveZ);
            moveX /= moveLength;
            moveZ /= moveLength;

            // Apply camera angle to movement direction
            const rotatedMoveX = moveX * Math.cos(cameraAngle) + moveZ * Math.sin(cameraAngle);
            const rotatedMoveZ = moveZ * Math.cos(cameraAngle) - moveX * Math.sin(cameraAngle);

            // Calculate speed
            const currentSpeed = isRunning ? runSpeed : walkSpeed;

            // Apply movement to rigid body
            const currentVelocity = rigidBody.linvel();
            rigidBody.setLinvel({
                x: rotatedMoveX * currentSpeed,
                y: currentVelocity.y, // Preserve vertical velocity for gravity/jumping
                z: rotatedMoveZ * currentSpeed
            }, true);

            // Calculate desired character rotation
            const desiredRotationAngle = Math.atan2(rotatedMoveX, rotatedMoveZ);

            // Smooth character rotation
            const angleDifference = desiredRotationAngle - lastDesiredRotationAngle;
            const adjustedAngleDifference = Math.atan2(Math.sin(angleDifference), Math.cos(angleDifference));
            const newRotationAngle = lastDesiredRotationAngle + adjustedAngleDifference * smoothness;

            setLastDesiredRotationAngle(newRotationAngle);

            // Apply rotation to character
            character.rotation.y = newRotationAngle;
        } else {
            // Stop horizontal movement when no input
            const currentVelocity = rigidBody.linvel();
            rigidBody.setLinvel({
                x: 0,
                y: currentVelocity.y,
                z: 0
            }, true);
        }
    });

    return {
        animation,
        isMoving: keys.up || keys.down || keys.left || keys.right,
        isRunning: keys.shift && (keys.up || keys.down || keys.left || keys.right)
    };
}