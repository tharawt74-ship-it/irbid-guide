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
  ShieldCheck
} from 'lucide-react';
import { Business, WorkingHours, SocialLinks } from '../../types';
import { BUSINESS_CATEGORIES, IRBID_REGIONS_CATEGORIZED, MainCategory } from '../../lib/categories';
import { SearchableSelect } from '../ui/SearchableSelect';
import { WorkingHoursEditor } from '../ui/WorkingHoursEditor';
import { SocialLinksEditor } from '../ui/SocialLinksEditor';
import { ImageUploader } from '../ui/ImageUploader';

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
    rating: 0,
    reviewCount: 0,
    isFeatured: false,
    packagePlan: 'golden',
    isVerified: true,
    hideSiteReviews: false,
    hideGoogleReviews: false
  });

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
    try {
      await onAdd({
        name: formData.name.trim(),
        category: formData.subCategory, // Mapping subCategory to category
        description: formData.description.trim(),
        address: formData.address.trim(),
        district: formData.district || 'شارع الجامعة',
        phone: formData.phone.trim(),
        imageUrl: formData.imageUrl.trim() || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80',
        logoUrl: formData.logoUrl.trim(),
        googlePlaceUrl: formData.googlePlaceUrl.trim(),
        ownerName: formData.ownerName.trim() || 'إدارة شو في بإربد',
        rating: Number(formData.rating) >= 0 ? Number(formData.rating) : 0,
        reviewCount: Number(formData.reviewCount) >= 0 ? Number(formData.reviewCount) : 0,
        createdAt: Date.now(),
        isFeatured: formData.isFeatured,
        isVerified: formData.isVerified,
        packagePlan: formData.packagePlan as any,
        hideSiteReviews: formData.hideSiteReviews,
        hideGoogleReviews: formData.hideGoogleReviews,
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
        rating: 0,
        reviewCount: 0,
        isFeatured: false,
        packagePlan: 'golden',
        isVerified: true,
        hideSiteReviews: false,
        hideGoogleReviews: false
      });
    } catch (error) {
      console.error('Error adding business:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 relative my-auto animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5e1da] pb-4">
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
        <form onSubmit={handleSubmit} className="space-y-4">
          
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
            <textarea
              rows={3}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white transition-all text-stone-800 resize-none"
              placeholder="اكتب نبذة تعريفية بالمنشأة، المميزات، وقائمة الطعام أو المنتجات..."
            ></textarea>
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
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
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
