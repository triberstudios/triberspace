"use client";

import { usePartyKit } from "@/contexts/multiplayer/PartyKitContext";
import { RemotePlayer } from "./RemotePlayer";

/**
 * MultiplayerManager - Renders all remote players in the scene
 * Filters out the local player (rendered by LocalPlayer)
 */
export function MultiplayerManager() {
  const { players, localSessionId } = usePartyKit();

  // Filter out local player - they're rendered by LocalPlayer
  const remotePlayers = Array.from(players.values()).filter(
    p => p.id !== localSessionId
  );

  return (
    <>
      {remotePlayers.map(player => (
        <RemotePlayer key={player.id} player={player} />
      ))}
    </>
  );
}
