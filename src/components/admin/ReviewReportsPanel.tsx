import React, { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { ReviewReport } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { recordAuditLog } from '../../lib/auditLogHelper';
import { ShieldAlert, Trash2, CheckCircle2, Search, Sparkles, MessageSquare, AlertTriangle } from 'lucide-react';

interface ReviewReportsPanelProps {
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  onRefreshTrigger?: () => void;
}

export function ReviewReportsPanel({ onShowToast, onRefreshTrigger }: ReviewReportsPanelProps) {
  const { currentUser } = useAuth();
  const [reports, setReports] = useState<ReviewReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved_dismissed' | 'resolved_deleted'>('all');
  const [search, setSearch] = useState('');

  const fetchReports = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'review_reports'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const fetched: ReviewReport[] = [];
      snap.forEach(d => {
        fetched.push({ id: d.id, ...d.data() } as ReviewReport);
      });
      setReports(fetched);
    } catch (err) {
      console.error("Error fetching review reports:", err);
      onShowToast('حدث خطأ أثناء تحميل البلاغات', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDismiss = async (id: string) => {
    try {
      await updateDoc(doc(db, 'review_reports', id), { status: 'resolved_dismissed' });
      onShowToast('تم إهمال البلاغ وحفظ التقييم كموثوق');
      fetchReports();
      if (onRefreshTrigger) onRefreshTrigger();
    } catch (err) {
      console.error(err);
      onShowToast('تعذر تحديث البلاغ', 'error');
    }
  };

  const handleDeleteReview = async (report: ReviewReport) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التقييم نهائياً من دليل المحل؟')) return;
    try {
      // 1. Delete the review from the global reviews collection
      const reviewRef = doc(db, 'reviews', report.reviewId);
      await deleteDoc(reviewRef);

      // 2. Mark report status as deleted
      await updateDoc(doc(db, 'review_reports', report.id), { status: 'resolved_deleted' });

      // 3. Record Audit Log
      await recordAuditLog({
        performedBy: currentUser?.email || 'admin@irbid.com',
        action: 'EDIT_NEWS',
        actionAr: 'حذف تقييم بلّغ عنه',
        details: `حذف التقييم المبلغ عنه للمحل ${report.businessName}: ${report.reviewComment}`,
        targetName: report.businessName,
        timestamp: Date.now()
      });

      onShowToast('تم حذف التقييم المسيء وتحديث البلاغ بنجاح 🛡️');
      fetchReports();
      if (onRefreshTrigger) onRefreshTrigger();
    } catch (err) {
      console.error("Error deleting reported review:", err);
      onShowToast('تعذر حذف التقييم', 'error');
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من مسح سجل البلاغ هذا نهائياً؟')) return;
    try {
      await deleteDoc(doc(db, 'review_reports', id));
      onShowToast('تم حذف البلاغ');
      fetchReports();
      if (onRefreshTrigger) onRefreshTrigger();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesFilter = filter === 'all' || r.status === filter;
    const matchesSearch = r.businessName.toLowerCase().includes(search.toLowerCase()) ||
                          r.reviewComment.toLowerCase().includes(search.toLowerCase()) ||
                          r.reason.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-3xl border border-[#e5e1da] shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث باسم المحل، محتوى التقييم، أو سبب البلاغ..."
            className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-10 pl-4 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'all', label: `الكل (${reports.length})` },
            { id: 'pending', label: `قيد الانتظار (${reports.filter(r => r.status === 'pending').length})` },
            { id: 'resolved_deleted', label: `تم الحذف (${reports.filter(r => r.status === 'resolved_deleted').length})` },
            { id: 'resolved_dismissed', label: `تم الإهمال والحفظ (${reports.filter(r => r.status === 'resolved_dismissed').length})` }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setFilter(opt.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                filter === opt.id
                  ? 'bg-rose-700 text-white shadow-xs'
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
          <div className="w-8 h-8 rounded-full border-2 border-rose-600/25 border-t-rose-600 animate-spin mx-auto"></div>
          <p className="text-xs font-bold text-stone-500 mt-3">جاري تحميل بلاغات التقييمات...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#e5e1da] space-y-3">
          <ShieldAlert className="h-12 w-12 text-stone-300 mx-auto" />
          <h3 className="font-bold text-stone-700">لا توجد بلاغات مراجعات حالياً</h3>
          <p className="text-xs text-stone-500">سيظهر هنا أي تقييم يبلغ عنه زوار التطبيق كإساءة أو تقييم كيدي</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredReports.map((r) => (
            <div 
              key={r.id} 
              className={`bg-white p-6 rounded-3xl border transition-all shadow-xs flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center ${
                r.status === 'pending' ? 'border-rose-300 bg-rose-50/10' : 'border-[#e5e1da]'
              }`}
            >
              <div className="space-y-3 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h4 className="text-base sm:text-lg font-black text-rose-950">{r.businessName}</h4>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                    r.status === 'pending'
                      ? 'bg-rose-100 text-rose-800'
                      : r.status === 'resolved_dismissed'
                      ? 'bg-stone-100 text-stone-600'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {r.status === 'pending' ? 'قيد المراجعة' : r.status === 'resolved_dismissed' ? 'تم حفظ التقييم' : 'تم حذف التقييم المسيء'}
                  </span>
                  <span className="text-[11px] text-stone-400 font-bold">
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-JO', { dateStyle: 'medium' }) : ''}
                  </span>
                </div>

                <div className="space-y-3 p-4.5 bg-stone-50 rounded-2xl border border-stone-200/60 text-xs">
                  <div>
                    <span className="text-stone-400 font-bold flex items-center gap-1 mb-1">
                      <MessageSquare className="h-3.5 w-3.5 text-stone-400" />
                      محتوى التقييم المسيء:
                    </span>
                    <blockquote className="text-stone-700 italic border-r-4 border-stone-300 pr-3.5 py-1 text-sm font-medium">
                      "{r.reviewComment}"
                    </blockquote>
                    <span className="text-[10px] text-stone-400 block mt-1">بواسطة الكاتب: <strong className="text-stone-600">{r.reviewAuthorName}</strong></span>
                  </div>

                  <div className="border-t border-stone-200 pt-2.5 space-y-1">
                    <span className="text-rose-700 font-black flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                      السبب والشكوى المقترحة من الزبون:
                    </span>
                    <p className="text-stone-800 leading-relaxed font-bold bg-white p-3 rounded-xl border border-stone-150">{r.reason}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-stone-400">
                  <span>المبلِّغ:</span>
                  <span className="text-stone-600 font-bold font-mono text-[11px]">{r.reportedByEmail || r.reportedByUid}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch lg:self-center">
                {r.status === 'pending' ? (
                  <>
                    <button
                      onClick={() => handleDeleteReview(r)}
                      className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-xs cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>حذف التقييم من المنصة</span>
                    </button>
                    <button
                      onClick={() => handleDismiss(r.id)}
                      className="flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 px-3.5 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>إهمال وحفظ البلاغ</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleDeleteRecord(r.id)}
                    className="p-2.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer mr-auto lg:mr-0"
                    title="حذف هذا البلاغ"
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
