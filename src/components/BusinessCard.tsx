import { Link } from 'react-router';
import { Business } from '../types';
import { Star, MapPin, Store, Clock, Heart, Crown } from 'lucide-react';
import { VerifiedBadge } from './vip/VerifiedBadge';
import { ShareButton } from './ShareButton';
import { getLiveWorkingStatus } from '../lib/businessHoursHelper';
import { getBusinessVipStatus } from '../lib/vipHelper';
import { useAuth } from '../contexts/AuthContext';
import { getBusinessLink } from '../lib/utils';
import { WhatsApp3DIcon, Phone3DIcon } from './common/PremiumContactButtons';

interface BusinessCardProps {
  business: Business;
  featured?: boolean;
  searchReasons?: string[];
}

export function BusinessCard({ business, featured = false, searchReasons }: BusinessCardProps) {
  const isVip = getBusinessVipStatus(business).isVip;
  const liveStatus = getLiveWorkingStatus(business.workingHours);
  const { isFavorite, toggleFavorite } = useAuth();
  const isFavorited = isFavorite(business.id);
  const isCurrentlyFeatured = business.isFeatured && (!business.featuredStartDate || business.featuredStartDate <= Date.now()) && (!business.featuredExpiryDate || business.featuredExpiryDate > Date.now());
  const businessLink = getBusinessLink(business);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(business.id);
  };

  if (featured) {
    return (
      <Link
        to={businessLink}
        className="bg-white border border-[#e5e1da] rounded-[24px] md:rounded-[32px] overflow-hidden hover:shadow-xl hover:border-[#1a4d2e]/30 transition-all duration-300 flex flex-col group relative min-h-[260px] md:min-h-[290px]"
      >
        <div className='absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent z-10'></div>
        {business.imageUrl ? (
          <img
            src={business.imageUrl}
            alt={business.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="absolute inset-0 bg-[#1a4d2e]/10 flex items-center justify-center">
            <Store className="h-24 w-24 text-[#1a4d2e]/20" />
          </div>
        )}
        <div className='absolute inset-0 flex flex-col justify-end p-5 sm:p-6 z-20'>
          <div className="mb-auto flex flex-wrap items-center justify-between gap-2 w-full">
            <div className="flex items-center gap-1.5 flex-wrap">
              {isCurrentlyFeatured && (
                <span className='bg-yellow-400 text-yellow-950 text-[10px] sm:text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm flex items-center gap-1 w-fit'>
                  <Crown className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-current shrink-0 text-amber-950" />
                  <span>مميز</span>
                </span>
              )}
              {business.district && (
                <span className="bg-black/50 backdrop-blur-md text-white text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-full border border-white/20">
                  📍 {business.district}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <button
                onClick={handleToggleFavorite}
                className="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 flex items-center justify-center transition-all border border-white/10"
                title={isFavorited ? "إزالة من المفضلة" : "إضافة للمفضلة"}
              >
                <Heart className={`h-4.5 w-4.5 transition-transform duration-300 active:scale-125 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-white'}`} />
              </button>
              <ShareButton title={business.name} url={businessLink} size="sm" variant="pill" />
              <span className='bg-[#ff9f1c] text-white text-[10px] sm:text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-sm'>
                {business.category}
              </span>
            </div>
          </div>

          <div>
            {/* Live Open / Closed Status Pill */}
            <div className="inline-flex items-center gap-1.5 bg-black/50 backdrop-blur-md text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full mb-1.5 border border-white/15">
              <span className={`w-2 h-2 rounded-full ${liveStatus.dotColor}`}></span>
              <span>{liveStatus.statusText}</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap mt-1 mb-2">
              <h2 className='text-xl sm:text-2xl font-bold text-white line-clamp-1'>{business.name}</h2>
              {isVip && (
                <VerifiedBadge size="sm" businessName={business.name} />
              )}
            </div>
            <p className='text-white/80 max-w-md text-xs sm:text-sm leading-relaxed mb-4 line-clamp-2'>{business.description}</p>
            
            {searchReasons && searchReasons.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-1 items-center select-none">
                <span className="text-[10px] text-emerald-300 bg-emerald-950/45 px-2.5 py-1 rounded-md font-black border border-emerald-500/25">
                  🔍 مطابق لـ: {searchReasons.join('، ')}
                </span>
              </div>
            )}

            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-1 sm:gap-2 text-white'>
                {typeof business.rating === 'number' && !isNaN(business.rating) && business.rating > 0 && typeof business.reviewCount === 'number' && business.reviewCount > 0 ? (
                  <>
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className='font-bold text-sm'>{business.rating.toFixed(1)}</span>
                  </>
                ) : (
                  <span className='font-black text-[11px] bg-white/20 backdrop-blur-xs px-2.5 py-0.5 rounded-md'>جديد</span>
                )}
              </div>
              <div className='flex items-center gap-1 sm:gap-2 text-white/80 text-xs sm:text-sm'>
                <MapPin className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
                <span className="truncate max-w-[150px] sm:max-w-[200px]">{business.district ? `${business.district} - ${business.address}` : business.address}</span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      to={businessLink}
      className="bg-white border border-[#e5e1da] rounded-[24px] md:rounded-[32px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgba(26,77,46,0.12)] hover:-translate-y-1 transition-all duration-500 flex flex-col group relative"
    >
      <div className="h-48 md:h-52 bg-stone-100 relative overflow-hidden">
        {business.imageUrl ? (
          <img
            src={business.imageUrl}
            alt={business.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300">
            <Store className="h-12 w-12" />
          </div>
        )}

        {/* Top Badges */}
        <div className="absolute top-4 right-4 flex flex-wrap gap-1.5">
          <div className="bg-white/70 backdrop-blur-xl border border-white/40 px-3 py-1 rounded-full text-[11px] font-black text-[#1a4d2e] shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
            {business.category}
          </div>
          {isCurrentlyFeatured && (
            <div className="bg-gradient-to-r from-amber-400/90 to-yellow-500/90 backdrop-blur-xl border border-white/30 px-3 py-1 rounded-full text-[11px] font-black text-yellow-950 shadow-[0_4px_12px_rgba(0,0,0,0.08)] flex items-center gap-1 w-fit">
              <Crown className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-current shrink-0 text-amber-950" />
              <span>مميز</span>
            </div>
          )}
        </div>

        {/* Share Button Top Left */}
        <div className="absolute top-4 left-4 flex items-center gap-1.5 z-20">
          <button
            onClick={handleToggleFavorite}
            className="w-8 h-8 rounded-full bg-white/70 backdrop-blur-xl hover:bg-white flex items-center justify-center transition-all shadow-[0_4px_12px_rgba(0,0,0,0.08)] border border-white/40"
            title={isFavorited ? "إزالة من المفضلة" : "إضافة للمفضلة"}
          >
            <Heart className={`h-4 w-4 transition-transform duration-300 active:scale-125 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-stone-600'}`} />
          </button>
          <ShareButton title={business.name} url={businessLink} size="sm" variant="pill" />
        </div>

        {/* Live Working Status Bottom Right of Image */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
          {business.district && (
            <span className="bg-black/40 backdrop-blur-xl border border-white/20 text-white font-bold text-[10px] px-2.5 py-1 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
              📍 {business.district}
            </span>
          )}
          <div className={`px-2.5 py-1 rounded-full text-[10px] font-black backdrop-blur-xl flex items-center gap-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-white/20 ${liveStatus.badgeBg.replace("bg-", "bg-opacity-80 bg-")}`}>
            <span className={`w-2 h-2 rounded-full ${liveStatus.dotColor}`}></span>
            <span>{liveStatus.statusText}</span>
          </div>
        </div>
      </div>

      <div className="p-6 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2 gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xl font-bold text-[#2d2a26] line-clamp-1">{business.name}</h3>
            {isVip && (
              <VerifiedBadge size="sm" businessName={business.name} />
            )}
          </div>
          {typeof business.rating === 'number' && !isNaN(business.rating) && business.rating > 0 && typeof business.reviewCount === 'number' && business.reviewCount > 0 ? (
            <div className="flex items-center gap-1.5 bg-[#fdfcfb] border border-[#e5e1da] px-2.5 py-1 rounded-lg text-sm font-bold shrink-0">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              <span>{business.rating.toFixed(1)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2 py-0.5 rounded-lg text-xs font-black shrink-0">
              <span>جديد</span>
            </div>
          )}
        </div>

        <p className="text-stone-500 text-sm line-clamp-2 mb-4 flex-1 leading-relaxed">
          {business.description}
        </p>

        {searchReasons && searchReasons.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1 items-center select-none">
            <span className="text-[10px] text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md font-black border border-emerald-100/40">
              🔍 مطابق لـ: {searchReasons.join('، ')}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between text-stone-500 text-xs mt-auto pt-3 border-t border-[#e5e1da] gap-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-[#1a4d2e]" />
            <span className="truncate font-bold text-stone-700">{business.district ? `${business.district}` : business.address}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {business.phone && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.location.href = `tel:${business.phone}`;
                }}
                className="min-h-[40px] px-3 py-1.5 bg-[#1a4d2e] hover:bg-[#133c23] text-white rounded-xl flex items-center justify-center gap-1.5 font-bold transition-all active:scale-95 cursor-pointer shadow-xs"
                title="اتصال تلفوني مباشر"
              >
                <Phone3DIcon className="w-3.5 h-3.5 text-white" />
                <span className="text-[11px] dir-ltr font-mono font-bold tracking-tight">{business.phone}</span>
              </button>
            )}
            {(business.socialLinks?.whatsapp || business.phone) && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const cleanPhone = (business.socialLinks?.whatsapp || business.phone)?.replace(/[^0-9]/g, '');
                  if (cleanPhone) {
                    window.open(`https://wa.me/${cleanPhone}`, '_blank', 'noopener,noreferrer');
                  }
                }}
                className="min-h-[40px] min-w-[40px] px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-xs"
                title="مراسلة عبر الواتساب"
              >
                <WhatsApp3DIcon className="w-4 h-4 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

