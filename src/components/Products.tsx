import React, { useState } from 'react';
import { AppCoreState, AppCatalogItem as FinalProduct } from '../lib/types';
import { Cookie as CookieIcon, Plus, Edit2, Trash2, Save, X, Search, CheckSquare, Square } from 'lucide-react';
import { formatCurrency, formatQuantity } from '../lib/format';
import { upsertData } from '../lib/supabase';

interface Props {
  state: AppCoreState;
  setState: React.Dispatch<React.SetStateAction<AppCoreState>>;
  hideNumbers: boolean;
  addLog: (action: string, details?: string) => void;
}

export default function AppProducts({ state, setState, hideNumbers, addLog }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<FinalProduct>>({
    doughComponents: [],
    addons: [],
    piecesComponents: []
  });
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

  const filteredProducts = state.products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length && filteredProducts.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map(p => p.id));
    }
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      show: true,
      title: 'حذف المنتجات المختارة',
      message: `هل أنت متأكد من حذف ${selectedIds.length} منتج؟ سيتم نقلهم لسلة المهملات.`,
      type: 'danger',
      onConfirm: () => {
        const itemsToTrash = state.products.filter(p => selectedIds.includes(p.id));
        setState(prev => ({
          ...prev,
          products: prev.products.filter(p => !selectedIds.includes(p.id)),
          trash: [
            ...prev.trash,
            ...itemsToTrash.map(p => ({
              id: `trash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'product' as const,
              data: p,
              deletedAt: new Date().toISOString()
            }))
          ]
        }));
        addLog('حذف منتجات بالجملة', `تم حذف ${selectedIds.length} منتج ونقلهم للسلة`);
        setSelectedIds([]);
        setConfirmModal(null);
      }
    });
  };

  const handleSave = async () => {
    if (!formData.name || formData.sellingPriceJOD === undefined) {
      showToast("الرجاء إدخال اسم المنتج وسعر البيع", 'error');
      return;
    }
    
    const cleanedDough = (formData.doughComponents || []).filter(d => d.doughId.trim() !== '');
    const cleanedAddons = (formData.addons || []).filter(a => a.inventoryId.trim() !== '');
    const cleanedPieces = (formData.piecesComponents || []).filter(a => a.inventoryId.trim() !== '');

    if (isAdding) {
      const newItem: FinalProduct = {
        id: crypto.randomUUID(),
        name: formData.name,
        sellingPriceJOD: Number(formData.sellingPriceJOD) || 0,
        piecesCount: formData.piecesCount ? Number(formData.piecesCount) : undefined,
        doughWeightPerPiece: formData.doughWeightPerPiece ? Number(formData.doughWeightPerPiece) : undefined,
        fillingWeightPerPiece: formData.fillingWeightPerPiece ? Number(formData.fillingWeightPerPiece) : undefined,
        doughComponents: cleanedDough,
        addons: cleanedAddons,
        piecesComponents: cleanedPieces
      };

      try {
        setState(prev => ({
          ...prev,
          products: [...prev.products, newItem]
        }));
        await upsertData('products', newItem);
        addLog('إضافة منتج نهائي', `إضافة منتج ${newItem.name}`);
        showToast("تمت الإضافة بنجاح");
      } catch (err) {
        showToast("حدث خطأ أثناء الاتصال بقاعدة البيانات", 'error');
        console.error(err);
      }
    } else if (editingId) {
      const updatedProduct = state.products.map(item => 
        item.id === editingId 
          ? { 
              ...item, 
              name: formData.name || item.name,
              sellingPriceJOD: Number(formData.sellingPriceJOD) ?? item.sellingPriceJOD,
              piecesCount: formData.piecesCount !== undefined ? Number(formData.piecesCount) : item.piecesCount,
              doughWeightPerPiece: formData.doughWeightPerPiece !== undefined ? Number(formData.doughWeightPerPiece) : item.doughWeightPerPiece,
              fillingWeightPerPiece: formData.fillingWeightPerPiece !== undefined ? Number(formData.fillingWeightPerPiece) : item.fillingWeightPerPiece,
              doughComponents: cleanedDough,
              addons: cleanedAddons,
              piecesComponents: cleanedPieces
            }
          : item
      ).find(item => item.id === editingId);

      try {
        setState(prev => ({
          ...prev,
          products: prev.products.map(item => 
            item.id === editingId ? updatedProduct! : item
          )
        }));
        await upsertData('products', updatedProduct);
        addLog('تعديل منتج نهائي', `تعديل منتج ${formData.name || editingId}`);
        showToast("تم الحفظ بنجاح");
      } catch (err) {
        showToast("حدث خطأ أثناء التحديث في قاعدة البيانات", 'error');
        console.error(err);
      }
    }

    setIsAdding(false);
    setEditingId(null);
    setFormData({ doughComponents: [], addons: [], piecesComponents: [] });
  };

  const handleEdit = (item: FinalProduct) => {
    setEditingId(item.id);
    setIsAdding(false);
    setFormData(JSON.parse(JSON.stringify(item))); // Deep copy
  };

  const handleDelete = (id: string) => {
    const product = state.products.find(p => p.id === id);
    if (!product) return;

    setConfirmModal({
      show: true,
      title: 'حذف المنتج',
      message: `هل أنت متأكد من حذف المنتج: ${product.name}؟ سيتم نقله لسلة المهملات.`,
      type: 'danger',
      onConfirm: () => {
        setState(prev => ({
          ...prev,
          products: prev.products.filter(p => p.id !== id),
          trash: [
            ...prev.trash,
            {
              id: `trash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'product' as const,
              data: product,
              deletedAt: new Date().toISOString()
            }
          ]
        }));
        addLog('حذف منتج نهائي', `حذف المنتج ${product.name} ونقله للسلة`);
        setConfirmModal(null);
      }
    });
  };

  const addDough = () => {
    setFormData(prev => ({
      ...prev,
      doughComponents: [...(prev.doughComponents || []), { doughId: '', quantityGram: 0 }]
    }));
  };

  const removeDough = (index: number) => {
    setFormData(prev => {
      const newDough = [...(prev.doughComponents || [])];
      newDough.splice(index, 1);
      return { ...prev, doughComponents: newDough };
    });
  };

  const updateDough = (index: number, field: 'doughId' | 'quantityGram', value: string | number) => {
    setFormData(prev => {
      const newDough = [...(prev.doughComponents || [])];
      newDough[index] = { ...newDough[index], [field]: value };
      return { ...prev, doughComponents: newDough };
    });
  };

  const addAddon = () => {
    setFormData(prev => ({
      ...prev,
      addons: [...(prev.addons || []), { inventoryId: '', quantity: 0 }]
    }));
  };

  const removeAddon = (index: number) => {
    setFormData(prev => {
      const newAddon = [...(prev.addons || [])];
      newAddon.splice(index, 1);
      return { ...prev, addons: newAddon };
    });
  };

  const updateAddon = (index: number, field: 'inventoryId' | 'quantity' | 'displayUnit', value: string | number) => {
    setFormData(prev => {
      const newAddon = [...(prev.addons || [])];
      newAddon[index] = { ...newAddon[index], [field]: value };
      return { ...prev, addons: newAddon };
    });
  };

  const calculateProductCost = (product: FinalProduct | Partial<FinalProduct>) => {
    if (!product) return 0;
    
    let totalCost = 0;
    
    // Addons cost
    product.addons?.forEach(addon => {
      const invItem = state.inventory.find(i => i.id === addon.inventoryId);
      if (invItem) totalCost += addon.quantity * invItem.unitCost;
    });

    // Dough components cost
    product.doughComponents?.forEach(dc => {
      const dough = state.doughRecipes.find(dr => dr.id === dc.doughId);
      if (dough) {
        const proportion = dc.quantityGram / dough.yieldWeightGram;
        dough.ingredients.forEach(ing => {
          const invItem = state.inventory.find(i => i.id === ing.inventoryId);
          if (invItem) totalCost += ing.quantity * proportion * invItem.unitCost;
        });
      }
    });

    // Pieces components cost
    product.piecesComponents?.forEach(piece => {
      const dough = state.doughRecipes.find(dr => dr.id === piece.doughId);
      if (dough) {
        const proportion = (piece.quantity * piece.weightPerPieceGram) / dough.yieldWeightGram;
        dough.ingredients.forEach(ing => {
          const invItem = state.inventory.find(i => i.id === ing.inventoryId);
          if (invItem) totalCost += ing.quantity * proportion * invItem.unitCost;
        });
      }
    });

    return totalCost;
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
              <CheckSquare size={18} />
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
                <CookieIcon size={32} />
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
          <h2 className="text-2xl font-black text-slate-800">المنتجات النهائية</h2>
          <p className="text-slate-500 text-sm">قائمة المنتجات الجاهزة للبيع ومكوناتها.</p>
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
              onClick={() => { setIsAdding(true); setFormData({ doughComponents: [], addons: [] }); }}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all"
            >
              <Plus size={16} />
              إضافة منتج
            </button>
          )}
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text"
            placeholder="بحث عن منتج..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
          />
        </div>
        <button 
          onClick={toggleSelectAll}
          className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-200 transition-all w-full md:w-auto justify-center"
        >
          {selectedIds.length === filteredProducts.length && filteredProducts.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
          {selectedIds.length === filteredProducts.length && filteredProducts.length > 0 ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
        </button>
      </div>

      {(isAdding || editingId) && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 border-t-4 border-t-amber-500">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              {isAdding ? 'إضافة منتج جديد' : 'تعديل المنتج'}
            </h3>
            <button onClick={() => { setIsAdding(false); setEditingId(null); setFormData({ doughComponents: [], addons: [] }); }} className="text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">اسم المنتج</label>
              <input 
                type="text" 
                value={formData.name || ''} 
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" 
                placeholder="مثال: كوكيز دبل شوكليت" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">سعر البيع (دينار)</label>
              <input 
                type="number" 
                step="any"
                value={formData.sellingPriceJOD || ''} 
                onChange={e => setFormData({...formData, sellingPriceJOD: Number(e.target.value)})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" 
                placeholder="0.00" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 pt-4 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-indigo-500 mb-1">الحبات بالبوكس</label>
              <input 
                type="number" 
                step="any"
                value={formData.piecesCount || ''} 
                onChange={e => setFormData({...formData, piecesCount: Number(e.target.value)})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                placeholder="كم حبة؟ (مثال: 15)" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-indigo-500 mb-1">وزن العجين للحبة (غرام)</label>
              <input 
                type="number" 
                step="any"
                value={formData.doughWeightPerPiece || ''} 
                onChange={e => setFormData({...formData, doughWeightPerPiece: Number(e.target.value)})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                placeholder="مثال: 26" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-indigo-500 mb-1">وزن الحشوة للحبة (غرام)</label>
              <input 
                type="number" 
                step="any"
                value={formData.fillingWeightPerPiece || ''} 
                onChange={e => setFormData({...formData, fillingWeightPerPiece: Number(e.target.value)})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                placeholder="مثال: 6" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-6">
            {/* العجائن وحبات مجمدة */}
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-bold text-slate-700">احتياج العجينة (غرام)</label>
                  <button onClick={addDough} className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100">
                    <Plus size={14} /> إضافة عجينة
                  </button>
                </div>
                
                {formData.doughComponents?.length === 0 ? (
                  <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                    لا يوجد عجائن مضافة.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.doughComponents?.map((d, i) => (
                      <div key={i} className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="flex-1">
                          <select 
                            value={d.doughId}
                            onChange={e => updateDough(i, 'doughId', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          >
                            <option value="">-- اختر العجينة --</option>
                            {state.doughRecipes.map(dr => (
                              <option key={dr.id} value={dr.id}>{dr.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24">
                          <input 
                            type="number"
                            step="any"
                            placeholder="الكمية"
                            value={d.quantityGram || ''}
                            onChange={e => updateDough(i, 'quantityGram', Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                        <button onClick={() => removeDough(i)} className="text-rose-400 hover:text-rose-600 p-2">
                           <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="block text-sm font-bold text-slate-700">حبات مجمدة (بديلة)</label>
                  <button 
                    onClick={() => setFormData(prev => ({ ...prev, piecesComponents: [...(prev.piecesComponents || []), { inventoryId: '', quantity: 0, weightPerPieceGram: 0, doughId: 'dr_1' }] }))} 
                    className="flex items-center gap-1 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100"
                  >
                    <Plus size={14} /> إضافة حبات
                  </button>
                </div>
                
                {(formData.piecesComponents || []).length === 0 ? (
                  <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                    لا يوجد حبات مجمدة مضافة.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.piecesComponents?.map((p, i) => (
                      <div key={i} className="flex flex-col gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="flex gap-2">
                          <select 
                            value={p.inventoryId}
                            onChange={e => {
                              const newArr = [...(formData.piecesComponents || [])];
                              newArr[i] = { ...newArr[i], inventoryId: e.target.value, weightPerPieceGram: e.target.value.includes('30') ? 26 : 20 };
                              setFormData({ ...formData, piecesComponents: newArr });
                            }}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">-- اختر الحبة --</option>
                            {state.inventory.filter(inv => inv.id.startsWith('i_frozen')).map(inv => (
                              <option key={inv.id} value={inv.id}>{inv.name}</option>
                            ))}
                          </select>
                          <input 
                            type="number"
                            placeholder="عدد"
                            value={p.quantity || ''}
                            onChange={e => {
                               const newArr = [...(formData.piecesComponents || [])];
                               newArr[i] = { ...newArr[i], quantity: Number(e.target.value) };
                               setFormData({ ...formData, piecesComponents: newArr });
                            }}
                            className="w-20 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <button 
                            onClick={() => {
                               const newArr = [...(formData.piecesComponents || [])];
                               newArr.splice(i, 1);
                               setFormData({ ...formData, piecesComponents: newArr });
                            }} 
                            className="text-rose-400 hover:text-rose-600 p-2"
                          >
                             <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* الإضافات */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-bold text-slate-700">الإضافات / التغليف (دائم)</label>
                <button onClick={addAddon} className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100">
                  <Plus size={14} /> إضافة مادة
                </button>
              </div>
              
              {formData.addons?.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                  لا يوجد إضافات.
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.addons?.map((addon, i) => {
                    const invItem = state.inventory.find(inv => inv.id === addon.inventoryId);
                    const isKgItem = invItem?.unit === 'kg';
                    const displayVal = isKgItem && addon.displayUnit === 'gram' ? (addon.quantity || 0) * 1000 : (addon.quantity !== undefined ? addon.quantity : '');

                    return (
                    <div key={i} className="flex gap-3 items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="flex-1">
                        <select 
                          value={addon.inventoryId}
                          onChange={e => updateAddon(i, 'inventoryId', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                        >
                          <option value="">-- اختر المادة --</option>
                          {state.inventory.map(inv => (
                            <option key={inv.id} value={inv.id}>{inv.name} ({inv.unit})</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex w-40 bg-white border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-amber-500">
                        <input 
                          type="number"
                          step="any"
                          placeholder="الكمية"
                          value={displayVal}
                          onChange={e => {
                              const rawVal = e.target.value;
                              if (rawVal === '') {
                                updateAddon(i, 'quantity', 0);
                                return;
                              }
                              let v = parseFloat(rawVal);
                              if (isNaN(v)) return;
                              if (isKgItem && addon.displayUnit === 'gram') v = v / 1000;
                              updateAddon(i, 'quantity', v);
                          }}
                          className="w-full px-3 py-2 text-sm focus:outline-none bg-transparent"
                        />
                        {isKgItem && (
                          <div className="border-r border-slate-200 bg-slate-50 flex items-center shrink-0">
                            <select
                              value={addon.displayUnit || 'kg'}
                              onChange={e => updateAddon(i, 'displayUnit', e.target.value)}
                              className="h-full pl-2 pr-6 py-2 text-xs text-slate-500 bg-transparent focus:outline-none font-bold"
                            >
                              <option value="kg">kg</option>
                              <option value="gram">g</option>
                            </select>
                          </div>
                        )}
                        {!isKgItem && (
                          <div className="flex items-center px-3 bg-slate-50 border-r border-slate-200 text-xs text-slate-400 font-bold shrink-0">
                            {invItem?.unit || '-'}
                          </div>
                        )}
                      </div>
                      <button onClick={() => removeAddon(i)} className="text-rose-400 hover:text-rose-600 p-2 shrink-0">
                         <Trash2 size={18} />
                      </button>
                    </div>
                  )})}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              onClick={() => { setIsAdding(false); setEditingId(null); setFormData({ doughComponents: [], addons: [] }); }}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              إلغاء
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-amber-200 transition-colors"
            >
              <Save size={16} />
              حفظ المنتج
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredProducts.map(prod => (
          <div key={prod.id} className={`bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col group hover:shadow-md transition-shadow relative overflow-hidden ${selectedIds.includes(prod.id) ? 'ring-2 ring-indigo-500 bg-indigo-50/10' : ''}`}>
             
             <div className="absolute top-4 right-4 z-10">
               <button 
                onClick={() => toggleSelect(prod.id)}
                className={`p-1 rounded-lg transition-colors ${selectedIds.includes(prod.id) ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-400 group-hover:text-slate-400 opacity-60 group-hover:opacity-100'}`}
               >
                 {selectedIds.includes(prod.id) ? <CheckSquare size={20} /> : <Square size={20} />}
               </button>
             </div>

             <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <button onClick={() => handleEdit(prod)} className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-500 hover:text-amber-600">
                 <Edit2 size={16} />
               </button>
               <button onClick={() => handleDelete(prod.id)} className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-500 hover:text-rose-600">
                 <Trash2 size={16} />
               </button>
             </div>

             <div className="flex items-center gap-3 mb-4">
              <div className="bg-amber-100 text-amber-600 p-3 rounded-2xl">
                <CookieIcon size={24} />
              </div>
              <div className="flex-1 pr-2">
                <h3 className="font-bold text-lg text-slate-900">{prod.name}</h3>
                <div className="flex flex-col mt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">سعر البيع المقترح</span>
                    <span className="text-sm font-black text-emerald-600">{formatCurrency(prod.sellingPriceJOD, hideNumbers)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">التكلفة (مكونات)</span>
                    <span className="text-xs font-bold text-rose-500">{formatCurrency(calculateProductCost(prod), hideNumbers)}</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-100 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">هامش الربح</span>
                    <span className="text-xs font-black text-slate-800">
                      {formatCurrency(prod.sellingPriceJOD - calculateProductCost(prod), hideNumbers)}
                      <span className="text-[10px] font-bold text-slate-400 mr-1 font-mono">
                        ({Math.round(((prod.sellingPriceJOD - calculateProductCost(prod)) / (prod.sellingPriceJOD || 1)) * 100)}%)
                      </span>
                    </span>
                  </div>
                </div>
              </div>
             </div>

             <div className="mt-4 border-t border-slate-100 pt-4 flex-1">
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <h4 className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded inline-block">حبات مجمدة (بديلة):</h4>
                   <ul className="space-y-1.5">
                     {(prod.piecesComponents || []).map((pc, idx) => (
                       <li key={idx} className="text-xs font-bold text-slate-600 flex justify-between">
                         <span className="truncate">{state.inventory.find(i => i.id === pc.inventoryId)?.name || 'حبات'}</span>
                         <span className="text-indigo-600 shrink-0 font-mono">x{pc.quantity}</span>
                       </li>
                     ))}
                     {(prod.piecesComponents || []).length === 0 && <li className="text-[10px] text-slate-300 font-bold">لا يوجد</li>}
                   </ul>
                 </div>
                 <div>
                   <h4 className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded inline-block">عجينة (بديلة):</h4>
                   <ul className="space-y-1.5">
                     {prod.doughComponents.map((d, idx) => (
                       <li key={idx} className="text-xs font-bold text-slate-600 flex justify-between">
                         <span className="truncate">{state.doughRecipes.find(r => r.id === d.doughId)?.name || 'عجينة'}</span>
                         <span className="text-amber-600 shrink-0 font-mono">{d.quantityGram}g</span>
                       </li>
                     ))}
                     {prod.doughComponents.length === 0 && <li className="text-[10px] text-slate-300 font-bold">لا يوجد</li>}
                   </ul>
                 </div>
               </div>

               <div className="mt-4 pt-4 border-t border-slate-50">
                 <h4 className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded inline-block">الإضافات / التغليف:</h4>
                 <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                   {prod.addons.map((addon, index) => {
                     const item = state.inventory.find(i => i.id === addon.inventoryId);
                     const isGram = item?.unit === 'kg';
                     return (
                       <div key={index} className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                         <span className="truncate">{item?.name}</span>
                         <span className="text-slate-900 shrink-0 font-mono">{isGram ? Math.round(addon.quantity * 1000) : addon.quantity}{isGram ? 'g' : item?.unit}</span>
                       </div>
                     )
                   })}
                   {prod.addons.length === 0 && <span className="text-[10px] text-slate-300 font-bold">لا يوجد</span>}
                 </div>
               </div>
             </div>
          </div>
        ))}
        {state.products.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-3xl border border-slate-100 text-slate-500">
            لا توجد منتجات مضافة حتى الآن.
          </div>
        )}
      </div>
    </div>
  );
}
