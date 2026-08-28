import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { HomepageBanner, Business } from '../../types';
import { 
  Plus, Edit2, Trash2, Image, Link, Sparkles, 
  Eye, EyeOff, Save, CheckCircle2, Building2, 
  PlayCircle, Megaphone, FileText, X, Star, MapPin
} from 'lucide-react';

interface BannersManagerProps {
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export function BannersManager({ showToast }: BannersManagerProps) {
  const [banners, setBanners] = useState<HomepageBanner[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<HomepageBanner | null>(null);

  // Form Fields
  const [type, setType] = useState<HomepageBanner['type']>('business');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [buttonText, setButtonText] = useState('');
  const [buttonLink, setButtonLink] = useState('');
  const [badgeText, setBadgeText] = useState('');
  const [active, setActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Business query state
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchBanners();
    fetchBusinesses();
  }, []);

  const fetchBanners = async () => {
    try {
      if (!db) return;
      const q = query(collection(db, 'banners'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list: HomepageBanner[] = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as HomepageBanner);
      });
      setBanners(list);
    } catch (err) {
      console.error("Error fetching banners:", err);
      showToast("فشل جلب البانرات الإعلانية", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinesses = async () => {
    try {
      if (!db) return;
      const q = query(collection(db, 'businesses'), orderBy('name', 'asc'));
      const snap = await getDocs(q);
      const list: Business[] = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Business);
      });
      setBusinesses(list);
    } catch (err) {
      console.error("Error fetching businesses:", err);
    }
  };

  const handleOpenAdd = () => {
    setEditingBanner(null);
    setType('business');
    setTitle('');
    setSubtitle('');
    setImageUrl('');
    setBusinessId('');
    setButtonText('');
    setButtonLink('');
    setBadgeText('');
    setActive(true);
    setSearchQuery('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (banner: HomepageBanner) => {
    setEditingBanner(banner);
    setType(banner.type);
    setTitle(banner.title);
    setSubtitle(banner.subtitle || '');
    setImageUrl(banner.imageUrl);
    setBusinessId(banner.businessId || '');
    setButtonText(banner.buttonText || '');
    setButtonLink(banner.buttonLink || '');
    setBadgeText(banner.badgeText || '');
    setActive(banner.active);
    setSearchQuery('');
    
    // Auto-search business if business type
    if (banner.type === 'business' && banner.businessName) {
      setSearchQuery(banner.businessName);
    }
    setIsFormOpen(true);
  };

  const handleToggleActive = async (banner: HomepageBanner) => {
    try {
      if (!db) return;
      const docRef = doc(db, 'banners', banner.id);
      const nextActive = !banner.active;
      await updateDoc(docRef, { active: nextActive });
      setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, active: nextActive } : b));
      showToast(nextActive ? "تم تفعيل البانر بنجاح ✅" : "تم إلغاء تفعيل البانر 🛑", "success");
    } catch (err) {
      console.error("Error toggling active state:", err);
      showToast("فشل تحديث حالة البانر", "error");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من رغبتك في حذف هذا البانر نهائياً؟")) return;
    try {
      if (!db) return;
      await deleteDoc(doc(db, 'banners', id));
      setBanners(prev => prev.filter(b => b.id !== id));
      showToast("تم حذف البانر الإعلاني بنجاح", "success");
    } catch (err) {
      console.error("Error deleting banner:", err);
      showToast("فشل حذف البانر الإعلاني", "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && type !== 'image_only' && type !== 'animated_image') {
      showToast("يرجى إدخال عنوان الإعلان الرئيسي", "error");
      return;
    }
    if (!imageUrl.trim()) {
      showToast("يرجى تزويدنا برابط صورة الإعلان", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      if (!db) return;

      // Prepare target business info
      let targetBiz: Partial<HomepageBanner> = {};
      if (type === 'business' && businessId) {
        const found = businesses.find(b => b.id === businessId);
        if (found) {
          targetBiz = {
            businessId,
            businessName: found.name,
            category: found.category,
            rating: found.rating || 5,
            address: found.address || ''
          };
        }
      }

      const payload: Omit<HomepageBanner, 'id'> = {
        type,
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        imageUrl: imageUrl.trim(),
        active,
        createdAt: editingBanner ? editingBanner.createdAt : Date.now(),
        ...targetBiz
      };

      if (type === 'text_and_button') {
        payload.buttonText = buttonText.trim() || undefined;
        payload.buttonLink = buttonLink.trim() || undefined;
        payload.badgeText = badgeText.trim() || undefined;
      }

      if (editingBanner) {
        // Edit mode
        await updateDoc(doc(db, 'banners', editingBanner.id), payload);
        showToast("تم تعديل البانر الإعلاني بنجاح ✨", "success");
      } else {
        // Add mode
        await addDoc(collection(db, 'banners'), payload);
        showToast("تمت إضافة البانر الإعلاني الجديد بنجاح 🎉", "success");
      }

      setIsFormOpen(false);
      fetchBanners();
    } catch (err) {
      console.error("Error saving banner:", err);
      showToast("حدث خطأ أثناء حفظ البانر", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBusinesses = searchQuery.trim() === ''
    ? businesses.slice(0, 5)
    : businesses.filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10);

  // Helper to generate template banners if empty
  const handleSeedDefaults = async () => {
    if (!db || businesses.length === 0) {
      showToast("لا يوجد محلات في الدليل لزراعة البانرات منها!", "error");
      return;
    }
    setLoading(true);
    try {
      const featuredList = businesses.filter(b => b.isFeatured).slice(0, 3);
      const pool = featuredList.length > 0 ? featuredList : businesses.slice(0, 3);
      
      for (const biz of pool) {
        const docPayload: Omit<HomepageBanner, 'id'> = {
          type: 'business',
          title: biz.name,
          subtitle: biz.description,
          imageUrl: biz.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
          businessId: biz.id,
          businessName: biz.name,
          category: biz.category,
          rating: biz.rating || 4.5,
          address: biz.address,
          active: true,
          createdAt: Date.now()
        };
        await addDoc(collection(db, 'banners'), docPayload);
      }
      showToast("تمت زراعة البانرات التلقائية من محلات الدليل بنجاح!", "success");
      fetchBanners();
    } catch (err) {
      console.error("Error seeding banners:", err);
      showToast("فشل زراعة البانرات الافتراضية", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#e5e1da] shadow-xs space-y-6" dir="rtl">
      {/* Header bar with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 rounded-2xl text-[#1a4d2e]">
            <Image className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-stone-900">إدارة البانرات الإعلانية (Homepage Carousel)</h2>
            <p className="text-stone-500 text-xs">تحكم كامل بالصور المتحركة والمقالات والروابط المميزة أعلى واجهة التطبيق الرئيسية</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {banners.length === 0 && (
            <button
              onClick={handleSeedDefaults}
              className="inline-flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-600 animate-pulse" />
              <span>زراعة بانرات تلقائية</span>
            </button>
          )}
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة بانر إعلاني جديد</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-stone-500">
          <div className="w-8 h-8 border-4 border-[#1a4d2e] border-t-transparent rounded-full animate-spin mb-3"></div>
          <span className="text-xs font-medium">جاري تحميل البانرات الإعلانية...</span>
        </div>
      ) : banners.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-stone-200 rounded-3xl bg-stone-50/50">
          <Megaphone className="h-12 w-12 text-stone-300 mx-auto mb-3" />
          <p className="text-sm font-black text-stone-700">لا يوجد بانرات معروضة حالياً</p>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            قم بإضافة أول بانر إعلاني الآن! يمكنك إضافة إعلان موجه لصفحة محل، إعلان صورة متحركة GIF، أو إعلان ذكي بنصوص وأزرار تفاعلية مخصصة.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-1.5 bg-[#1a4d2e] text-white px-4 py-2 rounded-xl text-xs font-bold"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>أضف البانر الأول</span>
          </button>
        </div>
      ) : (
        /* List of Banners */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {banners.map((banner) => (
            <div 
              key={banner.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-4 bg-stone-50/45 ${
                banner.active ? 'border-emerald-100 hover:border-emerald-200 hover:shadow-md' : 'border-stone-200 opacity-75'
              }`}
            >
              {/* Banner visual representation preview */}
              <div className="relative w-full aspect-[21/9] rounded-xl overflow-hidden group select-none bg-stone-900 border border-stone-200 shadow-xs">
                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10"></div>
                
                {banner.imageUrl ? (
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-stone-800 text-stone-400">
                    <Image className="h-8 w-8" />
                  </div>
                )}

                {/* Badge top corner info */}
                <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black text-white ${
                    banner.type === 'business' ? 'bg-emerald-600' :
                    banner.type === 'image_only' ? 'bg-blue-600' :
                    banner.type === 'animated_image' ? 'bg-purple-600 animate-pulse' :
                    'bg-[#ff9f1c]'
                  }`}>
                    {banner.type === 'business' ? '🔗 صفحة محل' :
                     banner.type === 'image_only' ? '🖼️ صورة ثابتة' :
                     banner.type === 'animated_image' ? '🎞️ صورة متحركة GIF' :
                     '🔘 نصوص وأزرار'}
                  </span>

                  {banner.active ? (
                    <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full text-[9px] font-bold">نشط معروض</span>
                  ) : (
                    <span className="bg-stone-200 text-stone-600 px-2 py-0.5 rounded-full text-[9px] font-bold">معطل</span>
                  )}
                </div>

                {/* Simulated Content preview inside */}
                <div className="absolute inset-0 p-3 flex flex-col justify-end z-20 text-white text-right" dir="rtl">
                  {banner.badgeText && (
                    <span className="self-start mb-1 bg-[#ff9f1c] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      {banner.badgeText}
                    </span>
                  )}
                  {banner.type === 'business' && banner.category && (
                    <span className="self-start mb-1 bg-[#ff9f1c] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      {banner.category} {banner.rating && `⭐ ${banner.rating.toFixed(1)}`}
                    </span>
                  )}

                  <h3 className="text-sm font-black tracking-tight line-clamp-1">{banner.title || 'إعلان ترويجي'}</h3>
                  {banner.subtitle && (
                    <p className="text-white/80 text-[10px] line-clamp-1 mt-0.5">{banner.subtitle}</p>
                  )}

                  {banner.type === 'text_and_button' && banner.buttonText && (
                    <div className="mt-1.5">
                      <span className="inline-block bg-[#ff9f1c] text-white text-[9px] font-black px-2.5 py-0.5 rounded-md">
                        {banner.buttonText} ➔
                      </span>
                    </div>
                  )}

                  {banner.type === 'business' && banner.address && (
                    <div className="flex items-center gap-1 text-[8px] text-white/70 mt-1">
                      <MapPin className="h-2 w-2" />
                      <span>{banner.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action and details card control */}
              <div className="space-y-2 text-right">
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
                  <div className="text-[11px] text-stone-500">
                    <span>تاريخ الإضافة: </span>
                    <span className="font-bold">{new Date(banner.createdAt).toLocaleDateString('ar-JO')}</span>
                  </div>
                  
                  {banner.type === 'business' && banner.businessName && (
                    <div className="text-[11px] bg-emerald-50 text-emerald-800 px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      <span>مرتبط بـ: {banner.businessName}</span>
                    </div>
                  )}
                  {banner.type === 'text_and_button' && banner.buttonLink && (
                    <div className="text-[11px] bg-amber-50 text-amber-800 px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                      <Link className="h-3 w-3" />
                      <span className="truncate max-w-[120px]">الوجهة: {banner.buttonLink}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => handleToggleActive(banner)}
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer border ${
                      banner.active 
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200' 
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}
                    title={banner.active ? "تعطيل مؤقت" : "تفعيل وعرض في الواجهة"}
                  >
                    {banner.active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    <span>{banner.active ? 'تعطيل مؤقت' : 'تفعيل النشر'}</span>
                  </button>

                  <button
                    onClick={() => handleOpenEdit(banner)}
                    className="p-1.5 text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer border border-blue-200 bg-white"
                    title="تعديل تفاصيل الإعلان"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(banner.id)}
                    className="p-1.5 text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer border border-red-200 bg-white"
                    title="حذف نهائي"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL FORM: ADD / EDIT BANNER */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#1a4d2e] text-white rounded-xl">
                  <Megaphone className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-stone-900 text-base">
                    {editingBanner ? 'تعديل البانر الإعلاني' : 'إضافة بانر إعلاني ترويجي جديد'}
                  </h3>
                  <p className="text-stone-500 text-[11px] mt-0.5">قم بإدخال بيانات ومعلومات الإعلان والوجهة لتهيئتها فوراً في التطبيق</p>
                </div>
              </div>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Type Selection */}
              <div>
                <label className="block text-xs font-black text-stone-700 mb-2">نوع ومحتوى الإعلان الترويجي</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'business', label: 'صفحة محل', desc: 'توجيه لصفحة محل بالدليل' },
                    { id: 'image_only', label: 'صورة فقط', desc: 'صورة ترويجية بدون توجيه' },
                    { id: 'animated_image', label: 'صورة متحركة GIF', desc: 'صيغ ديناميكية متحركة' },
                    { id: 'text_and_button', label: 'نصوص وأزرار', desc: 'نص مخصص وزر توجيه خارجي' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setType(opt.id as HomepageBanner['type'])}
                      className={`p-3 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between h-full ${
                        type === opt.id 
                          ? 'border-[#1a4d2e] bg-[#1a4d2e]/5 text-[#1a4d2e] ring-2 ring-[#1a4d2e]/10 font-bold' 
                          : 'border-stone-200 hover:border-stone-300 text-stone-700'
                      }`}
                    >
                      <span className="text-xs block font-bold">{opt.label}</span>
                      <span className="text-[9px] block text-stone-500 font-medium leading-tight mt-1">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title & Subtitle */}
              {type !== 'image_only' && type !== 'animated_image' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">العنوان الرئيسي للإعلان</label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="مثال: مطعم البركة - عروض حصرية"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">العنوان الفرعي / الوصف الموجز</label>
                    <input
                      type="text"
                      value={subtitle}
                      onChange={e => setSubtitle(e.target.value)}
                      placeholder="مثال: خصم 20% على الوجبات العائلية لطلاب جامعة اليرموك"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                    />
                  </div>
                </div>
              )}

              {/* Image URL Input */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">رابط صورة الإعلان (بأبعاد سينمائية عريضة 21:9 للحصول على جودة مبهرة)</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    required
                    value={imageUrl}
                    onChange={e => setImageUrl(e.target.value)}
                    placeholder="https://example.com/ad-image.jpg"
                    className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                  />
                </div>
                {type === 'animated_image' && (
                  <p className="text-[10px] text-purple-600 font-bold mt-1.5 flex items-center gap-1 bg-purple-50 p-2 rounded-lg">
                    <PlayCircle className="h-3.5 w-3.5" />
                    <span>نصيحة: استخدم روابط صور بصيغة GIF أو APNG متحركة للحصول على تفاعل بصري مذهل لدى المستخدمين.</span>
                  </p>
                )}
                {imageUrl && (
                  <div className="mt-2 text-center">
                    <p className="text-[10px] text-stone-400 mb-1">معاينة الصورة المرفقة:</p>
                    <img 
                      src={imageUrl} 
                      alt="معاينة" 
                      className="h-24 mx-auto rounded-lg border object-cover aspect-[21/9]" 
                      onError={() => showToast("رابط الصورة غير صالح أو محمي ضد التضمين الخارجى", "error")}
                    />
                  </div>
                )}
              </div>

              {/* Conditional Business Link Selector */}
              {type === 'business' && (
                <div className="p-4 rounded-2xl border border-emerald-100 bg-emerald-50/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#1a4d2e]" />
                    <span className="text-xs font-black text-[#1a4d2e]">ربط الإعلان بصفحة محل من الدليل</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 mb-1">ابحث عن المحل لتحديده وتعبئة بياناته تلقائياً</label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="اكتب اسم المحل للبحث..."
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
                    />
                  </div>

                  {businesses.length > 0 && searchQuery && (
                    <div className="bg-white border border-stone-200 rounded-xl max-h-40 overflow-y-auto divide-y divide-stone-100 text-xs">
                      {filteredBusinesses.map(biz => (
                        <button
                          key={biz.id}
                          type="button"
                          onClick={() => {
                            setBusinessId(biz.id);
                            setSearchQuery(biz.name);
                            // Auto populate titles if empty
                            if (!title) setTitle(biz.name);
                            if (!subtitle) setSubtitle(biz.description);
                          }}
                          className={`w-full text-right px-3 py-2.5 hover:bg-stone-50 font-bold transition-all flex items-center justify-between ${
                            businessId === biz.id ? 'bg-emerald-50/60 text-[#1a4d2e]' : 'text-stone-700'
                          }`}
                        >
                          <span className="font-black">{biz.name}</span>
                          <span className="text-[10px] text-stone-500">{biz.category} • {biz.address}</span>
                        </button>
                      ))}
                      {filteredBusinesses.length === 0 && (
                        <div className="p-3 text-center text-stone-400">لا يوجد محلات مطابقة للبحث</div>
                      )}
                    </div>
                  )}

                  {businessId && (
                    <div className="p-2.5 rounded-xl bg-white border border-emerald-100 flex items-center justify-between text-xs font-bold text-emerald-800">
                      <span>تم ربط الإعلان بنجاح بصفحة المحل المعتمدة.</span>
                      <button 
                        type="button" 
                        onClick={() => { setBusinessId(''); setSearchQuery(''); }}
                        className="text-red-600 hover:underline text-[10px]"
                      >
                        إلغاء الربط
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Conditional Texts and Buttons Options */}
              {type === 'text_and_button' && (
                <div className="p-4 rounded-2xl border border-amber-100 bg-amber-50/25 space-y-4">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs">
                    <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                    <span>خيارات الأزرار والنصوص المتقدمة التفاعلية</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">نص الزر التفاعلي</label>
                      <input
                        type="text"
                        value={buttonText}
                        onChange={e => setButtonText(e.target.value)}
                        placeholder="مثال: احجز الآن، طلب فوري، سجل معنا"
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">رابط توجيه الزر (URL خارجي أو داخلي)</label>
                      <input
                        type="text"
                        value={buttonLink}
                        onChange={e => setButtonLink(e.target.value)}
                        placeholder="مثال: https://wa.me/962770000"
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-800 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">شارة ترويجية مخصصة (Badge)</label>
                      <input
                        type="text"
                        value={badgeText}
                        onChange={e => setBadgeText(e.target.value)}
                        placeholder="مثال: عرض محدود، لفترة وجيزة، جديد"
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-800 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Active Status */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="active_status"
                  checked={active}
                  onChange={e => setActive(e.target.checked)}
                  className="w-4 h-4 text-[#1a4d2e] border-stone-300 rounded-sm focus:ring-[#1a4d2e] cursor-pointer"
                />
                <label htmlFor="active_status" className="text-xs font-bold text-stone-800 cursor-pointer select-none">
                  نشر وتفعيل البانر مباشرة في أعلى الصفحة الرئيسية للموقع والزوار
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-2 border-t border-stone-100 pt-5">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-6 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Save className="h-4 w-4 text-[#ff9f1c]" />
                  <span>{isSubmitting ? 'جاري الحفظ والرفع...' : editingBanner ? 'تعديل وحفظ التغييرات' : 'نشر وتثبيت البانر الإعلاني'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
