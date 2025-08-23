"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/common/button"
import { Input } from "@/components/common/input"
import { Label } from "@/components/common/label"
import { Textarea } from "@/components/ui/textarea"

interface EditProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditProfileModal({ open, onOpenChange }: EditProfileModalProps) {
  const [username, setUsername] = useState("@username")
  const [firstName, setFirstName] = useState("Name")
  const [lastName, setLastName] = useState("Name")
  const [about, setAbout] = useState("Lorem ipsum dolor sit amet consectetur. Ipsum ridiculus hendrerit interdum id suspendisse volutpat commodo in bibendum.")
  const [instagram, setInstagram] = useState("@username")
  const [twitter, setTwitter] = useState("@username")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission (non-functional for now)
    console.log("Form submitted")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-md rounded-lg border bg-card p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}>
        <div className="px-8 py-8">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-center mb-6">
              Edit profile
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username" className="text-sm font-medium">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="firstName" className="text-sm font-medium">
                First name
              </Label>
              <Input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="lastName" className="text-sm font-medium">
                Last name
              </Label>
              <Input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="about" className="text-sm font-medium">
                About
              </Label>
              <Textarea
                id="about"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                className="w-full min-h-[100px]"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="instagram" className="text-sm font-medium">
                Instagram
              </Label>
              <Input
                id="instagram"
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="twitter" className="text-sm font-medium">
                Twitter
              </Label>
              <Input
                id="twitter"
                type="text"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                className="w-full"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full mt-2"
            >
              Submit
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}