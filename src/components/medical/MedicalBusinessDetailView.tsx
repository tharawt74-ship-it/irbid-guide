import React, { useState, useMemo } from 'react';
import { 
  Shield, Award, Stethoscope, Calendar, Clock, Phone, AlertCircle, 
  CheckCircle2, Sparkles, Cpu, Accessibility, HeartHandshake, 
  Search, ChevronLeft, ChevronDown, ChevronUp, User, FileText,
  Building2, Pill, Activity, Zap, Check, Star, Car, Users, Smile,
  DollarSign, ArrowUpRight, MessageSquare, Baby
} from 'lucide-react';
import { Business, MedicalFacilityInfo, MedicalInsurance, MedicalProcedure, MedicalEquipment, MedicalDoctor } from '../../types';
import { WhatsAppIcon } from '../common/WhatsAppIcon';
import { MedicalAppointmentModal } from './MedicalAppointmentModal';
import { POPULAR_JORDANIAN_INSURANCES, isEmergencyFacility } from '../../lib/medicalHelper';
import DOMPurify from 'dompurify';

interface MedicalBusinessDetailViewProps {
  business?: Business | null;
  medicalProfile: MedicalFacilityInfo;
  onOpenBookingModal?: () => void;
  onNavigateToInsurances?: () => void;
  onNavigateToServices?: () => void;
  onNavigateToStaff?: () => void;
}

export function MedicalBusinessDetailView({
  business,
  medicalProfile,
  onOpenBookingModal,
  onNavigateToInsurances,
  onNavigateToServices,
  onNavigateToStaff
}: MedicalBusinessDetailViewProps) {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedInsuranceCategory, setSelectedInsuranceCategory] = useState<'all' | 'syndicate' | 'company' | 'gov'>('all');

  const isEmergency = useMemo(() => isEmergencyFacility(business), [business]);

  const handleOpenBooking = () => {
    if (onOpenBookingModal) {
      onOpenBookingModal();
    } else {
      setIsBookingModalOpen(true);
    }
  };

  // Normalize insurances
  const insurancesList: MedicalInsurance[] = (medicalProfile.insurances || POPULAR_JORDANIAN_INSURANCES).map(ins => {
    if (typeof ins === 'string') {
      return { name: ins, type: ins.includes('نقابة') ? 'نقابة' : 'شركة تأمين', isDirectBilling: true };
    }
    return ins;
  });

  // Filter insurances by category
  const filteredInsurances = insurancesList.filter(ins => {
    if (selectedInsuranceCategory === 'syndicate') return ins.type === 'نقابة' || ins.name.includes('نقابة');
    if (selectedInsuranceCategory === 'company') return ins.type === 'شركة تأمين' || ins.name.includes('تأمين') || ins.name.includes('شركة');
    if (selectedInsuranceCategory === 'gov') return ins.type?.includes('جامعي') || ins.type?.includes('حكومي');
    return true;
  });

  // Show only first 4 insurances in this overview section as requested
  const displayedInsurances = filteredInsurances.slice(0, 4);

  // Unified procedures and services list (from medicalProfile procedures or business menuItems)
  const allServices = useMemo(() => {
    let list: MedicalProcedure[] = [];

    if (medicalProfile.procedures && medicalProfile.procedures.length > 0) {
      list = [...medicalProfile.procedures];
    } else if (business?.menuItems && business.menuItems.length > 0) {
      list = business.menuItems.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price ? (String(item.price).includes('د.أ') || String(item.price).includes('دينار') ? item.price : `${item.price} د.أ`) : undefined,
        category: item.category,
        isPopular: item.isPopular,
        duration: undefined,
        insuranceCovered: true,
        preparationNotes: undefined,
      }));
    }

    // Automatically ensure consultation fee is present as a service card if defined
    if (medicalProfile.consultationFee && medicalProfile.consultationFee.trim()) {
      const feeText = medicalProfile.consultationFee.trim();
      if (feeText && feeText !== '0') {
        const hasConsultation = list.some(item => 
          item.name.includes('كشف') || item.name.includes('معاين') || item.name.includes('استشار')
        );
        if (!hasConsultation) {
          const cat = business?.category || '';
          const isPharma = cat.includes('صيدل');
          const isLabEntity = cat.includes('مختبر');
          const isRehabEntity = cat.includes('علاج طبيعي') || cat.includes('تأهيل');
          const isHosp = cat.includes('مستشف');

          const consultCard: MedicalProcedure = {
            id: 'proc_consultation_auto_card',
            name: isPharma 
              ? 'استشارة دوائية وصرف وصفات' 
              : isLabEntity 
              ? 'كشفية وفحص تشخيصي' 
              : isRehabEntity 
              ? 'كشفية وجلسة تقييم علاج طبيعي' 
              : isHosp 
              ? 'معاينة وكشفية طوارئ / عيادات' 
              : 'كشفية ومعاينة طبية بالعيادة',
            category: 'معاينات واستشارات',
            description: 'تشمل الفحص السريري والاستشارة الطبية المتخصصة',
            price: feeText.includes('د.أ') || feeText.includes('دينار') ? feeText : `${feeText} د.أ`,
            isPopular: true,
            insuranceCovered: true
          };
          list = [consultCard, ...list];
        }
      }
    }

    return list;
  }, [medicalProfile.procedures, medicalProfile.consultationFee, business?.menuItems, business?.category]);

  // Display only the first 3 services with prices in this overview section as requested
  const displayedServices = allServices.slice(0, 3);

  const doctor = medicalProfile.doctorProfile;

  const staffList: MedicalDoctor[] = useMemo(() => {
    if (medicalProfile.doctorsList && medicalProfile.doctorsList.length > 0) {
      return medicalProfile.doctorsList;
    }
    if (medicalProfile.doctorProfile) {
      return [medicalProfile.doctorProfile];
    }
    return [];
  }, [medicalProfile.doctorsList, medicalProfile.doctorProfile]);

  const displayedStaff = staffList.slice(0, 3);

  const isPharmacy = useMemo(() => {
    const cat = business?.category || '';
    const sub = business?.subCategory || '';
    const name = business?.name || '';
    const docTitle = doctor?.title || '';
    return business?.facilityType === 'pharmacy' || 
           cat.includes('صيدل') || 
           sub.includes('صيدل') || 
           name.includes('صيدلية') || 
           name.includes('صيدليات') ||
           docTitle.includes('صيدل');
  }, [business, doctor?.title]);

  const rawPhone = business?.whatsapp || business?.socialLinks?.whatsapp || business?.phone || medicalProfile.emergencyPhone || '';
  const cleanPhone = useMemo(() => {
    let digits = rawPhone.replace(/[^0-9]/g, '');
    if (digits.startsWith('07')) {
      digits = '962' + digits.substring(1);
    }
    return digits;
  }, [rawPhone]);

  const aboutText = useMemo(() => {
    if (medicalProfile.aboutFacility && medicalProfile.aboutFacility.trim()) {
      return medicalProfile.aboutFacility.trim();
    }
    if (business?.description && business.description.trim()) {
      return business.description.trim();
    }
    if (medicalProfile.doctorProfile?.bio && medicalProfile.doctorProfile.bio.trim()) {
      return medicalProfile.doctorProfile.bio.trim();
    }
    if (isPharmacy) {
      return `صيدلية متخصصة ومرخصة في محافظة إربد تقدم كافة الخدمات الدوائية والاستشارات الصيدلانية وصرف الوصفات المعتمدة، بالإضافة إلى توفير المستلزمات الطبية والأجهزة المنزلية المعتمدة بأعلى معايير الجودة والموثوقية.`;
    }
    return `منشأة طبية متخصصة في محافظة إربد تقدم رعاية صحية متكاملة وتشخيصاً دقيقاً مع الالتزام بأعلى معايير الجودة وراحة المرضى وتوفير أفضل الكوادر الطبية والتجهيزات الحديثة.`;
  }, [medicalProfile.aboutFacility, business?.description, medicalProfile.doctorProfile?.bio, isPharmacy]);

  return (
    <div className="space-y-6 sm:space-y-8 text-right" dir="rtl">
      {/* 1. الكادر الطبي والمؤهلات العلمية (3 Square Cards + 1 View All Staff Square Card) */}
      {(staffList.length > 0 || doctor) && (
        <div className="bg-white rounded-3xl border border-[#e5e1da] p-5 sm:p-7 shadow-xs">
          <div className="border-b border-stone-100 pb-4 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100">
                {isPharmacy ? <Pill className="h-5 w-5 text-emerald-700" /> : <Award className="h-5 w-5 text-emerald-700" />}
              </div>
              <div>
                <h3 className="font-black text-base sm:text-lg text-stone-900">
                  {isPharmacy ? 'الكادر الصيدلاني والإشراف المهني' : 'الكادر الطبي والمؤهلات العلمية'}
                </h3>
                <p className="text-xs text-stone-500 font-semibold">
                  {isPharmacy ? 'المؤهلات العلمية، ترخيص مزاولة المهنة والخبرة الصيدلانية' : 'المؤهلات الرسمية، البورد، والخبرات السريرية'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {displayedStaff.map((staff, idx) => (
              <div 
                key={idx} 
                className="aspect-square flex flex-col items-center justify-center text-center p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-stone-50/90 border border-stone-200/80 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all shadow-3xs group"
              >
                {/* 1. Doctor / Staff Icon */}
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-[#1a4d2e] to-emerald-700 text-white flex items-center justify-center font-black text-base shadow-xs mb-2.5 shrink-0 group-hover:scale-105 transition-transform">
                  {staff.avatarUrl ? (
                    <img src={staff.avatarUrl} alt={staff.name} className="w-full h-full object-cover rounded-2xl" />
                  ) : isPharmacy ? (
                    <Pill className="h-6 w-6 text-emerald-100" />
                  ) : (
                    <Stethoscope className="h-6 w-6 text-emerald-100" />
                  )}
                </div>

                {/* 2. Doctor / Staff Name */}
                <h4 className="font-black text-xs sm:text-sm text-stone-900 truncate w-full px-1 mb-1">
                  {staff.name}
                </h4>

                {/* 3. Specialty / Title */}
                <p className="text-[11px] sm:text-xs font-bold text-emerald-800 truncate w-full px-1 mb-2">
                  {staff.subspecialty || staff.title}
                </p>

                {/* 4. Experience Only */}
                <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200/80 text-amber-900 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black shrink-0">
                  <Sparkles className="h-3 w-3 text-amber-600 shrink-0" />
                  <span>خبرة {staff.experienceYears || 5} سنوات</span>
                </div>
              </div>
            ))}

            {/* 4th Card: View All Staff */}
            <button
              type="button"
              onClick={onNavigateToStaff}
              className="aspect-square flex flex-col items-center justify-center text-center p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-50/90 to-teal-50/70 hover:from-emerald-100 hover:to-teal-100 border-2 border-dashed border-emerald-300 hover:border-emerald-600 transition-all shadow-3xs group cursor-pointer"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-600 group-hover:bg-[#1a4d2e] text-white flex items-center justify-center shadow-xs mb-2.5 transition-transform group-hover:scale-105 shrink-0">
                <Users className="h-6 w-6" />
              </div>
              <h4 className="font-black text-xs sm:text-sm text-stone-900 group-hover:text-emerald-900 mb-1">
                عرض كافة الكادر
              </h4>
              <p className="text-[11px] sm:text-xs font-bold text-emerald-700 flex items-center gap-1">
                <span>{staffList.length > 0 ? `(${staffList.length} أعضاء)` : 'استعراض الفريق'}</span>
                <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
              </p>
            </button>
          </div>
        </div>
      )}

      {/* 3. قسم عن المنشأة (About Facility Section) */}
      <div className="bg-white rounded-3xl border border-[#e5e1da] p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100">
              <Building2 className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-stone-900">
                {isPharmacy ? 'عن الصيدلية' : 'عن المنشأة'}
              </h3>
              <p className="text-xs text-stone-500 font-semibold">
                {isPharmacy ? 'نبذة تعريفية عن الصيدلية والخدمات الدوائية' : 'نبذة تعريفية ورؤية المنشأة في تقديم الرعاية الصحية'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-stone-50/70 border border-stone-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
          {aboutText && /<[a-z][\s\S]*>/i.test(aboutText) ? (
            <div
              className="rich-text-content text-xs sm:text-sm text-stone-700 font-bold leading-relaxed space-y-2 prose prose-stone max-w-none [&_p]:mb-2 [&_ul]:list-disc [&_ul]:mr-4 [&_ol]:list-decimal [&_ol]:mr-4 [&_mark]:bg-amber-200 [&_mark]:px-1 [&_mark]:rounded"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(aboutText) }}
            />
          ) : (
            <p className="text-xs sm:text-sm text-stone-700 font-bold leading-relaxed whitespace-pre-line">
              {aboutText}
            </p>
          )}

          {/* Highlights / Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-200/60 text-[11px] font-bold text-stone-600">
            {medicalProfile.licenseNumber && (
              <span className="inline-flex items-center gap-1.5 bg-white border border-stone-200 px-3 py-1 rounded-xl text-stone-700 shadow-3xs">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>ترخيص معتمد: {medicalProfile.licenseNumber}</span>
              </span>
            )}
            {doctor?.experienceYears && (
              <span className="inline-flex items-center gap-1.5 bg-white border border-stone-200 px-3 py-1 rounded-xl text-stone-700 shadow-3xs">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                <span>خبرة تتجاوز {doctor.experienceYears} سنوات</span>
              </span>
            )}
            {medicalProfile.has24Emergency && (
              <span className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-3 py-1 rounded-xl text-rose-800 shadow-3xs">
                <Activity className="h-3.5 w-3.5 text-rose-600" />
                <span>جاهزية طوارئ 24 ساعة</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4. شركات التأمين الصحي المعتمدة (Insurance Networks) */}
      <div className="bg-white rounded-3xl border border-[#e5e1da] p-5 sm:p-7 shadow-xs">
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-800 rounded-2xl border border-blue-100">
              <Shield className="h-5 w-5 text-blue-700" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base sm:text-lg text-stone-900">شركات التأمين والنقابات المعتمدة</h3>
              <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-black">
                {insurancesList.length} جهة
              </span>
            </div>
          </div>
        </div>

        {/* Categories Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 mb-4">
          <button
            type="button"
            onClick={() => setSelectedInsuranceCategory('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              selectedInsuranceCategory === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            جميع التأمينات ({insurancesList.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedInsuranceCategory('syndicate')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              selectedInsuranceCategory === 'syndicate'
                ? 'bg-blue-700 text-white'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            النقابات المهنية
          </button>
          <button
            type="button"
            onClick={() => setSelectedInsuranceCategory('company')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              selectedInsuranceCategory === 'company'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            شركات التأمين الخاصة
          </button>
        </div>

        {/* Insurances List */}
        {displayedInsurances.length > 0 ? (
          <div className="bg-stone-50/70 rounded-2xl border border-stone-200/80 divide-y divide-stone-200/70 overflow-hidden shadow-xs">
            {displayedInsurances.map((ins, i) => {
              const isSyndicate = ins.type === 'نقابة' || ins.name.includes('نقابة');
              return (
                <div 
                  key={i} 
                  className="p-3 sm:p-4 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                      isSyndicate 
                        ? 'bg-blue-100/80 text-blue-700 border border-blue-200/60' 
                        : 'bg-emerald-100/80 text-emerald-800 border border-emerald-200/60'
                    }`}>
                      {isSyndicate ? (
                        <Award className="h-4.5 w-4.5" />
                      ) : (
                        <Shield className="h-4.5 w-4.5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-black text-stone-900 leading-snug">
                          {ins.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500 font-medium truncate mt-0.5">
                        {ins.coverageDetails || (isSyndicate ? 'تأمين نقابي معتمد ومباشر' : 'تغطية تأمينية معتمدة للكشفيات والإجراءات الطبية')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto mr-12 sm:mr-0">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                      isSyndicate
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}>
                      {ins.type || (isSyndicate ? 'نقابة مهنية' : 'شركة تأمين')}
                    </span>
                    <span className="text-[10px] font-bold bg-white text-stone-700 px-2.5 py-1 rounded-lg border border-stone-200 flex items-center gap-1 shadow-2xs">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      <span>{ins.isDirectBilling ? 'مطالبة مباشرة' : 'معتمد'}</span>
                    </span>
                  </div>
                </div>
              );
            })}

            {/* الخيار الخامس في القائمة: زر عرض جميع شركات التأمين والنقابات */}
            <button
              type="button"
              onClick={onNavigateToInsurances}
              className="w-full p-3 sm:p-4 bg-blue-50/50 hover:bg-blue-100/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 text-right cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                  <Shield className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs sm:text-sm font-black text-blue-900 group-hover:text-blue-950 transition-colors">
                    عرض جميع شركات التأمين والنقابات ({insurancesList.length})
                  </span>
                  <p className="text-[11px] text-blue-700 font-semibold truncate mt-0.5">
                    استعراض القائمة الشاملة لجميع شبكات التأمين والنقابات المعتمدة
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-black text-blue-700 group-hover:text-blue-900 bg-white px-3 py-1.5 rounded-xl border border-blue-200/80 shrink-0 shadow-3xs transition-all self-start sm:self-auto mr-12 sm:mr-0">
                <span>عرض كافة التأمينات</span>
                <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              </div>
            </button>
          </div>
        ) : (
          <div className="text-center py-6 bg-stone-50 rounded-2xl border border-dashed border-stone-200 p-4">
            <p className="text-xs text-stone-500 font-bold mb-3">لا توجد جهات تأمين ضمن هذا التصنيف حالياً.</p>
            <button
              type="button"
              onClick={onNavigateToInsurances}
              className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200/90 rounded-xl font-black text-xs inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            >
              <span>عرض جميع شركات التأمين ({insurancesList.length})</span>
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 4. الخدمات والأسعار (Services & Procedures) */}
      <div className="bg-white rounded-3xl border border-[#e5e1da] p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded-2xl border border-emerald-100">
              <Stethoscope className="h-5 w-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-stone-900">الخدمات والأسعار</h3>
              <p className="text-xs text-stone-500 font-semibold">أبرز الفحوصات والإجراءات الطبية المتاحة لدى المنشأة</p>
            </div>
          </div>

          {!isPharmacy ? (
            <button
              type="button"
              onClick={handleOpenBooking}
              className="px-4 py-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>طلب حجز موعد</span>
            </button>
          ) : (
            cleanPhone && (
              <a
                href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent('مرحباً، أود الاستفسار عن توفر دواء أو خدمة صيدلانية.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <WhatsAppIcon className="h-3.5 w-3.5" />
                <span>استفسار وطلب أدوية</span>
              </a>
            )
          )}
        </div>

        {/* Procedures List - Displays only top 3 services with prices */}
        {displayedServices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {displayedServices.map((proc) => (
              <div 
                key={proc.id}
                className="p-4 rounded-2xl bg-stone-50/70 hover:bg-emerald-50/40 border border-stone-200/80 hover:border-emerald-200 transition-all flex flex-col justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs sm:text-sm font-black text-stone-900">
                      {proc.name}
                    </h4>
                  </div>

                  {proc.description && (
                    <p className="text-[11px] text-stone-600 font-medium leading-relaxed line-clamp-2">
                      {proc.description}
                    </p>
                  )}
                </div>

                {/* Price & Meta */}
                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-stone-200/60 text-[11px] font-bold">
                  <span className="text-stone-500 text-[10px]">
                    {proc.duration ? `⏱️ ${proc.duration}` : (proc.category || 'خدمة طبية')}
                  </span>
                  {proc.price ? (
                    <span className="text-emerald-800 font-black text-xs sm:text-sm bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60">
                      {proc.price}
                    </span>
                  ) : (
                    <span className="text-stone-500 text-[10px] font-bold">حسب الحالة</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
            <p className="text-xs text-stone-500 font-bold">يمكنك التواصل مع المنشأة مباشرة للاستفسار عن تفاصيل الخدمات والأسعار.</p>
          </div>
        )}

        {/* View More Services Button */}
        <div className="text-center mt-4 pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-stone-500 font-bold">
            يتم عرض أبرز 3 خدمات. يمكنك استعراض القائمة الشاملة لجميع الخدمات والإجراءات الطبية وأسعارها.
          </p>
          <button
            type="button"
            onClick={onNavigateToServices}
            className="w-full sm:w-auto px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/90 rounded-xl font-black text-xs inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs group shrink-0"
          >
            <span>عرض جميع الخدمات والأسعار {allServices.length > 0 ? `(${allServices.length})` : ''}</span>
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          </button>
        </div>
      </div>

      {/* 5. طوارئ 24 ساعة والتواصل العاجل + الأجهزة والتقنيات */}
      {isEmergency ? (
        <div className={`grid grid-cols-1 ${medicalProfile.showEquipments !== false ? 'lg:grid-cols-2' : ''} gap-6 sm:gap-8`}>
          
          {/* الطوارئ والمناوبة والتواصل العاجل */}
          <div className="bg-gradient-to-br from-rose-50/90 via-red-50/40 to-orange-50/30 rounded-3xl border border-rose-200/80 p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 bg-rose-500 text-white rounded-2xl shadow-xs">
                  <AlertCircle className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-base text-stone-900">طوارئ وتواصل عاجل (24/7)</h3>
                  <p className="text-xs text-stone-500 font-semibold">رعاية للحالات الطارئة ومتابعة ما بعد العلاج</p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs font-bold text-stone-700">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-rose-100 shadow-2xs">
                  <span>جاهزية استقبال الحالات الطارئة:</span>
                  <span className="text-rose-700 font-black">
                    {medicalProfile.has24Emergency ? 'متاح 24 ساعة طوال الأسبوع 🟢' : 'خلال ساعات الدوام والمناوبة ⏱️'}
                  </span>
                </div>

                {medicalProfile.offersHomeVisits && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-rose-100 shadow-2xs">
                    <span>خدمة الزيارات والفحص المنزلي:</span>
                    <span className="text-emerald-700 font-black">متوفرة لكبار السن والمرضى 🏠</span>
                  </div>
                )}

                <p className="text-[11px] text-stone-600 font-medium leading-relaxed pt-1">
                  في حال وجود ألم حاد، نزيف، أو استفسار عاجل بعد إجراء عملية، يرجى التواصل فوراً على خط الطوارئ.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <a
                href={`tel:${medicalProfile.emergencyPhone || business?.phone || ''}`}
                className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Phone className="h-4 w-4" />
                <span>اتصال فوري بخط الطوارئ: {medicalProfile.emergencyPhone || business?.phone || '079XXXXXXX'}</span>
              </a>
            </div>
          </div>

          {/* الأجهزة والتقنيات الطبية الحديثة */}
          {medicalProfile.showEquipments !== false && (
            <div className="bg-white rounded-3xl border border-[#e5e1da] p-5 sm:p-6 shadow-xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2.5 mb-3">
                  <div className="p-2 bg-teal-50 text-teal-800 rounded-2xl border border-teal-100">
                    <Cpu className="h-5 w-5 text-teal-700" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-stone-900">الأجهزة والتقنيات الطبية المستخدمة</h3>
                    <p className="text-xs text-stone-500 font-semibold">تجهيزات حديثة معتمدة لضمان دقة التشخيص</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {(medicalProfile.equipments && medicalProfile.equipments.length > 0) ? (
                    medicalProfile.equipments.map((eq, i) => (
                      <div key={i} className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/70 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h5 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                            <span>{eq.name}</span>
                          </h5>
                          {eq.brandOrOrigin && (
                            <span className="text-[10px] font-bold bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md border border-teal-100">
                              {eq.brandOrOrigin}
                            </span>
                          )}
                        </div>
                        {eq.description && (
                          <p className="text-[10px] text-stone-600 font-medium">
                            {eq.description}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-stone-500 font-medium p-3 bg-stone-50 rounded-xl">
                      تجهيزات تشخيصية وعيادية متطورة متوافقة مع المعايير الطبية الأردنية.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* If not emergency eligible, only render equipments cleanly if listed and not hidden */
        medicalProfile.showEquipments !== false && medicalProfile.equipments && medicalProfile.equipments.length > 0 && (
          <div className="bg-white rounded-3xl border border-[#e5e1da] p-5 sm:p-7 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
              <div className="p-2.5 bg-teal-50 text-teal-800 rounded-2xl border border-teal-100">
                <Cpu className="h-5 w-5 text-teal-700" />
              </div>
              <div>
                <h3 className="font-black text-base text-stone-900">الأجهزة والتقنيات الطبية المستخدمة</h3>
                <p className="text-xs text-stone-500 font-semibold">تجهيزات حديثة معتمدة لضمان دقة الفحص والكشف</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {medicalProfile.equipments.map((eq, i) => (
                <div key={i} className="p-3 rounded-2xl bg-stone-50/80 border border-stone-200/70 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                      <span>{eq.name}</span>
                    </h5>
                    {eq.brandOrOrigin && (
                      <span className="text-[10px] font-bold bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md border border-teal-100">
                        {eq.brandOrOrigin}
                      </span>
                    )}
                  </div>
                  {eq.description && (
                    <p className="text-[11px] text-stone-600 font-medium">
                      {eq.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* 6. تسهيلات الوصول للمرضى وكبار السن (Accessibility & Amenities) */}
      {medicalProfile.showAmenities !== false && (
        <div className="bg-stone-50/80 rounded-3xl border border-stone-200/80 p-5 sm:p-7 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-stone-200 pb-3.5 mb-4">
            <div className="p-2.5 bg-amber-50 text-amber-800 rounded-2xl border border-amber-200/60">
              <Accessibility className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg text-stone-900">تسهيلات الوصول وراحة المرضى</h3>
              <p className="text-xs text-stone-500 font-semibold">معايير السلامة وتيسير الحركة لكبار السن وذوي الاحتياجات</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {medicalProfile.hasWheelchairAccess !== false && (
              <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
                  <Accessibility className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="text-xs font-black text-stone-900">مدخل كراسي متحركة</h5>
                  <p className="text-[10px] text-emerald-700 font-bold">مهيأ بالكامل ♿</p>
                </div>
              </div>
            )}

            {medicalProfile.hasElevator !== false && (
              <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-700 rounded-xl shrink-0">
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="text-xs font-black text-stone-900">مصعد كهربائي</h5>
                  <p className="text-[10px] text-blue-700 font-bold">متوفر في المبنى 🛗</p>
                </div>
              </div>
            )}

            {medicalProfile.hasParking !== false && (
              <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-2.5">
                <div className="p-2 bg-amber-50 text-amber-700 rounded-xl shrink-0">
                  <Car className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="text-xs font-black text-stone-900">مواقف سيارات</h5>
                  <p className="text-[10px] text-amber-700 font-bold">مخصصة للمراجعين 🚗</p>
                </div>
              </div>
            )}

            {medicalProfile.hasFemaleStaff !== false && (
              <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 text-purple-700 rounded-xl shrink-0">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="text-xs font-black text-stone-900">كادر طبي نسائي</h5>
                  <p className="text-[10px] text-purple-700 font-bold">متوفر حسب الطلب 👩‍⚕️</p>
                </div>
              </div>
            )}

            {medicalProfile.hasKidsArea && (
              <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-2.5">
                <div className="p-2 bg-pink-50 text-pink-700 rounded-xl shrink-0">
                  <Baby className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="text-xs font-black text-stone-900">رعاية ومنطقة أطفال</h5>
                  <p className="text-[10px] text-pink-700 font-bold">مجهزة ومريحة 🧸</p>
                </div>
              </div>
            )}

            {medicalProfile.hasElectronicPayment !== false && (
              <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-2xs flex items-center gap-2.5">
                <div className="p-2 bg-teal-50 text-teal-700 rounded-xl shrink-0">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="text-xs font-black text-stone-900">دفع إلكتروني وCliQ</h5>
                  <p className="text-[10px] text-teal-700 font-bold">نقد وفيزا وكليك 💳</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Appointment Modal */}
      <MedicalAppointmentModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        business={business}
        medicalProfile={medicalProfile}
      />
    </div>
  );
}
