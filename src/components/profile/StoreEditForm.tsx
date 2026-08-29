import React, { useState, useEffect } from 'react';
import { 
  Store, User, MapPin, Phone, Globe, Image as ImageIcon,
  MessageSquare, EyeOff, Sparkles, Check, Clock, ShieldCheck, 
  ExternalLink, Info, AtSign, Copy, Trash2, AlertTriangle, Eye
} from 'lucide-react';
import { Business, WorkingHours, SocialLinks } from '../../types';
import { BUSINESS_CATEGORIES, IRBID_REGIONS_CATEGORIZED, MainCategory } from '../../lib/categories';
import { SearchableSelect } from '../ui/SearchableSelect';
import { WorkingHoursEditor } from '../ui/WorkingHoursEditor';
import { SocialLinksEditor } from '../ui/SocialLinksEditor';
import { cn } from '../../lib/utils';

interface StoreEditFormProps {
  business: Business;
  onSave: (updatedData: {
    name: string;
    ownerName?: string;
    username?: string;
    isHidden?: boolean;
    category: string;
    description: string;
    district: string;
    address: string;
    phone?: string;
    imageUrl?: string;
    googlePlaceUrl?: string;
    workingHours?: WorkingHours;
    socialLinks?: SocialLinks;
    hideSiteReviews?: boolean;
    hideGoogleReviews?: boolean;
  }) => Promise<void>;
  onDelete?: (businessId: string) => Promise<void>;
  isSaving?: boolean;
  onCancel?: () => void;
  inModal?: boolean;
}

export function StoreEditForm({
  business,
  onSave,
  onDelete,
  isSaving = false,
  onCancel,
  inModal = false
}: StoreEditFormProps) {
  const [name, setName] = useState(business.name || '');
  const [ownerName, setOwnerName] = useState(business.ownerName || '');
  const [username, setUsername] = useState(business.username || '');
  const [isHidden, setIsHidden] = useState(!!business.isHidden);
  const [description, setDescription] = useState(business.description || '');
  const [address, setAddress] = useState(business.address || '');
  const [district, setDistrict] = useState(business.district || 'شارع الجامعة');
  const [phone, setPhone] = useState(business.phone || '');
  const [imageUrl, setImageUrl] = useState(business.imageUrl || '');
  const [googlePlaceUrl, setGooglePlaceUrl] = useState(business.googlePlaceUrl || '');
  const [hideSiteReviews, setHideSiteReviews] = useState(!!business.hideSiteReviews);
  const [hideGoogleReviews, setHideGoogleReviews] = useState(!!business.hideGoogleReviews);
  
  // UI interaction states
  const [copiedLink, setCopiedLink] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Category state
  const [mainCategory, setMainCategory] = useState<MainCategory>('🍔 مأكولات ومشروبات');
  const [subCategory, setSubCategory] = useState<string>(business.category || 'مطاعم وجبات سريعة (شاورما، برجر، سناكات)');

  // Working hours
  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    isOpen24Hours: business.workingHours?.isOpen24Hours || false,
    openTime: business.workingHours?.openTime || '09:00',
    closeTime: business.workingHours?.closeTime || '23:00',
    days: business.workingHours?.days || 'طوال أيام الأسبوع',
    isCustomClosed: business.workingHours?.isCustomClosed || false,
  });

  // Social links
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(business.socialLinks || {});

  // Image load test for preview
  const [imageError, setImageError] = useState(false);

  // Sync state when business prop changes
  useEffect(() => {
    setName(business.name || '');
    setOwnerName(business.ownerName || '');
    setUsername(business.username || '');
    setIsHidden(!!business.isHidden);
    setDescription(business.description || '');
    setAddress(business.address || '');
    setDistrict(business.district || 'شارع الجامعة');
    setPhone(business.phone || '');
    setImageUrl(business.imageUrl || '');
    setGooglePlaceUrl(business.googlePlaceUrl || '');
    setHideSiteReviews(!!business.hideSiteReviews);
    setHideGoogleReviews(!!business.hideGoogleReviews);

    // Find main category
    let foundMain: MainCategory | null = null;
    if (business.category) {
      for (const [main, subs] of Object.entries(BUSINESS_CATEGORIES)) {
        if ((subs as string[]).includes(business.category)) {
          foundMain = main as MainCategory;
          break;
        }
      }
    }

    if (foundMain) {
      setMainCategory(foundMain);
      setSubCategory(business.category);
    } else {
      setMainCategory('🍔 مأكولات ومشروبات');
      setSubCategory(business.category || 'مطاعم وجبات سريعة (شاورما، برجر، سناكات)');
    }

    setWorkingHours({
      isOpen24Hours: business.workingHours?.isOpen24Hours || false,
      openTime: business.workingHours?.openTime || '09:00',
      closeTime: business.workingHours?.closeTime || '23:00',
      days: business.workingHours?.days || 'طوال أيام الأسبوع',
      isCustomClosed: business.workingHours?.isCustomClosed || false,
    });

    setSocialLinks(business.socialLinks || {});
  }, [business]);

  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  const cleanUsername = (val: string) => {
    return val
      .toLowerCase()
      .replace(/[\s]+/g, '_')
      .replace(/[^a-z0-9_.-]/g, '');
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/^@/, '');
    setUsername(cleanUsername(rawVal));
  };

  const handleCopyLink = () => {
    const host = window.location.origin;
    const linkSlug = username.trim() ? `@${username.trim()}` : `business/${business.id}`;
    const fullUrl = `${host}/${linkSlug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      name: name.trim(),
      ownerName: ownerName.trim(),
      username: username.trim() ? cleanUsername(username.trim()) : undefined,
      isHidden,
      category: subCategory,
      description: description.trim(),
      district,
      address: address.trim(),
      phone: phone.trim(),
      imageUrl: imageUrl.trim(),
      googlePlaceUrl: googlePlaceUrl.trim(),
      workingHours,
      socialLinks,
      hideSiteReviews,
      hideGoogleReviews,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete(business.id);
      setShowDeleteModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const displayHandle = username.trim() ? `@${username.trim()}` : `@${cleanUsername(business.name) || 'store'}`;
  const displayUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://shofi-irbid.com'}/${username.trim() ? `@${username.trim()}` : `business/${business.id}`}`;

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
        {/* 1. Basic Info & Category */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
            <Store className="h-5 w-5 text-[#1a4d2e]" />
            <h4 className="text-sm font-black text-stone-800">المعلومات الأساسية والتصنيف</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-stone-700 mb-1.5">
                اسم المحل التجاري <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="مثال: مطعم شاورما الريف"
                className="w-full bg-[#fdfcfb] border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-stone-700 mb-1.5">
                اسم المالك أو المسؤول <span className="text-stone-400 font-normal">(اختياري)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={ownerName}
                  onChange={e => setOwnerName(e.target.value)}
                  placeholder="مثال: محمد العمري"
                  className="w-full bg-[#fdfcfb] border border-stone-200 rounded-xl px-3.5 py-2.5 pr-9 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-colors"
                />
                <User className="h-4 w-4 text-stone-400 absolute top-3 right-3" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-black text-stone-700 mb-1.5">
                التصنيف الرئيسي <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                options={Object.keys(BUSINESS_CATEGORIES)}
                value={mainCategory}
                onChange={(val) => {
                  const mainCat = val as MainCategory;
                  setMainCategory(mainCat);
                  setSubCategory(BUSINESS_CATEGORIES[mainCat]?.[0] || '');
                }}
                className="bg-[#fdfcfb] border-stone-200"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-stone-700 mb-1.5">
                التصنيف الفرعي التخصصي <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                options={BUSINESS_CATEGORIES[mainCategory] || []}
                value={subCategory}
                onChange={(val) => setSubCategory(val)}
                className="bg-[#fdfcfb] border-stone-200"
              />
            </div>
          </div>
        </div>

        {/* 🌟 2. Social Media Username & Custom Page URL */}
        <div className="bg-gradient-to-br from-emerald-50/70 via-white to-stone-50 p-5 sm:p-6 rounded-2xl border border-emerald-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#1a4d2e] flex items-center justify-center text-white shadow-2xs">
                <AtSign className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-black text-stone-900">معرّف الرابط واسم المستخدم (Username)</h4>
                <p className="text-[11px] text-stone-500">اجعل رابط صفحتك يظهر كأي صفحة سوشيال ميديا مميزة (مثل إنستغرام)</p>
              </div>
            </div>
            {username && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-black text-[#1a4d2e] bg-emerald-100/80 px-2.5 py-1 rounded-lg">
                <Sparkles className="h-3 w-3" />
                رابط مخصص
              </span>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-black text-stone-700 mb-1.5">
                اسم المستخدم للمحل (Username Handle)
              </label>
              <div className="relative">
                <input
                  type="text"
                  dir="ltr"
                  value={username}
                  onChange={handleUsernameChange}
                  placeholder="alkhiyam_cafe"
                  className="w-full bg-white border border-stone-300 rounded-xl px-3.5 py-2.5 pl-8 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-colors"
                />
                <span className="absolute top-2.5 left-3 text-sm font-black text-[#1a4d2e] pointer-events-none">@</span>
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                استخدم أحرف إنجليزية وأرقام وشرطة سفلية (_) فقط بدون مسافات.
              </p>
            </div>

            {/* Live Social Link Preview Box */}
            <div className="bg-white p-3.5 rounded-xl border border-stone-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600 shrink-0">
                  <Globe className="h-3.5 w-3.5 text-[#1a4d2e]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-stone-400 font-medium">رابط صفحتك المباشر للزبائن والسوشيال ميديا:</div>
                  <div className="text-xs font-bold text-stone-900 font-mono truncate" dir="ltr">
                    {displayUrl}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center justify-center gap-1.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-300" />
                    <span>تم النسخ!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>نسخ الرابط</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 3. Location & Address */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
            <MapPin className="h-5 w-5 text-[#1a4d2e]" />
            <h4 className="text-sm font-black text-stone-800">الموقع والعنوان في محافظة إربد</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-stone-700 mb-1.5">
                المنطقة / الحي / القرية <span className="text-rose-500">*</span>
              </label>
              <SearchableSelect
                options={IRBID_REGIONS_CATEGORIZED.flatMap(g => g.areas)}
                value={district}
                onChange={val => setDistrict(val)}
                className="bg-[#fdfcfb] border-stone-200"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-stone-700 mb-1.5">
                العنوان بالتفصيل في إربد <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="مثال: شارع الجامعة، مقابل مجمع الأندلس، بجانب صيدلية..."
                className="w-full bg-[#fdfcfb] border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-stone-700 mb-1.5">
              رابط موقع المحل على خرائط Google Maps <span className="text-stone-400 font-normal">(اختياري ومفيد للاتجاهات)</span>
            </label>
            <div className="relative">
              <input
                type="url"
                dir="ltr"
                value={googlePlaceUrl}
                onChange={e => setGooglePlaceUrl(e.target.value)}
                placeholder="https://maps.app.goo.gl/... أو https://goo.gl/maps/..."
                className="w-full bg-[#fdfcfb] border border-stone-200 rounded-xl px-3.5 py-2.5 pl-9 text-xs text-left text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-colors"
              />
              <Globe className="h-4 w-4 text-stone-400 absolute top-3 left-3 pointer-events-none" />
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              يساعد وضع رابط قوقل مابس زوار المنصة في الوصول إلى محلك بنقرة واحدة وتفعيل زر الاتجاهات.
            </p>
          </div>
        </div>

        {/* 4. Contact Phone & Details */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
            <Phone className="h-5 w-5 text-[#1a4d2e]" />
            <h4 className="text-sm font-black text-stone-800">أرقام التواصل والطلبات</h4>
          </div>

          <div>
            <label className="block text-xs font-black text-stone-700 mb-1.5">
              رقم هاتف التواصل والاتصال المباشر <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="tel"
                dir="ltr"
                required
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="مثال: 0791234567"
                className="w-full bg-[#fdfcfb] border border-stone-200 rounded-xl px-3.5 py-2.5 pl-9 text-xs text-left font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-colors"
              />
              <Phone className="h-4 w-4 text-stone-400 absolute top-3 left-3 pointer-events-none" />
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              يتم استخدامه في زر "اتصل الآن" وزر "واتساب" المباشر في صفحة محلك وبطاقات العرض.
            </p>
          </div>
        </div>

        {/* 5. Visuals & Bio Description */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
            <ImageIcon className="h-5 w-5 text-[#1a4d2e]" />
            <h4 className="text-sm font-black text-stone-800">هوية المحل، الصورة والوصف</h4>
          </div>

          <div>
            <label className="block text-xs font-black text-stone-700 mb-1.5">
              رابط صورة الغلاف أو الشعار <span className="text-stone-400 font-normal">(اختياري)</span>
            </label>
            <div className="relative">
              <input
                type="url"
                dir="ltr"
                value={imageUrl}
                onChange={e => setImageUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full bg-[#fdfcfb] border border-stone-200 rounded-xl px-3.5 py-2.5 pl-9 text-xs text-left text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-colors"
              />
              <ImageIcon className="h-4 w-4 text-stone-400 absolute top-3 left-3 pointer-events-none" />
            </div>

            {/* Live Preview If image exists */}
            {imageUrl && !imageError && (
              <div className="mt-3 p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex items-center gap-3">
                <img
                  src={imageUrl}
                  alt="معاينة الشعار"
                  onError={() => setImageError(true)}
                  className="w-16 h-16 rounded-lg object-cover border border-stone-200 shadow-2xs"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <p className="text-xs font-bold text-stone-700">معاينة الصورة الحالية</p>
                  <p className="text-[11px] text-stone-500">ستظهر هذه الصورة كغلاف أساسي لمحلك في نتائج البحث وصفحة التفاصيل.</p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-black text-stone-700 mb-1.5">
              نبذة تعريفية ووصف المحل التجاري <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="اكتب وصفاً جذاباً يوضح ما يقدمه محلك، أهم الوجبات أو المنتجات، المزايا التنافسية، وما يجعلك مميزاً في إربد..."
              className="w-full bg-[#fdfcfb] border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-normal text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] transition-colors resize-none leading-relaxed"
            ></textarea>
          </div>
        </div>

        {/* 6. Live Working Hours Editor */}
        <WorkingHoursEditor
          workingHours={workingHours}
          onChange={setWorkingHours}
        />

        {/* 7. Official Social Links Editor */}
        <SocialLinksEditor
          socialLinks={socialLinks}
          onChange={setSocialLinks}
        />

        {/* 8. Visibility & Privacy Controls (إخفاء المحل والتقييمات) */}
        <div className="bg-stone-50/80 border border-stone-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <EyeOff className="h-5 w-5 text-amber-600" />
            <div>
              <h4 className="text-sm font-black text-stone-900">إعدادات الظهور والخصوصية للمحل</h4>
              <p className="text-xs text-stone-500 mt-0.5">تحكم في حالة ظهور صفحة المحل وتقييمات العملاء في الموقع</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-stone-200/70">
            {/* Toggle Hide Store Page */}
            <label className={cn(
              "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all",
              isHidden 
                ? "bg-amber-50/80 border-amber-300 shadow-2xs" 
                : "bg-white border-stone-200 hover:bg-stone-50"
            )}>
              <input
                type="checkbox"
                checked={isHidden}
                onChange={e => setIsHidden(e.target.checked)}
                className="mt-0.5 h-4.5 w-4.5 rounded text-amber-600 focus:ring-amber-500 border-stone-300"
              />
              <div className="text-xs space-y-1">
                <span className="font-black text-stone-900 flex items-center gap-1.5">
                  <EyeOff className="h-4 w-4 text-amber-600" />
                  إخفاء صفحة المحل من دليل الموقع والبحث
                </span>
                <p className="text-stone-600 text-[11px] leading-relaxed">
                  عند تفعيل هذا الخيار، يتم إخفاء المحل مؤقتاً عن زوار الموقع ولن يظهر في نتائج البحث أو القوائم العامة، بينما تظل بياناتك محفوظة بحسابك لإعادة تفعيلها متى تشاء.
                </p>
                {isHidden && (
                  <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-md mt-1">
                    ⚠️ المحل بحالة الإخفاء حالياً
                  </div>
                )}
              </div>
            </label>

            {/* Reviews Privacy Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-50 transition-colors">
                <input
                  type="checkbox"
                  checked={hideSiteReviews}
                  onChange={e => setHideSiteReviews(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-[#1a4d2e] focus:ring-[#1a4d2e] border-stone-300"
                />
                <div className="text-xs">
                  <span className="font-bold text-stone-800 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-[#1a4d2e]" />
                    إخفاء تقييمات المنصة
                  </span>
                  <p className="text-stone-500 mt-0.5 text-[11px] leading-normal">
                    تعطيل إمكانية كتابة وعرض التقييمات من زوار الموقع المباشرين
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-50 transition-colors">
                <input
                  type="checkbox"
                  checked={hideGoogleReviews}
                  onChange={e => setHideGoogleReviews(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-stone-300"
                />
                <div className="text-xs">
                  <span className="font-bold text-stone-800 flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-blue-600" />
                    إخفاء تقييمات خرائط Google
                  </span>
                  <p className="text-stone-500 mt-0.5 text-[11px] leading-normal">
                    عدم جلب أو عرض تقييمات ونجوم Google Maps على صفحتك
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* 🚨 9. Danger Zone: Delete Store Page (منطقة حذف المحل نهائياً) */}
        {onDelete && (
          <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-rose-800">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              <div>
                <h4 className="text-sm font-black text-rose-900">منطقة الحذف وإلغاء المحل</h4>
                <p className="text-xs text-rose-700/80 mt-0.5">إجراءات حساسة لا يمكن التراجع عنها</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-rose-200/70">
              <p className="text-xs text-rose-700 leading-relaxed">
                سيؤدي حذف المحل إلى إزالة كامل بياناته، تقييماته، وعروضه من منصة شو في بإربد نهائياً.
              </p>
              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>حذف صفحة المحل نهائياً</span>
              </button>
            </div>
          </div>
        )}

        {/* Action Submit Buttons */}
        <div className={`flex flex-col-reverse sm:flex-row gap-3 pt-2 ${inModal ? 'sticky bottom-0 bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-stone-200/80 shadow-lg' : ''}`}>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-6 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              إلغاء وتراجع
            </button>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-8 py-3.5 rounded-xl text-sm font-black transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>جارٍ حفظ التحديثات...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>حفظ وتحديث معلومات المحل الرسمية</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" dir="rtl">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-stone-900">تأكيد حذف صفحة المحل</h3>
              <p className="text-xs text-stone-600 leading-relaxed">
                هل أنت متأكد تماماً من حذف صفحة المحل <span className="font-bold text-stone-900">"{business.name}"</span>؟
                <br />
                <span className="text-rose-600 font-bold">هذا الإجراء نهائي ولا يمكن التراجع عنه!</span>
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-50 cursor-pointer disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>جارٍ الحذف...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>نعم، حذف المحل</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

