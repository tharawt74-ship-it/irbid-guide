import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Plus, 
  Search, 
  Trash2, 
  Phone, 
  UserX, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  X
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';

interface BlacklistSpamManagerProps {
  showToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export function BlacklistSpamManager({ showToast }: BlacklistSpamManagerProps) {
  const [blacklist, setBlacklist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetPhone, setTargetPhone] = useState('');
  const [targetName, setTargetName] = useState('');
  const [reason, setReason] = useState('تقييمات وهمية ومضللة');
  const [saving, setSaving] = useState(false);

  const fetchBlacklist = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'blacklist'), orderBy('createdAt', 'desc'), limit(100)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setBlacklist(list);
    } catch (err) {
      console.error('Error fetching blacklist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlacklist();
  }, []);

  const handleAddBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !targetPhone.trim()) return;

    setSaving(true);
    try {
      await addDoc(collection(db, 'blacklist'), {
        phone: targetPhone.trim(),
        name: targetName.trim() || 'مستخدم محظور',
        reason: reason.trim(),
        createdAt: Date.now()
      });

      showToast(`تم إدراج الرقم (${targetPhone}) في القائمة السوداء بنجاح`);
      setIsModalOpen(false);
      setTargetPhone('');
      setTargetName('');
      fetchBlacklist();
    } catch (err) {
      console.error('Error adding to blacklist:', err);
      showToast('فشل إضافة الرقم للقائمة السوداء', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveBlock = async (item: any) => {
    if (!db) return;
    if (!window.confirm(`هل أنت متأكد من إلغاء حظر الرقم (${item.phone}) واستعادة صلاحياته؟`)) return;

    try {
      await deleteDoc(doc(db, 'blacklist', item.id));
      showToast(`تم إلغاء حظر (${item.phone}) بنجاح`);
      setBlacklist(prev => prev.filter(b => b.id !== item.id));
    } catch (err) {
      console.error('Error deleting from blacklist:', err);
      showToast('فشل إلغاء الحظر', 'error');
    }
  };

  const filteredList = blacklist.filter(item => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchPhone = (item.phone || '').toLowerCase().includes(q);
      const matchName = (item.name || '').toLowerCase().includes(q);
      const matchReason = (item.reason || '').toLowerCase().includes(q);
      return matchPhone || matchName || matchReason;
    }
    return true;
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-red-50 text-red-700 font-bold">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-black text-stone-900">القائمة السوداء ومكافحة الأرقام المزعجة</h3>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            حظر الأرقام والحسابات المزعجة لمنعهم من كتابة تقييمات وهمية أو إرسال طلبات احتيالية على المنصة.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-2xl text-xs font-black transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>إضافة رقم للحظر</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="البحث بالرقم، الاسم، أو سبب الحظر..."
            className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-10 pl-4 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <span className="text-xs font-bold text-stone-400">
          إجمالي المحظورين: <strong className="text-red-700 font-mono">{blacklist.length}</strong>
        </span>
      </div>

      {/* Blacklist Table */}
      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center text-xs font-bold text-stone-400">
          جاري تحميل القائمة السوداء...
        </div>
      ) : filteredList.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center space-y-2">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
          <h4 className="text-sm font-black text-stone-700">لا توجد أرقام محظورة حالياً</h4>
          <p className="text-xs text-stone-400">المنظومة خالية من الأرقام المحظورة، يمكنك إضافة أي رقم مسيء في أي وقت</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-black">
                <tr>
                  <th className="p-4">الرقم المحظور</th>
                  <th className="p-4">الاسم / الحساب</th>
                  <th className="p-4">سبب الإدراج في الحظر</th>
                  <th className="p-4">تاريخ الحظر</th>
                  <th className="p-4 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredList.map(item => (
                  <tr key={item.id} className="hover:bg-red-50/20 transition-colors">
                    <td className="p-4">
                      <div className="font-mono font-black text-xs text-red-700 flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-red-500" />
                        <span>{item.phone}</span>
                      </div>
                    </td>

                    <td className="p-4 font-bold text-stone-800">
                      {item.name || 'مستخدم محظور'}
                    </td>

                    <td className="p-4 text-stone-600">
                      <span className="bg-red-50 text-red-800 border border-red-200 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                        {item.reason || 'إساءة استخدام'}
                      </span>
                    </td>

                    <td className="p-4 text-stone-400 font-mono text-[11px]">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('ar-JO') : '-'}
                    </td>

                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleRemoveBlock(item)}
                        className="bg-stone-100 hover:bg-emerald-50 text-stone-600 hover:text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-stone-200"
                        title="إلغاء الحظر"
                      >
                        إلغاء الحظر
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add to Blacklist Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-stone-200 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h4 className="font-black text-base text-red-800 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-red-600" />
                <span>إدراج رقم في القائمة السوداء</span>
              </h4>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddBlock} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">رقم الهاتف المراد حظره</label>
                <input
                  type="text"
                  required
                  value={targetPhone}
                  onChange={e => setTargetPhone(e.target.value)}
                  placeholder="079XXXXXXX"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">اسم صاحب الرقم (اختياري)</label>
                <input
                  type="text"
                  value={targetName}
                  onChange={e => setTargetName(e.target.value)}
                  placeholder="اسم الشخص أو المعرف إن وجد"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-900 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">سبب الحظر</label>
                <select
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-800 focus:outline-none"
                >
                  <option value="تقييمات وهمية ومضللة">تقييمات وهمية ومضللة</option>
                  <option value="طلبات شراء وهمية وغير جادة">طلبات شراء وهمية وغير جادة</option>
                  <option value="إساءة وإزعاج أصحاب المحلات">إساءة وإزعاج أصحاب المحلات</option>
                  <option value="مخالفة عامة لشروط الخدمة">مخالفة عامة لشروط الخدمة</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-red-600 hover:bg-red-700 text-white transition-colors shadow-xs disabled:opacity-50"
                >
                  {saving ? 'جاري الإدراج...' : 'تأكيد الحظر'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
