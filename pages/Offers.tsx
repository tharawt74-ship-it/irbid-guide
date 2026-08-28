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
  MessageSquare
} from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router';
import { collection, getDocs, query, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getAppConfig } from '../lib/demoDataHelper';
import { ShareButton } from '../components/ShareButton';
import { getWhatsAppUrl, formatOfferWhatsAppMessage } from '../lib/contactHelper';
import { SEO } from '../components/common/SEO';

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

const CATEGORIES = ['الكل', 'مطاعم ومقاهي', 'أزياء وتسوق', 'صحة ورياضة', 'خدمات وصيانة', 'صناعة وحرف', 'زراعة ومستلزمات'];

export function Offers() {
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    async function loadOffers() {
      setLoading(true);
      try {
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

    loadOffers();
  }, []);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
    }, 2500);
  };

  const filteredOffers = offers.filter(offer => {
    const matchesCategory = selectedCategory === 'الكل' || offer.category === selectedCategory;
    const matchesSearch = 
      (offer.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (offer.businessName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (offer.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (offer.location || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full space-y-8 sm:space-y-10 pb-16 relative" dir="rtl">
      <SEO 
        title="عروض وخصومات إربد | أحدث تخفيضات وكوبونات المطاعم والمحلات"
        description="استكشف أقوى العروض والخصومات والتخفيضات اليومية في مدينة إربد: خصومات مطاعم وكافيهات، عروض الملابس، إلكترونيات، صالونات ومراكز التجميل."
        keywords={['عروض إربد', 'خصومات إربد', 'تخفيضات إربد', 'كوبونات إربد', 'مطاعم إربد عروض']}
        canonicalUrl="https://shofierbid.com/offers"
      />
      {/* Dynamic Animated Hero Banner for Offers */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 p-6 sm:p-10 text-white shadow-xl">
        {/* Ambient Glows */}
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-yellow-400/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-80 h-80 rounded-full bg-red-800/40 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-black tracking-wide border border-white/30 shadow-xs">
                <Flame className="h-4 w-4 text-yellow-300 animate-bounce" />
                <span>عروض وتخفيضات إربد الحصرية</span>
              </span>
              <span className="inline-flex items-center gap-1 bg-yellow-400 text-stone-900 px-3 py-1 rounded-full text-xs font-black shadow-xs">
                <Percent className="h-3.5 w-3.5" />
                <span>خصومات تصل حتى 50%</span>
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              أقوى العروض والخصومات في إربد
            </h1>
            
            <p className="text-orange-50 text-sm sm:text-base leading-relaxed max-w-xl font-medium">
              وفر دراهمك واستمتع بأفضل وجبات المطاعم، القهوة المختصة، اشتراكات النوادي، والملابس بأسعار مخفضة وكوبونات فورية لأهالي وطلبة إربد.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-yellow-50 text-red-600 px-6 py-3.5 rounded-2xl font-black text-sm sm:text-base transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus className="h-5 w-5" />
              <span>أعلن عن خصم لمشروعك</span>
            </button>
            <Link
              to="/contact"
              className="inline-flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-colors border border-white/20"
            >
              <Sparkles className="h-4 w-4 text-yellow-300" />
              <span>باقات الترويج والإعلانات المميزة</span>
            </Link>
          </div>
        </div>

        {/* Search Input in Banner */}
        <div className="pt-6 relative z-10 max-w-2xl">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن عرض، اسم مطعم، محل ملابس، أو منطقة..."
              className="w-full bg-white/15 backdrop-blur-md text-white placeholder:text-orange-100 border border-white/30 rounded-2xl px-5 py-3.5 pr-11 text-sm focus:outline-none focus:bg-white/25 focus:border-white transition-colors"
            />
            <Search className="h-5 w-5 text-orange-200 absolute right-3.5 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-200 hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="relative">
        <div className="pointer-events-none absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-[#fdfcfb] to-transparent z-10 sm:hidden" />
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-[#e5e1da]" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <span className="text-xs font-black text-stone-400 shrink-0 ml-1">التصنيف:</span>
          {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "whitespace-nowrap px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer shrink-0",
                  isSelected
                    ? "bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-xs font-black scale-102"
                    : "bg-white border border-[#e5e1da] text-stone-600 hover:border-orange-300 hover:bg-orange-50/50"
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

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
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-orange-500 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>أعلن عن عرض محلك الآن</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredOffers.map((offer) => (
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
              <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-stone-100">
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
              </div>

              {/* Content */}
              <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <h3 className="text-base sm:text-lg font-black text-stone-900 group-hover:text-red-600 transition-colors leading-snug">
                    {offer.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 line-clamp-2 leading-relaxed">
                    {offer.description}
                  </p>
                </div>

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
                    {offer.expiresIn && (
                      <span className="text-[11px] font-bold text-orange-600 bg-orange-50 border border-orange-200/60 px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{offer.expiresIn}</span>
                      </span>
                    )}
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
              <div className="p-5 sm:p-6 pt-0 border-t border-stone-100 flex items-center gap-2">
                <a
                  href={getWhatsAppUrl(offer.whatsapp || offer.phone, formatOfferWhatsAppMessage(offer.title, offer.businessName))}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-3 rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>استفسار واتساب</span>
                </a>

                <a
                  href={`tel:${offer.phone}`}
                  className="inline-flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 py-2.5 px-3 rounded-xl text-xs font-bold transition-colors"
                  title="اتصال بالمنشأة"
                >
                  <Phone className="h-3.5 w-3.5" />
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

    </div>
  );
}
