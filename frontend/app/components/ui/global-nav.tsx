"use client"

import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useSession } from "@/lib/auth-client"
import { UserCircle } from "@phosphor-icons/react"

export function GlobalNav() {
  const { data: session, isPending } = useSession()

  return (
    <nav className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border bg-sidebar px-8">
      {/* Logo Section */}
      <Link href="/" className="flex items-center gap-2">
        <Image
          src="/TriberspaceLogo2025.svg"
          alt="Triberspace"
          width={150}
          height={40}
          className="h-8 w-auto"
          priority
        />
      </Link>

      {/* Auth Section */}
      <div className="flex items-center gap-4">
        {isPending ? (
          <div className="h-9 w-9 animate-pulse rounded-full bg-sidebar-accent" />
        ) : session ? (
          <Button variant="ghost" size="icon" className="h-10 w-10 cursor-pointer rounded-full">
            <UserCircle className="size-8" />
          </Button>
        ) : (
          <>
            <Button variant="outline" asChild>
              <Link href="/auth/sign-in">Log In</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/sign-up">Sign Up</Link>
            </Button>
          </>
        )}
      </div>
    </nav>
  )
}