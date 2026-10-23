import React, { useState } from 'react';
import { AppCoreState, AppBusinessEntity as AppBizProfile } from '../lib/types';
import { Users as UsersIcon, Plus, Edit2, Save, X, Trash2, Store, Truck, Briefcase, FileText, Eye, Calendar, TrendingUp, Activity, MapPin, Phone, ChevronLeft, Pencil, Search, CheckSquare, Square } from 'lucide-react';
import { formatCurrency } from '../lib/format';

interface Props {
  state: AppCoreState;
  setState: React.Dispatch<React.SetStateAction<AppCoreState>>;
  hideNumbers: boolean;
  addLog: (action: string, details?: string) => void;
}

type TabType = 'salesperson' | 'pos' | 'supplier';

export default function AppProfiles({ state, setState, hideNumbers, addLog }: Props) {
  const [activeTab, setActiveTab] = useState<TabType>('salesperson');
  const [isAddingProfile, setIsAddingProfile] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'info';
  } | null>(null);
  const [noteEdit, setNoteEdit] = useState<{ id: string; note: string } | null>(null);

  const filteredProfiles = state.profiles.filter(p => 
    p.type === activeTab &&
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.note || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredProfiles.length && filteredProfiles.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProfiles.map(p => p.id));
    }
  };

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      show: true,
      title: 'حذف العناصر المحددة',
      message: `هل أنت متأكد من حذف ${selectedIds.length} ملف من القائمة؟ سيتم نقلهم لسلة المهملات.`,
      type: 'danger',
      onConfirm: () => {
        const itemsToTrash = state.profiles.filter(p => selectedIds.includes(p.id));
        setState(prev => ({
          ...prev,
          profiles: prev.profiles.filter(p => !selectedIds.includes(p.id)),
          trash: [
            ...prev.trash,
            ...itemsToTrash.map(p => ({
              id: `trash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'profile' as const,
              data: p,
              deletedAt: new Date().toISOString()
            }))
          ]
        }));
        addLog('حذف سجلات CRM بالجملة', `تم حذف ${selectedIds.length} ملف ونقلهم للسلة`);
        setSelectedIds([]);
        setConfirmModal(null);
      }
    });
  };
  
  const [formData, setFormData] = useState<Partial<AppBizProfile>>({});

  const selectedForView = selectedProfileId ? state.profiles.find(p => p.id === selectedProfileId) : null;
  const relatedTransactions = selectedProfileId 
    ? state.transactions.filter(t => t.relatedProfileId === selectedProfileId)
    : [];

  const totalVolume = relatedTransactions.reduce((sum, t) => sum + t.amountJOD, 0);

  const handleSaveProfile = () => {
    if (!formData.name) return;

    if (isAddingProfile) {
      const newProfile: AppBizProfile = {
        id: `p_${Date.now()}`,
        name: formData.name || '',
        type: activeTab,
        commissionMode: activeTab === 'salesperson' ? (formData.commissionMode as any || 'fixed') : undefined,
        commissionRate: formData.commissionMode === 'fixed' ? (Number(formData.commissionRate) || 0) : undefined,
        wholesalePrice: formData.commissionMode === 'wholesale' ? (Number(formData.wholesalePrice) || 0) : undefined,
        debt: Number(formData.debt) || 0,
        rating: Number(formData.rating) || 5,
        isBlacklisted: formData.isBlacklisted || false,
        note: formData.note || '',
        supplierStatus: activeTab === 'supplier' ? (formData.supplierStatus || 'primary') : undefined,
        supplierItems: activeTab === 'supplier' ? (formData.supplierItems || []) : undefined,
        startDate: formData.startDate || new Date().toISOString().split('T')[0],
        status: formData.status || 'active',
        contactInfo: formData.contactInfo,
        location: formData.location
      };

      setState(prev => ({
        ...prev,
        profiles: [...prev.profiles, newProfile]
      }));
      addLog('إضافة سجل CRM', `إضافة ${activeTab}: ${newProfile.name}`);
    } else if (editingProfileId) {
      setState(prev => ({
        ...prev,
        profiles: prev.profiles.map(p => 
          p.id === editingProfileId 
            ? { 
                ...p, 
                ...formData,
                name: formData.name || p.name,
                commissionMode: activeTab === 'salesperson' ? (formData.commissionMode as any) : undefined,
                commissionRate: formData.commissionMode === 'fixed' ? Number(formData.commissionRate) : undefined,
                wholesalePrice: formData.commissionMode === 'wholesale' ? Number(formData.wholesalePrice) : undefined,
                debt: Number(formData.debt) ?? p.debt,
                rating: Number(formData.rating) ?? p.rating,
                isBlacklisted: formData.isBlacklisted ?? p.isBlacklisted,
                note: formData.note ?? p.note,
                supplierStatus: activeTab === 'supplier' ? (formData.supplierStatus || p.supplierStatus) : undefined,
                supplierItems: activeTab === 'supplier' ? (formData.supplierItems || p.supplierItems) : undefined,
                status: formData.status || p.status,
                stoppedAt: formData.status === 'inactive' ? (formData.stoppedAt || p.stoppedAt || new Date().toISOString().split('T')[0]) : undefined
              }
            : p
        )
      }));
      addLog('تعديل سجل CRM', `تعديل ملف ${formData.name || editingProfileId}`);
    }

    setIsAddingProfile(false);
    setEditingProfileId(null);
    setFormData({});
  };

  const handleEdit = (profile: AppBizProfile) => {
    setEditingProfileId(profile.id);
    setIsAddingProfile(false);
    setFormData({ ...profile });
  };

  const handleDelete = (id: string, name: string) => {
    setConfirmModal({
      show: true,
      title: 'حذف الملف',
      message: `هل أنت متأكد من حذف الملف: ${name}؟ سيتم نقله لسلة المهملات.`,
      type: 'danger',
      onConfirm: () => {
        const profileToTrash = state.profiles.find(p => p.id === id);
        setState(prev => ({
          ...prev,
          profiles: prev.profiles.filter(p => p.id !== id),
          trash: profileToTrash ? [
            ...prev.trash,
            {
              id: `trash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              data: profileToTrash,
              type: 'profile',
              deletedAt: new Date().toISOString()
            }
          ] : prev.trash
        }));
        addLog('حذف سجل CRM', `حذف الملف ${name} ونقله للسلة`);
        if (selectedProfileId === id) setSelectedProfileId(null);
        setConfirmModal(null);
      }
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${confirmModal.type === 'danger' ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>
                <Activity size={32} />
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

      {/* Note Edit Modal */}
      {noteEdit && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <h3 className="text-lg font-black text-slate-800 mb-4">تعديل ملاحظة الملف</h3>
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
                  setState(prev => ({
                    ...prev,
                    profiles: prev.profiles.map(p => p.id === noteEdit.id ? { ...p, note: noteEdit.note } : p)
                  }));
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

      {/* Detail View Modal */}
      {selectedForView && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-50 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-white px-8 py-6 border-b border-slate-100 flex justify-between items-center shrink-0">
               <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black ${
                    selectedForView.type === 'salesperson' ? 'bg-indigo-100 text-indigo-700' :
                    selectedForView.type === 'pos' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {selectedForView.name[0]}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">{selectedForView.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                        (selectedForView.status || 'active') === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {(selectedForView.status || 'active') === 'active' ? 'قيد التعامل' : 'موقف'}
                      </span>
                      {selectedForView.status === 'inactive' && selectedForView.stoppedAt && (
                        <span className="text-[10px] text-rose-500 font-bold">منذ: {selectedForView.stoppedAt}</span>
                      )}
                    </div>
                  </div>
               </div>
               <div className="flex items-center gap-2">
                 <button 
                   onClick={() => {
                     setEditingProfileId(selectedForView.id);
                     setFormData(selectedForView);
                     setIsAddingProfile(true);
                   }}
                   className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-colors"
                 >
                   <Edit2 size={20} />
                 </button>
                 <button onClick={() => setSelectedProfileId(null)} className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:text-rose-500 transition-colors">
                   <X size={24} />
                 </button>
               </div>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-8">
               {/* Stats Grid */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                    <Calendar className="text-indigo-500 mb-3" size={24} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">بدء التعامل</span>
                    <span className="text-sm font-black text-slate-800">{selectedForView.startDate || 'غير محدد'}</span>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                    <TrendingUp className="text-emerald-500 mb-3" size={24} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">إجمالي التعاملات</span>
                    <span className="text-sm font-black text-slate-800">{formatCurrency(totalVolume, hideNumbers)}</span>
                  </div>
                  <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center text-center">
                    <Activity className={`text-slate-400 mb-3`} size={24} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">الرصيد الحالي</span>
                    <span className={`text-sm font-black ${
                      selectedForView.debt === 0 ? 'text-amber-500' : 
                      selectedForView.debt < 0 ? 'text-rose-600' : 
                      'text-emerald-600'
                    }`}>
                      {formatCurrency(Math.abs(selectedForView.debt), hideNumbers)} {
                        selectedForView.debt === 0 ? '(لا شيء)' : 
                        selectedForView.debt < 0 ? '(له)' : 
                        '(عليه)'
                      }
                    </span>
                  </div>
               </div>

               {/* Info Bars */}
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600"><MapPin size={20} /></div>
                        <div>
                           <p className="text-[10px] font-black text-slate-400 uppercase">الموقع الجغرافي</p>
                           <p className="text-sm font-black text-slate-800">{selectedForView.location || 'غير متوفر'}</p>
                        </div>
                     </div>
                  </div>
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600"><Phone size={20} /></div>
                        <div>
                           <p className="text-[10px] font-black text-slate-400 uppercase">أرقام التواصل</p>
                           <p className="text-sm font-black text-slate-800 whitespace-pre-line">{selectedForView.contactInfo || 'غير متوفر'}</p>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Transaction History */}
               <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                    <h4 className="text-sm font-black text-slate-900">سجل التعاملات المادية</h4>
                    <span className="bg-white text-slate-500 text-[10px] font-black px-3 py-1 rounded-full border border-slate-100">
                      {relatedTransactions.length} حركة
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-right">
                      <thead>
                        <tr className="border-b border-slate-50">
                          <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase">التاريخ</th>
                          <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase">العملية</th>
                          <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase">المبلغ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {relatedTransactions.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-12 text-center text-slate-400 text-xs font-medium uppercase italic">لم يتم تسجيل أي تعاملات مادية بعد</td>
                          </tr>
                        ) : (
                          relatedTransactions.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 px-6 font-mono text-[11px] font-bold text-slate-500">{t.date}</td>
                              <td className="py-4 px-6">
                                <span className="font-bold text-slate-800 text-xs block">{t.description}</span>
                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                                  t.type === 'deposit' || t.type === 'sale' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                }`}>
                                  {t.type === 'deposit' || t.type === 'sale' ? 'دخل/قبض' : 'صرف/دفع'}
                                </span>
                              </td>
                              <td className={`py-4 px-6 font-black text-xs font-mono tabular-nums ${
                                t.type === 'deposit' || t.type === 'sale' ? 'text-emerald-600' : 'text-rose-600'
                              }`}>
                                {t.type === 'deposit' || t.type === 'sale' ? '+' : '-'}{formatCurrency(t.amountJOD, hideNumbers)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-black text-slate-800">إدارة العلاقات (CRM)</h2>
          <p className="text-slate-500 text-sm">إدارة مندوبي المبيعات، نقاط البيع، والموردين.</p>
        </div>
      </div>

      <div className="flex gap-2 font-sans overflow-x-auto pb-2">
        <button
          onClick={() => { setActiveTab('salesperson'); setIsAddingProfile(false); setEditingProfileId(null); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${
            activeTab === 'salesperson' 
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' 
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Briefcase size={18} />
          موزعين ومندوبي مبيعات
        </button>
        <button
          onClick={() => { setActiveTab('pos'); setIsAddingProfile(false); setEditingProfileId(null); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${
            activeTab === 'pos' 
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' 
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Store size={18} />
          نقاط بيع
        </button>
        <button
          onClick={() => { setActiveTab('supplier'); setIsAddingProfile(false); setEditingProfileId(null); }}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${
            activeTab === 'supplier' 
              ? 'bg-amber-500 text-white shadow-md shadow-amber-200' 
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Truck size={18} />
          موردين
        </button>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <UsersIcon size={20} className={
              activeTab === 'salesperson' ? 'text-indigo-600' :
              activeTab === 'pos' ? 'text-emerald-600' :
              'text-amber-500'
            } />
            {activeTab === 'salesperson' ? 'قائمة المندوبين' :
             activeTab === 'pos' ? 'قائمة نقاط البيع' :
             'قائمة الموردين'}
          </h3>
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
            {!isAddingProfile && !editingProfileId && (
              <button 
                onClick={() => { setIsAddingProfile(true); setFormData({ commissionMode: 'fixed' }); }}
                className={`flex items-center gap-2 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg transition-all ${
                  activeTab === 'salesperson' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' :
                  activeTab === 'pos' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' :
                  'bg-amber-500 hover:bg-amber-600 shadow-amber-200'
                }`}
              >
                <Plus size={16} />
                إضافة {
                  activeTab === 'salesperson' ? 'مندوب' :
                  activeTab === 'pos' ? 'نقطة بيع' :
                  'مورد'
                }
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
          <div className="relative flex-1 w-full">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="بحث في القائمة..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-sans"
            />
          </div>
          <button 
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-slate-100 px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-200 transition-all w-full md:w-auto justify-center"
          >
            {selectedIds.length === filteredProfiles.length && filteredProfiles.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
            {selectedIds.length === filteredProfiles.length && filteredProfiles.length > 0 ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
          </button>
        </div>

        {(isAddingProfile || editingProfileId) && (
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 mb-6 font-sans">
            <h4 className="text-sm font-bold text-slate-800 mb-4">{isAddingProfile ? 'إضافة ملف جديد' : 'تعديل الملف'}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="col-span-1 lg:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">الاسم</label>
                <input 
                  type="text" 
                  value={formData.name || ''} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder={
                    activeTab === 'salesperson' ? 'مثال: أحمد (مندوب)' :
                    activeTab === 'pos' ? 'مثال: مقهى ABC' :
                    'مثال: مطاحن عمان'
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">الدين (دينار)</label>
                <div className="grid grid-cols-2 gap-2">
                  <select 
                    value={(formData.debt || 0) === 0 ? 'none' : ((formData.debt || 0) < 0 ? 'to_him' : 'on_him')}
                    onChange={(e) => {
                      const mode = e.target.value;
                      const currentAbs = Math.abs(formData.debt || 0);
                      if (mode === 'none') setFormData({ ...formData, debt: 0 });
                      else if (mode === 'to_him') setFormData({ ...formData, debt: -(currentAbs || 0.0001) }); // Small non-zero to keep it "to him"
                      else setFormData({ ...formData, debt: currentAbs || 0.0001 });
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700"
                  >
                    <option value="none">لا شيء</option>
                    <option value="on_him">عليه (للشركة)</option>
                    <option value="to_him">له (علينا)</option>
                  </select>
                  <input 
                    type="number" 
                    step="any"
                    value={Math.abs(formData.debt || 0) === 0 ? '' : Math.abs(formData.debt || 0)} 
                    onChange={e => {
                      const val = Number(e.target.value);
                      const mode = (formData.debt || 0) === 0 && val > 0 ? 'on_him' : ((formData.debt || 0) < 0 ? 'to_him' : 'on_him');
                      setFormData({...formData, debt: mode === 'to_him' ? -val : val});
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-bold" 
                    placeholder="0.00" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">تاريخ بدء التعامل</label>
                <input 
                  type="date" 
                  value={formData.startDate || ''} 
                  onChange={e => setFormData({...formData, startDate: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">الموقع</label>
                <input 
                  type="text" 
                  value={formData.location || ''} 
                  onChange={e => setFormData({...formData, location: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="العنوان أو الرابط"
                />
              </div>

              <div className="col-span-1 lg:col-span-2">
                <label className="block text-xs font-bold text-slate-500 mb-1">أرقام التواصل (يمكنك إضافة أكثر من رقم)</label>
                <textarea 
                  rows={2}
                  value={formData.contactInfo || ''} 
                  onChange={e => setFormData({...formData, contactInfo: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  placeholder="رقم الهاتف الأول&#10;رقم الهاتف الثاني..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">الحالة</label>
                <select
                  value={formData.status || 'active'}
                  onChange={e => setFormData({...formData, status: e.target.value as any})}
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="active">نشط</option>
                  <option value="inactive">متوقف</option>
                </select>
              </div>

              {activeTab === 'salesperson' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">نظام العمولة</label>
                    <select 
                      value={formData.commissionMode || 'fixed'} 
                      onChange={e => setFormData({...formData, commissionMode: e.target.value as any})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="fixed">عمولة ثابتة (لكل قطعة)</option>
                      <option value="wholesale">سعر جملة</option>
                    </select>
                  </div>
                  {formData.commissionMode === 'fixed' ? (
                     <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">قيمة العمولة (دينار)</label>
                      <input 
                        type="number" 
                        step="any"
                        value={formData.commissionRate || ''} 
                        onChange={e => setFormData({...formData, commissionRate: Number(e.target.value)})}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                        placeholder="0.5" 
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">سعر الجملة (دينار)</label>
                      <input 
                        type="number" 
                        step="any"
                        value={formData.wholesalePrice || ''} 
                        onChange={e => setFormData({...formData, wholesalePrice: Number(e.target.value)})}
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                        placeholder="4.5" 
                      />
                    </div>
                  )}
                </>
              )}
              
              {activeTab === 'supplier' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">حالة المورد</label>
                    <div className="flex gap-2">
                       <button
                         onClick={() => setFormData({...formData, supplierStatus: 'primary'})}
                         className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                           (formData.supplierStatus || 'primary') === 'primary' 
                             ? 'bg-amber-100 border-amber-300 text-amber-700 shadow-sm' 
                             : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                         }`}
                       >
                         أساسي ومعتمد
                       </button>
                       <button
                         onClick={() => setFormData({...formData, supplierStatus: 'backup'})}
                         className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                           formData.supplierStatus === 'backup' 
                             ? 'bg-blue-100 border-blue-300 text-blue-700 shadow-sm' 
                             : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                         }`}
                       >
                         احتياط / بديل
                       </button>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formData.isBlacklisted || false}
                    onChange={e => setFormData({...formData, isBlacklisted: e.target.checked})}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  />
                  <span className={`text-sm font-bold ${formData.isBlacklisted ? 'text-rose-600' : 'text-slate-500'}`}>القائمة السوداء (موقوف)</span>
                </label>
              </div>

            </div>
            {activeTab === 'supplier' && (
               <div className="mt-8 pt-8 border-t border-slate-200">
                  <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <Plus size={16} className="text-amber-500" />
                    عرض الأسعار والأصناف الموردة
                  </h4>
                  <div className="bg-white rounded-2xl border border-slate-200 p-4">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div>
                           <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">اختر الصنف</label>
                           <select 
                             id="supplier-item-select"
                             className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                             defaultValue=""
                             onChange={(e) => {
                               const invId = e.target.value;
                               if (!invId) return;
                               const currentList = formData.supplierItems || [];
                               if (currentList.find(i => i.inventoryId === invId)) return;
                               setFormData({
                                 ...formData,
                                 supplierItems: [...currentList, { inventoryId: invId, price: 0, quantity: 1 }]
                               });
                               e.target.value = "";
                             }}
                           >
                             <option value="" disabled>تحديد صنف لإضافته...</option>
                             {state.inventory.map(item => (
                               <option key={item.id} value={item.id}>{item.name} ({item.unit})</option>
                             ))}
                           </select>
                        </div>
                     </div>

                     <div className="space-y-2">
                        {(formData.supplierItems || []).map((sItem, idx) => {
                          const inv = state.inventory.find(i => i.id === sItem.inventoryId);
                          const unitPrice = sItem.quantity > 0 ? sItem.price / sItem.quantity : 0;
                          
                          return (
                            <div key={sItem.inventoryId} className="flex flex-col md:flex-row md:items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 gap-4">
                               <div className="flex items-center gap-3 min-w-[150px]">
                                  <div className="bg-amber-100 p-2 rounded-lg text-amber-700">
                                     <Truck size={14} />
                                  </div>
                                  <div>
                                     <p className="text-sm font-bold text-slate-700">{inv?.name || 'صنف غير معروف'}</p>
                                     <div className="flex items-center gap-2">
                                       <p className="text-[10px] text-slate-400 font-bold uppercase">{inv?.unit}</p>
                                       {unitPrice > 0 && (
                                         <p className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
                                           {formatCurrency(unitPrice, false)} / {inv?.unit}
                                         </p>
                                       )}
                                     </div>
                                  </div>
                               </div>
                               
                               <div className="flex items-center gap-4 flex-1 justify-end">
                                  <div className="text-left w-24">
                                     <label className="block text-[10px] font-bold text-slate-400 mb-1 text-right">الكمية ({inv?.unit})</label>
                                     <input 
                                       type="number"
                                       step="0.001"
                                       value={sItem.quantity}
                                       min="0.001"
                                       onChange={(e) => {
                                          const newList = [...(formData.supplierItems || [])];
                                          newList[idx] = { ...sItem, quantity: Number(e.target.value) };
                                          setFormData({ ...formData, supplierItems: newList });
                                       }}
                                       className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-mono font-bold w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
                                     />
                                  </div>

                                  <div className="text-left w-28">
                                     <label className="block text-[10px] font-bold text-slate-400 mb-1 text-right">إجمالي السعر (دينار)</label>
                                     <input 
                                       type="number"
                                       step="0.001"
                                       value={sItem.price}
                                       onChange={(e) => {
                                          const newList = [...(formData.supplierItems || [])];
                                          newList[idx] = { ...sItem, price: Number(e.target.value) };
                                          setFormData({ ...formData, supplierItems: newList });
                                       }}
                                       className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-mono font-bold w-full focus:outline-none focus:ring-2 focus:ring-amber-500"
                                     />
                                  </div>

                                  <button 
                                    onClick={() => {
                                      setFormData({
                                        ...formData,
                                        supplierItems: (formData.supplierItems || []).filter(i => i.inventoryId !== sItem.inventoryId)
                                      });
                                    }}
                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors mt-4 md:mt-0"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                               </div>
                            </div>
                          );
                        })}
                        {(formData.supplierItems || []).length === 0 && (
                          <p className="text-center py-4 text-slate-400 text-xs italic">لم يتم إضافة أي أصناف بعد لهذا المورد.</p>
                        )}
                     </div>
                  </div>
               </div>
            )}

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
              <button 
                onClick={() => { setIsAddingProfile(false); setEditingProfileId(null); setFormData({}); }}
                className="px-6 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-200 transition-colors"
              >
                إلغاء
              </button>
              <button 
                onClick={handleSaveProfile}
                className={`flex items-center gap-2 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md transition-colors ${
                  activeTab === 'salesperson' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' :
                  activeTab === 'pos' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' :
                  'bg-amber-500 hover:bg-amber-600 shadow-amber-200'
                }`}
              >
                <Save size={16} />
                حفظ
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse text-sm">
            <thead>
              <tr className="text-slate-500 border-b border-slate-100">
                <th className="pb-4 px-4 w-12 text-center">
                  <button 
                    onClick={toggleSelectAll}
                    className={`p-1 rounded-md transition-colors ${selectedIds.length === filteredProfiles.length && filteredProfiles.length > 0 ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {selectedIds.length === filteredProfiles.length && filteredProfiles.length > 0 ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                </th>
                <th className="pb-4 px-4 font-bold">الاسم</th>
                {activeTab === 'salesperson' && <th className="pb-4 px-4 font-bold">نظام البيع</th>}
                {activeTab === 'supplier' && <th className="pb-4 px-4 font-bold text-center">عدد الأصناف</th>}
                <th className="pb-4 px-4 font-bold">الرصيد (الدين)</th>
                <th className="pb-4 px-4 font-bold text-left">إجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProfiles.map(profile => (
                <tr key={profile.id} className={`hover:bg-slate-50 transition-colors group ${selectedIds.includes(profile.id) ? 'bg-indigo-50/50' : (profile.isBlacklisted || profile.status === 'inactive' ? 'bg-rose-50/30' : '')}`}>
                  <td className="py-4 px-4 text-center">
                    <button 
                      onClick={() => toggleSelect(profile.id)}
                      className={`p-1 rounded-md transition-colors ${selectedIds.includes(profile.id) ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-400 opacity-60 group-hover:opacity-100'}`}
                    >
                      {selectedIds.includes(profile.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-bold text-slate-700 flex flex-col">
                       <span className="flex items-center gap-2">
                         <button 
                           onClick={() => setSelectedProfileId(profile.id)}
                           className="hover:text-indigo-600 transition-colors text-right"
                         >
                           {profile.name}
                         </button>
                         <button 
                           onClick={() => setNoteEdit({ id: profile.id, note: profile.note || '' })}
                           className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                           title="تعديل الملاحظة"
                         >
                           <FileText size={12} className={profile.note ? "text-amber-500" : "text-slate-400"} />
                         </button>
                         {(profile.isBlacklisted || profile.status === 'inactive') && (
                           <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 uppercase">
                             {profile.status === 'inactive' ? 'متوقف' : 'موقوف'}
                           </span>
                         )}
                       </span>
                       {profile.startDate && <span className="text-[10px] text-slate-400 font-sans block mt-1">منذ: {profile.startDate}</span>}
                       {profile.note && <span className="text-[10px] text-slate-400 font-sans block mt-1">{profile.note}</span>}
                       {activeTab === 'supplier' && profile.supplierItems && profile.supplierItems.length > 0 && (
                         <span className="text-[10px] text-slate-400 font-sans mt-1">
                           أهم الأصناف: {profile.supplierItems.slice(0, 3).map(si => state.inventory.find(i => i.id === si.inventoryId)?.name).join('، ')}
                           {profile.supplierItems.length > 3 ? '...' : ''}
                         </span>
                       )}
                    </div>
                  </td>
                  {activeTab === 'salesperson' && (
                    <td className="py-4 px-4 font-mono text-slate-600 text-sm font-bold">
                       {profile.commissionMode === 'fixed' 
                        ? `${formatCurrency(profile.commissionRate || 0, hideNumbers)} / للقطعة` 
                        : `سعر جملة @ ${formatCurrency(profile.wholesalePrice || 0, hideNumbers)}`}
                    </td>
                  )}
                  {activeTab === 'supplier' && (
                    <td className="py-4 px-4">
                       <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                         profile.supplierStatus === 'primary' 
                          ? 'bg-amber-100 text-amber-700 border border-amber-200' 
                          : 'bg-blue-50 text-blue-600 border border-blue-100'
                       }`}>
                         {profile.supplierStatus === 'primary' ? 'أساسي ومعتمد' : 'مورد احتياط'}
                       </span>
                    </td>
                  )}
                  {activeTab === 'supplier' && (
                    <td className="py-4 px-4 text-center font-bold text-slate-500">
                       {profile.supplierItems?.length || 0}
                    </td>
                  )}
                  <td className={`py-4 px-4 font-mono font-bold ${
                    profile.debt === 0 ? 'text-amber-500' : 
                    profile.debt < 0 ? 'text-rose-600' : 
                    'text-emerald-700'
                  }`}>
                     {profile.debt < 0 ? 'له ' : (profile.debt > 0 ? 'عليه ' : 'لا شيء ')}
                     {formatCurrency(Math.abs(profile.debt), hideNumbers)}
                  </td>
                  <td className="py-4 px-4 text-left">
                     <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setSelectedProfileId(profile.id)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors p-2"
                          title="عرض السجل التفصيلي"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => handleEdit(profile)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors p-2"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(profile.id, profile.name)}
                          className="text-slate-400 hover:text-rose-600 transition-colors p-2"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                  </td>
                </tr>
              ))}
              {filteredProfiles.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    لا يوجد سجلات في هذا القسم. أضف واحدًا للبدء.
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