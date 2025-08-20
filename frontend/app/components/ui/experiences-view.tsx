"use client"

import { ExperienceCard } from "@/components/ui/experience-card"

interface ExperiencesViewProps {
  searchQuery: string
}

// Placeholder data for experiences
const categories = [
  {
    title: "Art",
    experiences: [
      { 
        id: 1, 
        title: "Triber Gallery: Exhibition 1", 
        brand: "Triber Studios", 
        type: "gallery",
        url: "https://triberworld.triber.space"
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
      { id: 5, title: "Concert Hall", brand: "Music Venue", type: "concert" },
      { id: 6, title: "Studio Sessions", brand: "Record Label", type: "studio" },
    ]
  },
  {
    title: "Film",
    experiences: [
      { id: 7, title: "Cinema Experience", brand: "Film Studio", type: "cinema" },
      { id: 8, title: "Behind Scenes", brand: "Production Co", type: "production" },
    ]
  },
  {
    title: "Fashion",
    experiences: [
      { id: 9, title: "Runway Show", brand: "Fashion House", type: "runway" },
      { id: 10, title: "Designer Studio", brand: "Luxury Brand", type: "studio" },
    ]
  }
]

export function ExperiencesView({ searchQuery }: ExperiencesViewProps) {
  // Filter experiences based on search query
  const filteredCategories = categories.map(category => ({
    ...category,
    experiences: category.experiences.filter(exp => 
      exp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.brand.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.experiences.length > 0)

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-18">
        {filteredCategories.map((category) => (
          <div key={category.title} className="flex flex-col gap-4">
            {/* Category Header */}
            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-semibold text-white tracking-tight">
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

        {/* More Coming Soon Section */}
        {/* <div className="flex items-center justify-center rounded-xl border border-white/40 p-12">
          <h3 className="text-2xl font-semibold text-white tracking-tight">
            More coming soon
          </h3>
        </div> */}

        {/* Empty state when no results */}
        {searchQuery && filteredCategories.length === 0 && (
          <div className="flex items-center justify-center p-12">
            <p className="text-lg text-white/70">
              No experiences found for "{searchQuery}"
            </p>
          </div>
        )}
      </div>
    </div>
  )
}