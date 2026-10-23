import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  PhoneCall, 
  MessageCircle, 
  Phone, 
  Check, 
  ExternalLink, 
  Sparkles, 
  Globe, 
  Instagram, 
  Facebook,
  ShieldCheck
} from 'lucide-react';
import { Business } from '../../types';
import { getWhatsAppUrl } from '../../lib/contactHelper';

interface QuickContactModalProps {
  business: Business;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<Business>) => Promise<void> | void;
  isMedical?: boolean;
}

export function QuickContactModal({
  business,
  isOpen,
  onClose,
  onSave,
  isMedical = false
}: QuickContactModalProps) {
  const [phone, setPhone] = useState(business.phone || '');
  const [whatsapp, setWhatsapp] = useState(business.whatsapp || business.phone || '');
  const [secondaryPhone, setSecondaryPhone] = useState(business.ownerPhone || business.ownerContact || '');
  const [instagram, setInstagram] = useState(business.socialLinks?.instagram || '');
  const [facebook, setFacebook] = useState(business.socialLinks?.facebook || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const testWhatsAppUrl = whatsapp.trim() 
    ? getWhatsAppUrl(whatsapp.trim(), `السلام عليكم، تجربة تواصل مع ${business.name} عبر منصة شو في بإربد`)
    : '#';

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updates: Partial<Business> = {
        phone: phone.trim(),
        whatsapp: whatsapp.trim() || phone.trim(),
        ownerPhone: secondaryPhone.trim(),
        socialLinks: {
          ...business.socialLinks,
          instagram: instagram.trim(),
          facebook: facebook.trim(),
          whatsapp: whatsapp.trim() || phone.trim()
        }
      };

      // Also sync medical profile emergency phone if medical
      if (isMedical && business.medicalProfile) {
        updates.medicalProfile = {
          ...business.medicalProfile,
          emergencyPhone: secondaryPhone.trim() || business.medicalProfile.emergencyPhone
        };
      }

      await onSave(updates);
      onClose();
    } catch (err) {
      console.error('Error saving quick contact info:', err);
      alert('حدث خطأ أثناء حفظ أرقام التواصل. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[100000] bg-stone-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden" 
      dir="rtl"
    >
      <div 
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92dvh] sm:max-h-[85vh] shadow-2xl border border-stone-200 relative animate-in zoom-in-95 duration-200 text-right flex flex-col my-0 sm:my-auto overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Elegant White Header (Strictly NO green or gradient) */}
        <div className="bg-white border-b border-stone-200/80 p-4 sm:p-5 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-blue-600 shadow-2xs shrink-0">
              <PhoneCall className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-blue-800 bg-blue-100 border border-blue-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                  📞 أرقام الاتصال والتواصل المباشر
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-stone-500 truncate max-w-[160px]">
                  {business.name}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-stone-900 mt-0.5">
                أرقام التواصل والواتساب السريع
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

        {/* Notice Info Bar */}
        <div className="bg-stone-50 px-4 py-2.5 border-b border-stone-200/80 flex items-center gap-2 text-xs font-medium text-stone-600">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>تظهر هذه الأرقام فوراً لأي زبون أو مراجع يضغط على أزرار الاتصال والمراسلة.</span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* 1. WhatsApp Number */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/40 border border-emerald-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                <MessageCircle className="h-4 w-4 text-emerald-700" />
                <span>رقم الواتساب المباشر للطلبات والاستفسارات *</span>
              </label>

              {whatsapp.trim() && (
                <a
                  href={testWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 bg-white border border-emerald-300 px-2 py-0.5 rounded-lg shadow-2xs hover:bg-emerald-50 transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span>تجربة الرقم</span>
                </a>
              )}
            </div>

            <div className="relative">
              <input
                type="tel"
                required
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="مثال: 0791234567 أو 962791234567"
                dir="ltr"
                className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl text-sm font-black text-stone-900 text-right focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 outline-hidden"
              />
            </div>
            <p className="text-[11px] text-emerald-800 font-medium">
              💡 تُوجّه رسائل طلبات المنيو، حجز الكشفيات، واستفسارات العروض مباشرة إلى هذا الرقم.
            </p>
          </div>

          {/* 2. Direct Phone Call Number */}
          <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                <Phone className="h-4 w-4 text-blue-600" />
                <span>رقم الهاتف المباشر للاتصال الصوتي *</span>
              </label>

              {phone.trim() && (
                <a
                  href={`tel:${phone.trim()}`}
                  className="text-[11px] font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 bg-white border border-blue-300 px-2 py-0.5 rounded-lg shadow-2xs hover:bg-blue-50 transition-colors"
                >
                  <PhoneCall className="h-3 w-3" />
                  <span>اتصال تجريبي</span>
                </a>
              )}
            </div>

            <div className="relative">
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="مثال: 0780000000 أو 027200000"
                dir="ltr"
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm font-black text-stone-900 text-right focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 outline-hidden"
              />
            </div>
            <p className="text-[11px] text-stone-500 font-medium">
              يُستخدم عند ضغط الزائر على زر "اتصال هاتفي" ببطاقة المحل وصفحته الرئيسية.
            </p>
          </div>

          {/* 3. Secondary Phone / Landline (Optional) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-stone-700 flex items-center gap-1.5">
              <span>رقم هاتف إضافي أو هاتف أرضي / طوارئ (اختياري)</span>
            </label>
            <input
              type="tel"
              value={secondaryPhone}
              onChange={(e) => setSecondaryPhone(e.target.value)}
              placeholder="مثال: 027244444 أو رقم المدير"
              dir="ltr"
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 text-right focus:bg-white focus:border-stone-500 outline-hidden"
            />
          </div>

          {/* 4. Quick Social Media Links (Optional) */}
          <div className="pt-2 border-t border-stone-200/80 space-y-3">
            <span className="text-xs font-black text-stone-800 block">
              روابط التواصل الاجتماعي السريعة (اختياري)
            </span>

            {/* Instagram */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-pink-50 border border-pink-200 flex items-center justify-center text-pink-600 shrink-0">
                <Instagram className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="رابط أو يوزر الإنستغرام (e.g. instagram.com/username)"
                dir="ltr"
                className="flex-1 px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 text-right focus:bg-white focus:border-pink-500 outline-hidden"
              />
            </div>

            {/* Facebook */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                <Facebook className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={facebook}
                onChange={(e) => setFacebook(e.target.value)}
                placeholder="رابط صفحة الفيسبوك (e.g. facebook.com/page)"
                dir="ltr"
                className="flex-1 px-3 py-2 bg-stone-50 border border-stone-300 rounded-xl text-xs font-bold text-stone-900 text-right focus:bg-white focus:border-blue-500 outline-hidden"
              />
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="p-4 sm:px-6 bg-stone-50 border-t border-stone-200/80 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 font-bold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !phone.trim()}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 bg-stone-900 hover:bg-black text-white px-7 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all shadow-md cursor-pointer disabled:opacity-50 active:scale-95 min-h-[42px]"
          >
            {isSaving ? (
              <span>جاري الحفظ...</span>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>حفظ وتحديث الأرقام فوراً ✨</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
