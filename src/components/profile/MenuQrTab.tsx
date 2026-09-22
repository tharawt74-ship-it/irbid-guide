import React, { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { 
  QrCode, 
  Printer, 
  Sparkles, 
  Check, 
  Copy, 
  Eye, 
  Palette, 
  LayoutGrid, 
  FileText, 
  ExternalLink, 
  Compass, 
  CheckCircle2, 
  Settings, 
  Utensils, 
  Flame, 
  BookOpen, 
  Coffee, 
  Plus, 
  X,
  Languages,
  Phone,
  Store,
  Calendar
} from 'lucide-react';
import { Business } from '../../types';

interface MenuQrTabProps {
  business: Business;
  onSave: (updatedData: Partial<Business>) => Promise<void>;
  isSaving: boolean;
}

const PRESET_COLORS = [
  { name: 'أحمر المطاعم الشهير', hex: '#dc2626', bg: 'bg-red-600' },
  { name: 'البرتقالي الدافئ', hex: '#ea580c', bg: 'bg-orange-600' },
  { name: 'أخضر الخضار الطازجة', hex: '#16a34a', bg: 'bg-emerald-600' },
  { name: 'بني الكافيهات الخشبي', hex: '#854d0e', bg: 'bg-yellow-800' },
  { name: 'العنابي الملكي الفاخر', hex: '#881337', bg: 'bg-rose-900' },
  { name: 'الأسود العصري الأنيق', hex: '#18181b', bg: 'bg-zinc-900' },
  { name: 'البنفسجي الجذاب', hex: '#7c3aed', bg: 'bg-purple-600' },
  { name: 'الذهبي الراقي', hex: '#b45309', bg: 'bg-amber-700' },
];

const COVER_PRESETS = [
  { name: 'طاولة طعام دافئة', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80' },
  { name: 'إعداد وتحضير القهوة', url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=600&q=80' },
  { name: 'برغر ستيك مشوي', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80' },
  { name: 'بيتزا إيطالية طازجة', url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80' },
  { name: 'حلويات كيك وشوكولاتة', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=80' },
];

const POSTER_THEMES = [
  { id: 'classic_red', name: 'الأحمر الكلاسيكي الجذاب', bg: 'bg-red-600', text: 'text-red-600', border: 'border-red-200' },
  { id: 'gold_luxury', name: 'الذهبي الملكي الفاخر', bg: 'bg-amber-700', text: 'text-amber-700', border: 'border-amber-200' },
  { id: 'wood_cafe', name: 'البني الدافئ للمقاهي', bg: 'bg-yellow-800', text: 'text-yellow-800', border: 'border-yellow-200' },
  { id: 'modern_dark', name: 'الأسود العصري الأنيق', bg: 'bg-stone-900', text: 'text-stone-900', border: 'border-stone-200' },
  { id: 'clean_emerald', name: 'أخضر شو في بإربد المميز', bg: 'bg-[#1a4d2e]', text: 'text-[#1a4d2e]', border: 'border-emerald-200' },
];

export function MenuQrTab({ business, onSave, isSaving }: MenuQrTabProps) {
  // Initialize state from business object with sensible defaults
  const [isEnabled, setIsEnabled] = useState(business.menuQrEnabled ?? true);
  const [themeColor, setThemeColor] = useState(business.menuQrThemeColor ?? '#dc2626');
  const [secondaryColor, setSecondaryColor] = useState(business.menuQrSecondaryColor ?? '#1a4d2e');
  const [layout, setLayout] = useState<'grid' | 'list' | 'compact'>(
    (business.menuQrLayout as any) ?? 'grid'
  );
  const [welcomeText, setWelcomeText] = useState(
    business.menuQrWelcomeText ?? 'أهلاً وسهلاً بكم في محلنا! تفضلوا باستكشاف أشهى مأكولاتنا ومشروباتنا وعروضنا الحصرية.'
  );
  const [coverImage, setCoverImage] = useState(
    business.menuQrCoverImage ?? COVER_PRESETS[0].url
  );
  const [showPrices, setShowPrices] = useState(business.menuQrShowPrices ?? true);
  const [posterStyle, setPosterStyle] = useState<'classic_red' | 'gold_luxury' | 'wood_cafe' | 'modern_dark' | 'clean_emerald'>(
    (business.menuQrPosterStyle as any) ?? 'clean_emerald'
  );

  // Poster specific customizer states
  const [tableNumber, setTableNumber] = useState('');
  const [includeContact, setIncludeContact] = useState(true);
  const [includeEnglish, setIncludeEnglish] = useState(true);
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Construct URLs
  const menuOffersUrl = `${window.location.origin}/business/${business.id}/menu-offers`;

  // Hex color for API call
  const activePosterTheme = POSTER_THEMES.find(t => t.id === posterStyle) || POSTER_THEMES[4];
  const qrColorHex = activePosterTheme.bg.replace('bg-[', '').replace(']', '').replace('#', '') || '1a4d2e';
  // Let's resolve clean colors for the API
  const getQrColorHex = () => {
    switch(posterStyle) {
      case 'classic_red': return 'dc2626';
      case 'gold_luxury': return 'b45309';
      case 'wood_cafe': return '854d0e';
      case 'modern_dark': return '1c1917';
      case 'clean_emerald': return '1a4d2e';
      default: return '1a4d2e';
    }
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(menuOffersUrl)}&color=${getQrColorHex()}&ecc=H&margin=1`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(menuOffersUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSettings = async () => {
    try {
      await onSave({
        menuQrEnabled: isEnabled,
        menuQrThemeColor: themeColor,
        menuQrSecondaryColor: secondaryColor,
        menuQrLayout: layout,
        menuQrWelcomeText: welcomeText,
        menuQrCoverImage: coverImage,
        menuQrShowPrices: showPrices,
        menuQrPosterStyle: posterStyle,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving menu QR settings:', err);
    }
  };

  const handlePrint = () => {
    // We will inject a printable div and trigger standard printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('الرجاء السماح بالنوافذ المنبثقة لطباعة البوستر.');
      return;
    }

    const resolvedThemeName = activePosterTheme.name;
    const resolvedColorHex = '#' + getQrColorHex();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>طباعة بوستر QR المنيو والعروض - ${business.name}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
          
          @page {
            size: A4 portrait;
            margin: 0;
          }
          
          body {
            font-family: 'Cairo', sans-serif;
            margin: 0;
            padding: 0;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: #1c1917;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .poster-container {
            width: 210mm;
            height: 297mm;
            box-sizing: border-box;
            border: 25px solid ${resolvedColorHex};
            padding: 40px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: space-between;
            background-color: #ffffff;
            position: relative;
            text-align: center;
          }

          .header {
            margin-top: 20px;
          }

          .logo-box {
            font-size: 24px;
            font-weight: 900;
            color: #ffffff;
            background-color: ${resolvedColorHex};
            padding: 10px 25px;
            border-radius: 15px;
            display: inline-block;
            margin-bottom: 25px;
            letter-spacing: 1px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }

          .shop-name {
            font-size: 38px;
            font-weight: 900;
            margin: 0;
            color: #1c1917;
            line-height: 1.2;
          }

          .shop-cat {
            font-size: 18px;
            font-weight: bold;
            color: #6b7280;
            margin-top: 8px;
          }

          .divider {
            width: 120px;
            height: 5px;
            background-color: ${resolvedColorHex};
            margin: 25px auto;
            border-radius: 5px;
          }

          .qr-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 20px 0;
          }

          .qr-border-wrap {
            border: 8px solid ${resolvedColorHex};
            padding: 20px;
            border-radius: 35px;
            background-color: #ffffff;
            box-shadow: 0 10px 25px rgba(0,0,0,0.05);
            display: inline-block;
          }

          .qr-image {
            width: 230mm;
            max-width: 260px;
            height: auto;
            display: block;
          }

          .table-badge {
            margin-top: 15px;
            background-color: #f5f5f4;
            border: 2px dashed ${resolvedColorHex};
            color: #1c1917;
            font-size: 20px;
            font-weight: 900;
            padding: 6px 20px;
            border-radius: 10px;
            display: inline-block;
          }

          .cta-title {
            font-size: 28px;
            font-weight: 900;
            color: ${resolvedColorHex};
            margin: 0 0 10px 0;
          }

          .cta-subtitle {
            font-size: 16px;
            font-weight: bold;
            color: #4b5563;
            max-width: 580px;
            line-height: 1.6;
            margin: 0 auto;
          }

          .en-section {
            margin-top: 15px;
            border-top: 1px solid #e5e7eb;
            padding-top: 15px;
            max-width: 500px;
          }

          .en-title {
            font-size: 18px;
            font-weight: 900;
            color: ${resolvedColorHex};
            margin: 0 0 5px 0;
            font-family: Arial, sans-serif;
          }

          .en-subtitle {
            font-size: 12px;
            font-weight: bold;
            color: #6b7280;
            font-family: Arial, sans-serif;
            margin: 0;
          }

          .footer-info {
            font-size: 13px;
            font-weight: bold;
            color: #9ca3af;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
            width: 100%;
            border-top: 1px solid #f3f4f6;
            padding-top: 20px;
            margin-bottom: 10px;
          }

          .footer-brand {
            font-weight: 900;
            color: ${resolvedColorHex};
          }
        </style>
      </head>
      <body>
        <div class="poster-container">
          <div class="header">
            <div class="logo-box">شو في بإربد • SHOFIBIRBID</div>
            <h1 class="shop-name">${business.name}</h1>
            <div class="shop-cat">${business.subCategory || business.category || 'مأكولات ومشروبات'}</div>
            <div class="divider"></div>
          </div>

          <div class="qr-section">
            <div class="qr-border-wrap">
              <img src="${qrCodeUrl}" class="qr-image" alt="QR Code" />
            </div>
            ${tableNumber ? `<div class="table-badge">طاولة رقم / Table No. ${tableNumber}</div>` : ''}
          </div>

          <div>
            <h2 class="cta-title">قائمتنا الرقمية وعروضنا الحصرية 🍽️✨</h2>
            <p class="cta-subtitle">${welcomeText}</p>
            
            ${includeEnglish ? `
              <div class="en-section">
                <h3 class="en-title">Scan QR for Digital Menu & Offers</h3>
                <p class="en-subtitle">Explore our delicious food varieties, pricing, and live exclusive deals directly on your phone.</p>
              </div>
            ` : ''}
          </div>

          <div class="footer-info">
            ${includeContact && business.phone ? `<span>📞 اتصل بنا: ${business.phone}</span>` : ''}
            <span>🌐 تصفح عبر المنصة: <strong class="footer-brand">shofibirbid.site</strong></span>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 1000);
          }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in">
      
      {/* Banner Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-stone-200">
        <div>
          <h3 className="text-base font-black text-[#2d2a26] flex items-center gap-2">
            <QrCode className="h-6 w-6 text-[#1a4d2e]" />
            <span>نظام المنيو الذكي والـ QR المطور للمطاعم والمقاهي 🍽️✨</span>
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            خصص صفحة المنيو التفاعلية الخاصة بمحلك، تحكم بألوان الثيم، وصمّم واطبع بوستر الباركود (QR code) لتقديمه لزبائنك على الطاولات.
          </p>
        </div>
        
        {/* Toggle Activate / Deactivate */}
        <div className="flex items-center gap-2.5 bg-stone-50 border border-stone-200 px-4 py-2 rounded-2xl shadow-2xs">
          <span className={`text-xs font-black ${isEnabled ? 'text-emerald-700' : 'text-stone-400'}`}>
            {isEnabled ? 'الميزة نشطة ومفعّلة كلياً' : 'الميزة معطّلة ومخفية'}
          </span>
          <button
            type="button"
            onClick={() => setIsEnabled(!isEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isEnabled ? 'bg-emerald-600' : 'bg-stone-300'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                isEnabled ? '-translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Main Grid: Split Customizer & Poster Builder */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
        
        {/* LEFT COLUMN: DESIGN CUSTOMIZER (LG 7) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Menu Page Theme Designer */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-2xs space-y-5">
            <h4 className="font-black text-sm text-stone-900 flex items-center gap-2 pb-3 border-b border-stone-100">
              <Palette className="h-4 w-4 text-[#1a4d2e]" />
              <span>1. تصميم ومظهر صفحة المنيو الرقمي</span>
            </h4>

            {/* Theme Colors */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-stone-800">اللون الأساسي لثيم المنيو:</label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {PRESET_COLORS.map(color => {
                  const isSelected = themeColor === color.hex;
                  return (
                    <button
                      key={color.hex}
                      type="button"
                      onClick={() => setThemeColor(color.hex)}
                      className={`h-9 w-full rounded-xl cursor-pointer ${color.bg} transition-all flex items-center justify-center text-white ${
                        isSelected ? 'ring-4 ring-emerald-600 ring-offset-2 scale-105' : 'hover:scale-105'
                      }`}
                      title={color.name}
                    >
                      {isSelected && <Check className="h-4 w-4 stroke-[3px]" />}
                    </button>
                  );
                })}
              </div>
              
              {/* Custom HEX Color input */}
              <div className="flex items-center gap-3 pt-1">
                <span className="text-[11px] text-stone-500 font-bold">أو اختر لوناً مخصصاً:</span>
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="w-10 h-8 rounded border border-stone-200 cursor-pointer p-0.5"
                />
                <input
                  type="text"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  dir="ltr"
                  className="bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-stone-700 w-24"
                />
              </div>
            </div>

            {/* Layout Grid / List Switcher */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <label className="block text-xs font-black text-stone-800">طريقة عرض وجبات المنيو:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'grid', label: 'شبكة كروت', icon: LayoutGrid },
                    { id: 'list', label: 'قائمة غنية', icon: FileText },
                    { id: 'compact', label: 'عناوين مكثفة', icon: BookOpen }
                  ].map(opt => {
                    const isSelected = layout === opt.id;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setLayout(opt.id as any)}
                        className={`py-2 px-1 rounded-xl text-[10px] sm:text-xs font-black border transition-all cursor-pointer text-center flex flex-col items-center gap-1.5 ${
                          isSelected
                            ? 'bg-[#1a4d2e]/10 text-[#1a4d2e] border-[#1a4d2e] font-black'
                            : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Show prices Toggle */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-stone-800">خيارات عرض التفاصيل:</label>
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-black text-stone-800 block">عرض أسعار الوجبات</span>
                    <span className="text-[9px] text-stone-400 block">عرض السعر بجانب اسم الوجبة</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPrices(!showPrices)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      showPrices ? 'bg-[#1a4d2e]' : 'bg-stone-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        showPrices ? '-translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Custom Welcome Message / Cover */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-black text-stone-800">الرسالة الترحيبية في أعلى المنيو:</label>
                <span className="text-[10px] text-stone-400 font-mono font-bold">{welcomeText.length} / 120 حرف</span>
              </div>
              <textarea
                rows={2}
                maxLength={120}
                value={welcomeText}
                onChange={(e) => setWelcomeText(e.target.value)}
                placeholder="تظهر هذه الرسالة تحت صورة الغلاف مباشرةً لزبائنك..."
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/30 focus:bg-white text-stone-800 font-bold leading-relaxed resize-none"
              ></textarea>
            </div>

            {/* Menu Cover Presets */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-stone-800">صورة غلاف رأسية المنيو:</label>
              <div className="grid grid-cols-5 gap-2">
                {COVER_PRESETS.map((p, idx) => {
                  const isSelected = coverImage === p.url;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCoverImage(p.url)}
                      className={`relative h-14 w-full rounded-xl overflow-hidden border cursor-pointer transition-all ${
                        isSelected ? 'ring-2 ring-emerald-600 ring-offset-2 scale-102 border-transparent' : 'border-stone-200 hover:opacity-90'
                      }`}
                      title={p.name}
                    >
                      <img src={p.url} className="w-full h-full object-cover" alt="" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-emerald-950/40 flex items-center justify-center text-white">
                          <Check className="h-4 w-4 stroke-[3px]" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {/* Custom Cover image input */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] text-stone-400 block font-bold">أو أدخل رابط صورة مخصص لغلاف المنيو:</span>
                <input
                  type="text"
                  dir="ltr"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://example.com/food-cover.jpg"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-700 font-mono"
                />
              </div>
            </div>

          </div>

          {/* Section 2: Poster Customization Options */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-2xs space-y-4">
            <h4 className="font-black text-sm text-stone-900 flex items-center gap-2 pb-3 border-b border-stone-100">
              <Settings className="h-4 w-4 text-[#1a4d2e]" />
              <span>2. تخصيص معلومات بوستر الـ QR الورقي</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Table Number Optional */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-stone-800">رقم الطاولة أو الجلسة (اختياري):</label>
                <input
                  type="text"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  placeholder="مثال: 5، أو طاولة كبار الشخصيات"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-bold text-stone-800"
                />
                <span className="text-[10px] text-stone-400 block">إذا تركتها فارغة، سيتم إصدار بوستر عام بدون رقم طاولة</span>
              </div>

              {/* Poster Theme Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-stone-800">ستايل وألوان البوستر الورقي:</label>
                <select
                  value={posterStyle}
                  onChange={(e) => setPosterStyle(e.target.value as any)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 outline-none focus:ring-2 focus:ring-[#1a4d2e]/30 cursor-pointer"
                >
                  {POSTER_THEMES.map(theme => (
                    <option key={theme.id} value={theme.id}>{theme.name}</option>
                  ))}
                </select>
                <span className="text-[10px] text-stone-400 block">يغير لون البوستر بالكامل والـ QR كود المطبوع</span>
              </div>
            </div>

            {/* Poster Checkboxes toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              
              <button
                type="button"
                onClick={() => setIncludeEnglish(!includeEnglish)}
                className="p-3 bg-stone-50 hover:bg-stone-100 rounded-2xl border border-stone-150 text-right transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <span className="text-[11px] font-black text-stone-800 block">ترجمة ثنائية اللغة (عربي/إنجليزي)</span>
                  <span className="text-[9px] text-stone-400 block">إضافة إرشادات بالإنجليزية في البوستر</span>
                </div>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                  includeEnglish ? 'bg-[#1a4d2e] border-[#1a4d2e] text-white' : 'bg-white border-stone-300 text-transparent'
                }`}>
                  <Check className="h-3 w-3 stroke-[3px]" />
                </div>
              </button>

              <button
                type="button"
                onClick={() => setIncludeContact(!includeContact)}
                className="p-3 bg-stone-50 hover:bg-stone-100 rounded-2xl border border-stone-150 text-right transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="space-y-0.5">
                  <span className="text-[11px] font-black text-stone-800 block">إدراج معلومات الاتصال</span>
                  <span className="text-[9px] text-stone-400 block">إظهار رقم هاتف المحل في ذيل البوستر</span>
                </div>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                  includeContact ? 'bg-[#1a4d2e] border-[#1a4d2e] text-white' : 'bg-white border-stone-300 text-transparent'
                }`}>
                  <Check className="h-3 w-3 stroke-[3px]" />
                </div>
              </button>

            </div>
          </div>

          {/* Action Buttons for Saving settings */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveSettings}
              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#1a4d2e] to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white font-black text-xs transition-all shadow-md cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="h-4.5 w-4.5" />
              <span>{isSaving ? 'جاري حفظ الإعدادات...' : 'حفظ وتثبيت إعدادات الثيم والمنيو 💾'}</span>
            </button>

            {saveSuccess && (
              <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-2xl animate-in fade-in">
                تم حفظ التعديلات بنجاح! 🎉
              </span>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: LIVE A4 POSTER PREVIEW (LG 5) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-stone-100 p-4 sm:p-6 rounded-3xl border border-stone-200/80 shadow-inner flex flex-col items-center">
            
            <div className="w-full flex items-center justify-between mb-3 text-stone-600">
              <span className="text-xs font-black flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>معاينة حية لبوستر الطاولة (A4)</span>
              </span>
              <span className="text-[10px] font-bold bg-white px-2.5 py-1 rounded-full border border-stone-200">
                A4 Portrait
              </span>
            </div>

            {/* Simulated Poster Card Frame */}
            <div className={`bg-white border-[12px] ${activePosterTheme.border} p-4 sm:p-5 w-full aspect-[1/1.41] shadow-lg flex flex-col justify-between items-center text-center transition-all duration-300 relative`}>
              
              {/* Background watermark overlay */}
              <div className="absolute inset-0 opacity-1 pointer-events-none border-2 border-stone-100/60 m-1"></div>

              {/* Poster Header */}
              <div className="relative z-10">
                <div className={`text-[10px] font-black text-white px-3 py-1 rounded-lg ${activePosterTheme.bg} inline-block mb-1.5 shrink-0 uppercase tracking-widest font-mono`}>
                  شو في بإربد
                </div>
                <h5 className="font-black text-sm text-stone-900 max-w-full truncate">{business.name}</h5>
                <p className="text-[9px] text-stone-400 mt-0.5 truncate">{business.subCategory || 'مأكولات ومشروبات طازجة'}</p>
                <div className={`w-8 h-1 ${activePosterTheme.bg} mx-auto mt-2 rounded`}></div>
              </div>

              {/* QR Code Graphic Section */}
              <div className="relative z-10 flex flex-col items-center justify-center">
                <div className={`border-4 ${activePosterTheme.border} p-2 rounded-2xl bg-white shadow-sm`}>
                  <img 
                    src={qrCodeUrl} 
                    className="w-28 h-28 object-contain" 
                    alt="Menu QR Code" 
                  />
                </div>
                {tableNumber && (
                  <div className={`mt-2 bg-stone-100 text-[10px] font-black px-2 py-0.5 rounded-md border border-dashed ${activePosterTheme.border} text-stone-800`}>
                    طاولة رقم {tableNumber}
                  </div>
                )}
              </div>

              {/* CTA and Text */}
              <div className="relative z-10 space-y-1">
                <h6 className={`text-xs font-black ${activePosterTheme.text}`}>قائمتنا الرقمية وعروضنا الحصرية 🍽️✨</h6>
                <p className="text-[9px] text-stone-500 line-clamp-2 leading-relaxed max-w-[210px] mx-auto">{welcomeText}</p>
                
                {includeEnglish && (
                  <div className="border-t border-stone-100 pt-1 mt-1 max-w-[180px] mx-auto">
                    <p className={`text-[9px] font-black ${activePosterTheme.text} font-mono uppercase tracking-wide`}>Digital Menu & Offers</p>
                    <p className="text-[8px] text-stone-400 leading-tight">Scan with your phone camera</p>
                  </div>
                )}
              </div>

              {/* Poster Footer Brand */}
              <div className="relative z-10 w-full text-[8px] text-stone-300 font-bold flex items-center justify-between border-t border-stone-100 pt-2 px-1">
                {includeContact && business.phone ? (
                  <span>📞 اتصل بنا: {business.phone}</span>
                ) : <span>🌐 دليل إربد</span>}
                <span>shofibirbid.site</span>
              </div>

            </div>

            {/* Poster Operations Actions */}
            <div className="w-full grid grid-cols-2 gap-2 mt-4">
              <button
                type="button"
                onClick={handlePrint}
                className="py-2.5 px-3 bg-stone-900 hover:bg-stone-950 text-white font-black text-xs rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <Printer className="h-4 w-4 text-emerald-300" />
                <span>طباعة بوستر A4 🖨️</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className={`py-2.5 px-3 border font-black text-xs rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                  copied 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                    : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50'
                }`}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4 text-stone-400" />}
                <span>{copied ? 'تم النسخ!' : 'نسخ رابط المنيو 🔗'}</span>
              </button>
            </div>

            {/* Live Web Preview Button */}
            <Link
              to={`/business/${business.id}/menu-offers`}
              className="mt-4 w-full py-3 px-4 bg-emerald-50 hover:bg-emerald-100 text-[#1a4d2e] font-black text-xs rounded-xl transition-all text-center flex items-center justify-center gap-2 border border-emerald-200/80 shadow-xs"
            >
              <Sparkles className="h-4 w-4 text-emerald-600 animate-pulse" />
              <span>معاينة وتجربة شكل المنيو الرقمي والعروض لمشروعك 🍽️✨</span>
            </Link>

          </div>
        </div>

      </div>

    </div>
  );
}
