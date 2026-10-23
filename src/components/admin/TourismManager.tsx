import React, { useState, useEffect } from 'react';
import { 
  Compass, Plus, Search, Filter, Trash2, Edit3, MapPin, 
  Clock, DollarSign, Star, ExternalLink, RefreshCw, CheckCircle2,
  X, Image as ImageIcon, Sparkles, Tag, Eye
} from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { ImageUploader } from '../ui/ImageUploader';
import { useConfirm } from '../../contexts/ConfirmContext';

export interface TourismSpotItem {
  id: string;
  name: string;
  category: 'أثري' | 'طبيعة' | 'ترفيه' | 'ثقافة';
  image: string;
  description: string;
  location: string;
  googleMapsUrl: string;
  openingHours: string;
  entryFee: string;
  rating: number;
  tags: string[];
  tips: string[];
  isFeatured?: boolean;
  createdAt?: number;
}

interface TourismManagerProps {
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export function TourismManager({ showToast }: TourismManagerProps) {
  const { confirm } = useConfirm();
  const [spots, setSpots] = useState<TourismSpotItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('الكل');
  
  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState<TourismSpotItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    category: 'أثري' as 'أثري' | 'طبيعة' | 'ترفيه' | 'ثقافة',
    image: '',
    description: '',
    location: '',
    googleMapsUrl: '',
    openingHours: '08:00 صباحاً - 05:00 مساءً',
    entryFee: 'مجاني',
    rating: '4.8',
    tagsString: '',
    tipsString: '',
    isFeatured: false
  });

  useEffect(() => {
    loadSpots();
  }, []);

  const loadSpots = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'tourism'));
      if (!snap.empty) {
        const loaded: TourismSpotItem[] = [];
        snap.forEach(d => {
          loaded.push({ id: d.id, ...d.data() } as TourismSpotItem);
        });
        setSpots(loaded);
        try { localStorage.setItem('shoof_tourism_spots_admin', JSON.stringify(loaded)); } catch {}
      } else {
        setSpots([]);
        try { localStorage.removeItem('shoof_tourism_spots_admin'); } catch {}
      }
    } catch (err) {
      console.warn('Notice loading tourism spots from Firestore:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingSpot(null);
    setFormData({
      name: '',
      category: 'أثري',
      image: '',
      description: '',
      location: '',
      googleMapsUrl: '',
      openingHours: '08:00 صباحاً - 05:00 مساءً',
      entryFee: 'مجاني',
      rating: '4.8',
      tagsString: '',
      tipsString: '',
      isFeatured: false
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (spot: TourismSpotItem) => {
    setEditingSpot(spot);
    setFormData({
      name: spot.name || '',
      category: spot.category || 'أثري',
      image: spot.image || '',
      description: spot.description || '',
      location: spot.location || '',
      googleMapsUrl: spot.googleMapsUrl || '',
      openingHours: spot.openingHours || '08:00 صباحاً - 05:00 مساءً',
      entryFee: spot.entryFee || 'مجاني',
      rating: String(spot.rating || 4.8),
      tagsString: (spot.tags || []).join(', '),
      tipsString: (spot.tips || []).join('\n'),
      isFeatured: !!spot.isFeatured
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showToast('يرجى كتابة اسم المعلم السياحي', 'error');
      return;
    }

    setSaving(true);
    try {
      const tags = formData.tagsString
        .split(/[,،]/)
        .map(t => t.trim())
        .filter(Boolean);

      const tips = formData.tipsString
        .split('\n')
        .map(t => t.trim())
        .filter(Boolean);

      const spotPayload: Partial<TourismSpotItem> = {
        name: formData.name.trim(),
        category: formData.category,
        image: formData.image.trim() || 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=800&q=80',
        description: formData.description.trim(),
        location: formData.location.trim(),
        googleMapsUrl: formData.googleMapsUrl.trim(),
        openingHours: formData.openingHours.trim(),
        entryFee: formData.entryFee.trim(),
        rating: parseFloat(formData.rating) || 4.8,
        tags,
        tips,
        isFeatured: formData.isFeatured,
        createdAt: editingSpot?.createdAt || Date.now()
      };

      if (db) {
        if (editingSpot) {
          await setDoc(doc(db, 'tourism', editingSpot.id), spotPayload, { merge: true });
        } else {
          const newDocRef = await addDoc(collection(db, 'tourism'), spotPayload);
          spotPayload.id = newDocRef.id;
        }
      }

      const spotId = editingSpot ? editingSpot.id : (spotPayload.id || `spot-${Date.now()}`);
      const updatedList = editingSpot
        ? spots.map(s => s.id === editingSpot.id ? { ...s, ...spotPayload, id: spotId } as TourismSpotItem : s)
        : [{ id: spotId, ...spotPayload } as TourismSpotItem, ...spots];

      setSpots(updatedList);
      try { localStorage.setItem('shoof_tourism_spots_admin', JSON.stringify(updatedList)); } catch {}

      showToast(editingSpot ? 'تم تحديث المعلم السياحي بنجاح' : 'تمت إضافة المعلم السياحي بنجاح', 'success');
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving tourism spot:', err);
      showToast('حدث خطأ أثناء حفظ المعلم', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const isOk = await confirm({
      title: 'حذف المعلم السياحي',
      message: `هل أنت متأكد من حذف "${name}"؟ لن يظهر للزوار في دليل السياحة بعد الآن.`
    });
    if (!isOk) return;

    try {
      if (db) {
        await deleteDoc(doc(db, 'tourism', id));
      }
      const updated = spots.filter(s => s.id !== id);
      setSpots(updated);
      try { localStorage.setItem('shoof_tourism_spots_admin', JSON.stringify(updated)); } catch {}
      showToast('تم حذف المعلم السياحي بنجاح', 'success');
    } catch (err) {
      console.error('Error deleting spot:', err);
      showToast('فشل حذف المعلم', 'error');
    }
  };

  const filteredSpots = spots.filter(spot => {
    const matchesSearch = 
      spot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spot.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spot.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'الكل' || spot.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <Compass className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-stone-900">إدارة المعالم السياحية والترفيهية في إربد</h2>
            <p className="text-stone-500 text-xs">إضافة وتعديل المواقع الأثرية، الغابات والمحميات، المتاحف والأماكن الترفيهية في المحافظة</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadSpots}
            className="h-10 px-3.5 rounded-xl border border-stone-200 text-stone-700 bg-stone-50 hover:bg-stone-100 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="h-10 px-4 rounded-xl bg-[#1a4d2e] hover:bg-[#133b22] text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة معلم سياحي جديد</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم، الموقع أو الوصف..."
            className="w-full pl-3 pr-9 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:border-teal-600 bg-stone-50/50"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['الكل', 'أثري', 'طبيعة', 'ترفيه', 'ثقافة'].map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                categoryFilter === cat
                  ? 'bg-teal-700 text-white shadow-2xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Spots Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSpots.map(spot => (
          <div key={spot.id} className="bg-white rounded-3xl border border-stone-200/90 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col">
            {/* Image Banner */}
            <div className="relative h-44 bg-stone-100 overflow-hidden">
              <img
                src={spot.image}
                alt={spot.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=800&q=80';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent" />
              
              <div className="absolute top-3 right-3 flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-xl bg-stone-900/80 backdrop-blur-md text-white text-[11px] font-black border border-white/10">
                  {spot.category}
                </span>
                {spot.isFeatured && (
                  <span className="px-2 py-1 rounded-xl bg-amber-500 text-stone-950 text-[10px] font-black flex items-center gap-1 shadow-xs">
                    <Sparkles className="h-3 w-3" />
                    <span>مميز</span>
                  </span>
                )}
              </div>

              <div className="absolute bottom-3 right-3 left-3 text-white">
                <h3 className="font-black text-sm drop-shadow-sm line-clamp-1">{spot.name}</h3>
                <p className="text-[11px] text-stone-200 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 text-teal-400 shrink-0" />
                  <span className="truncate">{spot.location}</span>
                </p>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed font-medium">
                {spot.description}
              </p>

              <div className="grid grid-cols-2 gap-2 text-[11px] bg-stone-50 p-2.5 rounded-2xl border border-stone-150">
                <div className="flex items-center gap-1 text-stone-600 truncate">
                  <Clock className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                  <span className="truncate">{spot.openingHours}</span>
                </div>
                <div className="flex items-center gap-1 text-stone-600 truncate">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate font-bold text-emerald-700">{spot.entryFee}</span>
                </div>
              </div>

              {spot.tags && spot.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {spot.tags.slice(0, 3).map((tag, idx) => (
                    <span key={idx} className="text-[10px] font-bold bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 border-t border-stone-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  {spot.googleMapsUrl && (
                    <a
                      href={spot.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl text-stone-500 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                      title="عرض على خرائط جوجل"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(spot)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>تعديل</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(spot.id, spot.name)}
                    className="p-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredSpots.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center border border-stone-200/90 text-stone-500">
          <Compass className="h-12 w-12 text-stone-300 mx-auto mb-3" />
          <p className="font-bold text-sm">
            {spots.length === 0 ? 'لا توجد معالم سياحية مضافة حالياً في قاعدة البيانات' : 'لا توجد معالم سياحية مطابقة للبحث'}
          </p>
          {spots.length === 0 && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="mt-4 px-4 py-2 rounded-xl bg-[#1a4d2e] hover:bg-[#133b22] text-white text-xs font-black inline-flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة أول معلم سياحي</span>
            </button>
          )}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
                  <Compass className="h-5 w-5" />
                </div>
                <h3 className="font-black text-stone-900 text-base">
                  {editingSpot ? 'تعديل المعلم السياحي' : 'إضافة معلم سياحي جديد'}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">اسم المعلم</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="اسم المعلم أو الوجهة السياحية"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">التصنيف</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:border-teal-600 bg-white"
                  >
                    <option value="أثري">أثري</option>
                    <option value="طبيعة">طبيعة</option>
                    <option value="ترفيه">ترفيه</option>
                    <option value="ثقافة">ثقافة</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">صورة المعلم (رابط أو رفع)</label>
                <ImageUploader
                  value={formData.image}
                  onChange={(url) => setFormData({ ...formData, image: url })}
                  label="اختر أو ارفع صورة للمعلم"
                  aspectRatio="cover"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">نبذة ووصف المعلم</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="وصف تاريخي أو سياحي مميز للمعلم..."
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-medium focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">الموقع الجغرافي في إربد</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="المنطقة أو اللواء أو الحي"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">رابط خرائط جوجل (Google Maps)</label>
                  <input
                    type="url"
                    value={formData.googleMapsUrl}
                    onChange={(e) => setFormData({ ...formData, googleMapsUrl: e.target.value })}
                    placeholder="https://maps.google.com/?q=..."
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-mono text-left focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">ساعات العمل أو الزيارة</label>
                  <input
                    type="text"
                    value={formData.openingHours}
                    onChange={(e) => setFormData({ ...formData, openingHours: e.target.value })}
                    placeholder="08:00 ص - 05:00 م"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">رسوم الدخول</label>
                  <input
                    type="text"
                    value={formData.entryFee}
                    onChange={(e) => setFormData({ ...formData, entryFee: e.target.value })}
                    placeholder="مجاني أو دينار واحد"
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">الكلمات المفتاحية والوسوم (مفصولة بفواصل)</label>
                <input
                  type="text"
                  value={formData.tagsString}
                  onChange={(e) => setFormData({ ...formData, tagsString: e.target.value })}
                  placeholder="آثار, تاريخ, إطلالة, طبيعة"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">نصائح وإرشادات للزائر (كل نصيحة في سطر)</label>
                <textarea
                  rows={2}
                  value={formData.tipsString}
                  onChange={(e) => setFormData({ ...formData, tipsString: e.target.value })}
                  placeholder="أفضل وقت للزيارة وقت الغروب&#10;تتوفر مواقف سيارات واستراحات"
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-medium focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isFeaturedSpot"
                  checked={formData.isFeatured}
                  onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-stone-300"
                />
                <label htmlFor="isFeaturedSpot" className="text-xs font-bold text-stone-800 cursor-pointer">
                  تمييز هذا المعلم في صدارة صفحة السياحة
                </label>
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
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-black shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {saving ? 'جارٍ الحفظ...' : editingSpot ? 'حفظ التعديلات' : 'إضافة المعلم'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
