import React, { useState, useMemo } from 'react';
import { 
  Bus, 
  MapPin, 
  Clock, 
  Search, 
  Phone, 
  Navigation, 
  Compass, 
  Info, 
  HelpCircle, 
  ShieldCheck, 
  DollarSign, 
  CheckCircle2, 
  ArrowLeftRight, 
  Car, 
  Sparkles, 
  Share2, 
  Check, 
  Building2,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router';
import { SEO } from '../components/common/SEO';

interface Terminal {
  id: string;
  name: string;
  location: string;
  description: string;
  destinationTypes: string[];
  destinations: { name: string; vehicleType: string; approxFare: string; duration: string; frequency: string }[];
}

interface TaxiApp {
  name: string;
  type: string;
  phone?: string;
  description: string;
  badge: string;
}

export function Transportation() {
  const [activeTab, setActiveTab] = useState<'terminals' | 'routes' | 'taxis' | 'tips'>('terminals');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTerminal, setSelectedTerminal] = useState<string>('all');
  const [copied, setCopied] = useState(false);

  const terminalsData: Terminal[] = [
    {
      id: 'amman-new',
      name: 'مجمع عمان الجديد (مجمع إربد الرئيسي)',
      location: 'جنوب مدينة إربد - بالقرب من دوار الثقافة وشبكة الطرق الرئيسية',
      description: 'أكبر مجمع حافلات وسرفيس في إربد، المنفذ الرئيسي للسفر بين إربد والعاصمة عمان وباقي محافظات المملكة.',
      destinationTypes: ['عمان', 'الزرقاء', 'المفرق', 'جرش', 'السلط', 'جامعة العلوم والتكنولوجيا'],
      destinations: [
        { name: 'عمان (مجمع الشمال - صويلح / العبدلي)', vehicleType: 'حافلات كوستر / باصات كبيرة / سرفيس', approxFare: '1.25 - 1.80 د.أ', duration: '50 - 65 دقيقة', frequency: 'كل 5 - 10 دقائق' },
        { name: 'الزرقاء (مجمع الزرقاء الجديد)', vehicleType: 'باصات كوستر', approxFare: '1.40 د.أ', duration: '50 دقيقة', frequency: 'كل 15 دقيقة' },
        { name: 'جامعة العلوم والتكنولوجيا الاردنية (JUST)', vehicleType: 'باصات مخصصة لطلاب الجامعات', approxFare: '0.45 - 0.60 د.أ', duration: '20 - 25 دقيقة', frequency: 'مستمر طوال اليوم الدراسي' },
        { name: 'جرش (مجمع جرش)', vehicleType: 'باصات كوستر / سرفيس', approxFare: '0.75 د.أ', duration: '25 - 30 دقيقة', frequency: 'كل 15 دقيقة' },
        { name: 'المفرق', vehicleType: 'باصات كوستر', approxFare: '1.10 د.أ', duration: '40 دقيقة', frequency: 'كل 20 دقيقة' },
        { name: 'السلط / مادبا', vehicleType: 'باصات سفر مباشرة', approxFare: '1.75 - 2.00 د.أ', duration: '60 - 75 دقيقة', frequency: 'حسب الجدول الإرشادي' },
      ]
    },
    {
      id: 'north',
      name: 'مجمع الشمال (مجمع إربد الشمالي)',
      location: 'شمال إربد - بالقرب من شارع فلسطين وجامعة اليرموك (البوابة الشمالية)',
      description: 'المجمع المخصص لنقل الركاب والطلاب بين إربد ولواء الرمثا، وقرى شمال إربد وجامعة اليرموك.',
      destinationTypes: ['الرمثا', 'جامعة اليرموك', 'قوائم قرى شمال إربد'],
      destinations: [
        { name: 'الرمثا (وسط الرمثا / المجمع القديم)', vehicleType: 'باصات كوستر / سرفيس خط أحمر', approxFare: '0.50 د.أ', duration: '15 - 20 دقيقة', frequency: 'كل 5 دقائق' },
        { name: 'قرى الرمثا والبويضة', vehicleType: 'باصات سرفيس', approxFare: '0.45 - 0.60 د.أ', duration: '20 دقيقة', frequency: 'كل 15 دقيقة' },
        { name: 'حريما، السيلة، وخرجا', vehicleType: 'باصات كوستر', approxFare: '0.55 د.أ', duration: '25 دقيقة', frequency: 'كل 20 دقيقة' },
        { name: 'جامعة اليرموك (خط دائري مجمع الشمال - البوابة الشمالية)', vehicleType: 'سرفيس داخلي', approxFare: '0.30 د.أ', duration: '5 - 10 دقائق', frequency: 'مستمر' }
      ]
    },
    {
      id: 'aghwar',
      name: 'مجمع الأغوار (القديم والجديد)',
      location: 'غرب مدينة إربد - شارع الأغوار',
      description: 'نقطة الانطلاق الرئيسية نحو مناطق الأغوار الشمالية، الشونة الشمالية، دير علا، ودير أبي سعيد.',
      destinationTypes: ['الشونة الشمالية', 'دير علا', 'الكورة / دير أبي سعيد', 'الشارع الغربي'],
      destinations: [
        { name: 'الشونة الشمالية والمشارع', vehicleType: 'باصات كوستر', approxFare: '0.70 - 0.90 د.أ', duration: '35 - 45 دقيقة', frequency: 'كل 15 دقيقة' },
        { name: 'دير أبي سعيد (لواء الكورة)', vehicleType: 'باصات سرفيس وكوستر', approxFare: '0.65 د.أ', duration: '30 - 40 دقيقة', frequency: 'كل 10 دقائق' },
        { name: 'دير علا وسد الملك طلال', vehicleType: 'باصات كوستر خط مباشر', approxFare: '1.20 د.أ', duration: '50 - 60 دقيقة', frequency: 'كل 30 دقيقة' },
        { name: 'كفر أسد وصيدور', vehicleType: 'سرفيس كوستر', approxFare: '0.45 د.أ', duration: '20 دقيقة', frequency: 'كل 15 دقيقة' }
      ]
    }
  ];

  const internalRoutes = [
    {
      name: 'خط جامعة اليرموك - وسط البلد - دوار القبة',
      code: 'خط 1 - سرفيس أبيض',
      stops: ['مجمع عمان الجديد', 'شارع الجامعة', 'البوابة الجنوبية (اليرموك)', 'دوار القبة', 'وسط البلد (شارع السينما)'],
      fare: '0.35 د.أ',
      time: 'من 06:30 ص حتى 10:00 م'
    },
    {
      name: 'خط الحصن - الصريح - مجمع عمان',
      code: 'خط 4 - سرفيس كابريس/كوستر',
      stops: ['مجمع عمان الجديد', 'دوار الثقافة', 'الصريح (المثلث)', 'وسط الحصن', 'كلية الحصن الجامعية'],
      fare: '0.40 د.أ',
      time: 'من 06:00 ص حتى 09:30 م'
    },
    {
      name: 'خط الحي الشرقي - المستشفى التخصصي - مستشفى البديعة',
      code: 'خط 8 - باصات حمراء ودائرية',
      stops: ['وسط البلد', 'دوار النسيم', 'الحي الشرقي', 'مستشفى إربد التخصصي', 'حي الروضة'],
      fare: '0.35 د.أ',
      time: 'من 07:00 ص حتى 09:00 م'
    },
    {
      name: 'خط الحي الغربي - مستشفى الأميرة بسمة',
      code: 'خط 12 - سرفيس',
      stops: ['وسط البلد', 'شارع حوارة', 'الحي الغربي', 'مستشفى الأميرة بسمة التعليمي'],
      fare: '0.35 د.أ',
      time: 'من 06:30 ص حتى 09:30 م'
    },
    {
      name: 'خط جامعة العلوم والتكنولوجيا (طلاب وصحافة)',
      code: 'خط الحافلات الجامعية السريعة',
      stops: ['مجمع عمان الجديد', 'دوار الثقافة', 'طريق الرمثا الدولي', 'مجمع الكليات - جامعة التكنولوجيا'],
      fare: '0.50 - 0.65 د.أ',
      time: 'من 07:00 ص حتى 06:00 م (أيام الدوام الجامعي)'
    },
    {
      name: 'خط إيدون - مستشفى الراهبات الوردية',
      code: 'خط 15 - سرفيس',
      stops: ['مجمع عمان', 'شارع الراهبات', 'إيدون وسط البلد', 'مستشفى الراهبات الوردية'],
      fare: '0.40 د.أ',
      time: 'من 06:30 ص حتى 09:00 م'
    }
  ];

  const taxiApps: TaxiApp[] = [
    {
      name: 'التاكسي الأصفر والتكسي المميز في إربد',
      type: 'تاكسي جوال تقليدي / العداد',
      description: 'التاكسي الأصفر متوفر بكثرة في كافة شوارع إربد الرئيسية ومجمعات الحافلات. فتحة العداد تبدأ من 0.35 د.أ.',
      badge: 'الأكثر انتشاراً'
    },
    {
      name: 'تطبيقات التاكسي والتوصيل الذكي (Uber / Careem / Jeeny)',
      type: 'تطبيق هاتف ذكي',
      description: 'تعمل التطبيقات الذكية بكفاءة عالية في مدينة إربد والمناطق المجاورة، وتعتبر الخيار المفضل للتنقل المريح والآمن.',
      badge: 'طلب عبر التطبيق'
    },
    {
      name: 'مكاتب تاكسي إربد المركزية (طلب هاتفي)',
      type: 'مكاتب طلب تاكسي بالهاتف',
      phone: '02-724-4444 / 02-727-8888',
      description: 'يمكنك الاتصال بطلب تاكسي ليصلك لموقعك داخل أي حي في إربد.',
      badge: 'حجز بالهاتف'
    }
  ];

  // Filtered terminals / destinations by search query
  const filteredTerminals = useMemo(() => {
    if (!searchQuery.trim()) return terminalsData;
    const q = searchQuery.toLowerCase().trim();
    return terminalsData.map(t => {
      const matchingDest = t.destinations.filter(d => 
        d.name.toLowerCase().includes(q) || d.vehicleType.toLowerCase().includes(q)
      );
      if (t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || matchingDest.length > 0) {
        return {
          ...t,
          destinations: matchingDest.length > 0 ? matchingDest : t.destinations
        };
      }
      return null;
    }).filter(Boolean) as Terminal[];
  }, [searchQuery]);

  const filteredRoutes = useMemo(() => {
    if (!searchQuery.trim()) return internalRoutes;
    const q = searchQuery.toLowerCase().trim();
    return internalRoutes.filter(r => 
      r.name.toLowerCase().includes(q) || 
      r.code.toLowerCase().includes(q) || 
      r.stops.some(s => s.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const handleCopyGuide = () => {
    const text = `🚌 دليل مواصلات ومجمعات مدينة إربد الشامل:\n- مجمع عمان الجديد: للتنقل إلى عمان والزرقاء وجرش والتكنولوجيا.\n- مجمع الشمال: للتنقل إلى الرمثا وقرى الشمال واليرموك.\n- مجمع الأغوار: للتنقل إلى الأغوار والكورة.\n\nتصفح التفاصيل كاملة عبر تطبيق "شو في بإربد؟"`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#fdfcfb] pb-16" dir="rtl">
      <SEO 
        title="دليل مواصلات ومجمعات إربد | خطوط باصات وتكاسي إربد"
        description="دليل خطوط ومواصلات محافظة إربد الشامل: مجمع عمان الجديد، مجمع الشمال، مجمع الأغوار، باصات جامعة اليرموك وجامعة العلوم والتكنولوجيا، خطوط السرفيس وتطبيقات التاكسي."
        keywords={['مواصلات إربد', 'باصات إربد', 'مجمع عمان الجديد', 'مجمع الشمال إربد', 'مجمع الأغوار إربد', 'تكاسي إربد', 'سرفيس إربد', 'جامعة اليرموك مواصلات', 'تكنولوجيا مواصلات']}
        canonicalUrl="https://shofierbid.com/transportation"
      />
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-[#1a4d2e] via-[#143e25] to-[#0a2314] text-white pt-8 pb-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden shadow-md">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ff9f1c_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-[#ff9f1c]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto relative z-10 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md flex items-center justify-center text-[#ff9f1c] shadow-inner">
                <Bus className="h-6 w-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-2 bg-emerald-500/25 border border-emerald-400/30 text-emerald-200 px-3 py-0.5 rounded-full text-xs font-bold mb-1">
                  <MapPin className="h-3.5 w-3.5 text-[#ff9f1c]" />
                  <span>دليل التنقل والمجمعات • إربد</span>
                </div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white">
                  دليل وسائل النقل والموصلات في إربد
                </h1>
              </div>
            </div>

            <button
              onClick={handleCopyGuide}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-3.5 py-2 rounded-xl text-xs font-bold transition-all backdrop-blur-md cursor-pointer"
            >
              {copied ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <Share2 className="h-4 w-4" />}
              <span>{copied ? 'تم نسخ الدليل!' : 'مشاركة الدليل'}</span>
            </button>
          </div>

          <p className="text-stone-200 text-xs sm:text-sm max-w-2xl leading-relaxed">
            دليلك الشامل لمعرفة مجمعات إربد الرئيسية (مجمع عمان الجديد، مجمع الشمال، مجمع الأغوار)، خطوط باصات والسرفيس للجامعات والأحياء، والتكلفة المتوقعة وأوقات التردد.
          </p>

          {/* Search bar */}
          <div className="relative max-w-xl">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث عن منطقتك أو وجهتك (مثال: عمان، الرمثا، التكنولوجيا، الحصن)..."
              className="w-full bg-white text-stone-900 pr-11 pl-4 py-3.5 rounded-2xl text-xs sm:text-sm font-bold shadow-lg focus:outline-none focus:ring-2 focus:ring-[#ff9f1c]"
            />
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 hover:text-stone-600 bg-stone-100 px-2 py-1 rounded-md"
              >
                مسح
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 space-y-8">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-stone-200 pb-2 overflow-x-auto bg-white/80 backdrop-blur-md p-2 rounded-2xl shadow-sm border border-stone-200/60">
          <button
            onClick={() => setActiveTab('terminals')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'terminals' 
                ? 'bg-[#1a4d2e] text-white shadow-md' 
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Building2 className="h-4 w-4 text-[#ff9f1c]" />
            <span>مجمعات الحافلات الرئيسية (3)</span>
          </button>

          <button
            onClick={() => setActiveTab('routes')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'routes' 
                ? 'bg-[#1a4d2e] text-white shadow-md' 
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <ArrowLeftRight className="h-4 w-4 text-[#ff9f1c]" />
            <span>خطوط السرفيس والباص الداخلي</span>
          </button>

          <button
            onClick={() => setActiveTab('taxis')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'taxis' 
                ? 'bg-[#1a4d2e] text-white shadow-md' 
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Car className="h-4 w-4 text-[#ff9f1c]" />
            <span>التاكسي والتطبيقات الذكية</span>
          </button>

          <button
            onClick={() => setActiveTab('tips')}
            className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeTab === 'tips' 
                ? 'bg-[#1a4d2e] text-white shadow-md' 
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <Info className="h-4 w-4 text-[#ff9f1c]" />
            <span>نصائح وأوقات الذروة</span>
          </button>
        </div>

        {/* Tab 1: Terminals (المجمعات الرئيسية) */}
        {activeTab === 'terminals' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#2d2a26]">
                  مجمعات الحافلات والمحافظات في إربد
                </h2>
                <p className="text-xs text-stone-500 font-medium mt-0.5">
                  أين تذهب ومن أي مجمع تنطلق في عروس الشمال
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {filteredTerminals.map((terminal) => (
                <div key={terminal.id} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-md space-y-5 hover:border-[#1a4d2e]/30 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#1a4d2e]/10 text-[#1a4d2e] flex items-center justify-center shrink-0 font-bold">
                        <Bus className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="text-lg sm:text-xl font-black text-[#2d2a26]">{terminal.name}</h3>
                        <p className="text-xs text-[#1a4d2e] font-bold flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3.5 w-3.5 text-[#ff9f1c]" />
                          <span>{terminal.location}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-stone-600 leading-relaxed font-medium">
                    {terminal.description}
                  </p>

                  {/* Destinations Table */}
                  <div className="space-y-2">
                    <span className="text-xs font-black text-stone-800 block">
                      الوجهات والخطوط المنطلقة من المجمع:
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {terminal.destinations.map((dest, idx) => (
                        <div key={idx} className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 flex flex-col justify-between gap-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-black text-sm text-[#2d2a26]">{dest.name}</span>
                            <span className="text-xs font-black text-[#1a4d2e] bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                              {dest.approxFare}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-500 font-medium pt-1 border-t border-stone-200/60">
                            <span className="flex items-center gap-1">
                              <Bus className="h-3 w-3 text-stone-400" />
                              {dest.vehicleType}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3 text-stone-400" />
                              {dest.duration}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Internal Routes (الخطوط الداخلية) */}
        {activeTab === 'routes' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#2d2a26]">
                خطوط السرفيس والباصات الداخلية في إربد
              </h2>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                خطوط سير المواصلات الداخلية للجامعات والأحياء والمستشفيات
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRoutes.map((route, idx) => (
                <div key={idx} className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-3">
                    <div>
                      <span className="text-[10px] font-black bg-[#1a4d2e]/10 text-[#1a4d2e] px-2.5 py-0.5 rounded-full block w-fit mb-1">
                        {route.code}
                      </span>
                      <h3 className="font-black text-base text-[#2d2a26]">{route.name}</h3>
                    </div>

                    <div className="text-left shrink-0">
                      <span className="text-xs font-black text-[#1a4d2e] bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 block">
                        {route.fare}
                      </span>
                    </div>
                  </div>

                  {/* Route Stops Flow */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-bold text-stone-400 block">مسار الخط والمواقف الرئيسية:</span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {route.stops.map((stop, sIdx) => (
                        <React.Fragment key={sIdx}>
                          <span className="text-xs font-bold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg">
                            {stop}
                          </span>
                          {sIdx < route.stops.length - 1 && (
                            <span className="text-stone-300 font-bold text-xs">←</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-[#ff9f1c]" />
                      ساعات العمل: {route.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Taxis & Ride Apps */}
        {activeTab === 'taxis' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#2d2a26]">
                التاكسي والتطبيقات الذكية في إربد
              </h2>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                خيارات التنقل الخاص والمباشر داخل المحافظة
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {taxiApps.map((app, idx) => (
                <div key={idx} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black bg-[#ff9f1c]/20 text-amber-900 px-2.5 py-0.5 rounded-full">
                        {app.badge}
                      </span>
                      <Car className="h-5 w-5 text-[#1a4d2e]" />
                    </div>

                    <h3 className="font-black text-lg text-[#2d2a26]">{app.name}</h3>
                    <p className="text-xs text-[#1a4d2e] font-bold">{app.type}</p>
                    <p className="text-xs text-stone-600 leading-relaxed">{app.description}</p>
                  </div>

                  {app.phone && (
                    <div className="pt-3 border-t border-stone-100">
                      <a
                        href={`tel:${app.phone.split('/')[0].trim()}`}
                        className="w-full inline-flex items-center justify-center gap-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white py-2.5 rounded-xl text-xs font-bold transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        <span>اتصال: {app.phone}</span>
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Advice & Peak Times */}
        {activeTab === 'tips' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#2d2a26]">
                إرشادات وأوقات الذروة للتنقل في إربد
              </h2>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                نصائح لتجنب الازدحام المروري خاصة لطلاب الجامعات والموظفين
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-amber-50/70 border border-amber-200 rounded-3xl p-6 space-y-3">
                <div className="flex items-center gap-2 text-amber-900 font-black">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <h3>أوقات الذروة المرورية في إربد</h3>
                </div>
                <ul className="space-y-2 text-xs text-amber-950 font-medium leading-relaxed list-disc list-inside">
                  <li><strong>الفترة الصباحية:</strong> من الساعة 07:30 ص إلى 09:00 ص (ذروة ذهاب طلاب جامعة اليرموك والتكنولوجيا والموظفين).</li>
                  <li><strong>فترة الظهيرة:</strong> من 01:30 ظهراً إلى 04:00 عصراً (ذروة المغادرة من الجامعات ومجمع عمان ومجمع الشمال).</li>
                  <li><strong>شارع الجامعة وشارع السينما:</strong> تشهد ازدحاماً ملحوظاً في الساعات بين 05:00 م و08:00 م.</li>
                </ul>
              </div>

              <div className="bg-emerald-50/70 border border-emerald-200 rounded-3xl p-6 space-y-3">
                <div className="flex items-center gap-2 text-emerald-950 font-black">
                  <ShieldCheck className="h-5 w-5 text-emerald-700" />
                  <h3>نصائح ذهبية للركاب والطلاب</h3>
                </div>
                <ul className="space-y-2 text-xs text-emerald-950 font-medium leading-relaxed list-disc list-inside">
                  <li>تأكد من وجود فكة (قطع نقدية صغيرة 0.35، 0.50 د.أ) لتسهيل الدفع للسائقين.</li>
                  <li>عند السفر إلى عمان أيام الأحد والخميس، ينصح بالتوجه إلى مجمع عمان الجديد قبل الساعة 07:00 صباحاً لتفادي الطوابير.</li>
                  <li>تأكد من سؤال السائق عن وجهة السرفيس قبل الركوب إذا كنت متجهاً لأحياء فرعية.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
