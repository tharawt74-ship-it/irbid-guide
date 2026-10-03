import React from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Rocket, 
  TrendingUp, 
  Bell, 
  Megaphone, 
  Crown, 
  MessageSquare, 
  Check, 
  Sparkles, 
  Flame, 
  Store,
  ArrowRight,
  ClipboardList,
  Layers,
  LayoutGrid
} from 'lucide-react';
import { Business } from '../../types';

export interface MarketingHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: Business[];
  selectedBusinessId: string;
  onSelectBusinessId: (id: string) => void;
  onSelectService: (serviceType: 'sponsored' | 'push_notifications' | 'homepage_banner' | 'promo_card', serviceName: string, successMsg: string, targetType?: string) => void;
  onOpenVipUpgrade: (business: Business) => void;
  onUpgradeMessaging: (plan: '1_month' | '3_months' | '6_months' | '1_year', businessId: string) => void;
  onViewRequests: () => void;
  appConfigState?: {
    priceSponsored?: number;
    priceSponsoredProduct?: number;
    priceSponsoredMenu?: number;
    priceSponsoredOffer?: number;
    priceSponsoredOffersGroup?: number;
    priceSponsoredJob?: number;
    priceSponsoredJobsGroup?: number;
    priceSponsoredAllInclusive?: number;
    pricePushNotifications?: number;
    priceHomepageBanner?: number;
    pricePromoCard?: number;
    priceMessaging1Month?: number;
    priceMessaging3Months?: number;
    priceMessaging6Months?: number;
    priceMessaging1Year?: number;
  };
}

export function MarketingHubModal({
  isOpen,
  onClose,
  businesses,
  selectedBusinessId,
  onSelectBusinessId,
  onSelectService,
  onOpenVipUpgrade,
  onUpgradeMessaging,
  onViewRequests,
  appConfigState
}: MarketingHubModalProps) {
  const [selectedMessagingPlan, setSelectedMessagingPlan] = React.useState<'1_month' | '3_months' | '6_months' | '1_year'>('1_month');

  if (!isOpen || typeof document === 'undefined') return null;

  const currentBusiness = businesses.find(b => b.id === selectedBusinessId) || (businesses.length > 0 ? businesses[0] : null);

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-stone-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden" dir="rtl">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-4xl w-full max-h-[92dvh] sm:max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-stone-200 relative my-0 sm:my-auto animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 text-right">
        
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-stone-100 p-4 sm:p-6 gap-3 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-orange-100 text-[#ff9f1c] flex items-center justify-center font-bold shadow-xs shrink-0">
              <Rocket className="h-6 w-6 fill-current text-[#ff9f1c]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-stone-900">
                  مركز الخدمات التسويقية والترويج
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200/80 hidden sm:inline-block">
                  إشهار فوري
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                اختر الخدمة الترويجية المناسبة لزيادة مبيعاتك والوصول لآلاف الزبائن في إربد
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2.5">
            {businesses.length > 1 && (
              <div className="flex items-center gap-1.5 bg-stone-50 px-2.5 py-1.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-800">
                <Store className="h-3.5 w-3.5 text-[#1a4d2e] shrink-0" />
                <select
                  value={selectedBusinessId}
                  onChange={(e) => onSelectBusinessId(e.target.value)}
                  className="bg-transparent focus:outline-none cursor-pointer text-xs font-black"
                >
                  {businesses.map(b => (
                    <option key={b.id} value={b.id}>المحل: {b.name}</option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2 bg-stone-100 text-stone-500 hover:bg-stone-200 rounded-full transition-colors shrink-0 cursor-pointer"
              title="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Services List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Active Business Notification Callout */}
          {currentBusiness && (
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                <span className="text-stone-600 font-medium">المنشأة المستهدفة بالطلب:</span>
                <span className="font-black text-[#1a4d2e] truncate">{currentBusiness.name}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewRequests();
                }}
                className="text-[11px] font-black text-emerald-800 hover:text-emerald-950 underline underline-offset-2 shrink-0 flex items-center gap-1 cursor-pointer"
              >
                <ClipboardList className="h-3.5 w-3.5" />
                <span>سجل طلباتي السابقة</span>
              </button>
            </div>
          )}

          {/* Marketing Services Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            
            {/* 1. Sponsored Search */}
            <div className="bg-gradient-to-b from-emerald-50/40 via-white to-white border border-emerald-200/90 rounded-2xl sm:rounded-3xl p-5 hover:shadow-md hover:border-emerald-400 transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-[#ff9f1c] text-stone-950 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                <Flame className="h-3 w-3 fill-stone-950" />
                <span>الأكثر طلباً</span>
              </div>

              <div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-100/90 text-[#1a4d2e] flex items-center justify-center mb-3.5">
                  <TrendingUp className="h-5 w-5" />
                </div>

                <h3 className="font-black text-base text-stone-900 mb-1">صدارة البحث والنتائج الممولة</h3>
                <p className="text-stone-500 text-xs mb-3.5 leading-relaxed">
                  ظهور متصدر في مقدمة نتائج البحث مع الإطار الذهبي وشارة ممول للمحل أو منتجاته أو عروضه أو وظائفه.
                </p>

                {/* Sub-options Breakdown */}
                <div className="space-y-1.5 mb-4 bg-stone-50/90 p-2.5 rounded-2xl border border-stone-200/70 text-[11px]">
                  <div className="flex items-center justify-between font-bold text-stone-700">
                    <span className="flex items-center gap-1.5"><Crown className="h-3 w-3 text-amber-500" /> بطاقة المحل:</span>
                    <span className="font-black text-[#1a4d2e]">{appConfigState?.priceSponsored ?? 15} د.أ</span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-stone-700">
                    <span className="flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-amber-500" /> منتج / خدمة محددة:</span>
                    <span className="font-black text-[#1a4d2e]">{appConfigState?.priceSponsoredProduct ?? 7} د.أ</span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-stone-700">
                    <span className="flex items-center gap-1.5"><Layers className="h-3 w-3 text-amber-500" /> المنيو والكتالوج بالكامل:</span>
                    <span className="font-black text-[#1a4d2e]">{appConfigState?.priceSponsoredMenu ?? 12} د.أ</span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-stone-700">
                    <span className="flex items-center gap-1.5"><Flame className="h-3 w-3 text-red-500" /> عرض وخصم محدد:</span>
                    <span className="font-black text-[#1a4d2e]">{appConfigState?.priceSponsoredOffer ?? 6} د.أ</span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-stone-700">
                    <span className="flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-teal-600" /> شاغر / وظيفة محددة:</span>
                    <span className="font-black text-[#1a4d2e]">{appConfigState?.priceSponsoredJob ?? 8} د.أ</span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-stone-700 border-t border-stone-200/60 pt-1 mt-1">
                    <span className="flex items-center gap-1.5 text-amber-900 font-black"><Crown className="h-3 w-3 text-amber-600 fill-amber-600" /> صدارة شاملة لكل شيء:</span>
                    <span className="font-black text-amber-900">{appConfigState?.priceSponsoredAllInclusive ?? 25} د.أ</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 space-y-2.5 mt-auto">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-bold text-stone-400">يبدأ من:</span>
                  <div className="text-sm font-black text-[#1a4d2e]">
                    {appConfigState?.priceSponsoredOffer ?? 6} دينار <span className="text-[10px] text-stone-400 font-normal">/ أسبوع</span>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectService(
                      'sponsored', 
                      'صدارة البحث والنتائج الممولة', 
                      'تم استلام طلبك لخدمة "صدارة البحث". سيتواصل معك فريقنا قريباً لإتمام الدفع وتفعيل الخدمة.'
                    );
                  }}
                  className="w-full bg-[#1a4d2e] hover:bg-[#133b22] text-white py-2.5 rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[#ff9f1c]" />
                  <span>اطلب صدارة البحث الآن</span>
                </button>
              </div>
            </div>

            {/* 2. Push Notifications */}
            <div className="bg-gradient-to-b from-sky-50/40 via-white to-white border border-sky-200/90 rounded-2xl sm:rounded-3xl p-5 hover:shadow-md hover:border-sky-400 transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-3 left-3 bg-sky-100 text-sky-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-sky-200">
                <span>وصول فوري ⚡</span>
              </div>

              <div>
                <div className="w-11 h-11 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mb-3.5">
                  <Bell className="h-5 w-5" />
                </div>

                <h3 className="font-black text-base text-stone-900 mb-1">إشعارات جماعية للمستخدمين</h3>
                <p className="text-stone-500 text-xs mb-4 leading-relaxed">
                  إرسال إشعار فوري لجميع هواتف الآلاف من مستخدمي المنصة وتطبيق إربد للترويج لعروضك.
                </p>

                <div className="space-y-1.5 mb-5">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-stone-700">
                    <div className="w-3.5 h-3.5 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                    <span>رسالة مخصصة تصل لشاشات الأجهزة فوراً</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-stone-700">
                    <div className="w-3.5 h-3.5 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                    <span>تحويل مباشر لصفحة منشأتك عند النقر</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 space-y-2.5 mt-auto">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-bold text-stone-400">التكلفة:</span>
                  <div className="text-sm font-black text-sky-800">
                    {appConfigState?.pricePushNotifications ?? 10} دنانير <span className="text-[10px] text-stone-400 font-normal">/ إشعار</span>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectService(
                      'push_notifications', 
                      'إشعارات جماعية', 
                      'تم استلام طلبك لخدمة "إشعارات جماعية". سيتواصل معك فريقنا قريباً.'
                    );
                  }}
                  className="w-full bg-sky-700 hover:bg-sky-800 text-white py-2.5 rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Bell className="h-3.5 w-3.5" />
                  <span>اطلب الإشعار الجماعي</span>
                </button>
              </div>
            </div>

            {/* 3. Homepage Banner */}
            <div className="bg-gradient-to-b from-purple-50/40 via-white to-white border border-purple-200/90 rounded-2xl sm:rounded-3xl p-5 hover:shadow-md hover:border-purple-400 transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-3 left-3 bg-purple-100 text-purple-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-purple-200">
                <span>واجهة الموقع 🖼️</span>
              </div>

              <div>
                <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3.5">
                  <Megaphone className="h-5 w-5" />
                </div>

                <h3 className="font-black text-base text-stone-900 mb-1">بانر إعلاني مميز في الأعلى</h3>
                <p className="text-stone-500 text-xs mb-4 leading-relaxed">
                  احجز البانر الرئيسي في أعلى واجهة موقع وتطبيق "شو في بإربد" مع انتشار كامل.
                </p>

                <div className="space-y-1.5 mb-5">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-stone-700">
                    <div className="w-3.5 h-3.5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                    <span>مساحة مرئية ضخمة لجميع زوار المنصة</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-stone-700">
                    <div className="w-3.5 h-3.5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                    <span>رابط توجيه داخلي أو خارجي وزر تفاعلي</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 space-y-2.5 mt-auto">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-bold text-stone-400">التكلفة:</span>
                  <div className="text-sm font-black text-purple-800">
                    {appConfigState?.priceHomepageBanner ?? 25} دينار <span className="text-[10px] text-stone-400 font-normal">/ أسبوع</span>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectService(
                      'homepage_banner', 
                      'بانر إعلاني مميز', 
                      'تم استلام طلبك لخدمة "بانر إعلاني مميز". سيتواصل معك فريقنا قريباً.'
                    );
                  }}
                  className="w-full bg-purple-700 hover:bg-purple-800 text-white py-2.5 rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Megaphone className="h-3.5 w-3.5" />
                  <span>حجز البانر الإعلاني</span>
                </button>
              </div>
            </div>

            {/* 4. In-Feed Promotional Card */}
            <div className="bg-gradient-to-b from-amber-50/40 via-white to-white border border-amber-300 rounded-2xl sm:rounded-3xl p-5 hover:shadow-md hover:border-amber-400 transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-3 left-3 bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-amber-300">
                <span>مدمجة بالقوائم 📇</span>
              </div>

              <div>
                <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-3.5">
                  <LayoutGrid className="h-5 w-5" />
                </div>

                <h3 className="font-black text-base text-stone-900 mb-1">بطاقة ترويجية مدمجة (In-Feed)</h3>
                <p className="text-stone-500 text-xs mb-4 leading-relaxed">
                  إضافة بطاقة ترويجية خاصة تظهر بين بطاقات المحلات أو العروض أو المنتجات أو الوظائف أو العقارات مع صورة أو فيديو وأزرار تفاعلية.
                </p>

                <div className="space-y-1.5 mb-5">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-stone-700">
                    <div className="w-3.5 h-3.5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                    <span>تظهر كبطاقة طبيعية مدمجة مع خيارات التصفح</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-stone-700">
                    <div className="w-3.5 h-3.5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                    <span>دعم إرفاق صورة أو فيديو تفاعلي وأزرار توجيه</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 space-y-2.5 mt-auto">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-bold text-stone-400">التكلفة:</span>
                  <div className="text-sm font-black text-amber-900">
                    {appConfigState?.pricePromoCard ?? 20} دينار <span className="text-[10px] text-stone-400 font-normal">/ أسبوع</span>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectService(
                      'promo_card', 
                      'بطاقة ترويجية مدمجة (In-Feed)', 
                      'تم استلام طلبك لخدمة "البطاقة الترويجية المدمجة". سيتواصل معك فريقنا قريباً لإعدادها وتفعيلها.'
                    );
                  }}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white py-2.5 rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-200" />
                  <span>طلب بطاقة ترويجية مدمجة</span>
                </button>
              </div>
            </div>

            {/* 5. Premium Messaging Addon */}
            <div className="bg-gradient-to-b from-amber-50/60 via-white to-white border-2 border-amber-300 rounded-2xl sm:rounded-3xl p-5 hover:shadow-md hover:border-amber-500 transition-all flex flex-col justify-between relative overflow-hidden group">
              <div className="absolute top-0 right-0 bg-amber-400 text-amber-950 text-[10px] font-black px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-2xs">
                <Crown className="h-3.5 w-3.5 fill-amber-950 text-amber-950" />
                <span>باقة رسائل مطورة 👑</span>
              </div>

              <div>
                <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-3.5 mt-2">
                  <MessageSquare className="h-5 w-5" />
                </div>

                <h3 className="font-black text-base text-stone-900 mb-1">ترقية نظام الرسائل والوسائط</h3>
                <p className="text-stone-500 text-xs mb-4 leading-relaxed">
                  تمكين استقبال صور المنتجات والطلبات من الزبائن وزيادة مدة حفظ أرشيف المحادثات.
                </p>

                {currentBusiness && (() => {
                  const isUpgraded = currentBusiness.premiumMessagingEnabled;
                  return (
                    <div className="mb-4 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200 text-[11px] font-bold text-stone-700">
                      <div className="flex items-center justify-between">
                        <span>حالة المنشأة الحالية:</span>
                        {isUpgraded ? (
                          <span className="text-emerald-700 font-black bg-emerald-100 px-2 py-0.5 rounded-md">
                            مفعلة ✓ ({currentBusiness.premiumMessagingPlan === '1_month' ? 'شهر' : currentBusiness.premiumMessagingPlan === '3_months' ? '3 أشهر' : currentBusiness.premiumMessagingPlan === '6_months' ? '6 أشهر' : 'سنة'})
                          </span>
                        ) : (
                          <span className="text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-md">
                            باقة أساسية (7 أيام)
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Package selection buttons inside modal */}
                <div className="mb-4 space-y-2">
                  <label className="block text-xs font-black text-stone-800">
                    اختر باقة الترقية المطلوبة:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: '1_month', label: 'شهر واحد', price: appConfigState?.priceMessaging1Month ?? 5 },
                      { id: '3_months', label: '3 أشهر', price: appConfigState?.priceMessaging3Months ?? 12 },
                      { id: '6_months', label: '6 أشهر', price: appConfigState?.priceMessaging6Months ?? 20 },
                      { id: '1_year', label: 'سنة كاملة', price: appConfigState?.priceMessaging1Year ?? 35 }
                    ].map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedMessagingPlan(plan.id as any)}
                        className={`p-2 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between ${
                          selectedMessagingPlan === plan.id
                            ? 'border-amber-500 bg-amber-50 text-amber-950 font-black ring-2 ring-amber-400/50 shadow-xs'
                            : 'border-stone-200 hover:border-amber-300 text-stone-700 bg-white'
                        }`}
                      >
                        <span className="text-[11px] font-black">{plan.label}</span>
                        <span className="text-[11px] font-black text-amber-900">{plan.price} د.أ</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5 mb-5">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-stone-700">
                    <div className="w-3.5 h-3.5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                    <span>استقبال صور طلبات ومستندات الزبائن</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-stone-700">
                    <div className="w-3.5 h-3.5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                    <span>الاحتفاظ بالأرشيف حتى سنة كاملة</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 space-y-2.5 mt-auto">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-[11px] font-bold text-stone-400">تكلفة الباقة المختارة:</span>
                  <div className="text-sm font-black text-amber-900">
                    {selectedMessagingPlan === '1_month' && `${appConfigState?.priceMessaging1Month ?? 5} دنانير / شهر`}
                    {selectedMessagingPlan === '3_months' && `${appConfigState?.priceMessaging3Months ?? 12} دينار / 3 أشهر`}
                    {selectedMessagingPlan === '6_months' && `${appConfigState?.priceMessaging6Months ?? 20} دينار / 6 أشهر`}
                    {selectedMessagingPlan === '1_year' && `${appConfigState?.priceMessaging1Year ?? 35} دينار / سنة`}
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => {
                    if (currentBusiness) {
                      onUpgradeMessaging(selectedMessagingPlan, currentBusiness.id);
                      onClose();
                    }
                  }}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 py-2.5 rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Crown className="h-3.5 w-3.5 fill-stone-950" />
                  <span>تفعيل وترقية نظام الرسائل</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-stone-50 border-t border-stone-200/80 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <span className="font-medium text-[11px] sm:text-xs">
            يتم تفعيل الخدمات الإعلانية ومراجعتها فوراً بالتعاون مع فريق المنصة.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
