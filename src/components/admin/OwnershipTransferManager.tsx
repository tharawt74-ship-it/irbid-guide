import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  addDoc,
  query, 
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { recordAuditLog } from '../../lib/auditLogHelper';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ArrowLeftRight, 
  Search, 
  User, 
  UserCheck, 
  Mail, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  FileText,
  ShieldCheck 
} from 'lucide-react';

interface OwnershipTransferManagerProps {
  showToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export function OwnershipTransferManager({ showToast }: OwnershipTransferManagerProps) {
  const { currentUser, userRole } = useAuth();
  const currentUserEmail = currentUser?.email || 'مشرف غير معروف';

  const [businesses, setBusinesses] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search State
  const [searchBizTerm, setSearchBizTerm] = useState('');
  
  // Action State
  const [selectedBiz, setSelectedBiz] = useState<any | null>(null);
  const [targetEmail, setTargetEmail] = useState('');
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [lookupUser, setLookupUser] = useState<any | null>(null);
  const [lookingUp, setLookingUp] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (!db) return;
      
      // Fetch businesses
      const bizSnap = await getDocs(query(collection(db, 'businesses'), orderBy('name', 'asc')));
      const bizList = bizSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBusinesses(bizList);

      // Fetch past transfers ledger
      try {
        const transferSnap = await getDocs(query(collection(db, 'ownership_transfers'), orderBy('createdAt', 'desc'), limit(30)));
        const transferList = transferSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTransfers(transferList);
      } catch (e) {
        console.warn('ownership_transfers collection may not be created yet:', e);
      }

    } catch (error) {
      console.error('Error fetching data for ownership transfer manager:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLookupUserByEmail = async () => {
    if (!targetEmail.trim() || !db) return;
    try {
      setLookingUp(true);
      setLookupUser(null);
      const q = query(
        collection(db, 'users'),
        where('email', '==', targetEmail.trim().toLowerCase())
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const userDoc = snap.docs[0];
        setLookupUser({ id: userDoc.id, ...userDoc.data() });
        showToast('تم العثور على حساب المستخدم المستهدف بنجاح', 'success');
      } else {
        showToast('لم يتم العثور على أي حساب مسجل بهذا البريد الإلكتروني', 'error');
      }
    } catch (err) {
      console.error('Error looking up user:', err);
      showToast('حدث خطأ أثناء البحث عن الحساب', 'error');
    } finally {
      setLookingUp(false);
    }
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBiz || !lookupUser || !db) {
      showToast('يرجى اختيار المحل التجاري والبحث عن الحساب البديل أولاً', 'error');
      return;
    }

    try {
      setProcessing(true);
      
      const oldOwnerId = selectedBiz.ownerId || 'مجهول أو إدارة المنصة';
      const oldOwnerEmail = selectedBiz.ownerEmail || 'لا يوجد';

      // 1. Update the Business document
      const bizRef = doc(db, 'businesses', selectedBiz.id);
      await updateDoc(bizRef, {
        ownerId: lookupUser.id,
        ownerEmail: lookupUser.email,
        claimed: true // Ensure claimed flag is set correctly
      });

      // 2. Create entry in ownership_transfers collection
      const transferData = {
        businessId: selectedBiz.id,
        businessName: selectedBiz.name,
        oldOwnerId,
        oldOwnerEmail,
        newOwnerId: lookupUser.id,
        newOwnerEmail: lookupUser.email,
        newOwnerName: lookupUser.displayName || 'عضو المنصة',
        reason: reason.trim() || 'نقل إداري لملكية المنشأة',
        createdAt: new Date().toISOString(),
        status: 'completed'
      };

      await addDoc(collection(db, 'ownership_transfers'), transferData);

      // 3. Record in overall audit logs
      await recordAuditLog({
        action: 'TRANSFER_OWNERSHIP',
        actionAr: 'نقل ملكية منشأة',
        details: `نقل ملكية المحل ${selectedBiz.name} إلى الحساب ${lookupUser.email}`,
        performedBy: currentUserEmail,
        userRole: userRole || 'admin',
        targetId: selectedBiz.id,
        targetName: selectedBiz.name,
        timestamp: Date.now()
      });

      showToast(`تم نقل ملكية المحل ${selectedBiz.name} بالنجاح الكامل`, 'success');
      
      // Reset form & state
      setSelectedBiz(null);
      setTargetEmail('');
      setReason('');
      setLookupUser(null);
      
      // Refresh list
      fetchData();
    } catch (error) {
      console.error('Error executing ownership transfer:', error);
      showToast('حدث خطأ أثناء تنفيذ عملية النقل الإلكتروني', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const filteredBusinesses = businesses.filter(biz => 
    biz.name?.toLowerCase().includes(searchBizTerm.toLowerCase()) || 
    biz.ownerEmail?.toLowerCase().includes(searchBizTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step 1: Select Business & Enter New Email */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-stone-200/60 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-black text-base text-stone-800">نقل وتبادل ملكية المحلات التجارية</h3>
            <p className="text-xs text-stone-400">نقل الصلاحيات الكاملة والإشراف الفني لصفحة المحل من حساب مستخدم إلى حساب آخر مع التوثيق</p>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                value={searchBizTerm}
                onChange={e => setSearchBizTerm(e.target.value)}
                placeholder="ابحث باسم المحل أو البريد الإلكتروني للمالك الحالي..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-10 pl-4 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
              />
            </div>

            {loading ? (
              <div className="py-12 text-center text-stone-400 font-bold">جاري تحميل المنشآت...</div>
            ) : filteredBusinesses.length === 0 ? (
              <div className="py-12 text-center text-stone-400 font-bold">لا توجد محلات مطابقة لمعيار البحث</div>
            ) : (
              <div className="overflow-x-auto max-h-96 scrollbar-thin">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-stone-100 text-stone-400 font-bold">
                      <th className="py-3 px-2">المحل التجاري</th>
                      <th className="py-3 px-2">المالك الحالي</th>
                      <th className="py-3 px-2">البريد الإلكتروني الحالي</th>
                      <th className="py-3 px-2 text-left">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 font-bold text-stone-700">
                    {filteredBusinesses.map(biz => (
                      <tr key={biz.id} className={`hover:bg-stone-50/50 transition-colors ${selectedBiz?.id === biz.id ? 'bg-emerald-50/40' : ''}`}>
                        <td className="py-3 px-2">
                          <div className="font-black text-stone-800">{biz.name}</div>
                          <div className="text-[10px] text-stone-400">{biz.category}</div>
                        </td>
                        <td className="py-3 px-2">
                          {biz.ownerId ? (
                            <span className="text-stone-700 inline-flex items-center gap-1">
                              <User className="h-3 w-3 text-stone-400" />
                              <span>حساب مسجل</span>
                            </span>
                          ) : (
                            <span className="text-stone-400">إدارة المنصة المباشرة</span>
                          )}
                        </td>
                        <td className="py-3 px-2 font-mono text-stone-500 text-[11px]">
                          {biz.ownerEmail || <span className="text-stone-400">لا يوجد بريد مرتبط</span>}
                        </td>
                        <td className="py-3 px-2 text-left">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedBiz(biz);
                              setLookupUser(null);
                              setTargetEmail('');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs transition-all font-black cursor-pointer ${
                              selectedBiz?.id === biz.id
                                ? 'bg-[#1a4d2e] text-white'
                                : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                            }`}
                          >
                            تحديد المحل
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Action Panel */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200/60 shadow-xs h-fit space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-black text-base text-stone-800">إجراء وتدقيق النقل</h3>
            <p className="text-xs text-stone-400">التحقق من هوية الحساب البديل وإجراء النقل الرسمي الموثق</p>
          </div>

          {selectedBiz ? (
            <div className="space-y-4">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/50 text-xs">
                <span className="text-[10px] text-stone-400 block mb-0.5">المحل المختار لنقل ملكيته</span>
                <span className="text-sm font-black text-stone-800 block truncate">{selectedBiz.name}</span>
                <span className="text-[11px] text-stone-500 block truncate">المالك الحالي: {selectedBiz.ownerEmail || 'إدارة المنصة'}</span>
              </div>

              {/* Enter target email */}
              <div className="space-y-1.5 text-xs font-bold">
                <label className="text-stone-600 block">البريد الإلكتروني للمالك الجديد</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                    <input
                      type="email"
                      value={targetEmail}
                      onChange={e => setTargetEmail(e.target.value)}
                      placeholder="example@gmail.com"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-10 pl-4 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleLookupUserByEmail}
                    disabled={lookingUp || !targetEmail.trim()}
                    className="bg-stone-800 hover:bg-stone-900 text-white px-3.5 py-2.5 rounded-xl transition-all font-black text-xs disabled:opacity-50 cursor-pointer"
                  >
                    {lookingUp ? 'تحقق...' : 'تحقق'}
                  </button>
                </div>
              </div>

              {/* Show lookup user results if any */}
              {lookupUser && (
                <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/50 rounded-xl text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-800 font-black">
                    <UserCheck className="h-4 w-4 text-emerald-600" />
                    <span>تم التحقق من الحساب</span>
                  </div>
                  <p className="text-stone-700 font-bold">الاسم: {lookupUser.displayName || 'عضو منشئ حديثاً'}</p>
                  <p className="text-stone-600 font-mono text-[10px]">المعرف: {lookupUser.id}</p>
                </div>
              )}

              {/* Form submit */}
              <form onSubmit={handleExecuteTransfer} className="space-y-3 text-xs font-bold">
                <div className="space-y-1">
                  <label className="text-stone-600 block">ملاحظات وسبب النقل</label>
                  <textarea
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="اكتب مبرر نقل الملكية للتوثيق الإداري والمحاسبي..."
                    rows={2}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#1a4d2e] resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={processing || !lookupUser}
                  className="w-full bg-[#1a4d2e] hover:bg-[#133b22] text-white py-3 rounded-xl font-black transition-colors text-center disabled:opacity-40 cursor-pointer"
                >
                  {processing ? 'جاري توثيق ونقل الملكية...' : 'إتمام نقل الملكية الفوري'}
                </button>
              </form>
            </div>
          ) : (
            <div className="py-12 text-center text-stone-400 border border-dashed border-stone-200 rounded-2xl">
              <ArrowLeftRight className="h-8 w-8 mx-auto mb-2 text-stone-300" />
              <p className="text-xs">يرجى تحديد المحل التجاري المستهدف لنقله والبدء بالخطوات</p>
            </div>
          )}
        </div>
      </div>

      {/* Ledger of past transfers */}
      {transfers.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-stone-200/60 shadow-xs space-y-3">
          <div>
            <h3 className="font-black text-sm text-stone-800">سجل عمليات نقل الملكية الأخيرة</h3>
            <p className="text-[10px] text-stone-400">توثيق كامل للأنشطة والتبادل الفني لملكية المحلات وحركات الحسابات</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-stone-100 text-stone-400 font-bold">
                  <th className="py-2 px-1">المحل</th>
                  <th className="py-2 px-1">المالك السابق</th>
                  <th className="py-2 px-1">المالك الجديد</th>
                  <th className="py-2 px-1">التاريخ</th>
                  <th className="py-2 px-1">السبب</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-600 font-semibold">
                {transfers.map(tr => (
                  <tr key={tr.id} className="hover:bg-stone-50/40">
                    <td className="py-2.5 px-1 font-black text-stone-800">{tr.businessName}</td>
                    <td className="py-2.5 px-1 font-mono text-[11px] text-stone-500">{tr.oldOwnerEmail}</td>
                    <td className="py-2.5 px-1 font-black text-stone-800">
                      <div>{tr.newOwnerEmail}</div>
                      <div className="text-[10px] text-stone-400">{tr.newOwnerName}</div>
                    </td>
                    <td className="py-2.5 px-1 font-mono text-[10px] text-stone-500">
                      {tr.createdAt ? new Date(tr.createdAt).toLocaleDateString('ar-JO') : '-'}
                    </td>
                    <td className="py-2.5 px-1 text-stone-500 max-w-xs truncate">{tr.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
