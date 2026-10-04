import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  addDoc, 
  updateDoc,
  deleteDoc,
  query, 
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  DollarSign, 
  Plus, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  TrendingUp, 
  Clock, 
  Search 
} from 'lucide-react';

interface OfflineBillingManagerProps {
  showToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export function OfflineBillingManager({ showToast }: OfflineBillingManagerProps) {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form State
  const [businessName, setBusinessName] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('زين كاش');
  const [serviceType, setServiceType] = useState('ترقية VIP');
  const [status, setStatus] = useState('مدفوع');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      if (!db) return;
      const snap = await getDocs(query(collection(db, 'offline_payments'), orderBy('createdAt', 'desc'), limit(50)));
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPayments(list);
    } catch (error) {
      console.error('Error fetching offline payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim() || !amount.trim() || !db) {
      showToast('يرجى كتابة اسم المنشأة وتحديد قيمة الفاتورة المرجعية', 'error');
      return;
    }

    try {
      setSaving(true);
      const paymentData = {
        businessName: businessName.trim(),
        amount: parseFloat(amount),
        paymentMethod,
        serviceType,
        status,
        notes: notes.trim(),
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'offline_payments'), paymentData);
      showToast('تم تسجيل وإصدار الفاتورة المرجعية يدوياً بنجاح بالمنظومة', 'success');
      
      // Reset Form
      setBusinessName('');
      setAmount('');
      setNotes('');
      
      fetchPayments();
    } catch (err) {
      console.error('Error saving payment record:', err);
      showToast('حدث خطأ أثناء تسجيل العملية المالية يدوياً', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (paymentId: string, newStatus: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'offline_payments', paymentId), { status: newStatus });
      showToast('تم تحديث حالة الفاتورة يدوياً بنجاح بالمنظومة', 'success');
      fetchPayments();
    } catch (err) {
      console.error('Error updating payment status:', err);
      showToast('حدث خطأ أثناء تحديث الفاتورة المرجعية', 'error');
    }
  };

  const handleDeleteRecord = async (paymentId: string) => {
    if (!db) return;
    if (!window.confirm('هل أنت متأكد من حذف هذه الفاتورة والسجل المالي نهائياً؟')) return;

    try {
      await deleteDoc(doc(db, 'offline_payments', paymentId));
      showToast('تم إقصاء السجل المالي من السحابة بنجاح', 'info');
      fetchPayments();
    } catch (err) {
      console.error('Error deleting payment:', err);
      showToast('حدث خطأ أثناء مسح الفاتورة السحابية', 'error');
    }
  };

  const totalCollected = payments
    .filter(p => p.status === 'مدفوع')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalPending = payments
    .filter(p => p.status === 'معلق')
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const filteredPayments = payments.filter(p =>
    p.businessName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.serviceType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6" dir="rtl">
      {/* Overview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-stone-200/60 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-stone-400">إجمالي المبالغ المحصلة (يدوياً)</h4>
            <p className="text-xl font-black text-stone-800 font-mono">{totalCollected} دينار</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200/60 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-stone-400">الفواتير المعلقة بانتظار التحصيل</h4>
            <p className="text-xl font-black text-stone-800 font-mono">{totalPending} دينار</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-stone-200/60 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-2xl text-red-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-stone-400">الاشتراكات المتعثرة والذمم</h4>
            <p className="text-xl font-black text-stone-800 font-mono">
              {payments.filter(p => p.status === 'متعثر').length} اشتراكات
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form to Log Payment */}
        <div className="bg-white p-6 rounded-3xl border border-stone-200/60 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-black text-base text-stone-800">تسجيل فاتورة وتحصيل يدوي</h3>
            <p className="text-xs text-stone-400">تسجيل مدفوعات باقات الـ VIP أو الدعاية الورقية والميدانية التي تتم كاش</p>
          </div>

          <form onSubmit={handleLogPayment} className="space-y-4 text-xs font-bold text-stone-700">
            <div className="space-y-1">
              <label className="text-stone-600 block">اسم المنشأة أو المحل التجاري</label>
              <input
                type="text"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder="مثال: مطعم شاورما الصاج الذهبي"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-stone-600 block">قيمة الاشتراك (بالدينار JOD)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="25"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#1a4d2e] font-mono"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-stone-600 block">نوع الخدمة المفعلة</label>
                <select
                  value={serviceType}
                  onChange={e => setServiceType(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
                >
                  <option value="ترقية VIP">ترقية VIP</option>
                  <option value="صدارة البحث">تعزيز صدارة البحث</option>
                  <option value="ملصقات QR">بوسترات QR مطبوعة</option>
                  <option value="بانر إعلاني">بانر ترويجي</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-stone-600 block">قناة السداد اليدوي</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
                >
                  <option value="زين كاش">زين كاش (Zain Cash)</option>
                  <option value="نقدي مباشر">نقدي مباشر (كاش)</option>
                  <option value="حوالة بنكية">حوالة بنكية (كليك)</option>
                  <option value="بوابة إلكترونية">بوابة الدفع</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-stone-600 block">حالة الفاتورة الابتدائية</label>
                <select
                  value={status}
                  onChange={e => setStatus(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-700 focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
                >
                  <option value="مدفوع">مدفوع ومحصل</option>
                  <option value="معلق">معلق بالانتظار</option>
                  <option value="متعثر">متعثر أو ذمة مالية</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-stone-600 block">ملاحظات الفاتورة والتفاصيل</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="تفاصيل رقم الحوالة، اسم الموظف المستلم..."
                rows={2}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#1a4d2e] resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#1a4d2e] hover:bg-[#133b22] text-white py-3 rounded-xl font-black transition-colors text-center disabled:opacity-50 cursor-pointer"
            >
              {saving ? 'جاري توثيق الدفعة...' : 'توثيق وإصدار الفاتورة'}
            </button>
          </form>
        </div>

        {/* Payments Table */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-stone-200/60 shadow-xs space-y-4">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="font-black text-base text-stone-800">دفتر الحسابات والتحصيلات اليدوية</h3>
            <p className="text-xs text-stone-400">تتبع ومراجعة فواتير الذمم والاشتراكات لشركاء المنصة بالمدينة</p>
          </div>

          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="البحث برقم الفاتورة، اسم المحل، أو الخدمة..."
              className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-10 pl-4 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
            />
          </div>

          {loading ? (
            <div className="py-24 text-center text-stone-400 font-bold">جاري تحميل المعاملات المحصلة...</div>
          ) : filteredPayments.length === 0 ? (
            <div className="py-24 text-center text-stone-400 border border-dashed border-stone-200 rounded-3xl">
              <FileText className="h-10 w-10 mx-auto mb-2 text-stone-300" />
              <p className="text-xs">لا يوجد حركات مدفوعات يدوية مسجلة حالياً بالملف السحابي</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-stone-100 text-stone-400 font-bold">
                    <th className="py-3 px-2">المنشأة والخدمة</th>
                    <th className="py-3 px-2">القيمة وطريقة السداد</th>
                    <th className="py-3 px-2">الحالة</th>
                    <th className="py-3 px-2">تاريخ الفاتورة</th>
                    <th className="py-3 px-2 text-left">التحكم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-bold text-stone-700">
                  {filteredPayments.map(pay => (
                    <tr key={pay.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="py-3 px-2">
                        <div className="font-black text-stone-800">{pay.businessName}</div>
                        <div className="text-[10px] text-stone-400">{pay.serviceType}</div>
                      </td>
                      <td className="py-3 px-2 font-mono">
                        <div className="text-xs font-black text-emerald-700">{pay.amount || 0} دينار</div>
                        <div className="text-[10px] text-stone-400 font-bold">{pay.paymentMethod}</div>
                      </td>
                      <td className="py-3 px-2">
                        {pay.status === 'مدفوع' ? (
                          <span className="inline-flex items-center bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px]">
                            مدفوع
                          </span>
                        ) : pay.status === 'معلق' ? (
                          <span className="inline-flex items-center bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full text-[10px]">
                            معلق
                          </span>
                        ) : (
                          <span className="inline-flex items-center bg-red-50 text-red-700 px-2.5 py-0.5 rounded-full text-[10px]">
                            متعثر
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-2 font-mono text-[11px] text-stone-500">
                        {pay.createdAt ? new Date(pay.createdAt).toLocaleDateString('ar-JO') : '-'}
                      </td>
                      <td className="py-3 px-2 text-left">
                        <div className="flex items-center justify-end gap-1.5">
                          {pay.status !== 'مدفوع' && (
                            <button
                              onClick={() => handleUpdateStatus(pay.id, 'مدفوع')}
                              className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors"
                            >
                              تسديد الفاتورة
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteRecord(pay.id)}
                            className="text-stone-400 hover:text-red-500 p-1.5 rounded-lg transition-colors"
                            title="حذف القيد المالي"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
