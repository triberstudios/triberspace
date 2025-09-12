"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface WeekCalendarProps {
  className?: string
}

export function WeekCalendar({ className }: WeekCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())

  // Get the current week's dates (Sunday to Saturday)
  const getWeekDates = (date: Date) => {
    const week = []
    const startOfWeek = new Date(date)
    const day = startOfWeek.getDay()
    startOfWeek.setDate(startOfWeek.getDate() - day)

    for (let i = 0; i < 7; i++) {
      const weekDate = new Date(startOfWeek)
      weekDate.setDate(startOfWeek.getDate() + i)
      week.push(weekDate)
    }
    return week
  }

  // Navigate to previous week
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentDate(newDate)
  }

  // Navigate to next week
  const goToNextWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentDate(newDate)
  }

  // Format month and year for display
  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric' 
    })
  }

  // Check if a date is today
  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const weekDates = getWeekDates(currentDate)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className={cn("w-full", className)}>
      {/* Header with title and navigation */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-sidebar-foreground tracking-tight">Your calendar</h2>
        
        <div className="flex items-center gap-4">
          {/* Previous week button */}
          <button 
            onClick={goToPreviousWeek}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/5 bg-sidebar hover:bg-sidebar/80 transition-colors"
            aria-label="Previous week"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-sidebar-foreground">
              <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Month/Year display */}
          <span className="text-sidebar-foreground font-medium min-w-[80px] text-center">
            {formatMonthYear(currentDate)}
          </span>

          {/* Next week button */}
          <button 
            onClick={goToNextWeek}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-white/5 bg-sidebar hover:bg-sidebar/80 transition-colors"
            aria-label="Next week"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-sidebar-foreground">
              <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="border border-white/5 rounded-lg overflow-hidden bg-sidebar">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-white/5">
          {dayNames.map((day) => (
            <div 
              key={day}
              className="p-4 text-center text-sidebar-foreground font-medium bg-sidebar"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Date cells */}
        <div className="grid grid-cols-7">
          {weekDates.map((date, index) => (
            <div 
              key={index}
              className={cn(
                "p-4 min-h-[160px] border-r border-white/5 last:border-r-0 bg-sidebar hover:bg-sidebar/80 transition-colors cursor-pointer",
                isToday(date) && "bg-sidebar-accent"
              )}
            >
              <div className={cn(
                "text-sidebar-foreground font-medium",
                isToday(date) && "text-sidebar-accent-foreground font-semibold"
              )}>
                {date.getDate()}
              </div>
              {/* Empty space for future events */}
              <div className="mt-2"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}