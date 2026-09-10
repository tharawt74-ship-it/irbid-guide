import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { doc, getDoc, collection, getDocs, addDoc, limit, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  ArrowLeft, MapPin, Building2, GraduationCap, Shield, Check, 
  Calendar, Clock, Phone, Share2, Copy, Sparkles, User, X, 
  ExternalLink, AlertCircle, Info, CheckCircle2, DollarSign, Award,
  Home as HomeIcon, ChevronLeft, Eye, MessageSquare
} from 'lucide-react';
import { cn } from '../lib/utils';
import { WhatsApp3DIcon, Phone3DIcon } from '../components/common/PremiumContactButtons';
import { getWhatsAppUrl } from '../lib/contactHelper';
import { ShareButton } from '../components/ShareButton';
import { SEO } from '../components/common/SEO';
import { HousingItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { DEMO_SEED_DATA } from '../lib/demoDataHelper';

export function HousingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [housing, setHousing] = useState<HousingItem | null>(null);
  const [similarHousings, setSimilarHousings] = useState<HousingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Booking inspection modal
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    studentName: '',
    studentPhone: '',
    visitDate: '',
    visitTime: '',
    notes: '',
    gender: 'طالب' as 'طالب' | 'طالبة'
  });
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    async function fetchHousingData() {
      if (!id) return;
      setLoading(true);
      try {
        let foundHousing: HousingItem | null = null;

        // 1. Try Firestore first
        if (db) {
          const docRef = doc(db, 'housings', id);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            foundHousing = { id: snap.id, ...snap.data() } as HousingItem;
          }
        }

        // 2. If not found in Firestore, search demo data
        if (!foundHousing) {
          const demoMatch = (DEMO_SEED_DATA?.housings || []).find((h: any) => h.id === id || String(h.id) === String(id));
          if (demoMatch) {
            foundHousing = demoMatch as unknown as HousingItem;
          }
        }

        if (foundHousing) {
          setHousing(foundHousing);
          setActiveImage(foundHousing.image || (foundHousing.images && foundHousing.images[0]) || '');

          // Fetch similar housings (same type or location)
          fetchSimilarHousings(foundHousing);
        } else {
          setHousing(null);
        }
      } catch (err) {
        console.error("Error loading housing detail:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchHousingData();
    window.scrollTo(0, 0);
  }, [id]);

  const fetchSimilarHousings = async (current: HousingItem) => {
    try {
      let items: HousingItem[] = [];

      if (db) {
        const ref = collection(db, 'housings');
        const snap = await getDocs(ref);
        snap.forEach(d => {
          if (d.id !== current.id) {
            items.push({ id: d.id, ...d.data() } as HousingItem);
          }
        });
      }

      // Fallback with demo data if firestore items are few
      if (items.length < 3) {
        const demoItems = (DEMO_SEED_DATA?.housings || []) as unknown as HousingItem[];
        demoItems.forEach(d => {
          if (d.id !== current.id && !items.some(x => x.id === d.id)) {
            items.push(d);
          }
        });
      }

      // Filter by type or take first 3
      const filtered = items.filter(x => x.type === current.type || x.university === current.university);
      setSimilarHousings((filtered.length >= 3 ? filtered : items).slice(0, 3));
    } catch (err) {
      console.error("Error fetching similar housings:", err);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!housing) return;

    if (!bookingForm.studentName.trim() || !bookingForm.studentPhone.trim() || !bookingForm.visitDate) {
      showToast('يرجى تعبئة الحقول الأساسية: الاسم، الهاتف، والتاريخ');
      return;
    }

    setBookingStatus('submitting');
    try {
      if (db) {
        const ref = collection(db, 'housing_bookings');
        await addDoc(ref, {
          housingId: housing.id,
          housingTitle: housing.title,
          ownerPhone: housing.contactPhone,
          ownerName: housing.ownerName,
          studentName: bookingForm.studentName,
          studentPhone: bookingForm.studentPhone,
          visitDate: bookingForm.visitDate,
          visitTime: bookingForm.visitTime,
          gender: bookingForm.gender,
          notes: bookingForm.notes,
          userId: currentUser?.uid || 'guest',
          userEmail: currentUser?.email || 'guest',
          createdAt: Date.now()
        });
      }

      setBookingStatus('success');
      showToast('🎉 تم تسجيل طلب المعاينة والحجز بنجاح! سيتم التواصل معك لتأكيد الموعد.');
      setTimeout(() => {
        setIsBookingModalOpen(false);
        setBookingStatus('idle');
        setBookingForm({ studentName: '', studentPhone: '', visitDate: '', visitTime: '', notes: '', gender: 'طالب' });
      }, 1500);
    } catch (err) {
      console.error(err);
      setBookingStatus('error');
      showToast('عذراً، حدث خطأ أثناء إرسال طلب الحجز');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center py-20" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#1a4d2e]/20 border-t-[#1a4d2e] rounded-full animate-spin"></div>
          <p className="text-stone-500 font-bold text-sm">جاري تحميل تفاصيل العقار...</p>
        </div>
      </div>
    );
  }

  if (!housing) {
    return (
      <div className="min-h-screen bg-[#faf9f6] py-16 px-4" dir="rtl">
        <div className="max-w-md mx-auto bg-white rounded-3xl border border-stone-200/80 p-8 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-stone-100 text-stone-500 rounded-2xl flex items-center justify-center mx-auto">
            <Building2 className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-black text-stone-900">إعلان العقار غير موجود</h3>
          <p className="text-stone-500 text-xs leading-relaxed">
            ربما تم حذف هذا الإعلان أو تم إزالته من قبل صاحب العقار أو أن الرابط المطلوب غير صحيح.
          </p>
          <Link
            to="/housing"
            className="inline-flex items-center gap-2 bg-[#1a4d2e] text-white px-6 py-3 rounded-2xl font-bold text-xs shadow-md hover:bg-[#143e24] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>العودة لدليل السكنات والعقارات</span>
          </Link>
        </div>
      </div>
    );
  }

  const galleryImages = housing.images && housing.images.length > 0 ? housing.images : [housing.image].filter(Boolean);
  const whatsappMsg = `مرحباً، أود الاستفسار والمعاينة بخصوص العقار المعلن عنه: (${housing.title}) على منصة شو في بإربد؟`;
  const whatsappUrl = getWhatsAppUrl(housing.contactWhatsapp || housing.contactPhone, whatsappMsg);

  return (
    <div className="min-h-screen bg-[#faf9f6] pb-24 lg:pb-16 pt-6" dir="rtl">
      <SEO 
        title={`${housing.title} - سكنات وعقارات إربد`}
        description={housing.description}
        ogImage={housing.image}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] bg-stone-900 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 border border-stone-700 animate-bounce">
          <Sparkles className="h-4 w-4 text-[#ff9f1c]" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">

        {/* Top Breadcrumb & Navigation Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200/60 pb-4">
          <div className="flex items-center gap-2 text-xs text-stone-500 font-bold overflow-x-auto whitespace-nowrap">
            <Link to="/" className="hover:text-[#1a4d2e] transition-colors flex items-center gap-1">
              <HomeIcon className="h-3.5 w-3.5" />
              <span>الرئيسية</span>
            </Link>
            <ChevronLeft className="h-3.5 w-3.5 text-stone-400" />
            <Link to="/housing" className="hover:text-[#1a4d2e] transition-colors">
              السكنات والعقارات
            </Link>
            <ChevronLeft className="h-3.5 w-3.5 text-stone-400" />
            <span className="text-stone-900 font-black truncate max-w-[200px] sm:max-w-[300px]">
              {housing.title}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/housing"
              className="inline-flex items-center gap-1.5 text-stone-700 hover:text-stone-950 bg-white border border-stone-200/80 px-3.5 py-2 rounded-xl text-xs font-bold transition-all hover:shadow-xs cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">العودة للسكنات</span>
            </Link>

            <ShareButton
              title={`عقار/سكن: ${housing.title}`}
              text={`شاهد تفاصيل (${housing.title}) على منصة شو في بإربد!`}
              url={window.location.href}
              size="md"
              variant="outline"
            />
          </div>
        </div>

        {/* Main Grid: Left Column Details & Right Sidebar Contact */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* Main Details (Left Side / 2 Columns) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Photo Gallery Frame */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden p-3 space-y-3">
              <div className="relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-2xl overflow-hidden bg-stone-100 group">
                <img 
                  src={activeImage || housing.image} 
                  alt={housing.title}
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                
                {/* Gradient Shadow Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-black/20" />

                {/* Floating Top Price Tag */}
                <div className="absolute top-4 right-4 z-10 bg-[#1a4d2e] text-white font-black text-xs sm:text-sm px-4 py-2 rounded-2xl shadow-xl border border-emerald-600/30">
                  {housing.price} دينار / {housing.pricePeriod}
                </div>

                {/* Badges on Top Left */}
                <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 items-end">
                  <span className="bg-white/95 text-stone-900 font-black text-xs px-3 py-1.5 rounded-xl shadow-md border border-stone-200 backdrop-blur-md">
                    {housing.type}
                  </span>
                  {housing.isVerified && (
                    <span className="bg-emerald-600 text-white font-black text-xs px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5 text-white" />
                      <span>معتمد وموثق</span>
                    </span>
                  )}
                </div>

                {/* Floating Title on Image Bottom */}
                <div className="absolute bottom-4 right-4 left-4 text-white space-y-1">
                  <span className="text-[11px] font-bold text-amber-300 bg-black/50 px-3 py-1 rounded-full backdrop-blur-xs inline-block">
                    قرب جامعة {housing.university}
                  </span>
                  <h1 className="text-lg sm:text-2xl font-black drop-shadow-md leading-snug">
                    {housing.title}
                  </h1>
                </div>
              </div>

              {/* Thumbnail Selector */}
              {galleryImages.length > 1 && (
                <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-1">
                  {galleryImages.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImage(imgUrl)}
                      className={cn(
                        "relative w-20 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer",
                        activeImage === imgUrl ? "border-[#1a4d2e] ring-2 ring-[#1a4d2e]/30 scale-105" : "border-stone-200 opacity-70 hover:opacity-100"
                      )}
                    >
                      <img src={imgUrl} alt={`صورة ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Specs Grid */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 space-y-4">
              <h3 className="text-xs font-black text-stone-400 uppercase tracking-wider pb-2 border-b border-stone-100">
                المواصفات والتفاصيل الهندسية
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 text-xs">
                
                {Boolean(housing.distanceToCampus && housing.distanceToCampus.trim() && housing.distanceToCampus !== 'قريب من الخدمات والمواصلات' && housing.distanceToCampus !== 'قريب من المواصلات') && (
                  <div className="bg-sky-50/80 p-3.5 rounded-2xl border border-sky-100 flex flex-col justify-center space-y-1">
                    <span className="text-sky-700 font-bold flex items-center gap-1.5 text-[11px]">
                      <GraduationCap className="h-4 w-4 text-sky-600 shrink-0" />
                      <span>القرب من الجامعة</span>
                    </span>
                    <span className="font-black text-stone-900 text-xs truncate">{housing.distanceToCampus}</span>
                  </div>
                )}

                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/70 flex flex-col justify-center space-y-1">
                  <span className="text-stone-500 font-bold flex items-center gap-1.5 text-[11px]">
                    <Building2 className="h-4 w-4 text-stone-600 shrink-0" />
                    <span>تقسيم الغرف</span>
                  </span>
                  <span className="font-black text-stone-900 text-xs">{housing.roomsCount || 'استوديو'}</span>
                </div>

                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/70 flex flex-col justify-center space-y-1">
                  <span className="text-stone-500 font-bold flex items-center gap-1.5 text-[11px]">
                    <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>حالة التأثيث</span>
                  </span>
                  <span className="font-black text-stone-900 text-xs">
                    {housing.isFurnished || (housing.services?.includes('مفروش بالكامل') ? 'مفروش بالكامل' : 'غير مفروش')}
                  </span>
                </div>

                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/70 flex flex-col justify-center space-y-1">
                  <span className="text-stone-500 font-bold flex items-center gap-1.5 text-[11px]">
                    <MapPin className="h-4 w-4 text-orange-500 shrink-0" />
                    <span>الموقع والحي</span>
                  </span>
                  <span className="font-black text-stone-900 text-xs truncate">{housing.district || housing.location}</span>
                </div>

                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/70 flex flex-col justify-center space-y-1">
                  <span className="text-stone-500 font-bold flex items-center gap-1.5 text-[11px]">
                    <User className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>المالك والمعلن</span>
                  </span>
                  <span className="font-black text-stone-900 text-xs truncate">{housing.ownerName || 'مالك العقار'}</span>
                </div>

                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200/70 flex flex-col justify-center space-y-1">
                  <span className="text-stone-500 font-bold flex items-center gap-1.5 text-[11px]">
                    <DollarSign className="h-4 w-4 text-emerald-700 shrink-0" />
                    <span>فترة الإيجار</span>
                  </span>
                  <span className="font-black text-stone-900 text-xs">{housing.pricePeriod || 'شهري'}</span>
                </div>

              </div>
            </div>

            {/* Description Section */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 space-y-3">
              <h3 className="text-xs font-black text-stone-400 uppercase tracking-wider pb-2 border-b border-stone-100 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-[#1a4d2e] rounded-full" />
                <span>تفاصيل ووصف العقار الشامل</span>
              </h3>
              <div className="text-xs sm:text-sm text-stone-700 leading-relaxed whitespace-pre-line bg-stone-50/60 p-5 rounded-2xl border border-stone-200/50 font-medium">
                {housing.description || 'لا يوجد وصف تفصيلي إضافي مكتوب لهذا العقار حالياً.'}
              </div>
            </div>

            {/* Services & Amenities */}
            {housing.services && housing.services.length > 0 && (
              <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 space-y-3">
                <h3 className="text-xs font-black text-[#1a4d2e] uppercase tracking-wider pb-2 border-b border-stone-100 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#ff9f1c]" />
                  <span>الخدمات والمرافق المتوفرة في العقار</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100/80">
                  {housing.services.map((serv, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs font-bold text-emerald-950 bg-white/80 px-3 py-2 rounded-xl border border-emerald-100">
                      <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>{serv}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Sidebar / Right Column Contact Card */}
          <div className="space-y-6">

            {/* Contact & Booking Main Card */}
            <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 space-y-6 sticky top-6">
              
              <div className="space-y-1 pb-3 border-b border-stone-100">
                <span className="text-[10px] font-black text-[#ff9f1c] uppercase tracking-wider">التواصل المباشر مع المالك</span>
                <h3 className="text-base font-black text-stone-900">حجز معاينة واستفسار فوري</h3>
                <p className="text-stone-500 text-xs">تواصل مباشرة مع صاحب العقار دون وسطاء أو عمولات إضافية</p>
              </div>

              {/* Price Callout */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 text-center space-y-1">
                <span className="text-stone-400 text-[10px] font-bold block">القيمة المطلوبة</span>
                <div className="text-2xl font-black text-[#1a4d2e]">
                  {housing.price} <span className="text-sm font-bold text-stone-600">دينار / {housing.pricePeriod}</span>
                </div>
              </div>

              {/* Inspection CTA button */}
              <button
                onClick={() => setIsBookingModalOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#ff9f1c] hover:bg-[#e58f19] text-[#2d2a26] py-3.5 px-4 rounded-2xl font-black text-xs transition-all shadow-md cursor-pointer"
              >
                <Calendar className="h-4.5 w-4.5 shrink-0" />
                <span>حجز موعد معاينة مباشر</span>
              </button>

              {/* Contact Buttons */}
              <div className="space-y-2.5">
                {(housing.contactMode === 'both' || housing.contactMode === 'whatsapp_only' || !housing.contactMode) && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 px-4 rounded-2xl text-xs font-black transition-colors shadow-xs cursor-pointer"
                  >
                    <WhatsApp3DIcon className="h-4 w-4 text-white" />
                    <span>تواصل عبر واتساب فوراً 💬</span>
                  </a>
                )}

                {(housing.contactMode === 'both' || housing.contactMode === 'phone_only' || !housing.contactMode) && (
                  <a
                    href={`tel:${housing.contactPhone}`}
                    className="w-full inline-flex items-center justify-center gap-2 bg-[#1a4d2e] hover:bg-[#133c23] text-white py-3.5 px-4 rounded-2xl text-xs font-black transition-colors shadow-xs cursor-pointer"
                  >
                    <Phone3DIcon className="h-4 w-4 text-white" />
                    <span>اتصال هاتفي مباشر ({housing.contactPhone})</span>
                  </a>
                )}
              </div>

              {/* Quick Info Box */}
              <div className="border-t border-stone-100 pt-4 space-y-3 text-xs">
                <div className="flex items-center justify-between text-stone-600">
                  <span className="font-bold">اسم المعلن/المالك:</span>
                  <span className="font-black text-stone-900">{housing.ownerName || 'مالك العقار'}</span>
                </div>
                <div className="flex items-center justify-between text-stone-600">
                  <span className="font-bold">رقم الهاتف:</span>
                  <span className="font-black text-stone-900" dir="ltr">{housing.contactPhone}</span>
                </div>
                <div className="flex items-center justify-between text-stone-600">
                  <span className="font-bold">مشاركة سريعة:</span>
                  <button
                    onClick={handleCopyLink}
                    className="text-[#1a4d2e] font-black hover:underline cursor-pointer"
                  >
                    {copiedLink ? 'تم نسخ الرابط!' : 'نسخ رابط العقار 🔗'}
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* Similar Housings Section */}
        {similarHousings.length > 0 && (
          <div className="pt-8 border-t border-stone-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-stone-900">سكنات وعقارات مشابهة قد تهمك</h3>
                <p className="text-xs text-stone-500">تصفح خيارات ممتازة أخرى قريبة وفي نفس المنطقة</p>
              </div>
              <Link
                to="/housing"
                className="text-xs font-bold text-[#1a4d2e] hover:underline flex items-center gap-1"
              >
                <span>عرض الكل</span>
                <ChevronLeft className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {similarHousings.map((sim) => (
                <Link
                  key={sim.id}
                  to={`/housing/${sim.id}`}
                  className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:border-[#1a4d2e]/40 hover:shadow-md transition-all flex flex-col group cursor-pointer"
                >
                  <div className="relative aspect-[16/10] bg-stone-100 overflow-hidden">
                    <img 
                      src={sim.image} 
                      alt={sim.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-2 right-2 bg-[#1a4d2e] text-white px-2.5 py-1 rounded-lg text-[10px] font-black">
                      {sim.price} دينار
                    </div>
                  </div>
                  <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                    <h4 className="font-black text-xs text-stone-900 group-hover:text-[#1a4d2e] transition-colors line-clamp-1">
                      {sim.title}
                    </h4>
                    <p className="text-[11px] text-stone-500 flex items-center gap-1 font-bold">
                      <MapPin className="h-3 w-3 text-orange-500 shrink-0" />
                      <span className="truncate">{sim.location}</span>
                    </p>
                    <span className="text-[11px] font-black text-[#1a4d2e] self-end pt-1">
                      تفاصيل العقار &larr;
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Sticky Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 px-4 py-3 sm:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.06)] flex items-center gap-2">
        <button
          onClick={() => setIsBookingModalOpen(true)}
          className="bg-[#ff9f1c] active:bg-[#e58f19] text-[#2d2a26] px-3.5 py-3 rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-1.5 shrink-0"
        >
          <Calendar className="h-4 w-4" />
          <span>حجز معاينة</span>
        </button>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-600 active:bg-emerald-700 text-white py-3 px-2 rounded-xl text-xs font-black shadow-xs min-w-0"
        >
          <WhatsApp3DIcon className="h-4 w-4 text-white shrink-0" />
          <span className="truncate">واتساب 💬</span>
        </a>

        <a
          href={`tel:${housing.contactPhone}`}
          className="bg-[#1a4d2e] active:bg-[#133c23] text-white px-3.5 py-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shrink-0"
        >
          <Phone3DIcon className="h-4 w-4 text-white" />
          <span>اتصال</span>
        </a>
      </div>

      {/* Inspection Visit Booking Modal */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 relative my-auto space-y-5">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-black text-stone-900">📅 حجز موعد معاينة مباشر</h3>
                <p className="text-[11px] text-stone-500">{housing.title}</p>
              </div>
              <button 
                onClick={() => setIsBookingModalOpen(false)} 
                className="text-stone-400 hover:text-stone-600 p-1.5 rounded-full hover:bg-stone-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {bookingStatus === 'success' ? (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h4 className="font-black text-base text-stone-900">تم تسجيل الموعد بنجاح!</h4>
                <p className="text-stone-500 text-xs">سيقوم المالك بالتواصل معك لتأكيد الموعد والتفاصيل.</p>
              </div>
            ) : (
              <form onSubmit={handleCreateBooking} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-stone-700">اسم الزائر / الطالب بالكامل *</label>
                  <input
                    type="text"
                    required
                    value={bookingForm.studentName}
                    onChange={(e) => setBookingForm({ ...bookingForm, studentName: e.target.value })}
                    placeholder="مثال: يزن البطاينة"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#1a4d2e]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-stone-700">رقم التواصل *</label>
                    <input
                      type="tel"
                      required
                      value={bookingForm.studentPhone}
                      onChange={(e) => setBookingForm({ ...bookingForm, studentPhone: e.target.value })}
                      placeholder="07xxxxxxxx"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#1a4d2e]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-stone-700">الصفة</label>
                    <select
                      value={bookingForm.gender}
                      onChange={(e) => setBookingForm({ ...bookingForm, gender: e.target.value as any })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#1a4d2e]"
                    >
                      <option value="طالب">طالب / شاب</option>
                      <option value="طالبة">طالبة / بنت</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-stone-700">تاريخ المعاينة *</label>
                    <input
                      type="date"
                      required
                      value={bookingForm.visitDate}
                      onChange={(e) => setBookingForm({ ...bookingForm, visitDate: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#1a4d2e]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-black text-stone-700">الوقت المفضل</label>
                    <input
                      type="text"
                      value={bookingForm.visitTime}
                      onChange={(e) => setBookingForm({ ...bookingForm, visitTime: e.target.value })}
                      placeholder="مثال: 4:00 عصراً"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-[#1a4d2e]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-stone-700">ملاحظات أو أسئلة للمالك</label>
                  <textarea
                    rows={2}
                    value={bookingForm.notes}
                    onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                    placeholder="أي ملاحظة بخصوص الموعد أو الاستفسارات..."
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-[#1a4d2e]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBookingModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    disabled={bookingStatus === 'submitting'}
                    className="px-5 py-2.5 bg-[#1a4d2e] hover:bg-[#133c23] text-white text-xs font-black rounded-xl shadow-xs transition-colors disabled:opacity-50"
                  >
                    {bookingStatus === 'submitting' ? 'جاري الإرسال...' : 'تأكيد إرسال الطلب'}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
