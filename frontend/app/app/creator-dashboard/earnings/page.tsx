"use client"

import { useState } from "react"
import { CurrencyDollar, TrendUp, Clock, Download, Bank, CreditCard, Receipt, Star, Calendar, ArrowUp, ArrowDown, Users, Repeat } from "@phosphor-icons/react"
import { ExitDashboardButton } from "@/components/navigation/exit-dashboard-button"
import { Button } from "@/components/common/button"

export default function EarningsPage() {
  const [timePeriod, setTimePeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  
  return (
    <div className="flex h-full w-full bg-background p-4 md:p-6 lg:p-8 overflow-y-auto">
        <div className="w-full">
          <ExitDashboardButton />
          <div className="space-y-6">
          {/* Header with Time Period Selector */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-foreground">Earnings Overview</h1>
            <div className="flex items-center gap-2 bg-sidebar border border-sidebar-border rounded-lg p-1">
              {[
                { value: '7d', label: '7 days' },
                { value: '30d', label: '30 days' },
                { value: '90d', label: '90 days' },
                { value: '1y', label: '1 year' }
              ].map((period) => (
                <button
                  key={period.value}
                  onClick={() => setTimePeriod(period.value as any)}
                  className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
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

          {/* Revenue Overview Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-500/20 p-2">
                  <CurrencyDollar className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold text-foreground">$0.00</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-500/20 p-2">
                  <Repeat className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Recurring</p>
                  <p className="text-2xl font-bold text-foreground">$0.00</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-purple-500/20 p-2">
                  <TrendUp className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Growth Rate</p>
                  <p className="text-2xl font-bold text-foreground">0%</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-orange-500/20 p-2">
                  <Bank className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Available</p>
                  <p className="text-2xl font-bold text-foreground">$0.00</p>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Breakdown by Source */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
              <h3 className="text-base font-medium text-foreground mb-4">Revenue Sources</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <span className="text-sm text-foreground">Tribe Memberships</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">$0.00</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                    <span className="text-sm text-foreground">Point Pack Sales</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">$0.00</span>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
              <h3 className="text-base font-medium text-foreground mb-4">Active Subscribers</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Current Members</span>
                  <span className="text-lg font-semibold text-foreground">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Monthly Churn Rate</span>
                  <span className="text-lg font-semibold text-foreground">0%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg. Subscription Length</span>
                  <span className="text-lg font-semibold text-foreground">0 months</span>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Charts */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Revenue Over Time</h2>
              <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
                <div className="h-48 flex items-end justify-center gap-1">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 w-6">
                      <div className="bg-green-400/40 w-full rounded-t" style={{ height: `${Math.random() * 60 + 10}%` }} />
                      <div className="bg-blue-400/40 w-full rounded-t" style={{ height: `${Math.random() * 40 + 5}%` }} />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <span className="text-xs text-muted-foreground">Memberships</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                    <span className="text-xs text-muted-foreground">Point Packs</span>
                  </div>
                </div>
                <div className="text-center text-muted-foreground mt-2">
                  <p className="text-sm">Revenue chart will show when you have sales data</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Revenue Distribution</h2>
              <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
                <div className="h-48 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border-8 border-green-400/20 border-t-green-400 border-r-blue-400 opacity-50"></div>
                </div>
                <div className="flex items-center justify-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <span className="text-xs text-muted-foreground">Tribe Memberships</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                    <span className="text-xs text-muted-foreground">Point Pack Sales</span>
                  </div>
                </div>
                <div className="text-center text-muted-foreground mt-2">
                  <p className="text-sm">Revenue distribution will appear here</p>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Breakdown Tables */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Point Pack Revenue</h2>
              <div className="rounded-lg border border-sidebar-border bg-sidebar">
                <div className="p-4 border-b border-sidebar-border">
                  <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground">
                    <span>Pack Tier</span>
                    <span>Sales</span>
                    <span>Revenue</span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="text-center text-muted-foreground">
                    <Star className="mx-auto h-6 w-6 mb-2 opacity-50" />
                    <p className="text-sm">No point pack sales yet</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Tribe Membership Revenue</h2>
              <div className="rounded-lg border border-sidebar-border bg-sidebar">
                <div className="p-4 border-b border-sidebar-border">
                  <div className="grid grid-cols-3 gap-4 text-sm font-medium text-muted-foreground">
                    <span>Month</span>
                    <span>New Members</span>
                    <span>Revenue</span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="text-center text-muted-foreground">
                    <Users className="mx-auto h-6 w-6 mb-2 opacity-50" />
                    <p className="text-sm">No tribe memberships yet</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Recent Transactions</h2>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </div>
            <div className="rounded-lg border border-sidebar-border bg-sidebar">
              <div className="p-4 border-b border-sidebar-border">
                <div className="grid grid-cols-5 gap-4 text-sm font-medium text-muted-foreground">
                  <span>Date</span>
                  <span>Customer</span>
                  <span>Type</span>
                  <span>Amount</span>
                  <span>Status</span>
                </div>
              </div>
              <div className="p-8">
                <div className="text-center text-muted-foreground">
                  <Receipt className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No transactions yet</p>
                  <p className="text-sm">Transaction history will appear here for both point pack sales and tribe memberships</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payout & Withdrawal */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Payout Settings</h2>
              <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Payout Method</p>
                      <p className="text-xs text-muted-foreground">How you receive earnings</p>
                    </div>
                    <Button variant="outline" size="sm">
                      Setup
                    </Button>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-black/20">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-foreground">No payout method configured</p>
                      <p className="text-xs text-muted-foreground">Setup bank account or payment method</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Withdrawal History</h2>
              <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
                <div className="text-center text-muted-foreground">
                  <Bank className="mx-auto h-6 w-6 mb-2 opacity-50" />
                  <p className="text-sm">No withdrawals yet</p>
                  <p className="text-xs mt-1">Payout history will appear here</p>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
    </div>
  )
}