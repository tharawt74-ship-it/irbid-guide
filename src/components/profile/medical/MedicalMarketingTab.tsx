import React from 'react';
import { 
  Rocket, TrendingUp, Bell, Megaphone, 
  Sparkles, Check, MessageSquare
} from 'lucide-react';
import { Business } from '../../../types';

interface MedicalMarketingTabProps {
  business: Business;
  onOpenMarketingModal?: (serviceType: string, serviceName: string, successMessage: string, businessId?: string) => void;
}

export function MedicalMarketingTab({
  business,
  onOpenMarketingModal
}: MedicalMarketingTabProps) {
  const handleRequestService = (type: string, title: string, successMsg: string) => {
    if (onOpenMarketingModal) {
      onOpenMarketingModal(type, title, successMsg, business.id);
    } else {
      alert("يرجى استخدام نموذج الطلب من لوحة التحكم الرئيسية.");
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 text-right" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-900 via-[#1a4d2e] to-teal-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-md">
        <div className="absolute top-0 left-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-300/30 px-3.5 py-1 rounded-full text-amber-200 text-xs font-black">
            <Rocket className="h-4 w-4 text-amber-300 animate-bounce" />
            <span>مركز التسويق والترويج الطبي الاحترافي</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            ضاعف مراجعي عيادتك ورسخ حضورك الطبي في إربد 🚀
          </h2>
          <p className="text-stone-200 text-xs sm:text-sm max-w-2xl leading-relaxed font-medium">
            اختر الباقات والحملات الإعلانية المخصصة للرعاية الطبية للوصول المباشر لأكثر من 50,000 زائر أسبوعياً لموقع "شو في بإربد".
          </p>
          <div className="pt-2 flex items-center gap-3 text-xs font-bold text-amber-200">
            <span className="flex items-center gap-1"><Check className="h-4 w-4 text-amber-400" /> توثيق معتمد</span>
            <span className="flex items-center gap-1"><Check className="h-4 w-4 text-amber-400" /> نتائج فورية</span>
            <span className="flex items-center gap-1"><Check className="h-4 w-4 text-amber-400" /> دعم فريق التسويق</span>
          </div>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {/* 1. Sponsored Medical Listing */}
        <div className="bg-gradient-to-b from-amber-50/60 via-white to-white border-2 border-amber-300 rounded-2xl p-5 hover:shadow-lg transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-3 left-3 bg-amber-400 text-amber-950 text-[10px] font-black px-2.5 py-0.5 rounded-full">
            الأكثر طلب للعيادات 🔥
          </div>
          <div>
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
              <TrendingUp className="h-5 w-5" />
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
          <button
            type="button"
            onClick={() => handleRequestService('sponsored', 'صدارة البحث الطبي', 'تم استلام طلبك لخدمة صدارة البحث الطبي. سيتواصل معك فريقنا لتفعيلها فوراً.')}
            className="w-full bg-[#1a4d2e] hover:bg-[#143e24] text-white py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span>طلب صدارة البحث (15 د.أ / أسبوع)</span>
          </button>
        </div>

        {/* 2. Medical Push Notification */}
        <div className="bg-gradient-to-b from-sky-50/60 via-white to-white border border-sky-200 rounded-2xl p-5 hover:shadow-lg transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-3 left-3 bg-sky-100 text-sky-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">
            وصول فوري ⚡
          </div>
          <div>
            <div className="w-11 h-11 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center mb-3">
              <Bell className="h-5 w-5" />
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
          <button
            type="button"
            onClick={() => handleRequestService('push_notifications', 'إشعار طبي جماعي', 'تم استلام طلبك للإشعار الجماعي الطبي. سيتواصل معك فريقنا لإعداده.')}
            className="w-full bg-sky-700 hover:bg-sky-800 text-white py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Bell className="h-4 w-4" />
            <span>طلب إشعار جماعي للمرضى</span>
          </button>
        </div>

        {/* 3. Medical Top Banner */}
        <div className="bg-gradient-to-b from-purple-50/60 via-white to-white border border-purple-200 rounded-2xl p-5 hover:shadow-lg transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-3 left-3 bg-purple-100 text-purple-800 text-[10px] font-black px-2.5 py-0.5 rounded-full">
            واجهة الموقع 🖼️
          </div>
          <div>
            <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center mb-3">
              <Megaphone className="h-5 w-5" />
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
          <button
            type="button"
            onClick={() => handleRequestService('homepage_banner', 'بانر إعلاني طبي', 'تم استلام طلبك لخدمة البانر الطبي. سيتواصل معك فريقنا للتصميم.')}
            className="w-full bg-purple-700 hover:bg-purple-800 text-white py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Megaphone className="h-4 w-4" />
            <span>حجز البانر الطبي الرئيسي</span>
          </button>
        </div>

        {/* 4. Messaging Upgrade */}
        <div className="bg-gradient-to-b from-amber-50/40 via-white to-white border border-amber-300 rounded-2xl p-5 hover:shadow-lg transition-all flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-3 left-3 bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-0.5 rounded-full">
            المراسلة الطبية 💬
          </div>
          <div>
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center mb-3">
              <MessageSquare className="h-5 w-5" />
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
          <button
            type="button"
            onClick={() => handleRequestService('sponsored', 'ترقية نظام المراسلة والوسائط الطبية', 'تم تسجيل طلبك لترقية نظام الرسائل والوسائط.')}
            className="w-full bg-amber-800 hover:bg-amber-900 text-white py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            <span>طلب ترقية المراسلة والوسائط</span>
          </button>
        </div>
      </div>
    </div>
  );
}
