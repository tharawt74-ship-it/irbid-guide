import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronRight, ChevronLeft, Edit3, Plus, 
  ExternalLink, ShoppingBag, ArrowLeft, ArrowRight,
  Video as VideoIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Business, MenuItem, VipCarouselSlide, VipCustomSections } from '../../types';
import { VipStatusResult } from '../../lib/vipHelper';
import { getWhatsAppUrl } from '../../lib/contactHelper';
import { cleanPriceNumber } from '../../pages/BusinessDetail';
import { MediaRenderer } from '../common/MediaRenderer';

interface VipCustomSectionsViewProps {
  business: Business;
  isOwner: boolean;
  vipInfo: VipStatusResult;
  onOpenCustomizer: () => void;
  onNavigateToCatalog?: () => void;
}

export function VipCustomSectionsView({
  business,
  isOwner,
  vipInfo,
  onOpenCustomizer,
  onNavigateToCatalog
}: VipCustomSectionsViewProps) {
  // Only available for VIP subscribers
  if (!vipInfo.isVip) return null;

  const config: VipCustomSections = business.vipCustomSections || {};
  const blockOrder = config.blockOrder || ['carousel', 'products_slider', 'video'];

  const carouselEnabled = config.carouselEnabled ?? true;
  const productsSliderEnabled = config.productsSliderEnabled ?? true;
  const videoEnabled = config.videoEnabled ?? true;

  const carouselImages = config.carouselImages || [];
  const selectedProductIds = config.selectedProductIds || [];

  const hasCarousel = carouselEnabled && carouselImages.length > 0;
  const hasVideo = videoEnabled && Boolean(config.videoUrl && config.videoUrl.trim());

  // Filter selected products from business.menuItems
  const allMenuItems: MenuItem[] = business.menuItems || [];
  const selectedProducts: MenuItem[] = React.useMemo(() => {
    if (!selectedProductIds || selectedProductIds.length === 0) return [];
    const idSet = new Set(selectedProductIds);
    return allMenuItems.filter(item => idSet.has(item.id));
  }, [allMenuItems, selectedProductIds]);

  const hasProductsSlider = productsSliderEnabled && selectedProducts.length > 0;

  // Carousel slider state
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  // Products scroll container ref
  const productsScrollRef = useRef<HTMLDivElement>(null);

  // Auto-play carousel every 5 seconds
  useEffect(() => {
    if (carouselImages.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % carouselImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [carouselImages.length]);

  const handleNextSlide = () => {
    if (carouselImages.length <= 1) return;
    setCurrentSlideIndex(prev => (prev + 1) % carouselImages.length);
  };

  const handlePrevSlide = () => {
    if (carouselImages.length <= 1) return;
    setCurrentSlideIndex(prev => (prev - 1 + carouselImages.length) % carouselImages.length);
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

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX > 0) {
        // Swiped left (in RTL next slide)
        handleNextSlide();
      } else {
        // Swiped right (in RTL prev slide)
        handlePrevSlide();
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  const scrollProducts = (direction: 'left' | 'right') => {
    if (!productsScrollRef.current) return;
    const offset = direction === 'left' ? -260 : 260;
    productsScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  // If no sections are configured yet
  if (!hasCarousel && !hasProductsSlider && !hasVideo) {
    if (!isOwner) return null;

    return (
      <div className="mb-6 p-4 rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-right" dir="rtl">
        <div>
          <h4 className="font-bold text-amber-950 text-sm">تخصيص الواجهة الرئيسية للمحل</h4>
          <p className="text-xs text-amber-800 mt-0.5">يمكنك إضافة كاروسل سلايد شو أو سلايدر لمنتجاتك أو فيديو تعريفي مع إمكانية إعادة الترتيب</p>
        </div>
        <button
          type="button"
          onClick={onOpenCustomizer}
          className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer"
        >
          <Edit3 className="h-4 w-4" />
          <span>تخصيص الواجهة</span>
        </button>
      </div>
    );
  }

  // Render Carousel Component
  const renderCarousel = () => {
    if (!hasCarousel) return null;
    const currentSlide = carouselImages[currentSlideIndex];
    if (!currentSlide) return null;

    return (
      <div key="carousel-block" className="relative group select-none">
        <div 
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative w-full aspect-[16/8] sm:aspect-[21/9] rounded-2xl md:rounded-[32px] overflow-hidden shadow-md shadow-stone-900/5 bg-stone-900 touch-pan-y"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide.id || currentSlideIndex}
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 w-full h-full"
            >
              {currentSlide.link ? (
                <a 
                  href={currentSlide.link} 
                  target={currentSlide.link.startsWith('http') ? '_blank' : '_self'}
                  rel="noreferrer"
                  className="block w-full h-full relative"
                >
                  <img
                    src={currentSlide.url}
                    alt={currentSlide.title || business.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {currentSlide.title && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex items-end p-4 sm:p-6 md:p-8" dir="rtl">
                      <h3 className="text-white font-black text-sm sm:text-xl md:text-2xl drop-shadow-sm">
                        {currentSlide.title}
                      </h3>
                    </div>
                  )}
                </a>
              ) : (
                <div className="w-full h-full relative">
                  <img
                    src={currentSlide.url}
                    alt={currentSlide.title || business.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {currentSlide.title && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent flex items-end p-4 sm:p-6 md:p-8" dir="rtl">
                      <h3 className="text-white font-black text-sm sm:text-xl md:text-2xl drop-shadow-sm">
                        {currentSlide.title}
                      </h3>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Controls if multiple slides */}
          {carouselImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrevSlide}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-xs flex items-center justify-center text-white transition-all cursor-pointer opacity-80 sm:opacity-0 group-hover:opacity-100"
                aria-label="السابق"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={handleNextSlide}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-xs flex items-center justify-center text-white transition-all cursor-pointer opacity-80 sm:opacity-0 group-hover:opacity-100"
                aria-label="التالي"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Indicators */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
                {carouselImages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentSlideIndex(idx)}
                    className={`transition-all duration-300 rounded-full cursor-pointer ${
                      idx === currentSlideIndex
                        ? 'w-6 h-1.5 bg-white'
                        : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'
                    }`}
                    aria-label={`الشريحة ${idx + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Render Products Scroll Slider
  const renderProductsSlider = () => {
    if (!hasProductsSlider) return null;

    return (
      <div key="products-block" className="space-y-3" dir="rtl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="h-4.5 w-4.5 text-[#1a4d2e]" />
            <h3 className="text-base sm:text-lg font-bold text-stone-900">
              منتجات وخدمات مختارة
            </h3>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => scrollProducts('right')}
              className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="التمرير لليمين"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollProducts('left')}
              className="w-7 h-7 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
              aria-label="التمرير لليسار"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {onNavigateToCatalog && (
              <button
                type="button"
                onClick={onNavigateToCatalog}
                className="text-xs font-bold text-[#1a4d2e] hover:underline mr-2 cursor-pointer"
              >
                عرض الكل
              </button>
            )}
          </div>
        </div>

        {/* Horizontal Slider */}
        <div 
          ref={productsScrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {selectedProducts.map((product) => {
            const hasDiscount = product.originalPrice && cleanPriceNumber(product.originalPrice) > cleanPriceNumber(product.price);
            const whatsappNumber = business.socialLinks?.whatsapp || business.whatsapp || business.phone;
            const itemOrderMsg = `مرحباً، أود الاستفسار عن منتج "${product.name}" لدى ${business.name}.`;
            const itemWhatsappUrl = whatsappNumber ? getWhatsAppUrl(whatsappNumber, itemOrderMsg) : null;

            return (
              <div
                key={product.id}
                className="w-44 sm:w-52 shrink-0 bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden snap-start flex flex-col justify-between transition-all hover:shadow-md hover:border-[#1a4d2e]/30"
              >
                <div className="relative aspect-square w-full bg-stone-100 overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400 bg-stone-50">
                      <ShoppingBag className="h-10 w-10 opacity-30" />
                    </div>
                  )}

                  {product.category && (
                    <span className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                      {product.category}
                    </span>
                  )}
                </div>

                <div className="p-3 flex flex-col justify-between flex-1 gap-2">
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-stone-900 line-clamp-1">
                      {product.name}
                    </h4>
                    {product.description && (
                      <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                        {product.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-stone-100">
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-black text-xs sm:text-sm text-[#1a4d2e]">
                        {product.price} د.أ
                      </span>
                      {hasDiscount && (
                        <span className="text-[10px] text-stone-400 line-through">
                          {product.originalPrice} د.أ
                        </span>
                      )}
                    </div>

                    {itemWhatsappUrl ? (
                      <a
                        href={itemWhatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-200 transition-colors"
                        title="استفسار"
                      >
                        طلب
                      </a>
                    ) : onNavigateToCatalog ? (
                      <button
                        type="button"
                        onClick={onNavigateToCatalog}
                        className="px-2 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        تفاصيل
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Video Component
  const renderVideo = () => {
    if (!hasVideo || !config.videoUrl) return null;

    return (
      <div key="video-block" className="space-y-2.5 select-none" dir="rtl">
        {config.videoTitle && (
          <div className="flex items-center gap-2">
            <VideoIcon className="h-4.5 w-4.5 text-[#1a4d2e]" />
            <h3 className="text-base sm:text-lg font-bold text-stone-900">
              {config.videoTitle}
            </h3>
          </div>
        )}
        <div className="rounded-2xl md:rounded-[32px] overflow-hidden shadow-md shadow-stone-900/5 border border-stone-200/80 bg-black">
          <MediaRenderer
            type="video"
            url={config.videoUrl}
            caption={undefined}
            aspectRatio="video"
            className="w-full"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="mb-6 space-y-6">
      {isOwner && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onOpenCustomizer}
            title="تعديل وترتيب العناصر المخصصة"
            aria-label="تعديل وترتيب العناصر المخصصة"
            className="p-1.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer hover:scale-102 active:scale-98"
          >
            <Edit3 className="h-3.5 w-3.5 text-amber-700" />
            <span>تعديل وترتيب العناصر</span>
          </button>
        </div>
      )}

      {/* Reorderable Blocks */}
      {blockOrder.map((blockKey) => {
        if (blockKey === 'carousel') {
          return renderCarousel();
        }
        if (blockKey === 'products_slider') {
          return renderProductsSlider();
        }
        if (blockKey === 'video') {
          return renderVideo();
        }
        return null;
      })}
    </div>
  );
}
