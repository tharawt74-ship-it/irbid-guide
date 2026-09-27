import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Tag, 
  Sparkles, 
  Flame, 
  Clock, 
  Calendar, 
  Percent, 
  Check, 
  Phone, 
  MessageCircle, 
  GraduationCap, 
  Image as ImageIcon,
  DollarSign
} from 'lucide-react';
import { Business } from '../../types';
import { db } from '../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { compressAndSanitizeFirestorePayload } from '../../lib/firestoreHelper';
import { sanitizeInput } from '../../lib/security';
import { ImageUploader } from '../ui/ImageUploader';

interface QuickAddOfferModalProps {
  business: Business;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
  isMedical?: boolean;
}

export function QuickAddOfferModal({
  business,
  isOpen,
  onClose,
  onSuccess,
  isMedical = false
}: QuickAddOfferModalProps) {
  const [title, setTitle] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('20');
  const [oldPrice, setOldPrice] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [code, setCode] = useState('');
  const [durationMode, setDurationMode] = useState<'today' | '3days' | 'weekend' | 'week' | 'custom'>('today');
  const [customEndDate, setCustomEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState(business.phone || '');
  const [whatsapp, setWhatsapp] = useState(business.whatsapp || business.phone || '');
  const [imageUrl, setImageUrl] = useState(business.coverImage || business.imageUrl || '');
  const [isHot, setIsHot] = useState(true);
  const [isStudent, setIsStudent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const quickPresets = isMedical ? [
    'خصم 25% على الكشفية والاستشارة الطبية اليوم 🩺',
    'فحص شامل ومجاني مع كل استشارة اليوم ⚡',
    'عرض جلسات العلاج الطبيعي والتأهيل 🌿',
    'خصم 30% على خدمات تنظيف وتبييض الأسنان ✨',
    'خصم خاص للطلاب على الفحوصات المخبرية 🎓'
  ] : [
    'خصم 20% على كامل الطلب اليوم فقط 🔥',
    'عرض نهاية الأسبوع المميز للوجبات العائلية ⚡',
    'اشتري 1 واحصل على الثاني بنصف السعر 🎁',
    'خصم خاص 25% لطلاب الجامعات 🎓',
    'وجبة اليوم الخاصة مع مشروب مجاناً ⭐'
  ];

  const percentagePresets = ['10', '15', '20', '25', '30', '40', '50'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      let computedExpiresIn = 'اليوم فقط (24 ساعة)';
      let expiresAt: number | null = null;
      const now = Date.now();

      if (durationMode === 'today') {
        computedExpiresIn = 'اليوم فقط (24 ساعة)';
        expiresAt = now + 24 * 3600 * 1000;
      } else if (durationMode === '3days') {
        computedExpiresIn = 'لمدة 3 أيام';
        expiresAt = now + 3 * 24 * 3600 * 1000;
      } else if (durationMode === 'weekend') {
        computedExpiresIn = 'عطلة نهاية الأسبوع';
        expiresAt = now + 4 * 24 * 3600 * 1000;
      } else if (durationMode === 'week') {
        computedExpiresIn = 'لمدة أسبوع كامل';
        expiresAt = now + 7 * 24 * 3600 * 1000;
      } else if (durationMode === 'custom' && customEndDate) {
        computedExpiresIn = `حتى تاريخ ${customEndDate}`;
        expiresAt = new Date(customEndDate).getTime() + 24 * 3600 * 1000 - 1;
      }

      const defaultCover = business.coverImage || business.imageUrl || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800';

      const offerPayload: Record<string, any> = {
        title: sanitizeInput(title.trim()),
        businessName: business.name,
        businessId: business.id,
        category: business.category || (isMedical ? 'صحة وطب' : 'عام'),
        discountType,
        discountPercentage: discountType === 'percentage' ? `${discountValue}%` : `${discountValue} د.أ`,
        expiresIn: computedExpiresIn,
        durationMode,
        expiresAt,
        description: sanitizeInput(description.trim()),
        location: business.district ? `${business.district} - ${business.address}` : business.address,
        phone: sanitizeInput(phone.trim() || business.phone || ''),
        whatsapp: sanitizeInput(whatsapp.trim() || business.phone || ''),
        image: imageUrl || defaultCover,
        isHot,
        isStudent,
        createdAt: now
      };

      if (oldPrice.trim()) offerPayload.oldPrice = sanitizeInput(oldPrice.trim());
      if (newPrice.trim()) offerPayload.newPrice = sanitizeInput(newPrice.trim());
      if (code.trim()) offerPayload.code = sanitizeInput(code.trim().toUpperCase());

      if (db) {
        const sanitized = await compressAndSanitizeFirestorePayload(offerPayload, true);
        await addDoc(collection(db, 'offers'), sanitized);
      }

      onSuccess?.('تم نشر العرض والخصم الخاص بنجاح في المنصة! 🎉');
      onClose();
    } catch (err) {
      console.error('Error publishing quick offer:', err);
      alert('حدث خطأ أثناء نشر العرض. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[100000] bg-stone-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden" 
      dir="rtl"
    >
      <div 
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[92dvh] sm:max-h-[88vh] shadow-2xl border border-stone-200 relative animate-in zoom-in-95 duration-200 text-right flex flex-col my-0 sm:my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Elegant White Header (Strictly NO green or gradient) */}
        <div className="bg-white border-b border-stone-200/80 p-4 sm:p-5 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shadow-2xs shrink-0">
              <Tag className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-rose-800 bg-rose-100 border border-rose-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Flame className="h-3 w-3 text-rose-600 fill-rose-500" /> عرض ترويجي مباشر
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-stone-500 truncate max-w-[180px]">
                  {business.name}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-stone-900 mt-0.5">
                إضافة عرض أو خصم خاص اليوم
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* 1. Quick suggestion presets */}
          <div>
            <label className="block text-xs font-bold text-stone-600 mb-2">
              نماذج وأفكار سريعة لنقرها وتعديلها:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {quickPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setTitle(preset)}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-stone-200/80 text-stone-700 transition-all cursor-pointer text-right"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Offer Title */}
          <div>
            <label className="block text-xs font-black text-stone-800 mb-1.5">
              عنوان العرض أو الخصم الجذاب *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: خصم 25% على الوجبات العائلية أو الكشفيات الطبية اليوم"
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs sm:text-sm font-bold text-stone-900 focus:bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-hidden transition-all"
            />
          </div>

          {/* 3. Discount Type & Value */}
          <div className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                <Percent className="h-4 w-4 text-rose-600" />
                <span>قيمة ونوع الخصم</span>
              </label>

              {/* Type Switcher */}
              <div className="flex items-center bg-stone-200/70 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDiscountType('percentage')}
                  className={`text-[11px] font-black px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    discountType === 'percentage'
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  نسبة مئوية (%)
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('fixed')}
                  className={`text-[11px] font-black px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    discountType === 'fixed'
                      ? 'bg-white text-stone-900 shadow-2xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  مبلغ ثابت (د.أ)
                </button>
              </div>
            </div>

            {discountType === 'percentage' ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      placeholder="20"
                      className="w-full px-3.5 py-2 pl-9 bg-white border border-stone-300 rounded-xl text-sm font-black text-stone-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-hidden"
                    />
                    <span className="absolute left-3 top-2.5 text-stone-400 font-black text-sm">%</span>
                  </div>
                </div>

                {/* Quick percentage buttons */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-stone-500 ml-1">أرقام سريعة:</span>
                  {percentagePresets.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setDiscountValue(pct)}
                      className={`text-[10px] font-black px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                        discountValue === pct
                          ? 'bg-rose-600 text-white border-rose-600'
                          : 'bg-white text-stone-700 border-stone-200 hover:border-rose-300'
                      }`}
                    >
                      %{pct}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="مثال: 5"
                  className="w-full px-3.5 py-2 pl-12 bg-white border border-stone-300 rounded-xl text-sm font-black text-stone-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 outline-hidden"
                />
                <span className="absolute left-3 top-2 text-stone-400 font-bold text-xs">دينار</span>
              </div>
            )}

            {/* Optional Prices before & after */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  السعر الأصلي قبل الخصم (اختياري)
                </label>
                <input
                  type="text"
                  value={oldPrice}
                  onChange={(e) => setOldPrice(e.target.value)}
                  placeholder="مثال: 10 د.أ"
                  className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:border-rose-500 outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  السعر الجديد بعد الخصم (اختياري)
                </label>
                <input
                  type="text"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="مثال: 8 د.أ"
                  className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:border-rose-500 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* 4. Duration / Validity */}
          <div>
            <label className="block text-xs font-black text-stone-800 mb-2 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-stone-600" />
              <span>مدة وصلاحية سريان العرض ⏰</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setDurationMode('today')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  durationMode === 'today'
                    ? 'bg-rose-50 border-rose-500 text-rose-900 font-black shadow-2xs'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100 font-bold'
                }`}
              >
                <span className="block text-xs">اليوم فقط ⚡</span>
                <span className="text-[10px] text-stone-500 mt-0.5 block">24 ساعة</span>
              </button>

              <button
                type="button"
                onClick={() => setDurationMode('3days')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  durationMode === '3days'
                    ? 'bg-rose-50 border-rose-500 text-rose-900 font-black shadow-2xs'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100 font-bold'
                }`}
              >
                <span className="block text-xs">3 أيام 📅</span>
                <span className="text-[10px] text-stone-500 mt-0.5 block">محدود ومغري</span>
              </button>

              <button
                type="button"
                onClick={() => setDurationMode('weekend')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  durationMode === 'weekend'
                    ? 'bg-rose-50 border-rose-500 text-rose-900 font-black shadow-2xs'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100 font-bold'
                }`}
              >
                <span className="block text-xs">نهاية الأسبوع 🏖️</span>
                <span className="text-[10px] text-stone-500 mt-0.5 block">خميس، جمعة، سبت</span>
              </button>

              <button
                type="button"
                onClick={() => setDurationMode('week')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  durationMode === 'week'
                    ? 'bg-rose-50 border-rose-500 text-rose-900 font-black shadow-2xs'
                    : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100 font-bold'
                }`}
              >
                <span className="block text-xs">أسبوع كامل 🗓️</span>
                <span className="text-[10px] text-stone-500 mt-0.5 block">7 أيام متتالية</span>
              </button>
            </div>

            {durationMode === 'custom' && (
              <div className="mt-2.5">
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900"
                />
              </div>
            )}
          </div>

          {/* 5. Hot Deal & Student Badges */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-stone-200 bg-stone-50/70 hover:bg-stone-100 cursor-pointer flex-1 transition-colors">
              <input
                type="checkbox"
                checked={isHot}
                onChange={(e) => setIsHot(e.target.checked)}
                className="w-4 h-4 rounded-sm text-rose-600 focus:ring-rose-500 accent-rose-600"
              />
              <span className="text-xs font-bold text-stone-800 flex items-center gap-1">
                <Flame className="h-3.5 w-3.5 text-rose-600" /> عرض ساخن جداً (Hot Deal)
              </span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl border border-stone-200 bg-stone-50/70 hover:bg-stone-100 cursor-pointer flex-1 transition-colors">
              <input
                type="checkbox"
                checked={isStudent}
                onChange={(e) => setIsStudent(e.target.checked)}
                className="w-4 h-4 rounded-sm text-blue-600 focus:ring-blue-500 accent-blue-600"
              />
              <span className="text-xs font-bold text-stone-800 flex items-center gap-1">
                <GraduationCap className="h-3.5 w-3.5 text-blue-600" /> مخصص للطلاب
              </span>
            </label>
          </div>

          {/* 6. Description & Details */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1.5">
              تفاصيل وشروط العرض (اختياري)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب ما يتضمنه العرض، مثل: العرض سارٍ على جميع الطلبات الداخلية والتوصيل أو لحاملي بطاقة الطالب..."
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-medium text-stone-900 focus:bg-white focus:border-rose-500 outline-hidden resize-none"
            />
          </div>

          {/* 7. Contact Details for Inquiries */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-stone-50/80 border border-stone-200/80">
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-stone-500" />
                <span>رقم الهاتف للطلب والاستفسار</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0790000000"
                className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:border-rose-500 outline-hidden"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5 text-stone-500" />
                <span>رقم الواتساب السريع للطلب</span>
              </label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="0790000000"
                className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-800 focus:border-rose-500 outline-hidden"
              />
            </div>
          </div>

          {/* 8. Offer Image */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-stone-700 flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5 text-stone-500" />
                <span>صورة العرض الترويجي</span>
              </label>
              {business.coverImage && (
                <button
                  type="button"
                  onClick={() => setImageUrl(business.coverImage || '')}
                  className="text-[10px] font-bold text-rose-700 hover:underline cursor-pointer"
                >
                  استخدام غلاف {isMedical ? 'المنشأة' : 'المحل'} الحالي
                </button>
              )}
            </div>
            <ImageUploader
              value={imageUrl}
              onChange={setImageUrl}
              folder="offers"
              aspectRatio="cover"
              placeholder="ارفع صورة مميزة للعرض أو اتركها لاستخدام غلاف المحل"
            />
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 sm:px-6 bg-stone-50 border-t border-stone-200/80 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !title.trim()}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-stone-900 hover:bg-black text-white px-7 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all shadow-md cursor-pointer disabled:opacity-50 active:scale-95 min-h-[42px]"
          >
            {isSubmitting ? (
              <span>جاري النشر...</span>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>نشر العرض والخصم في المنصة فوراً 🔥</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
