import React, { useState, useEffect } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { BUSINESS_CATEGORIES, MainCategory, IRBID_REGIONS_CATEGORIZED } from '../lib/categories';
import { Store, CheckCircle2, Crown, Zap, Sparkles, Check, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { WorkingHoursEditor } from '../components/ui/WorkingHoursEditor';
import { SocialLinksEditor } from '../components/ui/SocialLinksEditor';
import { SocialLinks, WorkingHours } from '../types';
import { SEO } from '../components/common/SEO';
import { ImageUploader } from '../components/ui/ImageUploader';
import { isBotSubmission, checkSubmissionRateLimit, recordSubmissionTime, sanitizeInput, executeReCaptcha } from '../lib/security';

const PACKAGES_INFO = {
  basic: {
    id: 'basic',
    name: 'الباقة الأساسية',
    nameEn: 'Basic Tier',
    slogan: 'الظهور الرقمي الذكي والوصول لزبائن إربد',
    icon: Store,
    badgeColor: 'bg-stone-100 text-stone-700 border-stone-300',
    accentColor: 'text-[#1a4d2e]'
  },
  golden: {
    id: 'golden',
    name: 'الباقة الذهبية (VIP)',
    nameEn: 'Golden / VIP Tier',
    slogan: 'إدارة متكاملة، مبيعات أكثر، وتفاعل مباشر مع الزبائن',
    icon: Crown,
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    accentColor: 'text-[#ff9f1c]',
    isPopular: true
  },
  pay_per_use: {
    id: 'pay_per_use',
    name: 'الدفع حسب الاستخدام',
    nameEn: 'Pay Per Use',
    slogan: 'ترويج فوري للوصول إلى آلاف الزبائن في مواسمك وعروضك الكبرى',
    icon: Zap,
    badgeColor: 'bg-orange-100 text-orange-800 border-orange-300',
    accentColor: 'text-orange-600'
  }
};

export function Contact() {
  const { currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const urlPackage = searchParams.get('package');

  const [selectedPackage, setSelectedPackage] = useState<'basic' | 'golden' | 'pay_per_use'>(
    urlPackage === 'golden' ? 'golden' : urlPackage === 'pay_per_use' ? 'pay_per_use' : 'golden'
  );

  useEffect(() => {
    if (urlPackage === 'basic' || urlPackage === 'golden' || urlPackage === 'pay_per_use') {
      setSelectedPackage(urlPackage);
    }
  }, [urlPackage]);

  const [formData, setFormData] = useState({
    name: '',
    ownerName: '',
    mainCategory: Object.keys(BUSINESS_CATEGORIES)[0] as MainCategory,
    subCategory: BUSINESS_CATEGORIES[Object.keys(BUSINESS_CATEGORIES)[0] as MainCategory][0],
    phone: '',
    address: '',
    district: 'شارع الجامعة',
    imageUrl: '',
    googlePlaceUrl: '',
    description: '',
    socialMedia: '',
    additionalNotes: ''
  });
  
  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    isOpen24Hours: false,
    openTime: '09:00',
    closeTime: '23:00',
    days: 'طوال أيام الأسبوع',
    isCustomClosed: false
  });

  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [hpValue, setHpValue] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 1. Honeypot check (Bot protection)
    if (isBotSubmission(hpValue)) {
      // Trick the bot by showing a successful submission page, without saving to database!
      setSuccess(true);
      setLoading(false);
      return;
    }

    // 2. Rate limit check (Prevention of spamming)
    const rateLimit = checkSubmissionRateLimit('contact_submit', 120);
    if (!rateLimit.allowed) {
      setError(`يرجى الانتظار ${rateLimit.timeLeft} ثانية قبل تقديم طلب آخر لمنع المراسلات العشوائية.`);
      setLoading(false);
      return;
    }

    // 2.5 Run Invisible Google reCAPTCHA v3 checking
    try {
      await executeReCaptcha('contact_submit');
    } catch (rcError) {
      console.warn("⚠️ reCAPTCHA execution skipped or failed:", rcError);
    }
    
    if (!db) {
      setError('يرجى إعداد قاعدة بيانات Firebase أولاً');
      setLoading(false);
      return;
    }
    
    try {
      // 3. Sanitize inputs to prevent script injection & HTML spam
      const sanitizedData = {
        name: sanitizeInput(formData.name),
        ownerName: sanitizeInput(formData.ownerName),
        mainCategory: formData.mainCategory,
        subCategory: formData.subCategory,
        phone: sanitizeInput(formData.phone),
        address: sanitizeInput(formData.address),
        district: formData.district,
        imageUrl: sanitizeInput(formData.imageUrl),
        googlePlaceUrl: sanitizeInput(formData.googlePlaceUrl),
        description: sanitizeInput(formData.description),
        socialMedia: sanitizeInput(formData.socialMedia),
        additionalNotes: sanitizeInput(formData.additionalNotes)
      };

      await addDoc(collection(db, 'businessRequests'), {
        userId: currentUser?.uid || null,
        userEmail: currentUser?.email || null,
        ...sanitizedData,
        workingHours,
        socialLinks,
        packagePlan: selectedPackage,
        category: formData.subCategory,
        createdAt: Date.now(),
        status: 'pending'
      });

      // 4. Record successful submission timestamp for rate limiting
      recordSubmissionTime('contact_submit');
      setSuccess(true);
    } catch (err) {
      console.error("Error submitting request:", err);
      setError('حدث خطأ أثناء إرسال الطلب. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-xl mx-auto my-12 text-center bg-white p-8 sm:p-12 rounded-[32px] border border-[#e5e1da] shadow-xl space-y-6 animate-scale-in">
        <div className="w-20 h-20 bg-emerald-100 text-[#1a4d2e] rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-stone-900">تم استلام طلب اشتراكك بنجاح!</h2>
          <div className="inline-block bg-[#1a4d2e]/10 text-[#1a4d2e] font-black text-xs px-4 py-1.5 rounded-full border border-[#1a4d2e]/20">
            تم تقديم الطلب
          </div>
          <p className="text-stone-600 text-sm leading-relaxed max-w-md mx-auto pt-2">
            شكراً لثقتك بمنصة <strong>"شو في بإربد؟"</strong>. سيقوم فريق خدمة العملاء بالتواصل معك هاتفياً أو عبر الواتساب لتجهيز وإطلاق صفحة محلك رسمياً خلال 24 ساعة.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/" className="inline-flex justify-center items-center px-6 py-3.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-2xl font-bold transition-colors">
            العودة للرئيسية
          </Link>
          <Link to="/packages" className="inline-flex justify-center items-center px-6 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl font-bold transition-colors">
            استعراض تفاصيل الباقات
          </Link>
        </div>
      </div>
    );
  }

  

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-8">
      <SEO 
        title="أضف محلك - اشتراك في دليل إربد | تواصل معنا"
        description="انضم لمنظومة الأعمال الأكبر في إربد. أضف محلك التجاري، مطعمك، عيادتك، أو خدماتك إلى منصة شو في بإربد واستقبل زبائن جدد يومياً."
        keywords={['أضف محلك إربد', 'إعلان في إربد', 'تسجيل محلات إربد', 'إضافة شركة إربد', 'دليل أعمال إربد']}
        canonicalUrl="https://shofierbid.com/contact"
      />
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 bg-[#ff9f1c]/15 text-[#e68a00] px-4 py-1.5 rounded-full text-xs font-bold border border-[#ff9f1c]/30">
          <Sparkles className="h-4 w-4" />
          <span>انضم لمنظومة الأعمال الأولى في إربد</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-stone-900">أضف محلك أو اشترك في باقاتنا</h1>
        <p className="text-stone-600 text-sm sm:text-base max-w-lg mx-auto">
          سجل بيانات منشأتك التجارية وسنتولى تهيئة صفحتك والترويج لك أمام آلاف الزبائن في محافظة إربد.
        </p>
      </div>

      {/* Main Form */}
      <div className="bg-white p-6 sm:p-10 rounded-[32px] border border-[#e5e1da] shadow-sm space-y-6">
        
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-sm font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Honeypot field - 100% hidden from humans, bots will fill it */}
          <div className="absolute opacity-0 -z-50 pointer-events-none" style={{ width: 0, height: 0, overflow: 'hidden' }}>
            <label htmlFor="website_hp">لا تقم بتعبئة هذا الحقل إذا كنت بشراً</label>
            <input
              type="text"
              id="website_hp"
              name="website_hp"
              tabIndex={-1}
              autoComplete="off"
              value={hpValue}
              onChange={(e) => setHpValue(e.target.value)}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-bold text-stone-700 mb-1.5">
                اسم المحل أو المنشأة <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                placeholder="مثال: مطعم شاورما الريف"
                className="block w-full px-4 py-3.5 border border-[#e5e1da] rounded-2xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-sm transition-colors"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="mainCategory" className="block text-sm font-bold text-stone-700 mb-1.5">
                  التصنيف الرئيسي <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  id="mainCategory"
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
                  className="bg-white border-[#e5e1da]"
                />
              </div>

              <div>
                <label htmlFor="subCategory" className="block text-sm font-bold text-stone-700 mb-1.5">
                  التصنيف الفرعي <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  id="subCategory"
                  options={BUSINESS_CATEGORIES[formData.mainCategory as MainCategory] || []}
                  value={formData.subCategory}
                  onChange={(val) => {
                    setFormData(prev => ({
                      ...prev,
                      subCategory: val
                    }));
                  }}
                  className="bg-white border-[#e5e1da]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="ownerName" className="block text-sm font-bold text-stone-700 mb-1.5">
                اسم المالك أو المسؤول <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="ownerName"
                name="ownerName"
                required
                placeholder="الاسم الكريم"
                className="block w-full px-4 py-3.5 border border-[#e5e1da] rounded-2xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-sm transition-colors"
                value={formData.ownerName}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label htmlFor="phone" className="block text-sm font-bold text-stone-700 mb-1.5">
                رقم الهاتف أو الواتساب للتواصل <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                required
                dir="ltr"
                placeholder="07XXXXXXXX"
                className="block w-full px-4 py-3.5 border border-[#e5e1da] rounded-2xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-sm text-right transition-colors"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="district" className="block text-sm font-bold text-stone-700 mb-1.5">
                المنطقة / الحي / القرية <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                id="district"
                options={IRBID_REGIONS_CATEGORIZED.flatMap(g => g.areas)}
                value={formData.district}
                onChange={(val) => setFormData(prev => ({ ...prev, district: val }))}
                className="bg-white border-[#e5e1da]"
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-bold text-stone-700 mb-1.5">
                العنوان بالتفصيل <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="address"
                name="address"
                required
                className="block w-full px-4 py-3.5 border border-[#e5e1da] rounded-2xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-sm transition-colors"
                placeholder="مثال: بجانب مجمع البنوك..."
                value={formData.address}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <ImageUploader
              label="صورة أو شعار المحل (رفع ملف من الجهاز)"
              folder="businesses"
              value={formData.imageUrl}
              onChange={(url) => setFormData(prev => ({ ...prev, imageUrl: url }))}
              aspectRatio="cover"
              placeholder="اختر ملف صورة المحل أو الشعار من جهازك"
            />
          </div>

          {/* Google Maps Location Link */}
          <div>
            <label htmlFor="googlePlaceUrl" className="block text-sm font-bold text-stone-700 mb-1.5">
              رابط موقع المحل على خرائط Google (اختياري)
            </label>
            <input
              type="url"
              id="googlePlaceUrl"
              name="googlePlaceUrl"
              dir="ltr"
              className="block w-full px-4 py-3.5 border border-[#e5e1da] rounded-2xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-sm transition-colors"
              placeholder="https://maps.app.goo.gl/... أو رابط المحل من خرائط Google"
              value={formData.googlePlaceUrl}
              onChange={handleChange}
            />
            <p className="text-xs text-stone-400 mt-1">
              يساعد في عرض موقع المحل وتسهيل وصول الزوار والزبائن إليه عبر الخريطة.
            </p>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-bold text-stone-700 mb-1.5">
              نبذة تعريفية عن المكان وما يقدمه <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              required
              className="block w-full px-4 py-3.5 border border-[#e5e1da] rounded-2xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-sm transition-colors resize-none"
              placeholder="اكتب نبذة مختصرة عن منتجاتكم أو خدماتكم..."
              value={formData.description}
              onChange={handleChange}
            ></textarea>
          </div>

          <WorkingHoursEditor
            workingHours={workingHours}
            onChange={setWorkingHours}
            showVacationToggle={false}
          />

          <SocialLinksEditor
            socialLinks={socialLinks}
            onChange={setSocialLinks}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl text-base font-black text-white bg-[#1a4d2e] hover:bg-[#133b22] focus:outline-none focus:ring-4 focus:ring-[#1a4d2e]/20 disabled:opacity-50 transition-all shadow-lg hover:scale-[1.01] active:scale-98 cursor-pointer"
          >
            {loading ? (
              <span>جاري إرسال طلب الاشتراك...</span>
            ) : (
              <span>إرسال طلب الانضمام</span>
            )}
          </button>
        </form>
      </div>

    </div>
  );
}
