"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/common/button"
import { useSession, authClient } from "@/lib/auth-client"
import { UserCircle, User, Gear, SignOut, UserFocus, MagicWand, Plus, Bank, Star, Globe, Package } from "@phosphor-icons/react"
import { toast } from "sonner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function GlobalNav() {
  const { data: session, isPending } = useSession()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await authClient.signOut()
      toast.success("Successfully signed out!")
      router.push("/")
    } catch (error: any) {
      toast.error(error.message || "Failed to sign out")
    } finally {
      setIsSigningOut(false)
    }
  }

  // Show create dropdown only in creator dashboard
  const showCreateDropdown = pathname.startsWith('/creator-dashboard')

  return (
    <nav className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:px-8">
      {/* Logo Section */}
      <Link href="/" className="flex items-center gap-2">
        <Image
          src="/TriberspaceLogo2025.svg"
          alt="Triberspace"
          width={145}
          height={38}
          className="h-7.5 w-auto mt-1"
          priority
        />
      </Link>

      {/* Auth Section */}
      <div className="flex items-center gap-4">
        {/* Creator Create Dropdown */}
        {session && showCreateDropdown && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden md:inline">Create</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem className="cursor-pointer">
                <Globe className="mr-2 h-4 w-4" />
                Create Experience
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Package className="mr-2 h-4 w-4" />
                Add Product
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        
        {/* Desktop Auth Buttons */}
        {!isPending && !session && (
          <div className="hidden md:flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link href="/auth/sign-in">Log In</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/sign-up">Sign Up</Link>
            </Button>
          </div>
        )}
        
        {/* Profile Dropdown (Mobile: always shown, Desktop: only when authenticated or pending) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn(
                "h-10 w-10 cursor-pointer rounded-full",
                !isPending && !session && "md:hidden"
              )}
            >
              <UserCircle className="size-8" weight="fill" style={{ color: '#FCFDE8' }}/>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {isPending ? (
              <DropdownMenuItem disabled className="py-3">
                <span className="text-muted-foreground">Loading...</span>
              </DropdownMenuItem>
            ) : session ? (
                  <>
                    <DropdownMenuLabel className="py-3">
                      <div className="flex flex-col space-y-1">
                        <p className="text-base font-medium leading-none">{session.user.name}</p>
                        <p className="text-sm leading-none text-muted-foreground">{session.user.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="py-3">
                      <Link href="/profile" className="cursor-pointer text-base">
                        <User className="mr-3 h-5 w-5" />
                        <span>View profile</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="py-3">
                      <Link href="/avatar" className="cursor-pointer text-base">
                        <UserFocus className="mr-3 h-5 w-5" />
                        <span>Edit avatar</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="py-3">
                      <Link href="/creator-dashboard" className="cursor-pointer text-base">
                        <MagicWand className="mr-3 h-5 w-5" />
                        <span>Creator Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="py-3">
                      <Link href="/settings" className="cursor-pointer text-base">
                        <Gear className="mr-3 h-5 w-5" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} disabled={isSigningOut} className="cursor-pointer py-3 text-base">
                      <SignOut className="mr-3 h-5 w-5" />
                      <span>{isSigningOut ? "Signing out..." : "Sign Out"}</span>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem asChild className="py-3">
                      <Link href="/auth/sign-in" className="cursor-pointer text-base">
                        <SignOut className="mr-3 h-5 w-5 rotate-180" />
                        <span>Log In</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="py-3">
                      <Link href="/auth/sign-up" className="cursor-pointer text-base">
                        <User className="mr-3 h-5 w-5" />
                        <span>Sign Up</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
      </div>
    </nav>
  )
}