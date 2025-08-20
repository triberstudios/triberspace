"use client"

import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

interface SegmentOption {
  value: string
  label: string
}

const segmentedControlVariants = cva(
  "inline-flex rounded-full border bg-background shadow-xs p-1",
  {
    variants: {
      size: {
        sm: "",
        default: "", 
        lg: ""
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
)

const segmentVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer",
  {
    variants: {
      size: {
        sm: "h-8 px-3 py-2 text-sm",
        default: "h-9 px-4 py-2.5 text-base",
        lg: "h-10 px-6 py-3 text-lg"
      }
    },
    defaultVariants: {
      size: "default"
    }
  }
)

interface SegmentedControlProps extends VariantProps<typeof segmentedControlVariants> {
  options: SegmentOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}

export function SegmentedControl({ 
  options, 
  value, 
  onChange, 
  className,
  size = "default"
}: SegmentedControlProps) {
  return (
    <div className={cn(segmentedControlVariants({ size }), className)}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            segmentVariants({ size }),
            value === option.value
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}