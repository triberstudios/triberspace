'use client';

import { Suspense, useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Canvas } from '@react-three/fiber';
import { Physics, RigidBody } from '@react-three/rapier';
import ThirdPersonCamera from '@/components/runtime/ThirdPersonCamera';
import { StaticSceneLoader } from '@/components/runtime/StaticSceneLoader';
import { MediaMetadataModal } from '@/components/runtime/MediaMetadataModal';
import MobileJoystick from '@/components/runtime/MobileJoystick';
import { PartyKitProvider } from '@/contexts/multiplayer/PartyKitContext';
import { MultiplayerManager } from '@/components/multiplayer/MultiplayerManager';
import { toast } from 'sonner';
import { Trophy } from '@phosphor-icons/react';

interface SpaceData {
    id: string;
    name: string;
    description: string | null;
    sceneDataUrl: string;
    creator: {
        id: string;
        username: string;
    };
    worlds: Array<{
        id: string;
        slug: string;
        name: string;
    }>;
}

export default function SpaceViewer() {
    const params = useParams();
    const spaceId = params.spaceId as string;

    const [spaceData, setSpaceData] = useState<SpaceData | null>(null);
    const [metadataModal, setMetadataModal] = useState<any>(null);
    const [clickedObjects, setClickedObjects] = useState<Set<string>>(new Set());
    const [isLoadingSpace, setIsLoadingSpace] = useState(true);
    const [isLoadingScene, setIsLoadingScene] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch space metadata from API
    useEffect(() => {
        const fetchSpace = async () => {
            try {
                setIsLoadingSpace(true);
                const response = await fetch(`http://localhost:3001/api/v1/spaces/${spaceId}`);

                if (!response.ok) {
                    if (response.status === 404) {
                        setError('Space not found');
                    } else {
                        setError('Failed to load space');
                    }
                    return;
                }

                const result = await response.json();
                if (result.success && result.data.space) {
                    setSpaceData(result.data.space);
                } else {
                    setError('Invalid space data');
                }
            } catch (err) {
                console.error('Failed to fetch space:', err);
                setError('Failed to load space');
            } finally {
                setIsLoadingSpace(false);
            }
        };

        fetchSpace();
    }, [spaceId]);

    const handleLoadingChange = (loading: boolean) => {
        setIsLoadingScene(loading);
    };

    const handleMetadataClick = (metadata: any) => {
        // Generate a unique key for this object
        const objectKey = metadata.title || `${metadata.artist}-${metadata.year}`;

        // Only show toast if this object hasn't been clicked before
        if (!clickedObjects.has(objectKey)) {
            toast.success('+10 Points', {
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

    // Show error state
    if (error) {
        return (
            <div className="w-full h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <p className="text-white text-xl">{error}</p>
                    <a href="/" className="text-white/60 hover:text-white underline">
                        Return home
                    </a>
                </div>
            </div>
        );
    }

    // Show loading state while fetching space metadata
    if (isLoadingSpace || !spaceData) {
        return (
            <div className="w-full h-screen bg-black flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                    <p className="text-white text-sm">Loading space...</p>
                </div>
            </div>
        );
    }

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
                <PartyKitProvider spaceId={spaceId}>
                    <Physics gravity={[0, -30, 0]}>
                        {/* Ground plane with physics */}
                        <RigidBody type="fixed">
                            <mesh receiveShadow position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                                <planeGeometry args={[50, 50]} />
                                <meshStandardMaterial color="#444444" visible={false} />
                            </mesh>
                        </RigidBody>

                        {/* Character and Camera */}
                        <ThirdPersonCamera
                            initialPosition={[-10.677, 1, -0.324]}
                            characterColor="#4080ff"
                            initialCameraAngle={1.5215926535898001}
                        />

                        {/* Multiplayer - Other players */}
                        <MultiplayerManager />

                        {/* Load Scene from CDN */}
                        <Suspense fallback={<LoadingIndicator />}>
                            <StaticSceneLoader
                                sceneJsonPath={spaceData.sceneDataUrl}
                                onMetadataClick={handleMetadataClick}
                                onLoadingChange={handleLoadingChange}
                            />
                        </Suspense>
                    </Physics>
                </PartyKitProvider>
            </Canvas>

            {/* Loading Screen */}
            {isLoadingScene && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                        <p className="text-white text-sm">Loading {spaceData.name}...</p>
                    </div>
                </div>
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
