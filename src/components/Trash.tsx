import React, { useState, useMemo } from 'react';
import { Trash2, RotateCcw, X, CheckSquare, Square, Search, Filter, AlertCircle, Info } from 'lucide-react';
import { AppCoreState, TrashItem, AppAuthSession } from '../lib/types';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface AppTrashProps {
  state: AppCoreState;
  setState: React.Dispatch<React.SetStateAction<AppCoreState>>;
  hideNumbers?: boolean;
  user: AppAuthSession;
  addLog: (action: string, details?: string) => void;
}

export default function AppTrash({ state, setState, hideNumbers, user, addLog }: AppTrashProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'info';
  } | null>(null);

  const filteredTrash = useMemo(() => {
    return state.trash.filter(item => {
      const typeMatch = filterType === 'all' || item.type === filterType;
      const searchMatch = !search || JSON.stringify(item.data).toLowerCase().includes(search.toLowerCase());
      return typeMatch && searchMatch;
    }).sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  }, [state.trash, filterType, search]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTrash.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTrash.map(i => i.id));
    }
  };

  const handleRestore = (ids: string[]) => {
    setConfirmModal({
      show: true,
      title: 'استعادة العناصر',
      message: `هل أنت متأكد من استعادة ${ids.length} عنصر من سلة المهملات؟`,
      type: 'info',
      onConfirm: () => {
        setState(prev => {
          const itemsToRestore = prev.trash.filter(t => ids.includes(t.id));
          const newTrash = prev.trash.filter(t => !ids.includes(t.id));
          
          const newState = { ...prev, trash: newTrash };

          itemsToRestore.forEach(item => {
            const collectionMap: Record<string, keyof AppCoreState> = {
              'transaction': 'transactions',
              'product': 'products',
              'doughRecipe': 'doughRecipes',
              'profile': 'profiles',
              'inventoryItem': 'inventory',
              'invoice': 'invoices',
              'task': 'productionQueue',
              'shoppingList': 'shoppingLists',
              'activityLog': 'activityLogs'
            };

            const key = collectionMap[item.type];
            if (key && Array.isArray(newState[key])) {
              (newState[key] as any[]) = [item.data, ...(newState[key] as any[])];
            }
          });

          return newState;
        });

        addLog('استعادة من السلة', `تم استعادة ${ids.length} عنصر`);
        setSelectedIds([]);
        setConfirmModal(null);
      }
    });
  };

  const handleDeleteForever = (ids: string[]) => {
    setConfirmModal({
      show: true,
      title: 'حذف نهائي',
      message: `هل أنت متأكد من حذف ${ids.length} عنصر نهائياً؟ لا يمكن التراجع عن هذه العملية بعد إتمامها.`,
      type: 'danger',
      onConfirm: () => {
        setState(prev => ({
          ...prev,
          trash: prev.trash.filter(t => !ids.includes(t.id))
        }));

        addLog('حذف نهائي من السلة', `تم حذف ${ids.length} عنصر نهائياً`);
        setSelectedIds([]);
        setConfirmModal(null);
      }
    });
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'transaction': return 'حركة مالية';
      case 'product': return 'منتج نهائي';
      case 'doughRecipe': return 'وصفة عجينة';
      case 'profile': return 'ملف (عميل/مورد)';
      case 'inventoryItem': return 'مخزون';
      case 'invoice': return 'فاتورة';
      case 'task': return 'مهمة إنتاج';
      case 'shoppingList': return 'قائمة تسوق';
      case 'activityLog': return 'سجل عملية';
      default: return type;
    }
  };

  const getItemPreview = (item: TrashItem) => {
    const data = item.data;
    switch (item.type) {
      case 'transaction': return `${data.description} (${data.amountJOD} د.أ)`;
      case 'product': return data.name;
      case 'doughRecipe': return data.name;
      case 'profile': return data.name;
      case 'inventoryItem': return data.name;
      case 'invoice': return `فاتورة #${data.id} - ${data.totalAmount} د.أ`;
      case 'activityLog': return `${data.action} - ${data.details || ''}`;
      default: return item.id;
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6" dir="rtl">
      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${confirmModal.type === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                <AlertCircle size={32} />
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

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Trash2 size={24} />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">سلة المهملات</h2>
          </div>
          <p className="text-slate-500 text-sm font-medium">إدارة العناصر المحذوفة واستعادتها أو حذفها نهائياً.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {selectedIds.length > 0 && (
            <>
              <button
                onClick={() => handleRestore(selectedIds)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-colors"
              >
                <RotateCcw size={18} />
                استعادة ({selectedIds.length})
              </button>
              <button
                onClick={() => handleDeleteForever(selectedIds)}
                className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 rounded-xl font-bold text-sm hover:bg-rose-100 transition-colors"
              >
                <X size={18} />
                حذف نهائي ({selectedIds.length})
              </button>
            </>
          )}
          {state.trash.length > 0 && selectedIds.length === 0 && (
            <button
               onClick={() => handleDeleteForever(state.trash.map(t => t.id))}
               className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl font-bold text-sm hover:bg-rose-700 transition-colors shadow-lg shadow-rose-200"
            >
               <Trash2 size={18} />
               تفريغ السلة
            </button>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-4">
        <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
            <Info size={20} />
        </div>
        <div>
            <p className="text-amber-900 text-sm font-bold mb-1">معلومة هامة</p>
            <p className="text-amber-800 text-xs leading-relaxed">
                يتم الاحتفاظ بالعناصر المحذوفة لمدة 60 يوماً قبل أن يتم حذفها نهائياً بشكل تلقائي من النظام. يمكنك استعادة أي عنصر خلال هذه الفترة.
            </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 sticky top-4 z-10">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="بحث في المهملات..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-sans"
          />
        </div>
        
        <div className="relative">
          <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          >
            <option value="all">كل التصنيفات</option>
            <option value="transaction">حركات مالية</option>
            <option value="product">منتجات نهائية</option>
            <option value="doughRecipe">وصفات عجائن</option>
            <option value="profile">ملفات وشخصيات</option>
            <option value="inventoryItem">مواد مخزنية</option>
            <option value="invoice">فواتير</option>
            <option value="task">مهام إنتاج</option>
            <option value="shoppingList">قوائم تسوق</option>
            <option value="activityLog">سجل عمليات</option>
          </select>
        </div>
      </div>

      {filteredTrash.length > 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 w-12">
                    <button 
                      onClick={toggleSelectAll}
                      className={`p-1 rounded-md transition-colors ${selectedIds.length === filteredTrash.length ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      {selectedIds.length === filteredTrash.length ? <CheckSquare size={20} /> : <Square size={20} />}
                    </button>
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">التصنيف</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">التفاصيل</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">تاريخ الحذف</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredTrash.map((item) => (
                  <tr key={item.id} className={`group hover:bg-slate-50 transition-colors ${selectedIds.includes(item.id) ? 'bg-indigo-50/50' : ''}`}>
                    <td className="p-4">
                      <button 
                        onClick={() => toggleSelect(item.id)}
                        className={`p-1 rounded-md transition-colors ${selectedIds.includes(item.id) ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-500'}`}
                      >
                        {selectedIds.includes(item.id) ? <CheckSquare size={20} /> : <Square size={20} />}
                      </button>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                        item.type === 'transaction' ? 'bg-blue-100 text-blue-700' :
                        item.type === 'product' ? 'bg-indigo-100 text-indigo-700' :
                        item.type === 'profile' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {getTypeLabel(item.type)}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-bold text-slate-700">{getItemPreview(item)}</p>
                      {item.reason && <p className="text-[10px] text-slate-400 mt-0.5">{item.reason}</p>}
                    </td>
                    <td className="p-4">
                      <p className="text-xs font-medium text-slate-500">
                        {format(new Date(item.deletedAt), 'dd MMMM yyyy, HH:mm', { locale: ar })}
                      </p>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleRestore([item.id])}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="استعادة"
                        >
                          <RotateCcw size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteForever([item.id])}
                          className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="حذف نهائي"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
          <div className="p-6 bg-slate-50 rounded-full mb-4">
            <Trash2 size={48} className="text-slate-200" />
          </div>
          <h3 className="text-slate-600 font-bold mb-1">السلة فارغة</h3>
          <p className="text-slate-400 text-sm">لا توجد عناصر محذوفة حالياً.</p>
        </div>
      )}
    </div>
  );
}
