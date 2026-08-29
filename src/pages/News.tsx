import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Newspaper, Flame, Clock, MapPin, Search, Sparkles, 
  Plus, Pencil, Trash2, X, Check, AlertCircle, ImageIcon, 
  RefreshCw, Send, ShieldCheck
} from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { NewsArticle } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getAppConfig } from '../lib/demoDataHelper';
import { SEO } from '../components/common/SEO';

const CATEGORIES = ['الكل', 'أخبار المدينة', 'تعليم وجامعات', 'فعاليات وثقافة', 'سياحة وبيئة', 'تجارة ومحلات', 'طقس وخدمات'];

const PRESET_IMAGES = [
  { label: 'شوارع إربد', url: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=900&q=80' },
  { label: 'جامعة اليرموك', url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=80' },
  { label: 'مهرجانات وحدائق', url: 'https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?auto=format&fit=crop&w=900&q=80' },
  { label: 'أم قيس وسياحة', url: 'https://images.unsplash.com/photo-1590059390046-5991583d73b2?auto=format&fit=crop&w=900&q=80' },
  { label: 'مطاعم وتجارة', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80' },
  { label: 'طبيعة وطقس', url: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=900&q=80' }
];

const LOCAL_STORAGE_KEY = 'irbid_news_articles_v1';

export function News() {
  const { currentUser, isAdmin } = useAuth();
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formExcerpt, setFormExcerpt] = useState('');
  const [formCategory, setFormCategory] = useState('أخبار المدينة');
  const [formLocation, setFormLocation] = useState('إربد');
  const [formSource, setFormSource] = useState('دليل شو في بإربد');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formReadTime, setFormReadTime] = useState('3 دقائق');
  const [formIsHot, setFormIsHot] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Load news from Firestore purely
  useEffect(() => {
    async function loadNewsData() {
      setLoading(true);
      try {
        if (!db) {
          setNews([]);
          setLoading(false);
          return;
        }

        const appConfig = await getAppConfig();
        const q = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);

        const items: NewsArticle[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (!appConfig.showDemoData && data.isDemo) {
            return;
          }
          items.push({ id: docSnap.id, ...data } as NewsArticle);
        });

        setNews(items);
      } catch (err) {
        console.error('Error fetching news from Firestore:', err);
        setNews([]);
      } finally {
        setLoading(false);
      }
    }

    loadNewsData();
  }, []);

  const openAddModal = () => {
    if (!isAdmin) {
      showToast('عذراً، إضافة الأخبار مقتصرة على إدارة المنصة فقط');
      return;
    }
    setEditingArticle(null);
    setFormTitle('');
    setFormExcerpt('');
    setFormCategory('أخبار المدينة');
    setFormLocation('وسط البلد، إربد');
    setFormSource('دليل شو في بإربد');
    setFormImageUrl(PRESET_IMAGES[0].url);
    setFormReadTime('3 دقائق');
    setFormIsHot(false);
    setIsModalOpen(true);
  };

  const openEditModal = (article: NewsArticle) => {
    if (!isAdmin) {
      showToast('عذراً، تعديل الأخبار مقتصر على إدارة المنصة فقط');
      return;
    }
    setEditingArticle(article);
    setFormTitle(article.title);
    setFormExcerpt(article.excerpt);
    setFormCategory(article.category);
    setFormLocation(article.location);
    setFormSource(article.source);
    setFormImageUrl(article.imageUrl || PRESET_IMAGES[0].url);
    setFormReadTime(article.readTime || '3 دقائق');
    setFormIsHot(!!article.isHot);
    setIsModalOpen(true);
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('عذراً، نشر وتعديل الأخبار مقتصر على مدير الموقع فقط');
      return;
    }
    if (!formTitle.trim() || !formExcerpt.trim()) return;

    setSaving(true);
    const now = Date.now();

    const articleData: Omit<NewsArticle, 'id'> = {
      title: formTitle.trim(),
      excerpt: formExcerpt.trim(),
      category: formCategory,
      location: formLocation.trim() || 'إربد',
      source: formSource.trim() || 'دليل شو في بإربد',
      imageUrl: formImageUrl.trim() || PRESET_IMAGES[0].url,
      readTime: formReadTime.trim() || '3 دقائق',
      date: 'الآن',
      isHot: formIsHot,
      createdAt: editingArticle?.createdAt || now
    };

    try {
      if (editingArticle) {
        // Edit mode
        const updatedArticle: NewsArticle = {
          ...articleData,
          id: editingArticle.id,
          date: editingArticle.date
        };

        if (db) {
          try {
            await setDoc(doc(db, 'news', editingArticle.id), updatedArticle, { merge: true });
          } catch (err) {
            console.error('Error updating firestore news:', err);
          }
        }

        const updatedList = news.map(item => item.id === editingArticle.id ? updatedArticle : item);
        setNews(updatedList);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
        showToast('تم تعديل الخبر بنجاح');
      } else {
        // Add new mode
        let newId = `news-${Date.now()}`;
        if (db) {
          try {
            const docRef = await addDoc(collection(db, 'news'), articleData);
            newId = docRef.id;
          } catch (err) {
            console.error('Error creating firestore news:', err);
          }
        }

        const newArticle: NewsArticle = {
          ...articleData,
          id: newId
        };

        const updatedList = [newArticle, ...news];
        setNews(updatedList);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
        showToast('تم نشر الخبر الجديد بنجاح');
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save news article:', err);
      showToast('حدث خطأ أثناء حفظ الخبر');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteArticle = async (id: string) => {
    if (!isAdmin) {
      showToast('عذراً، حذف الأخبار مقتصر على مدير الموقع فقط');
      return;
    }
    try {
      if (db) {
        try {
          await deleteDoc(doc(db, 'news', id));
        } catch (err) {
          console.error('Error deleting news from firestore:', err);
        }
      }

      const updatedList = news.filter(item => item.id !== id);
      setNews(updatedList);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
      setDeleteConfirmId(null);
      showToast('تم حذف الخبر بنجاح');
    } catch (err) {
      console.error('Failed to delete news:', err);
      showToast('تعذر حذف الخبر');
    }
  };

  // Filter items based on category and search query
  const filteredNews = news.filter(item => {
    const matchesCat = selectedCategory === 'الكل' || item.category === selectedCategory;
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const featuredNews = filteredNews.length > 0 ? filteredNews[0] : null;

  return (
    <div className="w-full space-y-8 sm:space-y-10 pb-16 relative">
      <SEO 
        title="أخبار وفعاليات إربد | تغطية مستمرة لأهم الأحداث"
        description="تابع أحدث وأهم أخبار مدينة إربد: تغطية لأخبار التعليم وجامعة اليرموك، الفعاليات الثقافية، السياحة، الطقس، وقرارات البلدية في محافظة إربد."
        keywords={['أخبار إربد', 'فعاليات إربد', 'جامعة اليرموك أخبار', 'بلدية إربد', 'طقس إربد', 'إربد الان']}
        canonicalUrl="https://shofierbid.com/news"
      />
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1a4d2e] text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-500/30 animate-fade-in">
          <Check className="h-5 w-5 text-[#ff9f1c]" />
          <span className="font-bold text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-l from-[#1a4d2e] to-[#0f311c] rounded-3xl p-6 sm:p-10 text-white relative overflow-hidden shadow-lg border border-[#1a4d2e]/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-[#ff9f1c]/10 rounded-full blur-2xl pointer-events-none -ml-10 -mb-10"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 bg-[#ff9f1c] text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-xs">
                <Newspaper className="h-4 w-4" />
                <span>نشرة يومية حية لعروس الشمال</span>
              </div>
              {isAdmin ? (
                <div className="inline-flex items-center gap-1.5 bg-emerald-500/30 border border-emerald-400/40 text-emerald-100 px-3 py-1.5 rounded-full text-xs font-bold shadow-xs">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                  <span>لوحة إدارة ونشر الأخبار (مدير الموقع)</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                  <span>أحدث المستجدات والفعاليات في إربد</span>
                </div>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              آخر أخبار إربد والمستجدات
            </h1>

            <p className="text-stone-200 text-sm sm:text-base leading-relaxed max-w-xl font-normal">
              {isAdmin 
                ? 'تابع وأضف وعدّل أهم الأخبار المحلية، فعاليات الجامعات، مشاريع البلدية، والأنشطة والافتتاحات في محافظة إربد بكل دقة وسهولة.'
                : 'تابع أهم الأخبار المحلية، فعاليات الجامعات، مشاريع البلدية، والأنشطة والافتتاحات في محافظة إربد أولاً بأول.'}
            </p>
          </div>

          {/* Quick Actions in Banner - Only for Admin */}
          {isAdmin && (
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
              <button
                onClick={openAddModal}
                className="inline-flex items-center justify-center gap-2.5 bg-[#ff9f1c] hover:bg-[#f39209] text-white px-6 py-3.5 rounded-2xl font-black text-sm sm:text-base transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
              >
                <Plus className="h-5 w-5" />
                <span>إضافة خبر جديد</span>
              </button>
            </div>
          )}
        </div>

        {/* Search Bar inside header */}
        <div className="pt-6 relative z-10 max-w-xl">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في عناوين الأخبار، المواقع، أو المصادر..."
              className="w-full bg-white/10 backdrop-blur-md text-white placeholder:text-stone-300 border border-white/20 rounded-2xl px-5 py-3.5 pr-11 text-sm focus:outline-none focus:bg-white/20 focus:border-white transition-colors"
            />
            <Search className="h-5 w-5 text-stone-300 absolute right-3.5 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-300 hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Filter Chips & Add Button */}
      <div className="flex items-center justify-between gap-4 border-b border-[#e5e1da] pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide flex-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#1a4d2e] text-white shadow-sm'
                    : 'bg-white border border-[#e5e1da] text-stone-600 hover:border-[#1a4d2e]/40 hover:bg-stone-50'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {isAdmin && (
          <button
            onClick={openAddModal}
            className="hidden sm:inline-flex items-center gap-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-colors shrink-0 shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4 text-[#ff9f1c]" />
            <span>أضف خبر</span>
          </button>
        )}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-[#e5e1da]">
          <RefreshCw className="h-8 w-8 text-[#1a4d2e] animate-spin mx-auto mb-3" />
          <p className="text-stone-500 font-bold">جاري تحميل الأخبار والمستجدات...</p>
        </div>
      ) : filteredNews.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-[#e5e1da] border-dashed p-6 space-y-4">
          <Newspaper className="h-12 w-12 text-stone-300 mx-auto" />
          <h3 className="text-xl font-bold text-stone-700">لا توجد أخبار مطابقة</h3>
          <p className="text-sm text-stone-500 max-w-md mx-auto">
            {searchQuery ? `لم نجد أي خبر يحتوي على "${searchQuery}".` : 'لم يتم إضافة أخبار في هذا القسم بعد.'}
          </p>
          {isAdmin && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 bg-[#1a4d2e] text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-[#133b22] transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>أضف أول خبر هنا</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Featured Breaking News (if no search and viewing 'الكل') */}
          {selectedCategory === 'الكل' && !searchQuery && featuredNews && (
            <div className="bg-white rounded-3xl border border-[#e5e1da] overflow-hidden shadow-xs hover:shadow-md transition-shadow relative group">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                <div className="lg:col-span-7 relative h-64 sm:h-80 lg:h-auto min-h-[300px] overflow-hidden bg-stone-100">
                  <img 
                    src={featuredNews.imageUrl} 
                    alt={featuredNews.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:hidden"></div>
                  
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <span className="bg-red-600 text-white px-3.5 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-md">
                      <Flame className="h-3.5 w-3.5" />
                      <span>خبر بارز</span>
                    </span>
                    <span className="bg-white/90 backdrop-blur-md text-[#1a4d2e] px-3 py-1 rounded-full text-xs font-bold shadow-xs">
                      {featuredNews.category}
                    </span>
                  </div>

                  {/* Management buttons overlay on image - Admin only */}
                  {isAdmin && (
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(featuredNews)}
                        className="p-2 bg-white/95 hover:bg-white text-stone-700 hover:text-[#1a4d2e] rounded-xl shadow-md backdrop-blur-sm transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                        title="تعديل الخبر"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(featuredNews.id)}
                        className="p-2 bg-white/95 hover:bg-red-50 text-stone-700 hover:text-red-600 rounded-xl shadow-md backdrop-blur-sm transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                        title="حذف الخبر"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-stone-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {featuredNews.date}
                      </span>
                      <span>•</span>
                      <span>قراءة {featuredNews.readTime}</span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-[#2d2a26] leading-snug break-words">
                      {featuredNews.title}
                    </h2>

                    <p className="text-stone-600 text-sm sm:text-base leading-relaxed break-words whitespace-pre-line">
                      {featuredNews.excerpt}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#e5e1da] flex items-center justify-between text-xs text-stone-500 font-medium">
                    <div className="flex items-center gap-1.5 text-stone-600">
                      <MapPin className="h-3.5 w-3.5 text-[#ff9f1c] shrink-0" />
                      <span className="truncate max-w-[160px]">{featuredNews.location}</span>
                    </div>
                    <span className="font-bold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg">
                      {featuredNews.source}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* News Grid (All articles or remaining) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold text-[#2d2a26] flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#ff9f1c]" />
                <span>قائمة الأخبار والمقالات</span>
              </h2>
              <span className="text-xs sm:text-sm font-semibold text-stone-500 bg-stone-100 px-3 py-1 rounded-full">
                {filteredNews.length} خبر متاح
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNews.map(item => (
                <div 
                  key={item.id}
                  className="bg-white rounded-2xl sm:rounded-3xl border border-[#e5e1da] overflow-hidden shadow-xs hover:shadow-md hover:border-[#1a4d2e]/30 transition-all flex flex-col group relative"
                >
                  {/* Article Image & Controls */}
                  <div className="h-48 relative overflow-hidden bg-stone-100">
                    <img 
                      src={item.imageUrl} 
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>

                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#1a4d2e] shadow-xs">
                      {item.category}
                    </div>

                    {item.isHot && (
                      <div className="absolute bottom-3 right-3 bg-red-600 text-white px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 shadow-xs">
                        <Flame className="h-3 w-3" />
                        عاجل
                      </div>
                    )}

                    {/* Edit & Delete Action Buttons - Admin only */}
                    {isAdmin && (
                      <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-md p-1 rounded-xl">
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 bg-white/90 hover:bg-white text-stone-700 hover:text-[#1a4d2e] rounded-lg transition-colors cursor-pointer"
                          title="تعديل الخبر"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(item.id)}
                          className="p-1.5 bg-white/90 hover:bg-red-50 text-stone-700 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                          title="حذف الخبر"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Article Content */}
                  <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-xs text-stone-400">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {item.date}
                        </span>
                        <span>•</span>
                        <span>قراءة {item.readTime}</span>
                      </div>

                      <h3 className="font-bold text-base sm:text-lg text-[#2d2a26] leading-snug line-clamp-2 break-words">
                        {item.title}
                      </h3>

                      <p className="text-stone-500 text-xs sm:text-sm leading-relaxed line-clamp-3 break-words">
                        {item.excerpt}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#e5e1da] flex items-center justify-between text-xs text-stone-500">
                      <span className="flex items-center gap-1 truncate max-w-[140px]">
                        <MapPin className="h-3.5 w-3.5 text-[#ff9f1c] shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </span>
                      <span className="font-bold text-stone-600 shrink-0 bg-stone-50 px-2 py-0.5 rounded border border-[#e5e1da]">
                        {item.source}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Add / Edit News Modal - Admin Only */}
      {isModalOpen && isAdmin && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 relative my-auto animate-scale-in">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#e5e1da] pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-[#1a4d2e]/10 text-[#1a4d2e] p-2.5 rounded-2xl">
                  {editingArticle ? <Pencil className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#2d2a26]">
                    {editingArticle ? 'تعديل الخبر' : 'إضافة خبر جديد للنشرة'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {editingArticle ? 'قم بتحديث بيانات ومحتوى الخبر المحدد' : 'انشر خبراً أو مستجدات عن إربد لزوار المنصة'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveArticle} className="space-y-5">
              
              {/* Title */}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">
                  عنوان الخبر <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: بلدية إربد تبدأ مشروع تجميل الحدائق العامة..."
                  className="w-full p-3.5 bg-stone-50 border border-[#e5e1da] rounded-xl text-[#2d2a26] text-sm focus:bg-white focus:border-[#1a4d2e] focus:ring-2 focus:ring-[#1a4d2e]/20 outline-none transition-all"
                />
              </div>

              {/* Excerpt / Content */}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">
                  نص وتفاصيل الخبر <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formExcerpt}
                  onChange={(e) => setFormExcerpt(e.target.value)}
                  placeholder="اكتب ملخص أو تفاصيل الخبر بالتفصيل..."
                  className="w-full p-3.5 bg-stone-50 border border-[#e5e1da] rounded-xl text-[#2d2a26] text-sm focus:bg-white focus:border-[#1a4d2e] focus:ring-2 focus:ring-[#1a4d2e]/20 outline-none transition-all resize-none"
                ></textarea>
              </div>

              {/* Category & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">
                    القسم / التصنيف
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full p-3 bg-stone-50 border border-[#e5e1da] rounded-xl text-[#2d2a26] text-sm focus:bg-white focus:border-[#1a4d2e] outline-none"
                  >
                    {CATEGORIES.filter(c => c !== 'الكل').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">
                    الموقع في إربد
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="مثال: شارع الجامعة، لواء بني كنانة..."
                    className="w-full p-3 bg-stone-50 border border-[#e5e1da] rounded-xl text-[#2d2a26] text-sm focus:bg-white focus:border-[#1a4d2e] outline-none"
                  />
                </div>
              </div>

              {/* Source & Read Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">
                    المصدر أو جهة النشر
                  </label>
                  <input
                    type="text"
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    placeholder="مثال: إعلام بلدية إربد، جامعة اليرم..."
                    className="w-full p-3 bg-stone-50 border border-[#e5e1da] rounded-xl text-[#2d2a26] text-sm focus:bg-white focus:border-[#1a4d2e] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">
                    وقت القراءة المقدر
                  </label>
                  <input
                    type="text"
                    value={formReadTime}
                    onChange={(e) => setFormReadTime(e.target.value)}
                    placeholder="مثال: 3 دقائق"
                    className="w-full p-3 bg-stone-50 border border-[#e5e1da] rounded-xl text-[#2d2a26] text-sm focus:bg-white focus:border-[#1a4d2e] outline-none"
                  />
                </div>
              </div>

              {/* Image URL & Presets */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-stone-700">
                  رابط صورة الخبر
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formImageUrl}
                    onChange={(e) => setFormImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full p-3 bg-stone-50 border border-[#e5e1da] rounded-xl text-[#2d2a26] text-sm focus:bg-white focus:border-[#1a4d2e] outline-none"
                  />
                </div>

                {/* Quick Presets */}
                <div className="pt-1">
                  <span className="text-xs font-semibold text-stone-500 block mb-1.5">أو اختر صورة سريعة تناسب الخبر:</span>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_IMAGES.map((img) => (
                      <button
                        key={img.label}
                        type="button"
                        onClick={() => setFormImageUrl(img.url)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                          formImageUrl === img.url 
                            ? 'bg-[#1a4d2e] text-white border-[#1a4d2e]' 
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {img.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview Image */}
                {formImageUrl && (
                  <div className="mt-2 h-32 rounded-xl overflow-hidden border border-[#e5e1da] bg-stone-100 relative">
                    <img src={formImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded">معاينة الصورة</span>
                  </div>
                )}
              </div>

              {/* Is Hot / Breaking Toggle */}
              <div className="flex items-center gap-3 p-3.5 bg-stone-50 border border-[#e5e1da] rounded-xl">
                <input
                  type="checkbox"
                  id="isHotToggle"
                  checked={formIsHot}
                  onChange={(e) => setFormIsHot(e.target.checked)}
                  className="w-4 h-4 text-[#1a4d2e] rounded focus:ring-[#1a4d2e] accent-[#1a4d2e]"
                />
                <label htmlFor="isHotToggle" className="text-sm font-bold text-stone-700 flex items-center gap-1.5 cursor-pointer">
                  <Flame className="h-4 w-4 text-red-500" />
                  <span>تمييز الخبر كـ "عاجل" / "خبر بارز" في أعلى الصفحة</span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e5e1da]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-[#e5e1da] font-bold text-sm text-stone-600 hover:bg-stone-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving || !formTitle.trim() || !formExcerpt.trim()}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1a4d2e] hover:bg-[#133b22] text-white font-bold text-sm transition-colors shadow-xs disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>{editingArticle ? 'حفظ التعديلات' : 'نشر الخبر الآن'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Dialog - Admin Only */}
      {deleteConfirmId && isAdmin && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-red-100 space-y-4 my-auto animate-scale-in text-center">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="h-7 w-7" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-stone-900">هل أنت متأكد من حذف هذا الخبر؟</h3>
              <p className="text-stone-500 text-sm">
                سيتم حذف الخبر نهائياً من نشرة أخبار إربد ولن يظهر للمستخدمين.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-5 py-2.5 rounded-xl border border-stone-200 font-bold text-sm text-stone-600 hover:bg-stone-50 transition-colors"
              >
                إلغاء التراجع
              </button>
              <button
                onClick={() => handleDeleteArticle(deleteConfirmId)}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors shadow-xs"
              >
                نعم، احذف الخبر
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
