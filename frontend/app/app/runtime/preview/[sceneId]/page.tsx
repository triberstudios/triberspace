'use client';

import { Suspense, useState, use } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { Physics, RigidBody } from '@react-three/rapier';
import { SceneLoader, SceneDebugInfo } from '@/components/runtime/SceneLoader';
import ThirdPersonCamera from '@/components/runtime/ThirdPersonCamera';
import { MediaMetadataModal } from '@/components/runtime/MediaMetadataModal';

interface PreviewPageProps {
    params: Promise<{
        sceneId: string;
    }>;
}

export default function PreviewPage({ params }: PreviewPageProps) {
    const { sceneId } = use(params);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sceneData, setSceneData] = useState<any>(null);
    const [metadataModal, setMetadataModal] = useState<any>(null);

    return (
        <div className="w-full h-screen bg-black">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-black/50 backdrop-blur-sm border-b border-white/10">
                <div className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-3">
                        <h1 className="text-white font-medium">Preview Mode</h1>
                        <span className="text-white/60 text-sm">Scene: {sceneId}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.close()}
                            className="px-3 py-1.5 text-sm text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-md transition-colors"
                        >
                            Close Preview
                        </button>
                    </div>
                </div>
            </div>

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
                    {/* Lighting - Commented out to respect editor lighting design */}
                    {/* <ambientLight intensity={0.6} />
                    <directionalLight
                        position={[10, 10, 5]}
                        intensity={1.5}
                        castShadow
                        shadow-mapSize={[2048, 2048]}
                        shadow-camera-far={50}
                        shadow-camera-left={-10}
                        shadow-camera-right={10}
                        shadow-camera-top={10}
                        shadow-camera-bottom={-10}
                    />
                    <pointLight position={[5, 5, 5]} intensity={0.5} />
                    <pointLight position={[-5, 5, -5]} intensity={0.5} /> */}

                    {/* Ground plane with physics */}
                    <RigidBody type="fixed">
                        <mesh receiveShadow position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                            <planeGeometry args={[50, 50]} />
                            <meshStandardMaterial color="#444444" />
                        </mesh>
                    </RigidBody>


                    {/* Character and Camera */}
                    <ThirdPersonCamera
                        initialPosition={[0, 1, 0]}
                        characterColor="#4080ff"
                    />

                    {/* Scene Content */}
                    <Suspense fallback={<LoadingIndicator />}>
                        <SceneLoader
                            sceneId={sceneId}
                            onLoadingChange={setIsLoading}
                            onError={setError}
                            onSceneDataChange={setSceneData}
                            onMetadataClick={setMetadataModal}
                        />
                    </Suspense>

                    {/* Development Stats */}
                    {process.env.NODE_ENV === 'development' && <Stats />}
                </Physics>
            </Canvas>

            {/* Loading overlay */}
            {isLoading && <LoadingOverlay sceneId={sceneId} />}

            {/* Error overlay */}
            {error && <ErrorOverlay error={error} onRetry={() => window.location.reload()} />}

            {/* Controls instructions */}
            {!isLoading && !error && (
                <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-sm text-white p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Controls</h3>
                    <div className="text-sm space-y-1">
                        <div>WASD / Arrow Keys: Move</div>
                        <div>Shift: Run</div>
                        <div>Mouse Drag: Camera</div>
                    </div>
                </div>
            )}

            {/* Debug info */}
            <SceneDebugInfo sceneData={sceneData} />

            {/* Metadata Modal */}
            {metadataModal && (
                <MediaMetadataModal
                    metadata={metadataModal}
                    onClose={() => setMetadataModal(null)}
                />
            )}
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

// Loading overlay component
function LoadingOverlay({ sceneId }: { sceneId: string }) {
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm z-50">
            <div className="text-center">
                <div className="animate-spin w-12 h-12 border-2 border-white/30 border-t-white rounded-full mx-auto mb-6"></div>
                <p className="text-white text-xl font-medium mb-2">Loading Scene</p>
                <p className="text-white/60 text-sm mb-4">Scene ID: {sceneId}</p>
                <p className="text-white/40 text-xs">This may take a moment...</p>
            </div>
        </div>
    );
}

// Error overlay component
function ErrorOverlay({ error, onRetry }: { error: string; onRetry: () => void }) {
    return (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm z-50">
            <div className="text-center max-w-md mx-auto p-6">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                </div>
                <h2 className="text-white text-xl font-medium mb-3">Scene Load Error</h2>
                <p className="text-white/80 text-sm mb-6">{error}</p>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={onRetry}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors"
                    >
                        Retry
                    </button>
                    <button
                        onClick={() => window.close()}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-md transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}