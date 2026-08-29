import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Store } from 'lucide-react';

export function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unauthorizedDomain, setUnauthorizedDomain] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      await updateProfile(userCredential.user, {
        displayName: name
      });

      if (db) {
        const cleanEmail = email.trim().toLowerCase();
        const isBootstrapAdmin = ['princessofx2344@gmail.com', 'admin@shoofiirbid.com', 'irbid.admin@gmail.com'].includes(cleanEmail);
        const userRole = isBootstrapAdmin ? 'super_admin' : 'user';

        await setDoc(doc(db, 'users', userCredential.user.uid), {
          uid: userCredential.user.uid,
          email: cleanEmail,
          displayName: name.trim(),
          role: userRole,
          status: 'active',
          createdAt: Date.now(),
          lastLoginAt: Date.now(),
          savedFavorites: []
        }, { merge: true });
      }
      
      navigate('/');
    } catch (err: any) {
      console.error("Register error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('البريد الإلكتروني مستخدم مسبقاً');
      } else if (err.code === 'auth/weak-password') {
        setError('كلمة المرور ضعيفة جداً');
      } else {
        setError('حدث خطأ أثناء إنشاء الحساب');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    setUnauthorizedDomain('');
    
    if (!auth) {
      setError('يرجى إعداد قاعدة بيانات Firebase أولاً');
      setLoading(false);
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (err: any) {
      console.error("Google sign-in error during registration:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setError('unauthorized-domain');
        setUnauthorizedDomain(window.location.hostname);
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setError('حدث خطأ أثناء تسجيل الدخول باستخدام حساب جوجل');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Store className="mx-auto h-12 w-12 text-[#1a4d2e]" />
        <h2 className="mt-6 text-3xl font-extrabold text-stone-900">إنشاء حساب جديد</h2>
        <p className="mt-2 text-sm text-stone-600">
          أو{' '}
          <Link to="/login" state={{ from: location.state?.from }} className="font-medium text-[#1a4d2e] hover:text-[#1a4d2e]">
            تسجيل الدخول لحسابك
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-[32px] sm:px-10 border border-[#e5e1da]">
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
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-stone-700">
                الاسم
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="appearance-none block w-full px-4 py-3 border border-[#e5e1da] rounded-[20px] shadow-sm placeholder-neutral-400 focus:outline-none focus:ring-[#1a4d2e] focus:border-[#1a4d2e] sm:text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

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
                  className="appearance-none block w-full px-4 py-3 border border-[#e5e1da] rounded-[20px] shadow-sm placeholder-neutral-400 focus:outline-none focus:ring-[#1a4d2e] focus:border-[#1a4d2e] sm:text-sm text-right"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-stone-700">
                كلمة المرور
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  dir="ltr"
                  minLength={6}
                  className="appearance-none block w-full px-4 py-3 border border-[#e5e1da] rounded-[20px] shadow-sm placeholder-neutral-400 focus:outline-none focus:ring-[#1a4d2e] focus:border-[#1a4d2e] sm:text-sm text-right"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-[20px] shadow-sm text-sm font-medium text-white bg-[#1a4d2e] hover:bg-[#133b22] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a4d2e] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {loading ? 'جاري الإنشاء...' : 'إنشاء حساب'}
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
                disabled={true}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-4 border border-stone-200 rounded-[20px] shadow-2xs text-sm font-black text-stone-400 bg-stone-50 cursor-not-allowed opacity-75"
              >
                <svg className="h-5 w-5 shrink-0 opacity-50" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                  <g transform="matrix(1, 0, 0, 1, 0, 0)">
                    <path d="M21.35,11.1H12v2.7h5.38c-0.24,1.28 -0.96,2.37 -2.04,3.1v2.56h3.3c1.93,-1.78 3.04,-4.4 3.04,-7.49c0,-0.61 -0.05,-1.2 -0.15,-1.77Z" fill="#4285f4" />
                    <path d="M12,20.62c2.43,0 4.47,-0.8 5.96,-2.18l-3.3,-2.56c-0.9,0.6 -2.07,0.98 -3.3,0.98c-2.34,0 -4.33,-1.58 -5.04,-3.71H2.89v2.64c1.49,2.97 4.56,5.01,8.15,5.01Z" fill="#34a853" />
                    <path d="M6.96,13.15c-0.18,-0.55 -0.29,-1.13 -0.29,-1.73s0.1,-1.18 0.29,-1.73V7.05H2.89c-0.63,1.27 -1,2.7 -1,4.22s0.37,2.95 1,4.22l4.07,-3.12Z" fill="#fbbc05" />
                    <path d="M12,6.5c1.31,0 2.49,0.45 3.42,1.34l2.56,-2.56C16.43,3.75 14.39,3 12,3c-3.59,0 -6.66,2.04 -8.15,5.01l4.07,3.12c0.71,-2.13 2.7,-3.71 5.04,-3.71Z" fill="#ea4335" />
                  </g>
                </svg>
                <span>إنشاء حساب باستخدام جوجل (قريباً)</span>
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
    </div>
  );
}
