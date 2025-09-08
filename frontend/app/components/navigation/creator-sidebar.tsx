"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  ChartBar,
  Globe,
  ShoppingCartSimple,
  Users,
  TrendUp,
  CurrencyDollar,
  Sidebar,
  ArrowLeft,
  type Icon
} from "@phosphor-icons/react"
import { Button } from "@/components/common/button"

interface MenuItem {
  title: string
  icon: Icon
  href: string
  weight?: "thin" | "light" | "regular" | "bold" | "fill" | "duotone"
  disabled?: boolean
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
    title: "Your Store", 
    icon: ShoppingCartSimple,
    href: "/creator-dashboard/store",
  },
  {
    title: "Earnings",
    icon: CurrencyDollar,
    href: "/creator-dashboard/earnings",
  },
  // Hidden for now - uncomment to show
  // {
  //   title: "Your Tribe",
  //   icon: Users,
  //   href: "/creator-dashboard/tribe",
  // },
  // {
  //   title: "Analytics",
  //   icon: TrendUp,
  //   href: "/creator-dashboard/analytics",
  // },
]

export function CreatorSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const pathname = usePathname()

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
    setShowTooltip(false)
  }

  useEffect(() => {
    setShowTooltip(false)
  }, [isCollapsed])

  return (
    <div 
      className={cn(
        "sidebar-enhanced flex flex-col gap-6 h-full border-r border-sidebar-border bg-sidebar text-sidebar-foreground overflow-visible relative z-10 md:flex hidden",
        isCollapsed ? "sidebar-collapsed" : "sidebar-expanded"
      )}
    >
      {/* Header Section */}
      <div className={cn(
        "flex items-center transition-all duration-300",
        isCollapsed ? "justify-center px-2 pt-4" : "justify-between px-4 pt-4"
      )}>
        {!isCollapsed && (
          <h2 className="text-lg font-medium text-sidebar-foreground">
            Creator Tools
          </h2>
        )}
        <div 
          className="relative"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <button
            onClick={toggleSidebar}
            className={cn(
              "flex items-center justify-center rounded-lg bg-transparent hover:bg-sidebar-accent transition-colors duration-200 h-8 w-8 cursor-pointer"
            )}
          >
            <Sidebar className="h-5 w-5" />
          </button>
          {showTooltip && (
            <div 
              className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded border border-gray-600 whitespace-nowrap z-50 pointer-events-none"
              style={{ visibility: showTooltip ? 'visible' : 'hidden' }}
            >
              {isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            </div>
          )}
        </div>
      </div>

      {/* Menu Items */}
      <div className={cn(
        "flex-1 flex flex-col gap-2 transition-all duration-300",
        isCollapsed ? "px-2" : "px-4"
      )}>
        {items.map((item) => {
          const isActive = pathname === item.href
          const IconComponent = item.icon
          
          if (item.disabled) {
            return (
              <div
                key={item.title}
                className={cn(
                  "flex items-center rounded-lg transition-all duration-200 h-14 opacity-50 cursor-not-allowed",
                  isCollapsed ? "justify-center px-0" : "gap-3 px-3"
                )}
              >
                <IconComponent 
                  className="h-5 w-5 flex-shrink-0" 
                  weight="regular"
                />
                {!isCollapsed && (
                  <span className="text-lg font-medium">
                    {item.title}
                  </span>
                )}
              </div>
            )
          }
          
          return (
            <Link
              key={item.title}
              href={item.href}
              className={cn(
                "flex items-center rounded-lg transition-all duration-200 h-14",
                isCollapsed ? "justify-center px-0" : "gap-3 px-3",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "hover:bg-sidebar-accent/25 hover:text-sidebar-accent-foreground"
              )}
            >
              <IconComponent 
                className="h-5 w-5 flex-shrink-0" 
                weight={isActive ? "fill" : "regular"}
              />
              {!isCollapsed && (
                <span className="text-base font-medium">
                  {item.title}
                </span>
              )}
            </Link>
          )
        })}
        
        {/* Exit Dashboard Button */}
        <div className={cn(
          "mt-auto border-t border-sidebar-border pt-4 pb-4 transition-all duration-300"
        )}>
          <Button 
            variant="ghost" 
            className="w-full flex items-center justify-center gap-3 h-10 border border-sidebar-border hover:bg-sidebar-accent/25" 
            asChild
          >
            <Link href="/" className="flex items-center gap-3 w-full justify-center">
              <ArrowLeft className="h-4 w-4 flex-shrink-0" />
              {!isCollapsed && (
                <span className="text-sm font-medium">Exit Dashboard</span>
              )}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}