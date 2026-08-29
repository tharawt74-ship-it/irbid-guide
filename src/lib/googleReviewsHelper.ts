import { Business } from '../types';

/**
 * Extracts query or embed coordinates from a Google Maps URL or fallback address for the map preview
 */
export function getGoogleMapsEmbedUrl(business: Business): string {
  const queryTarget = business.googlePlaceUrl 
    ? (business.googlePlaceUrl.includes('goo.gl') || business.googlePlaceUrl.includes('maps.app')
        ? encodeURIComponent(business.name + ' ' + (business.address || 'إربد') + ' الأردن')
        : encodeURIComponent(business.googlePlaceUrl))
    : encodeURIComponent(business.name + ' ' + (business.address || 'إربد') + ' الأردن');

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
