import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Store, 
  User, 
  Phone, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  DollarSign, 
  Eye, 
  RefreshCw,
  XCircle,
  Truck,
  UtensilsCrossed
} from 'lucide-react';
import { WhatsAppIcon } from '../common/WhatsAppIcon';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, updateDoc } from 'firebase/firestore';

interface CentralOrdersMonitorProps {
  showToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export function CentralOrdersMonitor({ showToast }: CentralOrdersMonitorProps) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  useEffect(() => {
    if (!db) return;
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setOrders(list);
          setLoading(false);
        },
        (error) => {
          console.warn('Orders listener notice:', error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.warn('Orders setup warning:', e);
      setLoading(false);
    }
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: Date.now()
      });
      showToast(`تم تحديث حالة الطلب إلى (${newStatus})`);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev: any) => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      showToast('فشل تحديث حالة الطلب', 'error');
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchStore = (o.businessName || '').toLowerCase().includes(q);
        const matchCustomer = (o.customerName || o.customerPhone || o.phone || '').toLowerCase().includes(q);
        const matchId = (o.id || '').toLowerCase().includes(q);
        return matchStore || matchCustomer || matchId;
      }
      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  // WhatsApp Contact Helper
  const getWhatsAppUrl = (phone?: string, text?: string) => {
    if (!phone) return '#';
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('07')) clean = '962' + clean.substring(1);
    else if (clean.startsWith('7')) clean = '962' + clean;
    return `https://wa.me/${clean}?text=${encodeURIComponent(text || '')}`;
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-blue-50 text-blue-700 font-bold">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-black text-stone-900">مراقب الطلبات الحية للمطاعم والمتاجر</h3>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            متابعة فورية ومباشرة لحركة الطلبات الرقمية بين الزبائن والمطاعم في إربد ومساعدة الأطراف في حال وجود شكوى.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="bg-blue-50 text-blue-800 border border-blue-200 px-3.5 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span>{orders.filter(o => o.status === 'pending' || o.status === 'preparing').length} طلب نشط</span>
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم الطلب، اسم المطعم، أو هاتف الزبون..."
            className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-10 pl-4 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-700 focus:outline-none w-full sm:w-auto"
        >
          <option value="all">كافة الحالات ({orders.length})</option>
          <option value="pending">بانتظار التأكيد (جديد)</option>
          <option value="preparing">قيد التحضير والتجهيز</option>
          <option value="completed">مكتمل ومستلم</option>
          <option value="cancelled">ملغي</option>
        </select>
      </div>

      {/* Orders List Table */}
      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center text-xs font-bold text-stone-400">
          جاري مراقبة الطلبات الحية...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center space-y-2">
          <ShoppingBag className="h-10 w-10 text-stone-300 mx-auto" />
          <h4 className="text-sm font-black text-stone-700">لا توجد طلبات حية مطابقة</h4>
          <p className="text-xs text-stone-400">عند قيام الزبائن بالطلب من المطاعم المسجلة ستظهر هنا مباشرة وبشكل حي</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-black">
                <tr>
                  <th className="p-4">رقم الطلب</th>
                  <th className="p-4">المطعم / المحل</th>
                  <th className="p-4">الزبون والهاتف</th>
                  <th className="p-4">نوع الطلب</th>
                  <th className="p-4">الإجمالي</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4 text-center">التفاصيل والتواصل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredOrders.map(order => {
                  const status = order.status || 'pending';
                  const total = order.totalAmount || order.total || 0;

                  return (
                    <tr key={order.id} className="hover:bg-stone-50 transition-colors">
                      <td className="p-4">
                        <span className="font-mono font-bold text-stone-700">
                          #{order.id ? order.id.substring(0, 7) : 'ORD'}
                        </span>
                        <div className="text-[10px] text-stone-400 font-mono">
                          {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-stone-800 flex items-center gap-1">
                          <Store className="h-3.5 w-3.5 text-stone-400" />
                          <span>{order.businessName || 'مطعم بإربد'}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-stone-800 flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-stone-400" />
                          <span>{order.customerName || order.userName || 'زبون'}</span>
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono">{order.customerPhone || order.phone || '-'}</div>
                      </td>

                      <td className="p-4">
                        <span className="bg-stone-100 text-stone-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          {order.orderType === 'delivery' ? 'توصيل' : order.orderType === 'table' ? 'طاولة' : 'استلام من المحل'}
                        </span>
                      </td>

                      <td className="p-4">
                        <span className="font-black text-stone-900 font-sans text-xs">
                          {total} <span className="text-[10px] text-stone-500 font-normal">د.أ</span>
                        </span>
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        {status === 'pending' ? (
                          <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2.5 py-1 rounded-full">
                            بانتظار التأكيد
                          </span>
                        ) : status === 'preparing' ? (
                          <span className="bg-blue-100 text-blue-900 text-[10px] font-bold px-2.5 py-1 rounded-full">
                            قيد التحضير
                          </span>
                        ) : status === 'completed' ? (
                          <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2.5 py-1 rounded-full">
                            مكتمل
                          </span>
                        ) : (
                          <span className="bg-red-100 text-red-900 text-[10px] font-bold px-2.5 py-1 rounded-full">
                            ملغي
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="bg-[#1a4d2e] hover:bg-[#133b22] text-white text-[11px] font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
                        >
                          عرض وتدخل
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Details & Intervene Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 border border-stone-200 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h4 className="font-black text-base text-stone-900">تفاصيل الطلب #{selectedOrder.id ? selectedOrder.id.substring(0, 8) : ''}</h4>
                <p className="text-[11px] text-stone-500">{selectedOrder.businessName}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-stone-400 hover:text-stone-700 text-xs font-bold"
              >
                إغلاق
              </button>
            </div>

            {/* Customer Info */}
            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">اسم الزبون:</span>
                <span className="font-bold text-stone-900">{selectedOrder.customerName || selectedOrder.userName || 'غير محدد'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">رقم الهاتف:</span>
                <span className="font-mono font-bold text-stone-900">{selectedOrder.customerPhone || selectedOrder.phone || 'غير محدد'}</span>
              </div>
              {selectedOrder.deliveryAddress && (
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">عنوان التوصيل:</span>
                  <span className="font-bold text-stone-900">{selectedOrder.deliveryAddress}</span>
                </div>
              )}
            </div>

            {/* Items List */}
            <div className="space-y-2">
              <h5 className="font-black text-xs text-stone-800">العناصر المطلوبة:</h5>
              <div className="divide-y divide-stone-100 border border-stone-200 rounded-2xl p-2 max-h-40 overflow-y-auto">
                {Array.isArray(selectedOrder.items) && selectedOrder.items.map((it: any, idx: number) => (
                  <div key={idx} className="py-2 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-stone-900">{it.name || it.title}</span>
                      <span className="text-stone-400 mx-1">×</span>
                      <span className="font-mono text-stone-700">{it.quantity || 1}</span>
                    </div>
                    <span className="font-mono font-bold text-stone-900">{it.price || 0} د.أ</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Update */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-stone-100">
              <span className="text-xs font-bold text-stone-600">تحديث الحالة:</span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'preparing')}
                  className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold"
                >
                  قيد التحضير
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'completed')}
                  className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold"
                >
                  مكتمل
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.id, 'cancelled')}
                  className="px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-xs font-bold"
                >
                  إلغاء الطلب
                </button>
              </div>
            </div>

            {/* Direct WhatsApp Contact Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <a
                href={getWhatsAppUrl(selectedOrder.customerPhone || selectedOrder.phone, `مرحباً بك بخصوص طلبك من منصة شو في بإربد رقم #${selectedOrder.id}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-xl text-center flex items-center justify-center gap-1.5"
              >
                <WhatsAppIcon className="h-4 w-4 fill-white" />
                <span>مراسلة الزبون</span>
              </a>

              <a
                href={getWhatsAppUrl(selectedOrder.businessPhone, `مرحباً إدارة ${selectedOrder.businessName} بخصوص طلب الزبون رقم #${selectedOrder.id}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-stone-800 hover:bg-stone-900 text-white text-xs font-bold py-2 rounded-xl text-center flex items-center justify-center gap-1.5"
              >
                <WhatsAppIcon className="h-4 w-4 fill-white" />
                <span>مراسلة المطعم</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
