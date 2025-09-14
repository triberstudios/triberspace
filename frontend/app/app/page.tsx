"use client"

import Banner from "@/components/common/banner";
import { ExperienceCard } from "@/components/ui/experience-card";
import { WeekCalendar } from "@/components/ui/week-calendar";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
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
          url: "https://preview.triber.space",
        },
        {
          id: 2,
          title: "Beloved Gallery",
          brand: "Beloved.",
          type: "gallery",
          image: "/thumbnails/BelovedGallery.png",
          url: "#",
        },
        {
          id: 3,
          title: "V2 Gallery",
          brand: "V2",
          type: "gallery",
          image: "/thumbnails/V2Gallery.png",
          url: "#",
        },
        {
          id: 4,
          title: "Ajaar Gallery",
          brand: "Ajaar",
          type: "gallery",
          image: "/thumbnails/AjaarGallery.png",
          url: "#",
        },
      ],
    },
    {
      title: "Music",
      experiences: [
        {
          id: 5,
          title: "Triber Listening Party",
          brand: "Triber Studios",
          type: "concert",
          image: "/thumbnails/TriberMusic.png",
        },
        {
          id: 6,
          title: "Ajaar Listening Party",
          brand: "Ajaar",
          type: "studio",
          image: "/thumbnails/AjaarMusic.png",
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
    <div className="min-h-full font-sans">
      <div className="flex flex-col">
        {/* Banner Section */}
        <div className="px-6 sm:px-8 pt-4 sm:pt-8">
          <Banner 
            variant="rightImage"
            title="Welcome to Triberspace"
            subtitle="(Coming soon) Triberspace is an immersive art and entertainment platform powering brands and artists to create immersive experiences. Explore, connect, and unlock exclusives from your favorite creators."
            backgroundVideo="/previewVideoHB.mp4"
            baseBackground="/bgGif.gif"
            baseOverlayOpacity={88}
            primaryAction={{
              label: "Get Started",
              onClick: () => router.push("/auth/sign-up")
            }}
            secondaryAction={{
              label: "Learn More",
              onClick: () => router.push("/learn-more")
            }}
          />
        </div>

        {/* Main Content */}
        <div className="px-6 sm:px-8 pb-8">
          <div className="flex flex-col gap-20">
            {/* For You Section */}
            <div className="flex flex-col gap-4 pt-6">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-semibold text-sidebar-foreground tracking-tight">For You</h2>
              </div>
              <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 p-2">
                {categories
                  .flatMap((category) => category.experiences)
                  .slice(0, 6)
                  .map((experience) => (
                    <ExperienceCard key={experience.id} experience={experience} />
                  ))}
              </div>
            </div>

            {/* Calendar Section */}
            <div className="flex flex-col gap-4">
              <WeekCalendar />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
