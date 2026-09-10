import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  ArrowLeft, Tag, Flame, Clock, MapPin, Copy, Check, 
  MessageSquare, Store, Phone, Sparkles, Gift, Share2, ShieldCheck, ExternalLink
} from 'lucide-react';
import { cn } from '../lib/utils';
import { WhatsApp3DIcon, Phone3DIcon } from '../components/common/PremiumContactButtons';
import { getWhatsAppUrl, formatOfferWhatsAppMessage } from '../lib/contactHelper';
import { ShareButton } from '../components/ShareButton';
import { SEO } from '../components/common/SEO';
import { getBusinessLink } from '../lib/utils';

export function OfferDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<any | null>(null);
  const [business, setBusiness] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    async function fetchOfferAndBusiness() {
      if (!id) return;
      try {
        setLoading(true);
        const offerRef = doc(db, 'offers', id);
        const offerSnap = await getDoc(offerRef);
        
        if (offerSnap.exists()) {
          const offerData = { id: offerSnap.id, ...offerSnap.data() } as any;
          setOffer(offerData);

          // Now fetch business details
          if (offerData.businessId) {
            const bizRef = doc(db, 'businesses', offerData.businessId);
            const bizSnap = await getDoc(bizRef);
            if (bizSnap.exists()) {
              setBusiness({ id: bizSnap.id, ...bizSnap.data() });
            }
          }
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

  const renderOfferDurationText = (item: any) => {
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
        return 'منتهي الصلاحية 🔴';
      }

      const totalHoursLeft = timeLeftMs / (3600 * 1000);
      if (totalHoursLeft < 1) {
        return 'ينتهي خلال أقل من ساعة ⚡';
      }
      if (totalHoursLeft < 24) {
        return `متبقي ${Math.floor(totalHoursLeft)} ساعة ⏳`;
      }
      const daysLeft = Math.floor(totalHoursLeft / 24);
      return `ينتهي خلال ${daysLeft} يوم 🗓️`;
    }

    return item.expiresIn || 'لفترة محدودة';
  };

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

  const businessLink = business ? getBusinessLink(business) : `/business/${offer.businessId}`;
  const whatsappUrl = getWhatsAppUrl(offer.whatsapp || offer.phone, formatOfferWhatsAppMessage(offer.title, offer.businessName));

  return (
    <div className="min-h-screen bg-[#faf9f6] pb-24 lg:pb-16 pt-6" dir="rtl">
      <SEO 
        title={`${offer.title} - عروض ${offer.businessName}`}
        description={offer.description}
        ogImage={offer.image}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        
        {/* Top bar with back link and premium shared triggers */}
        <div className="flex items-center justify-between border-b border-stone-200/60 pb-4">
          <Link
            to="/offers"
            className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-950 bg-white border border-stone-200/80 px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:shadow-sm cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>العودة لعروض إربد</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-stone-400 font-bold hidden sm:inline-block">هل أعجبك العرض؟ شاركه مع أصدقائك:</span>
            <ShareButton
              title={`عرض خاص: ${offer.title}`}
              text={`شاهد عرض (${offer.title}) لدى ${offer.businessName} بخصم ${offer.discountPercentage}!`}
              url={window.location.href}
              size="md"
              variant="outline"
            />
          </div>
        </div>

        {/* Main Columns Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Main Details Card (Left Side / 2 Columns) */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
            
            {/* Elegant Hero Visual Frame */}
            <div className="relative h-64 sm:h-96 w-full overflow-hidden bg-stone-100 group">
              <img 
                src={offer.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800'} 
                alt={offer.title}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              {/* Complex Premium Radial/Linear Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/20 to-transparent" />
              
              {/* Premium Floating Status Badges */}
              <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-start">
                {offer.isHot && (
                  <span className="bg-red-600 text-white font-black text-[10px] sm:text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 border border-red-500/30 animate-pulse">
                    <Flame className="h-3.5 w-3.5 fill-white" />
                    <span>سوبر هُوت 🔥</span>
                  </span>
                )}
                {offer.isStudent && (
                  <span className="bg-amber-500 text-stone-950 font-black text-[10px] sm:text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 border border-amber-400/30">
                    <Gift className="h-3.5 w-3.5" />
                    <span>خصم طلابي حصري 🎓</span>
                  </span>
                )}
              </div>

              {/* Float Elegant Discount Badge */}
              <div className="absolute top-4 left-4 z-10">
                <span className="bg-[#1a4d2e] text-white font-black text-xs sm:text-sm px-4.5 py-2.5 rounded-2xl shadow-xl border border-emerald-600/30 flex items-center gap-1.5">
                  <Tag className="h-4 w-4 text-emerald-400" />
                  <span>خصم بقيمة {offer.discountPercentage}</span>
                </span>
              </div>

              {/* Typography overlay with frosted glass tag */}
              <div className="absolute bottom-6 right-6 left-6 text-white space-y-3">
                <span className="text-[11px] font-black text-amber-400 uppercase tracking-widest bg-stone-900/65 px-4 py-1.5 rounded-full border border-stone-800 backdrop-blur-md inline-block">
                  {offer.category || 'العروض والمهرجانات'}
                </span>
                <h1 className="text-xl sm:text-3xl font-black leading-tight tracking-tight drop-shadow-md">
                  {offer.title}
                </h1>
              </div>
            </div>

            {/* Structured Premium Layout Card Body */}
            <div className="p-6 sm:p-8 space-y-8">
              
              {/* Premium Ticket Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Visual Pricing Container */}
                <div className="bg-amber-50/40 p-5 rounded-2xl border border-amber-200/50 flex flex-col justify-center relative overflow-hidden group">
                  {/* Decorative background circle */}
                  <div className="absolute -top-12 -left-12 w-24 h-24 bg-amber-200/10 rounded-full pointer-events-none" />
                  
                  <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-1">تفاصيل التسعير والموفر</span>
                  
                  <div className="flex items-baseline gap-3">
                    {offer.newPrice ? (
                      <span className="text-3xl font-black text-[#1a4d2e]">{offer.newPrice}</span>
                    ) : (
                      <span className="text-xl font-black text-[#1a4d2e]">خصم خاص</span>
                    )}
                    {offer.oldPrice && (
                      <span className="text-sm text-stone-400 line-through font-medium">{offer.oldPrice}</span>
                    )}
                  </div>
                  
                  {offer.oldPrice && offer.newPrice ? (
                    <span className="text-[11px] text-emerald-700 font-extrabold mt-1.5 flex items-center gap-1">
                      <Sparkles className="h-3 w-3 animate-spin" />
                      <span>وفر المال واستفد من هذا التوفير الآن!</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-emerald-700 font-extrabold mt-1.5">احصل على السعر الحصري مباشرة</span>
                  )}
                </div>

                {/* Duration/Expiry Card */}
                <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200/60 flex flex-col justify-center">
                  <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider block mb-1.5">حالة وتوفر العرض الترويجي</span>
                  <div className="flex items-center gap-2.5 text-stone-800">
                    <Clock className="h-5 w-5 text-amber-600 shrink-0" />
                    <span className="font-extrabold text-sm text-stone-900">{renderOfferDurationText(offer)}</span>
                  </div>
                  <span className="text-[10px] text-stone-400 mt-2 font-medium">العرض يخضع لشروط وأحكام المنشأة</span>
                </div>

              </div>

              {/* Coupon Code - Styled like a High-End Premium Tear-off Ticket */}
              {offer.code && (
                <div className="bg-stone-50 border-2 border-dashed border-red-200 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative">
                  {/* Ticket side notches */}
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#faf9f6] rounded-full border-r border-stone-200 hidden sm:block" />
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#faf9f6] rounded-full border-l border-stone-200 hidden sm:block" />

                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                      <Tag className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-stone-900">انسخ كود الخصم الحصري</h4>
                      <p className="text-stone-500 text-[11px] mt-0.5">أبرز هذا الكود للمحاسب في المحل للحصول على الخصم</p>
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

              {/* Description */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-red-600 rounded-full" />
                  <span>تفاصيل وشروط العرض الترويجي</span>
                </h3>
                <div className="text-sm text-stone-700 leading-relaxed whitespace-pre-line bg-stone-50/50 p-5 sm:p-6 rounded-2xl border border-stone-200/50 font-medium">
                  {offer.description || 'لا يوجد تفاصيل أو شروط إضافية مسجلة لهذا العرض الترويجي.'}
                </div>
              </div>

              {/* Desktop Only Inline Contact Actions */}
              <div className="pt-6 border-t border-stone-200/60 hidden sm:flex items-center gap-3">
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 px-4 rounded-xl text-xs font-black transition-colors shadow-xs hover:shadow-md cursor-pointer"
                >
                  <WhatsApp3DIcon className="h-4 w-4 text-white" />
                  <span>استفسر عبر واتساب فوراً 💬</span>
                </a>

                <a
                  href={`tel:${offer.phone}`}
                  className="inline-flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-950 text-white py-3.5 px-6 rounded-xl text-xs font-black transition-colors shadow-xs hover:shadow-md min-w-[160px]"
                >
                  <Phone3DIcon className="h-4 w-4 text-white" />
                  <span>اتصال هاتفي 📞</span>
                </a>
              </div>

            </div>

          </div>

          {/* Premium Business Sidebar Info Card (Right Side / 1 Column) */}
          <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 space-y-6 transition-all hover:shadow-md">
            <h3 className="text-xs font-black text-stone-400 uppercase tracking-wider pb-2 border-b border-stone-100">
              المنشأة المصدرة للعرض
            </h3>

            {/* Business Micro Card with Interactive Feel */}
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

            {/* Visit Store CTA button */}
            <Link
              to={businessLink}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-orange-500 text-white hover:opacity-95 py-3.5 px-4 rounded-xl text-xs font-black shadow-md shadow-red-500/10 transition-all cursor-pointer text-center"
            >
              <Store className="h-4 w-4" />
              <span>عرض صفحة وفروع المحل الكاملة 🏬</span>
            </Link>

            {/* Detailed Metadata fields */}
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
                  onClick={() => handleCopyCode(window.location.href)}
                  className="text-stone-800 hover:text-stone-950 font-bold text-[10px] underline"
                >
                  {copiedCode ? 'تم نسخ الرابط!' : 'انسخ الرابط 🔗'}
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Sticky Mobile Bottom Navigation Bar - UX/UI masterpiece for hand held devices */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-stone-200/80 px-4 py-3 sm:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.05)] flex gap-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 active:bg-emerald-700 text-white py-3 px-3 rounded-xl text-xs font-black shadow-xs"
        >
          <WhatsApp3DIcon className="h-4 w-4 text-white" />
          <span>مراسلة واتساب 💬</span>
        </a>

        <a
          href={`tel:${offer.phone}`}
          className="bg-stone-950 active:bg-black text-white px-5 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5"
        >
          <Phone3DIcon className="h-4 w-4 text-white" />
          <span>اتصال هاتفي 📞</span>
        </a>
      </div>

    </div>
  );
}
