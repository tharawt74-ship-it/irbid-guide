import { useState, useEffect } from 'react';
import { HomepageBanner } from '../types';
import { Link } from 'react-router';
import { MapPin, Star, ChevronRight, ChevronLeft, Megaphone, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BannerBookingModal } from './BannerBookingModal';

interface BannerSlideshowProps {
  banners: HomepageBanner[];
}

export function BannerSlideshow({ banners }: BannerSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 5000); // Change slide every 5 seconds
    return () => clearInterval(interval);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + banners.length) % banners.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.targetTouches[0].clientX);
    setTouchStartY(e.targetTouches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;

    // Check if horizontal swipe is dominant
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX > 0) {
        // Swiped left (next in RTL)
        nextSlide();
      } else {
        // Swiped right (prev in RTL)
        prevSlide();
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  const currentBanner = banners[currentIndex];

  const renderBannerContent = (banner: HomepageBanner) => {
    const defaultOverlay = (
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-transparent z-10 rounded-2xl md:rounded-[32px]"></div>
    );

    switch (banner.type) {
      case 'business':
        return (
          <Link to={`/business/${banner.businessId}`} className="block w-full h-full relative" id={`banner-link-${banner.id}`}>
            {defaultOverlay}
            <img
              src={banner.imageUrl}
              alt={banner.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 p-2.5 sm:p-6 md:p-10 flex flex-col justify-end z-20 text-right" dir="rtl">
              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 md:gap-3 mb-1 sm:mb-2 md:mb-3">
                {banner.category && (
                  <span className="bg-[#ff9f1c] text-white text-[8px] sm:text-[10px] md:text-xs font-black px-1.5 py-0.5 sm:px-2.5 sm:py-0.5 md:px-3 md:py-1 rounded-full uppercase tracking-wider">
                    {banner.category}
                  </span>
                )}
                <span className="bg-emerald-600 text-white text-[8px] sm:text-[10px] md:text-xs font-black px-1.5 py-0.5 sm:px-2.5 sm:py-0.5 md:px-3 md:py-1 rounded-full uppercase tracking-wider">
                  صفحة محل 🔗
                </span>
              </div>
              
              <h2 className="text-xs sm:text-2xl md:text-5xl font-black text-white mb-0.5 md:mb-2 tracking-tight">
                {banner.title}
              </h2>
              
              {banner.subtitle && (
                <p className="text-white/80 line-clamp-1 sm:line-clamp-2 max-w-2xl mb-1 sm:mb-1.5 md:mb-4 text-[9px] sm:text-sm md:text-base leading-snug md:leading-relaxed font-bold hidden xs:block">
                  {banner.subtitle}
                </p>
              )}

              <div className="flex items-center gap-2 sm:gap-3 md:gap-4 text-white/90 text-[8px] sm:text-[10px] md:text-sm font-bold">
                {banner.rating !== undefined && (
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <Star className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 fill-yellow-400 text-yellow-400" />
                    <span>{banner.rating.toFixed(1)}</span>
                  </div>
                )}
                {banner.address && (
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <MapPin className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-emerald-400" />
                    <span className="truncate max-w-[100px] sm:max-w-[200px] md:max-w-xs">{banner.address}</span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        );

      case 'image_only':
        const wrapWithLink = (el: React.ReactNode) => {
          if (banner.buttonLink) {
            return (
              <a href={banner.buttonLink} target="_blank" rel="noopener noreferrer" className="block w-full h-full relative" id={`banner-link-${banner.id}`}>
                {el}
              </a>
            );
          }
          return <div className="w-full h-full relative">{el}</div>;
        };

        return wrapWithLink(
          <>
            {/* Very light bottom vignette to protect indicators visibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-10 rounded-2xl md:rounded-[32px]"></div>
            <img
              src={banner.imageUrl}
              alt={banner.title || 'إعلان ترويجي'}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </>
        );

      case 'animated_image':
        const wrapAnimatedWithLink = (el: React.ReactNode) => {
          if (banner.buttonLink) {
            return (
              <a href={banner.buttonLink} target="_blank" rel="noopener noreferrer" className="block w-full h-full relative" id={`banner-link-${banner.id}`}>
                {el}
              </a>
            );
          }
          return <div className="w-full h-full relative">{el}</div>;
        };

        return wrapAnimatedWithLink(
          <>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent z-10 rounded-2xl md:rounded-[32px]"></div>
            <img
              src={banner.imageUrl}
              alt={banner.title || 'إعلان متحرك'}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {/* Animated GIF badge overlay */}
            <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20 flex items-center gap-1 sm:gap-2">
              <span className="bg-purple-600/90 backdrop-blur-md text-white text-[8px] sm:text-[10px] md:text-xs font-black px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full uppercase tracking-wider animate-pulse border border-purple-400/30">
                إعلان مميز متحرك 🎞️
              </span>
            </div>

            {(banner.title || banner.subtitle) && (
              <div className="absolute inset-0 p-2.5 sm:p-6 md:p-10 flex flex-col justify-end z-20 text-right" dir="rtl">
                <h2 className="text-xs sm:text-2xl md:text-5xl font-black text-white mb-0.5 md:mb-2 tracking-tight">
                  {banner.title}
                </h2>
                {banner.subtitle && (
                  <p className="text-white/90 line-clamp-1 sm:line-clamp-2 max-w-2xl text-[9px] sm:text-sm md:text-base font-bold hidden xs:block">
                    {banner.subtitle}
                  </p>
                )}
              </div>
            )}
          </>
        );

      case 'text_and_button':
        return (
          <div className="w-full h-full relative">
            {defaultOverlay}
            <img
              src={banner.imageUrl}
              alt={banner.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 p-2.5 sm:p-6 md:p-10 flex flex-col justify-end z-20 text-right" dir="rtl">
              <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 md:gap-3 mb-1 sm:mb-2 md:mb-3">
                {banner.badgeText && (
                  <span className="bg-[#ff9f1c] text-white text-[8px] sm:text-[10px] md:text-xs font-black px-1.5 py-0.5 sm:px-2.5 sm:py-0.5 md:px-3 md:py-1 rounded-full uppercase tracking-wider">
                    {banner.badgeText}
                  </span>
                )}
                <span className="bg-blue-600 text-white text-[8px] sm:text-[10px] md:text-xs font-black px-1.5 py-0.5 sm:px-2.5 sm:py-0.5 md:px-3 md:py-1 rounded-full uppercase tracking-wider">
                  عرض خاص 🎁
                </span>
              </div>
              
              <h2 className="text-xs sm:text-2xl md:text-5xl font-black text-white mb-0.5 md:mb-2 tracking-tight">
                {banner.title}
              </h2>
              
              {banner.subtitle && (
                <p className="text-white/95 line-clamp-1 sm:line-clamp-2 max-w-2xl mb-1.5 sm:mb-2 md:mb-5 text-[9px] sm:text-sm md:text-base leading-snug md:leading-relaxed font-bold hidden xs:block">
                  {banner.subtitle}
                </p>
              )}

              {banner.buttonText && banner.buttonLink && (
                <a
                  href={banner.buttonLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#ff9f1c] hover:bg-[#f39209] text-white px-3 py-1 md:px-6 md:py-2.5 rounded-lg sm:rounded-xl font-black transition-all text-[8px] sm:text-xs md:text-sm shadow-md flex items-center gap-1 sm:gap-1.5 md:gap-2 cursor-pointer hover:scale-105 active:scale-95 w-fit"
                  id={`banner-action-btn-${banner.id}`}
                >
                  <span>{banner.buttonText}</span>
                  <ExternalLink className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                </a>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full aspect-[16/8] sm:aspect-[21/9] rounded-2xl md:rounded-[32px] overflow-hidden group mb-8 shadow-lg shadow-black/5 select-none touch-pan-y"
    >
      {/* Top Banner Booking Button */}
      <button
        onClick={() => setShowBookingModal(true)}
        className="absolute top-2 left-2 md:top-4 md:left-4 z-10 bg-black/60 hover:bg-black/80 text-white backdrop-blur-md px-2.5 py-1 md:px-3.5 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-all flex items-center gap-1 md:gap-1.5 border border-white/20 shadow-sm cursor-pointer hover:scale-105 active:scale-95"
      >
        <Megaphone className="h-3 w-3 md:h-3.5 md:w-3.5 text-amber-400 animate-pulse" />
        <span>احجز إعلانك</span>
      </button>

      <BannerBookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 w-full h-full"
        >
          {renderBannerContent(currentBanner)}
        </motion.div>
      </AnimatePresence>

      {/* Navigation Controls */}
      {banners.length > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); prevSlide(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md hidden md:flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          
          <button
            onClick={(e) => { e.preventDefault(); nextSlide(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md hidden md:flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Indicators */}
          <div className="absolute bottom-2 md:bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-1 md:gap-2">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.preventDefault(); setCurrentIndex(idx); }}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  idx === currentIndex 
                    ? 'w-4 md:w-8 h-1 md:h-2 bg-white' 
                    : 'w-1 md:w-2 h-1 md:h-2 bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
