"use client"

import { useState } from "react"
import { Users, Crown, Clock, ChatCircle, TrendUp, UserPlus, Fire, Heart, Calendar, DotsThree, CurrencyDollar, Gear } from "@phosphor-icons/react"
import { ExitDashboardButton } from "@/components/navigation/exit-dashboard-button"
import Link from "next/link"
import { Button } from "@/components/common/button"

export default function TribePage() {
  const [memberFilter, setMemberFilter] = useState<'all' | 'active' | 'new' | 'inactive'>('all')
  const [expandedTiers, setExpandedTiers] = useState<Record<string, boolean>>({})
  
  return (
    <div className="flex min-h-full w-full bg-background p-4 md:p-6 lg:p-8 overflow-y-auto">
        <div className="w-full pb-8">
          <ExitDashboardButton />
          <div className="space-y-6">

          {/* Tribe Statistics and Most Active */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Tribe Statistics</h2>
              <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Members</span>
                    <span className="text-base font-semibold text-foreground">0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">New This Month</span>
                    <span className="text-base font-semibold text-foreground">0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active Today</span>
                    <span className="text-base font-semibold text-foreground">0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Retention Rate</span>
                    <span className="text-base font-semibold text-foreground">0%</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Most Active Members</h2>
              <div className="rounded-lg border border-sidebar-border bg-sidebar">
                <div className="p-4 border-b border-sidebar-border">
                  <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground">
                    <span>Member</span>
                    <span>Activity Score</span>
                    <span>Last Seen</span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="text-center text-muted-foreground">
                    <Crown className="mx-auto h-6 w-6 mb-2 opacity-50" />
                    <p className="text-sm">No active members yet</p>
                    <p className="text-xs mt-1">Most active tribe members will appear here</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Comments */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Recent Comments & Activity</h2>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
            <div className="rounded-lg border border-sidebar-border bg-sidebar">
              <div className="p-4 border-b border-sidebar-border">
                <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground">
                  <span>Member</span>
                  <span>Activity</span>
                  <span>Location</span>
                  <span>Time</span>
                </div>
              </div>
              <div className="p-8">
                <div className="text-center text-muted-foreground">
                  <ChatCircle className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No recent activity</p>
                  <p className="text-sm">Member comments and interactions will appear here</p>
                </div>
              </div>
            </div>
          </div>

          {/* Membership Tiers */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Membership Tiers</h2>
              <Button variant="outline" size="sm" className="flex items-center gap-2" asChild>
                <Link href="/creator-dashboard/store?tab=membership-tiers">
                  <CurrencyDollar className="h-4 w-4" />
                  Edit Pricing
                </Link>
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
                <div className="text-center text-muted-foreground">
                  <Crown className="mx-auto h-12 w-12 mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No membership tiers created</h3>
                  <p className="text-sm">Create membership tiers in the Store to manage perks here</p>
                </div>
              </div>
            </div>
          </div>

          {/* Member Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Member Management</h2>
              <div className="flex items-center gap-2 bg-sidebar border border-sidebar-border rounded-lg p-1">
                {[
                  { value: 'all', label: 'All' },
                  { value: 'active', label: 'Active' },
                  { value: 'new', label: 'New' },
                  { value: 'inactive', label: 'Inactive' }
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setMemberFilter(filter.value as any)}
                    className={`px-3 py-2 text-sm font-medium rounded transition-colors cursor-pointer ${
                      memberFilter === filter.value
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="rounded-lg border border-sidebar-border bg-sidebar">
              <div className="p-4 border-b border-sidebar-border">
                <div className="grid grid-cols-5 gap-4 text-sm font-medium text-muted-foreground">
                  <span>Member</span>
                  <span>Join Date</span>
                  <span>Status</span>
                  <span>Activity Level</span>
                  <span>Actions</span>
                </div>
              </div>
              <div className="p-8">
                <div className="text-center text-muted-foreground">
                  <Users className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No tribe members yet</p>
                  <p className="text-sm">Your tribe members will appear here when people join</p>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
    </div>
  )
}