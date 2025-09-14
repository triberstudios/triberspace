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
      <div className="absolute -inset-2 rounded-xl bg-white/0 transition-all duration-400 ease-out group-hover:bg-sidebar/50 -z-10" />
      {/* Card Image - 16:9 aspect ratio */}
      <div className="relative w-full aspect-video rounded-lg cursor-pointer overflow-hidden bg-sidebar border border-white/1">
        {/* Background image when available */}
        {experience.image && (
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${experience.image})` }}
          />
        )}
        
        {/* Preview placeholder when no image */}
        {!experience.image && (
          <div className="absolute inset-0 flex h-full items-center justify-center">
            <div className="text-center">
              {/* <div className="mb-2 text-4xl">🎨</div> */}
              <p className="text-sm text-white/60">Preview Image</p>
            </div>
          </div>
        )}
      </div>

      {/* Content Box */}
      <div className="flex flex-col gap-0">
        <div className="text-sidebar-foreground font-medium text-lg sm:text-xl cursor-pointer mb-0 leading-tight">
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