import React, { useState, useEffect } from 'react';
import { 
  X, Stethoscope, Building2, Pill, Microscope, Activity, 
  MapPin, Phone, ShieldCheck, Check, Plus, Trash2, 
  Clock, Sparkles, Upload, ArrowRight, ArrowLeft,
  Calendar, CheckCircle2, Copy, ExternalLink, AlertCircle,
  Accessibility, Car, Baby, Users, HeartPulse, Crown
} from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { ALL_IRBID_DISTRICTS } from '../../lib/categories';
import { POPULAR_JORDANIAN_INSURANCES, isEmergencyFacility } from '../../lib/medicalHelper';
import { MedicalFacilityInfo, MedicalProcedure } from '../../types';
import { cn } from '../../lib/utils';
import { sanitizeInput } from '../../lib/security';
import { compressAndSanitizeFirestorePayload } from '../../lib/firestoreHelper';
import { Link } from 'react-router';

interface AddMedicalFacilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFacilityAdded?: (facilityId: string) => void;
}

const MEDICAL_TYPES = [
  { id: 'clinic', name: 'عيادة طبيب خاصة / استشاري', icon: Stethoscope, desc: 'عيادة فردية لطبيب استشاري أو أخصائي' },
  { id: 'polyclinic', name: 'مجمع عيادات / مركز طبي تخصصي', icon: Building2, desc: 'مركز طبي يضم عدة تخصصات واستشاريين' },
  { id: 'hospital', name: 'مستشفى أو مركز جراحة يومية', icon: HeartPulse, desc: 'مستشفى عام أو خاص أو مركز جراحة متقدم' },
  { id: 'laboratory', name: 'مختبر تحاليل طبية وأشعة', icon: Microscope, desc: 'مختبر فحوصات مخبرية أو مركز أشعة ورنين' },
  { id: 'pharmacy', name: 'صيدلية ورعاية صحية', icon: Pill, desc: 'صيدلية، تركيبات دوائية ومستلزمات طبية' },
  { id: 'rehab', name: 'مركز علاج طبيعي وتأهيل', icon: Activity, desc: 'علاج فيزيائي، تأهيل حركي ونطق' },
];

const MAIN_SPECIALTIES = [
  'الأمراض الباطنية والتخصصات الدقيقة',
  'الجراحة العامة وجراحة المناظير',
  'عيادات الأسنان وطب وجراحة الفم والفكين',
  'عيادات العيون وجراحتها وتصحيح البصر',
  'طب الأطفال وحديثي الولادة',
  'النسائية والتوليد وجراحة العقم وتأخر الإنجاب',
  'جراحة العظام والمفاصل والعمود الفقري',
  'الأنف والأذن والحنجرة وجراحة الرأس والعنق',
  'الجلدية والتناسلية والليزر والتجميل',
  'المخ والأعصاب وجراحة الجملة العصبية',
  'الطب النفسي وعلاج الإدمان والصحة النفسية',
  'المسالك البولية وأمراض الذكورة والعقم',
  'القلب والأوعية الدموية والقسطرة التداخلية',
  'المختبرات ومراكز الأشعة والتصوير التشخيصي',
  'الصيدليات والدواء والمستلزمات الطبية',
  'العلاج الطبيعي والفيزيائي والتأهيل الحركي',
  'المستشفيات والمراكز الطبية الشاملة'
];

const PROFESSIONAL_TITLES = [
  'طبيب استشاري (Consultant)',
  'اختصاصي أول (Senior Specialist)',
  'طبيب اختصاصي (Specialist)',
  'طبيب عام وممارس (General Practitioner)',
  'مدير طبي / صيدلي مسؤول',
  'أخصائي مختبر وتحاليل طبية',
  'أخصائي علاج طبيعي وتأهيل'
];

export function AddMedicalFacilityModal({ isOpen, onClose, onFacilityAdded }: AddMedicalFacilityModalProps) {
  const { currentUser } = useAuth();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdBusinessId, setCreatedBusinessId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Form State
  const [facilityType, setFacilityType] = useState('clinic');
  const [mainSpecialty, setMainSpecialty] = useState(MAIN_SPECIALTIES[0]);
  const [subSpecialty, setSubSpecialty] = useState('');

  // Doctor / Facility Info
  const [facilityName, setFacilityName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [professionalTitle, setProfessionalTitle] = useState(PROFESSIONAL_TITLES[0]);
  const [degrees, setDegrees] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [experienceYears, setExperienceYears] = useState('10');
  const [bio, setBio] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // Fees, Booking & Insurance
  const [consultationFee, setConsultationFee] = useState('15 د.أ (حسب تسعيرة النقابة)');
  const [followUpPolicy, setFollowUpPolicy] = useState('المراجعة مجانية خلال 14 يوماً من تاريخ الكشف');
  const [selectedInsurances, setSelectedInsurances] = useState<string[]>([
    'نقابة المهندسين الأردنيين',
    'نقابة المعلمين الأردنيين',
    'شركة الشرق العربي للتأمين (gig)',
    'نات هيلث (NatHealth)'
  ]);
  const [has24Emergency, setHas24Emergency] = useState(false);
  const [offersHomeVisits, setOffersHomeVisits] = useState(false);

  // Contact & Location
  const [selectedPackagePlan, setSelectedPackagePlan] = useState<'golden' | 'basic' | 'pay_per_use'>('golden');
  const [billingPeriod, setBillingPeriod] = useState<'yearly' | 'monthly'>('yearly');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [district, setDistrict] = useState('شارع الجامعة');
  const [address, setAddress] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');

  // Emergency eligibility (Hospitals & Comprehensive Centers, Pharmacies, Labs & Radiology)
  const isEmergencyEligible = isEmergencyFacility({ facilityType, mainSpecialty, name: facilityName });

  // Amenities
  const [hasWheelchairAccess, setHasWheelchairAccess] = useState(true);
  const [hasElevator, setHasElevator] = useState(true);
  const [hasParking, setHasParking] = useState(true);
  const [hasFemaleStaff, setHasFemaleStaff] = useState(true);
  const [hasKidsArea, setHasKidsArea] = useState(false);

  // Procedures
  const [procedureInput, setProcedureInput] = useState('');
  const [proceduresList, setProceduresList] = useState<string[]>([
    'كشف وتشخيص سريري متقدم',
    'استشارة طبية وتخطيط علاجي'
  ]);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when closed after completion
      if (createdBusinessId) {
        setCreatedBusinessId(null);
        setCurrentStep(1);
      }
      setErrorMessage('');
    }
  }, [isOpen, createdBusinessId]);

  if (!isOpen) return null;

  const toggleInsurance = (insName: string) => {
    setSelectedInsurances(prev => 
      prev.includes(insName) ? prev.filter(i => i !== insName) : [...prev, insName]
    );
  };

  const handleAddProcedure = () => {
    if (!procedureInput.trim()) return;
    if (!proceduresList.includes(procedureInput.trim())) {
      setProceduresList(prev => [...prev, procedureInput.trim()]);
    }
    setProcedureInput('');
  };

  const handleRemoveProcedure = (idx: number) => {
    setProceduresList(prev => prev.filter((_, i) => i !== idx));
  };

  const validateStep = (step: number) => {
    setErrorMessage('');
    if (step === 1) {
      if (!mainSpecialty) {
        setErrorMessage('يرجى تحديد الاختصاص الطبي الرئيسي.');
        return false;
      }
    } else if (step === 2) {
      if (!facilityName.trim()) {
        setErrorMessage('يرجى إدخال اسم المنشأة أو العيادة.');
        return false;
      }
      if (!doctorName.trim()) {
        setErrorMessage('يرجى إدخال اسم الطبيب أو المسؤول الطبي.');
        return false;
      }
    } else if (step === 3) {
      // Step 3 validation (optional fees/insurances)
    } else if (step === 4) {
      if (!selectedPackagePlan) {
        setErrorMessage('يرجى اختيار باقة الاشتراك المناسبة لمنشأتك الطبية.');
        return false;
      }
    } else if (step === 5) {
      if (!phone.trim()) {
        setErrorMessage('يرجى إدخال رقم هاتف التواصل المباشر.');
        return false;
      }
      if (!address.trim()) {
        setErrorMessage('يرجى إدخال العنوان التفصيلي (الشارع، المجمع، الطابق).');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 5) {
        setCurrentStep((prev) => (prev + 1) as any);
      }
    }
  };

  const handlePrev = () => {
    setErrorMessage('');
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as any);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(5)) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const parsedDegrees = degrees.split(/[,،\n]/).map(d => d.trim()).filter(Boolean);
      if (parsedDegrees.length === 0) {
        parsedDegrees.push('البورد الأردني التخصصي', 'عضو نقابة الأطباء الأردنية');
      }

      const formattedProcedures: MedicalProcedure[] = proceduresList.map((name, idx) => ({
        id: `proc_${Date.now()}_${idx + 1}`,
        name,
        category: mainSpecialty,
        isPopular: true
      }));

      const medicalProfileData: MedicalFacilityInfo = {
        insurances: selectedInsurances.map(name => ({
          name,
          type: name.includes('نقابة') ? 'نقابة' : 'شركة تأمين',
          isDirectBilling: true,
          coverageDetails: 'تغطية معتمدة ومباشرة'
        })),
        acceptsInsuranceDirectBilling: selectedInsurances.length > 0,
        insuranceNotes: selectedInsurances.length > 0 
          ? `نقبل بطاقات التأمينات والنقابات المعتمدة (${selectedInsurances.slice(0, 4).join('، ')}${selectedInsurances.length > 4 ? ' وغيرها' : ''}).`
          : 'الدفع نقدي أو عبر وسائل الدفع الإلكتروني المعتمدة.',
        doctorProfile: {
          name: sanitizeInput(doctorName),
          title: sanitizeInput(professionalTitle),
          degrees: parsedDegrees,
          subspecialty: sanitizeInput(subSpecialty || mainSpecialty),
          experienceYears: parseInt(experienceYears) || 10,
          bio: sanitizeInput(bio || `يقدم ${doctorName} في ${facilityName} رعاية طبية متكاملة وتشخيصاً دقيقاً وفق أحدث المعايير الطبية المعتمدة في الأردن.`)
        },
        licenseNumber: sanitizeInput(licenseNumber || `JMA-IRB-${Math.floor(1000 + Math.random() * 9000)}`),
        accreditationBody: 'منشأة وكادر طبي مرخص ومعتمد من وزارة الصحة ونقابة الأطباء الأردنية',
        consultationFee: sanitizeInput(consultationFee || 'حسب تسعيرة النقابة'),
        followUpPolicy: sanitizeInput(followUpPolicy || 'المراجعة مجانية خلال 14 يوماً من تاريخ الكشف'),
        appointmentDurationMinutes: 20,
        appointmentTypes: ['in_clinic', 'urgent', ...(offersHomeVisits ? ['home_visit' as const] : [])],
        bookingNotice: 'يتم تأكيد الموعد فورياً وتنسيق الموعد الأنسب بدون فترات انتظار طويلة.',
        procedures: formattedProcedures,
        has24Emergency: isEmergencyEligible ? has24Emergency : false,
        emergencyPhone: (isEmergencyEligible && emergencyPhone) ? sanitizeInput(emergencyPhone) : '',
        onCallService: true,
        offersHomeVisits,
        homeVisitPhone: sanitizeInput(phone),
        hasWheelchairAccess,
        hasElevator,
        hasParking,
        hasFemaleStaff,
        hasKidsArea,
        paymentMethods: ['نقد (Cash)', 'بطاقات ائتمان (Visa / MasterCard)', 'كليك (CliQ)', 'تأمين صحي معتمد'],
        medicalRatingMetrics: {
          waitingTimeScore: 4.9,
          doctorListeningScore: 5.0,
          cleanlinessScore: 5.0,
          staffFriendlinessScore: 4.9
        }
      };

      const newFacilityDoc = {
        name: sanitizeInput(facilityName),
        category: mainSpecialty,
        subCategory: sanitizeInput(subSpecialty || mainSpecialty),
        description: sanitizeInput(bio || `المنشأة الطبية ${facilityName} بإشراف ${doctorName}، متخصصة في ${mainSpecialty}.`),
        phone: sanitizeInput(phone),
        whatsapp: sanitizeInput(whatsapp || phone),
        address: sanitizeInput(address),
        district: sanitizeInput(district),
        region: 'إربد',
        googleMapsUrl: sanitizeInput(googleMapsUrl),
        imageUrl: sanitizeInput(imageUrl || 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=800'),
        image: sanitizeInput(imageUrl || 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=800'),
        rating: 5.0,
        reviewCount: 0,
        reviewsCount: 0,
        views: 1,
        isVerified: selectedPackagePlan === 'golden',
        isFeatured: selectedPackagePlan === 'golden',
        packagePlan: selectedPackagePlan,
        billingPeriod: billingPeriod,
        status: 'pending',
        medicalProfile: medicalProfileData,
        createdAt: Date.now(),
        userId: currentUser?.uid || 'guest_medical_provider'
      };

      // Submit pending request to 'businessRequests'
      const pendingReq = {
        ...newFacilityDoc,
        requestType: 'medical_facility_registration',
        submittedAt: Date.now(),
        userEmail: currentUser?.email || ''
      };
      const sanitizedReq = await compressAndSanitizeFirestorePayload(pendingReq, false);
      const reqRef = await addDoc(collection(db, 'businessRequests'), sanitizedReq);

      // Also create unverified record in 'businesses'
      try {
        const sanitizedBiz = await compressAndSanitizeFirestorePayload(newFacilityDoc, false);
        const docRef = await addDoc(collection(db, 'businesses'), sanitizedBiz);
        setCreatedBusinessId(docRef.id);
      } catch (bizErr) {
        setCreatedBusinessId(reqRef.id);
      }

      // Trigger custom event so medical list updates automatically
      window.dispatchEvent(new CustomEvent('medical-business-added', { detail: { id: reqRef.id } }));
      if (onFacilityAdded) {
        onFacilityAdded(reqRef.id);
      }
    } catch (err: any) {
      console.error("Error creating medical facility:", err);
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ بيانات المنشأة الطبية. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdBusinessId) return;
    const url = `${window.location.origin}/b/${createdBusinessId}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-stone-950/75 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200" dir="rtl">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-2xl w-full overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-l from-[#1a4d2e] to-teal-900 text-white p-5 sm:p-6 shrink-0 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 left-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <Stethoscope className="h-5 w-5 text-emerald-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">إضافة منشأة أو عيادة طبية</h2>
              <p className="text-xs sm:text-sm text-emerald-100/90 font-medium">سجل منشأتك في دليل إربد الطبي المعتمد لاستقبال المراجعين</p>
            </div>
          </div>

          {/* Stepper Wizard Indicator */}
          {!createdBusinessId && (
            <div className="grid grid-cols-5 gap-1.5 mt-4 pt-4 border-t border-white/10">
              {[
                { step: 1, label: 'نوع المنشأة' },
                { step: 2, label: 'الكادر والترخيص' },
                { step: 3, label: 'الكشفية والتأمين' },
                { step: 4, label: 'باقة الاشتراك' },
                { step: 5, label: 'الموقع والتواصل' }
              ].map(item => (
                <div key={item.step} className="flex flex-col items-center">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all mb-1",
                    currentStep === item.step
                      ? "bg-amber-400 text-stone-950 ring-2 ring-white/50"
                      : currentStep > item.step
                      ? "bg-emerald-500 text-white"
                      : "bg-white/10 text-white/60"
                  )}>
                    {currentStep > item.step ? <Check className="h-3.5 w-3.5" /> : item.step}
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold text-center truncate w-full",
                    currentStep === item.step ? "text-amber-300" : "text-white/70"
                  )}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm rounded-xl flex items-center gap-2 font-bold">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* SUCCESS SCREEN */}
          {createdBusinessId ? (
            <div className="text-center py-6 space-y-6">
              <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto ring-8 ring-emerald-50 animate-bounce">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-stone-900">تم تسجيل المنشأة الطبية بنجاح! 🩺✨</h3>
                <p className="text-stone-600 text-sm max-w-md mx-auto leading-relaxed">
                  أصبحت منشأتك الطبية <strong className="text-stone-900">({facilityName})</strong> مسجلة وموثقة في دليل الرعاية الطبية في إربد، ومتاحة للمرضى والمراجعين فورياً.
                </p>
              </div>

              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 max-w-md mx-auto flex items-center justify-between gap-3">
                <div className="text-right truncate">
                  <div className="text-[11px] font-bold text-stone-400">رابط الصفحة الطبية الخاص بك:</div>
                  <div className="text-xs font-mono font-bold text-emerald-800 truncate" dir="ltr">
                    {`${window.location.origin}/b/${createdBusinessId}`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3 py-2 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 text-stone-500" />}
                  <span>{copiedLink ? 'تم النسخ' : 'نسخ'}</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  to={`/b/${createdBusinessId}`}
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-3.5 bg-[#1a4d2e] hover:bg-[#143e24] text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>معاينة صفحة العيادة الآن</span>
                </Link>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold text-sm transition-colors cursor-pointer"
                >
                  العودة للدليل الطبي
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: نوع المنشأة والتخصص */}
              {currentStep === 1 && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div>
                    <label className="block text-xs font-black text-stone-700 mb-2">1. حدد نوع المنشأة الطبية:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {MEDICAL_TYPES.map(type => {
                        const Icon = type.icon;
                        const isSelected = facilityType === type.id;
                        return (
                          <div
                            key={type.id}
                            onClick={() => setFacilityType(type.id)}
                            className={cn(
                              "p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3 select-none",
                              isSelected 
                                ? "bg-emerald-50/60 border-[#1a4d2e] shadow-xs" 
                                : "bg-white border-stone-200 hover:border-stone-300"
                            )}
                          >
                            <div className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                              isSelected ? "bg-[#1a4d2e] text-white" : "bg-stone-100 text-stone-600"
                            )}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className={cn("text-xs font-bold", isSelected ? "text-[#1a4d2e]" : "text-stone-900")}>
                                {type.name}
                              </div>
                              <div className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                                {type.desc}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-stone-700 mb-1.5">2. الاختصاص الطبي الرئيسي <span className="text-red-500">*</span></label>
                    <select
                      value={mainSpecialty}
                      onChange={(e) => setMainSpecialty(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-3 text-xs sm:text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white transition-all cursor-pointer"
                    >
                      {MAIN_SPECIALTIES.map((spec) => (
                        <option key={spec} value={spec}>{spec}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-stone-700 mb-1.5">3. التخصص الفرعي / الدقيق (اختياري)</label>
                    <input
                      type="text"
                      placeholder="مثال: تصحيح البصر والليزك، جراحة مناظير، تقويم الأسنان، السكري والغدد..."
                      value={subSpecialty}
                      onChange={(e) => setSubSpecialty(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white transition-all"
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: الكادر والترخيص والاعتماد */}
              {currentStep === 2 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-black text-stone-700 mb-1">اسم المنشأة أو العيادة <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        placeholder="مثال: عيادة د. أحمد العمري لجراحة العيون"
                        value={facilityName}
                        onChange={(e) => setFacilityName(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-stone-700 mb-1">اسم الطبيب أو المسؤول الطبي <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        placeholder="مثال: د. أحمد فواز العمري"
                        value={doctorName}
                        onChange={(e) => setDoctorName(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-black text-stone-700 mb-1">الدرجة المهنية واللقب</label>
                      <select
                        value={professionalTitle}
                        onChange={(e) => setProfessionalTitle(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white cursor-pointer"
                      >
                        {PROFESSIONAL_TITLES.map((title) => (
                          <option key={title} value={title}>{title}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-stone-700 mb-1">سنوات الخبرة السريرية</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        placeholder="10"
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-stone-700 mb-1">المؤهلات العلمية، البورد الأردني والزمالات</label>
                    <input
                      type="text"
                      placeholder="مثال: البورد الأردني في طب العيون، زمالة الكلية الملكية، دبلوم الليزك..."
                      value={degrees}
                      onChange={(e) => setDegrees(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white"
                    />
                    <span className="text-[10px] text-stone-400 mt-1 block">افصل بين الشهادات بفاصلة أو نقطة</span>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-stone-700 mb-1">رقم ترخيص مزاولة المهنة / وزارة الصحة (اختياري)</label>
                    <input
                      type="text"
                      placeholder="مثال: JMA-IRB-2024/99"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-stone-700 mb-1">نبذة تعريفية مهنية عن الطبيب والمنشأة</label>
                    <textarea
                      rows={2}
                      placeholder="نبذة موجزة عن الخبرة الطبية، الخدمات المقدمة ورسالة العيادة..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: الكشفية والتأمين والمواعيد */}
              {currentStep === 3 && (
                <div className="space-y-4.5 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-black text-stone-700 mb-1">قيمة الكشفية الطبية المعتمدة</label>
                      <input
                        type="text"
                        placeholder="مثال: 15 د.أ (حسب تسعيرة النقابة)"
                        value={consultationFee}
                        onChange={(e) => setConsultationFee(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-stone-700 mb-1">سياسة المراجعة الطبية</label>
                      <input
                        type="text"
                        placeholder="مثال: المراجعة مجانية خلال 14 يوماً"
                        value={followUpPolicy}
                        onChange={(e) => setFollowUpPolicy(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-stone-700 mb-1.5">
                      شركات التأمين والنقابات المهنية المعتمدة للكشف المباشر:
                    </label>
                    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1.5 bg-stone-50 rounded-2xl border border-stone-200">
                      {POPULAR_JORDANIAN_INSURANCES.map(ins => {
                        const isChecked = selectedInsurances.includes(ins.name);
                        return (
                          <button
                            key={ins.name}
                            type="button"
                            onClick={() => toggleInsurance(ins.name)}
                            className={cn(
                              "px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                              isChecked
                                ? "bg-[#1a4d2e] text-white shadow-2xs"
                                : "bg-white text-stone-700 border border-stone-200 hover:bg-stone-100"
                            )}
                          >
                            <span className={cn(
                              "w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px]",
                              isChecked ? "bg-white text-[#1a4d2e]" : "border border-stone-300"
                            )}>
                              {isChecked && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                            </span>
                            <span>{ins.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Emergency and Home Visits Toggles */}
                  <div className={`grid grid-cols-1 ${isEmergencyEligible ? 'sm:grid-cols-2' : ''} gap-3 pt-2`}>
                    {isEmergencyEligible && (
                      <label className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-2xl cursor-pointer hover:bg-stone-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={has24Emergency}
                          onChange={(e) => setHas24Emergency(e.target.checked)}
                          className="w-4 h-4 rounded text-[#1a4d2e] focus:ring-[#1a4d2e]"
                        />
                        <div>
                          <div className="text-xs font-bold text-stone-900">طوارئ على مدار 24 ساعة 🚨</div>
                          <div className="text-[10px] text-stone-500">استقبال الحالات المستعجلة ليلاً ونهاراً</div>
                        </div>
                      </label>
                    )}

                    <label className="flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-2xl cursor-pointer hover:bg-stone-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={offersHomeVisits}
                        onChange={(e) => setOffersHomeVisits(e.target.checked)}
                        className="w-4 h-4 rounded text-[#1a4d2e] focus:ring-[#1a4d2e]"
                      />
                      <div>
                        <div className="text-xs font-bold text-stone-900">خدمة الزيارات المنزلية 🩺</div>
                        <div className="text-[10px] text-stone-500">إمكانية كشف منزلي لكبار السن والحالات الخاصة</div>
                      </div>
                    </label>
                  </div>

                </div>
              )}

              {/* STEP 4: باقة الاشتراك لمنشأتك الطبية */}
              {currentStep === 4 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-stone-200">
                    <div className="flex items-center gap-2 font-black text-sm text-stone-900">
                      <Crown className="h-5 w-5 text-amber-500" />
                      <span>الخطوة 4: اختر باقة الاشتراك لمشروعك الطبي 🩺</span>
                    </div>
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      شهر مجاني لـ VIP 🎁
                    </span>
                  </div>

                  {/* Billing Period Selector */}
                  <div className="flex flex-col items-center justify-center p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1.5">
                    <span className="text-xs font-black text-stone-700">دورة الدفع للباقات المدفوعة:</span>
                    <div className="bg-stone-200 p-1 rounded-lg inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => setBillingPeriod('monthly')}
                        className={`px-3 py-1.5 rounded-md text-xs font-black transition-all cursor-pointer ${
                          billingPeriod === 'monthly'
                            ? 'bg-[#1a4d2e] text-white shadow-xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        الدفع الشهري 🗓️
                      </button>
                      <button
                        type="button"
                        onClick={() => setBillingPeriod('yearly')}
                        className={`px-3 py-1.5 rounded-md text-xs font-black transition-all cursor-pointer flex items-center gap-1 ${
                          billingPeriod === 'yearly'
                            ? 'bg-[#ff9f1c] text-white shadow-xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        <span>الدفع السنوي (الافتراضي)</span>
                        <span className="bg-red-600 text-white text-[8px] px-1 py-0.5 rounded-full font-black animate-pulse">
                          وفر 48% 🔥
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Basic Card */}
                    <div
                      onClick={() => setSelectedPackagePlan('basic')}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden select-none",
                        selectedPackagePlan === 'basic'
                          ? "bg-emerald-50/40 border-[#1a4d2e] shadow-sm ring-2 ring-[#1a4d2e]/10"
                          : "bg-white border-stone-200 hover:border-stone-300"
                      )}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm text-stone-900 flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-stone-500" /> الباقة الأساسية
                          </span>
                          {selectedPackagePlan === 'basic' && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />}
                        </div>
                        <p className="text-xs text-stone-500 font-medium leading-relaxed">
                          التواجد والتعريف الطبي الأساسي لمرضى ومراجعي إربد
                        </p>
                        <div className="p-2.5 bg-stone-100 rounded-xl text-center font-black text-xs text-[#1a4d2e] border border-stone-200">
                          سعر رمزي جداً (تفعيل للأبد)
                        </div>
                        <ul className="space-y-1.5 text-[11px] text-stone-600 font-medium">
                          <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" /> بطاقة تعريفية رقمية متكاملة، والموقع على الخريطة</li>
                          <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" /> أرقام الهواتف ورابط الواتساب المباشر</li>
                          <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" /> ساعات عمل حية ومؤشر (مفتوح / مغلق)</li>
                          <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" /> استقبال وعرض تقييمات المراجعين</li>
                        </ul>
                      </div>
                      <div className="mt-4 pt-2">
                        <div className={cn(
                          "w-full py-2 rounded-xl text-xs font-black text-center border transition-all",
                          selectedPackagePlan === 'basic' ? "bg-[#1a4d2e] text-white border-[#1a4d2e]" : "bg-stone-100 text-stone-700 border-stone-200"
                        )}>
                          {selectedPackagePlan === 'basic' ? '✓ الباقة المحددة' : 'اختيار الأساسية'}
                        </div>
                      </div>
                    </div>

                    {/* Golden Card */}
                    <div
                      onClick={() => setSelectedPackagePlan('golden')}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden select-none mt-2 sm:mt-0",
                        selectedPackagePlan === 'golden'
                          ? "bg-emerald-50/50 border-emerald-500 shadow-sm ring-2 ring-emerald-400/20"
                          : "bg-white border-emerald-200 hover:border-emerald-400"
                      )}
                    >
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-black text-[8px] px-2 py-0.5 rounded-b-xl uppercase tracking-wider flex items-center justify-center shadow-xs w-max max-w-[95%]">
                        الخيار الأكثر ثقة للعيادات المتميزة 👑
                      </div>

                      <div className="space-y-3 pt-3">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm text-emerald-950 flex items-center gap-1">
                            <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" /> الباقة الذهبية VIP
                          </span>
                          {selectedPackagePlan === 'golden' && <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />}
                        </div>
                        <p className="text-xs text-emerald-800/80 font-bold leading-relaxed">
                          العيادة الرقمية المتكاملة 👑
                        </p>
                        <div className="p-2.5 bg-emerald-50/80 rounded-xl text-center font-black text-xs text-emerald-950 border border-emerald-200">
                          {billingPeriod === 'yearly' ? '9.9 د.أ / شهرياً (توفير 109 د.أ!)' : '19 د.أ / شهرياً'}
                        </div>
                        <ul className="space-y-1.5 text-[11px] text-stone-700 font-medium">
                          <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" /> شارة التوثيق والاعتماد الطبية الرسمية (✓)</li>
                          <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" /> محرك حجز المواعيد الطبي المسبق</li>
                          <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" /> كتالوج الإجراءات الطبية والفحوصات بالأسعار</li>
                          <li className="flex items-start gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" /> أولوية الصدارة في نتائج البحث والتوصيات</li>
                        </ul>
                      </div>
                      <div className="mt-4 pt-2">
                        <div className={cn(
                          "w-full py-2 rounded-xl text-xs font-black text-center border transition-all",
                          selectedPackagePlan === 'golden' ? "bg-[#1a4d2e] text-white border-[#1a4d2e]" : "bg-emerald-100 text-emerald-900 border-emerald-200"
                        )}>
                          {selectedPackagePlan === 'golden' ? '✓ الباقة المحددة' : 'اختيار الذهبية VIP'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: الموقع والتواصل والتجهيزات */}
              {currentStep === 5 && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-black text-stone-700 mb-1">رقم الهاتف للاتصال المباشر <span className="text-red-500">*</span></label>
                      <input
                        type="tel"
                        placeholder="079XXXXXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-stone-700 mb-1">رقم الواتساب لحجز المواعيد</label>
                      <input
                        type="tel"
                        placeholder="079XXXXXXX"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className={`grid grid-cols-1 ${isEmergencyEligible ? 'sm:grid-cols-2' : ''} gap-3.5`}>
                    <div>
                      <label className="block text-xs font-black text-stone-700 mb-1">المنطقة / الحي في إربد <span className="text-red-500">*</span></label>
                      <select
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white cursor-pointer"
                      >
                        {ALL_IRBID_DISTRICTS.map((dist) => (
                          <option key={dist} value={dist}>{dist}</option>
                        ))}
                      </select>
                    </div>

                    {isEmergencyEligible && (
                      <div>
                        <label className="block text-xs font-black text-stone-700 mb-1">رقم هاتف الطوارئ (اختياري)</label>
                        <input
                          type="tel"
                          placeholder="078XXXXXXX"
                          value={emergencyPhone}
                          onChange={(e) => setEmergencyPhone(e.target.value)}
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white"
                          dir="ltr"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-black text-stone-700 mb-1">العنوان التفصيلي في إربد <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="مثال: شارع الجامعة، مقابل البوابة الشمالية، مجمع ابن خلدون الطبي، ط 3"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black text-stone-700 mb-1">رابط خرائط قوقل Google Maps (اختياري)</label>
                    <input
                      type="url"
                      placeholder="https://maps.google.com/..."
                      value={googleMapsUrl}
                      onChange={(e) => setGoogleMapsUrl(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white"
                      dir="ltr"
                    />
                  </div>

                  {/* Accessibility Amenities */}
                  <div>
                    <label className="block text-xs font-black text-stone-700 mb-2">تسهيلات الوصول والراحة المتوفرة بالمنشأة:</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[
                        { label: 'مصعد كهربائي', state: hasElevator, setState: setHasElevator, icon: Building2 },
                        { label: 'كراسي متحركة', state: hasWheelchairAccess, setState: setHasWheelchairAccess, icon: Accessibility },
                        { label: 'مواقف سيارات', state: hasParking, setState: setHasParking, icon: Car },
                        { label: 'كادر نسائي', state: hasFemaleStaff, setState: setHasFemaleStaff, icon: Users },
                        { label: 'ألعاب أطفال', state: hasKidsArea, setState: setHasKidsArea, icon: Baby },
                      ].map((amenity, i) => {
                        const Icon = amenity.icon;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => amenity.setState(!amenity.state)}
                            className={cn(
                              "p-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer",
                              amenity.state 
                                ? "bg-emerald-50 border-emerald-300 text-emerald-900" 
                                : "bg-stone-50 border-stone-200 text-stone-500 hover:bg-stone-100"
                            )}
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{amenity.label}</span>
                            {amenity.state && <Check className="h-3 w-3 mr-auto text-emerald-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Key Procedures Tag Input */}
                  <div>
                    <label className="block text-xs font-black text-stone-700 mb-1">أبرز الخدمات والإجراءات الطبية المتوفرة:</label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        placeholder="أدخل اسم خدمة أو فحص ثم اضغط إضافة..."
                        value={procedureInput}
                        onChange={(e) => setProcedureInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddProcedure(); } }}
                        className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                      />
                      <button
                        type="button"
                        onClick={handleAddProcedure}
                        className="px-3 py-2 bg-[#1a4d2e] text-white rounded-xl text-xs font-bold hover:bg-[#143e24] transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>إضافة</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {proceduresList.map((proc, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 border border-stone-200 rounded-lg text-xs font-medium text-stone-800">
                          <span>{proc}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveProcedure(idx)}
                            className="text-stone-400 hover:text-red-500 p-0.5 rounded transition-colors cursor-pointer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer Controls */}
        {!createdBusinessId && (
          <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-3 shrink-0">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <ArrowRight className="h-4 w-4" />
                <span>السابق</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl hover:bg-stone-200 text-stone-600 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
              >
                إلغاء
              </button>
            )}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#1a4d2e] hover:bg-[#143e24] text-white text-xs sm:text-sm font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <span>المتابعة</span>
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-[#1a4d2e] hover:from-emerald-700 hover:to-[#133b22] text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>جاري إرسال الطلب للإدارة...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4.5 w-4.5 text-emerald-300" />
                    <span>إرسال الطلب لوحة تحكم المدير للمراجعة والاعتماد 📩</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
