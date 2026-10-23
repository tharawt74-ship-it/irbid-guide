import React, { useState, useMemo } from 'react';
import { 
  Shield, Award, Stethoscope, Calendar, AlertCircle, 
  CheckCircle2, Sparkles, Cpu, Accessibility,
  ChevronLeft, Building2, Pill, Activity, Zap, Car, Users, Baby, Phone
} from 'lucide-react';
import { Business, MedicalFacilityInfo, MedicalInsurance, MedicalProcedure, MedicalDoctor } from '../../types';
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
      
      {/* 1. قسم نبذة عن المنشأة / الصيدلية */}
      <section className="space-y-3 pb-6 border-b border-stone-150/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
            <Building2 className="h-4.5 w-4.5 text-emerald-700" />
          </div>
          <h3 className="font-black text-base sm:text-lg text-stone-900">
            {isPharmacy ? 'عن الصيدلية' : 'عن المنشأة الطبية'}
          </h3>
        </div>

        {aboutText && /<[a-z][\s\S]*>/i.test(aboutText) ? (
          <div
            className="rich-text-content text-xs sm:text-sm text-stone-700 font-medium leading-relaxed space-y-2 prose prose-stone max-w-none [&_p]:mb-2 [&_ul]:list-disc [&_ul]:mr-4 [&_ol]:list-decimal [&_ol]:mr-4"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(aboutText) }}
          />
        ) : (
          <p className="text-xs sm:text-sm text-stone-700 font-medium leading-relaxed whitespace-pre-line">
            {aboutText}
          </p>
        )}

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] font-bold text-stone-600">
          {medicalProfile.licenseNumber && (
            <span className="inline-flex items-center gap-1.5 bg-stone-50 border border-stone-200/80 px-2.5 py-1 rounded-xl text-stone-700">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>ترخيص معتمد: {medicalProfile.licenseNumber}</span>
            </span>
          )}
          {doctor?.experienceYears && (
            <span className="inline-flex items-center gap-1.5 bg-stone-50 border border-stone-200/80 px-2.5 py-1 rounded-xl text-stone-700">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span>خبرة تتجاوز {doctor.experienceYears} سنوات</span>
            </span>
          )}
          {medicalProfile.has24Emergency && (
            <span className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200/80 px-2.5 py-1 rounded-xl text-rose-800 font-black">
              <Activity className="h-3.5 w-3.5 text-rose-600" />
              <span>جاهزية طوارئ 24 ساعة</span>
            </span>
          )}
        </div>
      </section>

      {/* 2. الكادر الطبي / الصيدلاني */}
      {(staffList.length > 0 || doctor) && (
        <section className="space-y-4 pb-6 border-b border-stone-150/80">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                {isPharmacy ? <Pill className="h-4.5 w-4.5 text-emerald-700" /> : <Award className="h-4.5 w-4.5 text-emerald-700" />}
              </div>
              <h3 className="font-black text-base sm:text-lg text-stone-900">
                {isPharmacy ? 'الكادر الصيدلاني والإشراف' : 'الكادر الطبي والمؤهلات'}
              </h3>
            </div>
            {staffList.length > 3 && (
              <button
                type="button"
                onClick={onNavigateToStaff}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 cursor-pointer"
              >
                <span>عرض الكل ({staffList.length})</span>
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 sm:gap-3.5">
            {displayedStaff.map((staff, idx) => (
              <div 
                key={idx} 
                className="flex flex-col items-center justify-center text-center p-3 sm:p-4 rounded-2xl bg-stone-50/80 border border-stone-200/70 hover:border-emerald-300 hover:bg-emerald-50/30 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1a4d2e] to-emerald-700 text-white flex items-center justify-center font-black text-base shadow-xs mb-2 shrink-0 group-hover:scale-105 transition-transform">
                  {staff.avatarUrl ? (
                    <img src={staff.avatarUrl} alt={staff.name} className="w-full h-full object-cover rounded-2xl" />
                  ) : isPharmacy ? (
                    <Pill className="h-5 w-5 text-emerald-100" />
                  ) : (
                    <Stethoscope className="h-5 w-5 text-emerald-100" />
                  )}
                </div>

                <h4 className="font-black text-xs sm:text-sm text-stone-900 truncate w-full px-1 mb-0.5">
                  {staff.name}
                </h4>

                <p className="text-[11px] font-bold text-emerald-800 truncate w-full px-1 mb-1.5">
                  {staff.subspecialty || staff.title}
                </p>

                <div className="inline-flex items-center gap-1 bg-white border border-stone-200 text-stone-700 px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">
                  <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
                  <span>خبرة {staff.experienceYears || 5} سنوات</span>
                </div>
              </div>
            ))}

            {/* View All Staff Card if less than 4 */}
            {staffList.length > 3 && (
              <button
                type="button"
                onClick={onNavigateToStaff}
                className="flex flex-col items-center justify-center text-center p-3 sm:p-4 rounded-2xl bg-emerald-50/70 hover:bg-emerald-100/70 border border-emerald-200/80 transition-all group cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 group-hover:bg-[#1a4d2e] text-white flex items-center justify-center shadow-xs mb-2 transition-transform group-hover:scale-105 shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <h4 className="font-black text-xs sm:text-sm text-stone-900 mb-0.5">
                  عرض كافة الكادر
                </h4>
                <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                  <span>({staffList.length} أعضاء)</span>
                  <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-1" />
                </p>
              </button>
            )}
          </div>
        </section>
      )}

      {/* 3. شركات التأمين والنقابات المعتمدة */}
      <section className="space-y-3.5 pb-6 border-b border-stone-150/80">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center shrink-0">
              <Shield className="h-4.5 w-4.5 text-blue-700" />
            </div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-base sm:text-lg text-stone-900">شركات التأمين والنقابات</h3>
              <span className="bg-blue-100 text-blue-800 text-[10px] px-2 py-0.5 rounded-full font-black">
                {insurancesList.length} جهة
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onNavigateToInsurances}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 cursor-pointer"
          >
            <span>عرض الكل</span>
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Categories Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedInsuranceCategory('all')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              selectedInsuranceCategory === 'all'
                ? 'bg-stone-900 text-white'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            الكل ({insurancesList.length})
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
            النقابات
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
            شركات التأمين
          </button>
        </div>

        {/* Insurances List */}
        {displayedInsurances.length > 0 ? (
          <div className="bg-stone-50/80 rounded-2xl border border-stone-200/70 divide-y divide-stone-200/60 overflow-hidden">
            {displayedInsurances.map((ins, i) => {
              const isSyndicate = ins.type === 'نقابة' || ins.name.includes('نقابة');
              return (
                <div 
                  key={i} 
                  className="p-3 sm:p-3.5 flex items-center justify-between gap-2.5"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isSyndicate 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {isSyndicate ? (
                        <Award className="h-4 w-4" />
                      ) : (
                        <Shield className="h-4 w-4" />
                      )}
                    </div>
                    <span className="text-xs sm:text-sm font-black text-stone-900 truncate">
                      {ins.name}
                    </span>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                    isSyndicate
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}>
                    {ins.type || (isSyndicate ? 'نقابة مهنية' : 'شركة تأمين')}
                  </span>
                </div>
              );
            })}
          </div>
        ) : null}
      </section>

      {/* 4. الخدمات والأسعار */}
      <section className="space-y-3.5 pb-6 border-b border-stone-150/80">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
              <Stethoscope className="h-4.5 w-4.5 text-emerald-700" />
            </div>
            <h3 className="font-black text-base sm:text-lg text-stone-900">الخدمات والأسعار</h3>
          </div>

          <div className="flex items-center gap-2">
            {!isPharmacy ? (
              <button
                type="button"
                onClick={handleOpenBooking}
                className="px-3 py-1.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Calendar className="h-3.5 w-3.5" />
                <span>حجز موعد</span>
              </button>
            ) : (
              cleanPhone && (
                <a
                  href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent('مرحباً، أود الاستفسار عن توفر دواء أو خدمة صيدلانية.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <WhatsAppIcon className="h-3.5 w-3.5" />
                  <span>طلب دواء</span>
                </a>
              )
            )}
          </div>
        </div>

        {/* Procedures Grid */}
        {displayedServices.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {displayedServices.map((proc) => (
              <div 
                key={proc.id}
                className="p-3.5 rounded-2xl bg-stone-50/80 border border-stone-200/70 hover:border-emerald-200 transition-all flex flex-col justify-between gap-2.5"
              >
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-stone-900 mb-1">
                    {proc.name}
                  </h4>
                  {proc.description && (
                    <p className="text-[11px] text-stone-600 font-medium leading-relaxed line-clamp-2">
                      {proc.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-200/60 text-[11px] font-bold">
                  <span className="text-stone-500 text-[10px]">
                    {proc.duration || proc.category || 'خدمة طبية'}
                  </span>
                  {proc.price ? (
                    <span className="text-emerald-800 font-black text-xs sm:text-sm bg-white px-2 py-0.5 rounded-lg border border-emerald-200/60 shadow-3xs">
                      {proc.price}
                    </span>
                  ) : (
                    <span className="text-stone-500 text-[10px]">حسب الحالة</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {allServices.length > 3 && (
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onNavigateToServices}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>استعراض كافة الخدمات والأسعار ({allServices.length})</span>
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>

      {/* 5. الطوارئ والتواصل العاجل (إن وجد) */}
      {isEmergency && (
        <section className="bg-rose-50/80 border border-rose-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-rose-500 text-white rounded-xl">
              <AlertCircle className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base text-stone-900">طوارئ وتواصل عاجل</h3>
              <p className="text-[11px] text-stone-500 font-semibold">
                {medicalProfile.has24Emergency ? 'متاح 24 ساعة طوال الأسبوع' : 'خلال ساعات الدوام والمناوبة'}
              </p>
            </div>
          </div>

          <a
            href={`tel:${medicalProfile.emergencyPhone || business?.phone || ''}`}
            className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2"
          >
            <Phone className="h-4 w-4" />
            <span>اتصال بخط الطوارئ: {medicalProfile.emergencyPhone || business?.phone || 'اتصال مباشر'}</span>
          </a>
        </section>
      )}

      {/* 6. الأجهزة والتقنيات (إن وجدت) */}
      {medicalProfile.showEquipments !== false && medicalProfile.equipments && medicalProfile.equipments.length > 0 && (
        <section className="space-y-3 pb-6 border-b border-stone-150/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-800 flex items-center justify-center shrink-0">
              <Cpu className="h-4.5 w-4.5 text-teal-700" />
            </div>
            <h3 className="font-black text-base sm:text-lg text-stone-900">الأجهزة والتقنيات الطبية</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {medicalProfile.equipments.map((eq, i) => (
              <div key={i} className="p-3 rounded-2xl bg-stone-50/80 border border-stone-200/70 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-teal-600" />
                    <span>{eq.name}</span>
                  </h5>
                  {eq.brandOrOrigin && (
                    <span className="text-[10px] font-bold bg-white text-teal-800 px-1.5 py-0.5 rounded-md border border-teal-100">
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
        </section>
      )}

      {/* 7. تسهيلات الوصول للمرضى */}
      {medicalProfile.showAmenities !== false && (
        <section className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-800 flex items-center justify-center shrink-0">
              <Accessibility className="h-4.5 w-4.5 text-amber-700" />
            </div>
            <h3 className="font-black text-base sm:text-lg text-stone-900">تسهيلات الوصول وراحة المراجعين</h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
            {medicalProfile.hasWheelchairAccess !== false && (
              <div className="p-2.5 bg-stone-50/80 rounded-2xl border border-stone-200/70 flex items-center gap-2">
                <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                  <Accessibility className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-stone-800">مدخل كراسي</span>
              </div>
            )}

            {medicalProfile.hasElevator !== false && (
              <div className="p-2.5 bg-stone-50/80 rounded-2xl border border-stone-200/70 flex items-center gap-2">
                <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg shrink-0">
                  <Building2 className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-stone-800">مصعد كهربائي</span>
              </div>
            )}

            {medicalProfile.hasParking !== false && (
              <div className="p-2.5 bg-stone-50/80 rounded-2xl border border-stone-200/70 flex items-center gap-2">
                <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg shrink-0">
                  <Car className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-stone-800">مواقف سيارات</span>
              </div>
            )}

            {medicalProfile.hasFemaleStaff !== false && (
              <div className="p-2.5 bg-stone-50/80 rounded-2xl border border-stone-200/70 flex items-center gap-2">
                <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg shrink-0">
                  <Users className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-stone-800">كادر نسائي</span>
              </div>
            )}

            {medicalProfile.hasKidsArea && (
              <div className="p-2.5 bg-stone-50/80 rounded-2xl border border-stone-200/70 flex items-center gap-2">
                <div className="p-1.5 bg-pink-100 text-pink-700 rounded-lg shrink-0">
                  <Baby className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-stone-800">منطقة أطفال</span>
              </div>
            )}

            {medicalProfile.hasElectronicPayment !== false && (
              <div className="p-2.5 bg-stone-50/80 rounded-2xl border border-stone-200/70 flex items-center gap-2">
                <div className="p-1.5 bg-teal-100 text-teal-700 rounded-lg shrink-0">
                  <Zap className="h-3.5 w-3.5" />
                </div>
                <span className="text-xs font-bold text-stone-800">دفع إلكتروني</span>
              </div>
            )}
          </div>
        </section>
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
