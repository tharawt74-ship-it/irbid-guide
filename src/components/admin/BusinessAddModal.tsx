import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Store, 
  MapPin, 
  Phone, 
  Globe, 
  Star, 
  Plus, 
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Crown,
  ShieldCheck,
  Gift,
  Sparkles
} from 'lucide-react';
import { Business, WorkingHours, SocialLinks } from '../../types';
import { BUSINESS_CATEGORIES, IRBID_REGIONS_CATEGORIZED, MainCategory } from '../../lib/categories';
import { SearchableSelect } from '../ui/SearchableSelect';
import { WorkingHoursEditor } from '../ui/WorkingHoursEditor';
import { SocialLinksEditor } from '../ui/SocialLinksEditor';
import { ImageUploader } from '../ui/ImageUploader';
import { RichTextEditor } from '../common/RichTextEditor';
import { validateJordanianPhone } from '../../lib/medicalHelper';

interface BusinessAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (newBusiness: Omit<Business, 'id'>) => Promise<void>;
}

export function BusinessAddModal({
  isOpen,
  onClose,
  onAdd
}: BusinessAddModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    mainCategory: '🍔 مأكولات ومشروبات' as MainCategory,
    subCategory: 'مطاعم وجبات سريعة (شاورما، برجر، سناكات)',
    description: '',
    address: '',
    district: 'شارع الجامعة',
    phone: '',
    imageUrl: '',
    logoUrl: '',
    googlePlaceUrl: '',
    ownerName: '',
    ownerContact: '',
    rating: 0,
    reviewCount: 0,
    isFeatured: false,
    packagePlan: 'golden',
    isVerified: true,
    hideSiteReviews: false
  });

  const [contactError, setContactError] = useState('');

  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    isOpen24Hours: false,
    openTime: '09:00',
    closeTime: '23:00',
    days: 'طوال أيام الأسبوع',
    isCustomClosed: false,
  });

  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});

  const [isSubmitting, setIsSubmitting] = useState(false);

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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.subCategory) return;
    
    setIsSubmitting(true);
    setContactError('');
    try {
      const contactVal = formData.ownerContact.trim();
      let ownerEmail = '';
      let ownerPhone = '';

      if (contactVal) {
        if (contactVal.includes('@')) {
          ownerEmail = contactVal.toLowerCase();
        } else {
          const phoneCheck = validateJordanianPhone(contactVal);
          if (!phoneCheck.isValid) {
            setContactError(phoneCheck.message || 'يرجى إدخال بريد إلكتروني صحيح أو رقم هاتف أردني صحيح (مثال: 0791234567).');
            setIsSubmitting(false);
            return;
          }
          ownerPhone = contactVal.trim();
        }
      }

      await onAdd({
        name: formData.name.trim(),
        category: formData.subCategory, // Mapping subCategory to category
        description: formData.description.trim(),
        address: formData.address.trim(),
        district: formData.district || 'شارع الجامعة',
        phone: formData.phone.trim() || ownerPhone,
        imageUrl: formData.imageUrl.trim() || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
        logoUrl: formData.logoUrl.trim(),
        googlePlaceUrl: formData.googlePlaceUrl.trim(),
        ownerName: formData.ownerName.trim() || 'إدارة شو في بإربد',
        ownerEmail: ownerEmail || undefined,
        ownerPhone: ownerPhone || undefined,
        ownerContact: contactVal || undefined,
        rating: Number(formData.rating) >= 0 ? Number(formData.rating) : 0,
        reviewCount: Number(formData.reviewCount) >= 0 ? Number(formData.reviewCount) : 0,
        createdAt: Date.now(),
        isFeatured: formData.isFeatured,
        isVerified: formData.isVerified,
        packagePlan: formData.packagePlan as any,
        selectedPackagePlan: formData.packagePlan as any,
        isVipTrial: formData.packagePlan === 'basic',
        billingPeriod: formData.packagePlan === 'basic' ? 'lifetime' : 'yearly',
        hideSiteReviews: formData.hideSiteReviews,
        workingHours: {
          isOpen24Hours: !!workingHours.isOpen24Hours,
          openTime: workingHours.openTime || '09:00',
          closeTime: workingHours.closeTime || '23:00',
          days: workingHours.days || 'طوال أيام الأسبوع',
          isCustomClosed: !!workingHours.isCustomClosed,
        },
        socialLinks,
        views: 0,
        analytics: {
          views: 0,
          whatsappClicks: 0,
          callClicks: 0,
          directionClicks: 0,
          menuViews: 0,
          shareClicks: 0,
          lastUpdated: Date.now(),
        }
      });
      onClose();
      // Reset form
      setFormData({
        name: '',
        mainCategory: '🍔 مأكولات ومشروبات',
        subCategory: 'مطاعم وجبات سريعة (شاورما، برجر، سناكات)',
        description: '',
        address: '',
        district: 'شارع الجامعة',
        phone: '',
        imageUrl: '',
        logoUrl: '',
        googlePlaceUrl: '',
        ownerName: '',
        ownerContact: '',
        rating: 0,
        reviewCount: 0,
        isFeatured: false,
        packagePlan: 'golden',
        isVerified: true,
        hideSiteReviews: false
      });
      setContactError('');
    } catch (error) {
      console.error('Error adding business:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] bg-stone-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden" dir="rtl">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-3xl w-full max-h-[88dvh] sm:max-h-[85vh] shadow-2xl border border-stone-200 relative my-0 sm:my-auto animate-in fade-in zoom-in-95 flex flex-col overflow-hidden">
        
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5e1da] p-5 sm:px-8 pb-4 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#ff9f1c]/10 text-[#ff9f1c] flex items-center justify-center font-bold">
              <Plus className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#2d2a26]">إضافة محل / منشأة جديدة بالدليل</h3>
              <p className="text-xs text-stone-500">نشر مباشر في قائمة المحلات الموثقة في مدينة إربد</p>
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
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
          
          {/* Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-stone-700 mb-1.5">اسم المحل *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: مطعم شاورما الريف"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white transition-all font-bold text-stone-800"
              />
            </div>

            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-stone-700 mb-1.5">التصنيف الرئيسي *</label>
                <SearchableSelect
                  options={Object.keys(BUSINESS_CATEGORIES)}
                  value={formData.mainCategory}
                  onChange={(val) => {
                    const mainCat = val as MainCategory;
                    setFormData(prev => ({
                      ...prev,
                      mainCategory: mainCat,
                      subCategory: BUSINESS_CATEGORIES[mainCat]?.[0] || ''
                    }));
                  }}
                  className="bg-stone-50 border-stone-200"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-stone-700 mb-1.5">التصنيف الفرعي *</label>
                <SearchableSelect
                  options={BUSINESS_CATEGORIES[formData.mainCategory as MainCategory] || []}
                  value={formData.subCategory}
                  onChange={(val) => setFormData(prev => ({ ...prev, subCategory: val }))}
                  className="bg-stone-50 border-stone-200"
                />
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-black text-stone-700 mb-1.5">الوصف والخدمات المقدمة</label>
            <RichTextEditor
              value={formData.description}
              onChange={val => setFormData(prev => ({ ...prev, description: val }))}
              placeholder="اكتب نبذة تعريفية بالمنشأة، المميزات، وقائمة الطعام أو المنتجات..."
            />
          </div>

          {/* Address & District & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-black text-stone-700 mb-1.5">المنطقة / الحي / القرية *</label>
              <SearchableSelect
                options={IRBID_REGIONS_CATEGORIZED.flatMap(g => g.areas)}
                value={formData.district}
                onChange={val => setFormData({ ...formData, district: val })}
                className="bg-stone-50 border-stone-200"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-stone-700 mb-1.5">العنوان بالتفصيل *</label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="مثال: مقابل البوابة الشمالية، مجمع..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white transition-all text-stone-800"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-stone-700 mb-1.5">رقم الهاتف / الواتساب</label>
              <input
                type="tel"
                dir="ltr"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\s+/g, '') })}
                placeholder="079XXXXXXX"
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

          {/* Live Working Hours Section & Socials */}
          <WorkingHoursEditor
            workingHours={workingHours}
            onChange={setWorkingHours}
            showVacationToggle={false}
          />

          <SocialLinksEditor
            socialLinks={socialLinks}
            onChange={setSocialLinks}
          />

          {/* VIP Package & Verified Badge */}
          <div className="p-4 sm:p-5 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3">
            <div className="flex items-center gap-2 font-black text-amber-950 text-sm">
              <Crown className="h-4 w-4 text-amber-600" />
              <span>باقة الاشتراك وشارة التوثيق الذهبية (VIP)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">نوع الباقة</label>
                <select
                  value={formData.packagePlan}
                  onChange={e => {
                    const plan = e.target.value;
                    setFormData({
                      ...formData,
                      packagePlan: plan,
                      isVerified: plan === 'golden' ? true : formData.isVerified
                    });
                  }}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm font-bold text-stone-800"
                >
                  <option value="golden">الباقة الذهبية VIP (شاملة المنيو والإحصائيات والتوثيق)</option>
                  <option value="basic">الباقة الأساسية</option>
                  <option value="pay_per_use">الدفع حسب الاستخدام</option>
                </select>
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-amber-900">
                  <input
                    type="checkbox"
                    checked={formData.isVerified}
                    onChange={e => setFormData({ ...formData, isVerified: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span>توثيق المنشأة بالحساب الموثّق (العلامة الزرقاء 🔵)</span>
                </label>
              </div>
            </div>

            {formData.packagePlan === 'golden' ? (
              <div className="bg-amber-100/70 border border-amber-300/80 rounded-xl p-3 flex gap-2 items-start mt-2">
                <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] font-black text-amber-950">هدية انضمام حصرية للباقة الذهبية VIP 🌟</div>
                  <div className="text-[10px] text-amber-900 font-bold mt-0.5 leading-tight">
                    سيحصل المحل تلقائياً على ميزة (المميز/صدارة البحث) ذات الإطار الذهبي وعلامة ممول مجاناً لمدة أسبوع كامل فور الإضافة.
                  </div>
                </div>
              </div>
            ) : formData.packagePlan === 'basic' ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex gap-2 items-start mt-2">
                <Gift className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] font-black text-emerald-950">هدية انضمام للباقة الأساسية 🎁</div>
                  <div className="text-[10px] text-emerald-800 font-bold mt-0.5 leading-tight">
                    سيحصل المحل تلقائياً على اشتراك شهر مجاني تجريبي في الباقة الذهبية VIP لمدة شهر كامل فور الإضافة.
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Rating, Reviews, Owner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200">
            <div>
              <label className="block text-[11px] font-black text-stone-600 mb-1">التقييم الأولي (من 5)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={formData.rating}
                onChange={e => setFormData({ ...formData, rating: parseFloat(e.target.value) || 0 })}
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm font-bold text-stone-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-stone-600 mb-1">عدد التقييمات الأولي</label>
              <input
                type="number"
                min="0"
                value={formData.reviewCount}
                onChange={e => setFormData({ ...formData, reviewCount: parseInt(e.target.value) || 0 })}
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm font-bold text-stone-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-stone-600 mb-1">اسم المالك / الحساب المسجل</label>
              <input
                type="text"
                value={formData.ownerName}
                onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                placeholder="اسم المالك"
                className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm font-bold text-stone-800"
              />
            </div>
          </div>

          {/* Golden Owner Account Access Input Box */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50 via-amber-100/60 to-amber-50 border-2 border-amber-300 shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                <Crown className="h-4 w-4" />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-black text-amber-950">
                  بيانات وصول صاحب المحل (البريد الإلكتروني أو رقم الهاتف) 🔑
                </label>
                <p className="text-[11px] text-amber-850 font-medium">
                  سيستخدم صاحب المحل هذا البريد أو رقم الهاتف للدخول إلى حسابه وإدارة صفحته دون الحاجة لتأكيد البريد.
                </p>
              </div>
            </div>

            <div className="pt-1">
              <input
                type="text"
                value={formData.ownerContact}
                onChange={e => {
                  setFormData({ ...formData, ownerContact: e.target.value });
                  setContactError('');
                }}
                placeholder="أدخل البريد الإلكتروني (مثال: owner@gmail.com) أو رقم الهاتف (مثال: 0791234567)"
                className="w-full bg-white border-2 border-amber-400 focus:border-amber-600 rounded-xl px-4 py-3 text-sm font-black text-stone-900 placeholder:text-stone-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-amber-400/40 transition-all shadow-inner"
                dir="ltr"
              />
              {contactError && (
                <p className="text-xs font-bold text-red-600 mt-1.5 flex items-center gap-1" dir="rtl">
                  <span>⚠️</span>
                  <span>{contactError}</span>
                </p>
              )}
            </div>
          </div>

          {/* Featured Toggle */}
          <label className="flex items-center justify-between p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200 cursor-pointer hover:bg-amber-50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
              </div>
              <div>
                <span className="text-xs font-black text-amber-950 block">تمييز المحل في صدارة البحث والبانر ⭐</span>
                <span className="text-[11px] text-amber-800">إظهار المحل فوراً في سلايدر الصفحة الرئيسية وأعلى التصنيف</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={formData.isFeatured}
              onChange={e => setFormData({ ...formData, isFeatured: e.target.checked })}
              className="h-5 w-5 rounded text-amber-600 focus:ring-amber-500 border-stone-300 cursor-pointer"
            />
          </label>

          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:px-8 bg-stone-50/90 border-t border-[#e5e1da] shrink-0 sticky bottom-0 z-10 flex items-center justify-end gap-3">
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
              className="px-6 py-2.5 rounded-xl bg-[#1a4d2e] hover:bg-[#133b22] text-white font-black text-sm transition-all shadow-md cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isSubmitting ? 'جاري النشر...' : 'نشر وتوثيق المحل'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>,
    document.body
  );
}
