import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { 
  Check, Sparkles, Crown, MapPin, 
  ArrowLeft, Phone, Building2, Plus, ArrowRight
} from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { Business } from '../types';
import { VipUpgradeRequestModal } from '../components/vip/VipUpgradeRequestModal';

export function Pricing() {
  const { vipPlans } = useSystemSettings();
  const { currentUser, ownedBusinesses } = useAuth();
  const navigate = useNavigate();
  
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  
  // Selection states
  const [showBusinessSelectModal, setShowBusinessSelectModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  
  // Upgrade Modal states
  const [upgradeBusiness, setUpgradeBusiness] = useState<Business | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Only show active plans if we implemented an active flag, else show all
  const activePlans = vipPlans.filter(p => p.active !== false);

  const handlePlanAction = (planId: string) => {
    if (!currentUser) {
      navigate('/register');
      return;
    }
    
    if (planId === 'basic') {
      navigate('/add-business');
      return;
    }
    
    // For VIP / Pay per use
    if (ownedBusinesses.length === 0) {
      navigate('/add-business');
    } else {
      setSelectedPlanId(planId);
      setShowBusinessSelectModal(true);
    }
  };

  const handleBusinessSelection = (business: Business) => {
    setShowBusinessSelectModal(false);
    
    if (selectedPlanId === 'golden') {
      setUpgradeBusiness(business);
      setShowUpgradeModal(true);
    } else if (selectedPlanId === 'pay_per_use') {
      // Direct WhatsApp redirect for marketing services
      const msg = encodeURIComponent(`السلام عليكم، بخصوص محلي (${business.name})، أرغب بالاستفسار عن الحملات التسويقية والخدمات الإضافية.\nمعرف المحل: ${business.id}`);
      window.open(`https://wa.me/962790000000?text=${msg}`, '_blank');
    }
  };

  const handleAddNewBusiness = () => {
    setShowBusinessSelectModal(false);
    navigate('/add-business');
  };

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

        {/* Psychological Billing Toggle */}
        <div className="pt-6 flex justify-center">
          <div className="bg-stone-100 p-1.5 rounded-2xl inline-flex items-center gap-1 border border-stone-200">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-white text-stone-800 shadow-sm'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              الدفع الشهري
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`relative px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                billingCycle === 'yearly'
                  ? 'bg-[#1a4d2e] text-white shadow-md'
                  : 'text-[#1a4d2e] hover:bg-stone-200'
              }`}
            >
              <span>الدفع السنوي</span>
              <span className="bg-amber-400 text-[#2d2a26] text-[9px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
                وفر 48% 🔥
              </span>
            </button>
          </div>
        </div>
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
                <span>الأكثر طلباً ومبيعاً لدعم المبيعات</span>
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
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1 text-[#2d2a26]">
                    <span className="text-3xl font-black">سعر رمزي جداً</span>
                    <span className="text-xs font-bold text-stone-500 mr-1">/ تفعيل للأبد</span>
                  </div>
                  <p className="text-[10px] text-amber-600 font-extrabold bg-amber-50 px-2 py-1 rounded inline-block">
                    ✓ تفعيل فوري مخصص عبر الواتساب
                  </p>
                </div>
              ) : plan.id === 'pay_per_use' || plan.price === 0 ? (
                <div className="flex items-baseline gap-1 text-[#2d2a26]">
                  <span className="text-3xl font-black">حسب الطلب</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {billingCycle === 'monthly' ? (
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1 text-[#2d2a26]">
                        <span className="text-4xl font-black">19</span>
                        <span className="text-lg font-bold">د.أ</span>
                        <span className="text-sm font-medium text-stone-500 mr-1">/ شهرياً</span>
                      </div>
                      <p className="text-[10px] text-stone-400 font-bold">التكلفة السنوية الإجمالية: 228 د.أ</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex items-baseline gap-1 text-[#2d2a26]">
                        <span className="text-4xl font-black">119</span>
                        <span className="text-lg font-bold">د.أ</span>
                        <span className="text-sm font-medium text-stone-500 mr-1">/ سنوياً</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-[11px] text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-lg inline-block self-start">
                          🔥 ما يعادل 9.9 د.أ فقط شهرياً!
                        </p>
                        <p className="text-[10px] text-stone-400 font-bold">لقد وفرت 109 د.أ سنوياً مقارنة بالدفع الشهري!</p>
                      </div>
                    </div>
                  )}
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
              <button 
                onClick={() => handlePlanAction(plan.id)}
                className={`w-full py-3 sm:py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                  plan.popular 
                    ? 'bg-[#1a4d2e] text-white hover:bg-[#133b22]' 
                    : 'bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span>ابدأ الآن - {plan.badge}</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
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
          <button 
            onClick={() => handlePlanAction('basic')}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#ff9f1c] hover:bg-[#e68a00] text-white rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>سجل حسابك كصاحب عمل وابدأ فوراً</span>
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Link 
            to="/contact" 
            className="w-full sm:w-auto px-8 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>لدي استفسار، تواصلوا معي</span>
            <Phone className="h-4 w-4" />
          </Link>
        </div>
      </div>
      
      {/* Business Selection Modal */}
      {showBusinessSelectModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95" dir="rtl">
            <div className="p-6 border-b border-stone-100 flex items-center justify-between">
              <h3 className="text-xl font-black text-[#2d2a26]">اختر المحل الذي تريد ترقيته</h3>
              <button 
                onClick={() => setShowBusinessSelectModal(false)}
                className="p-2 bg-stone-100 hover:bg-stone-200 rounded-full transition-colors text-stone-500 cursor-pointer"
              >
                <Check className="h-5 w-5 hidden" /> {/* Just spacing placeholder if needed, use close icon if available but sticking to simple X */}
                <span className="font-bold text-sm">إغلاق</span>
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {ownedBusinesses.map(bus => {
                const isAlreadyOnPlan = bus.packagePlan === selectedPlanId;
                return (
                  <div key={bus.id} className={`flex items-center justify-between p-4 rounded-2xl border ${isAlreadyOnPlan ? 'bg-stone-50 border-stone-200 opacity-60' : 'bg-white border-stone-200 hover:border-[#1a4d2e] cursor-pointer'}`}
                       onClick={() => !isAlreadyOnPlan && handleBusinessSelection(bus)}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-stone-100 rounded-xl overflow-hidden flex items-center justify-center">
                        {bus.logoUrl || bus.image ? (
                          <img src={bus.logoUrl || bus.image} alt={bus.name} className="w-full h-full object-cover" />
                        ) : (
                          <Building2 className="h-6 w-6 text-stone-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-black text-stone-800">{bus.name}</h4>
                        <p className="text-xs text-stone-500 font-medium">{bus.category}</p>
                      </div>
                    </div>
                    <div>
                      {isAlreadyOnPlan ? (
                        <span className="text-[10px] font-bold bg-stone-200 text-stone-600 px-2 py-1 rounded-lg">مشترك بالفعل</span>
                      ) : (
                        <span className="text-xs font-bold text-[#1a4d2e] bg-emerald-50 px-3 py-1.5 rounded-lg flex items-center gap-1">
                          ترقية
                          <ArrowRight className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              
              <button 
                onClick={handleAddNewBusiness}
                className="w-full p-4 rounded-2xl border-2 border-dashed border-stone-300 hover:border-[#1a4d2e] hover:bg-stone-50 transition-all flex items-center justify-center gap-2 cursor-pointer text-stone-600 hover:text-[#1a4d2e] font-bold"
              >
                <Plus className="h-5 w-5" />
                <span>إضافة محل جديد لترقيته</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Request Modal for Golden VIP */}
      {showUpgradeModal && upgradeBusiness && (
        <VipUpgradeRequestModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          business={upgradeBusiness}
          initialCycle={billingCycle}
        />
      )}
    </div>
  );
}
