import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { deleteOfferCascading } from '../../lib/businessDeleteHelper';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  where, 
  limit 
} from 'firebase/firestore';
import { 
  Trash2, 
  Tag, 
  Gift, 
  Coffee, 
  Star, 
  MessageSquare, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Eye, 
  Check, 
  AlertCircle, 
  Clock, 
  ExternalLink 
} from 'lucide-react';
import { Business, MenuItem } from '../../types';
import { getBusinessVipStatus } from '../../lib/vipHelper';

interface ExtendedAdminManagerProps {
  activeTab: string;
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
  confirm: (options: any) => Promise<boolean>;
}

export function ExtendedAdminManager({ activeTab, showToast, confirm }: ExtendedAdminManagerProps) {
  const [loading, setLoading] = useState(true);

  // 1. Offers tab states
  const [offers, setOffers] = useState<any[]>([]);
  const [offersSearch, setOffersSearch] = useState('');

  // 2. Wheel Coupons states
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponsSearch, setCouponsSearch] = useState('');
  const [couponsFilter, setCouponsFilter] = useState<'all' | 'active' | 'consumed'>('all');

  // 3. Digital Menus states
  const [menuBusinesses, setMenuBusinesses] = useState<Business[]>([]);
  const [menusSearch, setMenusSearch] = useState('');
  const [expandedBizId, setExpandedBizId] = useState<string | null>(null);

  // 4. Reviews states
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsSearch, setReviewsSearch] = useState('');

  // 5. Chats Audit states
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [chatsSearch, setChatsSearch] = useState('');
  const [selectedRoomIdForTranscript, setSelectedRoomIdForTranscript] = useState<string | null>(null);
  const [roomMessages, setRoomMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (!db) return;

      if (activeTab === 'offers') {
        const q = query(collection(db, 'offers'), orderBy('createdAt', 'desc'), limit(150));
        const snap = await getDocs(q);
        const list: any[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setOffers(list);
      } else if (activeTab === 'wheel_coupons') {
        const q = query(collection(db, 'user_rewards'), orderBy('createdAt', 'desc'), limit(150));
        const snap = await getDocs(q);
        const list: any[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setCoupons(list);
      } else if (activeTab === 'menus') {
        const q = query(collection(db, 'businesses'), limit(300));
        const snap = await getDocs(q);
        const list: Business[] = [];
        snap.forEach(d => {
          const biz = { id: d.id, ...d.data() } as Business;
          if (biz.menuItems && biz.menuItems.length > 0) {
            list.push(biz);
          }
        });
        setMenuBusinesses(list);
      } else if (activeTab === 'reviews') {
        const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'), limit(150));
        const snap = await getDocs(q);
        const list: any[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setReviews(list);
      } else if (activeTab === 'chats_audit') {
        const q = query(collection(db, 'chatRooms'), orderBy('updatedAt', 'desc'), limit(100));
        const snap = await getDocs(q);
        const list: any[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        setChatRooms(list);
      }
    } catch (err) {
      console.error("Error fetching admin data:", err);
      showToast("حدث خطأ أثناء تحميل البيانات من الخادم", "error");
    } finally {
      setLoading(false);
    }
  };

  // 1. Delete Offer Handler
  const handleDeleteOffer = async (offerId: string, title: string) => {
    if (!db) return;
    const isConfirmed = await confirm({
      title: "حذف العرض الترويجي",
      message: `هل أنت متأكد من حذف العرض الترويجي "${title}" نهائياً من المنصة؟`,
      confirmText: "نعم، حذف",
      cancelText: "تراجع",
      variant: "danger"
    });
    if (!isConfirmed) return;

    try {
      await deleteOfferCascading(offerId);
      setOffers(prev => prev.filter(o => o.id !== offerId));
      showToast("تم حذف العرض الترويجي بنجاح");
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء حذف العرض", "error");
    }
  };

  // 2. Toggle Reward Consumption Handler
  const handleToggleRewardConsumed = async (rewardId: string, currentStatus: boolean) => {
    if (!db) return;
    try {
      const ref = doc(db, 'user_rewards', rewardId);
      const nextStatus = !currentStatus;
      await updateDoc(ref, {
        isConsumed: nextStatus,
        consumedAt: nextStatus ? Date.now() : null
      });
      setCoupons(prev => prev.map(c => c.id === rewardId ? { ...c, isConsumed: nextStatus, consumedAt: nextStatus ? Date.now() : null } : c));
      showToast(nextStatus ? "تم تمييز الكوبون كمستخدم بنجاح" : "تم إلغاء تمييز الاستهلاك");
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء تعديل حالة الكوبون", "error");
    }
  };

  const handleDeleteReward = async (rewardId: string) => {
    if (!db) return;
    const isConfirmed = await confirm({
      title: "حذف الكوبون",
      message: "هل أنت متأكد من حذف هذا الكوبون وسجل الجائزة نهائياً؟",
      confirmText: "نعم، حذف",
      cancelText: "تراجع",
      variant: "danger"
    });
    if (!isConfirmed) return;

    try {
      await deleteDoc(doc(db, 'user_rewards', rewardId));
      setCoupons(prev => prev.filter(c => c.id !== rewardId));
      showToast("تم حذف سجل الجائزة بنجاح");
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء حذف الجائزة", "error");
    }
  };

  // 3. Delete individual menu item Handler
  const handleDeleteMenuItem = async (businessId: string, itemId: string, itemName: string) => {
    if (!db) return;
    const isConfirmed = await confirm({
      title: "حذف صنف من المنيو",
      message: `هل أنت متأكد من حذف صنف "${itemName}" من قائمة طعام هذا المحل؟`,
      confirmText: "نعم، حذف",
      cancelText: "تراجع",
      variant: "danger"
    });
    if (!isConfirmed) return;

    try {
      const biz = menuBusinesses.find(b => b.id === businessId);
      if (!biz || !biz.menuItems) return;

      const updatedMenuItems = biz.menuItems.filter((item: any) => item.id !== itemId);

      await updateDoc(doc(db, 'businesses', businessId), {
        menuItems: updatedMenuItems
      });

      setMenuBusinesses(prev => prev.map(b => b.id === businessId ? { ...b, menuItems: updatedMenuItems } : b));
      showToast("تم حذف صنف المنيو بنجاح");
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء تعديل المنيو", "error");
    }
  };

  // 4. Delete review Handler
  const handleDeleteReview = async (reviewId: string) => {
    if (!db) return;
    const isConfirmed = await confirm({
      title: "حذف تقييم",
      message: "هل أنت متأكد من حذف هذا التقييم والتعليق نهائياً من المنصة؟",
      confirmText: "نعم، حذف",
      cancelText: "تراجع",
      variant: "danger"
    });
    if (!isConfirmed) return;

    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      showToast("تم حذف التقييم بنجاح");
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء حذف التقييم", "error");
    }
  };

  // 5. Chat audit transcript viewer
  const handleLoadTranscript = async (roomId: string) => {
    if (!db) return;
    setSelectedRoomIdForTranscript(roomId);
    setLoadingMessages(true);
    try {
      const snap = await getDocs(query(collection(db, 'chatRooms', roomId, 'messages'), orderBy('createdAt', 'asc'), limit(100)));
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setRoomMessages(list);
    } catch (err) {
      console.error(err);
      showToast("تعذر تحميل رسائل الدردشة", "error");
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleDeleteChatRoom = async (roomId: string, name: string) => {
    if (!db) return;
    const isConfirmed = await confirm({
      title: "حذف غرفة الدردشة",
      message: `هل أنت متأكد من حذف غرفة الدردشة مع "${name}" وكل رسائلها نهائياً؟`,
      confirmText: "نعم، حذف",
      cancelText: "تراجع",
      variant: "danger"
    });
    if (!isConfirmed) return;

    try {
      // Delete messages first
      const messagesSnap = await getDocs(collection(db, 'chatRooms', roomId, 'messages'));
      for (const mDoc of messagesSnap.docs) {
        await deleteDoc(doc(db, 'chatRooms', roomId, 'messages', mDoc.id));
      }
      await deleteDoc(doc(db, 'chatRooms', roomId));
      setChatRooms(prev => prev.filter(r => r.id !== roomId));
      if (selectedRoomIdForTranscript === roomId) {
        setSelectedRoomIdForTranscript(null);
        setRoomMessages([]);
      }
      showToast("تم مسح غرفة الدردشة بنجاح");
    } catch (err) {
      console.error(err);
      showToast("حدث خطأ أثناء مسح المحادثة", "error");
    }
  };

  // Filter computations
  const filteredOffers = offers.filter(o => {
    if (!offersSearch.trim()) return true;
    const q = offersSearch.toLowerCase();
    return (o.title || '').toLowerCase().includes(q) || (o.businessName || '').toLowerCase().includes(q);
  });

  const filteredCoupons = coupons.filter(c => {
    const matchesSearch = !couponsSearch.trim() || 
      (c.code || '').toLowerCase().includes(couponsSearch.toLowerCase()) || 
      (c.rewardName || '').toLowerCase().includes(couponsSearch.toLowerCase()) || 
      (c.userEmail || '').toLowerCase().includes(couponsSearch.toLowerCase());
    
    if (!matchesSearch) return false;
    if (couponsFilter === 'active' && c.isConsumed) return false;
    if (couponsFilter === 'consumed' && !c.isConsumed) return false;
    return true;
  });

  const filteredMenus = menuBusinesses.filter(b => {
    if (!menusSearch.trim()) return true;
    const q = menusSearch.toLowerCase();
    return b.name.toLowerCase().includes(q) || (b.category || '').toLowerCase().includes(q);
  });

  const filteredReviews = reviews.filter(r => {
    if (!reviewsSearch.trim()) return true;
    const q = reviewsSearch.toLowerCase();
    return (r.businessName || '').toLowerCase().includes(q) || 
      (r.userName || '').toLowerCase().includes(q) || 
      (r.text || '').toLowerCase().includes(q);
  });

  const filteredChats = chatRooms.filter(r => {
    if (!chatsSearch.trim()) return true;
    const q = chatsSearch.toLowerCase();
    return (r.userName || '').toLowerCase().includes(q) || 
      (r.businessName || '').toLowerCase().includes(q) || 
      (r.lastMessage || '').toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-3 bg-white rounded-3xl border border-[#e5e1da]">
        <Clock className="h-8 w-8 text-[#1a4d2e] animate-spin" />
        <span className="text-xs font-bold text-stone-500">جاري تحميل واجهة الإدارة المتقدمة...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. OFFERS TAB */}
      {activeTab === 'offers' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 text-emerald-950 text-right space-y-1 shadow-3xs">
            <h3 className="font-black text-sm flex items-center gap-2">
              <Tag className="h-5 w-5 text-[#1a4d2e]" />
              <span>دليل وإدارة العروض والخصومات النشطة</span>
            </h3>
            <p className="text-xs text-stone-600 font-bold">
              تظهر هنا جميع الحملات التسويقية والخصومات النشطة والمنشورة بواسطة المحلات وأصحاب الأعمال التجارية في إربد. يمكنك مراجعة العروض، وحجب العروض المخالفة فوراً لضمان سلامة المحتوى.
            </p>
          </div>

          <div className="bg-white p-4.5 rounded-3xl border border-[#e5e1da] shadow-xs">
            <div className="relative w-full">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                value={offersSearch}
                onChange={e => setOffersSearch(e.target.value)}
                placeholder="ابحث باسم العرض، المتجر أو تفاصيل الخصم..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-10 pl-4 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#e5e1da] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 border-b border-stone-200/60 text-xs font-black">
                    <th className="p-4">العرض الترويجي</th>
                    <th className="p-4">المتجر / المحل الناشر</th>
                    <th className="p-4 text-center">قيمة الخصم</th>
                    <th className="p-4 text-center">تاريخ الإنشاء</th>
                    <th className="p-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs font-bold text-stone-700">
                  {filteredOffers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-stone-400">
                        لا توجد عروض ترويجية نشطة مطابقة حالياً.
                      </td>
                    </tr>
                  ) : (
                    filteredOffers.map(o => (
                      <tr key={o.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="p-4">
                          <div className="space-y-1">
                            <span className="font-black text-stone-900 text-sm">{o.title}</span>
                            <p className="text-[11px] text-stone-400 font-semibold line-clamp-1">{o.description}</p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-stone-800 font-black">{o.businessName || 'محل تجاري'}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full text-[10px] font-black">
                            {o.discountValue || 'خصم مخصص'}
                          </span>
                        </td>
                        <td className="p-4 text-center text-stone-500 font-mono text-[11px]">
                          {o.createdAt ? new Date(o.createdAt).toLocaleDateString('ar-JO') : 'غير محدد'}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDeleteOffer(o.id, o.title)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف العرض نهائياً"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. WHEEL COUPONS TAB */}
      {activeTab === 'wheel_coupons' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 text-emerald-950 text-right space-y-1 shadow-3xs">
            <h3 className="font-black text-sm flex items-center gap-2">
              <Gift className="h-5 w-5 text-[#1a4d2e]" />
              <span>تتبع أصحاب الجوائز وكوبونات عجلة الحظ</span>
            </h3>
            <p className="text-xs text-stone-600 font-bold">
              مراقبة وتتبع الكوبونات والجوائز الصادرة عن عجلة الحظ التفاعلية. يمكنك التحقق من فوز المستخدمين، وتمييز الكوبونات المستعملة والمستهلكة لدى المحلات لمنع التكرار وسوء الاستخدام.
            </p>
          </div>

          <div className="bg-white p-4.5 rounded-3xl border border-[#e5e1da] shadow-xs flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                value={couponsSearch}
                onChange={e => setCouponsSearch(e.target.value)}
                placeholder="ابحث برمز الكوبون، الجائزة، بريد المستخدم..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-10 pl-4 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-500 whitespace-nowrap">التصفية:</span>
              <select
                value={couponsFilter}
                onChange={e => setCouponsFilter(e.target.value as any)}
                className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-700 focus:outline-none"
              >
                <option value="all">كل الكوبونات</option>
                <option value="active">نشطة ومتاحة</option>
                <option value="consumed">مستهلكة ومستعملة</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#e5e1da] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 border-b border-stone-200/60 text-xs font-black">
                    <th className="p-4">رمز الكوبون</th>
                    <th className="p-4">الجائزة والهدية المكتسبة</th>
                    <th className="p-4">الفائز / حساب العضو</th>
                    <th className="p-4 text-center">تاريخ الفوز</th>
                    <th className="p-4 text-center">حالة الاستهلاك</th>
                    <th className="p-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs font-bold text-stone-700">
                  {filteredCoupons.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-stone-400">
                        لا توجد كوبونات جوائز مطابقة حالياً.
                      </td>
                    </tr>
                  ) : (
                    filteredCoupons.map(c => (
                      <tr key={c.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="p-4 font-mono font-black text-[#1a4d2e] text-sm">{c.code}</td>
                        <td className="p-4">
                          <span className="text-stone-800 font-bold">{c.rewardName || 'جائزة قيمة'}</span>
                        </td>
                        <td className="p-4">
                          <div className="text-stone-600 font-medium text-[11px] font-mono">{c.userEmail || c.userId || 'زائر مجهول'}</div>
                        </td>
                        <td className="p-4 text-center text-stone-500 font-mono text-[11px]">
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString('ar-JO') : 'غير محدد'}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleToggleRewardConsumed(c.id, c.isConsumed)}
                            className={`px-3 py-1 rounded-full text-[10px] font-black transition-all cursor-pointer ${
                              c.isConsumed
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-emerald-50 text-[#1a4d2e] border border-emerald-200'
                            }`}
                          >
                            {c.isConsumed ? 'مستهلكة ومستعملة 🔴' : 'نشطة وصالحة 🟢'}
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDeleteReward(c.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف السجل نهائياً"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. DIGITAL MENUS TAB */}
      {activeTab === 'menus' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 text-emerald-950 text-right space-y-1 shadow-3xs">
            <h3 className="font-black text-sm flex items-center gap-2">
              <Coffee className="h-5 w-5 text-[#1a4d2e]" />
              <span>مراقبة وإدارة القوائم الرقمية للمطاعم والمحلات</span>
            </h3>
            <p className="text-xs text-stone-600 font-bold">
              تصفح ومراقبة الكتالوجات والقوائم الرقمية (Menus) المرفوعة بواسطة المحلات التجارية والمراكز الطبية. يمكنك تدقيق الأصناف والخدمات والأسعار وحذف أي صنف مخالف للسياسات بضغطة زر.
            </p>
          </div>

          <div className="bg-white p-4.5 rounded-3xl border border-[#e5e1da] shadow-xs">
            <div className="relative w-full">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                value={menusSearch}
                onChange={e => setMenusSearch(e.target.value)}
                placeholder="ابحث باسم المحل أو النشاط لتدقيق المنيو الخاص به..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-10 pl-4 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
              />
            </div>
          </div>

          <div className="space-y-4">
            {filteredMenus.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl border border-[#e5e1da] text-stone-400 text-xs font-bold">
                لا توجد محلات تجارية تتوفر على قوائم رقمية نشطة حالياً مطابقة للبحث.
              </div>
            ) : (
              filteredMenus.map(biz => {
                const isExpanded = expandedBizId === biz.id;
                const menuCount = biz.menuItems?.length || 0;
                return (
                  <div key={biz.id} className="bg-white border border-[#e5e1da] rounded-3xl shadow-xs overflow-hidden transition-all">
                    {/* Collapsible Header */}
                    <div 
                      onClick={() => setExpandedBizId(isExpanded ? null : biz.id)}
                      className="p-4 sm:p-5 flex items-center justify-between hover:bg-stone-50/50 cursor-pointer select-none bg-stone-50/20"
                    >
                      <div className="space-y-1.5 text-right">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-stone-900 text-sm sm:text-base">{biz.name}</h4>
                          <span className="bg-stone-100 text-stone-600 text-[10px] px-2 py-0.5 rounded-full font-black">
                            {biz.category}
                          </span>
                        </div>
                        <div className="text-xs text-stone-500 font-bold">
                          إجمالي محتويات الكتالوج والقائمة: <span className="text-[#1a4d2e] font-black">{menuCount}</span> صنف وخدمة نشطة
                        </div>
                      </div>
                      <div className="text-stone-400 p-1 bg-white border border-stone-200 rounded-xl">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>

                    {/* Collapsible Body */}
                    {isExpanded && (
                      <div className="border-t border-stone-100 p-4 sm:p-5 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {biz.menuItems?.map((item: MenuItem) => (
                            <div key={item.id} className="flex gap-4 p-3.5 bg-stone-50/50 rounded-2xl border border-stone-100 items-start justify-between">
                              <div className="flex gap-3 text-right">
                                {((item as any).image || (item as any).imageUrl) && (
                                  <img 
                                    src={(item as any).image || (item as any).imageUrl} 
                                    alt={item.name} 
                                    className="w-14 h-14 rounded-xl object-cover shrink-0 border border-stone-200" 
                                  />
                                )}
                                <div className="space-y-1">
                                  <h5 className="font-black text-stone-900 text-xs sm:text-sm">{item.name}</h5>
                                  <p className="text-[10px] text-stone-400 font-semibold line-clamp-1">{item.description || 'لا يوجد وصف مضاف'}</p>
                                  <div className="flex items-center gap-1.5 pt-1">
                                    <span className="bg-emerald-50 text-[#1a4d2e] border border-emerald-100 px-2 py-0.2 rounded text-[10px] font-black">
                                      {item.price} {biz.category?.includes('طب') ? '' : 'دينار'}
                                    </span>
                                    {item.category && (
                                      <span className="text-[9px] text-stone-400 font-bold bg-stone-100 px-1.5 py-0.2 rounded">
                                        {item.category}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <button
                                onClick={() => handleDeleteMenuItem(biz.id, item.id, item.name)}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-rose-100 bg-white"
                                title="حذف هذا الصنف فوراً من المحل"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. REVIEWS TAB */}
      {activeTab === 'reviews' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 text-emerald-950 text-right space-y-1 shadow-3xs">
            <h3 className="font-black text-sm flex items-center gap-2">
              <Star className="h-5 w-5 text-[#1a4d2e]" />
              <span>الرقابة الشاملة وإدارة التقييمات والتعليقات</span>
            </h3>
            <p className="text-xs text-stone-600 font-bold">
              عرض تتابعي كامل لجميع التقييمات والآراء المكتوبة بواسطة الأعضاء والزوار في المنصة. تتيح لك هذه اللوحة مراقبة جودة الآراء وحذف التعليقات العشوائية أو المسيئة فوراً لضمان حماية سمعة المحلات.
            </p>
          </div>

          <div className="bg-white p-4.5 rounded-3xl border border-[#e5e1da] shadow-xs">
            <div className="relative w-full">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                value={reviewsSearch}
                onChange={e => setReviewsSearch(e.target.value)}
                placeholder="ابحث باسم المتجر المستهدف، المقيّم، أو محتوى التعليق..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-10 pl-4 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#e5e1da] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-stone-50 text-stone-500 border-b border-stone-200/60 text-xs font-black">
                    <th className="p-4">المتجر المستهدف</th>
                    <th className="p-4">صاحب التقييم</th>
                    <th className="p-4 text-center">التقييم الرقمي</th>
                    <th className="p-4">التعليق والرأي</th>
                    <th className="p-4 text-center">التاريخ</th>
                    <th className="p-4 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-xs font-bold text-stone-700">
                  {filteredReviews.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-stone-400">
                        لا توجد تعليقات أو تقييمات منشورة حالياً مطابقة لمعايير البحث.
                      </td>
                    </tr>
                  ) : (
                    filteredReviews.map(r => (
                      <tr key={r.id} className="hover:bg-stone-50/50 transition-colors">
                        <td className="p-4 font-black text-stone-900">{r.businessName || 'دليل المحلات'}</td>
                        <td className="p-4">
                          <div className="space-y-0.5">
                            <span className="text-stone-800 font-bold block">{r.userName || 'عضو المنصة'}</span>
                            <span className="text-[10px] text-stone-400 font-mono" dir="ltr">{r.userEmail || 'لا يوجد بريد'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-lg text-[10px] font-black inline-flex items-center gap-1">
                            <span>⭐</span>
                            <span>{r.rating ? r.rating.toFixed(1) : '5.0'}</span>
                          </span>
                        </td>
                        <td className="p-4 max-w-sm">
                          <p className="text-stone-600 font-medium leading-relaxed text-xs">{r.text || 'بدون تعليق مضاف'}</p>
                        </td>
                        <td className="p-4 text-center text-stone-500 font-mono text-[11px]">
                          {r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-JO') : 'غير محدد'}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDeleteReview(r.id)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف التقييم نهائياً"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. CHATS AUDIT TAB */}
      {activeTab === 'chats_audit' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-5 text-emerald-950 text-right space-y-1 shadow-3xs">
            <h3 className="font-black text-sm flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-[#1a4d2e]" />
              <span>لوحة مراقبة المحادثات النشطة وحالات الإساءة</span>
            </h3>
            <p className="text-xs text-stone-600 font-bold">
              تصفح ورقابة غرف الدردشة الفورية والنشطة لضمان الالتزام بسياسات النشر والأمان. يمكنك مراجعة نص الدردشة الكامل، وحظر الغرف العشوائية أو حذف الحسابات المخالفة لحماية المنصة.
            </p>
          </div>

          <div className="bg-white p-4.5 rounded-3xl border border-[#e5e1da] shadow-xs">
            <div className="relative w-full">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                value={chatsSearch}
                onChange={e => setChatsSearch(e.target.value)}
                placeholder="ابحث باسم العضو، المتجر، أو تفاصيل الرسالة الأخيرة..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-10 pl-4 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Rooms List */}
            <div className={`bg-white rounded-3xl border border-[#e5e1da] shadow-xs overflow-hidden lg:col-span-2`}>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-stone-50 text-stone-500 border-b border-stone-200/60 text-xs font-black">
                      <th className="p-4">أطراف الدردشة (العضو والمتجر)</th>
                      <th className="p-4">الرسالة الأخيرة</th>
                      <th className="p-4 text-center">تاريخ التحديث</th>
                      <th className="p-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-xs font-bold text-stone-700">
                    {filteredChats.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-stone-400">
                          لا توجد غرف دردشة نشطة مطابقة حالياً.
                        </td>
                      </tr>
                    ) : (
                      filteredChats.map(room => {
                        const isSelected = selectedRoomIdForTranscript === room.id;
                        return (
                          <tr key={room.id} className={`transition-colors ${isSelected ? 'bg-emerald-50/40' : 'hover:bg-stone-50/50'}`}>
                            <td className="p-4">
                              <div className="space-y-1 text-right">
                                <span className="font-black text-stone-900 text-sm block">
                                  {room.userName || 'مستخدم مجهول'} 💬 {room.businessName || 'المتجر'}
                                </span>
                                <span className="text-[10px] text-stone-400 font-mono" dir="ltr">{room.userEmail || 'لا يوجد بريد'}</span>
                              </div>
                            </td>
                            <td className="p-4">
                              <p className="text-stone-500 font-medium text-xs line-clamp-1 max-w-[200px]">{room.lastMessage || 'لا توجد رسائل بعد'}</p>
                            </td>
                            <td className="p-4 text-center text-stone-400 font-mono text-[10px]">
                              {room.updatedAt ? new Date(room.updatedAt).toLocaleDateString('ar-JO') : 'غير محدد'}
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleLoadTranscript(room.id)}
                                  className="p-1.5 text-[#1a4d2e] hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                  title="عرض نص الدردشة كاملاً"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteChatRoom(room.id, room.userName || room.businessName)}
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="حذف المحادثة بالكامل"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Transcript Viewer Panel */}
            <div className="bg-white rounded-3xl border border-[#e5e1da] shadow-xs p-4 sm:p-5 space-y-4">
              <h4 className="font-black text-sm text-stone-800 pb-2 border-b border-stone-100 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-[#1a4d2e]" />
                <span>نص المحادثة والدردشة المفصل</span>
              </h4>

              {!selectedRoomIdForTranscript ? (
                <div className="text-center py-16 text-stone-400 text-xs font-bold">
                  انقر على رمز العين بجانب المحادثة لتحميل تفاصيل وسجل الدردشة كاملاً هنا للتدقيق.
                </div>
              ) : loadingMessages ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-2">
                  <Clock className="h-6 w-6 text-[#1a4d2e] animate-spin" />
                  <span className="text-[11px] text-stone-500 font-bold">جاري تحميل الرسائل...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="max-h-[350px] overflow-y-auto space-y-3 p-2 bg-stone-50 rounded-2xl border border-stone-100 flex flex-col">
                    {roomMessages.length === 0 ? (
                      <div className="text-center py-10 text-stone-400 text-[11px] font-bold">
                        لا توجد رسائل مرسلة بعد في هذه الغرفة.
                      </div>
                    ) : (
                      roomMessages.map((msg, index) => {
                        const isSystem = !msg.senderId;
                        return (
                          <div 
                            key={msg.id || index}
                            className={`p-2.5 rounded-2xl text-[11px] max-w-[85%] leading-relaxed ${
                              isSystem 
                                ? 'bg-stone-200 text-stone-700 self-center text-center font-bold'
                                : 'bg-white text-stone-800 border border-stone-100 text-right self-start font-medium'
                            }`}
                          >
                            <p>{msg.text}</p>
                            <span className="text-[9px] text-stone-400 font-mono block mt-1 text-left">
                              {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedRoomIdForTranscript(null);
                      setRoomMessages([]);
                    }}
                    className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors text-center cursor-pointer"
                  >
                    إغلاق المعاينة
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
