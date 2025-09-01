"use client"

import { Button } from "@/components/common/button"
import { Crown, Plus, TrendUp, Users, Sparkle, Eye, Heart, Clock, Globe, Package, Star } from "@phosphor-icons/react"
import { ExitDashboardButton } from "@/components/navigation/exit-dashboard-button"

export default function CreatorDashboard() {
  return (
    <div className="flex h-full w-full bg-background p-4 md:p-6 lg:p-8 overflow-y-auto">
        <div className="w-full">
          <ExitDashboardButton />
          <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-500/20 p-2">
                  <Eye className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Visits</p>
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
                  <p className="text-sm text-muted-foreground">Tribe Members</p>
                  <p className="text-2xl font-bold text-foreground">0</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity Feed */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
            <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-black/20">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <div>
                    <p className="text-sm text-foreground">Welcome to your Creator Dashboard!</p>
                    <p className="text-xs text-muted-foreground">Start by creating your first experience</p>
                  </div>
                </div>
                <div className="text-center text-muted-foreground pt-4">
                  <Clock className="mx-auto h-6 w-6 mb-2 opacity-50" />
                  <p className="text-sm">Your activity feed will appear here</p>
                </div>
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

          {/* Quick Actions */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-sidebar-border bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-6 cursor-pointer hover:from-blue-500/20 hover:to-purple-500/20 transition-all">
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Globe className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-foreground">Create Experience</h3>
                    <p className="text-sm text-muted-foreground">Build immersive worlds for your tribe</p>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border border-sidebar-border bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-6 cursor-pointer hover:from-green-500/20 hover:to-emerald-500/20 transition-all">
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <Package className="h-6 w-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-foreground">Upload Products</h3>
                    <p className="text-sm text-muted-foreground">Add avatars, outfits, and emotes</p>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border border-sidebar-border bg-gradient-to-br from-yellow-500/10 to-orange-500/10 p-6 cursor-pointer hover:from-yellow-500/20 hover:to-orange-500/20 transition-all">
                <div className="space-y-3">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <Star className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-medium text-foreground">Create Point Pack</h3>
                    <p className="text-sm text-muted-foreground">Set up monetization tiers</p>
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