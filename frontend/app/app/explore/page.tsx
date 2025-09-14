"use client"

import { useState } from "react"
import { MagnifyingGlass } from "@phosphor-icons/react"
import { ExperienceCard } from "@/components/ui/experience-card"

// Placeholder data for experiences
const categories = [
  {
    title: "Art",
    experiences: [
      { 
        id: 1, 
        title: "Triber Gallery Preview", 
        brand: "Triber Studios", 
        type: "gallery",
        image: "/thumbnails/TriberGallery.png",
        url: "https://preview.triber.space"
      },
      { 
        id: 2, 
        title: "Beloved Gallery", 
        brand: "Beloved.", 
        type: "gallery",
        url: "#"
      },
      { 
        id: 3, 
        title: "V2 Gallery", 
        brand: "V2", 
        type: "gallery",
        url: "#"
      },
      { 
        id: 4, 
        title: "Ajaar Gallery", 
        brand: "Ajaar", 
        type: "gallery",
        url: "#"
      },
    ]
  },
  {
    title: "Music",
    experiences: [
      { id: 5, title: "Ajaar Live Sessions", brand: "Ajaar", type: "concert" },
      { id: 6, title: "V2 Listening Party", brand: "V2", type: "studio" },
    ]
  },
  {
    title: "Film",
    experiences: [
      { id: 7, title: "Beloved Film Premiere", brand: "Beloved.", type: "cinema" },
      { id: 8, title: "Triber Documentary", brand: "Triber Studios", type: "production" },
    ]
  },
  {
    title: "Fashion",
    experiences: [
      { id: 9, title: "V2 Fashion Week", brand: "V2", type: "runway" },
      { id: 10, title: "Ajaar Atelier", brand: "Ajaar", type: "studio" },
    ]
  }
]

export default function ExplorePage() {
  const [searchQuery, setSearchQuery] = useState("")

  // Filter experiences based on search query
  const filteredCategories = categories.map(category => ({
    ...category,
    experiences: category.experiences.filter(exp => 
      exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.brand.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.experiences.length > 0)

  return (
    <div className="min-h-full">
      {/* Search Bar */}
      <div className="sticky top-0 z-[5] flex justify-center px-6 py-4 backdrop-blur-md bg-background/80 sm:px-4 md:px-2">
        <div className="flex w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 md:w-[640px]">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sidebar-foreground outline-none placeholder:text-white/50"
          />
          <MagnifyingGlass className="h-5 w-5 text-white/50" />
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-8 sm:px-8">
        <div className="flex flex-col gap-18">
          {filteredCategories.map((category) => (
            <div key={category.title} className="flex flex-col gap-4">
              {/* Category Header */}
              <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-semibold text-sidebar-foreground tracking-tight">
                  {category.title}
                </h2>
              </div>

              {/* Experience Cards Grid */}
              <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-2">
                {category.experiences.map((experience) => (
                  <ExperienceCard key={experience.id} experience={experience} />
                ))}
              </div>
            </div>
          ))}

          {/* Empty state when no results */}
          {searchQuery && filteredCategories.length === 0 && (
            <div className="flex items-center justify-center p-12">
              <p className="text-lg text-white/70">
                No experiences found for &quot;{searchQuery}&quot;
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}