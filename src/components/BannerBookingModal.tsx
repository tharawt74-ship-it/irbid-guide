import React, { useState, useEffect } from 'react';
import { 
  X, Megaphone, Send, Sparkles, CheckCircle2, 
  Calendar, Phone, Building2, Image as ImageIcon,
  Link as LinkIcon, Star, MapPin, Eye, PlayCircle,
  Tag, ArrowLeft, Info
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { isBotSubmission, checkSubmissionRateLimit, recordSubmissionTime, sanitizeInput } from '../lib/security';
import { ImageUploader } from './ui/ImageUploader';
import { Business } from '../types';

interface BannerBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBusiness?: Business | null;
}

type BannerType = 'business' | 'text_and_button' | 'image_only' | 'animated_image';

export function BannerBookingModal({ isOpen, onClose, defaultBusiness }: BannerBookingModalProps) {
  const { currentUser } = useAuth();
  
  const [type, setType] = useState<BannerType>('business');
  const [advertiserName, setAdvertiserName] = useState(currentUser?.displayName || '');
  const [contactPhone, setContactPhone] = useState('');
  const [durationDays, setDurationDays] = useState(7);
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [buttonText, setButtonText] = useState('معاينة المحل');
  const [buttonLink, setButtonLink] = useState('');
  const [badgeText, setBadgeText] = useState('موصى به ⭐');
  const [notes, setNotes] = useState('');
  
  // Business link state
  const [businessId, setBusinessId] = useState(defaultBusiness?.id || '');
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(defaultBusiness || null);
  const [userBusinesses, setUserBusinesses] = useState<Business[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [isLoadingBusinesses, setIsLoadingBusinesses] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hpValue, setHpValue] = useState('');

  // Fetch businesses associated with user or search
  useEffect(() => {
    if (!isOpen) return;

    if (defaultBusiness) {
      setSelectedBusiness(defaultBusiness);
      setBusinessId(defaultBusiness.id);
      if (!title) setTitle(defaultBusiness.name);
      if (!subtitle) setSubtitle(defaultBusiness.description || '');
      if (!imageUrl && defaultBusiness.imageUrl) setImageUrl(defaultBusiness.imageUrl);
      if (!contactPhone && defaultBusiness.phone) setContactPhone(defaultBusiness.phone);
    }

    const fetchBusinesses = async () => {
      if (!db) return;
      setIsLoadingBusinesses(true);
      try {
        if (currentUser?.uid) {
          const userBizQuery = query(collection(db, 'businesses'), where('userId', '==', currentUser.uid));
          const userBizSnap = await getDocs(userBizQuery);
          const userBizList: Business[] = [];
          userBizSnap.forEach(d => userBizList.push({ id: d.id, ...d.data() } as Business));
          setUserBusinesses(userBizList);

          if (!defaultBusiness && userBizList.length > 0) {
            const firstBiz = userBizList[0];
            setSelectedBusiness(firstBiz);
            setBusinessId(firstBiz.id);
            if (!title) setTitle(firstBiz.name);
            if (!subtitle) setSubtitle(firstBiz.description || '');
            if (!imageUrl && firstBiz.imageUrl) setImageUrl(firstBiz.imageUrl);
            if (!contactPhone && firstBiz.phone) setContactPhone(firstBiz.phone);
          }
        }

        // Fetch all businesses for search linking
        const allBizSnap = await getDocs(collection(db, 'businesses'));
        const allBizList: Business[] = [];
        allBizSnap.forEach(d => allBizList.push({ id: d.id, ...d.data() } as Business));
        setAllBusinesses(allBizList);
      } catch (err) {
        console.warn("Could not load businesses:", err);
      } finally {
        setIsLoadingBusinesses(false);
      }
    };

    fetchBusinesses();
  }, [isOpen, currentUser, defaultBusiness]);

  if (!isOpen) return null;

  const handleSelectBusiness = (biz: Business) => {
    setSelectedBusiness(biz);
    setBusinessId(biz.id);
    setSearchQuery(biz.name);
    if (!title || title === 'إعلان مميز') setTitle(biz.name);
    if (!subtitle) setSubtitle(biz.description || '');
    if (!imageUrl && biz.imageUrl) setImageUrl(biz.imageUrl);
    if (!contactPhone && biz.phone) setContactPhone(biz.phone);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (type !== 'image_only' && type !== 'animated_image' && !title.trim()) {
      setErrorMessage('يرجى إدخال عنوان الإعلان الرئيسي');
      return;
    }

    if (!imageUrl.trim()) {
      setErrorMessage('يرجى رفع أو إضافة صورة البانر الإعلاني');
      return;
    }

    if (!contactPhone.trim()) {
      setErrorMessage('يرجى إدخال رقم الهاتف للتواصل وتأكيد النشر');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    // Honeypot check
    if (isBotSubmission(hpValue)) {
      setIsSuccess(true);
      setIsSubmitting(false);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 3000);
      return;
    }

    // Rate limiting
    const rateLimit = checkSubmissionRateLimit('banner_submit', 90);
    if (!rateLimit.allowed) {
      setErrorMessage(`يرجى الانتظار ${rateLimit.timeLeft} ثانية قبل تقديم طلب إعلان آخر.`);
      setIsSubmitting(false);
      return;
    }

    try {
      const bannerTitle = (type === 'image_only' || type === 'animated_image')
        ? (title.trim() || selectedBusiness?.name || 'بانر إعلاني مرئي')
        : title.trim();

      const requestData: Record<string, any> = {
        advertiserName: sanitizeInput(advertiserName || selectedBusiness?.name || 'صاحب محل'),
        businessName: sanitizeInput(selectedBusiness?.name || title || advertiserName),
        contactPhone: sanitizeInput(contactPhone),
        title: sanitizeInput(bannerTitle),
        imageUrl: sanitizeInput(imageUrl),
        durationDays: Number(durationDays) || 7,
        notes: notes ? sanitizeInput(notes) : '',
        bannerType: type,
        status: 'pending',
        createdAt: Date.now(),
        userId: currentUser?.uid || 'guest',
        userEmail: currentUser?.email || '',
        serviceType: 'homepage_banner',
        serviceName: 'طلب حجز بانر إعلاني في الصفحة الرئيسية'
      };

      if (subtitle.trim()) requestData.subtitle = sanitizeInput(subtitle.trim());
      if (buttonText.trim()) requestData.buttonText = sanitizeInput(buttonText.trim());
      if (buttonLink.trim()) requestData.buttonLink = sanitizeInput(buttonLink.trim());
      if (badgeText.trim()) requestData.badgeText = sanitizeInput(badgeText.trim());
      if (businessId) requestData.businessId = businessId;

      if (db) {
        // Save to marketing requests so admin can approve directly into banners collection
        await addDoc(collection(db, 'marketingRequests'), requestData);
        // Also save to bannerBookingRequests for legacy compatibility
        await addDoc(collection(db, 'bannerBookingRequests'), requestData);
      }

      recordSubmissionTime('banner_submit');
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 3000);
    } catch (err) {
      console.error('Error submitting banner request:', err);
      setErrorMessage('حدث خطأ أثناء تقديم الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBusinesses = searchQuery
    ? allBusinesses.filter(b => b.name?.toLowerCase().includes(searchQuery.toLowerCase()) || b.category?.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <div 
      className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200" 
      dir="rtl"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-stone-200 overflow-hidden relative max-h-[92vh] flex flex-col text-right animate-in zoom-in-95 duration-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#1a4d2e] text-white rounded-2xl shadow-xs">
              <Megaphone className="h-6 w-6 text-[#ff9f1c]" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-amber-200 mb-1">
                <Sparkles className="h-3 w-3 text-amber-600" />
                <span>إعلان مميز في أعلى واجهة الموقع</span>
              </div>
              <h3 className="font-black text-stone-900 text-lg sm:text-xl">
                طلب نشر وتصميم بانر إعلاني
              </h3>
              <p className="text-stone-500 text-xs mt-0.5">
                صمم إعلانك واضبط المحتوى مع معاينة فورية ومباشرة للظهور في الصفحة الرئيسية
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200 transition-colors cursor-pointer"
            title="إغلاق النافذة"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-7 space-y-6 overflow-y-auto flex-1">
          {isSuccess ? (
            <div className="py-12 text-center space-y-4 animate-in zoom-in-95">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <div className="space-y-2">
                <h4 className="text-2xl font-black text-stone-900">تم استلام طلب البانر الإعلاني بنجاح!</h4>
                <p className="text-sm text-stone-600 leading-relaxed max-w-md mx-auto">
                  تم إرسال تفاصيل الإعلان إلى إدارة الموقع للمراجعة والاعتماد. سيتم التواصل معكم هاتفياً أو عبر الواتساب فور الموافقة لتفعيل الإعلان.
                </p>
              </div>
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-100 text-stone-700 text-xs font-bold rounded-xl">
                  <span>جاري إغلاق النافذة تلقائياً...</span>
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Honeypot field */}
              <div className="absolute opacity-0 -z-50 pointer-events-none" style={{ width: 0, height: 0, overflow: 'hidden' }}>
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={hpValue}
                  onChange={(e) => setHpValue(e.target.value)}
                />
              </div>

              {errorMessage && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-bold flex items-center gap-2">
                  <Info className="h-4 w-4 shrink-0 text-red-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 1. Banner Type Selector (Exact 4 Cards from Admin Manager) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-stone-800 block">
                    1. نوع وهيكل البانر الإعلاني:
                  </label>
                  <span className="text-[11px] text-stone-500 font-medium">اختر النمط المناسب لحملتك</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'business', label: 'صفحة محل', desc: 'توجيه لصفحة المتجر وعرض التقييم' },
                    { id: 'text_and_button', label: 'نصوص وأزرار', desc: 'نص مخصص مع زر تفاعلي وشارة' },
                    { id: 'image_only', label: 'صورة فقط', desc: 'تصميم إعلاني كامل وثابت' },
                    { id: 'animated_image', label: 'صورة متحركة GIF', desc: 'تصميم ديناميكي عالي الجاذبية' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setType(opt.id as BannerType)}
                      className={`p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between h-full ${
                        type === opt.id 
                          ? 'border-[#1a4d2e] bg-[#1a4d2e]/5 text-[#1a4d2e] ring-2 ring-[#1a4d2e]/10 font-black shadow-xs' 
                          : 'border-stone-200 hover:border-stone-300 text-stone-700 bg-white'
                      }`}
                    >
                      <div>
                        <span className="text-xs block font-black">{opt.label}</span>
                        <span className="text-[10px] block text-stone-500 font-medium leading-relaxed mt-1">{opt.desc}</span>
                      </div>
                      <div className="mt-2 text-left">
                        {type === opt.id ? (
                          <span className="text-[10px] font-black bg-[#1a4d2e] text-white px-2 py-0.5 rounded-full">محدد ✓</span>
                        ) : (
                          <span className="text-[10px] text-stone-400">تحديد</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Contact & Advertiser Details */}
              <div className="p-4.5 rounded-2xl border border-stone-200 bg-stone-50/60 space-y-3.5">
                <div className="flex items-center gap-2 text-stone-800">
                  <Phone className="h-4 w-4 text-[#1a4d2e]" />
                  <span className="text-xs font-black">2. بيانات المعلن والتواصل لتأكيد النشر:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">اسم المعلن / المسؤول *</label>
                    <input
                      type="text"
                      required
                      value={advertiserName}
                      onChange={(e) => setAdvertiserName(e.target.value)}
                      placeholder="مثال: أحمد العلي"
                      className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">رقم الهاتف / الواتساب للتأكيد *</label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        dir="ltr"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="0790000000"
                        className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] pl-9 text-right"
                      />
                      <Phone className="h-3.5 w-3.5 text-stone-400 absolute left-3 top-3.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-1">المدة المطلوبة لعرض البانر</label>
                    <div className="relative">
                      <select
                        value={durationDays}
                        onChange={(e) => setDurationDays(Number(e.target.value))}
                        className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] pr-8 cursor-pointer"
                      >
                        <option value={3}>3 أيام (سريع - 15 د.أ)</option>
                        <option value={7}>أسبوع كامل (7 أيام - 25 د.أ)</option>
                        <option value={14}>أسبوعين (14 يوم - 45 د.أ)</option>
                        <option value={30}>شهر كامل (30 يوم - 80 د.أ)</option>
                        <option value={90}>3 أشهر (90 يوم - 200 د.أ)</option>
                      </select>
                      <Calendar className="h-3.5 w-3.5 text-stone-400 absolute right-3 top-3.5 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Conditional Business Store Link */}
              {type === 'business' && (
                <div className="p-4.5 rounded-2xl border border-emerald-200 bg-emerald-50/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[#1a4d2e]" />
                      <span className="text-xs font-black text-[#1a4d2e]">ربط الإعلان بصفحة محلك التجاري:</span>
                    </div>
                    {selectedBusiness && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
                        متصل: {selectedBusiness.name}
                      </span>
                    )}
                  </div>

                  {userBusinesses.length > 0 && (
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-stone-700">اختر من محلاتك المسجلة:</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {userBusinesses.map(b => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => handleSelectBusiness(b)}
                            className={`p-3 rounded-xl border text-right font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                              businessId === b.id 
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                                : 'bg-white text-stone-800 border-stone-200 hover:border-emerald-300'
                            }`}
                          >
                            <span className="truncate">{b.name}</span>
                            <span className="text-[10px] opacity-80 shrink-0">{b.category}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-stone-700">أو ابحث عن المحل بالاسم لربطه:</label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="اكتب اسم المحل للبحث..."
                      className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                    />

                    {filteredBusinesses.length > 0 && (
                      <div className="bg-white border border-stone-200 rounded-xl max-h-36 overflow-y-auto divide-y divide-stone-100 text-xs mt-1 shadow-md">
                        {filteredBusinesses.slice(0, 5).map(biz => (
                          <button
                            key={biz.id}
                            type="button"
                            onClick={() => {
                              handleSelectBusiness(biz);
                              setSearchQuery('');
                            }}
                            className="w-full text-right px-3.5 py-2.5 hover:bg-stone-50 font-bold transition-all flex items-center justify-between cursor-pointer"
                          >
                            <span className="font-black text-stone-900">{biz.name}</span>
                            <span className="text-[10px] text-stone-500">{biz.category} • {biz.address}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 4. Title & Subtitle (Shown if not image-only / animated) */}
              {type !== 'image_only' && type !== 'animated_image' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5 font-black">
                      العنوان الرئيسي للإعلان: <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="مثال: مطعم البركة - عروض خاصة"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5 font-black">
                      العنوان الفرعي / الوصف الموجز:
                    </label>
                    <input
                      type="text"
                      value={subtitle}
                      onChange={e => setSubtitle(e.target.value)}
                      placeholder="مثال: خصم 20% على كافة الوجبات لطلاب جامعة اليرموك"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                    />
                  </div>
                </div>
              )}

              {/* 5. Custom Button & Badge Options (for text_and_button or business) */}
              {type === 'text_and_button' && (
                <div className="p-4.5 rounded-2xl border border-amber-200 bg-amber-50/30 space-y-3.5">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <Sparkles className="h-4 w-4 text-amber-600 animate-pulse" />
                    <span>خيارات الأزرار والشارات الترويجية المخصصة:</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">نص الزر التفاعلي</label>
                      <input
                        type="text"
                        value={buttonText}
                        onChange={e => setButtonText(e.target.value)}
                        placeholder="مثال: اطلب الآن / احجز طاولتك"
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">رابط توجيه الزر</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={buttonLink}
                        onChange={e => setButtonLink(e.target.value)}
                        placeholder="مثال: https://wa.me/9627900000"
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] text-left"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">الشارة الترويجية (Badge)</label>
                      <input
                        type="text"
                        value={badgeText}
                        onChange={e => setBadgeText(e.target.value)}
                        placeholder="مثال: عرض محدود 🔥 / جديد"
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 6. Image Uploader */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-stone-800">
                  3. صورة وتصميم البانر الإعلاني: <span className="text-red-500">*</span>
                </label>
                <ImageUploader
                  label="اختر صورة البانر من جهازك أو ضع رابط الصورة مباشرة:"
                  folder="banners"
                  value={imageUrl}
                  onChange={(url) => setImageUrl(url)}
                  aspectRatio="banner"
                  placeholder="اختر ملف صورة البانر من جهازك أو اسحب التصميم هنا"
                />
                
                {type === 'animated_image' ? (
                  <p className="text-[11px] text-purple-700 font-bold mt-1.5 flex items-center gap-1.5 bg-purple-50 p-2.5 rounded-xl border border-purple-200">
                    <PlayCircle className="h-4 w-4 shrink-0 text-purple-600" />
                    <span>ملاحظة: يمكنك رفع ملف بصيغة GIF أو APNG متحركة للحصول على حركة وتفاعل رائع في أعلى الصفحة.</span>
                  </p>
                ) : (
                  <p className="text-[10px] text-stone-500 mt-1">
                    المقاس الموصى به: 1200 × 450 بكسل (أفقي واضح) للحصول على أفضل دقة على الهواتف وأجهزة الكمبيوتر.
                  </p>
                )}
              </div>

              {/* 7. LIVE INTERACTIVE BANNER PREVIEW (Exact Admin layout) */}
              <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 text-right">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                    <Eye className="h-4 w-4 text-[#1a4d2e]" />
                    معاينة حية وتفاعلية للإعلان كما سيظهر للزوار:
                  </span>
                  <span className="text-[10px] bg-stone-200 text-stone-700 font-bold px-2 py-0.5 rounded-md">
                    مباشر (Live Preview)
                  </span>
                </div>

                <div className="relative w-full aspect-[21/9] sm:aspect-[2.39/1] min-h-[170px] max-h-[380px] rounded-2xl overflow-hidden border border-stone-200 shadow-md bg-stone-950 select-none">
                  {/* Background Image */}
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Banner Preview"
                      className="absolute inset-0 w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-stone-800 to-stone-900 flex flex-col items-center justify-center text-stone-400 gap-2 p-4 text-center">
                      <ImageIcon className="h-8 w-8 text-stone-500" />
                      <span className="text-xs font-bold">[ بانتظار رفع أو إدخال صورة البانر الإعلاني ]</span>
                    </div>
                  )}

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black text-white ${
                      type === 'business' ? 'bg-emerald-600' :
                      type === 'image_only' ? 'bg-blue-600' :
                      type === 'animated_image' ? 'bg-purple-600 animate-pulse' :
                      'bg-[#ff9f1c]'
                    }`}>
                      {type === 'business' ? '🔗 صفحة متجر' :
                       type === 'image_only' ? '🖼️ صورة ثابتة' :
                       type === 'animated_image' ? '🎞️ صورة متحركة' :
                       '🔘 نصوص وأزرار'}
                    </span>
                  </div>

                  {/* Banner Content Elements */}
                  {(type === 'business' || type === 'text_and_button') && (
                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 z-20 text-white text-right space-y-1.5 max-w-xl">
                      <div className="flex flex-wrap items-center gap-1.5 justify-start">
                        {badgeText && (
                          <span className="bg-[#ff9f1c] text-stone-950 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                            {badgeText}
                          </span>
                        )}

                        {type === 'business' && selectedBusiness?.category && (
                          <span className="bg-white/20 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            {selectedBusiness.category}
                          </span>
                        )}

                        {type === 'business' && (
                          <span className="bg-stone-900/70 backdrop-blur-xs text-[10px] font-bold px-2 py-0.5 rounded-full border border-white/10 inline-flex items-center gap-1">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {(selectedBusiness?.rating && selectedBusiness.rating > 0) ? selectedBusiness.rating.toFixed(1) : 'جديد'}
                          </span>
                        )}
                      </div>

                      <h3 className="text-base sm:text-2xl font-black text-white drop-shadow-md line-clamp-1">
                        {title || selectedBusiness?.name || 'العنوان الرئيسي للإعلان'}
                      </h3>

                      {subtitle && (
                        <p className="text-xs sm:text-sm text-stone-200 drop-shadow-sm line-clamp-2 font-medium leading-relaxed">
                          {subtitle}
                        </p>
                      )}

                      {buttonText && (
                        <div className="pt-1">
                          <span className="inline-flex items-center gap-1.5 bg-[#ff9f1c] text-stone-950 text-xs font-black px-4 py-1.5 rounded-xl shadow-xs">
                            <span>{buttonText}</span>
                            <ArrowLeft className="h-3.5 w-3.5" />
                          </span>
                        </div>
                      )}

                      {type === 'business' && selectedBusiness?.address && (
                        <div className="flex items-center gap-1 text-[10px] text-white/80 pt-0.5">
                          <MapPin className="h-3 w-3 text-amber-400" />
                          <span>{selectedBusiness.address}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* 8. Additional Notes */}
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">
                  ملاحظات أو تعليمات خاصة لإدارة الموقع (اختياري):
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="أي تفاصيل ترغب بإضافتها لتنسيق الإعلان أو توقيت النشر..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                />
              </div>

              {/* 9. Submit / Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-7 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
                      <span>جاري إرسال طلب البانر...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 text-[#ff9f1c]" />
                      <span>تقديم طلب حجز البانر للإدارة 🚀</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
