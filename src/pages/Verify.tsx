import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { applyActionCode } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Loader2, AlertCircle } from 'lucide-react';

export function Verify() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleVerification = async () => {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      const oobCode = params.get('oobCode');

      if (!auth) {
        setError('يرجى تهيئة نظام Firebase أولاً.');
        setLoading(false);
        return;
      }

      if (oobCode) {
        try {
          // Verify the email code directly with Firebase
          await applyActionCode(auth, oobCode);
          // Redirect straight to login page with verified parameter
          navigate('/login?verified=true', { replace: true });
        } catch (err: any) {
          console.error("Verification error:", err);
          setError('رابط التفعيل هذا منتهي الصلاحية أو تم استخدامه مسبقاً. يرجى تسجيل الدخول وطلب رابط جديد.');
          setLoading(false);
        }
      } else {
        setError('رابط تفعيل غير صالح أو معلمة الطلب مفقودة.');
        setLoading(false);
      }
    };

    handleVerification();
  }, [navigate]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      {loading ? (
        <div className="space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-[#1a4d2e] mx-auto" />
          <h2 className="text-xl font-bold text-stone-800">جاري تفعيل حسابك تلقائياً...</h2>
          <p className="text-sm text-stone-500">يرجى الانتظار لحظة واحدة بينما نتحقق من بريدك الإلكتروني.</p>
        </div>
      ) : (
        <div className="max-w-md bg-white p-8 rounded-[32px] border border-[#e5e1da] shadow-xs space-y-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-black text-stone-900">تعذر تفعيل الحساب تلقائياً</h2>
          <p className="text-sm text-stone-600 leading-relaxed font-medium">
            {error}
          </p>
          <div className="pt-4">
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white font-bold text-sm rounded-full transition-colors cursor-pointer"
            >
              الانتقال لصفحة تسجيل الدخول
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
