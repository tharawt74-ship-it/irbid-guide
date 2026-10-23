import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as LucideIcons from 'lucide-react';
import { 
  X, Stethoscope, Building2,
  MapPin, Phone, ShieldCheck, Check, Plus, Trash2, 
  Clock, Sparkles, ArrowRight, ArrowLeft,
  CheckCircle2, AlertCircle, Users, Crown,
  Award, CreditCard
} from 'lucide-react';
import { applyNewBusinessWelcomeGift } from '../../lib/vipHelper';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useSystemSettings } from '../../contexts/SystemSettingsContext';
import { 
  MEDICAL_SPECIALTIES, 
  ToothIcon 
} from '../../lib/medicalCategories';
import { 
  MedicalFacilityInfo, 
  MedicalProcedure, 
  MedicalDoctor, 
  MenuItem, 
  WorkingHours, 
  SocialLinks, 
  Business 
} from '../../types';
import { sanitizeInput } from '../../lib/security';
import { compressAndSanitizeFirestorePayload } from '../../lib/firestoreHelper';
import { validateJordanianPhone, isEmergencyFacility } from '../../lib/medicalHelper';
import { invalidateCache } from '../../lib/dataCache';
import { ImageUploader } from '../ui/ImageUploader';
import { WorkingHoursEditor } from '../ui/WorkingHoursEditor';
import { SocialLinksEditor } from '../ui/SocialLinksEditor';
import { PaymentMethodsSelector } from '../ui/PaymentMethodsSelector';
import { RichTextEditor } from '../common/RichTextEditor';
import { SearchableSelect } from '../ui/SearchableSelect';
import { IRBID_REGIONS_CATEGORIZED } from '../../lib/categories';
import DOMPurify from 'dompurify';

interface AddMedicalFacilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFacilityAdded?: (facilityId: string) => void;
}

const POPULAR_INSURANCES = [
  'تأمين نقابة المهندسين الأردنيين',
  'تأمين نقابة المحامين',
  'تأمين نقابة المعلمين',
  'تأمين جامعة اليرموك',
  'تأمين جامعة العلوم والتكنولوجيا',
  'شركة الشرق العربي للتأمين (gig)',
  'شركة ميدنت الأردن (MedNet)',
  'شركة نات هيلث (NatHealth)',
  'شركة النسر العربي للتأمين',
  'شركة ميد غلف (MedGulf)',
  'البنك العربي / الأولى للتأمين',
  'شركة التأمين الإسلامية'
];

const getSpecialtyIconComponent = (spec: any) => {
  if (spec.icon) return spec.icon;
  if (spec.iconName === 'Tooth' || spec.id === 'dentistry') return ToothIcon;
  const Icon = (LucideIcons as any)[spec.iconName];
  return Icon || Stethoscope;
};

export function AddMedicalFacilityModal({ isOpen, onClose, onFacilityAdded }: AddMedicalFacilityModalProps) {
  const { currentUser } = useAuth();
  const { medicalCategories } = useSystemSettings();

  const categoriesToUse = medicalCategories && medicalCategories.length > 0 
    ? medicalCategories 
    : MEDICAL_SPECIALTIES;

  // Stepper State: 1 to 5
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Facility Basic Info & Specialty (Step 1)
  const [mainSpecialty, setMainSpecialty] = useState('internal');
  const [subSpecialty, setSubSpecialty] = useState('');
  const [selectedSubspecialties, setSelectedSubspecialties] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('شارع الجامعة');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [googlePlaceUrl, setGooglePlaceUrl] = useState('');
  const [description, setDescription] = useState('');

  // Staff & Specialization Details (Step 2)
  const [doctorName, setDoctorName] = useState('');
  const [doctorAvatarUrl, setDoctorAvatarUrl] = useState('');
  const [professionalTitle, setProfessionalTitle] = useState('طبيب اختصاصي / استشاري');
  const [degrees, setDegrees] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [experienceYears, setExperienceYears] = useState('10');

  // Medical Staff Tab Customization (Step 2)
  const [additionalStaff, setAdditionalStaff] = useState<MedicalDoctor[]>([]);
  const [staffMemberName, setStaffMemberName] = useState('');
  const [staffMemberTitle, setStaffMemberTitle] = useState('');

  // Insurances & Services (Step 3)
  const [selectedInsurances, setSelectedInsurances] = useState<string[]>([]);
  const [customInsuranceInput, setCustomInsuranceInput] = useState('');
  const [proceduresList, setProceduresList] = useState<Array<{ name: string; price?: string; category?: string }>>([]);
  const [newProcedureInput, setNewProcedureInput] = useState('');
  const [newProcedurePrice, setNewProcedurePrice] = useState('');
  const [consultationFee, setConsultationFee] = useState('15 - 25 د.أ');
  const [appointmentType, setAppointmentType] = useState<'phone_first' | 'walk_in' | 'both'>('phone_first');

  // Package Selection (Step 4)
  const [selectedPackagePlan, setSelectedPackagePlan] = useState<'basic' | 'golden'>('golden');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');

  // Amenities & Working Hours (Step 5)
  const [hasWheelchairAccess, setHasWheelchairAccess] = useState(true);
  const [hasElevator, setHasElevator] = useState(true);
  const [hasValetOrParking, setHasValetOrParking] = useState(true);
  const [hasFemaleStaff, setHasFemaleStaff] = useState(true);
  const [hasElectronicPayment, setHasElectronicPayment] = useState(true);
  const [hasEmergency24h, setHasEmergency24h] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['كاش', 'فيزا', 'كليك']);

  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    days: 'السبت - الخميس',
    openTime: '09:00',
    closeTime: '20:00',
    isOpen24Hours: false
  });

  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    facebook: '',
    instagram: '',
    website: '',
    whatsapp: ''
  });

  const [ownerContact, setOwnerContact] = useState('');
  const [contactError, setContactError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const activeSpecialtyObj = categoriesToUse.find(s => s.id === mainSpecialty) || categoriesToUse[0];
  const facilityType = activeSpecialtyObj?.facilityType || 'clinic';
  const isDoctor = facilityType === 'clinic';
  const isPharmacy = facilityType === 'pharmacy' || mainSpecialty === 'pharmacies';
  const isLab = facilityType === 'lab' || mainSpecialty === 'laboratories';
  const isHospital = facilityType === 'hospital' || mainSpecialty === 'hospitals';
  const isRehab = facilityType === 'physio' || mainSpecialty === 'rehab';
  const isEmergencyEligible = isEmergencyFacility({ mainSpecialty, category: mainSpecialty, facilityType });

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setErrorMessage('');
      setContactError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeSpecialtyObj) {
      const subs = activeSpecialtyObj.subspecialties || (activeSpecialtyObj as any).subcategories || [];
      const defaultSub = subs[0] || '';
      setSubSpecialty(defaultSub);
      setSelectedSubspecialties(defaultSub ? [defaultSub] : []);
    }
  }, [mainSpecialty]);

  if (!isOpen) return null;

  const handleAddStaffMember = () => {
    if (!staffMemberName.trim()) return;
    setAdditionalStaff(prev => [
      ...prev,
      {
        name: sanitizeInput(staffMemberName),
        title: sanitizeInput(staffMemberTitle || 'أخصائي معتمد'),
        degrees: ['بورد اختصاص معتمد'],
        experienceYears: 5
      }
    ]);
    setStaffMemberName('');
    setStaffMemberTitle('');
  };

  const handleRemoveStaffMember = (index: number) => {
    setAdditionalStaff(prev => prev.filter((_, i) => i !== index));
  };

  const toggleInsurance = (insName: string) => {
    setSelectedInsurances(prev =>
      prev.includes(insName) ? prev.filter(i => i !== insName) : [...prev, insName]
    );
  };

  const addCustomInsurance = () => {
    if (!customInsuranceInput.trim()) return;
    const trimmed = customInsuranceInput.trim();
    if (!selectedInsurances.includes(trimmed)) {
      setSelectedInsurances(prev => [...prev, trimmed]);
    }
    setCustomInsuranceInput('');
  };

  const handleToggleSuggestedProcedure = (procName: string) => {
    if (proceduresList.some(p => p.name === procName)) {
      setProceduresList(prev => prev.filter(p => p.name !== procName));
    } else {
      setProceduresList(prev => [...prev, { name: procName, price: '' }]);
    }
  };

  const addCustomProcedure = () => {
    if (!newProcedureInput.trim()) return;
    setProceduresList(prev => [
      ...prev,
      {
        name: sanitizeInput(newProcedureInput.trim()),
        price: newProcedurePrice.trim() ? sanitizeInput(newProcedurePrice.trim()) : undefined
      }
    ]);
    setNewProcedureInput('');
    setNewProcedurePrice('');
  };

  const removeProcedure = (index: number) => {
    setProceduresList(prev => prev.filter((_, i) => i !== index));
  };

  const toggleSubspecialty = (subName: string) => {
    if (isHospital) {
      setSelectedSubspecialties([subName]);
      setSubSpecialty(subName);
      return;
    }
    setSelectedSubspecialties(prev => {
      if (prev.includes(subName)) {
        const filtered = prev.filter(s => s !== subName);
        return filtered.length > 0 ? filtered : [subName];
      } else {
        return [...prev, subName];
      }
    });
    setSubSpecialty(subName);
  };

  const handleNext = () => {
    setErrorMessage('');
    if (currentStep === 1) {
      if (!name.trim()) {
        setErrorMessage('يرجى إدخال اسم المنشأة الطبية أو العيادة.');
        return;
      }
      if (!phone.trim()) {
        setErrorMessage('يرجى إدخال رقم الهاتف للتواصل.');
        return;
      }
      if (!address.trim()) {
        setErrorMessage('يرجى إدخال العنوان بالتفصيل.');
        return;
      }
    }

    if (currentStep === 2) {
      if (isDoctor && !doctorName.trim()) {
        setErrorMessage('يرجى إدخال اسم الطبيب المسؤول.');
        return;
      }
    }

    setCurrentStep((prev) => (Math.min(prev + 1, 5) as any));
  };

  const handlePrev = () => {
    setErrorMessage('');
    setCurrentStep((prev) => (Math.max(prev - 1, 1) as any));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setContactError('');

    if (currentStep < 5) {
      handleNext();
      return;
    }

    if (!agreedToTerms) {
      setErrorMessage('يرجى الموافقة على صحة وتعهد البيانات الطبية والتراخيص للمتابعة.');
      return;
    }

    let parsedOwnerEmail = '';
    let parsedOwnerPhone = '';
    const contactVal = ownerContact.trim();

    if (contactVal) {
      if (contactVal.includes('@')) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(contactVal)) {
          setContactError('يرجى إدخال بريد إلكتروني صحيح أو رقم هاتف أردني صالح.');
          return;
        }
        parsedOwnerEmail = contactVal.toLowerCase();
      } else {
        const phoneCheck = validateJordanianPhone(contactVal);
        if (!phoneCheck.isValid) {
          setContactError(phoneCheck.message || 'يرجى إدخال رقم هاتف أردني صحيح (مثال: 0791234567).');
          return;
        }
        parsedOwnerPhone = contactVal.trim();
      }
    }

    setIsSubmitting(true);

    try {
      const chosenSubCategory = selectedSubspecialties.length > 0 
        ? selectedSubspecialties.join('، ')
        : (subSpecialty.trim() || activeSpecialtyObj?.name || 'طب عام');

      const parsedDegrees = degrees
        ? degrees.split(/[,،]/).map(d => sanitizeInput(d.trim())).filter(Boolean)
        : ['البورد الأردني'];

      const formattedProcedures: MedicalProcedure[] = proceduresList.map((proc, index) => ({
        id: `proc_${Date.now()}_${index}`,
        name: proc.name,
        price: proc.price ? String(proc.price) : undefined,
        category: proc.category || 'خدمات وإجراءات طبية',
        isPopular: index < 3
      }));

      const mainSpecialtyTitle = activeSpecialtyObj?.name || 'طب عام';
      const rawDescription = description.trim();
      const finalDescription = rawDescription
        ? (/<\/?[a-z][\s\S]*>/i.test(rawDescription) ? DOMPurify.sanitize(rawDescription) : rawDescription)
        : `منشأة ${name} الطبي - قسم ${mainSpecialtyTitle} (${chosenSubCategory}) في ${district} إربد. نقدّم أفضل خدمات الرعاية الطبية بأعلى المعايير.`;

      const medicalProfileData: MedicalFacilityInfo = {
        aboutFacility: finalDescription,
        insurances: selectedInsurances.map(ins => ({
          name: ins,
          type: ins.includes('نقابة') ? 'نقابة' : 'شركة تأمين',
          isDirectBilling: true,
          coverageDetails: 'تغطية معتمدة ومباشرة'
        })),
        acceptsInsuranceDirectBilling: selectedInsurances.length > 0,
        insuranceNotes: selectedInsurances.length > 0
          ? `نقبل بطاقات التأمينات والنقابات المعتمدة (${selectedInsurances.slice(0, 4).join('، ')}${selectedInsurances.length > 4 ? ' وغيرها' : ''}).`
          : 'الدفع نقدي أو عبر البطاقات الإلكترونية المعتمدة.',
        doctorProfile: {
          name: sanitizeInput(doctorName || name),
          title: sanitizeInput(professionalTitle),
          degrees: parsedDegrees,
          licenseNumber: sanitizeInput(licenseNumber || 'مرخص أصولاً لدى وزارة الصحة'),
          experienceYears: Number(experienceYears) || 10,
          bio: sanitizeInput(doctorName ? `طبيب اختصاصي في ${mainSpecialtyTitle} (${chosenSubCategory}) في محافظة إربد.` : ''),
          avatarUrl: doctorAvatarUrl.trim() || undefined
        },
        showMedicalStaff: true,
        doctorsList: [
          {
            name: sanitizeInput(doctorName || name),
            title: sanitizeInput(professionalTitle),
            degrees: parsedDegrees,
            licenseNumber: sanitizeInput(licenseNumber || 'مرخص أصولاً لدى وزارة الصحة'),
            experienceYears: Number(experienceYears) || 10,
            bio: sanitizeInput(doctorName ? `طبيب اختصاصي في ${mainSpecialtyTitle} (${chosenSubCategory}) في محافظة إربد.` : ''),
            subspecialty: sanitizeInput(chosenSubCategory),
            avatarUrl: doctorAvatarUrl.trim() || undefined
          },
          ...additionalStaff.map(st => ({
            name: sanitizeInput(st.name),
            title: sanitizeInput(st.title || 'أخصائي معتمد'),
            degrees: Array.isArray(st.degrees) ? st.degrees.map(d => sanitizeInput(d)) : [sanitizeInput(String(st.degrees || ''))],
            experienceYears: Number(st.experienceYears) || 5
          }))
        ],
        procedures: formattedProcedures,
        equipments: [],
        showEquipments: false,
        showAmenities: true,
        has24Emergency: isEmergencyEligible ? hasEmergency24h : false,
        emergencyPhone: (isEmergencyEligible && emergencyPhone) ? sanitizeInput(emergencyPhone) : '',
        hasWheelchairAccess: hasWheelchairAccess,
        hasElevator: hasElevator,
        hasParking: hasValetOrParking,
        hasFemaleStaff: hasFemaleStaff,
        hasKidsArea: false,
        hasElectronicPayment: hasElectronicPayment,
        paymentMethods: paymentMethods,
        consultationFee: consultationFee,
        bookingNotice: isPharmacy
          ? 'تتوفر الأدوية والمستلزمات الصيدلانية مباشرة بالزيارة الفورية.'
          : (appointmentType === 'walk_in'
              ? 'استقبال المراجعين بأسبقية الحضور والدور المباشر خلال ساعات الدوام.'
              : appointmentType === 'both'
              ? 'متاح بحجز مسبق أو الدخول المباشر حسب أسبقية الحضور.'
              : 'يتم تأكيد الموعد فورياً عبر الهاتف أو الواتساب.')
      };

      let category = 'عيادات ومراكز طبية';
      if (facilityType === 'pharmacy' || mainSpecialty === 'pharmacies') category = 'صيدليات ورعاية صحية';
      else if (facilityType === 'lab' || mainSpecialty === 'laboratories') category = 'مختبرات وتحاليل طبية';
      else if (facilityType === 'hospital' || mainSpecialty === 'hospitals') category = 'مستشفيات ومراكز شاملة';
      else if (facilityType === 'physio' || mainSpecialty === 'rehab') category = 'علاج طبيعي وتأهيل';

      const finalSocialLinks: SocialLinks = {
        ...socialLinks,
        whatsapp: whatsapp ? sanitizeInput(whatsapp) : socialLinks.whatsapp
      };

      const generatedMenuItems: MenuItem[] = formattedProcedures.map((proc, index) => ({
        id: `menu_${Date.now()}_${index}`,
        name: proc.name,
        description: proc.description || '',
        price: proc.price ? String(proc.price) : (consultationFee || '15'),
        category: proc.category || 'خدمات طبية',
        isPopular: proc.isPopular
      }));

      const now = Date.now();
      const actualBillingPeriod = selectedPackagePlan === 'basic' ? 'lifetime' : billingPeriod;
      const gift = applyNewBusinessWelcomeGift(selectedPackagePlan, actualBillingPeriod, now);

      const finalPayload: Omit<Business, 'id'> = {
        name: sanitizeInput(name),
        category: category,
        subCategory: chosenSubCategory,
        description: finalDescription,
        address: sanitizeInput(address),
        district: district,
        phone: sanitizeInput(phone),
        imageUrl: imageUrl || '',
        image: imageUrl || '',
        gallery: imageUrl ? [imageUrl] : [],
        googlePlaceUrl: googlePlaceUrl ? sanitizeInput(googlePlaceUrl) : '',
        workingHours: workingHours,
        socialLinks: finalSocialLinks,
        paymentMethods: paymentMethods,
        menuItems: generatedMenuItems,
        medicalProfile: medicalProfileData,
        isVerified: gift.isVerified,
        isFeatured: gift.isFeatured,
        featuredStartDate: gift.featuredStartDate || null,
        featuredExpiryDate: gift.featuredExpiryDate || null,
        packagePlan: gift.packagePlan,
        selectedPackagePlan: selectedPackagePlan,
        isVip: gift.isVip,
        isVipTrial: gift.isVipTrial,
        vipSubscriptionStartsAt: gift.vipSubscriptionStartsAt,
        vipSubscriptionExpiresAt: gift.vipSubscriptionExpiresAt,
        billingPeriod: actualBillingPeriod,
        rating: 5.0,
        reviewCount: 0,
        views: 1,
        createdAt: now,
        userId: '',
        ownerEmail: parsedOwnerEmail || '',
        ownerPhone: parsedOwnerPhone || undefined,
        ownerContact: contactVal || undefined,
        ownerName: doctorName ? sanitizeInput(doctorName) : sanitizeInput(name)
      };

      const statusValue = 'approved';

      const pendingRequestData = {
        ...finalPayload,
        requestType: 'medical_facility_registration',
        status: statusValue,
        submittedAt: Date.now(),
        userEmail: parsedOwnerEmail || currentUser?.email || '',
        userId: currentUser?.uid || ''
      };

      const sanitizedRequestPayload = await compressAndSanitizeFirestorePayload(pendingRequestData, false);
      let requestRef: any = null;
      try {
        if (db) {
          requestRef = await addDoc(collection(db, 'businessRequests'), sanitizedRequestPayload);
        }
      } catch (reqErr) {
        console.warn("businessRequests record warning:", reqErr);
      }

      let newDocId = requestRef?.id || '';
      try {
        if (db) {
          const sanitizedBizPayload = await compressAndSanitizeFirestorePayload({
            ...finalPayload,
            status: statusValue,
            requestId: requestRef?.id || ''
          }, false);
          const docRef = await addDoc(collection(db, 'businesses'), sanitizedBizPayload);
          newDocId = docRef.id;
        }
      } catch (bizErr) {
        console.warn("Direct business record warning:", bizErr);
        if (requestRef?.id) {
          newDocId = requestRef.id;
        } else {
          throw bizErr;
        }
      }

      invalidateCache();

      if (onFacilityAdded) {
        onFacilityAdded(newDocId);
      }
      onClose();
    } catch (err: any) {
      console.error('Error adding medical facility:', err);
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ المنشأة الطبية. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[100000] overflow-hidden bg-stone-950/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6"
      dir="rtl"
    >
      <div 
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 w-full max-w-4xl overflow-hidden my-0 sm:my-auto animate-in fade-in zoom-in-95 flex flex-col max-h-[90dvh] sm:max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />
        
        {/* Header */}
        <div className="bg-white p-4 sm:px-6 pb-3 flex items-center justify-between border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1a4d2e]/10 text-[#1a4d2e] flex items-center justify-center shrink-0 font-bold">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-stone-900">إضافة منشأة أو عيادة طبية</h2>
              <p className="text-xs text-stone-500">تسجيل وتوثيق منشأة في دليل الرعاية الصحية</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Stepper Tabs */}
        <div className="grid grid-cols-5 gap-1 bg-stone-50 p-2 border-b border-stone-100 text-center shrink-0">
          {[
            { num: 1, label: 'البيانات' },
            { num: 2, label: 'الكادر' },
            { num: 3, label: 'التأمين' },
            { num: 4, label: 'الباقة' },
            { num: 5, label: 'التأكيد' }
          ].map((s) => (
            <div
              key={s.num}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                currentStep === s.num
                  ? 'bg-[#1a4d2e] text-white shadow-xs'
                  : currentStep > s.num
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'text-stone-400'
              }`}
            >
              <span>{s.num}. {s.label}</span>
            </div>
          ))}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1 */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">التخصص الطبي الرئيسي <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {categoriesToUse.map((spec) => {
                    const Icon = getSpecialtyIconComponent(spec);
                    const isSelected = mainSpecialty === spec.id;
                    return (
                      <button
                        key={spec.id}
                        type="button"
                        onClick={() => setMainSpecialty(spec.id)}
                        className={`p-2 rounded-xl border text-right flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[#1a4d2e] bg-emerald-50/50 text-[#1a4d2e] font-bold shadow-xs'
                            : 'border-stone-200 hover:border-stone-300 text-stone-700 bg-white'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
                          isSelected ? 'bg-[#1a4d2e] text-white' : 'bg-stone-100 text-stone-600'
                        }`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-xs font-bold truncate block">{spec.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subspecialties */}
              {activeSpecialtyObj?.subspecialties && activeSpecialtyObj.subspecialties.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-stone-100">
                  <label className="block text-xs font-bold text-stone-700">التخصص الفرعي الدقيق</label>
                  <div className="flex flex-wrap gap-1">
                    {activeSpecialtyObj.subspecialties.map((sub) => {
                      const isSelected = selectedSubspecialties.includes(sub);
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => toggleSubspecialty(sub)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-[#1a4d2e] text-white border-[#1a4d2e]'
                              : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {isSelected && <Check className="inline h-3 w-3 ml-0.5" />}
                          <span>{sub}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-100">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">اسم المنشأة أو العيادة <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: عيادة الدكتور أحمد"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:bg-white text-stone-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">المنطقة أو الحي <span className="text-red-500">*</span></label>
                  <SearchableSelect
                    options={IRBID_REGIONS_CATEGORIZED.flatMap(g => g.areas)}
                    value={district}
                    onChange={(val) => setDistrict(val)}
                    className="bg-stone-50 border-stone-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">رقم الهاتف <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XXXXXXXX"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-right text-stone-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">رقم الواتساب للمواعيد</label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="07XXXXXXXX"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-right text-stone-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">العنوان بالتفصيل <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="مثال: شارع وصفي التل، مجمع الطبي، الطابق الثاني"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-800"
                />
              </div>

              <div>
                <ImageUploader
                  label="صورة أو شعار المنشأة الطبية"
                  folder="medical"
                  value={imageUrl}
                  onChange={setImageUrl}
                  aspectRatio="cover"
                  placeholder="اختر ملف صورة المنشأة من جهازك"
                />
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">اسم الطبيب أو المشرف المسؤول {isDoctor && <span className="text-red-500">*</span>}</label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="الاسم الثلاثي"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">المسمى المهني والتخصص</label>
                  <input
                    type="text"
                    value={professionalTitle}
                    onChange={(e) => setProfessionalTitle(e.target.value)}
                    placeholder="مثال: استشاري جراحة العظام"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">سنوات الخبرة</label>
                  <input
                    type="number"
                    min="1"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">رقم الترخيص الرسمي</label>
                  <input
                    type="text"
                    value={licenseNumber}
                    onChange={(e) => setLicenseNumber(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">المؤهلات والشهادات</label>
                  <input
                    type="text"
                    value={degrees}
                    onChange={(e) => setDegrees(e.target.value)}
                    placeholder="مثال: البورد الأردني"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-800"
                  />
                </div>
              </div>

              <div>
                <ImageUploader
                  label="الصورة الشخصية للطبيب (اختياري)"
                  folder="medical"
                  value={doctorAvatarUrl}
                  onChange={setDoctorAvatarUrl}
                  aspectRatio="square"
                  placeholder="اختر ملف الصورة الشخصية"
                />
              </div>

              {/* Add Extra Staff */}
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2.5">
                <span className="block text-xs font-bold text-stone-800">إضافة أطباء إضافيين في الفريق (اختياري)</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="اسم الطبيب"
                    className="px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs"
                    value={staffMemberName}
                    onChange={(e) => setStaffMemberName(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="المسمى المهني"
                    className="px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs"
                    value={staffMemberTitle}
                    onChange={(e) => setStaffMemberTitle(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleAddStaffMember}
                    className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    إضافة
                  </button>
                </div>

                {additionalStaff.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {additionalStaff.map((st, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-white border border-stone-200 rounded-md text-xs">
                        <span className="font-bold text-stone-800">{st.name}</span>
                        <button type="button" onClick={() => handleRemoveStaffMember(idx)} className="text-red-500">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">التأمينات والنقابات المعتمدة</label>
                <div className="flex flex-wrap gap-1">
                  {POPULAR_INSURANCES.map((ins) => {
                    const isSelected = selectedInsurances.includes(ins);
                    return (
                      <button
                        key={ins}
                        type="button"
                        onClick={() => toggleInsurance(ins)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                          isSelected
                            ? 'bg-[#1a4d2e] text-white border-[#1a4d2e]'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {isSelected && <Check className="inline h-3 w-3 ml-0.5" />}
                        <span>{ins}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Procedures */}
              <div className="pt-2 border-t border-stone-100 space-y-2">
                <label className="block text-xs font-bold text-stone-700">الخدمات والإجراءات الطبية</label>
                {activeSpecialtyObj?.defaultProcedures && (
                  <div className="flex flex-wrap gap-1">
                    {activeSpecialtyObj.defaultProcedures.map((proc) => {
                      const isSelected = proceduresList.some(p => p.name === proc);
                      return (
                        <button
                          key={proc}
                          type="button"
                          onClick={() => handleToggleSuggestedProcedure(proc)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-[#1a4d2e] text-white border-[#1a4d2e]'
                              : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          {isSelected && <Check className="inline h-3 w-3 ml-0.5" />}
                          <span>{proc}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="إضافة فحص أو خدمة"
                    className="flex-1 px-3 py-1.5 border border-stone-200 rounded-lg text-xs"
                    value={newProcedureInput}
                    onChange={(e) => setNewProcedureInput(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={addCustomProcedure}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold"
                  >
                    إضافة
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-100">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">رسوم الكشفية / الاستشارة</label>
                  <input
                    type="text"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">طريقة استقبال المراجعين</label>
                  <select
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-800"
                    value={appointmentType}
                    onChange={(e: any) => setAppointmentType(e.target.value)}
                  >
                    <option value="phone_first">حجز مسبق عبر الهاتف أو الواتساب</option>
                    <option value="walk_in">دخول فوري مباشر بأسبقية الحضور</option>
                    <option value="both">متاح بالحجز والدخول المباشر</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  onClick={() => setSelectedPackagePlan('basic')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedPackagePlan === 'basic' ? 'border-[#1a4d2e] bg-emerald-50/40' : 'border-stone-200'
                  }`}
                >
                  <h4 className="font-bold text-sm text-stone-900">الباقة الأساسية</h4>
                  <p className="text-xs text-stone-500 mt-0.5">الظهور والوصول المباشر للمرضى</p>
                  <div className="mt-3 text-xs font-bold text-emerald-800">تفعيل دائم</div>
                </div>

                <div
                  onClick={() => setSelectedPackagePlan('golden')}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedPackagePlan === 'golden' ? 'border-[#ff9f1c] bg-amber-50/40' : 'border-stone-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-sm text-stone-900">الباقة الذهبية (VIP)</h4>
                    <span className="text-[10px] bg-[#ff9f1c] text-white px-2 py-0.5 rounded-full font-bold">الأكثر طلباً</span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">شارة توثيق زرقاء وأولوية صدارة البحث</p>
                  <div className="mt-3 text-xs font-bold text-amber-800">اشتراك متكامل</div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5 */}
          {currentStep === 5 && (
            <div className="space-y-4">
              {/* Owner link input */}
              <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200 space-y-1.5">
                <label className="block text-xs font-bold text-stone-800">بيانات ربط حساب المشرف (بريد أو هاتف)</label>
                <input
                  type="text"
                  placeholder="owner@example.com أو 079XXXXXXX"
                  className="w-full bg-white border border-amber-300 rounded-lg px-3 py-2 text-xs sm:text-sm"
                  value={ownerContact}
                  onChange={(e) => setOwnerContact(e.target.value)}
                />
                {contactError && <p className="text-xs text-red-600 font-bold">{contactError}</p>}
              </div>

              {/* Working Hours Editor */}
              <WorkingHoursEditor
                workingHours={workingHours}
                onChange={setWorkingHours}
                showVacationToggle={false}
              />

              <PaymentMethodsSelector
                value={paymentMethods}
                onChange={setPaymentMethods}
                className="bg-stone-50 p-3 rounded-xl border border-stone-200"
              />
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-3.5 sm:px-6 bg-stone-50 border-t border-stone-200 shrink-0 flex items-center justify-between gap-2.5">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="px-4 py-2 rounded-xl border border-stone-200 font-bold text-xs text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>السابق</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-200 font-bold text-xs text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            {currentStep < 5 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-5 py-2 rounded-xl bg-[#1a4d2e] hover:bg-[#133b22] text-white font-bold text-xs transition-all shadow-xs cursor-pointer flex items-center gap-1"
              >
                <span>التالي</span>
                <ArrowRight className="h-3.5 w-3.5 rotate-180" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="px-5 py-2 rounded-xl bg-[#1a4d2e] hover:bg-[#133b22] text-white font-bold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ ونشر المنشأة'}</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
export default AddMedicalFacilityModal;
