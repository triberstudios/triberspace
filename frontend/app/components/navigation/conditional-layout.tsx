"use client"

import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/navigation/app-sidebar"
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav"
import { CreatorMobileNav } from "@/components/navigation/creator-mobile-nav"

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  const isCreatorDashboard = pathname.startsWith('/creator-dashboard')

  if (isCreatorDashboard) {
    // Creator dashboard - no AppSidebar, but with CreatorMobileNav on mobile
    return (
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
        <CreatorMobileNav className="md:hidden fixed bottom-0 left-0 right-0 z-50" />
      </div>
    )
  }

  // Regular app layout - with AppSidebar and MobileBottomNav
  return (
    <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar />
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {children}
        </main>
      </div>
      <MobileBottomNav className="md:hidden fixed bottom-0 left-0 right-0 z-50" />
    </div>
  )
}