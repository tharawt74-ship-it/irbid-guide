import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Home as HomeIcon, Search, Plus, MapPin, DollarSign, 
  Phone, MessageSquare, Shield, Check, X, Filter, Info, 
  Grid, List, Sparkles, Send, Award, GraduationCap, Building2, Eye
} from 'lucide-react';
import { collection, getDocs, addDoc, setDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ShareButton } from '../components/ShareButton';
import { getWhatsAppUrl } from '../lib/contactHelper';
import { getAppConfig } from '../lib/demoDataHelper';
import { SEO } from '../components/common/SEO';
import { isBotSubmission, checkSubmissionRateLimit, recordSubmissionTime, sanitizeInput, executeReCaptcha } from '../lib/security';

export interface HousingItem {
  id: string;
  title: string;
  type: 'سكن طالبات' | 'سكن طلاب' | 'شقق عائلية' | 'أستوديو مفروش';
  university: 'اليرموك' | 'العلوم والتكنولوجيا' | 'أخرى / وسط المدينة';
  price: number; // monthly rent in JOD
  pricePeriod: 'شهري' | 'سنوي' | 'فصلي';
  location: string;
  distanceToCampus: string;
  roomsCount: string;
  services: string[]; // internet, electricity, heating, guard etc.
  description: string;
  contactPhone: string;
  contactWhatsapp?: string;
  ownerName: string;
  image: string;
  isVerified?: boolean;
}

const INITIAL_HOUSINGS: HousingItem[] = [
  {
    id: 'h1',
    title: 'سكن المودة الفاخر للطالبات',
    type: 'سكن طالبات',
    university: 'اليرموك',
    price: 135,
    pricePeriod: 'شهري',
    location: 'إربد، بجانب بوابة جامعة اليرموك الغربية (شارع الجامعة)',
    distanceToCampus: 'دقيقتان سيراً على الأقدام من البوابة الغربية',
    roomsCount: 'أستوديو مفرد / غرفة ثنائية',
    services: ['حراسة 24 ساعة', 'إنترنت فايبر مجاني', 'ماء وكهرباء مشمولة', 'صيانة دورية', 'تدفئة وتكييف'],
    description: 'سكن مخصص ومصمم خصيصاً لتوفير البيئة الأكثر أماناً وهدوءاً لطالبات جامعة اليرموك. السكن مجهز بمشرفات على مدار الساعة وكاميرات حماية وأثاث جديد كلياً. يتوفر مطبخ متكامل مشترك وصالة دراسة هادئة.',
    contactPhone: '0791111111',
    contactWhatsapp: '0791111111',
    ownerName: 'أم أحمد (إدارة سكن المودة)',
    image: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
    isVerified: true
  },
  {
    id: 'h2',
    title: 'سكن النخبة للشباب والطلاب',
    type: 'سكن طلاب',
    university: 'اليرموك',
    price: 110,
    pricePeriod: 'شهري',
    location: 'إربد، حي الجامعة، بالقرب من دوار القبة',
    distanceToCampus: '5 دقائق سيراً على الأقدام من كلية الاقتصاد',
    roomsCount: 'أستوديو مستقل مفروش',
    services: ['إنترنت سريع جداً', 'حراسة وصيانة', 'مصعد كهربائي', 'تنظيف ممرات يومي', 'مواقف سيارات'],
    description: 'أستوديوهات مستقلة مفروشة وممتازة لطلاب جامعة اليرموك أو الخريجين الجدد. يحتوي كل أستوديو على سرير مريح، مكتب دراسة، مطبخ صغير وحمام خاص. أثاث عملي ونظيف وبيئة هادئة للدراسة.',
    contactPhone: '0782222222',
    contactWhatsapp: '0782222222',
    ownerName: 'المهندس رامي الخالدي',
    image: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80',
    isVerified: true
  },
  {
    id: 'h3',
    title: 'شقق لورنس المفروشة والمكيفة',
    type: 'أستوديو مفروش',
    university: 'العلوم والتكنولوجيا',
    price: 160,
    pricePeriod: 'شهري',
    location: 'إربد، الرمثا، بالقرب من بوابة جامعة العلوم والتكنولوجيا (JUST)',
    distanceToCampus: '3 دقائق بالسيارة / باص السكن المجاني متوفر للبوابة',
    roomsCount: 'شقة غرفة وصالة / أستوديو كبير',
    services: ['مكيف هواء حامي بارد', 'إنترنت فايبر مستقل', 'حراسة ليلية', 'شاشة تلفاز ذكية', 'ماء مشمول'],
    description: 'سكن مخصص لطلاب وجامعيي التكنولوجيا (JUST) من العرب والأردنيين. الشقق مجهزة بمكيفات هواء حديثة، وتوفر خدمة باص نقل يومي مجاني من السكن إلى داخل حرم الجامعة مرتين في اليوم. نظافة وأمان تام.',
    contactPhone: '0773333333',
    contactWhatsapp: '0773333333',
    ownerName: 'أبو لورنس للخدمات العقارية',
    image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
    isVerified: true
  },
  {
    id: 'h4',
    title: 'شقق الهنيدي السكنية الفاخرة للعائلات',
    type: 'شقق عائلية',
    university: 'أخرى / وسط المدينة',
    price: 280,
    pricePeriod: 'شهري',
    location: 'إربد، الحي الجنوبي، بالقرب من مسجد علياء التل',
    distanceToCampus: 'وسط المدينة - يبعد 10 دقائق بالسيارة عن جامعة اليرموك',
    roomsCount: '3 غرف نوم + صالة كبيرة + حمامين',
    services: ['تدفئة مركزية', 'مطبخ راكب دبل أمريكي', 'بلكونة مطلة', 'مواقف سيارات أرضية', 'خزان ماء مستقل'],
    description: 'شقق سكنية غير مفروشة بمساحات واسعة تشطيبات ديلوكس مناسبة جداً للعائلات أو الأطباء المقيمين في مستشفيات إربد. تقع الشقة في حي راقٍ وهادئ جداً في الحي الجنوبي وقريبة من جميع الخدمات والمخابز والمدارس.',
    contactPhone: '0794444444',
    ownerName: 'الحاج أبو فيصل الهنيدي',
    image: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80',
    isVerified: false
  },
  {
    id: 'h5',
    title: 'أستوديو البيلسان الحديث بجانب نفق يربد',
    type: 'أستوديو مفروش',
    university: 'اليرموك',
    price: 150,
    pricePeriod: 'شهري',
    location: 'إربد، شارع وصفي التل، بالقرب من البوابة الشمالية لليرموك',
    distanceToCampus: '3 دقائق سيراً على الأقدام من البوابة الشمالية',
    roomsCount: 'غرفة نوم مستقلة + مطبخ تحضيري + حمام',
    services: ['أثاث فندقي مودرن', 'إنترنت سريع', 'مصعد هيدروليكي', 'تكييف هوائي', 'أجهزة مطبخ متكاملة'],
    description: 'أستوديوهات مفروشة بتصميم فندقي شبابي حديث وممتاز للمغتربين أو الطلاب الذين يفضلون الرفاهية والهدوء. جميع الأجهزة الكهربائية جديدة وموفرة للطاقة (Inverter). الحجز فصلي أو سنوي ويفضل العقود الطويلة.',
    contactPhone: '0785555555',
    contactWhatsapp: '0785555555',
    ownerName: 'مكتب البيلسان لإدارة العقارات',
    image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80',
    isVerified: true
  },
  {
    id: 'h6',
    title: 'سكن الياسمين الآمن للطالبات المغتربات',
    type: 'سكن طالبات',
    university: 'العلوم والتكنولوجيا',
    price: 140,
    pricePeriod: 'شهري',
    location: 'إربد، المنطقة الشرقية، مخرج طريق الحصن / التكنولوجيا',
    distanceToCampus: '8 كم عن جامعة العلوم والتكنولوجيا (خط باصات مباشر)',
    roomsCount: 'غرف فردية وثنائية مجهزة بالكامل',
    services: ['حراسة ومراقبة بالكاميرات', 'مشرفة سكن مناوبة', 'باص توصيل مجاني يومي للجامعة', 'تنظيف غرف أسبوعي', 'إنترنت مجاني'],
    description: 'سكن آمن وهادئ مخصص ومصمم خصيصاً لطالبات الطب والهندسة بجامعة العلوم والتكنولوجيا الأردنية. يوفر السكن خدمة باص نقل مريحة جداً ومجانية لتجنب مشقات المواصلات. هدوء دراسي مطلق وإشراف تربوي راقٍ.',
    contactPhone: '0796666666',
    contactWhatsapp: '0796666666',
    ownerName: 'مكتب الياسمين لشؤون الطالبات',
    image: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=800&q=80',
    isVerified: true
  }
];

export function Housing() {
  const { currentUser, isAdmin } = useAuth();
  const [housings, setHousings] = useState<HousingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('الكل');
  const [selectedUniv, setSelectedUniv] = useState<string>('الكل');
  
  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<HousingItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [hpValue, setHpValue] = useState('');

  // New Listing State
  const [newListing, setNewListing] = useState({
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
    image: ''
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    async function loadHousings() {
      setLoading(true);
      try {
        if (!db) {
          setHousings(INITIAL_HOUSINGS);
          setLoading(false);
          return;
        }
        const appConfig = await getAppConfig();
        const ref = collection(db, 'housings');
        const snap = await getDocs(ref);
        let items: HousingItem[] = [];
        snap.forEach(d => {
          const data = d.data();
          if (!appConfig.showDemoData && data.isDemo) {
            return;
          }
          items.push({ id: d.id, ...data } as HousingItem);
        });

        if (items.length === 0) {
          // Seed INITIAL_HOUSINGS
          for (const item of INITIAL_HOUSINGS) {
            const docRef = doc(collection(db, 'housings'), item.id);
            await setDoc(docRef, { ...item, isDemo: true, createdAt: Date.now() });
          }
          setHousings(INITIAL_HOUSINGS);
        } else {
          // Sort by createdAt desc
          items.sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
          setHousings(items);
        }
      } catch (err) {
        console.error("Error loading housings:", err);
        setHousings(INITIAL_HOUSINGS);
      } finally {
        setLoading(false);
      }
    }
    loadHousings();
  }, []);

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListing.title || !newListing.price || !newListing.contactPhone || !newListing.location) {
      showToast('الرجاء تعبئة الحقول الأساسية المطلوبة');
      return;
    }

    // 1. Honeypot check (Bot protection)
    if (isBotSubmission(hpValue)) {
      // Trick the bot by pretending to save
      setIsFormOpen(false);
      return;
    }

    // 2. Rate limit check (Prevention of spamming)
    const rateLimit = checkSubmissionRateLimit('housing_submit', 60);
    if (!rateLimit.allowed) {
      showToast(`يرجى الانتظار ${rateLimit.timeLeft} ثانية قبل نشر إعلان سكن آخر لمنع المراسلات المكررة.`);
      return;
    }

    // 2.5 Run Google reCAPTCHA v3 checking
    try {
      await executeReCaptcha('housing_submit');
    } catch (rcError) {
      console.warn("⚠️ reCAPTCHA execution skipped or failed:", rcError);
    }

    const services = newListing.servicesString
      ? newListing.servicesString.split('،').map(s => sanitizeInput(s.trim())).filter(Boolean)
      : ['ماء وكهرباء', 'إنترنت سريع'];

    const image = newListing.image || 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80';

    // 3. Sanitize inputs to prevent script injection & HTML spam
    const itemData = {
      title: sanitizeInput(newListing.title),
      type: newListing.type,
      university: newListing.university,
      price: Number(newListing.price),
      pricePeriod: newListing.pricePeriod,
      location: sanitizeInput(newListing.location),
      distanceToCampus: sanitizeInput(newListing.distanceToCampus) || 'قريب من الخدمات والمواصلات',
      roomsCount: sanitizeInput(newListing.roomsCount) || 'أستوديو / شقة مفروشة',
      services,
      description: sanitizeInput(newListing.description) || 'لا يوجد وصف إضافي مكتوب حالياً من المالك.',
      contactPhone: sanitizeInput(newListing.contactPhone),
      contactWhatsapp: newListing.contactWhatsapp ? sanitizeInput(newListing.contactWhatsapp) : sanitizeInput(newListing.contactPhone),
      ownerName: sanitizeInput(newListing.ownerName) || 'مالك العقار',
      image,
      isVerified: false,
      createdAt: Date.now()
    };

    try {
      if (db) {
        const docRef = await addDoc(collection(db, 'housings'), itemData);
        const item: HousingItem = { id: docRef.id, ...itemData };
        setHousings(prev => [item, ...prev]);
      } else {
        const item: HousingItem = { id: 'h_user_' + Date.now(), ...itemData };
        setHousings(prev => [item, ...prev]);
      }
      
      // 4. Record successful submission timestamp for rate limiting
      recordSubmissionTime('housing_submit');

      setIsFormOpen(false);
      showToast('تم نشر عقارك بنجاح في سكنات إربد!');
      setNewListing({
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
        contactPhone: '',
        contactWhatsapp: '',
        ownerName: '',
        image: ''
      });
    } catch (err) {
      console.error("Error creating housing listing in Firestore:", err);
      showToast('حدث خطأ أثناء حفظ الإعلان في قاعدة البيانات');
    }
  };

  const handleDeleteListing = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (db) {
        await deleteDoc(doc(db, 'housings', id));
      }
      const updated = housings.filter(h => h.id !== id);
      setHousings(updated);
      showToast('تم حذف الإعلان بنجاح');
    } catch (err) {
      console.error("Error deleting housing from Firestore:", err);
      showToast('تعذر حذف الإعلان من الخادم');
    }
  };

  // Double Filter Housing
  const filteredHousings = housings.filter(h => {
    const matchesType = selectedType === 'الكل' || h.type === selectedType;
    const matchesUniv = selectedUniv === 'الكل' || h.university === selectedUniv;
    const matchesSearch = 
      h.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.services.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesType && matchesUniv && matchesSearch;
  });

  return (
    <div className="w-full space-y-8 sm:space-y-10 pb-16 relative" dir="rtl">
      <SEO 
        title="سكنات وشقق إربد | سكنات طالبات وطلاب اليرموك والتكنو"
        description="دليل سكنات وشقق محافظة إربد: سكنات طالبات آمنة، سكنات شباب طلاب جامعة اليرموك وجامعة التكنولوجيا، شقق عائلية وأستوديوهات مفروشة للإيجار في إربد."
        keywords={['سكنات إربد', 'سكنات طالبات إربد', 'سكنات اليرموك', 'سكنات التكنو', 'شقق للإيجار إربد', 'استوديو مفروش إربد', 'عقارات إربد']}
        canonicalUrl="https://shofierbid.com/housing"
      />
      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[99999] bg-[#1a4d2e] text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-500/30 animate-in fade-in zoom-in-95">
          <Check className="h-5 w-5 text-[#ff9f1c]" />
          <span className="font-bold text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-l from-[#1a4d2e] via-[#143e25] to-[#0c2617] rounded-3xl p-6 sm:p-10 text-white relative overflow-hidden shadow-lg border border-[#1a4d2e]/40">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-[#ff9f1c]/15 rounded-full blur-2xl pointer-events-none -ml-10 -mb-10"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 bg-[#ff9f1c] text-white px-3.5 py-1.5 rounded-full text-xs font-black shadow-xs">
                <Building2 className="h-4 w-4" />
                <span>سكنات وعقارات إربد الجامعية</span>
              </div>
              <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md text-emerald-300 px-3 py-1.5 rounded-full text-xs font-bold">
                <GraduationCap className="h-3.5 w-3.5" />
                <span>لطلاب اليرموك، العلوم والتكنولوجيا والعائلات</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              عقارات وسكنات إربد
            </h1>

            <p className="text-stone-200 text-sm sm:text-base leading-relaxed max-w-xl font-normal">
              ابحث عن سكنات طالبات آمنة بمشرفات، سكنات شبابية ممتازة، شقق عائلية رحبة أو أستوديوهات مفروشة كلياً للإيجار قرب جامعتك وبأفضل الأسعار المتاحة.
            </p>
          </div>

          <div className="shrink-0">
            <button
              onClick={() => setIsFormOpen(true)}
              className="inline-flex items-center justify-center gap-2 bg-[#ff9f1c] hover:bg-[#f39209] text-white px-5 py-3.5 rounded-2xl font-black text-sm transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus className="h-5 w-5" />
              <span>أعلن عن سكنك أو شقتك مجاناً</span>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="pt-6 relative z-10 max-w-2xl">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالسكن (سكن طالبات، أستوديو، الحي الجنوبي، شارع الجامعة)..."
              className="w-full bg-white/10 backdrop-blur-md text-white placeholder:text-stone-300 border border-white/20 rounded-2xl px-5 py-3.5 pr-11 text-sm focus:outline-none focus:bg-white/20 focus:border-white transition-colors"
            />
            <Search className="h-5 w-5 text-stone-300 absolute right-3.5 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-300 hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Double Filter Selection */}
      <div className="space-y-4">
        {/* Filter Row 1: Accommodation Type */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-black text-stone-400 shrink-0 ml-1">نوع السكن:</span>
          {['الكل', 'سكن طالبات', 'سكن طلاب', 'أستوديو مفروش', 'شقق عائلية'].map(type => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedType === type
                  ? 'bg-[#1a4d2e] text-white shadow-xs font-black'
                  : 'bg-white text-stone-600 border border-[#e5e1da] hover:bg-stone-50'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Filter Row 2: Location/University Proximity */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-black text-stone-400 shrink-0 ml-1">الجامعة والموقع:</span>
          {[
            { value: 'الكل', label: 'كل المواقع' },
            { value: 'اليرموك', label: 'بجانب جامعة اليرموك' },
            { value: 'العلوم والتكنولوجيا', label: 'بجانب جامعة العلوم والتكنولوجيا (JUST)' },
            { value: 'أخرى / وسط المدينة', label: 'وسط البلد وعقارات إربد الأخرى' }
          ].map(univ => (
            <button
              key={univ.value}
              onClick={() => setSelectedUniv(univ.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedUniv === univ.value
                  ? 'bg-[#ff9f1c] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {univ.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Title count */}
      <div className="flex items-center justify-between text-xs text-stone-500 font-bold px-1">
        <span>تم العثور على ({filteredHousings.length}) عقار وسكن متاح للإيجار في إربد</span>
        {(selectedType !== 'الكل' || selectedUniv !== 'الكل' || searchQuery) && (
          <button
            onClick={() => {
              setSelectedType('الكل');
              setSelectedUniv('الكل');
              setSearchQuery('');
            }}
            className="text-[#1a4d2e] hover:underline"
          >
            إعادة تعيين فلاتر البحث
          </button>
        )}
      </div>

      {/* Grid displaying housings */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 bg-white rounded-3xl border border-[#e5e1da]">
          <div className="w-10 h-10 border-4 border-[#1a4d2e]/20 border-t-[#1a4d2e] rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-[#1a4d2e]">جاري تحميل السكنات وعقارات إربد...</p>
        </div>
      ) : filteredHousings.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#e5e1da] space-y-4">
          <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto text-stone-400">
            <Building2 className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-stone-800">لا توجد سكنات أو عقارات تطابق خياراتك حالياً</h3>
          <p className="text-stone-500 text-sm max-w-md mx-auto">
            جرّب توسيع خيارات البحث، تصفح "كل المواقع" أو ابحث بكلمات مفتاحية أخرى، أو أضف إعلاناً جديداً بنفسك.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredHousings.map((h) => (
            <div
              key={h.id}
              onClick={() => setSelectedDetail(h)}
              className="bg-white rounded-3xl border border-[#e5e1da] overflow-hidden hover:border-[#1a4d2e]/40 hover:shadow-xl transition-all flex flex-col justify-between group cursor-pointer"
            >
              <div>
                {/* Photo */}
                <div className="relative aspect-[16/10] overflow-hidden bg-stone-100">
                  <img 
                    src={h.image} 
                    alt={h.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md text-stone-800 px-2.5 py-1 rounded-lg text-[10px] font-black shadow-2xs">
                    {h.type}
                  </div>
                  {h.isVerified && (
                    <div className="absolute top-3 left-3 bg-emerald-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-black shadow-2xs flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      <span>سكن موثق</span>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 bg-black/75 backdrop-blur-md text-[#ff9f1c] px-3 py-1.5 rounded-xl text-xs font-black">
                    {h.price} دينار / {h.pricePeriod}
                  </div>
                </div>

                {/* Body info */}
                <div className="p-5 space-y-3">
                  <h3 className="font-black text-lg text-stone-900 group-hover:text-[#1a4d2e] transition-colors leading-snug line-clamp-1">
                    {h.title}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-stone-500 font-bold">
                    <MapPin className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                    <span className="truncate">{h.location}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-sky-700 font-bold bg-sky-50 p-2 rounded-xl border border-sky-100/50">
                    <GraduationCap className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                    <span className="truncate">{h.distanceToCampus}</span>
                  </div>

                  <p className="text-stone-600 text-xs leading-relaxed line-clamp-2">
                    {h.description}
                  </p>

                  {/* Amenities mini tags */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {h.services.slice(0, 3).map((serv, idx) => (
                      <span key={idx} className="bg-stone-50 text-stone-600 border border-stone-200/50 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {serv}
                      </span>
                    ))}
                    {h.services.length > 3 && (
                      <span className="text-[10px] font-bold text-[#1a4d2e] self-center">
                        +{h.services.length - 3} مرافق
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action row */}
              <div className="p-5 pt-0">
                <div className="pt-4 border-t border-[#e5e1da] flex flex-wrap items-center justify-between gap-y-3 gap-x-2">
                  <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
                    <a
                      href={getWhatsAppUrl(h.contactWhatsapp || h.contactPhone, `مرحباً، أود الاستفسار بخصوص السكن/العقار المعلن عنه: (${h.title}) على منصة شو في بإربد؟.`)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-2xs cursor-pointer shrink-0"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>واتساب</span>
                    </a>

                    <a
                      href={`tel:${h.contactPhone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all shrink-0"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      <span>اتصال</span>
                    </a>

                    <ShareButton
                      title={`سكن: ${h.title}`}
                      text={`عقارات وسكنات إربد: ${h.title} للإيجار`}
                      url={`/housing`}
                      size="sm"
                      variant="ghost"
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0 flex-nowrap">
                    {isAdmin && (
                      <button
                        onClick={(e) => handleDeleteListing(h.id, e)}
                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0 ml-1"
                        title="حذف الإعلان"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}

                    <span className="text-xs font-black text-[#1a4d2e] group-hover:underline flex items-center gap-1 mr-1 shrink-0">
                      <span>تفاصيل السكن</span>
                      <Eye className="h-3.5 w-3.5 text-[#ff9f1c]" />
                    </span>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Comprehensive Housing Details Modal */}
      {selectedDetail && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[94vh] overflow-y-auto p-5 sm:p-8 shadow-2xl border border-stone-200 relative my-auto animate-in fade-in zoom-in-95 space-y-6">
            
            {/* Image Header */}
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-stone-100 border border-stone-200">
              <img 
                src={selectedDetail.image} 
                alt={selectedDetail.title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => setSelectedDetail(null)}
                className="absolute top-4 right-4 p-2 bg-black/60 text-white hover:bg-black/80 rounded-full transition-colors"
                title="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="absolute top-4 left-4 bg-[#1a4d2e] text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-md">
                {selectedDetail.price} دينار / {selectedDetail.pricePeriod}
              </div>
            </div>

            {/* Title & Logistics */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-[#1a4d2e]/10 text-[#1a4d2e] text-xs font-black px-2.5 py-0.5 rounded-md">
                  {selectedDetail.type}
                </span>
                <span className="bg-orange-50 text-orange-700 border border-orange-100 text-xs font-bold px-2.5 py-0.5 rounded-md">
                  قرب جامعة {selectedDetail.university}
                </span>
                {selectedDetail.isVerified && (
                  <span className="bg-emerald-600 text-white text-xs font-black px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-2xs">
                    <Shield className="h-3 w-3" />
                    سكن معتمد وموثق
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-stone-900">{selectedDetail.title}</h2>
              
              <p className="text-sm text-stone-500 font-bold flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-[#ff9f1c]" />
                <span>{selectedDetail.location}</span>
              </p>
            </div>

            {/* Specific Specs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-stone-50 p-4 rounded-2xl border border-stone-200/70 text-xs text-stone-700">
              <div className="space-y-0.5">
                <span className="text-stone-400 font-bold block">القرب من الجامعة:</span>
                <span className="font-bold text-stone-800">{selectedDetail.distanceToCampus}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-stone-400 font-bold block">الغرف والتقسيم:</span>
                <span className="font-bold text-stone-800">{selectedDetail.roomsCount}</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-stone-400 font-bold block">جهة الاتصال / المالك:</span>
                <span className="font-bold text-stone-800">{selectedDetail.ownerName}</span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="font-black text-xs text-stone-400 uppercase tracking-wider">تفاصيل ووصف العقار:</h4>
              <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-line bg-white p-4 rounded-2xl border border-stone-200">
                {selectedDetail.description}
              </p>
            </div>

            {/* Services/Amenities Checkboxes */}
            <div className="space-y-2">
              <h4 className="font-black text-xs text-[#1a4d2e] uppercase tracking-wider">🌟 الخدمات والمرافق المتوفرة:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100">
                {selectedDetail.services.map((serv, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>{serv}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer Direct Call and WhatsApp */}
            <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-stone-500">
                <span>للاستفسار أو الاتفاق وزيارة السكن، تواصل مع المالك مباشرة:</span>
                <span className="block font-black text-stone-800 text-sm mt-0.5" dir="ltr">{selectedDetail.contactPhone}</span>
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <a
                  href={getWhatsAppUrl(selectedDetail.contactWhatsapp || selectedDetail.contactPhone, `مرحباً، أود الاستفسار بخصوص السكن/العقار المعلن عنه: (${selectedDetail.title}) على منصة شو في بإربد؟.`)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 sm:flex-initial inline-flex justify-center items-center gap-2 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl transition-all shadow-md cursor-pointer"
                >
                  <MessageSquare className="h-4.5 w-4.5" />
                  <span>تواصل عبر الواتساب</span>
                </a>

                <a
                  href={`tel:${selectedDetail.contactPhone}`}
                  className="inline-flex justify-center items-center gap-2 px-4 py-3.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-sm rounded-xl transition-colors cursor-pointer"
                >
                  <Phone className="h-4.5 w-4.5" />
                  <span>اتصال هاتفي</span>
                </a>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Add Housing Listing Form Modal */}
      {isFormOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-stone-200 relative my-auto animate-in fade-in zoom-in-95 space-y-5">
            
            <button
              onClick={() => setIsFormOpen(false)}
              className="absolute top-4 right-4 p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100"
              title="إغلاق"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-emerald-50 text-[#1a4d2e] rounded-2xl flex items-center justify-center mx-auto border border-emerald-100">
                <HomeIcon className="h-6 w-6 text-[#1a4d2e]" />
              </div>
              <h3 className="text-xl font-black text-stone-900">أضف عقارك أو سكنك في الدليل</h3>
              <p className="text-xs text-stone-500 leading-relaxed max-w-sm mx-auto">
                أعلن عن شقتك أو سكن الطالبات/الطلاب الخاص بك ليصل إلى آلاف الباحثين في إربد مجاناً وبكل سهولة.
              </p>
            </div>

            <form onSubmit={handleCreateListing} className="space-y-4 text-xs font-bold text-stone-700">
              {/* Honeypot field - 100% hidden from humans, bots will fill it */}
              <div className="absolute opacity-0 -z-50 pointer-events-none" style={{ width: 0, height: 0, overflow: 'hidden' }}>
                <label htmlFor="housing_website_hp">لا تقم بتعبئة هذا الحقل إذا كنت بشراً</label>
                <input
                  type="text"
                  id="housing_website_hp"
                  name="housing_website_hp"
                  tabIndex={-1}
                  autoComplete="off"
                  value={hpValue}
                  onChange={(e) => setHpValue(e.target.value)}
                />
              </div>
              
              <div className="space-y-1">
                <label className="block text-stone-600">عنوان الإعلان الأساسي *</label>
                <input
                  type="text"
                  required
                  value={newListing.title}
                  onChange={(e) => setNewListing({ ...newListing, title: e.target.value })}
                  placeholder="مثال: سكن الوردة لطالبات العلوم والتكنولوجيا"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 font-bold focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#1a4d2e]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-stone-600">نوع العقار/السكن *</label>
                  <select
                    value={newListing.type}
                    onChange={(e) => setNewListing({ ...newListing, type: e.target.value as any })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 font-bold focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#1a4d2e]"
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
                    value={newListing.university}
                    onChange={(e) => setNewListing({ ...newListing, university: e.target.value as any })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 font-bold focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#1a4d2e]"
                  >
                    <option value="اليرموك">جامعة اليرموك</option>
                    <option value="العلوم والتكنولوجيا">جامعة العلوم والتكنولوجيا (JUST)</option>
                    <option value="أخرى / وسط المدينة">أخرى / وسط إربد</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-stone-600">الأجرة المطلوبة (بالدينار الأردني) *</label>
                  <input
                    type="number"
                    required
                    value={newListing.price}
                    onChange={(e) => setNewListing({ ...newListing, price: e.target.value })}
                    placeholder="مثال: 125"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 font-bold focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#1a4d2e]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-stone-600">فترة الأجرة *</label>
                  <select
                    value={newListing.pricePeriod}
                    onChange={(e) => setNewListing({ ...newListing, pricePeriod: e.target.value as any })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 font-bold focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#1a4d2e]"
                  >
                    <option value="شهري">شهري</option>
                    <option value="فصلي">فصلي</option>
                    <option value="سنوي">سنوي</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-stone-600">الموقع والتفاصيل الجغرافية *</label>
                <input
                  type="text"
                  required
                  value={newListing.location}
                  onChange={(e) => setNewListing({ ...newListing, location: e.target.value })}
                  placeholder="مثال: إربد، شارع جامعة اليرموك، خلف مخابز نبيل"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 font-bold focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#1a4d2e]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-stone-600">القرب من الجامعة / حرم الكليات</label>
                  <input
                    type="text"
                    value={newListing.distanceToCampus}
                    onChange={(e) => setNewListing({ ...newListing, distanceToCampus: e.target.value })}
                    placeholder="مثال: دقيقتان سيراً من البوابة"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 font-bold focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#1a4d2e]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-stone-600">تقسيم الغرف المتاحة</label>
                  <input
                    type="text"
                    value={newListing.roomsCount}
                    onChange={(e) => setNewListing({ ...newListing, roomsCount: e.target.value })}
                    placeholder="مثال: أستوديو مفرد أو غرفة مزدوجة"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 font-bold focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#1a4d2e]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-stone-600">الخدمات والمرافق المتوفرة (افصل بينها بـ "،")</label>
                <input
                  type="text"
                  value={newListing.servicesString}
                  onChange={(e) => setNewListing({ ...newListing, servicesString: e.target.value })}
                  placeholder="مثال: إنترنت مجاني، حراسة ومصعد، كهرباء مشمولة، تكييف"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 font-bold focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#1a4d2e]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-stone-600">وصف كامل وشامل للعقار</label>
                <textarea
                  value={newListing.description}
                  onChange={(e) => setNewListing({ ...newListing, description: e.target.value })}
                  rows={2}
                  placeholder="اكتب هنا أي تفاصيل إضافية تهم المستأجر (أوقات الزيارة، الدفعة الأولى، متطلبات خاصة الخ...)"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-stone-800 font-bold focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#1a4d2e]"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1 space-y-1">
                  <label className="block text-stone-600">اسم المالك/المعلن *</label>
                  <input
                    type="text"
                    required
                    value={newListing.ownerName}
                    onChange={(e) => setNewListing({ ...newListing, ownerName: e.target.value })}
                    placeholder="أبو أحمد"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 font-bold focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#1a4d2e]"
                  />
                </div>

                <div className="col-span-1 space-y-1">
                  <label className="block text-stone-600">رقم الهاتف للاتصال *</label>
                  <input
                    type="tel"
                    required
                    value={newListing.contactPhone}
                    onChange={(e) => setNewListing({ ...newListing, contactPhone: e.target.value })}
                    placeholder="07XXXXXXXX"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 font-bold text-left focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#1a4d2e]"
                    dir="ltr"
                  />
                </div>

                <div className="col-span-1 space-y-1">
                  <label className="block text-stone-600">رقم الواتساب</label>
                  <input
                    type="tel"
                    value={newListing.contactWhatsapp}
                    onChange={(e) => setNewListing({ ...newListing, contactWhatsapp: e.target.value })}
                    placeholder="07XXXXXXXX"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 font-bold text-left focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#1a4d2e]"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-stone-600">رابط صورة العقار (اختياري)</label>
                <input
                  type="url"
                  value={newListing.image}
                  onChange={(e) => setNewListing({ ...newListing, image: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-stone-800 font-bold focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#1a4d2e]"
                  dir="ltr"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white font-black text-sm rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                <span>نشر العقار بالدليل فوراً</span>
              </button>
            </form>

          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
