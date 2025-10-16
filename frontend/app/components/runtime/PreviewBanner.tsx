'use client';

interface PreviewBannerProps {
    onLearnMoreClick: () => void;
}

export function PreviewBanner({ onLearnMoreClick }: PreviewBannerProps) {
    return (
        <div className="fixed top-0 left-0 right-0 z-40 bg-black/50 backdrop-blur-md">
            <div className="flex items-center justify-center h-12 gap-2 px-4">
                <span className="text-sm text-white">This is a preview</span>
                <button
                    onClick={onLearnMoreClick}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                >
                    Learn more
                </button>
            </div>
        </div>
    );
}
