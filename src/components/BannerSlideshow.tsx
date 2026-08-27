import { useState, useEffect } from 'react';
import { Business } from '../types';
import { Link } from 'react-router';
import { MapPin, Star, ChevronRight, ChevronLeft, Megaphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BannerBookingModal } from './BannerBookingModal';

interface BannerSlideshowProps {
  businesses: Business[];
}

export function BannerSlideshow({ businesses }: BannerSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  useEffect(() => {
    if (businesses.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % businesses.length);
    }, 5000); // Change slide every 5 seconds
    return () => clearInterval(interval);
  }, [businesses.length]);

  if (businesses.length === 0) return null;

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % businesses.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + businesses.length) % businesses.length);
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

    // Check if horizontal swipe is dominant (more horizontal than vertical)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX > 0) {
        // Swiped left (in RTL: next)
        nextSlide();
      } else {
        // Swiped right (in RTL: prev)
        prevSlide();
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  return (
    <div 
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative w-full h-[300px] md:h-[400px] rounded-[32px] overflow-hidden group mb-8 shadow-lg shadow-black/5 select-none touch-pan-y"
    >
      {/* Top Banner Booking Button */}
      <button
        onClick={() => setShowBookingModal(true)}
        className="absolute top-4 left-4 z-10 bg-black/60 hover:bg-black/80 text-white backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border border-white/20 shadow-sm cursor-pointer hover:scale-105 active:scale-95"
      >
        <Megaphone className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
        <span>احجز إعلانك هنا 📢</span>
      </button>

      <BannerBookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
      />

      <AnimatePresence mode="wait">

        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className="absolute inset-0"
        >
          <Link to={`/business/${businesses[currentIndex].id}`} className="block w-full h-full relative">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-10 rounded-[32px]"></div>
            {businesses[currentIndex].imageUrl ? (
              <img
                src={businesses[currentIndex].imageUrl}
                alt={businesses[currentIndex].name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#1a4d2e] flex items-center justify-center">
                <span className="text-white/20 text-6xl">✨</span>
              </div>
            )}

            <div className="absolute inset-0 p-6 md:p-10 flex flex-col justify-end z-20">
              <div className="flex items-center gap-3 mb-3">
                <span className="bg-[#ff9f1c] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {businesses[currentIndex].category}
                </span>
                {businesses[currentIndex].isFeatured && (
                  <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    مميز ⭐
                  </span>
                )}
              </div>
              
              <h2 className="text-3xl md:text-5xl font-black text-white mb-2 tracking-tight">
                {businesses[currentIndex].name}
              </h2>
              
              <p className="text-white/80 line-clamp-2 max-w-2xl mb-4 text-sm md:text-base leading-relaxed">
                {businesses[currentIndex].description}
              </p>

              <div className="flex items-center gap-4 text-white/90 text-sm">
                <div className="flex items-center gap-1.5 font-bold">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>{businesses[currentIndex].rating ? businesses[currentIndex].rating.toFixed(1) : 'جديد'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate max-w-[200px] md:max-w-xs">{businesses[currentIndex].address}</span>
                </div>
              </div>
            </div>
          </Link>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Controls */}
      {businesses.length > 1 && (
        <>
          <button
            onClick={(e) => { e.preventDefault(); prevSlide(); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          
          <button
            onClick={(e) => { e.preventDefault(); nextSlide(); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 backdrop-blur-md flex items-center justify-center text-white transition-all opacity-0 group-hover:opacity-100"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          {/* Indicators */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2">
            {businesses.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => { e.preventDefault(); setCurrentIndex(idx); }}
                className={`transition-all duration-300 rounded-full ${
                  idx === currentIndex 
                    ? 'w-8 h-2 bg-white' 
                    : 'w-2 h-2 bg-white/40 hover:bg-white/60'
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
