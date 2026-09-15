import React, { useState, useEffect, useMemo } from 'react';
import { 
  Stethoscope, Building2, Plus, Phone, MapPin, ExternalLink, Crown,
  Clock, ShieldCheck, CheckCircle2, AlertCircle, Edit3, Trash2, 
  MessageSquareText, Users, Tag, BarChart3, QrCode, Sparkles, 
  Printer, Check, Eye, HeartPulse, Pill, Microscope, Activity, 
  Accessibility, Car, Baby, ArrowRight, DollarSign, Calendar,
  Shield, Send, Megaphone, FileText, CheckCircle, Settings, Cpu, Rocket
} from 'lucide-react';
import { Business } from '../../types';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router';
import { isMedicalBusiness, isEmergencyFacility } from '../../lib/medicalHelper';
import { getBusinessVipStatus } from '../../lib/vipHelper';
import { DigitalMenuManagerModal } from '../vip/DigitalMenuManagerModal';
import { VipPopupManagerModal } from '../vip/VipPopupManagerModal';
import { VipUpgradeRequestModal } from '../vip/VipUpgradeRequestModal';
import { PrintableQrPosterModal } from './PrintableQrPosterModal';
import { MultiBranchModal } from './MultiBranchModal';
import { AddMedicalFacilityModal } from '../medical/AddMedicalFacilityModal';

// Sub-components
import { MedicalOverviewTab } from './medical/MedicalOverviewTab';
import { MedicalIdentityTab } from './medical/MedicalIdentityTab';
import { MedicalAboutTab } from './medical/MedicalAboutTab';
import { MedicalStaffTab } from './medical/MedicalStaffTab';
import { MedicalProceduresTab } from './medical/MedicalProceduresTab';
import { MedicalInsurancesTab } from './medical/MedicalInsurancesTab';
import { MedicalAmenitiesTab } from './medical/MedicalAmenitiesTab';
import { MedicalReviewsTab } from './medical/MedicalReviewsTab';
import { MedicalSettingsTab } from './medical/MedicalSettingsTab';
import { MedicalMarketingTab } from './medical/MedicalMarketingTab';

interface MedicalFacilitiesTabProps {
  businesses: Business[];
  onRefresh: () => void;
  onUpdateBusiness: (updatedBusiness: Business) => void;
  onDeleteBusiness: (businessId: string) => Promise<void>;
  onOpenMarketingModal?: (serviceType: string, serviceName: string, successMessage: string, businessId?: string) => void;
  onUpgradeMessaging?: (plan: '1_month' | '3_months' | '6_months' | '1_year', businessId?: string) => void;
}

export type MedicalDashboardTab = 
  | 'overview' 
  | 'identity' 
  | 'about' 
  | 'staff' 
  | 'procedures' 
  | 'insurances' 
  | 'amenities' 
  | 'reviews' 
  | 'settings'
  | 'marketing';

export function MedicalFacilitiesTab({
  businesses,
  onRefresh,
  onUpdateBusiness,
  onDeleteBusiness,
  onOpenMarketingModal,
  onUpgradeMessaging
}: MedicalFacilitiesTabProps) {
  const { currentUser, isAdmin } = useAuth();

  // Filter all medical businesses
  const medicalBusinesses = useMemo(() => {
    return businesses.filter(b => isMedicalBusiness(b) || !!b.medicalProfile || b.requestType === 'medical_facility_registration');
  }, [businesses]);

  const [selectedFacility, setSelectedFacility] = useState<Business | null>(null);
  const [activeTab, setActiveTab] = useState<MedicalDashboardTab>('overview');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [isPopupModalOpen, setIsPopupModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [isMultiBranchOpen, setIsMultiBranchOpen] = useState(false);

  // Status feedback toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3800);
  };

  // Sync selected facility
  useEffect(() => {
    if (medicalBusinesses.length > 0) {
      if (!selectedFacility || !medicalBusinesses.some(b => b.id === selectedFacility.id)) {
        setSelectedFacility(medicalBusinesses[0]);
      } else {
        const current = medicalBusinesses.find(b => b.id === selectedFacility.id);
        if (current) setSelectedFacility(current);
      }
    } else {
      setSelectedFacility(null);
    }
  }, [medicalBusinesses]);

  const handleFacilityUpdate = (updated: Business) => {
    setSelectedFacility(updated);
    onUpdateBusiness(updated);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('هل أنت متأكد من رغبتك في حذف هذه المنشأة الطبية نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.')) {
      await onDeleteBusiness(id);
      showToast('تم حذف المنشأة بنجاح.');
    }
  };

  // Empty state if user has no registered medical facilities
  if (medicalBusinesses.length === 0) {
    return (
      <div className="bg-[#fdfcfb] border border-[#e5e1da] rounded-3xl p-6 sm:p-12 text-center space-y-6 shadow-xs" dir="rtl">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-teal-50 border border-teal-200 text-teal-700 rounded-3xl flex items-center justify-center mx-auto shadow-xs">
          <Stethoscope className="h-8 w-8 sm:h-10 sm:w-10" />
        </div>
        <div className="space-y-2 max-w-md mx-auto">
          <h3 className="text-xl sm:text-2xl font-black text-[#2d2a26]">
            مركز إدارة المنشآت والعيادات الطبية
          </h3>
          <p className="text-xs sm:text-sm text-stone-500 font-medium leading-relaxed">
            لم تسجل أي عيادة، صيدلية أو مجمع طبي تحت حسابك حتى الآن. يمكنك إضافة عيادتك الآن لتظهر في دليل بلديتي إربد الطبي وتستقبل المراجعين.
          </p>
        </div>

        <div>
          <Link
            to="/medical/register"
            className="inline-flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white px-7 py-3.5 rounded-2xl font-black text-sm shadow-md transition-all cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            <span>تسجيل منشأة طبية جديدة الآن</span>
          </Link>
        </div>
      </div>
    );
  }

  if (!selectedFacility) return null;

  const vipStatus = getBusinessVipStatus(selectedFacility);
  const medProfile = selectedFacility.medicalProfile || {};

  const primaryBusinesses = medicalBusinesses.filter(
    b => !b.parentBusinessId || !medicalBusinesses.some(p => p.id === b.parentBusinessId)
  );
  const hasMultiple = medicalBusinesses.length > 1;

  const staffCount = (medProfile.doctorsList?.length || 0) + (medProfile.doctorProfile?.name ? 1 : 0);
  const proceduresCount = selectedFacility.menuItems?.length || 0;
  const insurancesCount = medProfile.insurances?.length || 0;
  const reviewsCount = selectedFacility.reviewCount || 0;

  return (
    <div className="space-y-6 sm:space-y-8 min-w-0" dir="rtl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-stone-900 text-white px-5 py-3 rounded-2xl text-xs font-black shadow-xl border border-stone-800 flex items-center gap-2.5 animate-bounce">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Dashboard Card */}
      <div className="bg-[#fdfcfb] border border-[#e5e1da] rounded-3xl md:rounded-[32px] p-4 sm:p-8 shadow-sm space-y-5 sm:space-y-6 min-w-0 overflow-hidden">
        {/* Header with Title + "تسجيل منشأة جديدة" */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#2d2a26] flex items-center gap-2">
              <Stethoscope className="h-5 w-5 sm:h-6 sm:w-6 text-teal-800 shrink-0" />
              <span>لوحة تحكم المنشآت والعيادات الطبية</span>
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              أهلاً بك في مركز التحكم المحترف بعيادتك، أفرعك، كادرك الطبي، خدماتك وتأميناتك الصحية
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 bg-teal-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-teal-900 transition-all shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4 shrink-0 text-teal-300" />
              <span>تسجيل منشأة جديدة</span>
            </button>
          </div>
        </div>

        {/* Hierarchical Business & Branch Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white border border-stone-200/80 p-3 sm:p-4 rounded-2xl shadow-2xs gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-teal-800/10 text-teal-800 flex items-center justify-center shrink-0">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div className="flex-1 w-full max-w-full min-w-0">
              <span className="text-[11px] font-bold text-stone-500 block mb-0.5 truncate">المنشأة المحددة للإدارة</span>
              {hasMultiple ? (
                <div className="relative w-full">
                  <select
                    value={selectedFacility.id}
                    onChange={(e) => {
                      const biz = medicalBusinesses.find(b => b.id === e.target.value);
                      if (biz) {
                        setSelectedFacility(biz);
                        setActiveTab('overview');
                      }
                    }}
                    className="appearance-none bg-stone-50 border border-stone-200 text-[#2d2a26] text-sm font-black rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-700/30 cursor-pointer outline-none w-full truncate"
                    dir="rtl"
                  >
                    {primaryBusinesses.map(pBiz => {
                      const branches = medicalBusinesses.filter(b => b.id === pBiz.id || b.parentBusinessId === pBiz.id);
                      return (
                        <optgroup key={pBiz.id} label={pBiz.name.split(' - ')[0].trim()}>
                          {branches.map((branch, idx) => {
                            const branchLocationName = branch.name.includes(' - ') 
                              ? branch.name.split(' - ')[1] 
                              : (branch.district || (idx === 0 ? 'المركز الرئيسي' : `فرع ${idx + 1}`));
                            return (
                              <option key={branch.id} value={branch.id}>
                                {branchLocationName} {getBusinessVipStatus(branch).isVip ? '⭐ VIP طبي' : ''}
                              </option>
                            );
                          })}
                        </optgroup>
                      );
                    })}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-2 text-stone-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              ) : (
                <h3 className="font-black text-sm text-[#2d2a26] bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200 inline-block w-full truncate">
                  {selectedFacility.name}
                </h3>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsMultiBranchOpen(true)}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black bg-[#fbf9f6] text-teal-800 border border-teal-800/20 hover:bg-teal-800/10 transition-colors cursor-pointer w-full sm:w-auto mt-1 sm:mt-0"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة فرع جديد</span>
          </button>
        </div>

        {/* Currently Selected Facility WorkSpace - Unified Container */}
        <div className="border border-stone-200/80 rounded-2xl bg-white overflow-hidden shadow-2xs">
          {/* Facility Info Header Banner */}
          <div className="bg-teal-800/5 p-4 sm:p-5 border-b border-stone-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3.5 sm:gap-4 w-full sm:w-auto min-w-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border border-stone-200 overflow-hidden shrink-0 shadow-2xs">
                {selectedFacility.imageUrl || selectedFacility.image ? (
                  <img
                    src={selectedFacility.imageUrl || selectedFacility.image}
                    alt={selectedFacility.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-teal-50 text-teal-700">
                    <Stethoscope className="h-7 w-7" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-black text-[#2d2a26] truncate max-w-full">{selectedFacility.name}</h3>
                  {vipStatus.isVip ? (
                    <span className="text-[10px] bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-2xs shrink-0">
                      <Crown className="h-3 w-3 fill-white" />
                      VIP طبي معتمد
                    </span>
                  ) : (
                    <span className="text-[10px] bg-stone-100 border border-stone-200 text-stone-500 font-bold px-2 py-0.5 rounded-full shrink-0">
                      باقة أساسية
                    </span>
                  )}
                  {medProfile.licenseNumber && (
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                      <ShieldCheck className="h-3 w-3 text-emerald-600" />
                      <span>ترخيص: {medProfile.licenseNumber}</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-1 truncate">
                  {selectedFacility.category || 'عيادات ومراكز طبية'} • {selectedFacility.district || 'إربد'} • {selectedFacility.phone}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
              <Link 
                to={`/business/${selectedFacility.id}`}
                target="_blank"
                className="inline-flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-bold transition-colors w-full sm:w-auto"
              >
                <span>معاينة صفحة العيادة</span>
                <ExternalLink className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
              </Link>

              {!vipStatus.isVip && (
                <button
                  type="button"
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-4 py-2 sm:px-3.5 sm:py-1.5 rounded-xl text-xs font-black shadow-2xs transition-colors cursor-pointer w-full sm:w-auto"
                >
                  <Crown className="h-4 w-4 sm:h-3.5 sm:w-3.5 fill-white" />
                  <span>ترقية لـ VIP الطبي</span>
                </button>
              )}
            </div>
          </div>

          {/* Dashboard Workspace Tab Navigation - Grid Layout with Square Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2 sm:gap-2.5 p-2 sm:p-4 bg-stone-50 border-b border-stone-200 shadow-inner">
            {/* 1. Overview */}
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl transition-all cursor-pointer border ${
                activeTab === 'overview' 
                  ? 'bg-teal-800 border-teal-800 text-white shadow-md scale-105 transform z-10' 
                  : 'bg-white border-stone-200/80 text-stone-600 hover:bg-stone-100 hover:border-stone-300 shadow-2xs'
              }`}
            >
              <BarChart3 className={`h-5 w-5 sm:h-7 sm:w-7 mb-1 sm:mb-2 ${activeTab === 'overview' ? 'text-teal-200' : 'text-stone-400'}`} />
              <span className="text-[10px] sm:text-xs font-black text-center leading-tight truncate w-full">الأداء<br className="hidden sm:block" /> والإحصائيات</span>
            </button>

            {/* 2. Identity */}
            <button
              type="button"
              onClick={() => setActiveTab('identity')}
              className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl transition-all cursor-pointer border ${
                activeTab === 'identity' 
                  ? 'bg-teal-800 border-teal-800 text-white shadow-md scale-105 transform z-10' 
                  : 'bg-white border-stone-200/80 text-stone-600 hover:bg-stone-100 hover:border-stone-300 shadow-2xs'
              }`}
            >
              <Building2 className={`h-5 w-5 sm:h-7 sm:w-7 mb-1 sm:mb-2 ${activeTab === 'identity' ? 'text-teal-200' : 'text-stone-400'}`} />
              <span className="text-[10px] sm:text-xs font-black text-center leading-tight truncate w-full">بيانات<br className="hidden sm:block" /> المنشأة</span>
            </button>

            {/* 3. About & License */}
            <button
              type="button"
              onClick={() => setActiveTab('about')}
              className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl transition-all cursor-pointer border ${
                activeTab === 'about' 
                  ? 'bg-teal-800 border-teal-800 text-white shadow-md scale-105 transform z-10' 
                  : 'bg-white border-stone-200/80 text-stone-600 hover:bg-stone-100 hover:border-stone-300 shadow-2xs'
              }`}
            >
              <FileText className={`h-5 w-5 sm:h-7 sm:w-7 mb-1 sm:mb-2 ${activeTab === 'about' ? 'text-teal-200' : 'text-stone-400'}`} />
              <span className="text-[10px] sm:text-xs font-black text-center leading-tight truncate w-full">عن المنشأة<br className="hidden sm:block" /> والترخيص</span>
            </button>

            {/* 4. Staff & Doctors */}
            <button
              type="button"
              onClick={() => setActiveTab('staff')}
              className={`relative flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl transition-all cursor-pointer border ${
                activeTab === 'staff' 
                  ? 'bg-teal-800 border-teal-800 text-white shadow-md scale-105 transform z-10' 
                  : 'bg-white border-stone-200/80 text-stone-600 hover:bg-stone-100 hover:border-stone-300 shadow-2xs'
              }`}
            >
              <Users className={`h-5 w-5 sm:h-7 sm:w-7 mb-1 sm:mb-2 ${activeTab === 'staff' ? 'text-teal-200' : 'text-stone-400'}`} />
              <span className="text-[10px] sm:text-xs font-black text-center leading-tight truncate w-full">الكادر<br className="hidden sm:block" /> والأطباء</span>
              {staffCount > 0 && (
                <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-4 sm:min-w-[20px] sm:h-5 px-1 flex items-center justify-center rounded-full text-[9px] sm:text-[10px] font-black border-2 border-white shadow-sm ${
                  activeTab === 'staff' ? 'bg-teal-100 text-teal-900' : 'bg-teal-700 text-white'
                }`}>
                  {staffCount}
                </span>
              )}
            </button>

            {/* 5. Procedures & Pricing */}
            <button
              type="button"
              onClick={() => setActiveTab('procedures')}
              className={`relative flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl transition-all cursor-pointer border ${
                activeTab === 'procedures' 
                  ? 'bg-teal-800 border-teal-800 text-white shadow-md scale-105 transform z-10' 
                  : 'bg-white border-stone-200/80 text-stone-600 hover:bg-stone-100 hover:border-stone-300 shadow-2xs'
              }`}
            >
              <Activity className={`h-5 w-5 sm:h-7 sm:w-7 mb-1 sm:mb-2 ${activeTab === 'procedures' ? 'text-teal-200' : 'text-stone-400'}`} />
              <span className="text-[10px] sm:text-xs font-black text-center leading-tight truncate w-full">الخدمات<br className="hidden sm:block" /> والأسعار</span>
              {proceduresCount > 0 && (
                <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-4 sm:min-w-[20px] sm:h-5 px-1 flex items-center justify-center rounded-full text-[9px] sm:text-[10px] font-black border-2 border-white shadow-sm ${
                  activeTab === 'procedures' ? 'bg-teal-100 text-teal-900' : 'bg-teal-700 text-white'
                }`}>
                  {proceduresCount}
                </span>
              )}
            </button>

            {/* 6. Insurances & Syndicates */}
            <button
              type="button"
              onClick={() => setActiveTab('insurances')}
              className={`relative flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl transition-all cursor-pointer border ${
                activeTab === 'insurances' 
                  ? 'bg-teal-800 border-teal-800 text-white shadow-md scale-105 transform z-10' 
                  : 'bg-white border-stone-200/80 text-stone-600 hover:bg-stone-100 hover:border-stone-300 shadow-2xs'
              }`}
            >
              <ShieldCheck className={`h-5 w-5 sm:h-7 sm:w-7 mb-1 sm:mb-2 ${activeTab === 'insurances' ? 'text-teal-200' : 'text-stone-400'}`} />
              <span className="text-[10px] sm:text-xs font-black text-center leading-tight truncate w-full">التأمينات<br className="hidden sm:block" /> والنقابات</span>
              {insurancesCount > 0 && (
                <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-4 sm:min-w-[20px] sm:h-5 px-1 flex items-center justify-center rounded-full text-[9px] sm:text-[10px] font-black border-2 border-white shadow-sm ${
                  activeTab === 'insurances' ? 'bg-teal-100 text-teal-900' : 'bg-teal-700 text-white'
                }`}>
                  {insurancesCount}
                </span>
              )}
            </button>

            {/* 7. Amenities & Equipment */}
            <button
              type="button"
              onClick={() => setActiveTab('amenities')}
              className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl transition-all cursor-pointer border ${
                activeTab === 'amenities' 
                  ? 'bg-teal-800 border-teal-800 text-white shadow-md scale-105 transform z-10' 
                  : 'bg-white border-stone-200/80 text-stone-600 hover:bg-stone-100 hover:border-stone-300 shadow-2xs'
              }`}
            >
              <Cpu className={`h-5 w-5 sm:h-7 sm:w-7 mb-1 sm:mb-2 ${activeTab === 'amenities' ? 'text-teal-200' : 'text-stone-400'}`} />
              <span className="text-[10px] sm:text-xs font-black text-center leading-tight truncate w-full">المرافق<br className="hidden sm:block" /> والتجهيزات</span>
            </button>

            {/* 8. Reviews */}
            <button
              type="button"
              onClick={() => setActiveTab('reviews')}
              className={`relative flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl transition-all cursor-pointer border ${
                activeTab === 'reviews' 
                  ? 'bg-teal-800 border-teal-800 text-white shadow-md scale-105 transform z-10' 
                  : 'bg-white border-stone-200/80 text-stone-600 hover:bg-stone-100 hover:border-stone-300 shadow-2xs'
              }`}
            >
              <MessageSquareText className={`h-5 w-5 sm:h-7 sm:w-7 mb-1 sm:mb-2 ${activeTab === 'reviews' ? 'text-teal-200' : 'text-stone-400'}`} />
              <span className="text-[10px] sm:text-xs font-black text-center leading-tight truncate w-full">آراء<br className="hidden sm:block" /> المراجعين</span>
              {reviewsCount > 0 && (
                <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-4 sm:min-w-[20px] sm:h-5 px-1 flex items-center justify-center rounded-full text-[9px] sm:text-[10px] font-black border-2 border-white shadow-sm ${
                  activeTab === 'reviews' ? 'bg-teal-100 text-teal-900' : 'bg-teal-700 text-white'
                }`}>
                  {reviewsCount}
                </span>
              )}
            </button>

            {/* 9. Settings */}
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl transition-all cursor-pointer border ${
                activeTab === 'settings' 
                  ? 'bg-teal-800 border-teal-800 text-white shadow-md scale-105 transform z-10' 
                  : 'bg-white border-stone-200/80 text-stone-600 hover:bg-stone-100 hover:border-stone-300 shadow-2xs'
              }`}
            >
              <Settings className={`h-5 w-5 sm:h-7 sm:w-7 mb-1 sm:mb-2 ${activeTab === 'settings' ? 'text-teal-200' : 'text-stone-400'}`} />
              <span className="text-[10px] sm:text-xs font-black text-center leading-tight truncate w-full">الإدارة<br className="hidden sm:block" /> والخصوصية</span>
            </button>

            {/* 10. Marketing Services */}
            <button
              type="button"
              onClick={() => setActiveTab('marketing')}
              className={`relative flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl transition-all cursor-pointer border ${
                activeTab === 'marketing' 
                  ? 'bg-gradient-to-r from-amber-600 to-[#1a4d2e] border-amber-500 text-white shadow-md scale-105 transform z-10' 
                  : 'bg-gradient-to-br from-amber-50/50 to-white border-amber-200/80 text-amber-900 hover:bg-amber-100/60 shadow-2xs'
              }`}
            >
              <Rocket className={`h-5 w-5 sm:h-7 sm:w-7 mb-1 sm:mb-2 ${activeTab === 'marketing' ? 'text-amber-200' : 'text-amber-600'}`} />
              <span className="text-[10px] sm:text-xs font-black text-center leading-tight truncate w-full">الخدمات<br className="hidden sm:block" /> التسويقية 🚀</span>
            </button>
          </div>

          {/* Active Panel Content */}
          <div className="min-h-[220px]">
            {activeTab === 'overview' && (
              <MedicalOverviewTab
                business={selectedFacility}
                onNavigateTab={(tabId) => setActiveTab(tabId as MedicalDashboardTab)}
                onOpenQrModal={() => setIsQrModalOpen(true)}
                onOpenMultiBranchModal={() => setIsMultiBranchOpen(true)}
                onOpenBannerModal={() => {
                  const vipInfo = getBusinessVipStatus(selectedFacility);
                  if (!vipInfo.isVip) {
                    showToast('إعداد النافذة الترحيبية والبانر الطبي ميزة حصريّة للباقة الذهبية VIP 👑');
                    setIsUpgradeModalOpen(true);
                    return;
                  }
                  setIsPopupModalOpen(true);
                }}
                onOpenUpgradeModal={() => setIsUpgradeModalOpen(true)}
              />
            )}

            {activeTab === 'identity' && (
              <MedicalIdentityTab
                business={selectedFacility}
                onUpdate={handleFacilityUpdate}
                showToast={showToast}
              />
            )}

            {activeTab === 'about' && (
              <MedicalAboutTab
                business={selectedFacility}
                onUpdate={handleFacilityUpdate}
                showToast={showToast}
              />
            )}

            {activeTab === 'staff' && (
              <MedicalStaffTab
                business={selectedFacility}
                onUpdate={handleFacilityUpdate}
                showToast={showToast}
              />
            )}

            {activeTab === 'procedures' && (
              <MedicalProceduresTab
                business={selectedFacility}
                onUpdate={handleFacilityUpdate}
                showToast={showToast}
                onOpenAdvancedModal={() => {
                  const vipInfo = getBusinessVipStatus(selectedFacility);
                  if (!vipInfo.isVip) {
                    showToast('المحرر الرقمي المتقدم للخدمات والأسعار ميزة حصريّة للباقة الذهبية VIP 👑');
                    setIsUpgradeModalOpen(true);
                    return;
                  }
                  setIsMenuModalOpen(true);
                }}
              />
            )}

            {activeTab === 'insurances' && (
              <MedicalInsurancesTab
                business={selectedFacility}
                onUpdate={handleFacilityUpdate}
                showToast={showToast}
              />
            )}

            {activeTab === 'amenities' && (
              <MedicalAmenitiesTab
                business={selectedFacility}
                onUpdate={handleFacilityUpdate}
                showToast={showToast}
              />
            )}

            {activeTab === 'reviews' && (
              <MedicalReviewsTab
                business={selectedFacility}
                showToast={showToast}
              />
            )}

            {activeTab === 'settings' && (
              <MedicalSettingsTab
                business={selectedFacility}
                onUpdate={handleFacilityUpdate}
                showToast={showToast}
                onOpenQrModal={() => setIsQrModalOpen(true)}
                onDeleteBusiness={handleDelete}
              />
            )}

            {activeTab === 'marketing' && (
              <MedicalMarketingTab
                business={selectedFacility}
                onOpenMarketingModal={onOpenMarketingModal}
                onUpgradeMessaging={onUpgradeMessaging}
              />
            )}
          </div>
        </div>
      </div>

      {/* Modal Dialogs */}
      {isUpgradeModalOpen && (
        <VipUpgradeRequestModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          business={selectedFacility}
        />
      )}

      {isMenuModalOpen && (
        <DigitalMenuManagerModal
          isOpen={isMenuModalOpen}
          onClose={() => setIsMenuModalOpen(false)}
          business={selectedFacility}
          onMenuUpdated={(updatedItems) => {
            handleFacilityUpdate({ ...selectedFacility, menuItems: updatedItems });
            showToast('تم تحديث قائمة الخدمات الطبية بنجاح! 📋');
          }}
        />
      )}

      {isPopupModalOpen && (
        <VipPopupManagerModal
          isOpen={isPopupModalOpen}
          onClose={() => setIsPopupModalOpen(false)}
          business={selectedFacility}
          onUpdated={(updatedPopup) => {
            handleFacilityUpdate({ ...selectedFacility, vipPopup: updatedPopup });
            showToast('تم تحديث إعلان وبانر المنشأة الطبي بنجاح! 📢');
          }}
        />
      )}

      {isQrModalOpen && (
        <PrintableQrPosterModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          business={selectedFacility}
        />
      )}

      {isMultiBranchOpen && (
        <MultiBranchModal
          parentBusiness={selectedFacility}
          isOpen={isMultiBranchOpen}
          onClose={() => setIsMultiBranchOpen(false)}
          onBranchAdded={() => {
            setIsMultiBranchOpen(false);
            onRefresh();
            showToast('تم تحديث الأفرع الملحقة بالمنشأة بنجاح! 🏢');
          }}
        />
      )}
    </div>
  );
}
