import React, { useState, useRef } from 'react';
import { Link } from 'react-router';
import { 
  Printer, 
  Sparkles, 
  Check, 
  Palette, 
  Award, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp,
  Download,
  Upload,
  Trash2,
  Star,
  Gift,
  ExternalLink,
  Copy,
  QrCode
} from 'lucide-react';
import { Business } from '../../types';
import { useSystemSettings } from '../../contexts/SystemSettingsContext';
import { PosterCanvasPreview } from './PosterCanvasPreview';
import { PRESET_REVIEWS_TEMPLATES } from '../admin/qr-designer/designerTemplates';
import { printPosterTemplate, exportPosterAsPng, readAndCompressImageFile, PosterExtraVars } from '../admin/qr-designer/designerUtils';
import { PosterTemplate } from '../../types/posterDesigner';

interface ReviewsQrTabProps {
  business: Business;
  isMedical?: boolean;
}

const REVIEWS_PALETTES = [
  { 
    id: 'amber_gold', 
    name: 'الذهبي المشرق للتقييمات', 
    primary: '#0369a1', 
    qr: '#0369a1', 
    cardBg: '#f8fafc', 
    tableBg: '#fef3c7', 
    tableText: '#b45309', 
    title: '#0369a1', 
    text: '#334155' 
  },
  { 
    id: 'emerald_green', 
    name: 'الأخضر الزمردي الراقي', 
    primary: '#0f766e', 
    qr: '#0f766e', 
    cardBg: '#f8fafc', 
    tableBg: '#d1fae5', 
    tableText: '#047857', 
    title: '#0f766e', 
    text: '#334155' 
  },
  { 
    id: 'royal_blue', 
    name: 'الأزرق الفاخر للخدمات الطبية والمنشآت', 
    primary: '#1d4ed8', 
    qr: '#1d4ed8', 
    cardBg: '#f8fafc', 
    tableBg: '#dbeafe', 
    tableText: '#1e40af', 
    title: '#1d4ed8', 
    text: '#334155' 
  },
  { 
    id: 'ruby_rose', 
    name: 'العنابي الملكي الأنيق', 
    primary: '#9f1239', 
    qr: '#9f1239', 
    cardBg: '#fff1f2', 
    tableBg: '#ffe4e6', 
    tableText: '#9f1239', 
    title: '#9f1239', 
    text: '#4c0519' 
  },
  { 
    id: 'slate_dark', 
    name: 'الرمادي الفحمي العصري', 
    primary: '#1e293b', 
    qr: '#0f172a', 
    cardBg: '#f8fafc', 
    tableBg: '#f1f5f9', 
    tableText: '#0f172a', 
    title: '#0f172a', 
    text: '#334155' 
  }
];

export function ReviewsQrTab({ business, isMedical = false }: ReviewsQrTabProps) {
  const { defaultReviewsQrPosterTemplate } = useSystemSettings();
  const activeTemplate: PosterTemplate = defaultReviewsQrPosterTemplate || PRESET_REVIEWS_TEMPLATES[0];

  // Form states
  const [activePalette, setActivePalette] = useState(REVIEWS_PALETTES[0]);
  const [scanTitle, setScanTitle] = useState('قيم تجربتك ورأيك يهمنا ✨');
  const [scanSubtitle, setScanSubtitle] = useState('امسح الكود بكاميرا هاتفك لتقييم تجربتك ورأيك الصادق لمساعدتنا في تقديم أفضل خدمة دائماً');
  const [ratingBadgeText, setRatingBadgeText] = useState('⭐⭐⭐⭐⭐ تقييمات وآراء الزوار الأفاضل');
  const [giftBadgeText, setGiftBadgeText] = useState('🎁 احصل على كود خصم فوري عند تقييمك!');
  const [instructionsText, setInstructionsText] = useState('افتح كاميرا هاتفك ووجّهها نحو الرمز للمسح والتقييم المباشر');
  const [bottomWaveTitle, setBottomWaveTitle] = useState('خدمتكم ورضاكم هو هدفنا الأسمى ❤️');
  const [bottomWaveSubtitle, setBottomWaveSubtitle] = useState('يسعدنا دائماً الاستماع لملاحظاتكم وتطوير خدماتنا لتليق بكم');

  // Custom logo and promotional photo override states
  const [customLogo, setCustomLogo] = useState<string | null>(null);
  const [customFoodPhoto, setCustomFoodPhoto] = useState<string | null>(null);
  const [removeLogoFrame, setRemoveLogoFrame] = useState(false);
  const [removeDishFrame, setRemoveDishFrame] = useState(false);

  // Accordion toggles
  const [isTextsOpen, setIsTextsOpen] = useState(true);
  const [isIdentityOpen, setIsIdentityOpen] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readAndCompressImageFile(file, 800, 0.9);
      setCustomLogo(dataUrl);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readAndCompressImageFile(file, 1000, 0.9);
      setCustomFoodPhoto(dataUrl);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReset = () => {
    setActivePalette(REVIEWS_PALETTES[0]);
    setScanTitle('قيم تجربتك ورأيك يهمنا ✨');
    setScanSubtitle('امسح الكود بكاميرا هاتفك لتقييم تجربتك ورأيك الصادق لمساعدتنا في تقديم أفضل خدمة دائماً');
    setRatingBadgeText('⭐⭐⭐⭐⭐ تقييمات وآراء الزوار الأفاضل');
    setGiftBadgeText('🎁 احصل على كود خصم فوري عند تقييمك!');
    setInstructionsText('افتح كاميرا هاتفك ووجّهها نحو الرمز للمسح والتقييم المباشر');
    setBottomWaveTitle('خدمتكم ورضاكم هو هدفنا الأسمى ❤️');
    setBottomWaveSubtitle('يسعدنا دائماً الاستماع لملاحظاتكم وتطوير خدماتنا لتليق بكم');
    setCustomLogo(null);
    setCustomFoodPhoto(null);
    setRemoveLogoFrame(false);
    setRemoveDishFrame(false);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  // Build target review URL (Dedicated Standalone Public Review Landing Page)
  const targetReviewUrl = `${window.location.origin}/rate/${business.id}`;

  const posterExtraVars: PosterExtraVars = {
    customPrimaryColor: activePalette.primary,
    customSecondaryColor: activePalette.primary,
    customCardBgColor: activePalette.cardBg,
    customQrColor: activePalette.qr,
    customQrBgColor: '#ffffff',
    customTableBadgeBg: activePalette.tableBg,
    customTableBadgeColor: activePalette.tableText,
    customTitleColor: activePalette.title,
    customTextColor: activePalette.text,
    overrideTitle: scanTitle,
    overrideSubtitle: scanSubtitle,
    overrideCategoryBadge: ratingBadgeText,
    overrideDigitalBadge: giftBadgeText,
    overrideInstructions: instructionsText,
    overrideWaveTitle: bottomWaveTitle,
    overrideWaveSubtitle: bottomWaveSubtitle,
    customPosterLogo: customLogo || undefined,
    customPosterFoodPhoto: customFoodPhoto || undefined,
    removeLogoSquareFrame: removeLogoFrame,
    removeDishCircleFrame: removeDishFrame,
    customQrTargetUrl: targetReviewUrl
  };

  const handlePrint = () => {
    printPosterTemplate(activeTemplate, business, posterExtraVars);
  };

  const handleExportPng = () => {
    const filename = `reviews_qr_poster_${business.name || 'shofi_irbid'}.png`;
    exportPosterAsPng('reviews-poster-preview-canvas', filename);
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Banner / Header */}
      <div className="bg-stone-100/80 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-stone-200/80 space-y-3">
        <div>
          <h3 className="text-sm sm:text-base font-black text-stone-900">
            تخصيص بوستر QR التقييمات والمراجعات
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full">
          <Link
            to={`/rate/${business.id}`}
            className="h-9 px-3 sm:px-3.5 text-xs font-black text-indigo-950 bg-indigo-100/90 hover:bg-indigo-200 border border-indigo-200/90 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 flex-1 sm:flex-initial"
            title="فتح صفحة هبوط التقييم المباشرة في نفس النافذة"
          >
            <ExternalLink className="h-3.5 w-3.5 text-indigo-700 shrink-0" />
            <span>فتح صفحة التقييم 👁️</span>
          </Link>

          <button
            type="button"
            onClick={handleReset}
            className="h-9 px-3 sm:px-3.5 text-xs font-black text-stone-700 hover:text-rose-700 bg-white hover:bg-rose-50 border border-stone-200 hover:border-rose-200 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 flex-1 sm:flex-initial"
            title="استعادة كافة الإعدادات والعبارات الافتراضية لبوستر التقييمات"
          >
            <RotateCcw className="h-3.5 w-3.5 text-stone-500 hover:text-rose-600 shrink-0" />
            <span>استعادة الافتراضيات</span>
          </button>
          
          <button
            type="button"
            onClick={handleExportPng}
            className="h-9 px-3 sm:px-3.5 text-xs font-black text-amber-950 bg-amber-100/90 hover:bg-amber-200 border border-amber-200/90 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-2xs flex-1 sm:flex-initial"
          >
            <Download className="h-3.5 w-3.5 text-amber-800 shrink-0" />
            <span>تحميل PNG</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="h-9 px-4 text-xs font-black text-white bg-[#1a4d2e] hover:bg-emerald-900 border border-[#1a4d2e] rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-sm active:scale-95 flex-1 sm:flex-initial"
          >
            <Printer className="h-4 w-4 shrink-0" />
            <span>طباعة بوستر A4</span>
          </button>
        </div>
      </div>

      {savedNotice && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="h-4 w-4 text-amber-700" />
          <span>تمت استعادة إعدادات ونصوص بوستر التقييمات الافتراضية بنجاح!</span>
        </div>
      )}

      {/* Main Grid: Customization Controls (Left) & Canvas Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Controls Column */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* 1. Palette Preset Selector */}
          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-sm text-stone-900 flex items-center gap-2">
                <Palette className="h-4 w-4 text-amber-600" />
                <span>اختر طابع وألوان بوستر التقييمات</span>
              </h4>
              <span className="text-[11px] font-bold text-stone-500">طابع متناسق تلقائياً</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {REVIEWS_PALETTES.map((pal) => {
                const isSelected = activePalette.id === pal.id;
                return (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => setActivePalette(pal)}
                    className={`p-3 rounded-2xl border text-right transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSelected 
                        ? 'border-amber-600 bg-amber-50/60 ring-2 ring-amber-500/20 shadow-xs' 
                        : 'border-stone-200 hover:border-stone-300 bg-stone-50/40'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div 
                        className="w-4 h-4 rounded-full border border-black/10 shrink-0" 
                        style={{ backgroundColor: pal.primary }} 
                      />
                      <span className="text-xs font-bold text-stone-800 truncate">{pal.name}</span>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-amber-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Accordion: Text Customization */}
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => setIsTextsOpen(!isTextsOpen)}
              className="w-full p-5 flex items-center justify-between gap-3 text-right bg-stone-50/60 hover:bg-stone-100/60 transition-colors cursor-pointer border-b border-stone-100"
            >
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <span className="font-black text-sm text-stone-900">تخصيص نصوص وعبارات بوستر التقييمات</span>
              </div>
              {isTextsOpen ? <ChevronUp className="h-4 w-4 text-stone-500" /> : <ChevronDown className="h-4 w-4 text-stone-500" />}
            </button>

            {isTextsOpen && (
              <div className="p-5 space-y-4">
                
                {/* Headline */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 block">عنوان المسح والتقييم الرئيسي</label>
                  <input
                    type="text"
                    value={scanTitle}
                    onChange={(e) => setScanTitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-600"
                    placeholder="قيم تجربتك ورأيك يهمنا ✨"
                  />
                </div>

                {/* Subtitle */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 block">نص التوجيه لوصف التقييم</label>
                  <textarea
                    rows={2}
                    value={scanSubtitle}
                    onChange={(e) => setScanSubtitle(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-amber-600 resize-none"
                    placeholder="امسح الكود بكاميرا هاتفك لتقييم تجربتك ورأيك الصادق لمساعدتنا في تقديم أفضل خدمة دائماً"
                  />
                </div>

                {/* Rating Badge */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 block">شارة النجوم والتقييم العلوية</label>
                  <input
                    type="text"
                    value={ratingBadgeText}
                    onChange={(e) => setRatingBadgeText(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-600"
                  />
                </div>

                {/* Gift/Reward Badge */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 block">شارة حافز التقييم (برنامج المكافآت)</label>
                  <input
                    type="text"
                    value={giftBadgeText}
                    onChange={(e) => setGiftBadgeText(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-600"
                  />
                </div>

                {/* Bottom Section Headlines */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-stone-100">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 block">عنوان القسم السفلي</label>
                    <input
                      type="text"
                      value={bottomWaveTitle}
                      onChange={(e) => setBottomWaveTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:border-amber-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-stone-700 block">وصف القسم السفلي</label>
                    <input
                      type="text"
                      value={bottomWaveSubtitle}
                      onChange={(e) => setBottomWaveSubtitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* 3. Accordion: Identity & Images */}
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xs overflow-hidden">
            <button
              type="button"
              onClick={() => setIsIdentityOpen(!isIdentityOpen)}
              className="w-full p-5 flex items-center justify-between gap-3 text-right bg-stone-50/60 hover:bg-stone-100/60 transition-colors cursor-pointer border-b border-stone-100"
            >
              <div className="flex items-center gap-2.5">
                <Award className="h-4 w-4 text-amber-600" />
                <span className="font-black text-sm text-stone-900">تخصيص صور وهوية بوستر التقييمات</span>
              </div>
              {isIdentityOpen ? <ChevronUp className="h-4 w-4 text-stone-500" /> : <ChevronDown className="h-4 w-4 text-stone-500" />}
            </button>

            {isIdentityOpen && (
              <div className="p-5 space-y-4">
                
                {/* Logo Customization */}
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-black text-stone-900">شعار المنشأة على البوستر</h5>
                      <p className="text-[11px] text-stone-500">يظهر الشعار افتراضياً من ملف المنشأة، أو يمكنك رفع شعار مخصص للبوستر.</p>
                    </div>
                    {customLogo && (
                      <button
                        type="button"
                        onClick={() => setCustomLogo(null)}
                        className="text-xs text-rose-600 hover:underline font-bold flex items-center gap-1"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>إزالة المخصص</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      className="px-3.5 py-2 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>رفع شعار للبوستر</span>
                    </button>

                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-stone-700">
                      <input
                        type="checkbox"
                        checked={removeLogoFrame}
                        onChange={(e) => setRemoveLogoFrame(e.target.checked)}
                        className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                      />
                      <span>إلغاء إطار الشعار المربع</span>
                    </label>
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>

        {/* Live Canvas Preview Column */}
        <div className="lg:col-span-5 space-y-4 sticky top-6">
          <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                <Star className="h-4 w-4 text-amber-600 fill-amber-500" />
                <span>معاينة حية لبوستر التقييمات A4</span>
              </span>
              <span className="text-[10px] font-black bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full">
                رمز الـ QR جاهز ومستجيب
              </span>
            </div>

            <div className="w-full">
              <PosterCanvasPreview
                id="reviews-poster-preview-canvas"
                template={activeTemplate}
                business={business}
                extraVars={posterExtraVars}
              />
            </div>

            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-center space-y-1">
              <p className="text-[11px] text-stone-600 font-bold">
                📱 عند مسح الرمز ينقل الزائر مباشرة إلى صفحة كتابة التقييم الخاصة بـ <span className="text-amber-800 font-black">{business.name}</span>
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
