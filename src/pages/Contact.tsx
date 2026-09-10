import React, { useState, useEffect } from 'react';
import { collection, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { BUSINESS_CATEGORIES, MainCategory, IRBID_REGIONS_CATEGORIZED } from '../lib/categories';
import { 
  Store, CheckCircle2, Crown, Zap, Sparkles, Check, ArrowRight, ShieldCheck, Clock,
  Lock, Mail, Eye, EyeOff, AlertCircle, Hourglass, Trash2, ArrowLeft, User, KeyRound, Globe
} from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { WorkingHoursEditor } from '../components/ui/WorkingHoursEditor';
import { SocialLinksEditor } from '../components/ui/SocialLinksEditor';
import { SocialLinks, WorkingHours } from '../types';
import { SEO } from '../components/common/SEO';
import { ImageUploader } from '../components/ui/ImageUploader';
import { isBotSubmission, checkSubmissionRateLimit, recordSubmissionTime, sanitizeInput, executeReCaptcha } from '../lib/security';
import { sendCustomVerificationEmail } from '../lib/email';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut as firebaseSignOut } from 'firebase/auth';

const PACKAGES_INFO = {
  basic: {
    id: 'basic',
    name: 'الباقة الأساسية',
    nameEn: 'Basic Tier',
    slogan: 'الظهور الرقمي الذكي والوصول لزبائن إربد',
    icon: Store,
    badgeColor: 'bg-stone-100 text-stone-700 border-stone-300',
    accentColor: 'text-[#1a4d2e]'
  },
  golden: {
    id: 'golden',
    name: 'الباقة الذهبية (VIP)',
    nameEn: 'Golden / VIP Tier',
    slogan: 'إدارة متكاملة، مبيعات أكثر، وتتفاعل مباشر مع الزبائن',
    icon: Crown,
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    accentColor: 'text-[#ff9f1c]',
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
      description: '',
      socialMedia: '',
      additionalNotes: ''
    };
  });
  
  const [workingHours, setWorkingHours] = useState<WorkingHours>(() => {
    const saved = sessionStorage.getItem('temp_business_form');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.workingHours) return parsed.workingHours;
      } catch (e) {
        console.error("Error reading saved working hours:", e);
      }
    }
    return {
      isOpen24Hours: false,
      openTime: '09:00',
      closeTime: '23:00',
      days: 'طوال أيام الأسبوع',
      isCustomClosed: false
    };
  });

  const [socialLinks, setSocialLinks] = useState<SocialLinks>(() => {
    const saved = sessionStorage.getItem('temp_business_form');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.socialLinks) return parsed.socialLinks;
      } catch (e) {
        console.error("Error reading saved social links:", e);
      }
    }
    return {};
  });

  // Load selected package if stored
  useEffect(() => {
    const savedForm = sessionStorage.getItem('temp_business_form');
    if (!savedForm) {
      // Starting fresh - clear any old package/billing state to ensure proper defaults
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

  // Embedded Authentication states for Step 3
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
            // 1. Update Firestore user status to verified
            if (db) {
              await setDoc(doc(db, 'users', auth.currentUser.uid), {
                emailVerified: true
              }, { merge: true });
            }
            // 2. Sync profile Context
            await refreshUserData();
            // 3. Advance to confirmation step
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

  // Step 1: Form Validation & Move
  const validateDetails = () => {
    if (!formData.name.trim()) return "يرجى إدخال اسم المحل أو المنشأة.";
    if (!formData.ownerName.trim()) return "يرجى إدخال اسم المالك أو المسؤول.";
    if (!formData.ownerPhone || !formData.ownerPhone.trim()) return "يرجى إدخال رقم هاتف المالك للتواصل الشخصي مع الإدارة.";
    if (!formData.phone.trim()) return "يرجى إدخال رقم الهاتف أو الواتساب للتواصل.";
    if (!formData.address.trim()) return "يرجى إدخال العنوان بالتفصيل.";
    if (!formData.description.trim()) return "يرجى كتابة نبذة تعريفية عن المكان.";
    return null;
  };

  const handleNextToPackage = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateDetails();
    if (err) {
      setError(err);
      return;
    }
    setError('');
    // Save to sessionStorage
    sessionStorage.setItem('temp_business_form', JSON.stringify({
      formData,
      workingHours,
      socialLinks
    }));
    setCurrentStep('package');
  };

  // Step 2: Package Move
  const handleNextToAuth = () => {
    sessionStorage.setItem('temp_business_package', selectedPackage);
    sessionStorage.setItem('temp_business_billing_period', billingPeriod);
    setError('');
    if (currentUser && currentUser.emailVerified) {
      setCurrentStep('confirm');
    } else {
      // If logged in but unverified, show the unverified state
      if (currentUser && !currentUser.emailVerified) {
        setPendingVerification(true);
      }
      setCurrentStep('auth');
    }
  };

  // Embedded Account Registration
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
      setAuthError('يرجى الموافقة على شروط الخدمة وسياسة الخصوصية للمتابعة.');
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

      // Send custom verification email
      try {
        await sendCustomVerificationEmail({
          uid: user.uid,
          email: cleanEmail,
          displayName: authName.trim()
        });
      } catch (verr) {
        console.warn("sendCustomVerificationEmail failed:", verr);
      }

      const isBootstrapAdmin = ['princessofx2344@gmail.com', 'admin@shoofiirbid.com', 'irbid.admin@gmail.com'].includes(cleanEmail);
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
        setAuthError('البريد الإلكتروني مستخدم مسبقاً. يرجى تسجيل الدخول بدلاً من ذلك.');
      } else if (err.code === 'auth/weak-password' || errMsg.includes('weak-password')) {
        setAuthError('كلمة المرور ضعيفة جداً. يرجى اختيار كلمة مرور أطول وأقوى.');
      } else {
        setAuthError('حدث خطأ أثناء إنشاء الحساب. يرجى المحاولة مجدداً.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Embedded Account Login
  const handleLoginUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthError('يرجى تعبئة جميع حقول تسجيل الدخول.');
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

      const isBootstrapAdmin = ['princessofx2344@gmail.com', 'admin@shoofiirbid.com', 'irbid.admin@gmail.com'].includes(cleanEmail);
      let isVerified = user.emailVerified || isBootstrapAdmin;

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
        // Send custom verification email again
        try {
          await sendCustomVerificationEmail({
            uid: user.uid,
            email: cleanEmail,
            displayName: user.displayName || 'صاحب محل'
          });
        } catch (verr) {
          console.warn("sendCustomVerificationEmail resend failed:", verr);
        }

        // Keep them logged in but showing unverified polling screen
        setPendingVerification(true);
      } else {
        // Fully authenticated and verified!
        setCurrentStep('confirm');
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setAuthError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Resend email verification
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

  // Change account or cancel in auth step
  const handleSignOutInAuth = async () => {
    if (auth) {
      await firebaseSignOut(auth);
    }
    setPendingVerification(false);
    await refreshUserData();
  };

  // Cancel and Clean up Form Data
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
      description: '',
      socialMedia: '',
      additionalNotes: ''
    });
    setWorkingHours({
      isOpen24Hours: false,
      openTime: '09:00',
      closeTime: '23:00',
      days: 'طوال أيام الأسبوع',
      isCustomClosed: false
    });
    setSocialLinks({});
    
    // If they registered but did not complete the flow, sign them out
    if (auth?.currentUser) {
      await firebaseSignOut(auth);
    }
    await refreshUserData();
    navigate('/');
  };

  // Final Submission Step 4
  const handleFinalSubmit = async () => {
    setLoading(true);
    setError('');

    if (!agreedToTermsConfirm) {
      setError('يرجى الموافقة على الشروط والأحكام وسياسة الخصوصية للمتابعة وإرسال الطلب.');
      setLoading(false);
      return;
    }

    // Honeypot check
    if (isBotSubmission(hpValue)) {
      setSuccess(true);
      setLoading(false);
      return;
    }

    // Rate limit check
    const rateLimit = checkSubmissionRateLimit('contact_submit', 120);
    if (!rateLimit.allowed) {
      setError(`يرجى الانتظار ${rateLimit.timeLeft} ثانية قبل تقديم طلب آخر لمنع المراسلات العشوائية.`);
      setLoading(false);
      return;
    }

    try {
      await executeReCaptcha('contact_submit');
    } catch (rcError) {
      console.warn("⚠️ reCAPTCHA failed or skipped:", rcError);
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
        description: sanitizeInput(formData.description),
        socialMedia: sanitizeInput(formData.socialMedia),
        additionalNotes: sanitizeInput(formData.additionalNotes)
      };

      await addDoc(collection(db, 'businessRequests'), {
        userId: currentUser?.uid || auth?.currentUser?.uid || null,
        userEmail: currentUser?.email || auth?.currentUser?.email || null,
        ...sanitizedData,
        workingHours,
        socialLinks,
        packagePlan: selectedPackage,
        billingPeriod: selectedPackage === 'basic' ? 'lifetime' : billingPeriod,
        category: formData.subCategory,
        createdAt: Date.now(),
        status: 'pending'
      });

      recordSubmissionTime('contact_submit');
      
      // Clear sessionStorage data successfully upon submission
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
      <div className="max-w-xl mx-auto my-12 text-center bg-white p-8 sm:p-12 rounded-[32px] border border-[#e5e1da] shadow-xl space-y-6 animate-scale-in">
        <div className="w-20 h-20 bg-emerald-100 text-[#1a4d2e] rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-stone-900">تم استلام طلب اشتراكك بنجاح!</h2>
          <div className="inline-block bg-[#1a4d2e]/10 text-[#1a4d2e] font-black text-xs px-4 py-1.5 rounded-full border border-[#1a4d2e]/20">
            تم تقديم الطلب
          </div>
          <p className="text-stone-600 text-sm leading-relaxed max-w-md mx-auto pt-2">
            شكراً لثقتك بمنصة <strong>"شو في بإربد؟"</strong>. سيقوم فريق خدمة العملاء بالتواصل معك هاتفياً أو عبر الواتساب لتجهيز وإطلاق صفحة محلك رسمياً خلال 24 ساعة.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => navigate('/')} className="inline-flex justify-center items-center px-6 py-3.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-2xl font-bold transition-colors cursor-pointer">
            العودة للرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-8">
      <SEO 
        title="أضف محلك - اشتراك في دليل إربد | تواصل معنا"
        description="انضم لمنظومة الأعمال الأكبر في إربد. أضف محلك التجاري، مطعمك، عيادتك، أو خدماتك إلى منصة شو في بإربد واستقبل زبائن جدد يومياً."
        keywords={['أضف محلك إربد', 'إعلان في إربد', 'تسجيل محلات إربد', 'إضافة شركة إربد', 'دليل أعمال إربد']}
        canonicalUrl="https://shofierbid.com/contact"
      />

      {/* Hero / Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-[#ff9f1c]/15 text-[#e68a00] px-4 py-1.5 rounded-full text-xs font-bold border border-[#ff9f1c]/30">
          <Sparkles className="h-4 w-4" />
          <span>انضم لمنظومة الأعمال الأولى في إربد</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-stone-900">تسجيل وإضافة محلك في الدليل</h1>
        <p className="text-stone-500 text-xs sm:text-sm max-w-lg mx-auto">
          أكمل الخطوات الأربعة لرفع بيانات محلك واختيار باقة الانضمام وتأكيد حسابك معنا.
        </p>
      </div>

      {/* Stepper Progress Bar */}
      <div className="grid grid-cols-4 gap-2 bg-stone-100 p-2.5 rounded-2xl border border-stone-200">
        {[
          { key: 'details', label: '1. البيانات', desc: 'تفاصيل المحل' },
          { key: 'package', label: '2. الباقة', desc: 'باقة الاشتراك' },
          { key: 'auth', label: '3. الهوية', desc: 'تأكيد الحساب' },
          { key: 'confirm', label: '4. التأكيد', desc: 'مراجعة وإرسال' }
        ].map((stepItem, idx) => {
          const stepsOrder = ['details', 'package', 'auth', 'confirm'];
          const activeIdx = stepsOrder.indexOf(currentStep);
          const currentIdx = stepsOrder.indexOf(stepItem.key);
          const isCompleted = currentIdx < activeIdx;
          const isActive = currentStep === stepItem.key;

          return (
            <div 
              key={stepItem.key} 
              className={`flex flex-col items-center justify-center py-2 sm:py-3 px-1 rounded-xl transition-all ${
                isActive 
                  ? 'bg-[#1a4d2e] text-white shadow-xs' 
                  : isCompleted 
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' 
                  : 'text-stone-400'
              }`}
            >
              <span className="text-[10px] sm:text-xs font-black">{stepItem.label}</span>
              <span className="hidden sm:inline text-[9px] font-medium mt-0.5">{stepItem.desc}</span>
            </div>
          );
        })}
      </div>

      {/* Main Container */}
      <div className="bg-white p-5 sm:p-8 rounded-[28px] border border-[#e5e1da] shadow-sm relative">
        
        {/* Cancel Button */}
        <div className="absolute top-4 left-4 z-20">
          <button 
            type="button" 
            onClick={() => setShowCancelConfirm(true)}
            className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer animate-pulse"
            title="إلغاء الطلب وحذف كافة المعلومات المدخلة"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>إلغاء وحذف</span>
          </button>
        </div>

        {error && (
          <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-xs sm:text-sm font-bold">
            {error}
          </div>
        )}

        {/* STEP 1: Details */}
        {currentStep === 'details' && (
          <form onSubmit={handleNextToPackage} className="space-y-6 pt-6">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <Store className="h-5 w-5 text-[#ff9f1c]" />
              <h2 className="text-base sm:text-lg font-black text-stone-900">الخطوة 1: أدخل تفاصيل المحل التجاري</h2>
            </div>

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="name" className="block text-xs font-bold text-stone-700 mb-1.5">
                  اسم المحل أو المنشأة <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  placeholder="مثال: مطعم شاورما الريف"
                  className="block w-full px-4 py-3 border border-[#e5e1da] rounded-xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs sm:text-sm transition-colors"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="ownerName" className="block text-xs font-bold text-stone-700 mb-1.5">
                  اسم المالك أو المسؤول <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="ownerName"
                  name="ownerName"
                  required
                  placeholder="الاسم الكريم للمسؤول"
                  className="block w-full px-4 py-3 border border-[#e5e1da] rounded-xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs sm:text-sm transition-colors"
                  value={formData.ownerName}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label htmlFor="ownerPhone" className="block text-xs font-bold text-stone-700">
                    رقم الهاتف الشخصي للمالك (سرّي للإدارة) <span className="text-red-500">*</span>
                  </label>
                  {userProfile?.phone && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, ownerPhone: userProfile.phone || '' }))}
                      className="text-[10px] text-[#1a4d2e] font-black hover:underline cursor-pointer"
                    >
                      📎 استخدام رقمي ({userProfile.phone})
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
                  className="block w-full px-4 py-3 border border-[#e5e1da] rounded-xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs sm:text-sm text-right transition-colors"
                  value={formData.ownerPhone || ''}
                  onChange={handleChange}
                />
                <span className="block text-[10px] text-stone-400 mt-1 font-medium">سري للتواصل المباشر مع المنصة، ولن يُعرض للعامة أبداً.</span>
              </div>

              <div>
                <label htmlFor="phone" className="block text-xs font-bold text-stone-700 mb-1.5">
                  رقم هاتف المحل التجاري (عام للزبائن) <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  dir="ltr"
                  placeholder="07XXXXXXXX"
                  className="block w-full px-4 py-3 border border-[#e5e1da] rounded-xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs sm:text-sm text-right transition-colors"
                  value={formData.phone}
                  onChange={handleChange}
                />
                <span className="block text-[10px] text-stone-400 mt-1 font-medium">الرقم العام للمحل الذي سيظهر على صفحة منشأتك للزبائن.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="mainCategory" className="block text-xs font-bold text-stone-700 mb-1.5">
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
                  className="bg-white border-[#e5e1da]"
                />
              </div>

              <div>
                <label htmlFor="subCategory" className="block text-xs font-bold text-stone-700 mb-1.5">
                  التصنيف الفرعي للنشاط <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  id="subCategory"
                  options={BUSINESS_CATEGORIES[formData.mainCategory as MainCategory] || []}
                  value={formData.subCategory}
                  onChange={(val) => {
                    setFormData(prev => ({ ...prev, subCategory: val }));
                  }}
                  className="bg-white border-[#e5e1da]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="district" className="block text-xs font-bold text-stone-700 mb-1.5">
                  المنطقة / الحي / البلدة في إربد <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  id="district"
                  options={IRBID_REGIONS_CATEGORIZED.flatMap(g => g.areas)}
                  value={formData.district}
                  onChange={(val) => setFormData(prev => ({ ...prev, district: val }))}
                  className="bg-white border-[#e5e1da]"
                />
              </div>

              <div>
                <label htmlFor="googlePlaceUrl" className="block text-xs font-bold text-stone-700 mb-1.5">
                  رابط موقع المحل على خرائط Google (اختياري)
                </label>
                <input
                  type="url"
                  id="googlePlaceUrl"
                  name="googlePlaceUrl"
                  dir="ltr"
                  className="block w-full px-4 py-3 border border-[#e5e1da] rounded-xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs sm:text-sm transition-colors"
                  placeholder="https://maps.app.goo.gl/... أو رابط الموقع"
                  value={formData.googlePlaceUrl}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="address" className="block text-xs font-bold text-stone-700 mb-1.5">
                العنوان بالتفصيل <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="address"
                name="address"
                required
                className="block w-full px-4 py-3 border border-[#e5e1da] rounded-xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs sm:text-sm transition-colors"
                placeholder="مثال: شارع الجامعة، مقابل مجمع البنوك..."
                value={formData.address}
                onChange={handleChange}
              />
            </div>

            <div>
              <ImageUploader
                label="صورة أو شعار المحل (رفع ملف صورة)"
                folder="businesses"
                value={formData.imageUrl}
                onChange={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
                aspectRatio="cover"
                placeholder="اختر ملف صورة المحل أو الشعار من جهازك"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-xs font-bold text-stone-700 mb-1.5">
                نبذة تعريفية عن المكان وما يقدمه لزبائنه <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                required
                className="block w-full px-4 py-3 border border-[#e5e1da] rounded-xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs sm:text-sm transition-colors resize-none"
                placeholder="اكتب نبذة مختصرة عن المنتجات، الخدمات، أو المأكولات..."
                value={formData.description}
                onChange={handleChange}
              ></textarea>
            </div>

            <WorkingHoursEditor
              workingHours={workingHours}
              onChange={setWorkingHours}
              showVacationToggle={false}
            />

            <SocialLinksEditor
              socialLinks={socialLinks}
              onChange={setSocialLinks}
            />

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl text-sm font-black text-white bg-[#1a4d2e] hover:bg-[#133b22] focus:outline-none transition-all shadow-md active:scale-98 cursor-pointer"
            >
              <span>الاستمرار لاختيار باقة الاشتراك</span>
              <ArrowRight className="h-4 w-4 rotate-180" />
            </button>
          </form>
        )}

        {/* STEP 2: Select Package */}
        {currentStep === 'package' && (
          <div className="space-y-6 pt-6 animate-fade-in">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <Crown className="h-5 w-5 text-[#ff9f1c]" />
              <h2 className="text-base sm:text-lg font-black text-stone-900">الخطوة 2: اختر باقة الاشتراك لمشروعك</h2>
            </div>

            {/* Billing Period Selector (Only applies to Golden/VIP) */}
            <div className="flex flex-col items-center justify-center p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
              <span className="text-xs font-black text-stone-700">دورة الدفع للباقات المدفوعة:</span>
              <div className="bg-stone-200 p-1 rounded-xl inline-flex">
                <button
                  type="button"
                  onClick={() => setBillingPeriod('monthly')}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                    billingPeriod === 'monthly'
                      ? 'bg-[#1a4d2e] text-white shadow-sm'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  الدفع الشهري 🗓️
                </button>
                <button
                  type="button"
                  onClick={() => setBillingPeriod('yearly')}
                  className={`px-4 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                    billingPeriod === 'yearly'
                      ? 'bg-[#ff9f1c] text-white shadow-sm'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <span>الدفع السنوي</span>
                  <span className="bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black animate-pulse">
                    وفر 48% 🔥
                  </span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  id: 'basic',
                  name: 'الباقة الأساسية',
                  slogan: 'الظهور والوصول الذكي لزبائن إربد',
                  price: 'سعر رمزي جداً',
                  periodLabel: 'تفعيل للأبد مدى الحياة',
                  features: ['صفحة مخصصة لمحلك مع روابط التواصل الاجتماعي', 'ساعات عمل حية وتفاعلية (مفتوح / مغلق)', 'الظهور في نتائج البحث والتصنيفات المتنوعة', 'خدمة الردود الآلية المتقدمة عبر الذكاء الاصطناعي', 'تفعيل مخصص فوري عبر الواتساب للأبد']
                },
                {
                  id: 'golden',
                  name: 'الباقة الذهبية (VIP)',
                  slogan: 'مبيعات أكثر، تفاعل، وتغطية حصرية مميزة',
                  price: billingPeriod === 'monthly' ? '19 د.أ / شهرياً' : '9.9 د.أ / شهرياً',
                  periodLabel: billingPeriod === 'monthly' ? 'التكلفة الإجمالية: 228 د.أ سنوياً' : 'يُدفع سنوياً بقيمة 119 د.أ (توفير 109 د.أ سنوياً! 🔥)',
                  features: ['جميع ميزات الباقة الأساسية كاملة', 'علامة توثيق زرقاء رسمية ✓ للموثوقية العالية', 'إدارة منيو رقمي / قائمة خدمات تفاعلية للزبائن', 'الحصول على "إرسال عروض ترويجية" مجانية تماماً', 'أولوية الظهور في توصيات المنصة ومحرك الـ AI'],
                  popular: true
                }
              ].map((pack) => (
                <div 
                  key={pack.id}
                  onClick={() => setSelectedPackage(pack.id as 'basic' | 'golden')}
                  className={`border-2 rounded-2xl p-6 cursor-pointer transition-all flex flex-col justify-between relative overflow-hidden ${
                    selectedPackage === pack.id 
                      ? 'border-[#1a4d2e] bg-emerald-50/40 ring-4 ring-[#1a4d2e]/5' 
                      : 'border-stone-200 hover:border-stone-300 bg-white'
                  }`}
                >
                  {pack.popular && (
                    <div className="absolute top-0 left-0 bg-amber-400 text-stone-900 font-black text-[9px] px-4 py-1 rounded-br-2xl uppercase tracking-wider">
                      الاكثر طلباً
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-1 pt-1">
                      <span className="font-black text-base text-stone-900">{pack.name}</span>
                    </div>
                    <p className="text-[11px] text-stone-500 leading-relaxed font-medium">{pack.slogan}</p>
                    
                    <div className="py-2.5 px-4 bg-stone-50 rounded-xl border border-stone-200/60 text-center">
                      <div className="text-lg font-black text-[#1a4d2e]">
                        {pack.price}
                      </div>
                      <div className="text-[10px] text-stone-400 font-bold mt-0.5">
                        {pack.periodLabel}
                      </div>
                    </div>
                    
                    <ul className="space-y-2 pt-1">
                      {pack.features.map((f, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2 text-[11px] text-stone-600 font-medium">
                          <Check className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6">
                    <div className={`w-full py-2.5 rounded-xl text-xs font-black text-center border transition-all ${
                      selectedPackage === pack.id 
                        ? 'bg-[#1a4d2e] border-[#1a4d2e] text-white' 
                        : 'bg-stone-100 border-stone-200 text-stone-700 hover:bg-stone-200'
                    }`}>
                      {selectedPackage === pack.id ? '✓ باقتك المحددة حالياً' : 'تحديد هذه الباقة'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setCurrentStep('details')}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-5 border border-stone-200 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-50 transition-all cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>العودة لتعديل البيانات</span>
              </button>

              <button
                type="button"
                onClick={handleNextToAuth}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-5 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-xl text-xs font-black transition-all shadow-md cursor-pointer"
              >
                <span>الاستمرار وتأكيد الهوية</span>
                <ArrowRight className="h-4 w-4 rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Auth & Verification */}
        {currentStep === 'auth' && (
          <div className="space-y-6 pt-6">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <ShieldCheck className="h-5 w-5 text-[#ff9f1c]" />
              <h2 className="text-base sm:text-lg font-black text-stone-900">الخطوة 3: تسجيل الدخول أو إنشاء حساب جديد لتفعيل طلبك</h2>
            </div>

            <p className="text-stone-500 text-xs leading-relaxed font-medium">
              لحماية بيانات محلك والسماح لك بإدارة صفحتك وعروضك في أي وقت لاحق، يجب أن تمتلك حساباً موثقاً ومفعلاً على المنصة.
            </p>

            {pendingVerification ? (
              /* Waiting for email verification polling state */
              <div className="bg-amber-50/50 p-6 sm:p-8 rounded-2xl border border-amber-100 text-center space-y-5 animate-pulse-subtle">
                <div className="w-16 h-16 bg-amber-100 text-[#ff9f1c] rounded-full flex items-center justify-center mx-auto">
                  <Hourglass className="h-8 w-8 text-amber-600 animate-spin-slow" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-black text-stone-900">يرجى تفعيل بريدك الإلكتروني الآن</h3>
                  <p className="text-xs text-stone-600 max-w-md mx-auto leading-relaxed">
                    لقد أرسلنا رابط تفعيل مخصص لبريدك الإلكتروني <strong className="text-[#1a4d2e]">{auth?.currentUser?.email}</strong>. 
                    يرجى مراجعة بريدك (بما في ذلك ملف الـ Spam) والضغط على زر التأكيد هناك.
                  </p>
                  <p className="text-[11px] text-amber-800 font-bold bg-amber-100/50 py-1.5 px-3 rounded-full inline-block">
                    ملاحظة: سيتم توجيهك تلقائياً لخطوة التأكيد والإرسال بمجرد قيامك بالضغط على الرابط.
                  </p>
                </div>

                {resendSuccess && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-100 inline-block">
                    تمت إعادة إرسال رابط التفعيل بنجاح! تفقد بريدك الإلكتروني الآن.
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                  <button
                    type="button"
                    onClick={handleResendEmailLink}
                    disabled={resendingCode}
                    className="inline-flex items-center gap-1.5 text-xs font-black text-stone-700 bg-white hover:bg-stone-50 border border-stone-200 px-4 py-2.5 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    <span>{resendingCode ? 'جاري الإرسال...' : 'إعادة إرسال رابط التفعيل'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSignOutInAuth}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:underline px-4 py-2"
                  >
                    <span>تغيير الحساب أو التسجيل مجدداً</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Inline Authentication Tabs */
              <div className="max-w-md mx-auto bg-stone-50 p-6 sm:p-8 rounded-2xl border border-stone-200/80 space-y-6">
                <div className="flex border-b border-stone-200">
                  <button
                    type="button"
                    onClick={() => { setAuthMode('login'); setAuthError(''); }}
                    className={`flex-1 pb-3 text-sm font-black transition-all ${
                      authMode === 'login' 
                        ? 'border-b-2 border-[#1a4d2e] text-[#1a4d2e]' 
                        : 'text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    لديك حساب؟ تسجيل دخول
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode('register'); setAuthError(''); }}
                    className={`flex-1 pb-3 text-sm font-black transition-all ${
                      authMode === 'register' 
                        ? 'border-b-2 border-[#1a4d2e] text-[#1a4d2e]' 
                        : 'text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    حساب جديد (تسجيل أول مرة)
                  </button>
                </div>

                {authError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 font-bold">
                    {authError}
                  </div>
                )}

                <form onSubmit={authMode === 'login' ? handleLoginUser : handleRegisterUser} className="space-y-4">
                  {authMode === 'register' && (
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">الاسم الكريم بالكامل</label>
                      <div className="relative">
                        <User className="absolute right-3.5 top-3.5 h-4 w-4 text-stone-400" />
                        <input
                          type="text"
                          required
                          placeholder="مثال: أحمد محمد عبيدات"
                          value={authName}
                          onChange={(e) => setAuthName(e.target.value)}
                          className="block w-full pr-10 pl-4 py-3 border border-stone-200 rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-[#1a4d2e]/20 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">البريد الإلكتروني</label>
                    <div className="relative">
                      <Mail className="absolute right-3.5 top-3.5 h-4 w-4 text-stone-400" />
                      <input
                        type="email"
                        required
                        placeholder="yourname@gmail.com"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                        className="block w-full pr-10 pl-4 py-3 border border-stone-200 rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-[#1a4d2e]/20 outline-none text-right"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">كلمة المرور (6 خانات على الأقل)</label>
                    <div className="relative">
                      <KeyRound className="absolute right-3.5 top-3.5 h-4 w-4 text-stone-400" />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-3.5 text-stone-400 hover:text-stone-600 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="block w-full pr-10 pl-10 py-3 border border-stone-200 rounded-xl text-xs sm:text-sm bg-white focus:ring-2 focus:ring-[#1a4d2e]/20 outline-none ltr text-left"
                      />
                    </div>
                  </div>

                  {authMode === 'register' && (
                    <div className="flex items-start gap-2.5 pt-1">
                      <input
                        type="checkbox"
                        id="agreed"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-stone-300 text-[#1a4d2e] focus:ring-[#1a4d2e]"
                      />
                      <label htmlFor="agreed" className="text-[10px] sm:text-xs text-stone-500 font-medium leading-relaxed">
                        أوافق على <Link to="/terms" target="_blank" className="text-[#1a4d2e] font-bold hover:underline">شروط الخدمة</Link> و <Link to="/privacy" target="_blank" className="text-[#1a4d2e] font-bold hover:underline">سياسة الخصوصية</Link> لمنصة شو في بإربد.
                      </label>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-3 bg-[#1a4d2e] hover:bg-[#133b22] text-white text-xs sm:text-sm font-black rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {authLoading ? 'جاري معالجة الطلب...' : authMode === 'login' ? 'تسجيل الدخول ومتابعة تفعيل محلك' : 'إنشاء حساب جديد وتأكيد البريد'}
                  </button>
                </form>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setCurrentStep('package')}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-5 border border-stone-200 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-50 transition-all cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>العودة لتعديل الباقة</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Confirm & Submit */}
        {currentStep === 'confirm' && (
          <div className="space-y-6 pt-6">
            <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <h2 className="text-base sm:text-lg font-black text-stone-900">الخطوة 4: تأكيد وإرسال طلب التسجيل</h2>
            </div>

            <div className="bg-emerald-50/40 p-4 sm:p-5 rounded-2xl border border-emerald-100 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-xs sm:text-sm font-black text-emerald-900">تم تأكيد حسابك بنجاح! يمكنك إرسال الطلب الآن</h3>
              </div>
              <p className="text-[11px] sm:text-xs text-stone-600 leading-relaxed font-medium">
                تم التحقق من حسابك الحالي باسم <strong>{currentUser?.displayName || auth?.currentUser?.displayName}</strong> وببريدك الإلكتروني <strong>{currentUser?.email || auth?.currentUser?.email}</strong>. 
                أنت الآن جاهز لإرسال الطلب رسمياً للجنة التوثيق والدعم الفني في شو في بإربد.
              </p>
            </div>

            {/* Business Info Summary Panel */}
            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-200 space-y-3.5">
              <h4 className="text-xs font-black text-stone-800">ملخص بيانات منشأتك المدخلة:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-100">
                  <span className="text-stone-400 font-bold">اسم المحل:</span>
                  <span className="text-stone-800 font-black">{formData.name}</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-100">
                  <span className="text-stone-400 font-bold">المسؤول:</span>
                  <span className="text-stone-800 font-black">{formData.ownerName}</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-100">
                  <span className="text-stone-400 font-bold">رقم هاتف المالك (سري):</span>
                  <span className="text-[#1a4d2e] font-black ltr">{formData.ownerPhone}</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-100">
                  <span className="text-stone-400 font-bold">النشاط الفرعي:</span>
                  <span className="text-stone-800 font-black">{formData.subCategory}</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-100">
                  <span className="text-stone-400 font-bold">باقة الاشتراك:</span>
                  <span className="text-amber-700 font-black">
                    {PACKAGES_INFO[selectedPackage]?.name} ({selectedPackage === 'basic' ? 'تفعيل للأبد' : billingPeriod === 'monthly' ? 'شهري' : 'سنوي'})
                  </span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-100">
                  <span className="text-stone-400 font-bold">المنطقة والحي:</span>
                  <span className="text-stone-800 font-black">{formData.district}</span>
                </div>
                <div className="flex justify-between p-2 bg-white rounded-lg border border-stone-100">
                  <span className="text-stone-400 font-bold">رقم هاتف المحل (العام):</span>
                  <span className="text-stone-800 font-black ltr">{formData.phone}</span>
                </div>
              </div>
            </div>

            {/* Mandatory Checkbox for Terms and Conditions / Privacy Policy */}
            <div className="flex items-start gap-2.5 p-4 bg-amber-50/50 rounded-2xl border border-amber-200/80">
              <input
                type="checkbox"
                id="agreedToTermsConfirm"
                checked={agreedToTermsConfirm}
                onChange={(e) => setAgreedToTermsConfirm(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-stone-300 text-[#1a4d2e] focus:ring-[#1a4d2e]"
              />
              <label htmlFor="agreedToTermsConfirm" className="text-xs text-stone-600 font-bold leading-relaxed cursor-pointer select-none">
                أوافق على <Link to="/terms" target="_blank" className="text-[#1a4d2e] font-black hover:underline">شروط الخدمة</Link> و <Link to="/privacy" target="_blank" className="text-[#1a4d2e] font-black hover:underline">سياسة الخصوصية</Link> لمنصة "شو في بإربد؟" وأتعهد بصحة كافة البيانات المدخلة أعلاه. <span className="text-red-500">*</span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setCurrentStep('package')}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-5 border border-stone-200 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-50 transition-all cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>تعديل الباقة / البيانات</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleFinalSubmit}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-xs font-black text-white bg-[#1a4d2e] hover:bg-[#133b22] focus:outline-none transition-all shadow-md active:scale-98 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>جاري إرسال الطلب واعتماده...</span>
                ) : (
                  <>
                    <span>إرسال وتأكيد الطلب رسمياً</span>
                    <CheckCircle2 className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Cancel Confirmation Popup Modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 p-6 space-y-6 text-center border border-stone-100" dir="rtl">
              <div className="mx-auto w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center">
                <Trash2 className="h-8 w-8" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-black text-stone-900">⚠️ هل أنت متأكد من إلغاء وحذف الطلب؟</h3>
                <p className="text-stone-500 text-xs sm:text-sm leading-relaxed font-bold">
                  سيتم حذف جميع البيانات والملفات التي قمت بتعبئتها في هذا الفورم بشكل نهائي وبأمان، ولن يتم حفظها في النظام أبداً.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelAndCleanup}
                  className="w-full py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs sm:text-sm cursor-pointer shadow-md transition-colors"
                >
                  نعم، احذف وألغِ الطلب
                </button>
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  className="w-full py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-xs sm:text-sm border border-stone-200 cursor-pointer transition-colors"
                >
                  تراجع وإكمال التسجيل
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
