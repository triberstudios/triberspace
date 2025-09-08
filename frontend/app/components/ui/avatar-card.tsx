"use client"

import { Check, Play } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"

interface AvatarData {
  id: string
  name: string
  image: string | null
  modelPath: string
}

interface OutfitData {
  id: string
  name: string
  image: string
  modelPath: string | null
}

interface EmoteData {
  id: string
  name: string
  animationName: string
  image?: string | null
}

interface AvatarCardProps {
  // Core data
  item: AvatarData | OutfitData | EmoteData
  type: 'avatar' | 'outfit' | 'emotes'
  
  // Selection state
  isSelected: boolean
  onSelect: () => void
  
  // Emote-specific props
  onPlayEmote?: (animationName: string) => void
  selectionLimit?: boolean
  
  // Styling
  className?: string
}

export function AvatarCard({ 
  item, 
  type, 
  isSelected, 
  onSelect, 
  onPlayEmote, 
  selectionLimit = false,
  className 
}: AvatarCardProps) {
  const itemTitle = item.name
  const backgroundImage = ('image' in item ? item.image : null) || ""

  return (
    <div
      className={cn(
        "relative aspect-square cursor-pointer rounded-lg border transition-all hover:border-white/20 hover:bg-white/10 min-h-[44px] w-44 lg:w-auto flex-shrink-0 overflow-hidden group",
        isSelected 
          ? 'border-white/40 bg-white/20' 
          : 'border-white/10 bg-white/5',
        className
      )}
      onClick={onSelect}
    >
      {/* Background Image or Pattern */}
      {backgroundImage ? (
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${backgroundImage})` }}
        />
      ) : (
        <div className="absolute inset-0 bg-white/5">
          {/* Diagonal stripe pattern for empty items */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `repeating-linear-gradient(
                45deg,
                rgba(255, 255, 255, 0.1) 0px,
                rgba(255, 255, 255, 0.1) 8px,
                transparent 8px,
                transparent 16px
              )`
            }}
          />
        </div>
      )}
      
      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-black/0 transition-all duration-300 group-hover:bg-black/20" />
      
      {/* Selection Indicator - Empty circle or checkmark */}
      {type === "emotes" && (
        <div className={`absolute top-2 right-2 w-6 h-6 backdrop-blur-sm rounded-full flex items-center justify-center border ${
          isSelected ? 'bg-white/20 border-white/30' : 'bg-white/5 border-white/20'
        }`}>
          {isSelected && <Check className="w-4 h-4 text-white" weight="bold" />}
        </div>
      )}
      
      {/* Selected State Checkmark for non-emotes */}
      {type !== "emotes" && isSelected && (
        <div className="absolute top-2 right-2 w-6 h-6 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
          <Check className="w-4 h-4 text-white" weight="bold" />
        </div>
      )}
      
      {/* Bottom Title Overlay */}
      {itemTitle && (
        <div className="absolute bottom-0 left-0 right-0 p-3 backdrop-blur-lg bg-black/30 border-t border-white/10">
          {type === "emotes" ? (
            <div className="flex items-center justify-between">
              <h3 className="text-white font-medium text-sm leading-tight truncate flex-1">
                {itemTitle}
              </h3>
              <button 
                onClick={(e) => {
                  e.stopPropagation()
                  if (onPlayEmote && 'animationName' in item) {
                    onPlayEmote((item as EmoteData).animationName)
                  }
                }}
                className="ml-2 p-1 hover:bg-white/10 rounded transition-colors"
              >
                <Play className="w-4 h-4 text-white" weight="fill" />
              </button>
            </div>
          ) : (
            <h3 className="text-white font-medium text-sm leading-tight truncate">
              {itemTitle}
            </h3>
          )}
        </div>
      )}
    </div>
  )
}