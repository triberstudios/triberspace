"use client"

import { Button } from "@/components/common/button"
import { Plus, Globe, Eye, Users, Clock, DotsThree } from "@phosphor-icons/react"
import { ExitDashboardButton } from "@/components/navigation/exit-dashboard-button"

export default function ExperiencesPage() {
  return (
    <div className="flex h-full w-full bg-background p-4 md:p-6 lg:p-8 overflow-y-auto">
        <div className="w-full">
          <ExitDashboardButton />
          <div className="space-y-6">
          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-500/20 p-2">
                  <Globe className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Experiences</p>
                  <p className="text-2xl font-bold text-foreground">0</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-500/20 p-2">
                  <Eye className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                  <p className="text-2xl font-bold text-foreground">0</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-purple-500/20 p-2">
                  <Users className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold text-foreground">0</p>
                </div>
              </div>
            </div>
          </div>

          {/* Experiences List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Your Experiences</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  Sort
                </Button>
              </div>
            </div>
            
            {/* Empty State */}
            <div className="rounded-lg border border-sidebar-border bg-sidebar p-8">
              <div className="text-center text-muted-foreground">
                <Globe className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-foreground mb-2">No experiences yet</h3>
                <p className="text-sm mb-4">Create your first immersive experience to get started</p>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Your First Experience
                </Button>
              </div>
            </div>
          </div>

          {/* Experience Template Ideas */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Experience Templates</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-sidebar-border bg-sidebar p-6 cursor-pointer hover:bg-sidebar-accent/10 transition-colors">
                <div className="space-y-3">
                  <div className="w-full h-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                    <Globe className="h-8 w-8 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Virtual Showcase</h3>
                    <p className="text-xs text-muted-foreground">Display and sell your digital products</p>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border border-sidebar-border bg-sidebar p-6 cursor-pointer hover:bg-sidebar-accent/10 transition-colors">
                <div className="space-y-3">
                  <div className="w-full h-24 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                    <Users className="h-8 w-8 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Community Hub</h3>
                    <p className="text-xs text-muted-foreground">Build a space for your community</p>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border border-sidebar-border bg-sidebar p-6 cursor-pointer hover:bg-sidebar-accent/10 transition-colors">
                <div className="space-y-3">
                  <div className="w-full h-24 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg flex items-center justify-center">
                    <Clock className="h-8 w-8 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Event Space</h3>
                    <p className="text-xs text-muted-foreground">Host live events and meetups</p>
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