import React from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Crown, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  TrendingUp, 
  Tag, 
  Store, 
  RotateCw, 
  PhoneCall,
  Flame,
  Check
} from 'lucide-react';
import { Business } from '../../types';

export interface VipSubscriptionStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business | null;
  onOpenUpgradeModal: (business: Business) => void;
  onOpenOffersModal?: () => void;
  onOpenAnalyticsModal?: () => void;
}

export function VipSubscriptionStatusModal({
  isOpen,
  onClose,
  business,
  onOpenUpgradeModal,
  onOpenOffersModal,
  onOpenAnalyticsModal
}: VipSubscriptionStatusModalProps) {
  if (!isOpen || !business || typeof document === 'undefined') return null;

  const isVip = !!business.isVip || business.packagePlan === 'golden' || business.packagePlan === 'vip' || business.selectedPackagePlan === 'golden' || business.selectedPackagePlan === 'vip';
  const isTrial = !!business.isVipTrial;
  
  // Calculate expiry and dates
  const now = Date.now();
  const startsAt = business.vipSubscriptionStartsAt || business.createdAt || now;
  const expiresAt = business.vipSubscriptionExpiresAt || (business.featuredExpiryDate ? Number(business.featuredExpiryDate) : null);
  
  const isExpired = expiresAt ? expiresAt < now : false;
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24))) : null;

  // Format dates in Arabic
  const formatDate = (timestamp?: number | null) => {
    if (!timestamp) return 'غير محدد';
    return new Intl.DateTimeFormat('ar-JO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(timestamp));
  };

  // Plan name in Arabic
  const getPlanName = () => {
    if (isTrial) return 'الباقة الذهبية VIP (فترة تجريبية مجانية 🎁)';
    if (business.packagePlan === 'golden' || business.packagePlan === 'vip' || isVip) return 'الباقة الذهبية الملكية (VIP Gold Plan 👑)';
    if (business.packagePlan === 'basic') return 'الباقة الفضية / الأساسية';
    return 'الحساب الافتراضي المجاني';
  };

  // Billing period in Arabic
  const getBillingPeriodLabel = () => {
    if (business.billingPeriod === 'yearly') return 'اشتراك سنوي (12 شهراً)';
    if (business.billingPeriod === 'monthly') return 'اشتراك شهري متجدد';
    if (business.billingPeriod === 'lifetime') return 'اشتراك دائم (مدى الحياة ♾️)';
    return 'باقة سنوية / دورية';
  };

  return createPortal(
    <div className="fixed inset-0 z-[100000] bg-stone-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden" dir="rtl">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[92dvh] sm:max-h-[88vh] flex flex-col overflow-hidden shadow-2xl border border-stone-200 relative my-0 sm:my-auto animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 text-right">
        
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className={`p-4 sm:p-6 border-b shrink-0 text-right ${
          isVip && !isExpired 
            ? 'bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border-amber-200/80'
            : 'bg-stone-50 border-stone-200'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs shrink-0 ${
                isVip && !isExpired
                  ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950'
                  : 'bg-stone-200 text-stone-600'
              }`}>
                <Crown className="h-6 w-6 fill-current" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-stone-900">
                    حالة وتفاصيل اشتراك الباقة 👑
                  </h2>
                  {isVip && !isExpired ? (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      اشتراك نشط ومفعّل
                    </span>
                  ) : isExpired ? (
                    <span className="bg-rose-100 text-rose-800 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-rose-300">
                      منتهي الصلاحية 🔴
                    </span>
                  ) : (
                    <span className="bg-stone-200 text-stone-700 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                      غير مشترك بالباقة الذهبية
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5 font-medium">
                  <Store className="h-3.5 w-3.5 text-[#1a4d2e]" />
                  <span>المنشأة: <strong>{business.name}</strong></span>
                </p>
              </div>
            </div>

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

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">

          {/* Main Status Hero Card */}
          {isVip && !isExpired ? (
            <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-yellow-600 rounded-2xl sm:rounded-3xl p-5 text-white shadow-lg relative overflow-hidden">
              <div className="absolute -top-6 -left-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
              <div className="absolute bottom-0 right-0 translate-x-4 translate-y-4 opacity-10 pointer-events-none">
                <Crown className="w-48 h-48" />
              </div>

              <div className="relative z-10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-white inline-flex items-center gap-1">
                    <Sparkles className="h-3 w-3 fill-white" />
                    عضوية VIP الموثقة
                  </span>
                  {daysLeft !== null && (
                    <span className="text-xs font-black bg-stone-950/40 px-3 py-1 rounded-full text-amber-100">
                      متبقي: {daysLeft} يوماً
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-black">{getPlanName()}</h3>
                  <p className="text-xs text-amber-100 mt-1 font-medium">
                    منشأتك تتمتع بكافة الصلاحيات الحصرية والأولوية في الظهور وجذب الزبائن في إربد.
                  </p>
                </div>
              </div>
            </div>
          ) : isExpired ? (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl sm:rounded-3xl p-5 text-rose-950 space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-black text-sm">
                <AlertCircle className="h-5 w-5" />
                <span>انتهى اشتراك باقة VIP الذهبية لهذه المنشأة</span>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed">
                انتهت فترة الاشتراك في {formatDate(expiresAt)}. يمكنك تجديد الاشتراك فوراً لإعادة تفعيل ظهور العروض الحية والنافذة الترحيبية وتتبع الإحصائيات.
              </p>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-stone-900 to-stone-800 rounded-2xl sm:rounded-3xl p-5 text-white shadow-md relative overflow-hidden space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black bg-white/10 px-2.5 py-0.5 rounded-full text-stone-300">
                  الحساب الأساسي
                </span>
                <span className="text-xs font-bold text-amber-400">
                  متاح للترقية 🚀
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                قم بالترقية للباقة الذهبية VIP الآن 👑
              </h3>
              <p className="text-xs text-stone-300 font-medium leading-relaxed">
                احصل على نشر العروض الحية، شارة التوثيق الذهبية، النافذة الترحيبية للزبائن، وتقارير المشاهدات اليومية الدقيقة.
              </p>
            </div>
          )}

          {/* Subscription Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            
            {/* 1. Subscription Type */}
            <div className="bg-stone-50 border border-stone-200/90 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-bold text-stone-400 flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-amber-500" />
                نوع الباقة وخطة الاشتراك
              </span>
              <p className="text-xs sm:text-sm font-black text-stone-900">
                {getPlanName()}
              </p>
            </div>

            {/* 2. Billing Period */}
            <div className="bg-stone-50 border border-stone-200/90 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-bold text-stone-400 flex items-center gap-1.5">
                <RotateCw className="h-3.5 w-3.5 text-emerald-600" />
                دورة الفوترة والتجديد
              </span>
              <p className="text-xs sm:text-sm font-black text-stone-900">
                {getBillingPeriodLabel()}
              </p>
            </div>

            {/* 3. Start Date */}
            <div className="bg-stone-50 border border-stone-200/90 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-bold text-stone-400 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-sky-600" />
                تاريخ تفعيل الاشتراك
              </span>
              <p className="text-xs sm:text-sm font-black text-stone-900">
                {formatDate(startsAt)}
              </p>
            </div>

            {/* 4. Expiration Date */}
            <div className="bg-stone-50 border border-stone-200/90 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-bold text-stone-400 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-purple-600" />
                تاريخ انتهاء الصلاحية
              </span>
              <p className={`text-xs sm:text-sm font-black ${
                isExpired ? 'text-rose-600' : 'text-stone-900'
              }`}>
                {expiresAt ? formatDate(expiresAt) : 'مستمر / دائم'}
              </p>
            </div>

          </div>

          {/* Included VIP Features Checklist */}
          <div className="bg-stone-50/70 border border-stone-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 space-y-3">
            <h4 className="text-xs sm:text-sm font-black text-stone-900 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#1a4d2e]" />
              <span>الميزات والصلاحيات المشمولة بالباقة:</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-stone-700 bg-white p-2.5 rounded-xl border border-stone-200/80">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                  isVip && !isExpired ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-500'
                }`}>
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </div>
                <span>نشر وإدارة العروض الحية والخصومات</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-stone-700 bg-white p-2.5 rounded-xl border border-stone-200/80">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                  isVip && !isExpired ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-500'
                }`}>
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </div>
                <span>نافذة ترحيبية Pop-up عند فتح الصفحة</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-stone-700 bg-white p-2.5 rounded-xl border border-stone-200/80">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                  isVip && !isExpired ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-500'
                }`}>
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </div>
                <span>إحصائيات تفصيلية ونقرات الزوار الحية</span>
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-stone-700 bg-white p-2.5 rounded-xl border border-stone-200/80">
                <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                  isVip && !isExpired ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-200 text-stone-500'
                }`}>
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </div>
                <span>شارة التوثيق الذهبية المعتمدة 👑</span>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isVip && !isExpired ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenUpgradeModal(business);
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Crown className="h-4 w-4 fill-white" />
                <span>تمديد أو ترقية الاشتراك 👑</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenUpgradeModal(business);
                }}
                className="w-full sm:w-auto px-6 py-2.5 bg-[#1a4d2e] hover:bg-[#143d24] text-white rounded-xl text-xs font-black shadow-xs hover:shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Crown className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span>الاشتراك في الباقة الذهبية VIP 👑</span>
              </button>
            )}

            {isVip && onOpenOffersModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenOffersModal();
                }}
                className="w-full sm:w-auto px-4 py-2.5 bg-white border border-stone-300 hover:bg-stone-100 text-stone-800 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                <Tag className="h-3.5 w-3.5 text-emerald-700" />
                <span>إدارة العروض</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
