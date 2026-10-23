import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc,
  where 
} from 'firebase/firestore';
import { 
  ShoppingBag, 
  Trash2, 
  Search, 
  Eye, 
  ExternalLink, 
  TrendingUp, 
  Check, 
  X, 
  Filter, 
  FileText, 
  User, 
  Phone, 
  Receipt 
} from 'lucide-react';
import { Business, MenuItem } from '../../types';

interface OrderItem {
  id: string;
  businessId: string;
  businessName: string;
  customerName: string;
  customerPhone: string;
  items: any[];
  totalAmount: number;
  paymentMethod: string;
  orderType: string;
  status: string;
  createdAt: number;
  tableNumber?: string;
  notes?: string;
}

interface FlatProduct {
  id: string;
  businessId: string;
  businessName: string;
  name: string;
  price: string;
  originalPrice?: string;
  description?: string;
  category?: string;
  imageUrl?: string;
  isPopular?: boolean;
  isAvailable?: boolean;
}

interface MarketplaceMonitorProps {
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export function MarketplaceMonitor({ showToast }: MarketplaceMonitorProps) {
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'products'>('orders');
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [flatProducts, setFlatProducts] = useState<FlatProduct[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('الكل');

  useEffect(() => {
    fetchData();
  }, [activeSubTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeSubTab === 'orders') {
        const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const list: OrderItem[] = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() } as OrderItem);
        });
        setOrders(list);
      } else {
        const snap = await getDocs(collection(db, 'businesses'));
        const bizList: Business[] = [];
        const prodList: FlatProduct[] = [];
        
        snap.forEach(docSnap => {
          const biz = { id: docSnap.id, ...docSnap.data() } as Business;
          bizList.push(biz);
          
          if (biz.menuItems && Array.isArray(biz.menuItems)) {
            biz.menuItems.forEach((item: MenuItem) => {
              prodList.push({
                ...item,
                businessId: biz.id,
                businessName: biz.name
              } as FlatProduct);
            });
          }
        });
        setBusinesses(bizList);
        setFlatProducts(prodList);
      }
    } catch (err) {
      console.error("Error loading marketplace data:", err);
      showToast("فشل تحميل بيانات التجارة والمنتجات", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status: newStatus });
      showToast("تم تحديث حالة الطلب بنجاح", "success");
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    } catch (err) {
      console.error("Error updating order status:", err);
      showToast("فشل تحديث حالة الطلب المعين", "error");
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا السجل نهائياً؟")) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      showToast("تم حذف سجل الطلب بنجاح", "success");
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (err) {
      console.error("Error deleting order:", err);
      showToast("فشل حذف الطلب المعين", "error");
    }
  };

  const handleToggleProductAvailability = async (product: FlatProduct) => {
    try {
      const bizDocRef = doc(db, 'businesses', product.businessId);
      // Find business in state
      const targetBiz = businesses.find(b => b.id === product.businessId);
      if (!targetBiz || !targetBiz.menuItems) return;

      const newAvailability = !product.isAvailable;
      const updatedMenuItems = targetBiz.menuItems.map((item: MenuItem) => {
        if (item.id === product.id) {
          return { ...item, isAvailable: newAvailability };
        }
        return item;
      });

      await updateDoc(bizDocRef, { menuItems: updatedMenuItems });
      showToast(newAvailability ? "تم تفعيل توافر المنتج بالمنصة" : "تم إلغاء توافر المنتج مؤقتاً", "success");
      
      // Update local state
      setBusinesses(prev => prev.map(b => b.id === product.businessId ? { ...b, menuItems: updatedMenuItems } : b));
      setFlatProducts(prev => prev.map(p => p.id === product.id ? { ...p, isAvailable: newAvailability } : p));
    } catch (err) {
      console.error("Error toggling availability:", err);
      showToast("فشل تحديث حالة توافر المنتج", "error");
    }
  };

  const handleDeleteProduct = async (product: FlatProduct) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا المنتج نهائياً من قائمة المحل؟")) return;
    try {
      const bizDocRef = doc(db, 'businesses', product.businessId);
      const targetBiz = businesses.find(b => b.id === product.businessId);
      if (!targetBiz || !targetBiz.menuItems) return;

      const updatedMenuItems = targetBiz.menuItems.filter((item: MenuItem) => item.id !== product.id);

      await updateDoc(bizDocRef, { menuItems: updatedMenuItems });
      showToast("تم حذف المنتج من قائمة المتجر بنجاح", "success");
      
      // Update local state
      setBusinesses(prev => prev.map(b => b.id === product.businessId ? { ...b, menuItems: updatedMenuItems } : b));
      setFlatProducts(prev => prev.filter(p => p.id !== product.id));
    } catch (err) {
      console.error("Error deleting product:", err);
      showToast("فشل حذف المنتج المحدد", "error");
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerPhone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.businessName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'الكل' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredProducts = flatProducts.filter(product => {
    const matchesSearch = 
      product.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Sub-Tabs Switcher */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => { setActiveSubTab('orders'); setSearchQuery(''); setStatusFilter('الكل'); }}
          className={`px-6 py-3 font-black text-sm transition-all border-b-2 cursor-pointer ${
            activeSubTab === 'orders'
              ? 'border-[#1a4d2e] text-[#1a4d2e]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          مراقبة الطلبات المباشرة
        </button>
        <button
          onClick={() => { setActiveSubTab('products'); setSearchQuery(''); }}
          className={`px-6 py-3 font-black text-sm transition-all border-b-2 cursor-pointer ${
            activeSubTab === 'products'
              ? 'border-[#1a4d2e] text-[#1a4d2e]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          رقابة دليل المنتجات والمخزون
        </button>
      </div>

      {/* Control Banner */}
      <div className="bg-white p-6 rounded-3xl border border-[#e5e1da] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-stone-900">
            {activeSubTab === 'orders' ? 'مراقبة وإدارة الطلبات المباشرة' : 'رقابة المنتجات والمخزون المرفوع'}
          </h3>
          <p className="text-xs text-stone-500">
            {activeSubTab === 'orders' 
              ? 'مراقبة مسارات التحصيل، وتتبع طلبات التوصيل والسفري، وتحديث حالة المعاملات المالية بالمنصة'
              : 'الإشراف على قوائم المنتجات المضافة للبيع، وضبط حالات التوافر، وحذف السلع المخالفة للسياسات'}
          </p>
        </div>
      </div>

      {/* Filter and search toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-[#e5e1da] shadow-xs flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeSubTab === 'orders' ? 'ابحث باسم العميل، رقم الهاتف، أو المطعم...' : 'ابحث باسم السلعة، اسم المحل التجاري، أو الوصف...'}
            className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-10 pl-4 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
          />
        </div>

        {activeSubTab === 'orders' && (
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
            {['الكل', 'pending', 'processing', 'completed', 'cancelled'].map(status => {
              let label = status;
              if (status === 'الكل') label = 'الكل';
              else if (status === 'pending') label = 'قيد الانتظار';
              else if (status === 'processing') label = 'قيد التحضير';
              else if (status === 'completed') label = 'تم التوصيل';
              else if (status === 'cancelled') label = 'ملغي';

              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                    statusFilter === status
                      ? 'bg-[#1a4d2e] text-white'
                      : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {loading && (
        <div className="bg-white py-16 rounded-3xl border border-[#e5e1da] text-center text-xs text-stone-500 font-bold">
          جاري جلب وتحميل البيانات المطلوبة...
        </div>
      )}

      {!loading && activeSubTab === 'orders' && (
        /* Orders Listing */
        filteredOrders.length === 0 ? (
          <div className="bg-white py-16 rounded-3xl border border-[#e5e1da] text-center text-xs text-stone-500 font-bold">
            لا توجد طلبات تجارية مطابقة لمعايير البحث والفلترة
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredOrders.map(order => (
              <div key={order.id} className="bg-white p-5 rounded-3xl border border-[#e5e1da] shadow-xs hover:shadow-md transition-all flex flex-col lg:flex-row justify-between gap-4 items-start lg:items-center">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-stone-400 font-bold">معرف الطلب: {order.id.slice(0, 8)}</span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                      order.orderType === 'delivery' ? 'bg-amber-50 text-amber-800' :
                      order.orderType === 'dine_in' ? 'bg-purple-50 text-purple-800' : 'bg-blue-50 text-blue-800'
                    }`}>
                      {order.orderType === 'delivery' ? 'طلب توصيل' :
                       order.orderType === 'dine_in' ? `داخل الصالة - طاولة ${order.tableNumber || ''}` : 'طلب سفري'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                      order.status === 'completed' ? 'bg-emerald-50 text-emerald-800' :
                      order.status === 'pending' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                      order.status === 'processing' ? 'bg-sky-50 text-sky-800' : 'bg-rose-50 text-rose-800'
                    }`}>
                      {order.status === 'completed' ? 'مكتمل' :
                       order.status === 'pending' ? 'بانتظار القبول' :
                       order.status === 'processing' ? 'قيد التحضير والترتيب' : 'ملغي'}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-stone-900">{order.businessName}</h4>

                  {/* Customer details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-xs text-stone-600 font-bold">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-stone-400" />
                      <span>المشتري: {order.customerName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-stone-400" />
                      <span>الهاتف: {order.customerPhone}</span>
                    </div>
                  </div>

                  {/* Ordered Items summary */}
                  <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 space-y-1.5 text-xs text-stone-700">
                    <div className="font-bold text-stone-500 mb-1">السلع والمنتجات المطلوبة:</div>
                    {order.items?.map((item, index) => (
                      <div key={index} className="flex justify-between font-bold">
                        <span>{item.name} {item.versionName ? `(${item.versionName})` : ''} × {item.quantity}</span>
                        <span className="font-mono text-stone-500">{item.price} دينار</span>
                      </div>
                    ))}
                    {order.notes && (
                      <div className="text-stone-500 mt-2 text-[11px] leading-relaxed">
                        ملاحظات المشتري: {order.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right side status updater and actions */}
                <div className="flex flex-col items-end gap-3 self-stretch lg:self-center lg:border-r lg:border-stone-100 lg:pr-5 min-w-[200px]">
                  <div className="text-left w-full">
                    <span className="text-xs text-stone-500 block font-bold">طريقة الدفع: {order.paymentMethod === 'cliq' ? 'CliQ فوري' : order.paymentMethod === 'wallet' ? 'محفظة رقمية' : 'كاش'}</span>
                    <span className="text-lg font-black text-[#1a4d2e] block">{order.totalAmount} دينار</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-1.5 w-full">
                    <select
                      value={order.status}
                      onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                      className="bg-stone-50 border border-stone-200 text-xs font-bold rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a4d2e] flex-1"
                    >
                      <option value="pending">معلق بانتظار الموافقة</option>
                      <option value="processing">جاري التحضير والشحن</option>
                      <option value="completed">تم التوصيل للزبون</option>
                      <option value="cancelled">ملغي من الإدارة</option>
                    </select>

                    <button
                      onClick={() => handleDeleteOrder(order.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 border border-stone-200 rounded-xl transition-colors cursor-pointer"
                      title="حذف هذا الطلب"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {!loading && activeSubTab === 'products' && (
        /* Products Listing */
        filteredProducts.length === 0 ? (
          <div className="bg-white py-16 rounded-3xl border border-[#e5e1da] text-center text-xs text-stone-500 font-bold">
            لا توجد سلع تجارية مضافة في قوائم المحلات مطابقة للبحث
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((prod) => (
              <div key={prod.id} className="bg-white p-5 rounded-3xl border border-[#e5e1da] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <span className="bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                      {prod.category || "عام"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black ${
                      prod.isAvailable !== false ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                    }`}>
                      {prod.isAvailable !== false ? 'متوفر حالياً' : 'غير متوفر'}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-stone-900 line-clamp-1">{prod.name}</h4>
                  <span className="text-[11px] font-bold text-stone-400 block mb-2">المتجر: {prod.businessName}</span>
                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed mb-4">{prod.description || 'لا يوجد وصف للمنتج المحدد'}</p>

                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-black text-[#1a4d2e]">{prod.price} دينار</span>
                    {prod.originalPrice && (
                      <span className="text-[11px] text-stone-400 line-through font-bold">{prod.originalPrice} دينار</span>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-stone-100 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => handleToggleProductAvailability(prod)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                      prod.isAvailable !== false
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-100'
                    }`}
                  >
                    {prod.isAvailable !== false ? 'إيقاف التوافر' : 'تفعيل التوافر'}
                  </button>

                  <button
                    onClick={() => handleDeleteProduct(prod)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="حذف هذا المنتج من قائمة المحل"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
