"use client"

import { Button } from "@/components/common/button"
import { Crown, Plus, TrendUp, Users, Sparkle, Eye, Heart, Clock, Globe, Package, Star, ArrowRight } from "@phosphor-icons/react"
import { ExitDashboardButton } from "@/components/navigation/exit-dashboard-button"

export default function CreatorDashboard() {
  return (
    <div className="flex h-full w-full bg-background p-4 md:p-6 lg:p-8 overflow-y-auto">
        <div className="w-full pb-8">
          <ExitDashboardButton />
          <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-6">
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
            
            <div className="rounded-lg border border-border bg-card p-6">
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
            
            <div className="rounded-lg border border-border bg-card p-6">
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
            <div className="rounded-lg border border-border bg-card p-6">
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
              <div className="rounded-lg border border-border bg-card p-6">
                <h3 className="text-base font-medium text-foreground mb-4">Top Performing Experiences</h3>
                <div className="text-center text-muted-foreground">
                  <TrendUp className="mx-auto h-6 w-6 mb-2 opacity-50" />
                  <p className="text-sm">No data available</p>
                </div>
              </div>
              <div className="rounded-lg border border-border bg-card p-6">
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
              <button className="rounded-lg border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 p-4 cursor-pointer transition-all text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Globe className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Create Experience</h3>
                      <p className="text-xs text-muted-foreground">Build immersive worlds for your tribe</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </button>
              
              <button className="rounded-lg border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 p-4 cursor-pointer transition-all text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Upload Products</h3>
                      <p className="text-xs text-muted-foreground">Add avatars, outfits, and emotes</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </button>
              
              <button className="rounded-lg border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 p-4 cursor-pointer transition-all text-left">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Star className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-foreground">Create Point Pack</h3>
                      <p className="text-xs text-muted-foreground">Set up monetization tiers</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </button>
            </div>
          </div>
          </div>
        </div>
    </div>
  )
}