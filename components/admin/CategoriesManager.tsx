import React, { useState } from 'react';
import { useSystemSettings } from '../../contexts/SystemSettingsContext';
import { CategoryConfig } from '../../types';
import { FolderTree, Plus, Trash2, Edit3, Save, X, Check, Eye } from 'lucide-react';

interface CategoriesManagerProps {
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export function CategoriesManager({ showToast }: CategoriesManagerProps) {
  const { categories, addCategory, updateCategory, deleteCategory } = useSystemSettings();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<CategoryConfig>>({
    name: '',
    iconName: 'Folder',
    description: '',
    badgeColor: 'bg-emerald-100 text-emerald-800',
    subcategories: []
  });

  const [newSubcat, setNewSubcat] = useState('');

  const handleCreate = async () => {
    if (!formData.name?.trim()) {
      showToast('يرجى كتابة اسم التصنيف', 'error');
      return;
    }

    const newCat: CategoryConfig = {
      id: `cat_${Date.now()}`,
      name: formData.name.trim(),
      iconName: formData.iconName || 'Folder',
      description: formData.description || '',
      badgeColor: formData.badgeColor || 'bg-stone-100 text-stone-800',
      subcategories: formData.subcategories || [],
      active: true
    };

    await addCategory(newCat);
    showToast(`تمت إضافة تصنيف (${newCat.name}) بنجاح`);
    setIsAdding(false);
    setFormData({ name: '', iconName: 'Folder', description: '', badgeColor: 'bg-emerald-100 text-emerald-800', subcategories: [] });
  };

  const handleAddSubcat = () => {
    if (!newSubcat.trim()) return;
    setFormData(prev => ({
      ...prev,
      subcategories: [...(prev.subcategories || []), newSubcat.trim()]
    }));
    setNewSubcat('');
  };

  const handleRemoveSubcat = (index: number) => {
    setFormData(prev => ({
      ...prev,
      subcategories: (prev.subcategories || []).filter((_, i) => i !== index)
    }));
  };

  const handleToggleActive = async (cat: CategoryConfig) => {
    await updateCategory(cat.id, { active: !cat.active });
    showToast(cat.active ? `تم إخفاء تصنيف (${cat.name})` : `تم تفعيل تصنيف (${cat.name})`, 'info');
  };

  const handleDelete = async (cat: CategoryConfig) => {
    if (confirm(`هل أنت تأكد من حذف تصنيف (${cat.name})؟`)) {
      await deleteCategory(cat.id);
      showToast(`تم حذف تصنيف (${cat.name})`, 'info');
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#e5e1da] shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 rounded-2xl text-[#1a4d2e]">
            <FolderTree className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-stone-900">إدارة التصنيفات الرئيسية والفرعية</h2>
            <p className="text-stone-500 text-xs">إضافة، تعديل وترتيب أطياف الخدمات والمحلات في إربد ديناميكياً</p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center justify-center gap-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-4 py-2.5 rounded-xl text-xs font-black transition-colors cursor-pointer shadow-xs"
        >
          <Plus className="h-4 w-4 text-[#ff9f1c]" />
          <span>إضافة تصنيف جديد</span>
        </button>
      </div>

      {/* Adding Modal / Form Card */}
      {isAdding && (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-5 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
            <h3 className="font-black text-sm text-stone-900">إضافة تصنيف فرعي/رئيسي جديد</h3>
            <button onClick={() => setIsAdding(false)} className="text-stone-400 hover:text-stone-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">اسم التصنيف</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: مطاعم ومأكولات"
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">رمز الأيقونة (Lucide Icon Name)</label>
              <input
                type="text"
                value={formData.iconName || ''}
                onChange={e => setFormData({ ...formData, iconName: e.target.value })}
                placeholder="Utensils, Coffee, ShoppingBag, Hospital..."
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-stone-700 mb-1">الوصف المختصر</label>
              <input
                type="text"
                value={formData.description || ''}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="مثال: أفضل شاورما ووجبات سريعة ومطاعم شعبية في إربد"
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800"
              />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <label className="block text-xs font-bold text-stone-700">الأقسام الفرعية (Subcategories)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSubcat}
                  onChange={e => setNewSubcat(e.target.value)}
                  placeholder="اكتب قسم فرعي (مثل: شاورما، برجر، بيتزا) واضغط إضافة"
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
                {formData.subcategories?.map((sub, idx) => (
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
              حفظ التصنيف
            </button>
          </div>
        </div>
      )}

      {/* Categories List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => (
          <div key={cat.id} className="border border-stone-200 rounded-2xl p-4 bg-white flex flex-col justify-between space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 rounded-xl text-amber-700 font-black text-sm">
                  {cat.iconName.slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
                    <span>{cat.name}</span>
                    {cat.active === false && (
                      <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">معطل</span>
                    )}
                  </h3>
                  {cat.description && <p className="text-xs text-stone-500">{cat.description}</p>}
                </div>
              </div>

              <div className="flex items-center gap-1">
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
                  title="حذف التصنيف"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {cat.subcategories && cat.subcategories.length > 0 && (
              <div className="bg-stone-50 rounded-xl p-2.5 border border-stone-100">
                <span className="text-[10px] font-black text-stone-400 block mb-1">الأقسام الفرعية:</span>
                <div className="flex flex-wrap gap-1">
                  {cat.subcategories.map((sub, sIdx) => (
                    <span key={sIdx} className="bg-white border border-stone-200 px-2 py-0.5 rounded-md text-[11px] font-bold text-stone-700">
                      {sub}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
