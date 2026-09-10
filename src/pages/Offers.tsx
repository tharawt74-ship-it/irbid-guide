import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Tag, 
  Flame, 
  Percent, 
  Clock, 
  MapPin, 
  Copy, 
  Check, 
  ExternalLink, 
  Share2, 
  Search, 
  Store, 
  Phone, 
  Sparkles, 
  Gift, 
  Plus, 
  X,
  MessageSquare,
  SlidersHorizontal
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router';
import { CategoryButtonLabel } from '../components/CategoryButtonLabel';
import { collection, getDocs, query, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getAppConfig } from '../lib/demoDataHelper';
import { ShareButton } from '../components/ShareButton';
import { getWhatsAppUrl, formatOfferWhatsAppMessage } from '../lib/contactHelper';
import { WhatsApp3DIcon, Phone3DIcon } from '../components/common/PremiumContactButtons';
import { SEO } from '../components/common/SEO';
import { useAuth } from '../contexts/AuthContext';
import { BannerSlideshow } from '../components/BannerSlideshow';
import { HomepageBanner } from '../types';
import { fetchPageBanners, DEFAULT_OFFERS_BANNERS } from '../lib/pageBanners';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { getCategoryMeta } from '../lib/categoryMeta';
import { CategoriesModal } from '../components/CategoriesModal';
import { Pagination } from '../components/common/Pagination';

interface OfferItem {
  id: string;
  title: string;
  businessName: string;
  category: string;
  discountPercentage: number | string;
  oldPrice?: string;
  newPrice?: string;
  code?: string;
  expiresIn: string;
  durationMode?: string;
  durationHours?: string;
  durationDays?: string;
  startDate?: string;
  endDate?: string;
  recurringDays?: string[];
  expiresAt?: number | null;
  description: string;
  location: string;
  phone: string;
  whatsapp?: string;
  image: string;
  isHot?: boolean;
  isStudent?: boolean;
  isDemo?: boolean;
  createdAt?: number;
}

export function Offers() {
  const { currentUser, isAdmin, isStaff, isMerchant, ownedBusinesses } = useAuth();
  const { categories } = useSystemSettings();
  const mainCategories = categories.map(c => c.name);
  const getSubCats = (catName: string) => categories.find(c => c.name === catName)?.subcategories || [];

  const renderOfferDurationText = (offer: any) => {
    if (!offer.durationMode) {
      return offer.expiresIn || 'لفترة محدودة';
    }

    if (offer.durationMode === 'recurring_weekly') {
      const days = offer.recurringDays || [];
      if (days.length === 0) return 'متكرر أسبوعياً';
      
      const daysOfWeekArabic = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const todayArabic = daysOfWeekArabic[new Date().getDay()];
      const isTodayActive = days.includes(todayArabic);

      if (isTodayActive) {
        return `فعال اليوم 🟢 (كل ${days.join('، ')})`;
      }
      return `نشط أيام: ${days.join('، ')}`;
    }

    if (offer.expiresAt) {
      const timeLeftMs = offer.expiresAt - Date.now();
      if (timeLeftMs <= 0) {
        return 'منتهي الصلاحية 🔴';
      }

      const totalHoursLeft = timeLeftMs / (3600 * 1000);
      if (totalHoursLeft < 1) {
        return 'ينتهي خلال أقل من ساعة ⚡';
      }
      if (totalHoursLeft <= 24) {
        return `متبقي ${Math.ceil(totalHoursLeft)} ساعة/ساعات ⏳`;
      }
      const daysLeft = Math.ceil(totalHoursLeft / 24);
      return `متبقي ${daysLeft} يوم/أيام 📅`;
    }

    return offer.expiresIn || 'لفترة محدودة';
  };

  const hasBusiness = Boolean(currentUser && (isAdmin || isStaff || isMerchant || (ownedBusinesses && ownedBusinesses.length > 0)));

  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [banners, setBanners] = useState<HomepageBanner[]>(DEFAULT_OFFERS_BANNERS);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedSubCategory, searchQuery]);

  useEffect(() => {
    async function loadOffersAndBanners() {
      setLoading(true);
      try {
        // Load page banners
        fetchPageBanners(['عروض', 'خصومات', 'تخفيضات', 'تسوق', 'مطاعم'], DEFAULT_OFFERS_BANNERS, 'offers')
          .then(res => setBanners(res))
          .catch(() => setBanners(DEFAULT_OFFERS_BANNERS));

        if (!db) {
          setOffers([]);
          setLoading(false);
          return;
        }

        const appConfig = await getAppConfig();
        const q = query(collection(db, 'offers'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);

        const loaded: OfferItem[] = [];
        snap.forEach(d => {
          const data = d.data();
          if (!appConfig.showDemoData && data.isDemo) {
            return;
          }
          loaded.push({ id: d.id, ...data } as OfferItem);
        });

        setOffers(loaded);
      } catch (err) {
        console.warn('Error loading offers from Firestore:', err);
        setOffers([]);
      } finally {
        setLoading(false);
      }
    }

    loadOffersAndBanners();
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2500);
  };

  const filteredOffers = offers.filter(offer => {
    let matchesCategory = true;
    if (selectedCategory && selectedCategory !== 'الكل') {
      const validSubCats = getSubCats(selectedCategory);
      if (selectedSubCategory) {
        matchesCategory = offer.category === selectedSubCategory;
      } else {
        matchesCategory = offer.category === selectedCategory || validSubCats.includes(offer.category);
      }
    }

    const matchesSearch = 
      (offer.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (offer.businessName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (offer.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (offer.location || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full space-y-6 sm:space-y-8 pb-16 relative" dir="rtl">
      <SEO 
        title="عروض وخصومات إربد | أحدث تخفيضات وكوبونات المطاعم والمحلات"
        description="استكشف أقوى العروض والخصومات والتخفيضات اليومية في مدينة إربد: خصومات مطاعم وكافيهات، عروض الملابس، إلكترونيات، صالونات ومراكز التجميل."
        keywords={['عروض إربد', 'خصومات إربد', 'تخفيضات إربد', 'كوبونات إربد', 'مطاعم إربد عروض']}
        canonicalUrl="https://shofierbid.com/offers"
      />

      {/* Banner Slideshow */}
      <BannerSlideshow banners={banners} />

      {/* Page Header & Search Bar (Compact & Sleek) */}
      <div className="bg-white rounded-2xl md:rounded-3xl p-3.5 sm:p-5 border border-[#e5e1da] shadow-xs space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full text-[11px] font-black">
                <Flame className="h-3 w-3 text-red-600" />
                <span>عروض إربد</span>
              </span>
              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                <Percent className="h-3 w-3 text-amber-700" />
                <span>خصومات حتى 50%</span>
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              أقوى العروض والخصومات في إربد
            </h1>
            <p className="hidden sm:block text-stone-500 text-xs font-medium leading-relaxed">
              وفر دراهمك واستمتع بأفضل وجبات المطاعم، القهوة المختصة، اشتراكات النوادي والملابس.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {hasBusiness && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 bg-[#1a4d2e] hover:bg-[#143e25] text-white px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>أعلن عن خصمك</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن عرض، اسم مطعم، كافيه، محل أزياء، أو منطقة..."
            className="w-full bg-[#fdfcfb] text-stone-900 placeholder:text-stone-400 border border-[#e5e1da] rounded-xl px-3.5 py-2.5 pr-10 text-xs sm:text-sm focus:outline-none focus:border-[#1a4d2e] focus:bg-white transition-all shadow-inner"
          />
          <Search className="h-4 w-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Main and Sub Categories Section */}
      {mainCategories.length > 0 && (
        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-[#2d2a26]">تصفح أقسام العروض الرئيسية</h2>
            </div>
            <div className="flex items-center gap-2">
              {selectedCategory && selectedCategory !== 'الكل' && (
                <button 
                  onClick={() => {
                    setSelectedCategory('الكل');
                    setSelectedSubCategory('');
                  }}
                  className="text-xs font-bold text-stone-500 hover:text-red-600 hover:underline cursor-pointer"
                >
                  إعادة تعيين
                </button>
              )}
              <button
                onClick={() => setIsCategoriesModalOpen(true)}
                className="text-xs sm:text-sm font-black text-[#1a4d2e] hover:text-[#133b22] flex items-center gap-1 bg-[#1a4d2e]/5 hover:bg-[#1a4d2e]/10 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
              >
                <span>عرض الكل</span>
                <span className="text-[10px] sm:text-xs">←</span>
              </button>
            </div>
          </div>

          <div className="relative">
            {/* Left Edge Gradient Affordance for Mobile Scroll */}
            <div className="pointer-events-none absolute left-0 top-0 bottom-4 w-8 bg-gradient-to-r from-[#fdfcfb] to-transparent z-10 sm:hidden" />

            <div className="flex overflow-x-auto pb-4 pt-1 gap-3.5 sm:gap-4 snap-x scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {/* All Button */}
              {(() => {
                const isSelected = selectedCategory === 'الكل';
                const { icon: Icon } = getCategoryMeta('الكل');
                return (
                  <button
                    onClick={() => {
                      setSelectedCategory('الكل');
                      setSelectedSubCategory('');
                    }}
                    className={`snap-start shrink-0 aspect-square w-[88px] sm:w-28 md:w-32 flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl md:rounded-[24px] transition-all duration-200 border text-center group cursor-pointer ${
                      isSelected 
                        ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white border-transparent shadow-lg shadow-red-500/25 -translate-y-1' 
                        : 'bg-white text-[#2d2a26] border-[#e5e1da] hover:border-red-500/40 hover:bg-[#fcfbfa] hover:-translate-y-0.5 hover:shadow-md'
                    }`}
                  >
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-2.5 transition-transform group-hover:scale-110 ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-red-50 text-red-600'
                    }`}>
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <CategoryButtonLabel name="الكل" isSelected={isSelected} />
                  </button>
                );
              })()}

              {/* Main Category buttons */}
              {mainCategories.map((cat) => {
                const isSelected = selectedCategory === cat;
                const { icon: Icon, bg } = getCategoryMeta(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => {
                      setSelectedCategory(isSelected ? 'الكل' : cat);
                      setSelectedSubCategory('');
                    }}
                    className={`snap-start shrink-0 aspect-square w-[88px] sm:w-28 md:w-32 flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl md:rounded-[24px] transition-all duration-200 border text-center group cursor-pointer ${
                      isSelected 
                        ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white border-transparent shadow-lg shadow-red-500/25 -translate-y-1' 
                        : 'bg-white text-[#2d2a26] border-[#e5e1da] hover:border-red-500/40 hover:bg-[#fcfbfa] hover:-translate-y-0.5 hover:shadow-md'
                    }`}
                  >
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-2.5 transition-transform group-hover:scale-110 ${
                      isSelected ? 'bg-white/20 text-white' : bg
                    }`}>
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <CategoryButtonLabel name={cat} isSelected={isSelected} />
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Sub Categories (Shows only when a main category is selected) */}
          {selectedCategory && selectedCategory !== 'الكل' && getSubCats(selectedCategory).length > 0 && (
            <div className="relative">
              <div className="pointer-events-none absolute left-0 top-0 bottom-3 w-8 bg-gradient-to-r from-[#fdfcfb] to-transparent z-10 sm:hidden" />
              <div className="flex overflow-x-auto gap-2.5 pb-3 mt-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <button
                  onClick={() => setSelectedSubCategory('')}
                  className={`snap-start shrink-0 whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 border ${
                    selectedSubCategory === ''
                      ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white border-transparent shadow-md shadow-red-500/10'
                      : 'bg-white text-stone-600 border-[#e5e1da] hover:border-red-300 hover:bg-stone-50'
                  }`}
                >
                  عرض الكل الفرعي
                </button>
                {getSubCats(selectedCategory).map((subCat) => (
                  <button
                    key={subCat}
                    onClick={() => setSelectedSubCategory(subCat)}
                    className={`snap-start shrink-0 whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-200 border ${
                      selectedSubCategory === subCat
                        ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white border-transparent shadow-md shadow-red-500/10'
                        : 'bg-white text-stone-600 border-[#e5e1da] hover:border-red-300 hover:bg-stone-50'
                    }`}
                  >
                    {subCat}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-stone-200 p-8 shadow-xs max-w-2xl mx-auto space-y-4">
          <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto">
            <Gift className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-black text-stone-800">لا توجد عروض متاحة حالياً</h3>
          <p className="text-stone-500 text-sm max-w-md mx-auto">
            لم يتم إدراج عروض أو خصومات نشطة في الوقت الحالي. إذا كنت تملك محلاً تجارياً، يمكنك أن تكون أول من يضيف عرضاً لزبائنك!
          </p>
          {hasBusiness && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-orange-500 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>أعلن عن عرض محلك الآن</span>
            </button>
          )}
        </div>
      ) : (
        <div>
          <div id="offers-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredOffers
              .slice((currentPage - 1) * 15, currentPage * 15)
              .map((offer) => (
              <div 
                key={offer.id}
                className="bg-white rounded-3xl border border-stone-200/80 overflow-hidden shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col group relative"
              >
              {/* Badges */}
              <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 items-start">
                {offer.isHot && (
                  <span className="bg-red-600 text-white font-black text-[11px] px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                    <Flame className="h-3 w-3 fill-white" />
                    <span>سوبر هُوت 🔥</span>
                  </span>
                )}
                {offer.isStudent && (
                  <span className="bg-blue-600 text-white font-black text-[11px] px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                    <Gift className="h-3 w-3" />
                    <span>خصم طلابي 🎓</span>
                  </span>
                )}
              </div>

              {/* Discount Badge Left */}
              <div className="absolute top-3 left-3 z-10">
                <div className="bg-amber-400 text-stone-900 font-black text-sm px-3.5 py-1.5 rounded-2xl shadow-lg border border-amber-300 flex items-center gap-1">
                  <span>خصم {offer.discountPercentage}</span>
                </div>
              </div>

              {/* Offer Image */}
              <Link to={`/offers/${offer.id}`} className="relative h-48 sm:h-52 w-full overflow-hidden bg-stone-100 block cursor-pointer">
                <img 
                  src={offer.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800'} 
                  alt={offer.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-3 right-3 left-3 text-white">
                  <span className="text-xs font-bold text-orange-300 block mb-0.5">{offer.businessName}</span>
                  <p className="text-xs text-white/80 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-orange-400" />
                    <span>{offer.location}</span>
                  </p>
                </div>
              </Link>

              {/* Content */}
              <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                <Link to={`/offers/${offer.id}`} className="space-y-2 block cursor-pointer">
                  <h3 className="text-base sm:text-lg font-black text-stone-900 group-hover:text-red-600 transition-colors leading-snug">
                    {offer.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 line-clamp-2 leading-relaxed">
                    {offer.description}
                  </p>
                </Link>

                {/* Price and Coupon Code Box */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between bg-stone-50 p-3 rounded-2xl border border-stone-100">
                    <div className="flex items-baseline gap-2">
                      {offer.newPrice && (
                        <span className="text-lg font-black text-emerald-700">{offer.newPrice}</span>
                      )}
                      {offer.oldPrice && (
                        <span className="text-xs text-stone-400 line-through">{offer.oldPrice}</span>
                      )}
                    </div>
                    {(() => {
                      const durationText = renderOfferDurationText(offer);
                      const isExpired = offer.expiresAt && offer.expiresAt <= Date.now() && offer.durationMode !== 'recurring_weekly';
                      const isUrgent = offer.expiresAt && (offer.expiresAt - Date.now() < 24 * 3600 * 1000) && offer.durationMode !== 'recurring_weekly';
                      
                      return (
                        <span className={cn(
                          "text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 border",
                          isExpired 
                            ? "text-stone-400 bg-stone-50 border-stone-200"
                            : isUrgent
                              ? "text-red-600 bg-red-50 border-red-200 animate-pulse"
                              : "text-orange-600 bg-orange-50 border-orange-200/60"
                        )}>
                          <Clock className="h-3 w-3" />
                          <span>{durationText}</span>
                        </span>
                      );
                    })()}
                  </div>

                  {/* Code box */}
                  {offer.code && (
                    <div className="flex items-center justify-between bg-red-50/80 border border-red-200/70 p-2.5 rounded-2xl">
                      <div className="flex items-center gap-2 pr-1">
                        <Tag className="h-4 w-4 text-red-600" />
                        <span className="text-xs font-bold text-stone-700">كود الخصم:</span>
                        <code className="bg-white px-2 py-0.5 rounded-md text-red-600 font-mono font-black text-xs border border-red-200">
                          {offer.code}
                        </code>
                      </div>
                      <button
                        onClick={() => handleCopyCode(offer.code!)}
                        className="bg-white hover:bg-red-600 hover:text-white text-red-600 border border-red-200 px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        {copiedCode === offer.code ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-emerald-600">تم النسخ</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            <span>نسخ</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="p-4 sm:p-5 pt-0 border-t border-stone-100 flex items-center gap-2 mt-auto">
                <a
                  href={getWhatsAppUrl(offer.whatsapp || offer.phone, formatOfferWhatsAppMessage(offer.title, offer.businessName))}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-3 rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
                >
                  <WhatsApp3DIcon className="h-4 w-4 text-white" />
                  <span>استفسار واتساب</span>
                </a>

                <a
                  href={`tel:${offer.phone}`}
                  className="inline-flex items-center justify-center gap-1.5 bg-[#1a4d2e] hover:bg-[#133c23] text-white py-2.5 px-3 rounded-xl text-xs font-bold transition-colors shadow-xs"
                  title="اتصال بالمنشأة"
                >
                  <Phone3DIcon className="h-4 w-4 text-white" />
                  <span>اتصال</span>
                </a>

                <ShareButton
                  title={`عرض خاص: ${offer.title}`}
                  text={`شاهد عرض (${offer.title}) لدى ${offer.businessName} بخصم ${offer.discountPercentage}!`}
                  url={`/offers`}
                  size="sm"
                  variant="outline"
                />
              </div>

            </div>
          ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={Math.ceil(filteredOffers.length / 15)}
            onPageChange={(p) => {
              setCurrentPage(p);
              window.scrollTo({ top: 300, behavior: 'smooth' });
            }}
            totalItems={filteredOffers.length}
            itemsPerPage={15}
          />
        </div>
      )}

      {/* Add Offer Modal */}
      {isAddModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-t-[32px] sm:rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-5 animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200">
            {/* Mobile Drag Handle */}
            <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto -mt-2 mb-3 sm:hidden" />

            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-orange-100 text-orange-600 rounded-xl">
                  <Gift className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-stone-900">نشر عرض أو خصم خاص بمحلك</h3>
                  <p className="text-xs text-stone-500">ليصل عرضك إلى آلاف الزوار والطلبة في إربد</p>
                </div>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 text-stone-400 hover:text-stone-600 rounded-xl">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed bg-amber-50 p-3 rounded-xl border border-amber-200">
              يمكنك نشر عروضك وتخفيضاتك الترويجية مباشرة عبر باقات الاشتراك أو بالتواصل المباشر مع فريق إدارة شو في بإربد لتثبيت عرضك في الصفحة الرئيسية وقسم العروض.
            </p>

            <div className="space-y-3 pt-2">
              <Link
                to="/packages"
                onClick={() => setIsAddModalOpen(false)}
                className="w-full flex items-center justify-center gap-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white py-3 px-4 rounded-xl font-bold text-sm shadow-xs transition-colors"
              >
                <Sparkles className="h-4 w-4 text-yellow-300" />
                <span>تصفح باقات العروض والترويج</span>
              </Link>
              
              <Link
                to="/contact"
                onClick={() => setIsAddModalOpen(false)}
                className="w-full flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-800 py-3 px-4 rounded-xl font-bold text-sm transition-colors"
              >
                <Store className="h-4 w-4 text-stone-500" />
                <span>تواصل مع الإدارة لإضافة عرضك</span>
              </Link>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Categories Modal */}
      <CategoriesModal
        isOpen={isCategoriesModalOpen}
        onClose={() => setIsCategoriesModalOpen(false)}
        categories={categories}
        selectedCategory={selectedCategory === 'الكل' ? '' : selectedCategory}
        onSelectCategory={(catName) => {
          setSelectedCategory(catName || 'الكل');
          setSelectedSubCategory('');
        }}
      />

    </div>
  );
}

export default Offers;
