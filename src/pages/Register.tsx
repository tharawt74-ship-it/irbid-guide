import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Store, Eye, EyeOff, ShieldCheck, Mail, CheckCircle2, ArrowRight, RefreshCw, AlertCircle, Hourglass, Sparkles } from 'lucide-react';

export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unauthorizedDomain, setUnauthorizedDomain] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Verification Step State (Firebase Link Auto-Poll)
  const [pendingVerification, setPendingVerification] = useState(false);
  const [pendingUser, setPendingUser] = useState<{ uid: string; email: string; name: string } | null>(null);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [autoVerified, setAutoVerified] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Polling Effect: Checks every 3.5 seconds if the user clicked the verification link in their email
  useEffect(() => {
    let intervalId: any;
    if (pendingVerification && auth?.currentUser) {
      intervalId = setInterval(async () => {
        try {
          // Force Firebase to reload user account details from server to get freshest emailVerified flag
          await auth.currentUser.reload();
          
          if (auth.currentUser.emailVerified) {
            clearInterval(intervalId);
            setAutoVerified(true);
            
            // 1. Update Firestore user status to verified
            if (db) {
              await setDoc(doc(db, 'users', auth.currentUser.uid), {
                emailVerified: true
              }, { merge: true });
            }

            // 2. Play a brief success animation and redirect to home page as fully logged in!
            setTimeout(() => {
              navigate('/');
            }, 2000);
          }
        } catch (err) {
          console.error("Error reloading user status for verification:", err);
        }
      }, 3500);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [pendingVerification, navigate]);

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
    
    if (!agreedToTerms) {
      setError('يرجى قراءة والموافقة على شروط الخدمة وسياسة الخصوصية للمتابعة.');
      setLoading(false);
      return;
    }
    
    if (!auth) {
      setError('يرجى إعداد قاعدة بيانات Firebase أولاً');
      setLoading(false);
      return;
    }

    try {
      const cleanEmail = email.trim().toLowerCase();
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCredential.user;
      
      await updateProfile(user, {
         displayName: name.trim()
      });

      // Firebase Action Code Settings to Redirect Back
      const actionCodeSettings = {
        url: window.location.origin + '/login?verified=true',
        handleCodeInApp: false
      };

      // Send Firebase Email Verification link with fallback for unlisted domains
      try {
        await sendEmailVerification(user, actionCodeSettings);
      } catch (verr: any) {
        console.warn("Firebase sendEmailVerification with continue URL failed, trying fallback without redirect:", verr);
        try {
          await sendEmailVerification(user);
        } catch (fallbackErr: any) {
          console.warn("Firebase sendEmailVerification fallback also failed:", fallbackErr);
          if (fallbackErr?.code === 'auth/too-many-requests' || fallbackErr?.message?.includes('too-many-requests')) {
            setError('تم إنشاء الحساب، ولكن تم إرسال عدة طلبات تأكيد مؤخراً. يرجى الانتظار دقيقة قبل طلب إعادة إرسال الرابط.');
          }
        }
      }

      const isBootstrapAdmin = ['princessofx2344@gmail.com', 'admin@shoofiirbid.com', 'irbid.admin@gmail.com'].includes(cleanEmail);
      const userRole = isBootstrapAdmin ? 'super_admin' : 'user';

      if (db) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: cleanEmail,
          displayName: name.trim(),
          role: userRole,
          status: 'active',
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
          savedFavorites: [],
          emailVerified: isBootstrapAdmin ? true : false
        }, { merge: true });
      }

      if (isBootstrapAdmin) {
        navigate('/');
      } else {
        // Keep them logged in, showing unverified holding screen with active polling
        setPendingUser({
          uid: user.uid,
          email: cleanEmail,
          name: name.trim()
        });
        setPendingVerification(true);
      }
    } catch (err: any) {
      console.error("Register error:", err);
      const errMsg = err?.message || '';
      if (err.code === 'auth/email-already-in-use' || errMsg.includes('email-already-in-use')) {
        setError('البريد الإلكتروني مستخدم مسبقاً. يمكنك الانتقال لشاشة تسجيل الدخول.');
      } else if (err.code === 'auth/weak-password' || errMsg.includes('weak-password')) {
        setError('كلمة المرور ضعيفة جداً. يرجى اختيار كلمة مرور أطول وأقوى.');
      } else {
        setError('حدث خطأ أثناء إنشاء الحساب. يرجى التأكد من البيانات والمحاولة مجدداً.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendLink = async () => {
    if (!auth?.currentUser) return;
    setResending(true);
    setResendSuccess(false);

    try {
      const actionCodeSettings = {
        url: window.location.origin + '/login?verified=true',
        handleCodeInApp: false
      };
      try {
        await sendEmailVerification(auth.currentUser, actionCodeSettings);
      } catch (verr: any) {
        console.warn("Resend link with continue URL failed, trying fallback:", verr);
        await sendEmailVerification(auth.currentUser);
      }
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 5000);
    } catch (err: any) {
      console.warn("Resend error:", err);
      if (err?.code === 'auth/too-many-requests' || err?.message?.includes('too-many-requests')) {
        setError('تم إرسال عدة طلبات مؤخراً. يرجى الانتظار دقيقة كاملة قبل محاولة إعادة الإرسال مجدداً حفاظاً على الأمان.');
      } else {
        setError('فشل إعادة إرسال الرابط. يرجى المحاولة مجدداً بعد قليل.');
      }
    } finally {
      setResending(false);
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
      console.warn("Google register error:", err);
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

  return (
    <div className="min-h-[70vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Store className="mx-auto h-12 w-12 text-[#1a4d2e]" />
        <h2 className="mt-6 text-3xl font-extrabold text-stone-900">
          {pendingVerification ? 'تأكيد البريد الإلكتروني' : 'إنشاء حساب جديد'}
        </h2>
        {!pendingVerification && (
          <p className="mt-2 text-sm text-stone-600">
            أو{' '}
            <Link to="/login" state={{ from: location.state?.from }} className="font-medium text-[#1a4d2e] hover:text-[#1a4d2e]">
              تسجيل الدخول لحسابك
            </Link>
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-[32px] sm:px-10 border border-[#e5e1da]">
          {pendingVerification ? (
            <div className="space-y-5">
              {autoVerified ? (
                <div className="space-y-4 text-center py-6 animate-in fade-in zoom-in duration-300 text-right">
                  <div className="w-16 h-16 bg-[#1a4d2e]/10 text-[#1a4d2e] rounded-full mx-auto flex items-center justify-center shadow-xs">
                    <Sparkles className="h-8 w-8 animate-bounce text-[#1a4d2e]" />
                  </div>
                  <div className="space-y-1.5 text-center">
                    <h3 className="font-black text-2xl text-[#1a4d2e]">تم تفعيل الحساب بنجاح! 🎉</h3>
                    <p className="text-sm text-stone-600 leading-relaxed font-medium">
                      مرحباً بك يا <span className="font-bold text-[#1a4d2e]">{pendingUser?.name}</span> في عائلة "شو في بإربد؟".
                    </p>
                    <p className="text-xs text-stone-400 font-bold">جاري توجيهك الآن إلى لوحة التحكم الشخصية...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 text-right">
                  <div className="space-y-3 text-center py-2">
                    <div className="w-16 h-16 bg-[#1a4d2e]/5 text-[#1a4d2e] rounded-full mx-auto flex items-center justify-center relative">
                      <Mail className="h-7 w-7 text-[#1a4d2e]" />
                      <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#1a4d2e] animate-spin opacity-40" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-black text-xl text-stone-900">أكد بريدك الإلكتروني ✉️</h3>
                      <p className="text-xs text-stone-500 font-medium">
                        أرسلنا رابط تفعيل آمن لعنوان البريد الإلكتروني التالي:
                      </p>
                      <div className="font-mono font-bold text-[#1a4d2e] bg-[#1a4d2e]/5 px-3 py-1.5 rounded-xl border border-[#1a4d2e]/10 inline-block text-xs">
                        {pendingUser?.email}
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50/70 border border-amber-200/60 p-4 rounded-2xl text-xs space-y-2.5 text-stone-700 leading-relaxed">
                    <div className="flex items-center gap-1.5 font-black text-amber-900 text-sm">
                      <Hourglass className="h-4.5 w-4.5 animate-pulse text-amber-700" />
                      <span>انتظار التنشيط تلقائياً...</span>
                    </div>
                    <p>
                      يرجى فتح بريدك الإلكتروني الآن (تحقق من مجلد الـ <strong>Spam / الرسائل غير المرغوب فيها</strong> إذا لم تجدها) واضغط على رابط التفعيل.
                    </p>
                    <p className="font-bold text-amber-950">
                      💡 بمجرد ضغطك على الرابط هناك، ستتعرف هذه الصفحة على التنشيط تلقائياً خلال ثوانٍ وتدخلك للموقع فوراً دون الحاجة لإدخال أي شيء!
                    </p>
                  </div>

                  {resendSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-[#1a4d2e] rounded-2xl font-bold text-xs text-center">
                      تم إعادة إرسال رابط التفعيل الآمن إلى بريدك الإلكتروني بنجاح!
                    </div>
                  )}

                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      onClick={handleResendLink}
                      disabled={resending}
                      className="w-full py-3 bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-2xl font-bold text-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
                      <span>{resending ? 'جاري إعادة الإرسال...' : 'إعادة إرسال رابط التفعيل الآمن'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/login', { state: { email: pendingUser?.email } })}
                      className="w-full py-3 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-2xl font-black text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>الانتقال لتسجيل الدخول يدوياً</span>
                      <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
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
                    <div className="bg-red-50 text-red-700 p-3 rounded-[20px] border border-red-100 text-sm">
                      {error}
                    </div>
                  )}
                </div>
              )}
              
              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-stone-700">
                    الاسم الكامل *
                  </label>
                  <div className="mt-1">
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      placeholder="مثال: أحمد العلي"
                      className="appearance-none block w-full px-4 py-3 border border-[#e5e1da] rounded-[20px] shadow-xs placeholder-neutral-400 focus:outline-none focus:ring-[#1a4d2e] focus:border-[#1a4d2e] sm:text-sm font-medium"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-stone-700">
                    البريد الإلكتروني *
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
                  <label htmlFor="password" className="block text-sm font-medium text-stone-700">
                    كلمة المرور *
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      dir="ltr"
                      minLength={6}
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
                  <p className="mt-1 text-[11px] text-stone-400">سيتم إرسال كود تأكيد للبريد لتفعيل الحساب بعد الإنشاء.</p>
                </div>

                <div className="flex items-start py-1">
                  <div className="flex items-center h-5">
                    <input
                      id="agree-terms"
                      name="agree-terms"
                      type="checkbox"
                      required
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="h-4.5 w-4.5 text-[#1a4d2e] focus:ring-[#1a4d2e] border-[#e5e1da] rounded-md cursor-pointer accent-[#1a4d2e]"
                    />
                  </div>
                  <div className="mr-2 text-xs leading-relaxed">
                    <label htmlFor="agree-terms" className="font-bold text-stone-600 cursor-pointer select-none">
                      أوافق وأتعهد بالالتزام بـ{' '}
                      <Link to="/terms" target="_blank" className="font-black text-[#1a4d2e] hover:underline">
                        شروط وأحكام الخدمة
                      </Link>
                      {' '}و{' '}
                      <Link to="/privacy" target="_blank" className="font-black text-[#1a4d2e] hover:underline">
                        سياسة الخصوصية وسرية البيانات
                      </Link>
                      {' '}الخاصة بـ "شو في بإربد؟" *
                    </label>
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading || !agreedToTerms}
                    className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-[20px] shadow-xs text-sm font-bold text-white bg-[#1a4d2e] hover:bg-[#133b22] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a4d2e] disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب جديد'}
                  </button>
                </div>
              </form>

              <div className="mt-6">
                <div className="relative flex items-center justify-center">
                  <div className="absolute inset-x-0 h-px bg-stone-200"></div>
                  <span className="relative px-3 bg-white text-xs font-bold text-stone-500">أو سجل حسابك عبر</span>
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
                    <span>التسجيل السريع باستخدام حساب جوجل</span>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}

