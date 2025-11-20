// =============================================================================
// REVENUE SPLIT CONFIGURATION
// =============================================================================
// This file controls the platform's revenue split model.
// To change the split, simply update the percentages and restart the API.

export const REVENUE_SPLIT = {
  platformPercent: 40,
  creatorPercent: 50,
  managerPercent: 10
} as const;

export const POINT_TO_USD_RATE = 1000; // 1,000 points = $1

export const EARNED_SPENDING_LIMIT = 5000; // Monthly limit for earned points spending

// =============================================================================
// VALIDATION
// =============================================================================

export function validateSplit() {
  const total = REVENUE_SPLIT.platformPercent +
                REVENUE_SPLIT.creatorPercent +
                REVENUE_SPLIT.managerPercent;

  if (total !== 100) {
    throw new Error(`Revenue split must equal 100%, got ${total}%`);
  }
}

// =============================================================================
// REVENUE SPLIT CALCULATION
// =============================================================================

export interface RevenueSplitResult {
  usdCents: number;
  platformShare: number;
  creatorShare: number;
  managerShare: number;
}

/**
 * Calculate revenue split for a given number of points spent
 * @param pointsSpent Number of points being burned
 * @returns Split amounts in USD cents
 */
export function calculateRevenueSplit(pointsSpent: number): RevenueSplitResult {
  validateSplit();

  // Convert points to USD cents
  const usdCents = Math.floor((pointsSpent / POINT_TO_USD_RATE) * 100);

  // Calculate each share
  const platformShare = Math.floor(usdCents * (REVENUE_SPLIT.platformPercent / 100));
  const creatorShare = Math.floor(usdCents * (REVENUE_SPLIT.creatorPercent / 100));

  // Manager gets remainder to avoid rounding errors
  const managerShare = usdCents - platformShare - creatorShare;

  return {
    usdCents,
    platformShare,
    creatorShare,
    managerShare
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert USD cents to points
 * @param usdCents USD amount in cents
 * @returns Number of points
 */
export function usdCentsToPoints(usdCents: number): number {
  return Math.floor((usdCents / 100) * POINT_TO_USD_RATE);
}

/**
 * Convert points to USD cents
 * @param points Number of points
 * @returns USD amount in cents
 */
export function pointsToUsdCents(points: number): number {
  return Math.floor((points / POINT_TO_USD_RATE) * 100);
}

/**
 * Format USD cents as a human-readable string
 * @param usdCents USD amount in cents
 * @returns Formatted string like "$5.00"
 */
export function formatUsdCents(usdCents: number): string {
  return `$${(usdCents / 100).toFixed(2)}`;
}

/**
 * Format points as a human-readable string
 * @param points Number of points
 * @returns Formatted string like "5,000 points"
 */
export function formatPoints(points: number): string {
  return `${points.toLocaleString()} points`;
}
