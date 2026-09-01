import React, { useState, useMemo } from 'react';
import { 
  Building2, Plus, Home, MapPin, DollarSign, Clock, 
  CheckCircle2, AlertCircle, Trash2, Edit3, Eye, Phone, Sparkles, 
  ExternalLink, Copy, Crown, BarChart3, MessageSquare, TrendingUp,
  Filter, Info, ShieldCheck, Key, Check, ArrowRight
} from 'lucide-react';
import { HousingItem } from '../../types';
import { doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Link } from 'react-router';
import { HousingFormModal } from '../housing/HousingFormModal';

interface VisitorHousingsTabProps {
  housings: HousingItem[];
  onRefresh: () => void;
}

export function VisitorHousingsTab({ housings, onRefresh }: VisitorHousingsTabProps) {
  const { currentUser, isAdmin } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHousing, setEditingHousing] = useState<HousingItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Filter state for Housing Status Pills
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'rented' | 'pending' | 'vip'>('all');
  
  // VIP Upgrade Modal State
  const [showVipModal, setShowVipModal] = useState<HousingItem | null>(null);

  // Toggle Housing Occupied / Available status (متاح للإيجار ↔ تم التأجير)
  const handleToggleOccupied = async (item: HousingItem) => {
    setTogglingId(item.id);
    const newOccupiedState = !item.isOccupied;
    try {
      if (db && item.id) {
        await updateDoc(doc(db, 'housings', item.id), {
          isOccupied: newOccupiedState,
          isAvailable: !newOccupiedState
        });
      }
      setSuccessMsg(
        newOccupiedState 
          ? `تم تحديث حالة العقار (${item.title}) إلى "تم التأجير"` 
          : `تم تحديث حالة العقار (${item.title}) إلى "متاح للإيجار"`
      );
      setTimeout(() => setSuccessMsg(null), 4000);
      onRefresh();
    } catch (err) {
      console.error("Error toggling housing availability:", err);
      alert('حدث خطأ أثناء تغيير حالة العقار.');
    } finally {
      setTogglingId(null);
    }
  };

  // Duplicate Housing Listing (استنساخ العقار)
  const handleDuplicate = (item: HousingItem) => {
    const duplicatedItem: HousingItem = {
      ...item,
      id: '', // Empty ID tells HousingFormModal it's a NEW listing
      title: `نسخة من: ${item.title}`
    };
    setEditingHousing(duplicatedItem);
    setIsModalOpen(true);
  };

  // Delete Housing Listing
  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا الإعلان العقاري؟')) return;
    setDeletingId(id);
    try {
      if (db) {
        await deleteDoc(doc(db, 'housings', id));
      }
      setSuccessMsg('تم حذف الإعلان العقاري بنجاح.');
      setTimeout(() => setSuccessMsg(null), 4000);
      onRefresh();
    } catch (err) {
      console.error("Error deleting housing:", err);
      alert('حدث خطأ أثناء حذف الإعلان.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaved = () => {
    onRefresh();
    setSuccessMsg('تم إرسال/تحديث إعلان العقار بنجاح! سيتم مراجعته من الإدارة.');
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  // Filtering calculations
  const availableCount = useMemo(() => housings.filter(h => !h.isOccupied && (h.status === 'approved' || !h.status)).length, [housings]);
  const rentedCount = useMemo(() => housings.filter(h => !!h.isOccupied).length, [housings]);
  const pendingCount = useMemo(() => housings.filter(h => h.status === 'pending').length, [housings]);
  const vipCount = useMemo(() => housings.filter(h => !!h.isVip || !!h.isFeatured).length, [housings]);

  const filteredHousings = useMemo(() => {
    return housings.filter(item => {
      if (statusFilter === 'available') return !item.isOccupied && (item.status === 'approved' || !item.status);
      if (statusFilter === 'rented') return !!item.isOccupied;
      if (statusFilter === 'pending') return item.status === 'pending';
      if (statusFilter === 'vip') return !!item.isVip || !!item.isFeatured;
      return true;
    });
  }, [housings, statusFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header & Identity Section: Landlord / Property Owner Workspace */}
      <div className="bg-gradient-to-l from-[#1a4d2e] via-[#154126] to-[#0e2c1a] rounded-3xl p-6 sm:p-8 text-white space-y-5 shadow-sm border border-emerald-900/40 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-full text-xs font-black text-emerald-300 backdrop-blur-md">
              <Home className="h-3.5 w-3.5" />
              <span>مساحة عمل أصحاب العقارات والمؤجرين</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>إدارة العقارات والسكنات في إربد</span>
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </h3>
            <p className="text-xs text-emerald-100/90 max-w-xl leading-relaxed">
              مركز تحكم احترافي لإتاحة وتأجير السكنات الطلابية والعائلية، تحديث حالة الشغور لحظياً، ومتابعة تفاعل الباحثين.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingHousing(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 bg-[#ff9f1c] hover:bg-[#f39209] text-stone-900 px-5 py-3 rounded-2xl font-black text-xs shadow-md transition-all shrink-0 cursor-pointer min-h-[44px]"
          >
            <Plus className="h-4 w-4" />
            <span>نشر عقار / سكن جديد</span>
          </button>
        </div>

        {/* 2. Action Center Banner (تجميع التنبيهات الذكية للمالك) */}
        <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 text-xs space-y-2 relative z-10">
          <div className="flex items-center justify-between font-black text-amber-300">
            <span className="flex items-center gap-1.5">
              <Info className="h-4 w-4 text-amber-400" />
              مركز إشعارات المالك والتنبيهات المباشرة:
            </span>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full text-white">تحديث حي</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-emerald-50">
            <div className="flex items-center gap-2 bg-black/20 p-2.5 rounded-xl border border-white/5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span>لديك <b>{availableCount}</b> عقارات متاحة للإيجار حالياً</span>
            </div>

            <div className="flex items-center gap-2 bg-black/20 p-2.5 rounded-xl border border-white/5">
              <Key className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span><b>{rentedCount}</b> عقار مؤجر (يمكنك إتاحته بضغطة زر)</span>
            </div>

            <div className="flex items-center gap-2 bg-black/20 p-2.5 rounded-xl border border-white/5">
              <Clock className="h-3.5 w-3.5 text-sky-400 shrink-0" />
              <span><b>{pendingCount}</b> طلب قيد مراجعة وتأكيد الإدارة</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900 font-bold text-xs">إغلاق</button>
        </div>
      )}

      {/* 3. Housing Status Pills (شريط الحالات السريعة للعقارات) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
        <span className="text-stone-400 text-[11px] shrink-0 ml-1 flex items-center gap-1">
          <Filter className="h-3.5 w-3.5" />
          تصفية حسب الحالة:
        </span>

        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2.5 rounded-2xl transition-all whitespace-nowrap cursor-pointer min-h-[44px] flex items-center gap-1.5 ${
            statusFilter === 'all'
              ? 'bg-[#1a4d2e] text-white font-black shadow-xs'
              : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
          }`}
        >
          <span>الكل ({housings.length})</span>
        </button>

        <button
          onClick={() => setStatusFilter('available')}
          className={`px-4 py-2.5 rounded-2xl transition-all whitespace-nowrap cursor-pointer min-h-[44px] flex items-center gap-1.5 ${
            statusFilter === 'available'
              ? 'bg-emerald-600 text-white font-black shadow-xs'
              : 'bg-white text-stone-700 border border-stone-200 hover:bg-emerald-50 hover:text-emerald-700'
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>متاحة للإيجار ({availableCount})</span>
        </button>

        <button
          onClick={() => setStatusFilter('rented')}
          className={`px-4 py-2.5 rounded-2xl transition-all whitespace-nowrap cursor-pointer min-h-[44px] flex items-center gap-1.5 ${
            statusFilter === 'rented'
              ? 'bg-amber-600 text-white font-black shadow-xs'
              : 'bg-white text-stone-700 border border-stone-200 hover:bg-amber-50 hover:text-amber-700'
          }`}
        >
          <Key className="h-3.5 w-3.5 text-amber-500" />
          <span>تم التأجير ({rentedCount})</span>
        </button>

        <button
          onClick={() => setStatusFilter('pending')}
          className={`px-4 py-2.5 rounded-2xl transition-all whitespace-nowrap cursor-pointer min-h-[44px] flex items-center gap-1.5 ${
            statusFilter === 'pending'
              ? 'bg-sky-700 text-white font-black shadow-xs'
              : 'bg-white text-stone-700 border border-stone-200 hover:bg-sky-50 hover:text-sky-700'
          }`}
        >
          <Clock className="h-3.5 w-3.5 text-sky-500" />
          <span>قيد المراجعة ({pendingCount})</span>
        </button>

        <button
          onClick={() => setStatusFilter('vip')}
          className={`px-4 py-2.5 rounded-2xl transition-all whitespace-nowrap cursor-pointer min-h-[44px] flex items-center gap-1.5 ${
            statusFilter === 'vip'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black shadow-xs'
              : 'bg-white text-stone-700 border border-stone-200 hover:bg-amber-50 hover:text-amber-700'
          }`}
        >
          <Crown className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
          <span>مميزة VIP ({vipCount})</span>
        </button>
      </div>

      {/* 4. List of Clean Glassmorphic Property Cards */}
      {filteredHousings.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white/80 backdrop-blur-md rounded-3xl border border-dashed border-stone-200 space-y-4">
          <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto text-stone-400">
            <Home className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h4 className="font-black text-stone-800 text-base">لا توجد عقارات مطابقة لهذا التصنيف</h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              تأكد من اختيار تصنيف آخر أو اضغط على الزر أدناه لإضافة عقار جديد.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingHousing(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 bg-[#1a4d2e] hover:bg-[#153e25] text-white px-5 py-2.5 rounded-2xl font-black text-xs transition-all cursor-pointer shadow-sm min-h-[44px]"
          >
            <Plus className="h-4 w-4 text-[#ff9f1c]" />
            <span>نشر إعلان عقار جديد</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredHousings.map(item => {
            const isPending = item.status === 'pending';
            const isApproved = item.status === 'approved' || !item.status;
            const isRejected = item.status === 'rejected';
            const isOccupied = !!item.isOccupied;
            const isVip = !!item.isVip || !!item.isFeatured;

            return (
              <div 
                key={item.id}
                className={`bg-white/95 backdrop-blur-md rounded-[28px] p-5 sm:p-6 border transition-all flex flex-col justify-between gap-4 shadow-2xs hover:shadow-md relative overflow-hidden ${
                  isOccupied
                    ? 'border-amber-200/90 bg-amber-50/10'
                    : isPending 
                    ? 'border-sky-200/80 bg-sky-50/10' 
                    : isRejected 
                    ? 'border-rose-200/80 bg-rose-50/10' 
                    : 'border-stone-200/90 hover:border-emerald-400/80'
                }`}
              >
                <div className="space-y-3.5">
                  
                  {/* Card Header: Badges & Status */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black px-2.5 py-1 rounded-xl bg-stone-100 text-stone-700">
                          {item.type}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/50">
                          جامعة {item.university}
                        </span>
                        {isVip && (
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-white flex items-center gap-1 shadow-3xs">
                            <Crown className="h-3 w-3 fill-white" />
                            <span>VIP</span>
                          </span>
                        )}
                      </div>
                      <h4 className="text-base font-black text-stone-900 mt-1 line-clamp-1">{item.title}</h4>
                    </div>

                    {/* Status Pill */}
                    {isPending && (
                      <span className="bg-sky-600 text-white px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 shrink-0">
                        <Clock className="h-3 w-3" />
                        <span>قيد المراجعة</span>
                      </span>
                    )}
                    {isApproved && (
                      <span className="bg-emerald-600 text-white px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>معتمد ونشط</span>
                      </span>
                    )}
                    {isRejected && (
                      <span className="bg-rose-600 text-white px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1 shrink-0">
                        <AlertCircle className="h-3 w-3" />
                        <span>مرفوض</span>
                      </span>
                    )}
                  </div>

                  {/* Pricing and Location Box */}
                  <div className="p-3.5 bg-stone-50/80 rounded-2xl flex items-center justify-between text-xs border border-stone-100">
                    <div className="flex items-center gap-1.5 text-[#1a4d2e] font-black">
                      <DollarSign className="h-4 w-4 text-[#ff9f1c]" />
                      <span className="text-sm">{item.price} د.أ</span>
                      <span className="text-stone-400 text-[11px] font-bold">/ {item.pricePeriod}</span>
                    </div>

                    <div className="flex items-center gap-1 text-stone-600 text-[11px] font-bold">
                      <MapPin className="h-3.5 w-3.5 text-stone-400" />
                      <span className="line-clamp-1">{item.distanceToCampus || item.location}</span>
                    </div>
                  </div>

                  {/* 5. زر التغيير السريع لحالة العقار ("متاح للإيجار" ↔ "تم التأجير") */}
                  <div className="pt-1">
                    <button
                      type="button"
                      disabled={togglingId === item.id}
                      onClick={() => handleToggleOccupied(item)}
                      className={`w-full py-2.5 px-3.5 rounded-2xl text-xs font-black flex items-center justify-between transition-all cursor-pointer min-h-[44px] shadow-2xs ${
                        isOccupied
                          ? 'bg-amber-100/80 hover:bg-amber-200 text-amber-900 border border-amber-300/80'
                          : 'bg-emerald-100/80 hover:bg-emerald-200 text-emerald-900 border border-emerald-300/80'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isOccupied ? (
                          <>
                            <Key className="h-4 w-4 text-amber-600 shrink-0" />
                            <span>الحالة الحالية: <b>مؤجر حالياً 🔑</b></span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>الحالة الحالية: <b>متاح للإيجار 🟢</b></span>
                          </>
                        )}
                      </div>

                      <span className="text-[10px] font-bold bg-white/80 px-2 py-1 rounded-xl shadow-3xs underline">
                        {togglingId === item.id ? 'جاري التحديث...' : (isOccupied ? 'تحويل إلى متاح للإيجار' : 'تحويل إلى تم التأجير')}
                      </span>
                    </button>
                  </div>

                  {/* 6. إحصائيات التفاعل الحية (Real Analytics) (لمشتركي VIP) */}
                  {(isVip || isAdmin) ? (
                    <div className="p-3 bg-gradient-to-r from-emerald-900/5 to-emerald-900/10 border border-emerald-200/80 rounded-2xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-black text-[#1a4d2e]">
                        <span className="flex items-center gap-1">
                          <BarChart3 className="h-4 w-4 text-emerald-600" />
                          إحصائيات الزوار الحية (ميزة VIP)
                        </span>
                        <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">محدث فورياً</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center pt-1">
                        <div className="bg-white p-2 rounded-xl border border-stone-200/80">
                          <span className="text-[10px] text-stone-500 font-bold block">المشاهدات</span>
                          <span className="text-xs font-black text-stone-900">{item.viewsCount || 0}</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-stone-200/80">
                          <span className="text-[10px] text-stone-500 font-bold block">الواتساب</span>
                          <span className="text-xs font-black text-emerald-700">{item.whatsappClicks || 0}</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-stone-200/80">
                          <span className="text-[10px] text-stone-500 font-bold block">الاتصالات</span>
                          <span className="text-xs font-black text-amber-700">{item.phoneClicks || 0}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-200/80 rounded-2xl flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-500 shrink-0" />
                        <div>
                          <span className="font-black text-stone-800 block text-[11px]">إحصائيات تفاعل الزوار والواتساب</span>
                          <span className="text-[10px] text-stone-500 font-medium">متاحة لمشتركي شارة VIP الذهبية</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowVipModal(item)}
                        className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-xl font-black text-[10px] shrink-0 transition-colors cursor-pointer"
                      >
                        تفعيل VIP 👑
                      </button>
                    </div>
                  )}

                  {/* Rejection / Pending Explanation */}
                  {isPending && (
                    <div className="p-3 bg-sky-50 rounded-2xl border border-sky-200/70 text-[11px] text-sky-900 space-y-1">
                      <div className="font-black flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-sky-600" />
                        <span>بانتظار الموافقة والنشر</span>
                      </div>
                      <p className="text-sky-800 leading-relaxed font-medium text-[10px]">
                        سيقوم فريق المنصة بمراجعة إعلانك والتواصل معك فوراً لتأكيد التفعيل.
                      </p>
                    </div>
                  )}

                  {isRejected && (
                    <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200/70 text-[11px] text-rose-900 space-y-1">
                      <div className="font-black flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                        <span>سبب عدم القبول:</span>
                      </div>
                      <p className="text-rose-800 leading-relaxed font-medium text-[10px]">
                        {item.rejectionReason || 'يرجى التواصل مع إدارة دليل شو في بإربد لتعديل الإعلان.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* 7. Card Toolbar & Actions (Mobile Touch Optimized) */}
                <div className="flex flex-wrap items-center justify-between pt-3 border-t border-stone-100 gap-2 text-xs font-bold">
                  <Link
                    to="/housing"
                    target="_blank"
                    className="text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer py-1.5 px-2 hover:bg-stone-100 rounded-xl transition-colors text-[11px]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>معاينة الإعلان</span>
                  </Link>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Duplicate Feature Button */}
                    <button
                      onClick={() => handleDuplicate(item)}
                      className="px-3 py-2 bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 rounded-xl flex items-center gap-1 transition-all cursor-pointer min-h-[38px] text-[11px]"
                      title="استنساخ الإعلان مع حفظ التفاصيل"
                    >
                      <Copy className="h-3.5 w-3.5 text-amber-600" />
                      <span>تكرار</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingHousing(item);
                        setIsModalOpen(true);
                      }}
                      className="px-3 py-2 bg-stone-100 hover:bg-[#1a4d2e] hover:text-white rounded-xl text-stone-700 flex items-center gap-1 transition-all cursor-pointer min-h-[38px] text-[11px]"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>تعديل</span>
                    </button>

                    <button
                      disabled={deletingId === item.id}
                      onClick={() => handleDelete(item.id)}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-600 hover:text-white rounded-xl text-rose-600 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 min-h-[38px] text-[11px]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>حذف</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIP Upgrade Info Modal */}
      {showVipModal && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" dir="rtl">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-amber-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black">
                <Crown className="h-6 w-6 fill-white" />
              </div>
              <div>
                <h3 className="font-black text-stone-900 text-base">ترقية الإعلان لباقة VIP المميزة 👑</h3>
                <p className="text-xs text-stone-500">إظهار إعلانك في الأعلى مع إحصائيات التفاعل الحية</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 text-xs space-y-2 text-stone-800 font-bold">
              <p className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>تثبيت العقار في أعلى نتائج تصفح السكنات في إربد</span>
              </p>
              <p className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>إظهار شارة التوثيق والـ VIP الذهبية المميزة</span>
              </p>
              <p className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>فتح لوحة إحصائيات المشاهدات ونقرات الواتساب الحية</span>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowVipModal(null)}
                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                إغلاق
              </button>
              <Link
                to="/contact"
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
              >
                تواصل مع الإدارة للترقية 👑
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      <HousingFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingHousing(null);
        }}
        onSaveSuccess={handleSaved}
        initialListing={editingHousing}
        currentUser={currentUser}
        isAdmin={isAdmin}
      />
    </div>
  );
}
