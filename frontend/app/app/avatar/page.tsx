"use client"

import { useState, useEffect } from "react"
import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { EffectComposer, Bloom } from "@react-three/postprocessing"
import { Button } from "@/components/common/button"
import { CaretDown, PencilSimple, Check } from "@phosphor-icons/react"
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

interface SavedLook {
  id: string
  name: string
  avatarId: string
  outfitId: string
  emoteIds: string[]
  color: string
  createdAt: number
  updatedAt: number
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

// localStorage utilities for look management
const LOOKS_STORAGE_KEY = 'triberspace_avatar_looks'
const CURRENT_LOOK_KEY = 'triberspace_current_look_id'

function loadLooksFromStorage(): SavedLook[] {
    try {
        const stored = localStorage.getItem(LOOKS_STORAGE_KEY)
        return stored ? JSON.parse(stored) : []
    } catch (error) {
        console.error('Failed to load looks from localStorage:', error)
        return []
    }
}

function saveLooksToStorage(looks: SavedLook[]): void {
    try {
        localStorage.setItem(LOOKS_STORAGE_KEY, JSON.stringify(looks))
    } catch (error) {
        console.error('Failed to save looks to localStorage:', error)
    }
}

function getCurrentLookId(): string | null {
    try {
        return localStorage.getItem(CURRENT_LOOK_KEY)
    } catch (error) {
        console.error('Failed to get current look ID:', error)
        return null
    }
}

function setCurrentLookId(id: string | null): void {
    try {
        if (id) {
            localStorage.setItem(CURRENT_LOOK_KEY, id)
        } else {
            localStorage.removeItem(CURRENT_LOOK_KEY)
        }
    } catch (error) {
        console.error('Failed to set current look ID:', error)
    }
}

function generateLookId(): string {
    return `look_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
    const [currentLookId, setCurrentLookIdState] = useState<string | null>(null)
    const [addToListOpen, setAddToListOpen] = useState(false)
    const [avatarColor, setAvatarColor] = useState<string>("#ffffff")
    const [configName, setConfigName] = useState("")
    const [editModalOpen, setEditModalOpen] = useState(false)
    const [editingLook, setEditingLook] = useState<SavedLook | null>(null)
    const [editName, setEditName] = useState("")
    const [dropdownOpen, setDropdownOpen] = useState(false)
    const [outfitLoading, setOutfitLoading] = useState(false)
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
    
    // localStorage-backed look management
    const [savedLooks, setSavedLooks] = useState<SavedLook[]>([])
    
    // Initialize looks from localStorage on component mount
    useEffect(() => {
        let loadedLooks = loadLooksFromStorage()
        
        // Ensure there's always a default Avatar 1 look
        const defaultLook: SavedLook = {
            id: 'default-avatar-1',
            name: 'Look 1',
            avatarId: '1',
            outfitId: 'off',
            emoteIds: [],
            color: '#ffffff',
            createdAt: Date.now(),
            updatedAt: Date.now()
        }
        
        const hasDefaultLook = loadedLooks.some(l => l.id === 'default-avatar-1')
        if (!hasDefaultLook) {
            loadedLooks = [defaultLook, ...loadedLooks]
            saveLooksToStorage(loadedLooks)
        }
        
        setSavedLooks(loadedLooks)
        
        const currentId = getCurrentLookId()
        if (currentId && loadedLooks.some(l => l.id === currentId)) {
            setCurrentLookIdState(currentId)
            const currentLook = loadedLooks.find(l => l.id === currentId)
            if (currentLook) {
                setSelectedAvatar(currentLook.avatarId)
                setSelectedOutfit(currentLook.outfitId)
                setSelectedEmotes(currentLook.emoteIds)
                setAvatarColor(currentLook.color)
            }
        } else {
            // No valid current look, select the default Avatar 1
            setCurrentLookIdState('default-avatar-1')
            setCurrentLookId('default-avatar-1')
            setSelectedAvatar('1')
            setSelectedOutfit('off')
            setSelectedEmotes([])
            setAvatarColor('#ffffff')
        }
    }, [])
    
    // Track changes to detect unsaved modifications
    useEffect(() => {
        if (currentLookId) {
            const currentLook = savedLooks.find(l => l.id === currentLookId)
            if (currentLook) {
                const hasChanges = 
                    currentLook.avatarId !== selectedAvatar ||
                    currentLook.outfitId !== selectedOutfit ||
                    JSON.stringify(currentLook.emoteIds.sort()) !== JSON.stringify(selectedEmotes.sort()) ||
                    currentLook.color !== avatarColor
                setHasUnsavedChanges(hasChanges)
            }
        } else {
            // No look selected, consider any non-default state as unsaved changes
            const hasChanges = 
                selectedAvatar !== "1" ||
                selectedOutfit !== "off" ||
                selectedEmotes.length > 0 ||
                avatarColor !== "#ffffff"
            setHasUnsavedChanges(hasChanges)
        }
    }, [currentLookId, savedLooks, selectedAvatar, selectedOutfit, selectedEmotes, avatarColor])
    
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
        if (currentLookId) {
            // Update existing look
            const updatedLooks = savedLooks.map(look => 
                look.id === currentLookId
                    ? {
                        ...look,
                        avatarId: selectedAvatar,
                        outfitId: selectedOutfit,
                        emoteIds: selectedEmotes,
                        color: avatarColor,
                        updatedAt: Date.now()
                    }
                    : look
            )
            setSavedLooks(updatedLooks)
            saveLooksToStorage(updatedLooks)
            setHasUnsavedChanges(false)
        } else {
            // No current look - prompt to save as new
            setAddToListOpen(true)
        }
    }
    
    const handleAddToList = (e: React.FormEvent) => {
        e.preventDefault()
        
        const newLook: SavedLook = {
            id: generateLookId(),
            name: configName.trim(),
            avatarId: selectedAvatar,
            outfitId: selectedOutfit,
            emoteIds: selectedEmotes,
            color: avatarColor,
            createdAt: Date.now(),
            updatedAt: Date.now()
        }
        
        const updatedLooks = [...savedLooks, newLook]
        setSavedLooks(updatedLooks)
        saveLooksToStorage(updatedLooks)
        
        // Set this as the current look
        setCurrentLookIdState(newLook.id)
        setCurrentLookId(newLook.id)
        setHasUnsavedChanges(false)
        
        setAddToListOpen(false)
        setConfigName("")
    }
    
    const handleEditLook = (look: SavedLook) => {
        setEditingLook(look)
        setEditName(look.name)
        setEditModalOpen(true)
    }
    
    const handleSaveEdit = (e: React.FormEvent) => {
        e.preventDefault()
        
        if (editingLook) {
            const updatedLooks = savedLooks.map(look =>
                look.id === editingLook.id
                    ? { ...look, name: editName.trim(), updatedAt: Date.now() }
                    : look
            )
            setSavedLooks(updatedLooks)
            saveLooksToStorage(updatedLooks)
        }
        
        setEditModalOpen(false)
        setEditingLook(null)
        setEditName("")
    }
    
    const handleDeleteLook = () => {
        if (editingLook) {
            const updatedLooks = savedLooks.filter(look => look.id !== editingLook.id)
            setSavedLooks(updatedLooks)
            saveLooksToStorage(updatedLooks)
            
            // If we're deleting the current look, clear the current selection
            if (currentLookId === editingLook.id) {
                setCurrentLookIdState(null)
                setCurrentLookId(null)
            }
        }
        
        setEditModalOpen(false)
        setEditingLook(null)
        setEditName("")
    }
    
    const handleSelectLook = (lookId: string) => {
        const look = savedLooks.find(l => l.id === lookId)
        if (look) {
            setCurrentLookIdState(lookId)
            setCurrentLookId(lookId)
            
            // Load the look's values
            setSelectedAvatar(look.avatarId)
            setSelectedOutfit(look.outfitId)
            setSelectedEmotes(look.emoteIds)
            setAvatarColor(look.color)
        }
        
        setDropdownOpen(false)
    }
    
    const handleCreateNewLook = () => {
        // Generate next sequential look name based on total count
        const nextNumber = savedLooks.length + 1
        const newLookName = `Look ${nextNumber}`
        
        const newLook: SavedLook = {
            id: generateLookId(),
            name: newLookName,
            avatarId: selectedAvatar,
            outfitId: selectedOutfit,
            emoteIds: selectedEmotes,
            color: avatarColor,
            createdAt: Date.now(),
            updatedAt: Date.now()
        }
        
        const updatedLooks = [...savedLooks, newLook]
        setSavedLooks(updatedLooks)
        saveLooksToStorage(updatedLooks)
        
        // Set this as the current look
        setCurrentLookIdState(newLook.id)
        setCurrentLookId(newLook.id)
        setHasUnsavedChanges(false)
        
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
                                    {currentLookId 
                                        ? savedLooks.find(l => l.id === currentLookId)?.name || "Unnamed look"
                                        : "No look selected"
                                    }
                                    {hasUnsavedChanges && " *"}
                                </span>
                                <CaretDown className="h-4 w-4 flex-shrink-0 text-white" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-black/90 border-white/10 min-w-[200px] p-1 z-50">
                            <div className="px-2 py-2 text-xs font-medium text-white/60 border-b border-white/10 mb-1">
                                Saved looks
                            </div>
{savedLooks.length === 0 ? (
                                <div className="px-2 py-1.5 text-sm text-white/60">
                                    No saved looks
                                </div>
                            ) : (
                                savedLooks.map((look) => (
                                    <div
                                        key={look.id}
                                        className="flex items-center gap-1 rounded-sm"
                                    >
                                        <button
                                            onClick={() => handleSelectLook(look.id)}
                                            className={`flex-1 text-left px-2 py-1.5 text-sm hover:bg-white/10 rounded-sm cursor-pointer transition-colors ${
                                                look.id === currentLookId ? 'text-white bg-white/5' : 'text-white/90'
                                            }`}
                                        >
                                            {look.name}
                                        </button>
                                        <button
                                            onClick={() => handleEditLook(look)}
                                            className="p-2 text-white/70 hover:text-white hover:bg-white/5 rounded-sm transition-colors cursor-pointer"
                                        >
                                            <PencilSimple className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))
                            )}
                            
                            {/* Add New Look Button */}
                            <div className="border-t border-white/10 mt-1 pt-1">
                                <button
                                    onClick={handleCreateNewLook}
                                    className="w-full text-left px-2 py-1.5 text-sm text-white/90 hover:bg-white/10 rounded-sm cursor-pointer transition-colors"
                                >
                                    + New look
                                </button>
                            </div>
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
                            let itemTitle = ""
                            let backgroundImage = ""
                            let clickHandler = () => {}

                            if (activeTab === "avatar" && typeof item === "object" && "id" in item) {
                                isSelected = selectedAvatar === item.id
                                itemTitle = item.name
                                backgroundImage = item.image || ""
                                clickHandler = () => setSelectedAvatar(item.id)
                            } else if (activeTab === "outfit" && typeof item === "object" && "id" in item) {
                                isSelected = selectedOutfit === item.id
                                itemTitle = item.name
                                backgroundImage = item.image || ""
                                clickHandler = () => setSelectedOutfit(item.id)
                            } else if (activeTab === "emotes") {
                                const emoteId = item.toString()
                                isSelected = selectedEmotes.includes(emoteId)
                                itemTitle = `Emote ${emoteId}`
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
                                    className={`relative aspect-square cursor-pointer rounded-lg border transition-all hover:border-white/20 hover:bg-white/10 min-h-[44px] w-44 lg:w-auto flex-shrink-0 overflow-hidden group ${
                                        isSelected 
                                            ? 'border-white/40 bg-white/20' 
                                            : 'border-white/10 bg-white/5'
                                    }`}
                                    onClick={clickHandler}
                                >
                                    {/* Background Image or Pattern */}
                                    {backgroundImage ? (
                                        <div 
                                            className="absolute inset-0 bg-cover bg-center"
                                            style={{ backgroundImage: `url(${backgroundImage})` }}
                                        />
                                    ) : (
                                        <div className="absolute inset-0 bg-white/5">
                                            {/* Diagonal stripe pattern for empty items */}
                                            <div 
                                                className="absolute inset-0 opacity-20"
                                                style={{
                                                    backgroundImage: `repeating-linear-gradient(
                                                        45deg,
                                                        rgba(255, 255, 255, 0.1) 0px,
                                                        rgba(255, 255, 255, 0.1) 8px,
                                                        transparent 8px,
                                                        transparent 16px
                                                    )`
                                                }}
                                            />
                                        </div>
                                    )}
                                    
                                    {/* Hover Overlay */}
                                    <div className="absolute inset-0 bg-black/0 transition-all duration-300 group-hover:bg-black/20" />
                                    
                                    {/* Selected State Checkmark */}
                                    {isSelected && (
                                        <div className="absolute top-2 right-2 w-6 h-6 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
                                            <Check className="w-4 h-4 text-white" weight="bold" />
                                        </div>
                                    )}
                                    
                                    {/* Bottom Title Overlay */}
                                    {itemTitle && (
                                        <div className="absolute bottom-0 left-0 right-0 p-3 backdrop-blur-lg bg-black/30 border-t border-white/10">
                                            <h3 className="text-white font-medium text-sm leading-tight truncate">
                                                {itemTitle}
                                            </h3>
                                        </div>
                                    )}
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
                        disabled={!hasUnsavedChanges}
                    >
                        Save
                    </Button>
                    <Button 
                        className="flex-1 rounded-full"
                        variant="outline"
                        onClick={() => setAddToListOpen(true)}
                        disabled={!hasUnsavedChanges}
                    >
                        Save as new look
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
                                Save avatar look
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleAddToList} className="flex flex-col gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="configName" className="text-sm font-medium">
                                    Look name
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
                                Edit look
                            </DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="editName" className="text-sm font-medium">
                                    Look name
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
                                    type="button"
                                    variant="destructive"
                                    className="flex-1"
                                    onClick={handleDeleteLook}
                                >
                                    Delete
                                </Button>
                                <Button 
                                    type="submit" 
                                    className="flex-1"
                                >
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}