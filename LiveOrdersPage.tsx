import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc 
} from 'firebase/firestore';
import { getLocalOrders, saveLocalOrder, subscribeToLocalOrders, broadcastOrderUpdate } from '../lib/ordersSyncHelper';
import { Business } from '../types';
import { isFoodAndDrinkBusiness } from './Profile';
import { 
  ArrowRight, 
  Clock, 
  CheckCircle, 
  X, 
  AlertTriangle,
  Trash2, 
  Volume2, 
  VolumeX, 
  ChevronDown, 
  Utensils, 
  MessageCircle,
  ExternalLink,
  Store,
  Phone,
  Search,
  Check,
  CookingPot,
  MapPin,
  FileText,
  User,
  ShoppingBag,
  Sparkles,
  QrCode,
  Printer
} from 'lucide-react';

export default function LiveOrdersPage() {
  const { currentUser, ownedBusinesses } = useAuth();
  const navigate = useNavigate();

  // Sub-view Toggles (Live Orders vs Quick Out-of-Stock Toggle)
  const [activeView, setActiveView] = useState<'orders' | 'stock'>('orders');
  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null);

  // Print Thermal Receipt ESC/POS Layout
  const printOrderReceipt = (order: any, business: Business | null) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('عذراً، يرجى تفعيل السماح بالنوافذ المنبثقة لطباعة الإيصال.');
      return;
    }

    const orderDate = new Date(order.createdAt).toLocaleString('ar-JO', { 
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit' 
    });

    const subtotal = order.items?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0;
    const taxRateVal = business?.taxRate || 0;
    const serviceRateVal = business?.serviceRate || 0;
    const serviceFixedVal = business?.serviceFixedFee || 0;

    const serviceFee = (subtotal * serviceRateVal / 100) + serviceFixedVal;
    const taxFee = subtotal * taxRateVal / 100;
    const tipAmount = order.tipAmount || 0;
    const finalTotal = subtotal + serviceFee + taxFee + tipAmount;

    let paymentMethodAr = 'نقداً بالصالة / عند الاستلام';
    if (order.paymentMethod === 'cliq') paymentMethodAr = 'تحويل فوري عبر CliQ';
    else if (order.paymentMethod === 'wallet') paymentMethodAr = 'تحويل محفظة إلكترونية';

    const footerMessage = business?.receiptFooterMessage || 'شكراً لزيارتكم وصحتين وعافية!';

    const itemsHtml = order.items?.map((item: any) => `
      <tr>
        <td style="padding: 6px 0; text-align: right; vertical-align: top; border-bottom: 1px dashed #eee;">
          <div style="font-weight: bold;">${item.name}</div>
          ${item.selectedVersion ? `<div style="font-size: 10px; color: #555;">- ${item.selectedVersion.name}</div>` : ''}
          ${item.options && item.options.length > 0 ? `<div style="font-size: 10px; color: #555;">- خيارات: ${item.options.join(', ')}</div>` : ''}
          ${item.prepTimeMinutes ? `<div style="font-size: 10px; color: #666;">⏱️ تحضير: ${item.prepTimeMinutes} دقيقة</div>` : ''}
        </td>
        <td style="padding: 6px 0; text-align: center; font-family: monospace; border-bottom: 1px dashed #eee;">${item.quantity}</td>
        <td style="padding: 6px 0; text-align: left; font-family: monospace; border-bottom: 1px dashed #eee;">${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('') || '';

    const cliqHtml = (order.paymentMethod === 'cliq' && (business?.cliqAlias || business?.cliqPhone)) ? `
      <div style="border: 1px dashed #000; padding: 6px; margin-top: 8px; font-size: 11px;">
        <strong>بيانات الدفع كليك (CliQ):</strong><br/>
        ${business.cliqAlias ? `الاسم المستعار: ${business.cliqAlias}<br/>` : ''}
        ${business.cliqPhone ? `رقم الهاتف: ${business.cliqPhone}<br/>` : ''}
      </div>
    ` : '';

    const walletHtml = (order.paymentMethod === 'wallet' && (business?.walletName || business?.walletPhone)) ? `
      <div style="border: 1px dashed #000; padding: 6px; margin-top: 8px; font-size: 11px;">
        <strong>بيانات المحفظة الإلكترونية:</strong><br/>
        ${business.walletName ? `مزود الخدمة: ${business.walletName}<br/>` : ''}
        ${business.walletPhone ? `الهاتف: ${business.walletPhone}<br/>` : ''}
      </div>
    ` : '';

    const orderTypeHtml = order.orderType === 'dine_in' 
      ? `طاولة رقم: ${order.tableNumber || 'غير محدد'}` 
      : (order.orderType === 'takeaway' ? 'طلب سفري' : 'توصيل للمنزل');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>إيصال طلب - ${business?.name || 'طلب جديد'}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            font-family: Arial, sans-serif;
            width: 74mm;
            margin: 0 auto;
            padding: 8px;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            background: #fff;
          }
          .center {
            text-align: center;
          }
          .bold {
            font-weight: bold;
          }
          .header {
            border-bottom: 2px dashed #000;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }
          .title {
            font-size: 16px;
            font-weight: bold;
            margin: 4px 0;
          }
          .order-info {
            font-size: 11px;
            margin-bottom: 8px;
            border-bottom: 1px dashed #000;
            padding-bottom: 6px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0;
          }
          th {
            border-bottom: 1px solid #000;
            padding: 4px 0;
            font-weight: bold;
          }
          .totals {
            border-top: 2px dashed #000;
            padding-top: 6px;
            margin-top: 6px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
          }
          .grand-total {
            font-size: 14px;
            font-weight: bold;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 4px 0;
            margin-top: 4px;
          }
          .footer {
            margin-top: 12px;
            border-top: 2px dashed #000;
            padding-top: 8px;
            font-size: 11px;
          }
          @media print {
            body {
              width: 100%;
              padding: 4px;
            }
          }
        </style>
      </head>
      <body>
        <div class="center header">
          <div class="title">${business?.name || 'شو في بإربد؟'}</div>
          <div style="font-size: 11px;">${business?.category || 'مطعم ومقهى'}</div>
          ${business?.whatsapp ? `<div style="font-size: 10px;">هاتف: ${business.whatsapp}</div>` : ''}
        </div>

        <div class="order-info">
          <div class="bold" style="font-size: 13px; text-align: center; margin-bottom: 4px;">
            إيصال طلب ${order.shortCode ? `#${order.shortCode}` : ''}
          </div>
          <div>رقم الطلب: ${order.id}</div>
          <div>تاريخ الطلب: ${orderDate}</div>
          <div>الزبون: ${order.customerName || 'غير محدد'}</div>
          ${order.customerPhone ? `<div>الهاتف: ${order.customerPhone}</div>` : ''}
          <div class="bold" style="margin-top: 4px; font-size: 12px;">الحالة: ${orderTypeHtml}</div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align: right; width: 60%;">الصنف</th>
              <th style="text-align: center; width: 15%;">الكمية</th>
              <th style="text-align: left; width: 25%;">المجموع</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>المجموع الفرعي:</span>
            <span style="font-family: monospace;">${subtotal.toFixed(2)} د.أ</span>
          </div>
          ${serviceFee > 0 ? `
          <div class="totals-row">
            <span>رسوم الخدمة:</span>
            <span style="font-family: monospace;">${serviceFee.toFixed(2)} د.أ</span>
          </div>
          ` : ''}
          ${taxFee > 0 ? `
          <div class="totals-row">
            <span>الضريبة المضافة (${taxRateVal}%):</span>
            <span style="font-family: monospace;">${taxFee.toFixed(2)} د.أ</span>
          </div>
          ` : ''}
          ${tipAmount > 0 ? `
          <div class="totals-row">
            <span>الإكرامية (Tip):</span>
            <span style="font-family: monospace;">${tipAmount.toFixed(2)} د.أ</span>
          </div>
          ` : ''}
          <div class="totals-row grand-total">
            <span>الإجمالي النهائي:</span>
            <span style="font-family: monospace;">${finalTotal.toFixed(2)} د.أ</span>
          </div>
        </div>

        <div style="margin-top: 8px; font-size: 11px;">
          <div>طريقة الدفع: <strong>${paymentMethodAr}</strong></div>
          ${cliqHtml}
          ${walletHtml}
        </div>

        <div class="center footer">
          <p style="margin: 0;">${footerMessage}</p>
          <p style="margin: 4px 0 0; font-size: 9px; color: #666;">تم التوليد عبر منصة شو في بإربد؟</p>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Instant dish stock availability modifier
  const handleToggleItemAvailability = async (itemId: string, currentStatus: boolean) => {
    if (!selectedBiz) return;
    setUpdatingStockId(itemId);
    try {
      const updatedMenuItems = (selectedBiz.menuItems || []).map((item) => {
        if (item.id === itemId) {
          return { ...item, isAvailable: !currentStatus };
        }
        return item;
      });

      const bizDocRef = doc(db, 'businesses', selectedBiz.id);
      await updateDoc(bizDocRef, {
        menuItems: updatedMenuItems
      });

      setSelectedBusiness(prev => {
        if (!prev) return null;
        return {
          ...prev,
          menuItems: updatedMenuItems
        };
      });

      setAvailableBusinesses(prev => {
        return prev.map(b => {
          if (b.id === selectedBiz.id) {
            return { ...b, menuItems: updatedMenuItems };
          }
          return b;
        });
      });

    } catch (error) {
      console.error("Error updating item availability:", error);
      alert("عذراً، فشل تحديث حالة الطبق. يرجى التحقق من اتصال الإنترنت والمحاولة لاحقاً.");
    } finally {
      setUpdatingStockId(null);
    }
  };

  // Available businesses state for selecting in LiveOrdersPage
  const [availableBusinesses, setAvailableBusinesses] = useState<Business[]>(
    (ownedBusinesses || []).filter(isFoodAndDrinkBusiness)
  );
  const [selectedBiz, setSelectedBusiness] = useState<Business | null>(null);

  // Dynamically calculate unique menu categories for selected business
  const menuCategoriesCalculated = useMemo(() => {
    if (!selectedBiz?.menuItems) return [];
    const cats = new Set<string>();
    selectedBiz.menuItems.forEach(item => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats);
  }, [selectedBiz?.menuItems]);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Audio chime settings
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Previous orders ref to detect new arrivals and trigger chime
  const prevOrdersRef = useRef<any[]>([]);

  // Load owned businesses for merchant / admin
  useEffect(() => {
    const loadBusinesses = () => {
      const foodBusinesses = (ownedBusinesses || []).filter(isFoodAndDrinkBusiness);
      setAvailableBusinesses(foodBusinesses);
      if (foodBusinesses.length > 0 && !selectedBiz) {
        setSelectedBusiness(foodBusinesses[0]);
      }
    };

    loadBusinesses();
  }, [ownedBusinesses]);

  // Real-time Orders Listener for selected business
  useEffect(() => {
    if (!selectedBiz?.id) {
      setOrders([]);
      setLoadingOrders(false);
      return;
    }

    setLoadingOrders(true);
    let unsubscribeFirestore = () => {};

    // Helper to merge Firestore orders & local orders cleanly
    const mergeAndSetOrders = (firestoreOrders: any[]) => {
      const local = getLocalOrders(selectedBiz.id);
      const orderMap = new Map<string, any>();

      // 1. Add local orders
      local.forEach(o => {
        if (o.id) orderMap.set(o.id, o);
      });

      // 2. Override/add with Firestore orders (source of truth when available)
      firestoreOrders.forEach(o => {
        if (o.id) orderMap.set(o.id, { ...orderMap.get(o.id), ...o });
      });

      const merged = Array.from(orderMap.values());
      merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      // Audio chime sound & Haptic vibration when a NEW 'pending' order arrives
      const prevOrders = prevOrdersRef.current;
      if (soundEnabled && prevOrders.length > 0 && merged.length > prevOrders.length) {
        const hasNewPending = merged.some(
          fo => fo.status === 'pending' && !prevOrders.some(po => po.id === fo.id)
        );
        if (hasNewPending) {
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav');
            audio.play();
          } catch (e) {
            console.log("Audio play blocked by browser policy:", e);
          }
          if (typeof window !== 'undefined' && 'vibrate' in navigator) {
            try {
              navigator.vibrate([150, 80, 150]);
            } catch (e) {}
          }
        }
      }

      prevOrdersRef.current = merged;
      setOrders(merged);
      setLoadingOrders(false);
    };

    // Initialize with local storage immediately so UI is instant
    mergeAndSetOrders([]);

    // Subscribe to cross-tab / local storage live broadcasts
    const unsubscribeLocal = subscribeToLocalOrders((updatedOrder) => {
      if (updatedOrder && (updatedOrder.businessId === selectedBiz.id || String(updatedOrder.businessId) === String(selectedBiz.id))) {
        setOrders(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(o => o.id === updatedOrder.id);
          if (idx >= 0) {
            updated[idx] = { ...updated[idx], ...updatedOrder };
          } else {
            updated.unshift(updatedOrder);
          }
          updated.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          return updated;
        });
      }
    });

    const setupOrdersListener = () => {
      try {
        const q = query(
          collection(db, 'orders'),
          where('businessId', '==', selectedBiz.id)
        );

        unsubscribeFirestore = onSnapshot(q, (snapshot) => {
          const fetchedOrders: any[] = [];
          snapshot.forEach((doc) => {
            fetchedOrders.push({ id: doc.id, ...doc.data() });
          });
          mergeAndSetOrders(fetchedOrders);
        }, (error) => {
          console.warn("Firestore order listener warning (using local sync):", error?.message || error);
          setLoadingOrders(false);
        });
      } catch (err) {
        console.warn("Failed to setup orders listener:", err);
        setLoadingOrders(false);
      }
    };

    setupOrdersListener();
    return () => {
      unsubscribeFirestore();
      unsubscribeLocal();
    };
  }, [selectedBiz?.id, soundEnabled, currentUser?.uid]);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: 'pending' | 'processing' | 'completed' | 'cancelled') => {
    // 1. Update local state immediately & broadcast locally
    const targetOrder = orders.find(o => o.id === orderId);
    if (targetOrder) {
      const updateData: any = { status: newStatus };
      if (newStatus === 'completed') {
        updateData.completedAt = Date.now();
      }
      const updated = { ...targetOrder, ...updateData };
      saveLocalOrder(updated);
      broadcastOrderUpdate(updated);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));

      // 2. Persist to Firestore
      try {
        if (db) {
          await updateDoc(doc(db, 'orders', orderId), updateData);
        }
      } catch (error) {
        console.warn("Firestore status update warning (updated locally):", error);
      }
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الطلب نهائياً من الأرشيف؟")) return;
    
    // Remove locally
    setOrders(prev => prev.filter(o => o.id !== orderId));
    try {
      if (db) {
        await deleteDoc(doc(db, 'orders', orderId));
      }
    } catch (error) {
      console.warn("Firestore order delete warning:", error);
    }
  };

  // Stats calculation
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const processingCount = orders.filter(o => o.status === 'processing').length;
  const completedCount = orders.filter(o => o.status === 'completed').length;
  const cancelledCount = orders.filter(o => o.status === 'cancelled').length;

  // Filtered orders list based on status and search query
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Status filter
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const idMatch = (order.id || '').toLowerCase().includes(q);
        const shortCodeMatch = String(order.shortCode || '').includes(q);
        const nameMatch = (order.customerName || '').toLowerCase().includes(q);
        const phoneMatch = (order.customerPhone || '').includes(q);
        const tableMatch = (order.tableNumber || '').toLowerCase().includes(q);
        const itemMatch = (order.items || []).some((it: any) => (it.name || '').toLowerCase().includes(q));
        if (!idMatch && !shortCodeMatch && !nameMatch && !phoneMatch && !tableMatch && !itemMatch) {
          return false;
        }
      }
      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  // Render if no businesses are registered or available in platform
  if (availableBusinesses.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 text-center" dir="rtl">
        <div className="p-5 bg-amber-50 border border-amber-100 rounded-3xl text-amber-600 mb-5 max-w-sm">
          <AlertTriangle className="h-12 w-12 mx-auto animate-bounce mb-2" />
          <h3 className="text-base font-black text-stone-800">أنت لا تملك منشأة مسجلة حالياً!</h3>
          <p className="text-xs text-stone-500 mt-1 leading-relaxed">
            هذه الصفحة مخصصة حصرياً لأصحاب المطاعم، المقاهي، ومحلات المأكولات والمشروبات لاستقبال طلبات الزبائن والمنيو الحية في إربد.
          </p>
        </div>
        <Link 
          to="/profile" 
          className="px-6 py-3.5 bg-[#1a4d2e] hover:bg-[#123a24] text-white text-xs font-black rounded-2xl transition-all shadow-md inline-flex items-center gap-2 cursor-pointer active:scale-95"
        >
          <ArrowRight className="h-4 w-4" />
          <span>العودة لملفي الشخصي</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf8] pb-28 text-stone-800 font-sans selection:bg-emerald-100" dir="rtl">
      
      {/* Top Mobile-Friendly Sticky Header */}
      <header className="bg-white/95 backdrop-blur-md border-b border-stone-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2.5">
          
          {/* Back button & Page Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Link 
              to="/profile"
              className="p-2 sm:p-2.5 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700 rounded-xl transition-all shrink-0 cursor-pointer"
              title="العودة للملف الشخصي"
              aria-label="الرجوع"
            >
              <ArrowRight className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
            </Link>
            
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-sm sm:text-lg font-black text-stone-900 truncate tracking-tight">
                  لوحة استقبال الطلبات الحية
                </h1>
                <span className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                  مباشر
                </span>
              </div>
              <p className="text-[10px] text-stone-400 font-bold hidden sm:block truncate">
                إدارة واستقبال طلبات الزبائن والمنيو الرقمي في الوقت الفعلي
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            
            {/* Audio Toggle Button */}
            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 sm:px-3 sm:py-2 rounded-xl border transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                soundEnabled 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-stone-100 border-stone-200 text-stone-500'
              }`}
              title={soundEnabled ? "كتم صوت التنبيهات" : "تفعيل صوت التنبيهات"}
              aria-label="تبديل التنبيهات الصوتية"
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-emerald-700" />
              ) : (
                <VolumeX className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-stone-400" />
              )}
              <span className="hidden md:inline text-[11px] font-black">{soundEnabled ? "الصوت مفعّل" : "الصوت مكتوم"}</span>
            </button>

            {/* Merchant QR Scanner Quick Shortcut */}
            <Link
              to="/merchant/scanner"
              className="p-2 sm:px-3 sm:py-2 bg-stone-900 hover:bg-stone-950 active:bg-black text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
              title="فتح ماسح رمز QR للطلبات والكودات"
            >
              <QrCode className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-cyan-300" />
              <span className="hidden sm:inline text-[11px]">ماسح QR</span>
            </Link>

            {/* Public Menu View Button */}
            {selectedBiz && (
              <a 
                href={`/business/${selectedBiz.id}/menu-offers`}
                target="_blank"
                rel="noreferrer"
                className="p-2 sm:px-3 sm:py-2 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 border border-stone-200 text-stone-700 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                title="معاينة صفحة المنيو للزبائن"
              >
                <Store className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-[#1a4d2e]" />
                <span className="hidden lg:inline text-[11px]">معاينة المنيو</span>
                <ExternalLink className="h-3.5 w-3.5 hidden sm:inline text-stone-400" />
              </a>
            )}
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 mt-4 sm:mt-6 space-y-4 sm:space-y-6">
        
        {/* Store Selector (if multi-store merchant) */}
        {availableBusinesses.length > 1 && (
          <div className="bg-white border border-stone-200/80 p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-xs text-right">
            <div>
              <span className="text-[11px] sm:text-xs font-black text-stone-500 block">اختر الفرع / المنشأة:</span>
              <p className="text-[10px] text-stone-400 font-bold mt-0.5">
                الفرع الحالي: <strong className="text-emerald-800 font-black">{selectedBiz?.name || 'غير محدد'}</strong>
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <select
                value={selectedBiz?.id || ''}
                onChange={(e) => {
                  const target = availableBusinesses.find(b => b.id === e.target.value);
                  if (target) setSelectedBusiness(target);
                }}
                className="appearance-none bg-stone-50 hover:bg-stone-100 active:bg-stone-200 border border-stone-200 text-stone-800 text-xs sm:text-sm font-black rounded-xl pl-8 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer w-full"
              >
                {availableBusinesses.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-2.5 text-stone-500">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>
          </div>
        )}

        {/* 🧭 VIEW NAVIGATOR */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-1.5 bg-stone-100 rounded-2xl border border-stone-200/90 w-full" dir="rtl">
          <button
            type="button"
            onClick={() => {
              setActiveView('orders');
              setSearchQuery(''); // Clear stock search query
            }}
            className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
              activeView === 'orders'
                ? 'bg-white text-emerald-900 shadow-xs border border-stone-200 ring-1 ring-black/5'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Clock className="h-4 w-4 text-emerald-600" />
            <span>لوحة استقبال الطلبات الحية ({orders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView('stock');
              setSearchQuery(''); // Clear orders search query
            }}
            className={`flex-1 flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
              activeView === 'stock'
                ? 'bg-white text-amber-900 shadow-xs border border-stone-200 ring-1 ring-black/5'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <Utensils className="h-4 w-4 text-amber-600" />
            <span>النفاد السريع للأطباق والمكونات ({selectedBiz?.menuItems?.length || 0})</span>
          </button>
        </div>

        {activeView === 'stock' ? (
          <div className="space-y-6 text-right animate-in fade-in" dir="rtl">
            {/* Header / Intro Card */}
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-amber-500/10 border border-amber-200 p-5 rounded-3xl shadow-3xs">
              <h3 className="font-black text-amber-950 text-xs sm:text-sm flex items-center gap-2">
                <Utensils className="h-4.5 w-4.5 text-amber-600 animate-pulse" />
                <span>شاشة التحكم السريع بنفاد الأطباق والمكونات</span>
              </h3>
              <p className="text-[11px] text-stone-600 mt-1.5 leading-relaxed font-bold">
                بضغطة زر واحدة، يمكنك إيقاف استقبال طلبات أي صنف أو وجبة في منيو الزبائن فورياً عند نفاد المكونات من مطبخك، أو إعادة تفعيله بمجرد توفره مجدداً. التعديلات تظهر مباشرةً للزبائن.
              </p>
            </div>

            {/* Selected Store Status Card */}
            {(!selectedBiz?.menuItems || selectedBiz.menuItems.length === 0) ? (
              <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-3 shadow-xs">
                <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto text-stone-400 border border-stone-150">
                  <Utensils className="h-6 w-6 text-stone-400" />
                </div>
                <h4 className="font-black text-stone-800 text-xs sm:text-sm">لا توجد وجبات أو أصناف مدرجة في منيو هذا المحل</h4>
                <p className="text-[11px] text-stone-500 leading-relaxed max-w-sm mx-auto font-medium">
                  قم بإضافة وجبات المنيو أولاً من صفحة تعديل المحل في لوحة التحكم لتتمكن من التحكم السريع بمخزونها هنا.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Search in stock */}
                <div className="relative max-w-md">
                  <input
                    type="text"
                    placeholder="ابحث عن طبق أو صنف بالاسم..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white border border-stone-200 focus:border-amber-500 rounded-2xl pr-10 pl-8 py-2.5 text-xs font-bold text-stone-800 placeholder:text-stone-400 outline-none transition-all shadow-3xs"
                  />
                  <Search className="h-4.5 w-4.5 text-stone-400 absolute top-1/2 -translate-y-1/2 right-3.5 pointer-events-none" />
                </div>

                {/* Group items by categories */}
                {(menuCategoriesCalculated.length === 0 ? ['أصناف المنيو'] : menuCategoriesCalculated).map(catName => {
                  const catItems = (selectedBiz?.menuItems || []).filter(item => {
                    const matchesCategory = menuCategoriesCalculated.length === 0 || item.category === catName;
                    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
                    return matchesCategory && matchesSearch;
                  });

                  if (catItems.length === 0) return null;

                  return (
                    <div key={catName} className="space-y-3">
                      <div className="flex items-center gap-2 border-r-4 border-amber-500 pr-3">
                        <h4 className="font-black text-xs sm:text-sm text-stone-900">{catName}</h4>
                        <span className="text-[11px] text-stone-400 font-bold">({catItems.length} صنف)</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
                        {catItems.map((item) => {
                          const isAvailable = item.isAvailable !== false; // defaults to true
                          const isUpdating = updatingStockId === item.id;
                          return (
                            <div 
                              key={item.id} 
                              className={`bg-white rounded-2xl border p-4 flex items-center justify-between gap-4 transition-all hover:shadow-xs ${
                                isAvailable ? 'border-stone-200' : 'border-rose-200 bg-rose-50/10'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                {item.imageUrl ? (
                                  <img 
                                    src={item.imageUrl} 
                                    alt={item.name} 
                                    className={`w-14 h-14 rounded-xl object-cover shrink-0 border border-stone-200 ${!isAvailable && 'grayscale brightness-90'}`} 
                                  />
                                ) : (
                                  <div className="w-14 h-14 rounded-xl bg-stone-100 text-stone-400 border border-stone-200 flex items-center justify-center shrink-0 font-bold text-xs">
                                    🍽️
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <h5 className="font-black text-xs sm:text-sm text-stone-900 truncate">{item.name}</h5>
                                  <span className="text-[11px] font-mono text-emerald-800 font-black block mt-0.5">{parseFloat(item.price).toFixed(2)} د.أ</span>
                                </div>
                              </div>

                              {/* Toggle stock button */}
                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleToggleItemAvailability(item.id, isAvailable)}
                                className={`px-4 py-2.5 rounded-xl text-[10px] sm:text-xs font-black transition-all cursor-pointer select-none active:scale-95 border flex items-center gap-1.5 min-w-[110px] justify-center ${
                                  isAvailable 
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-250 shadow-3xs' 
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-250'
                                }`}
                              >
                                {isUpdating ? (
                                  <div className="w-3.5 h-3.5 border-2 border-stone-800 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  isAvailable ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />
                                )}
                                <span>{isAvailable ? 'متوفر حالياً' : 'غير متوفر'}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Real-Time Statistics & Quick Filter Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 text-right">
          
          {/* Card 1: All Orders */}
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`p-3.5 sm:p-4 rounded-2xl border text-right transition-all cursor-pointer active:scale-[0.98] ${
              statusFilter === 'all'
                ? 'bg-stone-900 text-white border-stone-900 shadow-md ring-2 ring-stone-900/10'
                : 'bg-white text-stone-800 border-stone-200/80 shadow-xs hover:border-stone-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] sm:text-xs font-black ${statusFilter === 'all' ? 'text-stone-300' : 'text-stone-500'}`}>
                الكل اليوم
              </span>
              <ShoppingBag className={`h-4 w-4 ${statusFilter === 'all' ? 'text-stone-300' : 'text-stone-400'}`} />
            </div>
            <span className="text-xl sm:text-2xl font-black mt-1 block tracking-tight">{orders.length}</span>
          </button>

          {/* Card 2: Pending (⏳) */}
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`p-3.5 sm:p-4 rounded-2xl border text-right transition-all cursor-pointer active:scale-[0.98] ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-500/20'
                : 'bg-amber-50/70 text-amber-950 border-amber-200/80 shadow-xs hover:border-amber-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] sm:text-xs font-black ${statusFilter === 'pending' ? 'text-amber-100' : 'text-amber-700'}`}>
                قيد الانتظار
              </span>
              <Clock className={`h-4 w-4 ${statusFilter === 'pending' ? 'text-amber-100 animate-spin' : 'text-amber-500'}`} />
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl sm:text-2xl font-black tracking-tight">{pendingCount}</span>
              {pendingCount > 0 && (
                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md animate-pulse ${
                  statusFilter === 'pending' ? 'bg-white text-amber-600' : 'bg-amber-200 text-amber-900'
                }`}>
                  جديد
                </span>
              )}
            </div>
          </button>

          {/* Card 3: Processing (👨‍🍳) */}
          <button
            type="button"
            onClick={() => setStatusFilter('processing')}
            className={`p-3.5 sm:p-4 rounded-2xl border text-right transition-all cursor-pointer active:scale-[0.98] ${
              statusFilter === 'processing'
                ? 'bg-sky-600 text-white border-sky-600 shadow-md ring-2 ring-sky-600/20'
                : 'bg-sky-50/70 text-sky-950 border-sky-200/80 shadow-xs hover:border-sky-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] sm:text-xs font-black ${statusFilter === 'processing' ? 'text-sky-100' : 'text-sky-700'}`}>
                بالمطبخ
              </span>
              <CookingPot className={`h-4 w-4 ${statusFilter === 'processing' ? 'text-sky-100' : 'text-sky-600'}`} />
            </div>
            <span className="text-xl sm:text-2xl font-black mt-1 block tracking-tight">{processingCount}</span>
          </button>

          {/* Card 4: Completed (🎉) */}
          <button
            type="button"
            onClick={() => setStatusFilter('completed')}
            className={`p-3.5 sm:p-4 rounded-2xl border text-right transition-all cursor-pointer active:scale-[0.98] ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-600/20'
                : 'bg-emerald-50/70 text-emerald-950 border-emerald-200/80 shadow-xs hover:border-emerald-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-[10px] sm:text-xs font-black ${statusFilter === 'completed' ? 'text-emerald-100' : 'text-emerald-700'}`}>
                مكتملة
              </span>
              <CheckCircle className={`h-4 w-4 ${statusFilter === 'completed' ? 'text-emerald-100' : 'text-emerald-600'}`} />
            </div>
            <span className="text-xl sm:text-2xl font-black mt-1 block tracking-tight">{completedCount}</span>
          </button>

        </div>

        {/* Mobile Filter & Search Toolbar */}
        <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث برقم الطلب، اسم الزبون، الهاتف، أو الطاولة..."
              className="w-full bg-stone-50 border border-stone-200 focus:border-emerald-500 rounded-xl pr-9 pl-8 py-2 text-xs font-bold text-stone-800 placeholder:text-stone-400 outline-none transition-all"
            />
            <Search className="h-4 w-4 text-stone-400 absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 -translate-y-1/2 left-2.5 p-1 text-stone-400 hover:text-stone-600 cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Quick Segmented Filters for Mobile */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black shrink-0 transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-stone-900 text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              الكل ({orders.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black shrink-0 transition-all cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              انتظار ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('processing')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black shrink-0 transition-all cursor-pointer ${
                statusFilter === 'processing'
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
              }`}
            >
              تحضير ({processingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('completed')}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-black shrink-0 transition-all cursor-pointer ${
                statusFilter === 'completed'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              جاهز ({completedCount})
            </button>
          </div>

        </div>

        {/* Orders Listing Grid */}
        {loadingOrders ? (
          <div className="bg-white rounded-3xl border border-stone-200/80 p-12 text-center space-y-3 shadow-xs">
            <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs sm:text-sm font-bold text-stone-500">جاري الاتصال وتحديث قائمة الطلبات الحية...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-stone-200/80 p-8 sm:p-14 text-center space-y-3.5 max-w-lg mx-auto shadow-xs">
            <div className="w-14 h-14 bg-stone-50 rounded-2xl flex items-center justify-center mx-auto text-stone-400 border border-stone-100">
              <Utensils className="h-7 w-7 text-stone-400" />
            </div>
            <h4 className="font-black text-stone-800 text-sm sm:text-base">
              {searchQuery || statusFilter !== 'all' ? 'لا توجد نتائج مطابقة للبحث أو التصفية' : 'لا توجد طلبات مسجلة اليوم حتى الآن'}
            </h4>
            <p className="text-[11px] sm:text-xs text-stone-500 leading-relaxed max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all' 
                ? 'جرب تغيير نص البحث أو اختيار تصنيف حالة آخر لإظهار بقية الطلبات.'
                : 'عندما يقوم زبائنك بالطلب من المنيو الرقمي أو مسح QR الطاولات، ستصلك التنبيهات وتظهر الطلبات فورياً هنا!'}
            </p>
            {(searchQuery || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-black rounded-xl transition-all cursor-pointer"
              >
                إعادة ضبط التصفية
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5 text-right">
            {filteredOrders.map((order) => {
              const orderDate = new Date(order.createdAt).toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' });
              
              // Direct WhatsApp and Phone call sanitized links
              const rawPhone = String(order.customerPhone || '').replace(/\D/g, '');
              const waPhone = rawPhone.startsWith('0') ? `962${rawPhone.substring(1)}` : rawPhone;
              const waLink = `https://wa.me/${waPhone}?text=${encodeURIComponent(`مرحباً ${order.customerName || 'عزيزي الزبون'}، بخصوص طلبك رقم (${order.shortCode || order.id}) من ${selectedBiz?.name || 'المطعم'}`)}`;
              const telLink = `tel:${order.customerPhone}`;

              const isPending = order.status === 'pending';
              const isProcessing = order.status === 'processing';
              const isCompleted = order.status === 'completed';
              const isCancelled = order.status === 'cancelled';

              return (
                <div 
                  key={order.id} 
                  className={`rounded-2xl border p-3.5 sm:p-5 flex flex-col justify-between gap-3.5 transition-all relative overflow-hidden bg-white shadow-xs hover:shadow-md ${
                    isPending
                      ? 'border-amber-300 ring-2 ring-amber-300/20'
                      : isProcessing
                      ? 'border-sky-300 ring-2 ring-sky-300/10'
                      : isCompleted
                      ? 'border-emerald-200'
                      : 'border-stone-200 opacity-75'
                  }`}
                >
                  
                  {/* Status Banner Top Accent Line */}
                  {isPending && <div className="absolute top-0 inset-x-0 h-1.5 bg-amber-500" />}
                  {isProcessing && <div className="absolute top-0 inset-x-0 h-1.5 bg-sky-500" />}
                  {isCompleted && <div className="absolute top-0 inset-x-0 h-1.5 bg-emerald-500" />}
                  {isCancelled && <div className="absolute top-0 inset-x-0 h-1.5 bg-rose-500" />}

                  {/* Header Row: Order ID, Type Badge, Time & Status */}
                  <div className="flex items-start justify-between gap-2 pt-0.5">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* 4-digit code or short code */}
                        {order.shortCode ? (
                          <span className="bg-stone-900 text-white font-mono font-black text-xs px-2 py-0.5 rounded-lg tracking-wider shadow-2xs">
                            #{order.shortCode}
                          </span>
                        ) : null}

                        <span className="font-mono text-stone-700 font-bold text-[11px] truncate max-w-[120px]">
                          {order.id}
                        </span>

                        {/* Order Type Badge */}
                        {order.orderType === 'dine_in' && (
                          <span className="text-[10px] font-black bg-purple-50 text-purple-800 border border-purple-200 px-2 py-0.5 rounded-lg inline-flex items-center gap-1">
                            🍽️ طاولة {order.tableNumber || 'غير محدد'}
                          </span>
                        )}
                        {order.orderType === 'takeaway' && (
                          <span className="text-[10px] font-black bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded-lg inline-flex items-center gap-1">
                            🥡 سفري
                          </span>
                        )}
                        {order.orderType === 'delivery' && (
                          <span className="text-[10px] font-black bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-lg inline-flex items-center gap-1">
                            🚗 توصيل
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-stone-400 font-bold block">
                        {orderDate} • الدفع عند الاستلام
                      </span>
                    </div>

                    {/* Status Pill Badge */}
                    <div className="shrink-0">
                      {isPending && (
                        <span className="text-[10px] font-black bg-amber-500 text-white px-2.5 py-1 rounded-full flex items-center gap-1 shadow-2xs animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                          بانتظار الموافقة
                        </span>
                      )}
                      {isProcessing && (
                        <span className="text-[10px] font-black bg-sky-600 text-white px-2.5 py-1 rounded-full shadow-2xs flex items-center gap-1">
                          <CookingPot className="h-3 w-3" />
                          قيد التحضير
                        </span>
                      )}
                      {isCompleted && (
                        <span className="text-[10px] font-black bg-emerald-600 text-white px-2.5 py-1 rounded-full shadow-2xs flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          جاهز ومكتمل
                        </span>
                      )}
                      {isCancelled && (
                        <span className="text-[10px] font-black bg-rose-600 text-white px-2.5 py-1 rounded-full shadow-2xs">
                          ملغي
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer Information Block + Quick Call / WhatsApp Buttons */}
                  <div className="bg-stone-50/90 p-2.5 sm:p-3 rounded-xl border border-stone-200/60 space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <User className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                        <span className="text-xs font-black text-stone-900 truncate">{order.customerName}</span>
                      </div>

                      {/* Direct Phone & WhatsApp Instant Action Buttons for Mobile */}
                      {order.customerPhone && (
                        <div className="flex items-center gap-1.5">
                          <a
                            href={telLink}
                            className="p-1.5 bg-white hover:bg-emerald-50 active:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shadow-3xs cursor-pointer"
                            title="اتصال هاتفي بالزبون"
                          >
                            <Phone className="h-3 w-3 text-emerald-600" />
                            <span className="font-mono">{order.customerPhone}</span>
                          </a>

                          <a
                            href={waLink}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg transition-all shadow-3xs flex items-center justify-center cursor-pointer"
                            title="مراسلة عبر واتساب"
                          >
                            <MessageCircle className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Delivery Address if any */}
                    {order.orderType === 'delivery' && order.tableNumber && (
                      <div className="text-[11px] font-bold text-stone-600 flex items-center gap-1 pt-0.5">
                        <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                        <span>العنوان: <strong className="text-stone-900">{order.tableNumber}</strong></span>
                      </div>
                    )}

                    {/* Notes Callout */}
                    {order.notes && (
                      <div className="text-[11px] font-bold text-amber-900 bg-amber-50/80 p-2 rounded-lg border border-amber-200/60 flex items-start gap-1.5 leading-snug">
                        <FileText className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>ملاحظات الزبون: <strong>"{order.notes}"</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Food Items Ordered List */}
                  <div className="space-y-1.5 pb-2 border-b border-stone-100">
                    <span className="text-[10px] font-black text-stone-400 block">الوجبات المطلوبة:</span>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
                      {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs font-bold text-stone-800 bg-stone-50/50 p-1.5 rounded-lg">
                          <span className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="bg-white text-emerald-800 font-black min-w-[20px] h-5 rounded-md flex items-center justify-center text-[10px] border border-stone-200 shadow-3xs shrink-0">
                              {item.quantity}×
                            </span>
                            <span className="truncate">{item.name}</span>
                            {item.prepTimeMinutes ? (
                              <span className="text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200/60 px-1.5 py-0.2 rounded-md shrink-0 mr-1">
                                ⏱️ {item.prepTimeMinutes} دقيقة
                              </span>
                            ) : null}
                          </span>
                          <span className="font-mono text-stone-700 text-xs font-black shrink-0 mr-2">
                            {(item.price * item.quantity).toFixed(2)} د.أ
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total Price & Large Mobile-Friendly Actions */}
                  <div className="space-y-2.5 pt-1">
                    {(() => {
                      const maxPrep = order.items?.reduce((m: number, it: any) => Math.max(m, it.prepTimeMinutes || 0), 0) || 0;
                      if (maxPrep === 0) return null;
                      return (
                        <div className="flex justify-between items-center text-[11px] font-bold text-amber-900 bg-amber-50/90 px-2.5 py-1 rounded-lg border border-amber-200/60">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-amber-600" />
                            <span>زمن التحضير المتوقع للطلب:</span>
                          </span>
                          <span className="font-black text-amber-950">~{maxPrep} دقيقة</span>
                        </div>
                      );
                    })()}

                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-stone-500">الحساب الإجمالي:</span>
                      <span className="text-base sm:text-lg font-black text-emerald-800 font-mono">
                        {(order.totalPrice || 0).toFixed(2)} د.أ
                      </span>
                    </div>

                    {/* Action Buttons Matrix */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      
                      {/* Thermal Receipt Print Button */}
                      <button
                        type="button"
                        onClick={() => printOrderReceipt(order, selectedBiz)}
                        className="w-full py-2.5 px-3 bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-800 hover:text-black border border-stone-200 rounded-xl text-xs font-bold cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5 sm:col-span-2"
                      >
                        <Printer className="h-4 w-4 text-stone-600 shrink-0" />
                        <span>طباعة إيصال حراري للطلب 🖨️</span>
                      </button>
                      
                      {/* State: Pending -> Accept or Cancel */}
                      {isPending && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(order.id, 'processing')}
                            className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                          >
                            <CookingPot className="h-4 w-4" />
                            <span>قبول وإرسال للمطبخ 👨‍🍳</span>
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                            className="w-full py-2.5 px-3 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-700 border border-rose-200 rounded-xl text-xs font-black cursor-pointer active:scale-95 transition-all"
                          >
                            <span>إلغاء الطلب</span>
                          </button>
                        </>
                      )}

                      {/* State: Processing -> Mark Ready or Cancel */}
                      {isProcessing && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                            className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5"
                          >
                            <Check className="h-4 w-4 stroke-[3]" />
                            <span>جاهز ومكتمل 🎉</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                            className="w-full py-2.5 px-3 bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-700 rounded-xl text-xs font-bold cursor-pointer active:scale-95 transition-all"
                          >
                            <span>إلغاء</span>
                          </button>
                        </>
                      )}

                      {/* State: Completed or Cancelled -> Delete / Archive */}
                      {(isCompleted || isCancelled) && (
                        <button
                          type="button"
                          onClick={() => handleDeleteOrder(order.id)}
                          className="w-full py-2.5 px-3 bg-stone-100 hover:bg-rose-50 active:bg-rose-100 text-stone-600 hover:text-rose-700 rounded-xl text-xs font-bold cursor-pointer active:scale-95 transition-all flex items-center justify-center gap-1.5 sm:col-span-2"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>أرشفة وحذف من اللوحة</span>
                        </button>
                      )}

                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
          </>
        )}

      </main>

    </div>
  );
}
