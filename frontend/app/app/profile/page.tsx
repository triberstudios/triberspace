"use client"

import { useState } from "react"
import { Button } from "@/components/common/button"
import { EditProfileModal } from "@/components/profile/edit-profile-modal"

export default function Profile() {
    const [editModalOpen, setEditModalOpen] = useState(false)
    // Mock data - these would come from your user profile data
    const socialLinks = {
        instagram: { enabled: true, username: "@username" },
        twitter: { enabled: true, username: "@username" },
        youtube: { enabled: true, username: "@username" }
    }

    // Filter only enabled social links
    const enabledSocials = Object.entries(socialLinks)
        .filter(([_, data]) => data.enabled)
        .map(([platform, data]) => ({ platform, ...data }))

    return (
        <div className="flex h-full w-full">
            {/* Left Section - Profile Details (flexible width on desktop, full width on mobile) */}
            <div className="custom-scrollbar flex flex-1 w-full lg:w-auto flex-col gap-8 overflow-y-auto p-6">
                {/* Profile Header */}
                <div className="flex flex-col items-center gap-4">
                    {/* Avatar Circle */}
                    <div className="h-20 w-20 rounded-full bg-gray-300" />
                    
                    <div className="flex flex-1 items-center flex-col gap-2">
                        <h1 className="text-2xl font-semibold text-white">First Last</h1>
                        <p className="text-base text-gray-200">@username</p>
                    </div>
                    
                    {/* Edit Buttons - Edit Avatar shows only on mobile */}
                    <div className="flex gap-2">
                         <Button 
                            variant="default" 
                            size="default" 
                            className="rounded-full lg:hidden"
                            onClick={() => console.log("Edit avatar clicked")}
                        >
                            Edit avatar
                        </Button>
                        <Button 
                            variant="outline" 
                            size="default" 
                            className="rounded-full"
                            onClick={() => setEditModalOpen(true)}
                        >
                            Edit profile
                        </Button>
                    </div>
                </div>

                {/* About Section */}
                <div className="flex flex-col gap-2">
                    <h2 className="text-base font-semibold text-white">About</h2>
                    <div className="rounded-lg border border-white/10 p-4">
                        <p className="text-sm text-gray-200">
                            Lorem ipsum dolor sit amet consectetur. Ipsum ridiculus hendrerit interdum id suspendisse
                            volutpat commodo in bibendum. Sed egestas quis ac pretium congue.
                        </p>
                    </div>
                </div>

                {/* Social Links */}
                {enabledSocials.length > 0 && (
                    <div className="flex flex-wrap gap-4 lg:grid lg:gap-4 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
                        {enabledSocials.map(({ platform, username }, index) => (
                            <div 
                                key={platform} 
                                className={`flex flex-col gap-2 ${
                                    enabledSocials.length === 3 && index === 2 
                                        ? 'w-full lg:w-auto' 
                                        : 'flex-1 min-w-0 lg:w-auto'
                                }`}
                            >
                                <h3 className="text-base font-semibold text-white capitalize">
                                    {platform}
                                </h3>
                                <div className="rounded-lg border border-white/10 px-4 py-3">
                                    <p className="text-sm text-gray-200">{username}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Inventory Section */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-base font-semibold text-white">Inventory</h2>
                    
                    {/* Inventory Grid - responsive columns */}
                    <div className="grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                        {/* Placeholder inventory items */}
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                            <div
                                key={item}
                                className="aspect-[3/2] rounded-lg bg-white/5 border border-white/10"
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Section - Avatar Panel (fixed width, hidden on mobile) */}
            <div className="hidden lg:flex sticky top-0 h-full w-[400px] xl:w-[450px] flex-shrink-0 flex-col items-center justify-center p-6">
                {/* Avatar Display Area with button */}
                <div className="relative flex w-full flex-1 items-center justify-center">
                    <div className="flex w-full h-full items-center justify-center bg-white/0.5 rounded-lg border border-white/10">
                        <div className="text-center">
                            <p className="text-sm text-white/60">3D Avatar Preview</p>
                        </div>
                    </div>
                    
                    {/* Edit Avatar Button - Overlaying the container */}
                    <Button className="absolute bottom-8 rounded-full bg-white text-black hover:bg-white/90">
                        Edit avatar
                    </Button>
                </div>
            </div>
            
            {/* Edit Profile Modal */}
            <EditProfileModal 
                open={editModalOpen} 
                onOpenChange={setEditModalOpen} 
            />
        </div>
    );
}