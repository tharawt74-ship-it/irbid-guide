import React, { useState, useEffect } from 'react';
import { 
  Megaphone, Plus, Calendar, Clock, DollarSign, Eye, 
  MousePointer, CheckCircle2, AlertCircle, XCircle, Trash2, 
  Edit3, ExternalLink, Image as ImageIcon, RefreshCw, X, Filter,
  TrendingUp, Tag, Phone
} from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { AdSlotBooking } from '../../types';
import { ImageUploader } from '../ui/ImageUploader';
import { useConfirm } from '../../contexts/ConfirmContext';
import { WhatsAppIcon } from '../common/WhatsAppIcon';
import { getWhatsAppUrl } from '../../lib/contactHelper';

const PRESET_SLOTS = [
  { id: 'home_top', name: 'بنر صدارة الصفحة الرئيسية (Home Top Hero)', defaultPrice: 15, dimensions: '1200x400' },
  { id: 'offers_sticky', name: 'الشريط الإعلاني المثبت في صفحة العروض', defaultPrice: 10, dimensions: '1200x250' },
  { id: 'category_sponsor', name: 'راعي التصنيف الرئيسي (Category Sponsor)', defaultPrice: 12, dimensions: '800x300' },
  { id: 'jobs_sidebar', name: 'بنر الرعاة في بوابة الوظائف والشواغر', defaultPrice: 8, dimensions: '600x300' },
  { id: 'housing_featured', name: 'مساحة الصدارة في قسم العقارات والسكني', defaultPrice: 10, dimensions: '900x300' },
  { id: 'medical_top', name: 'بنر الترويج الطبي المعتمد في دليل الأطباء', defaultPrice: 15, dimensions: '1200x350' }
];

interface AdSlotsManagerProps {
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export function AdSlotsManager({ showToast }: AdSlotsManagerProps) {
  const { confirm } = useConfirm();
  const [bookings, setBookings] = useState<AdSlotBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSlot, setFilterSlot] = useState<string>('all');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<AdSlotBooking | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    slotId: 'home_top' as any,
    businessName: '',
    bannerImage: '',
    targetUrl: '',
    advertiserName: '',
    advertiserPhone: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    priceJod: 15,
    paymentStatus: 'paid' as 'paid' | 'pending' | 'free_promo',
    status: 'active' as 'active' | 'scheduled' | 'expired' | 'paused',
    notes: ''
  });

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'ad_slots_bookings'));
      if (!snap.empty) {
        const list: AdSlotBooking[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() } as AdSlotBooking);
        });
        setBookings(list);
        try { localStorage.setItem('shoof_ad_bookings_admin', JSON.stringify(list)); } catch {}
      } else {
        setBookings([]);
        try { localStorage.removeItem('shoof_ad_bookings_admin'); } catch {}
      }
    } catch (err) {
      console.warn('Ad slots bookings fetch notice:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingBooking(null);
    setFormData({
      slotId: 'home_top',
      businessName: '',
      bannerImage: '',
      targetUrl: '',
      advertiserName: '',
      advertiserPhone: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      priceJod: 15,
      paymentStatus: 'paid',
      status: 'active',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: AdSlotBooking) => {
    setEditingBooking(b);
    setFormData({
      slotId: b.slotId,
      businessName: b.businessName,
      bannerImage: b.bannerImage,
      targetUrl: b.targetUrl,
      advertiserName: b.advertiserName,
      advertiserPhone: b.advertiserPhone,
      startDate: b.startDate,
      endDate: b.endDate,
      priceJod: b.priceJod,
      paymentStatus: b.paymentStatus,
      status: b.status,
      notes: b.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.businessName.trim() || !formData.bannerImage.trim()) {
      showToast('يرجى كتابة اسم المنشأة وتحديد صورة البنر الإعلاني', 'error');
      return;
    }

    setSaving(true);
    try {
      const selectedSlotInfo = PRESET_SLOTS.find(s => s.id === formData.slotId);
      const bookingPayload: Partial<AdSlotBooking> = {
        slotId: formData.slotId,
        slotName: selectedSlotInfo?.name || 'مساحة إعلانية',
        businessName: formData.businessName.trim(),
        bannerImage: formData.bannerImage.trim(),
        targetUrl: formData.targetUrl.trim() || '/',
        advertiserName: formData.advertiserName.trim() || formData.businessName.trim(),
        advertiserPhone: formData.advertiserPhone.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        priceJod: Number(formData.priceJod) || 0,
        paymentStatus: formData.paymentStatus,
        status: formData.status,
        notes: formData.notes.trim(),
        impressionsCount: editingBooking?.impressionsCount || 0,
        clicksCount: editingBooking?.clicksCount || 0,
        createdAt: editingBooking?.createdAt || Date.now()
      };

      if (db) {
        if (editingBooking) {
          await setDoc(doc(db, 'ad_slots_bookings', editingBooking.id), bookingPayload, { merge: true });
        } else {
          const newDoc = await addDoc(collection(db, 'ad_slots_bookings'), bookingPayload);
          bookingPayload.id = newDoc.id;
        }
      }

      const bookingId = editingBooking ? editingBooking.id : (bookingPayload.id || `ad-book-${Date.now()}`);
      const updatedList = editingBooking
        ? bookings.map(b => b.id === editingBooking.id ? { ...b, ...bookingPayload, id: bookingId } as AdSlotBooking : b)
        : [{ id: bookingId, ...bookingPayload } as AdSlotBooking, ...bookings];

      setBookings(updatedList);
      try { localStorage.setItem('shoof_ad_bookings_admin', JSON.stringify(updatedList)); } catch {}

      showToast(editingBooking ? 'تم تحديث حجز المساحة الإعلانية بنجاح' : 'تم حجز المساحة الإعلانية بنجاح', 'success');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving ad slot booking:', err);
      showToast('حدث خطأ أثناء حفظ الحجز الإعلاني', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const isOk = await confirm({
      title: 'حذف حجز المساحة الإعلانية',
      message: `هل أنت متأكد من حذف حجز "${name}"؟ سيتم إيقاف ظهور البنر فوراً.`
    });
    if (!isOk) return;

    try {
      if (db) {
        await deleteDoc(doc(db, 'ad_slots_bookings', id));
      }
      const updated = bookings.filter(b => b.id !== id);
      setBookings(updated);
      try { localStorage.setItem('shoof_ad_bookings_admin', JSON.stringify(updated)); } catch {}
      showToast('تم حذف الحجز الإعلاني بنجاح', 'success');
    } catch (err) {
      console.error('Error deleting ad booking:', err);
      showToast('فشل حذف الحجز', 'error');
    }
  };

  const filteredBookings = bookings.filter(b => {
    const matchStatus = filterStatus === 'all' || b.status === filterStatus;
    const matchSlot = filterSlot === 'all' || b.slotId === filterSlot;
    return matchStatus && matchSlot;
  });

  const totalRevenue = bookings
    .filter(b => b.paymentStatus === 'paid')
    .reduce((acc, b) => acc + (b.priceJod || 0), 0);

  const activeCount = bookings.filter(b => b.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Megaphone className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-stone-900">إدارة وحجز المساحات الإعلانية والبانرات</h2>
            <p className="text-stone-500 text-xs">جدولة الحملات المميزة في صدارة الصفحات، تتبع المواعيد وعداد المشاهدات والنقرات</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadBookings}
            className="h-10 px-3.5 rounded-xl border border-stone-200 text-stone-700 bg-stone-50 hover:bg-stone-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="h-10 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>حجز مساحة إعلانية جديدة</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-2xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] text-stone-500 font-bold">الحملات النشطة حالياً</p>
            <p className="text-xl font-black text-stone-900">{activeCount} حملة</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-2xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-700">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] text-stone-500 font-bold">إجمالي إيرادات الإعلانات</p>
            <p className="text-xl font-black text-amber-700">{totalRevenue} د.أ</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-2xs flex items-center gap-3">
          <div className="p-3 rounded-xl bg-sky-50 text-sky-700">
            <Eye className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] text-stone-500 font-bold">إجمالي مرات الظهور</p>
            <p className="text-xl font-black text-sky-800">
              {bookings.reduce((acc, b) => acc + (b.impressionsCount || 0), 0).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Available Slot Placement Showcase */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs space-y-3">
        <h3 className="text-xs font-black text-stone-700 flex items-center gap-2">
          <Tag className="h-4 w-4 text-amber-600" />
          <span>المساحات الإعلانية المتاحة للحجز في الموقع</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {PRESET_SLOTS.map(slot => {
            const isBooked = bookings.some(b => b.slotId === slot.id && b.status === 'active');
            return (
              <div
                key={slot.id}
                className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between ${
                  isBooked
                    ? 'bg-amber-50/50 border-amber-200'
                    : 'bg-stone-50 border-stone-200/80 hover:border-emerald-300'
                }`}
              >
                <div>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${
                    isBooked ? 'bg-amber-200 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {isBooked ? 'محجوز' : 'متاح'}
                  </span>
                  <p className="text-xs font-black text-stone-900 mt-1.5 line-clamp-2 leading-snug">{slot.name}</p>
                </div>
                <div className="mt-2 pt-2 border-t border-stone-200/60 flex items-center justify-between text-[10px] font-bold text-stone-500">
                  <span>{slot.defaultPrice} د.أ/شهر</span>
                  <span className="font-mono text-[9px]">{slot.dimensions}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bookings Filter & Table */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-stone-150 flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-50/50">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-stone-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-bold bg-white focus:outline-none"
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط حالياً</option>
              <option value="scheduled">مجدول</option>
              <option value="expired">منتهي</option>
              <option value="paused">متوقف مؤقتاً</option>
            </select>

            <select
              value={filterSlot}
              onChange={(e) => setFilterSlot(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-bold bg-white focus:outline-none max-w-[200px] truncate"
            >
              <option value="all">جميع المساحات</option>
              {PRESET_SLOTS.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <span className="text-xs font-bold text-stone-500">
            إجمالي الحجوزات: {filteredBookings.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-stone-100/75 text-stone-700 font-black border-b border-stone-200">
              <tr>
                <th className="p-3.5">البنر والمنشأة</th>
                <th className="p-3.5">المساحة الإعلانية</th>
                <th className="p-3.5">الفترة الزمنية</th>
                <th className="p-3.5">الإحصائيات</th>
                <th className="p-3.5">المالية والحالة</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {filteredBookings.map(b => {
                const isOngoing = new Date(b.endDate).getTime() >= Date.now();
                return (
                  <tr key={b.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={b.bannerImage}
                          alt={b.businessName}
                          className="w-16 h-10 rounded-lg object-cover border border-stone-200 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80';
                          }}
                        />
                        <div>
                          <p className="font-black text-stone-900">{b.businessName}</p>
                          <p className="text-[11px] text-stone-500">{b.advertiserName}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <span className="text-xs font-bold text-stone-800 block">{b.slotName}</span>
                      {b.targetUrl && (
                        <a
                          href={b.targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-teal-700 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <span>رابط الوجهة</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-[11px] text-stone-700">
                        <Calendar className="h-3.5 w-3.5 text-stone-400" />
                        <span>{b.startDate}</span>
                        <span>←</span>
                        <span className={isOngoing ? 'font-bold text-emerald-700' : 'text-red-600'}>{b.endDate}</span>
                      </div>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <div className="space-y-0.5 text-[11px]">
                        <p className="text-stone-700 flex items-center gap-1">
                          <Eye className="h-3 w-3 text-stone-400" />
                          <span>{(b.impressionsCount || 0).toLocaleString()} ظهور</span>
                        </p>
                        <p className="text-stone-700 flex items-center gap-1">
                          <MousePointer className="h-3 w-3 text-stone-400" />
                          <span className="font-bold text-teal-700">{b.clicksCount || 0} نقرة</span>
                        </p>
                      </div>
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                          b.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : b.status === 'scheduled'
                            ? 'bg-sky-100 text-sky-800'
                            : b.status === 'expired'
                            ? 'bg-stone-200 text-stone-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {b.status === 'active' ? 'نشط' : b.status === 'scheduled' ? 'مجدول' : b.status === 'expired' ? 'منتهي' : 'متوقف'}
                        </span>
                        <p className="text-xs font-black text-stone-900">{b.priceJod} د.أ</p>
                      </div>
                    </td>

                    <td className="p-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {b.advertiserPhone && (
                          <a
                            href={getWhatsAppUrl(b.advertiserPhone, `مرحباً ${b.advertiserName}، بخصوص بنر ${b.businessName} الإعلاني على منصة شو في بإربد`)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                            title="تواصل واتساب"
                          >
                            <WhatsAppIcon className="h-4 w-4" />
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => handleOpenEdit(b)}
                          className="p-1.5 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors cursor-pointer"
                          title="تعديل"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(b.id, b.businessName)}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredBookings.length === 0 && (
          <div className="p-8 text-center text-stone-400">
            <Megaphone className="h-10 w-10 mx-auto mb-2 text-stone-300" />
            <p className="text-xs font-bold">
              {bookings.length === 0 ? 'لا توجد حجوزات إعلانية مسجلة حالياً' : 'لا توجد حجوزات إعلانية مطابقة للفلتر'}
            </p>
            {bookings.length === 0 && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="mt-3 px-4 py-2 rounded-xl bg-[#1a4d2e] hover:bg-[#133b22] text-white text-xs font-black inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span>إضافة حجز إعلاني جديد</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
                  <Megaphone className="h-5 w-5" />
                </div>
                <h3 className="font-black text-stone-900 text-base">
                  {editingBooking ? 'تعديل الحجز الإعلاني' : 'حجز مساحة إعلانية جديدة'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">اختر المساحة الإعلانية</label>
                <select
                  value={formData.slotId}
                  onChange={(e) => {
                    const sid = e.target.value;
                    const slot = PRESET_SLOTS.find(s => s.id === sid);
                    setFormData({ ...formData, slotId: sid as any, priceJod: slot?.defaultPrice || 15 });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:border-amber-600 bg-white"
                >
                  {PRESET_SLOTS.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.defaultPrice} د.أ)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">اسم المحل أو المنشأة</label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="مثال: اسم المنشأة أو المعلن"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">رابط الوجهة عند النقر (URL)</label>
                  <input
                    type="text"
                    value={formData.targetUrl}
                    onChange={(e) => setFormData({ ...formData, targetUrl: e.target.value })}
                    placeholder="/offers أو رابط صفحة المحل"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">صورة البنر الإعلاني</label>
                <ImageUploader
                  value={formData.bannerImage}
                  onChange={(url) => setFormData({ ...formData, bannerImage: url })}
                  label="اختر صورة البنر الإعلاني"
                  aspectRatio="banner"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">اسم المعلن / المسؤول</label>
                  <input
                    type="text"
                    value={formData.advertiserName}
                    onChange={(e) => setFormData({ ...formData, advertiserName: e.target.value })}
                    placeholder="اسم الشخص المسؤول"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">رقم الهاتف / الواتساب</label>
                  <input
                    type="tel"
                    value={formData.advertiserPhone}
                    onChange={(e) => setFormData({ ...formData, advertiserPhone: e.target.value })}
                    placeholder="079xxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">تاريخ بدء النشر</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">تاريخ انتهاء الحملة</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">السعر (د.أ)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.priceJod}
                    onChange={(e) => setFormData({ ...formData, priceJod: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">حالة الدفع</label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:border-amber-600 bg-white"
                  >
                    <option value="paid">مدفوع</option>
                    <option value="pending">بانتظار الدفع</option>
                    <option value="free_promo">ترويج مجاني / تبادلي</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">حالة البنر</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:border-amber-600 bg-white"
                  >
                    <option value="active">نشط</option>
                    <option value="scheduled">مجدول</option>
                    <option value="paused">متوقف</option>
                    <option value="expired">منتهي</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">ملاحظات إضافية</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="ملاحظات حول الحملة أو تفاصيل الاتفاق..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-medium focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-50 cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'جارٍ الحفظ...' : editingBooking ? 'حفظ التعديلات' : 'تأكيد الحجز'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
