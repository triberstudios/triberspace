"use client";

import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import usePartySocket from "partysocket/react";
import { useSession } from "@/lib/auth-client";

// Avatar data interface (matches backend)
interface AvatarData {
  baseModelUrl: string;
  primaryColor?: string;
  equippedItems?: Array<{
    slotName: string;
    meshUrl: string;
    textureUrl?: string;
  }>;
}

// Player state interface (matches backend)
interface PlayerState {
  id: string;
  userId: string;
  username: string;
  position: { x: number; y: number; z: number };
  rotation: number;
  animation: string;
  color: string;
  avatar?: AvatarData;
}

interface PartyKitContextValue {
  socket: ReturnType<typeof usePartySocket>;
  players: Map<string, PlayerState>;
  sendPlayerUpdate: (update: {
    position: { x: number; y: number; z: number };
    rotation: number;
    animation: string;
  }) => void;
  sendChatMessage: (message: string) => void;
  localSessionId: string | null;
  isConnected: boolean;
}

export const PartyKitContext = createContext<PartyKitContextValue | null>(null);

export function PartyKitProvider({
  spaceId,
  children
}: {
  spaceId: string;
  children: ReactNode;
}) {
  const { data: session } = useSession();
  const [players, setPlayers] = useState<Map<string, PlayerState>>(new Map());
  const [isConnected, setIsConnected] = useState(false);

  // Get session token from cookie for authentication
  const getSessionToken = () => {
    if (typeof document === 'undefined') return null;

    const cookies = document.cookie.split(';');
    const sessionCookie = cookies.find(c => c.trim().startsWith('better-auth.session_token='));
    return sessionCookie ? sessionCookie.split('=')[1] : null;
  };

  const socket = usePartySocket({
    host: process.env.NEXT_PUBLIC_PARTYKIT_HOST || (typeof window !== 'undefined' ? `${window.location.hostname}:1999` : "localhost:1999"),
    room: spaceId,
    query: () => {
      const token = getSessionToken();
      return token ? { token } : {};
    },
    onOpen() {
      console.log("✅ Connected to multiplayer space:", spaceId);
      setIsConnected(true);
    },
    onMessage(event) {
      try {
        const data = JSON.parse(event.data);

        switch (data.type) {
          case "playerList":
            // Initial player list from server
            setPlayers(new Map(data.players.map((p: PlayerState) => [p.id, p])));
            console.log(`📋 Received ${data.players.length} players`);
            break;

          case "playerJoin":
            // New player joined
            setPlayers(prev => new Map(prev).set(data.player.id, data.player));
            console.log(`👋 ${data.player.username} joined`);
            break;

          case "playerUpdate":
            // Player position/animation update
            setPlayers(prev => {
              const updated = new Map(prev);
              const existing = updated.get(data.player.id);
              if (existing) {
                updated.set(data.player.id, { ...existing, ...data.player });
              }
              return updated;
            });
            break;

          case "playerLeave":
            // Player disconnected
            setPlayers(prev => {
              const updated = new Map(prev);
              const player = updated.get(data.playerId);
              if (player) {
                console.log(`👋 ${player.username} left`);
              }
              updated.delete(data.playerId);
              return updated;
            });
            break;

          case "chatMessage":
            // Chat message received
            console.log(`💬 ${data.userName}: ${data.message}`);

            // Update player with last message for chat bubble display
            setPlayers(prev => {
              const updated = new Map(prev);
              const player = updated.get(data.senderId);
              if (player) {
                updated.set(data.senderId, {
                  ...player,
                  lastMessage: data.message,
                  messageTimeout: Date.now() + 5000 // 5 second timeout
                } as any);
              }
              return updated;
            });
            break;

          default:
            console.warn("Unknown message type:", data.type);
        }
      } catch (error) {
        console.error("Failed to parse multiplayer message:", error);
      }
    },
    onClose() {
      console.log("👋 Disconnected from multiplayer");
      setIsConnected(false);
    },
    onError(error) {
      console.error("WebSocket error:", error);
      setIsConnected(false);
    }
  });

  // Cleanup expired chat messages
  useEffect(() => {
    const interval = setInterval(() => {
      setPlayers(prevPlayers => {
        let hasChanges = false;
        const updatedPlayers = new Map(prevPlayers);

        for (const [id, player] of updatedPlayers.entries()) {
          const playerAny = player as any;
          if (playerAny.messageTimeout && Date.now() > playerAny.messageTimeout) {
            updatedPlayers.set(id, {
              ...player,
              lastMessage: undefined,
              messageTimeout: undefined
            } as any);
            hasChanges = true;
          }
        }

        return hasChanges ? updatedPlayers : prevPlayers;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const sendPlayerUpdate = (update: {
    position: { x: number; y: number; z: number };
    rotation: number;
    animation: string;
  }) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({ type: "playerUpdate", ...update }));
    }
  };

  const sendChatMessage = (message: string) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({ type: "chatMessage", message }));
    }
  };

  return (
    <PartyKitContext.Provider value={{
      socket,
      players,
      sendPlayerUpdate,
      sendChatMessage,
      localSessionId: socket?.id || null,
      isConnected
    }}>
      {children}
    </PartyKitContext.Provider>
  );
}

export function usePartyKit() {
  const context = useContext(PartyKitContext);
  if (!context) {
    throw new Error("usePartyKit must be used within PartyKitProvider");
  }
  return context;
}
