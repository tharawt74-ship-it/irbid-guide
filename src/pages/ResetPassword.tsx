import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router';
import { confirmPasswordReset, verifyPasswordResetCode } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { KeyRound, CheckCircle2, AlertCircle, RefreshCw, Eye, EyeOff, ArrowRight } from 'lucide-react';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode');

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [verifying, setVerifying] = useState(true);
  const [verifyError, setVerifyError] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function checkCode() {
      if (!auth) {
        setVerifyError('خدمة المصادقة غير ممتدة حالياً');
        setVerifying(false);
        return;
      }
      if (!oobCode) {
        setVerifyError('رمز إعادة تعيين كلمة المرور مفقود أو غير صالح');
        setVerifying(false);
        return;
      }

      try {
        const userEmail = await verifyPasswordResetCode(auth, oobCode);
        setEmail(userEmail);
      } catch (err: any) {
        console.error("Verification error:", err);
        setVerifyError('رابط إعادة تعيين كلمة المرور منتهي الصلاحية أو غير صالح. يرجى طلب رابط جديد.');
      } finally {
        setVerifying(false);
      }
    }

    checkCode();
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !oobCode) return;

    setError('');

    if (newPassword.length < 6) {
      setError('يجب أن تتكون كلمة المرور من 6 خانات على الأقل');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setLoading(true);

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
    } catch (err: any) {
      console.error("Reset password error:", err);
      if (err.code === 'auth/weak-password') {
        setError('كلمة المرور المدخلة ضعيفة جداً');
      } else if (err.code === 'auth/expired-action-code') {
        setError('انتهت صلاحية الرابط، يرجى طلب رابط جديد');
      } else {
        setError('حدث خطأ غير متوقع أثناء إعادة تعيين كلمة المرور');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#faf9f6]">
      <div className="sm:mx-auto w-full max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-[#1a4d2e]/10 text-[#1a4d2e] rounded-2xl flex items-center justify-center mb-4">
            <KeyRound className="w-8 h-8" />
          </div>
        </div>
        <h2 className="text-center text-3xl font-black text-[#242220] tracking-tight">
          إعادة تعيين كلمة المرور
        </h2>
        <p className="mt-2 text-center text-sm text-[#5d5a55]">
          شو في بإربد؟ - منصتك ودليلك الأسرع والآمن
        </p>
      </div>

      <div className="mt-8 sm:mx-auto w-full max-w-md">
        <div className="bg-white py-8 px-4 border border-[#e8e4db] sm:rounded-3xl sm:px-10 shadow-xl shadow-[#1a4d2e]/5">
          {verifying ? (
            <div className="flex flex-col items-center justify-center py-12">
              <RefreshCw className="w-10 h-10 text-[#1a4d2e] animate-spin mb-4" />
              <p className="text-[#5d5a55] font-semibold">جاري التحقق من أمان الرابط المباشر...</p>
            </div>
          ) : verifyError ? (
            <div className="text-center py-6">
              <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-red-800 mb-2">رابط غير صالح</h3>
              <p className="text-[#5d5a55] text-sm mb-6 leading-relaxed">
                {verifyError}
              </p>
              <Link
                to="/login?reset=true"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#1a4d2e] hover:bg-[#153e25] transition-all"
              >
                طلب رابط جديد لإعادة التعيين
              </Link>
            </div>
          ) : success ? (
            <div className="text-center py-6">
              <div className="mx-auto w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black text-green-800 mb-2">تم التغيير بنجاح!</h3>
              <p className="text-[#5d5a55] text-sm mb-8 leading-relaxed">
                لقد تم تحديث كلمة المرور الخاصة بحسابك (<strong>{email}</strong>) بنجاح تام وأمان فائق. يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة فوراً.
              </p>
              <Link
                to="/login"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl text-base font-bold text-white bg-[#1a4d2e] hover:bg-[#153e25] transition-all shadow-lg shadow-[#1a4d2e]/20"
              >
                الدخول لحسابك الآن
                <ArrowRight className="w-5 h-5 rtl:rotate-180" />
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-[#1a4d2e]/5 rounded-2xl p-4 mb-4">
                <p className="text-sm text-[#1a4d2e] font-bold leading-relaxed">
                  مرحباً بك. الرابط آمن ومؤكد للبريد الإلكتروني المعتمد:
                  <span className="block text-xs text-[#5d5a55] font-mono mt-1 font-normal">{email}</span>
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 text-sm rounded-2xl p-4 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <p className="font-semibold leading-relaxed">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-[#242220] mb-2">
                  كلمة المرور الجديدة
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full rounded-2xl border border-[#e8e4db] px-4 py-3.5 text-[#242220] shadow-sm placeholder-[#a5a29e] focus:border-[#1a4d2e] focus:ring-[#1a4d2e] focus:ring-1 text-sm font-medium"
                    placeholder="لا تقل عن 6 خانات"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#5d5a55]"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-[#242220] mb-2">
                  تأكيد كلمة المرور الجديدة
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full rounded-2xl border border-[#e8e4db] px-4 py-3.5 text-[#242220] shadow-sm placeholder-[#a5a29e] focus:border-[#1a4d2e] focus:ring-[#1a4d2e] focus:ring-1 text-sm font-medium"
                  placeholder="أعد كتابة كلمة المرور"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-2xl shadow-md text-base font-bold text-white bg-[#1a4d2e] hover:bg-[#153e25] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#1a4d2e] disabled:opacity-50 transition-all shadow-[#1a4d2e]/20"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    جاري التحديث والتأمين...
                  </>
                ) : (
                  'تأكيد وتغيير كلمة المرور 🔐'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
