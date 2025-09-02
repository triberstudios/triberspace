"use client"

import { useState } from "react"
import { TrendUp, Eye, Users, Clock, CalendarBlank, ChartBar, ChartPie } from "@phosphor-icons/react"
import { ExitDashboardButton } from "@/components/navigation/exit-dashboard-button"

export default function AnalyticsPage() {
  const [timePeriod, setTimePeriod] = useState<'7d' | '30d' | '90d'>('30d')
  
  return (
    <div className="flex min-h-full w-full bg-background p-4 md:p-6 lg:p-8 overflow-y-auto">
        <div className="w-full pb-8">
          <ExitDashboardButton />
          <div className="space-y-6">
          {/* Time Period Selector */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-foreground">Analytics Overview</h1>
            <div className="flex items-center gap-2 bg-sidebar border border-sidebar-border rounded-lg p-1">
              {[
                { value: '7d', label: '7 days' },
                { value: '30d', label: '30 days' },
                { value: '90d', label: '90 days' }
              ].map((period) => (
                <button
                  key={period.value}
                  onClick={() => setTimePeriod(period.value as any)}
                  className={`px-3 py-2 text-sm font-medium rounded transition-colors cursor-pointer ${
                    timePeriod === period.value
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>

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

          {/* Performance Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Views Over Time</h2>
              <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
                <div className="h-48 flex items-end justify-center gap-2">
                  {/* Mock bar chart */}
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="bg-blue-400/20 w-8 rounded-t" style={{ height: `${Math.random() * 80 + 20}%` }} />
                  ))}
                </div>
                <div className="text-center text-muted-foreground mt-4">
                  <p className="text-sm">Chart will show when you have view data</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Engagement Breakdown</h2>
              <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
                <div className="h-48 flex items-center justify-center">
                  {/* Mock pie chart */}
                  <div className="w-32 h-32 rounded-full border-8 border-purple-400/20 border-t-purple-400 border-r-blue-400 opacity-50"></div>
                </div>
                <div className="text-center text-muted-foreground mt-4">
                  <p className="text-sm">Engagement breakdown will appear here</p>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Tables */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Top Experiences</h2>
              <div className="rounded-lg border border-sidebar-border bg-sidebar">
                <div className="p-4 border-b border-sidebar-border">
                  <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground">
                    <span>Experience</span>
                    <span>Views</span>
                    <span>Users</span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="text-center text-muted-foreground">
                    <ChartBar className="mx-auto h-6 w-6 mb-2 opacity-50" />
                    <p className="text-sm">No experience data available</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Top Products</h2>
              <div className="rounded-lg border border-sidebar-border bg-sidebar">
                <div className="p-4 border-b border-sidebar-border">
                  <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground">
                    <span>Product</span>
                    <span>Sales</span>
                    <span>Points</span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="text-center text-muted-foreground">
                    <ChartPie className="mx-auto h-6 w-6 mb-2 opacity-50" />
                    <p className="text-sm">No product data available</p>
                  </div>
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