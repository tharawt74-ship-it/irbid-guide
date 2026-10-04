import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, getDocs, deleteDoc, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import { 
  Sparkles, 
  Trash2, 
  Search, 
  Filter, 
  CheckCircle2, 
  X, 
  Flame, 
  Tag as TagIcon, 
  ExternalLink 
} from 'lucide-react';

interface OfferItem {
  id: string;
  title: string;
  businessName: string;
  businessId?: string;
  category: string;
  discountPercentage: number | string;
  oldPrice?: string;
  newPrice?: string;
  code?: string;
  expiresIn: string;
  description: string;
  location: string;
  phone: string;
  whatsapp?: string;
  isHot?: boolean;
  isFeatured?: boolean;
  createdAt?: number;
}

interface OffersModerationManagerProps {
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export function OffersModerationManager({ showToast }: OffersModerationManagerProps) {
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'offers'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list: OfferItem[] = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() } as OfferItem);
      });
      setOffers(list);
    } catch (err) {
      console.error("Error fetching offers:", err);
      showToast("فشل جلب العروض والخصومات من قاعدة البيانات", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا العرض نهائياً من المنصة؟")) return;
    try {
      await deleteDoc(doc(db, 'offers', id));
      showToast("تم حذف العرض بنجاح", "success");
      setOffers(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("Error deleting offer:", err);
      showToast("فشل حذف العرض المحدد", "error");
    }
  };

  const handleToggleFeatured = async (offer: OfferItem) => {
    try {
      const newValue = !offer.isFeatured;
      await updateDoc(doc(db, 'offers', offer.id), { isFeatured: newValue });
      showToast(newValue ? "تم تمييز العرض وتثبيته بنجاح" : "تم إلغاء تثبيت العرض المميز", "success");
      setOffers(prev => prev.map(item => item.id === offer.id ? { ...item, isFeatured: newValue } : item));
    } catch (err) {
      console.error("Error updating feature status:", err);
      showToast("فشل تحديث حالة تمييز العرض", "error");
    }
  };

  const handleToggleHot = async (offer: OfferItem) => {
    try {
      const newValue = !offer.isHot;
      await updateDoc(doc(db, 'offers', offer.id), { isHot: newValue });
      showToast(newValue ? "تم وضع العرض في قائمة العروض الساخنة" : "تم إزالة العرض من القائمة الساخنة", "success");
      setOffers(prev => prev.map(item => item.id === offer.id ? { ...item, isHot: newValue } : item));
    } catch (err) {
      console.error("Error updating hot status:", err);
      showToast("فشل تحديث الحالة الساخنة للعرض", "error");
    }
  };

  // Get unique categories for filtering
  const categoriesList = ['الكل', ...Array.from(new Set(offers.map(item => item.category).filter(Boolean)))];

  const filteredOffers = offers.filter(offer => {
    const matchesSearch = 
      offer.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'الكل' || offer.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Upper bar with title and action summary */}
      <div className="bg-white p-6 rounded-3xl border border-[#e5e1da] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-black text-stone-900">إدارة العروض والخصومات</h3>
          <p className="text-xs text-stone-500">مراقبة وتعديل وتمييز وحذف العروض التجارية والخصومات النشطة بالمنصة</p>
        </div>
        <div className="text-xs font-black text-[#1a4d2e] bg-emerald-50 px-4.5 py-2.5 rounded-2xl border border-emerald-100">
          إجمالي العروض النشطة: {offers.length}
        </div>
      </div>

      {/* Filter and search bar */}
      <div className="bg-white p-4 rounded-3xl border border-[#e5e1da] shadow-xs flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم العرض، المحل، أو الوصف التجاري..."
            className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-10 pl-4 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {categoriesList.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#1a4d2e] text-white'
                  : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Table & List representation of Offers */}
      {loading ? (
        <div className="bg-white py-16 rounded-3xl border border-[#e5e1da] text-center text-xs text-stone-500 font-bold">
          جاري تحميل قائمة العروض النشطة...
        </div>
      ) : filteredOffers.length === 0 ? (
        <div className="bg-white py-16 rounded-3xl border border-[#e5e1da] text-center text-xs text-stone-500 font-bold">
          لا توجد عروض مطابقة لمعايير البحث الحالية
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOffers.map((offer) => (
            <div key={offer.id} className="bg-white p-5 rounded-3xl border border-[#e5e1da] shadow-xs hover:shadow-md transition-all relative flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                    {offer.category || "عام"}
                  </span>
                  
                  <div className="flex gap-1">
                    {offer.isFeatured && (
                      <span className="bg-[#1a4d2e] text-white px-2 py-0.5 rounded-md text-[9px] font-black">
                        مميز ومثبت
                      </span>
                    )}
                    {offer.isHot && (
                      <span className="bg-red-500 text-white px-2 py-0.5 rounded-md text-[9px] font-black">
                        عرض ساخن
                      </span>
                    )}
                  </div>
                </div>

                <h4 className="text-sm font-black text-stone-900 line-clamp-1 mb-1">{offer.title}</h4>
                <p className="text-[11px] font-bold text-stone-500 mb-2.5">بواسطة: {offer.businessName}</p>
                <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed mb-4">{offer.description}</p>

                <div className="border-t border-stone-100 pt-3.5 space-y-2 text-[11px] text-stone-600">
                  <div className="flex justify-between">
                    <span className="font-bold">نسبة الخصم أو القيمة:</span>
                    <span className="font-black text-rose-600">
                      {typeof offer.discountPercentage === 'number' ? `%${offer.discountPercentage}` : offer.discountPercentage}
                    </span>
                  </div>
                  {offer.oldPrice && (
                    <div className="flex justify-between">
                      <span className="font-bold">السعر الأصلي:</span>
                      <span className="line-through text-stone-400">{offer.oldPrice} دينار</span>
                    </div>
                  )}
                  {offer.newPrice && (
                    <div className="flex justify-between">
                      <span className="font-bold">السعر المخفض:</span>
                      <span className="font-black text-[#1a4d2e]">{offer.newPrice} دينار</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-bold">تاريخ الصلاحية:</span>
                    <span className="font-mono text-stone-500">{offer.expiresIn || "لفترة محدودة"}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3.5 border-t border-stone-100 flex items-center justify-between gap-1.5">
                <div className="flex gap-1">
                  <button
                    onClick={() => handleToggleFeatured(offer)}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      offer.isFeatured
                        ? 'bg-[#1a4d2e]/10 text-[#1a4d2e] border-[#1a4d2e]/20'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                    title="تثبيت العرض في أعلى الصفحة"
                  >
                    مميز
                  </button>
                  <button
                    onClick={() => handleToggleHot(offer)}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      offer.isHot
                        ? 'bg-rose-50 text-rose-600 border-rose-100'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                    title="تحديد كعرض ساخن في الهوم"
                  >
                    ساخن
                  </button>
                </div>

                <button
                  onClick={() => handleDeleteOffer(offer.id)}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="حذف هذا العرض نهائياً"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
