import React, { useState } from 'react';
import { X, Megaphone, Send, Sparkles, CheckCircle2, Image as ImageIcon, Calendar, Phone, Building2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { isBotSubmission, checkSubmissionRateLimit, recordSubmissionTime, sanitizeInput } from '../lib/security';

interface BannerBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BannerBookingModal({ isOpen, onClose }: BannerBookingModalProps) {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState({
    advertiserName: currentUser?.displayName || '',
    businessName: '',
    contactPhone: '',
    title: '',
    imageUrl: '',
    linkUrl: '',
    durationDays: 7,
    notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [hpValue, setHpValue] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.advertiserName || !formData.contactPhone || !formData.title || !formData.imageUrl) {
      setErrorMessage('يرجى تعبئة كافة الحقول الرئيسية المطلوب علامتها (*)');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    // 1. Honeypot check (Bot protection)
    if (isBotSubmission(hpValue)) {
      // Trick the bot silently by pretending it succeeded
      setIsSuccess(true);
      setIsSubmitting(false);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 3000);
      return;
    }

    // 2. Rate limit check (Prevention of spamming)
    const rateLimit = checkSubmissionRateLimit('banner_submit', 120);
    if (!rateLimit.allowed) {
      setErrorMessage(`يرجى الانتظار ${rateLimit.timeLeft} ثانية قبل حجز إعلان آخر لمنع الرسائل التلقائية العشوائية.`);
      setIsSubmitting(false);
      return;
    }

    try {
      // 3. Sanitize inputs to prevent script injection & HTML spam
      const requestData = {
        advertiserName: sanitizeInput(formData.advertiserName),
        businessName: formData.businessName ? sanitizeInput(formData.businessName) : sanitizeInput(formData.advertiserName),
        contactPhone: sanitizeInput(formData.contactPhone),
        title: sanitizeInput(formData.title),
        imageUrl: sanitizeInput(formData.imageUrl),
        linkUrl: formData.linkUrl ? sanitizeInput(formData.linkUrl) : '',
        durationDays: Number(formData.durationDays) || 7,
        notes: formData.notes ? sanitizeInput(formData.notes) : '',
        status: 'pending',
        createdAt: Date.now(),
        userId: currentUser?.uid || 'guest',
      };

      if (db) {
        await addDoc(collection(db, 'bannerBookingRequests'), requestData);
      }

      // 4. Record successful submission timestamp for rate limiting
      recordSubmissionTime('banner_submit');

      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 3000);
    } catch (err) {
      console.error('Error submitting banner booking request:', err);
      setErrorMessage('حدث خطأ أثناء تقديم الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-t-[32px] sm:rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative max-h-[92vh] overflow-y-auto space-y-5 text-right animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto -mt-2 mb-4 sm:hidden" />

        <button
          onClick={onClose}
          className="absolute top-5 left-5 p-2 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-500/20 shrink-0">
            <Megaphone className="h-6 w-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-amber-200">
              <Sparkles className="h-3 w-3 text-amber-600" />
              <span>إعلان مخصص في أعلى الموقع</span>
            </div>
            <h3 className="text-xl font-black text-stone-900 mt-0.5">حجز بانر إعلاني مباشر</h3>
          </div>
        </div>

        {isSuccess ? (
          <div className="py-8 text-center space-y-3 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="h-10 w-10" />
            </div>
            <h4 className="text-xl font-black text-stone-900">تم استلام طلب الإعلان بنجاح!</h4>
            <p className="text-xs text-stone-600 leading-relaxed max-w-xs mx-auto">
              سيقوم فريق "شو في بإربد" بمراجعة الإعلان والتواصل معكم على رقم الهاتف المرفق لتأكيد الاعتماد والنشر.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Honeypot field - 100% hidden from humans, bots will fill it */}
            <div className="absolute opacity-0 -z-50 pointer-events-none" style={{ width: 0, height: 0, overflow: 'hidden' }}>
              <label htmlFor="banner_website_hp">لا تقم بتعبئة هذا الحقل إذا كنت بشراً</label>
              <input
                type="text"
                id="banner_website_hp"
                name="banner_website_hp"
                tabIndex={-1}
                autoComplete="off"
                value={hpValue}
                onChange={(e) => setHpValue(e.target.value)}
              />
            </div>
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold">
                {errorMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">اسم المعلن / المسؤول *</label>
                <input
                  type="text"
                  required
                  value={formData.advertiserName}
                  onChange={(e) => setFormData({ ...formData, advertiserName: e.target.value })}
                  placeholder="مثال: أحمد العلي"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">اسم المحل / المنشأة</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    placeholder="مثال: مطعم الشرق"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none pl-9"
                  />
                  <Building2 className="h-4 w-4 text-stone-400 absolute left-3 top-3" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">رقم الهاتف للتواصل والواتساب *</label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    dir="ltr"
                    value={formData.contactPhone}
                    onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                    placeholder="0790000000"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none pr-9 text-right"
                  />
                  <Phone className="h-4 w-4 text-stone-400 absolute right-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">مدة الإعلان المطلوبة</label>
                <div className="relative">
                  <select
                    value={formData.durationDays}
                    onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white pr-9"
                  >
                    <option value={3}>3 أيام (سريع)</option>
                    <option value={7}>أسبوع كامل (7 أيام)</option>
                    <option value={14}>أسبوعين (14 يوم)</option>
                    <option value={30}>شهر كامل (30 يوم)</option>
                  </select>
                  <Calendar className="h-4 w-4 text-stone-400 absolute right-3 top-3" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">عنوان الإعلان الرئيسي *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="مثال: خصم 30% بمناسبة افتتاح الفرع الجديد!"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">رابط صورة البانر الإعلاني (Image URL) *</label>
              <div className="relative">
                <input
                  type="url"
                  required
                  dir="ltr"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none pl-9 text-left"
                />
                <ImageIcon className="h-4 w-4 text-stone-400 absolute left-3 top-3" />
              </div>
              <p className="text-[10px] text-stone-500 mt-1">مقاس ينصح به: 1200x400 بكسل بحجم أفقي واضح.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">رابط التوجيه المباشر عند النقر (اختياري)</label>
              <input
                type="url"
                dir="ltr"
                value={formData.linkUrl}
                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                placeholder="رابط صفحة المحل، المنيو، أو الواتساب"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none text-left"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>جاري إرسال الطلب...</span>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>تقديم طلب حجز البانر الآن</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
