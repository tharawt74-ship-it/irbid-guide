import React, { useState } from 'react';
import { AppCoreState, AppDoughFormula } from '../lib/types';
import { BookOpen, Plus, Edit2, Trash2, Save, X, Search, CheckSquare, Square } from 'lucide-react';
import { formatCurrency, formatQuantity } from '../lib/format';

interface Props {
  state: AppCoreState;
  setState: React.Dispatch<React.SetStateAction<AppCoreState>>;
  hideNumbers: boolean;
  addLog: (action: string, details?: string) => void;
}

export default function AppDoughs({ state, setState, hideNumbers, addLog }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<AppDoughFormula>>({
    ingredients: []
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'info';
  } | null>(null);

  const filteredRecipes = state.doughRecipes.filter(r => 
    r.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredRecipes.length && filteredRecipes.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredRecipes.map(r => r.id));
    }
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      show: true,
      title: 'حذف الوصفات المختارة',
      message: `هل أنت متأكد من حذف ${selectedIds.length} وصفة؟ سيتم نقلهم لسلة المهملات.`,
      type: 'danger',
      onConfirm: () => {
        const itemsToTrash = state.doughRecipes.filter(r => selectedIds.includes(r.id));
        setState(prev => ({
          ...prev,
          doughRecipes: prev.doughRecipes.filter(r => !selectedIds.includes(r.id)),
          trash: [
            ...prev.trash,
            ...itemsToTrash.map(r => ({
              id: `trash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'doughRecipe' as const,
              data: r,
              deletedAt: new Date().toISOString()
            }))
          ]
        }));
        addLog('حذف وصفات عجين بالجملة', `تم حذف ${selectedIds.length} وصفة ونقلهم للسلة`);
        setSelectedIds([]);
        setConfirmModal(null);
      }
    });
  };

  const handleSave = () => {
    if (!formData.name || !formData.yieldWeightGram) return;
    
    const cleanedIngredients = (formData.ingredients || []).filter(ing => ing.inventoryId.trim() !== '');

    if (isAdding) {
      const newItem: AppDoughFormula = {
        id: `dr_${Date.now()}`,
        name: formData.name,
        yieldWeightGram: Number(formData.yieldWeightGram) || 0,
        ingredients: cleanedIngredients
      };

      setState(prev => ({
        ...prev,
        doughRecipes: [...prev.doughRecipes, newItem]
      }));
      addLog('إضافة وصفة عجين', `تم إضافة وصفة ${newItem.name}`);
    } else if (editingId) {
      setState(prev => ({
        ...prev,
        doughRecipes: prev.doughRecipes.map(item => 
          item.id === editingId 
            ? { 
                ...item, 
                name: formData.name || item.name,
                yieldWeightGram: Number(formData.yieldWeightGram) ?? item.yieldWeightGram,
                ingredients: cleanedIngredients
              }
            : item
        )
      }));
      addLog('تعديل وصفة عجين', `تعديل وصفة ${formData.name || editingId}`);
    }

    setIsAdding(false);
    setEditingId(null);
    setFormData({ ingredients: [] });
  };

  const handleEdit = (item: AppDoughFormula) => {
    setEditingId(item.id);
    setIsAdding(false);
    setFormData(JSON.parse(JSON.stringify(item))); // Deep copy
  };

  const handleDelete = (id: string) => {
    const doughToTrash = state.doughRecipes.find(dr => dr.id === id);
    setConfirmModal({
      show: true,
      title: 'حذف الوصفة',
      message: `هل أنت متأكد من حذف الوصفة: ${doughToTrash?.name || id}؟ سيتم نقلها لسلة المهملات.`,
      type: 'danger',
      onConfirm: () => {
        setState(prev => ({
          ...prev,
          doughRecipes: prev.doughRecipes.filter(dr => dr.id !== id),
          trash: doughToTrash ? [
            ...prev.trash,
            {
              id: `trash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              data: doughToTrash,
              type: 'doughRecipe',
              deletedAt: new Date().toISOString()
            }
          ] : prev.trash
        }));
        addLog('حذف وصفة عجين', `حذف الوصفة ${doughToTrash?.name || id} ونقلها للسلة`);
        setConfirmModal(null);
      }
    });
  };

  const addIngredient = () => {
    setFormData(prev => ({
      ...prev,
      ingredients: [...(prev.ingredients || []), { inventoryId: '', quantity: 0 }]
    }));
  };

  const removeIngredient = (index: number) => {
    setFormData(prev => {
      const newIng = [...(prev.ingredients || [])];
      newIng.splice(index, 1);
      return { ...prev, ingredients: newIng };
    });
  };

  const updateIngredient = (index: number, field: 'inventoryId' | 'quantity', value: string | number) => {
    setFormData(prev => {
      const newIng = [...(prev.ingredients || [])];
      newIng[index] = { ...newIng[index], [field]: value };
      return { ...prev, ingredients: newIng };
    });
  };

  const calculateDoughCost = (dough: AppDoughFormula) => {
    let totalCost = 0;
    dough.ingredients.forEach(ing => {
      const invItem = state.inventory.find(i => i.id === ing.inventoryId);
      if (invItem) {
        totalCost += ing.quantity * invItem.unitCost;
      }
    });
    return totalCost;
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${confirmModal.type === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                <BookOpen size={32} />
              </div>
              <h3 className="text-lg font-black text-slate-800 mb-2">{confirmModal.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex border-t border-slate-100">
              <button 
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors border-l border-slate-100"
              >
                إلغاء
              </button>
              <button 
                onClick={confirmModal.onConfirm}
                className={`flex-1 py-4 text-sm font-bold transition-colors ${confirmModal.type === 'danger' ? 'text-rose-600 hover:bg-rose-50' : 'text-indigo-600 hover:bg-indigo-50'}`}
              >
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800">العجائن والحبات الجاهزة</h2>
          <p className="text-slate-500 text-sm">تكوين العجائن الأساسية ودليل تشكيل الحبات الجاهزة.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedIds.length > 0 && (
            <button 
              onClick={deleteSelected}
              className="flex items-center gap-2 bg-rose-50 text-rose-700 px-4 py-2 rounded-xl text-sm font-bold border border-rose-100 hover:bg-rose-100 transition-all"
            >
              <Trash2 size={16} />
              حذف المحدد ({selectedIds.length})
            </button>
          )}
          {!isAdding && !editingId && (
            <button 
              onClick={() => { setIsAdding(true); setFormData({ ingredients: [] }); }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all"
            >
              <Plus size={16} />
              إضافة عجينة
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="بحث عن عجينة..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
          />
        </div>
        <button 
          onClick={toggleSelectAll}
          className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-200 transition-all w-full md:w-auto justify-center"
        >
          {selectedIds.length === filteredRecipes.length && filteredRecipes.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
          {selectedIds.length === filteredRecipes.length && filteredRecipes.length > 0 ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-amber-50 p-6 rounded-3xl border border-amber-100 shadow-sm">
         <div>
            <h3 className="text-amber-800 font-black mb-3">حبات كوكيز مجمدة (32 جرام)</h3>
            <p className="text-amber-900 text-sm">
               تتكون الحبة الواحدة من: <strong>26 جرام عجينة</strong> بالإضافة إلى <strong>6 جرام من الحشوة</strong>.
            </p>
         </div>
         <div>
            <h3 className="text-amber-800 font-black mb-3">حبات كوكيز مجمدة (24 جرام)</h3>
            <p className="text-amber-900 text-sm">
               تتكون الحبة الواحدة من: <strong>20 جرام عجينة</strong> بالإضافة إلى <strong>4 جرام من الحشوة</strong>.
            </p>
         </div>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 border-t-4 border-t-indigo-600">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {isAdding ? 'إضافة عجينة جديدة' : 'تعديل العجينة'}
            </h3>
            <button onClick={() => { setIsAdding(false); setEditingId(null); setFormData({ ingredients: [] }); }} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">اسم العجينة</label>
              <input 
                type="text" 
                value={formData.name || ''} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                placeholder="مثال: عجينة الفانيلا" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">الوزن الصافي (بعد الخبز/العجن - غرام)</label>
              <input 
                type="number" 
                step="any"
                value={formData.yieldWeightGram || ''} 
                onChange={e => setFormData({...formData, yieldWeightGram: Number(e.target.value)})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                placeholder="مثال: 470" 
              />
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-bold text-slate-700">المكونات</label>
              <button onClick={addIngredient} className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100">
                <Plus size={14} /> إضافة مكون
              </button>
            </div>
            
            {formData.ingredients?.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                لم يتم إضافة مكونات بعد.
              </div>
            ) : (
              <div className="space-y-3">
                {formData.ingredients?.map((ing, i) => (
                  <div key={i} className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex-1">
                      <select 
                        value={ing.inventoryId}
                        onChange={e => updateIngredient(i, 'inventoryId', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">-- اختر المادة --</option>
                        {state.inventory.filter(inv => inv.category === 'food' || inv.category === 'pre-production' || inv.unit === 'kg' || inv.unit === 'gram').map(inv => (
                          <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-32">
                      <input 
                        type="number"
                        step="any"
                        placeholder="الكمية"
                        value={ing.quantity || ''}
                        onChange={e => updateIngredient(i, 'quantity', Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <button onClick={() => removeIngredient(i)} className="text-rose-400 hover:text-rose-600 p-2">
                       <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              onClick={() => { setIsAdding(false); setEditingId(null); setFormData({ ingredients: [] }); }}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              إلغاء
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-indigo-200 transition-colors"
            >
              <Save size={16} />
              حفظ العجينة
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredRecipes.map(dough => (
          <div key={dough.id} className={`bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col group hover:shadow-md transition-shadow relative overflow-hidden ${selectedIds.includes(dough.id) ? 'ring-2 ring-indigo-500 bg-indigo-50/10' : ''}`}>
             
             <div className="absolute top-4 right-4 z-10">
               <button 
                onClick={() => toggleSelect(dough.id)}
                className={`p-1 rounded-lg transition-colors ${selectedIds.includes(dough.id) ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-400 group-hover:text-slate-400 opacity-60 group-hover:opacity-100'}`}
               >
                 {selectedIds.includes(dough.id) ? <CheckSquare size={20} /> : <Square size={20} />}
               </button>
             </div>

             <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <button onClick={() => handleEdit(dough)} className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-500 hover:text-indigo-600">
                 <Edit2 size={16} />
               </button>
               <button onClick={() => handleDelete(dough.id)} className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-500 hover:text-rose-600">
                 <Trash2 size={16} />
               </button>
             </div>

             <div className="flex items-center gap-3 mb-4">
              <div className="bg-indigo-100 text-indigo-600 p-3 rounded-2xl">
                <BookOpen size={24} />
              </div>
              <div className="pr-2">
                <h3 className="font-bold text-lg text-slate-900">{dough.name}</h3>
                <div className="flex flex-col gap-1 mt-1">
                  <p className="text-sm text-slate-500 flex items-center gap-2">
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">الوزن الصافي: {formatQuantity(dough.yieldWeightGram, hideNumbers)} غرام</span>
                  </p>
                  <div className="flex gap-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">إجمالي التكلفة</span>
                      <span className="text-xs font-bold text-rose-500">{formatCurrency(calculateDoughCost(dough), hideNumbers)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">تكلفة الغرام</span>
                      <span className="text-xs font-bold text-slate-700">{formatCurrency(calculateDoughCost(dough) / (dough.yieldWeightGram || 1), hideNumbers)}</span>
                    </div>
                  </div>
                </div>
              </div>
             </div>

             <div className="mt-4 border-t border-slate-100 pt-4 flex-1">
               <h4 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">المكونات (للعجنة الواحدة):</h4>
               <ul className="space-y-2 text-sm text-slate-600">
                 {dough.ingredients.map(ing => {
                   const item = state.inventory.find(i => i.id === ing.inventoryId);
                   return (
                     <li key={ing.inventoryId} className="flex justify-between items-center">
                       <span className="flex items-center gap-2">
                         <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                         {item?.name || 'مادة غير معروفة'}
                       </span>
                       <span className="font-mono bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-xs text-slate-600 font-medium">
                         {formatQuantity(ing.quantity, hideNumbers)} {item?.unit}
                       </span>
                     </li>
                   )
                 })}
               </ul>
             </div>
          </div>
        ))}
        {state.doughRecipes.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-slate-100 text-slate-500">
            لا توجد وصفات عجين مضافة حتى الآن.
          </div>
        )}
      </div>
    </div>
  );
}
