import React, { useState, useEffect } from 'react';
import { 
  Newspaper, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  Flame, 
  Eye, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Sparkles,
  ExternalLink,
  X,
  Share2
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { NewsArticle } from '../../types';
import { ImageUploader } from '../ui/ImageUploader';

interface NewsManagerProps {
  showToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

const CATEGORIES = [
  'أخبار المدينة',
  'تعليم وجامعات',
  'فعاليات وثقافة',
  'سياحة وبيئة',
  'تجارة ومحلات',
  'طقس وخدمات'
];

export function NewsManager({ showToast }: NewsManagerProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Form modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [location, setLocation] = useState('إربد');
  const [source, setSource] = useState('إدارة منصة شو في بإربد');
  const [imageUrl, setImageUrl] = useState('');
  const [isHot, setIsHot] = useState(false);

  const fetchArticles = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'news'), orderBy('createdAt', 'desc'), limit(100)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as NewsArticle));
      setArticles(list);
    } catch (err) {
      console.error('Error loading news:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const handleOpenAdd = () => {
    setEditingArticle(null);
    setTitle('');
    setSummary('');
    setContent('');
    setCategory(CATEGORIES[0]);
    setLocation('إربد');
    setSource('إدارة منصة شو في بإربد');
    setImageUrl('');
    setIsHot(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (article: NewsArticle) => {
    setEditingArticle(article);
    setTitle(article.title || '');
    setSummary(article.excerpt || article.summary || '');
    setContent(article.content || '');
    setCategory(article.category || CATEGORIES[0]);
    setLocation(article.location || 'إربد');
    setSource(article.source || 'إدارة منصة شو في بإربد');
    setImageUrl(article.imageUrl || '');
    setIsHot(!!article.isHot);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !title.trim()) return;

    setSaving(true);
    try {
      const payload: Partial<NewsArticle> = {
        title: title.trim(),
        excerpt: summary.trim() || title.trim(),
        summary: summary.trim() || title.trim(),
        content: content.trim(),
        category,
        location: location.trim(),
        source: source.trim(),
        imageUrl: imageUrl.trim(),
        isHot,
        createdAt: editingArticle?.createdAt || Date.now(),
        date: editingArticle?.date || new Date().toLocaleDateString('ar-JO'),
        readTime: '3 دقائق'
      };

      if (editingArticle) {
        await updateDoc(doc(db, 'news', editingArticle.id), payload);
        showToast('تم تحديث الخبر بنجاح');
      } else {
        await addDoc(collection(db, 'news'), payload);
        showToast('تم نشر الخبر الجديد بنجاح');
      }

      setIsModalOpen(false);
      fetchArticles();
    } catch (err) {
      console.error('Error saving news article:', err);
      showToast('حدث خطأ أثناء حفظ الخبر', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, articleTitle: string) => {
    if (!db) return;
    if (!window.confirm(`هل أنت متأكد من حذف الخبر (${articleTitle}) نهائياً؟`)) return;

    try {
      await deleteDoc(doc(db, 'news', id));
      showToast('تم حذف الخبر بنجاح');
      setArticles(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      console.error('Error deleting news:', err);
      showToast('فشل حذف الخبر', 'error');
    }
  };

  const filteredArticles = articles.filter(a => {
    if (categoryFilter !== 'all' && a.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = a.title?.toLowerCase().includes(q);
      const matchSummary = a.summary?.toLowerCase().includes(q) || a.excerpt?.toLowerCase().includes(q);
      return matchTitle || matchSummary;
    }
    return true;
  });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-emerald-50 text-[#1a4d2e] font-bold">
              <Newspaper className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-black text-stone-900">إدارة أخبار ومقالات إربد</h3>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            نشر وتحديث مقالات صفحة أخبار إربد وتثبيت الأخبار العاجلة ومتابعة تفاعل الزوار.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-5 py-2.5 rounded-2xl text-xs font-black transition-all shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>إضافة مقال جديد</span>
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="البحث في الأخبار بالعنوان أو النص..."
            className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-10 pl-4 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-700 focus:outline-none w-full sm:w-auto"
        >
          <option value="all">كافة الأقسام ({articles.length})</option>
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* News List */}
      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center text-xs font-bold text-stone-400">
          جاري تحميل الأخبار...
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center space-y-2">
          <Newspaper className="h-10 w-10 text-stone-300 mx-auto" />
          <h4 className="text-sm font-black text-stone-700">لا توجد أخبار منشورة حالياً</h4>
          <p className="text-xs text-stone-400">يمكنك البدء بنشر أول خبر ومقال بالضغط على إضافة مقال جديد أعلاه</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredArticles.map(article => (
            <div key={article.id} className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-2xs flex flex-col justify-between">
              <div>
                {article.imageUrl && (
                  <div className="relative h-44 w-full bg-stone-100 overflow-hidden">
                    <img 
                      src={article.imageUrl} 
                      alt={article.title} 
                      className="w-full h-full object-cover"
                    />
                    {article.isHot && (
                      <span className="absolute top-3 right-3 bg-red-600 text-white text-[10px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-xs">
                        <Flame className="h-3 w-3" />
                        <span>عاجل</span>
                      </span>
                    )}
                    <span className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-0.5 rounded-lg">
                      {article.category}
                    </span>
                  </div>
                )}

                <div className="p-4 space-y-2">
                  <h4 className="font-black text-sm text-stone-900 line-clamp-2 leading-snug">
                    {article.title}
                  </h4>
                  <p className="text-xs text-stone-500 line-clamp-3 leading-relaxed">
                    {article.summary || article.excerpt || article.content}
                  </p>
                </div>
              </div>

              <div className="p-4 border-t border-stone-100 flex items-center justify-between bg-stone-50/50">
                <div className="text-[11px] text-stone-400 font-mono">
                  {article.date || (article.createdAt ? new Date(article.createdAt).toLocaleDateString('ar-JO') : '')}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(article)}
                    className="p-2 hover:bg-stone-200/60 rounded-xl text-stone-600 transition-colors"
                    title="تعديل المقال"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(article.id, article.title)}
                    className="p-2 hover:bg-red-50 rounded-xl text-stone-400 hover:text-red-600 transition-colors"
                    title="حذف المقال"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 border border-stone-200 shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h4 className="font-black text-base text-stone-900">
                {editingArticle ? 'تعديل المقال الإخباري' : 'إضافة مقال إخباري جديد'}
              </h4>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">عنوان الخبر</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="اكتب عنوان الخبر الرئيسي هنا..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">القسم / التصنيف</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none"
                  >
                    {CATEGORIES.filter(c => c !== 'الكل').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-700">المصدر / الكاتب</label>
                  <input
                    type="text"
                    value={source}
                    onChange={e => setSource(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">صورة الخبر (رابط أو رفع)</label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-mono text-stone-800 focus:outline-none"
                />
                <div className="mt-2">
                  <ImageUploader
                    value={imageUrl}
                    onChange={url => setImageUrl(url)}
                    label="أو ارفع صورة من جهازك"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">الموجز / الملخص</label>
                <textarea
                  rows={2}
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  placeholder="ملخص قصير يظهر في بطاقة الخبر..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-700">نص وتفاصيل المقال الكامل</label>
                <textarea
                  rows={5}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="اكتب المحتوى الكامل للمقال هنا..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isHot}
                  onChange={e => setIsHot(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded border-stone-300 focus:ring-red-500"
                />
                <span className="text-xs font-bold text-stone-700">تمييز كخبر عاجل ومميز في صدارة الصفحة</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl text-xs font-black bg-[#1a4d2e] hover:bg-[#133b22] text-white transition-colors shadow-xs disabled:opacity-50"
                >
                  {saving ? 'جاري الحفظ...' : editingArticle ? 'حفظ التعديلات' : 'نشر المقال'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
