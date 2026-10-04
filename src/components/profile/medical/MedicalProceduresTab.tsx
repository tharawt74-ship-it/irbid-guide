import React, { useState } from 'react';
import { 
  Activity, Plus, Trash2, Edit3, DollarSign, Clock, 
  Check, Sparkles, AlertCircle, Layers, Star 
} from 'lucide-react';
import { Business, MenuItem, MedicalProcedure, MedicalFacilityInfo } from '../../../types';
import { db } from '../../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { sanitizeFirestorePayload } from '../../../lib/firestoreHelper';

interface MedicalProceduresTabProps {
  business: Business;
  onUpdate: (updated: Business) => void;
  showToast: (msg: string) => void;
  onOpenAdvancedModal: () => void;
}

export function MedicalProceduresTab({
  business,
  onUpdate,
  showToast,
  onOpenAdvancedModal
}: MedicalProceduresTabProps) {
  const medProfile = business.medicalProfile || {};

  const [consultationFee, setConsultationFee] = useState(
    medProfile.consultationFee || '15 - 20 د.أ (تعرفة النقابة)'
  );
  const [followUpPolicy, setFollowUpPolicy] = useState(
    medProfile.followUpPolicy || 'المراجعة مجانية خلال 14 يوماً من تاريخ الكشف'
  );
  const [appointmentDuration, setAppointmentDuration] = useState(
    medProfile.appointmentDurationMinutes || 20
  );

  // Initialize procedures from business.menuItems or medProfile.procedures
  const initialItems: MenuItem[] = business.menuItems || (medProfile.procedures ? medProfile.procedures.map((p, idx) => ({
    id: p.id || `proc-${idx}`,
    name: p.name,
    price: String(p.price || ''),
    category: p.category || 'كشوفات وخدمات طبية',
    description: p.description || '',
    isPopular: p.isPopular
  })) : []);

  const [procedures, setProcedures] = useState<MenuItem[]>(initialItems);

  // Add new procedure state
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('كشوفات ومعاينات');
  const [newDuration, setNewDuration] = useState('20 دقيقة');
  const [newDescription, setNewDescription] = useState('');
  const [newIsPopular, setNewIsPopular] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const isPharmacy = business.category?.includes('صيدل') || business.name?.includes('صيدلية');

  const handleAddProcedure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newItem: MenuItem = {
      id: `med-${Date.now()}`,
      name: newName.trim(),
      price: newPrice.trim(),
      category: newCategory.trim(),
      description: newDescription.trim(),
      isPopular: newIsPopular
    };

    setProcedures(prev => [...prev, newItem]);
    setNewName('');
    setNewPrice('');
    setNewDescription('');
    setNewIsPopular(false);
    setIsAdding(false);
  };

  const handleRemoveProcedure = (id: string, index: number) => {
    setProcedures(prev => prev.filter((p, idx) => (p.id ? p.id !== id : idx !== index)));
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!db) return;
    setIsSaving(true);

    try {
      // Map to MedicalProcedure format as well
      const formattedProcedures: MedicalProcedure[] = procedures.map((item, idx) => ({
        id: item.id || `proc-${idx}`,
        name: item.name,
        price: item.price,
        category: item.category,
        description: item.description,
        isPopular: item.isPopular
      }));

      const updatedMed: MedicalFacilityInfo = {
        ...medProfile,
        consultationFee: consultationFee.trim(),
        followUpPolicy: followUpPolicy.trim(),
        appointmentDurationMinutes: Number(appointmentDuration) || 20,
        procedures: formattedProcedures
      };

      const updatedPayload: Partial<Business> = {
        menuItems: procedures,
        medicalProfile: updatedMed
      };

      await updateDoc(doc(db, 'businesses', business.id), sanitizeFirestorePayload(updatedPayload));

      const mergedBiz = {
        ...business,
        ...updatedPayload
      } as Business;

      onUpdate(mergedBiz);
      showToast('تم حفظ الخدمات والإجراءات الطبية والكشفية بنجاح 📋');
    } catch (err) {
      console.error('Error saving procedures:', err);
      alert('حدث خطأ أثناء حفظ الخدمات الطبية.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="p-2 sm:p-6 space-y-4 sm:space-y-6 text-right" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
        <div>
          <h3 className="text-base font-black text-[#2d2a26] flex items-center gap-2">
            <Activity className="h-5 w-5 text-teal-700" />
            الخدمات الطبية، الكشوفات، الإجراءات والأسعار
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            إدارة قائمة الفحوصات والعمليات والكشوفات المعروضة للمرضى في تاب الخدمات بصفحة المنشأة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
          </button>
        </div>
      </div>

      {/* Consultation Fee & Follow up Policy */}
      <div className="bg-white border-0 sm:border border-stone-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 space-y-4 shadow-none sm:shadow-2xs">
        <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
          <DollarSign className="h-4 w-4 text-teal-600" />
          {isPharmacy ? 'رسوم الخدمات والتوصيل والاستشارات:' : 'رسوم الكشفية وسياسة المراجعة المجانية:'}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              {isPharmacy ? 'رسوم التوصيل أو الخدمة' : 'قيمة الكشفية / الاستشارة'}
            </label>
            <input
              type="text"
              value={consultationFee}
              onChange={(e) => setConsultationFee(e.target.value)}
              placeholder={isPharmacy ? 'مجاناً أو حسب المنطقة' : 'مثال: 15 - 20 د.أ (تعرفة النقابة)'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-teal-600/30 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              {isPharmacy ? 'سياسة البدائل الدوائية' : 'سياسة المراجعة المجانية'}
            </label>
            <input
              type="text"
              value={followUpPolicy}
              onChange={(e) => setFollowUpPolicy(e.target.value)}
              placeholder={isPharmacy ? 'استشارة مجانية وبدائل معتمدة' : 'المراجعة مجانية خلال 14 يوماً'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-teal-600/30 outline-none"
            />
          </div>

          {!isPharmacy && (
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                المدة المقدرة للكشف (بالدقائق)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={appointmentDuration}
                onChange={(e) => setAppointmentDuration(Number(e.target.value) || 20)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs font-bold focus:ring-2 focus:ring-teal-600/30 outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Procedures List */}
      <div className="bg-white border-0 sm:border border-stone-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 space-y-4 shadow-none sm:shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 flex-wrap gap-2">
          <div>
            <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
              <Layers className="h-4 w-4 text-teal-600" />
              قائمة الخدمات الطبية والكشوفات المضافة ({procedures.length})
            </h4>
            <span className="text-[10px] text-stone-400">تظهر مرتبة في تاب "الخدمات والإجراءات"</span>
          </div>

          <button
            type="button"
            onClick={onOpenAdvancedModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة خدمة طبية جديدة</span>
          </button>
        </div>

        {/* Procedures Grid */}
        {procedures.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {procedures.map((proc, idx) => (
              <div key={proc.id || idx} className="bg-stone-50 border border-stone-200 p-3.5 rounded-xl space-y-2 relative group">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h5 className="text-xs font-black text-stone-900 flex items-center gap-1">
                      {proc.name}
                      {proc.isPopular && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                          شائع
                        </span>
                      )}
                    </h5>
                    {proc.category && (
                      <span className="text-[10px] text-stone-400 font-bold block">{proc.category}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {proc.price && (
                      <span className="text-xs font-black text-teal-800 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-lg shrink-0">
                        {proc.price} {proc.price.toString().includes('د') ? '' : 'د.أ'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveProcedure(proc.id || '', idx)}
                      className="text-stone-300 hover:text-red-600 p-1 transition-colors cursor-pointer"
                      title="حذف الخدمة"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {proc.description && (
                  <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                    {proc.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-stone-400 py-4 text-center">
            لم تقم بإضافة خدمات طبية بعد. أضف الكشوفات أو الإجراءات الشائعة لتسهيل حجز المراجعين.
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
          <span>{isSaving ? 'جاري حفظ التغييرات...' : 'حفظ الخدمات والأسعار'}</span>
        </button>
      </div>
    </form>
  );
}
