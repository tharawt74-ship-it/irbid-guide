import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { createPortal } from 'react-dom';
import { 
  Search, 
  X, 
  Store, 
  Sparkles, 
  Flame, 
  Briefcase, 
  Building, 
  MapPin, 
  Star, 
  ArrowLeft, 
  Clock, 
  ChevronRight,
  TrendingUp,
  Tag
} from 'lucide-react';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Business } from '../../types';
import { normalizeArabic } from '../../lib/arabicSearch';
import { getBusinessVipStatus } from '../../lib/vipHelper';
import { getLiveWorkingStatus } from '../../lib/businessHoursHelper';

interface HeaderSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchCategoryMatch {
  name: string;
  query: string;
  icon: string;
}

const POPULAR_SEARCH_TAGS = [
  { text: 'شاورما 🌯', query: 'شاورما' },
  { text: 'كافيهات دراسة ☕', query: 'دراسه' },
  { text: 'صيدليات 💊', query: 'صيدليه' },
  { text: 'سكنات طلاب 🎓', query: 'سكن' },
  { text: 'مشاوي وفطور 🧆', query: 'مشاوي' },
  { text: 'عيادات أسنان 🦷', query: 'اسنان' },
  { text: 'عروض اليوم 🔥', query: 'عروض' },
  { text: 'وظائف شاغرة 💼', query: 'وظائف' },
];

const POPULAR_DISTRICTS = [
  'شارع الجامعة',
  'جامعة اليرموك',
  'شارع الثلاثين',
  'الحي الشرقي',
  'ميدان وصفي التل',
  'حي الجامعة',
  'إيدون',
  'الحصن',
  'الرابية',
  'حي الضباط',
  'مجمع عمان الجديد',
];

export function HeaderSearchModal({ isOpen, onClose }: HeaderSearchModalProps) {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load sample businesses for instant searching
  useEffect(() => {
    if (!isOpen || !db) return;

    let isMounted = true;
    async function loadQuickData() {
      setIsLoading(true);
      try {
        const q = query(collection(db, 'businesses'), orderBy('rating', 'desc'), limit(150));
        const snap = await getDocs(q);
        if (isMounted) {
          const list: Business[] = [];
          snap.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as Business);
          });
          setBusinesses(list);
        }
      } catch (err) {
        console.error('Error fetching search data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadQuickData();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setSearchTerm('');
      setSelectedIndex(0);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Filter businesses by normalized arabic search
  const normalizedQuery = normalizeArabic(searchTerm.trim());
  const words = normalizedQuery.split(/\s+/).filter(Boolean);

  const matchedBusinesses = searchTerm.trim()
    ? businesses.filter((b) => {
        const normName = normalizeArabic(b.name || '');
        const normCat = normalizeArabic(b.category || '');
        const normDistrict = normalizeArabic(b.district || '');
        const normDesc = normalizeArabic(b.description || '');

        return words.every((w) =>
          normName.includes(w) ||
          normCat.includes(w) ||
          normDistrict.includes(w) ||
          normDesc.includes(w)
        );
      }).slice(0, 8)
    : [];

  const matchedDistricts = searchTerm.trim()
    ? POPULAR_DISTRICTS.filter((d) => normalizeArabic(d).includes(normalizedQuery)).slice(0, 3)
    : [];

  const handleSelectBusiness = (id: string) => {
    onClose();
    const found = businesses.find((b) => b.id === id);
    if (found && found.username && found.username.trim()) {
      navigate(`/@${found.username.trim()}`);
    } else {
      navigate(`/business/${id}`);
    }
  };

  const handleSearchOnHomePage = (q: string) => {
    onClose();
    navigate(`/?search=${encodeURIComponent(q)}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter') {
      if (matchedBusinesses.length > 0 && selectedIndex >= 0 && selectedIndex < matchedBusinesses.length) {
        handleSelectBusiness(matchedBusinesses[selectedIndex].id);
      } else if (searchTerm.trim()) {
        handleSearchOnHomePage(searchTerm.trim());
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, matchedBusinesses.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + matchedBusinesses.length) % Math.max(1, matchedBusinesses.length));
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] bg-stone-950/75 backdrop-blur-md flex items-end sm:items-start justify-center sm:p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="w-full max-w-2xl bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden sm:mt-12 md:mt-16 animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1 bg-stone-200 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Search Input Bar */}
        <div className="p-3.5 sm:p-4 border-b border-stone-100 bg-white flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-[#1a4d2e]/10 text-[#1a4d2e] flex items-center justify-center shrink-0">
            <Search className="h-5 w-5" />
          </div>
          
          <input
            ref={inputRef}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="ابحث عن مطعم، كافيه، دكتور، سكن..."
            className="flex-1 text-base font-bold text-stone-800 placeholder-stone-400 bg-transparent border-none outline-none focus:ring-0"
          />

          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                inputRef.current?.focus();
              }}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-bold text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer border border-stone-200 shrink-0"
          >
            إلغاء <span className="hidden sm:inline text-[10px] text-stone-400 font-mono">ESC</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="max-h-[65vh] overflow-y-auto p-4 space-y-4">
          
          {/* Quick Search Chips when input is empty */}
          {!searchTerm.trim() ? (
            <div className="space-y-4 py-2">
              {/* Popular Tags */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-stone-500">
                  <TrendingUp className="h-3.5 w-3.5 text-[#ff9f1c]" />
                  <span>الأكثر بحثاً في إربد الآن:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SEARCH_TAGS.map((tag, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSearchOnHomePage(tag.query)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-stone-50 hover:bg-[#1a4d2e] hover:text-white text-stone-700 border border-stone-200/90 transition-all cursor-pointer shadow-2xs hover:shadow-xs active:scale-95"
                    >
                      {tag.text}
                    </button>
                  ))}
                </div>
              </div>

              {/* Popular Districts in Irbid */}
              <div className="space-y-2 pt-2 border-t border-dashed border-stone-100">
                <div className="flex items-center gap-1.5 text-xs font-black text-stone-500">
                  <MapPin className="h-3.5 w-3.5 text-[#1a4d2e]" />
                  <span>استكشف أشهر مناطق وأحياء إربد:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_DISTRICTS.map((district, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSearchOnHomePage(district)}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium text-stone-600 hover:text-[#1a4d2e] hover:bg-emerald-50 border border-stone-100 transition-colors cursor-pointer"
                    >
                      📍 {district}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fast Shortcut Navigation Links */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-dashed border-stone-100 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/offers');
                  }}
                  className="p-2.5 rounded-xl bg-orange-50/70 hover:bg-orange-100/80 text-orange-950 border border-orange-200/80 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-red-500 animate-pulse" />
                    <span>العروض والخصومات</span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-orange-400 rotate-180" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/jobs');
                  }}
                  className="p-2.5 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-950 border border-emerald-200/80 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-emerald-600" />
                    <span>وظائف إربد</span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-emerald-400 rotate-180" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/housing');
                  }}
                  className="p-2.5 rounded-xl bg-blue-50/70 hover:bg-blue-100/80 text-blue-950 border border-blue-200/80 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-blue-600" />
                    <span>سكنات وعقارات</span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-blue-400 rotate-180" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate('/news');
                  }}
                  className="p-2.5 rounded-xl bg-purple-50/70 hover:bg-purple-100/80 text-purple-950 border border-purple-200/80 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-600" />
                    <span>أخبار ونبض إربد</span>
                  </div>
                  <ChevronRight className="h-3 w-3 text-purple-400 rotate-180" />
                </button>
              </div>
            </div>
          ) : (
            /* Live Results List */
            <div className="space-y-3">
              {/* Full Search Action Trigger */}
              <button
                type="button"
                onClick={() => handleSearchOnHomePage(searchTerm.trim())}
                className="w-full p-3 rounded-2xl bg-[#1a4d2e] hover:bg-[#133b22] text-white flex items-center justify-between transition-all font-bold text-xs sm:text-sm shadow-sm cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Search className="h-4 w-4 text-[#ff9f1c]" />
                  <span>عرض جميع نتائج البحث لـ &quot;<span className="text-[#ff9f1c] font-black">{searchTerm}</span>&quot;</span>
                </div>
                <div className="flex items-center gap-1 text-white/80 text-xs">
                  <span>الذهاب</span>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </div>
              </button>

              {/* Matched District Pill */}
              {matchedDistricts.length > 0 && (
                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200/80 flex items-center gap-2 flex-wrap text-xs">
                  <span className="font-bold text-stone-500">مناطق مطابقة:</span>
                  {matchedDistricts.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => handleSearchOnHomePage(d)}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-[#1a4d2e] rounded-lg border border-stone-200 font-bold text-stone-700 transition-colors cursor-pointer"
                    >
                      📍 {d}
                    </button>
                  ))}
                </div>
              )}

              {/* Businesses Results */}
              {matchedBusinesses.length > 0 ? (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-stone-400 px-1">
                    المحلات والأماكن المطابقة ({matchedBusinesses.length})
                  </div>
                  {matchedBusinesses.map((b, idx) => {
                    const vipInfo = getBusinessVipStatus(b);
                    const liveStatus = getLiveWorkingStatus(b.workingHours);
                    const isSelected = idx === selectedIndex;

                    return (
                      <div
                        key={b.id}
                        onClick={() => handleSelectBusiness(b.id)}
                        className={`p-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/70 border-[#1a4d2e] shadow-xs'
                            : 'bg-white hover:bg-stone-50 border-stone-100 hover:border-stone-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {b.imageUrl ? (
                            <img
                              src={b.imageUrl}
                              alt={b.name}
                              className="w-11 h-11 rounded-xl object-cover border border-stone-200 shrink-0"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-500 shrink-0 font-bold">
                              <Store className="h-5 w-5 text-[#1a4d2e]" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-black text-sm text-stone-800 truncate">
                                {b.name}
                              </span>
                              {vipInfo.isVip && (
                                <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 font-black px-1.5 py-0.2 rounded-full shrink-0">
                                  👑 VIP
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 text-[11px] text-stone-500 mt-0.5 flex-wrap">
                              {b.category && (
                                <span className="font-bold text-[#1a4d2e]">
                                  {b.category}
                                </span>
                              )}
                              {b.district && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="h-3 w-3 text-stone-400" />
                                  <span>{b.district}</span>
                                </span>
                              )}
                              {liveStatus.isOpen ? (
                                <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 rounded">مفتوح الآن</span>
                              ) : (
                                <span className="text-stone-400 font-medium">مغلق</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 pr-2">
                          {b.rating && b.rating > 0 ? (
                            <div className="flex items-center gap-1 text-xs font-black bg-amber-50 text-amber-800 border border-amber-200 px-2 py-1 rounded-xl">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                              <span>{b.rating.toFixed(1)}</span>
                            </div>
                          ) : null}
                          <ChevronRight className="h-4 w-4 text-stone-300 rotate-180" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                    <Search className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-stone-700">لم نجد محلات مطابقة تماماً للاسم</p>
                  <p className="text-xs text-stone-500">
                    يمكنك الضغط على زر &quot;عرض جميع نتائج البحث&quot; بالأعلى للبحث في كافة الأوصاف والعروض والوظائف
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Hint */}
        <div className="p-3 bg-stone-50 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-medium px-4">
          <div className="flex items-center gap-2">
            <span>💡 نصيحة: اكتب اسم المحل أو نوع الخدمة (مثل: &quot;قهوة&quot;، &quot;دكتور&quot;، &quot;سكن&quot;)</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span>استخدم الأسهم ⬆️⬇️ للتنقل و Enter للاختيار</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
