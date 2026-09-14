import React, { useState } from 'react';
import { 
  Accessibility, Car, Baby, HeartPulse, CreditCard, 
  Home, Activity, ShieldCheck, Plus, Trash2, Cpu, Check, 
  Eye, EyeOff, Sparkles 
} from 'lucide-react';
import { Business, MedicalFacilityInfo, MedicalEquipment } from '../../../types';
import { db } from '../../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface MedicalAmenitiesTabProps {
  business: Business;
  onUpdate: (updated: Business) => void;
  showToast: (msg: string) => void;
}

export function MedicalAmenitiesTab({
  business,
  onUpdate,
  showToast
}: MedicalAmenitiesTabProps) {
  const medProfile = business.medicalProfile || {};

  // Amenities Toggles
  const [showAmenities, setShowAmenities] = useState<boolean>(medProfile.showAmenities ?? true);
  const [hasWheelchairAccess, setHasWheelchairAccess] = useState<boolean>(medProfile.hasWheelchairAccess ?? true);
  const [hasElevator, setHasElevator] = useState<boolean>(medProfile.hasElevator ?? true);
  const [hasParking, setHasParking] = useState<boolean>(medProfile.hasParking ?? true);
  const [hasFemaleStaff, setHasFemaleStaff] = useState<boolean>(medProfile.hasFemaleStaff ?? true);
  const [hasElectronicPayment, setHasElectronicPayment] = useState<boolean>(medProfile.hasElectronicPayment ?? true);
  const [hasKidsArea, setHasKidsArea] = useState<boolean>(medProfile.hasKidsArea ?? false);
  const [has24Emergency, setHas24Emergency] = useState<boolean>(medProfile.has24Emergency ?? false);
  const [offersHomeVisits, setOffersHomeVisits] = useState<boolean>(medProfile.offersHomeVisits ?? false);

  // Equipments State
  const [showEquipments, setShowEquipments] = useState<boolean>(medProfile.showEquipments ?? true);
  const [equipments, setEquipments] = useState<MedicalEquipment[]>(medProfile.equipments || []);

  // Add Equipment Form
  const [isAddingEquip, setIsAddingEquip] = useState(false);
  const [newEqName, setNewEqName] = useState('');
  const [newEqOrigin, setNewEqOrigin] = useState('');
  const [newEqDesc, setNewEqDesc] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  const handleAddEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEqName.trim()) return;

    const newEquip: MedicalEquipment = {
      name: newEqName.trim(),
      brandOrOrigin: newEqOrigin.trim(),
      description: newEqDesc.trim()
    };

    setEquipments(prev => [...prev, newEquip]);
    setNewEqName('');
    setNewEqOrigin('');
    setNewEqDesc('');
    setIsAddingEquip(false);
  };

  const handleRemoveEquipment = (index: number) => {
    setEquipments(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!db) return;
    setIsSaving(true);

    try {
      const updatedMed: MedicalFacilityInfo = {
        ...medProfile,
        showAmenities,
        hasWheelchairAccess,
        hasElevator,
        hasParking,
        hasFemaleStaff,
        hasElectronicPayment,
        hasKidsArea,
        has24Emergency,
        offersHomeVisits,
        showEquipments,
        equipments
      };

      const updatedPayload: Partial<Business> = {
        medicalProfile: updatedMed
      };

      await updateDoc(doc(db, 'businesses', business.id), updatedPayload);

      const mergedBiz = {
        ...business,
        ...updatedPayload
      } as Business;

      onUpdate(mergedBiz);
      showToast('تم حفظ المرافق والتجهيزات الطبية بنجاح 🏥');
    } catch (err) {
      console.error('Error saving amenities and equipments:', err);
      alert('حدث خطأ أثناء حفظ المرافق والتجهيزات.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-6 text-right" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
        <div>
          <h3 className="text-base font-black text-[#2d2a26] flex items-center gap-2">
            <Cpu className="h-5 w-5 text-teal-700" />
            المرافق، التسهيلات، والتجهيزات والتقنيات الطبية
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            إدارة تسهيلات وصول المرضى وكبار السن، وقائمة الأجهزة والتقنيات الطبية الحديثة
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

      {/* 1. Facilities & Amenities Section */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 flex-wrap gap-2">
          <div className="space-y-0.5">
            <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
              <Accessibility className="h-4 w-4 text-teal-600" />
              تسهيلات المراجعين والخدمات اللوجستية:
            </h4>
            <span className="text-[10px] text-stone-400">تظهر على شكل أيقونات تفاعلية في صفحة العيادة</span>
          </div>

          <label className="flex items-center gap-1.5 text-xs font-bold text-stone-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showAmenities}
              onChange={(e) => setShowAmenities(e.target.checked)}
              className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
            />
            <span>إظهار قسم المرافق في صفحة المنشأة</span>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
            hasWheelchairAccess ? 'bg-teal-50/70 border-teal-400 font-black text-teal-950' : 'bg-stone-50 border-stone-200 text-stone-600'
          }`}>
            <input
              type="checkbox"
              checked={hasWheelchairAccess}
              onChange={(e) => setHasWheelchairAccess(e.target.checked)}
              className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
            />
            <span className="text-xs">♿ ممر كراسي متحركة</span>
          </label>

          <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
            hasElevator ? 'bg-teal-50/70 border-teal-400 font-black text-teal-950' : 'bg-stone-50 border-stone-200 text-stone-600'
          }`}>
            <input
              type="checkbox"
              checked={hasElevator}
              onChange={(e) => setHasElevator(e.target.checked)}
              className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
            />
            <span className="text-xs">🛗 مصعد بالمبنى</span>
          </label>

          <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
            hasParking ? 'bg-teal-50/70 border-teal-400 font-black text-teal-950' : 'bg-stone-50 border-stone-200 text-stone-600'
          }`}>
            <input
              type="checkbox"
              checked={hasParking}
              onChange={(e) => setHasParking(e.target.checked)}
              className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
            />
            <span className="text-xs">🚗 مواقف سيارات</span>
          </label>

          <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
            hasFemaleStaff ? 'bg-teal-50/70 border-teal-400 font-black text-teal-950' : 'bg-stone-50 border-stone-200 text-stone-600'
          }`}>
            <input
              type="checkbox"
              checked={hasFemaleStaff}
              onChange={(e) => setHasFemaleStaff(e.target.checked)}
              className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
            />
            <span className="text-xs">👩‍⚕️ كادر تمريضي نسائي</span>
          </label>

          <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
            hasElectronicPayment ? 'bg-teal-50/70 border-teal-400 font-black text-teal-950' : 'bg-stone-50 border-stone-200 text-stone-600'
          }`}>
            <input
              type="checkbox"
              checked={hasElectronicPayment}
              onChange={(e) => setHasElectronicPayment(e.target.checked)}
              className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
            />
            <span className="text-xs">💳 دفع إلكتروني وبطاقات</span>
          </label>

          <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
            hasKidsArea ? 'bg-teal-50/70 border-teal-400 font-black text-teal-950' : 'bg-stone-50 border-stone-200 text-stone-600'
          }`}>
            <input
              type="checkbox"
              checked={hasKidsArea}
              onChange={(e) => setHasKidsArea(e.target.checked)}
              className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
            />
            <span className="text-xs">🧸 ركن ألعاب للأطفال</span>
          </label>

          <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
            has24Emergency ? 'bg-rose-50 border-rose-400 font-black text-rose-950' : 'bg-stone-50 border-stone-200 text-stone-600'
          }`}>
            <input
              type="checkbox"
              checked={has24Emergency}
              onChange={(e) => setHas24Emergency(e.target.checked)}
              className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500"
            />
            <span className="text-xs">🚨 طوارئ 24 ساعة</span>
          </label>

          <label className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all cursor-pointer ${
            offersHomeVisits ? 'bg-teal-50/70 border-teal-400 font-black text-teal-950' : 'bg-stone-50 border-stone-200 text-stone-600'
          }`}>
            <input
              type="checkbox"
              checked={offersHomeVisits}
              onChange={(e) => setOffersHomeVisits(e.target.checked)}
              className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
            />
            <span className="text-xs">🏠 زيارات ورعاية منزلية</span>
          </label>
        </div>
      </div>

      {/* 2. Medical Equipments & Advanced Tech */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 flex-wrap gap-2">
          <div className="space-y-0.5">
            <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
              <Cpu className="h-4 w-4 text-teal-600" />
              الأجهزة والتقنيات الطبية الحديثة المستخدمة ({equipments.length})
            </h4>
            <span className="text-[10px] text-stone-400">تبرز كفاءة المنشأة في التشخيص والعلاج المتطور</span>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs font-bold text-stone-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showEquipments}
                onChange={(e) => setShowEquipments(e.target.checked)}
                className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
              />
              <span>إظهار قسم الأجهزة في صفحة العيادة</span>
            </label>

            {!isAddingEquip && (
              <button
                type="button"
                onClick={() => setIsAddingEquip(true)}
                className="px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>إضافة جهاز / تقنية طبية</span>
              </button>
            )}
          </div>
        </div>

        {/* Add Equipment Form */}
        {isAddingEquip && (
          <div className="bg-teal-50/40 border border-teal-200 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-teal-950">إضافة جهاز أو تقنية طبية جديدة:</span>
              <button
                type="button"
                onClick={() => setIsAddingEquip(false)}
                className="text-xs text-stone-400 hover:text-stone-600"
              >
                إلغاء ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">اسم الجهاز أو التقنية *</label>
                <input
                  type="text"
                  value={newEqName}
                  onChange={(e) => setNewEqName(e.target.value)}
                  placeholder="مثال: جهاز الليزر Candela GentleLase Pro، ألتراساوند رباعي الأبعاد 4D..."
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs font-bold bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">المنشأ / الموديل أو الماركة</label>
                <input
                  type="text"
                  value={newEqOrigin}
                  onChange={(e) => setNewEqOrigin(e.target.value)}
                  placeholder="مثال: ألماني الصنع، شركة GE الأمريكية..."
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs font-bold bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-stone-700 mb-1">الغرض والاستخدام الطبي</label>
                <input
                  type="text"
                  value={newEqDesc}
                  onChange={(e) => setNewEqDesc(e.target.value)}
                  placeholder="تشخيص دقيق عالي الدقة بدون ألم..."
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-xs font-bold bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingEquip(false)}
                className="px-4 py-2 bg-stone-100 text-stone-600 rounded-lg text-xs font-bold hover:bg-stone-200"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleAddEquipment}
                className="px-5 py-2 bg-teal-700 text-white rounded-lg text-xs font-black hover:bg-teal-800"
              >
                إضافة الجهاز ➕
              </button>
            </div>
          </div>
        )}

        {/* Current Equipments Grid */}
        {equipments.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {equipments.map((eq, idx) => (
              <div key={idx} className="bg-stone-50 border border-stone-200 p-3.5 rounded-xl space-y-2 relative group">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h5 className="text-xs font-black text-stone-900 truncate">{eq.name}</h5>
                    {eq.brandOrOrigin && (
                      <span className="text-[10px] text-teal-700 font-bold block">{eq.brandOrOrigin}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveEquipment(idx)}
                    className="text-stone-300 hover:text-red-600 p-1 transition-colors cursor-pointer shrink-0"
                    title="حذف الجهاز"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                {eq.description && (
                  <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                    {eq.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-stone-400 py-3 text-center">
            لم تسجل أجهزة طبية خاصة بعد. أضف أجهزتك وتقنياتك لزيادة ثقة المراجعين.
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
          <span>{isSaving ? 'جاري حفظ التغييرات...' : 'حفظ المرافق والتجهيزات'}</span>
        </button>
      </div>
    </form>
  );
}
