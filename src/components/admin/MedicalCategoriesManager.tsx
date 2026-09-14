import React, { useState } from 'react';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useSystemSettings } from '../../contexts/SystemSettingsContext';
import { 
  FolderTree, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Check, 
  Eye, 
  Stethoscope,
  Building2,
  Pill,
  Microscope,
  Heart,
  Activity,
  Baby,
  User,
  Eye as EyeIcon,
  Zap,
  Brain
} from 'lucide-react';
import { ToothIcon } from '../../lib/medicalCategories';

interface MedicalCategoriesManagerProps {
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

const iconComponents: Record<string, React.ComponentType<any>> = {
  Building2,
  Pill,
  Microscope,
  Heart,
  Activity,
  Baby,
  User,
  Eye: EyeIcon,
  Zap,
  Brain,
  Tooth: ToothIcon,
  Stethoscope
};

export function MedicalCategoriesManager({ showToast }: MedicalCategoriesManagerProps) {
  const { confirm } = useConfirm();
  const { 
    medicalCategories, 
    addMedicalCategory, 
    updateMedicalCategory, 
    deleteMedicalCategory 
  } = useSystemSettings();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any | null>(null);
  const [newSubcatForEdit, setNewSubcatForEdit] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    iconName: 'Stethoscope',
    description: '',
    subspecialties: [] as string[]
  });

  const [newSubcat, setNewSubcat] = useState('');

  const handleCreate = async () => {
    if (!formData.name?.trim()) {
      showToast('يرجى كتابة اسم الاختصاص الرئيسي', 'error');
      return;
    }

    const newCat = {
      id: `med_cat_${Date.now()}`,
      name: formData.name.trim(),
      iconName: formData.iconName || 'Stethoscope',
      description: formData.description || '',
      subspecialties: formData.subspecialties || [],
      isFemale: false,
      keywords: [formData.name.trim()],
      active: true
    };

    await addMedicalCategory(newCat);
    showToast(`تمت إضافة اختصاص طبي (${newCat.name}) بنجاح`);
    setIsAdding(false);
    setFormData({ name: '', iconName: 'Stethoscope', description: '', subspecialties: [] });
  };

  const handleAddSubcat = () => {
    if (!newSubcat.trim()) return;
    setFormData(prev => ({
      ...prev,
      subspecialties: [...prev.subspecialties, newSubcat.trim()]
    }));
    setNewSubcat('');
  };

  const handleRemoveSubcat = (index: number) => {
    setFormData(prev => ({
      ...prev,
      subspecialties: prev.subspecialties.filter((_, i) => i !== index)
    }));
  };

  const handleToggleActive = async (cat: any) => {
    await updateMedicalCategory(cat.id, { active: cat.active !== false ? false : true });
    showToast(cat.active !== false ? `تم إخفاء اختصاص (${cat.name})` : `تم تفعيل اختصاص (${cat.name})`, 'info');
  };

  const handleDelete = async (cat: any) => {
    if ((await confirm({ message: `هل أنت متأكد من حذف الاختصاص الطبي المسمى (${cat.name})؟ سيتم حذفه بالكامل مع التخصصات الفرعية له.` }))) {
      await deleteMedicalCategory(cat.id);
      showToast(`تم حذف الاختصاص (${cat.name})`, 'info');
    }
  };

  const handleStartEdit = (cat: any) => {
    setEditingId(cat.id);
    setEditFormData({ ...cat });
    setNewSubcatForEdit('');
  };

  const handleSaveEdit = async () => {
    if (!editFormData) return;
    if (!editFormData.name.trim()) {
      showToast('اسم الاختصاص مطلوب', 'error');
      return;
    }

    await updateMedicalCategory(editFormData.id, editFormData);
    showToast(`تم حفظ تعديلات اختصاص (${editFormData.name}) بنجاح`, 'success');
    setEditingId(null);
    setEditFormData(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData(null);
  };

  const handleAddSubcatForEdit = () => {
    if (!newSubcatForEdit.trim() || !editFormData) return;
    setEditFormData({
      ...editFormData,
      subspecialties: [...(editFormData.subspecialties || []), newSubcatForEdit.trim()]
    });
    setNewSubcatForEdit('');
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#e5e1da] shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-50 rounded-2xl text-rose-700">
            <Stethoscope className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-stone-900">إدارة تصنيفات واختصاصات الرعاية الطبية</h2>
            <p className="text-stone-500 text-xs">إضافة، تعديل، وترتيب الاختصاصات الطبية الرئيسية والفرعية في دليل الرعاية الطبية</p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center justify-center gap-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-4 py-2.5 rounded-xl text-xs font-black transition-colors cursor-pointer shadow-xs"
        >
          <Plus className="h-4 w-4 text-[#ff9f1c]" />
          <span>إضافة اختصاص طبي جديد</span>
        </button>
      </div>

      {/* Adding Specialty Form */}
      {isAdding && (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
            <h3 className="font-black text-sm text-stone-900">إضافة اختصاص طبي رئيسي وفرعي جديد</h3>
            <button onClick={() => setIsAdding(false)} className="text-stone-400 hover:text-stone-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">اسم الاختصاص الطبي</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: طب وجراحة العيون"
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">اسم الأيقونة (Lucide Icon Name)</label>
              <select
                value={formData.iconName}
                onChange={e => setFormData({ ...formData, iconName: e.target.value })}
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800"
              >
                <option value="Stethoscope">سماعة طبيب (Stethoscope)</option>
                <option value="Building2">مستشفى / مبنى (Building2)</option>
                <option value="Pill">كبسولة دواء (Pill)</option>
                <option value="Microscope">ميكروسكوب / مختبر (Microscope)</option>
                <option value="Heart">قلب (Heart)</option>
                <option value="Activity">نبض / تخطيط (Activity)</option>
                <option value="Baby">طفل (Baby)</option>
                <option value="User">شخص / نسائية (User)</option>
                <option value="Eye">عين (Eye)</option>
                <option value="Zap">صدمة / طاقة (Zap)</option>
                <option value="Brain">عقل / مخ وأعصاب (Brain)</option>
                <option value="Tooth">سن / أسنان (Tooth)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700 mb-1">الوصف المختصر</label>
              <input
                type="text"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="مثال: عيادات وأخصائيي وجراحي العيون والليزك وعلاج البصر في إربد"
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800"
              />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <label className="block text-xs font-bold text-stone-700">التخصصات الفرعية (Subspecialties)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubcat}
                  onChange={e => setNewSubcat(e.target.value)}
                  placeholder="اكتب التخصص الفرعي (مثل: تصحيح النظر، شبكية العين) واضغط إضافة"
                  className="flex-1 bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800"
                />
                <button
                  type="button"
                  onClick={handleAddSubcat}
                  className="bg-stone-800 text-white px-3 py-2 rounded-xl text-xs font-bold"
                >
                  إضافة
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {formData.subspecialties.map((sub, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 bg-white border border-stone-200 px-2.5 py-1 rounded-lg text-xs font-bold text-stone-700">
                    <span>{sub}</span>
                    <button onClick={() => handleRemoveSubcat(idx)} className="text-red-500 hover:text-red-700">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setIsAdding(false)}
              className="bg-stone-200 hover:bg-stone-300 text-stone-700 px-4 py-2 rounded-xl text-xs font-bold"
            >
              إلغاء
            </button>
            <button
              onClick={handleCreate}
              className="bg-[#1a4d2e] hover:bg-[#133b22] text-white px-5 py-2 rounded-xl text-xs font-black"
            >
              حفظ الاختصاص
            </button>
          </div>
        </div>
      )}

      {/* Specialty List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {medicalCategories.map((cat: any) => {
          const isEditingThis = editingId === cat.id;
          const IconComp = iconComponents[cat.iconName] || Stethoscope;

          return (
            <div key={cat.id} className="border border-stone-200 rounded-2xl p-4 bg-white flex flex-col justify-between space-y-3 transition-all">
              {isEditingThis && editFormData ? (
                // EDIT MODE
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="text-xs font-black text-stone-800">تعديل الاختصاص: {cat.name}</span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={handleSaveEdit}
                        className="bg-emerald-600 text-white p-1 rounded hover:bg-emerald-700 text-[10px] font-bold flex items-center gap-1 px-2.5 py-1"
                      >
                        <Check className="h-3 w-3" />
                        حفظ التعديل
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="bg-stone-200 text-stone-700 p-1 rounded hover:bg-stone-300 text-[10px] font-bold flex items-center gap-1 px-2.5 py-1"
                      >
                        <X className="h-3 w-3" />
                        إلغاء
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[10px] font-black text-stone-500 mb-0.5">اسم الاختصاص الطبي الرئيسي</label>
                      <input
                        type="text"
                        value={editFormData.name}
                        onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-800"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-stone-500 mb-0.5">رمز الأيقونة</label>
                      <select
                        value={editFormData.iconName || 'Stethoscope'}
                        onChange={e => setEditFormData({ ...editFormData, iconName: e.target.value })}
                        className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-800"
                      >
                        <option value="Stethoscope">سماعة طبيب (Stethoscope)</option>
                        <option value="Building2">مستشفى / مبنى (Building2)</option>
                        <option value="Pill">كبسولة دواء (Pill)</option>
                        <option value="Microscope">ميكروسكوب / مختبر (Microscope)</option>
                        <option value="Heart">قلب (Heart)</option>
                        <option value="Activity">نبض / تخطيط (Activity)</option>
                        <option value="Baby">طفل (Baby)</option>
                        <option value="User">شخص / نسائية (User)</option>
                        <option value="Eye">عين (Eye)</option>
                        <option value="Zap">صدمة / طاقة (Zap)</option>
                        <option value="Brain">عقل / مخ وأعصاب (Brain)</option>
                        <option value="Tooth">سن / أسنان (Tooth)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-stone-500 mb-0.5">الوصف</label>
                      <input
                        type="text"
                        value={editFormData.description || ''}
                        onChange={e => setEditFormData({ ...editFormData, description: e.target.value })}
                        className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-stone-800"
                      />
                    </div>

                    <div className="space-y-2 pt-2 border-t border-stone-100">
                      <span className="block text-[10px] font-black text-stone-500">تعديل التخصصات الفرعية:</span>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto p-1 bg-stone-50 rounded-xl border border-stone-100">
                        {(editFormData.subspecialties || []).map((sub: string, sIdx: number) => (
                          <div key={sIdx} className="flex items-center gap-1 bg-white p-1.5 rounded-lg border border-stone-200 shadow-3xs">
                            <input
                              type="text"
                              value={sub}
                              onChange={e => {
                                const updated = [...(editFormData.subspecialties || [])];
                                updated[sIdx] = e.target.value;
                                setEditFormData({ ...editFormData, subspecialties: updated });
                              }}
                              className="flex-1 bg-transparent border-none p-0 text-[11px] font-bold text-stone-800 focus:ring-0 focus:outline-none"
                            />
                            <button
                              onClick={() => {
                                const updated = editFormData.subspecialties.filter((_: string, i: number) => i !== sIdx);
                                setEditFormData({ ...editFormData, subspecialties: updated });
                              }}
                              className="text-red-500 hover:text-red-700 p-0.5"
                              title="حذف هذا القسم الفرعي"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-1.5 pt-1">
                        <input
                          type="text"
                          value={newSubcatForEdit}
                          onChange={e => setNewSubcatForEdit(e.target.value)}
                          placeholder="إضافة تخصص فرعي جديد..."
                          className="flex-1 bg-white border border-stone-200 rounded-lg px-2 py-1 text-[11px] font-bold text-stone-800"
                        />
                        <button
                          type="button"
                          onClick={handleAddSubcatForEdit}
                          className="bg-stone-800 hover:bg-stone-900 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0"
                        >
                          إضافة
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // DISPLAY MODE
                <>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="p-3 bg-rose-50 text-rose-700 rounded-xl font-black">
                        <IconComp className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
                          <span>{cat.name}</span>
                          {cat.active === false && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">معطل</span>
                          )}
                        </h3>
                        {cat.description && <p className="text-xs text-stone-500 leading-relaxed">{cat.description}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleStartEdit(cat)}
                        className="p-1.5 rounded-lg text-xs font-bold bg-sky-50 text-sky-700 hover:bg-sky-100"
                        title="تعديل هذا الاختصاص"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleActive(cat)}
                        className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${cat.active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}
                        title="تفعيل/تعطيل الظهور"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat)}
                        className="p-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100"
                        title="حذف الاختصاص"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {cat.subspecialties && cat.subspecialties.length > 0 && (
                    <div className="bg-stone-50 rounded-xl p-2.5 border border-stone-100">
                      <span className="text-[10px] font-black text-stone-400 block mb-1">التخصصات الفرعية المعتمدة:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.subspecialties.map((sub: string, sIdx: number) => (
                          <span key={sIdx} className="bg-white border border-stone-200 px-2.5 py-1 rounded-lg text-[11px] font-bold text-stone-700">
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
