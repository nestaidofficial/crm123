// =============================================================================
// Geocoding Utility
// =============================================================================
// Uses Google Maps Geocoding API to convert addresses to lat/lng coordinates.
// Includes in-memory cache to avoid redundant API calls within a request cycle.
// =============================================================================

interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
}

interface Coordinates {
  lat: number;
  lng: number;
}

// In-memory cache for geocoding results within a single request cycle
const geocodeCache = new Map<string, Coordinates | null>();

/**
 * Geocode an address to lat/lng coordinates using Google Maps Geocoding API.
 * Uses in-memory cache to avoid redundant API calls within the same request.
 * 
 * @param address - Address object with street, city, state, zip
 * @returns Coordinates object with lat/lng, or null if geocoding fails
 */
export async function geocodeAddress(address: Address): Promise<Coordinates | null> {
  // Create cache key from address components
  const addressString = `${address.street}, ${address.city}, ${address.state} ${address.zip}`.trim();
  
  // Check cache first
  if (geocodeCache.has(addressString)) {
    return geocodeCache.get(addressString) || null;
  }

  try {
    // Get API key (prefer server key, fall back to public key)
    const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn('[geocode] No Google Maps API key found');
      geocodeCache.set(addressString, null);
      return null;
    }

    // Call Google Maps Geocoding API
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', addressString);
    url.searchParams.set('key', apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      const coordinates: Coordinates = {
        lat: location.lat,
        lng: location.lng
      };
      
      // Cache the result
      geocodeCache.set(addressString, coordinates);
      return coordinates;
    } else {
      console.warn(`[geocode] Failed to geocode address: ${addressString}`, data.status);
      geocodeCache.set(addressString, null);
      return null;
    }
  } catch (error) {
    console.error(`[geocode] Error geocoding address: ${addressString}`, error);
    geocodeCache.set(addressString, null);
    return null;
  }
}

/**
 * Clear the geocoding cache. Useful for testing or memory management.
 */
export function clearGeocodeCache(): void {
  geocodeCache.clear();
}