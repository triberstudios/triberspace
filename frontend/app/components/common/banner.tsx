import React from "react";
import Image from "next/image";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

interface BannerProps {
  title?: string;
  subtitle?: string;
  description?: string;
  primaryAction?: {
    label: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
  };
  variant?: "fullBackground" | "rightImage" | "mini";
  backgroundImage?: string;
  backgroundVideo?: string;
  rightImage?: string;
  className?: string;
  showOverlay?: boolean;
  overlayOpacity?: number;
  baseBackground?: string; // Can be a color (e.g., "#000000") or image path (e.g., "/bgGif.gif")
  baseOverlayOpacity?: number; // Opacity for the overlay on base background (0-100)
}

function Banner({
  title = "Lorem Ipsum",
  subtitle = "Lorem Ipsum",
  description,
  primaryAction = { label: "Button", onClick: () => {} },
  secondaryAction = { label: "Button", onClick: () => {} },
  variant = "fullBackground",
  backgroundImage,
  backgroundVideo,
  rightImage,
  className,
  showOverlay = false,
  overlayOpacity = 80,
  baseBackground,
  baseOverlayOpacity = 85,
}: BannerProps) {
  const router = useRouter();
  const content = (
    <div className="flex flex-col gap-6 sm:gap-6">
      {/* Text Content */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-semibold text-sidebar-foreground">{title}</h1>
        {subtitle && <span className="text-sm sm:text-base text-sidebar-foreground">{subtitle}</span>}
        {description && <p className="text-sm sm:text-base text-gray-300">{description}</p>}
      </div>

      {/* Button Group - Stack on mobile, inline on desktop */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button 
          type="button" 
          className="h-12 px-6 w-full sm:w-auto"
          onClick={primaryAction.onClick}
        >
          {primaryAction.label}
        </Button>
        <Button 
          type="button" 
          className="h-12 px-6 w-full sm:w-auto"
          variant="secondary"
          onClick={secondaryAction.onClick}
        >
          {secondaryAction.label}
        </Button>
      </div>
    </div>
  );

  if (variant === "rightImage") {
    return (
      <div className={cn("border-3 border-sidebar rounded-xl overflow-hidden bg-sidebar relative", className)}>
        {/* Base background layer - can be color or image */}
        {baseBackground && (
          baseBackground.startsWith('#') || baseBackground.startsWith('rgb') ? (
            <div 
              className="absolute inset-0"
              style={{ backgroundColor: baseBackground }}
            />
          ) : (
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${baseBackground})` }}
            />
          )
        )}
        
        {/* Base background overlay */}
        {baseBackground && (
          <div 
            className="absolute inset-0" 
            style={{ backgroundColor: `rgba(0, 0, 0, ${baseOverlayOpacity / 100})` }}
          />
        )}
        
        <div className="flex flex-col lg:flex-row gap-0 relative">
          {/* Video/Image (shows first on mobile via order) */}
          {(rightImage || backgroundVideo) && (
            <div className="w-full lg:flex-1 relative h-48 sm:h-64 lg:h-96 bg-transparent order-1 lg:order-2 overflow-hidden rounded-t-xl lg:rounded-t-none lg:rounded-r-xl">
              {backgroundVideo ? (
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  webkit-playsinline="true"
                  preload="metadata"
                  disablePictureInPicture
                  className="w-full h-full object-cover"
                >
                  <source src={backgroundVideo} type="video/mp4" />
                </video>
              ) : rightImage ? (
                <Image
                  src={rightImage}
                  alt={title}
                  fill
                  className="object-cover"
                />
              ) : null}
            </div>
          )}
          
          {/* Content (shows second on mobile via order) */}
          <div className="w-full lg:flex-1 px-6 py-6 sm:px-8 sm:py-8 lg:px-16 lg:py-8 order-2 lg:order-1 flex items-center">
            {content}
          </div>
        </div>
      </div>
    );
  }

  // Mini variant
  if (variant === "mini") {
    return (
      <div className={cn("relative bg-cover bg-center w-full min-h-[280px] sm:min-h-[200px] lg:h-[25vh] rounded-lg flex items-center overflow-hidden", className)}
           style={{ backgroundImage: backgroundImage && !backgroundVideo ? `url(${backgroundImage})` : undefined }}>
        {/* Video Background */}
        {backgroundVideo && (
          <video
            autoPlay
            loop
            muted
            playsInline
            webkit-playsinline="true"
            preload="metadata"
            disablePictureInPicture
            className="absolute inset-0 w-full h-full object-cover rounded-lg"
          >
            <source src={backgroundVideo} type="video/mp4" />
          </video>
        )}
        
        {/* Dark overlay for better readability */}
        {(backgroundImage || backgroundVideo) && <div className="absolute inset-0 bg-black/40 rounded-lg" />}
        <div className="relative z-10 w-full py-8 px-4 sm:px-8 lg:px-16">
          {content}
        </div>
      </div>
    );
  }

  // Default: fullBackground variant
  return (
    <div>
      <div className={cn("relative bg-cover w-full min-h-[320px] sm:min-h-[30vh] lg:h-[50vh] rounded-xl flex items-center overflow-hidden border-3 border-sidebar", className)}>
        {/* Base background layer - can be color or image */}
        {baseBackground && (
          baseBackground.startsWith('#') || baseBackground.startsWith('rgb') ? (
            <div 
              className="absolute inset-0"
              style={{ backgroundColor: baseBackground }}
            />
          ) : (
            <div 
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${baseBackground})` }}
            />
          )
        )}
        
        {/* Base background overlay */}
        {baseBackground && (
          <div 
            className="absolute inset-0" 
            style={{ backgroundColor: `rgba(0, 0, 0, ${baseOverlayOpacity / 100})` }}
          />
        )}
        
        {/* Video Background (on top of base + overlay) */}
        {backgroundVideo && (
          <video
            autoPlay
            loop
            muted
            playsInline
            webkit-playsinline="true"
            preload="metadata"
            disablePictureInPicture
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={backgroundVideo} type="video/mp4" />
          </video>
        )}
        
        {/* Image Background (if no video, on top of base + overlay) */}
        {backgroundImage && !backgroundVideo && (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
        )}
        
        {/* Additional overlay for dimming video/image if needed */}
        {showOverlay && (backgroundImage || backgroundVideo) && (
          <div 
            className="absolute inset-0" 
            style={{ backgroundColor: `rgba(0, 0, 0, ${overlayOpacity / 100})` }}
          />
        )}
        
        <div className="relative z-10 w-full py-8 px-4 sm:px-8 lg:px-16">
          {content}
        </div>
      </div>
    </div>
  );
}

export default Banner;
