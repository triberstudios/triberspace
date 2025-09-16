"use client"

import { cn } from "@/lib/utils"

interface Experience {
  id: number
  title: string
  brand: string
  image?: string
  type: string
  url?: string
}

interface ExperienceCardProps {
  experience: Experience
  className?: string
}

export function ExperienceCard({ experience, className }: ExperienceCardProps) {
  const CardContent = (
    <div
      className={cn(
        "group flex w-full flex-col gap-2 cursor-pointer relative",
        className
      )}
    >
      {/* Hover background overlay */}
      <div className="absolute -inset-2 rounded-xl bg-white/0 transition-all duration-400 ease-out group-hover:bg-white/10 z-0" />
      {/* Card Image - 16:9 aspect ratio */}
      <div className="relative w-full aspect-video rounded-lg cursor-pointer overflow-hidden bg-card border border-white/1">
        {/* Background image when available */}
        {experience.image && (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${experience.image})` }}
          />
        )}
        
        {/* Preview placeholder when no image */}
        {!experience.image && (
          <div className="absolute inset-0 bg-sidebar">
            {/* Diagonal stripe pattern */}
            <div 
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  rgba(255, 255, 255, 0.1) 0px,
                  rgba(255, 255, 255, 0.1) 10px,
                  transparent 10px,
                  transparent 20px
                )`
              }}
            />
            {/* Preview text */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-sm text-white/40 font-medium">Preview Image</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content Box */}
      <div className="flex flex-col gap-0">
        <div className="text-foreground font-medium text-lg sm:text-xl cursor-pointer mb-0 leading-tight">
          {experience.title}
        </div>
        <div className="text-gray-500 font-medium text-sm sm:text-base cursor-pointer">
          {experience.brand}
        </div>
      </div>
    </div>
  )

  // If there's a valid URL (not empty, not "#"), wrap in a link, otherwise just return the content
  if (experience.url && experience.url !== "#") {
    return (
      <a href={experience.url} target="_blank" rel="noopener noreferrer" className="block w-full">
        {CardContent}
      </a>
    )
  }

  return CardContent
}