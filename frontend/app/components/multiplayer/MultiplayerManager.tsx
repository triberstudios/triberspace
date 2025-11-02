"use client";

import { usePartyKit } from "@/contexts/multiplayer/PartyKitContext";
import { OtherPlayer } from "./OtherPlayer";

/**
 * MultiplayerManager - Renders all other players in the scene
 * Filters out the local player (rendered by ThirdPersonCamera)
 */
export function MultiplayerManager() {
  const { players, localSessionId } = usePartyKit();

  // Filter out local player - they're rendered by ThirdPersonCamera
  const otherPlayers = Array.from(players.values()).filter(
    p => p.id !== localSessionId
  );

  return (
    <>
      {otherPlayers.map(player => (
        <OtherPlayer key={player.id} player={player} />
      ))}
    </>
  );
}
