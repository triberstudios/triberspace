'use client';

import { useEffect } from 'react';

interface MediaMetadata {
    artistName?: string;
    artworkTitle?: string;
    year?: string;
    artType?: string;
    description?: string;
    earnPoints?: boolean;
    mediaUrl?: string;
    mediaType?: 'video' | 'image';
}

interface MediaMetadataModalProps {
    metadata: MediaMetadata;
    onClose: () => void;
}

export function MediaMetadataModal({ metadata, onClose }: MediaMetadataModalProps) {
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
                {metadata.mediaUrl && (
                    <div className="flex-shrink-0 w-1/2 bg-black flex items-center justify-center">
                        {metadata.mediaType === 'video' ? (
                            <video
                                src={metadata.mediaUrl}
                                controls
                                muted
                                className="w-full h-full object-contain"
                            >
                                Your browser does not support the video tag.
                            </video>
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
