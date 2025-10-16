'use client';

import { useEffect, useState } from 'react';

interface PreviewWelcomeModalProps {
    onClose: () => void;
}

export function PreviewWelcomeModal({ onClose }: PreviewWelcomeModalProps) {
    const [isMobile, setIsMobile] = useState(false);

    // Check if mobile
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
             onClick={onClose}>
            <div className="bg-neutral-900 rounded-lg max-w-md w-full shadow-xl"
                 onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-white/10">
                    <h2 className="text-2xl font-semibold text-white mb-3">This is a preview</h2>
                    <div className="flex flex-col gap-2">
                        <p className="text-sm text-white/80">The following features are currently disabled:</p>
                        <ul className="list-disc list-inside text-sm text-white/60 flex flex-col gap-1">
                            <li>Multiplayer</li>
                            <li>Text chat</li>
                            <li>Voice chat</li>
                        </ul>
                    </div>
                </div>

                {/* Instructions */}
                <div className="p-6 flex flex-col gap-4">
                    <div>
                        <h3 className="text-lg font-medium text-white mb-3">How to explore</h3>
                        <div className="flex flex-col gap-3">
                            {isMobile ? (
                                <div className="flex flex-col gap-2">
                                    <div className="text-sm text-white/80">
                                        <span className="font-medium text-white">Move:</span> Use joystick in bottom-left corner
                                    </div>
                                    <div className="text-sm text-white/80">
                                        <span className="font-medium text-white">Rotate camera:</span> Drag anywhere on screen
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <div className="text-sm text-white/80">
                                        <span className="font-medium text-white">Move:</span> Use WASD or arrow keys
                                    </div>
                                    <div className="text-sm text-white/80">
                                        <span className="font-medium text-white">Rotate camera:</span> Click and drag
                                    </div>
                                </div>
                            )}
                            <div className="text-sm text-white/80">
                                <span className="font-medium text-white">Interact:</span> Click on artworks to learn more and earn points
                            </div>
                        </div>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-3 bg-white hover:bg-white/90 text-black text-sm font-medium rounded-md transition-colors cursor-pointer"
                    >
                        Get started
                    </button>
                </div>
            </div>
        </div>
    );
}
