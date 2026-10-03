import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Megaphone, 
  Phone, 
  CheckCircle2, 
  XCircle, 
  Star, 
  DollarSign, 
  Clock, 
  Calendar, 
  ExternalLink,
  ShieldCheck,
  Send,
  Building2,
  Store
} from 'lucide-react';
import { WhatsAppIcon } from '../common/WhatsAppIcon';
import { getAppConfig } from '../../lib/demoDataHelper';
import { MarketingRequest, Business } from '../../types';

interface MarketingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: MarketingRequest | null;
  business?: Business | null;
  onStatusChange: (reqId: string, newStatus: MarketingRequest['status'], businessId?: string, serviceType?: string) => Promise<void>;
  onDelete: (reqId: string) => Promise<void>;
}

export function MarketingDetailsModal({
  isOpen,
  onClose,
  request,
  business,
  onStatusChange,
  onDelete
}: MarketingDetailsModalProps) {
  const [appConfigState, setAppConfigState] = React.useState<any>({});

  useEffect(() => {
    getAppConfig().then(config => setAppConfigState(config));
  }, []);
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !request || typeof document === 'undefined') return null;

  const getServicePricing = (type: string, req?: any) => {
    if (type === 'sponsored') {
      const targetType = req?.sponsoredTargetType || req?.targetType || 'business';
      switch (targetType) {
        case 'single_product':
          return { price: `${appConfigState?.priceSponsoredProduct ?? 7} دينار / أسبوعياً`, desc: `صدارة بحث لمنتج محدد: ${req?.sponsoredEntityName || 'منتج من المنيو'}` };
        case 'full_menu':
          return { price: `${appConfigState?.priceSponsoredMenu ?? 12} دينار / أسبوعياً`, desc: 'صدارة بحث لكامل منيو وكتالوج المحل في صفحة المنتجات والبحث' };
        case 'single_offer':
          return { price: `${appConfigState?.priceSponsoredOffer ?? 6} دينار / أسبوعياً`, desc: `صدارة بحث لعرض ترويجي محدد: ${req?.sponsoredEntityName || 'عرض خاص'}` };
        case 'multiple_offers':
          return { price: `${appConfigState?.priceSponsoredOffersGroup ?? 12} دينار / أسبوعياً`, desc: 'صدارة بحث لمجموعة عروض وخصومات المحل في صفحة العروض والبحث' };
        case 'single_job':
          return { price: `${appConfigState?.priceSponsoredJob ?? 8} دينار / أسبوعياً`, desc: `صدارة بحث لشاغر وظيفي محدد: ${req?.sponsoredEntityName || 'وظيفة شاغرة'}` };
        case 'multiple_jobs':
          return { price: `${appConfigState?.priceSponsoredJobsGroup ?? 14} دينار / أسبوعياً`, desc: 'صدارة بحث لمجموعة شواغر ووظائف المحل في صفحة الوظائف والبحث' };
        case 'all_inclusive':
          return { price: `${appConfigState?.priceSponsoredAllInclusive ?? 25} دينار / أسبوعياً`, desc: 'صدارة بحث شاملة لكل شيء (المحل والمنيو والعروض والوظائف)' };
        case 'business':
        default:
          return { price: `${appConfigState?.priceSponsored ?? 15} دينار / أسبوعياً`, desc: 'ظهور المحل في صدارة نتائج البحث والتصنيفات وبانر مميز' };
      }
    }
    switch (type) {
      case 'push_notifications': return { price: `${appConfigState?.pricePushNotifications ?? 10} دنانير / إشعار`, desc: 'إشعار فوري موجه لجميع مستخدمي المنصة في إربد' };
      case 'homepage_banner': return { price: `${appConfigState?.priceHomepageBanner ?? 25} دينار / أسبوعياً`, desc: 'إعلان رئيسي بارز في سلايدر أعلى الصفحة الرئيسية' };
      case 'promo_card': return { price: `${appConfigState?.pricePromoCard ?? 20} دينار / أسبوعياً`, desc: 'بطاقة ترويجية مدمجة ضمن قوائم وبطاقات الصفحة المختارة' };
      case 'premium_messaging': return { price: `${appConfigState?.priceMessaging1Month ?? 5} دنانير / شهرياً`, desc: 'ترقية نظام استقبال الوسائط والمحادثات' };
      default: return { price: '15 دينار', desc: 'خدمة تسويقية مخصصة' };
    }
  };

  const serviceInfo = getServicePricing(request.serviceType, request);

  // Generate WhatsApp message link
  const generateWhatsAppUrl = () => {
    const phone = business?.phone || '';
    if (!phone) return null;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const finalPhone = cleanPhone.startsWith('07') ? `962${cleanPhone.substring(1)}` : cleanPhone;
    const message = encodeURIComponent(`مرحباً أخي الكريم من إدارة منصة "شو في بإربد"، بخصوص طلبك لخدمة (${request.serviceName}) لمحل (${request.businessName}). نود تأكيد تفاصيل الحملة وتفعيلها.`);
    return `https://wa.me/${finalPhone}?text=${message}`;
  };

  const whatsappUrl = generateWhatsAppUrl();

  return createPortal(
    <div className="fixed inset-0 z-[100000] bg-stone-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden" dir="rtl">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[88dvh] sm:max-h-[85vh] shadow-2xl border border-stone-200 relative my-0 sm:my-auto animate-in fade-in zoom-in-95 flex flex-col overflow-hidden">
        
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5e1da] p-5 sm:px-8 pb-4 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#2d2a26]">تفاصيل الطلب التسويقي</h3>
              <p className="text-xs text-stone-500">متابعة الحملة الإعلانية والتواصل مع صاحب المحل</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">

        {/* Content Details */}
        <div className="space-y-4">
          
          {/* Business & Service Info Box */}
          <div className="bg-gradient-to-l from-stone-50 to-purple-50/40 p-5 rounded-2xl border border-purple-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-stone-500 block">اسم المحل:</span>
                <span className="text-lg font-black text-[#2d2a26]">{request.businessName}</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-black ${
                request.status === 'completed' || request.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-800'
                  : request.status === 'contacted'
                  ? 'bg-blue-100 text-blue-800'
                  : request.status === 'rejected'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {request.status === 'completed' || request.status === 'approved'
                  ? 'مفعّل ومعتمد'
                  : request.status === 'contacted'
                  ? 'تم التواصل'
                  : request.status === 'rejected'
                  ? 'مرفوض'
                  : 'قيد الانتظار'}
              </span>
            </div>

            <div className="pt-2 border-t border-purple-100/60 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-stone-500 font-bold block mb-0.5">نوع الباقة المطلوبة:</span>
                <span className="text-purple-700 font-black">{request.serviceName}</span>
              </div>
              <div>
                <span className="text-stone-500 font-bold block mb-0.5">سعر الباقة المقدر:</span>
                <span className="text-emerald-700 font-black">{serviceInfo.price}</span>
              </div>
            </div>

            <p className="text-[11px] text-stone-600 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-stone-200">
              {serviceInfo.desc}
            </p>
          </div>

          {/* Custom Banner details if it is homepage_banner */}
          {request.serviceType === 'homepage_banner' && (
            <div className="bg-amber-50/40 p-5 rounded-2xl border border-amber-200/60 space-y-3.5 text-right">
              <div className="font-black text-xs text-amber-900 border-b border-amber-100 pb-1.5 flex items-center gap-1.5">
                <span>🎨 تفاصيل البانر الإعلاني المطلوب:</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-stone-500 font-bold block mb-0.5">نوع التصميم:</span>
                  <span className="text-stone-800 font-bold">
                    {request.bannerType === 'business' ? 'ربط بصفحة المحل' :
                     request.bannerType === 'image_only' ? 'صورة ثابتة فقط' :
                     request.bannerType === 'animated_image' ? 'صورة متحركة GIF' :
                     request.bannerType === 'text_and_button' ? 'نصوص مع أزرار تفاعلية' : 'محل تجاري'}
                  </span>
                </div>
                {request.badgeText && (
                  <div>
                    <span className="text-stone-500 font-bold block mb-0.5">الشارة التسويقية:</span>
                    <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-bold text-[11px]">{request.badgeText}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-stone-500 font-bold block">العنوان الإعلاني:</span>
                  <span className="text-stone-950 font-bold text-sm">{request.bannerTitle || 'لا يوجد'}</span>
                </div>
                <div>
                  <span className="text-stone-500 font-bold block">الوصف أو العنوان الفرعي:</span>
                  <span className="text-stone-700 leading-relaxed block">{request.bannerSubtitle || 'لا يوجد'}</span>
                </div>
              </div>

              {(request.buttonText || request.buttonLink) && (
                <div className="grid grid-cols-2 gap-3 text-xs pt-1.5 border-t border-amber-100/60">
                  {request.buttonText && (
                    <div>
                      <span className="text-stone-500 font-bold block mb-0.5">نص الزر:</span>
                      <span className="text-stone-800 font-semibold">{request.buttonText}</span>
                    </div>
                  )}
                  {request.buttonLink && (
                    <div>
                      <span className="text-stone-500 font-bold block mb-0.5">رابط الزر / الواتساب:</span>
                      <a href={request.buttonLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1 break-all" dir="ltr">
                        {request.buttonLink}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs pt-2.5 border-t border-amber-100/60">
                <div>
                  <span className="text-stone-500 font-bold block mb-0.5">توقيت النشر المطلوب:</span>
                  <span className="text-stone-800 font-bold">
                    {request.publishTimeOption === 'scheduled' ? `📅 مجدول للبدء في: ${request.publishStartDate || 'غير محدد'}` : '⚡ فوري (مباشرة بعد الموافقة)'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 font-bold block mb-0.5">مدة بقاء البانر:</span>
                  <span className="text-stone-800 font-bold">{request.durationWeeks || 'أسبوع واحد'}</span>
                </div>
              </div>

              {request.bannerImageUrl && (
                <div className="space-y-1 text-xs pt-2 border-t border-amber-100/60">
                  <span className="text-stone-500 font-bold block mb-1">معاينة صورة الإعلان:</span>
                  <div className="relative rounded-xl overflow-hidden border border-stone-200 bg-stone-100 aspect-[2.35/1] max-w-full">
                    <img 
                      src={request.bannerImageUrl} 
                      alt="Banner Preview" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Custom details for sponsored */}
          {request.serviceType === 'sponsored' && (
            <div className="bg-emerald-50/40 p-5 rounded-2xl border border-emerald-200/60 space-y-3 text-right">
              <div className="font-black text-xs text-emerald-950 border-b border-emerald-100 pb-1.5 flex items-center gap-1.5">
                <span>تفاصيل طلب صدارة البحث (Sponsored):</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-stone-500 font-bold block mb-0.5">المدة المطلوبة:</span>
                  <span className="text-stone-800 font-bold">{request.durationWeeks || 'غير محدد'}</span>
                </div>
                <div>
                  <span className="text-stone-500 font-bold block mb-0.5">توقيت النشر المطلوب:</span>
                  <span className="text-stone-800 font-bold">
                    {request.publishTimeOption === 'scheduled' ? `مجدول للبدء في: ${request.publishStartDate || 'غير محدد'}` : 'فوري (مباشرة بعد الموافقة)'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs pt-1.5 border-t border-emerald-100">
                {request.contactWhatsapp && (
                  <div>
                    <span className="text-stone-500 font-bold block mb-0.5">رقم التواصل (واتساب):</span>
                    <span className="text-stone-800 font-mono font-bold" dir="ltr">{request.contactWhatsapp}</span>
                  </div>
                )}
              </div>
              {request.targetKeywords && (
                <div className="text-xs">
                  <span className="text-stone-500 font-bold block">الكلمات الدلالية المفضلة:</span>
                  <span className="text-stone-800 font-bold">{request.targetKeywords}</span>
                </div>
              )}
              {request.notes && (
                <div className="text-xs">
                  <span className="text-stone-500 font-bold block">ملاحظات إضافية من التاجر:</span>
                  <span className="text-stone-700 leading-relaxed block">{request.notes}</span>
                </div>
              )}
            </div>
          )}

          {/* Custom details for push_notifications */}
          {request.serviceType === 'push_notifications' && (
            <div className="bg-blue-50/40 p-5 rounded-2xl border border-blue-200/60 space-y-3 text-right">
              <div className="font-black text-xs text-blue-950 border-b border-blue-100 pb-1.5 flex items-center gap-1.5">
                <span>🔔 تفاصيل طلب الإشعار الجماعي المباشر:</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-stone-500 font-bold block">عنوان الإشعار المقترح:</span>
                  <span className="text-stone-950 font-bold text-sm">{request.notificationTitle || 'لا يوجد'}</span>
                </div>
                <div>
                  <span className="text-stone-500 font-bold block">محتوى رسالة الإشعار:</span>
                  <span className="text-stone-700 leading-relaxed block">{request.notificationBody || 'لا يوجد'}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs pt-1.5 border-t border-blue-100/60">
                {request.publishTimeOption === 'scheduled' || request.scheduledTime !== 'immediately' ? (
                  <div>
                    <span className="text-stone-500 font-bold block mb-0.5">الوقت المفضل للإرسال:</span>
                    <span className="text-stone-800 font-bold">📅 مجدول: {request.scheduledTime || request.publishStartDate}</span>
                  </div>
                ) : (
                  <div>
                    <span className="text-stone-500 font-bold block mb-0.5">توقيت الإرسال المطلوب:</span>
                    <span className="text-stone-800 font-bold">⚡ فوري (مباشرة بعد الموافقة)</span>
                  </div>
                )}
                {request.targetLink && (
                  <div>
                    <span className="text-stone-500 font-bold block mb-0.5">الرابط المستهدف:</span>
                    <a href={request.targetLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1 break-all" dir="ltr">
                      {request.targetLink}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                )}
              </div>
              {request.contactWhatsapp && (
                <div className="text-xs pt-1.5 border-t border-blue-100/60">
                  <span className="text-stone-500 font-bold block mb-0.5">رقم التواصل (واتساب):</span>
                  <span className="text-stone-800 font-mono font-bold" dir="ltr">{request.contactWhatsapp}</span>
                </div>
              )}
            </div>
          )}

          {/* Custom details for homepage_banner */}
          {request.serviceType === 'homepage_banner' && (
            <div className="bg-amber-50/40 p-5 rounded-2xl border border-amber-200/60 space-y-3 text-right">
              <div className="font-black text-xs text-amber-950 border-b border-amber-100 pb-1.5 flex items-center gap-1.5">
                <span>تفاصيل طلب بانر الصفحة الرئيسية</span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-stone-500 font-bold block">العنوان:</span>
                  <span className="text-stone-950 font-bold text-sm">{request.bannerTitle || 'لا يوجد'}</span>
                </div>
                <div>
                  <span className="text-stone-500 font-bold block">الوصف:</span>
                  <span className="text-stone-700 leading-relaxed block">{request.bannerSubtitle || 'لا يوجد'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Custom details for in-feed promo_card */}
          {request.serviceType === 'promo_card' && (
            <div className="bg-amber-50/40 p-5 rounded-2xl border border-amber-200/60 space-y-3.5 text-right">
              <div className="font-black text-xs text-amber-950 border-b border-amber-100 pb-1.5 flex items-center gap-1.5">
                <span>تفاصيل البطاقة الترويجية المدمجة بالقوائم</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-stone-500 font-bold block mb-0.5">الصفحة المستهدفة:</span>
                  <span className="text-stone-800 font-bold">
                    {request.promoCardTargetPage === 'home' ? 'الصفحة الرئيسية' :
                     request.promoCardTargetPage === 'offers' ? 'صفحة العروض والخصومات' :
                     request.promoCardTargetPage === 'products' ? 'صفحة المنتجات والخدمات' :
                     request.promoCardTargetPage === 'medical' ? 'صفحة الرعاية الطبية' :
                     request.promoCardTargetPage === 'jobs' ? 'صفحة الوظائف والشواغر' :
                     request.promoCardTargetPage === 'housing' ? 'صفحة السكنات والعقارات' : 'الرئيسية'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 font-bold block mb-0.5">نوع المحتوى المروج:</span>
                  <span className="text-stone-800 font-bold">
                    {request.promoCardTargetType === 'product' ? 'منتج محدد' :
                     request.promoCardTargetType === 'offer' ? 'عرض محدد' :
                     request.promoCardTargetType === 'job' ? 'وظيفة محددة' :
                     request.promoCardTargetType === 'housing' ? 'عقار محدد' :
                     request.promoCardTargetType === 'custom' ? 'إعلان مخصص' : 'صفحة المحل نفسه'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 font-bold block mb-0.5">شكل وتنسيق البطاقة:</span>
                  <span className="text-[#1a4d2e] font-black">
                    {(request as any).promoCardLayout === 'full' ? 'تنسيق كامل (Full Overlay)' : 'تنسيق قياسي كباقي البطاقات'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 font-bold block mb-0.5">طريقة الاقتصاص والعرض:</span>
                  <span className="text-stone-800 font-black">
                    {(request as any).promoCardMediaFit === 'fit' ? 'احتواء كامل (Fit)' : (request as any).promoCardMediaFit === 'fill' ? 'ملء متمدد (Fill)' : (request as any).promoCardMediaFit === 'pad' ? 'احتواء بهامش (Pad)' : 'اقتصاص وملء (Crop)'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-500 font-bold block mb-0.5">طريقة ظهور المحتوى:</span>
                  <span className="text-stone-800 font-black">
                    {(request as any).promoCardContentDisplay === 'hover' ? 'عند التمرير أو النقر (Hover / Tap)' : 'ظهور دائم (مستمر)'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                <div>
                  <span className="text-stone-500 font-bold block">العنوان الرئيسي للبطاقة:</span>
                  <span className="text-stone-950 font-bold text-sm">{request.bannerTitle || 'لا يوجد'}</span>
                </div>
                {request.bannerSubtitle && (
                  <div>
                    <span className="text-stone-500 font-bold block">الوصف أو العنوان الفرعي:</span>
                    <span className="text-stone-700 leading-relaxed block">{request.bannerSubtitle}</span>
                  </div>
                )}
                {request.badgeText && (
                  <div>
                    <span className="text-stone-500 font-bold block">الشارة الترويجية:</span>
                    <span className="inline-block bg-amber-100 text-amber-900 font-bold text-[11px] px-2 py-0.5 rounded-md mt-0.5">{request.badgeText}</span>
                  </div>
                )}
              </div>

              {(request.buttonText || request.buttonLink) && (
                <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-amber-100/60">
                  {request.buttonText && (
                    <div>
                      <span className="text-stone-500 font-bold block mb-0.5">نص الزر:</span>
                      <span className="text-stone-800 font-bold">{request.buttonText}</span>
                    </div>
                  )}
                  {request.buttonLink && (
                    <div>
                      <span className="text-stone-500 font-bold block mb-0.5">رابط الزر:</span>
                      <a href={request.buttonLink} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1 break-all" dir="ltr">
                        {request.buttonLink}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Media Preview (Image or Video) */}
              <div className="pt-2 border-t border-amber-100/60 space-y-2">
                <span className="text-stone-500 font-bold text-xs block">معاينة وسائط البطاقة ({request.promoCardMediaType === 'video' ? 'فيديو' : 'صورة'}):</span>
                {request.promoCardMediaType === 'video' && request.promoCardVideoUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-stone-200 bg-black aspect-video max-w-sm">
                    {request.promoCardVideoUrl.includes('youtube') || request.promoCardVideoUrl.includes('youtu.be') ? (
                      <iframe
                        src={request.promoCardVideoUrl.replace('watch?v=', 'embed/').split('&')[0]}
                        title="Video Preview"
                        className="w-full h-full border-0"
                        allowFullScreen
                      />
                    ) : (
                      <video src={request.promoCardVideoUrl} controls className="w-full h-full object-cover" />
                    )}
                  </div>
                ) : (request.promoCardImageUrl || request.bannerImageUrl) ? (
                  <div className="relative rounded-xl overflow-hidden border border-stone-200 bg-stone-100 aspect-[16/10] max-w-sm">
                    <img 
                      src={request.promoCardImageUrl || request.bannerImageUrl} 
                      alt="Promo Card Preview" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <span className="text-stone-400 text-xs italic block">لا توجد وسائط مرفقة</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 3. Business & Contact Info Section */}
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex flex-col gap-3 text-xs font-bold shrink-0">
          <h4 className="text-stone-800 font-black flex items-center gap-1.5 mb-1">
            <Store className="h-4 w-4 text-stone-500" />
            معلومات الاتصال والمحل
          </h4>

          {business?.phone && (
              <div className="flex items-center justify-between">
                <span className="text-stone-500">رقم هاتف المحل:</span>
                <span className="font-mono font-bold text-stone-800" dir="ltr">{business.phone.replace(/\s+/g, '')}</span>
              </div>
            )}

            {request.userEmail && (
              <div className="flex items-center justify-between">
                <span className="text-stone-500">البريد الإلكتروني:</span>
                <span className="font-mono text-stone-800">{request.userEmail}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-stone-500">تاريخ إنشاء الطلب:</span>
              <span className="text-stone-700">{new Date(request.createdAt).toLocaleString('ar-EG')}</span>
            </div>

            {business?.id && (
              <div className="pt-2 flex items-center justify-end">
                <a
                  href={`/business/${business.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#1a4d2e] hover:underline font-bold inline-flex items-center gap-1 text-[11px]"
                >
                  <ExternalLink className="h-3 w-3" />
                  معاينة صفحة المحل الحالية
                </a>
              </div>
            )}
          </div>

        {/* Quick Communication Actions */}
        <div className="flex flex-wrap gap-2 pt-1">
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 min-w-[140px] bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-2 shadow-xs"
            >
              <WhatsAppIcon className="h-4 w-4" />
              <span>محادثة واتساب سريعة</span>
            </a>
          )}
          {business?.phone && (
            <a
              href={`tel:${business.phone}`}
              className="bg-stone-100 hover:bg-stone-200 text-stone-800 p-2.5 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5"
            >
              <Phone className="h-4 w-4" />
              <span>اتصال هاتف</span>
            </a>
          )}
        </div>

        </div>

        {/* Status Changer Actions */}
        <div className="p-4 sm:px-8 bg-stone-50/90 border-t border-stone-200 shrink-0 sticky bottom-0 z-10 space-y-2">
          <div className="text-xs font-black text-stone-700">تغيير حالة الإعلان والتفعيل الفوري:</div>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={async () => {
                await onStatusChange(request.id!, 'completed', request.businessId, request.serviceType);
                onClose();
              }}
              className="bg-[#1a4d2e] hover:bg-[#143e25] text-white p-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4 text-[#ff9f1c]" />
              <span>اعتماد وتفعيل الخدمة</span>
            </button>

            <button
              onClick={async () => {
                await onStatusChange(request.id!, 'contacted', request.businessId, request.serviceType);
                onClose();
              }}
              className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Clock className="h-4 w-4" />
              <span>تم التواصل مع العميل</span>
            </button>

            <button
              onClick={async () => {
                await onStatusChange(request.id!, 'rejected', request.businessId, request.serviceType);
                onClose();
              }}
              className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <XCircle className="h-4 w-4" />
              <span>رفض أو إلغاء التفعيل</span>
            </button>

            <button
              onClick={async () => {
                await onDelete(request.id!);
                onClose();
              }}
              className="bg-stone-50 hover:bg-red-50 text-stone-600 hover:text-red-700 border border-stone-200 p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>حذف الطلب نهائياً 🗑️</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
