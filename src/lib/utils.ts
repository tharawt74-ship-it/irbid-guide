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
