import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Crown, CheckCircle2, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { Business } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit } from 'firebase/firestore';

interface VipUpgradeRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business;
  initialCycle?: 'monthly' | 'yearly';
}

export function VipUpgradeRequestModal({
  isOpen,
  onClose,
  business,
  initialCycle = 'yearly'
}: VipUpgradeRequestModalProps) {
  const { currentUser, userProfile } = useAuth();
  
  // States
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>(initialCycle);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [checkingPending, setCheckingPending] = useState(false);
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Reset states when opened
      setIsSuccess(false);
      setError('');
      setIsSubmitting(false);
      setHasPending(false);
      if (initialCycle) setCycle(initialCycle);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen, initialCycle]);

  useEffect(() => {
    const checkPendingRequest = async () => {
      if (!isOpen || !business?.id) return;
      setCheckingPending(true);
      setError('');
      setHasPending(false);
      try {
        const q = query(
          collection(db, 'upgradeRequests'),
          where('businessId', '==', business.id),
          where('status', '==', 'pending'),
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          setHasPending(true);
          setError('انك قد طلبت طلب ترقية والرجاء الانتظار للموافقة');
        }
      } catch (err) {
        console.error('Error checking pending upgrade requests:', err);
      } finally {
        setCheckingPending(false);
      }
    };

    checkPendingRequest();
  }, [isOpen, business?.id]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleRequestSubmit = async () => {
    if (!currentUser) {
      setError('يجب تسجيل الدخول لإرسال الطلب');
      return;
    }

    if (hasPending) {
      setError('انك قد طلبت طلب ترقية والرجاء الانتظار للموافقة');
      return;
    }
    
    setIsSubmitting(true);
    setError('');
    
    try {
      const isBranch = !!business?.parentBusinessId || !!(business as any)?.isBranch;
      const price = isBranch 
        ? (cycle === 'yearly' ? 47.6 : 7.6)
        : (cycle === 'yearly' ? 119 : 19);
      
      const payload = {
        businessId: business.id,
        businessName: business.name,
        ownerId: currentUser.uid,
        ownerEmail: currentUser.email || '',
        ownerPhone: userProfile?.phone || '',
        planId: 'golden',
        cycle: cycle,
        price: price,
        isBranch: isBranch,
        discountNote: isBranch ? 'تم تطبيق خصم 60% الخاص بالفروع الإضافية' : null,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await addDoc(collection(db, 'upgradeRequests'), payload);
      
      // Also send an audit log or notification to admin (optional)
      
      setIsSuccess(true);
      
      // Auto close after 3 seconds
      setTimeout(() => {
        onClose();
      }, 3000);
      
    } catch (err: any) {
      console.error('Error submitting upgrade request:', err);
      setError('حدث خطأ أثناء إرسال الطلب، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBranch = !!business?.parentBusinessId || !!(business as any)?.isBranch;
  const currentPrice = isBranch 
    ? (cycle === 'yearly' ? '47.6' : '7.6')
    : (cycle === 'yearly' ? '119' : '19');

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative my-auto animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 text-amber-600 p-2.5 rounded-xl">
              <Crown className="h-6 w-6 fill-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-[#2d2a26]">تأكيد طلب الترقية</h2>
              {isBranch && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full inline-block mt-0.5">
                  🏷️ فرع إضافي - يطبق خصم 60%
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-stone-100 text-stone-500 hover:bg-stone-200 rounded-full transition-colors cursor-pointer"
            disabled={isSubmitting || isSuccess}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-emerald-700">تم إرسال طلبك بنجاح!</h3>
              <p className="text-sm text-stone-600 leading-relaxed">
                سيقوم فريق الدعم بمراجعة طلب الترقية لمحل <span className="font-bold">({business.name})</span> والتواصل معك قريباً.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 text-red-700 border border-red-200 p-3 rounded-xl text-sm font-bold flex items-start gap-2">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}
            
            {/* Cycle Selection Toggle (Simplified) */}
            <div className="bg-stone-50 border border-stone-200 p-1.5 rounded-2xl flex relative">
              <button
                type="button"
                onClick={() => setCycle('monthly')}
                className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all z-10 ${
                  cycle === 'monthly' ? 'bg-white shadow-sm text-stone-900 border border-stone-200/50' : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                الدفع الشهري
              </button>
              <button
                type="button"
                onClick={() => setCycle('yearly')}
                className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all z-10 flex items-center justify-center gap-1.5 ${
                  cycle === 'yearly' ? 'bg-[#1a4d2e] text-white shadow-md' : 'text-[#1a4d2e] hover:bg-stone-200/50'
                }`}
              >
                الدفع السنوي
                {cycle !== 'yearly' && (
                  <span className="bg-amber-400 text-amber-950 text-[9px] px-1.5 py-0.5 rounded-full animate-pulse">
                    وفر 48%
                  </span>
                )}
              </button>
            </div>

            {/* Requested Plan Summary Card */}
            <div className="border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-white rounded-2xl p-5 relative overflow-hidden">
              <div className="absolute -left-8 -top-8 w-24 h-24 bg-amber-200/40 rounded-full blur-xl"></div>
              
              <div className="relative z-10 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md mb-2 inline-block">
                      الباقة المختارة
                    </span>
                    <h3 className="text-lg font-black text-stone-900">الباقة الذهبية VIP</h3>
                    <p className="text-xs font-bold text-stone-500 mt-0.5">لمحل: {business.name}</p>
                  </div>
                </div>
                
                <div className="space-y-1.5 pt-1 text-[11px] text-stone-700">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>نافذة ترحيبية منبثقة تفاعلية 🎬 (صورة أو فيديو عند فتح صفحة المحل)</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>كتالوج ومنيو رقمي تفاعلي كامل مع صور وأسعار</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>لوحة تحليلات وإحصائيات دقيقة لتفاعل الزوار</span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>شارة التوثيق الذهبية ⭐ وأولوية الظهور في البحث</span>
                  </div>
                </div>

                {isBranch && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] p-2.5 rounded-xl font-bold">
                    🎉 تم تطبيق خصم 60% الخاص بالفروع الإضافية على هذا الاشتراك!
                  </div>
                )}

                <div className="pt-3 border-t border-amber-200/50 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-stone-500 font-bold">المبلغ المطلوب:</span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      {isBranch && (
                        <span className="text-xs text-stone-400 line-through font-bold ml-1">
                          {cycle === 'yearly' ? '119' : '19'} د.أ
                        </span>
                      )}
                      <span className="text-3xl font-black text-amber-900">
                        {currentPrice}
                      </span>
                      <span className="text-xs font-bold text-amber-700">
                        د.أ / {cycle === 'yearly' ? 'سنوياً' : 'شهرياً'}
                      </span>
                    </div>
                  </div>
                  
                  {cycle === 'yearly' && (
                    <div className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-1.5 rounded-lg text-center leading-tight">
                      وفرت {isBranch ? '71.4' : '109'} د.أ 🔥<br/>
                      <span className="opacity-80 font-bold">مقارنة بالشهري</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Actions */}
            <div className="pt-2">
              <button
                onClick={handleRequestSubmit}
                disabled={isSubmitting || hasPending || checkingPending}
                className="w-full bg-[#1a4d2e] hover:bg-[#133b22] text-white font-black py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {checkingPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>جاري التحقق من الطلبات...</span>
                  </>
                ) : isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>جاري الإرسال...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    <span>إرسال طلب الترقية للإدارة</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-stone-400 text-center mt-3 font-medium">
                بإرسالك الطلب، سيقوم فريق المبيعات بالتواصل معك لإتمام عملية الترقية.
              </p>
            </div>

          </div>
        )}

      </div>
    </div>,
    document.body
  );
}

