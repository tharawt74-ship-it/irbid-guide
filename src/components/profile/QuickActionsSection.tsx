import React from 'react';
import { 
 Camera, 
 Megaphone,
 Newspaper,
 Clock, 
 Sparkles, 
 QrCode, 
 UtensilsCrossed, 
 Activity, 
 Zap,
 ArrowUpLeft,
 Tag,
 PhoneCall,
 LayoutDashboard,
 Heart,
 Home,
 ClipboardList,
 ShieldCheck,
 Store,
 Stethoscope,
 ChevronDown,
 Building2,
 ExternalLink,
 Check,
 Plus,
 ArrowLeft,
 Briefcase,
 Power,
 BarChart3,
 TrendingUp,
 Rocket,
 Crown,
  ConciergeBell
} from 'lucide-react';
import { Business } from '../../types';
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
 const isCustomClosed = !!currentBiz?.workingHours?.isCustomClosed;
 const isCustomOpen = !!currentBiz?.workingHours?.isCustomOpen;
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

 {/* 3. Header: Golden "الأزرار السريعة" (Now between Dashboard button and Buttons Grid) */}
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

 {/* 4. Grid of all other buttons below "الأزرار السريعة" */}
 <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5 pt-1">
 
 {/* ========================================================= */}
 {/* أزرار الأقسام والصفحات الرئيسية (Navigational Actions) */}
 {/* ========================================================= */}

 {/* زر تفاعلاتي ومفضلتي */}
 <button
 type="button"
 onClick={() => onSelectTab('visitor')}
 className={`group p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer relative overflow-hidden active:scale-[0.98] border ${
 activeTab === 'visitor'
 ? 'bg-rose-700 text-white border-rose-700 shadow-md ring-2 ring-rose-700/30'
 : 'bg-stone-50/80 hover:bg-rose-50/50 border-stone-200/90 hover:border-rose-400 text-stone-900 shadow-2xs hover:shadow-sm'
 }`}
 >
 <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mb-2 transition-colors shrink-0 shadow-2xs ${
 activeTab === 'visitor'
 ? 'bg-white/20 text-white'
 : 'bg-rose-100 text-rose-600 group-hover:bg-rose-600 group-hover:text-white'
 }`}>
 <Heart className="h-5 w-5 sm:h-6 sm:w-6 fill-current" />
 </div>
 <h4 className={`text-xs sm:text-sm font-black transition-colors leading-tight ${
 activeTab === 'visitor' ? 'text-white' : 'text-stone-900 group-hover:text-rose-700'
 }`}>
 تفاعلاتي ومفضلتي
 </h4>
 <span className={`text-[10px] sm:text-[11px] mt-1 line-clamp-1 font-medium ${
 activeTab === 'visitor' ? 'text-rose-100' : 'text-stone-500 group-hover:text-stone-700'
 }`}>
 المفضلة والتقييمات والمكافآت
 </span>
 <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1.5 ${
 activeTab === 'visitor' ? 'bg-white/20 text-white' : 'bg-rose-50 text-rose-700'
 }`}>
 صفحة تفاعلية
 </span>
 </button>

 {/* زر سكناتي */}
 <button
 type="button"
 onClick={() => onSelectTab('housing')}
 className={`group p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer relative overflow-hidden active:scale-[0.98] border ${
 activeTab === 'housing'
 ? 'bg-amber-700 text-white border-amber-700 shadow-md ring-2 ring-amber-700/30'
 : 'bg-stone-50/80 hover:bg-amber-50/50 border-stone-200/90 hover:border-amber-400 text-stone-900 shadow-2xs hover:shadow-sm'
 }`}
 >
 <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mb-2 transition-colors shrink-0 shadow-2xs ${
 activeTab === 'housing'
 ? 'bg-white/20 text-white'
 : 'bg-amber-100 text-amber-700 group-hover:bg-amber-700 group-hover:text-white'
 }`}>
 <Home className="h-5 w-5 sm:h-6 sm:w-6" />
 </div>
 <h4 className={`text-xs sm:text-sm font-black transition-colors leading-tight ${
 activeTab === 'housing' ? 'text-white' : 'text-stone-900 group-hover:text-amber-800'
 }`}>
 سكناتي
 </h4>
 <span className={`text-[10px] sm:text-[11px] mt-1 line-clamp-1 font-medium ${
 activeTab === 'housing' ? 'text-amber-100' : 'text-stone-500 group-hover:text-stone-700'
 }`}>
 {housingCount} شقق وسكنات مسجلة
 </span>
 <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1.5 ${
 activeTab === 'housing' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-800'
 }`}>
 صفحة السكنات
 </span>
 </button>

 {/* زر طلباتي */}
 <button
 type="button"
 onClick={() => onSelectTab('requests')}
 className={`group p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer relative overflow-hidden active:scale-[0.98] border ${
 activeTab === 'requests'
 ? 'bg-teal-700 text-white border-teal-700 shadow-md ring-2 ring-teal-700/30'
 : 'bg-stone-50/80 hover:bg-teal-50/50 border-stone-200/90 hover:border-teal-400 text-stone-900 shadow-2xs hover:shadow-sm'
 }`}
 >
 <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mb-2 transition-colors shrink-0 shadow-2xs ${
 activeTab === 'requests'
 ? 'bg-white/20 text-white'
 : 'bg-teal-100 text-teal-700 group-hover:bg-teal-700 group-hover:text-white'
 }`}>
 <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6" />
 </div>
 <h4 className={`text-xs sm:text-sm font-black transition-colors leading-tight ${
 activeTab === 'requests' ? 'text-white' : 'text-stone-900 group-hover:text-teal-800'
 }`}>
 طلباتي
 </h4>
 <span className={`text-[10px] sm:text-[11px] mt-1 line-clamp-1 font-medium ${
 activeTab === 'requests' ? 'text-teal-100' : 'text-stone-500 group-hover:text-stone-700'
 }`}>
 {requestsCount} طلبات تسجيل وتسويق
 </span>
 <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1.5 ${
 activeTab === 'requests' ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-800'
 }`}>
 صفحة المعاملات
 </span>
 </button>

 {/* زر ماسح الـ QR للزبائن */}
 <button
 type="button"
 onClick={() => onSelectTab('qr-scanner')}
 className={`group p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer relative overflow-hidden active:scale-[0.98] border ${
 activeTab === 'qr-scanner'
 ? 'bg-indigo-700 text-white border-indigo-700 shadow-md ring-2 ring-indigo-700/30'
 : 'bg-stone-50/80 hover:bg-indigo-50/50 border-stone-200/90 hover:border-indigo-400 text-stone-900 shadow-2xs hover:shadow-sm'
 }`}
 >
 <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mb-2 transition-colors shrink-0 shadow-2xs ${
 activeTab === 'qr-scanner'
 ? 'bg-white/20 text-white'
 : 'bg-indigo-100 text-indigo-700 group-hover:bg-indigo-700 group-hover:text-white'
 }`}>
 <QrCode className="h-5 w-5 sm:h-6 sm:w-6" />
 </div>
 <h4 className={`text-xs sm:text-sm font-black transition-colors leading-tight ${
 activeTab === 'qr-scanner' ? 'text-white' : 'text-stone-900 group-hover:text-indigo-800'
 }`}>
 ماسح الـ QR للزبائن
 </h4>
 <span className={`text-[10px] sm:text-[11px] mt-1 line-clamp-1 font-medium ${
 activeTab === 'qr-scanner' ? 'text-indigo-100' : 'text-stone-500 group-hover:text-stone-700'
 }`}>
 مسح الكوبونات والخصومات
 </span>
 <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1.5 ${
 activeTab === 'qr-scanner' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-800'
 }`}>
 ماسح ذكي
 </span>
 </button>

 {/* زر بوابة الإشراف (إذا كان مشرفاً أو مديراً) */}
 {isStaff && (
 <button
 type="button"
 onClick={() => onSelectTab('staff')}
 className={`group p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer relative overflow-hidden active:scale-[0.98] border ${
 activeTab === 'staff'
 ? 'bg-amber-600 text-white border-amber-600 shadow-md ring-2 ring-amber-600/30'
 : 'bg-amber-50/50 hover:bg-amber-100/60 border-amber-200/90 text-amber-900 shadow-2xs hover:shadow-sm'
 }`}
 >
 <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mb-2 transition-colors shrink-0 shadow-2xs ${
 activeTab === 'staff'
 ? 'bg-white/20 text-white'
 : 'bg-amber-200 text-amber-900 group-hover:bg-amber-600 group-hover:text-white'
 }`}>
 <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6" />
 </div>
 <h4 className={`text-xs sm:text-sm font-black transition-colors leading-tight ${
 activeTab === 'staff' ? 'text-white' : 'text-amber-950'
 }`}>
 بوابة الإشراف
 </h4>
 <span className={`text-[10px] sm:text-[11px] mt-1 line-clamp-1 font-medium ${
 activeTab === 'staff' ? 'text-amber-100' : 'text-amber-800'
 }`}>
 صلاحيات المراجعة والإدارة
 </span>
 <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1.5 ${
 activeTab === 'staff' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-900'
 }`}>
 بوابة إدارية
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
 className={`group p-3 sm:p-4 border rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-md cursor-pointer relative overflow-hidden active:scale-[0.98] ${
 !isCurrentlyOpen
 ? 'bg-rose-50/80 hover:bg-rose-100/70 border-rose-300 hover:border-rose-400'
 : 'bg-emerald-50/70 hover:bg-emerald-100/60 border-emerald-300 hover:border-emerald-500'
 }`}
 >
 <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mb-2 transition-colors shadow-2xs shrink-0 ${
 !isCurrentlyOpen
 ? 'bg-rose-200 text-rose-800 group-hover:bg-rose-600 group-hover:text-white'
 : 'bg-emerald-200 text-[#1a4d2e] group-hover:bg-[#1a4d2e] group-hover:text-white'
 }`}>
 <Power className="h-5 w-5 sm:h-6 sm:w-6" />
 </div>
 <h4 className={`text-xs sm:text-sm font-black transition-colors leading-tight ${
 !isCurrentlyOpen ? 'text-rose-950 group-hover:text-rose-900' : 'text-emerald-950 group-hover:text-[#1a4d2e]'
 }`}>
 تبديل حالة المحل الفورية
 </h4>
 <span className={`text-[10px] sm:text-[11px] mt-1 line-clamp-1 font-bold ${
 !isCurrentlyOpen ? 'text-rose-700' : 'text-emerald-700'
 }`}>
 {isCustomClosed 
   ? 'المحل مغلق مؤقتاً (بطلبك) 🔴' 
   : isCustomOpen 
     ? 'مفتوح استثنائياً (بطلبك) 🟢' 
     : !isCurrentlyOpen 
       ? 'مغلق خارج ساعات الدوام 🔴' 
       : 'المحل مفتوح للزوار حالياً 🟢'}
 </span>
 <span className={`text-[9px] font-black px-2 py-0.5 rounded-md mt-1.5 shadow-2xs ${
 !isCurrentlyOpen
 ? 'bg-emerald-600 text-white group-hover:bg-emerald-700'
 : 'bg-rose-600 text-white group-hover:bg-rose-700'
 }`}>
 {isCustomClosed 
   ? 'اضغط لإلغاء الإغلاق والفتح 🟢' 
   : isCustomOpen 
     ? 'اضغط للعودة للإغلاق الطبيعي 🔴' 
     : !isCurrentlyOpen 
       ? 'اضغط للفتح الفوري 🟢' 
       : 'اضغط للإغلاق المؤقت 🔴'}
 </span>
 <ArrowUpLeft className="h-3.5 w-3.5 text-stone-300 group-hover:text-stone-600 absolute top-2.5 left-2.5 transition-colors hidden sm:block" />
 </button>

 {/* 2. زر إضافة عرض أو خصم اليوم */}
 <button
 type="button"
 onClick={onOpenAddOfferModal}
 className="group p-3 sm:p-4 bg-stone-50/70 hover:bg-rose-50/40 border border-stone-200/90 hover:border-rose-500/40 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-md cursor-pointer relative overflow-hidden active:scale-[0.98]"
 >
 <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-rose-100 text-rose-800 group-hover:bg-rose-600 group-hover:text-white flex items-center justify-center mb-2 transition-colors shadow-2xs shrink-0">
 <Tag className="h-5 w-5 sm:h-6 sm:w-6" />
 </div>
 <h4 className="text-xs sm:text-sm font-black text-stone-900 group-hover:text-rose-900 transition-colors leading-tight">
 إضافة عرض أو خصم اليوم
 </h4>
 <span className="text-[10px] sm:text-[11px] text-stone-500 group-hover:text-stone-700 mt-1 line-clamp-1 font-medium">
 عروض ترويجية وخصومات حية
 </span>
 <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1.5 bg-stone-200/70 text-stone-700 group-hover:bg-rose-100 group-hover:text-rose-900">
 نشر مباشر
 </span>
 <ArrowUpLeft className="h-3.5 w-3.5 text-stone-300 group-hover:text-rose-600 absolute top-2.5 left-2.5 transition-colors hidden sm:block" />
 </button>

 {/* 3b. زر نشر خبر / تحديث جديد في آخر الأخبار */}
 {currentBiz && (
 <Link
 to={`/business/${currentBiz.id}?tab=news`}
 className="group p-3 sm:p-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-md cursor-pointer relative overflow-hidden active:scale-[0.98]"
 >
 <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500 text-stone-950 group-hover:scale-105 flex items-center justify-center mb-2 transition-transform shadow-2xs shrink-0">
 <Megaphone className="h-5 w-5 sm:h-6 sm:w-6" />
 </div>
 <h4 className="text-xs sm:text-sm font-black text-stone-900 group-hover:text-amber-900 transition-colors leading-tight">
 نشر خبر / العروض والتحديثات
 </h4>
 <span className="text-[10px] sm:text-[11px] text-amber-900 mt-1 line-clamp-1 font-black">
 إضافة منشور رسمي في تبويب آخر الأخبار
 </span>
 <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1.5 bg-amber-600 text-white">
 آخر الأخبار VIP 👑
 </span>
 <ArrowUpLeft className="h-3.5 w-3.5 text-stone-300 group-hover:text-amber-700 absolute top-2.5 left-2.5 transition-colors hidden sm:block" />
 </Link>
 )}

 {/* 3. زر ملخص المشاهدات اليومية */}
 <button
 type="button"
 onClick={onOpenDailyViewsModal}
 className="group p-3 sm:p-4 bg-stone-50/70 hover:bg-amber-50/40 border border-stone-200/90 hover:border-amber-500/40 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-md cursor-pointer relative overflow-hidden active:scale-[0.98]"
 >
 <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-100 text-amber-800 group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center mb-2 transition-colors shadow-2xs shrink-0">
 <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
 </div>
 <h4 className="text-xs sm:text-sm font-black text-stone-900 group-hover:text-amber-900 transition-colors leading-tight">
 ملخص المشاهدات اليومية
 </h4>
 <span className="text-[10px] sm:text-[11px] text-stone-500 group-hover:text-stone-700 mt-1 line-clamp-1 font-medium">
 الزيارات، النقرات، ونشاط الزوار
 </span>
 <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1.5 bg-stone-200/70 text-stone-700 group-hover:bg-amber-100 group-hover:text-amber-900">
 إحصائيات حية
 </span>
 <ArrowUpLeft className="h-3.5 w-3.5 text-stone-300 group-hover:text-amber-600 absolute top-2.5 left-2.5 transition-colors hidden sm:block" />
 </button>

 {/* 4. زر تعديل قائمة المنيو الرقمية أو الخدمات والأسعار */}
 {(isMed || isFoodAndDrink) && (
 <button
 type="button"
 onClick={onOpenMenuOrServices}
 className="group p-3 sm:p-4 bg-stone-50/70 hover:bg-emerald-50/40 border border-stone-200/90 hover:border-emerald-600/40 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-md cursor-pointer relative overflow-hidden active:scale-[0.98]"
 >
 <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-teal-100 text-teal-800 group-hover:bg-teal-700 group-hover:text-white flex items-center justify-center mb-2 transition-colors shadow-2xs shrink-0">
 {isMed ? (
 <Activity className="h-5 w-5 sm:h-6 sm:w-6" />
 ) : (
 <UtensilsCrossed className="h-5 w-5 sm:h-6 sm:w-6" />
 )}
 </div>
 <h4 className="text-xs sm:text-sm font-black text-stone-900 group-hover:text-teal-900 transition-colors leading-tight">
 {isMed ? 'تعديل الخدمات والأسعار' : 'تعديل قائمة المنيو'}
 </h4>
 <span className="text-[10px] sm:text-[11px] text-stone-500 group-hover:text-stone-700 mt-1 line-clamp-1 font-medium">
 {isMed ? 'كشفيات وإجراءات وأسعار العيادة' : 'أصناف وقوائم الأسعار والتصنيفات'}
 </span>
 <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1.5 bg-stone-200/70 text-stone-700 group-hover:bg-teal-100 group-hover:text-teal-900">
 {isMed ? 'قسم الخدمات' : 'المنيو الرقمي'}
 </span>
 <ArrowUpLeft className="h-3.5 w-3.5 text-stone-300 group-hover:text-teal-700 absolute top-2.5 left-2.5 transition-colors hidden sm:block" />
 </button>
 )}

 {/* زر استقبال طلبات الزبائن والمنيو الحية */}
 {isFoodAndDrink && (
 <Link
 to="/profile/live-orders"
 className="group p-3 sm:p-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-md cursor-pointer relative overflow-hidden active:scale-[0.98]"
 >
 <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-500 text-stone-950 group-hover:scale-105 flex items-center justify-center mb-2 transition-transform shadow-2xs shrink-0">
 <ConciergeBell className="h-5 w-5 sm:h-6 sm:w-6" />
 </div>
 <h4 className="text-xs sm:text-sm font-black text-stone-900 group-hover:text-emerald-900 transition-colors leading-tight">
 استقبال طلبات المنيو الحية
 </h4>
 <span className="text-[10px] sm:text-[11px] text-emerald-800 mt-1 line-clamp-1 font-black">
 شاشة استقبال وإعداد طلبات الزبائن
 </span>
 <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1.5 bg-emerald-600 text-white">
 استقبال مباشر 
 </span>
 <ArrowUpLeft className="h-3.5 w-3.5 text-stone-300 group-hover:text-emerald-700 absolute top-2.5 left-2.5 transition-colors hidden sm:block" />
 </Link>
 )}

 {/* 5. زر تعديل أوقات الدوام */}
 <button
 type="button"
 onClick={onOpenWorkingHoursModal}
 className="group p-3 sm:p-4 bg-stone-50/70 hover:bg-blue-50/40 border border-stone-200/90 hover:border-blue-500/40 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-md cursor-pointer relative overflow-hidden active:scale-[0.98]"
 >
 <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-100 text-blue-800 group-hover:bg-blue-700 group-hover:text-white flex items-center justify-center mb-2 transition-colors shadow-2xs shrink-0">
 <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
 </div>
 <h4 className="text-xs sm:text-sm font-black text-stone-900 group-hover:text-blue-900 transition-colors leading-tight">
 تعديل أوقات الدوام
 </h4>
 <span className="text-[10px] sm:text-[11px] text-stone-500 group-hover:text-stone-700 mt-1 line-clamp-1 font-medium">
 ساعات ومواعيد العمل الحية
 </span>
 <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1.5 bg-stone-200/70 text-stone-700 group-hover:bg-blue-100 group-hover:text-blue-900">
 تعديل سريع
 </span>
 <ArrowUpLeft className="h-3.5 w-3.5 text-stone-300 group-hover:text-blue-700 absolute top-2.5 left-2.5 transition-colors hidden sm:block" />
 </button>

 {/* 6. زر تعديل صور المحل أو المنشأة */}
 <button
 type="button"
 onClick={onOpenImagesModal}
 className="group p-3 sm:p-4 bg-stone-50/70 hover:bg-emerald-50/40 border border-stone-200/90 hover:border-[#1a4d2e]/40 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-md cursor-pointer relative overflow-hidden active:scale-[0.98]"
 >
 <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-100 text-[#1a4d2e] group-hover:bg-[#1a4d2e] group-hover:text-white flex items-center justify-center mb-2 transition-colors shadow-2xs shrink-0">
 <Camera className="h-5 w-5 sm:h-6 sm:w-6" />
 </div>
 <h4 className="text-xs sm:text-sm font-black text-stone-900 group-hover:text-[#1a4d2e] transition-colors leading-tight">
 تعديل صور {isMed ? 'المنشأة' : 'المحل'}
 </h4>
 <span className="text-[10px] sm:text-[11px] text-stone-500 group-hover:text-stone-700 mt-1 line-clamp-1 font-medium">
 الشعار والغلاف وفيديو الغلاف
 </span>
 <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1.5 bg-stone-200/70 text-stone-700 group-hover:bg-emerald-100 group-hover:text-[#1a4d2e]">
 تعديل سريع
 </span>
 <ArrowUpLeft className="h-3.5 w-3.5 text-stone-300 group-hover:text-[#1a4d2e] absolute top-2.5 left-2.5 transition-colors hidden sm:block" />
 </button>

 {/* 7. زر النافذة الترحيبية */}
 <button
 type="button"
 onClick={onOpenWelcomePopupModal}
 className="group p-3 sm:p-4 bg-stone-50/70 hover:bg-amber-50/40 border border-stone-200/90 hover:border-amber-500/40 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-md cursor-pointer relative overflow-hidden active:scale-[0.98]"
 >
 <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-amber-100 text-amber-800 group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center mb-2 transition-colors shadow-2xs shrink-0">
 <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 fill-amber-400 text-amber-700 group-hover:fill-white group-hover:text-white" />
 </div>
 <h4 className="text-xs sm:text-sm font-black text-stone-900 group-hover:text-amber-900 transition-colors leading-tight">
 النافذة الترحيبية
 </h4>
 <span className="text-[10px] sm:text-[11px] text-stone-500 group-hover:text-stone-700 mt-1 line-clamp-1 font-medium">
 نافذة منبثقة (صورة أو فيديو)
 </span>
 <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1.5 bg-stone-200/70 text-stone-700 group-hover:bg-amber-100 group-hover:text-amber-900">
 تعديل سريع
 </span>
 <ArrowUpLeft className="h-3.5 w-3.5 text-stone-300 group-hover:text-amber-600 absolute top-2.5 left-2.5 transition-colors hidden sm:block" />
 </button>

 {/* 8. زر طلب الخدمات التسويقية */}
 <button
 type="button"
 onClick={onOpenMarketingServices}
 className="group p-3 sm:p-4 bg-stone-50/70 hover:bg-orange-50/40 border border-stone-200/90 hover:border-[#ff9f1c]/50 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-md cursor-pointer relative overflow-hidden active:scale-[0.98]"
 >
 <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-orange-100 text-[#ff9f1c] group-hover:bg-[#ff9f1c] group-hover:text-stone-950 flex items-center justify-center mb-2 transition-colors shadow-2xs shrink-0">
 <Rocket className="h-5 w-5 sm:h-6 sm:w-6 fill-current" />
 </div>
 <h4 className="text-xs sm:text-sm font-black text-stone-900 group-hover:text-orange-950 transition-colors leading-tight">
 طلب الخدمات التسويقية
 </h4>
 <span className="text-[10px] sm:text-[11px] text-stone-500 group-hover:text-stone-700 mt-1 line-clamp-1 font-medium">
 صدارة البحث، إشعارات، وبانرات
 </span>
 <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1.5 bg-stone-200/70 text-stone-700 group-hover:bg-orange-100 group-hover:text-orange-900">
 ترويج وإشهار 
 </span>
 <ArrowUpLeft className="h-3.5 w-3.5 text-stone-300 group-hover:text-[#ff9f1c] absolute top-2.5 left-2.5 transition-colors hidden sm:block" />
 </button>

 {/* 9. زر بوسترات QR */}
 <button
 type="button"
 onClick={onOpenQrPosters}
 className="group p-3 sm:p-4 bg-stone-50/70 hover:bg-purple-50/40 border border-stone-200/90 hover:border-purple-500/40 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-md cursor-pointer relative overflow-hidden active:scale-[0.98]"
 >
 <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-purple-100 text-purple-800 group-hover:bg-purple-700 group-hover:text-white flex items-center justify-center mb-2 transition-colors shadow-2xs shrink-0">
 <QrCode className="h-5 w-5 sm:h-6 sm:w-6" />
 </div>
 <h4 className="text-xs sm:text-sm font-black text-stone-900 group-hover:text-purple-900 transition-colors leading-tight">
 بوسترات QR
 </h4>
 <span className="text-[10px] sm:text-[11px] text-stone-500 group-hover:text-stone-700 mt-1 line-clamp-1 font-medium">
 ملصقات وطاولات الباركود الذكية
 </span>
 <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1.5 bg-stone-200/70 text-stone-700 group-hover:bg-purple-100 group-hover:text-purple-900">
 طباعة وتصميم
 </span>
 <ArrowUpLeft className="h-3.5 w-3.5 text-stone-300 group-hover:text-purple-700 absolute top-2.5 left-2.5 transition-colors hidden sm:block" />
 </button>

 {/* 10. زر أرقام التواصل والواتساب السريع */}
 <button
 type="button"
 onClick={onOpenContactModal}
 className="group p-3 sm:p-4 bg-stone-50/70 hover:bg-sky-50/40 border border-stone-200/90 hover:border-sky-500/40 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-md cursor-pointer relative overflow-hidden active:scale-[0.98]"
 >
 <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-sky-100 text-sky-800 group-hover:bg-sky-600 group-hover:text-white flex items-center justify-center mb-2 transition-colors shadow-2xs shrink-0">
 <PhoneCall className="h-5 w-5 sm:h-6 sm:w-6" />
 </div>
 <h4 className="text-xs sm:text-sm font-black text-stone-900 group-hover:text-sky-900 transition-colors leading-tight">
 أرقام التواصل والواتساب
 </h4>
 <span className="text-[10px] sm:text-[11px] text-stone-500 group-hover:text-stone-700 mt-1 line-clamp-1 font-medium">
 الهاتف المباشر وخطوط المحادثة
 </span>
 <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1.5 bg-stone-200/70 text-stone-700 group-hover:bg-sky-100 group-hover:text-sky-900">
 تعديل سريع
 </span>
 <ArrowUpLeft className="h-3.5 w-3.5 text-stone-300 group-hover:text-sky-600 absolute top-2.5 left-2.5 transition-colors hidden sm:block" />
 </button>

 {/* 11. زر نشر وظيفة شاغرة سريعة */}
 <button
 type="button"
 onClick={onOpenQuickJobModal}
 className="group p-3 sm:p-4 bg-stone-50/70 hover:bg-violet-50/40 border border-stone-200/90 hover:border-violet-500/40 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-md cursor-pointer relative overflow-hidden active:scale-[0.98]"
 >
 <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-violet-100 text-violet-800 group-hover:bg-violet-700 group-hover:text-white flex items-center justify-center mb-2 transition-colors shadow-2xs shrink-0">
 <Briefcase className="h-5 w-5 sm:h-6 sm:w-6" />
 </div>
 <h4 className="text-xs sm:text-sm font-black text-stone-900 group-hover:text-violet-900 transition-colors leading-tight">
 نشر وظيفة شاغرة سريعة
 </h4>
 <span className="text-[10px] sm:text-[11px] text-stone-500 group-hover:text-stone-700 mt-1 line-clamp-1 font-medium">
 باريستا، كاشير، طهاة، وفريق عمل
 </span>
 <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1.5 bg-stone-200/70 text-stone-700 group-hover:bg-violet-100 group-hover:text-violet-900">
 توظيف مباشر
 </span>
 <ArrowUpLeft className="h-3.5 w-3.5 text-stone-300 group-hover:text-violet-700 absolute top-2.5 left-2.5 transition-colors hidden sm:block" />
 </button>

 {/* 12. زر حالة وتاريخ اشتراك الباقة الذهبية VIP */}
 <button
 type="button"
 onClick={onOpenVipSubscriptionStatus}
 className={`group p-3 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-md cursor-pointer relative overflow-hidden active:scale-[0.98] ${
 isVip
 ? 'bg-gradient-to-b from-amber-500/10 via-amber-50/40 to-white hover:bg-amber-100/60 border border-amber-300/80 hover:border-amber-500'
 : 'bg-stone-50/70 hover:bg-amber-50/40 border border-stone-200/90 hover:border-amber-400 rounded-2xl'
 }`}
 >
 <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mb-2 transition-colors shadow-2xs shrink-0 ${
 isVip
 ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950 group-hover:scale-105'
 : 'bg-amber-100 text-amber-800 group-hover:bg-amber-500 group-hover:text-stone-950'
 }`}>
 <Crown className="h-5 w-5 sm:h-6 sm:w-6 fill-current" />
 </div>
 <h4 className="text-xs sm:text-sm font-black text-stone-900 group-hover:text-amber-950 transition-colors leading-tight">
 {isVip ? 'تفاصيل اشتراك VIP' : 'حالة اشتراك الباقة'}
 </h4>
 <span className="text-[10px] sm:text-[11px] text-stone-500 group-hover:text-stone-700 mt-1 line-clamp-1 font-medium">
 {isVip ? 'النوع، الصلاحية، وتاريخ التجديد' : 'معرفة النوع والترقية للذهبية'}
 </span>
 <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1.5 ${
 isVip 
 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
 : 'bg-stone-200/70 text-stone-700 group-hover:bg-amber-100 group-hover:text-amber-900'
 }`}>
 {isVip ? 'مشترك نشط ' : 'الباقة الذهبية VIP'}
 </span>
 <ArrowUpLeft className="h-3.5 w-3.5 text-stone-300 group-hover:text-amber-600 absolute top-2.5 left-2.5 transition-colors hidden sm:block" />
 </button>
 </>
 ) : (
 <>
 {/* إضافة محل تجاري */}
 <Link
 to="/contact"
 className="group p-3 sm:p-4 bg-emerald-50/60 hover:bg-[#1a4d2e] border border-emerald-200 hover:border-[#1a4d2e] rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-md cursor-pointer relative overflow-hidden"
 >
 <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-100 text-[#1a4d2e] group-hover:bg-white/20 group-hover:text-white flex items-center justify-center mb-2 transition-colors shadow-2xs shrink-0">
 <Store className="h-5 w-5 sm:h-6 sm:w-6" />
 </div>
 <h4 className="text-xs sm:text-sm font-black text-[#1a4d2e] group-hover:text-white transition-colors leading-tight">
 تسجيل محل تجاري 
 </h4>
 <span className="text-[10px] sm:text-[11px] text-stone-500 group-hover:text-emerald-100 mt-1 line-clamp-1 font-medium">
 مطاعم، كافيهات، متاجر، خدمات
 </span>
 <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1.5 bg-emerald-100 text-[#1a4d2e] group-hover:bg-white/20 group-hover:text-white">
 طلب إضافة
 </span>
 </Link>

 {/* إضافة منشأة طبية */}
 <Link
 to="/medical/add"
 className="group p-3 sm:p-4 bg-teal-50/60 hover:bg-teal-700 border border-teal-200 hover:border-teal-700 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-md cursor-pointer relative overflow-hidden"
 >
 <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-teal-100 text-teal-800 group-hover:bg-white/20 group-hover:text-white flex items-center justify-center mb-2 transition-colors shadow-2xs shrink-0">
 <Stethoscope className="h-5 w-5 sm:h-6 sm:w-6" />
 </div>
 <h4 className="text-xs sm:text-sm font-black text-teal-900 group-hover:text-white transition-colors leading-tight">
 تسجيل منشأة طبية 
 </h4>
 <span className="text-[10px] sm:text-[11px] text-stone-500 group-hover:text-teal-100 mt-1 line-clamp-1 font-medium">
 عيادات، صيدليات، مراكز ومختبرات
 </span>
 <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1.5 bg-teal-100 text-teal-800 group-hover:bg-white/20 group-hover:text-white">
 طلب إضافة
 </span>
 </Link>

 {/* نشر وظيفة شاغرة سريعة */}
 <button
 type="button"
 onClick={onOpenQuickJobModal}
 className="group p-3 sm:p-4 bg-violet-50/60 hover:bg-violet-700 border border-violet-200 hover:border-violet-700 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-md cursor-pointer relative overflow-hidden"
 >
 <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-violet-100 text-violet-800 group-hover:bg-white/20 group-hover:text-white flex items-center justify-center mb-2 transition-colors shadow-2xs shrink-0">
 <Briefcase className="h-5 w-5 sm:h-6 sm:w-6" />
 </div>
 <h4 className="text-xs sm:text-sm font-black text-violet-950 group-hover:text-white transition-colors leading-tight">
 نشر وظيفة شاغرة 
 </h4>
 <span className="text-[10px] sm:text-[11px] text-stone-500 group-hover:text-violet-100 mt-1 line-clamp-1 font-medium">
 إعلان وظائف وشواغر عمل سريعة
 </span>
 <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1.5 bg-violet-100 text-violet-800 group-hover:bg-white/20 group-hover:text-white">
 نشر فوري
 </span>
 </button>

 {/* طلب الخدمات التسويقية */}
 <button
 type="button"
 onClick={onOpenMarketingServices}
 className="group p-3 sm:p-4 bg-orange-50/60 hover:bg-orange-600 border border-orange-200 hover:border-orange-600 rounded-2xl flex flex-col items-center justify-center text-center transition-all shadow-2xs hover:shadow-md cursor-pointer relative overflow-hidden"
 >
 <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-orange-100 text-orange-800 group-hover:bg-white/20 group-hover:text-white flex items-center justify-center mb-2 transition-colors shadow-2xs shrink-0">
 <Rocket className="h-5 w-5 sm:h-6 sm:w-6" />
 </div>
 <h4 className="text-xs sm:text-sm font-black text-orange-950 group-hover:text-white transition-colors leading-tight">
 طلب خدمات تسويقية 
 </h4>
 <span className="text-[10px] sm:text-[11px] text-stone-500 group-hover:text-orange-100 mt-1 line-clamp-1 font-medium">
 إعلانات وترويج مميز للمشاريع
 </span>
 <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md mt-1.5 bg-orange-100 text-orange-800 group-hover:bg-white/20 group-hover:text-white">
 حجز إعلان
 </span>
 </button>
 </>
 )}

 </div>
 </div>
 );
}
