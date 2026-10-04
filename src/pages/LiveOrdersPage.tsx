import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { db, auth } from '../lib/firebase';
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
import { updateBusinessMenuItemsInCache } from '../lib/dataCache';
import { Business } from '../types';
import { isFoodAndDrinkBusiness } from '../lib/categories';
import { 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  X, 
  AlertTriangle,
  Trash2, 
  Volume2, 
  VolumeX, 
  BellRing,
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
  QrCode, 
  Printer,
  SlidersHorizontal,
  ArrowUpDown,
  Layers,
  Banknote,
  Receipt
} from 'lucide-react';
import { 
  playOrderNotificationSound, 
  playUrgentOrderChime, 
  unlockOrderAudio, 
  isAudioAllowed, 
  onAudioStatusChange, 
  requestOrderNotificationPermission, 
  showOrderDesktopNotification 
} from '../utils/orderSound';

function getElapsedTime(timestamp?: number): string {
  if (!timestamp) return '';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 60) return 'الآن';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const diffHours = Math.floor(diffMin / 60);
  return `منذ ${diffHours} ساعة`;
}

function getOrderTypeBadge(orderType?: string, tableNumber?: string) {
  switch (orderType) {
    case 'dine_in':
      return {
        label: tableNumber ? `طاولة رقم ${tableNumber}` : 'صالة داخلية',
        className: 'bg-purple-50 text-purple-900 border-purple-200'
      };
    case 'takeaway':
      return {
        label: 'طلب سفري',
        className: 'bg-blue-50 text-blue-900 border-blue-200'
      };
    case 'delivery':
      return {
        label: 'طلب توصيل',
        className: 'bg-amber-50 text-amber-900 border-amber-200'
      };
    default:
      return {
        label: 'طلب مباشر',
        className: 'bg-stone-50 text-stone-800 border-stone-200'
      };
  }
}

function getPaymentMethodLabel(paymentMethod?: string): string {
  if (paymentMethod === 'cliq') return 'دفع فوري CliQ';
  if (paymentMethod === 'wallet') return 'محفظة إلكترونية';
  return 'نقداً عند الاستلام';
}

export default function LiveOrdersPage() {
  const { currentUser, ownedBusinesses, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Primary view toggle: 'orders' (Live Orders) vs 'stock' (Item Availability)
  const [activeView, setActiveView] = useState<'orders' | 'stock'>('orders');
  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null);

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'completed' | 'cancelled'>('all');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'all' | 'dine_in' | 'takeaway' | 'delivery'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest'>('newest');
  const [searchQuery, setSearchQuery] = useState('');

  // Delete confirmation modal state
  const [deleteConfirmOrderId, setDeleteConfirmOrderId] = useState<string | null>(null);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);

  // Available food businesses
  const [availableBusinesses, setAvailableBusinesses] = useState<Business[]>(
    (ownedBusinesses || []).filter(isFoodAndDrinkBusiness)
  );
  const [selectedBiz, setSelectedBusiness] = useState<Business | null>(null);

  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Audio chime settings & browser autoplay state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('live_orders_sound_enabled') !== 'false';
  });
  const [isAudioActive, setIsAudioActive] = useState<boolean>(() => isAudioAllowed());
  const [soundTesting, setSoundTesting] = useState(false);

  // Tracking known orders to trigger ring only on truly new incoming orders
  const isInitialLoadRef = useRef(true);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const ordersRef = useRef<any[]>([]);
  ordersRef.current = orders;

  // Monitor audio unlocked status
  useEffect(() => {
    const unsub = onAudioStatusChange((unlocked) => {
      setIsAudioActive(unlocked);
    });
    return unsub;
  }, []);

  const toggleSound = () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('live_orders_sound_enabled', String(nextVal));
    }
    if (nextVal) {
      unlockOrderAudio().then(() => {
        playOrderNotificationSound(0.7);
      });
    }
  };

  const handleTestSound = async () => {
    setSoundTesting(true);
    await unlockOrderAudio();
    playUrgentOrderChime();
    await requestOrderNotificationPermission();
    setTimeout(() => setSoundTesting(false), 1200);
  };

  const handleEnableAudio = async () => {
    await unlockOrderAudio();
    playUrgentOrderChime();
    await requestOrderNotificationPermission();
  };

  // Load owned businesses for merchant
  useEffect(() => {
    const foodBusinesses = (ownedBusinesses || []).filter(isFoodAndDrinkBusiness);
    setAvailableBusinesses(foodBusinesses);
    if (foodBusinesses.length > 0 && !selectedBiz) {
      setSelectedBusiness(foodBusinesses[0]);
    }
  }, [ownedBusinesses]);

  // Real-time Business Document & Menu Items Listener
  useEffect(() => {
    if (!selectedBiz?.id || !db) return;
    const bizDocRef = doc(db, 'businesses', selectedBiz.id);
    const unsubBizDoc = onSnapshot(bizDocRef, (snap) => {
      if (snap.exists()) {
        const snapData = snap.data();
        if (snapData && Array.isArray(snapData.menuItems)) {
          setSelectedBusiness(prev => {
            if (!prev) return null;
            return { ...prev, ...snapData, id: snap.id };
          });
          setAvailableBusinesses(prev => {
            return prev.map(b => b.id === snap.id ? { ...b, ...snapData } : b);
          });
          updateBusinessMenuItemsInCache(snap.id, snapData.menuItems);
        }
      }
    }, (err) => {
      console.warn("Real-time business sync notice:", err);
    });

    return () => unsubBizDoc();
  }, [selectedBiz?.id]);

  // Real-time Orders Listener for selected business
  useEffect(() => {
    if (!selectedBiz?.id) {
      setOrders([]);
      setLoadingOrders(false);
      return;
    }

    setLoadingOrders(true);
    let unsubscribeFirestore = () => {};

    const mergeAndSetOrders = (firestoreOrders: any[]) => {
      const local = getLocalOrders(selectedBiz.id);
      const orderMap = new Map<string, any>();

      // 1. Add local orders
      local.forEach(o => {
        if (o.id) orderMap.set(o.id, o);
      });

      // 2. Add Firestore orders (source of truth)
      firestoreOrders.forEach(o => {
        if (o.id) orderMap.set(o.id, { ...orderMap.get(o.id), ...o });
      });

      const merged = Array.from(orderMap.values());
      merged.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      // Audio chime sound & notification when a NEW 'pending' order arrives
      if (!isInitialLoadRef.current && soundEnabled) {
        const newPendingOrders = merged.filter(
          fo => fo.status === 'pending' && !knownOrderIdsRef.current.has(fo.id)
        );
        if (newPendingOrders.length > 0) {
          playUrgentOrderChime();
          newPendingOrders.forEach(ord => {
            showOrderDesktopNotification(ord, selectedBiz?.name);
          });
        }
      }

      // Record known IDs
      merged.forEach(o => {
        if (o.id) knownOrderIdsRef.current.add(o.id);
      });
      isInitialLoadRef.current = false;

      setOrders(merged);
      setLoadingOrders(false);
    };

    // Initialize with local storage immediately
    mergeAndSetOrders([]);

    // Subscribe to cross-tab / local live updates
    const unsubscribeLocal = subscribeToLocalOrders((updatedOrder) => {
      if (updatedOrder && (updatedOrder.businessId === selectedBiz.id || String(updatedOrder.businessId) === String(selectedBiz.id))) {
        if (!isInitialLoadRef.current && soundEnabled && updatedOrder.status === 'pending' && !knownOrderIdsRef.current.has(updatedOrder.id)) {
          playUrgentOrderChime();
          showOrderDesktopNotification(updatedOrder, selectedBiz?.name);
        }
        if (updatedOrder.id) {
          knownOrderIdsRef.current.add(updatedOrder.id);
        }
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
          snapshot.forEach((docSnap) => {
            fetchedOrders.push({ id: docSnap.id, ...docSnap.data() });
          });
          mergeAndSetOrders(fetchedOrders);
        }, (error) => {
          console.warn("Firestore order listener notice:", error?.message || error);
          setLoadingOrders(false);
          fetch(`/api/orders?businessId=${encodeURIComponent(selectedBiz.id)}`)
            .then(res => res.json())
            .then(data => {
              if (data?.orders) mergeAndSetOrders(data.orders);
            })
            .catch(() => {});
        });
      } catch (err) {
        console.warn("Failed to setup orders listener:", err);
        setLoadingOrders(false);
      }
    };

    setupOrdersListener();

    // Background poll safety net every 8 seconds
    const apiPollInterval = setInterval(() => {
      fetch(`/api/orders?businessId=${encodeURIComponent(selectedBiz.id)}`)
        .then(res => res.json())
        .then(data => {
          if (data?.orders && data.orders.length > 0) {
            mergeAndSetOrders(data.orders);
          }
        })
        .catch(() => {});
    }, 8000);

    // Periodic reminder chime every 25 seconds for unattended pending orders
    const pendingReminderInterval = setInterval(() => {
      if (soundEnabled) {
        const hasUnattendedPending = ordersRef.current.some(o => o.status === 'pending');
        if (hasUnattendedPending) {
          playOrderNotificationSound(0.8);
        }
      }
    }, 25000);

    return () => {
      unsubscribeFirestore();
      unsubscribeLocal();
      clearInterval(apiPollInterval);
      clearInterval(pendingReminderInterval);
    };
  }, [selectedBiz?.id, soundEnabled, currentUser?.uid, isAdmin]);

  // Order status updater
  const handleUpdateOrderStatus = async (orderId: string, newStatus: 'pending' | 'processing' | 'completed' | 'cancelled') => {
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

      try {
        if (db) {
          await updateDoc(doc(db, 'orders', orderId), updateData);
        }
      } catch (error) {
        console.warn("Firestore status update notice:", error);
      }
    }
  };

  // Order deletion handler
  const executeDeleteOrder = async () => {
    if (!deleteConfirmOrderId) return;
    setIsDeletingOrder(true);
    const orderId = deleteConfirmOrderId;
    try {
      setOrders(prev => prev.filter(o => o.id !== orderId));
      if (db) {
        await deleteDoc(doc(db, 'orders', orderId));
      }
      setDeleteConfirmOrderId(null);
    } catch (error) {
      console.warn("Order deletion notice:", error);
    } finally {
      setIsDeletingOrder(false);
    }
  };

  // Toggle dish stock availability
  const handleToggleItemAvailability = async (itemId: string, currentStatus: boolean) => {
    if (!selectedBiz) return;
    setUpdatingStockId(itemId);
    try {
      const updatedMenuItems = (selectedBiz.menuItems || []).map((item) => {
        if (String(item.id) === String(itemId)) {
          return { ...item, isAvailable: !currentStatus };
        }
        return item;
      });

      const cleanItems = JSON.parse(JSON.stringify(updatedMenuItems));

      // 1. Direct client Firestore update
      try {
        const bizDocRef = doc(db, 'businesses', selectedBiz.id);
        await updateDoc(bizDocRef, {
          menuItems: cleanItems
        });
      } catch (clientErr) {
        console.warn("Client updateDoc notice, persisting via server sync:", clientErr);
        const token = await auth.currentUser?.getIdToken();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        await fetch('/api/business/menu-stock', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            businessId: selectedBiz.id,
            menuItems: cleanItems
          })
        }).catch(() => {});
      }

      // 2. Guaranteed server-side persistence with merge
      auth.currentUser?.getIdToken().then(token => {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        fetch('/api/business/menu-stock', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            businessId: selectedBiz.id,
            menuItems: cleanItems
          })
        }).catch(err => console.warn('Server menu-stock sync notice:', err));
      }).catch(() => {});

      // 3. Update in all runtime and persistent storage caches
      updateBusinessMenuItemsInCache(selectedBiz.id, cleanItems);

      // 4. Update local state
      setSelectedBusiness(prev => {
        if (!prev) return null;
        return {
          ...prev,
          menuItems: cleanItems
        };
      });

      setAvailableBusinesses(prev => {
        return prev.map(b => {
          if (b.id === selectedBiz.id) {
            return { ...b, menuItems: cleanItems };
          }
          return b;
        });
      });

    } catch (error) {
      console.error("Error updating item availability:", error);
    } finally {
      setUpdatingStockId(null);
    }
  };

  // Print Thermal Receipt ESC/POS Layout
  const printOrderReceipt = (order: any, business: Business | null) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
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

    const footerMessage = business?.receiptFooterMessage || 'شكراً لزيارتكم وصحتين وعافية';

    const itemsHtml = order.items?.map((item: any) => `
      <tr>
        <td style="padding: 6px 0; text-align: right; vertical-align: top; border-bottom: 1px dashed #eee;">
          <div style="font-weight: bold;">${item.name}</div>
          ${item.selectedVersion ? `<div style="font-size: 10px; color: #555;">- ${item.selectedVersion.name}</div>` : ''}
          ${item.options && item.options.length > 0 ? `<div style="font-size: 10px; color: #555;">- خيارات: ${item.options.join(', ')}</div>` : ''}
          ${item.prepTimeMinutes ? `<div style="font-size: 10px; color: #666;">تحضير: ${item.prepTimeMinutes} دقيقة</div>` : ''}
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
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .header { border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px; }
          .order-id { font-size: 15px; font-weight: 900; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          .totals-table { width: 100%; margin-top: 8px; border-top: 1px dashed #000; padding-top: 6px; }
          .totals-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .grand-total { font-size: 14px; font-weight: bold; border-top: 1px solid #000; padding-top: 4px; margin-top: 4px; }
          .footer { border-top: 1px dashed #000; margin-top: 12px; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="center header">
          <h2 style="margin: 0; font-size: 16px;">${business?.name || 'المطعم'}</h2>
          ${business?.address ? `<p style="margin: 2px 0 0; font-size: 10px; color: #444;">${business.address}</p>` : ''}
          ${business?.phone ? `<p style="margin: 2px 0 0; font-size: 10px; font-family: monospace;">هاتف: ${business.phone}</p>` : ''}
          <div class="order-id" style="margin-top: 6px;">طلب #${order.shortCode || order.id}</div>
          <div style="font-size: 10px; color: #555;">${orderDate}</div>
          <div style="font-size: 11px; font-weight: bold; margin-top: 4px; padding: 2px 4px; border: 1px solid #000; display: inline-block;">
            ${orderTypeHtml}
          </div>
        </div>

        <div style="margin-bottom: 6px; font-size: 11px;">
          <div>الزبون: <strong>${order.customerName || 'زبون محترم'}</strong></div>
          ${order.customerPhone ? `<div>الهاتف: <span style="font-family: monospace;">${order.customerPhone}</span></div>` : ''}
          ${order.notes ? `<div style="margin-top: 4px; padding: 4px; background: #eee; font-size: 10px;"><strong>ملاحظات:</strong> ${order.notes}</div>` : ''}
        </div>

        <table>
          <thead>
            <tr style="border-bottom: 1px solid #000; font-size: 11px;">
              <th style="text-align: right; padding-bottom: 4px;">الصنف</th>
              <th style="text-align: center; padding-bottom: 4px; width: 30px;">العدد</th>
              <th style="text-align: left; padding-bottom: 4px; width: 50px;">السعر</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals-table">
          <div class="totals-row">
            <span>المجموع:</span>
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
            <span>الضريبة:</span>
            <span style="font-family: monospace;">${taxFee.toFixed(2)} د.أ</span>
          </div>
          ` : ''}
          ${tipAmount > 0 ? `
          <div class="totals-row">
            <span>الإكرامية:</span>
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
          <p style="margin: 4px 0 0; font-size: 9px; color: #666;">منصة شو في بإربد</p>
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

  // Stats calculation
  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const processingCount = orders.filter(o => o.status === 'processing').length;
  const completedCount = orders.filter(o => o.status === 'completed').length;
  const cancelledCount = orders.filter(o => o.status === 'cancelled').length;

  // Filtered & Sorted orders list
  const filteredOrders = useMemo(() => {
    let result = orders.filter(order => {
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }
      if (orderTypeFilter !== 'all' && order.orderType !== orderTypeFilter) {
        return false;
      }
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

    if (sortBy === 'oldest') {
      result.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    } else if (sortBy === 'highest') {
      result.sort((a, b) => (b.totalPrice || 0) - (a.totalPrice || 0));
    } else {
      result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }

    return result;
  }, [orders, statusFilter, orderTypeFilter, searchQuery, sortBy]);

  // Unique menu categories for stock manager
  const menuCategories = useMemo(() => {
    if (!selectedBiz?.menuItems) return [];
    const cats = new Set<string>();
    selectedBiz.menuItems.forEach(item => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats);
  }, [selectedBiz?.menuItems]);

  if (availableBusinesses.length === 0) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 text-center" dir="rtl">
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-3xl text-amber-800 mb-5 max-w-md">
          <AlertTriangle className="h-10 w-10 mx-auto text-amber-600 mb-3" />
          <h3 className="text-base font-black text-stone-900">لا توجد منشأة طعام ومشروبات مسجلة</h3>
          <p className="text-xs text-stone-600 mt-1.5 leading-relaxed font-bold">
            هذه الشاشة مخصصة لأصحاب المطاعم، المقاهي، ومحلات المأكولات والمشروبات لإدارة الطلبات المباشرة وقائمة الطعام.
          </p>
        </div>
        <Link 
          to="/profile" 
          className="px-6 py-3 bg-[#1a4d2e] hover:bg-[#123a24] text-white text-xs font-black rounded-xl transition-all shadow-sm inline-flex items-center gap-2 cursor-pointer"
        >
          <ArrowRight className="h-4 w-4" />
          <span>العودة للملف الشخصي</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 flex flex-col bg-[#f8f9fa] pb-12 text-stone-800 font-sans selection:bg-emerald-100 min-h-0" dir="rtl">
      
      {/* Top Sub-Header Toolbar */}
      <header className="bg-white border-b border-stone-200/90 sticky top-0 z-30 shadow-2xs w-full">
        <div className="w-full px-3 sm:px-6 lg:px-8 2xl:px-12 py-3 flex items-center justify-between gap-3">
          
          {/* Back button & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <Link 
              to="/profile"
              className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-all shrink-0 cursor-pointer"
              title="العودة للملف الشخصي"
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
            
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-stone-900 truncate">
                  لوحة استقبال الطلبات الحية
                </h1>
                <span className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                  <span>اتصال حي</span>
                </span>
              </div>
              <p className="text-xs text-stone-500 font-bold hidden sm:block truncate">
                {selectedBiz?.name ? `الفرع المباشر: ${selectedBiz.name}` : 'متابعة الطلبات المباشرة'}
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            
            {/* Audio Toggle & Test Controls */}
            <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button
                type="button"
                onClick={toggleSound}
                className={`px-2.5 py-1.5 rounded-lg border transition-all text-xs font-black flex items-center gap-1.5 cursor-pointer ${
                  soundEnabled 
                    ? 'bg-emerald-700 text-white border-emerald-800 shadow-2xs' 
                    : 'bg-stone-200 border-stone-300 text-stone-600'
                }`}
                title={soundEnabled ? "كتم صوت التنبيهات" : "تفعيل صوت التنبيهات"}
              >
                {soundEnabled ? (
                  <Volume2 className="h-3.5 w-3.5" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5" />
                )}
                <span className="hidden md:inline text-[11px]">{soundEnabled ? "الرنة مفعّلة" : "مكتوم"}</span>
              </button>

              {soundEnabled && (
                <button
                  type="button"
                  onClick={handleTestSound}
                  disabled={soundTesting}
                  className="px-2 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-800 text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer border border-stone-200 shadow-2xs disabled:opacity-50"
                  title="تجربة صوت رنة التنبيه"
                >
                  <BellRing className={`h-3.5 w-3.5 text-emerald-700 ${soundTesting ? 'animate-bounce text-emerald-800' : ''}`} />
                  <span className="hidden sm:inline">{soundTesting ? "جارِ الفحص..." : "تجربة الرنة"}</span>
                </button>
              )}
            </div>

            {/* Merchant QR Scanner Shortcut */}
            <Link
              to="/merchant/scanner"
              className="p-2 sm:px-3 sm:py-2 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="ماسح رمز QR للطلبات"
            >
              <QrCode className="h-4 w-4 text-emerald-300" />
              <span className="hidden sm:inline text-xs">ماسح QR</span>
            </Link>

            {/* Public Menu View Button */}
            {selectedBiz && (
              <a 
                href={`/business/${selectedBiz.id}/menu-offers`}
                target="_blank"
                rel="noreferrer"
                className="p-2 sm:px-3 sm:py-2 bg-stone-100 hover:bg-stone-200 border border-stone-200 text-stone-700 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                title="معاينة صفحة المنيو"
              >
                <Store className="h-4 w-4 text-[#1a4d2e]" />
                <span className="hidden lg:inline text-xs">صفحة المنيو</span>
                <ExternalLink className="h-3 w-3 text-stone-400" />
              </a>
            )}
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="w-full px-3 sm:px-6 lg:px-8 2xl:px-12 py-4 flex-1 space-y-4 min-w-0">
        
        {/* Browser Audio Unlock Banner if Autoplay Blocked */}
        {soundEnabled && !isAudioActive && (
          <div 
            onClick={handleEnableAudio}
            role="button"
            tabIndex={0}
            className="bg-amber-50 border border-amber-300 text-amber-900 p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs cursor-pointer hover:bg-amber-100/70 transition-all text-right"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500 text-white rounded-xl shadow-2xs shrink-0">
                <BellRing className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-amber-950">
                  انقر هنا لتفعيل جرس ورنة التنبيه الصوتي في المتصفح
                </h4>
                <p className="text-[11px] text-amber-800 font-bold mt-0.5">
                  يتطلب المتصفح إذناً تشغيلياً لتشغيل الرنة الصوتية فور وصول أي طلب جديد مباشرة.
                </p>
              </div>
            </div>
            <span className="px-3.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-black rounded-xl shadow-2xs transition-all flex items-center gap-1.5 self-end sm:self-center shrink-0">
              <Volume2 className="h-3.5 w-3.5" />
              <span>تفعيل التنبيه الصوتي الآن</span>
            </span>
          </div>
        )}

        {/* Multi-Branch Selector if user has multiple food businesses */}
        {availableBusinesses.length > 1 && (
          <div className="bg-white border border-stone-200 p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs text-right">
            <div>
              <span className="text-xs font-black text-stone-500 block">اختر الفرع أو المنشأة:</span>
              <p className="text-xs text-stone-700 font-bold mt-0.5">
                الفرع النشط حالياً: <strong className="text-emerald-900">{selectedBiz?.name}</strong>
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <select
                value={selectedBiz?.id || ''}
                onChange={(e) => {
                  const target = availableBusinesses.find(b => b.id === e.target.value);
                  if (target) setSelectedBusiness(target);
                }}
                className="appearance-none bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-800 text-xs sm:text-sm font-black rounded-xl pl-8 pr-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer w-full"
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

        {/* Primary View Switch Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 bg-stone-100 rounded-2xl border border-stone-200 w-full" dir="rtl">
          <button
            type="button"
            onClick={() => {
              setActiveView('orders');
              setSearchQuery('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
              activeView === 'orders'
                ? 'bg-white text-emerald-900 shadow-2xs border border-stone-200/80'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Clock className="h-4 w-4 text-emerald-700" />
            <span>لوحة استقبال الطلبات الحية ({orders.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView('stock');
              setSearchQuery('');
            }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
              activeView === 'stock'
                ? 'bg-white text-amber-950 shadow-2xs border border-stone-200/80'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Utensils className="h-4 w-4 text-amber-600" />
            <span>إدارة توفر أطباق المنيو ({selectedBiz?.menuItems?.length || 0})</span>
          </button>
        </div>

        {activeView === 'stock' ? (
          /* View 2: Dish Stock & Availability Modifier */
          <div className="space-y-4 text-right animate-in fade-in" dir="rtl">
            <div className="bg-white border border-stone-200 p-4 rounded-2xl shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-stone-900 text-sm flex items-center gap-2">
                  <Utensils className="h-4 w-4 text-amber-600" />
                  <span>التحكم السريع بتوفر وجبات وأطباق المنيو</span>
                </h3>
                <p className="text-xs text-stone-500 font-bold mt-1">
                  يمكنك إيقاف استقبال الطلبات لأي صنف فور نفاد مكوناته من المطبخ، وتظهر الحالة مباشرة للزبائن في المنيو.
                </p>
              </div>

              {/* Search bar inside stock */}
              <div className="relative w-full sm:w-64 shrink-0">
                <input
                  type="text"
                  placeholder="ابحث عن طبق بالاسم..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 focus:border-amber-500 rounded-xl pr-9 pl-3 py-2 text-xs font-bold text-stone-800 placeholder:text-stone-400 outline-none transition-all"
                />
                <Search className="h-4 w-4 text-stone-400 absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
              </div>
            </div>

            {(!selectedBiz?.menuItems || selectedBiz.menuItems.length === 0) ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center space-y-2 shadow-2xs">
                <Utensils className="h-8 w-8 text-stone-400 mx-auto" />
                <h4 className="font-black text-stone-800 text-sm">لا توجد أطباق مسجلة في منيو هذا المحل</h4>
                <p className="text-xs text-stone-500 font-bold max-w-sm mx-auto">
                  قم بإضافة وجبات المنيو أولاً من صفحة تعديل المحل في لوحة التحكم.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {(menuCategories.length === 0 ? ['أصناف المنيو'] : menuCategories).map(catName => {
                  const catItems = (selectedBiz?.menuItems || []).filter(item => {
                    const matchesCategory = menuCategories.length === 0 || item.category === catName;
                    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
                    return matchesCategory && matchesSearch;
                  });

                  if (catItems.length === 0) return null;

                  return (
                    <div key={catName} className="space-y-3">
                      <div className="flex items-center gap-2 border-r-3 border-amber-500 pr-2.5">
                        <h4 className="font-black text-sm text-stone-900">{catName}</h4>
                        <span className="text-xs text-stone-400 font-bold">({catItems.length})</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4">
                        {catItems.map((item) => {
                          const isAvailable = item.isAvailable !== false;
                          const isUpdating = updatingStockId === item.id;
                          return (
                            <div 
                              key={item.id} 
                              className={`bg-white rounded-xl border p-3 flex items-center justify-between gap-3 transition-all shadow-2xs ${
                                isAvailable ? 'border-stone-200' : 'border-rose-200 bg-rose-50/20'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {item.imageUrl ? (
                                  <img 
                                    src={item.imageUrl} 
                                    alt={item.name} 
                                    className={`w-12 h-12 rounded-lg object-cover shrink-0 border border-stone-200 ${!isAvailable ? 'grayscale opacity-75' : ''}`} 
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-stone-100 text-stone-400 border border-stone-200 flex items-center justify-center shrink-0">
                                    <Utensils className="h-5 w-5 text-stone-400" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <h5 className="font-black text-xs text-stone-900 truncate">{item.name}</h5>
                                  <span className="text-xs font-mono text-emerald-800 font-bold block mt-0.5">
                                    {parseFloat(item.price).toFixed(2)} د.أ
                                  </span>
                                </div>
                              </div>

                              <button
                                type="button"
                                disabled={isUpdating}
                                onClick={() => handleToggleItemAvailability(item.id, isAvailable)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border flex items-center gap-1 shrink-0 ${
                                  isAvailable 
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200' 
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border-rose-200'
                                }`}
                              >
                                {isUpdating ? (
                                  <div className="w-3.5 h-3.5 border-2 border-stone-800 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                  isAvailable ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />
                                )}
                                <span>{isAvailable ? 'متوفر' : 'غير متوفر'}</span>
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
          /* View 1: Live Orders Dashboard */
          <>
            {/* KPI Status Summary Cards (Interactive Filters) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-right">
              
              {/* Card 1: All Orders */}
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                    : 'bg-white text-stone-800 border-stone-200 shadow-2xs hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black ${statusFilter === 'all' ? 'text-stone-300' : 'text-stone-500'}`}>
                    إجمالي اليوم
                  </span>
                  <ShoppingBag className={`h-4 w-4 ${statusFilter === 'all' ? 'text-stone-300' : 'text-stone-400'}`} />
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xl sm:text-2xl font-black font-mono">{orders.length}</span>
                  <span className={`text-[10px] font-bold ${statusFilter === 'all' ? 'text-stone-300' : 'text-stone-400'}`}>
                    طلب
                  </span>
                </div>
              </button>

              {/* Card 2: Pending (New) */}
              <button
                type="button"
                onClick={() => setStatusFilter('pending')}
                className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
                  statusFilter === 'pending'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                    : 'bg-amber-50/60 text-amber-950 border-amber-200 shadow-2xs hover:border-amber-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black ${statusFilter === 'pending' ? 'text-amber-100' : 'text-amber-800'}`}>
                    بانتظار الموافقة
                  </span>
                  <Clock className={`h-4 w-4 ${statusFilter === 'pending' ? 'text-amber-100' : 'text-amber-600'}`} />
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xl sm:text-2xl font-black font-mono">{pendingCount}</span>
                  {pendingCount > 0 && (
                    <span className="text-[10px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-md animate-pulse">
                      جديد
                    </span>
                  )}
                </div>
              </button>

              {/* Card 3: In Kitchen (Processing) */}
              <button
                type="button"
                onClick={() => setStatusFilter('processing')}
                className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
                  statusFilter === 'processing'
                    ? 'bg-sky-700 text-white border-sky-700 shadow-sm'
                    : 'bg-sky-50/60 text-sky-950 border-sky-200 shadow-2xs hover:border-sky-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black ${statusFilter === 'processing' ? 'text-sky-100' : 'text-sky-800'}`}>
                    قيد التحضير
                  </span>
                  <CookingPot className={`h-4 w-4 ${statusFilter === 'processing' ? 'text-sky-100' : 'text-sky-600'}`} />
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xl sm:text-2xl font-black font-mono">{processingCount}</span>
                  <span className={`text-[10px] font-bold ${statusFilter === 'processing' ? 'text-sky-200' : 'text-sky-600'}`}>
                    بالمطبخ
                  </span>
                </div>
              </button>

              {/* Card 4: Completed (Ready) */}
              <button
                type="button"
                onClick={() => setStatusFilter('completed')}
                className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
                  statusFilter === 'completed'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                    : 'bg-emerald-50/60 text-emerald-950 border-emerald-200 shadow-2xs hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black ${statusFilter === 'completed' ? 'text-emerald-100' : 'text-emerald-800'}`}>
                    مكتملة وجاهزة
                  </span>
                  <CheckCircle2 className={`h-4 w-4 ${statusFilter === 'completed' ? 'text-emerald-100' : 'text-emerald-600'}`} />
                </div>
                <div className="mt-1 flex items-baseline justify-between">
                  <span className="text-xl sm:text-2xl font-black font-mono">{completedCount}</span>
                  <span className={`text-[10px] font-bold ${statusFilter === 'completed' ? 'text-emerald-200' : 'text-emerald-600'}`}>
                    منجز
                  </span>
                </div>
              </button>

            </div>

            {/* Structured Search, Filter & Sort Toolbar */}
            <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs space-y-3">
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
                
                {/* Search Bar */}
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ابحث برقم الطلب، اسم الزبون، الهاتف، أو الطاولة..."
                    className="w-full bg-stone-50 border border-stone-200 focus:border-emerald-600 rounded-xl pr-9 pl-8 py-2.5 text-xs font-bold text-stone-800 placeholder:text-stone-400 outline-none transition-all"
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

                {/* Secondary Selectors (Order Type & Sorting) */}
                <div className="flex items-center gap-2">
                  
                  {/* Order Type Filter */}
                  <div className="relative">
                    <select
                      value={orderTypeFilter}
                      onChange={(e) => setOrderTypeFilter(e.target.value as any)}
                      className="appearance-none bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-800 text-xs font-bold rounded-xl pr-3 pl-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                    >
                      <option value="all">كافة أنواع الطلبات</option>
                      <option value="dine_in">صالة وطاولات</option>
                      <option value="takeaway">طلب سفري</option>
                      <option value="delivery">طلب توصيل</option>
                    </select>
                    <ChevronDown className="h-3.5 w-3.5 text-stone-400 absolute top-1/2 -translate-y-1/2 left-2.5 pointer-events-none" />
                  </div>

                  {/* Sorting Filter */}
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="appearance-none bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-800 text-xs font-bold rounded-xl pr-3 pl-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
                    >
                      <option value="newest">الأحدث أولاً</option>
                      <option value="oldest">الأقدم أولاً (الأطول انتظاراً)</option>
                      <option value="highest">الأعلى سعراً</option>
                    </select>
                    <ArrowUpDown className="h-3.5 w-3.5 text-stone-400 absolute top-1/2 -translate-y-1/2 left-2.5 pointer-events-none" />
                  </div>

                </div>

              </div>

              {/* Status Segmented Buttons Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none pt-1 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                    statusFilter === 'pending'
                      ? 'bg-amber-600 text-white shadow-2xs'
                      : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                  }`}
                >
                  بانتظار الموافقة ({pendingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('processing')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                    statusFilter === 'processing'
                      ? 'bg-sky-700 text-white shadow-2xs'
                      : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
                  }`}
                >
                  قيد التحضير ({processingCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('completed')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                    statusFilter === 'completed'
                      ? 'bg-emerald-700 text-white shadow-2xs'
                      : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                  }`}
                >
                  مكتملة ({completedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('cancelled')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black shrink-0 transition-all cursor-pointer ${
                    statusFilter === 'cancelled'
                      ? 'bg-rose-700 text-white shadow-2xs'
                      : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                  }`}
                >
                  ملغاة ({cancelledCount})
                </button>

                {(searchQuery || statusFilter !== 'all' || orderTypeFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setOrderTypeFilter('all');
                      setSortBy('newest');
                    }}
                    className="px-2.5 py-1 text-[11px] font-bold text-stone-500 hover:text-stone-800 mr-auto shrink-0 cursor-pointer"
                  >
                    إعادة ضبط الفلاتر
                  </button>
                )}
              </div>
            </div>

            {/* Orders Listing Grid */}
            {loadingOrders ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3 shadow-2xs">
                <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-bold text-stone-500">جاري الاتصال وتحديث قائمة الطلبات الحية...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-stone-200 p-10 sm:p-14 text-center space-y-3 max-w-md mx-auto shadow-2xs">
                <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center mx-auto text-stone-400 border border-stone-100">
                  <Utensils className="h-6 w-6 text-stone-400" />
                </div>
                <h4 className="font-black text-stone-900 text-sm">
                  {searchQuery || statusFilter !== 'all' || orderTypeFilter !== 'all' 
                    ? 'لا توجد طلبات مطابقة لمعايير البحث' 
                    : 'لا توجد طلبات واردة اليوم حتى الآن'}
                </h4>
                <p className="text-xs text-stone-500 font-bold leading-relaxed max-w-sm mx-auto">
                  {searchQuery || statusFilter !== 'all' || orderTypeFilter !== 'all' 
                    ? 'يمكنك تغيير نص البحث أو خيارات التصفية لعرض بقية الطلبات.' 
                    : 'تصل الطلبات الجديدة فورياً إلى هذه الشاشة مع رنة تنبيه صوتية عند قيام الزبائن بالطلب عبر المنيو الرقمي.'}
                </p>
                {(searchQuery || statusFilter !== 'all' || orderTypeFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setOrderTypeFilter('all');
                    }}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    عرض كافة الطلبات
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5 sm:gap-4.5 text-right">
                {filteredOrders.map((order) => {
                  const orderDate = new Date(order.createdAt).toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' });
                  const elapsedText = getElapsedTime(order.createdAt);
                  const typeBadge = getOrderTypeBadge(order.orderType, order.tableNumber);
                  
                  // Phone & WhatsApp action links
                  const rawPhone = String(order.customerPhone || '').replace(/\D/g, '');
                  const waPhone = rawPhone.startsWith('0') ? `962${rawPhone.substring(1)}` : rawPhone;
                  const waLink = `https://wa.me/${waPhone}?text=${encodeURIComponent(`مرحباً ${order.customerName || 'عزيزي الزبون'}، بخصوص طلبك رقم (${order.shortCode || order.id}) من ${selectedBiz?.name || 'المطعم'}`)}`;
                  const telLink = `tel:${order.customerPhone}`;

                  const isPending = order.status === 'pending';
                  const isProcessing = order.status === 'processing';
                  const isCompleted = order.status === 'completed';
                  const isCancelled = order.status === 'cancelled';

                  const maxPrep = order.items?.reduce((m: number, it: any) => Math.max(m, it.prepTimeMinutes || 0), 0) || 0;

                  return (
                    <div 
                      key={order.id} 
                      className={`rounded-2xl border p-4 flex flex-col justify-between gap-3.5 transition-all relative overflow-hidden bg-white shadow-2xs ${
                        isPending
                          ? 'border-amber-300 ring-2 ring-amber-300/20'
                          : isProcessing
                          ? 'border-sky-300 ring-2 ring-sky-300/10'
                          : isCompleted
                          ? 'border-emerald-200'
                          : 'border-stone-200 opacity-80'
                      }`}
                    >
                      {/* Top Accent Strip */}
                      {isPending && <div className="absolute top-0 inset-x-0 h-1.5 bg-amber-500" />}
                      {isProcessing && <div className="absolute top-0 inset-x-0 h-1.5 bg-sky-600" />}
                      {isCompleted && <div className="absolute top-0 inset-x-0 h-1.5 bg-emerald-600" />}
                      {isCancelled && <div className="absolute top-0 inset-x-0 h-1.5 bg-rose-500" />}

                      {/* Header Row: ID, Time, Elapsed & Type */}
                      <div className="flex items-start justify-between gap-2 pt-1">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="bg-stone-900 text-white font-mono font-black text-xs px-2.5 py-0.5 rounded-lg shadow-2xs">
                              #{order.shortCode || order.id?.slice(0, 6)}
                            </span>
                            <span className={`text-[11px] font-black border px-2 py-0.5 rounded-lg ${typeBadge.className}`}>
                              {typeBadge.label}
                            </span>
                          </div>

                          <div className="text-[11px] text-stone-500 font-bold flex items-center gap-2">
                            <span>{orderDate}</span>
                            {elapsedText && (
                              <span className="text-stone-400">({elapsedText})</span>
                            )}
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0">
                          {isPending && (
                            <span className="text-[11px] font-black bg-amber-500 text-white px-2.5 py-1 rounded-full flex items-center gap-1 shadow-2xs animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                              <span>بانتظار الموافقة</span>
                            </span>
                          )}
                          {isProcessing && (
                            <span className="text-[11px] font-black bg-sky-700 text-white px-2.5 py-1 rounded-full shadow-2xs flex items-center gap-1">
                              <CookingPot className="h-3.5 w-3.5" />
                              <span>قيد التحضير</span>
                            </span>
                          )}
                          {isCompleted && (
                            <span className="text-[11px] font-black bg-emerald-700 text-white px-2.5 py-1 rounded-full shadow-2xs flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" />
                              <span>جاهز ومكتمل</span>
                            </span>
                          )}
                          {isCancelled && (
                            <span className="text-[11px] font-black bg-rose-600 text-white px-2.5 py-1 rounded-full shadow-2xs">
                              <span>ملغي</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Customer Row */}
                      <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-200/80 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <User className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                            <span className="text-xs font-black text-stone-900 truncate">
                              {order.customerName || 'زبون'}
                            </span>
                          </div>

                          {order.customerPhone && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <a
                                href={telLink}
                                className="px-2 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all shadow-2xs cursor-pointer"
                                title="اتصال هاتفي"
                              >
                                <Phone className="h-3 w-3 text-emerald-700" />
                                <span className="font-mono">{order.customerPhone}</span>
                              </a>

                              <a
                                href={waLink}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all shadow-2xs flex items-center justify-center cursor-pointer"
                                title="مراسلة عبر واتساب"
                              >
                                <MessageCircle className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Delivery address if delivery type */}
                        {order.orderType === 'delivery' && order.tableNumber && (
                          <div className="text-[11px] font-bold text-stone-600 flex items-center gap-1 pt-0.5">
                            <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                            <span>العنوان: <strong className="text-stone-900">{order.tableNumber}</strong></span>
                          </div>
                        )}

                        {/* Customer Notes */}
                        {order.notes && (
                          <div className="text-[11px] font-bold text-amber-950 bg-amber-50/90 p-2 rounded-lg border border-amber-200 flex items-start gap-1.5 leading-snug">
                            <FileText className="h-3.5 w-3.5 text-amber-700 shrink-0 mt-0.5" />
                            <span>ملاحظة: <strong>{order.notes}</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Items Ordered List */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-black text-stone-400 block">تفاصيل الأصناف المطلوبة:</span>
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-0.5">
                          {order.items?.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center text-xs font-bold text-stone-800 bg-stone-50 p-2 rounded-lg border border-stone-100">
                              <span className="flex items-center gap-1.5 min-w-0 flex-1">
                                <span className="bg-white text-emerald-900 font-black min-w-[22px] h-5 rounded-md flex items-center justify-center text-[11px] border border-stone-200 shadow-2xs shrink-0 font-mono">
                                  {item.quantity}×
                                </span>
                                <span className="truncate">{item.name}</span>
                                {item.prepTimeMinutes ? (
                                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded-md shrink-0">
                                    {item.prepTimeMinutes} دقيقة
                                  </span>
                                ) : null}
                              </span>
                              <span className="font-mono text-stone-800 text-xs font-black shrink-0 mr-2">
                                {(item.price * item.quantity).toFixed(2)} د.أ
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Prep Time & Total Calculation */}
                      <div className="space-y-2 pt-1 border-t border-stone-100">
                        {maxPrep > 0 && (
                          <div className="flex justify-between items-center text-[11px] font-bold text-amber-950 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-amber-700" />
                              <span>وقت التحضير المقدر:</span>
                            </span>
                            <span className="font-black text-amber-950">~{maxPrep} دقيقة</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center bg-stone-50 px-3 py-2 rounded-xl border border-stone-200">
                          <div>
                            <span className="text-xs font-black text-stone-500 block">الحساب الإجمالي</span>
                            <span className="text-[10px] font-bold text-stone-400">
                              {getPaymentMethodLabel(order.paymentMethod)}
                            </span>
                          </div>
                          <span className="text-base font-black text-emerald-900 font-mono">
                            {(order.totalPrice || 0).toFixed(2)} د.أ
                          </span>
                        </div>

                        {/* Action Buttons Matrix */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          
                          {/* Print Receipt Button */}
                          <button
                            type="button"
                            onClick={() => printOrderReceipt(order, selectedBiz)}
                            className="w-full py-2 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 sm:col-span-2"
                          >
                            <Printer className="h-3.5 w-3.5 text-stone-600 shrink-0" />
                            <span>طباعة إيصال حراري للطلب</span>
                          </button>
                          
                          {/* State: Pending -> Accept or Cancel */}
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdateOrderStatus(order.id, 'processing')}
                                className="w-full py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-2xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
                              >
                                <CookingPot className="h-4 w-4" />
                                <span>قبول وبدء التحضير</span>
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                                className="w-full py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-black cursor-pointer transition-all"
                              >
                                <span>رفض الطلب</span>
                              </button>
                            </>
                          )}

                          {/* State: Processing -> Mark Ready or Cancel */}
                          {isProcessing && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleUpdateOrderStatus(order.id, 'completed')}
                                className="w-full py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-2xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
                              >
                                <Check className="h-4 w-4" />
                                <span>تأكيد الجاهزية والاستلام</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                                className="w-full py-2.5 px-3 bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-700 rounded-xl text-xs font-bold cursor-pointer transition-all"
                              >
                                <span>إلغاء</span>
                              </button>
                            </>
                          )}

                          {/* State: Completed or Cancelled -> Delete / Archive */}
                          {(isCompleted || isCancelled) && (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmOrderId(order.id)}
                              className="w-full py-2 px-3 bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-700 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 sm:col-span-2"
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

      {/* In-app Order Deletion Confirmation Modal */}
      {deleteConfirmOrderId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" dir="rtl">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-11 h-11 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="h-5 w-5" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-stone-900">أرشفة وحذف الطلب</h3>
              <p className="text-xs text-stone-600 font-bold leading-relaxed">
                هل أنت متأكد من حذف هذا الطلب نهائياً من لوحة المتابعة المباشرة؟
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmOrderId(null)}
                disabled={isDeletingOrder}
                className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-50 cursor-pointer disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={executeDeleteOrder}
                disabled={isDeletingOrder}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black disabled:opacity-50 transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isDeletingOrder ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>جارٍ الحذف...</span>
                  </>
                ) : (
                  <span>تأكيد الحذف</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
