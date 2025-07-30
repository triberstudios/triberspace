"use client"

import { useState } from "react"
import Link from "next/link"
import { Home, Compass, ShoppingBag, User, PanelLeftClose } from "lucide-react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface MenuItem {
  title: string
  icon: any
  href: string
}

const items: MenuItem[] = [
  {
    title: "Home",
    icon: Home,
    href: "/",
  },
  {
    title: "Explore",
    icon: Compass,
    href: "/explore",
  },
  {
    title: "Store", 
    icon: ShoppingBag,
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
  }

  return (
    <div 
      className={cn(
        "sidebar-enhanced flex flex-col gap-8 h-screen border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        isCollapsed ? "sidebar-collapsed" : "sidebar-expanded"
      )}
    >
      {/* Header Section */}
      <div className={cn(
        "flex items-center transition-all duration-300",
        isCollapsed ? "justify-center px-2 pt-8" : "justify-between px-4 pt-8"
      )}>
        {!isCollapsed && (
          <h2 className="text-lg font-normal text-sidebar-foreground">
            Navigate
          </h2>
        )}
        <div className="relative">
          <button
            onClick={toggleSidebar}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            className={cn(
              "flex items-center justify-center rounded-lg bg-transparent hover:bg-sidebar-accent transition-colors duration-200 h-8 w-8"
            )}
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
          {showTooltip && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded border border-gray-600 whitespace-nowrap z-50">
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
                  : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
              )}
            >
              <IconComponent 
                className="h-6 w-6 flex-shrink-0"
                fill={isActive ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth={2}
              />
              {!isCollapsed && (
                <span className="text-base font-medium">
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