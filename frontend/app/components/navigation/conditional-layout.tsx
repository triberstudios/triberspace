"use client"

import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/navigation/app-sidebar"
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav"
import { CreatorMobileNav } from "@/components/navigation/creator-mobile-nav"
import { GlobalNav } from "@/components/navigation/global-nav"

interface ConditionalLayoutProps {
  children: React.ReactNode
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname()
  const isCreatorDashboard = pathname.startsWith('/creator-dashboard')
  const isRuntimePreview = pathname.startsWith('/runtime/preview')
  const isExperience = pathname.startsWith('/experience')
  const isStandaloneSpace = pathname.startsWith('/s/')
  const isAuthPage = pathname.startsWith('/auth/')

  // Check if pathname matches /w/{worldSlug}/s/{spaceSlug} format (4 segments: w, worldSlug, s, spaceSlug)
  const pathSegments = pathname.split('/').filter(Boolean)
  const isWorldSpace = pathname.startsWith('/w/') && pathSegments.length === 4 && pathSegments[2] === 's'

  if (isRuntimePreview || isExperience || isStandaloneSpace || isWorldSpace || isAuthPage) {
    // Runtime preview, experience, standalone space, world space, or auth page - no sidebar, no navigation, fullscreen experience
    return (
      <div className="flex h-full overflow-hidden">
        {children}
      </div>
    )
  }

  if (isCreatorDashboard) {
    // Creator dashboard - no AppSidebar, but with CreatorMobileNav on mobile
    return (
      <div className="flex h-full flex-col">
        <GlobalNav />
        <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            {children}
          </main>
          <CreatorMobileNav className="md:hidden fixed bottom-0 left-0 right-0 z-50" />
        </div>
      </div>
    )
  }

  // Regular app layout - with AppSidebar and MobileBottomNav
  return (
    <div className="flex h-full flex-col">
      <GlobalNav />
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            {children}
          </main>
        </div>
        <MobileBottomNav className="md:hidden fixed bottom-0 left-0 right-0 z-50" />
      </div>
    </div>
  )
}