"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  House,
  Globe,
  ShoppingCartSimple,
  User,
  type Icon
} from "@phosphor-icons/react"

interface MenuItem {
  title: string
  icon: Icon
  href: string
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone"
}

const items: MenuItem[] = [
  {
    title: "Home",
    icon: House,
    href: "/",
  },
  {
    title: "Explore",
    icon: Globe,
    href: "/explore",
  },
  {
    title: "Store", 
    icon: ShoppingCartSimple,
    href: "/store",
  },
  {
    title: "Avatar",
    icon: User,
    href: "/avatar",
  },
]

interface MobileBottomNavProps {
  className?: string
}

export function MobileBottomNav({ className }: MobileBottomNavProps = {}) {
  const pathname = usePathname()

  return (
    <div className={cn("border-t border-border bg-background", className)}>
      <div className="flex items-center justify-around px-4 py-1">
        {items.map((item) => {
          const isActive = pathname === item.href || (item.href === "/" && pathname === "/")
          const IconComponent = item.icon
          
          return (
            <Link
              key={item.title}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-lg py-1.5 px-2 transition-all duration-200 min-w-0 flex-1",
                isActive 
                  ? "text-primary" 
                  : "text-foreground/70 hover:text-primary"
              )}
            >
              <IconComponent 
                className="h-6 w-6 flex-shrink-0" 
                weight={isActive ? "fill" : "regular"}
              />
              <span className="text-xs font-medium truncate">
                {item.title}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}