import React, { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { EditSuggestion, Business } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { recordAuditLog } from '../../lib/auditLogHelper';
import { Edit3, CheckCircle2, XCircle, Trash2, ShieldAlert, Sparkles, Phone, MapPin, Clock, Search, ExternalLink } from 'lucide-react';

interface EditSuggestionsPanelProps {
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  onRefreshTrigger?: () => void;
}

export function EditSuggestionsPanel({ onShowToast, onRefreshTrigger }: EditSuggestionsPanelProps) {
  const { currentUser } = useAuth();
  const [suggestions, setSuggestions] = useState<EditSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [search, setSearch] = useState('');

  const fetchSuggestions = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'edit_suggestions'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const fetched: EditSuggestion[] = [];
      snap.forEach(d => {
        fetched.push({ id: d.id, ...d.data() } as EditSuggestion);
      });
      setSuggestions(fetched);
    } catch (err) {
      console.error("Error fetching edit suggestions:", err);
      onShowToast('حدث خطأ أثناء تحميل الاقتراحات', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const handleApply = async (s: EditSuggestion) => {
    try {
      const bizRef = doc(db, 'businesses', s.businessId);
      const bizDoc = await getDoc(bizRef);
      if (!bizDoc.exists()) {
        onShowToast('المحل المقترح تعديله لم يعد موجوداً في الدليل', 'error');
        return;
      }

      const currentBiz = bizDoc.data() as Business;
      const updateData: any = {};

      if (s.suggestedChanges.phone) {
        updateData.phone = s.suggestedChanges.phone;
      }
      if (s.suggestedChanges.address) {
        updateData.address = s.suggestedChanges.address;
      }
      if (s.suggestedChanges.workingHours) {
        const updatedHours = { ...(currentBiz.workingHours || {}) };
        updatedHours.days = s.suggestedChanges.workingHours;
        updateData.workingHours = updatedHours;
      }

      // Apply changes to the business
      await updateDoc(bizRef, updateData);

      // Update suggestion status
      await updateDoc(doc(db, 'edit_suggestions', s.id), { status: 'approved' });

      // Record Audit Log
      await recordAuditLog({
        performedBy: currentUser?.email || 'admin@irbid.com',
        action: 'EDIT_NEWS',
        actionAr: 'تعديل بيانات المحل',
        details: `الموافقة على اقتراح تعديل للمحل: ${s.businessName}`,
        targetName: s.businessName,
        timestamp: Date.now()
      });

      onShowToast('تمت الموافقة وتطبيق التعديلات على المحل بنجاح 🎉');
      fetchSuggestions();
      if (onRefreshTrigger) onRefreshTrigger();
    } catch (err) {
      console.error("Error applying edit suggestion:", err);
      onShowToast('تعذر تطبيق التعديلات', 'error');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await updateDoc(doc(db, 'edit_suggestions', id), { status: 'rejected' });
      onShowToast('تم رفض اقتراح التعديل وحفظ الحالة');
      fetchSuggestions();
      if (onRefreshTrigger) onRefreshTrigger();
    } catch (err) {
      console.error(err);
      onShowToast('تعذر معالجة الطلب', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا السجل نهائياً؟')) return;
    try {
      await deleteDoc(doc(db, 'edit_suggestions', id));
      onShowToast('تم حذف السجل بنجاح');
      fetchSuggestions();
      if (onRefreshTrigger) onRefreshTrigger();
    } catch (err) {
      console.error(err);
      onShowToast('تعذر حذف السجل', 'error');
    }
  };

  const filteredSuggestions = suggestions.filter(s => {
    const matchesFilter = filter === 'all' || s.status === filter;
    const matchesSearch = s.businessName.toLowerCase().includes(search.toLowerCase()) || 
                          (s.userEmail && s.userEmail.toLowerCase().includes(search.toLowerCase())) ||
                          (s.suggestedChanges.notes && s.suggestedChanges.notes.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Search and Filters Bar */}
      <div className="bg-white p-5 rounded-3xl border border-[#e5e1da] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث باسم المحل أو البريد الإلكتروني أو الملاحظات..."
            className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-10 pl-4 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'all', label: `الكل (${suggestions.length})` },
            { id: 'pending', label: `قيد الانتظار (${suggestions.filter(s => s.status === 'pending').length})` },
            { id: 'approved', label: `مقبول (${suggestions.filter(s => s.status === 'approved').length})` },
            { id: 'rejected', label: `مرفوض (${suggestions.filter(s => s.status === 'rejected').length})` }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setFilter(opt.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                filter === opt.id
                  ? 'bg-[#1a4d2e] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-[#e5e1da]">
          <div className="w-8 h-8 rounded-full border-2 border-[#1a4d2e]/25 border-t-[#1a4d2e] animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-stone-500 mt-3">جاري تحميل اقتراحات التعديل...</p>
        </div>
      ) : filteredSuggestions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#e5e1da] space-y-3">
          <Edit3 className="h-12 w-12 text-stone-300 mx-auto" />
          <h3 className="font-bold text-stone-700">لا توجد اقتراحات مطابقة</h3>
          <p className="text-xs text-stone-500">سيظهر هنا أي اقتراح تعديل يرسله زوار المنصة</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredSuggestions.map((s) => (
            <div 
              key={s.id} 
              className={`bg-white p-6 rounded-3xl border transition-all shadow-xs flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center ${
                s.status === 'pending' ? 'border-amber-300 bg-amber-50/10' : 'border-[#e5e1da]'
              }`}
            >
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h4 className="text-base sm:text-lg font-black text-[#2d2a26]">{s.businessName}</h4>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                    s.status === 'pending'
                      ? 'bg-amber-100 text-amber-800'
                      : s.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {s.status === 'pending' ? 'قيد الانتظار' : s.status === 'approved' ? 'مقبول ومطّبق' : 'مرفوض'}
                  </span>
                  <span className="text-[11px] text-stone-400 font-bold">
                    {s.createdAt ? new Date(s.createdAt).toLocaleDateString('ar-JO', { dateStyle: 'medium' }) : ''}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4.5 bg-stone-50 rounded-2xl border border-stone-200/60 text-xs">
                  {s.suggestedChanges.phone && (
                    <div className="space-y-0.5">
                      <span className="text-stone-400 font-bold flex items-center gap-1">
                        <Phone className="h-3 w-3 text-emerald-600" />
                        الهاتف المقترح:
                      </span>
                      <span className="font-mono text-stone-800 font-bold text-sm" dir="ltr">{s.suggestedChanges.phone}</span>
                    </div>
                  )}

                  {s.suggestedChanges.address && (
                    <div className="space-y-0.5 md:col-span-2">
                      <span className="text-stone-400 font-bold flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-red-500" />
                        العنوان المقترح:
                      </span>
                      <span className="text-stone-800 font-bold">{s.suggestedChanges.address}</span>
                    </div>
                  )}

                  {s.suggestedChanges.workingHours && (
                    <div className="space-y-0.5">
                      <span className="text-stone-400 font-bold flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-500" />
                        ساعات العمل:
                      </span>
                      <span className="text-stone-800 font-bold">{s.suggestedChanges.workingHours}</span>
                    </div>
                  )}

                  {s.suggestedChanges.notes && (
                    <div className="md:col-span-3 border-t border-stone-200/60 pt-2 mt-1 space-y-1">
                      <span className="text-[#1a4d2e] font-black">سبب وتفاصيل التعديل:</span>
                      <p className="text-stone-600 leading-relaxed bg-white p-3 rounded-xl border border-stone-150 font-medium">{s.suggestedChanges.notes}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-stone-400">
                  <span>المقترح بواسطة:</span>
                  <span className="text-stone-600 font-black">{s.userEmail || 'زائر غير مسجل'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch lg:self-center">
                {s.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => handleApply(s)}
                      className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 bg-[#1a4d2e] hover:bg-[#143e25] text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4 text-[#ff9f1c]" />
                      <span>اعتماد وتعديل تلقائي</span>
                    </button>
                    <button
                      onClick={() => handleReject(s.id)}
                      className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 px-3.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>رفض</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-2.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer mr-auto lg:mr-0"
                    title="حذف هذا السجل"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
