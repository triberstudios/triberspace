'use client';

import { Suspense, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics, RigidBody } from '@react-three/rapier';
import ThirdPersonCamera from '@/components/runtime/ThirdPersonCamera';
import { StaticSceneLoader } from '@/components/runtime/StaticSceneLoader';
import { NavMeshCollider } from '@/components/runtime/NavMeshCollider';
import { MediaMetadataModal } from '@/components/runtime/MediaMetadataModal';
import { PreviewWelcomeModal } from '@/components/runtime/PreviewWelcomeModal';
import { PreviewBanner } from '@/components/runtime/PreviewBanner';
import MobileJoystick from '@/components/runtime/MobileJoystick';
import { toast } from 'sonner';
import { Trophy } from '@phosphor-icons/react';

export default function BelovedExperience() {
    const [metadataModal, setMetadataModal] = useState<any>(null);
    const [clickedObjects, setClickedObjects] = useState<Set<string>>(new Set());
    const [showWelcomeModal, setShowWelcomeModal] = useState(false);

    // Check if user has seen the welcome modal before
    useEffect(() => {
        const hasSeenWelcome = localStorage.getItem('beloved-preview-seen');
        if (!hasSeenWelcome) {
            setShowWelcomeModal(true);
        }
    }, []);

    const handleCloseWelcomeModal = () => {
        setShowWelcomeModal(false);
        localStorage.setItem('beloved-preview-seen', 'true');
    };

    const handleMetadataClick = (metadata: any) => {
        // Generate a unique key for this object (using title or a combination of fields)
        const objectKey = metadata.title || `${metadata.artist}-${metadata.year}`;

        // Only show toast if this object hasn't been clicked before
        if (!clickedObjects.has(objectKey)) {
            toast.success('+10 Beloved. Points', {
                description: 'Points earned for exploring',
                icon: <Trophy size={20} weight="fill" />,
                duration: 3000,
                position: 'top-center',
            });

            // Mark this object as clicked
            setClickedObjects(prev => new Set(prev).add(objectKey));
        }

        // Always open metadata modal
        setMetadataModal(metadata);
    };

    return (
        <div className="w-full h-screen bg-black">
            {/* 3D Canvas */}
            <Canvas
                shadows
                gl={{
                    antialias: true,
                    alpha: false,
                    powerPreference: 'high-performance'
                }}
            >
                <Physics gravity={[0, -30, 0]}>
                    {/* Ground plane with physics */}
                    <RigidBody type="fixed">
                        <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                            <planeGeometry args={[50, 50]} />
                            <meshStandardMaterial color="#444444" visible={false} />
                        </mesh>
                    </RigidBody>

                    {/* NavMesh Colliders - invisible walls and objects */}
                    <Suspense fallback={null}>
                        <NavMeshCollider modelPath="/models/beloved-navmesh.glb" />
                    </Suspense>

                    {/* Character and Camera */}
                    <ThirdPersonCamera
                        initialPosition={[-10.677, 1, -0.324]}
                        characterColor="#4080ff"
                        initialCameraAngle={1.5215926535898001}
                    />

                    {/* Load Scene from Static JSON */}
                    <Suspense fallback={<LoadingIndicator />}>
                        <StaticSceneLoader
                            sceneJsonPath="/scenes/beloved.json"
                            onMetadataClick={handleMetadataClick}
                        />
                    </Suspense>
                </Physics>
            </Canvas>

            {/* Preview Banner */}
            <PreviewBanner onLearnMoreClick={() => setShowWelcomeModal(true)} />

            {/* Welcome Modal */}
            {showWelcomeModal && (
                <PreviewWelcomeModal onClose={handleCloseWelcomeModal} />
            )}

            {/* Metadata Modal */}
            {metadataModal && (
                <MediaMetadataModal
                    metadata={metadataModal}
                    onClose={() => setMetadataModal(null)}
                />
            )}

            {/* Mobile Joystick */}
            <MobileJoystick />
        </div>
    );
}

// Loading indicator for scene content
function LoadingIndicator() {
    return (
        <mesh position={[0, 1, 0]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#888" wireframe />
        </mesh>
    );
}
