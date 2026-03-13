// =============================================================================
// Distance Utility
// =============================================================================
// Haversine formula for calculating straight-line distance between two points.
// Used for ranking caregivers by proximity to client locations.
// =============================================================================

/**
 * Calculate the straight-line distance between two points using the Haversine formula.
 * 
 * @param lat1 - Latitude of first point
 * @param lng1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lng2 - Longitude of second point
 * @returns Distance in miles
 */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth's radius in miles
  
  // Convert degrees to radians
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);

  // Haversine formula
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLng / 2) * Math.sin(dLng / 2) * 
            Math.cos(lat1Rad) * Math.cos(lat2Rad);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Format distance in miles to a human-readable string.
 * 
 * @param miles - Distance in miles
 * @returns Formatted string like "1.2 miles away" or "< 1 mile away"
 */
export function formatDistance(miles: number): string {
  if (miles < 1) {
    return "< 1 mile away";
  } else if (miles < 10) {
    return `${miles.toFixed(1)} miles away`;
  } else {
    return `${Math.round(miles)} miles away`;
  }
}

/**
 * Convert degrees to radians.
 * 
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}