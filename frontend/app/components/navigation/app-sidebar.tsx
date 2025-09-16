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
  MagicWand,
  type Icon
} from "@phosphor-icons/react"
import { Button } from "@/components/common/button"
import { useSession } from "@/lib/auth-client"

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

export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()

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
        "sidebar-enhanced flex flex-col gap-6 h-full border-r border-border bg-background text-foreground overflow-visible relative z-10 md:flex hidden",
        isCollapsed ? "sidebar-collapsed" : "sidebar-expanded"
      )}
    >
      {/* Header Section */}
      <div className={cn(
        "flex items-center transition-all duration-300",
        isCollapsed ? "justify-center px-2 pt-4" : "justify-between px-4 pt-4"
      )}>
        {!isCollapsed && (
          <h2 className="text-lg font-medium text-foreground">
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
              "flex items-center justify-center rounded-lg bg-transparent hover:bg-secondary transition-colors duration-200 h-8 w-8 cursor-pointer"
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
                "flex items-center rounded-lg transition-all duration-200 h-14",
                isCollapsed ? "justify-center px-0" : "gap-3 px-3",
                isActive 
                  ? "bg-secondary text-primary" 
                  : "hover:bg-secondary/25 hover:text-primary"
              )}
            >
              <IconComponent 
                className="h-5 w-5 flex-shrink-0" 
                weight={isActive ? "fill" : "regular"}
              />
              {!isCollapsed && (
                <span className="text-lg font-medium">
                  {item.title}
                </span>
              )}
            </Link>
          )
        })}
        
        {/* Creator Button */}
        <div className={cn(
          "mt-auto border-t border-border pt-4 pb-4 transition-all duration-300"
        )}>
          {session ? (
            <Button 
              variant="ghost" 
              className="w-full flex items-center gap-3 h-10 border border-border hover:bg-secondary/25" 
              asChild
            >
              <Link href="/creator-dashboard">
                <MagicWand className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">Creator Dashboard</span>
                )}
              </Link>
            </Button>
          ) : (
            <Button 
              variant="ghost" 
              className="w-full flex items-center justify-center gap-3 h-10 border border-border hover:bg-secondary/25" 
              asChild
            >
              <Link href="/auth/sign-up" className="flex items-center gap-3 w-full justify-center">
                <MagicWand className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium">Become a Creator</span>
                )}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}