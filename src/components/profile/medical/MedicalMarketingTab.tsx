import React, { useState, useEffect } from 'react';
import { 
  Rocket, TrendingUp, Bell, Megaphone, 
  Sparkles, Check, MessageSquare
} from 'lucide-react';
import { Business } from '../../../types';
import { getAppConfig } from '../../../lib/demoDataHelper';

interface MedicalMarketingTabProps {
  business: Business;
  onOpenMarketingModal?: (serviceType: string, serviceName: string, successMessage: string, businessId?: string) => void;
}

export function MedicalMarketingTab({
  business,
  onOpenMarketingModal
}: MedicalMarketingTabProps) {
  const [appConfigState, setAppConfigState] = useState<any>({});

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

  return (
    <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-stone-200/80 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#ff9f1c]/20 to-amber-500/10 text-[#ff9f1c] flex items-center justify-center font-bold shadow-xs">
            <Rocket className="h-6 w-6 text-[#ff9f1c]" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">
              الخدمات التسويقية للعيادات 🚀
            </h2>
            <p className="text-xs text-stone-500 mt-1 leading-relaxed">
              عزز وصول عيادتك لآلاف المرضى والمراجعين في إربد بخدمات تسويق طبية مخصصة.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 1. Sponsored Listing */}
        <div className="bg-gradient-to-b from-emerald-50/40 via-white to-white border border-emerald-200/80 rounded-[24px] p-6 hover:shadow-lg hover:border-emerald-400 transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-[#ff9f1c] text-stone-950 text-[10px] font-black px-3 py-1 rounded-full shadow-xs">
            الأكثر طلباً 🔥
          </div>
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 text-[#1a4d2e] flex items-center justify-center mb-4">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h3 className="font-black text-base text-stone-900 mb-1">صدارة البحث الطبي (Sponsored)</h3>
            <p className="text-stone-500 text-xs mb-4 leading-relaxed font-medium">
              ظهور عيادتك في قمة قائمة نتائج البحث بالتخصص المعتمد في إربد مع وسام ممول ملفت.
            </p>
            <div className="space-y-2 mb-5 text-xs font-bold text-stone-700">
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>أعلى نسبة نقرات ومكالمات حجز مسبق</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>تحديد الكلمات المفتاحية للتخصص</span>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-stone-100 space-y-3 mt-auto">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs font-bold text-stone-400">التكلفة:</span>
              <div className="text-base font-black text-[#1a4d2e]">
                {appConfigState?.priceSponsored ?? 15} د.أ <span className="text-[10px] text-stone-400 font-normal">/ أسبوع</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRequestService('sponsored', 'صدارة البحث الطبي', 'تم استلام طلبك لخدمة صدارة البحث الطبي. سيتواصل معك فريقنا لتفعيلها فوراً.')}
              className="w-full bg-[#1a4d2e] hover:bg-[#143e24] text-white py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>طلب صدارة البحث</span>
            </button>
          </div>
        </div>

        {/* 2. Medical Push Notification */}
        <div className="bg-gradient-to-b from-sky-50/60 via-white to-white border border-sky-200 rounded-2xl p-6 hover:shadow-lg transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-3 left-3 bg-sky-100 text-sky-800 text-[10px] font-black px-3 py-1 rounded-full">
            وصول فوري ⚡
          </div>
          <div>
            <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center mb-4">
              <Bell className="h-6 w-6" />
            </div>
            <h3 className="font-black text-base text-stone-900 mb-1">إشعار طبي جماعي للمرضى</h3>
            <p className="text-stone-500 text-xs mb-4 leading-relaxed font-medium">
              إرسال إشعار فوري بشاشات هواتف آلاف مستخدمي المنصة للترويج لعروض العيادة والفحوصات.
            </p>
            <div className="space-y-2 mb-5 text-xs font-bold text-stone-700">
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                <span>رسالة مخصصة تصل مباشرة للشاشة</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                <span>تحويل المراجع لصفحة العيادة مباشرة</span>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-stone-100 space-y-3 mt-auto">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs font-bold text-stone-400">التكلفة:</span>
              <div className="text-base font-black text-sky-800">
                {appConfigState?.pricePushNotifications ?? 10} د.أ <span className="text-[10px] text-stone-400 font-normal">/ إشعار</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRequestService('push_notifications', 'إشعار طبي جماعي', 'تم استلام طلبك للإشعار الجماعي الطبي. سيتواصل معك فريقنا لإعداده.')}
              className="w-full bg-sky-700 hover:bg-sky-800 text-white py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Bell className="h-4 w-4" />
              <span>طلب إشعار جماعي</span>
            </button>
          </div>
        </div>

        {/* 3. Medical Top Banner */}
        <div className="bg-gradient-to-b from-purple-50/60 via-white to-white border border-purple-200 rounded-2xl p-6 hover:shadow-lg transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-3 left-3 bg-purple-100 text-purple-800 text-[10px] font-black px-3 py-1 rounded-full">
            واجهة الموقع 🖼️
          </div>
          <div>
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center mb-4">
              <Megaphone className="h-6 w-6" />
            </div>
            <h3 className="font-black text-base text-stone-900 mb-1">بانر إعلاني طبي بالصفحة الرئيسية</h3>
            <p className="text-stone-500 text-xs mb-4 leading-relaxed font-medium">
              حجز لافتة إعلانية رئيسية في أعلى الواجهة الأولى لموقع "شو في بإربد" بانتشار واجهة كاملة.
            </p>
            <div className="space-y-2 mb-5 text-xs font-bold text-stone-700">
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <span>تصميم احترافي طبي مجاني مرفق</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <span>أعلى معدل مشاهدة على مستوى المحافظة</span>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-stone-100 space-y-3 mt-auto">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs font-bold text-stone-400">التكلفة:</span>
              <div className="text-base font-black text-purple-800">
                {appConfigState?.priceHomepageBanner ?? 25} د.أ <span className="text-[10px] text-stone-400 font-normal">/ أسبوع</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRequestService('homepage_banner', 'بانر إعلاني طبي', 'تم استلام طلبك لخدمة البانر الطبي. سيتواصل معك فريقنا للتصميم.')}
              className="w-full bg-purple-700 hover:bg-purple-800 text-white py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Megaphone className="h-4 w-4" />
              <span>حجز البانر الطبي</span>
            </button>
          </div>
        </div>

        {/* 4. Messaging Upgrade */}
        <div className="bg-gradient-to-b from-amber-50/40 via-white to-white border border-amber-300 rounded-2xl p-6 hover:shadow-lg transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-3 left-3 bg-amber-100 text-amber-900 text-[10px] font-black px-3 py-1 rounded-full">
            المراسلة الطبية 💬
          </div>
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center mb-4">
              <MessageSquare className="h-6 w-6" />
            </div>
            <h3 className="font-black text-base text-stone-900 mb-1">ترقية الرسائل ومستندات المرضى</h3>
            <p className="text-stone-500 text-xs mb-4 leading-relaxed font-medium">
              تمكين استقبال صور التحاليل والأشعة والتقارير مباشرة من المراجعين.
            </p>
            <div className="space-y-2 mb-5 text-xs font-bold text-stone-700">
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                <span>أرشيف غير محدود لمراسلات المرضى</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                <span>ردود تلقائية في أوقات العطل</span>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-stone-100 space-y-3 mt-auto">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-xs font-bold text-stone-400">يبدأ من:</span>
              <div className="text-base font-black text-amber-900">
                {appConfigState?.priceMessaging1Month ?? 5} د.أ <span className="text-[10px] text-stone-400 font-normal">/ شهر</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleRequestService('premium_messaging', 'ترقية نظام المراسلة والوسائط الطبية', 'تم تسجيل طلبك لترقية نظام الرسائل والوسائط.')}
              className="w-full bg-amber-800 hover:bg-amber-900 text-white py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              <span>طلب الترقية</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
