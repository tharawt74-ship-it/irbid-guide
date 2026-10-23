import React, { useState } from 'react';
import { AppCoreState, AppStockItem } from '../lib/types';
import { Plus, Package as PackageIcon, AlertTriangle, Edit2, Save, X, Utensils as UtensilsIcon, Box as BoxIcon, Trash2, Search, CheckSquare, Square, RotateCcw } from 'lucide-react';
import { formatCurrency, formatQuantity } from '../lib/format';

interface Props {
  state: AppCoreState;
  setState: React.Dispatch<React.SetStateAction<AppCoreState>>;
  hideNumbers: boolean;
  addLog: (action: string, details?: string) => void;
}

type TabType = 'all' | 'food' | 'pre-production' | 'non-food';

export default function AppInventory({ state, setState, hideNumbers, addLog }: Props) {
  // Inventory form state
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  
  const [formData, setFormData] = useState<Partial<AppStockItem>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error';
  } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'info';
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filteredInventory = state.inventory.filter(item => {
    const matchesCategory = activeTab === 'all' || item.category === activeTab;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredInventory.length && filteredInventory.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredInventory.map(i => i.id));
    }
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      show: true,
      title: 'حذف العناصر المحددة',
      message: `هل أنت متأكد من حذف ${selectedIds.length} عنصر؟ سيتم نقلهم للسلة.`,
      type: 'danger',
      onConfirm: () => {
        const itemsToTrash = state.inventory.filter(i => selectedIds.includes(i.id));
        setState(prev => ({
          ...prev,
          inventory: prev.inventory.filter(i => !selectedIds.includes(i.id)),
          trash: [
            ...prev.trash,
            ...itemsToTrash.map(i => ({
              id: `trash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'inventoryItem' as const,
              data: i,
              deletedAt: new Date().toISOString()
            }))
          ]
        }));
        addLog('حذف مواد مخزون بالجملة', `تم حذف ${selectedIds.length} مادة ونقلهم للسلة`);
        setSelectedIds([]);
        setConfirmModal(null);
      }
    });
  };

  const handleDelete = (id: string) => {
    const itemToTrash = state.inventory.find(i => i.id === id);
    setConfirmModal({
      show: true,
      title: 'حذف مادة',
      message: `هل أنت متأكد من حذف المادة: ${itemToTrash?.name || id}؟ سيتم نقلها لسلة المهملات.`,
      type: 'danger',
      onConfirm: () => {
        setState(prev => ({
          ...prev,
          inventory: prev.inventory.filter(i => i.id !== id),
          trash: itemToTrash ? [
            ...prev.trash,
            {
              id: `trash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              data: itemToTrash,
              type: 'inventoryItem',
              deletedAt: new Date().toISOString()
            }
          ] : prev.trash
        }));
        addLog('حذف مادة مخزون', `حذف المادة ${itemToTrash?.name || id} ونقلها للسلة`);
        setConfirmModal(null);
      }
    });
  };

  const handleSaveItem = () => {
    if (!formData.name) {
      showToast("الرجاء إدخال اسم المادة", 'error');
      return;
    }
    
    if (Number(formData.safetyStock) < 0) {
      showToast("الرجاء إدخال حد أمان صحيح", 'error');
      return;
    }

    if (isAddingItem) {
      const newItem: AppStockItem = {
        id: `i_${Date.now()}`,
        name: formData.name,
        quantity: formData.quantity !== undefined ? Number(formData.quantity) : 0,
        unit: (formData.unit || 'kg') as any,
        category: (formData.category || 'food') as 'food' | 'pre-production' | 'non-food',
        unitCost: formData.unitCost !== undefined ? Number(formData.unitCost) : 0,
        priceHistory: [],
        safetyStock: formData.safetyStock !== undefined ? Number(formData.safetyStock) : 0,
      };

      setState(prev => ({
        ...prev,
        inventory: [...prev.inventory, newItem]
      }));
      addLog('إضافة مادة مخزون', `تم إضافة ${newItem.name} بتكلفة ${newItem.unitCost}`);
      showToast("تمت الإضافة بنجاح");
    } else if (editingItemId) {
      const originalItem = state.inventory.find(i => i.id === editingItemId);
      setState(prev => ({
        ...prev,
        inventory: prev.inventory.map(item => 
          item.id === editingItemId 
            ? { 
                ...item, 
                name: formData.name || item.name,
                quantity: formData.quantity !== undefined ? Number(formData.quantity) : item.quantity,
                unit: (formData.unit as any) || item.unit,
                category: (formData.category as 'food' | 'pre-production' | 'non-food') || item.category,
                unitCost: formData.unitCost !== undefined ? Number(formData.unitCost) : item.unitCost,
                safetyStock: formData.safetyStock !== undefined ? Number(formData.safetyStock) : item.safetyStock,
              }
            : item
        )
      }));
      addLog('تعديل مادة مخزون', `تعديل بيانات ${originalItem?.name || editingItemId}`);
      showToast("تم الحفظ بنجاح");
    }

    setIsAddingItem(false);
    setEditingItemId(null);
    setFormData({});
  };

  const handleResetInventory = () => {
    setState(prev => ({
      ...prev,
      inventory: prev.inventory.map(item => ({ ...item, quantity: 0 }))
    }));
    addLog('تصفير المخزون', 'تم تصفير جميع الكميات في المستودع');
    setShowResetConfirm(false);
  };

  const handleEdit = (item: AppStockItem) => {
    setEditingItemId(item.id);
    setIsAddingItem(false);
    setFormData({ ...item });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] max-w-sm w-full animate-in slide-in-from-bottom-5 duration-300`}>
          <div className={`mx-4 p-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
            toast.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-rose-600 border-rose-500 text-white'
          }`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              toast.type === 'success' ? 'bg-white/20' : 'bg-white/20'
            }`}>
              {toast.type === 'success' ? <CheckSquare size={18} /> : <AlertTriangle size={18} />}
            </div>
            <p className="font-bold text-sm">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${confirmModal.type === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                <AlertTriangle size={32} />
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
          <h2 className="text-2xl font-black text-slate-800">إدارة المخزون</h2>
          <p className="text-slate-500 text-sm">إدارة المواد الخام الغذائية والمواد غير الغذائية.</p>
        </div>
        <div className="flex flex-wrap gap-2">
            {selectedIds.length > 0 && (
                <button 
                onClick={deleteSelected}
                className="flex items-center gap-2 bg-rose-50 text-rose-700 px-4 py-2 rounded-xl text-sm font-bold border border-rose-100 hover:bg-rose-100 transition-all font-sans"
                >
                <Trash2 size={16} />
                حذف المحدد ({selectedIds.length})
                </button>
            )}
            {!isAddingItem && !editingItemId && (
                <button 
                    onClick={() => setIsAddingItem(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all shadow-indigo-100"
                >
                    <Plus size={16} />
                    إضافة مادة
                </button>
            )}
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
              activeTab === 'all' 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <PackageIcon size={18} />
            الكل
          </button>
          <button
            onClick={() => setActiveTab('food')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
              activeTab === 'food' 
                ? 'bg-amber-500 text-white shadow-md shadow-amber-200' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <UtensilsIcon size={18} />
            مواد أولية
          </button>
          <button
            onClick={() => setActiveTab('pre-production')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
              activeTab === 'pre-production' 
                ? 'bg-blue-500 text-white shadow-md shadow-blue-200' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <PackageIcon size={18} />
            إنتاج مسبق
          </button>
          <button
            onClick={() => setActiveTab('non-food')}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
              activeTab === 'non-food' 
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <BoxIcon size={18} />
            غير غذائية
          </button>
        </div>
        <div className="flex flex-1 gap-2 w-full md:w-auto">
            <div className="relative flex-1">
                <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                    type="text"
                    placeholder="بحث في المخزون..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-2xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
                />
            </div>
            <button 
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-white px-4 py-3 rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all font-sans whitespace-nowrap"
            >
                {selectedIds.length === filteredInventory.length && filteredInventory.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                {selectedIds.length === filteredInventory.length && filteredInventory.length > 0 ? 'إلغاء التحديد' : 'تحديد الكل'}
            </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <PackageIcon size={20} className="text-indigo-600" />
            {activeTab === 'all' ? 'جميع المواد' : activeTab === 'food' ? 'المواد الأولية' : activeTab === 'pre-production' ? 'إنتاج مسبق' : 'المواد غير الغذائية'}
          </h3>
          {!isAddingItem && !editingItemId && (
            <div className="flex gap-2">
              {showResetConfirm ? (
                <div className="flex items-center gap-2 bg-rose-50 p-1 rounded-xl border border-rose-200">
                  <span className="text-xs font-bold text-rose-700 px-2 flex items-center gap-1">
                    <AlertTriangle size={14} /> تأكيد التصفير؟
                  </span>
                  <button 
                    onClick={handleResetInventory}
                    className="bg-rose-600 text-white px-3 py-1.5 rounded-lg text-xs font-black hover:bg-rose-700 transition-colors"
                  >
                    نعم، تصفير
                  </button>
                  <button 
                    onClick={() => setShowResetConfirm(false)}
                    className="bg-white text-slate-600 px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    تراجع
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowResetConfirm(true)}
                  className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-600 px-4 py-2 rounded-xl text-sm font-bold border border-rose-100 transition-all"
                >
                  <X size={16} />
                  تصفير المخزون
                </button>
              )}
              <button 
                onClick={() => { setIsAddingItem(true); setFormData({ unit: 'kg', category: activeTab !== 'all' ? activeTab : 'food' }); }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all"
              >
                <Plus size={16} />
                إضافة مادة
              </button>
            </div>
          )}
        </div>

        {(isAddingItem || editingItemId) && (
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-6 font-sans">
            <h4 className="text-sm font-bold text-slate-800 mb-4">{isAddingItem ? 'إضافة مادة جديدة' : 'تعديل المادة'}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="col-span-1 lg:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">اسم المادة</label>
                <input 
                  type="text" 
                  value={formData.name || ''} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="مثال: الطحين" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">التصنيف</label>
                <select 
                  value={formData.category || 'food'} 
                  onChange={e => setFormData({...formData, category: e.target.value as any})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="food">مواد أولية</option>
                  <option value="pre-production">إنتاج مسبق</option>
                  <option value="non-food">مواد غير غذائية</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">الوحدة</label>
                <select 
                  value={formData.unit || 'kg'} 
                  onChange={e => setFormData({...formData, unit: e.target.value as any})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="kg">كغم</option>
                  <option value="gram">غرام</option>
                  <option value="box">بوكس</option>
                  <option value="piece">قطعة</option>
                  <option value="ml">مل</option>
                  <option value="liter">لتر</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">التكلفة / ({formData.unit === 'kg' ? 'كغم' : formData.unit === 'gram' ? 'غرام' : formData.unit === 'box' ? 'بوكس' : formData.unit === 'piece' ? 'قطعة' : formData.unit === 'ml' ? 'مل' : formData.unit === 'liter' ? 'لتر' : formData.unit || 'كغم'})</label>
                <input 
                  type="text" 
                  value={formData.unitCost !== undefined ? formData.unitCost : ''} 
                  onChange={e => setFormData({...formData, unitCost: e.target.value as any})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="0.00" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">الكمية الحالية</label>
                <input 
                  type="text" 
                  value={formData.quantity !== undefined ? formData.quantity : ''} 
                  onChange={e => setFormData({...formData, quantity: e.target.value as any})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="0" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">حد الأمان</label>
                <input 
                  type="text" 
                  value={formData.safetyStock !== undefined ? formData.safetyStock : ''} 
                  onChange={e => setFormData({...formData, safetyStock: e.target.value as any})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="20" 
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 border-t border-slate-200 pt-4">
              <button 
                onClick={() => { setIsAddingItem(false); setEditingItemId(null); setFormData({}); }}
                className="px-6 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
               >
                إلغاء
              </button>
              <button 
                onClick={handleSaveItem}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md shadow-indigo-200 transition-colors"
               >
                <Save size={16} />
                حفظ
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500">
                <th className="pb-4 px-4 w-12 text-center">
                   <button 
                        onClick={toggleSelectAll}
                        className={`p-1 rounded-md transition-colors ${selectedIds.length === filteredInventory.length && filteredInventory.length > 0 ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                   >
                       {selectedIds.length === filteredInventory.length && filteredInventory.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                   </button>
                </th>
                <th className="pb-4 px-4 font-bold">اسم المادة</th>
                <th className="pb-4 px-4 font-bold">التصنيف</th>
                <th className="pb-4 px-4 font-bold">الكمية</th>
                <th className="pb-4 px-4 font-bold">التكلفة للوحدة</th>
                <th className="pb-4 px-4 font-bold">القيمة الإجمالية</th>
                <th className="pb-4 px-4 font-bold">حالة المخزون</th>
                <th className="pb-4 px-4 font-bold text-left">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredInventory.map(item => {
                const isLow = item.quantity <= item.safetyStock;
                const isSelected = selectedIds.includes(item.id);
                return (
                  <tr key={item.id} className={`hover:bg-slate-50 transition-colors group ${isSelected ? 'bg-indigo-50/50' : ''}`}>
                    <td className="py-4 px-4 text-center">
                        <button 
                            onClick={() => toggleSelect(item.id)}
                            className={`p-1 rounded-md transition-colors ${isSelected ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-400 opacity-60 group-hover:opacity-100'}`}
                        >
                            {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-700">{item.name}</td>
                    <td className="py-4 px-4 text-slate-600">
                      {item.category === 'food' ? (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs font-bold">مواد أولية</span>
                      ) : item.category === 'pre-production' ? (
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">إنتاج مسبق</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold">مواد غير غذائية</span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-indigo-600">
                      {formatQuantity(item.quantity, hideNumbers)} <span className="text-xs text-slate-400 font-sans">{item.unit === 'kg' ? 'كغم' : item.unit === 'gram' ? 'غرام' : item.unit === 'box' ? 'بوكس' : item.unit === 'piece' ? 'قطعة' : item.unit === 'ml' ? 'مل' : item.unit === 'liter' ? 'لتر' : item.unit}</span>
                    </td>
                    <td className="py-4 px-4 font-mono text-slate-600">
                      {formatCurrency(item.unitCost, hideNumbers)} / {item.unit}
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-slate-800">
                      {formatCurrency(item.quantity * item.unitCost, hideNumbers)}
                    </td>
                    <td className="py-4 px-4">
                      {isLow ? (
                        <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-xs font-bold">
                          <AlertTriangle size={12} /> منخفض
                        </span>
                      ) : (
                         <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                          جيد
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-left">
                       <div className="flex items-center justify-start gap-1">
                          <button 
                            onClick={() => handleEdit(item)}
                            className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 p-2 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(item.id)}
                            className="text-slate-300 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                       </div>
                    </td>
                  </tr>
                )
              })}
              {filteredInventory.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    لا يوجد مواد في هذا التصنيف. أضف مادة جديدة للبدء.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}