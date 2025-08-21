"use client"

import Banner from "@/components/common/banner";
import { ExperienceCard } from "@/components/ui/experience-card";

export default function Home() {
  const categories = [
    {
      title: "Art",
      experiences: [
        {
          id: 1,
          title: "Triber Gallery: Exhibition 1",
          brand: "Triber Studios",
          type: "gallery",
          url: "https://triberworld.triber.space",
        },
        {
          id: 2,
          title: "Beloved Gallery",
          brand: "Beloved.",
          type: "gallery",
          url: "#",
        },
        {
          id: 3,
          title: "V2 Gallery",
          brand: "V2",
          type: "gallery",
          url: "#",
        },
        {
          id: 4,
          title: "Ajaar Gallery",
          brand: "Ajaar",
          type: "gallery",
          url: "#",
        },
      ],
    },
    {
      title: "Music",
      experiences: [
        { id: 5, title: "Concert Hall", brand: "Music Venue", type: "concert" },
        {
          id: 6,
          title: "Studio Sessions",
          brand: "Record Label",
          type: "studio",
        },
      ],
    },
    {
      title: "Film",
      experiences: [
        {
          id: 7,
          title: "Cinema Experience",
          brand: "Film Studio",
          type: "cinema",
        },
        {
          id: 8,
          title: "Behind Scenes",
          brand: "Production Co",
          type: "production",
        },
      ],
    },
    {
      title: "Fashion",
      experiences: [
        { id: 9, title: "Runway Show", brand: "Fashion House", type: "runway" },
        {
          id: 10,
          title: "Designer Studio",
          brand: "Luxury Brand",
          type: "studio",
        },
      ],
    },
  ];

  return (
    <section className="w-full h-full flex flex-col p-8 font-sans">
      <Banner 
        variant="fullBackground"
        title="Welcome to Triberspace"
        subtitle="Discover exclusive content, collectibles, and merchandise from your favorite brands and artists."
        rightImage="/TransparentImg.png"
        primaryAction={{
          label: "Get Started",
          onClick: () => console.log("Get started clicked")
        }}
        secondaryAction={{
          label: "Learn More",
          onClick: () => console.log("Learn more clicked")
        }}
      />

      <h3 className="text-3xl my-6 font-semibold">For You</h3>
      <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories
          .flatMap((category) => category.experiences)
          .slice(0, 6)
          .map((experience) => (
            <ExperienceCard key={experience.id} experience={experience} />
          ))}
      </div>
    </section>
  );
}
