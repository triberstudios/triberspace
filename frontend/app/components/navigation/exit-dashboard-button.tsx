"use client"

import Link from "next/link"
import { ArrowLeft } from "@phosphor-icons/react"
import { Button } from "@/components/common/button"

export function ExitDashboardButton() {
  return (
    <div className="mb-4">
      <Button 
        variant="outline" 
        size="sm" 
        asChild
        className="inline-flex items-center gap-2 h-8 px-3 text-sm w-auto"
      >
        <Link href="/">
          <ArrowLeft className="h-4 w-4" />
          <span>Exit dashboard</span>
        </Link>
      </Button>
    </div>
  )
}