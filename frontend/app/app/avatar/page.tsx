"use client"

import { useState } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { EffectComposer, Bloom } from "@react-three/postprocessing"
import { Button } from "@/components/common/button"
import { CaretDown, PencilSimple } from "@phosphor-icons/react"
import { Avatar3D } from "@/components/avatar/avatar-3d"
import { ColorPicker } from "@/components/ui/color-picker"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
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
  emoteIds?: string[]
}

interface AvatarData {
  id: string
  name: string
  image: string | null
  modelPath: string
}

interface OutfitData {
  id: string
  name: string
  image: string
  modelPath: string | null
}

// Helper function to get user's current state (would be from database in real app)
function getUserCurrentState() {
    // TODO: Replace with actual database/API call
    // For now, return default state
    return {
        avatarId: "1",
        outfitId: "off"
    }
}

export default function Avatar() {
    // Get user's current equipped state for instant loading
    const defaultState = getUserCurrentState()
    
    const [activeTab, setActiveTab] = useState<TabType>("avatar")
    const [selectedAvatar, setSelectedAvatar] = useState<string>(defaultState.avatarId)
    const [selectedOutfit, setSelectedOutfit] = useState<string>(defaultState.outfitId)
    const [selectedEmotes, setSelectedEmotes] = useState<string[]>([])
    const [selectedConfig, setSelectedConfig] = useState<string>("default")
    const [addToListOpen, setAddToListOpen] = useState(false)
    const [avatarColor, setAvatarColor] = useState<string>("#ffffff")
    const [configName, setConfigName] = useState("")
    const [editModalOpen, setEditModalOpen] = useState(false)
    const [editingConfig, setEditingConfig] = useState<AvatarConfig | null>(null)
    const [editName, setEditName] = useState("")
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [outfitLoading, setOutfitLoading] = useState(false)
    
    // Mock saved configurations
    const [savedConfigs] = useState<AvatarConfig[]>([
        { id: "default", name: "Avatar 1", avatarId: "1" },
        { id: "config1", name: "Avatar 2", avatarId: "2", outfitId: "outfit1" },
        { id: "config2", name: "Avatar 3", avatarId: "3", outfitId: "outfit2", emoteIds: ["emote1", "emote2"] }
    ])
    
    // Avatar and outfit data
    const avatarData: {
        avatars: AvatarData[]
        outfits: Record<string, OutfitData[]>
        emotes: Record<string, number[]>
    } = {
        avatars: [
            { id: "1", name: "Triber Avatar", image: "/TriberAvi.png", modelPath: "/TriberCharacterMod.glb" },
            { id: "2", name: "Basic Avatar", image: null, modelPath: "/TriberTest2.glb" },
        ],
        outfits: {
            "1": [
                { id: "off", name: "No Outfit", image: "/OutfitOff.png", modelPath: null },
                { id: "fit1", name: "Outfit 1", image: "/OutfitOn.png", modelPath: "/TriberFit1.glb" }
            ],
            "2": [
                { id: "off", name: "No Outfit", image: "/OutfitOff.png", modelPath: null },
            ]
        },
        emotes: {
            "1": [1, 2, 3],
            "2": [1, 2, 3, 4],
            "3": [1, 2, 3, 4, 5, 6],
        }
    }

    // Get current avatar model path
    const currentAvatar = avatarData.avatars.find(a => a.id === selectedAvatar)
    const modelPath = currentAvatar?.modelPath || "/TriberCharacter.glb"
    
    // Get selected outfit data for Avatar3D
    const currentOutfits = avatarData.outfits[selectedAvatar] || []
    const selectedOutfitData = currentOutfits.find(o => o.id === selectedOutfit)
    const outfitModelPath = selectedOutfitData?.modelPath || null
    
    const getGridItems = (): (AvatarData | OutfitData | number)[] => {
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
    
    const handleSave = () => {
        // Save current selections to the selected configuration
        const configToSave = {
            configId: selectedConfig,
            avatarId: selectedAvatar,
            outfitId: selectedOutfit,
            emoteIds: selectedEmotes
        }
        console.log("Saving configuration:", configToSave)
        // TODO: API call to save configuration
    }
    
    const handleAddToList = (e: React.FormEvent) => {
        e.preventDefault()
        // Create new configuration with current selections
        const newConfig = {
            name: configName,
            avatarId: selectedAvatar,
            outfitId: selectedOutfit,
            emoteIds: selectedEmotes
        }
        console.log("Adding new configuration:", newConfig)
        // TODO: API call to create new configuration
        // After creating, select the new configuration
        // setSelectedConfig(newConfigId)
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
        console.log("Saving edited config name:", editingConfig?.id, editName)
        // TODO: API call to update configuration name
        setEditModalOpen(false)
        setEditingConfig(null)
        setEditName("")
    }
    
    const handleDeleteConfig = () => {
        console.log("Deleting configuration:", editingConfig?.id)
        // TODO: API call to delete configuration
        setEditModalOpen(false)
        setEditingConfig(null)
        setEditName("")
    }
    
    const handleSelectConfig = (configId: string) => {
        setSelectedConfig(configId)
        const config = savedConfigs.find(c => c.id === configId)
        if (config) {
            // Load the saved selections from this configuration
            setSelectedAvatar(config.avatarId)
            setSelectedOutfit(config.outfitId || "off")
            setSelectedEmotes(config.emoteIds || [])
            console.log("Loaded configuration:", config)
        }
        // Close the dropdown after selection
        setDropdownOpen(false)
    }

    return (
        <div className="flex flex-col lg:flex-row h-full w-full">
            {/* Left Side - Avatar Display (50% desktop, full width mobile) */}
            <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-black/20 p-4 lg:p-8 min-h-[40vh] lg:min-h-full">
                {/* Avatar Preview Area */}
                <div className="relative flex h-full w-full items-center justify-center bg-white/0.5 border border-white/15 rounded-lg">
                    {/* Canvas Container */}
                    <div className="absolute inset-0 rounded-lg overflow-hidden">
                        <Canvas camera={{ position: [0, 3.5, 7] }}>
                            <OrbitControls 
                                enablePan={true} 
                                enableZoom={true} 
                                target={[0, 3.5, 0]}
                                minPolarAngle={Math.PI / 2}
                                maxPolarAngle={Math.PI / 2}
                            />
                            <ambientLight intensity={3} />
                            <Avatar3D 
                                color={avatarColor}
                                baseModelPath={modelPath}
                                outfitModelPath={outfitModelPath}
                                onOutfitLoading={setOutfitLoading}
                                enableColorCustomization={selectedAvatar === "1"}
                            />
                            <EffectComposer>
                                <Bloom
                                    intensity={1}
                                    kernelSize={3}
                                    luminanceThreshold={0.85}
                                    luminanceSmoothing={0.05}
                                    mipmapBlur={true}
                                />
                            </EffectComposer>
                        </Canvas>
                    </div>
                    
                    {/* Avatar Configuration Dropdown - Positioned above Canvas */}
                    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
                        <DropdownMenuTrigger asChild>
                            <button className="absolute top-2 right-2 lg:top-4 lg:right-4 flex w-40 lg:w-48 items-center justify-between gap-2 rounded-lg border border-white/10 bg-black/40 px-3 lg:px-4 py-2 lg:py-3 text-white hover:bg-black/50 transition-colors cursor-pointer text-sm lg:text-base z-10">
                                <span className="truncate">
                                    {savedConfigs.find(c => c.id === selectedConfig)?.name || "Avatar name"}
                                </span>
                                <CaretDown className="h-4 w-4 flex-shrink-0 text-white" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-black/90 border-white/10 min-w-[200px] p-1 z-50">
                            {savedConfigs.map((config) => (
                                <div
                                    key={config.id}
                                    className="flex items-center gap-1 rounded-sm"
                                >
                                    <button
                                        onClick={() => handleSelectConfig(config.id)}
                                        className="flex-1 text-left px-2 py-1.5 text-sm text-white hover:bg-white/10 rounded-sm cursor-pointer transition-colors"
                                    >
                                        {config.name}
                                    </button>
                                    <button
                                        onClick={() => handleEditConfig(config)}
                                        className="p-2 text-white/70 hover:text-white hover:bg-white/5 rounded-sm transition-colors cursor-pointer"
                                    >
                                        <PencilSimple className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                    
                    {/* Accent Color Overlay - Only show for avatars that support color customization */}
                    {selectedAvatar === "1" && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/20 backdrop-blur-sm p-4 rounded-b-lg">
                            <div className="flex items-center justify-center gap-3">
                                <span className="text-white text-sm font-medium">Accent color:</span>
                                <ColorPicker
                                    value={avatarColor}
                                    onChange={setAvatarColor}
                                    className=""
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Side - Avatar Selection (50% desktop, full width mobile) */}
            <div className="flex w-full lg:w-1/2 flex-col bg-background p-4 lg:p-8 h-full">
                {/* Tab Navigation */}
                <div className="mb-6 lg:mb-8 flex gap-4 lg:gap-8 border-b border-white/10">
                    <button
                        onClick={() => setActiveTab("avatar")}
                        className={`pb-3 lg:pb-4 text-base lg:text-lg font-medium transition-colors cursor-pointer min-h-[44px] flex items-center ${
                            activeTab === "avatar" 
                                ? "border-b-2 border-white text-white" 
                                : "text-white/40 hover:text-white/60"
                        }`}
                    >
                        Avatar
                    </button>
                    <button
                        onClick={() => setActiveTab("outfit")}
                        className={`pb-3 lg:pb-4 text-base lg:text-lg font-medium transition-colors cursor-pointer min-h-[44px] flex items-center ${
                            activeTab === "outfit" 
                                ? "border-b-2 border-white text-white" 
                                : "text-white/40 hover:text-white/60"
                        }`}
                    >
                        Outfit
                    </button>
                    <button
                        onClick={() => setActiveTab("emotes")}
                        className={`pb-3 lg:pb-4 text-base lg:text-lg font-medium transition-colors cursor-pointer min-h-[44px] flex items-center ${
                            activeTab === "emotes" 
                                ? "border-b-2 border-white text-white" 
                                : "text-white/40 hover:text-white/60"
                        }`}
                    >
                        Emotes
                    </button>
                </div>

                {/* Grid Content */}
                <div className="flex-1 min-h-0 overflow-x-auto lg:overflow-y-auto lg:overflow-x-visible custom-scrollbar">
                    {/* Mobile: Horizontal carousel, Desktop: Vertical grid */}
                    <div className="flex gap-3 lg:grid lg:grid-cols-3 lg:gap-4 pb-4 lg:pb-0">
                        {getGridItems().map((item: any, index: number) => {
                            let isSelected = false
                            let displayContent = null
                            let clickHandler = () => {}

                            if (activeTab === "avatar" && typeof item === "object" && "id" in item) {
                                isSelected = selectedAvatar === item.id
                                displayContent = item.image ? (
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                                ) : null
                                clickHandler = () => setSelectedAvatar(item.id)
                            } else if (activeTab === "outfit" && typeof item === "object" && "id" in item) {
                                isSelected = selectedOutfit === item.id
                                displayContent = item.image ? (
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-lg" />
                                ) : null
                                clickHandler = () => setSelectedOutfit(item.id)
                            } else if (activeTab === "emotes") {
                                const emoteId = item.toString()
                                isSelected = selectedEmotes.includes(emoteId)
                                clickHandler = () => {
                                    setSelectedEmotes(prev => 
                                        prev.includes(emoteId) 
                                            ? prev.filter(id => id !== emoteId)
                                            : [...prev, emoteId]
                                    )
                                }
                            }

                            return (
                                <div
                                    key={`${activeTab}-${typeof item === "object" && "id" in item ? item.id : item}-${index}`}
                                    className={`aspect-square cursor-pointer rounded-lg border transition-all hover:border-white/20 hover:bg-white/10 min-h-[44px] w-44 lg:w-auto flex-shrink-0 ${
                                        isSelected 
                                            ? 'border-white/40 bg-white/20' 
                                            : 'border-white/10 bg-white/5'
                                    }`}
                                    onClick={clickHandler}
                                >
                                    {displayContent}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Bottom Buttons - Pinned to bottom */}
                <div className="mt-6 lg:mt-8 flex gap-3 lg:gap-4 flex-shrink-0">
                    <Button 
                        className="flex-1 rounded-full"
                        variant="default"
                        onClick={handleSave}
                    >
                        Save
                    </Button>
                    <Button 
                        className="flex-1 rounded-full"
                        variant="outline"
                        onClick={() => setAddToListOpen(true)}
                    >
                        Save as new preset
                    </Button>
                </div>
            </div>
            
            {/* Add to List Dialog */}
            <Dialog open={addToListOpen} onOpenChange={setAddToListOpen}>
                <DialogContent 
                    className="max-w-[90vw] w-full sm:max-w-md rounded-lg border bg-card p-0"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <div className="px-4 py-6 sm:px-8 sm:py-8">
                        <DialogHeader>
                            <DialogTitle className="text-xl sm:text-2xl font-semibold text-center mb-4 sm:mb-6">
                                Save avatar preset
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleAddToList} className="flex flex-col gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="configName" className="text-sm font-medium">
                                    Preset name
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
                    className="max-w-[90vw] w-full sm:max-w-md rounded-lg border bg-card p-0"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <div className="px-4 py-6 sm:px-8 sm:py-8">
                        <DialogHeader>
                            <DialogTitle className="text-xl sm:text-2xl font-semibold text-center mb-4 sm:mb-6">
                                Edit preset
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="editName" className="text-sm font-medium">
                                    Preset Name
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

                            <div className="flex gap-4 mt-2">
                                <Button 
                                    type="submit" 
                                    className="flex-1"
                                >
                                    Save Changes
                                </Button>
                                <Button 
                                    type="button"
                                    variant="destructive"
                                    className="flex-1"
                                    onClick={handleDeleteConfig}
                                >
                                    Delete
                                </Button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}