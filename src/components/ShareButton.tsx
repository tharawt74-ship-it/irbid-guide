import React, { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';

interface ShareButtonProps {
  title: string;
  text?: string;
  url?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'ghost' | 'solid' | 'outline' | 'pill';
  showText?: boolean;
}

export function ShareButton({
  title,
  text,
  url,
  className = '',
  size = 'md',
  variant = 'ghost',
  showText = false,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = url ? (url.startsWith('http') ? url : `${window.location.origin}${url}`) : window.location.href;
  const shareText = text || `شاهد "${title}" على منصة شو في بإربد!`;

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // Fallback to clipboard if share cancelled or failed
        if ((err as Error).name === 'AbortError') return;
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(`${title}\n${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Ignore copy error
    }
  };

  const sizeStyles = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-2.5 py-1.5 text-xs gap-1.5',
    lg: 'px-3.5 py-2 text-sm gap-2',
  };

  const variantStyles = {
    ghost: 'text-stone-600 hover:text-stone-900 hover:bg-stone-100/80 rounded-xl',
    outline: 'border border-stone-200 text-stone-700 hover:bg-stone-50 hover:border-stone-300 rounded-xl',
    solid: 'bg-stone-900 hover:bg-black text-white rounded-xl shadow-2xs',
    pill: 'bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-full font-bold border border-stone-200/80',
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleShare}
        className={`inline-flex items-center justify-center font-bold transition-all cursor-pointer select-none active:scale-95 ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        title="مشاركة عبر الواتساب أو وسائط التواصل"
        type="button"
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-600 animate-in zoom-in-75" />
        ) : (
          <Share2 className="h-4 w-4 transition-transform group-hover:scale-110" />
        )}
        {showText && <span>{copied ? 'تم النسخ!' : 'مشاركة'}</span>}
      </button>

      {/* Floating Toast Bubble for Copy Fallback */}
      {copied && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-stone-900 text-white text-[10px] font-bold rounded-lg shadow-lg whitespace-nowrap z-50 animate-in fade-in slide-in-from-bottom-1">
          تم نسخ الرابط بنجاح! 🔗
        </div>
      )}
    </div>
  );
}
