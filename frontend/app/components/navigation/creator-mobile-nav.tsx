"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  ChartBar,
  Globe,
  ShoppingCartSimple,
  CurrencyDollar,
  type Icon
} from "@phosphor-icons/react"

interface MenuItem {
  title: string
  icon: Icon
  href: string
}

const items: MenuItem[] = [
  {
    title: "Dashboard",
    icon: ChartBar,
    href: "/creator-dashboard",
  },
  {
    title: "Experiences",
    icon: Globe,
    href: "/creator-dashboard/experiences",
  },
  {
    title: "Store", 
    icon: ShoppingCartSimple,
    href: "/creator-dashboard/store",
  },
  {
    title: "Earnings",
    icon: CurrencyDollar,
    href: "/creator-dashboard/earnings",
  },
]

interface CreatorMobileNavProps {
  className?: string
}

export function CreatorMobileNav({ className }: CreatorMobileNavProps) {
  const pathname = usePathname()
  
  return (
    <div className={cn(
      "flex h-16 items-center justify-around border-t border-sidebar-border bg-sidebar px-2",
      className
    )}>
      {/* Navigation Items */}
      {items.map((item) => {
        const isActive = pathname === item.href
        const IconComponent = item.icon
        
        return (
          <Link
            key={item.title}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 transition-colors",
              isActive 
                ? "text-sidebar-accent-foreground" 
                : "hover:text-sidebar-accent-foreground"
            )}
          >
            <IconComponent 
              className="h-5 w-5" 
              weight={isActive ? "fill" : "regular"}
            />
            <span className="text-xs">{item.title}</span>
          </Link>
        )
      })}
    </div>
  )
}