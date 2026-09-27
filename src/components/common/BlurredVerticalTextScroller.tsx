import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAnimationFrame } from 'framer-motion';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router';
import { WheelBoxConfig, WheelBoxElementId, DEFAULT_WHEEL_BOX_CONFIG } from '../../types';

export interface RadialWheelTextScrollerProps {
  config?: WheelBoxConfig;
  items?: string[];
  badge?: string;
  heading?: string;
  subheading?: string;
  promoBadge?: string;
  promoHeading?: string;
  showPromo?: boolean;
  speed?: number; // سرعة الدوران بالدرجات في الثانية
  radius?: number; // نصف قطر العجلة بالبكسل
  angleStep?: number; // الفارق الزاوي بين كل كلمة وأخرى بالدرجات
  containerHeight?: number;
  className?: string;
  pauseOnHover?: boolean;
  dir?: 'rtl' | 'ltr';
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  elementsOrder?: WheelBoxElementId[];
  showWheel?: boolean;
  showSearch?: boolean;
  showSuggestions?: boolean;
  backgroundMode?: 'transparent' | 'dark' | 'glass' | 'emerald_glow';
  textColorMode?: 'black' | 'white' | 'emerald';
}

export function RadialWheelTextScroller({
  config,
  items,
  badge = '',
  heading = '',
  subheading = '',
  promoBadge,
  promoHeading,
  showPromo,
  speed,
  radius,
  angleStep = 18,
  containerHeight = 440,
  className = '',
  pauseOnHover = true,
  dir = 'rtl',
  onSearch,
  searchPlaceholder,
  elementsOrder,
  showWheel,
  showSearch,
  showSuggestions,
  backgroundMode,
  textColorMode
}: RadialWheelTextScrollerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSetIndex, setActiveSetIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 640 : false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // مراقبة رؤية العنصر لإيقاف الأنيميشن فوراً عند السكرول لأسفل الصفحة (0% CPU/GPU حينئذٍ)
  const sectionRef = useRef<HTMLElement>(null);
  const isVisibleRef = useRef(true);
  const rawAngleAcc = useRef(0);
  const arrowIndicatorRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // حساب القيم الفعّالة إما من config أو من props أو الافتراضي
  const effectiveConfig = config || DEFAULT_WHEEL_BOX_CONFIG;
  const effectiveItems = items || effectiveConfig.wheelItems || DEFAULT_WHEEL_BOX_CONFIG.wheelItems;
  const effectiveSpeed = speed ?? effectiveConfig.wheelSpeed ?? DEFAULT_WHEEL_BOX_CONFIG.wheelSpeed;
  const effectiveRadius = radius ?? effectiveConfig.wheelRadius ?? DEFAULT_WHEEL_BOX_CONFIG.wheelRadius;
  const effectivePromoBadge = promoBadge ?? effectiveConfig.promoBadge ?? DEFAULT_WHEEL_BOX_CONFIG.promoBadge;
  const effectivePromoHeading = promoHeading ?? effectiveConfig.promoHeading ?? DEFAULT_WHEEL_BOX_CONFIG.promoHeading;
  const effectiveShowPromo = showPromo ?? effectiveConfig.showPromo ?? DEFAULT_WHEEL_BOX_CONFIG.showPromo;
  const effectiveShowWheel = showWheel ?? effectiveConfig.showWheel ?? DEFAULT_WHEEL_BOX_CONFIG.showWheel;
  const effectiveShowSearch = showSearch ?? effectiveConfig.showSearch ?? DEFAULT_WHEEL_BOX_CONFIG.showSearch;
  const effectiveSearchPlaceholder = searchPlaceholder ?? effectiveConfig.searchPlaceholder ?? DEFAULT_WHEEL_BOX_CONFIG.searchPlaceholder;
  const effectiveShowSuggestions = showSuggestions ?? effectiveConfig.showSuggestions ?? DEFAULT_WHEEL_BOX_CONFIG.showSuggestions;
  const effectiveSuggestionSets = effectiveConfig.suggestionSets || DEFAULT_WHEEL_BOX_CONFIG.suggestionSets;
  const effectiveOrder: WheelBoxElementId[] = elementsOrder || effectiveConfig.elementsOrder || DEFAULT_WHEEL_BOX_CONFIG.elementsOrder;
  const effectiveBgMode = backgroundMode || effectiveConfig.backgroundMode || 'transparent';
  const effectiveTextColorMode = textColorMode || effectiveConfig.textColorMode || 'black';

  useEffect(() => {
    if (!sectionRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // تدوير المقترحات الثلاثة تلقائياً كل 4 ثوانٍ
  useEffect(() => {
    if (!effectiveShowSuggestions || effectiveSuggestionSets.length <= 1) return;
    const timer = setInterval(() => {
      setActiveSetIndex((prev) => (prev + 1) % effectiveSuggestionSets.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [effectiveShowSuggestions, effectiveSuggestionSets.length]);

  // تكرار العناصر لضمان دوران العجلة بلا نهاية (Seamless Wheel Loop)
  const tripleItems = useMemo(() => [...effectiveItems, ...effectiveItems, ...effectiveItems], [effectiveItems]);
  const totalCount = tripleItems.length;
  const totalAngleSpan = totalCount * angleStep;

  // دالة تحديث موضع السهم والعبارات مباشرة على DOM Nodes في كرت الشاشة (0 Re-renders)
  const updateWheelFrame = useCallback((currentRot: number) => {
    // 1. مؤشر السهم التفاعلي الصادم مع الكلمات
    const modAngle = ((currentRot % angleStep) + angleStep) % angleStep;
    let distFromSlot = modAngle;
    if (distFromSlot > angleStep / 2) {
      distFromSlot -= angleStep;
    }

    const absDist = Math.abs(distFromSlot);
    let arrowStrikeX = 0;
    if (absDist < 16) {
      const norm = distFromSlot / 16;
      // Sharp strike forward to the left (-X) and fast elastic recoil
      const strikeImpulse = Math.exp(-Math.pow(norm * 2.5, 2));
      const recoilBounce = Math.cos(norm * Math.PI * 3);
      arrowStrikeX = -(strikeImpulse * 15 + strikeImpulse * recoilBounce * 4);
    }
    if (arrowIndicatorRef.current) {
      arrowIndicatorRef.current.style.transform = `translate3d(${arrowStrikeX}px, -50%, 0)`;
    }

    // 2. تحديث حركة ومواضع عبارات العجلة بدقة هندسية 100% مطابقة للسابقة
    const items = itemRefs.current;
    for (let index = 0; index < items.length; index++) {
      const el = items[index];
      if (!el) continue;

      const rawAngle = index * angleStep - currentRot;
      let wrappedAngle = ((rawAngle % totalAngleSpan) + totalAngleSpan) % totalAngleSpan;
      if (wrappedAngle > totalAngleSpan / 2) {
        wrappedAngle -= totalAngleSpan;
      }

      if (Math.abs(wrappedAngle) > 85) {
        if (el.style.display !== 'none') {
          el.style.display = 'none';
        }
        continue;
      }

      if (el.style.display !== 'flex') {
        el.style.display = 'flex';
      }

      const angleRad = (wrappedAngle * Math.PI) / 180;
      const distFromCenter = Math.abs(wrappedAngle);

      // Dynamic strike impulse on the focused, non-blurred word (thrusts horizontally to the left with elastic overshoot)
      let strikeOffset = 0;
      if (distFromCenter < 16) {
        const normAngle = wrappedAngle / 16;
        const impulse = Math.exp(-Math.pow(normAngle * 2.4, 2));
        const elasticWave = Math.cos(normAngle * Math.PI * 2.8);
        strikeOffset = -(impulse * 28 + impulse * elasticWave * 7);
      }

      // معادلة القوس الدائري الأصلية تماماً (Original Wheel Arc Layout):
      const x = -effectiveRadius * Math.cos(angleRad) + (effectiveRadius * 0.4) + strikeOffset; 
      const y = effectiveRadius * Math.sin(angleRad);
      const rotateDeg = -wrappedAngle * 0.55;
      const scale = Math.max(1.15 - (distFromCenter / 90) * 0.55, 0.65);
      const opacity = Math.max(1 - Math.pow(distFromCenter / 75, 2), 0.05);
      const blur = Math.min((distFromCenter / 15) * 2.2, 10);

      el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rotateDeg}deg) scale(${scale})`;
      el.style.filter = blur > 0.5 ? `blur(${Math.round(blur)}px)` : 'none';
      el.style.opacity = `${opacity.toFixed(3)}`;
    }
  }, [angleStep, effectiveRadius, totalAngleSpan]);

  // تهيئة الإحداثيات الأولى فور التحميل دون وميض
  useEffect(() => {
    updateWheelFrame(0);
  }, [updateWheelFrame, tripleItems]);

  // حلقة تحريك مركزية واحدة خفيفة جداً بدلاً من 31 حلقة منفصلة
  useAnimationFrame((_, delta) => {
    if (!isVisibleRef.current) return;
    if (pauseOnHover && isHovered) return;
    const safeDelta = Math.min(delta, 50);
    const moveBy = (effectiveSpeed * safeDelta) / 1000;
    const nextRaw = rawAngleAcc.current + moveBy;
    rawAngleAcc.current = nextRaw;

    // معادلة التوقف اللحظي في قمة قوس العجلة للعبارة الواضحة
    const slotIndex = Math.floor(nextRaw / angleStep);
    const u = (nextRaw % angleStep) / angleStep;

    const dwellFraction = 0.40;
    let effectiveU = 0;
    if (u > dwellFraction) {
      const transitionProgress = (u - dwellFraction) / (1 - dwellFraction);
      effectiveU = transitionProgress < 0.5
        ? 4 * transitionProgress * transitionProgress * transitionProgress
        : 1 - Math.pow(-2 * transitionProgress + 2, 3) / 2;
    }

    const smoothedAngle = (slotIndex + effectiveU) * angleStep;
    updateWheelFrame(smoothedAngle);
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (onSearch) {
        onSearch(searchQuery.trim());
      } else {
        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      }
    }
  };

  const handleSuggestionClick = (queryText: string) => {
    setSearchQuery(queryText);
    if (onSearch) {
      onSearch(queryText);
    } else {
      navigate(`/search?q=${encodeURIComponent(queryText)}`);
    }
  };

  // حساب التحويلات المكانية المخصصة لكل عنصر (X, Y, ScaleX, ScaleY, Opacity, ZIndex, Width)
  const getTransformStyle = (elementId: WheelBoxElementId): React.CSSProperties => {
    const tf = effectiveConfig.elementTransforms?.[elementId];
    if (!tf) return {};
    const x = tf.x || 0;
    const y = tf.y || 0;
    const scale = tf.scale ?? 1;
    const scaleX = tf.scaleX ?? scale;
    const scaleY = tf.scaleY ?? scale;
    const opacity = tf.opacity ?? 1;
    const zIndex = tf.zIndex;

    return {
      transform: (x !== 0 || y !== 0 || scaleX !== 1 || scaleY !== 1) 
        ? `translate3d(${x}px, ${y}px, 0) scale(${scaleX}, ${scaleY})` 
        : undefined,
      opacity: opacity !== 1 ? opacity : undefined,
      zIndex: zIndex !== undefined ? zIndex : undefined,
      width: tf.width ? `${tf.width}px` : undefined,
      maxWidth: elementId === 'wheel' ? undefined : '100%'
    };
  };

  // وظائف بناء العناصر المكونة لبوكس العجلة حسب ترتيب المدير
  const renderPromo = () => {
    if (!effectiveShowPromo || (!effectivePromoBadge && !effectivePromoHeading)) return null;
    return (
      <div 
        key="promo-section" 
        style={getTransformStyle('promo')}
        className="flex flex-col items-center justify-center my-2 animate-in fade-in duration-300 w-full px-2 transition-transform duration-75"
      >
        {effectivePromoBadge && (
          <div className="inline-flex items-center gap-2.5 px-6 py-2.5 sm:px-4 sm:py-1.5 rounded-full bg-[#1a4d2e]/10 border-2 sm:border border-[#1a4d2e]/25 text-[19px] sm:text-xs md:text-sm font-extrabold text-[#1a4d2e] mb-4 sm:mb-1.5 shadow-sm sm:shadow-xs backdrop-blur-xs">
            <Sparkles className="w-5 h-5 sm:w-3.5 sm:h-3.5 text-[#1a4d2e] animate-pulse shrink-0" />
            <span>{effectivePromoBadge}</span>
          </div>
        )}
        {effectivePromoHeading && (
          <h2 className="text-[35px] leading-tight sm:text-2xl md:text-3xl font-black text-stone-900 tracking-tight sm:leading-tight drop-shadow-xs max-w-2xl text-center">
            {effectivePromoHeading.includes('دليلك الأسرع لاستكشاف') ? (
              <>
                <span className="block sm:hidden mb-2">
                  دليلك الأسرع لاستكشاف
                </span>
                <span className="block sm:hidden">
                  {effectivePromoHeading.replace('دليلك الأسرع لاستكشاف', '').trim()}
                </span>
                <span className="hidden sm:inline">
                  {effectivePromoHeading}
                </span>
              </>
            ) : (
              effectivePromoHeading
            )}
          </h2>
        )}
      </div>
    );
  };

  const getTextColorStyle = () => {
    if (effectiveTextColorMode === 'white') return 'text-white drop-shadow-[0_4px_15px_rgba(0,0,0,0.9)]';
    if (effectiveTextColorMode === 'emerald') return 'text-[#1a4d2e] drop-shadow-[0_2px_8px_rgba(255,255,255,0.9)]';
    return 'text-stone-900 drop-shadow-[0_2px_8px_rgba(255,255,255,0.9)]';
  };

  const renderWheel = () => {
    if (!effectiveShowWheel) return null;
    return (
      <div 
        key="wheel-section" 
        style={getTransformStyle('wheel')}
        className="relative w-full max-w-6xl sm:max-w-none sm:w-[1150px] md:w-[1250px] lg:w-[1350px] sm:shrink-0 flex items-center justify-center px-2 sm:px-0 my-2 transition-transform duration-75 -right-[28px] sm:right-[95px] md:right-[130px] lg:right-[165px] sm:scale-75 sm:origin-center sm:-my-7"
      >
        {/* مؤشر السهم التفاعلي الصادم مع الكلمات */}
        <div 
          ref={arrowIndicatorRef}
          style={{ 
            right: isMobile ? 'calc(2% + 148px)' : 'calc(2% + 140px)',
            transform: 'translate3d(0px, -50%, 0)'
          }}
          className="absolute top-1/2 z-30 pointer-events-none flex items-center justify-center will-change-transform"
        >
          <div className="flex items-center justify-center w-11 h-11 rounded-full bg-emerald-500 text-stone-950 shadow-[0_0_30px_rgba(16,185,129,0.95)] ring-2 ring-stone-900/80 shrink-0">
            <ArrowLeft className="w-6 h-6 text-stone-950 stroke-[3]" />
          </div>
        </div>

        {/* حاوية القوس الدائري مع توسيع الحدود وتلاشي ناعم علوياً وسفلياً دون قص أطراف الكلمات */}
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            height: containerHeight,
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%)'
          }}
          className="relative w-full flex items-center justify-center overflow-visible"
        >
          <div className="relative w-full h-full flex items-center justify-center overflow-visible">
            {tripleItems.map((item, index) => (
              <div
                key={`${item}-${index}`}
                ref={(el) => { itemRefs.current[index] = el; }}
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: '2%',
                  transformOrigin: 'right center',
                  willChange: 'transform, opacity',
                  display: 'none'
                }}
                className="flex items-center justify-start pointer-events-none -mt-5"
                dir={dir}
              >
                {item.includes('كافيهات ومساحات عمل هادئة') ? (
                  <span className={`text-[31.2px] leading-tight sm:text-3xl md:text-4xl font-black tracking-tight text-right ${getTextColorStyle()}`} dir={dir}>
                    <span className="block sm:inline whitespace-nowrap">كافيهات ومساحات عمل</span>
                    <span className="block sm:inline whitespace-nowrap sm:before:content-['\00a0']">هادئة</span>
                  </span>
                ) : (
                  <span className={`text-[31.2px] leading-tight sm:text-3xl md:text-4xl font-black tracking-tight whitespace-nowrap text-right ${getTextColorStyle()}`} dir={dir}>
                    {item}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSearch = () => {
    if (!effectiveShowSearch) return null;
    return (
      <form 
        key="search-section"
        onSubmit={handleSearchSubmit}
        style={getTransformStyle('search')}
        className="my-3.5 sm:my-3 w-[88.4%] sm:w-full max-w-[88.4%] sm:max-w-xl mx-auto relative flex items-center bg-white/85 border-[3.5px] sm:border-2 border-stone-900 rounded-full p-3 sm:p-2 shadow-xl backdrop-blur-md transition-all focus-within:ring-4 focus-within:ring-stone-900/20 z-20 min-h-[96px] sm:min-h-0"
      >
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={isMobile ? 'عن ماذا تبحث؟' : effectiveSearchPlaceholder}
          className="flex-1 min-w-0 bg-transparent border-none text-stone-900 placeholder-stone-500 px-3 sm:px-6 text-2xl sm:text-base font-black focus:outline-none text-right placeholder:text-xl sm:placeholder:text-base tracking-tight"
          dir="rtl"
        />
        <button
          type="submit"
          className="flex items-center justify-center w-16 h-16 sm:w-12 sm:h-12 rounded-full bg-stone-900 text-white hover:bg-stone-800 transition-all active:scale-95 shrink-0 shadow-md cursor-pointer ml-0.5"
          title="بحث"
        >
          <ArrowLeft className="w-8 h-8 sm:w-6 sm:h-6 text-white stroke-[2.5]" />
        </button>
      </form>
    );
  };

  const renderSuggestions = () => {
    if (!effectiveShowSuggestions || effectiveSuggestionSets.length === 0) return null;
    const currentSet = effectiveSuggestionSets[activeSetIndex % effectiveSuggestionSets.length]?.items || [];
    if (currentSet.length === 0) return null;

    return (
      <div 
        key="suggestions-section" 
        style={getTransformStyle('suggestions')}
        className="mt-2 mb-0 sm:my-2 w-full max-w-xl mx-auto flex flex-wrap sm:flex-nowrap items-center justify-center gap-2 sm:gap-2 px-1 transition-transform duration-75"
      >
        {currentSet.map((sug, idx) => {
          // In mobile (<sm): 2 buttons in row 1, 3rd button centered in row 2
          const mobileWidthClass = (currentSet.length === 3 && idx === 2)
            ? 'w-[58%] sm:w-auto sm:flex-1'
            : 'w-[calc(50%-5px)] sm:w-auto sm:flex-1';

          return (
            <button
              key={`${activeSetIndex}-${idx}-${sug.query}`}
              type="button"
              onClick={() => handleSuggestionClick(sug.query)}
              className={`${mobileWidthClass} min-w-0 inline-flex items-center justify-center gap-1.5 px-4 py-3 sm:px-4 sm:py-2.5 rounded-full text-2xl sm:text-base md:text-lg font-black bg-white/90 hover:bg-[#1a4d2e] hover:text-white border-2 sm:border border-stone-300 hover:border-[#1a4d2e] text-stone-800 shadow-sm sm:shadow-xs transition-all duration-200 active:scale-95 cursor-pointer truncate`}
              title={sug.label}
            >
              <span className="truncate">{sug.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const getContainerBgClass = () => {
    switch (effectiveBgMode) {
      case 'dark':
        return 'bg-[#09090b] text-white border border-stone-800 shadow-2xl';
      case 'glass':
        return 'bg-white/60 backdrop-blur-xl border border-stone-200/80 shadow-xl';
      case 'emerald_glow':
        return 'bg-gradient-to-b from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 shadow-xl';
      case 'transparent':
      default:
        return 'bg-transparent text-stone-900';
    }
  };

  const getBoxShadowStyle = () => {
    switch (effectiveConfig.boxShadowStyle) {
      case 'soft':
        return '0 10px 30px -10px rgba(0,0,0,0.1)';
      case 'medium':
        return '0 20px 40px -15px rgba(0,0,0,0.18)';
      case 'glow':
        return '0 0 50px rgba(16,185,129,0.25)';
      case 'strong':
        return '0 30px 60px -12px rgba(0,0,0,0.3)';
      case 'none':
      default:
        return undefined;
    }
  };

  const boxWidth = effectiveConfig.containerWidth || 780;
  const boxBorderRadius = effectiveConfig.borderRadius !== undefined ? `${effectiveConfig.borderRadius}px` : undefined;
  const boxPadding = effectiveConfig.boxPadding !== undefined ? `${effectiveConfig.boxPadding}px` : undefined;
  const boxBorder = (effectiveConfig.boxBorderWidth && effectiveConfig.boxBorderWidth > 0)
    ? `${effectiveConfig.boxBorderWidth}px solid ${effectiveConfig.boxBorderColor || '#e5e1da'}`
    : undefined;

  return (
    <section 
      ref={sectionRef}
      style={{
        borderRadius: boxBorderRadius,
        boxShadow: getBoxShadowStyle(),
        border: boxBorder
      }}
      className={`relative w-full py-0.5 sm:py-1 md:py-2 lg:py-4 overflow-visible select-none transition-all ${getContainerBgClass()} ${className}`} 
      dir={dir}
    >
      {/* خلفية تجميلية شفافة */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[850px] h-[350px] sm:h-[450px] bg-emerald-500/5 rounded-full blur-[130px] opacity-50" />
      </div>

      {/* حاوية خارجية مخصصة لاستيعاب العرض المصغر كقطعة واحدة على الهواتف والتابلت */}
      <div className="relative w-full max-w-none sm:max-w-none sm:w-full mx-auto px-1 sm:px-4 lg:px-8 flex flex-col items-center text-center overflow-visible">
        
        {/* وحدة العرض المصغرة كقطعة واحدة بنسبة وتناسب 100% مع أبعاد الصندوق المحددة */}
        <div 
          style={{ 
            width: `${boxWidth}px`,
            padding: boxPadding,
            transform: effectiveConfig.boxScale && effectiveConfig.boxScale !== 1 ? `scale(${effectiveConfig.boxScale})` : undefined
          }}
          className="flex flex-col items-center justify-center origin-center transition-transform duration-300 scale-[0.46] min-[380px]:scale-[0.52] min-[480px]:scale-[0.62] sm:scale-[0.78] md:scale-[0.90] lg:scale-100 -my-[152px] min-[380px]:-my-[136px] min-[480px]:-my-[105px] sm:-my-[60px] md:-my-[28px] lg:my-0 shrink-0 overflow-visible"
        >
          
          {/* توليد العناصر بالترتيب الديناميكي المحدد في لوحة التحكم */}
          {effectiveOrder.map((elementId) => {
            switch (elementId) {
              case 'promo':
                return renderPromo();
              case 'wheel':
                return renderWheel();
              case 'search':
                return renderSearch();
              case 'suggestions':
                return renderSuggestions();
              default:
                return null;
            }
          })}

        </div>
      </div>
    </section>
  );
}

// Named export aliases to ensure all imports work seamlessly
export const BlurredVerticalTextScroller = RadialWheelTextScroller;

export default RadialWheelTextScroller;