import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Store, 
  MapPin, 
  Phone, 
  Globe, 
  Star, 
  MessageSquare, 
  EyeOff, 
  Sparkles, 
  Check, 
  Link as LinkIcon,
  Image as ImageIcon,
  Clock,
  ShieldCheck,
  Crown,
  Calendar,
  CalendarDays
} from 'lucide-react';
import { Business, WorkingHours, SocialLinks } from '../../types';
import { BUSINESS_CATEGORIES, IRBID_REGIONS_CATEGORIZED, MainCategory } from '../../lib/categories';
import { SearchableSelect } from '../ui/SearchableSelect';
import { WorkingHoursEditor } from '../ui/WorkingHoursEditor';
import { SocialLinksEditor } from '../ui/SocialLinksEditor';
import { ImageUploader } from '../ui/ImageUploader';

interface BusinessEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business | null;
  onSave: (updatedBusiness: Business) => Promise<void>;
}

export function BusinessEditModal({
  isOpen,
  onClose,
  business,
  onSave
}: BusinessEditModalProps) {
  const [formData, setFormData] = useState<Partial<Business>>({});
  const [mainCategory, setMainCategory] = useState<MainCategory>('🍔 مأكولات ومشروبات');
  const [subCategory, setSubCategory] = useState<string>('مطاعم وجبات سريعة (شاورما، برجر، سناكات)');
  
  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    isOpen24Hours: false,
    openTime: '09:00',
    closeTime: '23:00',
    days: 'طوال أيام الأسبوع',
    isCustomClosed: false,
  });
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [scheduleDuration, setScheduleDuration] = useState<'permanent' | 'custom_duration' | 'custom_dates'>('permanent');
  const [scheduleDays, setScheduleDays] = useState<number>(30);
  const [vipStartDate, setVipStartDate] = useState<string>('');
  const [vipEndDate, setVipEndDate] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (business) {
      setFormData({
        ...business,
        hideSiteReviews: !!business.hideSiteReviews,
        hideGoogleReviews: !!business.hideGoogleReviews,
        isFeatured: !!business.isFeatured,
        isVerified: !!business.isVerified || business.packagePlan === 'golden' || business.packagePlan === 'vip',
        packagePlan: business.packagePlan || (business.isVerified ? 'golden' : 'basic'),
        vipNotes: business.vipNotes || '',
      });

      // Map existing category to main and sub
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

      if (business.vipSubscriptionExpiresAt || business.vipSubscriptionStartsAt) {
        setScheduleDuration('custom_dates');
        if (business.vipSubscriptionStartsAt) {
          setVipStartDate(new Date(business.vipSubscriptionStartsAt).toISOString().slice(0, 10));
        } else {
          setVipStartDate(new Date().toISOString().slice(0, 10));
        }
        if (business.vipSubscriptionExpiresAt) {
          setVipEndDate(new Date(business.vipSubscriptionExpiresAt).toISOString().slice(0, 10));
        } else {
          setVipEndDate('');
        }
      } else {
        setScheduleDuration('permanent');
        setVipStartDate(new Date().toISOString().slice(0, 10));
        setVipEndDate('');
      }

      if (business.workingHours) {
        setWorkingHours({
          isOpen24Hours: !!business.workingHours.isOpen24Hours,
          openTime: business.workingHours.openTime || '09:00',
          closeTime: business.workingHours.closeTime || '23:00',
          days: business.workingHours.days || 'طوال أيام الأسبوع',
          isCustomClosed: !!business.workingHours.isCustomClosed,
        });
      } else {
        setWorkingHours({
          isOpen24Hours: false,
          openTime: '09:00',
          closeTime: '23:00',
          days: 'طوال أيام الأسبوع',
          isCustomClosed: false,
        });
      }
      
      setSocialLinks(business.socialLinks || {});
    }
  }, [business]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !business) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !subCategory) return;
    
    setIsSubmitting(true);
    try {
      let startsAt: number | undefined = undefined;
      let expiresAt: number | undefined = undefined;
      let isScheduled = false;

      const isGolden = formData.packagePlan === 'golden' || formData.packagePlan === 'vip';

      if (isGolden) {
        if (scheduleDuration === 'custom_duration' && scheduleDays > 0) {
          const now = Date.now();
          startsAt = now;
          expiresAt = now + (scheduleDays * 24 * 60 * 60 * 1000);
          isScheduled = true;
        } else if (scheduleDuration === 'custom_dates') {
          if (vipStartDate) {
            startsAt = new Date(vipStartDate).setHours(0, 0, 0, 0);
          }
          if (vipEndDate) {
            expiresAt = new Date(vipEndDate).setHours(23, 59, 59, 999);
          }
          isScheduled = !!(vipStartDate || vipEndDate);
        } else {
          startsAt = Date.now();
          expiresAt = undefined;
          isScheduled = false;
        }
      } else {
        startsAt = undefined;
        expiresAt = undefined;
        isScheduled = false;
      }

      await onSave({
        ...business,
        ...formData,
        name: formData.name || '',
        category: subCategory || 'أخرى',
        description: formData.description || '',
        address: formData.address || '',
        district: formData.district || '',
        phone: formData.phone || '',
        imageUrl: formData.imageUrl || '',
        googlePlaceUrl: formData.googlePlaceUrl || '',
        ownerName: formData.ownerName || '',
        rating: Number(formData.rating) || 0,
        reviewCount: Number(formData.reviewCount) || 0,
        isFeatured: !!formData.isFeatured,
        isVerified: isGolden ? !!formData.isVerified : false,
        packagePlan: formData.packagePlan || (formData.isVerified ? 'golden' : 'basic'),
        vipSubscriptionStartsAt: startsAt,
        vipSubscriptionExpiresAt: expiresAt,
        isVipScheduled: isScheduled,
        vipNotes: formData.vipNotes || undefined,
        hideSiteReviews: !!formData.hideSiteReviews,
        hideGoogleReviews: !!formData.hideGoogleReviews,
        workingHours: {
          isOpen24Hours: !!workingHours.isOpen24Hours,
          openTime: workingHours.openTime || '09:00',
          closeTime: workingHours.closeTime || '23:00',
          days: workingHours.days || 'طوال أيام الأسبوع',
          isCustomClosed: !!workingHours.isCustomClosed,
        },
        socialLinks,
      } as Business);
      onClose();
    } catch (error) {
      console.error('Error saving business:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !business || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 relative my-auto animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5e1da] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1a4d2e]/10 text-[#1a4d2e] flex items-center justify-center">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#2d2a26]">تعديل بيانات المحل والميزات</h3>
              <p className="text-xs text-stone-500">تحديث تفاصيل المنشأة وساعات العمل وباقة الاشتراك</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-stone-700 mb-1.5">اسم المحل / المنشأة *</label>
              <input
                type="text"
                required
                value={formData.name || ''}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white transition-all font-bold text-stone-800"
              />
            </div>

            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-stone-700 mb-1.5">التصنيف الرئيسي *</label>
                <SearchableSelect
                  options={Object.keys(BUSINESS_CATEGORIES)}
                  value={mainCategory}
                  onChange={(val) => {
                    const mainCat = val as MainCategory;
                    setMainCategory(mainCat);
                    setSubCategory(BUSINESS_CATEGORIES[mainCat]?.[0] || '');
                  }}
                  className="bg-stone-50 border-stone-200"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-stone-700 mb-1.5">التصنيف الفرعي *</label>
                <SearchableSelect
                  options={BUSINESS_CATEGORIES[mainCategory] || []}
                  value={subCategory}
                  onChange={(val) => setSubCategory(val)}
                  className="bg-stone-50 border-stone-200"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-black text-stone-700 mb-1.5">الوصف والخدمات المقدمة</label>
            <textarea
              rows={3}
              value={formData.description || ''}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white transition-all text-stone-800 resize-none"
              placeholder="اكتب نبذة تعريفية شاملة عن المحل..."
            ></textarea>
          </div>

          {/* Address & District & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black text-stone-700 mb-1.5">المنطقة / الحي / القرية *</label>
              <SearchableSelect
                options={IRBID_REGIONS_CATEGORIZED.flatMap(g => g.areas)}
                value={formData.district || ''}
                onChange={val => setFormData({ ...formData, district: val })}
                className="bg-stone-50 border-stone-200"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-stone-700 mb-1.5">العنوان بالتفصيل في إربد *</label>
              <input
                type="text"
                required
                value={formData.address || ''}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="مثال: مقابل البوابة الشمالية، مجمع..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white transition-all text-stone-800"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-stone-700 mb-1.5">رقم الهاتف / الاتصال</label>
              <input
                type="tel"
                dir="ltr"
                value={formData.phone || ''}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="07XXXXXXXX"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white transition-all text-left text-stone-800"
              />
            </div>
          </div>

          {/* Image Uploads (Logo & Cover) & Google Place URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            <div>
              <ImageUploader
                label="شعار المحل / اللوجو / الصورة الشخصية"
                folder="logos"
                value={formData.logoUrl || ''}
                onChange={url => setFormData({ ...formData, logoUrl: url })}
                aspectRatio="square"
                placeholder="اختر اللوجو أو الصورة الشخصية من جهازك"
              />
            </div>

            <div>
              <ImageUploader
                label="صورة غلاف المحل الرئيسية"
                folder="businesses"
                value={formData.imageUrl || ''}
                onChange={url => setFormData({ ...formData, imageUrl: url })}
                aspectRatio="cover"
                placeholder="اختر صورة الغلاف من جهازك"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-stone-700 mb-1.5">رابط خرائط Google Maps</label>
            <input
              type="url"
              dir="ltr"
              value={formData.googlePlaceUrl || ''}
              onChange={e => setFormData({ ...formData, googlePlaceUrl: e.target.value })}
              placeholder="https://maps.google.com/..."
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white transition-all text-left text-stone-800"
            />
          </div>

          {/* Live Working Hours Section (For all packages) */}
          <WorkingHoursEditor
            workingHours={workingHours}
            onChange={setWorkingHours}
          />
          <SocialLinksEditor
            socialLinks={socialLinks}
            onChange={setSocialLinks}
          />



          {/* VIP Package & Verified Badge Section */}
          <div className="p-4 sm:p-5 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-amber-950 text-sm">
                <Crown className="h-4 w-4 text-amber-600" />
                <span>الباقة الذهبية (VIP) وجدولة الاشتراك</span>
              </div>
              <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2.5 py-0.5 rounded-full font-bold">
                تحكم المشرف
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">نوع الباقة المشترك بها</label>
                <select
                  value={formData.packagePlan || 'basic'}
                  onChange={e => {
                    const plan = e.target.value as any;
                    setFormData({
                      ...formData,
                      packagePlan: plan,
                      isVerified: plan === 'golden' || plan === 'vip' ? true : formData.isVerified
                    });
                  }}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm font-bold text-stone-800"
                >
                  <option value="basic">الباقة الأساسية (مجانية)</option>
                  <option value="golden">الباقة الذهبية VIP (منيو، إحصائيات، توثيق وردود)</option>
                  <option value="pay_per_use">الدفع حسب الاستخدام</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-amber-900">
                  <input
                    type="checkbox"
                    checked={!!formData.isVerified}
                    onChange={e => setFormData({ ...formData, isVerified: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>تفعيل "العلامة الزرقاء" للحساب الموثّق (فيسبوك وX) 🔵</span>
                </label>
              </div>
            </div>

            {/* VIP Scheduling Sub-section if Golden plan is selected */}
            {(formData.packagePlan === 'golden' || formData.packagePlan === 'vip') && (
              <div className="p-3.5 bg-white/80 rounded-xl border border-amber-200/80 space-y-3 pt-3">
                <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-amber-700" />
                  <span>جدولة مدة الترقية الذهبية (VIP Scheduling):</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setScheduleDuration('permanent')}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      scheduleDuration === 'permanent'
                        ? 'bg-[#1a4d2e] text-white border-[#1a4d2e]'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    ترقية دائمة
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setScheduleDuration('custom_duration');
                      const future = new Date();
                      future.setDate(future.getDate() + 30);
                      setVipEndDate(future.toISOString().slice(0, 10));
                    }}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      scheduleDuration === 'custom_duration'
                        ? 'bg-[#1a4d2e] text-white border-[#1a4d2e]'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    مدة محددة (أيام)
                  </button>

                  <button
                    type="button"
                    onClick={() => setScheduleDuration('custom_dates')}
                    className={`py-1.5 px-2.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                      scheduleDuration === 'custom_dates'
                        ? 'bg-[#1a4d2e] text-white border-[#1a4d2e]'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    تحديد تواريخ 🗓️
                  </button>
                </div>

                {scheduleDuration === 'custom_duration' && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {[
                      { label: '7 أيام', days: 7 },
                      { label: '30 يوماً', days: 30 },
                      { label: '90 يوماً', days: 90 },
                      { label: '180 يوماً', days: 180 },
                      { label: 'سنة (365 يوم)', days: 365 },
                    ].map(p => (
                      <button
                        key={p.days}
                        type="button"
                        onClick={() => {
                          setScheduleDays(p.days);
                          const future = new Date();
                          future.setDate(future.getDate() + p.days);
                          setVipEndDate(future.toISOString().slice(0, 10));
                        }}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${
                          scheduleDays === p.days
                            ? 'bg-amber-100 border-amber-400 text-amber-900'
                            : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                )}

                {scheduleDuration === 'custom_dates' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 mb-1">تاريخ البدء:</label>
                      <input
                        type="date"
                        value={vipStartDate}
                        onChange={e => setVipStartDate(e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 mb-1">تاريخ الانتهاء:</label>
                      <input
                        type="date"
                        value={vipEndDate}
                        min={vipStartDate || undefined}
                        onChange={e => setVipEndDate(e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-stone-600 mb-1">ملاحظات الاشتراك / العقد:</label>
                  <input
                    type="text"
                    value={formData.vipNotes || ''}
                    onChange={e => setFormData({ ...formData, vipNotes: e.target.value })}
                    placeholder="ملاحظات المشرف حول تجديد الباقة أو الدفع"
                    className="w-full bg-white border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-800"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Rating & Review Count & Owner Name */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200">
            <div>
              <label className="block text-[11px] font-black text-stone-600 mb-1">التقييم (من 5 - 0 للجديد)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={formData.rating ?? 0}
                onChange={e => setFormData({ ...formData, rating: parseFloat(e.target.value) || 0 })}
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm font-bold text-stone-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-stone-600 mb-1">عدد التقييمات</label>
              <input
                type="number"
                min="0"
                value={formData.reviewCount ?? 0}
                onChange={e => setFormData({ ...formData, reviewCount: parseInt(e.target.value) || 0 })}
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm font-bold text-stone-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-stone-600 mb-1">اسم المالك / الحساب</label>
              <input
                type="text"
                value={formData.ownerName || ''}
                onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                placeholder="اسم صاحب المحل"
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm font-bold text-stone-800"
              />
            </div>
          </div>

          {/* Featured and Privacy Toggles */}
          <div className="space-y-2.5 pt-2">
            
            {/* Featured Badge Toggle */}
            <label className="flex items-center justify-between p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/80 cursor-pointer hover:bg-amber-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <span className="text-xs font-black text-amber-950 block">تمييز المحل في البانر وصدارة البحث ⭐</span>
                  <span className="text-[11px] text-amber-800">إظهار المحل في السلايدر الرئيسي وأعلى نتائج البحث في إربد</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={!!formData.isFeatured}
                onChange={e => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="h-5 w-5 rounded text-amber-600 focus:ring-amber-500 border-stone-300 cursor-pointer"
              />
            </label>

            {/* Hide Site Reviews */}
            <label className="flex items-center justify-between p-3.5 bg-stone-50 rounded-2xl border border-stone-200 cursor-pointer hover:bg-stone-100 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-stone-200 text-stone-700 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-black text-stone-800 block">إخفاء تقييمات المنصة (الموقع)</span>
                  <span className="text-[11px] text-stone-500">تعطيل وإخفاء تقييمات وتعليقات الزوار المكتوبة مباشرة على الموقع</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={!!formData.hideSiteReviews}
                onChange={e => setFormData({ ...formData, hideSiteReviews: e.target.checked })}
                className="h-5 w-5 rounded text-[#1a4d2e] focus:ring-[#1a4d2e] border-stone-300 cursor-pointer"
              />
            </label>

          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#e5e1da] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-stone-200 font-bold text-sm text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#1a4d2e] hover:bg-[#133b22] text-white font-black text-sm transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ التعديلات'}
            </button>
          </div>

        </form>

      </div>
    </div>,
    document.body
  );
}
