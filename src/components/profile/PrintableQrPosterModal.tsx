import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Business } from '../../types';
import { useSystemSettings } from '../../contexts/SystemSettingsContext';
import { isMedicalBusiness } from '../../lib/medicalHelper';
import { 
  Printer, 
  X, 
  Sparkles, 
  QrCode, 
  Store, 
  Check, 
  Copy, 
  ShieldCheck, 
  Stethoscope, 
  Building2, 
  Globe, 
  Phone, 
  MapPin, 
  Layers, 
  Award,
  CheckCircle2,
  Share2
} from 'lucide-react';

interface PrintableQrPosterModalProps {
  business: Business;
  isOpen: boolean;
  onClose: () => void;
}

type PosterTheme = 
  | 'royal_emerald' 
  | 'executive_light' 
  | 'dark_luxe' 
  | 'clinical_teal' 
  | 'medical_navy' 
  | 'minimal_clean';

export function PrintableQrPosterModal({ business, isOpen, onClose }: PrintableQrPosterModalProps) {
  const { globalSettings } = useSystemSettings();
  const isMedical = isMedicalBusiness(business) || Boolean(business.facilityType) || Boolean((business as any).isMedicalFacility);

  // Set intelligent default theme based on business type
  const [theme, setTheme] = useState<PosterTheme>(() => 
    isMedical ? 'clinical_teal' : 'royal_emerald'
  );

  // Subtitle / CTA message
  const [subtitle, setSubtitle] = useState(() => 
    isMedical 
      ? 'امسح الرمز لفتح الملف الطبي، حجز المواعيد، والاطلاع على شبكة التأمين المعتمدة'
      : 'امسح الرمز للاطلاع على قائمة المنيو، العروض الحصرية، وتقييم تجربتك'
  );

  const [deskOrTable, setDeskOrTable] = useState('');
  const [showContactDetails, setShowContactDetails] = useState(true);
  const [showEnglishText, setShowEnglishText] = useState(true);
  const [copied, setCopied] = useState(false);
  
  // Mobile Tab Switcher: 'preview' (Live A4 Preview) or 'customizer' (Design & Settings)
  const [mobileTab, setMobileTab] = useState<'preview' | 'customizer'>('preview');

  // Sync default subtitle when switching between medical and commercial defaults if needed
  useEffect(() => {
    if (isMedical) {
      setTheme('clinical_teal');
      setSubtitle('امسح الرمز لفتح الملف الطبي، حجز المواعيد، والاطلاع على شبكة التأمين المعتمدة');
    } else {
      setTheme('royal_emerald');
      setSubtitle('امسح الرمز للاطلاع على قائمة المنيو، العروض الحصرية، وتقييم تجربتك');
    }
  }, [business.id, isMedical]);

  if (!isOpen || typeof document === 'undefined') return null;

  // Official URLs and platform name (without irbid.shop)
  const siteOfficialName = "دليل إربد التجاري والسياحي الشامل";
  const siteOfficialDomain = "shofibirbid.site";
  const storeUrl = `https://${siteOfficialDomain}/business/${business.id}`;
  
  // High-Resolution crisp QR Code
  // Determine QR Foreground color based on theme
  const qrColorHex = 
    theme === 'royal_emerald' ? '1a4d2e' :
    theme === 'clinical_teal' ? '0f766e' :
    theme === 'medical_navy' ? '0f172a' :
    theme === 'dark_luxe' ? '0a0a0a' :
    theme === 'executive_light' ? '1e293b' : '18181b';

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(storeUrl)}&color=${qrColorHex}&ecc=H&margin=1`;

  const officialLogoUrl = globalSettings.logoUrl || '/logo.png';

  const handlePrint = () => {
    window.print();
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Quick preset CTA phrases
  const medicalPresets = [
    'امسح الرمز لفتح الملف الطبي، حجز المواعيد، والاطلاع على شبكة التأمين المعتمدة',
    'امسح الرمز للاطلاع على تخصصات الأطباء، الاستشارات، وأوقات الدوام الرسمية',
    'امسح الرمز للتقييم الفوري للخدمة الطبية والوصول لصفحة العيادة الرسمية',
    'امسح الرمز للتواصل المباشر مع الاستقبال وحجز استشارة طبية'
  ];

  const commercialPresets = [
    'امسح الرمز للاطلاع على قائمة المنيو، العروض الحصرية، وتقييم تجربتك',
    'امسح الرمز لاستعراض المنتجات والخدمات والطلب الفوري المباشر',
    'امسح الرمز لتقييم زيارتك معنا وكتابة انطباعك في دليل إربد الرسمي',
    'امسح الرمز لزيارة صفحتنا الرسمية والتواصل السريع عبر واتساب'
  ];

  return createPortal(
    <div 
      className="fixed inset-0 z-[100000] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-y-auto" 
      dir="rtl"
    >
      {/* High-Precision Print CSS Styles */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-poster-root, #printable-poster-root * {
            visibility: visible !important;
          }
          #printable-poster-root {
            position: absolute !important;
            left: 50% !important;
            top: 50% !important;
            transform: translate(-50%, -50%) scale(1) !important;
            width: 190mm !important;
            max-width: 190mm !important;
            height: auto !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            z-index: 9999999 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-stone-900 border border-stone-800 rounded-t-[28px] sm:rounded-3xl max-w-5xl w-full max-h-[92vh] sm:max-h-[94vh] overflow-hidden flex flex-col shadow-2xl relative my-0 sm:my-auto">
        
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 bg-stone-700 rounded-full mx-auto mt-2.5 mb-1 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-stone-800 bg-stone-950/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden">
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
              isMedical 
                ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' 
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {isMedical ? <Stethoscope className="h-4 w-4 sm:h-5 sm:w-5" /> : <QrCode className="h-4 w-4 sm:h-5 sm:w-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="text-xs sm:text-base font-black text-white truncate">
                  {isMedical ? 'بوستر وملصق الـ QR الطبي الذكي' : 'بوستر وملصق الـ QR الذكي للطباعة'}
                </h3>
                <span className={`text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0 ${
                  isMedical 
                    ? 'bg-teal-950 text-teal-300 border-teal-500/40' 
                    : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                }`}>
                  {isMedical ? 'منشأة معتمدة' : 'شريك معتمد'}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-stone-400 font-medium truncate mt-0.5">
                تصميم فائق الجودة جاهز للطباعة والتعليق برابط المنصة <span className="text-emerald-400 font-mono font-bold">{siteOfficialDomain}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700 flex items-center justify-center transition-all cursor-pointer shrink-0 ml-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mobile Tab Switcher (Preview vs Customization) */}
        <div className="flex lg:hidden bg-stone-950 border-b border-stone-800 p-1.5 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'preview'
                ? 'bg-gradient-to-r from-[#1a4d2e] to-[#256f43] text-white shadow-sm'
                : 'text-stone-400 hover:text-stone-200 bg-stone-900/60'
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>معاينة البوستر الطباعي</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('customizer')}
            className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'customizer'
                ? 'bg-gradient-to-r from-[#1a4d2e] to-[#256f43] text-white shadow-sm'
                : 'text-stone-400 hover:text-stone-200 bg-stone-900/60'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>تخصيص الألوان والنصوص</span>
          </button>
        </div>

        {/* Modal Body - 2 Columns (Controls Left / Live Preview Right) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 bg-stone-900/60">
          
          {/* Controls Column (Hidden on mobile if on preview tab) */}
          <div className={`lg:col-span-5 space-y-3 sm:space-y-4 ${mobileTab === 'customizer' ? 'block' : 'hidden lg:block'}`}>
            
            {/* Theme Selector */}
            <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-3.5 sm:p-4 space-y-2.5 sm:space-y-3">
              <label className="text-xs font-black text-stone-200 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-amber-400" />
                <span>نمط وتصميم البوستر:</span>
              </label>

              <div className="grid grid-cols-2 gap-2">
                {/* Themes List */}
                {[
                  {
                    id: 'royal_emerald' as PosterTheme,
                    name: 'الملكي الفاخر',
                    desc: 'زمردي مع ذهبي',
                    badge: 'bg-[#1a4d2e] border-amber-400/50 text-amber-200',
                    isFor: 'عام ومطاعم'
                  },
                  {
                    id: 'clinical_teal' as PosterTheme,
                    name: 'الطبي السريري',
                    desc: 'تيل مع أبيض',
                    badge: 'bg-teal-800 border-teal-400/50 text-teal-100',
                    isFor: 'عيادات ومراكز'
                  },
                  {
                    id: 'executive_light' as PosterTheme,
                    name: 'الحديث الفاتح',
                    desc: 'أبيض عالي التباين',
                    badge: 'bg-stone-100 border-stone-300 text-stone-900',
                    isFor: 'مكاتب ومحلات'
                  },
                  {
                    id: 'medical_navy' as PosterTheme,
                    name: 'الكحلي الاستشاري',
                    desc: 'كحلي ملكي راقي',
                    badge: 'bg-slate-900 border-sky-400/50 text-sky-200',
                    isFor: 'مستشفيات'
                  },
                  {
                    id: 'dark_luxe' as PosterTheme,
                    name: 'الداكن الفخم',
                    desc: 'أسود أوبسيديان',
                    badge: 'bg-stone-950 border-amber-500/40 text-stone-200',
                    isFor: 'براندات فاخرة'
                  },
                  {
                    id: 'minimal_clean' as PosterTheme,
                    name: 'المينيمال الاقتصادي',
                    desc: 'توفير حبر دقيق',
                    badge: 'bg-white border-stone-400 text-stone-950',
                    isFor: 'طباعة فورية'
                  }
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    className={`p-2 sm:p-2.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                      theme === t.id
                        ? 'border-emerald-500 bg-emerald-950/30 ring-2 ring-emerald-500/30'
                        : 'border-stone-800 bg-stone-900/80 hover:border-stone-700 hover:bg-stone-800/60'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-[11px] sm:text-xs font-black text-white">{t.name}</span>
                      <span className={`w-3 h-3 rounded-full border ${t.badge}`} />
                    </div>
                    <div className="flex items-center justify-between text-[9px] sm:text-[10px] text-stone-400 font-medium">
                      <span>{t.desc}</span>
                      <span className="text-[8.5px] opacity-70">{t.isFor}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick CTA Presets */}
            <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-3.5 sm:p-4 space-y-2.5 sm:space-y-3">
              <label className="text-xs font-black text-stone-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  <span>العبارة التوجيهية للعميل / المراجع:</span>
                </span>
                <span className="text-[10px] text-stone-400">نماذج جاهزة</span>
              </label>

              {/* Preset Buttons */}
              <div className="space-y-1.5">
                {(isMedical ? medicalPresets : commercialPresets).map((presetText, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSubtitle(presetText)}
                    className={`w-full text-right p-2 rounded-xl text-[10.5px] sm:text-[11px] font-bold transition-all cursor-pointer border ${
                      subtitle === presetText
                        ? 'bg-[#1a4d2e]/40 border-emerald-500/60 text-emerald-200'
                        : 'bg-stone-900 border-stone-800/80 text-stone-400 hover:text-stone-200 hover:bg-stone-850'
                    }`}
                  >
                    {presetText}
                  </button>
                ))}
              </div>

              {/* Custom Input */}
              <div className="pt-1">
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="أو اكتب نصاً مخصصاً هنا..."
                  className="w-full bg-stone-900 border border-stone-700/80 rounded-xl px-3 py-2 text-xs font-bold text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Optional Department / Table Tag */}
            <div className="bg-stone-950/80 border border-stone-800 rounded-2xl p-3.5 sm:p-4 space-y-2.5 sm:space-y-3">
              <div>
                <label className="block text-xs font-black text-stone-200 mb-1.5">
                  {isMedical ? 'رقم العيادة / مكتب الاستقبال / القسم (اختياري)' : 'رقم الطاولة / الفرع / القسم (اختياري)'}
                </label>
                <input
                  type="text"
                  value={deskOrTable}
                  onChange={(e) => setDeskOrTable(e.target.value)}
                  placeholder={isMedical ? 'مثال: عيادة رقم 204 • الطابق الثاني' : 'مثال: طاولة رقم 08 • قسم العائلات'}
                  className="w-full bg-stone-900 border border-stone-700/80 rounded-xl px-3 py-2 text-xs font-bold text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Toggles */}
              <div className="flex flex-col gap-2 pt-1 border-t border-stone-800/80">
                <label className="flex items-center justify-between text-xs text-stone-300 font-bold cursor-pointer">
                  <span>إظهار أرقام التواصل وساعات العمل</span>
                  <input
                    type="checkbox"
                    checked={showContactDetails}
                    onChange={(e) => setShowContactDetails(e.target.checked)}
                    className="rounded accent-[#1a4d2e] w-4 h-4 cursor-pointer"
                  />
                </label>
                <label className="flex items-center justify-between text-xs text-stone-300 font-bold cursor-pointer">
                  <span>إظهار شريط إرشادي بالإنجليزية (Bilingual)</span>
                  <input
                    type="checkbox"
                    checked={showEnglishText}
                    onChange={(e) => setShowEnglishText(e.target.checked)}
                    className="rounded accent-[#1a4d2e] w-4 h-4 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Mobile View Button to switch to preview */}
            <div className="pt-2 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileTab('preview')}
                className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <QrCode className="h-4 w-4 text-emerald-400" />
                <span>مشاهدة معاينة البوستر الطباعي الآن ⬅️</span>
              </button>
            </div>

          </div>

          {/* Live Preview Column (Hidden on mobile if on customizer tab) */}
          <div className={`lg:col-span-7 flex flex-col items-center justify-start bg-stone-950/90 rounded-2xl sm:rounded-3xl p-2 sm:p-6 border border-stone-800 overflow-y-auto ${mobileTab === 'preview' ? 'block' : 'hidden lg:block'}`}>
            
            <div className="text-[10.5px] sm:text-[11px] font-black text-stone-400 mb-2.5 sm:mb-3 flex items-center justify-between w-full px-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>معاينة البوستر الطباعي الحي بدقة فائقة A4:</span>
              </div>
              <span className="text-[9.5px] font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md border border-amber-400/20">
                جاهز للطباعة الفورية
              </span>
            </div>

            {/* Poster Canvas Element (Target for Print) */}
            <div id="printable-poster-root" className="w-full max-w-[390px] sm:max-w-[420px] flex justify-center py-1">
              
              <div
                className={`w-full rounded-[22px] sm:rounded-[28px] overflow-hidden shadow-2xl transition-all relative select-none ${
                  theme === 'royal_emerald'
                    ? 'bg-gradient-to-b from-[#143e25] via-[#1a4d2e] to-[#0c2416] text-white border-[2px] sm:border-[3px] border-amber-400/70 shadow-emerald-950/80'
                    : theme === 'clinical_teal'
                    ? 'bg-gradient-to-b from-teal-900 via-teal-800 to-[#042f2c] text-white border-[2px] sm:border-[3px] border-teal-400/80 shadow-teal-950/80'
                    : theme === 'medical_navy'
                    ? 'bg-gradient-to-b from-slate-900 via-[#0f172a] to-[#020617] text-white border-[2px] sm:border-[3px] border-sky-400/70 shadow-slate-950/80'
                    : theme === 'dark_luxe'
                    ? 'bg-gradient-to-b from-stone-900 via-stone-950 to-black text-white border-[2px] sm:border-[3px] border-amber-500/60 shadow-black'
                    : theme === 'executive_light'
                    ? 'bg-white text-stone-900 border-[2px] sm:border-[3px] border-stone-300 shadow-xl'
                    : 'bg-white text-stone-950 border-[2px] border-stone-900'
                }`}
                style={{
                  boxSizing: 'border-box'
                }}
              >
                
                {/* Decorative Frame Line */}
                <div className={`m-2 sm:m-3 p-3.5 sm:p-6 rounded-[18px] sm:rounded-[22px] border flex flex-col items-center text-center relative ${
                  theme === 'executive_light'
                    ? 'border-stone-200 bg-stone-50/50'
                    : theme === 'minimal_clean'
                    ? 'border-stone-300 bg-stone-50/30'
                    : 'border-white/15 bg-black/15 backdrop-blur-xs'
                }`}>

                  {/* 1. Official Platform Brand Header (Without irbid.shop) */}
                  <div className="w-full pb-2.5 sm:pb-3.5 mb-2.5 sm:mb-3.5 border-b flex flex-col items-center gap-1.5" style={{
                    borderColor: theme === 'executive_light' || theme === 'minimal_clean' ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.15)'
                  }}>
                    <div className="flex items-center justify-between w-full px-0.5 sm:px-1">
                      {/* Platform Logo */}
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {officialLogoUrl ? (
                          <img
                            src={officialLogoUrl}
                            alt="Logo"
                            className="h-6 sm:h-7 w-auto object-contain rounded-md"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                        <div className="text-right">
                          <span className={`text-[10px] sm:text-[11px] font-black block tracking-tight leading-tight ${
                            theme === 'executive_light' || theme === 'minimal_clean' ? 'text-stone-900' : 'text-white'
                          }`}>
                            {siteOfficialName}
                          </span>
                          <span className={`text-[8.5px] sm:text-[9px] font-bold block font-mono ${
                            theme === 'royal_emerald' ? 'text-amber-300' :
                            theme === 'clinical_teal' ? 'text-teal-300' :
                            theme === 'medical_navy' ? 'text-sky-300' :
                            theme === 'dark_luxe' ? 'text-amber-400' :
                            'text-emerald-700'
                          }`}>
                            🌐 {siteOfficialDomain}
                          </span>
                        </div>
                      </div>

                      {/* Official Verification Badge */}
                      <div className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[8.5px] sm:text-[9px] font-black flex items-center gap-1 shrink-0 ${
                        theme === 'royal_emerald' ? 'bg-amber-400 text-stone-950 shadow-xs' :
                        theme === 'clinical_teal' ? 'bg-teal-400 text-teal-950 shadow-xs' :
                        theme === 'medical_navy' ? 'bg-sky-400 text-slate-950 shadow-xs' :
                        theme === 'dark_luxe' ? 'bg-amber-400 text-stone-950' :
                        theme === 'executive_light' ? 'bg-[#1a4d2e] text-white' :
                        'bg-stone-900 text-white'
                      }`}>
                        <ShieldCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3 stroke-[2.5]" />
                        <span>{isMedical ? 'منشأة معتمدة' : 'شريك معتمد'}</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Business Entity Identity (Logo & Title) */}
                  <div className="space-y-1.5 sm:space-y-2.5 my-1 flex flex-col items-center">
                    {/* Business Logo with crisp frame */}
                    {business.logoUrl ? (
                      <div className="relative">
                        <img
                          src={business.logoUrl}
                          alt={business.name}
                          className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover shadow-lg border-2 ${
                            theme === 'royal_emerald' ? 'border-amber-400' :
                            theme === 'clinical_teal' ? 'border-teal-300' :
                            theme === 'medical_navy' ? 'border-sky-400' :
                            theme === 'dark_luxe' ? 'border-amber-400' :
                            'border-stone-300'
                          }`}
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white shadow-xs">
                          <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        </div>
                      </div>
                    ) : (
                      <div className={`w-14 h-14 sm:w-18 sm:h-18 rounded-2xl flex items-center justify-center shadow-md border ${
                        theme === 'clinical_teal' ? 'bg-teal-700/40 text-teal-200 border-teal-400/40' :
                        theme === 'royal_emerald' ? 'bg-amber-400/20 text-amber-300 border-amber-400/30' :
                        theme === 'medical_navy' ? 'bg-sky-500/20 text-sky-300 border-sky-400/30' :
                        theme === 'executive_light' ? 'bg-stone-100 text-stone-700 border-stone-300' :
                        'bg-stone-800 text-stone-200 border-stone-700'
                      }`}>
                        {isMedical ? <Stethoscope className="h-7 w-7 sm:h-9 sm:w-9" /> : <Store className="h-7 w-7 sm:h-9 sm:w-9" />}
                      </div>
                    )}

                    {/* Name & Specialty */}
                    <div>
                      <h2 className={`text-lg sm:text-2xl font-black tracking-tight leading-tight ${
                        theme === 'executive_light' ? 'text-stone-950' : 
                        theme === 'minimal_clean' ? 'text-black' : 'text-white'
                      }`}>
                        {business.name}
                      </h2>

                      <div className="flex items-center justify-center gap-1.5 flex-wrap mt-0.5 sm:mt-1">
                        <span className={`text-[10px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 rounded-lg ${
                          theme === 'royal_emerald' ? 'bg-white/15 text-amber-200' :
                          theme === 'clinical_teal' ? 'bg-white/15 text-teal-200' :
                          theme === 'medical_navy' ? 'bg-white/15 text-sky-200' :
                          theme === 'dark_luxe' ? 'bg-white/15 text-amber-300' :
                          theme === 'executive_light' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                          'bg-stone-100 text-stone-800 border border-stone-200'
                        }`}>
                          {business.category || (isMedical ? 'خدمات ورعاية صحية' : 'محلات وخدمات إربد')}
                        </span>
                        
                        {business.address && (
                          <span className={`text-[10px] sm:text-[11px] font-medium flex items-center gap-1 ${
                            theme === 'executive_light' || theme === 'minimal_clean' ? 'text-stone-500' : 'text-stone-300'
                          }`}>
                            <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 opacity-75" />
                            <span>{business.address}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. Desk / Room / Table Badge if present */}
                  {deskOrTable && (
                    <div className={`mt-1.5 sm:mt-2 mb-1 px-3 sm:px-4 py-1 sm:py-1.5 rounded-xl font-black text-[11px] sm:text-xs inline-flex items-center gap-1.5 shadow-xs border ${
                      theme === 'royal_emerald' ? 'bg-amber-400 text-stone-950 border-amber-300' :
                      theme === 'clinical_teal' ? 'bg-teal-300 text-teal-950 border-teal-200' :
                      theme === 'medical_navy' ? 'bg-sky-400 text-slate-950 border-sky-300' :
                      theme === 'dark_luxe' ? 'bg-amber-400 text-stone-950 border-amber-300' :
                      theme === 'executive_light' ? 'bg-[#1a4d2e] text-white border-emerald-600' :
                      'bg-stone-900 text-white border-stone-800'
                    }`}>
                      <Building2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      <span>{deskOrTable}</span>
                    </div>
                  )}

                  {/* 4. Executive High-Contrast QR Frame Container */}
                  <div className="my-2.5 sm:my-3.5 relative">
                    {/* Background Plate */}
                    <div className="bg-white p-3 sm:p-5 rounded-2xl shadow-xl border-2 border-stone-200/90 relative inline-block">
                      
                      {/* QR Frame Corner Accents */}
                      <div className="absolute top-1.5 left-1.5 w-3 sm:w-3.5 h-3 sm:h-3.5 border-t-2 border-l-2 border-[#1a4d2e]" />
                      <div className="absolute top-1.5 right-1.5 w-3 sm:w-3.5 h-3 sm:h-3.5 border-t-2 border-r-2 border-[#1a4d2e]" />
                      <div className="absolute bottom-1.5 left-1.5 w-3 sm:w-3.5 h-3 sm:h-3.5 border-b-2 border-l-2 border-[#1a4d2e]" />
                      <div className="absolute bottom-1.5 right-1.5 w-3 sm:w-3.5 h-3 sm:h-3.5 border-b-2 border-r-2 border-[#1a4d2e]" />

                      <img
                        src={qrCodeUrl}
                        alt="Store High Resolution QR Code"
                        className="w-40 h-40 sm:w-52 sm:h-52 object-contain mx-auto rounded-lg"
                      />

                      {/* Scan directive badge */}
                      <div className="mt-1.5 sm:mt-2 pt-1 sm:pt-1.5 border-t border-stone-100 flex items-center justify-center gap-1 text-[9px] sm:text-[10px] font-black text-stone-600">
                        <QrCode className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-600" />
                        <span>امسح بكاميرا الهاتف للمعاينة الفورية</span>
                      </div>
                    </div>
                  </div>

                  {/* 5. Subtitle Call To Action */}
                  <div className="space-y-1 px-1.5 sm:px-2 max-w-sm">
                    <p className={`text-[11.5px] sm:text-[13px] font-bold leading-relaxed ${
                      theme === 'royal_emerald' ? 'text-amber-100' :
                      theme === 'clinical_teal' ? 'text-teal-50' :
                      theme === 'medical_navy' ? 'text-sky-100' :
                      theme === 'dark_luxe' ? 'text-stone-200' :
                      theme === 'executive_light' ? 'text-stone-800' :
                      'text-stone-900'
                    }`}>
                      {subtitle}
                    </p>

                    {showEnglishText && (
                      <p className={`text-[8.5px] sm:text-[9.5px] font-medium uppercase tracking-wider font-mono ${
                        theme === 'royal_emerald' ? 'text-amber-300/80' :
                        theme === 'clinical_teal' ? 'text-teal-300/80' :
                        theme === 'medical_navy' ? 'text-sky-300/80' :
                        theme === 'dark_luxe' ? 'text-stone-400' :
                        'text-stone-500'
                      }`}>
                        Scan QR code with your smartphone camera for instant direct access
                      </p>
                    )}
                  </div>

                  {/* 6. Contact & Details Pill (Optional) */}
                  {showContactDetails && (business.phone || business.whatsapp) && (
                    <div className={`mt-2.5 sm:mt-3 pt-2 sm:pt-2.5 border-t w-full flex items-center justify-center gap-3 sm:gap-4 text-[9.5px] sm:text-[10px] font-bold ${
                      theme === 'executive_light' || theme === 'minimal_clean'
                        ? 'border-stone-200 text-stone-600'
                        : 'border-white/10 text-stone-300'
                    }`}>
                      {business.phone && (
                        <span className="flex items-center gap-1" dir="ltr">
                          <Phone className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-400" />
                          <span>{business.phone}</span>
                        </span>
                      )}
                      {business.whatsapp && (
                        <span className="flex items-center gap-1" dir="ltr">
                          <span className="text-emerald-400 font-bold">WA:</span>
                          <span>{business.whatsapp}</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* 7. Official Site Verified Footer (shofibirbid.site) */}
                  <div className={`mt-2.5 sm:mt-3.5 pt-2 sm:pt-3 border-t w-full flex items-center justify-between text-[8.5px] sm:text-[9.5px] font-black ${
                    theme === 'executive_light' || theme === 'minimal_clean'
                      ? 'border-stone-200 text-stone-500'
                      : 'border-white/15 text-stone-300'
                  }`}>
                    <div className="flex items-center gap-1 text-right">
                      <Sparkles className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-amber-400 shrink-0" />
                      <span>{siteOfficialName}</span>
                    </div>

                    <div className="flex items-center gap-1 font-mono font-bold text-left" dir="ltr">
                      <Globe className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-400 shrink-0" />
                      <span>{siteOfficialDomain}</span>
                    </div>
                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="px-3.5 py-3 sm:px-6 sm:py-4 bg-stone-950 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          
          <button
            type="button"
            onClick={handleCopyUrl}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-700 text-stone-200 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer min-h-[38px] sm:min-h-[42px]"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'تم نسخ الرابط المباشر' : 'نسخ رابط المنشأة المباشر'}</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 text-[11px] sm:text-xs font-bold transition-all cursor-pointer min-h-[38px] sm:min-h-[42px]"
            >
              إغلاق
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 sm:gap-2 bg-gradient-to-r from-[#1a4d2e] to-[#256f43] hover:from-[#143d24] hover:to-[#1a4d2e] text-white px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl text-xs sm:text-sm font-black shadow-lg shadow-emerald-950/60 transition-all cursor-pointer active:scale-95 min-h-[38px] sm:min-h-[42px]"
            >
              <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400" />
              <span>🖨️ طباعة البوستر الآن</span>
            </button>
          </div>

        </div>

      </div>
    </div>,
    document.body
  );
}
