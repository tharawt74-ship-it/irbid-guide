import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

export interface SmartSuggestionItem {
  text: string;
  query: string;
  emoji?: string;
  highlight?: boolean;
}

export interface SuggestionGroup {
  id: string;
  categoryName: string;
  categoryIcon: string;
  badgeBg: string;
  suggestions: SmartSuggestionItem[];
}

export const SUGGESTION_GROUPS: SuggestionGroup[] = [
  {
    id: 'food',
    categoryName: 'أكلات ومطاعم',
    categoryIcon: '🌯',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-400/30',
    suggestions: [
      { text: 'شاورما إربداوية 🌯', query: 'شاورما', highlight: true },
      { text: 'برغر وسناكات 🍔', query: 'برجر' },
      { text: 'مشاوي وفطور بلدي 🧆', query: 'مشاوي' },
      { text: 'بيتزا ومعجنات 🍕', query: 'بيتزا' },
    ]
  },
  {
    id: 'cafes',
    categoryName: 'كافيهات ودراسة',
    categoryIcon: '☕',
    badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
    suggestions: [
      { text: 'قهوة وجلسات دراسة ☕', query: 'دراسه', highlight: true },
      { text: 'مقاهي شبابية وعائلية 🌿', query: 'كافيه' },
      { text: 'مكتبات وقرطاسية 📚', query: 'مكتبه' },
      { text: 'شاي ومشروبات ساخنة 🫖', query: 'شاي' },
    ]
  },
  {
    id: 'health',
    categoryName: 'صحة وعيادات',
    categoryIcon: '💊',
    badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-400/30',
    suggestions: [
      { text: 'صيدليات مناوبة 💊', query: 'صيدليه', highlight: true },
      { text: 'عيادات أسنان 🦷', query: 'اسنان' },
      { text: 'أطباء واستشارات 🩺', query: 'طبيب' },
      { text: 'مختبرات وبصريات 🔬', query: 'مختبر' },
    ]
  },
  {
    id: 'sweets',
    categoryName: 'حلويات وانتعاش',
    categoryIcon: '🍰',
    badgeBg: 'bg-pink-500/20 text-pink-300 border-pink-400/30',
    suggestions: [
      { text: 'كنافة وحلويات شرقية 🍯', query: 'حلويات', highlight: true },
      { text: 'عصائر وآيس كريم 🍦', query: 'عصائر' },
      { text: 'كيك ومناسبات 🎂', query: 'كيك' },
      { text: 'وافل وكرواسون 🥐', query: 'وافل' },
    ]
  },
  {
    id: 'students',
    categoryName: 'خدمات طلابية وجامعية',
    categoryIcon: '🎓',
    badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30',
    suggestions: [
      { text: 'مكتبات جامعية 📚', query: 'مكتبه', highlight: true },
      { text: 'طباعة وتصوير أبحاث 📑', query: 'طباعة' },
      { text: 'مراكز تدريب ولغات 🎓', query: 'تدريب' },
      { text: 'كافيهات هادئة للدراسة ☕', query: 'دراسه' },
    ]
  },
  {
    id: 'lifestyle',
    categoryName: 'أزياء وجمال وتسوق',
    categoryIcon: '✨',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
    suggestions: [
      { text: 'أزياء وموضة 👗', query: 'ملابس', highlight: true },
      { text: 'صالونات وتجميل ✂️', query: 'صالون' },
      { text: 'عطور وهدايا فاخرة 🎁', query: 'عطور' },
      { text: 'نوادي رياضية وجيم 🏋️', query: 'رياضه' },
    ]
  },
  {
    id: 'services',
    categoryName: 'سيارات وخدمات',
    categoryIcon: '🚗',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30',
    suggestions: [
      { text: 'غسيل وتلميع سيارات 🚗', query: 'غسيل', highlight: true },
      { text: 'صيانة وميكانيك 🔧', query: 'تصليح' },
      { text: 'تأجير سيارات 🚙', query: 'تأجير' },
      { text: 'صيانة هواتف ذكية 📱', query: 'هواتف' },
    ]
  },
  {
    id: 'crafts',
    categoryName: 'صناعة وحرف وإنشاءات',
    categoryIcon: '🧱',
    badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
    suggestions: [
      { text: 'نجارة ومطابخ 🪚', query: 'نجار', highlight: true },
      { text: 'حدادة ومعادن 🔨', query: 'حداد' },
      { text: 'حجر ومحاجر 🧱', query: 'حجر' },
      { text: 'مواد بناء ودهانات 🎨', query: 'بناء' },
    ]
  },
  {
    id: 'food_supplies',
    categoryName: 'ملاحم ومخابز ومياه شرب',
    categoryIcon: '💧',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
    suggestions: [
      { text: 'محطات مياه وفلاتر 💧', query: 'مياه', highlight: true },
      { text: 'ملاحم وقصابين 🥩', query: 'لحم' },
      { text: 'دواجن طازجة 🐔', query: 'دجاج' },
      { text: 'مخابز ومعجنات 🥖', query: 'مخبز' },
    ]
  },
  {
    id: 'factories',
    categoryName: 'مصانع وإنتاج وشركات',
    categoryIcon: '🏭',
    badgeBg: 'bg-amber-600/20 text-amber-300 border-amber-500/30',
    suggestions: [
      { text: 'محامص ومصانع قهوة ☕', query: 'قهوة', highlight: true },
      { text: 'مصانع أغذية وألبان 🥫', query: 'مصنع' },
      { text: 'المدينة الصناعية 🏭', query: 'صناعية' },
      { text: 'بلاستيك وتغليف 📦', query: 'تغليف' },
    ]
  },
  {
    id: 'tech_innovation',
    categoryName: 'تقنية وبرمجيات وابتكار',
    categoryIcon: '💻',
    badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-400/30',
    suggestions: [
      { text: 'شركات برمجيات 💻', query: 'برمجة', highlight: true },
      { text: 'خدمة عملاء وتعهيد 🎧', query: 'عملاء' },
      { text: 'طباعة ثلاثية الأبعاد 🖨️', query: 'طباعة' },
      { text: 'حلول ذكاء اصطناعي 🤖', query: 'تقنية' },
    ]
  }
];

interface DynamicSmartSuggestionsProps {
  onSelectSuggestion: (query: string) => void;
}

export function DynamicSmartSuggestions({ onSelectSuggestion }: DynamicSmartSuggestionsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isIntersecting, setIsIntersecting] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Monitor visibility of suggestions with IntersectionObserver to pause when off-screen
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // Auto-cycle every 3.8 seconds unless hovered, paused, or out of viewport
  useEffect(() => {
    if (isPaused || !isIntersecting) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SUGGESTION_GROUPS.length);
    }, 3800);

    return () => clearInterval(timer);
  }, [isPaused, isIntersecting]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % SUGGESTION_GROUPS.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + SUGGESTION_GROUPS.length) % SUGGESTION_GROUPS.length);
  };

  const currentGroup = SUGGESTION_GROUPS[currentIndex];

  return (
    <div 
      ref={containerRef}
      className="mt-3 md:mt-4 w-full max-w-2xl mx-auto min-w-0 px-2 select-none box-border" 
      dir="rtl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Header bar with animated category indicator and Previous/Next buttons only */}
      <div className="flex items-center justify-between gap-1 mb-2 px-1 w-full max-w-full min-w-0 h-6">
        <div className="flex items-center gap-1 text-[10px] md:text-xs text-white/80 font-bold min-w-0">
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            className="shrink-0"
          >
            <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5 text-[#ff9f1c]" />
          </motion.div>
          <span className="hidden xs:inline shrink-0">مقترحات ذكية:</span>
          <span className="xs:hidden shrink-0">مقترحات:</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={currentGroup.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.22 }}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] md:text-[11px] font-black border backdrop-blur-sm truncate ${currentGroup.badgeBg}`}
            >
              <span>{currentGroup.categoryIcon}</span>
              <span>{currentGroup.categoryName}</span>
            </motion.span>
          </AnimatePresence>
        </div>
 
        {/* Navigation buttons: Previous & Next only (No change button) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handlePrev}
            title="المقترحات السابقة"
            aria-label="المقترحات السابقة"
            className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <ChevronRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            title="المقترحات التالية"
            aria-label="المقترحات التالية"
            className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer hover:scale-105 active:scale-95"
          >
            <ChevronLeft className="h-3.5 w-3.5 md:h-4 md:w-4" />
          </button>
        </div>
      </div>
 
      {/* Animated Suggestion Pills Box with Stable Minimum Height & Zero Cropping */}
      <div className="relative w-full max-w-full min-w-0 min-h-[76px] md:min-h-[44px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentGroup.id}
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-full min-w-0 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 py-1"
          >
            {currentGroup.suggestions.map((sug, idx) => (
              <motion.button
                key={`${currentGroup.id}-${sug.query}-${idx}`}
                type="button"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.16, delay: idx * 0.02 }}
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectSuggestion(sug.query)}
                className={`group relative overflow-hidden px-3 py-1.5 md:px-3.5 md:py-1.5 rounded-full font-bold text-[11px] sm:text-xs transition-all shadow-xs cursor-pointer backdrop-blur-md border flex items-center justify-center shrink-0 ${
                  sug.highlight
                    ? 'bg-gradient-to-r from-amber-500/30 to-amber-600/30 hover:from-amber-500/40 hover:to-amber-600/40 text-amber-200 border-amber-400/40 ring-1 ring-amber-400/20'
                    : 'bg-white/15 hover:bg-white/25 text-white border-white/20 hover:border-white/40'
                }`}
              >
                <span className="relative z-10 flex items-center gap-1 whitespace-nowrap leading-none">
                  <span>{sug.text}</span>
                </span>
                
                {/* Subtle sheen highlight on hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 pointer-events-none" />
              </motion.button>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
