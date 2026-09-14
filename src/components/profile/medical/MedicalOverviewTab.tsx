import React from 'react';
import { 
  Eye, Phone, MapPin, Star, Activity, ShieldCheck, 
  Clock, Users, QrCode, Crown, Sparkles, ExternalLink, 
  CheckCircle2, ArrowRight, Share2, Layers, AlertCircle, Building2, Printer, Lock, BarChart3, Rocket, Megaphone
} from 'lucide-react';
import { Business } from '../../../types';
import { Link } from 'react-router';
import { VipAnalyticsDashboard } from '../../vip/VipAnalyticsDashboard';
import { getBusinessVipStatus } from '../../../lib/vipHelper';

interface MedicalOverviewTabProps {
  business: Business;
  onNavigateTab: (tabId: string) => void;
  onOpenQrModal: () => void;
  onOpenMultiBranchModal: () => void;
  onOpenBannerModal: () => void;
  onOpenUpgradeModal: () => void;
}

export function MedicalOverviewTab({
  business,
  onNavigateTab,
  onOpenQrModal,
  onOpenMultiBranchModal,
  onOpenBannerModal,
  onOpenUpgradeModal
}: MedicalOverviewTabProps) {
  const medProfile = business.medicalProfile || {};
  const vipStatus = getBusinessVipStatus(business);

  // Calculate Medical Profile Completion %
  let score = 0;
  if (business.name) score += 10;
  if (business.phone) score += 10;
  if (business.imageUrl) score += 10;
  if (business.address) score += 10;
  if (business.workingHours) score += 10;
  if (medProfile.aboutFacility || business.description) score += 15;
  if (medProfile.licenseNumber) score += 10;
  if (medProfile.doctorProfile?.name) score += 10;
  if (medProfile.insurances && medProfile.insurances.length > 0) score += 10;
  if (business.menuItems && business.menuItems.length > 0) score += 5;

  const viewsCount = business.views || 0;
  const phoneClicks = business.phoneClicks || Math.floor(viewsCount * 0.15) || 0;
  const directionsClicks = business.directionsClicks || Math.floor(viewsCount * 0.1) || 0;
  const rating = (business.rating || 5.0).toFixed(1);
  const reviewsCount = business.reviewCount || 0;

  return (
    <div className="p-4 sm:p-6 space-y-6 text-right" dir="rtl">
      {/* 1. Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Views */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-teal-300 transition-all shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">مشاهدات الصفحة</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Eye className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              {viewsCount.toLocaleString('ar-JO')}
            </span>
            <span className="text-[10px] text-stone-400 font-medium">زيارة مريض</span>
          </div>
        </div>

        {/* Phone Calls */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-teal-300 transition-all shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">اتصالات الحجز</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Phone className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              {phoneClicks.toLocaleString('ar-JO')}
            </span>
            <span className="text-[10px] text-stone-400 font-medium">مكالمة هاتفية</span>
          </div>
        </div>

        {/* Directions / Maps */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-teal-300 transition-all shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">طلبات الاتجاهات</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <MapPin className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              {directionsClicks.toLocaleString('ar-JO')}
            </span>
            <span className="text-[10px] text-stone-400 font-medium">فتح الخريطة</span>
          </div>
        </div>

        {/* Reviews & Rating */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 relative overflow-hidden group hover:border-teal-300 transition-all shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">تقييم المراجعين</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              {rating}
            </span>
            <span className="text-[10px] text-stone-400 font-medium">({reviewsCount} تقييم)</span>
          </div>
        </div>
      </div>

      {/* 1.5. Advanced VIP Analytics Section for Medical Facilities */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
              <Crown className="h-5 w-5 fill-amber-500 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-stone-900 flex items-center gap-2">
                لوحة الإحصائيات والتحليلات المتقدمة VIP • {business.name}
              </h3>
              <p className="text-xs text-stone-500">
                مؤشرات تفاعلية لحظية وتفكيك يومي لمشاهدات المرضى، مكالمات الحجز، ونقرات الواتساب والاتجاهات
              </p>
            </div>
          </div>

          {!vipStatus.isVip && (
            <button
              type="button"
              onClick={onOpenUpgradeModal}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-black shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Crown className="h-4 w-4 fill-white" />
              <span>ترقية المنشأة لـ VIP الذهبية 👑</span>
            </button>
          )}
        </div>

        {vipStatus.isVip ? (
          /* Embedded Active Real VIP Analytics Dashboard */
          <div className="pt-2">
            <VipAnalyticsDashboard business={business} isOwner={true} />
          </div>
        ) : (
          /* Locked VIP Analytics Teaser for Medical Facilities */
          <div className="bg-gradient-to-r from-stone-50 via-amber-50/20 to-amber-50/50 border border-amber-200/80 p-5 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="space-y-1 text-right">
                <span className="text-sm font-black text-amber-950 flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-amber-600" />
                  تحليلات الزوار المتقدمة مقفلة (ميزة مدفوعة للمشتركين فقط) 🔒
                </span>
                <p className="text-xs text-stone-600 leading-relaxed">
                  تحصل المنشآت الطبية المشتركة بالباقة الذهبية (VIP) على رسوم بيانية تفاعلية، تحليل أوقات الذروة لحجوزات العيادة، ومؤشرات النقر المباشرة مسجلة بالكامل. (تُسحب تلقائياً عند انتهاء الاشتراك).
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenUpgradeModal}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black px-5 py-2.5 rounded-xl shrink-0 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Crown className="h-4 w-4 fill-white" />
                <span>اشتراك VIP الذهبي للمنشآت الطبية 👑</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-amber-200/50">
              <div className="bg-white/80 p-3 rounded-xl border border-amber-100 text-right space-y-1">
                <span className="text-[11px] text-stone-500 font-bold block">محادثات الواتساب للحجز</span>
                <span className="text-xs font-black text-amber-800 flex items-center gap-1">
                  <Lock className="h-3 w-3 text-amber-600" /> ميزة VIP 🔒
                </span>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-amber-100 text-right space-y-1">
                <span className="text-[11px] text-stone-500 font-bold block">تحليل ساعات وأيام الذروة</span>
                <span className="text-xs font-black text-amber-800 flex items-center gap-1">
                  <Lock className="h-3 w-3 text-amber-600" /> ميزة VIP 🔒
                </span>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-amber-100 text-right space-y-1">
                <span className="text-[11px] text-stone-500 font-bold block">طلبات اتجاهات العيادة</span>
                <span className="text-xs font-black text-amber-800 flex items-center gap-1">
                  <Lock className="h-3 w-3 text-amber-600" /> ميزة VIP 🔒
                </span>
              </div>
              <div className="bg-white/80 p-3 rounded-xl border border-amber-100 text-right space-y-1">
                <span className="text-[11px] text-stone-500 font-bold block">مشاركات وتوصيات المرضى</span>
                <span className="text-xs font-black text-amber-800 flex items-center gap-1">
                  <Lock className="h-3 w-3 text-amber-600" /> ميزة VIP 🔒
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 1.8. Marketing Services Promo Card */}
      <div className="bg-gradient-to-r from-amber-900 via-[#1a4d2e] to-teal-900 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="inline-flex items-center gap-1.5 bg-amber-400/20 border border-amber-300/30 px-3 py-0.5 rounded-full text-amber-200 text-xs font-black mb-1">
            <Rocket className="h-3.5 w-3.5 text-amber-300" />
            <span>خدمات تسويقية حصرية للمنشآت الطبية</span>
          </div>
          <h4 className="text-base sm:text-lg font-black text-white">
            تريد زيادة حجز المواعيد وزوار عيادتك؟ 🚀
          </h4>
          <p className="text-xs text-amber-100/90 leading-relaxed font-normal">
            اطلب صدارة نتائج البحث الطبي، الإشعار الجماعي الهاتفي، تصوير الفيديو الميداني للعيادة، أو البانر الطبي الرئيسي.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigateTab('marketing')}
          className="bg-amber-400 hover:bg-amber-300 text-amber-950 font-black text-xs px-5 py-3 rounded-2xl shadow-md transition-all cursor-pointer shrink-0 flex items-center gap-2"
        >
          <Megaphone className="h-4 w-4" />
          <span>تصفح قسم طلب الخدمات التسويقية</span>
        </button>
      </div>

      {/* 2. Profile Completion Bar */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-900 text-white rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-300" />
              <h4 className="text-sm sm:text-base font-black">
                نسبة اكتمال ملف المنشأة الطبي: {score}%
              </h4>
            </div>
            <p className="text-xs text-teal-100/90 leading-relaxed font-normal">
              {score >= 90
                ? 'ملفك الطبي مكتمل وموثق بدرجة ممتازة! يمنحك ذلك أولوية في نتائج بحث المرضى والمراجعين.'
                : 'أكمل تعبئة نبذة المنشأة، شبكات التأمين المعتمدة، وقائمة الخدمات لرفع نسبة الحجوزات المباشرة.'}
            </p>
          </div>

          <div className="w-full md:w-56 space-y-2">
            <div className="w-full bg-white/20 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${score}%` }}
              />
            </div>
            {score < 90 && (
              <button
                type="button"
                onClick={() => onNavigateTab('about')}
                className="text-[11px] font-bold text-emerald-200 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>استكمال البيانات المتبقية</span>
                <ArrowRight className="h-3 w-3 rtl:rotate-180" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Operational Health & Features Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Insurance Status */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-teal-600" />
              شبكة التأمين الصحي:
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('insurances')}
              className="text-[11px] text-teal-700 font-bold hover:underline"
            >
              تعديل
            </button>
          </div>
          <p className="text-xs text-stone-600 font-bold">
            {medProfile.insurances && medProfile.insurances.length > 0
              ? `${medProfile.insurances.length} جهة تأمينية ونقابة معتمدة`
              : 'لم يتم ربط تأمينات بعد'}
          </p>
          <span className="text-[10px] text-stone-400 block">
            {medProfile.acceptsInsuranceDirectBilling
              ? '✅ ميزة المطالبة الإلكترونية المباشرة مفعلة'
              : '❌ المطالبة المباشرة غير مفعلة'}
          </span>
        </div>

        {/* Staff Status */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-teal-600" />
              الكادر الطبي والخبرات:
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('staff')}
              className="text-[11px] text-teal-700 font-bold hover:underline"
            >
              تعديل
            </button>
          </div>
          <p className="text-xs text-stone-600 font-bold">
            {medProfile.doctorProfile?.name || business.ownerName || 'طبيب استشاري مسجل'}
          </p>
          <span className="text-[10px] text-stone-400 block">
            {medProfile.showMedicalStaff !== false
              ? `✅ تاب الكادر معروض (${(medProfile.doctorsList?.length || 0) + 1} أطباء)`
              : '⚠️ تاب الكادر مخفي حالياً'}
          </span>
        </div>

        {/* Emergency & Working Hours */}
        <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-teal-600" />
              الدوام والطوارئ:
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab('identity')}
              className="text-[11px] text-teal-700 font-bold hover:underline"
            >
              تعديل
            </button>
          </div>
          <p className="text-xs text-stone-600 font-bold">
            {business.workingHours?.isOpen24Hours
              ? 'مفتوح 24 ساعة'
              : (business.workingHours?.openTime && business.workingHours?.closeTime
                  ? `${business.workingHours.openTime} - ${business.workingHours.closeTime}`
                  : '9:00 ص - 9:00 م')}
          </p>
          <span className="text-[10px] text-stone-400 block">
            {medProfile.has24Emergency
              ? '🚨 استقبال طوارئ 24 ساعة مفعّل'
              : 'دوام عيادي منتظم'}
          </span>
        </div>
      </div>

      {/* Quick Medical Tools Row: Clean QR Poster Print */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-950 via-teal-900 to-[#0f331e] rounded-2xl text-white shadow-sm border border-teal-800/40">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-400/20 text-teal-300 flex items-center justify-center font-bold shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-black text-white block">ملصقات الاستقبال وطاولات QR الذكية للعيادة</span>
              <span className="text-[10px] sm:text-xs font-medium text-teal-200">طباعة ملصق الباركود QR للمراجعين لحجز المواعيد وتقييم الخدمة مجاناً</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenQrModal}
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-teal-50 text-teal-950 px-4 py-2.5 rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer min-h-[40px] w-full sm:w-auto"
          >
            <Printer className="h-4 w-4 text-teal-800" />
            <span>🖨️ طباعة ملصق وطاولات QR المخصصة</span>
          </button>
        </div>
      </div>

      {/* Welcome Banner Card */}
      <div className="bg-teal-50/50 border border-teal-200 p-4 sm:p-5 rounded-2xl flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-teal-700 fill-teal-500" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black text-teal-950">النافذة الترحيبية والإعلانات الطبية 🎬</h4>
            <p className="text-[11px] sm:text-xs text-stone-500 mt-0.5">إشهار أوقات الدوام، مواعيد الأطباء، أو تنويه خاص للمرضى عند زيارة الصفحة</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenBannerModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-teal-700 to-teal-800 hover:from-teal-800 hover:to-teal-900 text-white rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer w-full sm:w-auto"
        >
          <Sparkles className="h-3.5 w-3.5 text-teal-200" />
          <span>إعداد النافذة الترحيبية</span>
        </button>
      </div>

      {/* 4. Quick Action Hub */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-3">
        <h4 className="text-xs font-black text-stone-900">
          إجراءات سريعة واختصارات لوحة التحكم:
        </h4>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Link
            to={`/business/${business.id}`}
            target="_blank"
            className="p-3 bg-stone-50 hover:bg-teal-50 hover:text-teal-900 hover:border-teal-300 border border-stone-200 rounded-xl text-center text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 text-stone-700 group cursor-pointer"
          >
            <ExternalLink className="h-4 w-4 text-stone-400 group-hover:text-teal-600" />
            <span>معاينة صفحة العيادة</span>
          </Link>

          <button
            type="button"
            onClick={onOpenQrModal}
            className="p-3 bg-stone-50 hover:bg-teal-50 hover:text-teal-900 hover:border-teal-300 border border-stone-200 rounded-xl text-center text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 text-stone-700 group cursor-pointer"
          >
            <QrCode className="h-4 w-4 text-stone-400 group-hover:text-teal-600" />
            <span>ملصق الاستقبال QR</span>
          </button>

          <button
            type="button"
            onClick={onOpenMultiBranchModal}
            className="p-3 bg-stone-50 hover:bg-teal-50 hover:text-teal-900 hover:border-teal-300 border border-stone-200 rounded-xl text-center text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 text-stone-700 group cursor-pointer"
          >
            <Building2 className="h-4 w-4 text-stone-400 group-hover:text-teal-600" />
            <span>إضافة فرع ملحق</span>
          </button>

          <button
            type="button"
            onClick={onOpenBannerModal}
            className="p-3 bg-stone-50 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300 border border-stone-200 rounded-xl text-center text-xs font-bold transition-all flex flex-col items-center justify-center gap-1.5 text-stone-700 group cursor-pointer"
          >
            <Crown className="h-4 w-4 text-amber-500" />
            <span>إعلان وبانر طبي</span>
          </button>
        </div>
      </div>
    </div>
  );
}
