"use client"

import { Button } from "@/components/common/button"
import { Crown, Plus, TrendUp, Users, Sparkle, Eye, Heart, Clock } from "@phosphor-icons/react"
import { ExitDashboardButton } from "@/components/navigation/exit-dashboard-button"

export default function CreatorDashboard() {
  return (
    <div className="flex h-full w-full bg-background p-4 md:p-6 lg:p-8 overflow-y-auto">
        <div className="w-full">
          <ExitDashboardButton />
          <div className="space-y-6">
          {/* Performance Stats */}
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
                <div className="rounded-full bg-red-500/20 p-2">
                  <Heart className="h-5 w-5 text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Engagement</p>
                  <p className="text-2xl font-bold text-foreground">0%</p>
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
                  <p className="text-sm text-muted-foreground">Tribe Members</p>
                  <p className="text-2xl font-bold text-foreground">0</p>
                </div>
              </div>
            </div>
          </div>

          {/* Latest Experience Performance */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Latest Experience Performance</h2>
            <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
              <div className="text-center text-muted-foreground">
                <Clock className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>No experiences published yet</p>
                <p className="text-sm">Create your first experience to see performance data</p>
              </div>
            </div>
          </div>

          {/* World Analytics */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">World Analytics</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
                <h3 className="text-base font-medium text-foreground mb-4">Top Performing Experiences</h3>
                <div className="text-center text-muted-foreground">
                  <TrendUp className="mx-auto h-6 w-6 mb-2 opacity-50" />
                  <p className="text-sm">No data available</p>
                </div>
              </div>
              <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
                <h3 className="text-base font-medium text-foreground mb-4">Tribe Insights</h3>
                <div className="text-center text-muted-foreground">
                  <Users className="mx-auto h-6 w-6 mb-2 opacity-50" />
                  <p className="text-sm">No tribe data yet</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tips for You */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Tips for You</h2>
            <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Sparkle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Create your first experience</h3>
                    <p className="text-sm text-muted-foreground">Start building immersive experiences for your tribe</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Sparkle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Upload your first products</h3>
                    <p className="text-sm text-muted-foreground">Add avatars, outfits, and emotes to your store</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Sparkle className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Engage with your community</h3>
                    <p className="text-sm text-muted-foreground">Build relationships with your tribe to increase engagement</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
    </div>
  )
}