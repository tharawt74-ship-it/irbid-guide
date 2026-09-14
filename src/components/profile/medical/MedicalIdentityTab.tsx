import React, { useState } from 'react';
import { 
  Building2, Phone, MapPin, Globe, Camera, Clock, 
  Share2, Check, AlertCircle, Sparkles, AlertTriangle
} from 'lucide-react';
import { WhatsAppIcon } from '../../common/WhatsAppIcon';
import { Business, WorkingHours, SocialLinks } from '../../../types';
import { IRBID_REGIONS_CATEGORIZED } from '../../../lib/categories';
import { MEDICAL_SPECIALTIES } from '../../../lib/medicalCategories';
import { WorkingHoursEditor } from '../../ui/WorkingHoursEditor';
import { SocialLinksEditor } from '../../ui/SocialLinksEditor';
import { ImageUploader } from '../../ui/ImageUploader';
import { db } from '../../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface MedicalIdentityTabProps {
  business: Business;
  onUpdate: (updated: Business) => void;
  showToast: (msg: string) => void;
}

export function MedicalIdentityTab({ business, onUpdate, showToast }: MedicalIdentityTabProps) {
  const [name, setName] = useState(business.name || '');
  const [category, setCategory] = useState(business.category || 'عيادات ومراكز طبية');
  const [subCategory, setSubCategory] = useState(business.subCategory || '');
  const [phone, setPhone] = useState(business.phone || '');
  const [whatsapp, setWhatsapp] = useState(business.whatsapp || '');
  const [emergencyPhone, setEmergencyPhone] = useState(business.medicalProfile?.emergencyPhone || '');
  const [district, setDistrict] = useState(business.district || 'شارع الجامعة');
  const [address, setAddress] = useState(business.address || '');
  const [googlePlaceUrl, setGooglePlaceUrl] = useState(business.googlePlaceUrl || '');
  const [imageUrl, setImageUrl] = useState(business.imageUrl || '');
  const [coverUrl, setCoverUrl] = useState(business.image || business.imageUrl || '');
  const [workingHours, setWorkingHours] = useState<WorkingHours>(business.workingHours || {
    days: 'من السبت إلى الخميس',
    openTime: '09:00',
    closeTime: '21:00',
    selectedDays: ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس']
  });
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(business.socialLinks || {});
  const [isSaving, setIsSaving] = useState(false);

  // Available subspecialties for active category
  const activeSpecialtyObj = MEDICAL_SPECIALTIES.find(s => s.name === category) || MEDICAL_SPECIALTIES[0];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setIsSaving(true);

    try {
      const existingMed = business.medicalProfile || {};
      const updatedMedicalProfile = {
        ...existingMed,
        emergencyPhone: emergencyPhone.trim() || ""
      };

      const updatedPayload: any = {
        name: name.trim(),
        category: category.trim(),
        subCategory: subCategory.trim() || category.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || "",
        district: district.trim(),
        address: address.trim(),
        googlePlaceUrl: googlePlaceUrl.trim(),
        imageUrl: imageUrl.trim(),
        image: coverUrl.trim() || imageUrl.trim(),
        workingHours: workingHours,
        socialLinks: socialLinks,
        medicalProfile: updatedMedicalProfile
      };

      // Ensure no undefined values are sent to Firebase
      Object.keys(updatedPayload).forEach(key => {
        if (updatedPayload[key] === undefined) {
          delete updatedPayload[key];
        }
      });
      if (updatedPayload.medicalProfile) {
        Object.keys(updatedPayload.medicalProfile).forEach(key => {
          if (updatedPayload.medicalProfile[key] === undefined) {
            delete updatedPayload.medicalProfile[key];
          }
        });
      }

      await updateDoc(doc(db, 'businesses', business.id), updatedPayload);

      const mergedBiz = {
        ...business,
        ...updatedPayload
      } as Business;

      onUpdate(mergedBiz);
      showToast('تم حفظ وتحديث هوية وبيانات التواصل للمنشأة بنجاح 🩺');
    } catch (err) {
      console.error('Error updating medical identity:', err);
      alert('حدث خطأ أثناء حفظ التعديلات.');
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
            هوية المنشأة ومعلومات التواصل والموقع
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            تعديل الاسم، التخصص، العناوين، أرقام الحجز والواتساب، وصور المنشأة
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

      {/* Basic Identity & Specialty */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4">
        <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-teal-600" />
          المعلومات الأساسية والتخصص الطبي:
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              اسم المنشأة أو العيادة <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: عيادات الشفاء التخصصية، صيدلية النور..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-teal-600/30 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              التخصص أو التصنيف الطبي <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                const spec = MEDICAL_SPECIALTIES.find(s => s.name === e.target.value);
                if (spec && spec.subspecialties.length > 0) {
                  setSubCategory(spec.subspecialties[0]);
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-teal-600/30 outline-none bg-white"
            >
              {MEDICAL_SPECIALTIES.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              التخصص الدقيق أو نوع المنشأة
            </label>
            {activeSpecialtyObj && activeSpecialtyObj.subspecialties.length > 0 ? (
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-teal-600/30 outline-none bg-white"
              >
                {activeSpecialtyObj.subspecialties.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                placeholder="التخصص الدقيق..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-teal-600/30 outline-none"
              />
            )}
          </div>
        </div>
      </div>

      {/* Contact Phones & WhatsApp */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4">
        <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
          <Phone className="h-4 w-4 text-teal-600" />
          أرقام التواصل والحجوزات الفورية:
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              رقم هاتف الاستقبال والحجز <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07XXXXXXXX أو 027XXXXXX"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-teal-600/30 outline-none"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
              <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-600" />
              <span>رقم الواتساب للاستفسارات</span>
            </label>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="07XXXXXXXX"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-teal-600/30 outline-none"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
              <span>هاتف الطوارئ / خارج الدوام</span>
            </label>
            <input
              type="tel"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              placeholder="اختياري: هاتف للحالات الطارئة"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-teal-600/30 outline-none"
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* Location & Maps */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4">
        <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-teal-600" />
          الموقع والعنوان في محافظة إربد:
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              الحي أو المنطقة بإربد <span className="text-rose-500">*</span>
            </label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-teal-600/30 outline-none bg-white"
            >
              {IRBID_REGIONS_CATEGORIZED.map((group) => (
                <optgroup key={group.groupName} label={group.groupName}>
                  {group.areas.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              العنوان التفصيلي وموقع العيادة <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="مثال: شارع الجامعة، مجمع الأطباء، الطابق الثاني"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-teal-600/30 outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-stone-700 mb-1">
              رابط خرائط جوجل (Google Maps Link)
            </label>
            <input
              type="url"
              value={googlePlaceUrl}
              onChange={(e) => setGooglePlaceUrl(e.target.value)}
              placeholder="https://maps.google.com/?q=..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-teal-600/30 outline-none"
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* Media & Photos */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4">
        <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
          <Camera className="h-4 w-4 text-teal-600" />
          شعار وصورة واجهة المنشأة:
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-700">
              صورة الشعار أو الطبيب (مربعة)
            </label>
            <ImageUploader
              value={imageUrl}
              onChange={(url) => setImageUrl(url)}
              aspectRatio="square"
              folder="medical_logos"
              placeholder="ارفع شعار العيادة أو صورة الطبيب"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-700">
              صورة الغلاف أو واجهة المنشأة
            </label>
            <ImageUploader
              value={coverUrl}
              onChange={(url) => setCoverUrl(url)}
              aspectRatio="cover"
              folder="medical_covers"
              placeholder="ارفع صورة واجهة المركز أو العيادة"
            />
          </div>
        </div>
      </div>

      {/* Working Hours */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4">
        <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-teal-600" />
          ساعات الدوام وأوقات الاستقبال:
        </h4>
        <WorkingHoursEditor
          workingHours={workingHours}
          onChange={(wh) => setWorkingHours(wh)}
          showVacationToggle={true}
        />
      </div>

      {/* Social Links */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4">
        <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
          <Share2 className="h-4 w-4 text-teal-600" />
          صفحات التواصل الاجتماعي والموقع:
        </h4>
        <SocialLinksEditor
          socialLinks={socialLinks}
          onChange={(sl) => setSocialLinks(sl)}
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="px-8 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer flex items-center gap-2 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          <span>{isSaving ? 'جاري حفظ التغييرات...' : 'حفظ التغييرات وتحديث المنشأة'}</span>
        </button>
      </div>
    </form>
  );
}
