"use client"

import { useState } from "react"
import { CaretLeft, CaretRight } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { WorldViewer } from "@/components/ui/world-viewer"

const worlds = [
  {
    name: "Triber World",
    brand: "by TRIBER STUDIOS!",
    position: [0, 0, 0] as [number, number, number],
    type: "wireframe",
    color: "#98FF98"
  },
  {
    name: "V2 World (Soon)",
    brand: "by V2",
    position: [20, 0, 0] as [number, number, number],
    type: "wireframe",
    color: "white",
  },
  {
    name: "Beloved. World (Soon)",
    brand: "by Beloved. From Now On",
    position: [40, 0, 0] as [number, number, number],
    type: "wireframe",
    color: "#BF8EE8",
  },
  {
    name: "Ajaar World (Soon)",
    brand: "by Ajaar",
    position: [60, 0, 0] as [number, number, number],
    type: "wireframe",
    color: "#F93235",
  },
]

export function WorldsView() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const handleNext = () => {
    if (currentIndex < worlds.length - 1) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  const currentWorld = worlds[currentIndex]

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-between overflow-hidden p-0 pb-8">
      {/* 3D Viewer Container - Takes most space */}
      <div className="flex w-full flex-1 items-center justify-center gap-1 p-4">
        {/* Previous Button */}
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className={cn(
            "flex h-8 w-8 flex-shrink-0 items-center justify-center text-2xl transition-colors duration-200",
            currentIndex === 0
              ? "cursor-default text-gray-500"
              : "cursor-pointer text-white hover:text-white/80"
          )}
        >
          <CaretLeft className="h-8 w-8" />
        </button>

        {/* 3D Canvas Container */}
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-3xl border-2 border-white/40 bg-black">
          <WorldViewer worlds={worlds} currentIndex={currentIndex} />
        </div>

        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={currentIndex === worlds.length - 1}
          className={cn(
            "flex h-8 w-8 flex-shrink-0 items-center justify-center text-2xl transition-colors duration-200",
            currentIndex === worlds.length - 1
              ? "cursor-default text-gray-500"
              : "cursor-pointer text-white hover:text-white/80"
          )}
        >
          <CaretRight className="h-8 w-8" />
        </button>
      </div>

      {/* World Info - Fixed bottom */}
      <div className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-card px-6 py-2 text-center">
        <h3 className="text-xl font-medium text-white">
          {currentWorld.name}
        </h3>
        <p className="text-base text-gray-300">
          {currentWorld.brand}
        </p>
      </div>
    </div>
  )
}