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
  rightImage?: string;
  className?: string;
}

function Banner({
  title = "Lorem Ipsum",
  subtitle = "Lorem Ipsum",
  description,
  primaryAction = { label: "Button", onClick: () => {} },
  secondaryAction = { label: "Button", onClick: () => {} },
  variant = "fullBackground",
  backgroundImage,
  rightImage,
  className,
}: BannerProps) {
  const content = (
    <div className="flex flex-col gap-6">
      {/* Text Content */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">{title}</h1>
        {subtitle && <span>{subtitle}</span>}
        {description && <p className="text-gray-300">{description}</p>}
      </div>

      {/* Button Group */}
      <div className="flex gap-3">
        <Button 
          type="button" 
          className="h-12 px-6"
          onClick={primaryAction.onClick}
        >
          {primaryAction.label}
        </Button>
        <Button 
          type="button" 
          className="h-12 px-6"
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
      <div className={cn("flex flex-col lg:flex-row items-center gap-8 lg:gap-16 p-8", className)}>
        {/* Left Content */}
        <div className="flex-1">
          {content}
        </div>
        
        {/* Right Image */}
        {rightImage && (
          <div className="flex-1 relative h-64 lg:h-96 w-full rounded-lg overflow-hidden bg-sidebar">
            <Image
              src={rightImage}
              alt={title}
              fill
              className="object-cover"
            />
          </div>
        )}
      </div>
    );
  }

  // Mini variant
  if (variant === "mini") {
    return (
      <div className={cn("relative bg-cover bg-center w-full h-[20vh] lg:h-[25vh] rounded-lg flex items-center", className)}
           style={{ backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined }}>
        {/* Dark overlay for better readability */}
        {backgroundImage && <div className="absolute inset-0 bg-black/40 rounded-lg" />}
        <div className="relative z-10 px-8 lg:px-16">
          {content}
        </div>
      </div>
    );
  }

  // Default: fullBackground variant
  return (
    <div>
      <div className={cn("bg-cover w-full h-[30vh] lg:h-[50vh] border rounded-lg flex items-center", className)}
           style={{ backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined }}>
        <div className="px-8 lg:px-16">
          {content}
        </div>
      </div>
    </div>
  );
}

export default Banner;
