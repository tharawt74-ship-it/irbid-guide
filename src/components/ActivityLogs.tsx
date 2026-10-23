import React, { useState } from 'react';
import { AppCoreState, ActivityLog } from '../lib/types';
import { History, Search, Calendar, User, Filter, Trash2, CheckSquare, Square, X } from 'lucide-react';

interface Props {
  state: AppCoreState;
  setState: React.Dispatch<React.SetStateAction<AppCoreState>>;
}

export default function ActivityLogs({ state, setState }: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  
  const filteredLogs = state.activityLogs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesUser = userFilter === 'all' || log.userName === userFilter;
    const matchesDate = !dateFilter || log.timestamp.startsWith(dateFilter);
    return matchesSearch && matchesUser && matchesDate;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredLogs.length && filteredLogs.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredLogs.map(l => l.id));
    }
  };

  const handleDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmModal({
      show: true,
      title: 'حذف سجلات العمليات',
      message: `هل أنت متأكد من حذف ${selectedIds.length} سجل من سجل العمليات؟ سيتم نقلهم لسلة المهملات.`,
      onConfirm: () => {
        const logsToTrash = state.activityLogs.filter(l => selectedIds.includes(l.id));
        setState(prev => ({
          ...prev,
          activityLogs: prev.activityLogs.filter(l => !selectedIds.includes(l.id)),
          trash: [
            ...prev.trash,
            ...logsToTrash.map(l => ({
              id: `trash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'activityLog' as const,
              data: l,
              deletedAt: new Date().toISOString()
            }))
          ]
        }));
        setSelectedIds([]);
        setConfirmModal(null);
      }
    });
  };

  const uniqueUsers = Array.from(new Set(state.activityLogs.map(l => l.userName)));

  return (
    <div className="space-y-6">
      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 text-center">
              <div className="mx-auto w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4">
                <Trash2 size={32} />
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
                className="flex-1 py-4 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-colors"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <History size={28} className="text-indigo-600" />
              سجل العمليات
            </h2>
            <p className="text-slate-500 font-medium">متابعة تحركات محمد وعبيدة على النظام</p>
          </div>

          <div className="flex flex-wrap gap-2">
             <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-2xl text-sm font-bold border border-indigo-100 flex items-center gap-2">
                <span className="bg-indigo-600 text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px]">
                  {filteredLogs.length}
                </span>
                عملية مسجلة
             </div>
             {selectedIds.length > 0 && (
               <button
                 onClick={handleDelete}
                 className="bg-rose-50 text-rose-700 px-4 py-2 rounded-2xl text-sm font-bold border border-rose-100 flex items-center gap-2 hover:bg-rose-100 transition-colors"
               >
                 <Trash2 size={16} />
                 حذف المحدد ({selectedIds.length})
               </button>
             )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative col-span-1 md:col-span-2">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="البحث في العمليات أو التفاصيل..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
            />
          </div>

          <div className="relative">
            <User className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <select
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium appearance-none"
            >
              <option value="all">جميع المستخدمين</option>
              {uniqueUsers.map(user => (
                <option key={user} value={user}>{user}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="date" 
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pr-10 pl-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-medium"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-100">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="py-4 px-6 w-12">
                  <button 
                    onClick={toggleSelectAll}
                    className={`p-1 rounded-md transition-colors ${selectedIds.length === filteredLogs.length && filteredLogs.length > 0 ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {selectedIds.length === filteredLogs.length && filteredLogs.length > 0 ? <CheckSquare size={20} /> : <Square size={20} />}
                  </button>
                </th>
                <th className="py-4 px-6 text-slate-500 font-bold text-xs uppercase tracking-widest">المستخدم</th>
                <th className="py-4 px-6 text-slate-500 font-bold text-xs uppercase tracking-widest">العملية</th>
                <th className="py-4 px-6 text-slate-500 font-bold text-xs uppercase tracking-widest">التفاصيل</th>
                <th className="py-4 px-6 text-slate-500 font-bold text-xs uppercase tracking-widest text-left">التاريخ والوقت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-slate-100 p-4 rounded-full text-slate-300">
                         <Filter size={40} />
                      </div>
                      <p className="text-slate-400 font-bold text-lg">لم يتم العثور على عمليات مطابقة</p>
                      <button 
                        onClick={() => { setSearchTerm(''); setDateFilter(''); setUserFilter('all'); }}
                        className="text-indigo-600 font-bold text-sm hover:underline"
                      >
                        إعادة تعيين الفلاتر
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedIds.includes(log.id) ? 'bg-indigo-50/30' : ''}`}>
                    <td className="py-4 px-6">
                      <button 
                        onClick={() => toggleSelect(log.id)}
                        className={`p-1 rounded-md transition-colors ${selectedIds.includes(log.id) ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-500'}`}
                      >
                        {selectedIds.includes(log.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs ${log.userName === 'محمد' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                          {log.userName[0]}
                        </div>
                        <span className="font-black text-slate-800 text-sm">{log.userName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-bold text-slate-900 text-sm whitespace-nowrap">{log.action}</span>
                    </td>
                    <td className="py-4 px-6">
                      <p className="text-slate-500 text-xs font-medium max-w-md line-clamp-2" title={log.details}>
                        {log.details || '-'}
                      </p>
                    </td>
                    <td className="py-4 px-6 text-left">
                      <div className="flex flex-col items-end gap-1">
                        <span className="font-black text-slate-700 text-xs font-mono tabular-nums">
                          {new Date(log.timestamp).toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="text-slate-400 text-[10px] font-bold uppercase font-mono">
                          {new Date(log.timestamp).toLocaleDateString('ar-JO', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-indigo-900 rounded-3xl p-8 text-white relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-xl font-black mb-2 flex items-center gap-2">
            <History size={24} />
            أمان النظام وشفافية البيانات
          </h3>
          <p className="text-indigo-200 text-sm font-medium leading-relaxed max-w-2xl">
            يتم تسجيل كافة العمليات الإدارية والمالية التي تتم على هذا الحساب لضمان الشفافية بين الشركاء. 
            لا يمكن حذف السجلات إلا من قبل الإدارة العليا وبعد التحقق اللازم.
          </p>
        </div>
        <div className="absolute top-0 right-0 p-8 opacity-10 blur-xl">
           <History size={200} />
        </div>
      </div>
    </div>
  );
}
