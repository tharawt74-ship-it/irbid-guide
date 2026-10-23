import React, { useState, useEffect } from 'react';
import * as LucideIcons from 'lucide-react';
import { collection, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { 
  Stethoscope, 
  MapPin, 
  Phone, 
  ShieldCheck, 
  CheckCircle2, 
  User, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  AlertCircle, 
  Trash2,
  Crown,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  Hourglass
} from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { applyNewBusinessWelcomeGift } from '../lib/vipHelper';
import { useAuth } from '../contexts/AuthContext';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { ImageUploader } from '../components/ui/ImageUploader';
import { SEO } from '../components/common/SEO';
import DOMPurify from 'dompurify';
import { compressAndSanitizeFirestorePayload } from '../lib/firestoreHelper';
import { IRBID_REGIONS_CATEGORIZED } from '../lib/categories';
import { 
  MEDICAL_SPECIALTIES 
} from '../lib/medicalCategories';
import { 
  MedicalFacilityInfo, 
  MedicalProcedure, 
  MenuItem
} from '../types';
import { isEmergencyFacility } from '../lib/medicalHelper';
import { sanitizeInput, isBotSubmission, checkSubmissionRateLimit, recordSubmissionTime, executeReCaptcha } from '../lib/security';
import { invalidateCache } from '../lib/dataCache';
import { sendCustomVerificationEmail } from '../lib/email';
import { isUserOnboardedByAdmin } from '../lib/authPhoneHelper';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut as firebaseSignOut } from 'firebase/auth';

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
  return Icon || Stethoscope;
};

export function AddMedicalFacility() {
  const { currentUser, userProfile, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const { medicalCategories } = useSystemSettings();

  // Stepper state: 'details' -> 'package' -> 'auth' -> 'confirm'
  const [currentStep, setCurrentStep] = useState<'details' | 'package' | 'auth' | 'confirm'>('details');

  // Form Details
  const [mainSpecialty, setMainSpecialty] = useState('internal');
  const [subSpecialty, setSubSpecialty] = useState('');
  const [selectedSubspecialties, setSelectedSubspecialties] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [district, setDistrict] = useState('شارع الجامعة');
  const [address, setAddress] = useState('');
  const [googlePlaceUrl, setGooglePlaceUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [selectedInsurances, setSelectedInsurances] = useState<string[]>([]);
  const [customInsuranceInput, setCustomInsuranceInput] = useState('');
  const [consultationFee, setConsultationFee] = useState('15 - 25 د.أ');
  const [appointmentType, setAppointmentType] = useState<'phone_first' | 'walk_in' | 'both'>('phone_first');
  const [hasEmergency24h, setHasEmergency24h] = useState(false);
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Package state
  const [selectedPackagePlan, setSelectedPackagePlan] = useState<'golden' | 'basic'>('golden');
  const [billingPeriod, setBillingPeriod] = useState<'yearly' | 'monthly'>('yearly');
  const [agreedToTermsConfirm, setAgreedToTermsConfirm] = useState(false);

  // Auth states
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Submission state
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [hpValue, setHpValue] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const activeSpecialtyObj = medicalCategories.find(s => s.id === mainSpecialty) || medicalCategories[0] || MEDICAL_SPECIALTIES[0];
  const isPharmacy = mainSpecialty === 'pharmacies';
  const isLab = mainSpecialty === 'laboratories';
  const isHospital = mainSpecialty === 'hospitals';
  const isRehab = mainSpecialty === 'rehab';
  const isDoctor = !isPharmacy && !isLab && !isHospital && !isRehab;

  const facilityType = isPharmacy 
    ? 'pharmacy' 
    : isLab 
    ? 'lab' 
    : isHospital 
    ? 'hospital' 
    : isRehab 
    ? 'physio' 
    : 'clinic';

  const isEmergencyEligible = isEmergencyFacility({ mainSpecialty, category: mainSpecialty, facilityType });

  useEffect(() => {
    if (activeSpecialtyObj) {
      const defaultSub = activeSpecialtyObj.subspecialties?.[0] || '';
      setSubSpecialty(defaultSub);
      setSelectedSubspecialties(defaultSub ? [defaultSub] : []);
    }
  }, [mainSpecialty]);

  // Verification Auto-Poll Effect
  useEffect(() => {
    let intervalId: any;
    if (currentStep === 'auth' && auth?.currentUser && !auth.currentUser.emailVerified) {
      intervalId = setInterval(async () => {
        try {
          await auth.currentUser.reload();
          let isVerified = auth.currentUser.emailVerified;
          
          if (!isVerified && db) {
            const profileSnap = await getDoc(doc(db, 'users', auth.currentUser.uid));
            if (profileSnap.exists() && (profileSnap.data().emailVerified || profileSnap.data().customEmailVerified)) {
              isVerified = true;
            }
          }
          
          if (isVerified) {
            clearInterval(intervalId);
            if (db) {
              await setDoc(doc(db, 'users', auth.currentUser.uid), {
                emailVerified: true
              }, { merge: true });
            }
            await refreshUserData();
            setCurrentStep('confirm');
          }
        } catch (err) {
          console.error("Error reloading user status for verification:", err);
        }
      }, 3500);
    } else if (currentStep === 'auth' && auth?.currentUser && auth.currentUser.emailVerified) {
      setCurrentStep('confirm');
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [currentStep, currentUser, refreshUserData]);

  // Skip auth if user is already logged in & verified
  useEffect(() => {
    if (currentStep === 'auth' && currentUser && currentUser.emailVerified) {
      setCurrentStep('confirm');
    }
  }, [currentUser, currentStep]);

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

  const validateDetails = () => {
    if (!name.trim()) return "يرجى إدخال اسم المنشأة أو العيادة.";
    if (isDoctor && !doctorName.trim()) return "يرجى إدخال اسم الطبيب المسؤول.";
    if (!ownerPhone || !ownerPhone.trim()) return "يرجى إدخال رقم هاتف المسؤول.";
    if (!phone.trim()) return "يرجى إدخال رقم هاتف العيادة للتواصل.";
    if (!address.trim()) return "يرجى إدخال العنوان.";
    return null;
  };

  const handleNextToPackage = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateDetails();
    if (err) {
      setError(err);
      window.scrollTo({ top: 100, behavior: 'smooth' });
      return;
    }
    setError('');
    setCurrentStep('package');
    window.scrollTo({ top: 100, behavior: 'smooth' });
  };

  const handleNextToAuth = () => {
    setError('');
    if (currentUser && currentUser.emailVerified) {
      setCurrentStep('confirm');
    } else {
      if (currentUser && !currentUser.emailVerified) {
        setPendingVerification(true);
      }
      setCurrentStep('auth');
    }
    window.scrollTo({ top: 100, behavior: 'smooth' });
  };

  const handleRegisterUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    if (!authName.trim() || !authEmail.trim() || !authPassword.trim()) {
      setAuthError('يرجى تعبئة جميع حقول التسجيل.');
      setAuthLoading(false);
      return;
    }

    if (!agreedToTerms) {
      setAuthError('يرجى الموافقة على شروط الخدمة وسياسة الخصوصية.');
      setAuthLoading(false);
      return;
    }

    if (!auth) {
      setAuthError('يرجى إعداد قاعدة بيانات Firebase أولاً');
      setAuthLoading(false);
      return;
    }

    try {
      const cleanEmail = authEmail.trim().toLowerCase();
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, authPassword);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: authName.trim()
      });

      try {
        await sendCustomVerificationEmail({
          uid: user.uid,
          email: cleanEmail,
          displayName: authName.trim()
        });
      } catch (verr) {
        console.warn("sendCustomVerificationEmail failed:", verr);
      }

      const isBootstrapAdmin = ['princessofx2344@gmail.com'].includes(cleanEmail);
      const userRole = isBootstrapAdmin ? 'super_admin' : 'user';

      if (db) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: cleanEmail,
          displayName: authName.trim(),
          role: userRole,
          status: 'active',
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
          savedFavorites: [],
          emailVerified: isBootstrapAdmin ? true : false
        }, { merge: true });
      }

      await refreshUserData();

      if (isBootstrapAdmin) {
        setCurrentStep('confirm');
      } else {
        setPendingVerification(true);
      }
    } catch (err: any) {
      console.error("Register error:", err);
      const errMsg = err?.message || '';
      if (err.code === 'auth/email-already-in-use' || errMsg.includes('email-already-in-use')) {
        setAuthError('البريد الإلكتروني مستخدم مسبقاً.');
      } else if (err.code === 'auth/weak-password' || errMsg.includes('weak-password')) {
        setAuthError('كلمة المرور يجب أن تكون 6 خانات على الأقل.');
      } else {
        setAuthError('حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مجدداً.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLoginUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('يرجى تعبئة البريد الإلكتروني وكلمة المرور.');
      setAuthLoading(false);
      return;
    }

    if (!auth) {
      setAuthError('يرجى إعداد قاعدة بيانات Firebase أولاً');
      setAuthLoading(false);
      return;
    }

    try {
      const cleanEmail = authEmail.trim().toLowerCase();
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, authPassword);
      const user = userCredential.user;

      try {
        await user.reload();
      } catch (reErr) {
        console.warn("Reloading user account error:", reErr);
      }

      const isBootstrapAdmin = ['princessofx2344@gmail.com'].includes(cleanEmail);
      let isVerified = user.emailVerified || isBootstrapAdmin;

      if (!isVerified) {
        const isOnboarded = await isUserOnboardedByAdmin(cleanEmail);
        if (isOnboarded) {
          isVerified = true;
          if (db) {
            await setDoc(doc(db, 'users', user.uid), { emailVerified: true, role: 'merchant' }, { merge: true });
          }
        }
      }

      if (!isVerified && db) {
        try {
          const userDocSnap = await getDoc(doc(db, 'users', user.uid));
          if (userDocSnap.exists() && (userDocSnap.data()?.emailVerified === true || userDocSnap.data()?.customEmailVerified === true)) {
            isVerified = true;
          }
        } catch (fErr) {
          console.warn("Error verifying user status in Firestore:", fErr);
        }
      }

      await refreshUserData();

      if (!isVerified) {
        try {
          await sendCustomVerificationEmail({
            uid: user.uid,
            email: cleanEmail,
            displayName: user.displayName || 'طبيب / مسؤول طبي'
          });
        } catch (verr) {
          console.warn("sendCustomVerificationEmail resend failed:", verr);
        }
        setPendingVerification(true);
      } else {
        setCurrentStep('confirm');
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setAuthError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleResendEmailLink = async () => {
    if (!auth?.currentUser) return;
    setResendingCode(true);
    setResendSuccess(false);

    try {
      await sendCustomVerificationEmail({
        uid: auth.currentUser.uid,
        email: auth.currentUser.email || '',
        displayName: auth.currentUser.displayName || 'طبيب / مسؤول طبي'
      });
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (e) {
      console.error("Resend email failed:", e);
    } finally {
      setResendingCode(false);
    }
  };

  const handleSignOutInAuth = async () => {
    if (auth) {
      await firebaseSignOut(auth);
    }
    setPendingVerification(false);
    await refreshUserData();
  };

  const handleCancelAndCleanup = () => {
    setName('');
    setDoctorName('');
    setOwnerPhone('');
    setPhone('');
    setAddress('');
    setDescription('');
    setShowCancelConfirm(false);
    navigate('/');
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    setError('');

    if (!agreedToTermsConfirm) {
      setError('يرجى الموافقة على صحة البيانات والشروط والأحكام.');
      setLoading(false);
      return;
    }

    if (isBotSubmission(hpValue)) {
      setSuccess(true);
      setLoading(false);
      return;
    }

    const rateLimit = checkSubmissionRateLimit('add_medical_facility', 120);
    if (!rateLimit.allowed) {
      setError(`يرجى الانتظار ${rateLimit.timeLeft} ثانية قبل المحاولة مرة أخرى.`);
      setLoading(false);
      return;
    }

    try {
      await executeReCaptcha('medical_facility_submit');
    } catch (rcError) {
      console.warn("reCAPTCHA warning:", rcError);
    }

    if (!db) {
      setError('يرجى إعداد قاعدة بيانات Firebase أولاً');
      setLoading(false);
      return;
    }

    try {
      const selectedSpecObj = medicalCategories.find(s => s.id === mainSpecialty) || medicalCategories[0] || MEDICAL_SPECIALTIES[0];
      const mainSpecialtyTitle = selectedSpecObj.name;
      const chosenSubCategory = selectedSubspecialties.length > 0 
        ? selectedSubspecialties.join('، ') 
        : (subSpecialty || (selectedSpecObj.subspecialties && selectedSpecObj.subspecialties[0]) || '');

      const defaultProcedures: MedicalProcedure[] = [
        {
          id: `proc_consultation_${Date.now()}`,
          name: isPharmacy ? 'استشارة دوائية' : isLab ? 'فحص مخبري' : 'كشفية ومعاينة بالعيادة',
          price: consultationFee,
          category: 'معاينات واستشارات',
          isPopular: true
        }
      ];

      const rawDescription = description?.trim();
      const finalDescription = rawDescription 
        ? (/<\/?[a-z][\s\S]*>/i.test(rawDescription) ? DOMPurify.sanitize(rawDescription) : rawDescription)
        : `منشأة ${name} الطبي - قسم ${mainSpecialtyTitle} (${chosenSubCategory}) في ${district} إربد.`;

      const medicalProfileData: MedicalFacilityInfo = {
        aboutFacility: finalDescription,
        insurances: selectedInsurances.map(ins => ({
          name: ins,
          type: ins.includes('نقابة') ? 'نقابة' : 'شركة تأمين',
          isDirectBilling: true,
          coverageDetails: 'تغطية معتمدة'
        })),
        acceptsInsuranceDirectBilling: selectedInsurances.length > 0,
        insuranceNotes: selectedInsurances.length > 0
          ? `نقبل بطاقات التأمينات والنقابات المعتمدة (${selectedInsurances.slice(0, 4).join('، ')}${selectedInsurances.length > 4 ? ' وغيرها' : ''}).`
          : 'الدفع نقدي أو عبر البطاقات الإلكترونية المعتمدة.',
        doctorProfile: {
          name: sanitizeInput(doctorName || name),
          title: isDoctor ? 'طبيب اختصاصي / استشاري' : 'المسؤول الطبي',
          degrees: ['البورد التخصصي المعتمد'],
          licenseNumber: 'مرخص أصولاً لدى وزارة الصحة',
          experienceYears: 10,
          bio: sanitizeInput(doctorName ? `طبيب اختصاصي في ${mainSpecialtyTitle} (${chosenSubCategory}) في محافظة إربد.` : ''),
          avatarUrl: imageUrl || undefined
        },
        showMedicalStaff: true,
        doctorsList: [
          {
            name: sanitizeInput(doctorName || name),
            title: isDoctor ? 'طبيب اختصاصي / استشاري' : 'المسؤول الطبي',
            degrees: ['البورد التخصصي المعتمد'],
            licenseNumber: 'مرخص أصولاً لدى وزارة الصحة',
            experienceYears: 10,
            bio: sanitizeInput(doctorName ? `طبيب اختصاصي في ${mainSpecialtyTitle} (${chosenSubCategory}) في محافظة إربد.` : ''),
            subspecialty: sanitizeInput(chosenSubCategory)
          }
        ],
        procedures: defaultProcedures,
        equipments: [],
        showEquipments: false,
        showAmenities: true,
        has24Emergency: isEmergencyEligible ? hasEmergency24h : false,
        emergencyPhone: (isEmergencyEligible && emergencyPhone) ? sanitizeInput(emergencyPhone) : '',
        hasWheelchairAccess: true,
        hasElevator: true,
        hasParking: true,
        hasFemaleStaff: true,
        hasKidsArea: false,
        hasElectronicPayment: true,
        paymentMethods: ['كاش', 'فيزا', 'كليك'],
        consultationFee: consultationFee,
        bookingNotice: isPharmacy
          ? 'تتوفر الأدوية والمستلزمات مباشرة.'
          : (appointmentType === 'walk_in'
              ? 'استقبال المراجعين بأسبقية الحضور.'
              : appointmentType === 'both'
              ? 'متاح بحجز مسبق أو الدخول المباشر.'
              : 'يتم تأكيد الموعد عبر الهاتف أو الواتساب.')
      };

      let category = 'عيادات ومراكز طبية';
      if (facilityType === 'pharmacy' || mainSpecialty === 'pharmacies') category = 'صيدليات ورعاية صحية';
      else if (facilityType === 'lab' || mainSpecialty === 'laboratories') category = 'مختبرات وتحاليل طبية';
      else if (facilityType === 'hospital' || mainSpecialty === 'hospitals') category = 'مستشفيات ومراكز شاملة';
      else if (facilityType === 'physio' || mainSpecialty === 'rehab') category = 'علاج طبيعي وتأهيل';

      const generatedMenuItems: MenuItem[] = [
        {
          id: `menu_consultation_${Date.now()}`,
          name: isPharmacy ? 'استشارة دوائية' : 'كشفية ومعاينة بالعيادة',
          price: consultationFee || '15',
          category: 'خدمات طبية',
          isPopular: true
        }
      ];

      const now = Date.now();
      const actualBillingPeriod = selectedPackagePlan === 'basic' ? 'lifetime' : billingPeriod;
      const gift = applyNewBusinessWelcomeGift(selectedPackagePlan, actualBillingPeriod, now);

      const rawPayload = {
        userId: currentUser?.uid || auth?.currentUser?.uid || null,
        userEmail: currentUser?.email || auth?.currentUser?.email || null,
        requestType: 'medical_facility_registration',
        registrationSource: 'add_medical_facility_form',
        name: sanitizeInput(name),
        ownerName: doctorName ? sanitizeInput(doctorName) : sanitizeInput(name),
        ownerPhone: sanitizeInput(ownerPhone),
        phone: sanitizeInput(phone),
        category: category,
        subCategory: chosenSubCategory,
        description: finalDescription,
        address: sanitizeInput(address),
        district: district,
        imageUrl: imageUrl || '',
        image: imageUrl || '',
        gallery: imageUrl ? [imageUrl] : [],
        googlePlaceUrl: googlePlaceUrl ? sanitizeInput(googlePlaceUrl) : '',
        workingHours: {
          days: 'السبت - الخميس',
          openTime: '09:00',
          closeTime: '19:00',
          isOpen24Hours: false,
          isCustomClosed: false
        },
        socialLinks: {
          whatsapp: whatsapp ? sanitizeInput(whatsapp) : sanitizeInput(phone)
        },
        paymentMethods: ['كاش', 'فيزا', 'كليك'],
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
        status: 'pending'
      };

      const sanitizedPayload = await compressAndSanitizeFirestorePayload(rawPayload, false);
      await addDoc(collection(db, 'businessRequests'), sanitizedPayload);
      recordSubmissionTime('add_medical_facility');
      invalidateCache();
      setSuccess(true);
    } catch (err) {
      console.error("Error creating medical facility request:", err);
      setError('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-xl mx-auto my-8 sm:my-14 px-4">
        <div className="bg-white p-6 sm:p-10 rounded-[24px] border border-stone-200 shadow-sm text-center space-y-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="h-10 w-10 sm:h-12 sm:w-12 text-emerald-600" />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">تم استلام طلب تسجيل المنشأة الطبية بنجاح</h2>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
              سيقوم فريق العمل بالتواصل معك لتأكيد البيانات وتفعيل صفحة المنشأة في الدليل.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <button 
              onClick={() => navigate('/')} 
              className="w-full sm:w-auto inline-flex justify-center items-center px-6 py-3 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-xl font-bold text-xs sm:text-sm transition-colors cursor-pointer"
            >
              العودة إلى الصفحة الرئيسية
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-4 sm:py-6 px-3 sm:px-4 space-y-5">
      <SEO 
        title="تسجيل وإضافة منشأة طبية | دليل إربد الطبي"
        description="سجل عيادتك أو مركزك الطبي في دليل إربد الطبي."
        canonicalUrl="https://shofibirbid.site/medical/register"
      />

      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-stone-900">تسجيل وإضافة منشأة طبية</h1>
      </div>

      {/* Stepper Progress */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 bg-stone-100 p-1.5 rounded-2xl border border-stone-200">
        {[
          { key: 'details', label: '1. البيانات' },
          { key: 'package', label: '2. الباقة' },
          { key: 'auth', label: '3. الحساب' },
          { key: 'confirm', label: '4. التأكيد' }
        ].map((stepItem) => {
          const stepsOrder = ['details', 'package', 'auth', 'confirm'];
          const activeIdx = stepsOrder.indexOf(currentStep);
          const currentIdx = stepsOrder.indexOf(stepItem.key);
          const isCompleted = currentIdx < activeIdx;
          const isActive = currentStep === stepItem.key;

          return (
            <div 
              key={stepItem.key} 
              className={`flex items-center justify-center py-2 px-1 rounded-xl transition-all ${
                isActive 
                  ? 'bg-[#1a4d2e] text-white shadow-xs' 
                  : isCompleted 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                  : 'text-stone-400'
              }`}
            >
              <span className="text-xs sm:text-sm font-black">{stepItem.label}</span>
            </div>
          );
        })}
      </div>

      {/* Main Container */}
      <div className="bg-white p-4 sm:p-6 md:p-8 rounded-[24px] border border-stone-200 shadow-xs relative">
        
        {/* Cancel Button */}
        <div className="flex justify-end mb-4">
          <button 
            type="button" 
            onClick={() => setShowCancelConfirm(true)}
            className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>إلغاء وحذف</span>
          </button>
        </div>

        {error && (
          <div className="p-3 mb-5 bg-red-50 text-red-700 rounded-xl border border-red-200 text-xs sm:text-sm font-bold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Details */}
        {currentStep === 'details' && (
          <form onSubmit={handleNextToPackage} className="space-y-5">
            {/* Honeypot */}
            <div className="absolute opacity-0 -z-50 pointer-events-none" style={{ width: 0, height: 0, overflow: 'hidden' }}>
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={hpValue}
                onChange={(e) => setHpValue(e.target.value)}
              />
            </div>

            {/* Specialty Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-700">
                التخصص الطبي الرئيسي <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {medicalCategories.map((spec) => {
                  const Icon = getSpecIcon(spec);
                  const isSelected = mainSpecialty === spec.id;
                  return (
                    <button
                      key={spec.id}
                      type="button"
                      onClick={() => setMainSpecialty(spec.id)}
                      className={`p-2.5 rounded-xl border text-right flex flex-col justify-between gap-1.5 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#1a4d2e] bg-emerald-50/50 text-[#1a4d2e] font-bold shadow-xs'
                          : 'border-stone-200 hover:border-stone-300 text-stone-700 bg-white'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-[#1a4d2e] text-white' : 'bg-stone-100 text-stone-600'
                      }`}>
                        <Icon className="h-4 w-4" />
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
                <label className="block text-xs font-bold text-stone-700">
                  التخصص الفرعي
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {activeSpecialtyObj.subspecialties.map((sub) => {
                    const isSelected = selectedSubspecialties.includes(sub);
                    return (
                      <button
                        key={sub}
                        type="button"
                        onClick={() => toggleSubspecialty(sub)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#1a4d2e] text-white border-[#1a4d2e]'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {isSelected && <Check className="inline h-3 w-3 ml-1" />}
                        <span>{sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Names & Contact */}
            <div className="space-y-4 pt-3 border-t border-stone-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-xs font-bold text-stone-700 mb-1">
                    اسم المنشأة أو العيادة <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    placeholder="اسم العيادة أو المركز"
                    className="block w-full px-3.5 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs sm:text-sm"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="doctorName" className="block text-xs font-bold text-stone-700 mb-1">
                    {isDoctor ? 'اسم الطبيب المسؤول' : 'اسم المشرف الطبي'} {isDoctor && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    id="doctorName"
                    required={isDoctor}
                    placeholder="اسم الطبيب أو المسؤول"
                    className="block w-full px-3.5 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs sm:text-sm"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="ownerPhone" className="block text-xs font-bold text-stone-700">
                      رقم هاتف المسؤول (سري) <span className="text-red-500">*</span>
                    </label>
                    {userProfile?.phone && (
                      <button
                        type="button"
                        onClick={() => setOwnerPhone(userProfile.phone || '')}
                        className="text-[10px] text-[#1a4d2e] font-bold hover:underline cursor-pointer"
                      >
                        استخدام رقمي ({userProfile.phone})
                      </button>
                    )}
                  </div>
                  <input
                    type="tel"
                    id="ownerPhone"
                    required
                    dir="ltr"
                    placeholder="07XXXXXXXX"
                    className="block w-full px-3.5 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs sm:text-sm text-right"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-xs font-bold text-stone-700 mb-1">
                    رقم هاتف العيادة العام <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    required
                    dir="ltr"
                    placeholder="07XXXXXXXX"
                    className="block w-full px-3.5 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs sm:text-sm text-right"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="whatsapp" className="block text-xs font-bold text-stone-700 mb-1">
                    رقم الواتساب للمواعيد
                  </label>
                  <input
                    type="tel"
                    id="whatsapp"
                    dir="ltr"
                    placeholder="07XXXXXXXX"
                    className="block w-full px-3.5 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs sm:text-sm text-right"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="district" className="block text-xs font-bold text-stone-700 mb-1">
                    المنطقة <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    id="district"
                    options={IRBID_REGIONS_CATEGORIZED.flatMap(g => g.areas)}
                    value={district}
                    onChange={(val) => setDistrict(val)}
                    className="bg-white border-stone-200"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="address" className="block text-xs font-bold text-stone-700 mb-1">
                  العنوان بالتفصيل <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="address"
                  required
                  placeholder="اسم الشارع والمجمع والطابق"
                  className="block w-full px-3.5 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs sm:text-sm"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="googlePlaceUrl" className="block text-xs font-bold text-stone-700 mb-1">
                  رابط الموقع على خرائط Google
                </label>
                <input
                  type="url"
                  id="googlePlaceUrl"
                  dir="ltr"
                  placeholder="https://maps.app.goo.gl/..."
                  className="block w-full px-3.5 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs sm:text-sm"
                  value={googlePlaceUrl}
                  onChange={(e) => setGooglePlaceUrl(e.target.value)}
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

              <div>
                <label htmlFor="description" className="block text-xs font-bold text-stone-700 mb-1">
                  نبذة تعريفية
                </label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="اكتب نبذة عن الخدمات الطبية والتخصصات"
                  className="block w-full px-3.5 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs sm:text-sm resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                ></textarea>
              </div>
            </div>

            {/* Insurances & Fee */}
            <div className="space-y-4 pt-3 border-t border-stone-100">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-stone-700">
                  التأمينات والنقابات المعتمدة
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_INSURANCES.map((ins) => {
                    const isSelected = selectedInsurances.includes(ins);
                    return (
                      <button
                        key={ins}
                        type="button"
                        onClick={() => toggleInsurance(ins)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#1a4d2e] text-white border-[#1a4d2e]'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {isSelected && <Check className="inline h-3 w-3 ml-1" />}
                        <span>{ins}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="إضافة جهة تأمينية أخرى"
                    className="flex-1 px-3.5 py-2 border border-stone-200 rounded-xl text-xs"
                    value={customInsuranceInput}
                    onChange={(e) => setCustomInsuranceInput(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={addCustomInsurance}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    إضافة
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="consultationFee" className="block text-xs font-bold text-stone-700 mb-1">
                    رسوم الكشفية التقريبية
                  </label>
                  <input
                    type="text"
                    id="consultationFee"
                    placeholder="مثال: 15 - 25 د.أ"
                    className="block w-full px-3.5 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs sm:text-sm"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="appointmentType" className="block text-xs font-bold text-stone-700 mb-1">
                    طريقة استقبال المراجعين
                  </label>
                  <select
                    id="appointmentType"
                    className="block w-full px-3.5 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs sm:text-sm bg-white"
                    value={appointmentType}
                    onChange={(e: any) => setAppointmentType(e.target.value)}
                  >
                    <option value="phone_first">حجز مسبق عبر الهاتف أو الواتساب</option>
                    <option value="walk_in">دخول فوري بأسبقية الحضور</option>
                    <option value="both">متاح بالحجز والدخول المباشر</option>
                  </select>
                </div>
              </div>

              {isEmergencyEligible && (
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="hasEmergency24h"
                      checked={hasEmergency24h}
                      onChange={(e) => setHasEmergency24h(e.target.checked)}
                      className="h-4 w-4 rounded border-stone-300 text-[#1a4d2e]"
                    />
                    <label htmlFor="hasEmergency24h" className="text-xs font-bold text-stone-800 cursor-pointer">
                      خدمة الطوارئ على مدار 24 ساعة
                    </label>
                  </div>
                  {hasEmergency24h && (
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">هاتف الطوارئ</label>
                      <input
                        type="tel"
                        dir="ltr"
                        placeholder="07XXXXXXXX"
                        className="block w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm text-right"
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-xs sm:text-sm font-black text-white bg-[#1a4d2e] hover:bg-[#133b22] focus:outline-none transition-all shadow-xs cursor-pointer"
            >
              <span>متابعة لاختيار باقة الاشتراك</span>
              <ArrowRight className="h-4 w-4 rotate-180" />
            </button>
          </form>
        )}

        {/* STEP 2: Package */}
        {currentStep === 'package' && (
          <div className="space-y-5">
            <div className="flex flex-col sm:flex-row items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-200 gap-2">
              <span className="text-xs font-bold text-stone-700">دورة الدفع للباقة الذهبية:</span>
              <div className="bg-stone-200 p-1 rounded-xl inline-flex w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setBillingPeriod('monthly')}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    billingPeriod === 'monthly'
                      ? 'bg-[#1a4d2e] text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  الدفع الشهري
                </button>
                <button
                  type="button"
                  onClick={() => setBillingPeriod('yearly')}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    billingPeriod === 'yearly'
                      ? 'bg-[#ff9f1c] text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  <span>الدفع السنوي</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  id: 'basic',
                  name: 'الباقة الطبية الأساسية',
                  price: 'تفعيل دائم',
                  periodLabel: 'بدون رسوم متكررة',
                  features: [
                    'صفحة مخصصة للعيادة مع تفاصيل التخصص والموقع',
                    'عرض شركات التأمين والنقابات المعتمدة',
                    'ساعات عمل تفاعلية',
                    'الظهور في نتائج البحث الطبي'
                  ]
                },
                {
                  id: 'golden',
                  name: 'الباقة الطبية الذهبية (VIP)',
                  price: billingPeriod === 'monthly' ? '19 د.أ / شهرياً' : '9.9 د.أ / شهرياً',
                  periodLabel: billingPeriod === 'monthly' ? 'فاتورة شهرية' : 'فاتورة سنوية موفرة',
                  features: [
                    'جميع ميزات الباقة الأساسية',
                    'شارة توثيق رسمية للمنشأة',
                    'أولوية الظهور في نتائج البحث',
                    'إمكانية نشر التحديثات الطبية'
                  ]
                }
              ].map((pack) => (
                <div 
                  key={pack.id}
                  onClick={() => setSelectedPackagePlan(pack.id as any)}
                  className={`border-2 rounded-2xl p-4 sm:p-5 cursor-pointer transition-all flex flex-col justify-between ${
                    selectedPackagePlan === pack.id 
                      ? 'border-[#1a4d2e] bg-emerald-50/30' 
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  <div className="space-y-3">
                    <h3 className="font-black text-sm sm:text-base text-stone-900">{pack.name}</h3>
                    
                    <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-center">
                      <div className="text-base sm:text-lg font-black text-[#1a4d2e]">
                        {pack.price}
                      </div>
                      <div className="text-[10px] text-stone-500 font-medium">
                        {pack.periodLabel}
                      </div>
                    </div>
                    
                    <ul className="space-y-1.5 pt-1">
                      {pack.features.map((f, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2 text-xs text-stone-600 font-medium">
                          <Check className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-4">
                    <div className={`w-full py-2 rounded-xl text-xs font-bold text-center border transition-all ${
                      selectedPackagePlan === pack.id 
                        ? 'bg-[#1a4d2e] border-[#1a4d2e] text-white' 
                        : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200'
                    }`}>
                      {selectedPackagePlan === pack.id ? 'الباقة المحددة' : 'تحديد هذه الباقة'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setCurrentStep('details')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 border border-stone-200 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-50 transition-all cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>العودة للبيانات</span>
              </button>

              <button
                type="button"
                onClick={handleNextToAuth}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <span>متابعة وتأكيد الحساب</span>
                <ArrowRight className="h-4 w-4 rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Auth & Verification */}
        {currentStep === 'auth' && (
          <div className="space-y-5">
            {pendingVerification ? (
              <div className="bg-amber-50/60 p-5 sm:p-6 rounded-2xl border border-amber-200 text-center space-y-4">
                <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                  <Hourglass className="h-6 w-6 text-amber-600" />
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base font-black text-stone-900">يرجى تأكيد بريدك الإلكتروني</h3>
                  <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                    تم إرسال رابط تأكيد إلى <strong className="text-[#1a4d2e]">{auth?.currentUser?.email}</strong>. يرجى فتح البريد والضغط على رابط التأكيد للمتابعة.
                  </p>
                </div>

                {resendSuccess && (
                  <div className="p-2 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 inline-block">
                    تمت إعادة إرسال رابط التأكيد بنجاح.
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleResendEmailLink}
                    disabled={resendingCode}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 px-3.5 py-2 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>{resendingCode ? 'جاري الإرسال...' : 'إعادة إرسال الرابط'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSignOutInAuth}
                    className="text-xs font-bold text-red-600 hover:underline px-3 py-1.5 cursor-pointer"
                  >
                    <span>تغيير الحساب</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-md mx-auto bg-stone-50 p-5 sm:p-6 rounded-2xl border border-stone-200 space-y-4">
                <div className="flex border-b border-stone-200">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setAuthError(''); }}
                    className={`flex-1 pb-2.5 text-xs sm:text-sm font-bold transition-all ${
                      authMode === 'login' 
                        ? 'border-b-2 border-[#1a4d2e] text-[#1a4d2e]' 
                        : 'text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    تسجيل الدخول
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('register'); setAuthError(''); }}
                    className={`flex-1 pb-2.5 text-xs sm:text-sm font-bold transition-all ${
                      authMode === 'register' 
                        ? 'border-b-2 border-[#1a4d2e] text-[#1a4d2e]' 
                        : 'text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    إنشاء حساب جديد
                  </button>
                </div>

                {authError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold">
                    {authError}
                  </div>
                )}

                <form onSubmit={authMode === 'login' ? handleLoginUser : handleRegisterUser} className="space-y-3">
                  {authMode === 'register' && (
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">الاسم الكامل</label>
                      <div className="relative">
                        <User className="absolute right-3 top-2.5 h-4 w-4 text-stone-400" />
                        <input
                          type="text"
                          required
                          placeholder="الاسم الكامل"
                          value={authName}
                          onChange={(e) => setAuthName(e.target.value)}
                          className="block w-full pr-9 pl-3.5 py-2 border border-stone-200 rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-[#1a4d2e]/20 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail className="absolute right-3 top-2.5 h-4 w-4 text-stone-400" />
                      <input
                        type="email"
                        required
                        placeholder="yourname@gmail.com"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="block w-full pr-9 pl-3.5 py-2 border border-stone-200 rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-[#1a4d2e]/20 outline-none text-right"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">كلمة المرور (6 خانات على الأقل)</label>
                    <div className="relative">
                      <KeyRound className="absolute right-3 top-2.5 h-4 w-4 text-stone-400" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-2.5 text-stone-400 hover:text-stone-600 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="block w-full pr-9 pl-9 py-2 border border-stone-200 rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-[#1a4d2e]/20 outline-none ltr text-left"
                      />
                    </div>
                  </div>

                  {authMode === 'register' && (
                    <div className="flex items-start gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="agreed"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-1 h-3.5 w-3.5 rounded border-stone-300 text-[#1a4d2e] focus:ring-[#1a4d2e]"
                      />
                      <label htmlFor="agreed" className="text-xs text-stone-600 font-medium">
                        أوافق على <Link to="/terms" target="_blank" className="text-[#1a4d2e] font-bold hover:underline">شروط الخدمة</Link> و <Link to="/privacy" target="_blank" className="text-[#1a4d2e] font-bold hover:underline">سياسة الخصوصية</Link>.
                      </label>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-2.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {authLoading ? 'جاري المعالجة...' : authMode === 'login' ? 'تسجيل الدخول والمتابعة' : 'إنشاء الحساب والمتابعة'}
                  </button>
                </form>
              </div>
            )}

            <div className="flex gap-3 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setCurrentStep('package')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 border border-stone-200 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-50 transition-all cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>العودة للباقة</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Confirm & Submit */}
        {currentStep === 'confirm' && (
          <div className="space-y-5">
            <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200">
              <h3 className="text-xs sm:text-sm font-bold text-emerald-900">
                الحساب موثق: {currentUser?.displayName || auth?.currentUser?.displayName} ({currentUser?.email || auth?.currentUser?.email})
              </h3>
            </div>

            {/* Summary */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2.5">
              <h4 className="text-xs font-bold text-stone-800">ملخص البيانات:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-200/70">
                  <span className="text-stone-500">اسم المنشأة:</span>
                  <span className="text-stone-800 font-bold">{name}</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-200/70">
                  <span className="text-stone-500">التخصص:</span>
                  <span className="text-stone-800 font-bold">{activeSpecialtyObj?.name}</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-200/70">
                  <span className="text-stone-500">المسؤول:</span>
                  <span className="text-stone-800 font-bold">{doctorName || name}</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-200/70">
                  <span className="text-stone-500">هاتف المسؤول:</span>
                  <span className="text-[#1a4d2e] font-bold ltr">{ownerPhone}</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-200/70">
                  <span className="text-stone-500">المنطقة:</span>
                  <span className="text-stone-800 font-bold">{district}</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-200/70">
                  <span className="text-stone-500">هاتف العيادة:</span>
                  <span className="text-stone-800 font-bold ltr">{phone}</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-200/70">
                  <span className="text-stone-500">الباقة:</span>
                  <span className="text-amber-700 font-bold">
                    {selectedPackagePlan === 'golden' ? 'الباقة الذهبية (VIP)' : 'الباقة الأساسية'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-white rounded-lg border border-stone-200/70 sm:col-span-2">
                  <span className="text-stone-500">التأمينات المعتمدة:</span>
                  <span className="text-stone-800 font-bold">
                    {selectedInsurances.length > 0 ? `${selectedInsurances.length} جهات معتمدة` : 'دفع نقدي وإلكتروني'}
                  </span>
                </div>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="flex items-start gap-2 p-3 bg-amber-50/50 rounded-xl border border-amber-200">
              <input
                type="checkbox"
                id="agreedToTermsConfirm"
                checked={agreedToTermsConfirm}
                onChange={(e) => setAgreedToTermsConfirm(e.target.checked)}
                className="mt-1 h-3.5 w-3.5 rounded border-stone-300 text-[#1a4d2e] focus:ring-[#1a4d2e]"
              />
              <label htmlFor="agreedToTermsConfirm" className="text-xs text-stone-700 font-medium leading-relaxed cursor-pointer select-none">
                أقر بصحة البيانات الطبية والترخيص، وأوافق على <Link to="/terms" target="_blank" className="text-[#1a4d2e] font-bold hover:underline">شروط الخدمة</Link> و <Link to="/privacy" target="_blank" className="text-[#1a4d2e] font-bold hover:underline">سياسة الخصوصية</Link>. <span className="text-red-500">*</span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setCurrentStep('package')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 border border-stone-200 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-50 transition-all cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>العودة لتعديل الباقة</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleFinalSubmit}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-5 rounded-xl text-xs sm:text-sm font-black text-white bg-[#1a4d2e] hover:bg-[#133b22] focus:outline-none transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {loading ? 'جاري إرسال الطلب...' : 'إرسال وتأكيد الطلب'}
              </button>
            </div>
          </div>
        )}

        {/* Cancel Confirmation Modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-4 text-center border border-stone-200 shadow-xl" dir="rtl">
              <div className="mx-auto w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
                <Trash2 className="h-6 w-6" />
              </div>
              
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-stone-900">هل أنت متأكد من إلغاء الطلب؟</h3>
                <p className="text-stone-500 text-xs leading-relaxed font-medium">
                  سيتم حذف البيانات المدخلة والعودة للصفحة الرئيسية.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCancelAndCleanup}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs cursor-pointer transition-colors"
                >
                  نعم، احذف والغي
                </button>
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-xs border border-stone-200 cursor-pointer transition-colors"
                >
                  تراجع وإكمال
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default AddMedicalFacility;
