import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Business } from '../../types';
import { db } from '../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Store, Plus, Copy, CheckCircle2, MapPin, Phone, Building2, X } from 'lucide-react';

interface MultiBranchModalProps {
  parentBusiness: Business;
  isOpen: boolean;
  onClose: () => void;
  onBranchAdded: () => void;
}

export function MultiBranchModal({ parentBusiness, isOpen, onClose, onBranchAdded }: MultiBranchModalProps) {
  const { currentUser } = useAuth();
  const [branchName, setBranchName] = useState(`${parentBusiness.name} - فرع جديد`);
  const [district, setDistrict] = useState(parentBusiness.district || 'شارع الجامعة');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState(parentBusiness.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim() || !address.trim() || !currentUser) return;

    // Security check: Only the owner of the parent business or Admin can create branches
    if (parentBusiness.userId !== currentUser.uid) {
      alert("غير مصرح لك بإضافة فرع لغير محلك الخاص!");
      return;
    }

    setIsSubmitting(true);
    try {
      if (db) {
        // Clone parent business attributes to new branch document
        const newBranchPayload = {
          name: branchName.trim(),
          description: parentBusiness.description || '',
          category: parentBusiness.category || 'عام',
          address: address.trim(),
          district: district.trim(),
          phone: phone.trim(),
          imageUrl: parentBusiness.imageUrl || '',
          logoUrl: parentBusiness.logoUrl || '',
          rating: 5.0,
          reviewCount: 1,
          createdAt: Date.now(),
          userId: currentUser.uid,
          ownerName: parentBusiness.ownerName || '',
          workingHours: parentBusiness.workingHours || { isOpen24Hours: true },
          socialLinks: parentBusiness.socialLinks || {},
          packagePlan: parentBusiness.packagePlan || 'basic',
          isVerified: parentBusiness.isVerified || false,
          menuItems: parentBusiness.menuItems || [],
          menuCategories: parentBusiness.menuCategories || [],
          parentBusinessId: parentBusiness.id
        };

        await addDoc(collection(db, 'businesses'), newBranchPayload);
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onBranchAdded();
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Error creating branch:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-5 text-right my-auto">
        
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#1a4d2e]/10 text-[#1a4d2e] flex items-center justify-center font-bold">
              <Copy className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900">إنشاء وتكرار فرع جديد للمحل (Multi-Branch)</h3>
              <p className="text-xs text-stone-500">سيتم تكرار اللوجو، القائمة، والتصنيف تلقائياً للفرع الجديد</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto animate-bounce" />
            <h4 className="text-lg font-black text-stone-900">تم إضافة الفرع الجديد بنجاح!</h4>
            <p className="text-xs text-stone-500">يظهر الآن في قائمة محلاتك المسجلة على المنصة</p>
          </div>
        ) : (
          <form onSubmit={handleCreateBranch} className="space-y-4 text-xs font-bold text-stone-800">
            <div>
              <label className="block text-stone-700 mb-1">اسم الفرع الجديد *</label>
              <input
                type="text"
                required
                value={branchName}
                onChange={e => setBranchName(e.target.value)}
                placeholder="مثال: مطعم ديوان زمان - فرع شارع الثقافة"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-700 mb-1">المنطقة / الشارع الرئيسي</label>
                <select
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                >
                  <option value="شارع الجامعة">شارع الجامعة</option>
                  <option value="شارع الثقافة">شارع الثقافة</option>
                  <option value="إربد الوسط">إربد الوسط / وسط البلد</option>
                  <option value="المجمع الشمالي">المجمع الشمالي</option>
                  <option value="المجمع الجنوبي">المجمع الجنوبي</option>
                  <option value="حي الضباط">حي الضباط والنسيم</option>
                  <option value="طريق الحصن">طريق الحصن</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-700 mb-1">رقم هاتف الفرع الجديد</label>
                <input
                  type="text"
                  dir="ltr"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="079xxxxxxx"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-bold text-stone-800 text-left focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                />
              </div>
            </div>

            <div>
              <label className="block text-stone-700 mb-1">العنوان والموقع التفصيلي للفرع *</label>
              <input
                type="text"
                required
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="مثال: شارع الثقافة - بجانب مجمع عمان الجديد - مجمع البركة"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
              />
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed font-medium">
              💡 <strong>توضيح:</strong> سيتم تكرار صور القائمة، اللوجو، والتصنيف المعتمد من المحل الرئيسي لتسهيل الإعداد المباشر للفرع الجديد.
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-stone-200 font-bold text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#1a4d2e] hover:bg-[#133b22] text-white font-black text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="h-4 w-4" />
                <span>{isSubmitting ? 'جاري إنشاء الفرع...' : 'إضافة الفرع الجديد الآن'}</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>,
    document.body
  );
}
