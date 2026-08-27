import React from 'react';
import { SocialLinks } from '../../types';
import { Globe, Facebook, Instagram, Youtube, Twitter, Smartphone, Send } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  socialLinks: SocialLinks;
  onChange: (links: SocialLinks) => void;
}

const PLATFORMS = [
  { id: 'facebook', label: 'فيسبوك', icon: Facebook, color: 'text-blue-600' },
  { id: 'instagram', label: 'إنستغرام', icon: Instagram, color: 'text-pink-600' },
  { id: 'tiktok', label: 'تيك توك', icon: Smartphone, color: 'text-stone-900' },
  { id: 'snapchat', label: 'سناب شات', icon: Smartphone, color: 'text-yellow-500' },
  { id: 'telegram', label: 'تلغرام', icon: Send, color: 'text-sky-500' },
  { id: 'x', label: 'منصة X', icon: Twitter, color: 'text-stone-800' },
  { id: 'youtube', label: 'يوتيوب', icon: Youtube, color: 'text-red-600' },
  { id: 'website', label: 'الموقع الإلكتروني', icon: Globe, color: 'text-emerald-600' },
] as const;

export function SocialLinksEditor({ socialLinks, onChange }: Props) {
  return (
    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4.5 space-y-4">
      <h4 className="font-bold text-stone-800">روابط التواصل الاجتماعي (اختياري)</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PLATFORMS.map((platform) => {
          const Icon = platform.icon;
          return (
            <div key={platform.id} className="relative">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <Icon className={cn("h-4 w-4", platform.color)} />
              </div>
              <input
                type="text"
                dir="ltr"
                value={socialLinks[platform.id as keyof SocialLinks] || ''}
                onChange={e => onChange({ ...socialLinks, [platform.id]: e.target.value })}
                placeholder={`رابط أو يوزر ${platform.label}`}
                className="w-full bg-white border border-stone-200 rounded-xl pl-3 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] text-left placeholder:text-right"
              />
            </div>
          );
        })}
      </div>
      <p className="text-xs text-stone-500 text-center">يمكنك وضع الرابط كاملاً أو المعرف (Username) فقط وسيقوم النظام بتوليد الرابط</p>
    </div>
  );
}
