import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';

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
      { text: 'وجبات عائلية 🍗', query: 'وجبات' },
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
      { text: 'مكتبات وتصوير أبحاث 📚', query: 'مكتبه' },
      { text: 'شاي ومشروبات ساخنة 🫖', query: 'شاي' },
      { text: 'لاتيه وسبيشالتي كوفي ☕', query: 'قهوه' },
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
      { text: 'مراكز علاج طبيعي 🩹', query: 'صحه' },
    ]
  },
  {
    id: 'sweets',
    categoryName: 'حلويات وانتعاش',
    categoryIcon: '🍰',
    badgeBg: 'bg-pink-500/20 text-pink-300 border-pink-400/30',
    suggestions: [
      { text: 'كنافة وحلويات شرقية 🍯', query: 'حلويات', highlight: true },
      { text: 'آيس كريم وعصائر منعشة 🍦', query: 'عصائر' },
      { text: 'كيك وتورتات مناسبات 🎂', query: 'كيك' },
      { text: 'وافل وكريب 🥞', query: 'وافل' },
      { text: 'مخبوزات ساخنة 🥐', query: 'مخبز' },
    ]
  },
  {
    id: 'students',
    categoryName: 'سكن وطلاب الجامعات',
    categoryIcon: '🎓',
    badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/30',
    suggestions: [
      { text: 'سكن طالبات وطلاب 🎓', query: 'سكن', highlight: true },
      { text: 'شقق مفروشة للإيجار 🏢', query: 'شقه' },
      { text: 'قرطاسية وأدوات جامعية 📖', query: 'كتب' },
      { text: 'استوديوهات قريبة من اليرموك 🏫', query: 'سكن' },
    ]
  },
  {
    id: 'lifestyle',
    categoryName: 'أزياء وجمال وتسوق',
    categoryIcon: '✨',
    badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
    suggestions: [
      { text: 'أزياء وملابس وموضة 👗', query: 'ملابس', highlight: true },
      { text: 'صالونات ومراكز تجميل ✂️', query: 'صالون' },
      { text: 'عطور وهدايا فاخرة 🎁', query: 'عطور' },
      { text: 'نوادي رياضية وجيم 🏋️', query: 'رياضه' },
      { text: 'ذهب ومجوهرات 💍', query: 'ذهب' },
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
      { text: 'تأجير سيارات سياحية 🚙', query: 'تأجير' },
      { text: 'صيانة وبرمجة هواتف 📱', query: 'هواتف' },
    ]
  },
  {
    id: 'crafts',
    categoryName: 'صناعة وحرف وإنشاءات',
    categoryIcon: '🧱',
    badgeBg: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
    suggestions: [
      { text: 'محلات نجارة ومطابخ 🪚', query: 'نجار', highlight: true },
      { text: 'محلات حدادة وتشكيل معادن 🔨', query: 'حداد' },
      { text: 'محاجر ومصانع حجر وسيراميك 🧱', query: 'حجر' },
      { text: 'مواد بناء ودهانات 🎨', query: 'بناء' },
    ]
  },
  {
    id: 'food_supplies',
    categoryName: 'ملاحم ودواجن ومياه شرب',
    categoryIcon: '💧',
    badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
    suggestions: [
      { text: 'محطات تنقية مياه شرب وفلاتر 💧', query: 'مياه', highlight: true },
      { text: 'ملاحم وقصابين لحوم طازجة 🥩', query: 'لحم' },
      { text: 'محلات دواجن ونتفات 🐔', query: 'دجاج' },
    ]
  }
];

interface DynamicSmartSuggestionsProps {
  onSelectSuggestion: (query: string) => void;
}

export function DynamicSmartSuggestions({ onSelectSuggestion }: DynamicSmartSuggestionsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isManualSwitch, setIsManualSwitch] = useState(false);

  // Auto-cycle every 3.8 seconds unless hovered/paused
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % SUGGESTION_GROUPS.length);
    }, 3800);

    return () => clearInterval(timer);
  }, [isPaused]);

  const handleNext = () => {
    setIsManualSwitch(true);
    setCurrentIndex((prev) => (prev + 1) % SUGGESTION_GROUPS.length);
    setTimeout(() => setIsManualSwitch(false), 400);
  };

  const handlePrev = () => {
    setIsManualSwitch(true);
    setCurrentIndex((prev) => (prev - 1 + SUGGESTION_GROUPS.length) % SUGGESTION_GROUPS.length);
    setTimeout(() => setIsManualSwitch(false), 400);
  };

  const currentGroup = SUGGESTION_GROUPS[currentIndex];

  return (
    <div 
      className="mt-3 md:mt-5 w-full select-none" 
      dir="rtl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Header bar with animated category indicator and change action */}
      <div className="flex items-center justify-between gap-1 mb-2 px-1 md:px-2 max-w-xl mx-auto">
        <div className="flex items-center gap-1 text-[10px] md:text-xs text-white/80 font-bold">
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          >
            <Sparkles className="h-3 w-3 md:h-3.5 md:w-3.5 text-[#ff9f1c]" />
          </motion.div>
          <span className="hidden xs:inline">مقترحات ذكية متغيرة:</span>
          <span className="xs:hidden">مقترحات:</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={currentGroup.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.22 }}
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] md:text-[11px] font-black border backdrop-blur-sm ${currentGroup.badgeBg}`}
            >
              <span>{currentGroup.categoryIcon}</span>
              <span>{currentGroup.categoryName}</span>
            </motion.span>
          </AnimatePresence>
        </div>
 
        {/* Manual shuffle & navigation buttons */}
        <div className="flex items-center gap-0.5 md:gap-1">
          <button
            type="button"
            onClick={handlePrev}
            title="المقترحات السابقة"
            className="p-0.5 md:p-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronRight className="h-3 w-3 md:h-3.5 md:w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            title="تحديث وتغيير المقترحات"
            className="flex items-center gap-0.5 md:gap-1 px-1.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white text-[9px] md:text-[11px] font-bold transition-all cursor-pointer"
          >
            <motion.div
              animate={{ rotate: isManualSwitch ? 360 : 0 }}
              transition={{ duration: 0.4 }}
            >
              <RefreshCw className="h-2.5 w-2.5 md:h-3 md:w-3" />
            </motion.div>
            <span className="hidden sm:inline">تغيير</span>
          </button>
          <button
            type="button"
            onClick={handleNext}
            title="المقترحات التالية"
            className="p-0.5 md:p-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-3 w-3 md:h-3.5 md:w-3.5" />
          </button>
        </div>
      </div>
 
      {/* Animated Suggestion Pills Box */}
      <div className="relative min-h-[38px] md:min-h-[50px] flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentGroup.id}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex flex-wrap items-center justify-center gap-1.5 md:gap-2"
          >
            {currentGroup.suggestions.map((sug, idx) => (
              <motion.button
                key={`${currentGroup.id}-${sug.query}-${idx}`}
                type="button"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.22, delay: idx * 0.03 }}
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelectSuggestion(sug.query)}
                className={`group relative overflow-hidden px-2 py-1 md:px-3.5 md:py-1.5 rounded-full font-bold text-[10px] md:text-xs transition-all shadow-xs cursor-pointer backdrop-blur-md border ${
                  sug.highlight
                    ? 'bg-gradient-to-r from-amber-500/30 to-amber-600/30 hover:from-amber-500/40 hover:to-amber-600/40 text-amber-200 border-amber-400/40 ring-1 ring-amber-400/20'
                    : 'bg-white/15 hover:bg-white/25 text-white border-white/20 hover:border-white/40'
                }`}
              >
                <span className="relative z-10 flex items-center gap-1 md:gap-1.5">
                  <span>{sug.text}</span>
                </span>
                
                {/* Subtle sheen highlight on hover */}
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 pointer-events-none" />
              </motion.button>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
 
      {/* Progress Dots Indicator */}
      <div className="flex items-center justify-center gap-1 mt-2 md:mt-3">
        {SUGGESTION_GROUPS.map((group, idx) => (
          <button
            key={group.id}
            type="button"
            onClick={() => setCurrentIndex(idx)}
            title={group.categoryName}
            className={`transition-all rounded-full cursor-pointer ${
              idx === currentIndex
                ? 'w-3 md:w-5 h-1 md:h-1.5 bg-[#ff9f1c]'
                : 'w-1 md:w-1.5 h-1 md:h-1.5 bg-white/30 hover:bg-white/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
