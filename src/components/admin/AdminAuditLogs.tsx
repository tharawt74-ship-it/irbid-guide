import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  ShieldCheck, 
  User, 
  Clock, 
  FileText, 
  Download, 
  Sparkles, 
  RefreshCw,
  CheckCircle2,
  Tag,
  AlertCircle
} from 'lucide-react';
import { fetchAuditLogsFromFirestore, AuditLog } from '../../lib/auditLogHelper';

interface AdminAuditLogsProps {
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export function AdminAuditLogs({ onShowToast }: AdminAuditLogsProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchAuditLogsFromFirestore();
      setLogs(data);
    } catch (e) {
      console.error('Error loading audit logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchDetails = log.details?.toLowerCase().includes(q);
        const matchAction = log.actionAr?.toLowerCase().includes(q);
        const matchUser = log.performedBy?.toLowerCase().includes(q);
        const matchTarget = log.targetName?.toLowerCase().includes(q);
        return matchDetails || matchAction || matchUser || matchTarget;
      }
      return true;
    });
  }, [logs, actionFilter, searchQuery]);

  const handleExportLogsJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `audit_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onShowToast('تم تصدير سجل الأنشطة بنموذج JSON 📥');
  };

  const handleExportLogsCsv = () => {
    if (filteredLogs.length === 0) {
      onShowToast('لا توجد سجلات لتصديرها حالياً', 'info');
      return;
    }

    const headers = ['معرف الإجراء', 'نوع العملية', 'الوصف والتفاصيل', 'اسم الهدف', 'بواسطة', 'التاريخ والوقت'];
    const rows = filteredLogs.map(l => [
      l.id,
      `"${(l.actionAr || l.action || '').replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${(l.targetName || '').replace(/"/g, '""')}"`,
      `"${(l.performedBy || '').replace(/"/g, '""')}"`,
      `"${new Date(l.timestamp).toLocaleString('ar-JO')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `سجل_العمليات_إربد_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('تم تصدير سجل العمليات والأنشطة كملف CSV بنجاح 📊');
  };

  const getBadgeColor = (action: string) => {
    switch (action) {
      case 'VERIFY_BUSINESS':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'UPDATE_VIP':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'SUPERVISOR_PERMS':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'BROADCAST_NOTIFICATION':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'EDIT_NEWS':
        return 'bg-stone-100 text-stone-800 border-stone-300';
      default:
        return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Title & Stats */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center font-bold">
            <History className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#2d2a26]">سجل الأنشطة والعمليات (Audit Logs)</h2>
            <p className="text-xs text-stone-500">تتبع زمني لكافة الإجراءات والتغييرات الإدارية المصرح بها داخل المنصة</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadLogs}
            className="inline-flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث السجل</span>
          </button>

          <button
            onClick={handleExportLogsCsv}
            className="inline-flex items-center gap-1.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Download className="h-3.5 w-3.5 text-[#ff9f1c]" />
            <span>تصدير ملف CSV (جدول Excel)</span>
          </button>

          <button
            onClick={handleExportLogsJson}
            className="inline-flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="بحث في السجلات والعمليات والمستخدمين..."
            className="w-full bg-stone-50 text-stone-900 pr-10 pl-4 py-2 rounded-xl text-xs font-bold border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="h-4 w-4 text-stone-400 shrink-0" />
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="bg-stone-50 border border-stone-200 text-stone-800 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
          >
            <option value="all">جميع أنواع الإجراءات والعمليات</option>
            <option value="VERIFY_BUSINESS">توثيق وتسجيل المحلات</option>
            <option value="UPDATE_VIP">ترقية الباقات المميزة VIP</option>
            <option value="SUPERVISOR_PERMS">تعديل صلاحيات المشرفين</option>
            <option value="BROADCAST_NOTIFICATION">إرسال الإشعارات الجماعية</option>
            <option value="EDIT_NEWS">إدارة ونشر الأخبار</option>
          </select>
        </div>
      </div>

      {/* Timeline List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-200">
            <RefreshCw className="h-8 w-8 text-[#1a4d2e] animate-spin mx-auto mb-2" />
            <p className="text-xs font-bold text-stone-500">جاري قراءة سجل العمليات الإدارية...</p>
          </div>
        ) : filteredLogs.length > 0 ? (
          filteredLogs.map((log) => (
            <div key={log.id} className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-amber-400/50 transition-all">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-700 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="h-5 w-5 text-[#1a4d2e]" />
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${getBadgeColor(log.action)}`}>
                      {log.actionAr || log.action}
                    </span>
                    {log.targetName && (
                      <span className="text-xs font-black text-stone-800 bg-stone-100 px-2 py-0.5 rounded-md">
                        {log.targetName}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-stone-700 font-medium leading-relaxed">
                    {log.details}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-stone-400 pt-1">
                    <span className="flex items-center gap-1 font-bold text-stone-600">
                      <User className="h-3 w-3 text-[#1a4d2e]" />
                      بواسطة: {log.performedBy}
                    </span>
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" />
                      {new Date(log.timestamp).toLocaleString('ar-JO')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-stone-300">
            <History className="h-10 w-10 text-stone-300 mx-auto mb-2" />
            <p className="text-stone-500 font-bold text-sm">لا توجد عمليات مسجلة تطابق فلتر البحث الحالية</p>
          </div>
        )}
      </div>
    </div>
  );
}
