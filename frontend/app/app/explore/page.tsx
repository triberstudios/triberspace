"use client"

import { useState } from "react"
import { MagnifyingGlass } from "@phosphor-icons/react"
import { cn } from "@/lib/utils"
import { ExperiencesView } from "@/components/ui/experiences-view"
import { WorldsView } from "@/components/ui/worlds-view"
import { SegmentedControl } from "@/components/ui/segmented-control"

export default function ExplorePage() {
  const [activeView, setActiveView] = useState<"experiences" | "worlds">("experiences")
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="flex h-full flex-col gap-8 p-4 md:p-8">
      {/* Toggle and Search Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-2">
        {/* Toggle Button Group */}
        <SegmentedControl
          options={[
            { value: "experiences", label: "Experiences" },
            { value: "worlds", label: "Worlds" }
          ]}
          value={activeView}
          onChange={(value) => setActiveView(value as "experiences" | "worlds")}
        />

        {/* Search Bar */}
        <div className="flex w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 md:w-80">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-white outline-none placeholder:text-white/50"
          />
          <MagnifyingGlass className="h-5 w-5 text-white/50" />
        </div>
      </div>

      {/* Content - No Container */}
      <div className="flex-1 overflow-y-auto">
        {activeView === "experiences" ? (
          <ExperiencesView searchQuery={searchQuery} />
        ) : (
          <WorldsView />
        )}
      </div>
    </div>
  )
}