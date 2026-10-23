import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { BUSINESS_CATEGORIES, MainCategory, IRBID_REGIONS_CATEGORIZED } from '../lib/categories';
import { 
  Store, CheckCircle2, Crown, Check, ArrowRight, ShieldCheck,
  Mail, Eye, EyeOff, Hourglass, Trash2, ArrowLeft, User, KeyRound,
  AlertCircle
} from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { SEO } from '../components/common/SEO';
import { ImageUploader } from '../components/ui/ImageUploader';
import { isBotSubmission, checkSubmissionRateLimit, recordSubmissionTime, sanitizeInput, executeReCaptcha } from '../lib/security';
import { sendCustomVerificationEmail } from '../lib/email';
import { isUserOnboardedByAdmin } from '../lib/authPhoneHelper';
import { compressAndSanitizeFirestorePayload } from '../lib/firestoreHelper';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut as firebaseSignOut } from 'firebase/auth';

const PACKAGES_INFO = {
  basic: {
    id: 'basic',
    name: 'الباقة الأساسية',
    nameEn: 'Basic Tier',
    icon: Store
  },
  golden: {
    id: 'golden',
    name: 'الباقة الذهبية (VIP)',
    nameEn: 'Golden / VIP Tier',
    icon: Crown,
    isPopular: true
  }
};

export function Contact() {
  const { currentUser, userProfile, refreshUserData } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlPackage = searchParams.get('package');

  // Stepper state: 'details' -> 'package' -> 'auth' -> 'confirm'
  const [currentStep, setCurrentStep] = useState<'details' | 'package' | 'auth' | 'confirm'>('details');

  const [selectedPackage, setSelectedPackage] = useState<'basic' | 'golden'>(
    urlPackage === 'basic' ? 'basic' : 'golden'
  );

  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');
  const [agreedToTermsConfirm, setAgreedToTermsConfirm] = useState(false);

  useEffect(() => {
    if (urlPackage === 'basic' || urlPackage === 'golden') {
      setSelectedPackage(urlPackage as 'basic' | 'golden');
    }
  }, [urlPackage]);

  // Main Form Data
  const [formData, setFormData] = useState(() => {
    const saved = sessionStorage.getItem('temp_business_form');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.formData) return parsed.formData;
      } catch (e) {
        console.error("Error reading saved form details:", e);
      }
    }
    return {
      name: '',
      ownerName: '',
      ownerPhone: '',
      mainCategory: Object.keys(BUSINESS_CATEGORIES)[0] as MainCategory,
      subCategory: BUSINESS_CATEGORIES[Object.keys(BUSINESS_CATEGORIES)[0] as MainCategory][0],
      phone: '',
      address: '',
      district: 'شارع الجامعة',
      imageUrl: '',
      googlePlaceUrl: '',
      description: ''
    };
  });

  // Load selected package if stored
  useEffect(() => {
    const savedForm = sessionStorage.getItem('temp_business_form');
    if (!savedForm) {
      sessionStorage.removeItem('temp_business_package');
      sessionStorage.removeItem('temp_business_billing_period');
      setSelectedPackage(urlPackage === 'basic' ? 'basic' : 'golden');
      setBillingPeriod('yearly');
      return;
    }

    const savedPack = sessionStorage.getItem('temp_business_package');
    if (savedPack && (savedPack === 'basic' || savedPack === 'golden')) {
      setSelectedPackage(savedPack as 'basic' | 'golden');
    }
    const savedPeriod = sessionStorage.getItem('temp_business_billing_period');
    if (savedPeriod && (savedPeriod === 'monthly' || savedPeriod === 'yearly')) {
      setBillingPeriod(savedPeriod as 'monthly' | 'yearly');
    } else {
      setBillingPeriod('yearly');
    }
  }, [urlPackage]);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [hpValue, setHpValue] = useState('');
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Authentication states for Step 3
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateDetails = () => {
    if (!formData.name.trim()) return "يرجى إدخال اسم المحل.";
    if (!formData.ownerName.trim()) return "يرجى إدخال اسم المسؤول.";
    if (!formData.ownerPhone || !formData.ownerPhone.trim()) return "يرجى إدخال رقم هاتف المالك.";
    if (!formData.phone.trim()) return "يرجى إدخال رقم هاتف المحل.";
    if (!formData.address.trim()) return "يرجى إدخال العنوان.";
    if (!formData.description.trim()) return "يرجى كتابة نبذة تعريفية.";
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
    sessionStorage.setItem('temp_business_form', JSON.stringify({ formData }));
    setCurrentStep('package');
    window.scrollTo({ top: 100, behavior: 'smooth' });
  };

  const handleNextToAuth = () => {
    sessionStorage.setItem('temp_business_package', selectedPackage);
    sessionStorage.setItem('temp_business_billing_period', billingPeriod);
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
            displayName: user.displayName || 'صاحب محل'
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
        displayName: auth.currentUser.displayName || 'صاحب محل'
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

  const handleCancelAndCleanup = async () => {
    sessionStorage.removeItem('temp_business_form');
    sessionStorage.removeItem('temp_business_package');
    sessionStorage.removeItem('temp_business_billing_period');
    setFormData({
      name: '',
      ownerName: '',
      ownerPhone: '',
      mainCategory: Object.keys(BUSINESS_CATEGORIES)[0] as MainCategory,
      subCategory: BUSINESS_CATEGORIES[Object.keys(BUSINESS_CATEGORIES)[0] as MainCategory][0],
      phone: '',
      address: '',
      district: 'شارع الجامعة',
      imageUrl: '',
      googlePlaceUrl: '',
      description: ''
    });
    setShowCancelConfirm(false);
    await refreshUserData();
    navigate('/');
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    setError('');

    if (!agreedToTermsConfirm) {
      setError('يرجى الموافقة على الشروط والأحكام وسياسة الخصوصية.');
      setLoading(false);
      return;
    }

    if (isBotSubmission(hpValue)) {
      setSuccess(true);
      setLoading(false);
      return;
    }

    const rateLimit = checkSubmissionRateLimit('contact_submit', 120);
    if (!rateLimit.allowed) {
      setError(`يرجى الانتظار ${rateLimit.timeLeft} ثانية قبل المحاولة مرة أخرى.`);
      setLoading(false);
      return;
    }

    try {
      await executeReCaptcha('contact_submit');
    } catch (rcError) {
      console.warn("reCAPTCHA failed or skipped:", rcError);
    }
    
    if (!db) {
      setError('يرجى إعداد قاعدة بيانات Firebase أولاً');
      setLoading(false);
      return;
    }

    try {
      const sanitizedData = {
        name: sanitizeInput(formData.name),
        ownerName: sanitizeInput(formData.ownerName),
        ownerPhone: sanitizeInput(formData.ownerPhone || ''),
        mainCategory: formData.mainCategory,
        subCategory: formData.subCategory,
        phone: sanitizeInput(formData.phone),
        address: sanitizeInput(formData.address),
        district: formData.district,
        imageUrl: sanitizeInput(formData.imageUrl),
        googlePlaceUrl: sanitizeInput(formData.googlePlaceUrl),
        description: sanitizeInput(formData.description)
      };

      const rawPayload = {
        userId: currentUser?.uid || auth?.currentUser?.uid || null,
        userEmail: currentUser?.email || auth?.currentUser?.email || null,
        requestType: 'business_registration',
        registrationSource: 'add_business_form',
        isCommercial: true,
        ...sanitizedData,
        workingHours: {
          isOpen24Hours: false,
          openTime: '09:00',
          closeTime: '23:00',
          days: 'طوال أيام الأسبوع',
          isCustomClosed: false
        },
        socialLinks: {
          whatsapp: sanitizedData.phone
        },
        paymentMethods: ['كاش', 'فيزا', 'كليك'],
        packagePlan: selectedPackage,
        selectedPackagePlan: selectedPackage,
        isVipTrial: selectedPackage === 'basic',
        billingPeriod: selectedPackage === 'basic' ? 'lifetime' : billingPeriod,
        category: formData.subCategory,
        createdAt: Date.now(),
        status: 'pending'
      };

      const sanitizedPayload = await compressAndSanitizeFirestorePayload(rawPayload, false);
      await addDoc(collection(db, 'businessRequests'), sanitizedPayload);
      recordSubmissionTime('contact_submit');
      
      sessionStorage.removeItem('temp_business_form');
      sessionStorage.removeItem('temp_business_package');
      sessionStorage.removeItem('temp_business_billing_period');

      setSuccess(true);
    } catch (err) {
      console.error("Error submitting request:", err);
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
            <h2 className="text-xl sm:text-2xl font-black text-stone-900">تم استلام طلب تسجيل محلك بنجاح</h2>
            <p className="text-stone-600 text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
              سيقوم فريق العمل بالتواصل معك لتأكيد البيانات وتفعيل صفحة المحل خلال 24 ساعة.
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
        title="تسجيل وإضافة محل تجاري | دليل إربد"
        description="أضف محلك التجاري إلى دليل إربد."
        canonicalUrl="https://shofibirbid.site/contact"
      />

      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-stone-900">تسجيل وإضافة محل تجاري</h1>
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

      {/* Main Form Container */}
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

            {/* Basic Info */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className="block text-xs font-bold text-stone-700 mb-1">
                    اسم المحل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    placeholder="اسم المحل أو المنشأة"
                    className="block w-full px-3.5 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs sm:text-sm transition-colors"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="ownerName" className="block text-xs font-bold text-stone-700 mb-1">
                    اسم المسؤول <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="ownerName"
                    name="ownerName"
                    required
                    placeholder="اسم صاحب المحل أو المسؤول"
                    className="block w-full px-3.5 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs sm:text-sm transition-colors"
                    value={formData.ownerName}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="ownerPhone" className="block text-xs font-bold text-stone-700">
                      رقم هاتف المالك (سري) <span className="text-red-500">*</span>
                    </label>
                    {userProfile?.phone && (
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, ownerPhone: userProfile.phone || '' }))}
                        className="text-[10px] text-[#1a4d2e] font-bold hover:underline cursor-pointer"
                      >
                        استخدام رقمي ({userProfile.phone})
                      </button>
                    )}
                  </div>
                  <input
                    type="tel"
                    id="ownerPhone"
                    name="ownerPhone"
                    required
                    dir="ltr"
                    placeholder="07XXXXXXXX"
                    className="block w-full px-3.5 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs sm:text-sm text-right transition-colors"
                    value={formData.ownerPhone || ''}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-xs font-bold text-stone-700 mb-1">
                    رقم هاتف المحل العام <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    dir="ltr"
                    placeholder="07XXXXXXXX"
                    className="block w-full px-3.5 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs sm:text-sm text-right transition-colors"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            {/* Category & Location */}
            <div className="space-y-4 pt-3 border-t border-stone-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="mainCategory" className="block text-xs font-bold text-stone-700 mb-1">
                    التصنيف الرئيسي <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    id="mainCategory"
                    options={Object.keys(BUSINESS_CATEGORIES)}
                    value={formData.mainCategory}
                    onChange={(val) => {
                      const mainCat = val as MainCategory;
                      setFormData(prev => ({
                        ...prev,
                        mainCategory: mainCat,
                        subCategory: BUSINESS_CATEGORIES[mainCat]?.[0] || ''
                      }));
                    }}
                    className="bg-white border-stone-200"
                  />
                </div>

                <div>
                  <label htmlFor="subCategory" className="block text-xs font-bold text-stone-700 mb-1">
                    التصنيف الفرعي <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    id="subCategory"
                    options={BUSINESS_CATEGORIES[formData.mainCategory as MainCategory] || []}
                    value={formData.subCategory}
                    onChange={(val) => {
                      setFormData(prev => ({ ...prev, subCategory: val }));
                    }}
                    className="bg-white border-stone-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="district" className="block text-xs font-bold text-stone-700 mb-1">
                    المنطقة <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    id="district"
                    options={IRBID_REGIONS_CATEGORIZED.flatMap(g => g.areas)}
                    value={formData.district}
                    onChange={(val) => setFormData(prev => ({ ...prev, district: val }))}
                    className="bg-white border-stone-200"
                  />
                </div>

                <div>
                  <label htmlFor="googlePlaceUrl" className="block text-xs font-bold text-stone-700 mb-1">
                    رابط الموقع على خرائط Google
                  </label>
                  <input
                    type="url"
                    id="googlePlaceUrl"
                    name="googlePlaceUrl"
                    dir="ltr"
                    className="block w-full px-3.5 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs sm:text-sm transition-colors"
                    placeholder="https://maps.app.goo.gl/..."
                    value={formData.googlePlaceUrl}
                    onChange={handleChange}
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
                  name="address"
                  required
                  className="block w-full px-3.5 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs sm:text-sm transition-colors"
                  placeholder="اسم الشارع والمعالم القريبة"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Media & Description */}
            <div className="space-y-4 pt-3 border-t border-stone-100">
              <div>
                <ImageUploader
                  label="صورة أو شعار المحل"
                  folder="businesses"
                  value={formData.imageUrl}
                  onChange={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                  aspectRatio="cover"
                  placeholder="اختر ملف صورة المحل من جهازك"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-xs font-bold text-stone-700 mb-1">
                  نبذة تعريفية <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  required
                  className="block w-full px-3.5 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs sm:text-sm transition-colors resize-none"
                  placeholder="اكتب نبذة عن المنتجات والخدمات التي يقدمها محلك"
                  value={formData.description}
                  onChange={handleChange}
                ></textarea>
              </div>
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

        {/* STEP 2: Select Package */}
        {currentStep === 'package' && (
          <div className="space-y-5">
            {/* Billing Period Selector */}
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

            {/* Package Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  id: 'basic',
                  name: 'الباقة الأساسية',
                  price: 'تفعيل دائم',
                  periodLabel: 'بدون رسوم متكررة',
                  features: [
                    'صفحة مخصصة لمحلك مع روابط الاتصال والموقع',
                    'ساعات عمل تفاعلية',
                    'الظهور في نتائج البحث والتصنيفات'
                  ]
                },
                {
                  id: 'golden',
                  name: 'الباقة الذهبية (VIP)',
                  price: billingPeriod === 'monthly' ? '19 د.أ / شهرياً' : '9.9 د.أ / شهرياً',
                  periodLabel: billingPeriod === 'monthly' ? 'فاتورة شهرية' : 'فاتورة سنوية موفرة',
                  features: [
                    'جميع ميزات الباقة الأساسية',
                    'شارة توثيق رسمية',
                    'إدارة قائمة المنتجات والمنيو',
                    'إمكانية نشر عروض ترويجية',
                    'أولوية الظهور في نتائج البحث'
                  ]
                }
              ].map((pack) => (
                <div 
                  key={pack.id}
                  onClick={() => setSelectedPackage(pack.id as 'basic' | 'golden')}
                  className={`border-2 rounded-2xl p-4 sm:p-5 cursor-pointer transition-all flex flex-col justify-between ${
                    selectedPackage === pack.id 
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
                      selectedPackage === pack.id 
                        ? 'bg-[#1a4d2e] border-[#1a4d2e] text-white' 
                        : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200'
                    }`}>
                      {selectedPackage === pack.id ? 'الباقة المحددة' : 'تحديد هذه الباقة'}
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

            {/* Summary Data */}
            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-2.5">
              <h4 className="text-xs font-bold text-stone-800">ملخص البيانات:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-200/70">
                  <span className="text-stone-500">اسم المحل:</span>
                  <span className="text-stone-800 font-bold">{formData.name}</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-200/70">
                  <span className="text-stone-500">المسؤول:</span>
                  <span className="text-stone-800 font-bold">{formData.ownerName}</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-200/70">
                  <span className="text-stone-500">هاتف المالك:</span>
                  <span className="text-[#1a4d2e] font-bold ltr">{formData.ownerPhone}</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-200/70">
                  <span className="text-stone-500">التصنيف:</span>
                  <span className="text-stone-800 font-bold">{formData.subCategory}</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-200/70">
                  <span className="text-stone-500">الباقة:</span>
                  <span className="text-amber-700 font-bold">
                    {PACKAGES_INFO[selectedPackage]?.name} ({selectedPackage === 'basic' ? 'تفعيل دائم' : billingPeriod === 'monthly' ? 'شهري' : 'سنوي'})
                  </span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-200/70">
                  <span className="text-stone-500">المنطقة:</span>
                  <span className="text-stone-800 font-bold">{formData.district}</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-200/70 sm:col-span-2">
                  <span className="text-stone-500">هاتف المحل:</span>
                  <span className="text-stone-800 font-bold ltr">{formData.phone}</span>
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
                أوافق على <Link to="/terms" target="_blank" className="text-[#1a4d2e] font-bold hover:underline">شروط الخدمة</Link> و <Link to="/privacy" target="_blank" className="text-[#1a4d2e] font-bold hover:underline">سياسة الخصوصية</Link>. <span className="text-red-500">*</span>
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

export default Contact;
