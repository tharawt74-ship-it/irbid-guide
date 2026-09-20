import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as LucideIcons from 'lucide-react';
import { 
  X, Stethoscope, Building2, Pill, Microscope, Activity, 
  MapPin, Phone, ShieldCheck, Check, Plus, Trash2, 
  Clock, Sparkles, ArrowRight, ArrowLeft,
  Calendar, CheckCircle2, Copy, ExternalLink, AlertCircle,
  Accessibility, Car, Baby, Users, Crown,
  User, Eye, EyeOff, CreditCard, Gift
} from 'lucide-react';
import { applyNewBusinessWelcomeGift } from '../../lib/vipHelper';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useSystemSettings } from '../../contexts/SystemSettingsContext';
import { ALL_IRBID_DISTRICTS } from '../../lib/categories';
import { 
  MEDICAL_SPECIALTIES, 
  FACILITY_TYPES, 
  MedicalSpecialty,
  ToothIcon 
} from '../../lib/medicalCategories';
import { 
  MedicalFacilityInfo, 
  MedicalProcedure, 
  MedicalEquipment,
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
import { RichTextEditor } from '../common/RichTextEditor';
import DOMPurify from 'dompurify';
import { Link } from 'react-router';

interface AddMedicalFacilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFacilityAdded?: (facilityId: string) => void;
}

const POPULAR_INSURANCES = [
  'تأمين نقابة المهندسين الأردنيين',
  'تأمين نقابة المحامين النظاميين',
  'تأمين نقابة المعلمين',
  'تأمين جامعة اليرموك',
  'تأمين جامعة العلوم والتكنولوجيا',
  'شركة الشرق العربي للتأمين (gig)',
  'شركة ميدنت الأردن (MedNet)',
  'شركة نات هيلث (NatHealth)',
  'شركة النسر العربي للتأمين',
  'شركة ميد غلف (MedGulf)',
  'البنك العربي / الأولى للتأمين',
  'شركة التأمين الإسلامية',
  'تأمين شركة الكهرباء والاتصالات'
];

const SPECIALTY_EQUIPMENT_SUGGESTIONS: Record<string, MedicalEquipment[]> = {
  internal: [
    { name: 'جهاز سونار وتصوير تلفزيوني متطور (Ultrasound)', brandOrOrigin: 'ياباني حديث', description: 'فحص البطن والأحشاء والغدد بدقة عالية' },
    { name: 'جهاز تخطيط قلب متقدم (12-Lead ECG)', brandOrOrigin: 'ألماني معتمد', description: 'تشخيص دقيق لنبضات ونشاط عضلة القلب' },
    { name: 'وحدة قياس ومراقبة العلامات الحيوية والضغط', brandOrOrigin: 'ديجيتال حديث', description: 'قياس الأكسجين وضغط الدم التلقائي' }
  ],
  dental: [
    { name: 'وحدة كرسي أسنان ألماني متطور', brandOrOrigin: 'Sirona ألماني', description: 'أقصى درجات الراحة والتعقيم المتكامل' },
    { name: 'جهاز أشعة بانوراما وسينسور رقمي 3D', brandOrOrigin: 'ديجيتال HD', description: 'تصوير فوري دقيق للفكين وجذور الأسنان' },
    { name: 'جهاز تبييض الأسنان بالليزر والضوء البارد', brandOrOrigin: 'Beyond أمريكي', description: 'تبييض فوري وآمن للمينا' }
  ],
  derma: [
    { name: 'جهاز ليزر كانديلا جنتل ليز برو', brandOrOrigin: 'Candela أمريكي', description: 'إزالة الشعر بأحدث تبريد ديناميكي' },
    { name: 'جهاز هيدرافيشيل لتنظيف ونضارة البشرة', brandOrOrigin: 'Hydrafacial أصلي', description: 'تنظيف عميق وتقشير وتغذية بالسوائل' },
    { name: 'جهاز ليزر فراكشنال CO2 للندبات', brandOrOrigin: 'طبي معتمد', description: 'تجديد خلايا البشرة وعلاج آثار الحبوب' }
  ],
  eyes: [
    { name: 'مصباح شقي عالي الدقة (Slit Lamp)', brandOrOrigin: 'Topcon ياباني', description: 'فحص دقيق للقرنية والعدسة وقاع العين' },
    { name: 'جهاز قياس ضغط العين بالهواء بدون لمس', brandOrOrigin: 'Nidek ياباني', description: 'فحص مريح وسريع لضغط العين' },
    { name: 'جهاز فحص الانكسار البصري التلقائي', brandOrOrigin: 'Auto-Refractor', description: 'تحديد دقيق لدرجات النظر واللابؤرية' }
  ],
  pediatrics: [
    { name: 'مقياس نمو ووزن ديجيتال دقيق للأطفال', brandOrOrigin: 'معتمد للأطفال', description: 'متابعة دقيقة للوزن ومؤشرات النمو' },
    { name: 'جهاز تبخير واستنشاق تنفسي سريع (Nebulizer)', brandOrOrigin: 'طبي للأطفال', description: 'علاج حالات الربو وضيق التنفس لدى الصغار' },
    { name: 'جهاز فحص أذن وحنجرة مضيء مخصص للأطفال', brandOrOrigin: 'لطيف وآمن', description: 'فحص مريح وبدون إزعاج للطفل' }
  ],
  obgyn: [
    { name: 'جهاز سونار وتصوير رباعي الأبعاد 4D/HD Live', brandOrOrigin: 'GE Voluson', description: 'رؤية ملونة وواضحة للجنين وتفاصيله' },
    { name: 'جهاز تخطيط نبض الجنين والتقلصات (CTG)', brandOrOrigin: 'طبي متطور', description: 'مراقبة سلامة الجنين وصحة الأم' }
  ],
  ortho: [
    { name: 'جهاز حقن البلازما الغنية بالصفائح PRP المعتمد', brandOrOrigin: 'طرد مركزي معقم', description: 'علاج خشونة والتهابات المفاصل والأوتار' },
    { name: 'جهاز علاج بالأمواج الصدمية Shockwave', brandOrOrigin: 'ألماني', description: 'تفتيت التكلسات وعلاج مسمار العظم' }
  ],
  physio: [
    { name: 'أجهزة علاج بالليزر البارد والموجات فوق الصوتية', brandOrOrigin: 'BTL أوروبي', description: 'تسكين الآلام وتسريع التئام الأنسجة' },
    { name: 'أجهزة تنبيه وتحفيز عضلي كهربائي TENS/EMS', brandOrOrigin: 'رقمي حديث', description: 'تقوية العضلات وتخفيف التقلصات العضلية' },
    { name: 'أجهزة سحب فقرات وتأهيل العمود الفقري', brandOrOrigin: 'ديجيتال آمن', description: 'تخفيف الضغط على الأعصاب والانزلاق الغضروفي' }
  ],
  laboratories: [
    { name: 'جهاز تحاليل الدم الشاملة CBC Sysmex', brandOrOrigin: 'Sysmex ياباني', description: 'نتائج دقيقة وسريعة لخلايا وصفائح الدم' },
    { name: 'جهاز كيمياء وهرمونات Roche Cobas', brandOrOrigin: 'Roche سويسري', description: 'فحوصات الغدد والهرمونات والإنزيمات' },
    { name: 'وحدة بيولوجيا جزيئية وفحوصات PCR', brandOrOrigin: 'معتمد دولياً', description: 'تشخيص جيني وفيروسي دقيق' }
  ],
  pharmacies: [
    { name: 'ثلاجة دوائية إلكترونية لمراقبة درجات الحرارة', brandOrOrigin: 'حفظ آمن ومستمر', description: 'لحفظ الأنسولين والمطاعيم بدقة فائقة' },
    { name: 'محطة قياس الضغط والسكري وفحص مؤشر كتلة الجسم', brandOrOrigin: 'ديجيتال فوري', description: 'فحص دوري واستشارات صحية سريعة' }
  ]
};

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
  const [professionalTitle, setProfessionalTitle] = useState('طبيب اختصاصي / استشاري');
  const [degrees, setDegrees] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [experienceYears, setExperienceYears] = useState('10');
  const [gender, setGender] = useState<'male' | 'female' | 'team'>('male');

  // Medical Staff Tab Customization (Step 2)
  const [showMedicalStaff, setShowMedicalStaff] = useState(true);
  const [additionalStaff, setAdditionalStaff] = useState<MedicalDoctor[]>([]);
  const [staffMemberName, setStaffMemberName] = useState('');
  const [staffMemberTitle, setStaffMemberTitle] = useState('');
  const [staffMemberDegrees, setStaffMemberDegrees] = useState('');
  const [staffMemberSubspecialty, setStaffMemberSubspecialty] = useState('');
  const [staffMemberExp, setStaffMemberExp] = useState('5');

  // Insurances & Services (Step 3)
  const [selectedInsurances, setSelectedInsurances] = useState<string[]>([]);
  const [customInsuranceInput, setCustomInsuranceInput] = useState('');
  const [proceduresList, setProceduresList] = useState<Array<{ name: string; price?: string; category?: string }>>([]);
  const [newProcedureInput, setNewProcedureInput] = useState('');
  const [newProcedurePrice, setNewProcedurePrice] = useState('');
  const [consultationFee, setConsultationFee] = useState('15 د.أ');
  const [appointmentType, setAppointmentType] = useState<'phone_first' | 'walk_in' | 'both'>('phone_first');

  // Package Selection (Step 4)
  const [selectedPackagePlan, setSelectedPackagePlan] = useState<'basic' | 'golden'>('golden');
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');

  // Amenities & Tech & Timings & Golden Box (Step 5)
  const [showEquipments, setShowEquipments] = useState(true);
  const [equipmentsList, setEquipmentsList] = useState<MedicalEquipment[]>([]);
  const [newEquipmentName, setNewEquipmentName] = useState('');
  const [newEquipmentBrand, setNewEquipmentBrand] = useState('');
  const [newEquipmentDesc, setNewEquipmentDesc] = useState('');

  const [showAmenities, setShowAmenities] = useState(true);
  const [hasWheelchairAccess, setHasWheelchairAccess] = useState(true);
  const [hasElevator, setHasElevator] = useState(true);
  const [hasValetOrParking, setHasValetOrParking] = useState(true);
  const [hasFemaleStaff, setHasFemaleStaff] = useState(true);
  const [hasKidsArea, setHasKidsArea] = useState(false);
  const [hasElectronicPayment, setHasElectronicPayment] = useState(true);
  const [hasEmergency24h, setHasEmergency24h] = useState(false);

  // Working Hours (Step 5)
  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    days: 'السبت - الخميس',
    openTime: '09:00',
    closeTime: '20:00',
    isOpen24Hours: false
  });

  // Social Links (Step 5)
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    facebook: '',
    instagram: '',
    website: '',
    whatsapp: ''
  });

  // Golden Box: Direct Owner Linkage (Step 5)
  const [ownerContact, setOwnerContact] = useState('');
  const [contactError, setContactError] = useState('');

  // Agreement & Status
  const [agreedToTerms, setAgreedToTerms] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [createdFacilityId, setCreatedFacilityId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Determine current active category
  const activeSpecialtyObj = categoriesToUse.find(s => s.id === mainSpecialty) || categoriesToUse[0];
  const facilityType = activeSpecialtyObj?.facilityType || 'clinic';
  const isDoctor = facilityType === 'clinic';
  const isPharmacy = facilityType === 'pharmacy' || mainSpecialty === 'pharmacies';
  const isLab = facilityType === 'lab' || mainSpecialty === 'laboratories';
  const isHospital = facilityType === 'hospital' || mainSpecialty === 'hospitals';
  const isRehab = facilityType === 'physio' || mainSpecialty === 'rehab';
  const isEmergencyEligible = isEmergencyFacility({ mainSpecialty, category: mainSpecialty, facilityType });

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setErrorMessage('');
      setContactError('');
      setCreatedFacilityId(null);
      setCopiedLink(false);
    }
  }, [isOpen]);

  // Synchronize procedures suggestions & subspecialties when specialty changes
  useEffect(() => {
    if (activeSpecialtyObj) {
      const subs = activeSpecialtyObj.subspecialties || (activeSpecialtyObj as any).subcategories || [];
      const defaultSub = subs[0] || '';
      setSubSpecialty(defaultSub);
      setSelectedSubspecialties([defaultSub]);
    }
    if (activeSpecialtyObj?.defaultProcedures && proceduresList.length === 0) {
      setProceduresList(
        activeSpecialtyObj.defaultProcedures.slice(0, 5).map(p => ({
          name: p,
          price: ''
        }))
      );
    }
    if (SPECIALTY_EQUIPMENT_SUGGESTIONS[mainSpecialty] && equipmentsList.length === 0) {
      setEquipmentsList([...SPECIALTY_EQUIPMENT_SUGGESTIONS[mainSpecialty]]);
    }
  }, [mainSpecialty]);

  if (!isOpen) return null;

  // Handlers for Staff
  const handleAddStaffMember = () => {
    if (!staffMemberName.trim()) return;
    setAdditionalStaff(prev => [
      ...prev,
      {
        name: sanitizeInput(staffMemberName),
        title: sanitizeInput(staffMemberTitle || 'أخصائي معتمد'),
        degrees: staffMemberDegrees ? [sanitizeInput(staffMemberDegrees)] : [],
        experienceYears: Number(staffMemberExp) || 5,
        subspecialty: sanitizeInput(staffMemberSubspecialty)
      }
    ]);
    setStaffMemberName('');
    setStaffMemberTitle('');
    setStaffMemberDegrees('');
    setStaffMemberSubspecialty('');
    setStaffMemberExp('5');
  };

  const handleRemoveStaffMember = (index: number) => {
    setAdditionalStaff(prev => prev.filter((_, i) => i !== index));
  };

  // Handlers for Insurances
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

  // Handlers for Procedures
  const handleToggleSuggestedProcedure = (procName: string) => {
    if (proceduresList.some(p => p.name === procName)) {
      setProceduresList(prev => prev.filter(p => p.name !== procName));
    } else {
      setProceduresList(prev => [...prev, { name: procName, price: '' }]);
    }
  };

  const handleAddAllSuggestedProcedures = () => {
    if (!activeSpecialtyObj?.defaultProcedures) return;
    const unadded = activeSpecialtyObj.defaultProcedures
      .filter(p => !proceduresList.some(item => item.name === p))
      .map(p => ({ name: p, price: '' }));
    setProceduresList(prev => [...prev, ...unadded]);
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

  const handleUpdateProcedurePrice = (index: number, priceValue: string) => {
    setProceduresList(prev =>
      prev.map((item, i) => (i === index ? { ...item, price: priceValue } : item))
    );
  };

  const removeProcedure = (index: number) => {
    setProceduresList(prev => prev.filter((_, i) => i !== index));
  };

  // Handlers for Equipment
  const addPresetEquipment = (preset: MedicalEquipment) => {
    if (equipmentsList.some(e => e.name === preset.name)) return;
    setEquipmentsList(prev => [...prev, preset]);
  };

  const addCustomEquipment = () => {
    if (!newEquipmentName.trim()) return;
    setEquipmentsList(prev => [
      ...prev,
      {
        name: sanitizeInput(newEquipmentName.trim()),
        brandOrOrigin: newEquipmentBrand.trim() ? sanitizeInput(newEquipmentBrand.trim()) : undefined,
        description: newEquipmentDesc.trim() ? sanitizeInput(newEquipmentDesc.trim()) : undefined
      }
    ]);
    setNewEquipmentName('');
    setNewEquipmentBrand('');
    setNewEquipmentDesc('');
  };

  const removeEquipment = (index: number) => {
    setEquipmentsList(prev => prev.filter((_, i) => i !== index));
  };

  // Subspecialty toggle
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

  // Stepper Validations
  const handleNext = () => {
    setErrorMessage('');
    if (currentStep === 1) {
      if (!name.trim()) {
        setErrorMessage('يرجى كتابة اسم المنشأة الطبية أو اسم العيادة بدقة.');
        return;
      }
      if (!phone.trim()) {
        setErrorMessage('يرجى إدخال رقم الهاتف الرسمي للتواصل واستقبال المراجعين.');
        return;
      }
      if (!validateJordanianPhone(phone)) {
        setErrorMessage('يرجى إدخال رقم هاتف أردني صحيح (مثال: 0791234567 أو 027200000).');
        return;
      }
      if (whatsapp && !validateJordanianPhone(whatsapp)) {
        setErrorMessage('يرجى إدخال رقم واتساب أردني صحيح أو تركه فارغاً.');
        return;
      }
    }

    if (currentStep === 2) {
      if (!isPharmacy && !doctorName.trim()) {
        setErrorMessage('يرجى كتابة الاسم الكامل للطبيب أو المسؤول الطبي عن المنشأة.');
        return;
      }
    }

    setCurrentStep((prev) => (Math.min(prev + 1, 5) as any));
  };

  const handlePrev = () => {
    setErrorMessage('');
    setCurrentStep((prev) => (Math.max(prev - 1, 1) as any));
  };

  // Prevent form submission on hitting Enter inside text inputs
  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === 'Enter') {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT') {
        const inputType = (target as HTMLInputElement).type;
        if (inputType !== 'submit' && inputType !== 'button') {
          e.preventDefault();
        }
      }
    }
  };

  // Submit Handler
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
        const digits = contactVal.replace(/\D/g, '');
        if (digits.length < 9) {
          setContactError('يرجى إدخال رقم هاتف أردني صحيح (مثال: 0791234567).');
          return;
        }
        parsedOwnerPhone = digits;
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
          bio: sanitizeInput(doctorName ? `طبيب اختصاصي في ${mainSpecialtyTitle} (${chosenSubCategory}) في محافظة إربد.` : '')
        },
        showMedicalStaff: showMedicalStaff,
        doctorsList: [
          {
            name: sanitizeInput(doctorName || name),
            title: sanitizeInput(professionalTitle),
            degrees: parsedDegrees,
            licenseNumber: sanitizeInput(licenseNumber || 'مرخص أصولاً لدى وزارة الصحة'),
            experienceYears: Number(experienceYears) || 10,
            bio: sanitizeInput(doctorName ? `طبيب اختصاصي في ${mainSpecialtyTitle} (${chosenSubCategory}) في محافظة إربد.` : ''),
            subspecialty: sanitizeInput(chosenSubCategory)
          },
          ...additionalStaff.map(st => ({
            name: sanitizeInput(st.name),
            title: sanitizeInput(st.title || 'أخصائي معتمد'),
            degrees: Array.isArray(st.degrees) ? st.degrees.map(d => sanitizeInput(d)) : [sanitizeInput(String(st.degrees || ''))],
            licenseNumber: st.licenseNumber ? sanitizeInput(st.licenseNumber) : undefined,
            experienceYears: Number(st.experienceYears) || 5,
            bio: st.bio ? sanitizeInput(st.bio) : undefined,
            subspecialty: st.subspecialty ? sanitizeInput(st.subspecialty) : undefined
          }))
        ],
        procedures: formattedProcedures,
        equipments: equipmentsList,
        showEquipments: showEquipments,
        showAmenities: showAmenities,
        has24Emergency: isEmergencyEligible ? hasEmergency24h : false,
        emergencyPhone: (isEmergencyEligible && emergencyPhone) ? sanitizeInput(emergencyPhone) : '',
        hasWheelchairAccess: hasWheelchairAccess,
        hasElevator: hasElevator,
        hasParking: hasValetOrParking,
        hasFemaleStaff: hasFemaleStaff,
        hasKidsArea: hasKidsArea,
        hasElectronicPayment: hasElectronicPayment,
        consultationFee: consultationFee,
        bookingNotice: isPharmacy
          ? 'تتوفر الأدوية والمستلزمات الصيدلانية مباشرة بالزيارة الفورية أو الطلب المباشر دون الحاجة لحجز مسبق.'
          : (appointmentType === 'walk_in'
              ? 'استقبال المراجعين بأسبقية الحضور والدور المباشر خلال ساعات الدوام.'
              : appointmentType === 'both'
              ? 'متاح بحجز مسبق أو الدخول المباشر حسب أسبقية الحضور.'
              : 'يتم تأكيد الموعد فورياً عبر الواتساب أو الهاتف لتحديد التوقيت الأنسب بدون انتظار.')
      };

      // Construct category
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
        imageUrl: imageUrl || 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=800',
        image: imageUrl || 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=800',
        gallery: [imageUrl || 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=800'],
        googlePlaceUrl: googlePlaceUrl ? sanitizeInput(googlePlaceUrl) : '',
        workingHours: workingHours,
        socialLinks: finalSocialLinks,
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

      // Since created by Admin, auto-approve directly into 'businesses'
      const statusValue = 'approved';

      // Submit request to 'businessRequests' collection for record keeping
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
        requestRef = await addDoc(collection(db, 'businessRequests'), sanitizedRequestPayload);
      } catch (reqErr) {
        console.warn("businessRequests record warning:", reqErr);
      }

      // Create record in 'businesses'
      let newDocId = requestRef?.id || '';
      try {
        const sanitizedBizPayload = await compressAndSanitizeFirestorePayload({
          ...finalPayload,
          status: statusValue,
          requestId: requestRef?.id || ''
        }, false);
        const docRef = await addDoc(collection(db, 'businesses'), sanitizedBizPayload);
        newDocId = docRef.id;
        setCreatedFacilityId(docRef.id);
      } catch (bizErr) {
        console.warn("Direct business record warning:", bizErr);
        if (requestRef?.id) {
          setCreatedFacilityId(requestRef.id);
          newDocId = requestRef.id;
        } else {
          throw bizErr;
        }
      }

      invalidateCache();
      if (onFacilityAdded) {
        onFacilityAdded(newDocId);
      }
    } catch (err: any) {
      console.error('Error adding medical facility:', err);
      setErrorMessage(err.message || 'حدث خطأ أثناء حفظ المنشأة الطبية. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepsHeader = [
    { num: 1, label: 'النوع والبيانات', icon: Stethoscope },
    { num: 2, label: 'الكادر والمؤهلات', icon: Users },
    { num: 3, label: 'التأمينات والخدمات', icon: ShieldCheck },
    { num: 4, label: 'باقة الاشتراك', icon: Crown },
    { num: 5, label: 'الأجهزة والمواعيد', icon: Clock }
  ];

  const modalContent = (
    <div 
      className="fixed inset-0 z-[100000] overflow-hidden bg-stone-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6"
      dir="rtl"
    >
      <div 
        className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 w-full max-w-5xl overflow-hidden my-0 sm:my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[88dvh] sm:max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />
        {/* Top Header Bar */}
        <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white p-4 sm:p-5 px-6 flex items-center justify-between border-b border-stone-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">إضافة منشأة أو عيادة طبية</h2>
                <span className="text-[10px] font-black bg-amber-400 text-stone-950 px-2.5 py-0.5 rounded-full">
                  إدارة النظام 👑
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  اعتماد فوري ومباشر
                </span>
              </div>
              <p className="text-xs text-stone-300 font-medium mt-0.5">
                نموذج التسجيل الطبي الشامل والمطابق لـ /medical/register مع خيارات الاعتماد والربط الذهبي المباشر
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="إغلاق النافذة"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 flex-1 bg-stone-50/50">
          {/* SUCCESS SCREEN */}
          {createdFacilityId ? (
            <div className="bg-white rounded-3xl p-6 sm:p-10 border border-emerald-200 shadow-sm text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center shadow-inner">
                <CheckCircle2 className="h-10 w-10 text-[#1a4d2e]" />
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full">
                  تم الحفظ والاعتماد الفوري بنجاح!
                </span>
                <h3 className="text-2xl font-black text-stone-900">
                  تمت إضافة المنشأة الطبية إلى الدليل مباشرة 🏥
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 font-medium leading-relaxed">
                  تم إنشاء السجل الطبي واعتماده كمنشأة موثقة على منصة "شو في بإربد"، وتم تفعيل كافة الميزات والباقات والربط بالحساب.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <Link
                  to={`/medical/facility/${createdFacilityId}`}
                  target="_blank"
                  className="px-6 py-3 rounded-2xl bg-[#1a4d2e] hover:bg-[#143d24] text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-md transition-all"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span>معاينة صفحة المنشأة الطبية</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/medical/facility/${createdFacilityId}`);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2500);
                  }}
                  className="px-6 py-3 rounded-2xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-800 text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer"
                >
                  {copiedLink ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4 text-stone-500" />}
                  <span>{copiedLink ? 'تم نسخ الرابط!' : 'نسخ رابط المنشأة'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCreatedFacilityId(null);
                    setCurrentStep(1);
                    setName('');
                    setPhone('');
                    setDoctorName('');
                    setAdditionalStaff([]);
                  }}
                  className="px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-stone-950 text-xs sm:text-sm font-black flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>إضافة منشأة طبية أخرى</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-5 sm:p-7 border border-stone-200 shadow-sm space-y-6">
              {/* Stepper Progress Bar */}
              <div className="border-b border-stone-100 pb-5">
                <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
                  {stepsHeader.map((step) => {
                    const isPassed = currentStep > step.num;
                    const isCurrent = currentStep === step.num;
                    const IconComp = step.icon;

                    return (
                      <button
                        key={step.num}
                        type="button"
                        onClick={() => {
                          if (step.num < currentStep) setCurrentStep(step.num as any);
                        }}
                        className={`flex flex-col items-center text-center p-2 rounded-2xl transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-emerald-50 text-emerald-950 ring-2 ring-[#1a4d2e]'
                            : isPassed
                            ? 'text-[#1a4d2e] hover:bg-stone-50'
                            : 'text-stone-400 opacity-60 cursor-default'
                        }`}
                      >
                        <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-black text-xs transition-all ${
                          isCurrent
                            ? 'bg-[#1a4d2e] text-white shadow-xs'
                            : isPassed
                            ? 'bg-emerald-100 text-[#1a4d2e]'
                            : 'bg-stone-100 text-stone-400'
                        }`}>
                          {isPassed ? <Check className="h-4 w-4 stroke-[3]" /> : <IconComp className="h-4 w-4" />}
                        </div>
                        <span className="text-[10px] sm:text-xs font-black mt-1.5 line-clamp-1">
                          {step.label}
                        </span>
                        <span className="text-[9px] text-stone-400 font-bold hidden sm:inline">
                          المرحلة {step.num}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2 animate-shake">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* FORM STEPS */}
              <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-6">

                {/* ================= STEP 1: CATEGORY, SPECIALTY & BASIC INFO ================= */}
                {currentStep === 1 && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                        <Stethoscope className="h-5 w-5 text-[#1a4d2e]" />
                        <span>المرحلة الأولى: الاختصاص الرئيسي، التصنيفات الفرعية وهويّة المنشأة</span>
                      </h3>
                      <p className="text-xs text-stone-500 font-bold mt-1">
                        اختر الاختصاص الرئيسي لمنشأتك الطبية من بين الاختصاصات الـ 11 المعتمدة بـ منصة شو في بإربد، ثم حدد التخصصات الدقيقة والبيانات الأساسية.
                      </p>
                    </div>

                    {/* 1. Primary Specialty Selection (11 Core Specialties Grid) */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <label className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4 text-[#ff9f1c]" />
                          <span>1. الاختصاص الطبي الرئيسي (اختر من الـ 11 قسم رئيسي) *</span>
                        </label>
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          القسم المختار: {activeSpecialtyObj.name}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto p-1">
                        {categoriesToUse.filter(s => s.active !== false).map(spec => {
                          const IconComponent = getSpecialtyIconComponent(spec);
                          const isSelected = mainSpecialty === spec.id;
                          const subsCount = (spec.subspecialties || (spec as any).subcategories || []).length;
                          return (
                            <button
                              key={spec.id}
                              type="button"
                              onClick={() => setMainSpecialty(spec.id)}
                              className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-3 cursor-pointer ${
                                isSelected
                                  ? 'bg-gradient-to-br from-emerald-50 via-emerald-50/70 to-teal-50/40 border-[#1a4d2e] ring-2 ring-[#1a4d2e]/20 shadow-sm text-stone-900'
                                  : 'bg-white border-stone-200 hover:border-emerald-300 hover:bg-stone-50/60 text-stone-700'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className={`p-2.5 rounded-xl shrink-0 transition-colors ${
                                  isSelected ? 'bg-[#1a4d2e] text-white shadow-xs' : 'bg-stone-100 text-stone-600'
                                }`}>
                                  <IconComponent className="h-4 w-4" />
                                </div>
                                {isSelected ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-black bg-[#1a4d2e] text-white px-2 py-0.5 rounded-full">
                                    <Check className="h-3 w-3" />
                                    <span>مُحدد</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-stone-400 font-bold">
                                    {subsCount} تخصصات
                                  </span>
                                )}
                              </div>

                              <div className="space-y-1">
                                <div className="text-xs font-black text-stone-900 leading-snug">
                                  {spec.name}
                                </div>
                                <p className="text-[10px] text-stone-500 font-medium line-clamp-2 leading-relaxed">
                                  {spec.description}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. Subspecialties & Precise Classifications */}
                    <div className="space-y-3 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 sm:p-5">
                      <div className="space-y-1">
                        <label className="text-xs font-black text-emerald-950 flex items-center justify-between flex-wrap gap-1">
                          <span>2. التصنيف الفرعي والتخصص الدقيق لـ ({activeSpecialtyObj.name}) *</span>
                          <span className="text-[11px] font-bold text-emerald-800 bg-white px-2.5 py-0.5 rounded-full border border-emerald-200">
                            {isHospital ? '(اختر تصنيفاً واحداً فقط)' : '(اختر تخصصاً واحداً أو أكثر)'}
                          </span>
                        </label>
                        <p className="text-[11px] text-stone-600 font-medium">
                          {isHospital 
                            ? 'اختر نوع ونطاق العمل الخاص بالمستشفى أو المركز الشامل (تصنيف فردي محدد).'
                            : 'تساعد التصنيفات الفرعية المرضى والمراجعين في الوصول السريع لخدمات منشأتك.'}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {(activeSpecialtyObj.subspecialties || (activeSpecialtyObj as any).subcategories || []).map(sub => {
                          const isSelected = selectedSubspecialties.includes(sub);
                          return (
                            <button
                              key={sub}
                              type="button"
                              onClick={() => toggleSubspecialty(sub)}
                              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                                isSelected
                                  ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs'
                                  : 'bg-white text-stone-700 border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                              }`}
                            >
                              {isSelected ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Plus className="h-3.5 w-3.5 text-stone-400" />}
                              <span>{sub}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Facility Name & District */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-stone-800">
                          {isPharmacy ? 'اسم الصيدلية الرسمي *' : isLab ? 'اسم المختبر الطبي *' : isHospital ? 'اسم المستشفى أو المركز الشامل *' : 'اسم العيادة أو الطبيب *'}
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder={isPharmacy ? 'مثال: صيدلية الرازي النموذجية' : isLab ? 'مثال: مختبرات مدلاب إربد' : isHospital ? 'مثال: مستشفى إربد التخصصي' : 'مثال: عيادة الدكتور أحمد العمري'}
                          className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-stone-800">المنطقة أو الحي في إربد *</label>
                        <select
                          value={district}
                          onChange={e => setDistrict(e.target.value)}
                          className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        >
                          {ALL_IRBID_DISTRICTS.map(dist => (
                            <option key={dist} value={dist}>{dist}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Detailed Address */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-stone-800">العنوان بالتفصيل، اسم المجمع الطبي، والطابق</label>
                      <input
                        type="text"
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="مثال: شارع الجامعة، مجمع القضاة الطبي، الطابق الثالث، عيادة 302"
                        className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    {/* Image / Logo Upload */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-stone-800">صورة الواجهة أو الشعار الرسمي للمنشأة الطبية</label>
                      <ImageUploader
                        value={imageUrl}
                        onChange={setImageUrl}
                      />
                    </div>

                    {/* Google Place URL */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-red-500" />
                        <span>رابط موقع المنشأة على خرائط Google Maps</span>
                      </label>
                      <input
                        type="url"
                        value={googlePlaceUrl}
                        onChange={e => setGooglePlaceUrl(e.target.value)}
                        placeholder="https://maps.app.goo.gl/..."
                        className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        dir="ltr"
                      />
                    </div>

                    {/* Contact Phones */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-[#1a4d2e]" />
                          <span>رقم هاتف واستقبال المنشأة *</span>
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="مثال: 0791234567 أو 027200000"
                          className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          dir="ltr"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-emerald-600" />
                          <span>رقم الواتساب الرسمي للاستفسارات والمواعيد</span>
                        </label>
                        <input
                          type="tel"
                          value={whatsapp}
                          onChange={e => setWhatsapp(e.target.value)}
                          placeholder="مثال: 0791234567"
                          className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    {/* 24/7 Emergency Phone if eligible */}
                    {isEmergencyEligible && (
                      <div className="space-y-1.5 p-3.5 bg-red-50/70 border border-red-200/80 rounded-2xl">
                        <label className="text-xs font-black text-red-950 flex items-center gap-1.5">
                          <Activity className="h-4 w-4 text-red-600" />
                          <span>رقم هاتف الطوارئ والمناوبة 24 ساعة (اختياري)</span>
                        </label>
                        <input
                          type="tel"
                          value={emergencyPhone}
                          onChange={e => setEmergencyPhone(e.target.value)}
                          placeholder="مثال: 0799999999 أو الخط الساخن"
                          className="w-full bg-white border border-red-200 rounded-xl px-4 py-2.5 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                          dir="ltr"
                        />
                      </div>
                    )}

                    {/* Rich Text Description */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-stone-800">نبذة تعريفية وشرح عن المنشأة الطبية والخدمات</label>
                      <RichTextEditor
                        value={description}
                        onChange={setDescription}
                        placeholder="اكتب نبذة تعريفية مميزة عن المنشأة الطبية وأهم الخبرات والخدمات المقدمة للمرضى..."
                      />
                    </div>
                  </div>
                )}

                {/* ================= STEP 2: STAFF & QUALIFICATIONS ================= */}
                {currentStep === 2 && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                        <Users className="h-5 w-5 text-[#1a4d2e]" />
                        <span>المرحلة الثانية: الكادر الطبي والاعتمادات والشهادات الرسمية</span>
                      </h3>
                      <p className="text-xs text-stone-500 font-bold mt-1">
                        أدخل تفاصيل الطبيب المسؤول أو الكادر الطبي، والمؤهلات والشهادات والبورد والخبرات العملية.
                      </p>
                    </div>

                    {/* Doctor / In-Charge Name & Title */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-stone-800">
                          {isPharmacy ? 'اسم الصيدلي المسؤول' : isLab ? 'اسم مسؤول المختبر' : isHospital ? 'اسم المدير الطبي / رئيس الأطباء' : 'الاسم الكامل للطبيب المسؤول *'}
                        </label>
                        <input
                          type="text"
                          value={doctorName}
                          onChange={e => setDoctorName(e.target.value)}
                          placeholder="مثال: د. محمد أحمد القضاة"
                          className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-stone-800">المسمى والدرجة المهنية</label>
                        <select
                          value={professionalTitle}
                          onChange={e => setProfessionalTitle(e.target.value)}
                          className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        >
                          {isPharmacy ? (
                            <>
                              <option value="صيدلي قانوني مسؤول">صيدلي قانوني مسؤول (BPharm)</option>
                              <option value="دكتور صيدلة (PharmD)">دكتور صيدلة (PharmD)</option>
                              <option value="صيدلي أول / مدير صيدلية">صيدلي أول / مدير صيدلية</option>
                              <option value="صيدلي تركيبات ودواء">صيدلي متخصص بالتركيبات والاستشارات</option>
                            </>
                          ) : isLab ? (
                            <>
                              <option value="أخصائي تحاليل طبية">أخصائي تحاليل ومختبرات طبية</option>
                              <option value="أخصائي أشعة وتصوير طبقي">أخصائي أشعة وتصوير شعاعي ورنين</option>
                              <option value="استشاري باثولوجي وأنسجة">استشاري باثولوجي وأنسجة</option>
                              <option value="مدير مختبرات تشخيصية">مدير المختبرات التشخيصية</option>
                            </>
                          ) : isHospital ? (
                            <>
                              <option value="مدير طبي للمستشفى">مدير طبي للمستشفى / المركز</option>
                              <option value="رئيس أطباء واستشاريين">رئيس الهيئة الطبية والأطباء</option>
                              <option value="مدير عام المستشفى">مدير عام المستشفى</option>
                              <option value="إدارة طبية تخصصية">إدارة طبية تخصصية متكاملة</option>
                            </>
                          ) : isRehab ? (
                            <>
                              <option value="أخصائي علاج طبيعي وتأهيل">أخصائي علاج طبيعي وتأهيل</option>
                              <option value="أخصائي إصابات ملاعب">أخصائي إصابات ملاعب وتأهيل رياضي</option>
                              <option value="معالج وظيفي ومحرك">معالج وظيفي وحركي</option>
                              <option value="أخصائي نطق وتخاطب">أخصائي نطق وتخاطب وتأهيل</option>
                            </>
                          ) : (
                            <>
                              <option value="استشاري أول">استشاري أول (Senior Consultant)</option>
                              <option value="استشاري">طبيب استشاري (Consultant)</option>
                              <option value="أخصائي أول">أخصائي أول (Senior Specialist)</option>
                              <option value="طبيب اختصاصي">طبيب اختصاصي (Specialist)</option>
                              <option value="طبيب عام وطوارئ">طبيب عام وطوارئ (General Practitioner)</option>
                            </>
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Degrees & License */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-stone-800">
                          {isPharmacy ? 'الشهادات والترخيص الدوائي' : isLab ? 'الشهادات والاعتمادات المختبرية' : isHospital ? 'الاعتمادات والموافقات الرسمية' : isRehab ? 'الشهادات والتأهيل المهني' : 'الشهادات والبورد العلمي (مفصولة بفواصل)'}
                        </label>
                        <input
                          type="text"
                          value={degrees}
                          onChange={e => setDegrees(e.target.value)}
                          placeholder={isPharmacy ? 'بكالوريوس صيدلة، ترخيص نقابة الصيدليين' : 'البورد الأردني، زمالة الكلية الملكية، بورد عربي'}
                          className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-stone-800">
                          {isPharmacy ? 'رقم ترخيص الصيدلية / مزاولة المهنة' : isLab ? 'رقم ترخيص المختبر' : isHospital ? 'رقم ترخيص المستشفى' : 'رقم ترخيص مزاولة المهنة (وزارة الصحة / النقابة)'}
                        </label>
                        <input
                          type="text"
                          value={licenseNumber}
                          onChange={e => setLicenseNumber(e.target.value)}
                          placeholder="مثال: MOH-784521 / JPA-8842"
                          className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Experience & Doctor Gender */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-stone-800">سنوات الخبرة العملية</label>
                        <input
                          type="number"
                          min="1"
                          max="50"
                          value={experienceYears}
                          onChange={e => setExperienceYears(e.target.value)}
                          className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>

                      {isDoctor && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-stone-800">جنس الطبيب / الكادر (لتسهيل فلترة البحث)</label>
                          <select
                            value={gender}
                            onChange={e => setGender(e.target.value as any)}
                            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          >
                            <option value="male">طبيب (ذكر)</option>
                            <option value="female">طبيبة (أنثى)</option>
                            <option value="team">كادر طبي متكامل (ذكور وإناث)</option>
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Additional Staff Members Section */}
                    <div className="p-5 rounded-2xl bg-stone-50/80 border border-stone-200/90 space-y-4">
                      <div className="flex items-center justify-between border-b border-stone-200/70 pb-3">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-[#1a4d2e]" />
                          <h4 className="text-sm font-black text-stone-900">
                            {isPharmacy ? 'أعضاء الكادر الصيدلاني الإضافي' : 'أعضاء الكادر الطبي والإشرافي (إضافة أطباء وأخصائيين)'}
                          </h4>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            {1 + additionalStaff.length} كادر إجمالي
                          </span>
                        </div>
                        <span className="text-[11px] text-stone-500 font-bold">اختياري</span>
                      </div>

                      {/* Show/Hide Staff Tab Toggle */}
                      <div className="p-4 bg-white rounded-xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-3xs">
                        <div className="flex items-start sm:items-center gap-3">
                          <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
                            <Users className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-black text-stone-900">
                                {isPharmacy ? 'إظهار قسم الكادر الصيدلاني في صفحة المنشأة' : 'إظهار قسم الكادر الطبي في صفحة المنشأة'}
                              </h5>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                showMedicalStaff ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
                              }`}>
                                {showMedicalStaff ? 'مفعّل ومعروض' : 'مخفي'}
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-600 font-medium mt-0.5">
                              يتيح للمراجعين استعراض كافة الأطباء والاستشاريين والمؤهلات في تاب مخصص.
                            </p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer shrink-0 self-end sm:self-center">
                          <input
                            type="checkbox"
                            checked={showMedicalStaff}
                            onChange={(e) => setShowMedicalStaff(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1a4d2e]"></div>
                        </label>
                      </div>

                      {/* Existing additional staff list and add form */}
                      {showMedicalStaff && (
                        <div className="space-y-4 pt-1">
                          {additionalStaff.length > 0 && (
                            <div className="space-y-2.5">
                              {additionalStaff.map((staff, idx) => (
                                <div key={idx} className="p-3.5 bg-white rounded-xl border border-stone-200 shadow-3xs flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0 border border-emerald-100">
                                      {staff.name.substring(0, 2)}
                                    </div>
                                    <div className="min-w-0">
                                      <h5 className="text-xs font-black text-stone-900 truncate">{staff.name}</h5>
                                      <p className="text-[11px] text-stone-500 font-bold truncate">
                                        {staff.title} {staff.subspecialty ? `• ${staff.subspecialty}` : ''} • خبرة {staff.experienceYears} سنوات
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveStaffMember(idx)}
                                    className="p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add staff form */}
                          <div className="p-4 bg-white rounded-xl border border-dashed border-emerald-300 space-y-3">
                            <div className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                              <Plus className="h-4 w-4 text-[#1a4d2e]" />
                              <span>إضافة عضو كادر {isPharmacy ? 'صيدلاني' : 'طبي'} جديد</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[11px] font-bold text-stone-600 block mb-1">الاسم الكامل *</label>
                                <input
                                  type="text"
                                  value={staffMemberName}
                                  onChange={e => setStaffMemberName(e.target.value)}
                                  placeholder="مثال: د. طارق الروسان"
                                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-xs font-bold text-stone-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-stone-600 block mb-1">المسمى المهني</label>
                                <input
                                  type="text"
                                  value={staffMemberTitle}
                                  onChange={e => setStaffMemberTitle(e.target.value)}
                                  placeholder="مثال: استشاري جراحة العظام"
                                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-xs font-bold text-stone-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="sm:col-span-2">
                                <label className="text-[11px] font-bold text-stone-600 block mb-1">الشهادات والبورد</label>
                                <input
                                  type="text"
                                  value={staffMemberDegrees}
                                  onChange={e => setStaffMemberDegrees(e.target.value)}
                                  placeholder="البورد الأردني، زمالة الكلية الملكية"
                                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-xs font-bold text-stone-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>

                              <div>
                                <label className="text-[11px] font-bold text-stone-600 block mb-1">سنوات الخبرة</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="50"
                                  value={staffMemberExp}
                                  onChange={e => setStaffMemberExp(e.target.value)}
                                  className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-xs font-bold text-stone-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-stone-600 block mb-1">التخصص الدقيق</label>
                              <input
                                type="text"
                                value={staffMemberSubspecialty}
                                onChange={e => setStaffMemberSubspecialty(e.target.value)}
                                placeholder="مثال: قسطرة القلب والشرايين التداخلية"
                                className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-xs font-bold text-stone-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>

                            <div className="flex justify-end pt-1">
                              <button
                                type="button"
                                onClick={handleAddStaffMember}
                                disabled={!staffMemberName.trim()}
                                className="px-4 py-2 bg-[#1a4d2e] hover:bg-[#143d24] disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>إضافة العضو للكادر</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ================= STEP 3: INSURANCES & SERVICES ================= */}
                {currentStep === 3 && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-[#1a4d2e]" />
                        <span>المرحلة الثالثة: التأمينات المعتمدة والخدمات المتاحة</span>
                      </h3>
                      <p className="text-xs text-stone-500 font-bold mt-1">
                        حدد شركات التأمين والنقابات المقبولة والخدمات والإجراءات المتوفرة لمنشأتك.
                      </p>
                    </div>

                    {/* Insurances Checklist */}
                    <div className="space-y-3 p-4 rounded-2xl bg-stone-50 border border-stone-200/80">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-stone-900">
                          شركات التأمين والنقابات المقبولة (تغطية مباشرة)
                        </label>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {selectedInsurances.length} تأمين محدد
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                        {POPULAR_INSURANCES.map(ins => {
                          const isChecked = selectedInsurances.includes(ins);
                          return (
                            <button
                              key={ins}
                              type="button"
                              onClick={() => toggleInsurance(ins)}
                              className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                                isChecked
                                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-black'
                                  : 'bg-white border-stone-200 hover:border-emerald-200 text-stone-700 text-xs font-bold'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                isChecked ? 'bg-[#1a4d2e] border-[#1a4d2e] text-white' : 'border-stone-300 bg-white'
                              }`}>
                                {isChecked && <Check className="h-3 w-3" />}
                              </div>
                              <span className="text-xs line-clamp-1">{ins}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Add Custom Insurance */}
                      <div className="flex items-center gap-2 pt-2 border-t border-stone-200/60">
                        <input
                          type="text"
                          value={customInsuranceInput}
                          onChange={e => setCustomInsuranceInput(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomInsurance())}
                          placeholder="إضافة نقابة أو شركة تأمين أخرى..."
                          className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                        <button
                          type="button"
                          onClick={addCustomInsurance}
                          className="px-3.5 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-black transition-colors shrink-0 cursor-pointer"
                        >
                          إضافة +
                        </button>
                      </div>
                    </div>

                    {/* Procedures and Clinical Services */}
                    <div className="space-y-4 p-4 sm:p-5 rounded-2xl bg-stone-50 border border-stone-200/80">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                          <Activity className="h-4 w-4 text-[#1a4d2e]" />
                          <span>الخدمات والإجراءات الطبية المتاحة بالعيادة / المنشأة</span>
                        </label>
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                          {proceduresList.length} خدمات مضافة
                        </span>
                      </div>

                      {/* Added Procedures List */}
                      {proceduresList.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {proceduresList.map((proc, idx) => (
                            <div
                              key={idx}
                              className="p-3 rounded-xl bg-white border border-stone-200 hover:border-emerald-300 transition-all flex items-center justify-between gap-2.5 shadow-3xs"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                                  <Activity className="h-3.5 w-3.5" />
                                </div>
                                <span className="text-xs font-black text-stone-900 truncate" title={proc.name}>
                                  {proc.name}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <input
                                  type="text"
                                  value={proc.price || ''}
                                  onChange={e => handleUpdateProcedurePrice(idx, e.target.value)}
                                  placeholder="السعر (اختياري)"
                                  className="w-24 sm:w-28 text-[11px] font-bold text-emerald-900 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeProcedure(idx)}
                                  className="p-1 hover:bg-red-50 text-stone-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-3.5 px-4 bg-white rounded-xl border border-dashed border-stone-300 text-stone-500 text-xs font-bold">
                          لم تقم بإضافة أي خدمات بعد. انقر على المقترحات أدناه لإضافتها فوراً.
                        </div>
                      )}

                      {/* Quick Suggestions for Selected Specialty */}
                      {activeSpecialtyObj?.defaultProcedures && activeSpecialtyObj.defaultProcedures.length > 0 && (
                        <div className="pt-2 border-t border-stone-200/70 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-stone-700 flex items-center gap-1">
                              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                              <span>اقتراحات سريعة للاختصاص:</span>
                            </span>
                            {activeSpecialtyObj.defaultProcedures.some(p => !proceduresList.some(item => item.name === p)) && (
                              <button
                                type="button"
                                onClick={handleAddAllSuggestedProcedures}
                                className="text-[10px] font-black text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-full transition-colors cursor-pointer"
                              >
                                + إضافة جميع المقترحات
                              </button>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {activeSpecialtyObj.defaultProcedures.map(sug => {
                              const isAdded = proceduresList.some(item => item.name === sug);
                              return (
                                <button
                                  key={sug}
                                  type="button"
                                  onClick={() => handleToggleSuggestedProcedure(sug)}
                                  className={`text-xs px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                                    isAdded
                                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-black'
                                      : 'bg-white text-stone-700 border-stone-200 hover:border-emerald-300 font-bold'
                                  }`}
                                >
                                  {isAdded ? <Check className="h-3 w-3 text-emerald-700" /> : <Plus className="h-3 w-3 text-stone-400" />}
                                  <span>{sug}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Add Custom Procedure */}
                      <div className="pt-2 border-t border-stone-200/60 space-y-2">
                        <label className="text-[11px] font-black text-stone-700 block">إضافة خدمة مخصصة:</label>
                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                          <div className="sm:col-span-7">
                            <input
                              type="text"
                              value={newProcedureInput}
                              onChange={e => setNewProcedureInput(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomProcedure())}
                              placeholder="اسم الخدمة أو الإجراء الطبي..."
                              className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <input
                              type="text"
                              value={newProcedurePrice}
                              onChange={e => setNewProcedurePrice(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomProcedure())}
                              placeholder="السعر (مثال: 20 د.أ)"
                              className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <button
                              type="button"
                              onClick={addCustomProcedure}
                              disabled={!newProcedureInput.trim()}
                              className="w-full h-full min-h-[38px] px-3.5 py-2 bg-[#1a4d2e] hover:bg-[#143e24] disabled:bg-stone-300 text-white rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center justify-center gap-1"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>إضافة</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Consultation Fee */}
                    <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4 text-emerald-600" />
                          <span>رسوم الكشف والمعاينة</span>
                        </label>
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                          تظهر تلقائياً في الخدمات والأسعار
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={consultationFee}
                          onChange={e => setConsultationFee(e.target.value)}
                          placeholder="مثال: 15 د.أ أو (حسب تسعيرة النقابة)"
                          className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>

                    {/* Appointment System Selector */}
                    {!isPharmacy && (
                      <div className="space-y-3 bg-stone-50 border border-stone-200/80 rounded-2xl p-4 sm:p-5">
                        <label className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-[#1a4d2e]" />
                          <span>نظام وطريقة استقبال المراجعين والمواعيد *</span>
                        </label>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                          {[
                            { id: 'phone_first', title: 'حجز مسبق (هاتف / واتساب)', desc: 'يتطلب حجز الموعد مسبقاً لتجنب الانتظار', icon: Phone },
                            { id: 'walk_in', title: 'أسبقية الحضور والدور المباشر', desc: 'استقبال فوري حسب الدور المباشر بدون حجز', icon: Clock },
                            { id: 'both', title: 'حجز مسبق أو دور مباشر', desc: 'متاح بالحالتين حسب رغبة المريض', icon: CheckCircle2 }
                          ].map(opt => {
                            const isSelected = appointmentType === opt.id;
                            const IconComp = opt.icon;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => setAppointmentType(opt.id as any)}
                                className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-50 border-[#1a4d2e] ring-2 ring-[#1a4d2e]/20 text-stone-900 font-black'
                                    : 'bg-white border-stone-200 hover:border-emerald-300 text-stone-700 font-bold'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className={`p-2 rounded-xl ${isSelected ? 'bg-[#1a4d2e] text-white' : 'bg-stone-100 text-stone-600'}`}>
                                    <IconComp className="h-4 w-4" />
                                  </div>
                                  {isSelected && <Check className="h-4 w-4 text-[#1a4d2e]" />}
                                </div>
                                <div className="text-xs font-black mt-1">{opt.title}</div>
                                <div className="text-[10px] text-stone-500 font-medium">{opt.desc}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ================= STEP 4: PACKAGE PLAN SELECTION ================= */}
                {currentStep === 4 && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-200">
                      <div className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-[#ff9f1c]" />
                        <h3 className="text-base sm:text-lg font-black text-stone-900">
                          المرحلة الرابعة: اختر باقة الاشتراك للمنشأة الطبية
                        </h3>
                      </div>
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full border border-emerald-200">
                        ترقية واعتماد فوري للإدارة 👑
                      </span>
                    </div>

                    {/* Billing Period Selector */}
                    <div className="flex flex-col items-center justify-center p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
                      <span className="text-xs font-black text-stone-700">دورة الدفع للباقات:</span>
                      <div className="bg-stone-200/90 p-1 rounded-xl inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => setBillingPeriod('monthly')}
                          className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                            billingPeriod === 'monthly' ? 'bg-[#1a4d2e] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          الدفع الشهري 🗓️
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillingPeriod('yearly')}
                          className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                            billingPeriod === 'yearly' ? 'bg-[#ff9f1c] text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                          }`}
                        >
                          <span>الدفع السنوي (الافتراضي)</span>
                          <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black">
                            وفر 48% 🔥
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Package Cards Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                      {/* Basic Package Card */}
                      <div
                        onClick={() => setSelectedPackagePlan('basic')}
                        className={`border-2 rounded-2xl p-6 cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden select-none ${
                          selectedPackagePlan === 'basic'
                            ? 'border-[#1a4d2e] bg-emerald-50/40 ring-4 ring-[#1a4d2e]/5 shadow-md'
                            : 'border-stone-200 hover:border-stone-300 bg-white'
                        }`}
                      >
                        <div className="space-y-4">
                          <div className="flex items-center justify-between gap-1 pt-1">
                            <span className="font-black text-base text-stone-900 flex items-center gap-1.5">
                              <MapPin className="h-4 w-4 text-stone-500" />
                              الباقة الأساسية الطبية
                            </span>
                            {selectedPackagePlan === 'basic' && (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-stone-500 font-medium">
                            التواجد والتعريف الطبي الأساسي لمرضى ومراجعي إربد
                          </p>

                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex gap-2 items-start mt-2">
                            <Gift className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                            <div>
                              <div className="text-[10px] font-black text-emerald-900">هدية انضمام مجانية</div>
                              <div className="text-[9px] text-emerald-700 font-bold mt-0.5 leading-tight">شهر مجاني تجريبي لباقة الـ VIP الذهبية للمنشآت المضافة جديداً لأول مرة!</div>
                            </div>
                          </div>

                          <ul className="space-y-2.5 pt-1">
                            {[
                              'بطاقة تعريفية رقمية متكاملة (الاسم، اللقب، والتخصص)',
                              'أرقام هواتف العيادة ورابط الواتساب المباشر',
                              'الموقع الجغرافي الدقيق على خرائط Google Maps',
                              'جدول أوقات ومواعيد الدوام الأسبوعي مع مؤشر الحالة المباشر',
                              'إدراج العيادة في محرك البحث الطبي في إربد'
                            ].map((f, fIdx) => (
                              <li key={fIdx} className="flex items-start gap-2 text-[10px] sm:text-[11px] text-stone-600 font-medium">
                                <Check className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-6 mt-auto">
                          <div className={`w-full py-2.5 rounded-xl text-xs font-black text-center border transition-all ${
                            selectedPackagePlan === 'basic'
                              ? 'bg-[#1a4d2e] border-[#1a4d2e] text-white shadow-xs'
                              : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200'
                          }`}>
                            {selectedPackagePlan === 'basic' ? '✓ باقتك المحددة حالياً' : 'تحديد الباقة الأساسية'}
                          </div>
                        </div>
                      </div>

                      {/* Golden VIP Package Card */}
                      <div
                        onClick={() => setSelectedPackagePlan('golden')}
                        className={`border-2 rounded-2xl p-6 cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden select-none ${
                          selectedPackagePlan === 'golden'
                            ? 'border-emerald-500 bg-emerald-50/40 ring-4 ring-emerald-400/20 shadow-md'
                            : 'border-emerald-200 hover:border-emerald-400 bg-white'
                        }`}
                      >
                        <div className="space-y-4 pt-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-black text-base text-emerald-950 flex items-center gap-1.5">
                              <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
                              الباقة الذهبية الطبية VIP 👑
                            </span>
                            {selectedPackagePlan === 'golden' && (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-emerald-800/80 font-bold">
                            العيادة الرقمية المتكاملة مع كافة المزايا المتقدمة
                          </p>

                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 items-start mt-2">
                            <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <div className="text-[10px] font-black text-amber-900">هدية انضمام حصرية للباقة الذهبية</div>
                              <div className="text-[9px] text-amber-800 font-bold mt-0.5 leading-tight">ميزة (المميز/صدارة البحث) ذات الإطار الذهبي وعلامة ممول مجاناً لمدة أسبوع كامل فور الإضافة!</div>
                            </div>
                          </div>

                          <ul className="space-y-2.5 pt-1">
                            {[
                              'شارة التوثيق والاعتماد الطبية الرسمية (Verified ✓)',
                              'محرك حجز المواعيد الطبي واستقبال طلبات الكشف',
                              'دليل شبكات وشركات التأمين الصحي والنقابات',
                              'كتالوج الإجراءات والفحوصات مع تفاصيل الأسعار',
                              'دليل الكادر الطبي والاستشاريين مع الشهادات والخبرات',
                              'استعراض التجهيزات والتقنيات والأجهزة المتطورة',
                              'أولوية الصدارة في نتائج البحث الطبي وترشيحات المساعد الذكي'
                            ].map((f, fIdx) => (
                              <li key={fIdx} className="flex items-start gap-2 text-[10px] sm:text-[11px] text-stone-700 font-medium">
                                <Check className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                <span className={fIdx < 3 ? 'font-bold text-stone-900' : ''}>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="pt-6 mt-auto">
                          <div className={`w-full py-2.5 rounded-xl text-xs font-black text-center border transition-all ${
                            selectedPackagePlan === 'golden'
                              ? 'bg-[#1a4d2e] border-[#1a4d2e] text-white shadow-xs'
                              : 'bg-emerald-100 border-emerald-200 text-emerald-900 hover:bg-emerald-200'
                          }`}>
                            {selectedPackagePlan === 'golden' ? '✓ باقتك المحددة حالياً' : 'تحديد الباقة الذهبية VIP'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ================= STEP 5: EQUIPMENT, AMENITIES, HOURS & GOLDEN BOX ================= */}
                {currentStep === 5 && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div>
                      <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-[#1a4d2e]" />
                        <span>المرحلة الخامسة: الأجهزة والتسهيلات وساعات العمل والربط الذهبي</span>
                      </h3>
                      <p className="text-xs text-stone-500 font-bold mt-1">
                        حدد مواعيد وساعات الدوام، وتسهيلات المرضى، والخانة الذهبية لربط حساب صاحب المنشأة.
                      </p>
                    </div>

                    {/* Equipment Section */}
                    <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-3xs">
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                            <Activity className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-stone-900">الأجهزة والتقنيات الطبية المستخدمة</h4>
                            <p className="text-[11px] text-stone-500 font-bold">
                              إظهار أحدث المعدات والتقنيات التشخيصية والعلاجية المعتمدة
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowEquipments(!showEquipments)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                            showEquipments ? 'bg-blue-600 text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          {showEquipments ? <><Eye className="h-3.5 w-3.5" /><span>القسم مفعّل</span></> : <><EyeOff className="h-3.5 w-3.5" /><span>مخفي</span></>}
                        </button>
                      </div>

                      {showEquipments && (
                        <div className="space-y-4 pt-1">
                          {equipmentsList.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {equipmentsList.map((eq, idx) => (
                                <div key={idx} className="p-3 bg-stone-50 border border-stone-200/80 rounded-xl flex items-start justify-between gap-2">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-black text-stone-900">{eq.name}</span>
                                      {eq.brandOrOrigin && (
                                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                          {eq.brandOrOrigin}
                                        </span>
                                      )}
                                    </div>
                                    {eq.description && (
                                      <p className="text-[11px] text-stone-500 font-medium">{eq.description}</p>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeEquipment(idx)}
                                    className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add Custom Equipment */}
                          <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3 space-y-2.5">
                            <span className="text-xs font-black text-stone-800 block">إضافة جهاز أو تقنية مخصصة:</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={newEquipmentName}
                                onChange={e => setNewEquipmentName(e.target.value)}
                                placeholder="اسم الجهاز (مثل: جهاز ليزر كانديلا)..."
                                className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <input
                                type="text"
                                value={newEquipmentBrand}
                                onChange={e => setNewEquipmentBrand(e.target.value)}
                                placeholder="الموديل / بلد الصنع (مثال: ألماني)..."
                                className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={newEquipmentDesc}
                                onChange={e => setNewEquipmentDesc(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomEquipment())}
                                placeholder="الوصف الطبي أو الفائدة للمريض..."
                                className="flex-1 bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <button
                                type="button"
                                onClick={addCustomEquipment}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black transition-colors shrink-0 cursor-pointer"
                              >
                                إضافة +
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Amenities & Accessibility */}
                    <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-3xs">
                      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100">
                        <div className="flex items-center gap-2">
                          <div className="p-2 rounded-xl bg-emerald-50 text-[#1a4d2e]">
                            <Accessibility className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-stone-900">تسهيلات الوصول وراحة المرضى</h4>
                            <p className="text-[11px] text-stone-500 font-bold">
                              تخصيص وإبراز خدمات الراحة والمواقف والمصاعد
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setShowAmenities(!showAmenities)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                            showAmenities ? 'bg-[#1a4d2e] text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                          }`}
                        >
                          {showAmenities ? <><Eye className="h-3.5 w-3.5" /><span>القسم مفعّل</span></> : <><EyeOff className="h-3.5 w-3.5" /><span>مخفي</span></>}
                        </button>
                      </div>

                      {showAmenities && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            hasWheelchairAccess ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-black' : 'bg-white border-stone-200 text-stone-700 font-bold'
                          }`}>
                            <input
                              type="checkbox"
                              checked={hasWheelchairAccess}
                              onChange={e => setHasWheelchairAccess(e.target.checked)}
                              className="h-4 w-4 rounded text-[#1a4d2e] focus:ring-emerald-500 cursor-pointer"
                            />
                            <div className="flex items-center gap-2">
                              <Accessibility className="h-4 w-4 text-emerald-600" />
                              <span className="text-xs">مدخل كراسي متحركة</span>
                            </div>
                          </label>

                          <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            hasElevator ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-black' : 'bg-white border-stone-200 text-stone-700 font-bold'
                          }`}>
                            <input
                              type="checkbox"
                              checked={hasElevator}
                              onChange={e => setHasElevator(e.target.checked)}
                              className="h-4 w-4 rounded text-[#1a4d2e] focus:ring-emerald-500 cursor-pointer"
                            />
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-blue-600" />
                              <span className="text-xs">مصعد كهربائي</span>
                            </div>
                          </label>

                          <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            hasValetOrParking ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-black' : 'bg-white border-stone-200 text-stone-700 font-bold'
                          }`}>
                            <input
                              type="checkbox"
                              checked={hasValetOrParking}
                              onChange={e => setHasValetOrParking(e.target.checked)}
                              className="h-4 w-4 rounded text-[#1a4d2e] focus:ring-emerald-500 cursor-pointer"
                            />
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-amber-600" />
                              <span className="text-xs">مواقف سيارات</span>
                            </div>
                          </label>

                          <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            hasFemaleStaff ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-black' : 'bg-white border-stone-200 text-stone-700 font-bold'
                          }`}>
                            <input
                              type="checkbox"
                              checked={hasFemaleStaff}
                              onChange={e => setHasFemaleStaff(e.target.checked)}
                              className="h-4 w-4 rounded text-[#1a4d2e] focus:ring-emerald-500 cursor-pointer"
                            />
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-purple-600" />
                              <span className="text-xs">كادر طبي نسائي</span>
                            </div>
                          </label>

                          <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            hasKidsArea ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-black' : 'bg-white border-stone-200 text-stone-700 font-bold'
                          }`}>
                            <input
                              type="checkbox"
                              checked={hasKidsArea}
                              onChange={e => setHasKidsArea(e.target.checked)}
                              className="h-4 w-4 rounded text-[#1a4d2e] focus:ring-emerald-500 cursor-pointer"
                            />
                            <div className="flex items-center gap-2">
                              <Baby className="h-4 w-4 text-pink-600" />
                              <span className="text-xs">ركن ألعاب أطفال</span>
                            </div>
                          </label>

                          <label className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            hasElectronicPayment ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-black' : 'bg-white border-stone-200 text-stone-700 font-bold'
                          }`}>
                            <input
                              type="checkbox"
                              checked={hasElectronicPayment}
                              onChange={e => setHasElectronicPayment(e.target.checked)}
                              className="h-4 w-4 rounded text-[#1a4d2e] focus:ring-emerald-500 cursor-pointer"
                            />
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-emerald-600" />
                              <span className="text-xs">دفع إلكتروني وCliQ</span>
                            </div>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Working Hours */}
                    <div className="space-y-3 bg-stone-50 border border-stone-200/80 rounded-2xl p-4 sm:p-5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-[#1a4d2e]" />
                          <span>أوقات وساعات الدوام الرسمية الأسبوعية *</span>
                        </label>
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          {workingHours.isOpen24Hours ? 'طوارئ 24/7' : `${workingHours.days} (${workingHours.openTime} - ${workingHours.closeTime})`}
                        </span>
                      </div>

                      <WorkingHoursEditor
                        workingHours={workingHours}
                        onChange={setWorkingHours}
                      />
                    </div>

                    {/* Social Links */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-stone-800">صفحات المنشأة على مواقع التواصل</label>
                      <SocialLinksEditor
                        socialLinks={socialLinks}
                        onChange={setSocialLinks}
                      />
                    </div>

                    {/* ================= GOLDEN BOX: OWNER ACCOUNT DIRECT ACCESS ================= */}
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 via-amber-50/70 to-yellow-50/50 border-2 border-amber-300/80 shadow-sm space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-800">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-amber-950 flex items-center gap-1.5">
                            <span>الخانة الذهبية: بيانات وصول صاحب المنشأة للحساب (إيميل أو رقم هاتف)</span>
                            <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">وصول مباشر</span>
                          </h4>
                          <p className="text-[11px] font-medium text-amber-800/90 leading-tight mt-0.5">
                            سيتم استخدام هذا البريد الإلكتروني أو رقم الهاتف لربط حساب الطبيب / صاحب المنشأة وتمكينه من إدارة صفحته فورياً كمدير مفوض.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <input
                          type="text"
                          value={ownerContact}
                          onChange={(e) => {
                            setOwnerContact(e.target.value);
                            setContactError('');
                          }}
                          placeholder="مثال: doctor@gmail.com أو 0791234567"
                          className="w-full px-4 py-3 bg-white border-2 border-amber-300 focus:border-amber-500 focus:ring-4 focus:ring-amber-400/20 rounded-xl text-xs sm:text-sm font-bold text-stone-900 placeholder:text-stone-400 text-right transition-all outline-none"
                          dir="ltr"
                        />
                        {contactError && (
                          <p className="text-xs font-bold text-red-600 flex items-center gap-1">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>{contactError}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Terms Agreement */}
                    <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-3">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={agreedToTerms}
                          onChange={e => setAgreedToTerms(e.target.checked)}
                          className="mt-1 h-4 w-4 rounded text-[#1a4d2e] focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-emerald-950 leading-relaxed">
                          أوافق على{' '}
                          <Link 
                            to="/terms" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            onClick={(e) => e.stopPropagation()} 
                            className="underline hover:text-emerald-700 text-[#1a4d2e] font-black transition-colors"
                          >
                            الشروط والأحكام
                          </Link>{' '}
                          و{' '}
                          <Link 
                            to="/privacy" 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            onClick={(e) => e.stopPropagation()} 
                            className="underline hover:text-emerald-700 text-[#1a4d2e] font-black transition-colors"
                          >
                            سياسة الخصوصية
                          </Link>{' '}
                          المعمول بها في منصة شو في بإربد.
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Navigation Controls */}
                <div className="flex items-center justify-between gap-4 pt-6 border-t border-stone-200">
                  {currentStep > 1 ? (
                    <button
                      key="btn-prev"
                      type="button"
                      onClick={handlePrev}
                      className="px-6 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <ArrowRight className="h-4 w-4" />
                      <span>السابق</span>
                    </button>
                  ) : (
                    <button
                      key="btn-cancel"
                      type="button"
                      onClick={onClose}
                      className="px-5 py-3 rounded-2xl text-stone-400 hover:text-stone-700 text-xs font-bold cursor-pointer"
                    >
                      إلغاء
                    </button>
                  )}

                  {currentStep < 5 ? (
                    <button
                      key="btn-next"
                      type="button"
                      onClick={handleNext}
                      className="px-8 py-3.5 rounded-2xl bg-[#1a4d2e] hover:bg-[#143d24] text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
                    >
                      <span>التالي</span>
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      key="btn-submit"
                      type="submit"
                      disabled={isSubmitting}
                      className="px-8 sm:px-10 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-[#1a4d2e] hover:from-emerald-700 hover:to-[#133b22] text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>جاري الحفظ والاعتماد الفوري...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-emerald-200" />
                          <span>حفظ واعتماد المنشأة الطبية فورياً 🚀</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
