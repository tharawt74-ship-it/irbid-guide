import React, { useState, useEffect } from 'react';
import { 
  Rocket, TrendingUp, Bell, Megaphone, 
  Sparkles, Check, MessageSquare, Image as ImageIcon, Flame, Crown
} from 'lucide-react';
import { Business } from '../../../types';
import { getAppConfig } from '../../../lib/demoDataHelper';

interface MedicalMarketingTabProps {
  business: Business;
  onOpenMarketingModal?: (serviceType: string, serviceName: string, successMessage: string, businessId?: string) => void;
  onUpgradeMessaging?: (plan: '1_month' | '3_months' | '6_months' | '1_year', businessId?: string) => void;
}

export function MedicalMarketingTab({
  business,
  onOpenMarketingModal,
  onUpgradeMessaging
}: MedicalMarketingTabProps) {
  const [appConfigState, setAppConfigState] = useState<any>({});
  const [selectedMessagingPlan, setSelectedMessagingPlan] = useState<'1_month' | '3_months' | '6_months' | '1_year'>('1_month');

  useEffect(() => {
    getAppConfig().then(config => setAppConfigState(config));
  }, []);

  const handleRequestService = (type: string, title: string, successMsg: string) => {
    if (onOpenMarketingModal) {
      onOpenMarketingModal(type, title, successMsg, business.id);
    } else {
      alert("يرجى استخدام نموذج الطلب من لوحة التحكم الرئيسية.");
    }
  };

  const isUpgraded = business.premiumMessagingEnabled;

  return (
    <div className="bg-white p-3.5 sm:p-8 rounded-xl sm:rounded-[32px] border-0 sm:border border-stone-200/80 shadow-none sm:shadow-xs space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 sm:pb-6 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ff9f1c]/20 to-amber-500/10 text-[#ff9f1c] flex items-center justify-center font-bold shadow-xs">
            <Rocket className="h-6 w-6 text-[#ff9f1c]" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">
              الخدمات التسويقية والترويجية 🚀
            </h2>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              عزز حضور منشأتك في إربد بخدمات ترويجية مستهدفة للوصول لآلاف الزوار والمراجعين.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. Sponsored Listing */}
        <div className="bg-gradient-to-b from-emerald-50/40 via-white to-white border border-emerald-200/80 rounded-[24px] p-6 hover:shadow-lg hover:border-emerald-400 transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-[#ff9f1c] text-stone-950 text-[10px] font-black px-3 py-1 rounded-full shadow-xs flex items-center gap-1">
            <Flame className="h-3 w-3 fill-stone-950" />
            <span>الأكثر طلباً 🔥</span>
          </div>

          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 text-[#1a4d2e] flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6" />
            </div>

            <h3 className="font-black text-lg text-stone-900 mb-1">صدارة البحث (Sponsored)</h3>
            <p className="text-stone-500 text-xs mb-5 leading-relaxed">
              ظهور المنشأة أول النتائج بكلمات مفتاحية مخصصة للوصول لأول زبون يبحث عن خدمتك.
            </p>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-700">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
                <span>ظهور أعلى المنافسين في نتائج البحث</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-stone-700">
                <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
                <span>شارة "ممول" بارزة وملفتة</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 space-y-3 mt-auto">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold text-stone-400">التكلفة الإجمالية:</span>
              <div className="text-base font-black text-[#1a4d2e]">
                {appConfigState?.priceSponsored ?? 15} دينار <span className="text-[10px] text-stone-400 font-normal">/ أسبوع</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => handleRequestService('sponsored', 'صدارة البحث (Sponsored)', 'تم استلام طلبك لخدمة "صدارة البحث". سيتواصل معك فريقنا قريباً لإتمام الدفع وتفعيل الخدمة.')}
              className="w-full bg-[#1a4d2e] hover:bg-[#133b22] text-white py-3 rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Sparkles className="h-4 w-4 text-[#ff9f1c]" />
              <span>اطلب صدارة البحث الآن</span>
            </button>
          </div>
        </div>

        {/* 2. Push Notifications */}
        <div className="bg-gradient-to-b from-sky-50/40 via-white to-white border border-sky-200/80 rounded-[24px] p-6 hover:shadow-lg hover:border-sky-400 transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-3 left-3 bg-sky-100 text-sky-800 text-[10px] font-black px-3 py-1 rounded-full border border-sky-200">
            <span>وصول فوري ⚡</span>
          </div>

          <div>
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mb-4">
              <Bell className="h-6 w-6" />
            </div>

            <h3 className="font-black text-lg text-stone-900 mb-1">إشعارات جماعية لكافة المستخدمين</h3>
            <p className="text-stone-500 text-xs mb-5 leading-relaxed">
              إرسال إشعار فوري لجميع هواتف الآلاف من مستخدمي المنصة للترويج لعروضك الجديدة.
            </p>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-700">
                <div className="w-4 h-4 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
                <span>رسالة مخصصة تصل لشاشات الأجهزة</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-stone-700">
                <div className="w-4 h-4 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
                <span>تحويل مباشر لصفحة منشأتك عند النقر</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 space-y-3 mt-auto">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold text-stone-400">التكلفة الإجمالية:</span>
              <div className="text-base font-black text-sky-800">
                {appConfigState?.pricePushNotifications ?? 10} دنانير <span className="text-[10px] text-stone-400 font-normal">/ إشعار</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => handleRequestService('push_notifications', 'إشعارات جماعية', 'تم استلام طلبك لخدمة "إشعارات جماعية". سيتواصل معك فريقنا قريباً.')}
              className="w-full bg-sky-700 hover:bg-sky-800 text-white py-3 rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Bell className="h-4 w-4" />
              <span>اطلب الإشعار الجماعي</span>
            </button>
          </div>
        </div>

        {/* 3. Homepage / Medical Page Banner */}
        <div className="bg-gradient-to-b from-purple-50/40 via-white to-white border border-purple-200/80 rounded-[24px] p-6 hover:shadow-lg hover:border-purple-400 transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-3 left-3 bg-purple-100 text-purple-800 text-[10px] font-black px-3 py-1 rounded-full border border-purple-200">
            <span>واجهة الموقع 🖼️</span>
          </div>

          <div>
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-4">
              <ImageIcon className="h-6 w-6" />
            </div>

            <h3 className="font-black text-lg text-stone-900 mb-1">بانر إعلاني مميز في الأعلى</h3>
            <p className="text-stone-500 text-xs mb-5 leading-relaxed">
              احجز البانر الرئيسي في أعلى الواجهة الأولى أو دليل الرعاية الطبية بانتشار واجهة كاملة.
            </p>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-700">
                <div className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
                <span>تصميم احترافي مجاني مرفق من الفريق</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-stone-700">
                <div className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
                <span>رابط توجيه داخلي أو خارجي مخصص</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 space-y-3 mt-auto">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold text-stone-400">التكلفة الإجمالية:</span>
              <div className="text-base font-black text-purple-800">
                {appConfigState?.priceHomepageBanner ?? 25} دينار <span className="text-[10px] text-stone-400 font-normal">/ أسبوع</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => handleRequestService('homepage_banner', 'بانر إعلاني مميز', 'تم استلام طلبك لخدمة "بانر إعلاني مميز". سيتواصل معك فريقنا قريباً.')}
              className="w-full bg-purple-700 hover:bg-purple-800 text-white py-3 rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Megaphone className="h-4 w-4" />
              <span>حجز البانر الإعلاني</span>
            </button>
          </div>
        </div>

        {/* 4. Premium Messaging Add-on */}
        <div className="bg-gradient-to-b from-amber-50/60 via-white to-white border-2 border-amber-300 rounded-[24px] p-6 hover:shadow-lg hover:border-amber-500 transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 bg-amber-400 text-amber-950 text-[10px] font-black px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-2xs">
            <Crown className="h-3 w-3 fill-amber-950" />
            <span>باقة رسائل مطورة 💬</span>
          </div>

          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-4 mt-2">
              <MessageSquare className="h-6 w-6" />
            </div>

            <h3 className="font-black text-lg text-stone-900 mb-1">ترقية نظام الرسائل والوسائط</h3>
            <p className="text-stone-500 text-xs mb-4 leading-relaxed">
              تمكين استقبال صور المنتجات والتحاليل والمستندات من المراجعين وزيادة حفظ أرشيف المراسلة.
            </p>

            <div className="mb-4 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200 text-[11px] font-bold text-stone-700">
              <div className="flex items-center justify-between">
                <span>حالة المنشأة الحالية:</span>
                {isUpgraded ? (
                  <span className="text-emerald-700 font-black bg-emerald-100 px-2 py-0.5 rounded-md">
                    مفعلة ✓ ({business.premiumMessagingPlan === '1_month' ? 'شهر' : business.premiumMessagingPlan === '3_months' ? '3 أشهر' : business.premiumMessagingPlan === '6_months' ? '6 أشهر' : 'سنة'})
                  </span>
                ) : (
                  <span className="text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-md">
                    باقة أساسية (7 أيام)
                  </span>
                )}
              </div>
            </div>

            {/* Package selection buttons */}
            <div className="mb-5 space-y-2">
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
                    className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between ${
                      selectedMessagingPlan === plan.id
                        ? 'border-amber-500 bg-amber-50 text-amber-950 font-black ring-2 ring-amber-400/50 shadow-xs'
                        : 'border-stone-200 hover:border-amber-300 text-stone-700 bg-white'
                    }`}
                  >
                    <span className="text-xs font-black">{plan.label}</span>
                    <span className="text-xs font-black text-amber-900">{plan.price} د.أ</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-700">
                <div className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
                <span>إمكانية إرسال واستقبال الصور والملفات</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-stone-700">
                <div className="w-4 h-4 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 stroke-[3]" />
                </div>
                <span>أرشيف محادثات غير محدود ومحمي</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 space-y-3 mt-auto">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-bold text-stone-400">تكلفة الباقة المختارة:</span>
              <div className="text-base font-black text-amber-900">
                {selectedMessagingPlan === '1_month' && `${appConfigState?.priceMessaging1Month ?? 5} دنانير / شهر`}
                {selectedMessagingPlan === '3_months' && `${appConfigState?.priceMessaging3Months ?? 12} دينار / 3 أشهر`}
                {selectedMessagingPlan === '6_months' && `${appConfigState?.priceMessaging6Months ?? 20} دينار / 6 أشهر`}
                {selectedMessagingPlan === '1_year' && `${appConfigState?.priceMessaging1Year ?? 35} دينار / سنة`}
              </div>
            </div>

            <button 
              type="button"
              onClick={() => {
                if (onUpgradeMessaging) {
                  onUpgradeMessaging(selectedMessagingPlan, business.id);
                } else {
                  const planTitle = selectedMessagingPlan === '1_month' ? 'شهر واحد' : selectedMessagingPlan === '3_months' ? '3 أشهر' : selectedMessagingPlan === '6_months' ? '6 أشهر' : 'سنة كاملة';
                  handleRequestService('premium_messaging', `ترقية باقة الرسائل (${planTitle})`, 'تم استلام طلبك لخدمة "ترقية نظام الرسائل والوسائط". سيتواصل معك فريقنا قريباً.');
                }
              }}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 py-3 rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Crown className="h-4 w-4 fill-stone-950" />
              <span>{isUpgraded ? 'تمديد اشتراك الرسائل' : 'ترقية باقة الرسائل الآن'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

