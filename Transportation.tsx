import React, { useState, useEffect, useMemo } from 'react';
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
  ExternalLink,
  X
} from 'lucide-react';
import { Link } from 'react-router';
import { SEO } from '../components/common/SEO';
import { BannerSlideshow } from '../components/BannerSlideshow';
import { HomepageBanner, TerminalItem, RouteItem, TaxiItem } from '../types';
import { fetchPageBanners, DEFAULT_TRANSPORT_BANNERS } from '../lib/pageBanners';
import { fetchTransportation } from '../lib/transportationService';
import { useAuth } from '../contexts/AuthContext';

export function Transportation() {
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<'terminals' | 'routes' | 'taxis' | 'tips'>('terminals');
  const [banners, setBanners] = useState<HomepageBanner[]>(DEFAULT_TRANSPORT_BANNERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const [terminalsData, setTerminalsData] = useState<TerminalItem[]>([]);
  const [internalRoutes, setInternalRoutes] = useState<RouteItem[]>([]);
  const [taxiApps, setTaxiApps] = useState<TaxiItem[]>([]);

  useEffect(() => {
    fetchPageBanners(['مواصلات', 'باصات', 'مجمع', 'سرفيس', 'تكاسي'], DEFAULT_TRANSPORT_BANNERS, 'transportation')
      .then(res => setBanners(res))
      .catch(() => setBanners(DEFAULT_TRANSPORT_BANNERS));

    fetchTransportation()
      .then(res => {
        setTerminalsData(res.terminals);
        setInternalRoutes(res.routes);
        setTaxiApps(res.taxis);
      })
      .catch(err => console.error("Error loading transportation:", err))
      .finally(() => setLoading(false));
  }, []);

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
    }).filter(Boolean) as TerminalItem[];
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
        canonicalUrl="https://shofibirbid.site/transportation"
      />
      {/* Banner Slideshow */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <BannerSlideshow banners={banners} />
      </div>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        
        {/* Page Header & Search Bar (Compact & Sleek) */}
        <div className="bg-white rounded-2xl md:rounded-3xl p-3.5 sm:p-5 border border-[#e5e1da] shadow-xs space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1 bg-emerald-50 text-[#1a4d2e] border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-black">
                <Bus className="h-3 w-3 text-[#1a4d2e]" />
                <span>دليل التنقل • إربد</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                دليل النقل والمواصلات في إربد
              </h1>
              <p className="hidden sm:block text-stone-500 text-xs font-medium leading-relaxed">
                دليلك الشامل لمجمعات إربد الرئيسية، خطوط الباصات والسرفيس للجامعات والأحياء.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {isAdmin && (
                <Link
                  to="/admin?tab=transportation"
                  className="inline-flex items-center justify-center gap-1.5 bg-[#1a4d2e] hover:bg-[#143e25] text-white px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-xs font-black shadow-xs transition-all shrink-0 cursor-pointer"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-[#ff9f1c]" />
                  <span>إدارة المواصلات</span>
                </Link>
              )}

              <button
                onClick={handleCopyGuide}
                className="inline-flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer"
              >
                {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <Share2 className="h-3.5 w-3.5" />}
                <span>{copied ? 'تم النسخ!' : 'مشاركة الدليل'}</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث عن منطقتك أو وجهتك (مثال: عمان، الرمثا، التكنولوجيا، الحصن)..."
              className="w-full bg-[#fdfcfb] text-stone-900 placeholder:text-stone-400 border border-[#e5e1da] rounded-xl px-3.5 py-2.5 pr-10 text-xs sm:text-sm focus:outline-none focus:border-[#1a4d2e] focus:bg-white transition-all shadow-inner"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        
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
            <span>مجمعات الحافلات الرئيسية ({terminalsData.length})</span>
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
            <span>خطوط السرفيس والباص الداخلي ({internalRoutes.length})</span>
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
            <span>التاكسي والتطبيقات الذكية ({taxiApps.length})</span>
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

        {/* Loading Spinner */}
        {loading && (
          <div className="bg-white rounded-3xl p-12 text-center border border-[#e5e1da] space-y-3">
            <div className="w-8 h-8 border-3 border-[#1a4d2e] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-stone-500">جاري تحميل دليل المواصلات...</p>
          </div>
        )}

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

            {filteredTerminals.length === 0 && !loading ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-stone-200">
                <Building2 className="h-8 w-8 text-stone-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-stone-700">لا توجد مجمعات حافلات حالياً</p>
                {isAdmin && (
                  <Link to="/admin?tab=transportation" className="inline-block mt-3 text-xs text-[#1a4d2e] font-black underline">
                    إضافة أو استرجاع المجمعات من لوحة تحكم الإدارة
                  </Link>
                )}
              </div>
            ) : (
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
            )}
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

            {filteredRoutes.length === 0 && !loading ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-stone-200">
                <ArrowLeftRight className="h-8 w-8 text-stone-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-stone-700">لا توجد خطوط سير حالياً</p>
                {isAdmin && (
                  <Link to="/admin?tab=transportation" className="inline-block mt-3 text-xs text-[#1a4d2e] font-black underline">
                    إضافة أو استرجاع خطوط السير من لوحة تحكم الإدارة
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRoutes.map((route, idx) => (
                  <div key={route.id || idx} className="bg-white rounded-3xl p-5 border border-stone-200 shadow-sm space-y-4 hover:shadow-md transition-all">
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
            )}
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

            {taxiApps.length === 0 && !loading ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-stone-200">
                <Car className="h-8 w-8 text-stone-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-stone-700">لا توجد خدمات تاكسي مضافة حالياً</p>
                {isAdmin && (
                  <Link to="/admin?tab=transportation" className="inline-block mt-3 text-xs text-[#1a4d2e] font-black underline">
                    إضافة أو استرجاع خدمات التاكسي من لوحة تحكم الإدارة
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {taxiApps.map((app, idx) => (
                  <div key={app.id || idx} className="bg-white rounded-3xl p-6 border border-stone-200 shadow-sm space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black bg-[#ff9f1c]/20 text-amber-900 px-2.5 py-0.5 rounded-full">
                          {app.badge}
                        </span>
                        <Car className="h-5 w-5 text-[#1a4d2e]" />
                      </div>

                      <h3 className="font-black text-lg text-[#2d2a26]">{app.name}</h3>
                      <p className="text-xs text-[#1a4d2e] font-bold">{app.categoryType || (app as any).type}</p>
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
            )}
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
