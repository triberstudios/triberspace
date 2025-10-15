'use client';

import { useEffect, useRef } from 'react';

interface MediaMetadata {
    artistName?: string;
    artworkTitle?: string;
    year?: string;
    artType?: string;
    description?: string;
    earnPoints?: boolean;
    videoElement?: HTMLVideoElement; // For videos - use the actual element for sync
    mediaUrl?: string; // For images
    mediaType?: 'video' | 'image';
}

interface MediaMetadataModalProps {
    metadata: MediaMetadata;
    onClose: () => void;
}

export function MediaMetadataModal({ metadata, onClose }: MediaMetadataModalProps) {
    const syncedVideoRef = useRef<HTMLVideoElement>(null);

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

    // Create and sync a video element for modal display
    useEffect(() => {
        if (metadata.videoElement && syncedVideoRef.current) {
            const originalVideo = metadata.videoElement;
            const modalVideo = syncedVideoRef.current;

            // Set source from original video
            modalVideo.src = originalVideo.src || originalVideo.currentSrc;
            modalVideo.muted = true;

            // Initial sync
            modalVideo.currentTime = originalVideo.currentTime;

            // Start playing if original is playing
            if (!originalVideo.paused) {
                modalVideo.play().catch(err => console.log('Modal video autoplay prevented:', err));
            }

            // Keep videos synced
            let syncInterval: number;
            const syncVideos = () => {
                if (modalVideo && originalVideo) {
                    // Sync currentTime
                    const timeDiff = Math.abs(modalVideo.currentTime - originalVideo.currentTime);
                    if (timeDiff > 0.3) { // If more than 300ms out of sync
                        modalVideo.currentTime = originalVideo.currentTime;
                    }

                    // Sync play/pause state
                    if (originalVideo.paused && !modalVideo.paused) {
                        modalVideo.pause();
                    } else if (!originalVideo.paused && modalVideo.paused) {
                        modalVideo.play().catch(() => {});
                    }
                }
            };

            // Sync every 100ms for smooth playback
            syncInterval = setInterval(syncVideos, 100) as unknown as number;

            // Cleanup
            return () => {
                clearInterval(syncInterval);
                if (modalVideo) {
                    modalVideo.pause();
                    modalVideo.src = '';
                }
            };
        }
    }, [metadata.videoElement]);

    // Check if we have any metadata to display
    const hasMetadata = metadata.artistName || metadata.artworkTitle ||
                       metadata.year || metadata.artType || metadata.description;

    if (!hasMetadata) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                 onClick={onClose}>
                <div className="bg-neutral-900 rounded-lg p-8 max-w-md w-full mx-4"
                     onClick={(e) => e.stopPropagation()}>
                    <div className="text-center text-white/60">
                        No metadata available for this media object.
                    </div>
                    <button
                        onClick={onClose}
                        className="mt-6 w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-md transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
             onClick={onClose}>
            <div className="bg-neutral-900 rounded-lg max-w-3xl w-full shadow-xl max-h-[90vh] overflow-y-auto flex"
                 onClick={(e) => e.stopPropagation()}>
                {/* Media Preview - Left Side */}
                {(metadata.videoElement || metadata.mediaUrl) && (
                    <div className="flex-shrink-0 w-1/2 bg-black flex items-center justify-center relative">
                        {metadata.mediaType === 'video' ? (
                            <>
                                <video
                                    ref={syncedVideoRef}
                                    muted
                                    className="w-full h-full object-contain"
                                />
                                {/* Fullscreen button */}
                                <button
                                    onClick={() => syncedVideoRef.current?.requestFullscreen()}
                                    className="absolute bottom-4 right-4 bg-black/70 hover:bg-black/90 p-3 rounded-lg transition-colors cursor-pointer"
                                    aria-label="Fullscreen"
                                >
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                    </svg>
                                </button>
                            </>
                        ) : (
                            <img
                                src={metadata.mediaUrl}
                                alt={metadata.artworkTitle || 'Media preview'}
                                className="w-full h-full object-contain"
                            />
                        )}
                    </div>
                )}

                {/* Content - Right Side */}
                <div className="flex-1 p-6 flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-medium text-white">Media Information</h2>
                        <button
                            onClick={onClose}
                            className="text-white/60 hover:text-white transition-colors"
                            aria-label="Close"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Metadata Content */}
                    <div className="space-y-3 flex-1">
                        {metadata.artworkTitle && (
                            <div>
                                <div className="text-xs text-white/60 mb-0.5">Artwork title</div>
                                <div className="text-sm text-white">{metadata.artworkTitle}</div>
                            </div>
                        )}

                        {metadata.artistName && (
                            <div>
                                <div className="text-xs text-white/60 mb-0.5">Artist name</div>
                                <div className="text-sm text-white">{metadata.artistName}</div>
                            </div>
                        )}

                        {metadata.year && (
                            <div>
                                <div className="text-xs text-white/60 mb-0.5">Year</div>
                                <div className="text-sm text-white">{metadata.year}</div>
                            </div>
                        )}

                        {metadata.artType && (
                            <div>
                                <div className="text-xs text-white/60 mb-0.5">Type of art</div>
                                <div className="text-sm text-white">{metadata.artType}</div>
                            </div>
                        )}

                        {metadata.description && (
                            <div>
                                <div className="text-xs text-white/60 mb-0.5">Description</div>
                                <div className="text-sm text-white whitespace-pre-wrap">{metadata.description}</div>
                            </div>
                        )}
                    </div>

                    {/* Action Button */}
                    <div className="mt-4">
                        {metadata.earnPoints ? (
                            <button
                                onClick={onClose}
                                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
                            >
                                Complete
                            </button>
                        ) : (
                            <button
                                onClick={onClose}
                                className="w-full px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-md transition-colors"
                            >
                                Close
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
