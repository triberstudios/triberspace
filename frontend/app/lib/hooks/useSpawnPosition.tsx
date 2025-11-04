"use client";

import { useState, useEffect } from "react";
import { usePartyKit } from "@/contexts/multiplayer/PartyKitContext";
import { calculateSpawnPosition } from "@/lib/utils/spawnUtils";

interface UseSpawnPositionProps {
  defaultSpawnPoint: [number, number, number];
  spawnRadius: number;
  minDistance: number;
}

/**
 * useSpawnPosition - Calculates spawn position to avoid player overlap
 * Waits for PartyKit connection and player list before calculating
 */
export function useSpawnPosition({
  defaultSpawnPoint,
  spawnRadius,
  minDistance
}: UseSpawnPositionProps): [number, number, number] | null {
  const { players, isConnected } = usePartyKit();
  const [spawnPosition, setSpawnPosition] = useState<[number, number, number] | null>(null);
  const [hasCalculated, setHasCalculated] = useState(false);

  useEffect(() => {
    // Wait for PartyKit connection to establish and receive initial player list
    if (!isConnected) {
      console.log('⏳ Waiting for multiplayer connection before spawn calculation...');
      return;
    }

    // Only calculate once
    if (hasCalculated) return;

    // Add small delay to ensure initial player list is received
    const timer = setTimeout(() => {
      const existingPlayers = Array.from(players.values());

      const calculated = calculateSpawnPosition(
        existingPlayers,
        defaultSpawnPoint,
        spawnRadius,
        minDistance
      );

      setSpawnPosition(calculated);
      setHasCalculated(true);
    }, 100); // 100ms delay after connection established

    return () => clearTimeout(timer);
  }, [isConnected, players, hasCalculated, defaultSpawnPoint, spawnRadius, minDistance]);

  return spawnPosition;
}
