"use client"

import { useState } from "react"
import { Button } from "@/components/common/button"
import { Plus, ShoppingCartSimple, Package, CurrencyDollar, TrendUp, Eye, Sparkle, Star } from "@phosphor-icons/react"
import { ExitDashboardButton } from "@/components/navigation/exit-dashboard-button"

export default function StorePage() {
  const [activeTab, setActiveTab] = useState<'products' | 'point-packs'>('products')
  
  return (
    <div className="flex h-full w-full bg-background p-4 md:p-6 lg:p-8 overflow-y-auto">
        <div className="w-full">
          <ExitDashboardButton />
          <div className="space-y-6">
          {/* Store Tabs */}
          <div className="flex items-center gap-4 border-b border-sidebar-border">
            <button
              onClick={() => setActiveTab('products')}
              className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'products'
                  ? 'border-sidebar-accent-foreground text-sidebar-accent-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab('point-packs')}
              className={`pb-4 px-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'point-packs'
                  ? 'border-sidebar-accent-foreground text-sidebar-accent-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              Point Packs
            </button>
          </div>


          {activeTab === 'products' ? (
            <>
              {/* Product Categories */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Product Categories</h2>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      Sort
                    </Button>
                  </div>
                </div>
                
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
            </>
          ) : (
            <>
              {/* Point Packs Management */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-foreground">Point Pack Tiers</h2>
                  <Button className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Create Point Pack
                  </Button>
                </div>
                
                {/* Point Pack Grid */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {/* Example Point Pack Cards */}
                  <div className="rounded-lg border border-sidebar-border bg-sidebar p-6">
                    <div className="text-center text-muted-foreground">
                      <Star className="mx-auto h-12 w-12 mb-4 opacity-50" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No point packs created</h3>
                      <p className="text-sm mb-4">Create your first point pack to start monetizing</p>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Create First Pack
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

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