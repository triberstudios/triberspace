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
          title: "Beloved Soldier", 
          creator: "Beloved.",
          points: 400, 
          type: "avatar",
          url: "#"
        },
        { 
          id: 2, 
          title: "V2 Mecha", 
          creator: "V2",
          points: 350,
          type: "avatar",
          url: "#"
        },
        { 
          id: 3, 
          title: "Ajaar Traverser", 
          creator: "Ajaar",
          points: 500,
          type: "avatar",
          url: "#"
        },
        { 
          id: 4, 
          title: "Triber Sankofa", 
          creator: "Triber Studios",
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
          title: "V2 Victory", 
          creator: "V2",
          points: 150,
          type: "emote",
          url: "#"
        },
        { 
          id: 6, 
          title: "Beloved Salute", 
          creator: "Beloved.",
          points: 100,
          type: "emote",
          url: "#"
        },
        { 
          id: 7, 
          title: "Ajaar Bow", 
          creator: "Ajaar",
          points: 125,
          type: "emote",
          url: "#"
        },
        { 
          id: 8, 
          title: "Triber Wave", 
          creator: "Triber Studios",
          points: 175,
          type: "emote",
          url: "#"
        },
      ]
    },
    {
      title: "Outfits",
      items: [
        { 
          id: 13, 
          title: "Beloved Soldier Signature A/W '25", 
          creator: "Beloved.",
          points: 600, 
          type: "outfit",
          url: "#"
        },
        { 
          id: 14, 
          title: "V2 Street Bundle (Digital + Physical)", 
          creator: "V2",
          points: 750,
          type: "outfit",
          url: "#"
        },
        { 
          id: 15, 
          title: "Ajaar Traverser Knit Bundle", 
          creator: "Ajaar",
          points: 850,
          type: "outfit",
          url: "#"
        },
        { 
          id: 16, 
          title: "Sankofa Collection 2020 Bundle", 
          creator: "Triber Studios",
          points: 400,
          type: "outfit",
          url: "#"
        },
      ]
    },
    {
      title: "Creator Stores",
      items: [
        { 
          id: 9, 
          title: "Beloved.", 
          price: 29.99,
          type: "store",
          url: "#"
        },
        { 
          id: 10, 
          title: "V2", 
          price: 24.99,
          type: "store",
          url: "#"
        },
        { 
          id: 11, 
          title: "Ajaar", 
          price: 34.99,
          type: "store",
          url: "#"
        },
        { 
          id: 12, 
          title: "Triber Studios", 
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
      <div className="px-6 pt-4 sm:px-8 md:pt-8">
        <Banner 
          variant="mini"
          title="Shop"
          subtitle="Discover avatars, emotes, and exclusive creator products."
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
      <div className="px-6 pb-8 sm:px-8">
        <div className="flex flex-col gap-18 mt-8">
          {shopCategories.map((category) => (
            <div key={category.title} className="flex flex-col gap-4">
              {/* Category Header */}
              <div className="flex items-center justify-between px-2">
                <h2 className="text-2xl font-semibold text-sidebar-foreground tracking-tight">
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