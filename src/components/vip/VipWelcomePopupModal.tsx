import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, Crown, ExternalLink, MessageCircle, Phone, ArrowLeft, Eye } from 'lucide-react';
import { Business, VipPopupConfig } from '../../types';
import { MediaRenderer } from '../common/MediaRenderer';

interface VipWelcomePopupModalProps {
  business: Business;
  popupConfig: VipPopupConfig;
  isOpen: boolean;
  onClose: () => void;
  isPreview?: boolean;
}

export function VipWelcomePopupModal({
  business,
  popupConfig,
  isOpen,
  onClose,
  isPreview = false
}: VipWelcomePopupModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const mediaUrl = popupConfig.type === 'video'
    ? (popupConfig.videoUrl || popupConfig.imageUrl || '')
    : (popupConfig.imageUrl || popupConfig.videoUrl || '');

  const effectiveType: 'video' | 'image' = popupConfig.type || (
    mediaUrl && (
      mediaUrl.includes('youtube') || 
      mediaUrl.includes('youtu.be') || 
      mediaUrl.includes('reel') || 
      mediaUrl.includes('tiktok') || 
      mediaUrl.includes('facebook') ||
      mediaUrl.includes('vimeo') ||
      /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(mediaUrl)
    ) ? 'video' : 'image'
  );

  const handleActionClick = () => {
    if (popupConfig.buttonUrl) {
      if (popupConfig.buttonUrl.startsWith('http') || popupConfig.buttonUrl.startsWith('https') || popupConfig.buttonUrl.startsWith('tel:') || popupConfig.buttonUrl.startsWith('https://wa.me')) {
        window.open(popupConfig.buttonUrl, '_blank');
      } else {
        window.location.href = popupConfig.buttonUrl;
      }
    } else if (business.phone) {
      // Default WhatsApp or Call action
      const cleanPhone = business.phone.replace(/[^0-9]/g, '');
      const waNumber = cleanPhone.startsWith('07') ? `962${cleanPhone.substring(1)}` : cleanPhone;
      window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(`مرحباً ${business.name}، شاهدت عرضكم عبر منصة شو في بإربد.`)}`, '_blank');
    }
    onClose();
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[999999] bg-stone-950/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      dir="rtl"
      onClick={onClose}
    >
      <div 
        className="max-w-lg w-full flex flex-col gap-4 sm:gap-5 relative my-auto animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Pass 1: Standalone Title Header above the media */}
        <div className="flex items-center justify-between pb-1 px-1">
          <div className="flex items-center gap-2.5">
            {isPreview && (
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md">
                معاينة
              </span>
            )}
            <h3 className="text-lg sm:text-xl font-black text-white line-clamp-1 drop-shadow-sm">
              {popupConfig.title || `مرحباً بكم في ${business.name}`}
            </h3>
          </div>
          
          {/* Glassy circular close button */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-stone-200 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0"
            aria-label="إغلاق"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Pass 2: Standalone Media Card */}
        {mediaUrl && (
          <div className="w-full bg-black rounded-3xl overflow-hidden shadow-2xl relative aspect-video flex items-center justify-center border border-white/5">
            <MediaRenderer
              type={effectiveType}
              url={mediaUrl}
              aspectRatio="video"
              autoPlay={true}
              className="w-full h-full object-cover sm:object-contain"
            />
          </div>
        )}

        {/* Pass 3: Standalone Description & Buttons (No background container) */}
        <div className="flex flex-col gap-4 text-right px-1">
          {/* Description floating directly over the blurred backdrop */}
          {popupConfig.description && (
            <p className="text-stone-200 text-sm sm:text-base leading-relaxed whitespace-pre-line font-medium drop-shadow-sm">
              {popupConfig.description}
            </p>
          )}

          {/* Action buttons with custom background styling but no enclosing box */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handleActionClick}
              className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-3.5 px-6 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{popupConfig.buttonText || (business.phone ? 'تواصل معنا الآن' : 'استكشف الآن')}</span>
              <ArrowLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-5 py-3.5 bg-white/10 hover:bg-white/20 text-stone-200 hover:text-white border border-white/10 font-bold text-sm rounded-xl transition-colors cursor-pointer shrink-0"
            >
              تخطي ومتابعة
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
