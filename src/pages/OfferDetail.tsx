import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  ArrowLeft, Tag, Flame, Clock, MapPin, Copy, Check, 
  Store, Sparkles, Gift, ShieldCheck, ExternalLink,
  UtensilsCrossed, ShoppingBag, Bike, Truck, PackageCheck, Zap,
  AlertCircle, RotateCcw, TrendingDown, Layers, GraduationCap,
  Info, FileText, CheckCircle2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { WhatsApp3DIcon, Phone3DIcon } from '../components/common/PremiumContactButtons';
import { getWhatsAppUrl, formatOfferWhatsAppMessage } from '../lib/contactHelper';
import { ShareButton } from '../components/ShareButton';
import { SEO } from '../components/common/SEO';
import { getBusinessLink } from '../lib/utils';
import { getBusinessVipStatus } from '../lib/vipHelper';
import { getCategoryFallbackImage, getOfferValidServiceChannels, ServiceChannelOption } from '../lib/categoryOfferConfig';
import { Business, MenuItem } from '../types';
import { isMedicalBusiness } from '../lib/medicalHelper';

const APP_LOGOS: Record<string, string> = {
  talabat: '/assets/apps/talabat.png',
  ashyaee: '/assets/apps/ashyaee.png',
  maestro: '/assets/apps/maestro.png'
};

export const OFFER_SERVICE_CHANNELS_META = [
  { id: 'dine_in', label: 'داخل الصالة', icon: UtensilsCrossed, color: 'text-blue-700 bg-blue-50 border-blue-200/70' },
  { id: 'takeaway', label: 'استلام سفري', icon: ShoppingBag, color: 'text-amber-700 bg-amber-50 border-amber-200/70' },
  { id: 'direct_delivery', label: 'توصيل مباشر', icon: Bike, color: 'text-emerald-700 bg-emerald-50 border-emerald-200/70' },
  { id: 'talabat', label: 'طلبات', icon: Truck, color: 'text-orange-700 bg-orange-50 border-orange-300' },
  { id: 'ashyaee', label: 'أشيائي', icon: PackageCheck, color: 'text-amber-800 bg-yellow-50 border-yellow-300' },
  { id: 'maestro', label: 'مايسترو', icon: Zap, color: 'text-[#ca1b66] bg-[#ca1b66]/10 border-[#ca1b66]/30' }
];

function ChannelBadge({ channel }: { channel: ServiceChannelOption }) {
  const [imgError, setImgError] = useState(false);
  const imgSrc = channel.imageSrc || (channel.id in APP_LOGOS ? APP_LOGOS[channel.id] : null);
  const ChannelIcon = Layers;

  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-3 sm:p-3.5 rounded-2xl border font-black transition-all shadow-2xs",
        channel.color
      )}
    >
      {imgSrc && !imgError ? (
        <img 
          src={imgSrc} 
          alt={channel.label} 
          onError={() => setImgError(true)}
          className="w-8 h-8 sm:w-10 sm:h-10 object-contain shrink-0" 
        />
      ) : (
        <ChannelIcon className="h-5 w-5 sm:h-6 sm:w-6 shrink-0" />
      )}
      <span className="text-xs sm:text-sm truncate">{channel.label}</span>
      <Check className="h-4 w-4 mr-auto shrink-0 opacity-80" />
    </div>
  );
}

export function OfferDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<any | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    async function fetchOfferAndBusiness() {
      if (!id) return;
      try {
        setLoading(true);
        const offerRef = doc(db, 'offers', id);
        const offerSnap = await getDoc(offerRef);
        
        if (offerSnap.exists()) {
          const offerData = { id: offerSnap.id, ...offerSnap.data() } as any;

          // Fetch business details
          let bizData: Business | null = null;
          if (offerData.businessId) {
            const bizRef = doc(db, 'businesses', offerData.businessId);
            const bizSnap = await getDoc(bizRef);
            if (bizSnap.exists()) {
              bizData = { id: bizSnap.id, ...bizSnap.data() } as Business;
            }
          }

          // Strict security check: if business exists but is not Golden VIP, hide offer
          if (bizData) {
            const vipStatus = getBusinessVipStatus(bizData);
            if (!vipStatus.isVip) {
              setOffer(null);
              setBusiness(null);
              return;
            }
          }

          setOffer(offerData);
          setBusiness(bizData);
        }
      } catch (err) {
        console.error("Error fetching offer details:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchOfferAndBusiness();
  }, [id]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatOfferPrice = (price?: string | number) => {
    if (price === undefined || price === null) return '';
    const str = String(price).trim();
    if (!str) return '';
    if (str.includes('د.أ') || str.includes('دينار')) return str;
    return `${str} د.أ`;
  };

  const parsePriceNumber = (val: string | number | undefined | null): number => {
    if (val === undefined || val === null || val === '') return NaN;
    const str = String(val).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
    const match = str.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : NaN;
  };

  const checkIsOfferExpired = (item: any): boolean => {
    if (!item) return false;
    if (item.status === 'expired' || item.status === 'inactive' || item.isExpired === true) {
      return true;
    }
    if (typeof item.expiresIn === 'string') {
      const text = item.expiresIn.trim();
      if (text.includes('منتهي') || text.includes('منتهية') || text.includes('انتهى') || text.includes('انتهت')) {
        return true;
      }
    }
    if (item.durationMode === 'recurring_weekly') {
      return false;
    }
    const now = Date.now();
    if (item.expiresAt) {
      const expNum = Number(item.expiresAt);
      if (!isNaN(expNum) && expNum > 0 && expNum <= now) {
        return true;
      }
    }
    if (item.endDate) {
      const endParsed = new Date(item.endDate).getTime();
      if (!isNaN(endParsed)) {
        const endTimestamp = String(item.endDate).trim().length <= 10 
          ? endParsed + 24 * 3600 * 1000 - 1 
          : endParsed;
        if (endTimestamp <= now) {
          return true;
        }
      }
    }
    if (item.createdAt && typeof item.createdAt === 'number') {
      if (item.durationMode === 'today' && now > item.createdAt + 24 * 3600 * 1000) return true;
      if (item.durationMode === '3days' && now > item.createdAt + 3 * 24 * 3600 * 1000) return true;
      if (item.durationMode === 'weekend' && now > item.createdAt + 4 * 24 * 3600 * 1000) return true;
      if (item.durationMode === 'week' && now > item.createdAt + 7 * 24 * 3600 * 1000) return true;
      if (item.durationMode === 'hours' && item.durationHours) {
        const hrs = Number(item.durationHours);
        if (hrs > 0 && now > item.createdAt + hrs * 3600 * 1000) return true;
      }
      if (item.durationMode === 'days' && item.durationDays) {
        const dys = Number(item.durationDays);
        if (dys > 0 && now > item.createdAt + dys * 24 * 3600 * 1000) return true;
      }
    }
    return false;
  };

  const renderOfferDurationText = (item: any) => {
    if (checkIsOfferExpired(item)) {
      return 'منتهي الصلاحية';
    }

    if (!item.durationMode) {
      return item.expiresIn || 'لفترة محدودة';
    }

    if (item.durationMode === 'recurring_weekly') {
      const days = item.recurringDays || [];
      if (days.length === 0) return 'متكرر أسبوعياً';
      return `نشط كل يوم: ${days.join('، ')}`;
    }

    if (item.expiresAt) {
      const timeLeftMs = item.expiresAt - Date.now();
      if (timeLeftMs <= 0) {
        return 'منتهي الصلاحية';
      }

      const totalHoursLeft = timeLeftMs / (3600 * 1000);
      if (totalHoursLeft < 1) {
        return 'ينتهي خلال أقل من ساعة';
      }
      if (totalHoursLeft < 24) {
        return `متبقي ${Math.floor(totalHoursLeft)} ساعة`;
      }
      const daysLeft = Math.floor(totalHoursLeft / 24);
      return `ينتهي خلال ${daysLeft} يوم`;
    }

    return item.expiresIn || 'لفترة محدودة';
  };

  // Linked Menu Items Detection
  const linkedMenuItems = useMemo<MenuItem[]>(() => {
    if (!offer || !business?.menuItems || !Array.isArray(business.menuItems)) return [];
    
    const targetIds = new Set<string>();
    if (Array.isArray(offer.targetMenuItems)) {
      offer.targetMenuItems.forEach((tid: any) => targetIds.add(String(tid)));
    }
    if (offer.menuItemId) targetIds.add(String(offer.menuItemId));
    if (offer.linkedMenuItemId) targetIds.add(String(offer.linkedMenuItemId));

    return business.menuItems.filter((item: any) => 
      targetIds.has(String(item.id)) || 
      item.activeOfferId === offer.id
    );
  }, [offer, business]);

  // Extract Terms & Conditions presets or bullet points cleanly
  const termsList = useMemo<string[]>(() => {
    if (!offer) return [];
    
    const explicitTerms: string[] = [];
    if (Array.isArray(offer.terms) && offer.terms.length > 0) {
      offer.terms.forEach((t: string) => {
        if (typeof t === 'string' && t.trim()) explicitTerms.push(t.trim());
      });
    }

    // Check if description has bullet points
    if (offer.description && typeof offer.description === 'string') {
      const lines = offer.description.split(/\n+/);
      lines.forEach((line: string) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
          const cleaned = trimmed.replace(/^[•\-*]\s*/, '').trim();
          if (cleaned && !explicitTerms.includes(cleaned)) {
            explicitTerms.push(cleaned);
          }
        }
      });
    }

    // Default smart terms if none are found
    if (explicitTerms.length === 0) {
      return [
        'العرض ساري حتى نفاد الكمية',
        'يسري العرض خلال أوقات العمل الرسمية للمنشأة',
        'يرجى إبراز كود الخصم أو تفاصيل العرض عند الطلب للاستفادة من الخصم',
        'لا يدمج هذا العرض تلقائياً مع عروض ترويجية أو خصومات أخرى'
      ];
    }

    return explicitTerms;
  }, [offer]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fcfbfa] flex items-center justify-center py-20" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
          <p className="text-stone-500 font-bold text-sm">جاري تحميل تفاصيل العرض...</p>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-[#fcfbfa] py-12 px-4" dir="rtl">
        <div className="max-w-md mx-auto bg-white rounded-3xl border border-stone-200 p-8 text-center space-y-4">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <Gift className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-black text-stone-800">العرض غير موجود</h3>
          <p className="text-stone-500 text-sm">
            ربما تم حذف هذا العرض الترويجي أو أن الرابط غير صحيح.
          </p>
          <Link
            to="/offers"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-orange-500 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-md"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>العودة لصفحة العروض</span>
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = checkIsOfferExpired(offer);
  const oldPriceNum = parsePriceNumber(offer.oldPrice);
  const newPriceNum = parsePriceNumber(offer.newPrice);
  const hasNumericSavings = !isNaN(oldPriceNum) && !isNaN(newPriceNum) && oldPriceNum > newPriceNum;
  const savingsAmount = hasNumericSavings ? (oldPriceNum - newPriceNum).toFixed(2).replace(/\.00$/, '') : null;
  const savingsPercent = hasNumericSavings 
    ? Math.round(((oldPriceNum - newPriceNum) / oldPriceNum) * 100)
    : (offer.discountPercentage ? String(offer.discountPercentage).replace(/[^0-9]/g, '') : null);

  const businessLink = business ? getBusinessLink(business) : `/business/${offer.businessId}`;
  const whatsappTargetPhone = offer.whatsapp || offer.phone || business?.whatsapp || business?.phone;
  const prefilledWhatsAppMsg = formatOfferWhatsAppMessage(offer.title, offer.businessName, offer.code);
  const whatsappUrl = getWhatsAppUrl(whatsappTargetPhone, prefilledWhatsAppMsg);

  // Active service channels list - only show included channels that match the business category
  const displayedChannels = getOfferValidServiceChannels(
    offer.serviceChannels,
    business?.category || offer.category,
    business?.subCategory || (offer as any).subCategory,
    isMedicalBusiness(business),
    business?.name || offer.businessName
  );

  return (
    <div className="w-full min-h-screen bg-stone-50/50 pb-24 lg:pb-16" dir="rtl">
      <SEO 
        title={`${offer.title} - عروض ${offer.businessName}`}
        description={offer.description}
        ogImage={offer.image}
      />

      {/* Full-Width Top Navigation Bar */}
      <div className="w-full bg-white border-b border-stone-200/80 sticky top-0 z-20 shadow-2xs">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <Link
            to="/offers"
            className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-950 bg-stone-50 hover:bg-stone-100 border border-stone-200/80 px-4 py-2 rounded-xl text-xs font-bold transition-all hover:shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>العودة لعروض إربد</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-stone-400 font-bold hidden sm:inline-block">مشاركة العرض:</span>
            <ShareButton
              title={`عرض خاص: ${offer.title}`}
              text={`شاهد عرض (${offer.title}) لدى ${offer.businessName} بخصم ${offer.discountPercentage}!`}
              url={window.location.href}
              size="md"
              variant="outline"
            />
          </div>
        </div>
      </div>

      {/* Panoramic Edge-to-Edge Full-Width Hero Banner */}
      <div className="relative w-full h-72 sm:h-96 lg:h-[460px] bg-stone-950 overflow-hidden group">
        <img 
          src={offer.image || getCategoryFallbackImage(offer.category, business?.subCategory || business?.category)} 
          alt={offer.title}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-102"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/40 to-transparent" />
        
        {/* Floating Badges */}
        <div className="absolute top-4 right-4 sm:right-6 lg:right-8 z-10 flex flex-wrap gap-2 items-start">
          {offer.isHot && (
            <span className="bg-red-600 text-white font-black text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 border border-red-500/30">
              <Flame className="h-3.5 w-3.5 fill-white text-white" />
              <span>سوبر هوت</span>
            </span>
          )}
          {offer.isStudent && (
            <span className="bg-amber-500 text-stone-950 font-black text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 border border-amber-400/30">
              <GraduationCap className="h-3.5 w-3.5" />
              <span>خصم طلابي حصري</span>
            </span>
          )}
          {isExpired && (
            <span className="bg-stone-800 text-amber-300 font-black text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 border border-amber-400/30">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>عرض منتهي الصلاحية</span>
            </span>
          )}
        </div>

        {/* Discount Tag */}
        <div className="absolute top-4 left-4 sm:left-6 lg:left-8 z-10">
          <span className="bg-[#1a4d2e] text-white font-black text-xs sm:text-sm px-4.5 py-2.5 rounded-2xl shadow-xl border border-emerald-600/30 flex items-center gap-1.5">
            <Tag className="h-4 w-4 text-emerald-400" />
            <span>خصم بقيمة {offer.discountPercentage}</span>
          </span>
        </div>

        {/* Title & Category overlay in wide container */}
        <div className="absolute bottom-6 right-0 left-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white space-y-3">
            <span className="text-[11px] font-black text-amber-400 uppercase tracking-widest bg-stone-900/80 px-4 py-1.5 rounded-full border border-stone-800 backdrop-blur-md inline-block">
              {offer.category || 'العروض والخصومات'}
            </span>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black leading-tight tracking-tight drop-shadow-md">
              {offer.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Main Content Layout Container */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        
        {/* Main Columns Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Details Area (8 Columns on Desktop) */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-stone-200/80 shadow-xs p-6 sm:p-8 space-y-8 flex flex-col">
              
              {/* Pricing & Expiry Block with Price Reversion Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Visual Pricing Container */}
                <div className={cn(
                  "p-5 rounded-2xl border flex flex-col justify-center relative overflow-hidden transition-all",
                  isExpired 
                    ? "bg-stone-100/80 border-stone-300 text-stone-700" 
                    : "bg-amber-50/50 border-amber-200/70"
                )}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-stone-500 text-[11px] font-bold uppercase tracking-wider">
                      {isExpired ? 'حالة السعر (ارتداد للسعر الأصلي)' : 'تفاصيل التسعير والموفر'}
                    </span>
                    {isExpired && (
                      <span className="text-[10px] font-black bg-stone-200 text-stone-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <RotateCcw className="h-3 w-3" />
                        <span>تم ارتداد السعر</span>
                      </span>
                    )}
                  </div>
                  
                  {isExpired ? (
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-3">
                        <span className="text-2xl sm:text-3xl font-black text-stone-800">
                          {formatOfferPrice(offer.oldPrice || offer.newPrice)}
                        </span>
                        {offer.newPrice && offer.oldPrice && (
                          <span className="text-xs text-stone-400 line-through font-medium">
                            {formatOfferPrice(offer.newPrice)} (السعر المخفض المنتهي)
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-500 font-medium">
                        انتهت فترة سريان هذا العرض، وعاد السعر إلى القيمة الأصلية المعتمدة للمنشأة.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-3 flex-wrap">
                        {offer.newPrice ? (
                          <span className="text-3xl font-black text-[#1a4d2e]">
                            {formatOfferPrice(offer.newPrice)}
                          </span>
                        ) : (
                          <span className="text-2xl font-black text-[#1a4d2e]">خصم خاص</span>
                        )}

                        {offer.oldPrice && (
                          <span className="text-sm text-stone-400 line-through font-medium">
                            {formatOfferPrice(offer.oldPrice)}
                          </span>
                        )}
                      </div>

                      {/* Savings indicator badge */}
                      {savingsAmount ? (
                        <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-black text-xs px-2.5 py-1 rounded-lg border border-emerald-300/60 shadow-2xs">
                            <TrendingDown className="h-3.5 w-3.5 text-emerald-700" />
                            <span>توفير {savingsAmount} د.أ</span>
                            {savingsPercent && <span className="opacity-80">({savingsPercent}%)</span>}
                          </span>
                          <span className="text-[11px] text-emerald-700 font-bold">
                            وفر في فاتورتك الآن
                          </span>
                        </div>
                      ) : offer.discountPercentage ? (
                        <div className="mt-2.5 flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-black text-xs px-2.5 py-1 rounded-lg border border-emerald-300/60">
                            <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                            <span>وفر {offer.discountPercentage} من القيمة</span>
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Duration/Expiry Card */}
                <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200/70 flex flex-col justify-center">
                  <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5">
                    صلاحية وتوفر العرض
                  </span>
                  <div className="flex items-center gap-2.5 text-stone-800">
                    <Clock className={cn("h-5 w-5 shrink-0", isExpired ? "text-red-500" : "text-amber-600")} />
                    <span className={cn("font-black text-sm", isExpired ? "text-red-600" : "text-stone-900")}>
                      {renderOfferDurationText(offer)}
                    </span>
                  </div>
                  <span className="text-[10px] text-stone-400 mt-2 font-medium">
                    {isExpired ? 'العرض غير نشط حالياً' : 'العرض متاح وفقاً لأوقات العمل المحددة'}
                  </span>
                </div>

              </div>

              {/* Service Channels Section - Only included channels are shown */}
              {displayedChannels.length > 0 && (
                <div className="bg-stone-50/70 border border-stone-200/80 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-stone-800 flex items-center gap-2">
                      <Layers className="h-4 w-4 text-[#1a4d2e]" />
                      <span>قنوات ونطاق الاستفادة من العرض</span>
                    </h3>
                    <span className="text-[11px] text-stone-500 font-medium">
                      طرق الطلب والخدمة المشمولة
                    </span>
                  </div>

                  <div className="flex flex-col sm:grid sm:grid-cols-3 gap-2.5 sm:gap-2 pt-1">
                    {displayedChannels.map(channel => (
                      <ChannelBadge key={channel.id} channel={channel} />
                    ))}
                  </div>
                </div>
              )}

              {/* Coupon Code Block */}
              {offer.code && (
                <div className="bg-stone-50 border-2 border-dashed border-red-200 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative">
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#faf9f6] rounded-full border-r border-stone-200 hidden sm:block" />
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#faf9f6] rounded-full border-l border-stone-200 hidden sm:block" />

                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                      <Tag className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-stone-900">كود الخصم الحصري</h4>
                      <p className="text-stone-500 text-[11px] mt-0.5">أبرز هذا الكود للمحاسب أو أرسله عبر واتساب للاستفادة من الخصم</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-stone-200 shadow-2xs self-start sm:self-auto min-w-[200px] justify-between">
                    <code className="text-red-600 font-mono font-black text-base tracking-wider pr-1">
                      {offer.code}
                    </code>
                    <button
                      onClick={() => handleCopyCode(offer.code)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedCode ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>تم النسخ</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>نسخ الكود</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Linked Menu Items Integration */}
              {linkedMenuItems.length > 0 && (
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider flex items-center gap-2">
                      <UtensilsCrossed className="h-4 w-4 text-emerald-700" />
                      <span>الأصناف المشمولة بالعرض من قائمة الطعام</span>
                    </h3>
                    <Link
                      to={businessLink}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                    >
                      <span>عرض كامل القائمة</span>
                      <ArrowLeft className="h-3 w-3" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {linkedMenuItems.map((item) => (
                      <div
                        key={item.id}
                        className="bg-stone-50/80 hover:bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80 flex items-center gap-3.5 transition-all group"
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-stone-200 shrink-0">
                          {item.imageUrl ? (
                            <img 
                              src={item.imageUrl} 
                              alt={item.name} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-stone-100 text-stone-400">
                              <UtensilsCrossed className="h-6 w-6" />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="font-black text-xs sm:text-sm text-stone-900 truncate">
                            {item.name}
                          </h4>
                          {item.category && (
                            <span className="text-[10px] text-stone-400 block font-medium mt-0.5">
                              {item.category}
                            </span>
                          )}
                          <div className="flex items-baseline gap-2 mt-1.5">
                            <span className="text-xs sm:text-sm font-black text-emerald-800">
                              {item.price.includes('د.أ') || item.price.includes('دينار') ? item.price : `${item.price} د.أ`}
                            </span>
                            {item.originalPrice && item.originalPrice !== item.price && (
                              <span className="text-[10px] text-stone-400 line-through">
                                {item.originalPrice.includes('د.أ') || item.originalPrice.includes('دينار') ? item.originalPrice : `${item.originalPrice} د.أ`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {offer.description && (
                <div className="space-y-2.5">
                  <h3 className="text-xs font-black text-stone-800 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="h-4 w-4 text-stone-500" />
                    <span>تفاصيل العرض الترويجي</span>
                  </h3>
                  <div className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line bg-stone-50/50 p-5 rounded-2xl border border-stone-200/60 font-medium">
                    {offer.description}
                  </div>
                </div>
              )}

              {/* Terms and Conditions Card */}
              <div className="bg-stone-50/80 border border-stone-200/80 rounded-2xl p-5 space-y-3">
                <h3 className="text-xs font-black text-stone-800 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-700" />
                  <span>الشروط والأحكام الخاصة بالعرض</span>
                </h3>
                <div className="space-y-2">
                  {termsList.map((term, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-stone-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="font-medium leading-relaxed">{term}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop Contact Actions with Pre-filled WhatsApp */}
              <div className="pt-6 border-t border-stone-200/60 hidden sm:flex items-center gap-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 px-4 rounded-xl text-xs font-black transition-colors shadow-xs hover:shadow-md cursor-pointer"
                >
                  <WhatsApp3DIcon className="h-4 w-4 text-white" />
                  <span>استفسار وحجز عبر واتساب</span>
                </a>

                {(offer.phone || business?.phone) && (
                  <a
                    href={`tel:${offer.phone || business?.phone}`}
                    className="inline-flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-950 text-white py-3.5 px-6 rounded-xl text-xs font-black transition-colors shadow-xs hover:shadow-md min-w-[160px]"
                  >
                    <Phone3DIcon className="h-4 w-4 text-white" />
                    <span>اتصال هاتفي</span>
                  </a>
                )}
              </div>

            </div>

          {/* Business Sidebar Info Card */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-stone-200 shadow-sm p-6 sm:p-7 space-y-6 transition-all hover:shadow-md lg:sticky lg:top-24">
            <h3 className="text-xs font-black text-stone-400 uppercase tracking-wider pb-2 border-b border-stone-100">
              المنشأة المصدرة للعرض
            </h3>

            {/* Business Micro Card */}
            <Link to={businessLink} className="flex items-center gap-4 p-3.5 bg-stone-50 hover:bg-stone-100/80 rounded-2xl border border-stone-200/60 transition-all group cursor-pointer block">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-white border border-stone-200 shrink-0 flex items-center justify-center text-stone-300 shadow-2xs group-hover:border-amber-300">
                {business?.logoUrl ? (
                  <img src={business.logoUrl} alt={offer.businessName} className="w-full h-full object-cover" />
                ) : (
                  <Store className="h-7 w-7 text-stone-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <h4 className="font-black text-sm text-stone-900 group-hover:text-red-600 transition-colors truncate">
                    {offer.businessName}
                  </h4>
                  {business?.isVerified && (
                    <ShieldCheck className="h-4 w-4 text-blue-500 fill-blue-50 shrink-0" />
                  )}
                </div>
                <p className="text-[10px] text-stone-400 flex items-center gap-1 mt-1 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                  <span className="truncate">{offer.location || business?.address || 'إربد، الأردن'}</span>
                </p>
              </div>
            </Link>

            {/* Visit Store CTA button without emoji */}
            <Link
              to={businessLink}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-orange-500 text-white hover:opacity-95 py-3.5 px-4 rounded-xl text-xs font-black shadow-md shadow-red-500/10 transition-all cursor-pointer text-center"
            >
              <Store className="h-4 w-4" />
              <span>عرض صفحة وفروع المنشأة</span>
            </Link>

            {/* Metadata fields */}
            <div className="border-t border-stone-100 pt-4 space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-400 font-bold">رقم تواصل المنشأة:</span>
                <a href={`tel:${offer.phone || business?.phone}`} className="text-stone-800 font-extrabold hover:underline">
                  {offer.phone || business?.phone || 'غير متوفر'}
                </a>
              </div>
              {business?.category && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-400 font-bold">التصنيف والنشاط:</span>
                  <span className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full font-black text-[10px]">
                    {business.category}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-stone-400 font-bold">رابط مشاركة سريع:</span>
                <button
                  onClick={handleCopyLink}
                  className="text-stone-800 hover:text-stone-950 font-bold text-[10px] underline flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="h-3 w-3" />
                  <span>{copiedLink ? 'تم نسخ الرابط' : 'نسخ الرابط'}</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Sticky Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/80 px-4 py-3 sm:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.05)] flex gap-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 active:bg-emerald-700 text-white py-3 px-3 rounded-xl text-xs font-black shadow-xs"
        >
          <WhatsApp3DIcon className="h-4 w-4 text-white" />
          <span>مراسلة واتساب</span>
        </a>

        {(offer.phone || business?.phone) && (
          <a
            href={`tel:${offer.phone || business?.phone}`}
            className="bg-stone-950 active:bg-black text-white px-5 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5"
          >
            <Phone3DIcon className="h-4 w-4 text-white" />
            <span>اتصال هاتفي</span>
          </a>
        )}
      </div>

    </div>
  );
}
