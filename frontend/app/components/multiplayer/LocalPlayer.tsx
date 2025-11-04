"use client";

import ThirdPersonCamera from "@/lib/runtime/ThirdPersonCamera";
import { useSpawnPosition } from "@/lib/hooks/useSpawnPosition";

interface LocalPlayerProps {
  defaultSpawnPoint: [number, number, number];
  spawnRadius: number;
  minDistance: number;
  characterColor?: string;
  initialCameraAngle?: number;
}

/**
 * LocalPlayer - Calculates spawn position and renders local player
 * Must be rendered inside PartyKitProvider
 */
export function LocalPlayer({
  defaultSpawnPoint,
  spawnRadius,
  minDistance,
  characterColor = "#4080ff",
  initialCameraAngle = 0
}: LocalPlayerProps) {
  const spawnPosition = useSpawnPosition({
    defaultSpawnPoint,
    spawnRadius,
    minDistance
  });

  // Wait for spawn position to be calculated
  if (!spawnPosition) {
    return null;
  }

  return (
    <ThirdPersonCamera
      initialPosition={spawnPosition}
      characterColor={characterColor}
      initialCameraAngle={initialCameraAngle}
    />
  );
}
