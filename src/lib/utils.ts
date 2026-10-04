import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getBusinessLink(business: { id: string; username?: string }) {
  if (business?.username && business.username.trim()) {
    return `/@${business.username.trim()}`;
  }
  return `/business/${business?.id}`;
}

export function stripHtml(html: string): string {
  if (!html) return '';
  // 1. Replace HTML tags with a space to prevent words from sticking together
  let text = html.replace(/<[^>]*>/g, ' ');
  // 2. Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
  // 3. Clean up multiple consecutive spaces/line-breaks into a single space
  return text.replace(/\s+/g, ' ').trim();
}
