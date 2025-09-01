"use client"

import { TrendUp, Eye, Users, Clock, CalendarBlank } from "@phosphor-icons/react"
import { ExitDashboardButton } from "@/components/navigation/exit-dashboard-button"

export default function AnalyticsPage() {
  return (
    <div className="flex h-full w-full bg-background p-4 md:p-6 lg:p-8 overflow-y-auto">
        <div className="w-full">
          <ExitDashboardButton />
          <div className="space-y-6">
          {/* Overview Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-500/20 p-2">
                  <Eye className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                  <p className="text-2xl font-bold text-foreground">0</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-500/20 p-2">
                  <TrendUp className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Growth Rate</p>
                  <p className="text-2xl font-bold text-foreground">0%</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-purple-500/20 p-2">
                  <Users className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unique Visitors</p>
                  <p className="text-2xl font-bold text-foreground">0</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-orange-500/20 p-2">
                  <Clock className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Session</p>
                  <p className="text-2xl font-bold text-foreground">0m</p>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Chart */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Performance Overview</h2>
            <div className="rounded-lg border border-sidebar-border bg-sidebar p-8">
              <div className="text-center text-muted-foreground">
                <TrendUp className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground mb-2">No analytics data yet</h3>
                <p className="text-sm">Start creating content to see your performance metrics</p>
              </div>
            </div>
          </div>

          {/* Content Performance */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Top Performing Content</h2>
            <div className="rounded-lg border border-sidebar-border bg-sidebar">
              <div className="p-4 border-b border-sidebar-border">
                <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground">
                  <span>Content</span>
                  <span>Views</span>
                  <span>Engagement</span>
                  <span>Revenue</span>
                </div>
              </div>
              <div className="p-8">
                <div className="text-center text-muted-foreground">
                  <Eye className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No content data available</p>
                  <p className="text-sm">Publish experiences and products to see performance data</p>
                </div>
              </div>
            </div>
          </div>

          {/* Audience Demographics */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Audience Demographics</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
                <h3 className="text-base font-medium text-foreground mb-4">Age Groups</h3>
                <div className="text-center text-muted-foreground">
                  <Users className="mx-auto h-6 w-6 mb-2 opacity-50" />
                  <p className="text-sm">No demographic data</p>
                </div>
              </div>
              <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
                <h3 className="text-base font-medium text-foreground mb-4">Geographic Distribution</h3>
                <div className="text-center text-muted-foreground">
                  <Users className="mx-auto h-6 w-6 mb-2 opacity-50" />
                  <p className="text-sm">No location data</p>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
    </div>
  )
}