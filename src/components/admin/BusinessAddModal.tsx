import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Store, 
  MapPin, 
  Phone, 
  Star, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Crown, 
  ShieldCheck, 
  Sparkles,
  CreditCard
} from 'lucide-react';
import { Business, WorkingHours, SocialLinks } from '../../types';
import { BUSINESS_CATEGORIES, IRBID_REGIONS_CATEGORIZED, MainCategory } from '../../lib/categories';
import { SearchableSelect } from '../ui/SearchableSelect';
import { WorkingHoursEditor } from '../ui/WorkingHoursEditor';
import { SocialLinksEditor } from '../ui/SocialLinksEditor';
import { ImageUploader } from '../ui/ImageUploader';
import { VideoUploader } from '../common/VideoUploader';
import { RichTextEditor } from '../common/RichTextEditor';
import { PaymentMethodsSelector } from '../ui/PaymentMethodsSelector';
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
    mainCategory: 'تسوق وتجزئة' as MainCategory,
    subCategory: 'أخرى (تسوق وتجزئة)',
    description: '',
    address: '',
    district: 'شارع الجامعة',
    phone: '',
    imageUrl: '',
    coverVideoUrl: '',
    logoUrl: '',
    googlePlaceUrl: '',
    ownerName: '',
    ownerContact: '',
    rating: 0,
    reviewCount: 0,
    isFeatured: false,
    packagePlan: 'golden',
    isVerified: true,
    hideSiteReviews: false,
    paymentMethods: ['كاش', 'فيزا', 'كليك']
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
        requestType: 'business_registration',
        registrationSource: 'add_business_form',
        isCommercial: true,
        category: formData.subCategory,
        mainCategory: formData.mainCategory,
        subCategory: formData.subCategory,
        description: formData.description.trim(),
        address: formData.address.trim(),
        district: formData.district || 'شارع الجامعة',
        phone: formData.phone.trim() || ownerPhone,
        imageUrl: formData.imageUrl.trim() || '',
        coverVideoUrl: formData.coverVideoUrl.trim() || '',
        logoUrl: formData.logoUrl.trim() || '',
        googlePlaceUrl: formData.googlePlaceUrl.trim(),
        ownerName: formData.ownerName.trim() || 'إدارة الدليل',
        ownerEmail: ownerEmail || '',
        ownerPhone: ownerPhone || '',
        ownerContact: contactVal || '',
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
        paymentMethods: formData.paymentMethods || ['كاش', 'فيزا', 'كليك'],
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
      setFormData({
        name: '',
        mainCategory: 'مأكولات ومشروبات',
        subCategory: 'مطاعم وجبات سريعة (شاورما، برجر، سناكات)',
        description: '',
        address: '',
        district: 'شارع الجامعة',
        phone: '',
        imageUrl: '',
        coverVideoUrl: '',
        logoUrl: '',
        googlePlaceUrl: '',
        ownerName: '',
        ownerContact: '',
        rating: 0,
        reviewCount: 0,
        isFeatured: false,
        packagePlan: 'golden',
        isVerified: true,
        hideSiteReviews: false,
        paymentMethods: ['كاش', 'فيزا', 'كليك']
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
    <div className="fixed inset-0 z-[100000] bg-stone-950/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden" dir="rtl">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-3xl w-full max-h-[90dvh] sm:max-h-[85vh] shadow-2xl border border-stone-200 relative my-0 sm:my-auto animate-in fade-in zoom-in-95 flex flex-col overflow-hidden">
        
        {/* Mobile Indicator */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 p-4 sm:px-6 pb-3 shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1a4d2e]/10 text-[#1a4d2e] flex items-center justify-center font-bold">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-stone-900">إضافة محل جديد في الدليل</h3>
              <p className="text-xs text-stone-500">إدخال ونشر بيانات المنشأة التجارية في إربد</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            
            {/* Name & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-stone-700 mb-1">اسم المحل أو المنشأة <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: مطعم شاورما الريف"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:bg-white transition-all text-stone-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">التصنيف الرئيسي <span className="text-red-500">*</span></label>
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
                <label className="block text-xs font-bold text-stone-700 mb-1">التصنيف الفرعي <span className="text-red-500">*</span></label>
                <SearchableSelect
                  options={BUSINESS_CATEGORIES[formData.mainCategory as MainCategory] || []}
                  value={formData.subCategory}
                  onChange={(val) => setFormData(prev => ({ ...prev, subCategory: val }))}
                  className="bg-stone-50 border-stone-200"
                />
              </div>
            </div>

            {/* Address & District & Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2 border-t border-stone-100">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">المنطقة أو الحي <span className="text-red-500">*</span></label>
                <SearchableSelect
                  options={IRBID_REGIONS_CATEGORIZED.flatMap(g => g.areas)}
                  value={formData.district}
                  onChange={val => setFormData({ ...formData, district: val })}
                  className="bg-stone-50 border-stone-200"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">العنوان بالتفصيل <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  placeholder="مثال: شارع الجامعة، مقابل..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:bg-white transition-all text-stone-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">رقم الهاتف أو الواتساب</label>
                <input
                  type="tel"
                  dir="ltr"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value.replace(/\s+/g, '') })}
                  placeholder="07XXXXXXXX"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:bg-white transition-all text-left text-stone-800"
                />
              </div>
            </div>

            {/* Media Uploads */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-stone-100">
              <div>
                <ImageUploader
                  label="شعار المحل أو اللوجو"
                  folder="logos"
                  value={formData.logoUrl || ''}
                  onChange={url => setFormData({ ...formData, logoUrl: url })}
                  aspectRatio="square"
                  placeholder="اختر ملف الشعار من جهازك"
                />
              </div>

              <div>
                <ImageUploader
                  label="صورة الغلاف الرئيسية"
                  folder="businesses"
                  value={formData.imageUrl || ''}
                  onChange={url => setFormData({ ...formData, imageUrl: url })}
                  aspectRatio="cover"
                  placeholder="اختر صورة الغلاف من جهازك"
                />
              </div>
            </div>

            <div>
              <VideoUploader
                value={formData.coverVideoUrl || ''}
                onChange={url => setFormData({ ...formData, coverVideoUrl: url })}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">رابط خرائط Google</label>
              <input
                type="url"
                dir="ltr"
                value={formData.googlePlaceUrl || ''}
                onChange={e => setFormData({ ...formData, googlePlaceUrl: e.target.value })}
                placeholder="https://maps.app.goo.gl/..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:bg-white transition-all text-left text-stone-800"
              />
            </div>

            {/* Description */}
            <div className="pt-2 border-t border-stone-100">
              <label className="block text-xs font-bold text-stone-700 mb-1">نبذة تعريفية عن المنشأة والخدمات</label>
              <RichTextEditor
                value={formData.description}
                onChange={val => setFormData(prev => ({ ...prev, description: val }))}
                placeholder="اكتب نبذة تعريفية بالمنشأة والمنتجات والخدمات المقدمة..."
              />
            </div>

            {/* Payment Methods */}
            <div className="pt-2 border-t border-stone-100">
              <PaymentMethodsSelector
                value={formData.paymentMethods || ['كاش', 'فيزا', 'كليك']}
                onChange={m => setFormData({ ...formData, paymentMethods: m })}
                className="bg-stone-50 p-3.5 rounded-xl border border-stone-200"
              />
            </div>

            {/* Working Hours & Socials */}
            <WorkingHoursEditor
              workingHours={workingHours}
              onChange={setWorkingHours}
              showVacationToggle={false}
            />

            <SocialLinksEditor
              socialLinks={socialLinks}
              onChange={setSocialLinks}
            />

            {/* Package & Verification Plan */}
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3 pt-2">
              <div className="flex items-center gap-2 font-bold text-stone-900 text-xs sm:text-sm">
                <Crown className="h-4 w-4 text-[#ff9f1c]" />
                <span>باقة الاشتراك وتوثيق المنشأة</span>
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
                    className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs sm:text-sm font-bold text-stone-800"
                  >
                    <option value="golden">الباقة الذهبية (VIP)</option>
                    <option value="basic">الباقة الأساسية</option>
                    <option value="pay_per_use">الدفع حسب الاستخدام</option>
                  </select>
                </div>

                <div className="flex items-center pt-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-800">
                    <input
                      type="checkbox"
                      checked={formData.isVerified}
                      onChange={e => setFormData({ ...formData, isVerified: e.target.checked })}
                      className="w-4 h-4 rounded text-[#1a4d2e]"
                    />
                    <span>توثيق المنشأة بالعلامة الزرقاء الرسمية</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Owner Account Linking */}
            <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2">
              <label className="block text-xs font-bold text-stone-800">
                بيانات ربط حساب المالك (بريد إلكتروني أو رقم هاتف)
              </label>
              <input
                type="text"
                value={formData.ownerContact}
                onChange={e => {
                  setFormData({ ...formData, ownerContact: e.target.value });
                  setContactError('');
                }}
                placeholder="أدخل البريد الإلكتروني أو رقم الهاتف (مثال: 0791234567)"
                className="w-full bg-white border border-amber-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-900"
                dir="ltr"
              />
              {contactError && (
                <p className="text-xs font-bold text-red-600">{contactError}</p>
              )}
            </div>

          </div>

          {/* Footer Actions */}
          <div className="p-3.5 sm:px-6 bg-stone-50 border-t border-stone-200 shrink-0 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-200 font-bold text-xs text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#1a4d2e] hover:bg-[#133b22] text-white font-bold text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isSubmitting ? 'جاري الحفظ...' : 'حفظ وإضافة المحل'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>,
    document.body
  );
}
export default BusinessAddModal;
