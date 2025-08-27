"use client"

import * as React from "react"
import { useState, useCallback, useEffect, useRef } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { Input } from "@/components/common/input"
import { cn } from "@/lib/utils"

interface ColorPickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

// Improved color conversion functions with proper bounds checking
function hexToHsv(hex: string): [number, number, number] {
  if (!hex || !hex.startsWith('#') || hex.length !== 7) {
    return [0, 0, 100] // Default to white if invalid
  }

  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255  
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min

  let h = 0
  if (diff !== 0) {
    switch (max) {
      case r: h = (g - b) / diff + (g < b ? 6 : 0); break
      case g: h = (b - r) / diff + 2; break
      case b: h = (r - g) / diff + 4; break
    }
    h /= 6
  }

  const s = max === 0 ? 0 : diff / max
  const v = max

  return [Math.round(h * 360), Math.round(s * 100), Math.round(v * 100)]
}

function hsvToHex(h: number, s: number, v: number): string {
  h = Math.max(0, Math.min(360, h)) / 360
  s = Math.max(0, Math.min(100, s)) / 100
  v = Math.max(0, Math.min(100, v)) / 100

  const c = v * s
  const x = c * (1 - Math.abs((h * 6) % 2 - 1))
  const m = v - c

  let r = 0, g = 0, b = 0

  if (0 <= h && h < 1/6) {
    r = c; g = x; b = 0
  } else if (1/6 <= h && h < 1/3) {
    r = x; g = c; b = 0
  } else if (1/3 <= h && h < 1/2) {
    r = 0; g = c; b = x
  } else if (1/2 <= h && h < 2/3) {
    r = 0; g = x; b = c
  } else if (2/3 <= h && h < 5/6) {
    r = x; g = 0; b = c
  } else if (5/6 <= h && h < 1) {
    r = c; g = 0; b = x
  }

  const red = Math.round((r + m) * 255)
  const green = Math.round((g + m) * 255)  
  const blue = Math.round((b + m) * 255)

  return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [internalHue, setInternalHue] = useState(0)
  const [internalSaturation, setInternalSaturation] = useState(100)
  const [internalValue, setInternalValue] = useState(100)
  const [tempHex, setTempHex] = useState(value)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  
  const triggerRef = useRef<HTMLButtonElement>(null)
  const selectionRef = useRef<HTMLDivElement>(null)
  const hueRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState<'selection' | 'hue' | null>(null)

  // Initialize internal state only when opening picker or when prop changes externally
  useEffect(() => {
    if (value !== tempHex) {
      const [h, s, v] = hexToHsv(value)
      setInternalHue(h)
      setInternalSaturation(s)
      setInternalValue(v)
      setTempHex(value)
    }
  }, [value, tempHex])

  // Update temp hex and call onChange when internal values change (but not in circular way)
  const updateColor = useCallback((h: number, s: number, v: number) => {
    const newHex = hsvToHex(h, s, v)
    setTempHex(newHex)
    onChange(newHex)
  }, [onChange])

  const handleSelectionMove = useCallback((clientX: number, clientY: number) => {
    if (!selectionRef.current) return
    
    const rect = selectionRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    
    const newS = Math.round(x * 100)
    const newV = Math.round((1 - y) * 100)
    
    setInternalSaturation(newS)
    setInternalValue(newV)
    updateColor(internalHue, newS, newV)
  }, [internalHue, updateColor])

  const handleHueMove = useCallback((clientX: number) => {
    if (!hueRef.current) return
    
    const rect = hueRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const newH = Math.round(x * 360)
    
    setInternalHue(newH)
    updateColor(newH, internalSaturation, internalValue)
  }, [internalSaturation, internalValue, updateColor])

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (isDragging === 'selection') {
      handleSelectionMove(e.clientX, e.clientY)
    } else if (isDragging === 'hue') {
      handleHueMove(e.clientX)
    }
  }, [isDragging, handleSelectionMove, handleHueMove])

  const handlePointerUp = useCallback(() => {
    setIsDragging(null)
  }, [])

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove)
      window.addEventListener('pointerup', handlePointerUp)
      return () => {
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
      }
    }
  }, [isDragging, handlePointerMove, handlePointerUp])

  const handleHexInput = useCallback((inputValue: string) => {
    if (inputValue.startsWith('#') && inputValue.length === 7) {
      // Valid hex, update everything
      const [h, s, v] = hexToHsv(inputValue)
      setInternalHue(h)
      setInternalSaturation(s)
      setInternalValue(v)
      setTempHex(inputValue)
      onChange(inputValue)
    } else if (inputValue.startsWith('#') && inputValue.length < 7) {
      // Partial hex, just update temp
      setTempHex(inputValue)
    }
  }, [onChange])

  // Calculate position when opening
  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const pickerHeight = 240 // Approximate picker height
    
    // Position above the trigger, left-aligned
    const top = triggerRect.top - pickerHeight - 8
    const left = triggerRect.left

    setPosition({ top, left })
  }, [])

  // Handle dialog state changes
  const handleOpenChange = useCallback((open: boolean) => {
    if (open) {
      calculatePosition()
    }
    setIsOpen(open)
  }, [calculatePosition])

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <button
          ref={triggerRef}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md border border-white/20 cursor-pointer hover:border-white/40 transition-colors",
            className
          )}
          style={{ backgroundColor: value }}
        >
          <span className="sr-only">Choose color</span>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-transparent" />
        <Dialog.Content
          className="fixed z-50 flex flex-col gap-3 p-4 bg-black/90 border border-white/20 rounded-lg shadow-xl backdrop-blur-sm focus:outline-none"
          style={{
            width: '240px',
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'none',
          }}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Dialog.Title className="sr-only">Color picker</Dialog.Title>
          {/* Color Selection Area */}
          <div
            ref={selectionRef}
            className="relative w-full h-32 cursor-crosshair rounded"
            style={{
              background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${internalHue}, 100%, 50%))`
            }}
            onPointerDown={(e) => {
              setIsDragging('selection')
              handleSelectionMove(e.clientX, e.clientY)
            }}
          >
            <div
              className="absolute w-3 h-3 rounded-full border-2 border-white shadow-md pointer-events-none"
              style={{
                left: `${internalSaturation}%`,
                top: `${100 - internalValue}%`,
                transform: 'translate(-50%, -50%)'
              }}
            />
          </div>

          {/* Hue Slider */}
          <div
            ref={hueRef}
            className="relative w-full h-4 cursor-pointer rounded"
            style={{
              background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
            }}
            onPointerDown={(e) => {
              setIsDragging('hue')
              handleHueMove(e.clientX)
            }}
          >
            <div
              className="absolute w-4 h-4 rounded-full border-2 border-white shadow-md pointer-events-none"
              style={{
                left: `${(internalHue / 360) * 100}%`,
                transform: 'translate(-50%, -50%)',
                top: '50%'
              }}
            />
          </div>

          {/* Hex Input */}
          <Input
            type="text"
            value={tempHex}
            onChange={(e) => handleHexInput(e.target.value)}
            className="w-full text-sm font-mono bg-black/40 border-white/20 text-white"
            placeholder="#ffffff"
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}