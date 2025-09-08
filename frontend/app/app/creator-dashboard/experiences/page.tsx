"use client"

import { Button } from "@/components/common/button"
import { useState } from "react"
import { Plus, Globe, Eye, Users, Clock, DotsThree, Play, Edit, Archive, ArrowRight } from "@phosphor-icons/react"
import { ExitDashboardButton } from "@/components/navigation/exit-dashboard-button"

export default function ExperiencesPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'archived'>('all')
  
  return (
    <div className="flex h-full w-full bg-background p-4 md:p-6 lg:p-8 overflow-y-auto">
        <div className="w-full pb-8">
          <ExitDashboardButton />
          <div className="space-y-6">

          {/* Experience Status Filter */}
          <div className="flex items-center gap-4 border-b border-sidebar-border">
            {['all', 'published', 'draft', 'archived'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as any)}
                className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors capitalize cursor-pointer ${
                  statusFilter === status
                    ? 'border-sidebar-accent-foreground text-sidebar-accent-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Experience Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Your Experiences</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  Grid View
                </Button>
                <Button variant="outline" size="sm">
                  List View
                </Button>
              </div>
            </div>
            
            {/* Experience Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Empty State Card */}
              <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
                <div className="text-center text-muted-foreground">
                  <Globe className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No experiences yet</h3>
                  <p className="text-sm mb-4">Create your first immersive experience</p>
                  <Button size="sm" className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create Experience
                  </Button>
                </div>
              </div>
            </div>
          </div>

          </div>
        </div>
    </div>
  )
}