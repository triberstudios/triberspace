"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { 
  House,
  Globe,
  ShoppingCartSimple,
  User,
  Sidebar,
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
    title: "Profile",
    icon: User,
    href: "/profile",
  },
]

export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const pathname = usePathname()

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed)
    setShowTooltip(false) // Hide tooltip when toggling
  }

  // Hide tooltip when sidebar state changes
  useEffect(() => {
    setShowTooltip(false)
  }, [isCollapsed])

  return (
    <div 
      className={cn(
        "sidebar-enhanced flex flex-col gap-6 h-full border-r border-sidebar-border bg-sidebar text-sidebar-foreground overflow-visible relative z-10",
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
            Navigate
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
          const isActive = pathname === item.href || (item.href === "/" && pathname === "/")
          const IconComponent = item.icon
          
          return (
            <Link
              key={item.title}
              href={item.href}
              className={cn(
                "flex items-center rounded-lg transition-all duration-200 h-16",
                isCollapsed ? "justify-center px-0" : "gap-4 px-4",
                isActive 
                  ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                  : "hover:bg-sidebar-accent/25 hover:text-sidebar-accent-foreground"
              )}
            >
              <IconComponent 
                className="h-6 w-6 flex-shrink-0" 
                weight={isActive ? "fill" : "regular"}
              />
              {!isCollapsed && (
                <span className="text-2xl font-medium">
                  {item.title}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}