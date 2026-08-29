import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Building2, Sparkles, Send, DollarSign, Clock, Calendar, 
  Crown, Shield, Check, Phone, MessageSquare, Plus, AlertCircle
} from 'lucide-react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { HousingItem } from '../../types';
import { sanitizeInput, checkSubmissionRateLimit, recordSubmissionTime, executeReCaptcha } from '../../lib/security';
import { getWhatsAppUrl } from '../../lib/contactHelper';

interface HousingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: (savedListing: HousingItem) => void;
  initialListing?: HousingItem | null;
  currentUser: any;
  isAdmin?: boolean;
}

export function HousingFormModal({
  isOpen,
  onClose,
  onSaveSuccess,
  initialListing,
  currentUser,
  isAdmin
}: HousingFormModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    type: 'سكن طالبات' as any,
    university: 'اليرموك' as any,
    price: '',
    pricePeriod: 'شهري' as any,
    location: '',
    distanceToCampus: '',
    roomsCount: '',
    servicesString: '',
    description: '',
    contactPhone: '',
    contactWhatsapp: '',
    ownerName: '',
    image: '',
    extraWeeks: 0,
    featuredDays: 0
  });

  const [hpValue, setHpValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialListing) {
      setFormData({
        title: initialListing.title || '',
        type: initialListing.type || 'سكن طالبات',
        university: initialListing.university || 'اليرموك',
        price: initialListing.price ? String(initialListing.price) : '',
        pricePeriod: initialListing.pricePeriod || 'شهري',
        location: initialListing.location || '',
        distanceToCampus: initialListing.distanceToCampus || '',
        roomsCount: initialListing.roomsCount || '',
        servicesString: initialListing.services ? initialListing.services.join('، ') : '',
        description: initialListing.description || '',
        contactPhone: initialListing.contactPhone || '',
        contactWhatsapp: initialListing.contactWhatsapp || '',
        ownerName: initialListing.ownerName || '',
        image: initialListing.image || '',
        extraWeeks: initialListing.extraWeeks || 0,
        featuredDays: initialListing.featuredDays || 0
      });
    } else {
      setFormData({
        title: '',
        type: 'سكن طالبات',
        university: 'اليرموك',
        price: '',
        pricePeriod: 'شهري',
        location: '',
        distanceToCampus: '',
        roomsCount: '',
        servicesString: '',
        description: '',
        contactPhone: currentUser?.phone || '',
        contactWhatsapp: currentUser?.phone || '',
        ownerName: currentUser?.displayName || '',
        image: '',
        extraWeeks: 0,
        featuredDays: 0
      });
    }
    setErrorMsg(null);
  }, [initialListing, isOpen, currentUser]);

  if (!isOpen) return null;

  // Pricing Logic:
  // Base duration: 2 days FREE (0 JOD)
  // Extra duration: 2 JOD per week after 2 days
  // Featured status: 1 JOD for every 3 days
  const durationFee = formData.extraWeeks * 2;
  const featuredFee = Math.round((formData.featuredDays / 3) * 1);
  const totalFee = durationFee + featuredFee;
  const totalDays = 2 + (formData.extraWeeks * 7);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hpValue) return; // Honeypot bot protection
    setErrorMsg(null);

    if (!formData.title || !formData.price || !formData.location || !formData.contactPhone) {
      setErrorMsg('يرجى ملء جميع الحقول المطلوبة التي تحمل إشارة (*)');
      return;
    }

    if (!initialListing) {
      const rateLimit = checkSubmissionRateLimit('housing_submit', 60);
      if (!rateLimit.allowed) {
        setErrorMsg(`يرجى الانتظار ${rateLimit.timeLeft} ثانية قبل إضافة إعلان آخر.`);
        return;
      }
      try {
        await executeReCaptcha('housing_submit');
      } catch (rcError) {
        console.warn("reCAPTCHA execution skipped:", rcError);
      }
    }

    setSubmitting(true);
    try {
      const services = formData.servicesString
        ? formData.servicesString.split('،').map(s => sanitizeInput(s.trim())).filter(Boolean)
        : ['ماء وكهرباء', 'إنترنت سريع'];

      const image = formData.image || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80';

      const now = Date.now();
      const expiryDate = now + (totalDays * 24 * 60 * 60 * 1000);
      const featuredExpiryDate = formData.featuredDays > 0 ? now + (formData.featuredDays * 24 * 60 * 60 * 1000) : 0;

      const payload = {
        title: sanitizeInput(formData.title),
        type: formData.type,
        university: formData.university,
        price: Number(formData.price),
        pricePeriod: formData.pricePeriod,
        location: sanitizeInput(formData.location),
        distanceToCampus: sanitizeInput(formData.distanceToCampus) || 'قريب من الخدمات والمواصلات',
        roomsCount: sanitizeInput(formData.roomsCount) || 'أستوديو / شقة مفروشة',
        services,
        description: sanitizeInput(formData.description) || 'لا يوجد وصف إضافي مكتوب حالياً من المالك.',
        contactPhone: sanitizeInput(formData.contactPhone),
        contactWhatsapp: formData.contactWhatsapp ? sanitizeInput(formData.contactWhatsapp) : sanitizeInput(formData.contactPhone),
        ownerName: sanitizeInput(formData.ownerName) || 'مالك العقار',
        image,
        isVerified: initialListing?.isVerified || false,
        isFeatured: formData.featuredDays > 0,
        extraWeeks: formData.extraWeeks,
        featuredDays: formData.featuredDays,
        totalFee,
        status: (isAdmin ? 'approved' : 'pending') as 'approved' | 'pending',
        paymentStatus: (totalFee === 0 ? 'free' : (isAdmin ? 'paid' : 'pending')) as 'free' | 'paid' | 'pending',
        userId: currentUser?.uid || initialListing?.userId || 'guest',
        userEmail: currentUser?.email || initialListing?.userEmail || '',
        createdAt: initialListing?.createdAt || now,
        expiryDate,
        featuredExpiryDate,
        approvedAt: isAdmin ? (initialListing?.approvedAt || now) : 0
      };

      let savedListing: HousingItem;

      if (db) {
        if (initialListing?.id) {
          const docRef = doc(db, 'housings', initialListing.id);
          await updateDoc(docRef, payload);
          savedListing = { id: initialListing.id, ...payload };
        } else {
          const docRef = await addDoc(collection(db, 'housings'), payload);
          savedListing = { id: docRef.id, ...payload };
          recordSubmissionTime('housing_submit');
        }
      } else {
        savedListing = { id: initialListing?.id || 'h_user_' + Date.now(), ...payload };
      }

      onSaveSuccess(savedListing);
      onClose();
    } catch (err) {
      console.error("Error saving housing listing:", err);
      setErrorMsg("حدث خطأ أثناء حفظ الإعلان، يرجى المحاولة مرة أخرى.");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto" dir="rtl">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden my-8 border border-stone-200 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-gradient-to-l from-[#1a4d2e] to-[#133b22] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#ff9f1c]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg">
                {initialListing ? 'تعديل بيانات العقار / تمديد العرض' : 'إضافة إعلان عن شقة أو سكن'}
              </h3>
              <p className="text-xs text-stone-200">ادخل بيانات السكن، مدة الإعلان والخطة المطلوبة</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs font-bold text-stone-700">
          
          {/* Honeypot for bots */}
          <div className="absolute opacity-0 -z-50 pointer-events-none" style={{ width: 0, height: 0, overflow: 'hidden' }}>
            <label htmlFor="housing_hp">لا تقم بتعبئة هذا الحقل</label>
            <input
              type="text"
              id="housing_hp"
              value={hpValue}
              onChange={(e) => setHpValue(e.target.value)}
              tabIndex={-1}
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="space-y-3 bg-stone-50 p-4 rounded-2xl border border-stone-200/80">
            <h4 className="text-xs font-black text-[#1a4d2e] flex items-center gap-1.5 border-b border-stone-200 pb-2">
              <Building2 className="h-4 w-4 text-[#ff9f1c]" />
              <span>معلومات السكن والعقار</span>
            </h4>

            <div className="space-y-1">
              <label className="block text-stone-600">عنوان الإعلان الأساسي *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="مثال: سكن الوردة لطالبات العلوم والتكنولوجيا (قرب البوابة)"
                className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-stone-800 font-bold focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-stone-600">نوع العقار/السكن *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-800 font-bold focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
                >
                  <option value="سكن طالبات">سكن طالبات</option>
                  <option value="سكن طلاب">سكن طلاب</option>
                  <option value="أستوديو مفروش">أستوديو مفروش</option>
                  <option value="شقق عائلية">شقق عائلية</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-stone-600">الجامعة الأقرب *</label>
                <select
                  value={formData.university}
                  onChange={(e) => setFormData({ ...formData, university: e.target.value as any })}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-800 font-bold focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
                >
                  <option value="اليرموك">جامعة اليرموك</option>
                  <option value="العلوم والتكنولوجيا">جامعة العلوم والتكنولوجيا (JUST)</option>
                  <option value="أخرى / وسط المدينة">أخرى / وسط إربد</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-stone-600 font-bold">الأجرة المطلوبة (بالدينار الأردني) *</label>
                <input
                  type="number"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="مثال: 130"
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-800 font-bold focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-stone-600 font-bold">فترة الأجرة *</label>
                <select
                  value={formData.pricePeriod}
                  onChange={(e) => setFormData({ ...formData, pricePeriod: e.target.value as any })}
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-800 font-bold focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
                >
                  <option value="شهري">شهري</option>
                  <option value="فصلي">فصلي</option>
                  <option value="سنوي">سنوي</option>
                  <option value="يومي">يومي</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-stone-600">الموقع والتفاصيل الجغرافية *</label>
              <input
                type="text"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="مثال: إربد، شارع الجامعة، خلف الدوار السداسي"
                className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-stone-800 font-bold focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-stone-600">القرب من الجامعة</label>
                <input
                  type="text"
                  value={formData.distanceToCampus}
                  onChange={(e) => setFormData({ ...formData, distanceToCampus: e.target.value })}
                  placeholder="مثال: 3 دقائق مشياً من البوابة"
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-800 font-bold focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-stone-600 font-bold">تقسيم الغرف</label>
                <input
                  type="text"
                  value={formData.roomsCount}
                  onChange={(e) => setFormData({ ...formData, roomsCount: e.target.value })}
                  placeholder="مثال: أستوديو مفرد أو غرفة ثنائية"
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-stone-800 font-bold focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-stone-600 font-bold">المرافق والخدمات (افصل بـ "،")</label>
              <input
                type="text"
                value={formData.servicesString}
                onChange={(e) => setFormData({ ...formData, servicesString: e.target.value })}
                placeholder="مثال: حراسة، إنترنت فايبر، تكييف، كهرباء مشمولة"
                className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-stone-800 font-bold focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-stone-600 font-bold">وصف مفصل للعقار</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                placeholder="اكتب تفاصيل إضافية تهم المستأجر (نوع الأثاث، المطبخ، النظافة...)"
                className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-stone-800 font-bold focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="block text-stone-600 font-bold">اسم المعلن *</label>
                <input
                  type="text"
                  required
                  value={formData.ownerName}
                  onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                  placeholder="أبو أحمد"
                  className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-2 text-stone-800 font-bold focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-stone-600 font-bold">رقم الاتصال *</label>
                <input
                  type="tel"
                  required
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  placeholder="07XXXXXXXX"
                  className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-2 text-stone-800 font-bold text-left focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-stone-600 font-bold">الواتساب</label>
                <input
                  type="tel"
                  value={formData.contactWhatsapp}
                  onChange={(e) => setFormData({ ...formData, contactWhatsapp: e.target.value })}
                  placeholder="07XXXXXXXX"
                  className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-2 text-stone-800 font-bold text-left focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-stone-600 font-bold">رابط صورة العقار (اختياري)</label>
              <input
                type="url"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-stone-800 font-bold focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
                dir="ltr"
              />
            </div>
          </div>

          {/* Section 2: Duration & Paid Feature Calculator - Completely Redesigned */}
          <div className="space-y-4 bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#1a4d2e] flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-stone-900">مدة بقاء الإعلان وتمييزه</h4>
                  <p className="text-[11px] text-stone-500 font-medium">اختر المدة المناسبة لعرض إعلانك أمام آلاف الطلاب والمستأجرين</p>
                </div>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-[11px] font-black px-2.5 py-1 rounded-full border border-emerald-200/60 shrink-0">
                🎁 أول يومين مجاناً
              </span>
            </div>

            {/* Step 1: Duration Cards */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-stone-800">
                ١. اختر مدة نشر الإعلان على الموقع:
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[
                  {
                    weeks: 0,
                    daysText: '2 يوم',
                    subText: 'أول يومين',
                    priceText: 'مجاناً 0 د.أ',
                    badge: 'تجربة مجانية 🎁',
                    isFree: true,
                    isPopular: false
                  },
                  {
                    weeks: 1,
                    daysText: '9 أيام',
                    subText: 'أسبوع + يومين',
                    priceText: '2 دينار',
                    badge: 'اقتصادي ⚡',
                    isFree: false,
                    isPopular: false
                  },
                  {
                    weeks: 2,
                    daysText: '16 يوم',
                    subText: 'أسبوعين + يومين',
                    priceText: '4 دنانير',
                    badge: 'تغطية مناسبة 👍',
                    isFree: false,
                    isPopular: false
                  },
                  {
                    weeks: 4,
                    daysText: '30 يوم',
                    subText: 'شهر كامل',
                    priceText: '8 دنانير',
                    badge: 'الأكثر طلباً 🔥',
                    isFree: false,
                    isPopular: true
                  }
                ].map((plan) => {
                  const isSelected = formData.extraWeeks === plan.weeks;
                  return (
                    <button
                      key={plan.weeks}
                      type="button"
                      onClick={() => setFormData({ ...formData, extraWeeks: plan.weeks })}
                      className={`relative flex flex-col items-center justify-between p-3 rounded-2xl border-2 transition-all text-center cursor-pointer ${
                        isSelected
                          ? 'border-[#1a4d2e] bg-emerald-50/70 shadow-sm ring-2 ring-[#1a4d2e]/20'
                          : 'border-stone-200 hover:border-stone-300 bg-white hover:bg-stone-50/50'
                      }`}
                    >
                      {/* Top Badge */}
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full mb-1.5 ${
                        plan.isPopular 
                          ? 'bg-amber-500 text-white shadow-2xs' 
                          : plan.isFree 
                            ? 'bg-emerald-600 text-white' 
                            : isSelected ? 'bg-emerald-200 text-emerald-900' : 'bg-stone-100 text-stone-600'
                      }`}>
                        {plan.badge}
                      </span>

                      {/* Days count */}
                      <span className="text-base font-black text-stone-900 leading-tight">
                        {plan.daysText}
                      </span>
                      <span className="text-[10px] text-stone-500 font-bold mb-2">
                        {plan.subText}
                      </span>

                      {/* Price pill */}
                      <div className={`w-full py-1 px-2 rounded-xl text-xs font-black transition-colors ${
                        isSelected 
                          ? 'bg-[#1a4d2e] text-white' 
                          : plan.isFree 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-stone-100 text-stone-700'
                      }`}>
                        {plan.priceText}
                      </div>

                      {/* Selected Check Icon */}
                      {isSelected && (
                        <div className="absolute -top-2 -left-2 w-5 h-5 bg-[#1a4d2e] text-white rounded-full flex items-center justify-center shadow-sm">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Featured Promotion Boost */}
            <div className="space-y-2 pt-2 border-t border-stone-200/80">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                  <Crown className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span>٢. تمييز وتثبيت الإعلان في صدارة نتائج البحث (اختياري):</span>
                </label>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                  1 دينار / 3 أيام
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { days: 0, label: 'بدون تمييز', price: '0 د.أ', icon: null },
                  { days: 3, label: '3 أيام تمييز', price: '+1 د.أ', icon: '⭐' },
                  { days: 6, label: '6 أيام تمييز', price: '+2 د.أ', icon: '⭐⭐' },
                  { days: 15, label: '15 يوم تمييز', price: '+5 د.أ', icon: '👑' },
                ].map((feat) => {
                  const isSelected = formData.featuredDays === feat.days;
                  return (
                    <button
                      key={feat.days}
                      type="button"
                      onClick={() => setFormData({ ...formData, featuredDays: feat.days })}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50 shadow-2xs ring-1 ring-amber-400 font-black text-amber-900'
                          : 'border-stone-200 hover:border-stone-300 bg-white text-stone-700 font-bold'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-right">
                        {feat.icon && <span className="text-xs">{feat.icon}</span>}
                        <span className="text-xs">{feat.label}</span>
                      </div>
                      <span className={`text-[11px] px-1.5 py-0.5 rounded-md ${
                        isSelected ? 'bg-amber-200/80 text-amber-900 font-black' : 'bg-stone-100 text-stone-500'
                      }`}>
                        {feat.price}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Clear Invoice & Total Summary */}
            <div className="bg-white p-4 rounded-2xl border border-stone-200/90 shadow-2xs space-y-3 mt-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
                <div className="space-y-1">
                  <div className="text-xs text-stone-500 font-bold">
                    إجمالي فترة النشر: <b className="text-stone-800">{totalDays} يوم</b>
                    {durationFee > 0 ? ` (${durationFee} د.أ)` : ' (أول يومين مجاناً 🎁)'}
                  </div>
                  <div className="text-xs text-stone-500 font-bold">
                    حالة التمييز في الصدارة: {formData.featuredDays > 0 ? (
                      <b className="text-amber-700">مميز لمدة {formData.featuredDays} يوم ({featuredFee} د.أ)</b>
                    ) : (
                      <span className="text-stone-400">إعلان عادي بدون تمييز</span>
                    )}
                  </div>
                </div>

                <div className="text-left sm:text-right bg-stone-50 sm:bg-transparent p-2.5 sm:p-0 rounded-xl">
                  <div className="text-[11px] text-stone-500 font-bold">المبلغ المطلوب للدفع:</div>
                  <div className="text-xl font-black text-[#1a4d2e]">
                    {totalFee > 0 ? `${totalFee} دينار أردني` : '0 دينار (مجاناً 🎁)'}
                  </div>
                </div>
              </div>

              {totalFee > 0 ? (
                <div className="flex items-start gap-2.5 bg-amber-50/90 text-amber-950 p-3 rounded-xl border border-amber-200/80 text-[11px] font-bold leading-relaxed">
                  <span className="text-base shrink-0">🤝</span>
                  <span>
                    <b>خطوات الاعتماد والتفعيل:</b> عند إرسال الطلب، ستتم مراجعته من قبل إدارة المنصة، وسيقوم فريق الإدارة بالتواصل معك مباشرة عبر الهاتف أو الواتساب لتأكيد تفاصيل الإعلان وتأكيد استلام الرسوم ({totalFee} د.أ) ثم اعتماد ونشر الإعلان فوراً.
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 bg-emerald-50 text-emerald-900 p-3 rounded-xl border border-emerald-200/70 text-[11px] font-bold leading-relaxed">
                  <span className="text-base shrink-0">✨</span>
                  <span>
                    <b>طلب نشر مجاني (يومان):</b> سيتم إرسال الإعلان لإدارة المنصة للتدقيق والموافقة وسيتواصل معك الفريق عبر الواتساب/الهاتف عند الحاجة.
                  </span>
                </div>
              )}
            </div>

          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white font-black text-sm rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span>
                  {isAdmin 
                    ? 'حفظ ونشر الإعلان فوراً (كإدارة)' 
                    : (totalFee > 0 
                        ? `إرسال طلب نشر الإعلان للإدارة (${totalFee} د.أ)` 
                        : 'إرسال طلب نشر الإعلان للإدارة (مجاناً)')}
                </span>
              </>
            )}
          </button>
        </form>

      </div>
    </div>,
    document.body
  );
}
