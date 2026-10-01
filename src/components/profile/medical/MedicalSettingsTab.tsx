import React, { useState } from 'react';
import { 
  Settings, Users, Mail, Plus, Trash2, Eye, EyeOff, 
  QrCode, AlertTriangle, Check, ShieldAlert, StarOff 
} from 'lucide-react';
import { Business } from '../../../types';
import { db } from '../../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { sanitizeFirestorePayload } from '../../../lib/firestoreHelper';

interface MedicalSettingsTabProps {
  business: Business;
  onUpdate: (updated: Business) => void;
  showToast: (msg: string) => void;
  onOpenQrModal: () => void;
  onDeleteBusiness: (id: string) => void;
}

export function MedicalSettingsTab({
  business,
  onUpdate,
  showToast,
  onOpenQrModal,
  onDeleteBusiness
}: MedicalSettingsTabProps) {
  const [staffEmails, setStaffEmails] = useState<string[]>(business.staffEmails || []);
  const [newEmail, setNewEmail] = useState('');
  const [isHidden, setIsHidden] = useState<boolean>(business.isHidden ?? false);
  const [hideSiteReviews, setHideSiteReviews] = useState<boolean>(business.hideSiteReviews ?? false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      alert('يرجى إدخال بريد إلكتروني صالح.');
      return;
    }
    if (staffEmails.includes(email)) {
      alert('هذا البريد مضاف بالفعل.');
      return;
    }
    setStaffEmails(prev => [...prev, email]);
    setNewEmail('');
  };

  const handleRemoveEmail = (email: string) => {
    setStaffEmails(prev => prev.filter(e => e !== email));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!db) return;
    setIsSaving(true);

    try {
      const updatedPayload: Partial<Business> = {
        staffEmails,
        isHidden,
        hideSiteReviews
      };

      await updateDoc(doc(db, 'businesses', business.id), sanitizeFirestorePayload(updatedPayload));

      const mergedBiz = {
        ...business,
        ...updatedPayload
      } as Business;

      onUpdate(mergedBiz);
      showToast('تم حفظ الإعدادات وصلاحيات الاستقبال بنجاح ⚙️');
    } catch (err) {
      console.error('Error saving medical settings:', err);
      alert('حدث خطأ أثناء حفظ الإعدادات.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="p-2 sm:p-6 space-y-4 sm:space-y-6 text-right" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
        <div>
          <h3 className="text-base font-black text-[#2d2a26] flex items-center gap-2">
            <Settings className="h-5 w-5 text-teal-700" />
            إعدادات الخصوصية والصلاحيات
          </h3>
        </div>
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
        </button>
      </div>

      {/* Reception / Staff Delegation */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-2xs">
        <div className="flex items-center gap-2">
          <Users className="h-4.5 w-4.5 text-teal-700" />
          <h4 className="text-xs font-black text-stone-900">
            تفويض موظفي الاستقبال والسكرتاريا
          </h4>
        </div>

        <div className="flex gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="reception@example.com"
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-teal-600/30 outline-none"
            dir="ltr"
          />
          <button
            type="button"
            onClick={handleAddEmail}
            className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1 shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة موظف</span>
          </button>
        </div>

        {staffEmails.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {staffEmails.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-2 bg-stone-100 border border-stone-200 px-3 py-1.5 rounded-xl text-xs font-bold text-stone-700"
                dir="ltr"
              >
                <Mail className="h-3.5 w-3.5 text-stone-400" />
                <span>{email}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveEmail(email)}
                  className="text-stone-400 hover:text-red-600 p-0.5"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Visibility & Privacy */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-3 shadow-2xs">
        <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
          <Eye className="h-4.5 w-4.5 text-teal-700" />
          <h4 className="text-xs font-black text-stone-900">خيارات الظهور والخصوصية</h4>
        </div>

        <div className="space-y-3">
          <label className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200 bg-stone-50/60 cursor-pointer hover:bg-stone-50 transition-colors">
            <span className="text-xs font-black text-stone-900">
              تعليق ظهور المنشأة بالدليل العام والبحث (إخفاء مؤقت)
            </span>
            <input
              type="checkbox"
              checked={isHidden}
              onChange={(e) => setIsHidden(e.target.checked)}
              className="h-5 w-5 rounded text-amber-600 focus:ring-amber-500 border-stone-300 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-xl border border-stone-200 bg-stone-50/60 cursor-pointer hover:bg-stone-50 transition-colors">
            <span className="text-xs font-black text-stone-900">
              إخفاء صندوق تقييمات المراجعين من الصفحة العامة
            </span>
            <input
              type="checkbox"
              checked={hideSiteReviews}
              onChange={(e) => setHideSiteReviews(e.target.checked)}
              className="h-5 w-5 rounded text-teal-600 focus:ring-teal-600 border-stone-300 cursor-pointer"
            />
          </label>
        </div>
      </div>

      {/* QR Poster & Printouts */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 flex items-center justify-between flex-wrap gap-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <QrCode className="h-4.5 w-4.5 text-teal-700" />
          <h4 className="text-xs font-black text-stone-900">
            طباعة ملصق الاستقبال الذكي (Smart QR Poster)
          </h4>
        </div>
        <button
          type="button"
          onClick={onOpenQrModal}
          className="px-5 py-2.5 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-2"
        >
          <QrCode className="h-4 w-4" />
          <span>توليد ومعاينة البوستر</span>
        </button>
      </div>

      {/* Danger Zone: Delete Facility */}
      <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-5 flex items-center justify-between flex-wrap gap-3 shadow-2xs">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4.5 w-4.5 text-rose-600" />
          <h4 className="text-xs font-black text-rose-900">
            منطقة الحذف النهائي للمنشأة
          </h4>
        </div>
        <button
          type="button"
          onClick={() => onDeleteBusiness(business.id)}
          className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Trash2 className="h-4 w-4" />
          <span>حذف المنشأة الطبية نهائياً</span>
        </button>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="px-8 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer flex items-center gap-2 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          <span>{isSaving ? 'جاري حفظ التغييرات...' : 'حفظ إعدادات المنشأة'}</span>
        </button>
      </div>
    </form>
  );
}
