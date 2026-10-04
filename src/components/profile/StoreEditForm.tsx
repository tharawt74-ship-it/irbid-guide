import React, { useState, useEffect } from 'react';
import { 
  Store, User, MapPin, Phone, Globe, Image as ImageIcon,
  MessageSquare, EyeOff, Sparkles, Check, Clock, ShieldCheck, 
  ExternalLink, AtSign, Copy, Trash2, AlertTriangle, Eye,
  Video, Play, Crown, Truck, Search, X, LayoutGrid
} from 'lucide-react';
import { Business, WorkingHours, SocialLinks, AboutMediaConfig, VipPopupConfig } from '../../types';
import { BUSINESS_CATEGORIES, IRBID_REGIONS_CATEGORIZED, MainCategory } from '../../lib/categories';
import { SearchableSelect } from '../ui/SearchableSelect';
import { WorkingHoursEditor } from '../ui/WorkingHoursEditor';
import { SocialLinksEditor } from '../ui/SocialLinksEditor';
import { ImageUploader } from '../ui/ImageUploader';
import { VideoUploader } from '../common/VideoUploader';
import { MediaRenderer } from '../common/MediaRenderer';
import { RichTextEditor } from '../common/RichTextEditor';
import { PaymentMethodsSelector } from '../ui/PaymentMethodsSelector';
import { VipPopupManagerModal } from '../vip/VipPopupManagerModal';
import { getBusinessVipStatus } from '../../lib/vipHelper';
import { cn } from '../../lib/utils';
import { isMedicalBusiness } from '../../lib/medicalHelper';

interface StoreEditFormProps {
  business: Business;
  onSave: (updatedData: {
    name: string;
    ownerName?: string;
    username?: string;
    isHidden?: boolean;
    category: string;
    subCategory?: string;
    description: string;
    district: string;
    address: string;
    phone?: string;
    imageUrl?: string;
    coverVideoUrl?: string;
    logoUrl?: string;
    googlePlaceUrl?: string;
    workingHours?: WorkingHours;
    socialLinks?: SocialLinks;
    hideSiteReviews?: boolean;
    aboutMedia?: AboutMediaConfig | null;
    aboutVideoUrl?: string | null;
    aboutImageUrl?: string | null;
    deliveryAvailable?: boolean;
    deliveryRegions?: string;
    paymentMethods?: string[];
  }) => Promise<void>;
  onDelete?: (businessId: string) => Promise<void>;
  isSaving?: boolean;
  onCancel?: () => void;
  inModal?: boolean;
  onlySettings?: boolean;
  hideSettings?: boolean;
}

export function StoreEditForm({
  business,
  onSave,
  onDelete,
  isSaving = false,
  onCancel,
  inModal = false,
  onlySettings = false,
  hideSettings = false
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
  const [coverVideoUrl, setCoverVideoUrl] = useState(business.coverVideoUrl || '');
  const [logoUrl, setLogoUrl] = useState(business.logoUrl || '');
  const [googlePlaceUrl, setGooglePlaceUrl] = useState(business.googlePlaceUrl || '');
  const [hideSiteReviews, setHideSiteReviews] = useState(!!business.hideSiteReviews);
  const [deliveryAvailable, setDeliveryAvailable] = useState(!!business.deliveryAvailable);
  const [deliveryRegions, setDeliveryRegions] = useState(business.deliveryRegions || '');
  const [regionsSearch, setRegionsSearch] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<string[]>(
    business.paymentMethods || business.medicalProfile?.paymentMethods || ['كاش', 'فيزا', 'كليك']
  );

  // About Media state
  const initialAboutType: 'video' | 'image' = 
    business.aboutMedia?.type || 
    (business.aboutVideoUrl ? 'video' : business.aboutImageUrl ? 'image' : 'video');
  const initialAboutUrl: string = 
    business.aboutMedia?.url || business.aboutVideoUrl || business.aboutImageUrl || '';
  const initialAboutCaption: string = business.aboutMedia?.caption || '';

  const [aboutMediaType, setAboutMediaType] = useState<'video' | 'image'>(initialAboutType);
  const [aboutMediaUrl, setAboutMediaUrl] = useState<string>(initialAboutUrl);
  const [aboutMediaCaption, setAboutMediaCaption] = useState<string>(initialAboutCaption);
  
  // Active section tab in store edit form
  const [activeFormTab, setActiveFormTab] = useState<'basic' | 'location' | 'media' | 'hours' | 'all'>('basic');

  // VIP Popup Manager Modal State
  const [isVipPopupManagerOpen, setIsVipPopupManagerOpen] = useState(false);
  const vipInfo = getBusinessVipStatus(business);

  // UI interaction states
  const [copiedLink, setCopiedLink] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Category state
  const [mainCategory, setMainCategory] = useState<MainCategory>('مأكولات ومشروبات');
  const [subCategory, setSubCategory] = useState<string>(business.category || business.subCategory || 'مطاعم وجبات سريعة (شاورما، برجر، سناكات)');

  // Working hours
  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    isOpen24Hours: business.workingHours?.isOpen24Hours || false,
    openTime: business.workingHours?.openTime || '09:00',
    closeTime: business.workingHours?.closeTime || '23:00',
    days: business.workingHours?.days || 'طوال أيام الأسبوع',
    selectedDays: business.workingHours?.selectedDays,
    isCustomClosed: business.workingHours?.isCustomClosed || false,
    vacationReason: business.workingHours?.vacationReason || '',
    isRamadanMode: business.workingHours?.isRamadanMode || false,
    ramadanOpenTime: business.workingHours?.ramadanOpenTime || '14:00',
    ramadanCloseTime: business.workingHours?.ramadanCloseTime || '02:30',
    exceptionalNote: business.workingHours?.exceptionalNote || '',
  });

  // Social links
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(business.socialLinks || {});

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
    setLogoUrl(business.logoUrl || '');
    setGooglePlaceUrl(business.googlePlaceUrl || '');
    setHideSiteReviews(!!business.hideSiteReviews);
    setDeliveryAvailable(!!business.deliveryAvailable);
    setDeliveryRegions(business.deliveryRegions || '');

    const bAboutType = business.aboutMedia?.type || (business.aboutVideoUrl ? 'video' : business.aboutImageUrl ? 'image' : 'video');
    const bAboutUrl = business.aboutMedia?.url || business.aboutVideoUrl || business.aboutImageUrl || '';
    setAboutMediaType(bAboutType);
    setAboutMediaUrl(bAboutUrl);
    setAboutMediaCaption(business.aboutMedia?.caption || '');

    // Find main category
    let foundMain: MainCategory | null = null;
    const rawCat = (business.category || '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
    const rawSubCat = (business.subCategory || '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
    
    if (business.category || business.subCategory) {
      for (const [main, subs] of Object.entries(BUSINESS_CATEGORIES)) {
        if (
          main === business.category ||
          main === rawCat ||
          (subs as string[]).includes(business.category) ||
          (subs as string[]).includes(rawCat) ||
          (subs as string[]).includes(business.subCategory || '') ||
          (subs as string[]).includes(rawSubCat)
        ) {
          foundMain = main as MainCategory;
          break;
        }
      }
    }

    if (foundMain) {
      setMainCategory(foundMain);
      setSubCategory(business.subCategory || business.category);
    } else {
      setMainCategory('مأكولات ومشروبات');
      setSubCategory(business.category || business.subCategory || 'مطاعم وجبات سريعة (شاورما، برجر، سناكات)');
    }

    setWorkingHours({
      isOpen24Hours: business.workingHours?.isOpen24Hours || false,
      openTime: business.workingHours?.openTime || '09:00',
      closeTime: business.workingHours?.closeTime || '23:00',
      days: business.workingHours?.days || 'طوال أيام الأسبوع',
      selectedDays: business.workingHours?.selectedDays,
      isCustomClosed: business.workingHours?.isCustomClosed || false,
      vacationReason: business.workingHours?.vacationReason || '',
      isRamadanMode: business.workingHours?.isRamadanMode || false,
      ramadanOpenTime: business.workingHours?.ramadanOpenTime || '14:00',
      ramadanCloseTime: business.workingHours?.ramadanCloseTime || '02:30',
      exceptionalNote: business.workingHours?.exceptionalNote || '',
    });

    setSocialLinks(business.socialLinks || {});
  }, [business]);

  const cleanUsername = (val: string) => {
    if (!val) return '';
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
      subCategory: subCategory,
      description: description.trim(),
      district,
      address: address.trim(),
      phone: phone.trim(),
      imageUrl: imageUrl.trim(),
      coverVideoUrl: coverVideoUrl.trim(),
      logoUrl: logoUrl.trim(),
      googlePlaceUrl: googlePlaceUrl.trim(),
      workingHours,
      socialLinks,
      hideSiteReviews,
      aboutMedia: aboutMediaUrl.trim() ? {
        type: aboutMediaType,
        url: aboutMediaUrl.trim(),
        ...(aboutMediaCaption.trim() ? { caption: aboutMediaCaption.trim() } : {})
      } : null,
      aboutVideoUrl: aboutMediaType === 'video' && aboutMediaUrl.trim() ? aboutMediaUrl.trim() : null,
      aboutImageUrl: aboutMediaType === 'image' && aboutMediaUrl.trim() ? aboutMediaUrl.trim() : null,
      deliveryAvailable: !isMedicalBusiness(business) ? deliveryAvailable : false,
      deliveryRegions: !isMedicalBusiness(business) ? (deliveryAvailable ? deliveryRegions.trim() : '') : '',
      paymentMethods,
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

  const displayUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://shofi-irbid.com'}/${username.trim() ? `@${username.trim()}` : `business/${business.id}`}`;

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6" dir="rtl">
        {!onlySettings && (
          <>
            {/* Section Navigation Tabs */}
            <div className="flex items-center gap-1.5 p-1.5 bg-stone-100 rounded-2xl border border-stone-200/80 overflow-x-auto scrollbar-none mb-6">
              <button
                type="button"
                onClick={() => setActiveFormTab('all')}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-2",
                  activeFormTab === 'all' ? "bg-white text-[#1a4d2e] shadow-2xs font-black" : "text-stone-600 hover:text-stone-900"
                )}
              >
                <LayoutGrid className="h-4 w-4 text-[#1a4d2e]" />
                <span>جميع الأقسام</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab('basic')}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-2",
                  activeFormTab === 'basic' ? "bg-white text-[#1a4d2e] shadow-2xs font-black" : "text-stone-600 hover:text-stone-900"
                )}
              >
                <Store className="h-4 w-4 text-[#1a4d2e]" />
                <span>البيانات الأساسية</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab('location')}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-2",
                  activeFormTab === 'location' ? "bg-white text-[#1a4d2e] shadow-2xs font-black" : "text-stone-600 hover:text-stone-900"
                )}
              >
                <MapPin className="h-4 w-4 text-[#1a4d2e]" />
                <span>العنوان والتوصيل</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab('media')}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-2",
                  activeFormTab === 'media' ? "bg-white text-[#1a4d2e] shadow-2xs font-black" : "text-stone-600 hover:text-stone-900"
                )}
              >
                <ImageIcon className="h-4 w-4 text-[#1a4d2e]" />
                <span>الصور والوصف</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFormTab('hours')}
                className={cn(
                  "px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-2",
                  activeFormTab === 'hours' ? "bg-white text-[#1a4d2e] shadow-2xs font-black" : "text-stone-600 hover:text-stone-900"
                )}
              >
                <Clock className="h-4 w-4 text-[#1a4d2e]" />
                <span>ساعات العمل والتواصل</span>
              </button>
            </div>

            {/* SECTION 1: البيانات الأساسية والهوية */}
            {(activeFormTab === 'basic' || activeFormTab === 'all') && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
                    <Store className="h-5 w-5 text-[#1a4d2e]" />
                    <h4 className="text-sm font-black text-stone-900">المعلومات الأساسية والتصنيف</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-stone-700 mb-1.5">
                        اسم المحل التجاري *
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="اسم المحل"
                        className="w-full bg-[#fdfcfb] border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-black text-stone-700 mb-1.5">
                        اسم المالك أو المسؤول
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={ownerName}
                          onChange={e => setOwnerName(e.target.value)}
                          placeholder="الاسم الكامل"
                          className="w-full bg-[#fdfcfb] border border-stone-200 rounded-xl px-3.5 py-2.5 pr-9 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e]"
                        />
                        <User className="h-4 w-4 text-stone-400 absolute top-3 right-3" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-black text-stone-700 mb-1.5">
                        التصنيف الرئيسي *
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
                        التصنيف الفرعي *
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

                {/* Handle & Page URL */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
                    <AtSign className="h-5 w-5 text-[#1a4d2e]" />
                    <h4 className="text-sm font-black text-stone-900">معرّف الرابط واسم المستخدم</h4>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-black text-stone-700 mb-1.5">
                        اسم المستخدم للمحل
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          dir="ltr"
                          value={username}
                          onChange={handleUsernameChange}
                          placeholder="alkhiyam_cafe"
                          className="w-full bg-white border border-stone-300 rounded-xl px-3.5 py-2.5 pl-8 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e]"
                        />
                        <span className="absolute top-2.5 left-3 text-sm font-black text-[#1a4d2e] pointer-events-none">@</span>
                      </div>
                    </div>

                    {/* Social Link Preview */}
                    <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <Globe className="h-4 w-4 text-[#1a4d2e] shrink-0" />
                        <div className="text-xs font-bold text-stone-900 font-mono truncate" dir="ltr">
                          {displayUrl}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="inline-flex items-center justify-center gap-1.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
                      >
                        {copiedLink ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-300" />
                            <span>تم النسخ</span>
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
              </div>
            )}

            {/* SECTION 2: العنوان والتواصل والتوصيل */}
            {(activeFormTab === 'location' || activeFormTab === 'all') && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
                    <MapPin className="h-5 w-5 text-[#1a4d2e]" />
                    <h4 className="text-sm font-black text-stone-900">الموقع والعنوان</h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-stone-700 mb-1.5">
                        المنطقة أو الحي *
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
                        العنوان التفصيلي *
                      </label>
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={e => setAddress(e.target.value)}
                        placeholder="شارع الجامعة"
                        className="w-full bg-[#fdfcfb] border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-stone-700 mb-1.5">
                      رابط موقع المحل على خرائط Google Maps
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        dir="ltr"
                        value={googlePlaceUrl}
                        onChange={e => setGooglePlaceUrl(e.target.value)}
                        placeholder="https://maps.app.goo.gl/..."
                        className="w-full bg-[#fdfcfb] border border-stone-200 rounded-xl px-3.5 py-2.5 pl-9 text-xs text-left text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e]"
                      />
                      <Globe className="h-4 w-4 text-stone-400 absolute top-3 left-3 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Contact Phone & Delivery */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
                    <Phone className="h-5 w-5 text-[#1a4d2e]" />
                    <h4 className="text-sm font-black text-stone-900">أرقام التواصل والتوصيل</h4>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-stone-700 mb-1.5">
                      رقم هاتف التواصل والاتصال *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        dir="ltr"
                        required
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\s+/g, ''))}
                        placeholder="079XXXXXXXX"
                        className="w-full bg-[#fdfcfb] border border-stone-200 rounded-xl px-3.5 py-2.5 pl-9 text-xs text-left font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e]"
                      />
                      <Phone className="h-4 w-4 text-stone-400 absolute top-3 left-3 pointer-events-none" />
                    </div>
                  </div>

                  {!isMedicalBusiness(business) && (
                    <div className="pt-3 border-t border-stone-100 space-y-3">
                      <label className={cn(
                        "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all",
                        deliveryAvailable ? "bg-blue-50/60 border-blue-200" : "bg-stone-50/50 border-stone-200 hover:bg-stone-50"
                      )}>
                        <span className="font-black text-stone-900 flex items-center gap-2 text-xs sm:text-sm">
                          <Truck className="h-4.5 w-4.5 text-blue-600" />
                          تفعيل خدمة التوصيل
                        </span>
                        <input
                          type="checkbox"
                          checked={deliveryAvailable}
                          onChange={e => setDeliveryAvailable(e.target.checked)}
                          className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-stone-300 cursor-pointer"
                        />
                      </label>

                      {deliveryAvailable && (() => {
                        const selectedRegions = deliveryRegions 
                          ? deliveryRegions.split(',').map(r => r.trim()).filter(Boolean) 
                          : [];

                        const handleToggleRegion = (regionName: string) => {
                          let updated: string[];
                          if (selectedRegions.includes(regionName)) {
                            updated = selectedRegions.filter(r => !regionName);
                          } else {
                            updated = [...selectedRegions, regionName];
                          }
                          setDeliveryRegions(updated.join(', '));
                        };

                        const handleToggleAllGroup = (areas: string[], isAllSelected: boolean) => {
                          let updated: string[];
                          if (isAllSelected) {
                            updated = selectedRegions.filter(r => !areas.includes(r));
                          } else {
                            const toAdd = areas.filter(r => !selectedRegions.includes(r));
                            updated = [...selectedRegions, ...toAdd];
                          }
                          setDeliveryRegions(updated.join(', '));
                        };

                        const filteredRegions = IRBID_REGIONS_CATEGORIZED.map(group => {
                          const matchedAreas = group.areas.filter(area => 
                            area.toLowerCase().includes(regionsSearch.trim().toLowerCase())
                          );
                          return { ...group, areas: matchedAreas };
                        }).filter(group => group.areas.length > 0);

                        return (
                          <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-4 space-y-4">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <label className="text-xs font-black text-stone-700 flex items-center gap-1.5">
                                <MapPin className="h-4 w-4 text-blue-500" />
                                مناطق التوصيل المشمولة
                              </label>
                            </div>

                            {selectedRegions.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 p-2 bg-white border border-stone-200 rounded-xl max-h-[120px] overflow-y-auto">
                                {selectedRegions.map(region => (
                                  <span 
                                    key={region}
                                    className="bg-blue-50 text-blue-700 border border-blue-100 pl-1.5 pr-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1"
                                  >
                                    <span>{region}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleRegion(region)}
                                      className="p-0.5 hover:bg-blue-200 rounded-md transition-colors text-blue-500 shrink-0 cursor-pointer"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            )}

                            <div className="relative">
                              <Search className="absolute right-3.5 top-2.5 h-4 w-4 text-stone-400" />
                              <input
                                type="text"
                                value={regionsSearch}
                                onChange={e => setRegionsSearch(e.target.value)}
                                placeholder="البحث في مناطق إربد..."
                                className="w-full bg-white border border-stone-200 rounded-xl pr-10 pl-4 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 text-stone-800"
                              />
                            </div>

                            <div className="bg-white border border-stone-200 rounded-xl p-3 max-h-[260px] overflow-y-auto space-y-4">
                              {filteredRegions.map(group => {
                                const groupSelectedCount = group.areas.filter(r => selectedRegions.includes(r)).length;
                                const isAllSelected = groupSelectedCount === group.areas.length;

                                return (
                                  <div key={group.groupName} className="space-y-2 border-b border-stone-100 pb-3 last:border-0 last:pb-0">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                      <h5 className="text-[11px] font-black text-[#1a4d2e]">{group.groupName}</h5>
                                      <button
                                        type="button"
                                        onClick={() => handleToggleAllGroup(group.areas, isAllSelected)}
                                        className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                                      >
                                        {isAllSelected ? 'إلغاء تحديد الكل' : 'تحديد المجموعة'}
                                      </button>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                      {group.areas.map(area => {
                                        const isChecked = selectedRegions.includes(area);
                                        return (
                                          <button
                                            type="button"
                                            key={area}
                                            onClick={() => handleToggleRegion(area)}
                                            className={cn(
                                              "p-2 rounded-xl border text-right transition-all flex items-center justify-between gap-1.5 cursor-pointer text-[10px] sm:text-xs font-bold",
                                              isChecked 
                                                ? "bg-blue-50 border-blue-200 text-blue-900" 
                                                : "bg-stone-50 hover:bg-stone-100 border-stone-100 text-stone-700"
                                            )}
                                          >
                                            <span className="truncate">{area}</span>
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              readOnly
                                              className="h-3.5 w-3.5 rounded text-blue-600 border-stone-300 pointer-events-none"
                                            />
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 3: الصور والوصف والميديا */}
            {(activeFormTab === 'media' || activeFormTab === 'all') && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
                    <ImageIcon className="h-5 w-5 text-[#1a4d2e]" />
                    <h4 className="text-sm font-black text-stone-900">شعار وصور المحل</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
                    {/* Logo */}
                    <div className="space-y-1">
                      <ImageUploader
                        label="شعار المحل / اللوجو"
                        folder="logos"
                        value={logoUrl}
                        onChange={(url) => setLogoUrl(url)}
                        aspectRatio="square"
                        placeholder="اختر ملف اللوجو"
                      />
                    </div>

                    {/* Cover Image */}
                    <div className="space-y-1">
                      <ImageUploader
                        label="صورة الغلاف الرئيسية"
                        folder="businesses"
                        value={imageUrl}
                        onChange={(url) => setImageUrl(url)}
                        aspectRatio="cover"
                        placeholder="اختر صورة غلاف المحل"
                      />
                    </div>

                    {/* Cover Video */}
                    <div className="space-y-1 md:col-span-2">
                      <VideoUploader
                        value={coverVideoUrl}
                        onChange={(url) => setCoverVideoUrl(url)}
                        label="فيديو الغلاف التفاعلي"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black text-stone-700 mb-1.5">
                      وصف المحل والخدمات *
                    </label>
                    <RichTextEditor
                      required
                      value={description}
                      onChange={setDescription}
                      placeholder="اكتب وصفاً للخدمات والمنتجات..."
                    />
                  </div>
                </div>

                {/* About Media */}
                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b border-stone-100">
                    <Video className="h-5 w-5 text-[#1a4d2e]" />
                    <h4 className="text-sm font-black text-stone-900">ميديا قسم عن المحل</h4>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => setAboutMediaType('video')}
                      className={cn(
                        "flex-1 p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer text-center",
                        aboutMediaType === 'video'
                          ? "border-[#1a4d2e] bg-[#1a4d2e]/10 text-[#1a4d2e]"
                          : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-white"
                      )}
                    >
                      <Video className="h-4 w-4 shrink-0" />
                      <span>مقطع فيديو</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAboutMediaType('image')}
                      className={cn(
                        "flex-1 p-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer text-center",
                        aboutMediaType === 'image'
                          ? "border-[#1a4d2e] bg-[#1a4d2e]/10 text-[#1a4d2e]"
                          : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-white"
                      )}
                    >
                      <ImageIcon className="h-4 w-4 shrink-0" />
                      <span>صورة تعريفية</span>
                    </button>
                  </div>

                  {aboutMediaType === 'video' && (
                    <div className="space-y-2 bg-stone-50 p-4 rounded-xl border border-stone-200">
                      <VideoUploader
                        value={aboutMediaUrl}
                        onChange={url => setAboutMediaUrl(url)}
                        label="فيديو قسم عن المحل"
                        placeholder="ضع رابط الفيديو أو ارفعه..."
                      />
                    </div>
                  )}

                  {aboutMediaType === 'image' && (
                    <div className="space-y-2 bg-stone-50 p-4 rounded-xl border border-stone-200">
                      <ImageUploader
                        label="رفع صورة عن المحل"
                        folder="about_media"
                        value={aboutMediaUrl}
                        onChange={(url) => setAboutMediaUrl(url)}
                        aspectRatio="cover"
                        placeholder="اختر صورة"
                      />
                      {aboutMediaUrl && (
                        <div className="mt-3 pt-3 border-t border-stone-200">
                          <MediaRenderer type="image" url={aboutMediaUrl} aspectRatio="video" />
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-black text-stone-700 mb-1">
                      عنوان للميديا
                    </label>
                    <input
                      type="text"
                      value={aboutMediaCaption}
                      onChange={e => setAboutMediaCaption(e.target.value)}
                      placeholder="عنوان اختياري"
                      className="w-full bg-[#fdfcfb] border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20"
                    />
                  </div>

                  {aboutMediaUrl && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAboutMediaUrl('');
                          setAboutMediaCaption('');
                        }}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>إزالة الميديا</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* VIP Popup Shortcut */}
                {vipInfo.isVip && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Crown className="h-5 w-5 text-amber-600" />
                        <h4 className="text-sm font-black text-stone-900">النافذة المنبثقة الترحيبية</h4>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-amber-200/60">
                      <div className="text-xs font-bold text-stone-700">
                        الحالة: {business.vipPopup?.enabled ? <span className="text-emerald-700 font-black">مفعلة</span> : <span className="text-stone-500">معطلة</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsVipPopupManagerOpen(true)}
                        className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs px-4 py-2 rounded-xl shadow-2xs transition-all cursor-pointer"
                      >
                        <span>إدارة النافذة المنبثقة</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECTION 4: ساعات العمل والتواصل والدفع */}
            {(activeFormTab === 'hours' || activeFormTab === 'all') && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <WorkingHoursEditor
                  workingHours={workingHours}
                  onChange={setWorkingHours}
                  showVacationToggle={true}
                />

                <SocialLinksEditor
                  socialLinks={socialLinks}
                  onChange={setSocialLinks}
                />

                <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-2xs">
                  <PaymentMethodsSelector
                    value={paymentMethods}
                    onChange={setPaymentMethods}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {!hideSettings && (
          <div className="space-y-4">
            {/* 1. Visibility Settings Card */}
            <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                  <EyeOff className="h-5 w-5 text-stone-700" />
                  <h4 className="text-sm font-black text-stone-900">حالة ظهور المنشأة</h4>
                </div>
                <span className={cn(
                  "text-xs font-black px-3 py-1 rounded-full",
                  isHidden ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                )}>
                  {isHidden ? "مخفي عن الزوار" : "ظاهر بالدليل"}
                </span>
              </div>

              <label className={cn(
                "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all",
                isHidden ? "bg-amber-50/70 border-amber-200" : "bg-stone-50/50 border-stone-200 hover:bg-stone-50"
              )}>
                <span className="text-xs font-black text-stone-800">إخفاء المنشأة من دليل الموقع والبحث</span>
                <input
                  type="checkbox"
                  checked={isHidden}
                  onChange={e => setIsHidden(e.target.checked)}
                  className="h-5 w-5 rounded text-amber-600 focus:ring-amber-500 border-stone-300 cursor-pointer"
                />
              </label>
            </div>

            {/* 2. Reviews Privacy Card */}
            <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 shadow-2xs">
              <div className="flex items-center gap-2.5 pb-3 border-b border-stone-100">
                <MessageSquare className="h-5 w-5 text-[#1a4d2e]" />
                <h4 className="text-sm font-black text-stone-900">خصوصية التقييمات</h4>
              </div>

              <label className="flex items-center justify-between p-4 bg-stone-50/50 rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-50 transition-colors">
                <span className="text-xs font-black text-stone-800">إخفاء قسم تقييمات الزوار من الصفحة العامة</span>
                <input
                  type="checkbox"
                  checked={hideSiteReviews}
                  onChange={e => setHideSiteReviews(e.target.checked)}
                  className="h-5 w-5 rounded text-[#1a4d2e] focus:ring-[#1a4d2e] border-stone-300 cursor-pointer"
                />
              </label>
            </div>

            {/* 3. Danger Zone: Delete Store Page */}
            {onDelete && (
              <div className="bg-rose-50/50 border border-rose-200 rounded-2xl p-5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="h-5 w-5 text-rose-700" />
                    <h4 className="text-sm font-black text-rose-900">إلغاء وحذف المنشأة</h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-xs font-black transition-all shadow-2xs cursor-pointer flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>حذف صفحة المحل نهائياً</span>
                  </button>
                </div>
              </div>
            )}
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
              إلغاء
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
                <span>جارٍ الحفظ...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>{onlySettings ? 'حفظ إعدادات الخصوصية والظهور' : 'حفظ معلومات المحل'}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200" dir="rtl">
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-stone-900">تأكيد حذف صفحة المحل</h3>
              <p className="text-xs text-stone-600 font-bold">
                هل أنت متأكد من حذف صفحة المحل "{business.name}"؟
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
                className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black disabled:opacity-50 transition-colors shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>جارٍ الحذف...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>تأكيد الحذف</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIP Popup Manager Modal */}
      {isVipPopupManagerOpen && (
        <VipPopupManagerModal
          business={business}
          isOpen={isVipPopupManagerOpen}
          onClose={() => setIsVipPopupManagerOpen(false)}
          onUpdated={(newPopup) => {
            business.vipPopup = newPopup;
          }}
        />
      )}
    </>
  );
}
