import { Business } from '../types';

/**
 * Extracts query or embed coordinates strictly from a raw Google Maps link.
 * Does NOT search by name. If no exact link or coordinates are attached, returns an empty string.
 */
export function extractCoordsOrEmbedFromUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  const raw = rawUrl.trim();
  if (!raw) return '';

  // 1. If user pasted an iframe embed code (e.g. <iframe src="https://www.google.com/maps/embed?..." ...>)
  const iframeSrcMatch = raw.match(/src=["']([^"']+)["']/i);
  if (iframeSrcMatch && iframeSrcMatch[1]) {
    return iframeSrcMatch[1];
  }

  // 2. If user pasted a direct Google Maps embed URL
  if (raw.includes('/maps/embed') || raw.includes('output=embed')) {
    return raw;
  }

  // 3. Extract exact pin coordinates from Google Maps URL: !3d(lat)!4d(lng) (exact pin position in Google Maps data)
  const pinDataMatch = raw.match(/!3d(-?\d+(?:\.\d+)?)[^!]*!4d(-?\d+(?:\.\d+)?)/);
  if (pinDataMatch) {
    const lat = pinDataMatch[1];
    const lng = pinDataMatch[2];
    return `https://maps.google.com/maps?q=${lat},${lng}&hl=ar&z=16&output=embed`;
  }

  // 4. Extract coordinates from @lat,lng
  const atCoordsMatch = raw.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atCoordsMatch) {
    const lat = atCoordsMatch[1];
    const lng = atCoordsMatch[2];
    return `https://maps.google.com/maps?q=${lat},${lng}&hl=ar&z=16&output=embed`;
  }

  // 5. Extract coordinates from query params: q=lat,lng or query=lat,lng or ll=lat,lng
  const qCoordsMatch = raw.match(/[?&](?:q|query|ll)=(-?\d+\.\d+)[,+](-?\d+\.\d+)/);
  if (qCoordsMatch) {
    const lat = qCoordsMatch[1];
    const lng = qCoordsMatch[2];
    return `https://maps.google.com/maps?q=${lat},${lng}&hl=ar&z=16&output=embed`;
  }

  // 6. Raw coordinates typed directly (e.g. 32.55678, 35.85432)
  const rawCoordsMatch = raw.match(/^(-?\d+\.\d+)\s*[, ]\s*(-?\d+\.\d+)$/);
  if (rawCoordsMatch) {
    const lat = rawCoordsMatch[1];
    const lng = rawCoordsMatch[2];
    return `https://maps.google.com/maps?q=${lat},${lng}&hl=ar&z=16&output=embed`;
  }

  // 7. CID (Customer ID in Google Maps)
  const cidMatch = raw.match(/[?&]cid=(\d+)/);
  if (cidMatch) {
    return `https://maps.google.com/maps?cid=${cidMatch[1]}&hl=ar&output=embed`;
  }

  // 8. Extract place name from /place/Name if available
  const placeMatch = raw.match(/\/place\/([^/@?]+)/);
  if (placeMatch) {
    try {
      const placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      if (placeName && !placeName.startsWith('http')) {
        return `https://maps.google.com/maps?q=${encodeURIComponent(placeName + ' إربد')}&hl=ar&z=16&output=embed`;
      }
    } catch (e) {
      // ignore
    }
  }

  // CRITICAL: NEVER pass a URL (http/https) into the q= parameter!
  // Passing a URL to q= causes Google Maps to treat it as a KML file, triggering:
  // "Some custom on-map content could not be displayed. Learn more Dismiss"
  return '';
}

export function getGoogleMapsEmbedUrl(business: Business): string {
  if (!business || !business.googlePlaceUrl) {
    return '';
  }
  return extractCoordsOrEmbedFromUrl(business.googlePlaceUrl);
}

/**
 * Generates direct Google Maps location URL for directions and navigation
 */
export function getGoogleMapsActionUrls(business: Business): {
  viewUrl: string;
} {
  const raw = business?.googlePlaceUrl?.trim() || '';
  if (!raw) {
    return { viewUrl: '' };
  }

  const iframeSrcMatch = raw.match(/src=["']([^"']+)["']/i);
  if (iframeSrcMatch && iframeSrcMatch[1]) {
    return { viewUrl: iframeSrcMatch[1] };
  }

  const rawCoordsMatch = raw.match(/^(-?\d+\.\d+)\s*[, ]\s*(-?\d+\.\d+)$/);
  if (rawCoordsMatch) {
    return { viewUrl: `https://www.google.com/maps/search/?api=1&query=${rawCoordsMatch[1]},${rawCoordsMatch[2]}` };
  }

  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return { viewUrl: raw };
  }

  return { viewUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(raw)}` };
}
