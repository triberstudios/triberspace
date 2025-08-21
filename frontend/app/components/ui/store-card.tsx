"use client"

import { cn } from "@/lib/utils"

interface Store {
  id: number
  title: string
  creator: string
  price?: number
  points?: number
  image?: string
  type: string
  url?: string
}

interface StoreCardProps {
  store: Store
  className?: string
}

export function StoreCard({ store, className }: StoreCardProps) {
  const CardContent = (
    <div
      className={cn(
        "group relative flex w-full aspect-[4/3] flex-col cursor-pointer rounded-lg overflow-hidden bg-sidebar",
        className
      )}
    >
      {/* Full background image or pattern */}
      {store.image ? (
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${store.image})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-sidebar">
          {/* Diagonal stripe pattern to show blur effect */}
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

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 transition-all duration-300 group-hover:bg-black/20" />

      {/* Bottom text overlay with blur */}
      <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-1 p-4 backdrop-blur-lg bg-black/5 border-t border-white/10">
        {/* Store title */}
        <h3 className="text-white font-medium text-lg leading-tight">
          {store.title}
        </h3>
        
        {/* Creator name */}
        <p className="text-gray-300 text-sm">
          {store.creator}
        </p>
      </div>
    </div>
  )

  // If there's a URL, wrap in a link, otherwise just return the content
  if (store.url) {
    return (
      <a href={store.url} target="_blank" rel="noopener noreferrer" className="block w-full">
        {CardContent}
      </a>
    )
  }

  return CardContent
}