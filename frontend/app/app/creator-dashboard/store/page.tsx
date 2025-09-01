"use client"

import { Button } from "@/components/common/button"
import { Plus, ShoppingCartSimple, Package, CurrencyDollar, TrendUp, Eye } from "@phosphor-icons/react"
import { ExitDashboardButton } from "@/components/navigation/exit-dashboard-button"

export default function StorePage() {
  return (
    <div className="flex h-full w-full bg-background p-4 md:p-6 lg:p-8 overflow-y-auto">
        <div className="w-full">
          <ExitDashboardButton />
          <div className="space-y-6">
          {/* Store Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-500/20 p-2">
                  <Package className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold text-foreground">0</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-500/20 p-2">
                  <CurrencyDollar className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Sales</p>
                  <p className="text-2xl font-bold text-foreground">$0</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-purple-500/20 p-2">
                  <TrendUp className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Orders</p>
                  <p className="text-2xl font-bold text-foreground">0</p>
                </div>
              </div>
            </div>
            
            <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-orange-500/20 p-2">
                  <Eye className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Views</p>
                  <p className="text-2xl font-bold text-foreground">0</p>
                </div>
              </div>
            </div>
          </div>

          {/* Products Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Products</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm">
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  Sort
                </Button>
              </div>
            </div>
            
            {/* Product Categories */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-medium text-foreground">Avatars</h3>
                  <Button variant="ghost" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-center text-muted-foreground">
                  <Package className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No avatars uploaded</p>
                </div>
              </div>
              
              <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-medium text-foreground">Outfits</h3>
                  <Button variant="ghost" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-center text-muted-foreground">
                  <Package className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No outfits uploaded</p>
                </div>
              </div>
              
              <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-medium text-foreground">Emotes</h3>
                  <Button variant="ghost" size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-center text-muted-foreground">
                  <Package className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No emotes uploaded</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">Recent Orders</h2>
            <div className="rounded-lg border border-sidebar-border bg-sidebar">
              <div className="p-4 border-b border-sidebar-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-medium text-foreground">Order History</h3>
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </div>
              </div>
              <div className="p-8">
                <div className="text-center text-muted-foreground">
                  <ShoppingCartSimple className="mx-auto h-8 w-8 mb-2 opacity-50" />
                  <p>No orders yet</p>
                  <p className="text-sm">Orders will appear here when customers purchase your products</p>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
    </div>
  )
}