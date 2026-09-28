import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  orderBy,
  increment 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { sanitizeFirestorePayload } from '../../lib/firestoreHelper';
import { compressImage } from '../../lib/imageCompression';
import { ConfirmModal } from '../ui/ConfirmModal';
import { Business, AttachedPostItem, BusinessPost, MenuItem, JobOffer } from '../../types';
import { 
  Newspaper, 
  Trash2, 
  Share2, 
  ThumbsUp, 
  Image as ImageIcon, 
  Check, 
  X, 
  Sparkles, 
  Clock, 
  Pin, 
  Upload, 
  AlertCircle, 
  Edit3, 
  Paperclip, 
  Utensils, 
  Tag, 
  Briefcase, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';

interface BusinessNewsTabProps {
  business: Business;
  isOwner: boolean;
  onNewsCountChange?: (count: number) => void;
  offers?: any[];
  jobs?: JobOffer[];
  onSelectTab?: (tabName: string) => void;
}

const getCacheKey = (id: string) => `irbid_business_posts_${id}`;

const loadFromCache = (id: string): BusinessPost[] => {
  try {
    const raw = localStorage.getItem(getCacheKey(id));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveToCache = (id: string, list: BusinessPost[]) => {
  try {
    localStorage.setItem(getCacheKey(id), JSON.stringify(list));
  } catch (e) {
    console.warn('Failed to cache posts locally:', e);
  }
};

export function BusinessNewsTab({ 
  business, 
  isOwner, 
  onNewsCountChange, 
  offers = [], 
  jobs = [], 
  onSelectTab 
}: BusinessNewsTabProps) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<BusinessPost[]>(() => loadFromCache(business.id));
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  
  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [attachedItem, setAttachedItem] = useState<AttachedPostItem | null>(null);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [attachmentType, setAttachmentType] = useState<'menu' | 'offer' | 'job'>('menu');
  
  const [publishing, setPublishing] = useState(false);
  const [compressingImage, setCompressingImage] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [postToDelete, setPostToDelete] = useState<BusinessPost | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  
  // Feedback
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

  // Menu items list from business
  const menuItems: MenuItem[] = Array.isArray(business.menuItems) ? business.menuItems : [];

  useEffect(() => {
    fetchPosts();
  }, [business.id]);

  const sortPosts = (items: BusinessPost[]): BusinessPost[] => {
    return [...items].sort((a, b) => {
      // Pinned posts first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      // Then newest first
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  };

  const fetchPosts = async () => {
    setLoading(true);
    const cached = loadFromCache(business.id);
    if (cached.length > 0) {
      const sorted = sortPosts(cached);
      setPosts(sorted);
      if (onNewsCountChange) onNewsCountChange(sorted.length);
    }

    try {
      if (db) {
        let fetched: BusinessPost[] = [];
        try {
          const q = query(
            collection(db, 'business_posts'),
            where('businessId', '==', business.id)
          );
          const snap = await getDocs(q);
          snap.forEach((d) => {
            fetched.push({ id: d.id, ...d.data() } as BusinessPost);
          });
        } catch (e) {
          console.warn('Notice fetching business_posts from Firestore:', e);
        }

        // Merge fetched with locally cached posts
        const existingIds = new Set(fetched.map(p => p.id));
        const localOnly = cached.filter(p => !existingIds.has(p.id));
        const combined = sortPosts([...localOnly, ...fetched]);

        setPosts(combined);
        saveToCache(business.id, combined);
        if (onNewsCountChange) onNewsCountChange(combined.length);
      }
    } catch (err) {
      console.warn('Error fetching business news posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setCompressingImage(true);
      const res = await compressImage(file, 1200, 1200, 0.7);
      setImageUrl(res.previewUrl);
    } catch (err) {
      console.warn('Failed to compress image:', err);
    } finally {
      setCompressingImage(false);
    }
  };

  const startEdit = (post: BusinessPost) => {
    setEditingPostId(post.id);
    setTitle(post.title || '');
    setContent(post.content || '');
    setImageUrl(post.imageUrl || '');
    setIsPinned(!!post.isPinned);
    setAttachedItem(post.attachedItem || null);
    setShowForm(true);
    setStatusMessage(null);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setImageUrl('');
    setIsPinned(false);
    setAttachedItem(null);
    setEditingPostId(null);
    setShowAttachmentPicker(false);
    setShowForm(false);
  };

  const handlePublishOrSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setStatusMessage({ type: 'error', text: 'يرجى إدخال عنوان الخبر والمحتوى بالتفصيل.' });
      return;
    }

    setPublishing(true);
    setStatusMessage(null);

    try {
      const now = Date.now();
      const rawPostData: Partial<BusinessPost> = {
        businessId: business.id,
        businessName: business.name || '',
        businessLogoUrl: business.logoUrl || business.image || '',
        title: title.trim(),
        content: content.trim(),
        imageUrl: imageUrl.trim() || '',
        isPinned: !!isPinned,
        attachedItem: attachedItem || null
      };

      if (editingPostId) {
        // UPDATE EXISTING POST
        rawPostData.updatedAt = now;
        const sanitizedData = sanitizeFirestorePayload(rawPostData, false);

        if (db) {
          try {
            await updateDoc(doc(db, 'business_posts', editingPostId), sanitizedData);
          } catch (dbErr) {
            console.warn('Firestore update notice (saving to local persistence):', dbErr);
          }
        }

        const updatedPosts = sortPosts(posts.map(p => {
          if (p.id === editingPostId) {
            return { ...p, ...rawPostData, id: editingPostId };
          }
          return p;
        }));

        setPosts(updatedPosts);
        saveToCache(business.id, updatedPosts);
        setStatusMessage({ type: 'success', text: 'تم حفظ تعديلات الخبر بنجاح! 💾' });
      } else {
        // CREATE NEW POST
        rawPostData.createdAt = now;
        rawPostData.likesCount = 0;
        const sanitizedData = sanitizeFirestorePayload(rawPostData, false);

        let createdId = 'post-' + now;
        if (db) {
          try {
            const docRef = await addDoc(collection(db, 'business_posts'), sanitizedData);
            createdId = docRef.id;
          } catch (dbErr) {
            console.warn('Firestore publish notice (saving to local persistence):', dbErr);
          }
        }

        const fullPost: BusinessPost = { id: createdId, ...rawPostData } as BusinessPost;
        const updatedPosts = sortPosts([fullPost, ...posts.filter(p => p.id !== createdId)]);
        setPosts(updatedPosts);
        saveToCache(business.id, updatedPosts);
        if (onNewsCountChange) onNewsCountChange(updatedPosts.length);
        setStatusMessage({ type: 'success', text: 'تم نشر الخبر بنجاح وظهر في تبويب آخر الأخبار! 🎉' });
      }

      resetForm();
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err) {
      console.error('Error saving business post:', err);
      setStatusMessage({ type: 'error', text: 'حدث خطأ أثناء محاولة الحفظ، يرجى المحاولة ثانية.' });
    } finally {
      setPublishing(false);
    }
  };

  const togglePin = async (postId: string, currentPinnedState: boolean) => {
    const newPinnedState = !currentPinnedState;
    const updated = sortPosts(posts.map(p => p.id === postId ? { ...p, isPinned: newPinnedState } : p));
    setPosts(updated);
    saveToCache(business.id, updated);

    try {
      if (db) {
        await updateDoc(doc(db, 'business_posts', postId), { isPinned: newPinnedState });
      }
      setStatusMessage({ 
        type: 'success', 
        text: newPinnedState ? 'تم تثبيت المنشور في أعلى التغذية! 📌' : 'تم إلغاء تثبيت المنشور.' 
      });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (e) {
      console.warn('Pin toggle error:', e);
    }
  };

  const confirmDelete = async () => {
    if (!postToDelete) return;
    const postId = postToDelete.id;

    try {
      if (db) {
        try {
          await deleteDoc(doc(db, 'business_posts', postId));
        } catch (dbErr) {
          console.warn('Firestore delete notice:', dbErr);
        }
      }
      const updated = posts.filter(p => p.id !== postId);
      setPosts(updated);
      saveToCache(business.id, updated);
      if (onNewsCountChange) onNewsCountChange(updated.length);
      setStatusMessage({ type: 'success', text: 'تم حذف المنشور بنجاح.' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting business post:', err);
    } finally {
      setPostToDelete(null);
    }
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }

    if (likedPosts[postId]) return;

    setLikedPosts(prev => ({ ...prev, [postId]: true }));
    const updated = posts.map(p => p.id === postId ? { ...p, likesCount: (p.likesCount || 0) + 1 } : p);
    setPosts(updated);
    saveToCache(business.id, updated);

    try {
      if (db) {
        await updateDoc(doc(db, 'business_posts', postId), {
          likesCount: increment(1)
        });
      }
    } catch (e) {
      console.warn('Like update notice:', e);
    }
  };

  const handleShare = (post: BusinessPost) => {
    const postUrl = `${window.location.origin}/business/${business.id}?tab=news#post-${post.id}`;
    navigator.clipboard.writeText(postUrl);
    setCopiedPostId(post.id);
    setTimeout(() => setCopiedPostId(null), 2500);
  };

  // English numerals date formatting: e.g. "26 أيلول 2026"
  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'منذ فترة';
    const date = new Date(timestamp);
    return date.toLocaleDateString('ar-JO-u-nu-latn', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Shop avatar matching BusinessDetail exact logic
  const renderBusinessAvatar = (customLogoUrl?: string, sizeClass = "w-10 h-10 rounded-2xl") => {
    const effectiveLogo = customLogoUrl || business.logoUrl;
    const hasRealLogo = effectiveLogo && !effectiveLogo.includes('photo-1594212699903');
    
    return (
      <div className={`${sizeClass} border border-stone-200 overflow-hidden shrink-0 flex items-center justify-center bg-white shadow-2xs`}>
        {hasRealLogo ? (
          <img 
            src={effectiveLogo} 
            alt={business.name} 
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a4d2e] to-emerald-600 flex items-center justify-center text-white font-black text-sm shadow-inner select-none">
            {(business.name || 'م').trim().charAt(0)}
          </div>
        )}
      </div>
    );
  };

  // Reusable Form Content (used in Desktop expanding block & Mobile Bottom Sheet)
  const renderFormContent = (isMobileSheet = false) => (
    <form 
      ref={formRef}
      onSubmit={handlePublishOrSave} 
      className={`bg-white ${isMobileSheet ? 'p-1' : 'p-5 sm:p-7 rounded-3xl border-2 border-amber-400/80 shadow-lg'} space-y-5`}
    >
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <h4 className="text-sm sm:text-base font-black text-stone-900 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-600" />
          <span>{editingPostId ? 'تعديل المنشور / الخبر' : 'إضافة خبر أو منشور جديد للمنشأة'}</span>
        </h4>
        <span className="text-[11px] text-stone-400 font-mono">الظهور فوري للزوار</span>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-stone-700 flex items-center justify-between">
          <span>عنوان الخبر أو البوست *</span>
          <span className="text-[10px] text-stone-400">واضح وجذاب</span>
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="مثال: خصم خاص 20% بمناسبة الافتتاح، أو وصول تشكيلة جديدة..."
          className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-amber-500 font-medium"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-bold text-stone-700 flex items-center justify-between">
          <span>تفاصيل المنشور / المحتوى *</span>
          <span className="text-[10px] text-stone-400">كامل التفاصيل والملاحظات</span>
        </label>
        <textarea
          required
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="اكتب كامل التفاصيل، الشروط، المواعيد، أو العروض التوضيحية..."
          className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-amber-500 font-medium"
        />
      </div>

      {/* IMAGE UPLOAD & URL */}
      <div className="space-y-2 p-4 bg-stone-50 rounded-2xl border border-stone-200/80">
        <label className="text-xs font-bold text-stone-800 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <ImageIcon className="h-4 w-4 text-amber-600" />
            <span>صورة للخبر (اختياري)</span>
          </span>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={compressingImage}
            className="text-[11px] text-emerald-800 hover:text-emerald-900 bg-emerald-100/70 hover:bg-emerald-100 font-black px-3 py-1.5 rounded-xl border border-emerald-300 flex items-center gap-1.5 cursor-pointer transition-all shadow-3xs"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>{compressingImage ? 'جاري ضغط الصورة...' : 'رفع صورة من جهازك 📷'}</span>
          </button>
        </label>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleImageFileChange}
        />

        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="أو ضع رابط مباشر لصورة من الإنترنت: https://..."
          className="w-full bg-white border border-stone-200 rounded-xl p-2.5 text-xs text-stone-900 focus:outline-none focus:border-amber-500 dir-ltr text-left"
        />

        {imageUrl && (
          <div className="relative inline-block mt-2 rounded-2xl border-2 border-amber-300 overflow-hidden bg-white group shadow-xs">
            <img src={imageUrl} alt="معاينة الصورة" className="w-32 h-24 sm:w-40 sm:h-28 object-cover" />
            <button
              type="button"
              onClick={() => setImageUrl('')}
              className="absolute top-1.5 right-1.5 p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-colors cursor-pointer shadow-md"
              title="إزالة الصورة"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ATTACHMENT / MENTION SECTION */}
      <div className="space-y-3 p-4 bg-amber-50/40 rounded-2xl border border-amber-200">
        <div className="flex items-center justify-between">
          <label className="text-xs font-black text-amber-950 flex items-center gap-1.5">
            <Paperclip className="h-4 w-4 text-amber-700" />
            <span>إرفاق / منشن عنصر من المنشأة (اختياري)</span>
          </label>

          {attachedItem ? (
            <button
              type="button"
              onClick={() => setAttachedItem(null)}
              className="text-[11px] text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
              <span>إزالة الإرفاق</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowAttachmentPicker(prev => !prev)}
              className="text-[11px] bg-amber-200/80 hover:bg-amber-300 text-amber-950 font-black px-3 py-1 rounded-xl flex items-center gap-1 cursor-pointer transition-all"
            >
              <span>{showAttachmentPicker ? 'إخفاء الخيارات' : 'اختر عنصراً للإرفاق'}</span>
              {showAttachmentPicker ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {/* Current Attached Preview Chip */}
        {attachedItem && (
          <div className="p-3 bg-white rounded-2xl border border-amber-300 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                {attachedItem.type === 'menu' && <Utensils className="h-4 w-4" />}
                {attachedItem.type === 'offer' && <Tag className="h-4 w-4" />}
                {attachedItem.type === 'job' && <Briefcase className="h-4 w-4" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-stone-900">{attachedItem.title}</span>
                  <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.2 rounded-full font-bold">
                    {attachedItem.type === 'menu' ? 'من المنيو' : attachedItem.type === 'offer' ? 'عرض خاص' : 'وظيفة شاغرة'}
                  </span>
                </div>
                {attachedItem.price && (
                  <span className="text-[11px] font-mono text-emerald-700 font-bold">{attachedItem.price} د.أ</span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setAttachedItem(null)}
              className="p-1 text-stone-400 hover:text-rose-600 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Attachment Picker Window */}
        {!attachedItem && showAttachmentPicker && (
          <div className="space-y-3 pt-2 animate-in fade-in duration-150">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-amber-200">
              <button
                type="button"
                onClick={() => setAttachmentType('menu')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  attachmentType === 'menu' ? 'bg-amber-500 text-stone-950 font-black shadow-xs' : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Utensils className="h-3.5 w-3.5" />
                <span>المنيو ({menuItems.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setAttachmentType('offer')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  attachmentType === 'offer' ? 'bg-amber-500 text-stone-950 font-black shadow-xs' : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Tag className="h-3.5 w-3.5" />
                <span>العروض ({offers.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setAttachmentType('job')}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  attachmentType === 'job' ? 'bg-amber-500 text-stone-950 font-black shadow-xs' : 'text-stone-600 hover:bg-stone-50'
                }`}
              >
                <Briefcase className="h-3.5 w-3.5" />
                <span>الوظائف ({jobs.length})</span>
              </button>
            </div>

            {/* Items List */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 p-1 bg-white rounded-xl border border-stone-200">
              {attachmentType === 'menu' && (
                menuItems.length === 0 ? (
                  <p className="text-center py-4 text-xs text-stone-400">لا توجد عناصر مضافة في المنيو حالياً</p>
                ) : (
                  menuItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setAttachedItem({
                          type: 'menu',
                          id: item.id,
                          title: item.name,
                          subtitle: item.description,
                          price: item.price,
                          originalPrice: item.originalPrice,
                          imageUrl: item.imageUrl,
                          category: item.category,
                          actionText: 'طلب من المنيو'
                        });
                        setShowAttachmentPicker(false);
                      }}
                      className="p-2 rounded-lg hover:bg-amber-50 flex items-center justify-between gap-2 cursor-pointer transition-colors border border-transparent hover:border-amber-200"
                    >
                      <div className="flex items-center gap-2">
                        {item.imageUrl && (
                          <img src={item.imageUrl} alt={item.name} className="w-8 h-8 rounded-lg object-cover" />
                        )}
                        <div>
                          <p className="text-xs font-bold text-stone-800">{item.name}</p>
                          {item.category && <p className="text-[10px] text-stone-400">{item.category}</p>}
                        </div>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-700">{item.price} د.أ</span>
                    </div>
                  ))
                )
              )}

              {attachmentType === 'offer' && (
                offers.length === 0 ? (
                  <p className="text-center py-4 text-xs text-stone-400">لا توجد عروض أو خصومات نشطة حالياً</p>
                ) : (
                  offers.map((offer: any) => (
                    <div
                      key={offer.id}
                      onClick={() => {
                        setAttachedItem({
                          type: 'offer',
                          id: offer.id,
                          title: offer.title || 'عرض خاص',
                          subtitle: offer.description,
                          discountPercent: offer.discountPercent,
                          price: offer.price,
                          imageUrl: offer.imageUrl,
                          actionText: 'مشاهدة تفاصيل العرض'
                        });
                        setShowAttachmentPicker(false);
                      }}
                      className="p-2 rounded-lg hover:bg-amber-50 flex items-center justify-between gap-2 cursor-pointer transition-colors border border-transparent hover:border-amber-200"
                    >
                      <div>
                        <p className="text-xs font-bold text-stone-800">{offer.title || 'عرض حصري'}</p>
                        {offer.discountPercent && (
                          <p className="text-[10px] text-amber-700 font-bold">خصم {offer.discountPercent}%</p>
                        )}
                      </div>
                      <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full">
                        عرض خاص 🔥
                      </span>
                    </div>
                  ))
                )
              )}

              {attachmentType === 'job' && (
                jobs.length === 0 ? (
                  <p className="text-center py-4 text-xs text-stone-400">لا توجد وظائف شاغرة معلنة حالياً</p>
                ) : (
                  jobs.map((job: JobOffer) => (
                    <div
                      key={job.id}
                      onClick={() => {
                        setAttachedItem({
                          type: 'job',
                          id: job.id,
                          title: job.title,
                          subtitle: job.description,
                          category: job.category,
                          actionText: 'تقديم للوظيفة'
                        });
                        setShowAttachmentPicker(false);
                      }}
                      className="p-2 rounded-lg hover:bg-amber-50 flex items-center justify-between gap-2 cursor-pointer transition-colors border border-transparent hover:border-amber-200"
                    >
                      <div>
                        <p className="text-xs font-bold text-stone-800">{job.title}</p>
                        <p className="text-[10px] text-stone-500">{job.jobType || job.location}</p>
                      </div>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                        شاغر متاح 💼
                      </span>
                    </div>
                  ))
                )
              )}
            </div>
          </div>
        )}
      </div>

      {/* PIN TO TOP CHECKBOX */}
      <div className="flex items-center gap-2 pt-1">
        <label className="flex items-center gap-2 text-xs font-bold text-stone-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 border-stone-300 cursor-pointer"
          />
          <span>تثبيت هذا المنشور في أعلى التغذية 📌</span>
        </label>
      </div>

      {/* SUBMIT BUTTONS */}
      <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100">
        <button
          type="button"
          onClick={resetForm}
          className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
        >
          إلغاء
        </button>
        <button
          type="submit"
          disabled={publishing || compressingImage}
          className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
        >
          {publishing && <div className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin"></div>}
          <span>{publishing ? 'جاري الحفظ...' : editingPostId ? 'حفظ التعديلات 💾' : 'نشر الخبر الآن 🎉'}</span>
        </button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6 dir-rtl text-right">
      
      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!postToDelete}
        onClose={() => setPostToDelete(null)}
        onConfirm={confirmDelete}
        title="تأكيد حذف المنشور"
        message={`هل أنت متأكد من رغبتك في حذف المنشور "${postToDelete?.title || 'هذا المنشور'}" نهائياً؟ لن يتمكن الزوار من مشاهدته بعد الآن.`}
        confirmText="نعم، حذف المنشور"
        cancelText="إلغاء"
        variant="danger"
      />

      {/* Status Feedback Banner */}
      {statusMessage && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-200 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setStatusMessage(null)}
            className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* BROAD ACTION BUTTON & EXPANDING FORM (For Owner) */}
      {isOwner && (
        <div className="space-y-4">
          {/* BROAD BUTTON (Shown when form is closed) */}
          {!showForm && (
            <button
              type="button"
              onClick={() => {
                setShowForm(true);
                setEditingPostId(null);
                setStatusMessage(null);
              }}
              className="w-full py-4 px-6 bg-gradient-to-r from-[#1a4d2e] via-emerald-800 to-[#1a4d2e] hover:from-emerald-800 hover:to-emerald-700 text-white font-black text-sm sm:text-base rounded-2xl sm:rounded-3xl shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center cursor-pointer active:scale-[0.99] border border-emerald-700/60"
            >
              <span className="tracking-wide">نشر خبر جديد</span>
            </button>
          )}

          {/* DESKTOP IN-PLACE EXPANDED FORM (md: and up) */}
          {showForm && (
            <div className="hidden md:block transition-all duration-300 ease-out animate-in fade-in zoom-in-98">
              {renderFormContent(false)}
            </div>
          )}

          {/* MOBILE BOTTOM SHEET (< md) */}
          {showForm && (
            <div className="md:hidden fixed inset-0 z-[1000] flex flex-col justify-end animate-in fade-in duration-200">
              {/* Dimmed Backdrop */}
              <div 
                className="fixed inset-0 bg-stone-950/70 backdrop-blur-xs transition-opacity"
                onClick={resetForm}
              />

              {/* Drawer Content */}
              <div className="relative z-10 bg-white rounded-t-[32px] p-5 pb-8 max-h-[88vh] overflow-y-auto shadow-2xl border-t border-amber-300 animate-in slide-in-from-bottom duration-300 space-y-4">
                {/* Drag handle */}
                <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto mb-2" />
                {renderFormContent(true)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* POSTS FEED LIST */}
      {loading && posts.length === 0 ? (
        <div className="p-8 text-center space-y-3 bg-white rounded-3xl border border-stone-100">
          <div className="w-8 h-8 border-3 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-stone-500 font-bold">جاري تحميل أحدث الأخبار...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="p-10 text-center bg-white rounded-3xl border border-stone-200/80 space-y-3 my-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <Newspaper className="h-7 w-7" />
          </div>
          <h4 className="text-sm font-black text-stone-800">لا توجد منشورات حالياً</h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            لم يقم {business.name} بنشر منشورات حديثة بعد. تابع هذه الصفحة للبقاء على اطلاع بآخر التحديثات والعروض.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <article 
              key={post.id} 
              id={`post-${post.id}`}
              className={`bg-white rounded-3xl border shadow-2xs overflow-hidden transition-all hover:border-amber-300 ${
                post.isPinned ? 'border-amber-300/90 ring-2 ring-amber-400/20' : 'border-stone-200/90'
              }`}
            >
              {/* Header */}
              <div className="p-4 sm:p-5 pb-3 flex items-center justify-between border-b border-stone-100 bg-stone-50/40">
                <div className="flex items-center gap-3">
                  {renderBusinessAvatar(post.businessLogoUrl)}
                  <div>
                    <h4 className="text-sm font-black text-stone-900 flex items-center gap-1.5 flex-wrap">
                      <span>{business.name || post.businessName}</span>
                      {post.isPinned && (
                        <span className="bg-amber-100 text-amber-900 text-[10px] px-2.5 py-0.5 rounded-full font-black border border-amber-300 flex items-center gap-1">
                          <Pin className="h-3 w-3 fill-amber-700 text-amber-700" />
                          <span>منشور مثبت</span>
                        </span>
                      )}
                    </h4>
                    <span className="text-[11px] text-stone-400 font-mono flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(post.createdAt)}</span>
                      {post.updatedAt && (
                        <span className="text-[10px] text-stone-400 mr-1">(تم التعديل)</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Owner Actions (Pin, Edit, Delete) */}
                {isOwner && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => togglePin(post.id, !!post.isPinned)}
                      className={`p-2 rounded-xl transition-all cursor-pointer ${
                        post.isPinned 
                          ? 'text-amber-700 bg-amber-100 hover:bg-amber-200' 
                          : 'text-stone-400 hover:text-amber-700 hover:bg-amber-50'
                      }`}
                      title={post.isPinned ? 'إلغاء التثبيت' : 'تثبيت في الأعلى'}
                    >
                      <Pin className={`h-4 w-4 ${post.isPinned ? 'fill-amber-700' : ''}`} />
                    </button>

                    <button
                      type="button"
                      onClick={() => startEdit(post)}
                      className="p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                      title="تعديل المنشور"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPostToDelete(post)}
                      className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="حذف هذا المنشور"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Body Content */}
              <div className="p-4 sm:p-5 space-y-3">
                <h3 className="text-base sm:text-lg font-black text-stone-900 leading-snug">{post.title}</h3>
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line font-medium">
                  {post.content}
                </p>

                {/* Optional Image */}
                {post.imageUrl && (
                  <div className="mt-3 rounded-2xl overflow-hidden border border-stone-200/80 bg-stone-50 max-h-96">
                    <img 
                      src={post.imageUrl} 
                      alt={post.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* ATTACHED ITEM INTERACTIVE CARD */}
                {post.attachedItem && (
                  <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-100/30 to-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      {post.attachedItem.imageUrl ? (
                        <img 
                          src={post.attachedItem.imageUrl} 
                          alt={post.attachedItem.title} 
                          className="w-12 h-12 rounded-xl object-cover border border-stone-200 shrink-0" 
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center shrink-0">
                          {post.attachedItem.type === 'menu' && <Utensils className="h-6 w-6" />}
                          {post.attachedItem.type === 'offer' && <Tag className="h-6 w-6" />}
                          {post.attachedItem.type === 'job' && <Briefcase className="h-6 w-6" />}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-black text-stone-900">{post.attachedItem.title}</span>
                          <span className="text-[10px] bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded-full font-bold">
                            {post.attachedItem.type === 'menu' ? '🍔 من قائمة الطعام' : post.attachedItem.type === 'offer' ? '🏷️ عرض خاص' : '💼 وظيفة شاغرة'}
                          </span>
                        </div>

                        {post.attachedItem.subtitle && (
                          <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">{post.attachedItem.subtitle}</p>
                        )}

                        {post.attachedItem.price && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-mono font-black text-emerald-800">{post.attachedItem.price} د.أ</span>
                            {post.attachedItem.originalPrice && (
                              <span className="text-[11px] font-mono text-stone-400 line-through">{post.attachedItem.originalPrice} د.أ</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {onSelectTab && (
                      <button
                        type="button"
                        onClick={() => {
                          if (post.attachedItem?.type === 'menu') onSelectTab('menu');
                          else if (post.attachedItem?.type === 'offer') onSelectTab('offers');
                          else if (post.attachedItem?.type === 'job') onSelectTab('jobs');
                        }}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
                      >
                        <span>{post.attachedItem.actionText || 'عرض التفاصيل'}</span>
                        <ExternalLink className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="px-4 sm:px-5 py-3 bg-stone-50/80 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-stone-600">
                <button
                  type="button"
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    likedPosts[post.id] 
                      ? 'bg-amber-100 text-amber-900 font-black' 
                      : 'hover:bg-stone-200/70 text-stone-600'
                  }`}
                >
                  <ThumbsUp className={`h-4 w-4 ${likedPosts[post.id] ? 'fill-amber-600 text-amber-600' : ''}`} />
                  <span>{post.likesCount || 0} إعجاب</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleShare(post)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-stone-200/70 transition-colors cursor-pointer text-stone-600"
                >
                  {copiedPostId === post.id ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
                  <span>{copiedPostId === post.id ? 'تم نسخ رابط البوست!' : 'مشاركة البوست'}</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

    </div>
  );
}
