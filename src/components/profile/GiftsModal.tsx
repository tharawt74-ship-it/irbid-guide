import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Gift as GiftIcon, X as XIcon, CheckCircle2 as CheckIcon, Clock as ClockIcon, Crown as CrownIcon, Sparkles as SparklesIcon, Store as StoreIcon } from 'lucide-react';
import { Business } from '../../types';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';

interface GiftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  businesses: Business[];
  currentUser: any;
  onGiftClaimed: (message: string) => void;
  onOpenUpgradeModal?: () => void;
}

export function GiftsModal({
  isOpen,
  onClose,
  businesses,
  currentUser,
  onGiftClaimed,
  onOpenUpgradeModal
}: GiftsModalProps) {
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [claiming, setClaiming] = useState(false);
  const [claimedBusinessIds, setClaimedBusinessIds] = useState<string[]>([]);
  const [checkingClaimed, setCheckingCheckingClaimed] = useState(false);

  // Filter businesses that have actual paid Gold/VIP plan (strictly excluding free trials)
  const goldBusinesses = businesses.filter(b => 
    (b.packagePlan === 'golden' || b.packagePlan === 'vip' || b.isVip) && 
    !b.isVipTrial
  );
  
  const hasTrialBusinesses = businesses.some(b => b.isVipTrial);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      if (goldBusinesses.length > 0 && !selectedBusinessId) {
        setSelectedBusinessId(goldBusinesses[0].id);
      }
      checkExistingGiftRequests();
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, goldBusinesses.length]);

  const checkExistingGiftRequests = async () => {
    if (!db || !currentUser?.uid) return;
    setCheckingCheckingClaimed(true);
    try {
      const q = query(
        collection(db, 'marketingRequests'),
        where('userId', '==', currentUser.uid),
        where('serviceType', '==', 'sponsored')
      );
      const snap = await getDocs(q);
      const claimedIds: string[] = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.isGoldFirstTimeGift || data.notes?.includes('هدية') || data.serviceName?.includes('هدية')) {
          if (data.businessId) claimedIds.push(data.businessId);
        }
      });
      setClaimedBusinessIds(claimedIds);
    } catch (err) {
      console.warn("Could not check existing gift requests:", err);
    } finally {
      setCheckingCheckingClaimed(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  const selectedBusiness = businesses.find(b => b.id === selectedBusinessId) || (goldBusinesses.length > 0 ? goldBusinesses[0] : null);
  const isAlreadyClaimed = selectedBusiness ? claimedBusinessIds.includes(selectedBusiness.id) : false;

  const handleClaimGift = async () => {
    if (!selectedBusiness || !db || !currentUser) return;
    setClaiming(true);

    try {
      const giftPayload = {
        businessId: selectedBusiness.id,
        businessName: selectedBusiness.name,
        userId: currentUser.uid,
        userEmail: currentUser.email || '',
        serviceType: 'sponsored',
        serviceName: 'صدارة البحث والترويج (هدية الباقة الذهبية لأول مرة)',
        status: 'pending',
        createdAt: Date.now(),
        phone: selectedBusiness.phone || selectedBusiness.ownerPhone || '',
        contactWhatsapp: selectedBusiness.phone || selectedBusiness.ownerPhone || '',
        durationWeeks: 'أسبوع واحد',
        sponsoredTargetType: 'business',
        sponsoredEntityName: selectedBusiness.name,
        isGoldFirstTimeGift: true,
        notes: 'هدية الاشتراك في باقة الذهبية لأول مرة'
      };

      await addDoc(collection(db, 'marketingRequests'), giftPayload);
      setClaimedBusinessIds(prev => [...prev, selectedBusiness.id]);
      onGiftClaimed('تم إرسال طلب تفعيل هدية صدارة البحث المجانية إلى لوحة تحكم الإدارة بنجاح');
      onClose();
    } catch (err) {
      console.error("Error claiming gift coupon:", err);
      alert('تعذر إرسال طلب تفعيل الهدية، يرجى المحاولة لاحقاً');
    } finally {
      setClaiming(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100000] bg-stone-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden" dir="rtl">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 relative my-0 sm:my-auto animate-in fade-in zoom-in-95 flex flex-col overflow-hidden">
        
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5e1da] p-5 pb-4 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <GiftIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#2d2a26]">الهدايا</h3>
              <p className="text-xs text-stone-500">كوبونات وهدايا الترويج للمحلات والمنشآت الطبية</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          
          {goldBusinesses.length === 0 ? (
            <div className="bg-amber-50/60 p-6 rounded-2xl border border-amber-200/80 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <CrownIcon className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-black text-amber-950">اشترك في الباقة الذهبية واستمتع بالهدايا</h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {hasTrialBusinesses 
                    ? 'ملاحظة: حسابات التجربة المجانية للباقة الذهبية لا تشمل كوبون هدية صدارة البحث! يحصل عليه المشتركون الفعليون في الباقة الذهبية لأول مرة عند الترقية.'
                    : 'تمنحك الباقة الذهبية الفعلية كوبون هدية مجاني لمدة أسبوع في صدارة البحث لبطاقة المحل أو المنشأة الطبية لتتمكن من الترويج الفوري.'}
                </p>
              </div>
              {onOpenUpgradeModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenUpgradeModal();
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-black text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  الترقية للباقة الذهبية الآن
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Business Selector if merchant owns multiple gold stores or facilities */}
              {goldBusinesses.length > 1 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 block">اختر المحل أو المنشأة الطبية للاستفادة من الهدية:</label>
                  <select
                    value={selectedBusinessId}
                    onChange={e => setSelectedBusinessId(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                  >
                    {goldBusinesses.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.packagePlan === 'golden' ? 'الباقة الذهبية' : 'ذهبي VIP'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Coupon Card */}
              <div className="bg-gradient-to-br from-amber-500/10 via-amber-100/30 to-stone-50 p-5 rounded-2xl border border-amber-300 relative overflow-hidden space-y-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                      <CrownIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-stone-900">كوبون هدية صدارة البحث لبطاقة المنشأة</h4>
                      <p className="text-[11px] font-bold text-amber-800">خاص ببطاقة المحل أو المنشأة الطبية فقط ولا يشمل المنتجات أو الوظائف</p>
                    </div>
                  </div>
                  
                  <span className="bg-amber-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shrink-0 shadow-xs">
                    أسبوع مجاناً
                  </span>
                </div>

                <div className="bg-white/90 p-3 rounded-xl border border-amber-200 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold text-stone-700">
                    <span>الجهة المستفيدة:</span>
                    <span className="text-stone-950 font-black">{selectedBusiness?.name}</span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-stone-700">
                    <span>الخدمة:</span>
                    <span className="text-amber-900 font-black">صدارة البحث والترويج (بطاقة المنشأة)</span>
                  </div>
                  <div className="flex items-center justify-between font-bold text-stone-700">
                    <span>المدة:</span>
                    <span className="text-emerald-700 font-black">7 أيام كاملة مجاناً</span>
                  </div>
                </div>

                {isAlreadyClaimed ? (
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-center gap-2 text-xs font-black text-emerald-800">
                    <CheckIcon className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>تم إرسال طلب تفعيل الهدية وهو قيد المراجعة والاعتماد من الإدارة</span>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={claiming || checkingClaimed}
                    onClick={handleClaimGift}
                    className="w-full bg-[#1a4d2e] hover:bg-[#133b22] text-white py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <GiftIcon className="h-4 w-4 text-[#ff9f1c]" />
                    <span>{claiming ? 'جاري إرسال الطلب...' : 'طلب تفعيل هدية صدارة البحث المجانية'}</span>
                  </button>
                )}
              </div>

            </div>
          )}

        </div>

      </div>
    </div>,
    document.body
  );
}
