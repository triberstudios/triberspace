"use client"

import { useState } from "react"
import { Button } from "@/components/common/button"
import { CaretDown, PencilSimple } from "@phosphor-icons/react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/common/input"
import { Label } from "@/components/common/label"

type TabType = "avatar" | "outfit" | "emotes"

interface AvatarConfig {
  id: string
  name: string
  avatarId: string
  outfitId?: string
  emoteId?: string
}

export default function Avatar() {
    const [activeTab, setActiveTab] = useState<TabType>("avatar")
    const [selectedAvatar, setSelectedAvatar] = useState<string>("1")
    const [selectedConfig, setSelectedConfig] = useState<string>("default")
    const [addToListOpen, setAddToListOpen] = useState(false)
    const [configName, setConfigName] = useState("")
    const [editModalOpen, setEditModalOpen] = useState(false)
    const [editingConfig, setEditingConfig] = useState<AvatarConfig | null>(null)
    const [editName, setEditName] = useState("")
    
    // Mock saved configurations
    const [savedConfigs] = useState<AvatarConfig[]>([
        { id: "default", name: "Avatar name", avatarId: "1" },
        { id: "config1", name: "My Cool Avatar", avatarId: "2", outfitId: "outfit1" },
        { id: "config2", name: "Party Look", avatarId: "3", outfitId: "outfit2", emoteId: "emote1" }
    ])
    
    // Mock data for avatars and their associated items
    const avatarData: {
        avatars: number[]
        outfits: Record<string, number[]>
        emotes: Record<string, number[]>
    } = {
        avatars: [1, 2, 3, 4, 5, 6],
        outfits: {
            "1": [1, 2, 3, 4],
            "2": [1, 2, 3, 4, 5],
            "3": [1, 2],
        },
        emotes: {
            "1": [1, 2, 3],
            "2": [1, 2, 3, 4],
            "3": [1, 2, 3, 4, 5, 6],
        }
    }
    
    const getGridItems = () => {
        switch(activeTab) {
            case "avatar":
                return avatarData.avatars
            case "outfit":
                return avatarData.outfits[selectedAvatar] || []
            case "emotes":
                return avatarData.emotes[selectedAvatar] || []
            default:
                return []
        }
    }
    
    const handleAddToList = (e: React.FormEvent) => {
        e.preventDefault()
        // Handle adding configuration to list
        console.log("Adding config:", configName)
        setAddToListOpen(false)
        setConfigName("")
    }
    
    const handleEditConfig = (config: AvatarConfig) => {
        setEditingConfig(config)
        setEditName(config.name)
        setEditModalOpen(true)
    }
    
    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault()
        // Handle saving edited configuration name
        console.log("Saving edited config:", editingConfig?.id, editName)
        setEditModalOpen(false)
        setEditingConfig(null)
        setEditName("")
    }

    return (
        <div className="flex h-full w-full">
            {/* Left Side - Avatar Display (50%) */}
            <div className="flex w-1/2 flex-col items-center justify-center bg-black/20 p-8">
                {/* Avatar Preview Area */}
                <div className="relative flex h-full w-full items-center justify-center bg-white/0.5 border border-white/10 rounded-lg">
                    {/* Avatar Configuration Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="absolute top-4 right-4 flex w-48 items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white hover:bg-black/50 transition-colors cursor-pointer">
                                <span className="text-sm truncate">
                                    {savedConfigs.find(c => c.id === selectedConfig)?.name || "Avatar name"}
                                </span>
                                <CaretDown className="h-4 w-4 flex-shrink-0" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-black/90 border-white/10 min-w-[200px] p-1">
                            {savedConfigs.map((config) => (
                                <div
                                    key={config.id}
                                    className="flex items-center gap-1 rounded-sm"
                                >
                                    <button
                                        onClick={() => setSelectedConfig(config.id)}
                                        className="flex-1 text-left px-2 py-1.5 text-sm text-white hover:bg-white/10 rounded-sm cursor-pointer transition-colors"
                                    >
                                        {config.name}
                                    </button>
                                    <button
                                        onClick={() => handleEditConfig(config)}
                                        className="p-2 text-white/70 hover:text-white rounded-sm transition-colors cursor-pointer"
                                    >
                                        <PencilSimple className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    
                    <p className="text-white/40">Avatar Preview</p>
                </div>
            </div>

            {/* Right Side - Avatar Selection (50%) */}
            <div className="flex w-1/2 flex-col bg-background p-8">
                {/* Tab Navigation */}
                <div className="mb-8 flex gap-8 border-b border-white/10">
                    <button
                        onClick={() => setActiveTab("avatar")}
                        className={`pb-4 text-lg font-medium transition-colors cursor-pointer ${
                            activeTab === "avatar" 
                                ? "border-b-2 border-white text-white" 
                                : "text-white/40 hover:text-white/60"
                        }`}
                    >
                        Avatar
                    </button>
                    <button
                        onClick={() => setActiveTab("outfit")}
                        className={`pb-4 text-lg font-medium transition-colors cursor-pointer ${
                            activeTab === "outfit" 
                                ? "border-b-2 border-white text-white" 
                                : "text-white/40 hover:text-white/60"
                        }`}
                    >
                        Outfit
                    </button>
                    <button
                        onClick={() => setActiveTab("emotes")}
                        className={`pb-4 text-lg font-medium transition-colors cursor-pointer ${
                            activeTab === "emotes" 
                                ? "border-b-2 border-white text-white" 
                                : "text-white/40 hover:text-white/60"
                        }`}
                    >
                        Emotes
                    </button>
                </div>

                {/* Grid Content */}
                <div className="custom-scrollbar flex-1 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                        {getGridItems().map((item) => (
                            <div
                                key={`${activeTab}-${item}`}
                                className="aspect-square cursor-pointer rounded-lg border border-white/10 bg-white/5 transition-all hover:border-white/20 hover:bg-white/10"
                                onClick={() => {
                                    if (activeTab === "avatar") {
                                        setSelectedAvatar(item.toString())
                                    }
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Bottom Buttons */}
                <div className="mt-8 flex gap-4">
                    <Button 
                        className="flex-1 rounded-full"
                        variant="default"
                    >
                        Save
                    </Button>
                    <Button 
                        className="flex-1 rounded-full"
                        variant="outline"
                        onClick={() => setAddToListOpen(true)}
                    >
                        Add to list
                    </Button>
                </div>
            </div>
            
            {/* Add to List Dialog */}
            <Dialog open={addToListOpen} onOpenChange={setAddToListOpen}>
                <DialogContent 
                    className="max-w-md rounded-lg border bg-card p-0"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <div className="px-8 py-8">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-semibold text-center mb-6">
                                Save Avatar Configuration
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleAddToList} className="flex flex-col gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="configName" className="text-sm font-medium">
                                    Configuration Name
                                </Label>
                                <Input
                                    id="configName"
                                    type="text"
                                    value={configName}
                                    onChange={(e) => setConfigName(e.target.value)}
                                    placeholder="Enter a name for this avatar configuration"
                                    className="w-full"
                                    required
                                />
                            </div>

                            <Button 
                                type="submit" 
                                className="w-full mt-2"
                            >
                                Save to List
                            </Button>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
            
            {/* Edit Configuration Dialog */}
            <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
                <DialogContent 
                    className="max-w-md rounded-lg border bg-card p-0"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <div className="px-8 py-8">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-semibold text-center mb-6">
                                Edit Configuration Name
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="editName" className="text-sm font-medium">
                                    Configuration Name
                                </Label>
                                <Input
                                    id="editName"
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Enter a new name for this configuration"
                                    className="w-full"
                                    required
                                />
                            </div>

                            <Button 
                                type="submit" 
                                className="w-full mt-2"
                            >
                                Save Changes
                            </Button>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}