import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { 
  Check, Sparkles, Crown, MapPin, 
  ArrowLeft, Phone, Building2, Plus, ArrowRight,
  Tv, TrendingUp, Bell, Video, Smartphone,
  Store, Stethoscope, Gift, ShieldCheck, HeartPulse
} from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { Business } from '../types';
import { VipUpgradeRequestModal } from '../components/vip/VipUpgradeRequestModal';
import { isMedicalBusiness } from '../lib/medicalHelper';

const MARKETING_SERVICES_DATA = [
  {
    id: 'banner',
    title: 'إعلان بانر ترويجي متحرك',
    price: '29 د.أ / أسبوع',
    description: 'وضع محلك أو عرضك الخاص في السلايدر الرئيسي أعلى الصفحة الرئيسية للمنصة لضمان أعلى نسبة مشاهدة واهتمام من زوار إربد.',
    icon: Tv,
    whatsappText: 'أرغب في حجز مساحة إعلان بانر ترويجي متحرك في الصفحة الرئيسية لمحلي.',
    colorClass: 'bg-blue-50 text-blue-700 border-blue-200',
    iconColor: 'text-blue-600'
  },
  {
    id: 'sponsored',
    title: 'صدارة نتائج البحث والترشيح Sponsored',
    price: '19 د.أ / أسبوع',
    description: 'احصل على الأولوية القصوى والظهور الدائم في أعلى نتائج البحث والتصنيفات وفي قائمة "المحلات المقترحة" للمستخدمين.',
    icon: TrendingUp,
    whatsappText: 'أرغب في تفعيل خدمة صدارة نتائج البحث والتصنيف Sponsored لمحلي.',
    colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconColor: 'text-emerald-600'
  },
  {
    id: 'notifications',
    title: 'إرسال إشعار ترويجي جماعي فوري',
    price: '15 د.أ / إشعار',
    description: 'أرسل إشعاراً فورياً ومباشراً يصل لجميع مستخدمي المنصة في إربد للإعلان عن افتتاح، عرض جديد، أو فعالية خاصة بمحلك.',
    icon: Bell,
    whatsappText: 'أرغب في إرسال إشعار ترويجي جماعي فوري لجميع مستخدمي المنصة للإعلان عن محلي.',
    colorClass: 'bg-amber-50 text-amber-700 border-amber-200',
    iconColor: 'text-amber-600'
  }
];

const MEDICAL_MARKETING_SERVICES_DATA = [
  {
    id: 'medical_banner',
    title: 'إعلان بانر ترويجي للعيادة أو المركز',
    price: '29 د.أ / أسبوع',
    description: 'إبراز اسم الطبيب، التخصص، أو الخدمات المتميزة في السلايدر الرئيسي أعلى الصفحة الرئيسية للمنصة لضمان أعلى وصول للمراجعين في إربد.',
    icon: Tv,
    whatsappText: 'أرغب في حجز مساحة إعلان بانر ترويجي في الصفحة الرئيسية لمنشأتي الطبية.',
    colorClass: 'bg-blue-50 text-blue-700 border-blue-200',
    iconColor: 'text-blue-600'
  },
  {
    id: 'medical_sponsored',
    title: 'صدارة نتائج البحث والتصنيف الطبي Sponsored',
    price: '19 د.أ / أسبوع',
    description: 'احصل على الأولوية القصوى والظهور الدائم في أعلى نتائج البحث الطبي وتصنيفات الأطباء وفي قائمة "المراكز الموصى بها" للمرضى.',
    icon: TrendingUp,
    whatsappText: 'أرغب في تفعيل خدمة صدارة نتائج البحث والتصنيف الطبي Sponsored لعيادتي/مركزي.',
    colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconColor: 'text-emerald-600'
  },
  {
    id: 'medical_notifications',
    title: 'إشعار ترويجي جماعي لحملة فحص أو طبيب زائر',
    price: '15 د.أ / إشعار',
    description: 'أرسل إشعاراً فورياً ومباشراً يصل لهواتف مستخدمي المنصة في إربد للإعلان عن افتتاح قسم جديد، استضافة استشاري زائر، أو إطلاق حملة فحص دوري.',
    icon: Bell,
    whatsappText: 'أرغب في إرسال إشعار ترويجي جماعي لمستخدمي المنصة للإعلان عن حملة فحص أو افتتاح قسم جديد.',
    colorClass: 'bg-amber-50 text-amber-700 border-amber-200',
    iconColor: 'text-amber-600'
  }
];

export function Pricing() {
  const { vipPlans, globalSettings } = useSystemSettings();
  const { currentUser, ownedBusinesses } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const initialSector = (searchParams.get('tab') === 'medical' || searchParams.get('type') === 'medical') ? 'medical' : 'commercial';
  const [sectorTab, setSectorTab] = useState<'commercial' | 'medical'>(initialSector);
  
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  
  // Selection states
  const [showBusinessSelectModal, setShowBusinessSelectModal] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedServiceWhatsapp, setSelectedServiceWhatsapp] = useState<string | null>(null);
  
  // Upgrade Modal states
  const [upgradeBusiness, setUpgradeBusiness] = useState<Business | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  const handleTabChange = (tab: 'commercial' | 'medical') => {
    setSectorTab(tab);
    const newParams = new URLSearchParams(searchParams);
    if (tab === 'medical') {
      newParams.set('tab', 'medical');
    } else {
      newParams.delete('tab');
      newParams.delete('type');
    }
    setSearchParams(newParams, { replace: true });
  };
  
  // Split subscription package plans from on-demand/pay-per-use marketing services
  const activePlans = vipPlans.filter(p => p.active !== false);
  const subscriptionPlans = activePlans.filter(p => p.id !== 'pay_per_use');

  const handlePlanAction = (planId: string) => {
    if (sectorTab === 'medical') {
      if (planId === 'basic') {
        navigate('/add-medical-facility?package=basic');
        return;
      }
      
      // For medical golden VIP
      if (!currentUser || ownedBusinesses.length === 0) {
        navigate('/add-medical-facility?package=golden');
        return;
      }
      
      setSelectedPlanId(planId);
      setSelectedServiceWhatsapp(null);
      setShowBusinessSelectModal(true);
      return;
    }

    if (!currentUser || ownedBusinesses.length === 0) {
      navigate(`/contact?package=${planId}`);
      return;
    }
    
    if (planId === 'basic') {
      navigate(`/contact?package=${planId}`);
      return;
    }
    
    // For VIP
    setSelectedPlanId(planId);
    setSelectedServiceWhatsapp(null);
    setShowBusinessSelectModal(true);
  };

  const handleMarketingServiceAction = (whatsappText: string) => {
    if (!currentUser) {
      navigate('/register');
      return;
    }

    const whatsappNum = globalSettings?.whatsappNumber || '962790000000';

    if (ownedBusinesses.length === 0) {
      // Direct WhatsApp if they don't have registered businesses yet
      const msg = encodeURIComponent(`السلام عليكم، أرغب بالاستفسار عن الخدمات الإعلانية: ${whatsappText}`);
      window.open(`https://wa.me/${whatsappNum}?text=${msg}`, '_blank');
    } else {
      setSelectedPlanId('pay_per_use');
      setSelectedServiceWhatsapp(whatsappText);
      setShowBusinessSelectModal(true);
    }
  };

  const handleBusinessSelection = (business: Business) => {
    setShowBusinessSelectModal(false);
    const whatsappNum = globalSettings?.whatsappNumber || '962790000000';
    
    if (selectedPlanId === 'golden') {
      setUpgradeBusiness(business);
      setShowUpgradeModal(true);
    } else if (selectedPlanId === 'pay_per_use') {
      // Direct WhatsApp redirect for marketing services with selected business context
      const serviceQuery = selectedServiceWhatsapp || 'أرغب بالاستفسار عن الحملات التسويقية والخدمات الإضافية.';
      const msg = encodeURIComponent(`السلام عليكم، بخصوص منشأتي (${business.name})، ${serviceQuery}\nمعرف المنشأة في الدليل: ${business.id}`);
      window.open(`https://wa.me/${whatsappNum}?text=${msg}`, '_blank');
    }
  };

  const handleAddNewBusiness = () => {
    setShowBusinessSelectModal(false);
    if (sectorTab === 'medical') {
      navigate('/add-medical-facility');
    } else {
      navigate('/contact?type=business');
    }
  };

  const relevantBusinesses = ownedBusinesses.filter(b => {
    const isMed = isMedicalBusiness(b) || !!b.medicalProfile || b.requestType === 'medical_facility_registration';
    return sectorTab === 'medical' ? isMed : !isMed;
  });

  const displayBusinesses = relevantBusinesses.length > 0 ? relevantBusinesses : ownedBusinesses;

  return (
    <div className="w-full space-y-12 sm:space-y-16 pb-16">
      <SEO 
        title={sectorTab === 'medical' ? "باقات اشتراك المنشآت الطبية والعيادات | دليل إربد الطبي" : "أضف محلك - باقات الاشتراك | دليل إربد"}
        description={sectorTab === 'medical' 
          ? "انضم لأكبر دليل طبي ورعاية صحية في إربد. باقات مخصصة للعيادات والمراكز والمختبرات لحجز المواعيد والتوثيق والظهور المتقدم مع شهر مجاني VIP للمنشآت الجديدة."
          : "انضم لأكبر منصة تجارية في إربد وضاعف زبائنك. استعرض باقات الاشتراك لإضافة محلك أو شركتك في دليل شو في بإربد الشامل وابدأ باستقبال العملاء الجدد."}
        keywords={['أضف محلك', 'باقات إربد', 'تسجيل المحلات', 'عيادات إربد', 'أطباء إربد', 'تسويق في إربد', 'إعلانات إربد']}
        canonicalUrl="https://shofierbid.com/pricing"
      />

      {/* Header / Hero */}
      <div className="text-center space-y-5 max-w-3xl mx-auto pt-4 px-4">
        {/* Top 2 Tabs Selector */}
        <div className="flex justify-center pb-2">
          <div className="bg-stone-100/95 p-1.5 rounded-2xl sm:rounded-3xl inline-flex items-center gap-1.5 border border-stone-200/80 shadow-xs max-w-full">
            <button
              type="button"
              onClick={() => handleTabChange('commercial')}
              className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                sectorTab === 'commercial'
                  ? 'bg-white text-stone-900 shadow-sm border border-stone-200/60'
                  : 'text-stone-500 hover:text-stone-800 hover:bg-stone-200/50'
              }`}
            >
              <Store className={`h-4 w-4 ${sectorTab === 'commercial' ? 'text-[#1a4d2e]' : 'text-stone-400'}`} />
              <span>المحلات والأنشطة التجارية</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('medical')}
              className={`px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                sectorTab === 'medical'
                  ? 'bg-[#1a4d2e] text-white shadow-md'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <Stethoscope className={`h-4 w-4 ${sectorTab === 'medical' ? 'text-emerald-300' : 'text-emerald-600'}`} />
              <span>المنشآت والمراكز الطبية</span>
            </button>
          </div>
        </div>

        {sectorTab === 'commercial' ? (
          <>
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
          </>
        ) : (
          <>
            <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-800 px-4 py-1.5 rounded-full text-xs sm:text-sm font-black border border-emerald-200">
              <HeartPulse className="h-4 w-4 text-emerald-600" />
              <span>باقات الدليل الطبي ومراكز الرعاية الصحية في إربد</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#2d2a26] tracking-tight leading-tight">
              عزز تواجدك الطبي وكن الخيار الأول للمراجعين في <span className="text-[#1a4d2e]">إربد</span>
            </h1>

            <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
              باقات مصممة خصيصاً للأطباء، العيادات، المراكز الطبية، الصيدليات، والمختبرات؛ لبناء الموثوقية العالية، وتسهيل حجز المواعيد وإبراز التأمينات المعتمدة.
            </p>
          </>
        )}

        {/* Psychological Billing Toggle */}
        <div className="pt-4 flex justify-center">
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

      {/* ========================================================= */}
      {/* TAB 1: COMMERCIAL PRICING CARDS                           */}
      {/* ========================================================= */}
      {sectorTab === 'commercial' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto px-4">
            {subscriptionPlans.map((plan) => (
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
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-1 text-[#2d2a26]">
                          <span className="text-3xl font-black">سعر رمزي جداً</span>
                          <span className="text-xs font-bold text-stone-500 mr-1">/ تفعيل للأبد</span>
                        </div>
                        <p className="text-[10px] text-amber-700 font-extrabold bg-amber-50 px-2 py-1 rounded inline-block border border-amber-200/60">
                          ✓ تفعيل فوري مخصص عبر الواتساب
                        </p>
                      </div>

                      {/* Highlighted Welcome Gift Box */}
                      <div className="bg-gradient-to-r from-amber-50 via-orange-50/70 to-amber-50 border border-amber-300/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-3xs">
                        <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Gift className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                            <span>هدية انضمام استثنائية</span>
                            <span className="bg-amber-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black">مجاناً 🎁</span>
                          </div>
                          <p className="text-[11px] font-extrabold text-amber-800 leading-snug mt-1">
                            شهر مجاني تجريبي لباقة الـ VIP للمنشآت والمحلات المضافة جديد لأول مرة على موقع شو في بإربد!
                          </p>
                        </div>
                      </div>
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
                            <span className="text-4xl font-black">9.9</span>
                            <span className="text-lg font-bold">د.أ</span>
                            <span className="text-xs font-bold text-stone-500 mr-1">/ شهرياً (بالدفع السنوي)</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <p className="text-[11px] text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-lg inline-block self-start">
                              🔥 ما يعادل بالسنة 119 د.أ فقط كاملة
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
                      {((plan.id === 'golden' && plan.features.length <= 8) ? [
                        ...plan.features,
                        'معرض الصور المتطور وأجواء المحل الاستكشافية 📸',
                        'الرسائل والمحادثات الحية والمباشرة مع الزبائن 💬',
                        'تضمين فيديوهات ريلز (Reels) ترويجية بداخل صفحتك 🎬'
                      ] : plan.features).map((feature, fIdx) => (
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

          {/* Commercial Marketing Services */}
          <div className="max-w-7xl mx-auto px-4 pt-8">
            <div className="bg-stone-50/70 border border-stone-200/60 rounded-3xl p-6 sm:p-10 space-y-8">
              <div className="text-center max-w-2xl mx-auto space-y-3">
                <div className="inline-flex items-center gap-1.5 bg-[#1a4d2e]/10 text-[#1a4d2e] px-3.5 py-1 rounded-full text-xs font-black border border-[#1a4d2e]/20">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>خدمات ترويجية إضافية - حسب الطلب</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#2d2a26]">
                  🛍️ خدمات تسويقية تدفع عند الشراء فقط
                </h2>
                <p className="text-stone-500 text-xs sm:text-sm leading-relaxed">
                  عزز مبيعاتك واكتسب مئات الزبائن الجدد فوراً من خلال حلولنا الترويجية المخصصة. هذه الخدمات تدفع <span className="font-bold text-stone-800 underline">مرة واحدة عند الطلب وليست باقة اشتراك دورية</span>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MARKETING_SERVICES_DATA.map((service) => {
                  const IconComp = service.icon;
                  return (
                    <div 
                      key={service.id}
                      className="bg-white border border-stone-200/80 rounded-2xl p-5 hover:border-[#1a4d2e] hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className={`p-2.5 rounded-xl ${service.colorClass}`}>
                            <IconComp className="h-5 w-5 stroke-[2.5]" />
                          </div>
                          <span className="text-xs font-black bg-stone-100 text-stone-700 border border-stone-200 px-2.5 py-1 rounded-lg">
                            {service.price}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <h3 className="font-black text-stone-800 text-sm sm:text-base">{service.title}</h3>
                          <p className="text-stone-500 text-xs leading-relaxed">{service.description}</p>
                        </div>
                      </div>

                      <div className="pt-5 mt-4 border-t border-stone-100">
                        <button
                          onClick={() => handleMarketingServiceAction(service.whatsappText)}
                          className="w-full py-2.5 sm:py-3 bg-stone-50 text-stone-800 border border-stone-200 hover:bg-[#1a4d2e] hover:text-white hover:border-[#1a4d2e] rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <span>اطلب الخدمة الآن</span>
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========================================================= */}
      {/* TAB 2: MEDICAL FACILITIES PRICING CARDS                   */}
      {/* ========================================================= */}
      {sectorTab === 'medical' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-4xl mx-auto px-4">
            {/* 1. Medical Basic Plan */}
            <div className="rounded-3xl border border-[#e5e1da] bg-white p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:border-emerald-600/40 hover:shadow-md transition-all relative">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-stone-100 text-stone-700">
                    <MapPin className="h-3.5 w-3.5 text-stone-500" />
                    <span>التواجد والتعريف الطبي</span>
                  </div>
                  <h2 className="text-2xl font-black text-[#2d2a26]">الباقة الأساسية الطبية</h2>
                </div>

                <div className="space-y-1">
                  <div className="flex items-baseline gap-1 text-[#2d2a26]">
                    <span className="text-3xl font-black">سعر رمزي جداً</span>
                    <span className="text-xs font-bold text-stone-500 mr-1">/ تفعيل للأبد</span>
                  </div>
                  <p className="text-[10px] text-emerald-700 font-extrabold bg-emerald-50 px-2 py-1 rounded inline-block border border-emerald-200/60">
                    ✓ تفعيل دائم مع هدية انضمام ترحيبية خاصة
                  </p>
                </div>

                {/* Highlighted Welcome Gift Box */}
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50/70 to-emerald-50 border border-emerald-300/80 rounded-2xl p-4 flex items-center gap-3.5 shadow-3xs">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Gift className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                      <span>هدية انضمام استثنائية</span>
                      <span className="bg-emerald-600 text-white text-[9px] px-2 py-0.5 rounded-full font-black">مجاناً 🎁</span>
                    </div>
                    <p className="text-[11px] font-extrabold text-emerald-800 leading-snug mt-1">
                      شهر مجاني تجريبي لباقة الـ VIP للمنشآت المضافة جديد لأول مرة على موقع شو في بإربد!
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#e5e1da] pt-4">
                  <h3 className="text-xs font-black text-stone-400 uppercase tracking-wider mb-4">
                    الميزات المشمولة:
                  </h3>
                  <ul className="space-y-3.5 text-xs sm:text-sm text-stone-700">
                    <li className="flex items-start gap-2.5">
                      <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="font-medium text-stone-700">بطاقة تعريفية رقمية متكاملة (الاسم، اللقب العلمي، والتخصص الرئيسي)</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="font-medium text-stone-700">أرقام هواتف العيادة ورابط الواتساب الرسمي المباشر للاستفسارات السريعة</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="font-medium text-stone-700">الموقع الجغرافي الدقيق على خرائط Google Maps مع اسم المجمع والطابق</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="font-medium text-stone-700">جدول أوقات ومواعيد الدوام الأسبوعي مع مؤشر الحالة المباشر (مفتوح / مغلق)</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="font-medium text-stone-700">إبراز خدمات الطوارئ والمناوبة 24 ساعة (للصيدليات، المستشفيات، والمراكز)</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="font-medium text-stone-700">استقبال وعرض تقييمات وتجارب المراجعين الحقيقية الموثقة</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="font-medium text-stone-700">إدراج العيادة في محرك البحث الطبي والتصنيفات الجغرافية في إربد</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-8 mt-auto">
                <button 
                  onClick={() => handlePlanAction('basic')}
                  className="w-full py-3 sm:py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs bg-stone-50 text-stone-800 border border-stone-200 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-300"
                >
                  <span>سجل الآن بالباقة الأساسية</span>
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* 2. Medical Golden VIP Plan */}
            <div className="rounded-3xl border border-emerald-500 ring-2 ring-emerald-500/25 bg-white p-6 sm:p-8 flex flex-col justify-between shadow-md hover:shadow-lg transition-all relative lg:-mt-4">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black shadow-md flex items-center gap-1.5 whitespace-nowrap">
                <Crown className="h-3.5 w-3.5 text-amber-300" />
                <span>الخيار الأكثر ثقة واعتماداً للعيادات والمراكز المتميزة</span>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
                    <span>العيادة الرقمية المتكاملة 👑</span>
                  </div>
                  <h2 className="text-2xl font-black text-[#2d2a26]">الباقة الذهبية الطبية VIP</h2>
                </div>

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
                        <span className="text-4xl font-black">9.9</span>
                        <span className="text-lg font-bold">د.أ</span>
                        <span className="text-xs font-bold text-stone-500 mr-1">/ شهرياً (بالدفع السنوي)</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-[11px] text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-lg inline-block self-start">
                          🔥 ما يعادل بالسنة 119 د.أ فقط كاملة
                        </p>
                        <p className="text-[10px] text-stone-400 font-bold">لقد وفرت 109 د.أ سنوياً مقارنة بالدفع الشهري!</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-[#e5e1da] pt-4">
                  <h3 className="text-xs font-black text-stone-400 uppercase tracking-wider mb-4">
                    ميزات المنظومة الطبية المتقدمة:
                  </h3>
                  <ul className="space-y-3.5 text-xs sm:text-sm text-stone-700">
                    <li className="flex items-start gap-2.5">
                      <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="font-bold text-emerald-900">شارة التوثيق والاعتماد الطبية الرسمية (Verified Medical Facility ✓)</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="font-bold text-stone-800">محرك حجز المواعيد الطبي المسبق واستقبال طلبات الكشف المباشرة 📅</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="font-bold text-stone-800">دليل شبكات وشركات التأمين الصحي والنقابات والخصومات المعتمدة 🛡️</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="font-medium text-stone-700">كتالوج الإجراءات والخدمات الطبية والفحوصات مع تفاصيل الأسعار 📋</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="font-medium text-stone-700">دليل الكادر الطبي والاستشاريين مع التخصصات والشهادات والخبرات 👨‍⚕️</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="font-medium text-stone-700">استعراض التجهيزات والتقنيات والأجهزة الطبية المتطورة بالعيادة 🔬</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="font-medium text-stone-700">نافذة ترويجية طبية منبثقة (أطباء زائرون، باقات فحص دوري، إعلانات) ⚡</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="font-medium text-stone-700">حسابات مخصصة لموظفي الاستقبال والسكرتارية لإدارة المواعيد 👥</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="font-medium text-stone-700">لوحة إحصائيات متقدمة لتحليل نقرات الحجز والمكالمات والاهتمامات 📊</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="font-bold text-stone-800">أولوية الصدارة في نتائج البحث الطبي وترشيحات المساعد الذكي 🌟</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="font-medium text-stone-700">معرض الصور المتطور لأجواء العيادة ومرافق المركز 📸</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                      <span className="font-medium text-stone-700">دعم فني ومساعدة متقدمة لضبط وتحديث الملف الطبي والعيادة</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="pt-8 mt-auto">
                <button 
                  onClick={() => handlePlanAction('golden')}
                  className="w-full py-3 sm:py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md bg-[#1a4d2e] hover:bg-[#133b22] text-white"
                >
                  <span>ابدأ الآن - الباقة الذهبية VIP الطبية</span>
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Medical Marketing Services */}
          <div className="max-w-7xl mx-auto px-4 pt-8">
            <div className="bg-stone-50/70 border border-stone-200/60 rounded-3xl p-6 sm:p-10 space-y-8">
              <div className="text-center max-w-2xl mx-auto space-y-3">
                <div className="inline-flex items-center gap-1.5 bg-[#1a4d2e]/10 text-[#1a4d2e] px-3.5 py-1 rounded-full text-xs font-black border border-[#1a4d2e]/20">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>حلول ترويجية مخصصة للقطاع الطبي</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#2d2a26]">
                  🩺 خدمات إعلانية مخصصة للعيادات والمراكز
                </h2>
                <p className="text-stone-500 text-xs sm:text-sm leading-relaxed">
                  وسع قاعدة مراجعيك واجعل عيادتك أو مركزك الوجهة الأولى للمرضى في إربد من خلال حملات ترويجية مستهدفة تدفع <span className="font-bold text-stone-800 underline">مرة واحدة عند الطلب</span>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MEDICAL_MARKETING_SERVICES_DATA.map((service) => {
                  const IconComp = service.icon;
                  return (
                    <div 
                      key={service.id}
                      className="bg-white border border-stone-200/80 rounded-2xl p-5 hover:border-[#1a4d2e] hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className={`p-2.5 rounded-xl ${service.colorClass}`}>
                            <IconComp className="h-5 w-5 stroke-[2.5]" />
                          </div>
                          <span className="text-xs font-black bg-stone-100 text-stone-700 border border-stone-200 px-2.5 py-1 rounded-lg">
                            {service.price}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <h3 className="font-black text-stone-800 text-sm sm:text-base">{service.title}</h3>
                          <p className="text-stone-500 text-xs leading-relaxed">{service.description}</p>
                        </div>
                      </div>

                      <div className="pt-5 mt-4 border-t border-stone-100">
                        <button
                          onClick={() => handleMarketingServiceAction(service.whatsappText)}
                          className="w-full py-2.5 sm:py-3 bg-stone-50 text-stone-800 border border-stone-200 hover:bg-[#1a4d2e] hover:text-white hover:border-[#1a4d2e] rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <span>اطلب الخدمة الآن</span>
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
      
      {/* Footer Info */}
      <div className="max-w-4xl mx-auto text-center space-y-6 pt-10 border-t border-[#e5e1da]">
        <h3 className="text-2xl font-black text-[#2d2a26]">
          {sectorTab === 'medical' ? "هل أنت جاهز لتوسيع قاعدة مراجعيك في إربد؟" : "هل أنت جاهز لتكبير مشروعك في إربد؟"}
        </h3>
        <p className="text-stone-600 leading-relaxed text-sm">
          {sectorTab === 'medical' 
            ? "آلاف المراجعين والمرضى يبحثون يومياً عن أطباء ومراكز ومختبرات معتمدة في محافظتك. انضم الآن لدليل إربد الطبي وسهل وصول المرضى إليك."
            : "آلاف الأهالي والزوار يبحثون عن الخدمات والمطاعم في مدينتك. انضم الآن ولا تفوت الفرصة لزيادة مبيعاتك وتعزيز علامتك التجارية."}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button 
            onClick={() => handlePlanAction('basic')}
            className="w-full sm:w-auto px-8 py-3.5 bg-[#ff9f1c] hover:bg-[#e68a00] text-white rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{sectorTab === 'medical' ? "سجل منشأتك الطبية فوراً مع شهر VIP مجاناً" : "سجل حسابك كصاحب عمل وابدأ فوراً"}</span>
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Link 
            to={sectorTab === 'medical' ? "/contact?type=medical" : "/contact"} 
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
              <h3 className="text-xl font-black text-[#2d2a26]">
                {sectorTab === 'medical' ? "اختر المنشأة الطبية التي تريد ترقيتها" : "اختر المحل الذي تريد ترقيته"}
              </h3>
              <button 
                onClick={() => setShowBusinessSelectModal(false)}
                className="p-2 bg-stone-100 hover:bg-stone-200 rounded-full transition-colors text-stone-500 cursor-pointer"
              >
                <span className="font-bold text-sm px-1">إغلاق</span>
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {displayBusinesses.map(bus => {
                const isAlreadyOnPlan = bus.packagePlan === selectedPlanId;
                const isMed = isMedicalBusiness(bus) || !!bus.medicalProfile;
                return (
                  <div key={bus.id} className={`flex items-center justify-between p-4 rounded-2xl border ${isAlreadyOnPlan ? 'bg-stone-50 border-stone-200 opacity-60' : 'bg-white border-stone-200 hover:border-[#1a4d2e] cursor-pointer'}`}
                       onClick={() => !isAlreadyOnPlan && handleBusinessSelection(bus)}>
                     <div className="flex items-center gap-3">
                       <div className="w-12 h-12 bg-stone-100 rounded-xl overflow-hidden flex items-center justify-center">
                         {bus.logoUrl || bus.image ? (
                           <img src={bus.logoUrl || bus.image} alt={bus.name} className="w-full h-full object-cover" />
                         ) : isMed ? (
                           <Stethoscope className="h-6 w-6 text-emerald-600" />
                         ) : (
                           <Building2 className="h-6 w-6 text-stone-400" />
                         )}
                       </div>
                       <div>
                         <h4 className="font-black text-stone-800 flex items-center gap-1.5">
                           <span>{bus.name}</span>
                           {isMed && (
                             <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-bold">طبي</span>
                           )}
                         </h4>
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
                <span>{sectorTab === 'medical' ? "إضافة منشأة أو عيادة طبية جديدة لترقيتها" : "إضافة محل جديد لترقيته"}</span>
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
