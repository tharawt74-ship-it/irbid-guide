import React, { useState } from 'react';
import { AppCoreState, AppAccountingRecord as AppFinTransaction, AppAuthSession, Invoice } from '../lib/types';
import { Plus, Receipt, Save, X, Activity, TrendingUp, TrendingDown, Trash2, Search, Eye, FileText, User, Pencil, ChevronLeft, Square, CheckSquare } from 'lucide-react';
import { formatCurrency, formatQuantity } from '../lib/format';
import { QRCodeDisplay } from './common/QRCodeDisplay';

interface Props {
  state: AppCoreState;
  setState: React.Dispatch<React.SetStateAction<AppCoreState>>;
  hideNumbers: boolean;
  user: AppAuthSession;
  addLog: (action: string, details?: string) => void;
}

export default function AppOperations({ state, setState, hideNumbers, user, addLog }: Props) {
  const [isAddingTransaction, setIsAddingTransaction] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: 'all',
    search: '',
    profileId: 'all'
  });
  
  const [formData, setFormData] = useState<{
    date: string;
    type: AppFinTransaction['type'];
    amountJOD: number;
    description: string;
    fundSource: AppFinTransaction['fundSource'];
    relatedProfileId?: string;
    productId?: string;
    quantity?: number;
    cogsJOD?: number;
    expenseCategory?: string;
    customerName?: string;
    isPaid?: boolean;
    items: { 
      name: string; 
      quantity: number; 
      unit: string; 
      price: number; 
      total: number; 
      inventoryId?: string; 
      productId?: string;
      customerName?: string;
      isPaid?: boolean;
    }[];
  }>({
    date: new Date().toISOString().split('T')[0],
    type: 'sale',
    amountJOD: 0,
    description: '',
    fundSource: 'project',
    isPaid: true,
    items: []
  });

  const [isSelectingCustomer, setIsSelectingCustomer] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  
  // Filter logic
  const filteredTransactions = state.transactions.filter(tx => {
    if (filters.startDate && tx.date < filters.startDate) return false;
    if (filters.endDate && tx.date > filters.endDate) return false;
    if (filters.type !== 'all' && tx.type !== filters.type) return false;
    if (filters.profileId !== 'all' && tx.relatedProfileId !== filters.profileId) return false;
    if (filters.search && !tx.description.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ ids: string[] } | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [noteEdit, setNoteEdit] = useState<{ 
    type: 'invoice' | 'item'; 
    invoiceId: string; 
    itemId?: string; 
    note: string 
  } | null>(null);

  const isAllSelected = filteredTransactions.length > 0 && selectedIds.length === filteredTransactions.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map(tx => tx.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const addItemToForm = () => {
    if (formData.type === 'sale' && formData.productId && formData.quantity) {
      const product = state.products.find(p => p.id === formData.productId);
      if (product) {
        setFormData(prev => {
          const newPrice = Number(product.sellingPriceJOD.toFixed(4));
          const newTotal = Number((newPrice * prev.quantity!).toFixed(4));
          
          return {
            ...prev,
            items: [
              ...prev.items,
              {
                productId: product.id,
                name: product.name,
                quantity: prev.quantity!,
                unit: 'بوكس',
                price: newPrice,
                total: newTotal,
                customerName: prev.customerName,
                isPaid: prev.isPaid ?? true
              }
            ],
            productId: '',
            quantity: 1,
            customerName: '',
            isPaid: true
          };
        });
      }
    } else if (formData.type === 'purchase') {
      setFormData(prev => {
        const qty = prev.quantity || 1;
        const total = Number((prev.amountJOD || 0).toFixed(4));
        const price = Number((total / qty).toFixed(4));
        
        return {
          ...prev,
          items: [
            ...prev.items,
            {
              name: prev.description || 'مادة جديدة',
              quantity: qty,
              unit: 'وحدة',
              price: price,
              total: total,
              isPaid: prev.isPaid ?? true
            }
          ],
          amountJOD: 0,
          quantity: 1,
          description: '',
          isPaid: true
        };
      });
    }
  };

  const handleSaveTransaction = () => {
    if (!formData.date || !formData.type || (formData.items.length === 0 && !formData.description && !formData.productId)) {
      setNotification({ message: 'الرجاء تعبئة البيانات المطلوبة (البيان أو اختيار وجبة)', type: 'error' });
      return;
    }

    const now = new Date().toISOString();
    const invoiceId = (formData.type === 'sale' || formData.type === 'purchase') ? `inv_${Date.now()}` : undefined;
    
    let totalAmount = 0;
    if (formData.items.length > 0) {
      totalAmount = Number(formData.items.reduce((sum, i) => sum + i.total, 0).toFixed(4));
    } else {
      totalAmount = Number((Number(formData.amountJOD) || 0).toFixed(4));
    }

    const productName = formData.productId ? state.products.find(p => p.id === formData.productId)?.name : '';
    const autoDescription = formData.productId ? `${formData.type === 'sale' ? 'بيع' : 'إنتاج'} - ${productName}` : '';

    const newTransaction: AppFinTransaction = {
      id: `t_${Date.now()}`,
      date: formData.date,
      type: formData.type,
      amountJOD: totalAmount,
      description: formData.description || (formData.items.length > 0 ? `${formData.type === 'sale' ? 'مبيعات' : 'مشتريات'} - مجموعة أصناف` : autoDescription),
      relatedProfileId: formData.relatedProfileId,
      relatedInvoiceId: invoiceId,
      fundSource: formData.fundSource,
      responsibleId: user.name as any,
      productId: formData.productId,
      quantity: formData.quantity,
      cogsJOD: formData.cogsJOD,
      expenseCategory: formData.expenseCategory,
      customerName: formData.customerName,
      isPaid: formData.isPaid,
    };

    let newInvoice: Invoice | undefined;
    if (invoiceId) {
      newInvoice = {
        id: invoiceId,
        type: formData.type as 'sale' | 'purchase',
        date: now,
        issuer: user.name as 'محمد' | 'عبيدة',
        items: formData.items.map(i => ({
          id: i.productId || i.inventoryId || 'custom',
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          price: i.price,
          total: i.total,
          customerName: i.customerName,
          isPaid: i.isPaid
        })),
        totalAmount: totalAmount,
        relatedProfileId: formData.relatedProfileId,
        relatedProfileName: state.profiles.find(p => p.id === formData.relatedProfileId)?.name,
        description: formData.description
      };
    }

    // Logic for inventory deduction if it's production or sale with items
    const newInventory = [...state.inventory];
    if (formData.type === 'production' && formData.productId && formData.quantity) {
       const product = state.products.find(p => p.id === formData.productId);
       if (product) {
         product.addons.forEach(addon => {
           const invIndex = newInventory.findIndex(i => i.id === addon.inventoryId);
           if (invIndex >= 0) newInventory[invIndex] = { ...newInventory[invIndex], quantity: newInventory[invIndex].quantity - (addon.quantity * formData.quantity!) };
         });
         product.doughComponents.forEach(dc => {
           const dough = state.doughRecipes.find(dr => dr.id === dc.doughId);
           if (dough) {
              const proportion = dc.quantityGram / dough.yieldWeightGram;
              dough.ingredients.forEach(ing => {
                const invIndex = newInventory.findIndex(i => i.id === ing.inventoryId);
                if (invIndex >= 0) newInventory[invIndex] = { ...newInventory[invIndex], quantity: newInventory[invIndex].quantity - (ing.quantity * proportion * formData.quantity!) }
              });
           }
         });
       }
    }

    setState(prev => ({
      ...prev,
      inventory: newInventory,
      transactions: [newTransaction, ...prev.transactions],
      invoices: newInvoice ? [newInvoice, ...prev.invoices] : prev.invoices
    }));

    addLog(`إضافة حركة: ${formData.type}`, `${newTransaction.description} - مبلغ: ${totalAmount} د.أ`);

    setIsAddingTransaction(false);
    setFormData({
      date: new Date().toISOString().split('T')[0],
      type: 'sale',
      amountJOD: 0,
      description: '',
      fundSource: 'project',
      items: [],
      productId: '',
      quantity: 1,
      customerName: '',
      isPaid: true
    });
    setNotification({ message: 'تم حفظ الحركة بنجاح', type: 'success' });
  };

  const handleDelete = (ids: string[]) => {
    setDeleteConfirm({ ids });
  }

  const confirmDelete = () => {
    if (deleteConfirm) {
      const transactionsToDelete = state.transactions.filter(t => deleteConfirm.ids.includes(t.id));
      
      setState(prev => ({
        ...prev,
        transactions: prev.transactions.filter(t => !deleteConfirm.ids.includes(t.id)),
        trash: [
          ...prev.trash,
          ...transactionsToDelete.map(t => ({
            id: `trash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'transaction' as const,
            data: t,
            deletedAt: new Date().toISOString()
          }))
        ]
      }));
      addLog('حذف حركات مالية', `تم حذف ${deleteConfirm.ids.length} حركة ونقلها للسلة`);
      setSelectedIds(prev => prev.filter(id => !deleteConfirm.ids.includes(id)));
      setDeleteConfirm(null);
    }
  }

  const updateInvoiceNote = (invoiceId: string, note: string) => {
    setState(prev => ({
      ...prev,
      invoices: prev.invoices.map(inv =>
        inv.id === invoiceId ? { ...inv, note } : inv
      )
    }));
  };

  const updateInvoiceItemNote = (invoiceId: string, itemId: string, note: string) => {
    setState(prev => ({
      ...prev,
      invoices: prev.invoices.map(inv =>
        inv.id === invoiceId ? {
          ...inv,
          items: inv.items.map(item =>
            item.id === itemId ? { ...item, note } : item
          )
        } : inv
      )
    }));
  };

  const calculateProductCost = (productId: string) => {
    const product = state.products.find(p => p.id === productId);
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
      {/* Notifications */}
      {notification && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-300">
           <div className={`px-6 py-3 rounded-2xl shadow-xl border flex items-center gap-3 font-bold text-sm ${
             notification.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
           }`}>
             <div className={`w-2 h-2 rounded-full ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
             {notification.message}
             <button onClick={() => setNotification(null)} className="p-1 hover:bg-black/5 rounded-lg transition-colors mr-2">
               <X size={14} />
             </button>
           </div>
        </div>
      )}

      {/* Note Edit Modal */}
      {noteEdit && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <h3 className="text-lg font-black text-slate-800 mb-4">
                تعديل ملاحظة {noteEdit.type === 'invoice' ? 'الفاتورة' : 'الصنف'}
              </h3>
              <textarea
                value={noteEdit.note}
                onChange={(e) => setNoteEdit({ ...noteEdit, note: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={4}
                placeholder="أضف ملاحظاتك هنا..."
                autoFocus
              />
            </div>
            <div className="flex border-t border-slate-100">
              <button 
                onClick={() => setNoteEdit(null)}
                className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors border-l border-slate-100"
              >
                إلغاء
              </button>
              <button 
                onClick={() => {
                  if (noteEdit.type === 'invoice') {
                    updateInvoiceNote(noteEdit.invoiceId, noteEdit.note);
                  } else if (noteEdit.itemId) {
                    updateInvoiceItemNote(noteEdit.invoiceId, noteEdit.itemId, noteEdit.note);
                  }
                  setNoteEdit(null);
                }}
                className="flex-1 py-4 text-sm font-bold text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800">العمليات</h2>
          <p className="text-slate-500 text-sm">تسجيل الحركات اليومية (مبيعات، مشتريات، إنتاج، هدر).</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Activity size={20} className="text-indigo-600" />
            سجل الحركات
          </h3>
          <div className="flex items-center gap-2">
            {selectedIds.length > 0 ? (
              <button 
                onClick={() => setSelectedIds([])}
                className="flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
              >
                <Square size={16} />
                إلغاء التحديد
              </button>
            ) : (
                <button 
                    onClick={() => setSelectedIds(filteredTransactions.map(t => t.id))}
                    className="flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all font-sans"
                >
                    <CheckSquare size={16} />
                    تحديد الكل
                </button>
            )}
            {selectedIds.length > 0 && (
              <button 
                onClick={() => handleDelete(selectedIds)}
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-rose-200 transition-all"
              >
                <Trash2 size={16} />
                حذف المحدد ({selectedIds.length})
              </button>
            )}
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                showFilters 
                ? 'bg-slate-100 border-slate-300 text-slate-700' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Search size={16} />
              {showFilters ? 'إخفاء الفلاتر' : 'بحث وفلترة'}
            </button>
            {!isAddingTransaction && (
              <button 
                onClick={() => setIsAddingTransaction(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all"
              >
                <Plus size={16} />
                إضافة حركة
              </button>
            )}
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200 font-sans">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">من تاريخ</label>
              <input 
                type="date" 
                value={filters.startDate}
                onChange={e => setFilters({...filters, startDate: e.target.value})}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">إلى تاريخ</label>
              <input 
                type="date" 
                value={filters.endDate}
                onChange={e => setFilters({...filters, endDate: e.target.value})}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">نوع الحركة</label>
              <select 
                value={filters.type}
                onChange={e => setFilters({...filters, type: e.target.value})}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">كل الأنواع</option>
                <option value="sale">مبيعات</option>
                <option value="purchase">مشتريات</option>
                <option value="production">إنتاج</option>
                <option value="expense">مصاريف</option>
                <option value="waste">هدر</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">الشخص / الجهة</label>
              <select 
                value={filters.profileId}
                onChange={e => setFilters({...filters, profileId: e.target.value})}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">الكل</option>
                {state.profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">بحث في الوصف</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={filters.search}
                  onChange={e => setFilters({...filters, search: e.target.value})}
                  placeholder="كلمات دلالية..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {filters.search && (
                  <button 
                    onClick={() => setFilters({...filters, search: ''})}
                    className="absolute left-2 top-1.5 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {isAddingTransaction && (
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-6 font-sans">
            <h4 className="text-sm font-bold text-slate-800 mb-4">حركة جديدة</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">التاريخ</label>
                <input 
                  type="date" 
                  value={formData.date || ''} 
                  onChange={e => setFormData({...formData, date: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">النوع</label>
                <select 
                  value={formData.type || 'sale'} 
                  onChange={e => setFormData({
                    ...formData, 
                    type: e.target.value as any, 
                    productId: undefined, 
                    amountJOD: 0, 
                    cogsJOD: 0,
                    quantity: undefined
                  })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="production">إنتاج (خصم من المخزون)</option>
                  <option value="sale">مبيعات (دخل)</option>
                  <option value="purchase">مشتريات (مواد)</option>
                  <option value="expense">مصاريف (تشغيلية)</option>
                  <option value="waste">هدر (عقوبة)</option>
                </select>
              </div>
              
              {formData.type !== 'production' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">المبلغ (دينار)</label>
                  <input 
                    type="number" 
                    step="any"
                    value={formData.type === 'sale' && formData.items.length > 0 
                      ? formData.items.reduce((sum, i) => sum + i.total, 0).toFixed(4)
                      : (formData.amountJOD || '')} 
                    onChange={e => setFormData({...formData, amountJOD: Number(e.target.value)})}
                    className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${formData.type === 'sale' ? 'bg-slate-50 cursor-not-allowed' : ''}`}
                    placeholder="0.00" 
                    readOnly={formData.type === 'sale'}
                  />
                </div>
              )}
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">المحفظة / الصندوق</label>
                <select 
                  value={formData.fundSource || 'project'} 
                  onChange={e => setFormData({...formData, fundSource: e.target.value as any})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="project">صندوق المشروع</option>
                  <option value="mohammed">محفظة محمد</option>
                  <option value="obaida">محفظة عبيدة</option>
                </select>
              </div>

              {formData.type === 'expense' && (
                <div>
                  <label className="block text-xs font-bold text-rose-600 mb-1">تصنيف المصروف</label>
                  <input
                    list="expense-categories"
                    value={formData.expenseCategory || ''}
                    onChange={e => setFormData({...formData, expenseCategory: e.target.value})}
                    placeholder="مثال: إيجار، كهرباء..."
                    className="w-full bg-rose-50 border border-rose-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <datalist id="expense-categories">
                    <option value="إيجار" />
                    <option value="كهرباء وماء" />
                    <option value="رواتب" />
                    <option value="تسويق" />
                    <option value="صيانة" />
                    <option value="تغليف ومطبوعات" />
                    <option value="أخرى" />
                  </datalist>
                </div>
              )}

              {/* Product selector for Production and Sales */}
              {(formData.type === 'production' || formData.type === 'sale') && (
                <>
                  <div className="lg:col-span-1">
                    <label className="block text-xs font-bold text-emerald-600 mb-1">المنتج (اختر للإضافة للقائمة)</label>
                    <select 
                      value={formData.productId || ''}
                      onChange={e => {
                        const productId = e.target.value;
                        const product = state.products.find(p => p.id === productId);
                        const qty = formData.quantity || 1;
                        
                        if (formData.type === 'production') {
                          const cogs = productId ? Number((calculateProductCost(productId) * qty).toFixed(4)) : 0;
                          setFormData({ ...formData, productId, cogsJOD: cogs });
                        } else {
                          setFormData({ ...formData, productId });
                        }
                      }}
                      className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">-- اختر منتج --</option>
                      {state.products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="lg:col-span-1">
                    <label className="block text-xs font-bold text-emerald-600 mb-1">الكمية (بوكس)</label>
                    <div className="flex gap-2">
                      <input 
                        type="number" 
                        step="any"
                        value={formData.quantity || ''}
                        onChange={e => {
                          const quantity = Number(e.target.value);
                          if (formData.type === 'production' && formData.productId) {
                            const cogs = Number((calculateProductCost(formData.productId) * quantity).toFixed(4));
                            setFormData({ ...formData, quantity, cogsJOD: cogs });
                          } else {
                            setFormData({ ...formData, quantity });
                          }
                        }}
                        className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {formData.type === 'sale' && (
                        <button 
                          onClick={addItemToForm}
                          className="bg-emerald-600 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors shrink-0"
                          title="إضافة المنتج للفاتورة"
                        >
                          إضافة
                        </button>
                      )}
                    </div>
                  </div>
                </>
              )}

              {formData.type === 'sale' && (
                <>
                  <div className="lg:col-span-1">
                    <label className="block text-xs font-bold text-indigo-600 mb-1">اسم العميل (اختياري)</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={formData.customerName || ''} 
                        readOnly
                        onClick={() => setIsSelectingCustomer(true)}
                        className="w-full bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer text-indigo-700 font-bold" 
                        placeholder="اختر عميل..." 
                      />
                      <button 
                        onClick={() => setIsSelectingCustomer(true)}
                        className="absolute left-2 top-2 text-indigo-400"
                      >
                        <User size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="lg:col-span-1">
                    <label className="block text-xs font-bold text-indigo-600 mb-1">حالة الدفع</label>
                    <button 
                      onClick={() => setFormData({...formData, isPaid: !formData.isPaid})}
                      className={`w-full px-4 py-2 rounded-xl text-xs font-bold transition-all border h-[38px] ${
                        formData.isPaid 
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-700' 
                        : 'bg-rose-100 border-rose-300 text-rose-700'
                      }`}
                    >
                      {formData.isPaid ? '✓ تم الدفع' : '✗ لم يتم الدفع'}
                    </button>
                  </div>
                </>
              )}

              <div className="md:col-span-2 lg:col-span-4">
                  <label className="block text-xs font-bold text-slate-500 mb-1">البيان / الوصف</label>
                  <input 
                    type="text" 
                    value={formData.description || ''} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                    placeholder="مثال: بيع كاش، دفع إيجار الكهرباء، تسجيل وجبة هدر..." 
                  />
              </div>

              {(formData.type === 'sale' || formData.type === 'purchase') && (
                <div className="md:col-span-2 lg:col-span-4 bg-white/50 p-4 rounded-2xl border border-dashed border-slate-200">
                  <div className="flex justify-between items-center mb-3">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">أصناف الفاتورة</h5>
                    <button 
                      onClick={addItemToForm}
                      className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg hover:bg-indigo-100 transition-all flex items-center gap-1"
                    >
                      <Plus size={10} /> إضافة الصنف أعلاه للقائمة
                    </button>
                  </div>
                  {formData.items.length > 0 ? (
                    <div className="space-y-2">
                      {formData.items.map((item, idx) => (
                        <div key={idx} className="flex flex-col bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                          <div className="flex justify-between items-center text-xs mb-1">
                            <span className="font-bold text-slate-700">{item.name} x {item.quantity} {item.unit}</span>
                            <div className="flex items-center gap-4">
                              <span className="font-mono text-slate-500">{formatCurrency(item.total, false)}</span>
                              <button 
                                onClick={() => setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }))}
                                className="text-rose-400 hover:text-rose-600"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-3 text-[10px]">
                            {item.customerName && (
                              <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg border border-indigo-100 flex items-center gap-1">
                                <User size={8} /> {item.customerName}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded-lg border flex items-center gap-1 font-bold ${
                              item.isPaid 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                              : 'bg-rose-50 text-rose-600 border-rose-100'
                            }`}>
                              {item.isPaid ? '✓ مدفوع' : '✗ ذمم'}
                            </span>
                          </div>
                        </div>
                      ))}
                      <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between items-center font-black">
                        <span>إجمالي الفاتورة:</span>
                        <span className="text-indigo-600">{formatCurrency(formData.items.reduce((s, i) => s + i.total, 0), false)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-slate-400 text-center py-2 italic font-sans">لم يتم إضافة أصناف بعد. سيتم اعتماد المبلغ والوصف أعلاه كحركة مفردة.</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
              <button 
                onClick={() => setIsAddingTransaction(false)}
                className="px-6 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
               >
                إلغاء
              </button>
              <button 
                onClick={handleSaveTransaction}
                className="px-6 py-2 rounded-xl text-sm font-bold bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-colors flex items-center gap-2"
               >
                <Save size={16} />
                حفظ الحركة
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500">
                <th className="pb-3 px-4 font-bold text-slate-400">
                  <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} className="accent-indigo-600"/>
                </th>
                <th className="pb-3 px-4 font-bold text-slate-400">التاريخ</th>
                <th className="pb-3 px-4 font-bold text-slate-400">النوع</th>
                <th className="pb-3 px-4 font-bold text-slate-400">الوصف</th>
                <th className="pb-3 px-4 font-bold text-slate-400">المحفظة</th>
                <th className="pb-3 px-4 font-bold text-slate-400 text-right">المبلغ (دينار)</th>
                <th className="pb-3 px-4 text-center font-bold text-slate-400">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">لا يوجد حركات تطابق الفلاتر المختارة.</td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 px-4">
                       <input type="checkbox" checked={selectedIds.includes(tx.id)} onChange={() => toggleSelect(tx.id)} className="accent-indigo-600"/>
                    </td>
                    <td className="py-4 px-4 text-slate-600">{tx.date}</td>
                    <td className="py-4 px-4 font-sans">
                      {tx.type === 'sale' && <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-emerald-100"><TrendingUp size={10}/> مبيعات</span>}
                      {tx.type === 'production' && <span className="inline-flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-blue-100"><Activity size={10}/> إنتاج</span>}
                      {tx.type === 'purchase' && <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-amber-100"><TrendingDown size={10}/> مشتريات</span>}
                      {tx.type === 'expense' && <span className="inline-flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-rose-100"><TrendingDown size={10}/> مصاريف</span>}
                      {tx.type === 'waste' && <span className="inline-flex items-center gap-1 text-rose-800 bg-rose-100 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-rose-200"><X size={10}/> هدر</span>}
                      {(tx.type === 'return' || tx.type === 'deposit') && <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border border-slate-200">{tx.type}</span>}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-bold text-slate-700 block">{tx.description}</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {tx.type === 'expense' && tx.expenseCategory && (
                          <div className="text-[10px] text-rose-500 font-bold uppercase">
                            التصنيف: {tx.expenseCategory}
                          </div>
                        )}
                        {tx.productId && (
                          <div className="text-[10px] text-slate-400 font-bold uppercase">
                            المنتج: {state.products.find(p => p.id === tx.productId)?.name || tx.productId} (الكمية: {tx.quantity})
                          </div>
                        )}
                        {tx.customerName && (
                          <div className="text-[10px] text-indigo-500 font-bold uppercase flex items-center gap-1">
                            <User size={10} /> العميل: {tx.customerName}
                          </div>
                        )}
                        {tx.type === 'sale' && tx.isPaid !== undefined && (
                          <div className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${tx.isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {tx.isPaid ? '✓ مدفوع' : '✗ ذمم'}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-500 text-[10px] font-black uppercase text-center">
                      <div className="flex flex-col items-center">
                        <span className="flex items-center gap-1"><User size={10} /> {tx.responsibleId || '-'}</span>
                        <span className="mt-1 text-slate-400">
                          {tx.fundSource === 'project' ? 'المشروع' : tx.fundSource === 'mohammed' ? 'محمد' : 'عبيدة'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-slate-800 text-right">
                      {tx.type === 'production' ? '-' : formatCurrency(tx.amountJOD, hideNumbers)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {tx.relatedInvoiceId && (
                           <button 
                             onClick={() => {
                               const inv = state.invoices.find(i => i.id === tx.relatedInvoiceId);
                               if (inv) setSelectedInvoice(inv);
                             }}
                             className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors flex items-center gap-1"
                             title="عرض تفاصيل الفاتورة"
                           >
                             <FileText size={16} />
                             <span className="text-[10px] font-bold">تفاصيل</span>
                           </button>
                        )}
                        <button onClick={() => handleDelete([tx.id])} className="text-slate-300 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Details Modal */}
      {/* Customer Selection Modal */}
      {isSelectingCustomer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
              <h3 className="text-lg font-black text-indigo-900 flex items-center gap-2">
                <User size={20} className="text-indigo-600" />
                اختيار العميل
              </h3>
              <button onClick={() => setIsSelectingCustomer(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="relative">
                <Search size={18} className="absolute right-3 top-3 text-slate-400" />
                <input 
                  type="text"
                  placeholder="ابحث عن مندوب، نقطة بيع، أو مورد..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-2">النتائج من السجلات</div>
                {state.profiles
                  .filter(p => !customerSearch || p.name.includes(customerSearch))
                  .map(profile => (
                    <button
                      key={profile.id}
                      onClick={() => {
                        setFormData({ ...formData, customerName: profile.name, relatedProfileId: profile.id });
                        setIsSelectingCustomer(false);
                        setCustomerSearch('');
                      }}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-indigo-50 text-right transition-colors border border-transparent hover:border-indigo-100 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          profile.type === 'salesperson' ? 'bg-blue-100 text-blue-600' :
                          profile.type === 'pos' ? 'bg-emerald-100 text-emerald-600' :
                          'bg-amber-100 text-amber-600'
                        }`}>
                          {profile.type === 'salesperson' ? 'M' : profile.type === 'pos' ? 'P' : 'S'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{profile.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {profile.type === 'salesperson' ? 'مندوب مبيعات' : 
                             profile.type === 'pos' ? 'نقطة بيع' : 'مورد'}
                          </p>
                        </div>
                      </div>
                      <ChevronLeft size={16} className="text-slate-300 group-hover:text-indigo-400 transform group-hover:-translate-x-1 transition-all" />
                    </button>
                  ))}
                
                {state.profiles.filter(p => !customerSearch || p.name.includes(customerSearch)).length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4 italic">لا يوجد نتائج تطابق البحث</p>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-2">إضافة اسم عميل جديد</div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    placeholder="اكتب اسم العميل يدوياً..."
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    disabled={!newCustomerName.trim()}
                    onClick={() => {
                      setFormData({ ...formData, customerName: newCustomerName, relatedProfileId: undefined });
                      setIsSelectingCustomer(false);
                      setNewCustomerName('');
                      setCustomerSearch('');
                    }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    اعتماد
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
               <div className="flex items-center gap-3">
                 <div className="w-12 h-12 bg-amber-500 text-slate-900 rounded-2xl flex items-center justify-center">
                    <Receipt size={24} />
                 </div>
                 <div>
                    <div className="flex items-center gap-2">
                       <h3 className="text-xl font-black">تفاصيل الفاتورة</h3>
                       <button
                         onClick={() => setNoteEdit({ 
                           type: 'invoice', 
                           invoiceId: selectedInvoice.id, 
                           note: selectedInvoice.note || '' 
                         })}
                         className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-indigo-400 transition-colors"
                         title="تعديل ملاحظة الفاتورة"
                       >
                         <Pencil size={14} />
                       </button>
                    </div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">رقم الفاتورة: {selectedInvoice.id}</p>
                 </div>
               </div>
               <div className="bg-white p-2 rounded-xl">
                 <QRCodeDisplay value={selectedInvoice.id} size={64} />
               </div>
               <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-slate-800 rounded-full transition-colors">
                  <X />
               </button>
            </div>
            
            <div className="p-8 overflow-y-auto font-sans">
               <div className="flex justify-between items-start mb-8 pb-8 border-b border-slate-100">
                  <div className="space-y-4">
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">المصدر / البائع</p>
                        <p className="text-lg font-black text-slate-900">{selectedInvoice.relatedProfileName || 'غير محدد'}</p>
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">حررت بواسطة</p>
                        <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                           <User size={14} className="text-indigo-500" />
                           {selectedInvoice.issuer}
                        </p>
                     </div>
                  </div>
                  <div className="text-left">
                     <p className="text-[10px] font-black text-slate-400 uppercase mb-1">التاريخ والوقت</p>
                     <p className="font-bold text-slate-900">{new Date(selectedInvoice.date).toLocaleString('ar-JO')}</p>
                     <div className="mt-4 px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black inline-block uppercase">
                        {selectedInvoice.type === 'purchase' ? 'مشتريات' : 'مبيعات'}
                     </div>
                  </div>
               </div>

               <div className="space-y-6">
                  <h4 className="font-black text-slate-900 text-sm uppercase flex items-center gap-2">
                    <FileText size={16} className="text-indigo-600" />
                    المواد والأصناف
                  </h4>
                  <div className="bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-100 text-slate-500 uppercase font-black tracking-tighter">
                          <th className="py-3 px-4">الصنف والملاحظة</th>
                          <th className="py-3 px-4">المورد</th>
                          <th className="py-3 px-4">الكمية</th>
                          <th className="py-3 px-4">سعر الوحدة</th>
                          <th className="py-3 px-4">الإجمالي</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInvoice.items.map((item, idx) => (
                          <tr key={idx} className="border-t border-slate-200">
                            <td className="py-3 px-4">
                               <div className="flex flex-col">
                                 <div className="flex items-center justify-between gap-4">
                                   <span className="font-bold text-slate-800">{item.name}</span>
                                   <button onClick={() => setNoteEdit({ 
                                       type: 'item', 
                                       invoiceId: selectedInvoice.id, 
                                       itemId: item.id, 
                                       note: item.note || '' 
                                   })} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-all">
                                     <Pencil size={12} />
                                   </button>
                                 </div>
                                 {/* Item Info */}
                                 <div className="flex flex-wrap gap-2 mt-1">
                                   {item.note && (
                                     <div className="flex items-start gap-1 p-1 bg-amber-50 rounded border border-amber-100">
                                       <FileText size={8} className="text-amber-500 mt-0.5 shrink-0" />
                                       <span className="text-[9px] text-amber-700 font-bold leading-tight">{item.note}</span>
                                     </div>
                                   )}
                                   {item.customerName && (
                                     <div className="flex items-center gap-1 p-1 bg-indigo-50 rounded border border-indigo-100 uppercase tracking-tighter">
                                       <User size={8} className="text-indigo-500" />
                                       <span className="text-[9px] text-indigo-700 font-bold leading-tight">العميل: {item.customerName}</span>
                                     </div>
                                   )}
                                   {selectedInvoice.type === 'sale' && (
                                     <div className={`flex items-center gap-1 p-1 rounded border uppercase tracking-tighter ${
                                       item.isPaid 
                                       ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                       : 'bg-rose-50 text-rose-600 border-rose-100'
                                     }`}>
                                       <span className="text-[9px] font-bold leading-tight">{item.isPaid ? 'مدفوع ✓' : 'ذمم ✗'}</span>
                                     </div>
                                   )}
                                 </div>
                               </div>
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-600">{item.supplierName || 'غير محدد'}</td>
                            <td className="py-3 px-4 font-mono font-bold text-slate-600">{formatQuantity(item.quantity, false)} {item.unit}</td>
                            <td className="py-3 px-4 font-mono text-slate-500">{formatCurrency(item.price, false)}</td>
                            <td className="py-3 px-4 font-mono font-black text-slate-900">{formatCurrency(item.total, false)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-indigo-600 text-white">
                          <td colSpan={4} className="py-4 px-4 font-black text-sm">الإجمالي النهائي</td>
                          <td className="py-4 px-4 font-mono font-black text-lg">{formatCurrency(selectedInvoice.totalAmount, false)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                  {selectedInvoice.description && (
                    <div className="pt-4 mt-4 border-t border-slate-100 italic text-slate-400 text-sm">
                      ملاحظات: {selectedInvoice.description}
                    </div>
                  )}
               </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 text-center">
               <button 
                 onClick={() => window.print()}
                 className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 mx-auto"
               >
                 <Receipt size={18} /> طباعة الفاتورة
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-6 text-center">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={32} />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-2">تأكيد الحذف</h3>
            <p className="text-slate-500 mb-6 font-sans">هل أنت متأكد من حذف {deleteConfirm.ids.length === 1 ? 'هذه الحركة' : `هذه ${deleteConfirm.ids.length} حركات`}؟ هذا الإجراء لا يمكن التراجع عنه.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200"
              >
                إلغاء
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700"
              >
                نعم، احذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
