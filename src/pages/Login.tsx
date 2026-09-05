import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, sendPasswordResetEmail, sendEmailVerification, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { sendDirectEmailVerification } from '../lib/sendCustomVerification';
import { Store, KeyRound, Mail, CheckCircle2, ArrowRight, X, AlertCircle, Eye, EyeOff, ShieldCheck, RefreshCw, Copy, Check } from 'lucide-react';

export function Login() {
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unauthorizedDomain, setUnauthorizedDomain] = useState('');
  
  // Reset Password Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState('');

  // Unverified Email Modal State (Firebase Link flow)
  const [isUnverifiedModalOpen, setIsUnverifiedModalOpen] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendingCode, setResendingCode] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [justVerified, setJustVerified] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (location.state?.email && !email) {
      setEmail(location.state.email);
    }
  }, [location.state]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('verified') === 'true') {
      setJustVerified(true);
      // Clean up the URL query params so they don't linger
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleStayAsGuest = (e: React.MouseEvent) => {
    e.preventDefault();
    const fallback = sessionStorage.getItem('lastNonAuthPath') || '/';
    if (location.state?.from) {
      navigate(location.state.from);
    } else if (fallback && fallback !== '/login' && fallback !== '/register') {
      navigate(fallback);
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setUnauthorizedDomain('');
    
    if (!auth) {
      setError('يرجى إعداد قاعدة بيانات Firebase أولاً');
      setLoading(false);
      return;
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;

      // Reload user status to get freshest emailVerified flag
      try {
        await user.reload();
      } catch (rErr) {
        console.warn("User reload warning:", rErr);
      }

      const isBootstrapAdmin = ['princessofx2344@gmail.com', 'admin@shoofiirbid.com', 'irbid.admin@gmail.com'].includes(cleanEmail);
      let isEmailVerified = user.emailVerified || isBootstrapAdmin;

      if (!isEmailVerified && db) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists() && userDocSnap.data()?.emailVerified === true) {
            isEmailVerified = true;
          }
        } catch (fErr) {
          console.warn("Error checking emailVerified in Firestore:", fErr);
        }
      }

      if (!isEmailVerified) {
        // Send a fresh Firebase Email Verification link automatically with fallback for unlisted domains
        const actionCodeSettings = {
          url: window.location.origin + '/login?verified=true',
          handleCodeInApp: false
        };

        try {
          try {
            await sendEmailVerification(user, actionCodeSettings);
          } catch (verr: any) {
            console.warn("Firebase sendEmailVerification on login with redirect failed, trying fallback:", verr);
            await sendEmailVerification(user);
          }
          setResendSuccess(true);
        } catch (verr: any) {
          console.warn("Firebase sendEmailVerification fallback failed as well:", verr);
          setResendSuccess(false);
          if (verr?.code === 'auth/too-many-requests' || verr?.message?.includes('too-many-requests')) {
            // Force sign out so unverified user cannot browse logged-in sessions
            await firebaseSignOut(auth);
            setUnverifiedEmail(cleanEmail);
            setIsUnverifiedModalOpen(true);
            setError('حسابك يتطلب تأكيد البريد الإلكتروني. يرجى الانتظار دقيقة قبل طلب رابط تفعيل جديد نظراً لكثرة المحاولات مؤخراً.');
            return;
          }
        }

        // Force sign out so unverified user cannot browse logged-in sessions
        await firebaseSignOut(auth);

        setUnverifiedEmail(cleanEmail);
        setIsUnverifiedModalOpen(true);
        setError('حسابك يتطلب تأكيد البريد الإلكتروني لتتمكن من تسجيل الدخول. تم إرسال رابط تفعيل جديد.');
        return;
      }

      navigate('/');
    } catch (err: any) {
      console.error("Login error:", err);
      const code = err.code || '';
      const msg = err.message || '';

      if (
        code === 'auth/invalid-credential' || 
        code === 'auth/user-not-found' || 
        code === 'auth/wrong-password' || 
        code === 'auth/invalid-email' ||
        msg.includes('invalid-credential') ||
        msg.includes('wrong-password')
      ) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة. يمكنك استخدام خيار "نسيت كلمة المرور؟" لاستعادة حسابك.');
      } else if (code === 'auth/too-many-requests') {
        setError('تم حظر المحاولات الفاشلة الكثيرة مؤقتاً لحماية حسابك. يرجى المحاولة لاحقاً أو إعادة ضبط كلمة المرور.');
      } else if (code === 'auth/user-disabled') {
        setError('تم تجميد هذا الحساب مؤقتاً. يرجى التواصل مع إدارة المنصة.');
      } else {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التأكد من البيانات والمحاولة مجدداً.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerificationLink = async () => {
    if (!unverifiedEmail || !password) return;
    setResendingCode(true);
    setResendSuccess(false);

    try {
      // Log them in briefly to get user instance
      const credential = await signInWithEmailAndPassword(auth, unverifiedEmail, password);
      if (credential.user) {
        await sendDirectEmailVerification(credential.user, unverifiedEmail);
        setResendSuccess(true);
      }
      // Force sign out back
      await firebaseSignOut(auth);
    } catch (err: any) {
      console.warn("Resend link error:", err);
      if (err?.code === 'auth/too-many-requests' || err?.message?.includes('too-many-requests')) {
        alert('تم إرسال عدة طلبات مؤخراً. يرجى الانتظار دقيقة كاملة قبل محاولة إعادة الإرسال مجدداً حفاظاً على الأمان.');
      } else {
        alert('فشل إعادة إرسال الرابط. يرجى التأكد من صحة البيانات والمحاولة مجدداً.');
      }
    } finally {
      setResendingCode(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) {
      setError('يرجى إعداد قاعدة بيانات Firebase أولاً');
      return;
    }
    setLoading(true);
    setError('');
    setUnauthorizedDomain('');
    
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      if (db) {
        const cleanEmail = user.email ? user.email.toLowerCase() : '';
        const isBootstrapAdmin = ['princessofx2344@gmail.com', 'admin@shoofiirbid.com', 'irbid.admin@gmail.com'].includes(cleanEmail);
        const userRole = isBootstrapAdmin ? 'super_admin' : 'user';
        
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: cleanEmail,
          displayName: user.displayName || 'مستخدم جوجل',
          role: userRole,
          status: 'active',
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
          savedFavorites: [],
          emailVerified: true
        }, { merge: true });
      }
      
      const destination = location.state?.from || '/';
      navigate(destination);
    } catch (err: any) {
      console.warn("Google login error:", err);
      if (err.code === 'auth/unauthorized-domain' || err.message?.includes('unauthorized-domain')) {
        const currentDomain = window.location.origin;
        setUnauthorizedDomain(currentDomain);
        setError('unauthorized-domain');
      } else if (err.code === 'auth/popup-closed-by-user' || err.message?.includes('popup-closed-by-user')) {
        setError('تم إغلاق نافذة تسجيل الدخول قبل إتمام العملية.');
      } else if (err.code === 'auth/cancelled-popup-request' || err.message?.includes('cancelled-popup-request')) {
        setError('تم إلغاء طلب تسجيل الدخول.');
      } else {
        setError('حدث خطأ أثناء تسجيل الدخول عبر Google. يرجى المحاولة مجدداً.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    setResetSuccess(false);

    if (!auth) {
      setResetError('خدمة المصادقة غير ممتدة حالياً');
      setResetLoading(false);
      return;
    }

    const targetEmail = resetEmail.trim() || email.trim();
    if (!targetEmail) {
      setResetError('يرجى كتابة البريد الإلكتروني الخاص بك');
      setResetLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setResetSuccess(true);
    } catch (err: any) {
      console.warn("Reset password error:", err);
      if (err.code === 'auth/user-not-found') {
        setResetError('لم نجد حساباً مسجلاً بهذا البريد الإلكتروني');
      } else if (err.code === 'auth/invalid-email') {
        setResetError('البريد الإلكتروني المدخل غير صالح');
      } else if (err.code === 'auth/too-many-requests') {
        setResetError('تم إرسال طلبات كثيرة مؤخراً. يرجى الانتظار قليلاً ثم المحاولة');
      } else {
        setResetError('حدث خطأ أثناء إرسال رابط إعادة ضبط كلمة المرور');
      }
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Store className="mx-auto h-12 w-12 text-[#1a4d2e]" />
        <h2 className="mt-6 text-3xl font-extrabold text-stone-900">تسجيل الدخول</h2>
        <p className="mt-2 text-sm text-stone-600">
          أو{' '}
          <Link to="/register" state={{ from: location.state?.from }} className="font-medium text-[#1a4d2e] hover:text-[#1a4d2e]">
            إنشاء حساب جديد
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-[32px] sm:px-10 border border-[#e5e1da]">
          {justVerified && (
            <div className="mb-5 bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-xs space-y-1.5 text-right animate-in fade-in zoom-in duration-300">
              <div className="flex items-center gap-1.5 font-black text-emerald-800 text-sm">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>تم تأكيد البريد الإلكتروني بنجاح! 🎉</span>
              </div>
              <p className="text-stone-700 leading-relaxed font-medium">
                حسابك الآن مفعل ونشط بالكامل. يرجى إدخال كلمة المرور لتسجيل الدخول الآمن للوحة التحكم الخاصة بك.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4">
              {error === 'unauthorized-domain' ? (
                <div className="bg-amber-50 text-amber-950 p-4 rounded-[20px] border border-amber-200 text-xs leading-relaxed space-y-2.5">
                  <div className="flex items-center gap-1.5 font-black text-amber-800 text-sm">
                    <span>⚠️ نطاق المعاينة غير مرخص في Firebase</span>
                  </div>
                  <p>
                    نظام تسجيل الدخول عبر Google مدمج ومفعل بشكل ممتاز! لكي تتمكن من استخدامه في بيئة المعاينة الحالية، يجب إضافة عنوان هذا الموقع إلى قائمة النطاقات المسموحة في مشروعك على Firebase:
                  </p>
                  <div className="bg-white/90 p-2 rounded-xl border border-amber-300 font-mono text-center text-[13px] font-black text-stone-700 select-all cursor-pointer" title="تحديد النطاق لنسخه">
                    {unauthorizedDomain}
                  </div>
                  <p className="text-[10px] text-stone-500 font-bold">
                    الخطوات السريعة: Firebase Console ➔ Authentication ➔ Settings ➔ Authorized Domains ➔ ثم قم بإضافة العنوان أعلاه.
                  </p>
                </div>
              ) : (
                <div className="bg-red-50 text-red-700 p-3.5 rounded-[20px] border border-red-100 text-xs font-bold leading-relaxed flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
          
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-stone-700">
                البريد الإلكتروني
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  dir="ltr"
                  placeholder="name@example.com"
                  className="appearance-none block w-full px-4 py-3 border border-[#e5e1da] rounded-[20px] shadow-xs placeholder-neutral-400 focus:outline-none focus:ring-[#1a4d2e] focus:border-[#1a4d2e] sm:text-sm text-right font-medium"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-stone-700">
                  كلمة المرور
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setResetError('');
                    setResetSuccess(false);
                    setIsResetModalOpen(true);
                  }}
                  className="text-xs font-bold text-[#1a4d2e] hover:underline cursor-pointer"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  dir="ltr"
                  placeholder="••••••••"
                  className="appearance-none block w-full px-4 py-3 pl-11 border border-[#e5e1da] rounded-[20px] shadow-xs placeholder-neutral-400 focus:outline-none focus:ring-[#1a4d2e] focus:border-[#1a4d2e] sm:text-sm text-right font-medium"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer transition-colors"
                  title={showPassword ? 'إخفاء كلمة المرور' : 'عرض كلمة المرور'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-[20px] shadow-xs text-sm font-bold text-white bg-[#1a4d2e] hover:bg-[#133b22] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a4d2e] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {loading ? 'جاري الدخول...' : 'تسجيل الدخول'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-x-0 h-px bg-stone-200"></div>
              <span className="relative px-3 bg-white text-xs font-bold text-stone-500">أو سجل الدخول عبر</span>
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 border border-stone-200 hover:border-stone-300 hover:bg-stone-50 rounded-[20px] shadow-2xs text-sm font-black text-stone-700 bg-white transition-all cursor-pointer hover:shadow-sm"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                  <g transform="matrix(1, 0, 0, 1, 0, 0)">
                    <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.56h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.49c0,-0.61 -0.05,-1.2 -0.15,-1.77Z" fill="#4285f4" />
                    <path d="M12,20.62c2.43,0 4.47,-0.8 5.96,-2.18l-3.3,-2.56c-0.9,0.6 -2.07,0.98 -3.3,0.98c-2.34,0 -4.33,-1.58 -5.04,-3.71H2.89v2.64c1.49,2.97 4.56,5.01,8.15,5.01Z" fill="#34a853" />
                    <path d="M6.96,13.15c-0.18,-0.55 -0.29,-1.13 -0.29,-1.73s0.1,-1.18 0.29,-1.73V7.05H2.89c-0.63,1.27 -1,2.7 -1,4.22s0.37,2.95 1,4.22l4.07,-3.12Z" fill="#fbbc05" />
                    <path d="M12,6.5c1.31,0 2.49,0.45 3.42,1.34l2.56,-2.56C16.43,3.75 14.39,3 12,3c-3.59,0 -6.66,2.04 -8.15,5.01l4.07,3.12c0.71,-2.13 2.7,-3.71 5.04,-3.71Z" fill="#ea4335" />
                  </g>
                </svg>
                <span>تسجيل الدخول السريع باستخدام حساب جوجل</span>
              </button>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-stone-100 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleStayAsGuest}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 border border-stone-200 hover:border-stone-300 hover:bg-stone-50 rounded-[20px] text-xs font-black text-stone-600 transition-colors cursor-pointer"
            >
              <span>البقاء كضيف والرجوع للخلف ↩</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unverified Email Link Modal */}
      {isUnverifiedModalOpen && unverifiedEmail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-[32px] sm:rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto -mt-2 mb-3 sm:hidden" />

            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-[#1a4d2e] rounded-xl font-bold">
                  <Mail className="h-5 w-5" />
                </div>
                <h3 className="font-black text-base text-stone-900 text-right">تأكيد البريد الإلكتروني</h3>
              </div>
              <button 
                onClick={() => setIsUnverifiedModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-right">
              <p className="text-xs text-stone-600 leading-relaxed">
                حسابك مرتبط بالبريد <span className="font-mono font-bold text-[#1a4d2e]">{unverifiedEmail}</span> ولكنه غير مفعل بعد.
              </p>

              <div className="bg-amber-50/70 p-4 border border-amber-200 rounded-2xl text-xs leading-relaxed text-stone-700 space-y-2">
                <p className="font-bold text-amber-950 flex items-center gap-1.5">
                  <ShieldCheck className="h-4.5 w-4.5 text-amber-700 shrink-0" />
                  <span>تفعيل الحساب آمن وتلقائي</span>
                </p>
                <p>
                  لقد أرسلنا للتو رابط تفعيل آمن وجديد إلى بريدك الإلكتروني. يرجى فتح بريدك والضغط على الرابط لتنشيط حسابك، ثم عد إلى هنا لتسجيل الدخول.
                </p>
              </div>

              {resendSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-[#1a4d2e] rounded-2xl font-bold text-xs text-center">
                  تم إرسال رابط التفعيل الآمن إلى بريدك الإلكتروني بنجاح! يرجى مراجعة البريد الآن.
                </div>
              )}

              <div className="pt-2 space-y-2">
                <button
                  type="button"
                  onClick={() => setIsUnverifiedModalOpen(false)}
                  className="w-full py-3.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-2xl font-black text-xs shadow-sm transition-colors cursor-pointer"
                >
                  فهمت، سأتحقق من بريدي الإلكتروني
                </button>

                <button
                  type="button"
                  onClick={handleResendVerificationLink}
                  disabled={resendingCode}
                  className="w-full py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${resendingCode ? 'animate-spin' : ''}`} />
                  <span>{resendingCode ? 'جاري إعادة إرسال الرابط...' : 'إعادة إرسال رابط التفعيل'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-[32px] sm:rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5 animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            {/* Mobile Drag Indicator */}
            <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto -mt-2 mb-3 sm:hidden" />

            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-[#1a4d2e] rounded-xl font-bold">
                  <KeyRound className="h-5 w-5" />
                </div>
                <h3 className="font-black text-base text-stone-900">إعادة ضبط كلمة المرور</h3>
              </div>
              <button 
                onClick={() => setIsResetModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {resetSuccess ? (
              <div className="space-y-4 text-center py-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-black text-base text-stone-900">تم إرسال رابط التحقق بنجاح!</h4>
                  <p className="text-xs text-stone-600 leading-relaxed px-2">
                    قمنا بإرسال رابط أمني لإعادة ضبط كلمة المرور إلى البريد الإلكتروني التالي:
                  </p>
                  <div className="font-mono text-xs font-black text-[#1a4d2e] bg-emerald-50 py-2 px-3 rounded-xl border border-emerald-200 inline-block">
                    {resetEmail || email}
                  </div>
                </div>
                <p className="text-[11px] text-stone-400">
                  يرجى تفقد صندوق الوارد (أو مجلد الرسائل غير المرغوب فيها Spam) واتباع الرابط لتعيين كلمة مرور جديدة.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setIsResetModalOpen(false)}
                    className="w-full py-2.5 bg-[#1a4d2e] text-white rounded-xl font-bold text-xs shadow-xs cursor-pointer"
                  >
                    العودة إلى شاشة تسجيل الدخول
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
                <p className="text-stone-600 leading-relaxed">
                  أدخل بريدك الإلكتروني المسجل في المنصة، وسنقوم بإرسال رابط أمني ورمز تحقق لتتمكن من إعادة تعيين كلمة المرور بكل سهولة.
                </p>

                {resetError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl font-bold flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{resetError}</span>
                  </div>
                )}

                <div>
                  <label className="font-bold text-stone-700 mb-1 block">البريد الإلكتروني المسجل *</label>
                  <div className="relative">
                    <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                      type="email"
                      required
                      dir="ltr"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-10 pl-4 py-2.5 font-mono text-xs font-bold text-stone-800 text-right focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                    />
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsResetModalOpen(false)}
                    className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-5 py-2.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-xl font-black shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <span>{resetLoading ? 'جاري الإرسال...' : 'إرسال رابط التحقق'}</span>
                    {!resetLoading && <ArrowRight className="h-4 w-4 rotate-180" />}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


