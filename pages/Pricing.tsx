import React, { useState } from 'react';
import { Link } from 'react-router';
import { 
  Check, Sparkles, Crown, MapPin, 
  ArrowLeft, Phone
} from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { useSystemSettings } from '../contexts/SystemSettingsContext';

export function Pricing() {
  const { vipPlans } = useSystemSettings();
  
  // Only show active plans if we implemented an active flag, else show all
  const activePlans = vipPlans.filter(p => p.active !== false);

  return (
    <div className="w-full space-y-12 sm:space-y-16 pb-16">
      <SEO 
        title="أضف محلك - باقات الاشتراك | دليل إربد"
        description="انضم لأكبر منصة تجارية في إربد وضاعف زبائنك. استعرض باقات الاشتراك لإضافة محلك أو شركتك في دليل شو في بإربد الشامل وابدأ باستقبال العملاء الجدد."
        keywords={['أضف محلك', 'باقات إربد', 'تسجيل المحلات', 'تسويق في إربد', 'إعلانات إربد']}
        canonicalUrl="https://shofierbid.com/pricing"
      />
      {/* Header / Hero */}
      <div className="text-center space-y-4 max-w-3xl mx-auto pt-4">
        <div className="inline-flex items-center gap-2 bg-[#ff9f1c]/15 text-[#e68a00] px-4 py-1.5 rounded-full text-xs sm:text-sm font-black border border-[#ff9f1c]/30">
          <Sparkles className="h-4 w-4 text-[#ff9f1c]" />
          <span>باقات الاشتراك والترويج لأصحاب الأعمال في إربد</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#2d2a26] tracking-tight leading-tight">
          انضم لأكبر منصة تجارية في <span className="text-[#1a4d2e]">إربد</span> وضاعف زبائنك
        </h1>

        <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
          اختر الباقة الأنسب لحجم نشاطك التجاري؛ من التواجد الرقمي الأساسي إلى الإدارة الذكية المتكاملة والحملات الترويجية الفورية.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch max-w-7xl mx-auto">
        {activePlans.map((plan, idx) => (
          <div 
            key={plan.id}
            className={`rounded-3xl border p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-md transition-all relative ${
              plan.popular 
                ? 'bg-white border-[#ff9f1c] ring-2 ring-[#ff9f1c]/20 lg:-mt-4' 
                : 'bg-white border-[#e5e1da] hover:border-[#1a4d2e]/30'
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black shadow-md flex items-center gap-1.5 whitespace-nowrap">
                <Crown className="h-3.5 w-3.5" />
                <span>الأكثر طلباً ومبيعاً</span>
              </div>
            )}
            
            <div className="space-y-6">
              <div className="space-y-2">
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${plan.badgeColor}`}>
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{plan.badge}</span>
                </div>
                <h2 className="text-2xl font-black text-[#2d2a26]">{plan.name}</h2>
              </div>
              
              {plan.id === 'basic' ? (
                <div className="flex items-baseline gap-1 text-[#2d2a26]">
                  <span className="text-4xl font-black">مجاناً</span>
                </div>
              ) : plan.id === 'pay_per_use' || plan.price === 0 ? (
                <div className="flex items-baseline gap-1 text-[#2d2a26]">
                  <span className="text-3xl font-black">حسب الطلب</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1 text-[#2d2a26]">
                  <span className="text-4xl font-black">{plan.price}</span>
                  <span className="text-lg font-bold">د.أ</span>
                  <span className="text-sm font-medium text-stone-500 mr-1">/ {plan.period}</span>
                </div>
              )}

              <div className="border-t border-[#e5e1da] pt-4">
                <h3 className="text-xs font-black text-stone-400 uppercase tracking-wider mb-4">
                  الميزات المشمولة:
                </h3>
                <ul className="space-y-3.5 text-xs sm:text-sm text-stone-700">
                  {plan.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start gap-2.5">
                      <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="font-medium text-stone-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-8 mt-auto">
              <Link 
                to="/register" 
                className={`w-full py-3 sm:py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                  plan.popular 
                    ? 'bg-[#1a4d2e] text-white hover:bg-[#133b22]' 
                    : 'bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span>ابدأ الآن - {plan.badge}</span>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>
      
      {/* Footer Info */}
      <div className="max-w-4xl mx-auto text-center space-y-6 pt-10 border-t border-[#e5e1da]">
        <h3 className="text-2xl font-black text-[#2d2a26]">هل أنت جاهز لتكبير مشروعك في إربد؟</h3>
        <p className="text-stone-600 leading-relaxed text-sm">
          آلاف الأهالي والزوار يبحثون عن الخدمات والمطاعم في مدينتك. انضم الآن ولا تفوت الفرصة لزيادة مبيعاتك وتعزيز علامتك التجارية.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link 
            to="/register" 
            className="w-full sm:w-auto px-8 py-3.5 bg-[#ff9f1c] hover:bg-[#e68a00] text-white rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>سجل حسابك كصاحب عمل مجاناً الآن</span>
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Link 
            to="/contact" 
            className="w-full sm:w-auto px-8 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>لدي استفسار، تواصلوا معي</span>
            <Phone className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
