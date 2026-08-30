import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Business } from '../../types';
import { db } from '../../lib/firebase';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Store, Plus, Copy, CheckCircle2, MapPin, Phone, Building2, X, Tag, Sparkles } from 'lucide-react';

interface MultiBranchModalProps {
  parentBusiness: Business;
  isOpen: boolean;
  onClose: () => void;
  onBranchAdded: () => void;
}

// Helper to extract base name without street suffix if already exists
function extractBaseName(fullName: string): string {
  if (!fullName) return '';
  // If name is "مطعم البركة - شارع الجامعة", base name is "مطعم البركة"
  return fullName.split(' - ')[0].trim();
}

export function MultiBranchModal({ parentBusiness, isOpen, onClose, onBranchAdded }: MultiBranchModalProps) {
  const { currentUser } = useAuth();
  
  const baseShopName = extractBaseName(parentBusiness.name || '');
  const [district, setDistrict] = useState(parentBusiness.district || 'شارع الجامعة');
  const [customLocation, setCustomLocation] = useState('');
  const [branchName, setBranchName] = useState(`${baseShopName} - ${parentBusiness.district || 'شارع الجامعة'}`);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState(parentBusiness.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Auto-update branch name when district or custom location changes
  useEffect(() => {
    const activeLocation = customLocation.trim() || district;
    setBranchName(`${baseShopName} - ${activeLocation}`);
  }, [district, customLocation, baseShopName]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim() || !currentUser) return;

    // Security check: Only the owner of the parent business or Admin can create branches
    if (parentBusiness.userId !== currentUser.uid) {
      alert("غير مصرح لك بإضافة فرع لغير محلك الخاص!");
      return;
    }

    const finalDistrict = customLocation.trim() || district;
    const rootParentId = parentBusiness.parentBusinessId || parentBusiness.id;

    setIsSubmitting(true);
    try {
      if (db) {
        // 1. Update the primary business name to include its street/area if it doesn't already have one
        if (!parentBusiness.name.includes(' - ')) {
          const primaryStreet = parentBusiness.district || 'شارع الجامعة';
          const updatedPrimaryName = `${baseShopName} - ${primaryStreet}`;
          await updateDoc(doc(db, 'businesses', parentBusiness.id), {
            name: updatedPrimaryName
          });
        }

        // Calculate VIP Status inheritance: If parent has active VIP (subscription or trial),
        // the branch gets VIP for the exact remaining duration left on the parent.
        const now = Date.now();
        const parentExpiresAt = parentBusiness.vipSubscriptionExpiresAt;
        const parentHasActiveVip = (parentBusiness.packagePlan === 'golden' || parentBusiness.packagePlan === 'vip' || parentBusiness.isVipTrial) 
          && parentExpiresAt && parentExpiresAt > now;

        let branchPackagePlan: 'basic' | 'golden' = 'basic';
        let branchVipStartsAt: number | undefined = undefined;
        let branchVipExpiresAt: number | undefined = undefined;
        let branchIsVipTrial: boolean | undefined = undefined;
        let branchIsVerified = false;

        if (parentHasActiveVip && parentExpiresAt && parentExpiresAt > now) {
          branchPackagePlan = 'golden';
          branchVipStartsAt = now;
          branchVipExpiresAt = parentExpiresAt; // Inherits exact expiration timestamp
          branchIsVipTrial = parentBusiness.isVipTrial ?? true;
          branchIsVerified = true;
        }

        // 2. Clone parent business attributes to new branch document
        const newBranchPayload = {
          name: branchName.trim(),
          description: parentBusiness.description || '',
          category: parentBusiness.category || 'عام',
          address: address.trim() || `فرع ${finalDistrict}`,
          district: finalDistrict,
          phone: phone.trim(),
          imageUrl: parentBusiness.imageUrl || '',
          logoUrl: parentBusiness.logoUrl || '',
          rating: 5.0,
          reviewCount: 1,
          createdAt: now,
          userId: currentUser.uid,
          ownerName: parentBusiness.ownerName || '',
          workingHours: parentBusiness.workingHours || { isOpen24Hours: true },
          socialLinks: parentBusiness.socialLinks || {},
          packagePlan: branchPackagePlan,
          vipSubscriptionStartsAt: branchVipStartsAt,
          vipSubscriptionExpiresAt: branchVipExpiresAt,
          isVipTrial: branchIsVipTrial,
          isVerified: branchIsVerified,
          menuItems: parentBusiness.menuItems || [],
          menuCategories: parentBusiness.menuCategories || [],
          parentBusinessId: rootParentId, // Link to root primary shop
          isBranch: true
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
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900">إضافة فرع جديد لمحل ({baseShopName})</h3>
              <p className="text-xs text-stone-500">كل فرع عبارة عن صفحة مستقلة ويحصل على خصم 60% على VIP</p>
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
            <h4 className="text-lg font-black text-stone-900">تم إنشاء صفحة الفرع الجديد بنجاح!</h4>
            <p className="text-xs text-stone-500">تمت تسمية الفرع ({branchName}) وهو جاهز للإدارة والتصفح الآن</p>
          </div>
        ) : (
          <form onSubmit={handleCreateBranch} className="space-y-4 text-xs font-bold text-stone-800">
            
            {/* VIP Discount Banner */}
            <div className="p-3 bg-gradient-to-r from-amber-50 to-emerald-50 rounded-2xl border border-amber-200 flex items-start gap-2.5">
              <Sparkles className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-1.5 text-amber-900 font-black text-xs">
                  <span>خصم الفروع الفائقة 60% على اشتراك VIP!</span>
                  <span className="bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black">خصم 60%</span>
                </div>
                <p className="text-[11px] text-stone-600 font-medium leading-relaxed mt-0.5">
                  يبدأ الفرع في الباقة الأساسية مجاناً، ويستحق خصماً دائماً 60% عند الترقية للباقة الذهبية VIP (شهرياً أو سنوياً).
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-700 mb-1">منطقة / شارع الفرع الرئيسي *</label>
                <select
                  value={district}
                  onChange={e => {
                    setDistrict(e.target.value);
                    setCustomLocation('');
                  }}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                >
                  <option value="شارع الجامعة">شارع الجامعة</option>
                  <option value="شارع الثقافة">شارع الثقافة</option>
                  <option value="شارع الهاشمي">شارع الهاشمي</option>
                  <option value="إربد الوسط">إربد الوسط / وسط البلد</option>
                  <option value="حي الضباط">حي الضباط والنسيم</option>
                  <option value="طريق الحصن">طريق الحصن</option>
                  <option value="المجمع الشمالي">المجمع الشمالي</option>
                  <option value="المجمع الجنوبي">المجمع الجنوبي</option>
                  <option value="شارع الثلاثين">شارع الثلاثين</option>
                  <option value="حي الروضة">حي الروضة</option>
                  <option value="شارع بغداد">شارع بغداد</option>
                </select>
              </div>

              <div>
                <label className="block text-stone-700 mb-1">أو كتابة شارع/حي مخصص</label>
                <input
                  type="text"
                  value={customLocation}
                  onChange={e => setCustomLocation(e.target.value)}
                  placeholder="مثال: شارع الحصن - بجانب مجمع عمان"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                />
              </div>
            </div>

            <div>
              <label className="block text-stone-700 mb-1">اسم الفرع التلقائي (اسم المحل + الشارع/المنطقة) *</label>
              <input
                type="text"
                required
                value={branchName}
                onChange={e => setBranchName(e.target.value)}
                placeholder="اسم المحل - اسم الشارع"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-black text-[#1a4d2e] focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
              />
              <p className="text-[10px] text-stone-500 font-normal mt-1">يتم تركيب الاسم تلقائياً ليطابق معايير اسم المحل + الشارع/المنطقة.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-stone-700 mb-1">رقم هاتف الفرع</label>
                <input
                  type="text"
                  dir="ltr"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="079xxxxxxx"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 text-left focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                />
              </div>

              <div>
                <label className="block text-stone-700 mb-1">العنوان والموقع التفصيلي للفرع</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="مثال: مجمع البركة - الطابق الأول"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                />
              </div>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-700 leading-relaxed font-medium">
              💡 <strong>تنويه تلقائي:</strong> سيتم نسخ اللوجو، قائمة الوجبات/المنتجات والتصنيف الرئيسي من المحل الأساسي، وسيصبح الفرع الجديد محلاً مستقلاً بصفحته الخاصة.
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
                <span>{isSubmitting ? 'جاري إنشاء الفرع...' : 'إنشاء صفحة الفرع الآن'}</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>,
    document.body
  );
}
