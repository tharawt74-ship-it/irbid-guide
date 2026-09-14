import React, { useState } from 'react';
import { Building2, ShieldCheck, CheckCircle2, Sparkles, Activity, Check, Eye } from 'lucide-react';
import { Business, MedicalFacilityInfo } from '../../../types';
import { RichTextEditor } from '../../common/RichTextEditor';
import { db } from '../../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import DOMPurify from 'dompurify';
import { sanitizeFirestorePayload } from '../../../lib/firestoreHelper';

interface MedicalAboutTabProps {
  business: Business;
  onUpdate: (updated: Business) => void;
  showToast: (msg: string) => void;
}

export function MedicalAboutTab({ business, onUpdate, showToast }: MedicalAboutTabProps) {
  const medProfile = business.medicalProfile || {};
  const [description, setDescription] = useState(medProfile.aboutFacility || business.description || '');
  const [licenseNumber, setLicenseNumber] = useState(medProfile.licenseNumber || '');
  const [accreditationBody, setAccreditationBody] = useState(medProfile.accreditationBody || 'مرخص ومعتمد أصولاً من وزارة الصحة ونقابة الأطباء');
  const [isSaving, setIsSaving] = useState(false);

  const isPharmacy = business.category?.includes('صيدل') || business.name?.includes('صيدلية');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setIsSaving(true);

    try {
      const sanitizedDesc = description?.trim() ? DOMPurify.sanitize(description.trim()) : '';

      const updatedMed: MedicalFacilityInfo = {
        ...medProfile,
        aboutFacility: sanitizedDesc,
        licenseNumber: licenseNumber.trim(),
        accreditationBody: accreditationBody.trim()
      };

      const updatedPayload: Partial<Business> = {
        description: sanitizedDesc,
        medicalProfile: updatedMed
      };

      await updateDoc(doc(db, 'businesses', business.id), sanitizeFirestorePayload(updatedPayload));

      const mergedBiz = {
        ...business,
        ...updatedPayload
      } as Business;

      onUpdate(mergedBiz);
      showToast('تم حفظ نبذة "عن المنشأة" وبيانات الترخيص بنجاح ✨');
    } catch (err) {
      console.error('Error saving about facility:', err);
      alert('حدث خطأ أثناء حفظ النبذة.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-6 text-right" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
        <div>
          <h3 className="text-base font-black text-[#2d2a26] flex items-center gap-2">
            <Building2 className="h-5 w-5 text-teal-700" />
            عن المنشأة الطبية والنبذة التعريفية والتراخيص
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            تظهر هذه النبذة في تاب الملف الطبي بصفحة المنشأة بين قسم الكادر الطبي وقسم التأمينات
          </p>
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

      {/* Licenses & Accreditation */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4">
        <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-teal-600" />
          التراخيص والاعتمادات الرسمية:
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              رقم الترخيص الطبي المعتمد <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={licenseNumber}
              onChange={(e) => setLicenseNumber(e.target.value)}
              placeholder={isPharmacy ? 'مثال: JPA-IRB-2024/09' : 'مثال: MOH-IRB-2024/112'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-teal-600/30 outline-none"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              جهة الترخيص والاعتماد
            </label>
            <input
              type="text"
              value={accreditationBody}
              onChange={(e) => setAccreditationBody(e.target.value)}
              placeholder="مثال: مرخص ومعتمد من وزارة الصحة ونقابة الأطباء الأردنية"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-teal-600/30 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Rich Text Editor for About Facility */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-black text-stone-800">
            نبذة "عن المنشأة" (باستخدام محرر النصوص المنسق):
          </label>
          <span className="text-[11px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded-md">
            يدعم التظليل، الخط العريض، التنسيق والقوائم ✨
          </span>
        </div>
        <p className="text-[11px] text-stone-500">
          اكتب لمحة تعريفية عن المنشأة، خبرات الطبيب وفريق العمل، الخدمات التخصصية، الرؤية الطبية، والأجهزة المعتمدة.
        </p>

        <RichTextEditor
          value={description}
          onChange={(val) => setDescription(val)}
          placeholder="اكتب نبذة مفصلة عن العيادة / المركز الطبي والخبرات والخدمات المقدمة..."
        />
      </div>

      {/* Live Preview of About Section as shown on public page */}
      <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-black text-stone-700 pb-2 border-b border-stone-200">
          <Eye className="h-4 w-4 text-teal-600" />
          <span>معاينة حية لقسم "عن المنشأة" كما يظهر للمراجعين والمرضى:</span>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 sm:p-5 space-y-4 shadow-2xs">
          <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3">
            <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100">
              <Building2 className="h-4 w-4 text-emerald-700" />
            </div>
            <div>
              <h4 className="font-black text-sm text-stone-900">
                {isPharmacy ? 'عن الصيدلية' : 'عن المنشأة'}
              </h4>
              <p className="text-[11px] text-stone-400 font-medium">
                {isPharmacy ? 'نبذة تعريفية عن الصيدلية والخدمات الدوائية' : 'نبذة تعريفية ورؤية المنشأة في تقديم الرعاية الصحية'}
              </p>
            </div>
          </div>

          {description && /<[a-z][\s\S]*>/i.test(description) ? (
            <div
              className="rich-text-content text-xs sm:text-sm text-stone-700 font-bold leading-relaxed space-y-2 prose prose-stone max-w-none [&_p]:mb-2 [&_ul]:list-disc [&_ul]:mr-4 [&_ol]:list-decimal [&_ol]:mr-4 [&_mark]:bg-amber-200 [&_mark]:px-1 [&_mark]:rounded"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(description) }}
            />
          ) : (
            <p className="text-xs sm:text-sm text-stone-700 font-bold leading-relaxed whitespace-pre-line">
              {description || 'لم تتم كتابة نبذة تعريفية بعد.'}
            </p>
          )}

          {/* Badges footer */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-stone-100 text-[11px] font-bold text-stone-600">
            {licenseNumber && (
              <span className="inline-flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-2.5 py-1 rounded-lg text-stone-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>ترخيص معتمد: {licenseNumber}</span>
              </span>
            )}
            {medProfile.doctorProfile?.experienceYears && (
              <span className="inline-flex items-center gap-1.5 bg-stone-50 border border-stone-200 px-2.5 py-1 rounded-lg text-stone-700">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                <span>خبرة تتجاوز {medProfile.doctorProfile.experienceYears} سنوات</span>
              </span>
            )}
            {medProfile.has24Emergency && (
              <span className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg text-rose-800">
                <Activity className="h-3.5 w-3.5 text-rose-600" />
                <span>جاهزية طوارئ 24 ساعة</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="px-8 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer flex items-center gap-2 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          <span>{isSaving ? 'جاري حفظ التغييرات...' : 'حفظ التغييرات في نبذة المنشأة'}</span>
        </button>
      </div>
    </form>
  );
}
