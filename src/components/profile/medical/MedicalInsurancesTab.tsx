import React, { useState } from 'react';
import { Shield, Check, Plus, Trash2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Business, MedicalInsurance, MedicalFacilityInfo } from '../../../types';
import { POPULAR_JORDANIAN_INSURANCES } from '../../../lib/medicalHelper';
import { db } from '../../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface MedicalInsurancesTabProps {
  business: Business;
  onUpdate: (updated: Business) => void;
  showToast: (msg: string) => void;
}

export function MedicalInsurancesTab({
  business,
  onUpdate,
  showToast
}: MedicalInsurancesTabProps) {
  const medProfile = business.medicalProfile || {};

  // Normalize insurances
  const rawInsurances = medProfile.insurances || [];
  const normalized: MedicalInsurance[] = rawInsurances.map((ins: any) => {
    if (typeof ins === 'string') {
      return { name: ins, isDirectBilling: true, type: 'شركة تأمين' };
    }
    return ins;
  });

  const [activeInsurances, setActiveInsurances] = useState<MedicalInsurance[]>(normalized);
  const [directBilling, setDirectBilling] = useState<boolean>(medProfile.acceptsInsuranceDirectBilling ?? true);
  const [insuranceNotes, setInsuranceNotes] = useState<string>(
    medProfile.insuranceNotes || 'نقبل بطاقات التأمين والنقابات المعتمدة مع خدمة الفحص والمطالبة المباشرة.'
  );
  const [newCustomName, setNewCustomName] = useState('');
  const [newCustomType, setNewCustomType] = useState('شركة تأمين');
  const [isSaving, setIsSaving] = useState(false);

  const togglePopularInsurance = (popIns: MedicalInsurance) => {
    setActiveInsurances(prev => {
      const exists = prev.some(p => p.name === popIns.name);
      if (exists) {
        return prev.filter(p => p.name !== popIns.name);
      } else {
        return [...prev, popIns];
      }
    });
  };

  const handleAddCustomInsurance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomName.trim()) return;
    const name = newCustomName.trim();
    if (activeInsurances.some(i => i.name.toLowerCase() === name.toLowerCase())) {
      alert('هذا التأمين مضاف مسبقاً في القائمة!');
      return;
    }
    setActiveInsurances(prev => [...prev, { name, type: newCustomType, isDirectBilling: true }]);
    setNewCustomName('');
  };

  const handleRemoveInsurance = (name: string) => {
    setActiveInsurances(prev => prev.filter(i => i.name !== name));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!db) return;
    setIsSaving(true);

    try {
      const updatedMed: MedicalFacilityInfo = {
        ...medProfile,
        insurances: activeInsurances,
        acceptsInsuranceDirectBilling: directBilling,
        insuranceNotes: insuranceNotes.trim()
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
      showToast('تم حفظ وتحديث شبكات التأمين والنقابات بنجاح 🛡️');
    } catch (err) {
      console.error('Error saving insurances:', err);
      alert('حدث خطأ أثناء حفظ التأمينات.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-6 text-right" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
        <div>
          <h3 className="text-base font-black text-[#2d2a26] flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-700" />
            إدارة شركات التأمين الصحي والنقابات المهنية المعتمدة
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            تحديد شبكات التأمين التي تقبلها العيادة، مع خيار المطالبة المباشرة والملاحظات للمرضى
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

      {/* Direct Billing Toggle */}
      <div className="bg-teal-50/60 border border-teal-200/80 p-4 rounded-2xl flex items-center justify-between flex-wrap gap-3">
        <div className="space-y-0.5">
          <span className="text-xs font-black text-teal-950 flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-teal-600" />
            قبول الفحص والمطالبة الإلكترونية المباشرة
          </span>
          <p className="text-[11px] text-stone-500">
            إتاحة نسبة التحمل والخصم الفوري للمريض المشمول بالتأمين في الاستقبال
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={directBilling}
            onChange={(e) => setDirectBilling(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
        </label>
      </div>

      {/* Insurance Notes */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-2">
        <label className="block text-xs font-black text-stone-800 flex items-center gap-1.5">
          <Info className="h-4 w-4 text-teal-600" />
          ملاحظات وإرشادات التأمين الموجهة للمراجعين:
        </label>
        <p className="text-[11px] text-stone-500">
          تظهر في بطاقة التأمين بالصفحة العامة (مثل: إحضار نموذج التحويل، البطاقة الشخصية، شروط الاسترداد...)
        </p>
        <input
          type="text"
          value={insuranceNotes}
          onChange={(e) => setInsuranceNotes(e.target.value)}
          placeholder="مثال: يرجى إبراز بطاقة التأمين والهوية عند الاستقبال للاستفادة من الخصم المباشر"
          className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-teal-600/30 outline-none"
        />
      </div>

      {/* Popular Jordan Insurances Toggle Grid */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-stone-100 flex-wrap gap-2">
          <div>
            <h4 className="text-xs font-black text-stone-900">
              النقابات المهنية وشركات التأمين الأكثر شيوعاً في الأردن وإربد:
            </h4>
            <span className="text-[10px] text-stone-400">انقر على أي تأمين لإضافته أو إلغائه ({activeInsurances.length} معتمد حالياً)</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {POPULAR_JORDANIAN_INSURANCES.map((pop) => {
            const isSelected = activeInsurances.some(i => i.name === pop.name);
            return (
              <button
                key={pop.name}
                type="button"
                onClick={() => togglePopularInsurance(pop)}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-teal-50/90 border-teal-500 text-teal-950 font-black shadow-2xs'
                    : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                <div className="min-w-0 pr-1">
                  <span className="text-xs block truncate">{pop.name}</span>
                  <span className="text-[10px] text-stone-400 font-normal">{pop.type}</span>
                </div>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                  isSelected ? 'bg-teal-600 text-white' : 'border border-stone-300'
                }`}>
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Insurances Form & List */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-4">
        <h4 className="text-xs font-black text-stone-900">
          إضافة شركة تأمين خاصة أو نقابة إضافية:
        </h4>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newCustomName}
            onChange={(e) => setNewCustomName(e.target.value)}
            placeholder="اسم الشركة أو النقابة (مثال: تأمين بنك الإسكان، نقابة المحاسبين...)"
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-teal-600/30 outline-none"
          />
          <select
            value={newCustomType}
            onChange={(e) => setNewCustomType(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-stone-200 text-xs font-bold bg-white outline-none"
          >
            <option value="شركة تأمين">شركة تأمين</option>
            <option value="نقابة">نقابة مهنية</option>
            <option value="حكومي">تأمين حكومي</option>
            <option value="خاص">صندوق خاص / شركة</option>
          </select>
          <button
            type="button"
            onClick={handleAddCustomInsurance}
            className="px-5 py-2.5 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-black transition-colors cursor-pointer shrink-0"
          >
            إضافة للقائمة ➕
          </button>
        </div>

        {/* Custom items display */}
        {activeInsurances.filter(i => !POPULAR_JORDANIAN_INSURANCES.some(p => p.name === i.name)).length > 0 && (
          <div className="pt-2 border-t border-stone-100">
            <span className="text-[11px] font-bold text-stone-600 block mb-2">التأمينات الخاصة الإضافية:</span>
            <div className="flex flex-wrap gap-2">
              {activeInsurances
                .filter(i => !POPULAR_JORDANIAN_INSURANCES.some(p => p.name === i.name))
                .map((cust) => (
                  <span
                    key={cust.name}
                    className="inline-flex items-center gap-1.5 bg-teal-50 border border-teal-200 text-teal-900 px-3 py-1 rounded-xl text-xs font-bold"
                  >
                    <span>{cust.name} ({cust.type || 'خاص'})</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveInsurance(cust.name)}
                      className="text-stone-400 hover:text-red-600 p-0.5"
                    >
                      ✕
                    </button>
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="px-8 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-black transition-all shadow-sm cursor-pointer flex items-center gap-2 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          <span>{isSaving ? 'جاري حفظ التغييرات...' : 'حفظ شبكات التأمين المعتمدة'}</span>
        </button>
      </div>
    </form>
  );
}
