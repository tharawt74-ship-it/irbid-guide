import { Business } from '../types';

/**
 * Extracts query or embed coordinates from a Google Maps URL or fallback address for the map preview
 */
export function getGoogleMapsEmbedUrl(business: Business): string {
  let queryTarget = '';
  const fallbackQuery = business.name + ' ' + (business.address || '') + ' إربد الأردن';

  if (business.googlePlaceUrl) {
    const urlStr = business.googlePlaceUrl.trim();
    
    // First, try to extract the exact Place Name from the URL (e.g. /place/Store+Name/)
    const placeMatch = urlStr.match(/\/place\/([^/]+)/);
    if (placeMatch) {
      try {
        queryTarget = encodeURIComponent(decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')));
      } catch (e) {
        queryTarget = encodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      }
    } else {
      // Second, try to extract the query param if it exists (e.g. ?query=Store+Name)
      try {
        const urlObj = new URL(urlStr);
        const queryParam = urlObj.searchParams.get('query') || urlObj.searchParams.get('q');
        if (queryParam) {
          queryTarget = encodeURIComponent(queryParam);
        }
      } catch (e) {
        // Not a valid URL object or no query param
      }
    }

    // Third, only if no place name or query was found, try coordinates.
    // WARNING: In a /place/ URL, @lat,lng is the viewport camera, not the exact pin! 
    // That's why we check for place name first to avoid showing nearby wrong stores.
    if (!queryTarget) {
      const coordsMatch = urlStr.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (coordsMatch) {
        queryTarget = encodeURIComponent(`${coordsMatch[1]},${coordsMatch[2]}`);
      }
    }

    // Finally, if it's a short URL (maps.app.goo.gl) or couldn't parse anything else
    if (!queryTarget) {
      if (urlStr.startsWith('http')) {
        // Must fallback to name/address. Passing a raw short URL to q= causes Google Maps embed to fail.
        queryTarget = encodeURIComponent(fallbackQuery);
      } else {
        // It's not a URL, maybe they just typed an address manually
        queryTarget = encodeURIComponent(urlStr);
      }
    }
  } else {
    queryTarget = encodeURIComponent(fallbackQuery);
  }

  return `https://maps.google.com/maps?q=${queryTarget}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
}

/**
 * Generates direct Google Maps location URL for directions and navigation
 */
export function getGoogleMapsActionUrls(business: Business): {
  viewUrl: string;
} {
  const fallbackQuery = encodeURIComponent(business.name + ' ' + (business.address || 'إربد') + ' الأردن');
  const viewUrl = business.googlePlaceUrl?.trim() || `https://www.google.com/maps/search/?api=1&query=${fallbackQuery}`;

  return { viewUrl };
}
