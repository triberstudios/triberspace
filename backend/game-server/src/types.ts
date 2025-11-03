// Shared TypeScript types for multiplayer game server

export interface AvatarData {
  baseModelUrl: string;
  primaryColor?: string;
  equippedItems?: Array<{
    slotName: string;
    meshUrl: string;
    textureUrl?: string;
  }>;
}

export interface PlayerState {
  id: string;
  userId: string;
  username: string;
  position: { x: number; y: number; z: number };
  rotation: number;
  animation: string;
  color: string;
  avatar?: AvatarData;
}

export interface PlayerUpdateMessage {
  type: "playerUpdate";
  position: { x: number; y: number; z: number };
  rotation: number;
  animation: string;
}

export interface ChatMessage {
  type: "chatMessage";
  message: string;
}

export type ClientMessage = PlayerUpdateMessage | ChatMessage;

export interface BetterAuthSession {
  userId: string;
  user: {
    id: string;
    username?: string;
    email: string;
    name?: string;
  };
}
