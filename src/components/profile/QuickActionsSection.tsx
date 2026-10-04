import React from 'react';
import { 
  Camera, 
  Megaphone,
  Clock, 
  Sparkles, 
  QrCode, 
  UtensilsCrossed, 
  Activity, 
  Zap,
  Tag,
  PhoneCall,
  LayoutDashboard,
  Heart,
  Home,
  ClipboardList,
  ShieldCheck,
  Store,
  Stethoscope,
  Check,
  Plus,
  ArrowLeft,
  Briefcase,
  Power,
  BarChart3,
  Rocket,
  Crown,
  ConciergeBell
} from 'lucide-react';
import { Business, WorkingHours } from '../../types';
import { isMedicalBusiness } from '../../lib/medicalHelper';
import { getLiveWorkingStatus } from '../../lib/businessHoursHelper';
import { Link } from 'react-router';
import { isFoodAndDrinkBusiness } from '../../lib/categories';

export interface QuickActionsSectionProps {
  // Navigation State & Handlers
  activeTab: 'hub' | 'visitor' | 'dashboard' | 'housing' | 'staff' | 'requests' | 'qr-scanner';
  onSelectTab: (tab: 'visitor' | 'dashboard' | 'housing' | 'staff' | 'requests' | 'qr-scanner') => void;
  commercialCount: number;
  medicalCount: number;
  housingCount: number;
  requestsCount: number;
  isStaff: boolean;

  // Business context
  businesses: Business[];
  selectedBusiness: Business | null;
  onSelectBusiness?: (business: Business) => void;

  // Quick Modal Action Handlers
  onOpenImagesModal: () => void;
  onOpenWorkingHoursModal: () => void;
  onOpenAddOfferModal: () => void;
  onOpenContactModal: () => void;
  onOpenWelcomePopupModal: () => void;
  onOpenQrPosters: () => void;
  onOpenMenuOrServices: () => void;

  // New Fast Actions
  onOpenQuickJobModal?: () => void;
  onToggleInstantStatus?: () => void;
  onOpenDailyViewsModal?: () => void;
  onOpenMarketingServices?: () => void;
  onOpenVipSubscriptionStatus?: () => void;
}

export function QuickActionsSection({
  activeTab,
  onSelectTab,
  commercialCount,
  medicalCount,
  housingCount,
  requestsCount,
  isStaff,
  businesses,
  selectedBusiness,
  onSelectBusiness,
  onOpenImagesModal,
  onOpenWorkingHoursModal,
  onOpenAddOfferModal,
  onOpenContactModal,
  onOpenWelcomePopupModal,
  onOpenQrPosters,
  onOpenMenuOrServices,
  onOpenQuickJobModal,
  onToggleInstantStatus,
  onOpenDailyViewsModal,
  onOpenMarketingServices,
  onOpenVipSubscriptionStatus
}: QuickActionsSectionProps) {
  const currentBiz = selectedBusiness || (businesses.length > 0 ? businesses[0] : null);
  const isMed = currentBiz ? isMedicalBusiness(currentBiz) : false;
  const isFoodAndDrink = isFoodAndDrinkBusiness(currentBiz);
  const liveStatus = getLiveWorkingStatus(currentBiz?.workingHours);
  const isCurrentlyOpen = liveStatus.isOpen;
  const isVip = !!currentBiz?.isVip || currentBiz?.packagePlan === 'golden' || currentBiz?.packagePlan === 'vip' || currentBiz?.selectedPackagePlan === 'golden' || currentBiz?.selectedPackagePlan === 'vip';

  const getBusinessAvatar = (b: Business) => {
    return b.imageUrl || b.logoUrl || (b as any).image_url || (b as any).image || null;
  };

  return (
    <div className="bg-white border border-stone-200/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xs space-y-4 sm:space-y-5" dir="rtl">
      {/* 1. Business Circular Avatars Slider */}
      {businesses.length > 0 && (
        <div className="space-y-1.5 pt-0.5 pb-1">
          <div className="flex items-center justify-between text-[11px] text-stone-500 font-bold px-0.5">
            <span>منشآتك ومحلاتك ({businesses.length}):</span>
            <span className="text-[10px] text-stone-400 font-normal">اضغط لاختيار المنشأة النشطة</span>
          </div>

          <div className="flex items-start gap-3 sm:gap-4 overflow-x-auto pt-2 pb-3.5 px-2 -mx-1 scrollbar-thin scrollbar-thumb-stone-200">
            {businesses.map((b) => {
              const isSelected = currentBiz?.id === b.id;
              const avatar = getBusinessAvatar(b);
              const isBizMed = isMedicalBusiness(b) || !!b.medicalProfile || b.requestType === 'medical_facility_registration';

              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onSelectBusiness && onSelectBusiness(b)}
                  className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer text-center"
                >
                  <div className="p-1 shrink-0">
                    <div className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-full transition-all duration-200 ${
                      isSelected 
                        ? 'ring-[3px] ring-[#1a4d2e] ring-offset-2 ring-offset-white shadow-md' 
                        : 'border-2 border-stone-200/90 hover:border-stone-400 opacity-80 hover:opacity-100 hover:scale-[1.02]'
                    }`}>
                      <div className="w-full h-full rounded-full overflow-hidden p-0.5 bg-white">
                        {avatar ? (
                          <img
                            src={avatar}
                            alt={b.name}
                            className="w-full h-full object-cover rounded-full bg-stone-100"
                          />
                        ) : (
                          <div className={`w-full h-full rounded-full flex items-center justify-center font-black text-base sm:text-lg ${
                            isBizMed ? 'bg-teal-50 text-teal-700' : 'bg-emerald-50 text-[#1a4d2e]'
                          }`}>
                            {isBizMed ? <Stethoscope className="h-6 w-6" /> : <Store className="h-6 w-6" />}
                          </div>
                        )}
                      </div>

                      {/* Active Selected Check Badge */}
                      {isSelected && (
                        <div className="absolute -bottom-0.5 -right-0.5 bg-[#1a4d2e] text-white rounded-full p-1 shadow-xs ring-2 ring-white z-10">
                          <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </div>

                  <span className={`text-[11px] sm:text-xs leading-tight line-clamp-1 max-w-[70px] sm:max-w-[85px] transition-colors ${
                    isSelected ? 'text-[#1a4d2e] font-black' : 'text-stone-600 font-bold group-hover:text-stone-900'
                  }`}>
                    {b.name}
                  </span>
                </button>
              );
            })}

            {/* Quick Add Shop Link in Slider */}
            <Link
              to="/contact"
              className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer text-center"
              title="تسجيل محل جديد"
            >
              <div className="p-1 shrink-0">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-dashed border-stone-300 hover:border-[#1a4d2e] bg-stone-50 hover:bg-emerald-50/50 flex items-center justify-center text-stone-400 hover:text-[#1a4d2e] transition-all hover:scale-[1.02]">
                  <Plus className="h-6 w-6 text-[#ff9f1c]" />
                </div>
              </div>
              <span className="text-[10px] sm:text-[11px] font-bold text-stone-500 group-hover:text-[#1a4d2e] max-w-[70px] sm:max-w-[85px] leading-tight">
                + إضافة محل
              </span>
            </Link>
          </div>
        </div>
      )}

      {/* 2. Wide Master Control Button: "فتح لوحة التحكم بالمحلات والمنشآت" */}
      <button
        type="button"
        onClick={() => onSelectTab('dashboard')}
        className="w-full group p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-[#1a4d2e] hover:bg-[#133b22] text-white transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99] border border-[#1a4d2e] flex items-center justify-between gap-3 relative overflow-hidden"
      >
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/15 border border-white/20 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <LayoutDashboard className="h-5 w-5 sm:h-5.5 sm:w-5.5 text-white" />
          </div>
          <span className="text-sm sm:text-base font-black text-white leading-tight">
            فتح لوحة التحكم بالمحلات والمنشآت
          </span>
        </div>

        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-white/15 group-hover:bg-white text-white group-hover:text-[#1a4d2e] flex items-center justify-center transition-all shrink-0 shadow-2xs">
          <ArrowLeft className="h-4 w-4 rtl:rotate-0" />
        </div>
      </button>

      {/* 3. Header: Golden "الأزرار السريعة" */}
      <div className="flex items-center justify-between gap-3 pt-2 pb-2 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold shrink-0">
            <Zap className="h-5 w-5 fill-amber-500 text-amber-500" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-amber-500 flex items-center gap-2">
            <span>الأزرار السريعة</span>
          </h3>
        </div>

        {businesses.length > 0 && currentBiz && (
          <div className="text-[11px] font-bold text-stone-500 bg-stone-50 px-2.5 py-1 rounded-lg border border-stone-200/60 hidden sm:flex items-center gap-1.5">
            <span>المنشأة الحالية:</span>
            <span className="text-[#1a4d2e] font-black truncate max-w-[150px]">{currentBiz.name}</span>
          </div>
        )}
      </div>

      {/* 4. Grid of Quick Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 pt-1">
        
        {/* ========================================================= */}
        {/* أزرار الأقسام والصفحات الرئيسية (Navigational Actions) */}
        {/* ========================================================= */}

        {/* زر تفاعلاتي ومفضلتي */}
        <button
          type="button"
          onClick={() => onSelectTab('visitor')}
          className={`group p-3.5 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer relative overflow-hidden active:scale-[0.98] border min-h-[90px] sm:min-h-[100px] ${
            activeTab === 'visitor'
              ? 'bg-rose-600 text-white border-rose-600 shadow-md ring-2 ring-rose-600/30'
              : 'bg-rose-50/60 hover:bg-rose-100/70 border-rose-200/80 hover:border-rose-400 text-rose-950 shadow-2xs hover:shadow-sm'
          }`}
        >
          <Heart className={`h-6 w-6 sm:h-7 sm:w-7 mb-2 transition-transform group-hover:scale-110 ${
            activeTab === 'visitor' ? 'text-white fill-white' : 'text-rose-600 fill-rose-600'
          }`} />
          <span className={`text-xs sm:text-sm font-black transition-colors leading-tight ${
            activeTab === 'visitor' ? 'text-white' : 'text-rose-950 group-hover:text-rose-900'
          }`}>
            تفاعلاتي ومفضلتي
          </span>
        </button>

        {/* زر سكناتي */}
        <button
          type="button"
          onClick={() => onSelectTab('housing')}
          className={`group p-3.5 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer relative overflow-hidden active:scale-[0.98] border min-h-[90px] sm:min-h-[100px] ${
            activeTab === 'housing'
              ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-600/30'
              : 'bg-amber-50/60 hover:bg-amber-100/70 border-amber-200/80 hover:border-amber-400 text-amber-950 shadow-2xs hover:shadow-sm'
          }`}
        >
          <Home className={`h-6 w-6 sm:h-7 sm:w-7 mb-2 transition-transform group-hover:scale-110 ${
            activeTab === 'housing' ? 'text-white' : 'text-amber-600'
          }`} />
          <span className={`text-xs sm:text-sm font-black transition-colors leading-tight ${
            activeTab === 'housing' ? 'text-white' : 'text-amber-950 group-hover:text-amber-900'
          }`}>
            سكناتي
          </span>
        </button>

        {/* زر طلباتي */}
        <button
          type="button"
          onClick={() => onSelectTab('requests')}
          className={`group p-3.5 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer relative overflow-hidden active:scale-[0.98] border min-h-[90px] sm:min-h-[100px] ${
            activeTab === 'requests'
              ? 'bg-teal-700 text-white border-teal-700 shadow-md ring-2 ring-teal-700/30'
              : 'bg-teal-50/60 hover:bg-teal-100/70 border-teal-200/80 hover:border-teal-400 text-teal-950 shadow-2xs hover:shadow-sm'
          }`}
        >
          <ClipboardList className={`h-6 w-6 sm:h-7 sm:w-7 mb-2 transition-transform group-hover:scale-110 ${
            activeTab === 'requests' ? 'text-white' : 'text-teal-700'
          }`} />
          <span className={`text-xs sm:text-sm font-black transition-colors leading-tight ${
            activeTab === 'requests' ? 'text-white' : 'text-teal-950 group-hover:text-teal-900'
          }`}>
            طلباتي
          </span>
        </button>

        {/* زر ماسح الـ QR للزبائن */}
        <button
          type="button"
          onClick={() => onSelectTab('qr-scanner')}
          className={`group p-3.5 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer relative overflow-hidden active:scale-[0.98] border min-h-[90px] sm:min-h-[100px] ${
            activeTab === 'qr-scanner'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-600/30'
              : 'bg-indigo-50/60 hover:bg-indigo-100/70 border-indigo-200/80 hover:border-indigo-400 text-indigo-950 shadow-2xs hover:shadow-sm'
          }`}
        >
          <QrCode className={`h-6 w-6 sm:h-7 sm:w-7 mb-2 transition-transform group-hover:scale-110 ${
            activeTab === 'qr-scanner' ? 'text-white' : 'text-indigo-600'
          }`} />
          <span className={`text-xs sm:text-sm font-black transition-colors leading-tight ${
            activeTab === 'qr-scanner' ? 'text-white' : 'text-indigo-950 group-hover:text-indigo-900'
          }`}>
            ماسح الـ QR للزبائن
          </span>
        </button>

        {/* زر بوابة الإشراف (إذا كان مشرفاً أو مديراً) */}
        {isStaff && (
          <button
            type="button"
            onClick={() => onSelectTab('staff')}
            className={`group p-3.5 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer relative overflow-hidden active:scale-[0.98] border min-h-[90px] sm:min-h-[100px] ${
              activeTab === 'staff'
                ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-600/30'
                : 'bg-amber-50/60 hover:bg-amber-100/70 border-amber-300/80 hover:border-amber-400 text-amber-950 shadow-2xs hover:shadow-sm'
            }`}
          >
            <ShieldCheck className={`h-6 w-6 sm:h-7 sm:w-7 mb-2 transition-transform group-hover:scale-110 ${
              activeTab === 'staff' ? 'text-white' : 'text-amber-600'
            }`} />
            <span className={`text-xs sm:text-sm font-black transition-colors leading-tight ${
              activeTab === 'staff' ? 'text-white' : 'text-amber-950'
            }`}>
              بوابة الإشراف
            </span>
          </button>
        )}

        {/* ========================================================= */}
        {/* أزرار أدوات الإجراءات السريعة الحية (Fast Modals & Tools) */}
        {/* ========================================================= */}

        {businesses.length > 0 ? (
          <>
            {/* 1. زر تبديل حالة المحل الفورية (مفتوح / مغلق مؤقتاً) */}
            <button
              type="button"
              onClick={onToggleInstantStatus}
              className={`group p-3.5 sm:p-4 border rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden active:scale-[0.98] min-h-[90px] sm:min-h-[100px] ${
                !isCurrentlyOpen
                  ? 'bg-rose-50/70 hover:bg-rose-100/70 border-rose-300 hover:border-rose-400 text-rose-950'
                  : 'bg-emerald-50/70 hover:bg-emerald-100/70 border-emerald-300 hover:border-emerald-500 text-emerald-950'
              }`}
            >
              <Power className={`h-6 w-6 sm:h-7 sm:w-7 mb-2 transition-transform group-hover:scale-110 ${
                !isCurrentlyOpen ? 'text-rose-600' : 'text-emerald-600'
              }`} />
              <span className={`text-xs sm:text-sm font-black transition-colors leading-tight ${
                !isCurrentlyOpen ? 'text-rose-950 group-hover:text-rose-900' : 'text-emerald-950 group-hover:text-[#1a4d2e]'
              }`}>
                تبديل حالة المحل الفورية
              </span>
            </button>

            {/* 2. زر إضافة عرض أو خصم اليوم */}
            <button
              type="button"
              onClick={onOpenAddOfferModal}
              className="group p-3.5 sm:p-4 bg-rose-50/60 hover:bg-rose-100/60 border border-rose-200/90 hover:border-rose-400 text-rose-950 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden active:scale-[0.98] min-h-[90px] sm:min-h-[100px]"
            >
              <Tag className="h-6 w-6 sm:h-7 sm:w-7 text-rose-600 mb-2 transition-transform group-hover:scale-110" />
              <span className="text-xs sm:text-sm font-black text-rose-950 group-hover:text-rose-900 transition-colors leading-tight">
                إضافة عرض أو خصم اليوم
              </span>
            </button>

            {/* 3b. زر نشر خبر / تحديث جديد في آخر الأخبار */}
            {currentBiz && (
              <Link
                to={`/business/${currentBiz.id}?tab=news`}
                className="group p-3.5 sm:p-4 bg-amber-50/60 hover:bg-amber-100/60 border border-amber-200/90 hover:border-amber-400 text-amber-950 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden active:scale-[0.98] min-h-[90px] sm:min-h-[100px]"
              >
                <Megaphone className="h-6 w-6 sm:h-7 sm:w-7 text-amber-600 mb-2 transition-transform group-hover:scale-110" />
                <span className="text-xs sm:text-sm font-black text-amber-950 group-hover:text-amber-900 transition-colors leading-tight">
                  نشر خبر وتحديثات
                </span>
              </Link>
            )}

            {/* 3. زر ملخص المشاهدات اليومية */}
            <button
              type="button"
              onClick={onOpenDailyViewsModal}
              className="group p-3.5 sm:p-4 bg-amber-50/60 hover:bg-amber-100/60 border border-amber-200/90 hover:border-amber-400 text-amber-950 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden active:scale-[0.98] min-h-[90px] sm:min-h-[100px]"
            >
              <BarChart3 className="h-6 w-6 sm:h-7 sm:w-7 text-amber-600 mb-2 transition-transform group-hover:scale-110" />
              <span className="text-xs sm:text-sm font-black text-amber-950 group-hover:text-amber-900 transition-colors leading-tight">
                ملخص المشاهدات اليومية
              </span>
            </button>

            {/* 4. زر تعديل قائمة المنيو الرقمية أو الخدمات والأسعار */}
            {(isMed || isFoodAndDrink) && (
              <button
                type="button"
                onClick={onOpenMenuOrServices}
                className="group p-3.5 sm:p-4 bg-teal-50/60 hover:bg-teal-100/60 border border-teal-200/90 hover:border-teal-400 text-teal-950 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden active:scale-[0.98] min-h-[90px] sm:min-h-[100px]"
              >
                {isMed ? (
                  <Activity className="h-6 w-6 sm:h-7 sm:w-7 text-teal-600 mb-2 transition-transform group-hover:scale-110" />
                ) : (
                  <UtensilsCrossed className="h-6 w-6 sm:h-7 sm:w-7 text-teal-600 mb-2 transition-transform group-hover:scale-110" />
                )}
                <span className="text-xs sm:text-sm font-black text-teal-950 group-hover:text-teal-900 transition-colors leading-tight">
                  {isMed ? 'تعديل الخدمات والأسعار' : 'تعديل قائمة المنيو'}
                </span>
              </button>
            )}

            {/* زر استقبال طلبات الزبائن والمنيو الحية */}
            {isFoodAndDrink && (
              <Link
                to="/profile/live-orders"
                className="group p-3.5 sm:p-4 bg-emerald-50/60 hover:bg-emerald-100/60 border border-emerald-200/90 hover:border-emerald-400 text-emerald-950 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden active:scale-[0.98] min-h-[90px] sm:min-h-[100px]"
              >
                <ConciergeBell className="h-6 w-6 sm:h-7 sm:w-7 text-emerald-600 mb-2 transition-transform group-hover:scale-110" />
                <span className="text-xs sm:text-sm font-black text-emerald-950 group-hover:text-emerald-900 transition-colors leading-tight">
                  استقبال طلبات المنيو الحية
                </span>
              </Link>
            )}

            {/* 5. زر تعديل أوقات الدوام */}
            <button
              type="button"
              onClick={onOpenWorkingHoursModal}
              className="group p-3.5 sm:p-4 bg-sky-50/60 hover:bg-sky-100/60 border border-sky-200/90 hover:border-sky-400 text-sky-950 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden active:scale-[0.98] min-h-[90px] sm:min-h-[100px]"
            >
              <Clock className="h-6 w-6 sm:h-7 sm:w-7 text-sky-600 mb-2 transition-transform group-hover:scale-110" />
              <span className="text-xs sm:text-sm font-black text-sky-950 group-hover:text-sky-900 transition-colors leading-tight">
                تعديل أوقات الدوام
              </span>
            </button>

            {/* 6. زر تعديل صور المحل أو المنشأة */}
            <button
              type="button"
              onClick={onOpenImagesModal}
              className="group p-3.5 sm:p-4 bg-emerald-50/60 hover:bg-emerald-100/60 border border-emerald-200/90 hover:border-[#1a4d2e]/40 text-stone-900 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden active:scale-[0.98] min-h-[90px] sm:min-h-[100px]"
            >
              <Camera className="h-6 w-6 sm:h-7 sm:w-7 text-[#1a4d2e] mb-2 transition-transform group-hover:scale-110" />
              <span className="text-xs sm:text-sm font-black text-stone-900 group-hover:text-[#1a4d2e] transition-colors leading-tight">
                تعديل صور {isMed ? 'المنشأة' : 'المحل'}
              </span>
            </button>

            {/* 7. زر النافذة الترحيبية */}
            <button
              type="button"
              onClick={onOpenWelcomePopupModal}
              className="group p-3.5 sm:p-4 bg-amber-50/60 hover:bg-amber-100/60 border border-amber-200/90 hover:border-amber-400 text-amber-950 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden active:scale-[0.98] min-h-[90px] sm:min-h-[100px]"
            >
              <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-amber-500 fill-amber-500 mb-2 transition-transform group-hover:scale-110" />
              <span className="text-xs sm:text-sm font-black text-amber-950 group-hover:text-amber-900 transition-colors leading-tight">
                النافذة الترحيبية
              </span>
            </button>

            {/* 8. زر طلب الخدمات التسويقية */}
            <button
              type="button"
              onClick={onOpenMarketingServices}
              className="group p-3.5 sm:p-4 bg-orange-50/60 hover:bg-orange-100/60 border border-orange-200/90 hover:border-[#ff9f1c]/50 text-orange-950 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden active:scale-[0.98] min-h-[90px] sm:min-h-[100px]"
            >
              <Rocket className="h-6 w-6 sm:h-7 sm:w-7 text-[#ff9f1c] fill-current mb-2 transition-transform group-hover:scale-110" />
              <span className="text-xs sm:text-sm font-black text-orange-950 group-hover:text-orange-900 transition-colors leading-tight">
                طلب الخدمات التسويقية
              </span>
            </button>

            {/* 9. زر بوسترات QR */}
            <button
              type="button"
              onClick={onOpenQrPosters}
              className="group p-3.5 sm:p-4 bg-purple-50/60 hover:bg-purple-100/60 border border-purple-200/90 hover:border-purple-400 text-purple-950 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden active:scale-[0.98] min-h-[90px] sm:min-h-[100px]"
            >
              <QrCode className="h-6 w-6 sm:h-7 sm:w-7 text-purple-600 mb-2 transition-transform group-hover:scale-110" />
              <span className="text-xs sm:text-sm font-black text-purple-950 group-hover:text-purple-900 transition-colors leading-tight">
                بوسترات QR
              </span>
            </button>

            {/* 10. زر أرقام التواصل والواتساب السريع */}
            <button
              type="button"
              onClick={onOpenContactModal}
              className="group p-3.5 sm:p-4 bg-cyan-50/60 hover:bg-cyan-100/60 border border-cyan-200/90 hover:border-cyan-400 text-cyan-950 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden active:scale-[0.98] min-h-[90px] sm:min-h-[100px]"
            >
              <PhoneCall className="h-6 w-6 sm:h-7 sm:w-7 text-cyan-600 mb-2 transition-transform group-hover:scale-110" />
              <span className="text-xs sm:text-sm font-black text-cyan-950 group-hover:text-cyan-900 transition-colors leading-tight">
                أرقام التواصل والواتساب
              </span>
            </button>

            {/* 11. زر نشر وظيفة شاغرة سريعة */}
            <button
              type="button"
              onClick={onOpenQuickJobModal}
              className="group p-3.5 sm:p-4 bg-violet-50/60 hover:bg-violet-100/60 border border-violet-200/90 hover:border-violet-400 text-violet-950 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden active:scale-[0.98] min-h-[90px] sm:min-h-[100px]"
            >
              <Briefcase className="h-6 w-6 sm:h-7 sm:w-7 text-violet-600 mb-2 transition-transform group-hover:scale-110" />
              <span className="text-xs sm:text-sm font-black text-violet-950 group-hover:text-violet-900 transition-colors leading-tight">
                نشر وظيفة شاغرة
              </span>
            </button>

            {/* 12. زر حالة وتاريخ اشتراك الباقة الذهبية VIP */}
            <button
              type="button"
              onClick={onOpenVipSubscriptionStatus}
              className={`group p-3.5 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden active:scale-[0.98] border min-h-[90px] sm:min-h-[100px] ${
                isVip
                  ? 'bg-amber-50/80 hover:bg-amber-100/80 border-amber-300/90 hover:border-amber-500 text-amber-950'
                  : 'bg-amber-50/60 hover:bg-amber-100/60 border-amber-200/90 hover:border-amber-400 text-amber-950'
              }`}
            >
              <Crown className="h-6 w-6 sm:h-7 sm:w-7 text-amber-600 fill-current mb-2 transition-transform group-hover:scale-110" />
              <span className="text-xs sm:text-sm font-black text-amber-950 group-hover:text-amber-900 transition-colors leading-tight">
                {isVip ? 'تفاصيل اشتراك VIP' : 'حالة اشتراك الباقة'}
              </span>
            </button>
          </>
        ) : (
          <>
            {/* إضافة محل تجاري */}
            <Link
              to="/contact"
              className="group p-3.5 sm:p-4 bg-emerald-50/60 hover:bg-emerald-100/60 border border-emerald-200/90 hover:border-emerald-400 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden min-h-[90px] sm:min-h-[100px]"
            >
              <Store className="h-6 w-6 sm:h-7 sm:w-7 text-[#1a4d2e] mb-2 transition-transform group-hover:scale-110" />
              <span className="text-xs sm:text-sm font-black text-[#1a4d2e] group-hover:text-[#133b22] transition-colors leading-tight">
                تسجيل محل تجاري
              </span>
            </Link>

            {/* إضافة منشأة طبية */}
            <Link
              to="/medical/add"
              className="group p-3.5 sm:p-4 bg-teal-50/60 hover:bg-teal-100/60 border border-teal-200/90 hover:border-teal-400 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden min-h-[90px] sm:min-h-[100px]"
            >
              <Stethoscope className="h-6 w-6 sm:h-7 sm:w-7 text-teal-700 mb-2 transition-transform group-hover:scale-110" />
              <span className="text-xs sm:text-sm font-black text-teal-900 group-hover:text-teal-950 transition-colors leading-tight">
                تسجيل منشأة طبية
              </span>
            </Link>

            {/* نشر وظيفة شاغرة سريعة */}
            <button
              type="button"
              onClick={onOpenQuickJobModal}
              className="group p-3.5 sm:p-4 bg-violet-50/60 hover:bg-violet-100/60 border border-violet-200/90 hover:border-violet-400 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden min-h-[90px] sm:min-h-[100px]"
            >
              <Briefcase className="h-6 w-6 sm:h-7 sm:w-7 text-violet-600 mb-2 transition-transform group-hover:scale-110" />
              <span className="text-xs sm:text-sm font-black text-violet-950 group-hover:text-violet-900 transition-colors leading-tight">
                نشر وظيفة شاغرة
              </span>
            </button>

            {/* طلب الخدمات التسويقية */}
            <button
              type="button"
              onClick={onOpenMarketingServices}
              className="group p-3.5 sm:p-4 bg-orange-50/60 hover:bg-orange-100/60 border border-orange-200/90 hover:border-orange-400 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-sm cursor-pointer relative overflow-hidden min-h-[90px] sm:min-h-[100px]"
            >
              <Rocket className="h-6 w-6 sm:h-7 sm:w-7 text-[#ff9f1c] fill-current mb-2 transition-transform group-hover:scale-110" />
              <span className="text-xs sm:text-sm font-black text-orange-950 group-hover:text-orange-900 transition-colors leading-tight">
                طلب الخدمات التسويقية
              </span>
            </button>
          </>
        )}

      </div>
    </div>
  );
}
