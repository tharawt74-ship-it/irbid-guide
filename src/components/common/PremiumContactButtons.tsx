import React from 'react';
import { Phone } from 'lucide-react';
import { cn } from '../../lib/utils';
import { WhatsAppIcon, WhatsApp3DIcon } from './WhatsAppIcon';

export { WhatsAppIcon, WhatsApp3DIcon };

// Clean Premium Icon for Phone
export function PhoneIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <Phone className={cn("shrink-0 stroke-[2px]", className)} />
  );
}

// Backwards compatibility aliases
export const Phone3DIcon = PhoneIcon;


