"use client"

import Banner from "@/components/common/banner";
import { ProductCard } from "@/components/ui/product-card";
import { StoreCard } from "@/components/ui/store-card";

export default function StorePage() {
  // Shop categories with placeholder data
  const shopCategories = [
    {
      title: "Avatars",
      items: [
        { 
          id: 1, 
          title: "Cyber Punk Avatar", 
          creator: "Triber Studios",
          points: 400, 
          type: "avatar",
          url: "#"
        },
        { 
          id: 2, 
          title: "Space Explorer", 
          creator: "Cosmic Designs",
          points: 350,
          type: "avatar",
          url: "#"
        },
        { 
          id: 3, 
          title: "Fantasy Warrior", 
          creator: "Epic Creations",
          points: 500,
          type: "avatar",
          url: "#"
        },
        { 
          id: 4, 
          title: "Street Style", 
          creator: "Urban Collective",
          points: 250,
          type: "avatar",
          url: "#"
        },
      ]
    },
    {
      title: "Emotes",
      items: [
        { 
          id: 5, 
          title: "Victory Dance", 
          creator: "Motion Studio",
          points: 150,
          type: "emote",
          url: "#"
        },
        { 
          id: 6, 
          title: "Wave Hello", 
          creator: "Friendly Co",
          points: 100,
          type: "emote",
          url: "#"
        },
        { 
          id: 7, 
          title: "Laugh Out Loud", 
          creator: "Happy Vibes",
          points: 125,
          type: "emote",
          url: "#"
        },
        { 
          id: 8, 
          title: "Cool Walk", 
          creator: "Swagger Inc",
          points: 175,
          type: "emote",
          url: "#"
        },
      ]
    },
    {
      title: "Creator Stores",
      items: [
        { 
          id: 9, 
          title: "Beloved Collection", 
          creator: "Beloved.",
          price: 29.99,
          type: "store",
          url: "#"
        },
        { 
          id: 10, 
          title: "V2 Exclusive", 
          creator: "V2",
          price: 24.99,
          type: "store",
          url: "#"
        },
        { 
          id: 11, 
          title: "Ajaar Originals", 
          creator: "Ajaar",
          price: 34.99,
          type: "store",
          url: "#"
        },
        { 
          id: 12, 
          title: "Triber Premium", 
          creator: "Triber Studios",
          price: 19.99,
          type: "store",
          url: "#"
        },
      ]
    }
  ];

  return (
    <div className="min-h-full">
      {/* Mini Banner */}
      <div className="px-4 pt-4 md:px-8 md:pt-8">
        <Banner 
          variant="mini"
          title="Shop"
          subtitle="Discover unique avatars, emotes, and exclusive creator collections"
          backgroundImage="/TransparentImg.png"
          primaryAction={{
            label: "Featured",
            onClick: () => console.log("Featured clicked")
          }}
          secondaryAction={{
            label: "New Arrivals",
            onClick: () => console.log("New arrivals clicked")
          }}
        />
      </div>

      {/* Shop Categories */}
      <div className="px-4 pb-8 md:px-8">
        <div className="flex flex-col gap-18 mt-8">
          {shopCategories.map((category) => (
            <div key={category.title} className="flex flex-col gap-4">
              {/* Category Header */}
              <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-semibold text-white tracking-tight">
                  {category.title}
                </h2>
              </div>

              {/* Item Cards Grid */}
              <div className="grid grid-cols-1 gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-2">
                {category.items.map((item) => (
                  category.title === "Creator Stores" ? (
                    <StoreCard key={item.id} store={item} />
                  ) : (
                    <ProductCard key={item.id} product={item} />
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}