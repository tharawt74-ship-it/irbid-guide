import React, { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { 
  Stethoscope, 
  Building2, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  User, 
  Award, 
  FileText, 
  Heart, 
  Activity, 
  Pill, 
  Microscope, 
  Plus, 
  X, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle, 
  Flame, 
  Zap, 
  Accessibility, 
  DollarSign, 
  ExternalLink,
  Info,
  Calendar,
  Cpu,
  Car,
  Users,
  Trash2,
  Baby,
  Eye,
  EyeOff,
  CreditCard,
  Crown,
  Gift
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { applyNewBusinessWelcomeGift } from '../lib/vipHelper';
import { useAuth } from '../contexts/AuthContext';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { WorkingHoursEditor } from '../components/ui/WorkingHoursEditor';
import { SocialLinksEditor } from '../components/ui/SocialLinksEditor';
import { ImageUploader } from '../components/ui/ImageUploader';
import { RichTextEditor } from '../components/common/RichTextEditor';
import { SEO } from '../components/common/SEO';
import DOMPurify from 'dompurify';
import { compressAndSanitizeFirestorePayload } from '../lib/firestoreHelper';
import { IRBID_REGIONS_CATEGORIZED } from '../lib/categories';
import { 
  MEDICAL_SPECIALTIES, 
  FACILITY_TYPES, 
  MedicalSpecialty 
} from '../lib/medicalCategories';
import { 
  MedicalFacilityInfo, 
  MedicalProcedure, 
  MedicalEquipment,
  MedicalDoctor,
  MenuItem,
  WorkingHours, 
  SocialLinks, 
  Business 
} from '../types';
import { validateJordanianPhone, isEmergencyFacility } from '../lib/medicalHelper';
import { sanitizeInput, isBotSubmission, checkSubmissionRateLimit, recordSubmissionTime } from '../lib/security';
import { invalidateCache } from '../lib/dataCache';

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

const ToothIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M7 4C5.5 4 4 5.5 4 7.5C4 9.5 5 11 6.5 12C8 13 8 13.5 8 14.5V17C8 18.5 9 19.5 10 20C10.5 20 11 19.5 11 19V16C11 15 11.5 14.5 12 14.5C12.5 14.5 13 15 13 16V19C13 19.5 13.5 20 14 20C15 19.5 16 18.5 16 17V14.5C16 13.5 16 13 17.5 12C19 11 20 9.5 20 7.5C20 5.5 18.5 4 17 4C15.5 4 14.5 5.5 13.5 6.5C12.5 5.5 11.5 4 10 4C8.5 4 7.5 4 7 4Z" />
  </svg>
);

const getSpecIcon = (spec: any) => {
  if (spec.icon) return spec.icon;
  if (spec.iconName === 'Tooth' || spec.id === 'dentistry') return ToothIcon;
  const Icon = (LucideIcons as any)[spec.iconName];
  return Icon || LucideIcons.Stethoscope;
};

export function AddMedicalFacility() {
  const { currentUser, userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { medicalCategories } = useSystemSettings();

  // Stepper State: 1 = Basic Info & Specialty, 2 = Staff & Qualifications, 3 = Insurances & Services, 4 = Package Selection, 5 = Timings & Submit
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Facility Basic Info & Specialty
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

  // Staff & Specialization Details
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
  const [staffMemberBio, setStaffMemberBio] = useState('');

  const handleAddStaffMember = () => {
    if (!staffMemberName.trim()) return;
    const parsed = staffMemberDegrees.split(/[,،\n]/).map(d => d.trim()).filter(Boolean);
    const newDoc: MedicalDoctor = {
      name: staffMemberName.trim(),
      title: staffMemberTitle.trim() || (isPharmacy ? 'صيدلي ممارس' : isLab ? 'أخصائي تحاليل' : isHospital ? 'طبيب اختصاصي' : isRehab ? 'معالج فيزيائي' : 'طبيب اختصاصي'),
      degrees: parsed.length > 0 ? parsed : [isPharmacy ? 'بكالوريوس صيدلة' : isLab ? 'بكالوريوس تحاليل طبية' : isRehab ? 'بكالوريوس علاج طبيعي' : 'بورد اختصاص'],
      subspecialty: staffMemberSubspecialty.trim() || undefined,
      experienceYears: Number(staffMemberExp) || 5,
      bio: staffMemberBio.trim() || undefined
    };
    setAdditionalStaff(prev => [...prev, newDoc]);
    setStaffMemberName('');
    setStaffMemberTitle('');
    setStaffMemberDegrees('');
    setStaffMemberSubspecialty('');
    setStaffMemberExp('5');
    setStaffMemberBio('');
  };

  const handleRemoveStaffMember = (index: number) => {
    setAdditionalStaff(prev => prev.filter((_, idx) => idx !== index));
  };

  // Medical Services & Insurances
  const [selectedInsurances, setSelectedInsurances] = useState<string[]>([]);
  const [customInsuranceInput, setCustomInsuranceInput] = useState('');
  const [proceduresList, setProceduresList] = useState<{ name: string; price?: string }[]>([]);
  const [newProcedureInput, setNewProcedureInput] = useState('');
  const [newProcedurePrice, setNewProcedurePrice] = useState('');
  const [hasEmergency24h, setHasEmergency24h] = useState(false);
  const [hasWheelchairAccess, setHasWheelchairAccess] = useState(true);
  const [hasElevator, setHasElevator] = useState(true);
  const [hasValetOrParking, setHasValetOrParking] = useState(true);
  const [hasFemaleStaff, setHasFemaleStaff] = useState(true);
  const [hasKidsArea, setHasKidsArea] = useState(false);
  const [hasElectronicPayment, setHasElectronicPayment] = useState(true);
  const [consultationFee, setConsultationFee] = useState('15 - 25 د.أ');
  const [followUpPolicy, setFollowUpPolicy] = useState('المراجعة مجانية خلال 14 يوماً من تاريخ الكشف');
  const [appointmentType, setAppointmentType] = useState<'phone_first' | 'walk_in' | 'both'>('phone_first');

  // Equipment & Technology Customization (Step 4)
  const [showEquipments, setShowEquipments] = useState(true);
  const [equipmentsList, setEquipmentsList] = useState<MedicalEquipment[]>([]);
  const [newEquipmentName, setNewEquipmentName] = useState('');
  const [newEquipmentBrand, setNewEquipmentBrand] = useState('');
  const [newEquipmentDesc, setNewEquipmentDesc] = useState('');

  // Accessibility & Amenities Customization (Step 4)
  const [showAmenities, setShowAmenities] = useState(true);

  // Working Hours & Socials
  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    days: 'السبت - الخميس',
    openTime: '09:00',
    closeTime: '19:00',
    isOpen24Hours: false,
    isCustomClosed: false
  });
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    facebook: '',
    instagram: '',
    website: ''
  });

  // Package Plan Selection
  const [selectedPackagePlan, setSelectedPackagePlan] = useState<'golden' | 'basic' | 'pay_per_use'>('golden');
  const [billingPeriod, setBillingPeriod] = useState<'yearly' | 'monthly'>('yearly');

  // Owner Account Linking (Step 5 golden input)
  const [ownerContact, setOwnerContact] = useState('');
  const [contactError, setContactError] = useState('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdFacilityId, setCreatedFacilityId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Active specialty object from shared list
  const activeSpecialtyObj = medicalCategories.find(s => s.id === mainSpecialty) || medicalCategories[0] || MEDICAL_SPECIALTIES[0];

  // Helper flags for dynamic entity field labels
  const isPharmacy = mainSpecialty === 'pharmacies';
  const isLab = mainSpecialty === 'laboratories';
  const isHospital = mainSpecialty === 'hospitals';
  const isRehab = mainSpecialty === 'rehab';
  const isDoctor = !isPharmacy && !isLab && !isHospital && !isRehab;

  // Sync facility type for compatibility
  const facilityType = isPharmacy 
    ? 'pharmacy' 
    : isLab 
    ? 'lab' 
    : isHospital 
    ? 'hospital' 
    : isRehab 
    ? 'physio' 
    : 'clinic';

  // Emergency eligibility (Hospitals & Comprehensive Centers, Pharmacies, Labs & Radiology)
  const isEmergencyEligible = isEmergencyFacility({ mainSpecialty, category: mainSpecialty, facilityType });

  // Initialize suggested subspecialties, equipment suggestions and title default when specialty changes
  useEffect(() => {
    if (activeSpecialtyObj) {
      const defaultSub = activeSpecialtyObj.subspecialties[0] || '';
      setSubSpecialty(defaultSub);
      setSelectedSubspecialties([defaultSub]);
      // Keep proceduresList empty by default - services are provided as clickable suggestions
      setProceduresList([]);
    }

    // Initialize default equipment suggestions based on specialty
    const suggestedEqs = SPECIALTY_EQUIPMENT_SUGGESTIONS[mainSpecialty] || SPECIALTY_EQUIPMENT_SUGGESTIONS['internal'] || [];
    setEquipmentsList(suggestedEqs);

    if (isPharmacy) {
      setProfessionalTitle('صيدلي قانوني مسؤول');
      setGender('team');
      setConsultationFee('مجاناً / حسب المستلزمات');
      setFollowUpPolicy('استشارة دوائية مجانية ممتدة');
    } else if (isLab) {
      setProfessionalTitle('أخصائي تحاليل طبية وأشعة');
      setGender('team');
      setConsultationFee('حسب أسعار النقابة (خصم خاص)');
      setFollowUpPolicy('إعادة الفحص ومراجعة النتيجة مجاناً عند اللزوم');
    } else if (isHospital) {
      setProfessionalTitle('مدير طبي للمستشفى');
      setGender('team');
      setConsultationFee('حسب القسم والطوارئ');
      setFollowUpPolicy('متابعة طبية شاملة وإقامة مجهزة');
    } else if (isRehab) {
      setProfessionalTitle('أخصائي علاج طبيعي وتأهيل');
      setGender('team');
      setConsultationFee('15 - 25 د.أ للجلسة');
      setFollowUpPolicy('تقييم مجاني للتقدم بعد الجلسات');
    } else {
      setProfessionalTitle('طبيب اختصاصي / استشاري');
      setConsultationFee('15 - 25 د.أ');
      setFollowUpPolicy('المراجعة مجانية خلال 14 يوماً من تاريخ الكشف');
    }
  }, [mainSpecialty]);

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

  // Handle Insurance Selection
  const toggleInsurance = (insName: string) => {
    setSelectedInsurances(prev => 
      prev.includes(insName) ? prev.filter(i => i !== insName) : [...prev, insName]
    );
  };

  const addCustomInsurance = () => {
    if (!customInsuranceInput.trim()) return;
    const clean = customInsuranceInput.trim();
    if (!selectedInsurances.includes(clean)) {
      setSelectedInsurances(prev => [...prev, clean]);
    }
    setCustomInsuranceInput('');
  };

  const addCustomProcedure = () => {
    if (!newProcedureInput.trim()) return;
    const cleanName = newProcedureInput.trim();
    const cleanPrice = newProcedurePrice.trim() || undefined;
    if (!proceduresList.some(p => p.name === cleanName)) {
      setProceduresList(prev => [...prev, { name: cleanName, price: cleanPrice }]);
    }
    setNewProcedureInput('');
    setNewProcedurePrice('');
  };

  const handleToggleSuggestedProcedure = (procName: string) => {
    if (proceduresList.some(p => p.name === procName)) {
      setProceduresList(prev => prev.filter(p => p.name !== procName));
    } else {
      setProceduresList(prev => [...prev, { name: procName, price: undefined }]);
    }
  };

  const handleAddAllSuggestedProcedures = () => {
    if (activeSpecialtyObj?.defaultProcedures) {
      const existingNames = new Set(proceduresList.map(p => p.name));
      const toAdd = activeSpecialtyObj.defaultProcedures
        .filter(name => !existingNames.has(name))
        .map(name => ({ name, price: undefined }));
      setProceduresList(prev => [...prev, ...toAdd]);
    }
  };

  const handleUpdateProcedurePrice = (index: number, newPrice: string) => {
    setProceduresList(prev => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], price: newPrice };
      }
      return copy;
    });
  };

  const removeProcedure = (identifier: number | string) => {
    if (typeof identifier === 'number') {
      setProceduresList(prev => prev.filter((_, idx) => idx !== identifier));
    } else {
      setProceduresList(prev => prev.filter(p => p.name !== identifier));
    }
  };

  // Equipment helpers (Step 4 Customization)
  const addCustomEquipment = () => {
    if (!newEquipmentName.trim()) return;
    const item: MedicalEquipment = {
      name: newEquipmentName.trim(),
      brandOrOrigin: newEquipmentBrand.trim() || undefined,
      description: newEquipmentDesc.trim() || undefined
    };
    setEquipmentsList(prev => [...prev, item]);
    setNewEquipmentName('');
    setNewEquipmentBrand('');
    setNewEquipmentDesc('');
  };

  const removeEquipment = (index: number) => {
    setEquipmentsList(prev => prev.filter((_, i) => i !== index));
  };

  const addPresetEquipment = (eq: MedicalEquipment) => {
    if (!equipmentsList.some(e => e.name === eq.name)) {
      setEquipmentsList(prev => [...prev, eq]);
    }
  };

  // Step Validation
  const validateStep = (stepNumber: number): boolean => {
    setErrorMessage('');
    if (stepNumber === 1) {
      if (!mainSpecialty) {
        setErrorMessage('يرجى اختيار الاختصاص الرئيسي للمنشأة الطبية.');
        return false;
      }
      if (!name.trim()) {
        setErrorMessage('يرجى إدخال اسم المنشأة الطبية أو العيادة.');
        return false;
      }
      if (!phone.trim()) {
        setErrorMessage('يرجى إدخال رقم هاتف العيادة أو المنشأة للتواصل.');
        return false;
      }
      if (!address.trim()) {
        setErrorMessage('يرجى إدخال العنوان الدقيق وموقع المنشأة في إربد.');
        return false;
      }
    } else if (stepNumber === 2) {
      if (isDoctor) {
        if (!doctorName.trim()) {
          setErrorMessage('يرجى إدخال اسم الطبيب المسؤول أو المشرف على العيادة.');
          return false;
        }
      }
    } else if (stepNumber === 4) {
      if (!selectedPackagePlan) {
        setErrorMessage('يرجى اختيار باقة الاشتراك المناسبة لمنشأتك الطبية.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => (Math.min(prev + 1, 5) as any));
      window.scrollTo({ top: 150, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => (Math.max(prev - 1, 1) as any));
    window.scrollTo({ top: 150, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2)) return;
    if (!agreedToTerms) {
      setErrorMessage('يرجى الموافقة على صحة البيانات الطبية والترخيص قبل الإرسال.');
      return;
    }

    // Anti-bot & Rate Limit Check
    if (isBotSubmission('')) {
      setErrorMessage('تم رفض الطلب لأسباب أمنية.');
      return;
    }
    const rateCheck = checkSubmissionRateLimit('add_medical_facility', 5);
    if (!rateCheck.allowed) {
      setErrorMessage(`يرجى الانتظار ${rateCheck.timeLeft} ثانية قبل إعادة المحاولة.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setContactError('');

    try {
      const contactVal = ownerContact.trim();
      let parsedOwnerEmail = '';
      let parsedOwnerPhone = '';

      if (contactVal) {
        if (contactVal.includes('@')) {
          parsedOwnerEmail = contactVal.toLowerCase();
        } else {
          const phoneCheck = validateJordanianPhone(contactVal);
          if (!phoneCheck.isValid) {
            setContactError(phoneCheck.message || 'يرجى إدخال بريد إلكتروني صحيح أو رقم هاتف أردني صحيح (مثال: 0791234567).');
            setIsSubmitting(false);
            return;
          }
          parsedOwnerPhone = contactVal.trim();
        }
      }

      const selectedSpecObj = medicalCategories.find(s => s.id === mainSpecialty) || medicalCategories[0] || MEDICAL_SPECIALTIES[0];
      const mainSpecialtyTitle = selectedSpecObj.name;
      const chosenSubCategory = selectedSubspecialties.length > 0 
        ? selectedSubspecialties.join('، ') 
        : (subSpecialty || (selectedSpecObj.subspecialties && selectedSpecObj.subspecialties[0]) || '');

      const parsedDegrees = degrees.split(/[,،\n]/).map(d => d.trim()).filter(Boolean);
      if (parsedDegrees.length === 0) {
        parsedDegrees.push('البورد الأردني التخصصي', 'عضو نقابة الأطباء الأردنية');
      }

      const formattedProcedures: MedicalProcedure[] = proceduresList.map((proc, idx) => ({
        id: `proc_${Date.now()}_${idx + 1}`,
        name: proc.name,
        price: proc.price?.trim() || undefined,
        category: mainSpecialtyTitle,
        isPopular: true
      }));

      // Automatically add consultation fee as a service card if set
      if (consultationFee && consultationFee.trim() && consultationFee.trim() !== '0') {
        const hasConsultInProcedures = formattedProcedures.some(p => 
          p.name.includes('كشف') || p.name.includes('معاين') || p.name.includes('استشار')
        );
        if (!hasConsultInProcedures) {
          const feeNumeric = consultationFee.replace(/[^0-9.-]/g, '');
          formattedProcedures.unshift({
            id: `proc_consultation_${Date.now()}`,
            name: isPharmacy 
              ? 'استشارة دوائية وصرف وصفات' 
              : isLab 
              ? 'فحص مخبري واستشارة تشخيصية' 
              : isRehab 
              ? 'كشفية وجلسة تقييم علاج طبيعي' 
              : isHospital 
              ? 'معاينة وكشفية طوارئ / عيادات' 
              : 'كشفية ومعاينة طبية بالعيادة',
            description: 'تشمل الفحص السريري والاستشارة الطبية المتخصصة',
            price: consultationFee || (feeNumeric ? Number(feeNumeric) : undefined),
            category: 'معاينات واستشارات',
            isPopular: true
          });
        }
      }

      const rawDescription = description?.trim();
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

      // Construct initial menu items for the Services & Prices tab
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
        userId: currentUser?.uid || '',
        ownerEmail: parsedOwnerEmail || currentUser?.email || '',
        ownerPhone: parsedOwnerPhone || undefined,
        ownerContact: contactVal || undefined,
        ownerName: doctorName ? sanitizeInput(doctorName) : sanitizeInput(name)
      };

      // If created by Admin with direct onboarding, auto-approve directly into 'businesses'
      const statusValue = isAdmin ? 'approved' : 'pending';

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
      let createdDocId = requestRef?.id || '';
      try {
        const sanitizedBizPayload = await compressAndSanitizeFirestorePayload({
          ...finalPayload,
          status: statusValue,
          requestId: requestRef?.id || ''
        }, false);
        const docRef = await addDoc(collection(db, 'businesses'), sanitizedBizPayload);
        createdDocId = docRef.id;
        setCreatedFacilityId(docRef.id);
      } catch (bizErr) {
        console.warn("Direct business record warning:", bizErr);
        if (requestRef?.id) {
          setCreatedFacilityId(requestRef.id);
          createdDocId = requestRef.id;
        } else {
          throw bizErr;
        }
      }

      recordSubmissionTime('add_medical_facility');
      invalidateCache();

      // Trigger custom events to notify listeners across the app
      window.dispatchEvent(new CustomEvent('medical-business-added', { detail: { id: createdDocId, name } }));

      setIsSuccess(true);
    } catch (err: any) {
      console.error("Error submitting medical facility request:", err);
      setErrorMessage(err.message || 'حدث خطأ أثناء إرسال طلب تسجيل المنشأة الطبية. يرجى التأكد من اتصال الإنترنت والمحاولة مجدداً.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfcfb] py-8 sm:py-12" dir="rtl">
      <SEO 
        title="تسجيل عيادة أو منشأة طبية | منصة شو في بإربد"
        description="انضم إلى قسم الرعاية الصحية في منصة شو في بإربد. وثّق عيادتك، مركزك الطبي، صيدليتك أو مختبرك واستقبل المرضى والمراجعين مباشرة."
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        
        {/* Top Breadcrumb & Back Link */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <Link
            to="/medical"
            className="inline-flex items-center gap-1.5 text-xs font-black text-stone-500 hover:text-stone-900 bg-white px-3.5 py-2 rounded-xl border border-stone-200 shadow-3xs transition-all hover:bg-stone-50"
          >
            <ArrowRight className="h-4 w-4" />
            <span>العودة لقسم الرعاية الطبية</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-50 text-[#1a4d2e] border border-emerald-200">
              دليل الرعاية الطبية والصحة
            </span>
          </div>
        </div>

        {/* Hero Card */}
        <div className="bg-gradient-to-br from-[#1a4d2e] via-[#133b22] to-teal-950 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden mb-8">
          <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-48 h-48 bg-[#ff9f1c]/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-200 text-xs font-bold border border-white/15">
                <Stethoscope className="h-3.5 w-3.5 text-emerald-300 animate-pulse" />
                <span>نموذج التسجيل الطبي المعتمد</span>
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-white">
                سجّل عيادتك أو منشأتك في منصة شو في بإربد 🩺
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 font-medium leading-relaxed">
                انضم الآن لمنظومة الرعاية الصحية المتكاملة في محافظة إربد. عرّف آلاف المرضى والمراجعين باختصاصك، أوقات دوامك، والتأمينات المعتمدة لديك.
              </p>
            </div>

            <div className="hidden md:flex flex-col items-center justify-center p-4 rounded-2xl bg-white/10 border border-white/15 text-center shrink-0 w-44">
              <ShieldCheck className="h-8 w-8 text-emerald-300 mb-1" />
              <span className="text-xs font-black text-white">مراجعة واعتماد الإدارة</span>
              <span className="text-[10px] text-emerald-200 font-bold mt-0.5">توثيق وتدقيق رسمي</span>
            </div>
          </div>
        </div>

        {/* SUCCESS SCREEN */}
        {isSuccess ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-emerald-200 shadow-xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner ring-8 ring-emerald-50">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <h2 className="text-2xl font-black text-stone-900">
                تم إرسال الطلب بنجاح! 📑
              </h2>
              <p className="text-sm text-stone-600 font-bold leading-relaxed">
                تم إرسال طلب تسجيل منشأة / عيادة <span className="text-[#1a4d2e] font-black">"{name}"</span> بنجاح. سيقوم فريق المنصة بمراجعة البيانات والترخيص والموافقة على إدراجها ونشرها في منصة شو في بإربد قريباً.
              </p>
            </div>

            <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl max-w-md mx-auto text-right space-y-2 text-xs font-bold text-emerald-900">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>تم إرسال كافة التفاصيل والتراخيص بنجاح</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>الطلب قيد المراجعة والاعتماد لدى إدارة المنصة (Pending Approval)</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>سيتم نشر وتفعيل الصفحة فور استكمال الاعتماد والمراجعة</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link
                to="/medical"
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#1a4d2e] hover:bg-[#143d24] text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>الانتقال لقسم المنشآت الطبية</span>
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <Link
                to="/"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-black text-sm transition-all"
              >
                العودة للرئيسية
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm overflow-hidden">
            
            {/* Multi-step Header Stepper */}
            <div className="bg-stone-50/80 border-b border-stone-200/80 p-4 sm:p-6">
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2 text-center">
                {[
                  { step: 1, title: 'هوية المنشأة', icon: Building2 },
                  { step: 2, title: isDoctor ? 'الطبيب والاختصاص' : isPharmacy ? 'الصيدلي والكوادر' : 'الكوادر والاختصاص', icon: Stethoscope },
                  { step: 3, title: isPharmacy ? 'التأمينات والأدوية' : 'التأمينات والخدمات', icon: ShieldCheck },
                  { step: 4, title: 'باقة الاشتراك', icon: Crown },
                  { step: 5, title: isPharmacy ? 'أوقات الدوام والإرسال' : 'المواعيد والإرسال', icon: Clock }
                ].map(item => {
                  const Icon = item.icon;
                  const isActive = currentStep === item.step;
                  const isPassed = currentStep > item.step;

                  return (
                    <button
                      key={item.step}
                      type="button"
                      onClick={() => {
                        if (item.step < currentStep || validateStep(currentStep)) {
                          setCurrentStep(item.step as any);
                        }
                      }}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all ${
                        isActive 
                          ? 'bg-emerald-50 text-[#1a4d2e] font-black border border-emerald-300 shadow-3xs' 
                          : isPassed 
                          ? 'text-emerald-700 font-bold opacity-90'
                          : 'text-stone-400 font-bold opacity-60'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs transition-colors ${
                        isActive 
                          ? 'bg-[#1a4d2e] text-white shadow-xs' 
                          : isPassed 
                          ? 'bg-emerald-200 text-emerald-900' 
                          : 'bg-stone-200 text-stone-600'
                      }`}>
                        {isPassed ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </div>
                      <span className="text-[11px] sm:text-xs tracking-tight line-clamp-1">
                        {item.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error Message Box */}
            {errorMessage && (
              <div className="mx-6 mt-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-black flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">

              {/* STEP 1: PRIMARY SPECIALTY & BASIC INFORMATION */}
              {currentStep === 1 && (
                <div className="space-y-8 animate-in fade-in duration-200">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-[#1a4d2e]" />
                      <span>المرحلة الأولى: الاختصاص الرئيسي، التصنيفات الفرعية وهويّة المنشأة</span>
                    </h3>
                    <p className="text-xs text-stone-500 font-bold mt-1">
                      اختر الاختصاص الرئيسي لمنشأتك الطبية من بين الاختصاصات الـ 11 المعتمدة بدليل إربد الطبي، ثم حدد التخصصات الدقيقة والبيانات الأساسية.
                    </p>
                  </div>

                  {/* 1. Primary Specialty Selection (11 Core Specialties) */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4 text-[#ff9f1c]" />
                        <span>1. الاختصاص الطبي الرئيسي (اختر من الـ 11 قسم رئيسي) *</span>
                      </label>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        القسم المختار: {activeSpecialtyObj.name}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {medicalCategories.filter(s => s.active !== false).map(spec => {
                        const IconComponent = getSpecIcon(spec);
                        const isSelected = mainSpecialty === spec.id;
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
                                  {(spec.subspecialties || []).length} تخصصات
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

                  {/* 2. Subspecialties / Categories Picker for Chosen Specialty */}
                  <div className="space-y-3 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 sm:p-5">
                    <div className="space-y-1">
                      <label className="text-xs font-black text-emerald-950 flex items-center justify-between">
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
                      {activeSpecialtyObj.subspecialties.map(sub => {
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

                  {/* 3. Basic Facility Info & Contact */}
                  <div className="space-y-4 pt-2 border-t border-stone-200/80">
                    <div className="text-xs font-black text-stone-900">
                      3. البيانات الأساسية والعنوان في إربد *
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-stone-800">
                          {isPharmacy 
                            ? 'اسم الصيدلية *' 
                            : isLab 
                            ? 'اسم المختبر / مركز الأشعة *' 
                            : isHospital 
                            ? 'اسم المستشفى / المركز الشامل *' 
                            : isRehab 
                            ? 'اسم مركز العلاج الطبيعي والتأهيل *' 
                            : 'اسم العيادة / الطبيب *'}
                        </label>
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={e => setName(e.target.value)}
                          placeholder={
                            isPharmacy 
                              ? 'مثال: صيدلية الفارابي المناوبة 24 ساعة' 
                              : isLab 
                              ? 'مثال: مختبرات مدلاب التخصصية' 
                              : isHospital 
                              ? 'مثال: مستشفى إربد التخصصي' 
                              : isRehab 
                              ? 'مثال: مركز الفيزيو للتأهيل الحركي' 
                              : 'مثال: عيادة الدكتور حسام الشناق لأمراض القلب'
                          }
                          className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-stone-800">
                          رقم الهاتف الأرضي أو الخلوي للحجز والاتصال *
                        </label>
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          placeholder="079XXXXXXX (خلوي) أو 027XXXXXX (أرضي إربد)"
                          className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 ${
                            phone.trim() && !validateJordanianPhone(phone).isValid
                              ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                              : 'border-stone-200 focus:ring-emerald-500/20 focus:border-emerald-500'
                          }`}
                        />
                        {phone.trim() !== '' && (
                          <div className={`text-[11px] font-bold flex items-center gap-1.5 mt-1 ${
                            validateJordanianPhone(phone).isValid ? 'text-emerald-700' : 'text-red-600'
                          }`}>
                            {validateJordanianPhone(phone).isValid ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span>رقم أردني صالح معتمد (خلوي أو أرضي في إربد) ✓</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                <span>رقم غير صالح. استخدم خلوي (079/078/077) أو أرضي إربد (02XXXXXXX)</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* District & Exact Address */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-stone-800">المنطقة / الحي في إربد *</label>
                        <select
                          value={district}
                          onChange={e => setDistrict(e.target.value)}
                          className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        >
                          {IRBID_REGIONS_CATEGORIZED.map(group => (
                            <optgroup key={group.groupName} label={group.groupName}>
                              {group.areas.map(r => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-stone-800">
                          العنوان التفصيلي واسم المجمع *
                        </label>
                        <input
                          type="text"
                          required
                          value={address}
                          onChange={e => setAddress(e.target.value)}
                          placeholder="شارع الجامعة، مجمع الزهراء الطبي، الطابق الثالث"
                          className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* WhatsApp & Emergency Numbers */}
                    <div className={`grid grid-cols-1 ${isEmergencyEligible ? 'sm:grid-cols-2' : ''} gap-4`}>
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-stone-800">
                          {isPharmacy ? 'رقم الواتساب للاستفسارات وطلبات الأدوية' : 'رقم الواتساب للاستفسارات والمواعيد'}
                        </label>
                        <input
                          type="tel"
                          value={whatsapp}
                          onChange={e => setWhatsapp(e.target.value)}
                          placeholder="079XXXXXXX أو 96279XXXXXXX"
                          className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 ${
                            whatsapp.trim() && !validateJordanianPhone(whatsapp).isValid
                              ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                              : 'border-stone-200 focus:ring-emerald-500/20 focus:border-emerald-500'
                          }`}
                        />
                        {whatsapp.trim() !== '' && (
                          <div className={`text-[11px] font-bold flex items-center gap-1.5 mt-1 ${
                            validateJordanianPhone(whatsapp).isValid ? 'text-emerald-700' : 'text-red-600'
                          }`}>
                            {validateJordanianPhone(whatsapp).isValid ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                <span>رقم واتساب أردني صحيح ✓</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                <span>رقم غير صالح للتأكيد عبر الواتساب</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      {isEmergencyEligible && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-stone-800">رقم الطوارئ والاتصال العاجل (اختياري)</label>
                          <input
                            type="tel"
                            value={emergencyPhone}
                            onChange={e => setEmergencyPhone(e.target.value)}
                            placeholder="078XXXXXXX أو 027XXXXXX"
                            className={`w-full bg-white border rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 ${
                              emergencyPhone.trim() && !validateJordanianPhone(emergencyPhone).isValid
                                ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                                : 'border-stone-200 focus:ring-emerald-500/20 focus:border-emerald-500'
                            }`}
                          />
                          {emergencyPhone.trim() !== '' && (
                            <div className={`text-[11px] font-bold flex items-center gap-1.5 mt-1 ${
                              validateJordanianPhone(emergencyPhone).isValid ? 'text-emerald-700' : 'text-red-600'
                            }`}>
                              {validateJordanianPhone(emergencyPhone).isValid ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                                  <span>رقم طوارئ أردني صالح ✓</span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                                  <span>رقم طوارئ غير صالح</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Google Maps Link & Image */}
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-stone-800">رابط موقع المنشأة على خرائط جوجل (Google Maps)</label>
                        <input
                          type="url"
                          value={googlePlaceUrl}
                          onChange={e => setGooglePlaceUrl(e.target.value)}
                          placeholder="https://maps.app.goo.gl/..."
                          className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-black text-stone-800">صورة الواجهة أو شعار المنشأة الطبية</label>
                        <ImageUploader
                          value={imageUrl}
                          onChange={setImageUrl}
                          label="صورة الواجهة أو الشعار الطبي"
                          folder="medical_facilities"
                        />
                      </div>
                    </div>

                    {/* About Facility / RichTextEditor */}
                    <div className="space-y-2 pt-2 border-t border-stone-200/80">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                          <Building2 className="h-4 w-4 text-emerald-700" />
                          <span>
                            {isPharmacy 
                              ? 'عن الصيدلية: نبذة تعريفية والخدمات الدوائية' 
                              : isLab 
                              ? 'عن المختبر / المركز: نبذة تعريفية والخدمات التشخيصية' 
                              : isHospital 
                              ? 'عن المستشفى / المجمع: نبذة تعريفية ورؤية الرعاية الصحية' 
                              : isRehab 
                              ? 'عن المركز: نبذة تعريفية وخدمات العلاج الطبيعي والتأهيل' 
                              : 'عن العيادة / المنشأة: نبذة تعريفية والخدمات الطبية'}
                          </span>
                        </label>
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/70">
                          نص منسق وتظليل ملون
                        </span>
                      </div>
                      
                      <RichTextEditor
                        value={description}
                        onChange={val => setDescription(val)}
                        placeholder={
                          isPharmacy 
                            ? 'اكتب نبذة تعريفية منسقة عن الصيدلية، الأدوية والمستلزمات المتوفرة، والخدمات والاستشارات الدوائية...' 
                            : isLab 
                            ? 'اكتب نبذة تعريفية عن المختبر والتحاليل الدقيقة، الأجهزة والتقنيات التشخيصية المتطورة...' 
                            : isHospital 
                            ? 'اكتب نبذة تعريفية شاملة عن المستشفى، الأقسام الطبية، غرف العمليات، وجاهزية الطوارئ...' 
                            : isRehab 
                            ? 'اكتب نبذة تعريفية عن مركز العلاج الطبيعي، برامج التأهيل الحركي وما بعد العمليات، وأحدث الأجهزة...' 
                            : 'اكتب نبذة تعريفية عن المنشأة والعيادة، التخصصات والخبرات الطبية، والرعاية الصحية المقدمة...'
                        }
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: STAFF & QUALIFICATIONS (DYNAMICALLY TAILORED) */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                      <Stethoscope className="h-5 w-5 text-[#1a4d2e]" />
                      <span>
                        {isPharmacy 
                          ? 'المرحلة الثانية: الصيدلي المسؤول والاعتمادات والخدمات الدوائية' 
                          : isLab 
                          ? 'المرحلة الثانية: أخصائي المختبر والاعتمادات التشخيصية' 
                          : isHospital 
                          ? 'المرحلة الثانية: الإدارة الطبية والاعتمادات المؤسسية' 
                          : isRehab 
                          ? 'المرحلة الثانية: المعالج المسؤول ومؤهلات التأهيل' 
                          : 'المرحلة الثانية: الطبيب المسؤول والدرجة العلمية والمؤهلات'}
                      </span>
                    </h3>
                    <p className="text-xs text-stone-500 font-bold mt-1">
                      {isPharmacy 
                        ? 'أدخل بيانات الصيدلي القانوني المسؤول والترخيص الدوائي والنبيذة التعريفية وتخصيص الكادر.' 
                        : isLab 
                        ? 'أدخل بيانات الأخصائي المسؤول عن فحص التحاليل والتصوير الشعاعي والاعتمادات والكادر.' 
                        : isHospital 
                        ? 'أدخل بيانات المدير الطبي أو الإدارة المسؤولة عن المستشفى / المجمع وتراخيص التشغيل والكوادر.' 
                        : isRehab 
                        ? 'أدخل بيانات المعالج الفيزيائي أو أخصائي التأهيل المشرف وخبراته وكوادره.' 
                        : 'أدخل مؤهلات الطبيب، الدرجة الأكاديمية، رقم الترخيص، وسنوات الخبرة العملية.'}
                    </p>
                  </div>

                  {/* Name of Responsible Officer & Professional Title */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-stone-800">
                        {isPharmacy 
                          ? 'اسم الصيدلي المسؤول / المدير الفني للصيدلية' 
                          : isLab 
                          ? 'اسم أخصائي المختبر / الأخصائي المسؤول' 
                          : isHospital 
                          ? 'اسم المدير الطبي / الإدارة المسؤولة' 
                          : isRehab 
                          ? 'اسم المعالج / الأخصائي المسؤول' 
                          : 'اسم الطبيب / الأخصائي المسؤول *'}
                      </label>
                      <input
                        type="text"
                        value={doctorName}
                        onChange={e => setDoctorName(e.target.value)}
                        placeholder={
                          isPharmacy 
                            ? 'صيدلي قانوني أحمد الروسان' 
                            : isLab 
                            ? 'أخصائي تحاليل محمد الروسان' 
                            : isHospital 
                            ? 'د. عبد الله الروسان - المدير الطبي' 
                            : isRehab 
                            ? 'أخصائي علاج طبيعي خالد الروسان' 
                            : 'د. أحمد مصطفى الروسان'
                        }
                        className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-stone-800">
                        {isPharmacy 
                          ? 'المسمى والدرجة الدوائية' 
                          : isLab 
                          ? 'المسمى والدرجة المختبرية' 
                          : isHospital 
                          ? 'المسمى الإداري والطبي' 
                          : 'المسمى والدرجة المهنية'}
                      </label>
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
                        {isPharmacy 
                          ? 'الشهادات والترخيص الدوائي' 
                          : isLab 
                          ? 'الشهادات والاعتمادات المختبرية' 
                          : isHospital 
                          ? 'الاعتمادات والموافقات الرسمية' 
                          : isRehab 
                          ? 'الشهادات والتأهيل المهني' 
                          : 'الشهادات والبورد العلمي (مفصولة بفواصل)'}
                      </label>
                      <input
                        type="text"
                        value={degrees}
                        onChange={e => setDegrees(e.target.value)}
                        placeholder={
                          isPharmacy 
                            ? 'بكالوريوس صيدلة، ترخيص نقابة الصيدليين، PharmD' 
                            : isLab 
                            ? 'ماجستير تحاليل طبية، بورد باثولوجي، ترخيص وزارة الصحة' 
                            : isHospital 
                            ? 'ترخيص وزارة الصحة، اعتماد المؤسسات الصحية HCAC' 
                            : isRehab 
                            ? 'بكالوريوس علاج طبيعي، دبلوم تأهيل إصابات ملاعب' 
                            : 'البورد الأردني، زمالة الكلية الملكية، بورد عربي'
                        }
                        className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-stone-800">
                        {isPharmacy 
                          ? 'رقم ترخيص الصيدلية / مزاولة المهنة' 
                          : isLab 
                          ? 'رقم ترخيص المختبر / مزاولة المهنة' 
                          : isHospital 
                          ? 'رقم الترخيص الطبي الرسمي للمستشفى / المجمع' 
                          : 'رقم ترخيص مزاولة المهنة (وزارة الصحة / النقابة)'}
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

                  {/* Experience & Doctor Gender (Gender shown ONLY for Clinics/Doctors) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-stone-800">
                        {isPharmacy 
                          ? 'سنوات الخبرة للصيدلية / الصيدلي المسؤول' 
                          : isLab 
                          ? 'سنوات الخبرة للمختبر / الكادر' 
                          : isHospital 
                          ? 'سنوات الخبرة والتشغيل للمستشفى / المجمع' 
                          : isRehab 
                          ? 'سنوات الخبرة في العلاج الطبيعي والتأهيل' 
                          : 'سنوات الخبرة العملية للطبيب'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={experienceYears}
                        onChange={e => setExperienceYears(e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>

                    {/* Render Gender Selector ONLY for Doctor Clinics */}
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

                    {/* Show/Hide Staff Tab Toggle inside the box */}
                    <div className="p-4 bg-white rounded-xl border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-3xs">
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0">
                          <Users className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="text-xs font-black text-stone-900">
                              {isPharmacy ? 'إظهار تاب وقسم الكادر الصيدلاني في صفحة الصيدلية' : 'إظهار تاب وقسم الكادر الطبي في صفحة المنشأة'}
                            </h5>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              showMedicalStaff ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-700'
                            }`}>
                              {showMedicalStaff ? 'مفعّل ومعروض' : 'مخفي'}
                            </span>
                          </div>
                          <p className="text-[11px] text-stone-600 font-medium mt-0.5">
                            {isPharmacy 
                              ? 'يتيح للمراجعين استعراض فريق الصيادلة ومؤهلاتهم والشهادات والخبرات في تاب مخصص.' 
                              : 'يتيح للمرضى والزوار استعراض كافة الأطباء والاستشاريين والاختصاصات والخبرات في تاب مخصص.'}
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
                                    {staff.degrees && (
                                      <p className="text-[10px] text-emerald-700 font-medium truncate">
                                        {Array.isArray(staff.degrees) ? staff.degrees.join('، ') : staff.degrees}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStaffMember(idx)}
                                  className="p-2 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
                                  title="حذف العضو"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Form to add a new staff member */}
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
                                placeholder={isPharmacy ? 'صيدلي محمد العلي' : isLab ? 'أخصائي تحاليل أنس القضاة' : 'د. طارق الروسان'}
                                className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-xs font-bold text-stone-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-stone-600 block mb-1">المسمى المهني / الرتبة</label>
                              <input
                                type="text"
                                value={staffMemberTitle}
                                onChange={e => setStaffMemberTitle(e.target.value)}
                                placeholder={isPharmacy ? 'صيدلي سريري أول' : isLab ? 'أخصائي كيمياء حيوية' : isRehab ? 'معالج فيزيائي وتأهيل' : 'استشاري جراحة العظام'}
                                className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-xs font-bold text-stone-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2">
                              <label className="text-[11px] font-bold text-stone-600 block mb-1">الشهادات والبورد العلمي (مفصولة بفواصل)</label>
                              <input
                                type="text"
                                value={staffMemberDegrees}
                                onChange={e => setStaffMemberDegrees(e.target.value)}
                                placeholder={isPharmacy ? 'PharmD، ماجستير صيدلة سريرية' : 'البورد الأردني، زمالة الكلية الملكية'}
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
                            <label className="text-[11px] font-bold text-stone-600 block mb-1">التخصص الدقيق / المهام</label>
                            <input
                              type="text"
                              value={staffMemberSubspecialty}
                              onChange={e => setStaffMemberSubspecialty(e.target.value)}
                              placeholder={isPharmacy ? 'الاستشارات الدوائية والتركيبات' : 'قسطرة القلب والشرايين التداخلية'}
                              className="w-full bg-stone-50 border border-stone-200 rounded-lg p-2.5 text-xs font-bold text-stone-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={handleAddStaffMember}
                              disabled={!staffMemberName.trim()}
                              className="px-4 py-2 bg-[#1a4d2e] hover:bg-[#143d24] disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
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

              {/* STEP 3: INSURANCES & PROCEDURES / SERVICES */}
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
                        className="px-3.5 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-black transition-colors shrink-0"
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
                        <span>
                          {isPharmacy 
                            ? 'الخدمات والمستلزمات الدوائية المتاحة بالصيدلية' 
                            : isLab 
                            ? 'الفحوصات والأشعة التشخيصية المتاحة بالمختبر' 
                            : isHospital 
                            ? 'الأقسام والخدمات الطبية المتاحة بالمستشفى' 
                            : isRehab 
                            ? 'جلسات وخدمات العلاج الطبيعي والتأهيل' 
                            : 'الخدمات والإجراءات الطبية المتاحة بالعيادة'}
                        </span>
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
                            className="p-3 rounded-xl bg-white border border-stone-200 hover:border-emerald-300 transition-all flex items-center justify-between gap-2.5 shadow-3xs group"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100/80">
                                <Activity className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-xs font-black text-stone-900 truncate" title={proc.name}>
                                {proc.name}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="relative">
                                <input
                                  type="text"
                                  value={proc.price || ''}
                                  onChange={e => handleUpdateProcedurePrice(idx, e.target.value)}
                                  placeholder="السعر (اختياري)"
                                  className="w-24 sm:w-28 text-[11px] font-bold text-emerald-900 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all placeholder:text-stone-400 placeholder:font-normal"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeProcedure(idx)}
                                className="p-1 hover:bg-red-50 text-stone-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer"
                                title="حذف الخدمة"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-3.5 px-4 bg-white rounded-xl border border-dashed border-stone-300 text-stone-500 text-xs font-bold">
                        لم تقم بإضافة أي خدمات أو إجراءات بعد. يمكنك النقر على أي من الاقتراحات السريعة أدناه لإضافتها فوراً، أو كتابة خدمة مخصصة بالأسفل مع تسعيرها (اختياري).
                      </div>
                    )}

                    {/* Quick Suggestions for Selected Specialty */}
                    {activeSpecialtyObj?.defaultProcedures && activeSpecialtyObj.defaultProcedures.length > 0 && (
                      <div className="pt-2 border-t border-stone-200/70 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-stone-700 flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            <span>اقتراحات سريعة للاختصاص (انقر لإضافة الخدمة مباشرة):</span>
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
                                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300 font-black shadow-3xs'
                                    : 'bg-white text-stone-700 border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/40 font-bold'
                                }`}
                              >
                                {isAdded ? (
                                  <>
                                    <Check className="h-3 w-3 text-emerald-700 shrink-0" />
                                    <span>{sug}</span>
                                    <span className="text-[10px] text-emerald-700 opacity-80">(مُضافة)</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="h-3 w-3 text-stone-400 shrink-0" />
                                    <span>{sug}</span>
                                  </>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Add Custom Procedure Input with Optional Price Field */}
                    <div className="pt-2 border-t border-stone-200/60 space-y-2">
                      <label className="text-[11px] font-black text-stone-700 flex items-center gap-1">
                        <span>إضافة خدمة أو إجراء طبي مخصص:</span>
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        <div className="sm:col-span-7">
                          <input
                            type="text"
                            value={newProcedureInput}
                            onChange={e => setNewProcedureInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomProcedure())}
                            placeholder={
                              isPharmacy 
                                ? 'اسم الخدمة (مثل: تركيب أدوية، قياس سكر، توصيل)...' 
                                : isLab 
                                ? 'اسم الفحص أو الأشعة (مثل: فيتامين د، فحص وظائف كلى)...' 
                                : isHospital 
                                ? 'اسم القسم أو الخدمة (مثل: طوارئ، عناية مركزة)...' 
                                : isRehab 
                                ? 'اسم جلسة التأهيل (مثل: علاج بالليزر البارد)...' 
                                : 'اسم الخدمة أو الإجراء (مثل: تخطيط قلب، تنظيف أسنان)...'
                            }
                            className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            value={newProcedurePrice}
                            onChange={e => setNewProcedurePrice(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomProcedure())}
                            placeholder="السعر (اختياري - مثلاً: 20 د.أ)"
                            className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-stone-400 placeholder:font-normal"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <button
                            type="button"
                            onClick={addCustomProcedure}
                            disabled={!newProcedureInput.trim()}
                            className="w-full h-full min-h-[38px] px-3.5 py-2 bg-[#1a4d2e] hover:bg-[#143e24] disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black transition-colors shrink-0 cursor-pointer flex items-center justify-center gap-1 shadow-3xs"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>إضافة</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Consultation / Service Fee */}
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
                      <label className="text-xs font-bold text-stone-800">
                        {isPharmacy 
                          ? 'رسوم التوصيل أو خدمة الاستشارة (إن وجد)' 
                          : isLab 
                          ? 'رسوم الفحص / التحليل التقريبية' 
                          : 'رسوم الكشف / المعاينة التقريبية'}
                      </label>
                      <input
                        type="text"
                        value={consultationFee}
                        onChange={e => setConsultationFee(e.target.value)}
                        placeholder={
                          isPharmacy 
                            ? 'مثال: مجاني أو 1.5 د.أ للخدمات المنزلية' 
                            : isLab 
                            ? 'مثال: حسب قائمة أسعار النقابة / وزارة الصحة' 
                            : 'مثال: 15 د.أ أو (حسب تسعيرة النقابة)'
                        }
                        className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>

                    <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl flex items-start gap-2 text-xs font-bold text-emerald-900 leading-relaxed">
                      <Sparkles className="h-4 w-4 text-emerald-700 shrink-0 mt-0.5" />
                      <span>
                        💡 <strong>ملاحظة تسعير الخدمات:</strong> عند تحديد رسوم الكشف/المعاينة أعلاه، ستنزل وتتواجد تلقائياً كبطاقة خدمة معتمدة في تاب "الخدمات والأسعار" للمنشأة الطبية.
                      </span>
                    </div>
                  </div>

                  {/* Appointment System Selector (Hidden for Pharmacies) */}
                  {!isPharmacy && (
                    <div className="space-y-3 bg-stone-50 border border-stone-200/80 rounded-2xl p-4 sm:p-5">
                      <label className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-[#1a4d2e]" />
                        <span>نظام وطريقة استقبال المراجعين والمواعيد *</span>
                      </label>
                      <p className="text-[11px] text-stone-500 font-bold">
                        حدد النمط الذي تعتمده المنشأة لتنسيق استقبال المراجعين في إربد:
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        {[
                          { 
                            id: 'phone_first', 
                            title: 'حجز مسبق (هاتف / واتساب)', 
                            desc: 'يتطلب حجز وتنسيق الموعد مسبقاً لتجنب فترات الانتظار',
                            icon: Phone 
                          },
                          { 
                            id: 'walk_in', 
                            title: 'أسبقية الحضور والدور المباشر', 
                            desc: 'استقبال المراجعين فور وصولهم حسب الدور المباشر بدون حجز',
                            icon: Clock 
                          },
                          { 
                            id: 'both', 
                            title: 'حجز مسبق أو دور مباشر', 
                            desc: 'متاح بالحالتين (حجز مسبق أو الدخول المباشر حسب الدور)',
                            icon: CheckCircle2 
                          }
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
                              <div className="text-[10px] text-stone-500 font-medium leading-relaxed">{opt.desc}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* End of Step 3 */}
                </div>
              )}

              {/* STEP 4: PACKAGE PLAN SELECTION */}
              {currentStep === 4 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-200">
                    <div className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-[#ff9f1c]" />
                      <h3 className="text-base sm:text-lg font-black text-stone-900">
                        المرحلة الرابعة: اختر باقة الاشتراك لمنشأتك الطبية
                      </h3>
                    </div>
                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full border border-emerald-200">
                      شهر مجاني تجريبي لـ VIP 🎁
                    </span>
                  </div>

                  {/* Billing Period Selector */}
                  <div className="flex flex-col items-center justify-center p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
                    <span className="text-xs font-black text-stone-700">دورة الدفع للباقات المدفوعة:</span>
                    <div className="bg-stone-200/90 p-1 rounded-xl inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => setBillingPeriod('monthly')}
                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
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
                        className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                          billingPeriod === 'yearly'
                            ? 'bg-[#ff9f1c] text-white shadow-xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        <span>الدفع السنوي (الافتراضي)</span>
                        <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
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
                        <p className="text-[11px] text-stone-500 leading-relaxed font-medium">
                          التواجد والتعريف الطبي الأساسي لمرضى ومراجعي إربد
                        </p>

                        <div className="py-3 px-4 bg-stone-50 rounded-xl border border-stone-200/60 text-center">
                          <div className="text-lg font-black text-[#1a4d2e] flex items-baseline justify-center gap-1">
                            <span className="text-xl">سعر رمزي جداً</span>
                          </div>
                          <div className="text-[10px] text-stone-500 font-bold mt-1">
                            / تفعيل للأبد
                          </div>
                        </div>

                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex gap-2 items-start mt-2">
                          <Gift className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-[10px] font-black text-emerald-900">تفعيل دائم مع هدية انضمام</div>
                            <div className="text-[9px] text-emerald-700 font-bold mt-0.5 leading-tight">شهر مجاني تجريبي لباقة الـ VIP للمنشآت المضافة جديد لأول مرة على موقع شو في بإربد!</div>
                          </div>
                        </div>

                        <ul className="space-y-2.5 pt-1">
                          {[
                            'بطاقة تعريفية رقمية متكاملة (الاسم، اللقب العلمي، والتخصص الرئيسي)',
                            'أرقام هواتف العيادة ورابط الواتساب الرسمي المباشر للاستفسارات السريعة',
                            'الموقع الجغرافي الدقيق على خرائط Google Maps مع اسم المجمع والطابق',
                            'جدول أوقات ومواعيد الدوام الأسبوعي مع مؤشر الحالة المباشر (مفتوح / مغلق)',
                            'إبراز خدمات الطوارئ والمناوبة 24 ساعة (للصيدليات، المستشفيات، والمراكز)',
                            'استقبال وعرض تقييمات وتجارب المراجعين الحقيقية الموثقة',
                            'إدراج العيادة في محرك البحث الطبي والتصنيفات الجغرافية في إربد'
                          ].map((f, fIdx) => (
                            <li key={fIdx} className="flex items-start gap-2 text-[10px] sm:text-[11px] text-stone-600 font-medium leading-relaxed">
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
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-black text-[9px] px-3.5 py-1 rounded-b-xl uppercase tracking-wider flex items-center justify-center gap-1 shadow-xs w-max max-w-[90%]">
                        <Crown className="h-3 w-3 text-amber-300" />
                        <span>الخيار الأكثر ثقة واعتماداً للعيادات والمراكز المتميزة</span>
                      </div>

                      <div className="space-y-4 pt-3">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-black text-base text-emerald-950 flex items-center gap-1.5">
                            <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
                            الباقة الذهبية الطبية VIP
                          </span>
                          {selectedPackagePlan === 'golden' && (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-emerald-800/80 leading-relaxed font-bold">
                          العيادة الرقمية المتكاملة 👑
                        </p>

                        <div className="py-3 px-4 bg-emerald-50/80 rounded-xl border border-emerald-200/80 text-center">
                          <div className="text-lg font-black text-emerald-950">
                            {billingPeriod === 'yearly' ? '9.9 د.أ / شهرياً' : '19 د.أ / شهرياً'}
                          </div>
                          <div className="text-[10px] text-emerald-800 font-bold mt-0.5">
                            {billingPeriod === 'yearly'
                              ? 'بالدفع السنوي (ما يعادل 119 د.أ فقط كاملة - توفير 109 د.أ سنوياً!) 🔥'
                              : 'التكلفة السنوية الإجمالية: 228 د.أ'}
                          </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 items-start mt-2">
                          <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <div className="text-[10px] font-black text-amber-900">هدية انضمام حصرية للباقة الذهبية</div>
                            <div className="text-[9px] text-amber-800 font-bold mt-0.5 leading-tight">ميزة (المميز/صدارة البحث) ذات الإطار الذهبي وعلامة ممول مجاناً لمدة أسبوع كامل فور الموافقة!</div>
                          </div>
                        </div>

                        <div className="border-t border-stone-100 pt-3">
                          <h4 className="text-[10px] font-black text-stone-400 mb-2">ميزات المنظومة الطبية المتقدمة:</h4>
                          <ul className="space-y-2.5">
                            {[
                              'شارة التوثيق والاعتماد الطبية الرسمية (Verified Medical Facility ✓)',
                              'محرك حجز المواعيد الطبي المسبق واستقبال طلبات الكشف المباشرة 📅',
                              'دليل شبكات وشركات التأمين الصحي والنقابات والخصومات المعتمدة 🛡️',
                              'كتالوج الإجراءات والخدمات الطبية والفحوصات مع تفاصيل الأسعار 📋',
                              'دليل الكادر الطبي والاستشاريين مع التخصصات والشهادات والخبرات 👨‍⚕️',
                              'استعراض التجهيزات والتقنيات والأجهزة الطبية المتطورة بالعيادة 🔬',
                              'نافذة ترويجية طبية منبثقة (أطباء زائرون، باقات فحص دوري، إعلانات) ⚡',
                              'حسابات مخصصة لموظفي الاستقبال والسكرتارية لإدارة المواعيد 👥',
                              'لوحة إحصائيات متقدمة لتحليل نقرات الحجز والمكالمات والاهتمامات 📊',
                              'أولوية الصدارة في نتائج البحث الطبي وترشيحات المساعد الذكي 🌟',
                              'معرض الصور المتطور لأجواء العيادة ومرافق المركز 📸',
                              'دعم فني ومساعدة متقدمة لضبط وتحديث الملف الطبي والعيادة'
                            ].map((f, fIdx) => (
                              <li key={fIdx} className="flex items-start gap-2 text-[10px] sm:text-[11px] text-stone-700 font-medium leading-relaxed">
                                <Check className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                                <span className={fIdx < 3 ? 'font-bold' : ''}>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
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

              {/* STEP 5: TIMINGS & SUBMISSION */}
              {currentStep === 5 && (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-[#1a4d2e]" />
                      <span>المرحلة الخامسة: الأجهزة والتسهيلات وساعات العمل وتأكيد الإرسال</span>
                    </h3>
                    <p className="text-xs text-stone-500 font-bold mt-1">
                      حدد مواعيد وساعات الدوام، وخصص ظهور الأجهزة والتقنيات وتسهيلات المرضى، ثم قم بتأكيد الإرسال للمراجعة والاعتماد.
                    </p>
                  </div>

                  {/* CUSTOMIZATION 1: Medical Equipment & Tech (إظهار وإخفاء وتخصيص الأجهزة) */}
                  <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-3xs">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                          <Cpu className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-stone-900">الأجهزة والتقنيات الطبية المستخدمة</h4>
                          <p className="text-[11px] text-stone-500 font-bold">
                            إظهار أحدث المعدات والتقنيات التشخيصية والعلاجية المعتمدة في المنشأة
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowEquipments(!showEquipments)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                          showEquipments
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {showEquipments ? (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            <span>القسم مفعّل ومُعروض</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            <span>مخفي من الملف</span>
                          </>
                        )}
                      </button>
                    </div>

                    {showEquipments ? (
                      <div className="space-y-4 pt-1">
                        {/* Currently added equipment list */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-stone-600">
                            <span>الأجهزة والتقنيات المضافة حالياً ({equipmentsList.length}):</span>
                          </div>

                          {equipmentsList.length === 0 ? (
                            <div className="text-center py-4 bg-stone-50 rounded-xl border border-dashed border-stone-200 text-xs font-bold text-stone-400">
                              لم يتم إضافة أجهزة بعد. يمكنك اختيار مقترحات أو كتابة أجهزتك بالأسفل.
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              {equipmentsList.map((eq, idx) => (
                                <div
                                  key={idx}
                                  className="p-3 bg-stone-50 border border-stone-200/80 rounded-xl flex items-start justify-between gap-2 group hover:border-blue-300 transition-colors"
                                >
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-black text-stone-900">{eq.name}</span>
                                      {eq.brandOrOrigin && (
                                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">
                                          {eq.brandOrOrigin}
                                        </span>
                                      )}
                                    </div>
                                    {eq.description && (
                                      <p className="text-[11px] text-stone-500 font-medium leading-relaxed">
                                        {eq.description}
                                      </p>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeEquipment(idx)}
                                    className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                    title="حذف الجهاز"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Specialty Preset Suggestions */}
                        {SPECIALTY_EQUIPMENT_SUGGESTIONS[mainSpecialty] && SPECIALTY_EQUIPMENT_SUGGESTIONS[mainSpecialty].length > 0 && (
                          <div className="space-y-2 pt-2 border-t border-stone-100">
                            <span className="text-[11px] font-black text-stone-500">
                              مقترحات أجهزة متطورة لاختصاصك ({activeSpecialtyObj?.name}):
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {SPECIALTY_EQUIPMENT_SUGGESTIONS[mainSpecialty].map((preset, pIdx) => {
                                const isAdded = equipmentsList.some(e => e.name === preset.name);
                                return (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    disabled={isAdded}
                                    onClick={() => addPresetEquipment(preset)}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                      isAdded 
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 opacity-60 cursor-default'
                                        : 'bg-white border border-stone-200 text-stone-700 hover:border-blue-400 hover:bg-blue-50/50'
                                    }`}
                                  >
                                    {isAdded ? <Check className="h-3 w-3" /> : <span>+</span>}
                                    <span>{preset.name}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Add custom equipment */}
                        <div className="bg-stone-50 border border-stone-200/80 rounded-xl p-3 space-y-2.5">
                          <span className="text-xs font-black text-stone-800 block">إضافة جهاز أو تقنية طبية مخصصة:</span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={newEquipmentName}
                              onChange={e => setNewEquipmentName(e.target.value)}
                              placeholder="اسم الجهاز / التقنية (مثل: جهاز ليزر كانديلا)..."
                              className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <input
                              type="text"
                              value={newEquipmentBrand}
                              onChange={e => setNewEquipmentBrand(e.target.value)}
                              placeholder="النوع / الموديل / بلد الصنع (اختياري، مثل: ألماني)..."
                              className="bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={newEquipmentDesc}
                              onChange={e => setNewEquipmentDesc(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomEquipment())}
                              placeholder="الوصف الطبي أو الفائدة للمريض (اختياري)..."
                              className="flex-1 bg-white border border-stone-200 rounded-lg px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button
                              type="button"
                              onClick={addCustomEquipment}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black transition-colors shrink-0 cursor-pointer"
                            >
                              إضافة جهاز +
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-3 px-4 bg-stone-50 rounded-xl border border-stone-200 text-center text-xs font-bold text-stone-500">
                        تم إخفاء قسم الأجهزة والتقنيات الطبية. لن يظهر هذا القسم للزوار في صفحة المنشأة.
                      </div>
                    )}
                  </div>

                  {/* CUSTOMIZATION 2: Accessibility & Amenities (تسهيلات الوصول وراحة المرضى) */}
                  <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4 shadow-3xs">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-emerald-50 text-[#1a4d2e]">
                          <Accessibility className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-stone-900">تسهيلات الوصول وراحة المرضى</h4>
                          <p className="text-[11px] text-stone-500 font-bold">
                            تخصيص وإبراز خدمات الراحة والمواقف والمصاعد والمرافق المتاحة
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowAmenities(!showAmenities)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                          showAmenities
                            ? 'bg-[#1a4d2e] text-white shadow-sm'
                            : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                        }`}
                      >
                        {showAmenities ? (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            <span>القسم مفعّل ومُعروض</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            <span>مخفي من الملف</span>
                          </>
                        )}
                      </button>
                    </div>

                    {showAmenities ? (
                      <div className="space-y-3 pt-1">
                        <span className="text-xs font-black text-stone-800 block">حدد التسهيلات المتوفرة في مقر المنشأة:</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          <label className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                            hasWheelchairAccess ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-black' : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700 font-bold'
                          }`}>
                            <input
                              type="checkbox"
                              checked={hasWheelchairAccess}
                              onChange={e => setHasWheelchairAccess(e.target.checked)}
                              className="h-4 w-4 rounded text-[#1a4d2e] focus:ring-emerald-500 cursor-pointer"
                            />
                            <div className="flex items-center gap-2">
                              <Accessibility className="h-4 w-4 text-emerald-600" />
                              <span className="text-xs">مدخل وممر كراسي متحركة</span>
                            </div>
                          </label>

                          <label className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                            hasElevator ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-black' : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700 font-bold'
                          }`}>
                            <input
                              type="checkbox"
                              checked={hasElevator}
                              onChange={e => setHasElevator(e.target.checked)}
                              className="h-4 w-4 rounded text-[#1a4d2e] focus:ring-emerald-500 cursor-pointer"
                            />
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-blue-600" />
                              <span className="text-xs">مصعد كهربائي مجهز</span>
                            </div>
                          </label>

                          <label className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                            hasValetOrParking ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-black' : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700 font-bold'
                          }`}>
                            <input
                              type="checkbox"
                              checked={hasValetOrParking}
                              onChange={e => setHasValetOrParking(e.target.checked)}
                              className="h-4 w-4 rounded text-[#1a4d2e] focus:ring-emerald-500 cursor-pointer"
                            />
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-amber-600" />
                              <span className="text-xs">مواقف سيارات متوفرة</span>
                            </div>
                          </label>

                          <label className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                            hasFemaleStaff ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-black' : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700 font-bold'
                          }`}>
                            <input
                              type="checkbox"
                              checked={hasFemaleStaff}
                              onChange={e => setHasFemaleStaff(e.target.checked)}
                              className="h-4 w-4 rounded text-[#1a4d2e] focus:ring-emerald-500 cursor-pointer"
                            />
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-purple-600" />
                              <span className="text-xs">كادر تمريضي وطبي نسائي</span>
                            </div>
                          </label>

                          <label className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                            hasKidsArea ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-black' : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700 font-bold'
                          }`}>
                            <input
                              type="checkbox"
                              checked={hasKidsArea}
                              onChange={e => setHasKidsArea(e.target.checked)}
                              className="h-4 w-4 rounded text-[#1a4d2e] focus:ring-emerald-500 cursor-pointer"
                            />
                            <div className="flex items-center gap-2">
                              <Baby className="h-4 w-4 text-pink-600" />
                              <span className="text-xs">ركن انتظار وألعاب للأطفال</span>
                            </div>
                          </label>

                          <label className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                            hasElectronicPayment ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-black' : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700 font-bold'
                          }`}>
                            <input
                              type="checkbox"
                              checked={hasElectronicPayment}
                              onChange={e => setHasElectronicPayment(e.target.checked)}
                              className="h-4 w-4 rounded text-[#1a4d2e] focus:ring-emerald-500 cursor-pointer"
                            />
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-emerald-600" />
                              <span className="text-xs">دفع إلكتروني وCliQ وبطاقات</span>
                            </div>
                          </label>

                          {isEmergencyEligible && (
                            <label className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                              hasEmergency24h ? 'bg-red-50/70 border-red-300 text-red-950 font-black' : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700 font-bold'
                            }`}>
                              <input
                                type="checkbox"
                                checked={hasEmergency24h}
                                onChange={e => setHasEmergency24h(e.target.checked)}
                                className="h-4 w-4 rounded text-red-600 focus:ring-red-500 cursor-pointer"
                              />
                              <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-red-600" />
                                <span className="text-xs">خدمة طوارئ واستقبال 24/7</span>
                              </div>
                            </label>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="py-3 px-4 bg-stone-50 rounded-xl border border-stone-200 text-center text-xs font-bold text-stone-500">
                        تم إخفاء قسم تسهيلات الوصول وراحة المرضى. لن يظهر هذا القسم للزوار في صفحة المنشأة.
                      </div>
                    )}
                  </div>

                  {/* Working Hours with Presets */}
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

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
                      <span className="text-[11px] font-bold text-stone-500">خيارات سريعة:</span>
                      {[
                        { label: 'السبت - الخميس (09:00 - 19:00)', days: 'السبت - الخميس', open: '09:00', close: '19:00' },
                        { label: 'طوال الأسبوع (08:00 - 22:00)', days: 'طوال أيام الأسبوع (7 أيام)', open: '08:00', close: '22:00' },
                        { label: 'الأحد - الخميس (08:00 - 16:00)', days: 'الأحد - الخميس', open: '08:00', close: '16:00' },
                        { label: '24/7 (طوارئ ومستمر)', days: 'طوال أيام الأسبوع', open: '00:00', close: '23:59', is24: true }
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            if (preset.is24) {
                              setWorkingHours(prev => ({ ...prev, isOpen24Hours: true, days: 'طوال أيام الأسبوع' }));
                            } else {
                              setWorkingHours(prev => ({
                                ...prev,
                                isOpen24Hours: false,
                                days: preset.days,
                                openTime: preset.open,
                                closeTime: preset.close
                              }));
                            }
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-900 border border-stone-200 hover:border-emerald-300 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-3xs"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <WorkingHoursEditor
                      workingHours={workingHours}
                      onChange={setWorkingHours}
                    />
                  </div>

                  {/* Social Links */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-stone-800">صفحات المنشأة على مواقع التواصل والموقع الإلكتروني</label>
                    <SocialLinksEditor
                      socialLinks={socialLinks}
                      onChange={setSocialLinks}
                    />
                  </div>
                  {/* Terms & Certification Agreement */}
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
                    type="button"
                    onClick={handlePrev}
                    className="px-6 py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <ArrowRight className="h-4 w-4" />
                    <span>السابق</span>
                  </button>
                ) : (
                  <Link
                    to="/medical"
                    className="px-5 py-3 rounded-2xl text-stone-400 hover:text-stone-700 text-xs font-bold"
                  >
                    إلغاء
                  </Link>
                )}

                {currentStep < 5 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-8 py-3.5 rounded-2xl bg-[#1a4d2e] hover:bg-[#143d24] text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    <span>التالي</span>
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-10 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-[#1a4d2e] hover:from-emerald-700 hover:to-[#133b22] text-white text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>جاري إرسال الطلب...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-emerald-200" />
                        <span>إرسال الطلب</span>
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
  );
}
