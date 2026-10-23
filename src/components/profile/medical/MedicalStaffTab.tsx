import React, { useState } from 'react';
import { 
  Users, Stethoscope, Plus, Trash2, Edit3, Award, 
  Check, Sparkles, GraduationCap, ShieldCheck, Eye, EyeOff, Camera 
} from 'lucide-react';
import { Business, MedicalDoctor, MedicalFacilityInfo } from '../../../types';
import { db } from '../../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ImageUploader } from '../../ui/ImageUploader';

interface MedicalStaffTabProps {
  business: Business;
  onUpdate: (updated: Business) => void;
  showToast: (msg: string) => void;
}

export function MedicalStaffTab({ business, onUpdate, showToast }: MedicalStaffTabProps) {
  const medProfile = business.medicalProfile || {};

  const [showMedicalStaff, setShowMedicalStaff] = useState<boolean>(medProfile.showMedicalStaff ?? true);

  // Lead Doctor Profile
  const defaultLeadDoctor: MedicalDoctor = medProfile.doctorProfile || {
    name: business.ownerName || '',
    title: 'طبيب عام / استشاري',
    degrees: ['البورد الأردني'],
    subspecialty: '',
    experienceYears: 10,
    licenseNumber: medProfile.licenseNumber || '',
    bio: ''
  };

  const [leadName, setLeadName] = useState(defaultLeadDoctor.name || '');
  const [leadAvatarUrl, setLeadAvatarUrl] = useState(defaultLeadDoctor.avatarUrl || '');
  const [leadTitle, setLeadTitle] = useState(defaultLeadDoctor.title || '');
  const [leadDegreesStr, setLeadDegreesStr] = useState(
    Array.isArray(defaultLeadDoctor.degrees) ? defaultLeadDoctor.degrees.join('، ') : (defaultLeadDoctor.degrees || '')
  );
  const [leadSubspecialty, setLeadSubspecialty] = useState(defaultLeadDoctor.subspecialty || '');
  const [leadExpYears, setLeadExpYears] = useState(defaultLeadDoctor.experienceYears || 10);
  const [leadLicense, setLeadLicense] = useState(defaultLeadDoctor.licenseNumber || '');
  const [leadBio, setLeadBio] = useState(defaultLeadDoctor.bio || '');

  // Additional Doctors / Specialists
  const [doctorsList, setDoctorsList] = useState<MedicalDoctor[]>(medProfile.doctorsList || []);

  // New Doctor Modal/Form State
  const [isAddingDoctor, setIsAddingDoctor] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocAvatarUrl, setNewDocAvatarUrl] = useState('');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocSubspecialty, setNewDocSubspecialty] = useState('');
  const [newDocDegreesStr, setNewDocDegreesStr] = useState('');
  const [newDocExpYears, setNewDocExpYears] = useState(5);
  const [newDocLicense, setNewDocLicense] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  const handleAddDoctor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;

    const degreesArr = newDocDegreesStr
      ? newDocDegreesStr.split(/[,،]/).map(d => d.trim()).filter(Boolean)
      : [];

    const newDoc: MedicalDoctor = {
      name: newDocName.trim(),
      title: newDocTitle.trim() || 'طبيب أخصائي',
      subspecialty: newDocSubspecialty.trim(),
      degrees: degreesArr,
      experienceYears: Number(newDocExpYears) || 5,
      licenseNumber: newDocLicense.trim(),
      avatarUrl: newDocAvatarUrl.trim() || undefined
    };

    setDoctorsList(prev => [...prev, newDoc]);
    setNewDocName('');
    setNewDocAvatarUrl('');
    setNewDocTitle('');
    setNewDocSubspecialty('');
    setNewDocDegreesStr('');
    setNewDocExpYears(5);
    setNewDocLicense('');
    setIsAddingDoctor(false);
  };

  const handleUpdateDoctorAvatar = (index: number, avatarUrl: string) => {
    setDoctorsList(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], avatarUrl: avatarUrl || undefined };
      return copy;
    });
  };

  const handleRemoveDoctor = (index: number) => {
    setDoctorsList(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!db) return;
    setIsSaving(true);

    try {
      const degreesArr = leadDegreesStr
        ? leadDegreesStr.split(/[,،]/).map(d => d.trim()).filter(Boolean)
        : ['البورد الأردني'];

      const leadDoc: MedicalDoctor = {
        name: leadName.trim(),
        title: leadTitle.trim() || 'طبيب استشاري',
        degrees: degreesArr,
        subspecialty: leadSubspecialty.trim(),
        experienceYears: Number(leadExpYears) || 10,
        licenseNumber: leadLicense.trim(),
        bio: leadBio.trim(),
        avatarUrl: leadAvatarUrl.trim() || undefined
      };

      const updatedMed: MedicalFacilityInfo = {
        ...medProfile,
        showMedicalStaff: showMedicalStaff,
        doctorProfile: leadDoc,
        doctorsList: doctorsList
      };

      const updatedPayload: Partial<Business> = {
        ownerName: leadName.trim() || business.ownerName,
        medicalProfile: updatedMed
      };

      await updateDoc(doc(db, 'businesses', business.id), updatedPayload);

      const mergedBiz = {
        ...business,
        ...updatedPayload
      } as Business;

      onUpdate(mergedBiz);
      showToast('تم حفظ بيانات الكادر الطبي والأطباء بنجاح 👨‍⚕️');
    } catch (err) {
      console.error('Error saving medical staff:', err);
      alert('حدث خطأ أثناء حفظ الكادر الطبي.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="p-2 sm:p-6 space-y-4 sm:space-y-6 text-right" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
        <div>
          <h3 className="text-base font-black text-[#2d2a26] flex items-center gap-2">
            <Users className="h-5 w-5 text-teal-700" />
            الكادر الطبي، الأطباء والاستشاريون والخبرات
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            إدارة بيانات الطبيب المسؤول أو الاستشاري، وإضافة أطباء المنشأة والمؤهلات والشهادات
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

      {/* Visibility Toggle for Staff Section */}
      <div className="bg-teal-50/60 border-0 sm:border border-teal-200/80 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl flex items-center justify-between flex-wrap gap-3 shadow-none sm:shadow-2xs">
        <div className="space-y-0.5">
          <span className="text-xs font-black text-teal-950 flex items-center gap-1.5">
            {showMedicalStaff ? <Eye className="h-4 w-4 text-teal-600" /> : <EyeOff className="h-4 w-4 text-stone-400" />}
            إظهار قسم "الكادر الطبي" في صفحة المنشأة العامة
          </span>
          <p className="text-[11px] text-stone-500">
            عند تفعيله، سيظهر تاب مخصص وقسم رئيسي للأطباء والمؤهلات العلمية وسنوات الخبرة
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={showMedicalStaff}
            onChange={(e) => setShowMedicalStaff(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
        </label>
      </div>

      {/* Head Doctor / Consultant Profile */}
      <div className="bg-white border-0 sm:border border-stone-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 space-y-4 shadow-none sm:shadow-2xs">
        <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
            <Stethoscope className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-stone-900">
              بيانات الطبيب المشرف / الاستشاري الرئيسي:
            </h4>
            <span className="text-[10px] text-stone-400">تظهر في واجهة بطاقة التعريف الرئيسية للمنشأة</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1">
            <ImageUploader
              value={leadAvatarUrl}
              onChange={(url) => setLeadAvatarUrl(url)}
              folder="doctors"
              label="صورة الطبيب / الاستشاري الرئيسي"
              aspectRatio="square"
              placeholder="اضغط لرفع أو تغيير صورة الطبيب الرئيسي"
              enableCrop={true}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              اسم الطبيب / الاستشاري <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={leadName}
              onChange={(e) => setLeadName(e.target.value)}
              placeholder="مثال: د. محمد القضاة"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-teal-600/30 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              اللقب المهني والاختصاص <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={leadTitle}
              onChange={(e) => setLeadTitle(e.target.value)}
              placeholder="مثال: استشاري أول جراحة العظام والمفاصل وزراعة المفاصل الصناعية"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-teal-600/30 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              التخصص الفرعي الدقيق
            </label>
            <input
              type="text"
              value={leadSubspecialty}
              onChange={(e) => setLeadSubspecialty(e.target.value)}
              placeholder="مثال: جراحة الركبة بالمنظار، الإصابات الرياضية"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-teal-600/30 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              سنوات الخبرة العملية
            </label>
            <input
              type="number"
              min="0"
              max="60"
              value={leadExpYears}
              onChange={(e) => setLeadExpYears(Number(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-teal-600/30 outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-stone-700 mb-1">
              الشهادات والدرجات العلمية والزمالات (مفصولة بفواصل)
            </label>
            <input
              type="text"
              value={leadDegreesStr}
              onChange={(e) => setLeadDegreesStr(e.target.value)}
              placeholder="مثال: البورد الأردني، زمالة الكلية الملكية للجراحين (FRCS)، استشاري سابق بمستشفى الملك المؤسس"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-teal-600/30 outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-stone-700 mb-1">
              نبذة مختصرة عن مسيرة الطبيب وإنجازاته
            </label>
            <textarea
              rows={2}
              value={leadBio}
              onChange={(e) => setLeadBio(e.target.value)}
              placeholder="خبرة واسعة في تشخيص وعلاج مختلف الحالات، حاصل على درجات عليا..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-teal-600/30 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Additional Doctors & Specialists List */}
      <div className="bg-white border-0 sm:border border-stone-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 space-y-4 shadow-none sm:shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 flex-wrap gap-2">
          <div>
            <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-teal-600" />
              أطباء وكوادر المنشأة الإضافيون ({doctorsList.length})
            </h4>
            <span className="text-[10px] text-stone-400">أضف الأطباء المساعدين، الأخصائيين، أو طاقم الأطباء الزائرين</span>
          </div>

          {!isAddingDoctor && (
            <button
              type="button"
              onClick={() => setIsAddingDoctor(true)}
              className="px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>إضافة طبيب / أخصائي جديد</span>
            </button>
          )}
        </div>

        {/* Add Doctor Form */}
        {isAddingDoctor && (
          <div className="bg-teal-50/40 border border-teal-200 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-teal-950">إضافة عضو كادر طبي جديد:</span>
              <button
                type="button"
                onClick={() => setIsAddingDoctor(false)}
                className="text-xs text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                إلغاء ✕
              </button>
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-stone-700 mb-1">صورة الطبيب / الأخصائي (اختياري)</label>
              <ImageUploader
                value={newDocAvatarUrl}
                onChange={(url) => setNewDocAvatarUrl(url)}
                folder="doctors"
                label=""
                aspectRatio="square"
                placeholder="رفع صورة الطبيب"
                enableCrop={true}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">اسم الطبيب / الأخصائي *</label>
                <input
                  type="text"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="د. سارة الأحمد"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs font-bold bg-white outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">اللقب والاختصاص *</label>
                <input
                  type="text"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  placeholder="أخصائية طب وجراحة العيون"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs font-bold bg-white outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">التخصص الدقيق</label>
                <input
                  type="text"
                  value={newDocSubspecialty}
                  onChange={(e) => setNewDocSubspecialty(e.target.value)}
                  placeholder="تصحيح البصر والليزك"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs font-bold bg-white outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">سنوات الخبرة</label>
                <input
                  type="number"
                  min="0"
                  max="60"
                  value={newDocExpYears}
                  onChange={(e) => setNewDocExpYears(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs font-bold bg-white outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-stone-700 mb-1">الدرجات العلمية (مفصولة بفواصل)</label>
                <input
                  type="text"
                  value={newDocDegreesStr}
                  onChange={(e) => setNewDocDegreesStr(e.target.value)}
                  placeholder="البورد الأردني، ماجستير طب وجراحة العيون"
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs font-bold bg-white outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingDoctor(false)}
                className="px-4 py-2 bg-stone-100 text-stone-600 rounded-lg text-xs font-bold hover:bg-stone-200 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleAddDoctor}
                className="px-5 py-2 bg-teal-700 text-white rounded-lg text-xs font-black hover:bg-teal-800 cursor-pointer"
              >
                إضافة للقائمة ➕
              </button>
            </div>
          </div>
        )}

        {/* Existing Doctors Cards */}
        {doctorsList.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {doctorsList.map((docItem, idx) => (
              <div key={idx} className="bg-stone-50 border border-stone-200 p-3.5 rounded-xl space-y-3 relative group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-11 h-11 rounded-xl bg-teal-100 text-teal-800 font-black text-xs flex items-center justify-center border border-teal-200 shrink-0 overflow-hidden">
                      {docItem.avatarUrl ? (
                        <img src={docItem.avatarUrl} alt={docItem.name} className="w-full h-full object-cover" />
                      ) : (
                        '👨‍⚕️'
                      )}
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-black text-stone-900 truncate">{docItem.name}</h5>
                      <span className="text-[11px] text-teal-700 font-bold block truncate">{docItem.title}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveDoctor(idx)}
                    className="text-stone-400 hover:text-red-600 p-1 transition-colors cursor-pointer shrink-0"
                    title="حذف الطبيب"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Direct Image Editor for Existing Doctor */}
                <div className="pt-1 border-t border-stone-200/60">
                  <ImageUploader
                    value={docItem.avatarUrl || ''}
                    onChange={(url) => handleUpdateDoctorAvatar(idx, url)}
                    folder="doctors"
                    label=""
                    aspectRatio="square"
                    placeholder={docItem.avatarUrl ? "تغيير الصورة" : "إضافة صورة الطبيب"}
                    enableCrop={true}
                  />
                </div>

                {docItem.subspecialty && (
                  <span className="text-[10px] text-stone-500 font-bold block">
                    التخصص الدقيق: {docItem.subspecialty}
                  </span>
                )}

                {docItem.degrees && docItem.degrees.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {docItem.degrees.map((deg, dIdx) => (
                      <span key={dIdx} className="text-[10px] bg-white border border-stone-200 text-stone-600 px-2 py-0.5 rounded-md font-medium">
                        {deg}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-stone-400 py-3 text-center">
            لم تتم إضافة أطباء إضافيين بعد. سيظهر فقط الطبيب المشرف الرئيسي في صفحة المنشأة.
          </p>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="px-8 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer flex items-center gap-2 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          <span>{isSaving ? 'جاري حفظ التغييرات...' : 'حفظ الكادر الطبي'}</span>
        </button>
      </div>
    </form>
  );
}
