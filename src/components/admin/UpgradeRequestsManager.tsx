import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Crown, CheckCircle2, XCircle, Clock, Check, X, Phone, User, Store } from 'lucide-react';
import { UpgradeRequest } from '../../types';

interface UpgradeRequestsManagerProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function UpgradeRequestsManager({ showToast }: UpgradeRequestsManagerProps) {
  const [requests, setRequests] = useState<UpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'upgradeRequests'),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: UpgradeRequest[] = [];
      snapshot.forEach(doc => {
        data.push({ id: doc.id, ...doc.data() } as UpgradeRequest);
      });
      setRequests(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const deduplicatedRequests = React.useMemo(() => {
    const seenPending = new Set<string>();
    const seenApproved = new Set<string>();
    const seenRejected = new Set<string>();

    return requests.filter(req => {
      if (!req.businessId) return true;
      if (req.status === 'pending') {
        if (seenPending.has(req.businessId)) return false;
        seenPending.add(req.businessId);
      } else if (req.status === 'approved') {
        if (seenApproved.has(req.businessId)) return false;
        seenApproved.add(req.businessId);
      } else if (req.status === 'rejected') {
        if (seenRejected.has(req.businessId)) return false;
        seenRejected.add(req.businessId);
      }
      return true;
    });
  }, [requests]);

  const handleUpdateStatus = async (req: UpgradeRequest, newStatus: 'approved' | 'rejected') => {
    try {
      // Update all pending requests for the same businessId to resolve duplicates at once
      const sameBusinessRequests = requests.filter(
        r => r.businessId === req.businessId && r.status === 'pending'
      );

      const targets = sameBusinessRequests.length > 0 ? sameBusinessRequests : [req];

      const promises = targets.map(r =>
        updateDoc(doc(db, 'upgradeRequests', r.id!), {
          status: newStatus,
          updatedAt: new Date().toISOString()
        })
      );

      await Promise.all(promises);

      // If approved, upgrade the business immediately in Firestore so they get VIP status instantly
      if (newStatus === 'approved' && req.businessId) {
        const now = Date.now();
        // Determine duration based on the request cycle (yearly = 365 days, monthly = 30 days)
        const durationDays = req.cycle === 'yearly' ? 365 : 30;
        const expiresAt = now + durationDays * 24 * 60 * 60 * 1000;

        await updateDoc(doc(db, 'businesses', req.businessId), {
          packagePlan: 'golden',
          isVerified: true,
          vipSubscriptionStartsAt: now,
          vipSubscriptionExpiresAt: expiresAt,
          isVipScheduled: true,
          vipNotes: `تمت الترقية تلقائياً بقبول طلب الترقية VIP بتاريخ ${new Date().toLocaleDateString('ar-JO')}`
        });
      }

      showToast(`تم ${newStatus === 'approved' ? 'قبول' : 'رفض'} الطلب بنجاح`, 'success');
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء تحديث الطلب', 'error');
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-stone-500 font-bold text-sm">جاري تحميل الطلبات...</div>;
  }

  return (
    <div className="space-y-4 text-right" dir="rtl">
      
      {deduplicatedRequests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#e5e1da] space-y-3">
          <Crown className="h-12 w-12 text-stone-300 mx-auto" />
          <h3 className="font-bold text-stone-700">لا توجد طلبات ترقية حتى الآن</h3>
          <p className="text-xs text-stone-500">ستظهر هنا طلبات أصحاب المحلات للترقية إلى الباقة الذهبية</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {deduplicatedRequests.map(req => (
            <div key={req.id} className="bg-white rounded-2xl border border-[#e5e1da] p-5 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
              
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <Crown className="h-3 w-3" /> طلب ترقية VIP
                  </span>
                  <h3 className="font-black text-stone-900 text-sm">{req.businessName}</h3>
                  
                  {req.status === 'pending' && <span className="text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-md font-bold flex items-center gap-1"><Clock className="h-3 w-3"/> قيد الانتظار</span>}
                  {req.status === 'approved' && <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md font-bold flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/> تمت الموافقة</span>}
                  {req.status === 'rejected' && <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-md font-bold flex items-center gap-1"><XCircle className="h-3 w-3"/> مرفوض</span>}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-100">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-stone-400">الباقة المطلوبة:</span>
                    <span className="font-black text-[#1a4d2e]">{req.cycle === 'yearly' ? 'الذهبية - سنوي' : 'الذهبية - شهري'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-stone-400">المبلغ:</span>
                    <span className="font-black text-amber-600">{req.price} د.أ</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-stone-400 flex items-center gap-1"><User className="h-3 w-3"/> رقم التواصل:</span>
                    <span className="font-black" dir="ltr">{req.ownerPhone || 'لا يوجد'}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-stone-400">تاريخ الطلب:</span>
                    <span className="font-bold">{req.createdAt ? new Date((req.createdAt as any)?.toDate?.() || req.createdAt).toLocaleDateString('ar-EG') : 'الآن'}</span>
                  </div>
                </div>
              </div>
              
              {req.status === 'pending' && (
                <div className="flex md:flex-col gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-stone-100 w-full md:w-auto">
                  <button
                    onClick={() => handleUpdateStatus(req, 'approved')}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-[#1a4d2e] hover:bg-[#143e25] text-white px-4 py-2 rounded-xl text-xs font-black shadow-sm transition-colors cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    قبول الطلب
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(req, 'rejected')}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                    رفض
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
