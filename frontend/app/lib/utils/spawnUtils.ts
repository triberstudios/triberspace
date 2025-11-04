/**
 * Calculate a spawn position that avoids overlapping with existing players
 * @param existingPlayers - Array of player positions to avoid
 * @param spawnCenter - Center point of spawn zone [x, y, z]
 * @param spawnRadius - Radius of circular spawn zone
 * @param minDistance - Minimum distance from other players
 * @param maxAttempts - Maximum random position attempts before fallback
 * @returns Calculated spawn position [x, y, z]
 */
export function calculateSpawnPosition(
  existingPlayers: Array<{ position: { x: number; y: number; z: number } }>,
  spawnCenter: [number, number, number],
  spawnRadius: number,
  minDistance: number,
  maxAttempts: number = 10
): [number, number, number] {
  const [centerX, centerY, centerZ] = spawnCenter;

  console.log('🎯 Spawn calculation started');
  console.log(`  📍 Spawn center: [${centerX.toFixed(2)}, ${centerY.toFixed(2)}, ${centerZ.toFixed(2)}]`);
  console.log(`  📏 Spawn radius: ${spawnRadius}m, Min distance: ${minDistance}m`);
  console.log(`  👥 Existing players: ${existingPlayers.length}`);

  // If no existing players, spawn at center
  if (existingPlayers.length === 0) {
    console.log('  ✅ No existing players, spawning at center');
    return spawnCenter;
  }

  // Log existing player positions
  existingPlayers.forEach((player, i) => {
    console.log(`    Player ${i + 1}: [${player.position.x.toFixed(2)}, ${player.position.z.toFixed(2)}]`);
  });

  // Try to find a valid spawn position
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Generate random position in circular spawn zone
    const angle = Math.random() * Math.PI * 2;
    const angleDegrees = (angle * 180 / Math.PI).toFixed(0);
    const distance = Math.random() * spawnRadius;

    const candidateX = centerX + Math.cos(angle) * distance;
    const candidateY = centerY; // Keep Y constant (ground level)
    const candidateZ = centerZ + Math.sin(angle) * distance;

    console.log(`  🎲 Attempt ${attempt + 1}: angle=${angleDegrees}°, distance=${distance.toFixed(2)}m → [${candidateX.toFixed(2)}, ${candidateZ.toFixed(2)}]`);

    // Check distance to all existing players
    let validPosition = true;
    for (const player of existingPlayers) {
      const dx = candidateX - player.position.x;
      const dz = candidateZ - player.position.z;
      const distanceToPlayer = Math.sqrt(dx * dx + dz * dz);

      if (distanceToPlayer < minDistance) {
        console.log(`    ❌ Too close to player (${distanceToPlayer.toFixed(2)}m < ${minDistance}m)`);
        validPosition = false;
        break;
      }
    }

    if (validPosition) {
      console.log(`  ✅ Valid spawn position found! [${candidateX.toFixed(2)}, ${candidateY.toFixed(2)}, ${candidateZ.toFixed(2)}]`);
      return [candidateX, candidateY, candidateZ];
    }
  }

  // Fallback: If all attempts failed, return spawn center
  // This can happen if spawn zone is very crowded
  console.warn('⚠️ Could not find valid spawn position after all attempts, using center as fallback');
  return spawnCenter;
}
