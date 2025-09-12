import React from "react";
import Image from "next/image";
import { Button } from "./button";
import { cn } from "@/lib/utils";

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
}: BannerProps) {
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
          variant="outline"
          onClick={secondaryAction.onClick}
        >
          {secondaryAction.label}
        </Button>
      </div>
    </div>
  );

  if (variant === "rightImage") {
    return (
      <div className={cn("flex flex-col-reverse lg:flex-row items-center gap-8 lg:gap-16 p-8", className)}>
        {/* Left Content (shows second on mobile, first on desktop) */}
        <div className="flex-1">
          {content}
        </div>
        
        {/* Right Image/Video (shows first on mobile, second on desktop) */}
        {(rightImage || backgroundVideo) && (
          <div className="flex-1 relative h-64 lg:h-96 w-full rounded-lg overflow-hidden bg-sidebar">
            {backgroundVideo ? (
              <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover rounded-lg"
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
      <div className={cn("relative bg-cover w-full min-h-[320px] sm:min-h-[30vh] lg:h-[50vh] rounded-xl flex items-center overflow-hidden border-3 border-sidebar", className)}
           style={{ 
             backgroundImage: backgroundImage && !backgroundVideo ? `url(${backgroundImage})` : undefined
           }}>
        {/* Video Background */}
        {backgroundVideo && (
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          >
            <source src={backgroundVideo} type="video/mp4" />
          </video>
        )}
        
        {/* Image Background (if no video) */}
        {backgroundImage && !backgroundVideo && (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
        )}
        
        {/* Dark overlay for dimming background */}
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
