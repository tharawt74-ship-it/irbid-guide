import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Users, Search, CheckCircle2, ShieldAlert, Store, UserCheck, Mail, Phone, ArrowLeft } from 'lucide-react';
import { Business } from '../../types';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc, updateDoc, limit } from 'firebase/firestore';
import { invalidateCache } from '../../lib/dataCache';

interface TransferOwnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business | null;
  onOwnershipTransferred: (updatedBusiness: Business) => void;
  showToast: (msg: string) => void;
}

interface TargetUserAccount {
  uid: string;
  email: string;
  displayName: string;
  phone?: string;
  role?: string;
}

export function TransferOwnershipModal({
  isOpen,
  onClose,
  business,
  onOwnershipTransferred,
  showToast
}: TransferOwnershipModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<TargetUserAccount[]>([]);
  const [selectedUser, setSelectedUser] = useState<TargetUserAccount | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSearchQuery('');
      setSearchResults([]);
      setSelectedUser(null);
      setConfirmStep(false);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Search users in Firestore when searchQuery changes
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2 || !db) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const cleanQuery = searchQuery.trim().toLowerCase();
        const phoneDigits = cleanQuery.replace(/\D/g, '');

        const usersRef = collection(db, 'users');
        const qEmail = query(usersRef, where('email', '>=', cleanQuery), where('email', '<=', cleanQuery + '\uf8ff'), limit(10));
        
        const snap = await getDocs(qEmail);
        const listMap = new Map<string, TargetUserAccount>();

        snap.forEach(d => {
          const data = d.data();
          listMap.set(d.id, {
            uid: d.id,
            email: data.email || '',
            displayName: data.displayName || data.name || 'مستخدم المنصة',
            phone: data.phone || data.phoneNumber || '',
            role: data.role || 'user'
          });
        });

        // Also check by exact phone or phoneDigits if applicable
        if (phoneDigits && phoneDigits.length >= 6) {
          const qPhone = query(usersRef, where('phone', '==', phoneDigits), limit(5));
          const phoneSnap = await getDocs(qPhone).catch(() => null);
          if (phoneSnap) {
            phoneSnap.forEach(d => {
              const data = d.data();
              if (!listMap.has(d.id)) {
                listMap.set(d.id, {
                  uid: d.id,
                  email: data.email || '',
                  displayName: data.displayName || data.name || 'مستخدم المنصة',
                  phone: data.phone || data.phoneNumber || '',
                  role: data.role || 'user'
                });
              }
            });
          }
        }

        setSearchResults(Array.from(listMap.values()));
      } catch (err) {
        console.warn("Error searching target users:", err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isOpen || !business || typeof document === 'undefined') return null;

  const handleConfirmTransfer = async () => {
    if (!selectedUser || !db || !business) return;
    setTransferring(true);

    try {
      const oldOwnerUid = business.userId || business.ownerId || '';
      const oldOwnerEmail = (business.ownerEmail || business.userEmail || '').toLowerCase().trim();

      const docRef = doc(db, 'businesses', business.id);
      
      const updateData: any = {
        userId: selectedUser.uid,
        ownerId: selectedUser.uid,
        userEmail: selectedUser.email,
        ownerEmail: selectedUser.email,
        ownerContact: selectedUser.email,
        ownerName: selectedUser.displayName || selectedUser.email,
        ownerPhone: selectedUser.phone || '',
        staffEmails: [],
        staff: [],
        supervisors: [],
        assignedUsers: []
      };

      await updateDoc(docRef, updateData);

      // Track all transferred business IDs (main + branches)
      const transferredIds: string[] = [business.id];

      // Also transfer branches if any exist
      try {
        const branchesQuery = query(collection(db, 'businesses'), where('parentBusinessId', '==', business.id));
        const branchesSnap = await getDocs(branchesQuery);
        if (!branchesSnap.empty) {
          const branchPromises = branchesSnap.docs.map(branchDoc => {
            transferredIds.push(branchDoc.id);
            return updateDoc(doc(db, 'businesses', branchDoc.id), updateData);
          });
          await Promise.all(branchPromises);
        }
      } catch (branchErr) {
        console.warn("Could not transfer branches:", branchErr);
      }

      // 1. UPDATE NEW OWNER USER PROFILE in Firestore (users/{selectedUser.uid})
      try {
        const newOwnerRef = doc(db, 'users', selectedUser.uid);
        const newOwnerSnap = await getDoc(newOwnerRef);
        if (newOwnerSnap.exists()) {
          const newOwnerData = newOwnerSnap.data();
          const currentIds: string[] = newOwnerData.merchantBusinessIds || [];
          const combinedIds = Array.from(new Set([...currentIds, ...transferredIds]));
          const currentRole = newOwnerData.role || 'user';
          const updatedRole = (currentRole === 'super_admin' || currentRole === 'supervisor') 
            ? currentRole 
            : 'merchant';

          await updateDoc(newOwnerRef, {
            isMerchant: true,
            role: updatedRole,
            merchantBusinessIds: combinedIds
          });
        } else {
          await setDoc(newOwnerRef, {
            uid: selectedUser.uid,
            email: selectedUser.email,
            displayName: selectedUser.displayName,
            role: 'merchant',
            isMerchant: true,
            merchantBusinessIds: transferredIds,
            createdAt: Date.now()
          }, { merge: true });
        }
      } catch (newOwnerErr) {
        console.warn("Could not update new owner user doc:", newOwnerErr);
      }

      // 2. UPDATE OLD OWNER USER PROFILE in Firestore (users/{oldOwnerUid})
      const targetOldUid = oldOwnerUid;
      if (targetOldUid && targetOldUid !== selectedUser.uid) {
        try {
          const oldOwnerRef = doc(db, 'users', targetOldUid);
          const oldOwnerSnap = await getDoc(oldOwnerRef);
          
          // Query remaining businesses owned by old owner in Firestore
          const [snapUid, snapEmail] = await Promise.all([
            getDocs(query(collection(db, 'businesses'), where('userId', '==', targetOldUid))).catch(() => null),
            oldOwnerEmail ? getDocs(query(collection(db, 'businesses'), where('ownerEmail', '==', oldOwnerEmail))).catch(() => null) : null
          ]);

          const remainingMap = new Map<string, any>();
          if (snapUid) {
            snapUid.forEach(d => {
              if (!transferredIds.includes(d.id)) {
                remainingMap.set(d.id, d.data());
              }
            });
          }
          if (snapEmail) {
            snapEmail.forEach(d => {
              if (!transferredIds.includes(d.id)) {
                remainingMap.set(d.id, d.data());
              }
            });
          }

          const remainingCount = remainingMap.size;
          const remainingIds = Array.from(remainingMap.keys());
          const isStillMerchant = remainingCount > 0;

          if (oldOwnerSnap.exists()) {
            const oldOwnerData = oldOwnerSnap.data();
            const currentRole = oldOwnerData.role || 'merchant';
            const newRole = (!isStillMerchant && currentRole === 'merchant') ? 'user' : currentRole;

            await updateDoc(oldOwnerRef, {
              isMerchant: isStillMerchant,
              role: newRole,
              merchantBusinessIds: remainingIds
            });
          }
        } catch (oldOwnerErr) {
          console.warn("Could not update old owner user doc:", oldOwnerErr);
        }
      }

      invalidateCache();

      const updatedBusiness: Business = {
        ...business,
        ...updateData
      };

      onOwnershipTransferred(updatedBusiness);
      showToast(`تم نقل ملكية (${business.name}) بنجاح إلى الحساب الجديد: ${selectedUser.displayName || selectedUser.email}`);
      onClose();
    } catch (err) {
      console.error("Error transferring business ownership:", err);
      alert('حدث خطأ أثناء نقل ملكية المحل، يرجى المحاولة لاحقاً');
    } finally {
      setTransferring(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100000] bg-stone-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden" dir="rtl">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full shadow-2xl border border-stone-200 relative my-0 sm:my-auto animate-in fade-in zoom-in-95 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5e1da] p-5 pb-4 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#1a4d2e] flex items-center justify-center font-bold">
              <UserCheck className="h-5 w-5 text-[#1a4d2e]" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#2d2a26]">نقل ملكية المحل</h3>
              <p className="text-xs text-stone-500">تحويل إدارة وملكية المنشأة لحساب مستخدم آخر</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          
          {/* Current Store Info Card */}
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2">
            <span className="text-[11px] font-black text-stone-400 block">المحل المراد نقل ملكيته:</span>
            <div className="flex items-center gap-3">
              {business.imageUrl ? (
                <img src={business.imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover border border-stone-200" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-stone-200 flex items-center justify-center text-stone-600 font-bold">
                  <Store className="h-5 w-5" />
                </div>
              )}
              <div>
                <h4 className="text-base font-black text-stone-900">{business.name}</h4>
                <p className="text-xs text-stone-500">
                  المالك الحالي: <span className="font-bold text-stone-700">{business.ownerName || business.ownerEmail || business.userEmail || 'غير محدد'}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Search Target User Account */}
          {!confirmStep ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">ابحث عن الحساب الجديد (بالبريد أو الهاتف):</label>
                <div className="relative">
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="ادخل البريد الإلكتروني أو رقم هاتف الحساب المطلوب..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-10 pl-4 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                  />
                  {searching && (
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#1a4d2e] border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  <span className="text-[11px] font-bold text-stone-500 block">اختر الحساب المستهدف من القائمة:</span>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {searchResults.map(userItem => {
                      const isSelected = selectedUser?.uid === userItem.uid;
                      return (
                        <div
                          key={userItem.uid}
                          onClick={() => setSelectedUser(userItem)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected 
                              ? 'bg-emerald-50/80 border-emerald-500 ring-1 ring-emerald-500' 
                              : 'bg-white border-stone-200 hover:border-stone-300'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <h5 className="text-xs font-black text-stone-900">{userItem.displayName}</h5>
                            <div className="flex items-center gap-3 text-[11px] text-stone-500 font-mono">
                              {userItem.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3 text-stone-400" />
                                  {userItem.email}
                                </span>
                              )}
                              {userItem.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3 text-stone-400" />
                                  {userItem.phone}
                                </span>
                              )}
                            </div>
                          </div>

                          {isSelected && (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : searchQuery.trim().length >= 2 && !searching ? (
                <div className="p-4 bg-stone-50 rounded-xl text-center border border-stone-200 text-xs font-bold text-stone-500">
                  لم يتم العثور على حساب مطابقة لـ "{searchQuery}". تأكد من صحة البريد أو رقم الهاتف.
                </div>
              ) : null}

              {/* Next step button */}
              {selectedUser && (
                <button
                  type="button"
                  onClick={() => setConfirmStep(true)}
                  className="w-full bg-[#1a4d2e] hover:bg-[#133b22] text-white py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <span>الانتقال لمراجعة وتأكيد النقل</span>
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : (
            /* Confirmation Step */
            <div className="space-y-4">
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-black text-xs">
                  <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>تأكيد نقل الملكية للمستخدم الجديد</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  سيتم نقل ملكية وإدارة المنشأة بالكامل للحساب الجديد، وإلغاء صلاحيات جميع الموظفين والمشرفين السابقين فوراً، وسيختفي المحل كلياً من لوحة تحكم المالك والموظفين السابقين.
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-stone-200 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-stone-500 font-bold">اسم المالك الجديد:</span>
                  <span className="font-black text-stone-900">{selectedUser?.displayName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500 font-bold">البريد الإلكتروني:</span>
                  <span className="font-mono font-bold text-stone-800">{selectedUser?.email || 'غير متوفر'}</span>
                </div>
                {selectedUser?.phone && (
                  <div className="flex justify-between">
                    <span className="text-stone-500 font-bold">رقم الهاتف:</span>
                    <span className="font-mono font-bold text-stone-800">{selectedUser.phone}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmStep(false)}
                  className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  تغيير الحساب
                </button>

                <button
                  type="button"
                  disabled={transferring}
                  onClick={handleConfirmTransfer}
                  className="flex-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <UserCheck className="h-4 w-4 text-[#ff9f1c]" />
                  <span>{transferring ? 'جاري نقل الملكية...' : 'تأكيد نقل الملكية الآن'}</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>,
    document.body
  );
}
