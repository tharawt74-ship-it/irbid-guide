import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, Link, useParams, useNavigate } from 'react-router';
import { 
  Newspaper, Flame, Clock, MapPin, Search, Sparkles, 
  Plus, Pencil, Trash2, X, Check, AlertCircle, ImageIcon, 
  RefreshCw, Send, ShieldCheck, Share2, ArrowRight, Video,
  BookOpen, Eye, ExternalLink
} from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { NewsArticle, HomepageBanner } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getAppConfig } from '../lib/demoDataHelper';
import { SEO } from '../components/common/SEO';
import { ImageUploader } from '../components/ui/ImageUploader';
import { BannerSlideshow } from '../components/BannerSlideshow';
import { fetchPageBanners, DEFAULT_NEWS_BANNERS } from '../lib/pageBanners';
import { useConfirm } from '../contexts/ConfirmContext';

const CATEGORIES = ['الكل', 'أخبار المدينة', 'تعليم وجامعات', 'فعاليات وثقافة', 'سياحة وبيئة', 'تجارة ومحلات', 'طقس وخدمات'];

const PRESET_IMAGES = [
  { label: 'شوارع إربد', url: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=900&q=80' },
  { label: 'جامعة اليرموك', url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=80' },
  { label: 'مهرجانات وحدائق', url: 'https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?auto=format&fit=crop&w=900&q=80' },
  { label: 'أم قيس وسياحة', url: 'https://images.unsplash.com/photo-1590059390046-5991583d73b2?auto=format&fit=crop&w=900&q=80' },
  { label: 'مطاعم وتجارة', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80' },
  { label: 'طبيعة وطقس', url: 'https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=900&q=80' }
];

const SEED_NEWS: Omit<NewsArticle, 'id'>[] = [
  {
    title: 'بلدية إربد الكبرى تطلق مشروع تجميل الميادين والحدائق العامة',
    category: 'أخبار المدينة',
    location: 'وسط البلد، إربد',
    excerpt: 'بدأت بلدية إربد الكبرى بتنفيذ المرحلة الأولى من مشروع إعادة تأهيل وتجميل الميادين العامة وزراعة الورود الموسمية لتعزيز المظهر الحضاري للمدينة.',
    content: 'أعلنت بلدية إربد الكبرى اليوم عن انطلاق المشروع الريادي لإعادة تأهيل وتجميل الميادين الرئيسية والحدائق العامة في المدينة، بما في ذلك زراعة أكثر من 50 ألف شتلة من الزهور والورود الموسمية وتطوير أنظمة الري الحديثة وصيانة الأرصفة والمقاعد الحجرية.\n\nويهدف هذا المشروع إلى تعزيز المساحات الخضراء وتوفير متنفسات عائلية مريحة وآمنة لأهالي محافظة إربد وزوارها، في إطار خطة البلدية للتحول إلى مدينة خضراء صديقة للبيئة ومستدامة وعروس لشمال الأردن الرائع.',
    source: 'إعلام بلدية إربد الكبرى',
    imageUrl: 'https://images.unsplash.com/photo-1588880331179-bc9b93a8cb5e?auto=format&fit=crop&w=900&q=80',
    readTime: '3 دقائق',
    date: 'الآن',
    isHot: true,
    videoUrl: ''
  },
  {
    title: 'جامعة اليرموك تحتفل بتخريج فوج جديد من طلبة الكليات العلمية',
    category: 'تعليم وجامعات',
    location: 'جامعة اليرموك، إربد',
    excerpt: 'رعى رئيس جامعة اليرموك احتفال تخريج كوكبة جديدة من طلبة كليات الهندسة وتكنولوجيا المعلومات والعلوم وسط حضور لافت من الأهالي والشخصيات الأكاديمية.',
    content: 'احتضنت الصالة الرياضية بطلب لافت في جامعة اليرموك فعاليات حفل تخريج كوكبة جديدة من طلبة الكليات العلمية والتكنولوجية للفصل الدراسي الصيفي.\n\nوعبّر رئيس الجامعة في كلمته عن اعتزاز اليرموك بخريجيها الذين يرفدون سوق العمل المحلي والإقليمي بأحدث المهارات والخبرات الرقمية والعلمية، مؤكداً استمرار الجامعة في تطوير خططها التدريسية لتواكب المعايير العالمية وتطلعات سوق العمل.',
    source: 'دائرة العلاقات العامة - اليرموك',
    imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=80',
    readTime: '4 دقائق',
    date: 'اليوم',
    isHot: false,
    videoUrl: ''
  },
  {
    title: 'انطلاق فعاليات مهرجان إربد الثقافي في بيت عرار التراثي',
    category: 'فعاليات وثقافة',
    location: 'بيت عرار الثقافي، إربد',
    excerpt: 'افتتحت مديرية ثقافة إربد فعاليات مهرجان الشعر والأدب السنوي في ساحة بيت عرار بمشاركة واسعة من الشعراء والمثقفين من الأردن والوطن العربي.',
    content: 'تحت رعاية وزير الثقافة، بدأت مساء أمس الفعاليات الثقافية لمهرجان إربد السنوي في بيت الشاعر مصطفى وهبي التل (عرار) التاريخي بوسط المدينة.\n\nويشمل المهرجان الذي يستمر لمدة ثلاثة أيام أمسيات شعرية وندوات فكرية، بالإضافة إلى معارض للكتب والمصنوعات اليدوية التراثية الأردنية، ويهدف إلى إحياء الإرث الثقافي الغني لمدينة إربد وتقديم منصة للمواهب الأردنية الشابة للتعبير عن إبداعاتهم الأدبية والفنية.',
    source: 'مديرية ثقافة إربد',
    imageUrl: 'https://images.unsplash.com/photo-1590059390046-5991583d73b2?auto=format&fit=crop&w=900&q=80',
    readTime: '3 دقائق',
    date: 'أمس',
    isHot: false,
    videoUrl: ''
  }
];

export function News() {
  const { confirm } = useConfirm();
  const { currentUser, isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [banners, setBanners] = useState<HomepageBanner[]>(DEFAULT_NEWS_BANNERS);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formExcerpt, setFormExcerpt] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formCategory, setFormCategory] = useState('أخبار المدينة');
  const [formLocation, setFormLocation] = useState('إربد');
  const [formSource, setFormSource] = useState('دليل شو في بإربد');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formReadTime, setFormReadTime] = useState('3 دقائق');
  const [formVideoUrl, setFormVideoUrl] = useState('');
  const [formIsHot, setFormIsHot] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Load news from Firestore
  useEffect(() => {
    fetchPageBanners(['أخبار', 'فعاليات', 'مستجدات', 'إربد', 'ثقافة'], DEFAULT_NEWS_BANNERS, 'news')
      .then(res => setBanners(res))
      .catch(() => setBanners(DEFAULT_NEWS_BANNERS));

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

        let items: NewsArticle[] = [];
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          if (!appConfig.showDemoData && data.isDemo) {
            return;
          }
          items.push({ id: docSnap.id, ...data } as NewsArticle);
        });

        // Seed default news if empty and showDemoData is active
        if (items.length === 0 && appConfig.showDemoData) {
          const seededList: NewsArticle[] = [];
          for (const item of SEED_NEWS) {
            const docRef = await addDoc(collection(db, 'news'), {
              ...item,
              summary: item.excerpt, // for compatibility
              image: item.imageUrl, // for compatibility
              isDemo: true,
              createdAt: Date.now() - (seededList.length * 86400000)
            });
            seededList.push({ id: docRef.id, ...item } as NewsArticle);
          }
          setNews(seededList);
        } else {
          setNews(items);
        }
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
    setFormContent('');
    setFormCategory('أخبار المدينة');
    setFormLocation('وسط البلد، إربد');
    setFormSource('دليل شو في بإربد');
    setFormImageUrl(PRESET_IMAGES[0].url);
    setFormReadTime('3 دقائق');
    setFormVideoUrl('');
    setFormIsHot(false);
    setIsModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, article: NewsArticle) => {
    e.stopPropagation(); // Prevent clicking card details
    if (!isAdmin) {
      showToast('عذراً، تعديل الأخبار مقتصر على إدارة المنصة فقط');
      return;
    }
    setEditingArticle(article);
    setFormTitle(article.title || '');
    setFormExcerpt(article.excerpt || article.summary || '');
    setFormContent(article.content || article.excerpt || article.summary || '');
    setFormCategory(article.category || 'أخبار المدينة');
    setFormLocation(article.location || 'إربد');
    setFormSource(article.source || 'دليل شو في بإربد');
    setFormImageUrl(article.imageUrl || article.image || PRESET_IMAGES[0].url);
    setFormReadTime(article.readTime || '3 دقائق');
    setFormVideoUrl(article.videoUrl || '');
    setFormIsHot(!!article.isHot);
    setIsModalOpen(true);
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('عذراً، نشر وتعديل الأخبار مقتصر على مدير الموقع فقط');
      return;
    }
    if (!formTitle.trim() || !formExcerpt.trim()) {
      showToast('يرجى تعبئة الحقول المطلوبة');
      return;
    }

    setSaving(true);
    const now = Date.now();

    const articleData = {
      title: formTitle.trim(),
      excerpt: formExcerpt.trim(),
      summary: formExcerpt.trim(), // for AdminDashboard compatibility
      content: formContent.trim() || formExcerpt.trim(),
      category: formCategory,
      location: formLocation.trim() || 'إربد',
      source: formSource.trim() || 'دليل شو في بإربد',
      imageUrl: formImageUrl.trim() || PRESET_IMAGES[0].url,
      image: formImageUrl.trim() || PRESET_IMAGES[0].url, // for AdminDashboard compatibility
      readTime: formReadTime.trim() || '3 دقائق',
      date: 'الآن',
      videoUrl: formVideoUrl.trim() || '',
      isHot: formIsHot,
      createdAt: editingArticle?.createdAt || now
    };

    try {
      if (editingArticle) {
        // Edit mode
        const updatedArticle: NewsArticle = {
          ...articleData,
          id: editingArticle.id,
          date: editingArticle.date || 'الآن'
        };

        if (db) {
          await setDoc(doc(db, 'news', editingArticle.id), updatedArticle, { merge: true });
        }

        setNews(prev => prev.map(item => item.id === editingArticle.id ? updatedArticle : item));
        showToast('تم تعديل الخبر بنجاح 🎉');
      } else {
        // Add new mode
        let newId = `news-${Date.now()}`;
        if (db) {
          const docRef = await addDoc(collection(db, 'news'), articleData);
          newId = docRef.id;
        }

        const newArticle: NewsArticle = {
          ...articleData,
          id: newId
        };

        setNews(prev => [newArticle, ...prev]);
        showToast('تم نشر الخبر الجديد بنجاح 🚀');
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save news article:', err);
      showToast('حدث خطأ أثناء حفظ الخبر');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteArticle = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent detail click
    if (!isAdmin) {
      showToast('عذراً، حذف الأخبار مقتصر على مدير الموقع فقط');
      return;
    }
    if (!(await confirm({ message: 'هل أنت متأكد من حذف هذا الخبر نهائياً من نشرة أخبار إربد؟' }))) return;

    try {
      if (db) {
        await deleteDoc(doc(db, 'news', id));
      }

      setNews(prev => prev.filter(item => item.id !== id));
      showToast('تم حذف الخبر بنجاح');
      
      // If deleting current view, clear id
      if (searchParams.get('id') === id) {
        setSearchParams({});
      }
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
      (item.excerpt || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.content || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.location || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.source || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const featuredNews = filteredNews.length > 0 ? filteredNews.find(n => n.isHot) || filteredNews[0] : null;

  // Single News Article Dedicated View
  const activeArticleId = routeId || searchParams.get('id') || searchParams.get('newsId');
  const activeArticle = news.find(item => item.id === activeArticleId);

  const handleShare = async (article: NewsArticle) => {
    const shareUrl = `${window.location.origin}/news/${article.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: article.title,
          text: article.excerpt || article.summary,
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showToast('تم نسخ رابط الخبر لمشاركته! 🔗');
      }
    } catch (err) {
      await navigator.clipboard.writeText(shareUrl);
      showToast('تم نسخ رابط الخبر لمشاركته! 🔗');
    }
  };

  if (activeArticle) {
    const relatedNews = news
      .filter(n => n.id !== activeArticle.id && (n.category === activeArticle.category || n.isHot))
      .slice(0, 3);

    return (
      <div className="w-full space-y-8 pb-16 max-w-4xl mx-auto" dir="rtl">
        <SEO 
          title={`${activeArticle.title} | أخبار إربد`}
          description={activeArticle.excerpt || activeArticle.summary}
          canonicalUrl={`https://shofierbid.com/news?id=${activeArticle.id}`}
        />

        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between bg-white px-4 py-3.5 rounded-2xl border border-[#e5e1da] shadow-xs">
          <button
            onClick={() => {
              if (routeId) {
                navigate('/news');
              } else {
                setSearchParams({});
              }
            }}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-stone-600 hover:text-[#1a4d2e] transition-colors cursor-pointer"
          >
            <ArrowRight className="h-4 w-4 text-[#1a4d2e]" />
            <span>العودة لقائمة الأخبار والمستجدات</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleShare(activeArticle)}
              className="p-2 bg-stone-50 hover:bg-stone-100 text-stone-700 rounded-xl border border-stone-200 cursor-pointer transition-all flex items-center gap-1.5 text-xs font-black"
              title="مشاركة الخبر"
            >
              <Share2 className="h-4 w-4 text-[#ff9f1c]" />
              <span className="hidden sm:inline">مشاركة</span>
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={(e) => openEditModal(e, activeArticle)}
                  className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200 cursor-pointer transition-all"
                  title="تعديل"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => handleDeleteArticle(e, activeArticle.id)}
                  className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 cursor-pointer transition-all"
                  title="حذف"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Article Body Card */}
        <article className="bg-white rounded-3xl border border-[#e5e1da] shadow-sm overflow-hidden">
          
          {/* Cover Image */}
          <div className="relative aspect-[16/9] md:aspect-[21/9] w-full bg-stone-100 overflow-hidden">
            <img 
              src={activeArticle.imageUrl || activeArticle.image} 
              alt={activeArticle.title}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {activeArticle.isHot && (
              <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-black flex items-center gap-1 shadow-md">
                <Flame className="h-3.5 w-3.5" />
                عاجل جداً
              </div>
            )}
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-3.5 py-1 rounded-full text-xs font-black text-[#1a4d2e] border border-emerald-100 shadow-sm">
              {activeArticle.category}
            </div>
          </div>

          <div className="p-6 sm:p-10 space-y-6">
            {/* Metadata bar */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs font-bold text-stone-400 border-b border-stone-100 pb-4">
              <span className="flex items-center gap-1 text-[#1a4d2e] bg-emerald-50/60 px-2.5 py-1 rounded-lg">
                <Clock className="h-3.5 w-3.5 text-[#ff9f1c]" />
                نُشر: {activeArticle.date}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                قراءة {activeArticle.readTime}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-stone-600">
                <MapPin className="h-3.5 w-3.5 text-orange-500" />
                {activeArticle.location}
              </span>
              <span className="mr-auto font-black text-stone-700 bg-stone-100 px-3 py-1 rounded-lg">
                المصدر: {activeArticle.source}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-3xl font-black text-stone-950 leading-snug tracking-tight">
              {activeArticle.title}
            </h1>

            {/* Content Text */}
            <div className="text-stone-800 text-sm sm:text-base leading-relaxed whitespace-pre-line font-medium space-y-4">
              {activeArticle.content || activeArticle.excerpt || activeArticle.summary}
            </div>

            {/* Embedded Video component if videoUrl is provided */}
            {activeArticle.videoUrl && (
              <div className="mt-6 pt-6 border-t border-stone-100 space-y-3">
                <h3 className="font-bold text-sm sm:text-base text-stone-900 flex items-center gap-2">
                  <Video className="h-4 w-4 text-red-600" />
                  <span>تغطية مرئية / فيديو ذات صلة:</span>
                </h3>
                <div className="aspect-video w-full rounded-2xl overflow-hidden border border-stone-200">
                  <iframe 
                    src={activeArticle.videoUrl.includes('youtube.com') || activeArticle.videoUrl.includes('youtu.be')
                      ? activeArticle.videoUrl.replace('watch?v=', 'embed/')
                      : activeArticle.videoUrl}
                    title={activeArticle.title}
                    className="w-full h-full"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>
            )}
          </div>
        </article>

        {/* Related News section */}
        {relatedNews.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#ff9f1c]" />
              <span>أخبار ومقالات ذات صلة</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedNews.map(item => (
                <div
                  key={item.id}
                  onClick={() => navigate(`/news/${item.id}`)}
                  className="bg-white rounded-2xl border border-[#e5e1da] p-3 shadow-3xs hover:shadow-sm cursor-pointer hover:border-[#1a4d2e]/30 transition-all flex flex-col gap-3 group"
                >
                  <div className="aspect-[16/10] w-full bg-stone-100 rounded-xl overflow-hidden relative">
                    <img 
                      src={item.imageUrl || item.image} 
                      alt={item.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2 bg-white/90 px-2 py-0.5 rounded-lg text-[9px] font-black text-[#1a4d2e]">
                      {item.category}
                    </div>
                  </div>
                  <div className="space-y-1 flex-1 flex flex-col justify-between">
                    <h4 className="font-bold text-xs sm:text-sm text-stone-900 line-clamp-2 leading-tight group-hover:text-[#1a4d2e]">
                      {item.title}
                    </h4>
                    <div className="flex items-center justify-between text-[10px] text-stone-400 pt-2 border-t border-stone-100">
                      <span>{item.date}</span>
                      <span>قراءة {item.readTime}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999999] bg-[#1a4d2e] text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-500/30 animate-fade-in">
          <Check className="h-5 w-5 text-[#ff9f1c]" />
          <span className="font-bold text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Banner Slideshow */}
      <BannerSlideshow banners={banners} />

      {/* Page Header & Search Bar (Compact & Sleek) */}
      <div className="bg-white rounded-2xl md:rounded-3xl p-3.5 sm:p-5 border border-[#e5e1da] shadow-xs space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="inline-flex items-center gap-1 bg-emerald-50 text-[#1a4d2e] border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                <Newspaper className="h-3 w-3 text-[#1a4d2e]" />
                <span>نشرة إربد اليومية</span>
              </div>
              {isAdmin ? (
                <div className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
                  <ShieldCheck className="h-3 w-3 text-emerald-700" />
                  <span>لوحة إدارة الأخبار</span>
                </div>
              ) : (
                <div className="hidden sm:inline-flex items-center gap-1 bg-stone-100 text-stone-700 border border-stone-200 px-2 py-0.5 rounded-full text-[11px] font-semibold">
                  <Sparkles className="h-3 w-3 text-amber-500" />
                  <span>أحدث المستجدات والفعاليات</span>
                </div>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              آخر أخبار إربد والمستجدات
            </h1>

            <p className="hidden sm:block text-stone-500 text-xs font-medium leading-relaxed">
              {isAdmin 
                ? 'تابع وأضف وعدّل أهم الأخبار المحلية، فعاليات الجامعات، ومشاريع البلدية.'
                : 'تابع أهم الأخبار المحلية، فعاليات الجامعات، مشاريع البلدية والافتتاحات في إربد.'}
            </p>
          </div>

          {/* Quick Actions in Banner - Only for Admin */}
          {isAdmin && (
            <div className="shrink-0">
              <button
                onClick={openAddModal}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-[#1a4d2e] hover:bg-[#143e25] text-white px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
              >
                <Plus className="h-4 w-4 text-[#ff9f1c]" />
                <span>إضافة خبر جديد</span>
              </button>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في عناوين الأخبار، المواقع، أو المصادر..."
            className="w-full bg-[#fdfcfb] text-stone-900 placeholder:text-stone-400 border border-[#e5e1da] rounded-xl px-3.5 py-2.5 pr-10 text-xs sm:text-sm focus:outline-none focus:border-[#1a4d2e] focus:bg-white transition-all shadow-inner"
          />
          <Search className="h-4 w-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Chips */}
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
                    ? 'bg-[#1a4d2e] text-white shadow-sm font-black'
                    : 'bg-white border border-[#e5e1da] text-stone-600 hover:border-[#1a4d2e]/40 hover:bg-stone-50'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
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
            <div 
              onClick={() => navigate(`/news/${featuredNews.id}`)}
              className="bg-white rounded-3xl border border-[#e5e1da] overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer relative group"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                <div className="lg:col-span-7 relative h-64 sm:h-80 lg:h-auto min-h-[300px] overflow-hidden bg-stone-100">
                  <img 
                    src={featuredNews.imageUrl || featuredNews.image} 
                    alt={featuredNews.title} 
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                    referrerPolicy="no-referrer"
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

                  {/* Management buttons overlay - Admin only */}
                  {isAdmin && (
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <button
                        onClick={(e) => openEditModal(e, featuredNews)}
                        className="p-2 bg-white/95 hover:bg-white text-stone-700 hover:text-[#1a4d2e] rounded-xl shadow-md backdrop-blur-sm transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                        title="تعديل الخبر"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteArticle(e, featuredNews.id)}
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
                        <Clock className="h-3.5 w-3.5 text-[#ff9f1c]" />
                        {featuredNews.date}
                      </span>
                      <span>•</span>
                      <span>قراءة {featuredNews.readTime}</span>
                    </div>

                    <h2 className="text-xl sm:text-2xl font-black text-[#2d2a26] leading-snug break-words group-hover:text-[#1a4d2e] transition-colors">
                      {featuredNews.title}
                    </h2>

                    <p className="text-stone-600 text-xs sm:text-sm leading-relaxed line-clamp-4 break-words">
                      {featuredNews.excerpt || featuredNews.summary}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-[#e5e1da] flex items-center justify-between text-xs text-stone-500 font-medium">
                    <div className="flex items-center gap-1.5 text-stone-600">
                      <MapPin className="h-3.5 w-3.5 text-orange-500 shrink-0" />
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
              <h2 className="text-xl sm:text-2xl font-black text-[#2d2a26] flex items-center gap-2">
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
                  onClick={() => navigate(`/news/${item.id}`)}
                  className="bg-white rounded-2xl sm:rounded-3xl border border-[#e5e1da] overflow-hidden shadow-xs hover:shadow-md hover:border-[#1a4d2e]/30 transition-all flex flex-col justify-between group relative cursor-pointer"
                >
                  {/* Article Image & Controls */}
                  <div>
                    <div className="h-48 relative overflow-hidden bg-stone-100">
                      <img 
                        src={item.imageUrl || item.image} 
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>

                      <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-[#1a4d2e] shadow-xs">
                        {item.category}
                      </div>

                      {item.isHot && (
                        <div className="absolute bottom-3 right-3 bg-red-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-xs animate-pulse">
                          <Flame className="h-3 w-3" />
                          عاجل
                        </div>
                      )}

                      {/* Edit & Delete Action Buttons - Admin only */}
                      {isAdmin && (
                        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-md p-1 rounded-xl z-20">
                          <button
                            onClick={(e) => openEditModal(e, item)}
                            className="p-1.5 bg-white/90 hover:bg-white text-stone-700 hover:text-[#1a4d2e] rounded-lg transition-colors cursor-pointer"
                            title="تعديل الخبر"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteArticle(e, item.id)}
                            className="p-1.5 bg-white/90 hover:bg-red-50 text-stone-700 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                            title="حذف الخبر"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Article Content */}
                    <div className="p-5 sm:p-6 space-y-2.5">
                      <div className="flex items-center gap-2 text-[11px] text-stone-400 font-bold">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-[#ff9f1c]" />
                          {item.date}
                        </span>
                        <span>•</span>
                        <span>قراءة {item.readTime}</span>
                      </div>

                      <h3 className="font-bold text-base sm:text-lg text-[#2d2a26] leading-snug line-clamp-2 break-words group-hover:text-[#1a4d2e] transition-colors">
                        {item.title}
                      </h3>

                      <p className="text-stone-500 text-xs leading-relaxed line-clamp-3 break-words">
                        {item.excerpt || item.summary}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <div className="pt-3 border-t border-[#e5e1da] flex items-center justify-between text-xs text-stone-500">
                      <span className="flex items-center gap-1 truncate max-w-[140px] font-medium">
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

              {/* Excerpt / Summary */}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">
                  ملخص الخبر السريع (يظهر في قائمة البطاقات) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formExcerpt}
                  onChange={(e) => setFormExcerpt(e.target.value)}
                  placeholder="اكتب سطر أو سطرين ملخصين للخبر..."
                  className="w-full p-3.5 bg-stone-50 border border-[#e5e1da] rounded-xl text-[#2d2a26] text-sm focus:bg-white focus:border-[#1a4d2e] outline-none transition-all"
                />
              </div>

              {/* Content Full Detail */}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">
                  المحتوى والتفاصيل الكاملة للخبر (يظهر عند فتح صفحة الخبر)
                </label>
                <textarea
                  rows={6}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="اكتب تفاصيل الخبر كاملة هنا بالتفصيل والمقاطع..."
                  className="w-full p-3.5 bg-stone-50 border border-[#e5e1da] rounded-xl text-[#2d2a26] text-sm focus:bg-white focus:border-[#1a4d2e] outline-none transition-all resize-none"
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
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">
                    المصدر أو جهة النشر
                  </label>
                  <input
                    type="text"
                    value={formSource}
                    onChange={(e) => setFormSource(e.target.value)}
                    placeholder="مثال: إعلام بلدية إربد، جامعة اليرموك..."
                    className="w-full p-3 bg-stone-50 border border-[#e5e1da] rounded-xl text-[#2d2a26] text-sm focus:bg-white focus:border-[#1a4d2e] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">
                    وقت القراءة
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

              {/* Video URL */}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">
                  رابط فيديو ذو صلة (YouTube / embed) - اختياري
                </label>
                <input
                  type="url"
                  value={formVideoUrl}
                  onChange={(e) => setFormVideoUrl(e.target.value)}
                  placeholder="مثال: https://www.youtube.com/watch?v=..."
                  className="w-full p-3.5 bg-stone-50 border border-[#e5e1da] rounded-xl text-[#2d2a26] text-sm focus:bg-white focus:border-[#1a4d2e] outline-none"
                />
              </div>

              {/* Image Uploader & Presets */}
              <div className="space-y-2">
                <ImageUploader
                  label="صورة الخبر الرئيسية (رفع ملف من الجهاز)"
                  folder="news"
                  value={formImageUrl}
                  onChange={(url) => setFormImageUrl(url)}
                  aspectRatio="cover"
                  placeholder="اختر ملف صورة الخبر من جهازك أو اسحبها هنا"
                />

                {/* Quick Presets */}
                <div className="pt-1">
                  <span className="text-xs font-semibold text-stone-500 block mb-1.5">أو اختر صورة جاهزة تناسب الخبر:</span>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_IMAGES.map((img) => (
                      <button
                        key={img.label}
                        type="button"
                        onClick={() => setFormImageUrl(img.url)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
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
                  className="px-5 py-2.5 rounded-xl border border-[#e5e1da] font-bold text-sm text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving || !formTitle.trim() || !formExcerpt.trim()}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1a4d2e] hover:bg-[#133b22] text-white font-bold text-sm transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
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

    </div>
  );
}
