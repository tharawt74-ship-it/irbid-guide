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
  Layers
} from 'lucide-react';
import { Business } from '../../types';

export interface MarketingHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: Business[];
  selectedBusinessId: string;
  onSelectBusinessId: (id: string) => void;
  onSelectService: (serviceType: 'sponsored' | 'push_notifications' | 'homepage_banner', serviceName: string, successMsg: string) => void;
  onOpenVipUpgrade: (business: Business) => void;
  onUpgradeMessaging: (plan: '1_month' | '3_months' | '6_months' | '1_year', businessId: string) => void;
  onViewRequests: () => void;
  appConfigState?: {
    priceSponsored?: number;
    pricePushNotifications?: number;
    priceHomepageBanner?: number;
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
                <span>الأكثر طلباً 🔥</span>
              </div>

              <div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-100/90 text-[#1a4d2e] flex items-center justify-center mb-3.5">
                  <TrendingUp className="h-5 w-5" />
                </div>

                <h3 className="font-black text-base text-stone-900 mb-1">صدارة البحث (Sponsored)</h3>
                <p className="text-stone-500 text-xs mb-4 leading-relaxed">
                  ظهور محلك في مقدمة نتائج البحث بكلمات مفتاحية مخصصة للوصول لأول زبون يبحث عن مجالك.
                </p>

                <div className="space-y-1.5 mb-5">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-stone-700">
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                    <span>ظهور أعلى المنافسين في نتائج البحث</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-stone-700">
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                    <span>شارة "ممول" بارزة لجذب الزوار</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 space-y-2.5 mt-auto">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] font-bold text-stone-400">التكلفة:</span>
                  <div className="text-sm font-black text-[#1a4d2e]">
                    {appConfigState?.priceSponsored ?? 15} دينار <span className="text-[10px] text-stone-400 font-normal">/ أسبوع</span>
                  </div>
                </div>

                <button 
                  type="button"
                  onClick={() => {
                    onClose();
                    onSelectService(
                      'sponsored', 
                      'صدارة البحث (Sponsored)', 
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

            {/* 4. Premium Messaging Addon */}
            <div className="bg-gradient-to-b from-stone-50 via-white to-white border border-stone-200/90 rounded-2xl sm:rounded-3xl p-5 hover:shadow-md hover:border-stone-400 transition-all flex flex-col justify-between relative overflow-hidden group">
              <div>
                <div className="w-11 h-11 rounded-2xl bg-stone-100 text-stone-800 flex items-center justify-center mb-3.5">
                  <MessageSquare className="h-5 w-5" />
                </div>

                <h3 className="font-black text-base text-stone-900 mb-1">ترقية نظام الرسائل والوسائط</h3>
                <p className="text-stone-500 text-xs mb-4 leading-relaxed">
                  تمكين استقبال صور المنتجات والطلبات من الزبائن وزيادة مدة حفظ أرشيف المحادثات.
                </p>

                <div className="space-y-1.5 mb-5">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-stone-700">
                    <div className="w-3.5 h-3.5 rounded-full bg-stone-200 text-stone-800 flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                    <span>استقبال صور طلبات ومستندات الزبائن</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold text-stone-700">
                    <div className="w-3.5 h-3.5 rounded-full bg-stone-200 text-stone-800 flex items-center justify-center shrink-0">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </div>
                    <span>الاحتفاظ بالأرشيف حتى سنة كاملة</span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 space-y-2.5 mt-auto">
                <button 
                  type="button"
                  onClick={() => {
                    if (currentBusiness) {
                      onUpgradeMessaging('1_month', currentBusiness.id);
                      onClose();
                    }
                  }}
                  className="w-full bg-stone-800 hover:bg-stone-900 text-white py-2.5 rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>ترقية باقة الرسائل 💬</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-stone-50 border-t border-stone-200/80 flex items-center justify-between text-xs text-stone-500 shrink-0">
          <span className="font-medium text-[11px] sm:text-xs">
            ✨ يتم تفعيل الخدمات الإعلانية ومراجعتها فوراً بالتعاون مع فريق المنصة.
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
