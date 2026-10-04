import React, { useState, useRef, useEffect } from 'react';
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
  Calendar,
  Download,
  Award,
  RefreshCw,
  Sliders,
  Smartphone,
  Upload,
  Camera,
  Trash2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Move,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Business } from '../../types';
import { useSystemSettings } from '../../contexts/SystemSettingsContext';
import { PosterCanvasPreview } from './PosterCanvasPreview';
import { PRESET_TEMPLATES } from '../admin/qr-designer/designerTemplates';
import { printPosterTemplate, printBulkPosterTemplates, exportPosterAsPng, downloadQrCodeAsPng, readAndCompressImageFile } from '../admin/qr-designer/designerUtils';
import { PosterTemplate } from '../../types/posterDesigner';

interface MenuQrTabProps {
  business: Business;
  onSave: (updatedData: Partial<Business>) => Promise<void>;
  isSaving: boolean;
  initialSubTab?: 'menu_design' | 'poster_customizer';
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

const POSTER_COLOR_PALETTES = [
  { 
    id: 'emerald', 
    name: 'أخضر إربد الزمردي', 
    primary: '#0f766e', 
    qr: '#0f766e', 
    cardBg: '#f8fafc', 
    tableBg: '#d1fae5', 
    tableText: '#047857', 
    title: '#0f766e', 
    text: '#334155' 
  },
  { 
    id: 'ruby', 
    name: 'أحمر المطاعم الجذاب', 
    primary: '#dc2626', 
    qr: '#dc2626', 
    cardBg: '#fffbfb', 
    tableBg: '#fee2e2', 
    tableText: '#991b1b', 
    title: '#b91c1c', 
    text: '#374151' 
  },
  { 
    id: 'sapphire', 
    name: 'أزرق ملكي فاخر', 
    primary: '#1d4ed8', 
    qr: '#1d4ed8', 
    cardBg: '#f8fafc', 
    tableBg: '#dbeafe', 
    tableText: '#1e40af', 
    title: '#1e3a8a', 
    text: '#334155' 
  },
  { 
    id: 'gold', 
    name: 'ذهبي راقي فخم', 
    primary: '#b45309', 
    qr: '#b45309', 
    cardBg: '#fffdfa', 
    tableBg: '#fef3c7', 
    tableText: '#92400e', 
    title: '#92400e', 
    text: '#451a03' 
  },
  { 
    id: 'dark', 
    name: 'أسود عصري أنيق', 
    primary: '#18181b', 
    qr: '#18181b', 
    cardBg: '#f4f4f5', 
    tableBg: '#e4e4e7', 
    tableText: '#18181b', 
    title: '#09090b', 
    text: '#27272a' 
  },
  { 
    id: 'coffee', 
    name: 'بني الكافيهات الدافئ', 
    primary: '#78350f', 
    qr: '#78350f', 
    cardBg: '#fefce8', 
    tableBg: '#fef3c7', 
    tableText: '#78350f', 
    title: '#78350f', 
    text: '#451a03' 
  },
  { 
    id: 'burgundy', 
    name: 'عنابي فاخر', 
    primary: '#881337', 
    qr: '#881337', 
    cardBg: '#fff1f2', 
    tableBg: '#ffe4e6', 
    tableText: '#881337', 
    title: '#881337', 
    text: '#4c0519' 
  },
  { 
    id: 'amber', 
    name: 'برتقالي مشهي', 
    primary: '#ea580c', 
    qr: '#ea580c', 
    cardBg: '#fff7ed', 
    tableBg: '#ffedd5', 
    tableText: '#c2410c', 
    title: '#c2410c', 
    text: '#431407' 
  }
];

export function MenuQrTab({ business, onSave, isSaving, initialSubTab }: MenuQrTabProps) {
  const { globalSettings, defaultQrPosterTemplate } = useSystemSettings();
  const officialLogoUrl = globalSettings?.logoUrl || '/logo.png';

  // Available system templates
  const systemDefaultTemplate = defaultQrPosterTemplate || PRESET_TEMPLATES[0];

  // Active Sub Tab Navigation (Separate Digital Menu Design & QR Poster Customization)
  const [activeSubTab, setActiveSubTab] = useState<'menu_design' | 'poster_customizer'>(
    initialSubTab || 'menu_design'
  );

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);



  // Initialize state from business object with sensible defaults
  const [isEnabled, setIsEnabled] = useState(business.menuQrEnabled ?? true);
  const [themeColor, setThemeColor] = useState(business.menuQrThemeColor ?? '#dc2626');
  const [secondaryColor, setSecondaryColor] = useState(business.menuQrSecondaryColor ?? '#1a4d2e');
  const [layout, setLayout] = useState<'grid' | 'list'>(
    (business.menuQrLayout as any) === 'compact' ? 'grid' : ((business.menuQrLayout as any) ?? 'grid')
  );
  const [welcomeText, setWelcomeText] = useState(
    business.menuQrWelcomeText ?? 'أهلاً وسهلاً بكم في محلنا! تفضلوا باستكشاف أشهى مأكولاتنا ومشروباتنا وعروضنا الحصرية.'
  );

  // ⚡ Local Cache Key for Poster Customization (Stored strictly in client Cache/localStorage, NOT persisted in database)
  const POSTER_CACHE_KEY = `shofi_merchant_poster_cache_${business.id}`;

  const getCachedPosterSettings = () => {
    try {
      const cached = localStorage.getItem(POSTER_CACHE_KEY) || sessionStorage.getItem(POSTER_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Error reading poster cache:', e);
    }
    return null;
  };

  const initialPosterCache = getCachedPosterSettings();

  // ⚡ Default promotional meal photo is permanently the business cover image
  const defaultShopCover = 
    business.coverImage || 
    (business as any)?.cover || 
    business.imageUrl || 
    (business as any)?.image || 
    business.menuQrCoverImage || 
    COVER_PRESETS[0].url;

  const [coverImage, setCoverImage] = useState<string>(() => {
    if (initialPosterCache?.coverImage) return initialPosterCache.coverImage;
    return (
      business.coverImage || 
      (business as any)?.cover || 
      business.menuQrCoverImage || 
      business.imageUrl || 
      (business as any)?.image || 
      COVER_PRESETS[0].url
    );
  });
  const [showPrices, setShowPrices] = useState(business.menuQrShowPrices ?? true);
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);
  const [isDownloadingQr, setIsDownloadingQr] = useState<boolean>(false);

  // States for Ordering, Taxes, Fees, local Payments & Bulk QRs
  const [disableDirectOrder, setDisableDirectOrder] = useState<boolean>(business.disableDirectOrder ?? false);
  const [taxRate, setTaxRate] = useState<number>(business.taxRate ?? 0);
  const [serviceRate, setServiceRate] = useState<number>(business.serviceRate ?? 0);
  const [serviceFixedFee, setServiceFixedFee] = useState<number>(business.serviceFixedFee ?? 0);
  const [tippingEnabled, setTippingEnabled] = useState<boolean>(business.tippingEnabled ?? false);
  const [cliqAlias, setCliqAlias] = useState<string>(business.cliqAlias ?? '');
  const [cliqPhone, setCliqPhone] = useState<string>(business.cliqPhone ?? '');
  const [walletName, setWalletName] = useState<string>(business.walletName ?? '');
  const [walletPhone, setWalletPhone] = useState<string>(business.walletPhone ?? '');
  const [receiptFooterMessage, setReceiptFooterMessage] = useState<string>(business.receiptFooterMessage ?? 'شكراً لزيارتكم وصحتين وعافية!');

  // Bulk QR state
  const [bulkStart, setBulkStart] = useState<number>(1);
  const [bulkEnd, setBulkEnd] = useState<number>(12);
  const [bulkCustomList, setBulkCustomList] = useState<string>('');
  const [bulkType, setBulkType] = useState<'range' | 'custom'>('range');

  const cleanInitialText = (text: string | undefined, defaultVal: string) => {
    if (!text) return defaultVal;
    const cleaned = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{200D}]/gu, '').replace(/\s+/g, ' ').trim();
    return cleaned || defaultVal;
  };

  // 1. نصوص بطاقة المسح والباركود (المنطقة الرئيسية) - Cache First
  const [posterTitle, setPosterTitle] = useState(
    cleanInitialText(initialPosterCache?.posterTitle, 'قائمتنا الرقمية وعروضنا الحصرية')
  );
  const [posterSubtitle, setPosterSubtitle] = useState(
    initialPosterCache?.posterSubtitle ?? 'امسح الرمز للاطلاع على قائمة المنيو، العروض الحصرية، والطلب المباشر'
  );
  const [posterEnglishText, setPosterEnglishText] = useState(
    initialPosterCache?.posterEnglishText ?? 'Scan QR Code for Digital Menu & Offers'
  );
  const [posterDigitalBadge, setPosterDigitalBadge] = useState(
    cleanInitialText(initialPosterCache?.posterDigitalBadge, 'منيو إلكتروني ذكي')
  );
  const [posterInstructions, setPosterInstructions] = useState(
    cleanInitialText(initialPosterCache?.posterInstructions, 'افتح كاميرا هاتفك ووجّهها نحو الرمز مباشرة')
  );
  const [includeContact, setIncludeContact] = useState(
    initialPosterCache?.includeContact ?? true
  );
  const [includeEnglish, setIncludeEnglish] = useState(
    initialPosterCache?.includeEnglish ?? true
  );

  // 2. شارة الطاولة أو العبارة الترحيبية (أعلى كارت الباركود) - Cache First
  const [tableBadgeMode, setTableBadgeMode] = useState<'table' | 'welcome'>(
    initialPosterCache?.tableBadgeMode ?? 'table'
  );
  const [tableNumber, setTableNumber] = useState(
    initialPosterCache?.tableNumber ?? ''
  );
  const [welcomeBadgeText, setWelcomeBadgeText] = useState(
    cleanInitialText(initialPosterCache?.welcomeBadgeText, 'نتشرف بخدمتكم • أهلاً وسهلاً بكم')
  );

  // 3. 🌊 نصوص القسم السفلي (التموجي / الترويجي) - Cache First
  const [posterWaveTitle, setPosterWaveTitle] = useState(
    initialPosterCache?.posterWaveTitle ?? 'استمتع بأشهى المأكولات والمشروبات'
  );
  const [posterWaveSubtitle, setPosterWaveSubtitle] = useState(
    initialPosterCache?.posterWaveSubtitle ?? 'نختار أجود المكونات الطازجة لنقدم لكم تجربة استثنائية لا تُنسى في كل زيارة.'
  );

  // 4. تخصيص ثيم وألوان البوستر المطبوع لمحلك - Cache First
  const [posterPrimaryColor, setPosterPrimaryColor] = useState<string>(
    initialPosterCache?.posterPrimaryColor || ''
  );
  const [posterQrColor, setPosterQrColor] = useState<string>(
    initialPosterCache?.posterQrColor || ''
  );
  const [posterCardBgColor, setPosterCardBgColor] = useState<string>(
    initialPosterCache?.posterCardBgColor || ''
  );
  const [posterTableBadgeBg, setPosterTableBadgeBg] = useState<string>(
    initialPosterCache?.posterTableBadgeBg || ''
  );
  const [posterTableBadgeColor, setPosterTableBadgeColor] = useState<string>(
    initialPosterCache?.posterTableBadgeColor || ''
  );
  const [posterTitleColor, setPosterTitleColor] = useState<string>(
    initialPosterCache?.posterTitleColor || ''
  );
  const [posterTextColor, setPosterTextColor] = useState<string>(
    initialPosterCache?.posterTextColor || ''
  );

  // 5. تخصيص صور وهوية البوستر (شعار مخصص، وجبة مخصصة، إطارات وتحجيم) - Cache First
  const [sessionPosterLogo, setSessionPosterLogo] = useState<string>(() => {
    return initialPosterCache?.sessionPosterLogo || '';
  });

  const [sessionPosterDish, setSessionPosterDish] = useState<string>(() => {
    return initialPosterCache?.sessionPosterDish || '';
  });

  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);
  const [isUploadingDish, setIsUploadingDish] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [removeLogoSquareFrame, setRemoveLogoSquareFrame] = useState<boolean>(() => {
    if (initialPosterCache?.removeLogoSquareFrame !== undefined) {
      return initialPosterCache.removeLogoSquareFrame;
    }
    // الوضع الافتراضي: الصورة الشخصية الافتراضية يكون لها إطار (false)، وعند وجود صورة مخصصة مرفوعة تصبح بدون إطار (true)
    return Boolean(initialPosterCache?.sessionPosterLogo);
  });

  const [removeDishCircleFrame, setRemoveDishCircleFrame] = useState<boolean>(() => {
    if (initialPosterCache?.removeDishCircleFrame !== undefined) {
      return initialPosterCache.removeDishCircleFrame;
    }
    // الوضع الافتراضي: صورة الغلاف الافتراضية يكون لها إطار (false)، وعند وجود صورة مخصصة مرفوعة تصبح بدون إطار (true)
    return Boolean(initialPosterCache?.sessionPosterDish);
  });

  const [sessionDishTransform, setSessionDishTransform] = useState<{ scale: number; dx: number; dy: number }>(() => {
    if (initialPosterCache?.sessionDishTransform && typeof initialPosterCache.sessionDishTransform.scale === 'number') {
      return initialPosterCache.sessionDishTransform;
    }
    return { scale: 1, dx: 0, dy: 0 };
  });

  const [sessionLogoTransform, setSessionLogoTransform] = useState<{ scale: number; dx: number; dy: number }>(() => {
    if (initialPosterCache?.sessionLogoTransform && typeof initialPosterCache.sessionLogoTransform.scale === 'number') {
      return initialPosterCache.sessionLogoTransform;
    }
    return { scale: 1, dx: 0, dy: 0 };
  });

  const [activeImageControlTarget, setActiveImageControlTarget] = useState<'dish' | 'logo'>('dish');
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [cacheSavedNotice, setCacheSavedNotice] = useState(false);

  // Foldable Accordion Sections for Poster
  const [isPosterTextsOpen, setIsPosterTextsOpen] = useState<boolean>(false);
  const [isPosterImagesOpen, setIsPosterImagesOpen] = useState<boolean>(false);

  // ⚡ Sync all 5 poster customization sections to Cache (localStorage) automatically
  useEffect(() => {
    try {
      const cachePayload = {
        posterPrimaryColor,
        posterQrColor,
        posterCardBgColor,
        posterTableBadgeBg,
        posterTableBadgeColor,
        posterTitleColor,
        posterTextColor,
        tableBadgeMode,
        tableNumber,
        welcomeBadgeText,
        posterTitle,
        posterSubtitle,
        posterEnglishText,
        posterDigitalBadge,
        posterInstructions,
        includeContact,
        includeEnglish,
        posterWaveTitle,
        posterWaveSubtitle,
        sessionPosterLogo,
        sessionPosterDish,
        removeLogoSquareFrame,
        removeDishCircleFrame,
        sessionDishTransform,
        sessionLogoTransform,
        coverImage,
        updatedAt: Date.now()
      };
      localStorage.setItem(POSTER_CACHE_KEY, JSON.stringify(cachePayload));
    } catch (e) {
      // If local storage is full (e.g. huge images), fallback gracefully
      console.warn('Could not update poster cache:', e);
    }
  }, [
    POSTER_CACHE_KEY,
    posterPrimaryColor,
    posterQrColor,
    posterCardBgColor,
    posterTableBadgeBg,
    posterTableBadgeColor,
    posterTitleColor,
    posterTextColor,
    tableBadgeMode,
    tableNumber,
    welcomeBadgeText,
    posterTitle,
    posterSubtitle,
    posterEnglishText,
    posterDigitalBadge,
    posterInstructions,
    includeContact,
    includeEnglish,
    posterWaveTitle,
    posterWaveSubtitle,
    sessionPosterLogo,
    sessionPosterDish,
    removeLogoSquareFrame,
    removeDishCircleFrame,
    sessionDishTransform,
    sessionLogoTransform,
    coverImage
  ]);

  // Construct comprehensive extra vars for preview and print
  const posterExtraVars = {
    tableNumber,
    tableBadgeMode,
    overrideTableBadgeText: tableBadgeMode === 'welcome'
      ? welcomeBadgeText
      : (tableNumber && tableNumber.trim() ? (tableNumber.trim().startsWith('طاولة') ? tableNumber.trim() : `طاولة رقم ${tableNumber.trim()}`) : ''),
    overrideTitle: posterTitle,
    overrideSubtitle: posterSubtitle,
    overrideEnglishText: posterEnglishText,
    overrideDigitalBadge: posterDigitalBadge,
    overrideInstructions: posterInstructions,
    overrideWaveTitle: posterWaveTitle,
    overrideWaveSubtitle: posterWaveSubtitle,
    coverImage,
    customPosterLogo: sessionPosterLogo || undefined,
    customPosterFoodPhoto: sessionPosterDish || undefined,
    removeLogoSquareFrame,
    removeDishCircleFrame,
    dishBorderWidth: removeDishCircleFrame ? 0 : 8,
    dishCornerRadius: removeDishCircleFrame ? 0 : 999,
    dishScale: sessionDishTransform.scale,
    dishOffsetX: sessionDishTransform.dx,
    dishOffsetY: sessionDishTransform.dy,
    logoScale: sessionLogoTransform.scale,
    logoOffsetX: sessionLogoTransform.dx,
    logoOffsetY: sessionLogoTransform.dy,
    includeContact,
    includeEnglish,
    platformLogoUrl: officialLogoUrl,
    platformDomain: 'shofibirbid.site',
    customPrimaryColor: posterPrimaryColor || undefined,
    customSecondaryColor: posterPrimaryColor || undefined,
    customQrColor: posterQrColor || undefined,
    customCardBgColor: posterCardBgColor || undefined,
    customTableBadgeBg: posterTableBadgeBg || undefined,
    customTableBadgeColor: posterTableBadgeColor || undefined,
    customTitleColor: posterTitleColor || undefined,
    customTextColor: posterTextColor || undefined,
  };

  const applyPresetPalette = (palette: {
    primary: string;
    qr: string;
    cardBg: string;
    tableBg: string;
    tableText: string;
    title: string;
    text: string;
  }) => {
    setPosterPrimaryColor(palette.primary);
    setPosterQrColor(palette.qr);
    setPosterCardBgColor(palette.cardBg);
    setPosterTableBadgeBg(palette.tableBg);
    setPosterTableBadgeColor(palette.tableText);
    setPosterTitleColor(palette.title);
    setPosterTextColor(palette.text);
  };

  const resetToTemplateDefaultColors = () => {
    setPosterPrimaryColor('');
    setPosterQrColor('');
    setPosterCardBgColor('');
    setPosterTableBadgeBg('');
    setPosterTableBadgeColor('');
    setPosterTitleColor('');
    setPosterTextColor('');
  };

  const logoInputRef = useRef<HTMLInputElement>(null);
  const dishInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    setUploadError(null);
    try {
      const compressedDataUrl = await readAndCompressImageFile(file, 800, 0.9);
      setSessionPosterLogo(compressedDataUrl);
      setRemoveLogoSquareFrame(true);
    } catch (err: any) {
      console.error('Error loading logo:', err);
      setUploadError(err?.message || 'فشل معالجة الشعار');
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleClearSessionLogo = () => {
    setSessionPosterLogo('');
    setRemoveLogoSquareFrame(false); // استعادة الإطار الافتراضي مع الصورة الشخصية الافتراضية للمحل
  };

  const handleDishUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingDish(true);
    setUploadError(null);
    try {
      const compressedDataUrl = await readAndCompressImageFile(file, 1200, 0.88);
      setSessionPosterDish(compressedDataUrl);
      setRemoveDishCircleFrame(true); // عند رفع أي صورة مخصصة يذهب الإطار ويصبح بدون إطار
    } catch (err: any) {
      console.error('Error loading dish photo:', err);
      setUploadError(err?.message || 'فشل معالجة صورة الوجبة');
    } finally {
      setIsUploadingDish(false);
      if (dishInputRef.current) dishInputRef.current.value = '';
    }
  };

  const handleClearSessionDish = () => {
    setSessionPosterDish('');
    setRemoveDishCircleFrame(false); // استعادة الإطار الافتراضي مع صورة غلاف المحل الافتراضية
  };

  const handleTransformAction = (action: 'zoomIn' | 'zoomOut' | 'up' | 'down' | 'right' | 'left', target?: 'dish' | 'logo') => {
    const tgt = target || activeImageControlTarget;
    const isDish = tgt === 'dish';
    const current = isDish ? sessionDishTransform : sessionLogoTransform;
    const setter = isDish ? setSessionDishTransform : setSessionLogoTransform;

    let { scale, dx, dy } = current;

    if (action === 'zoomIn') {
      scale = Math.min(2.5, +(scale + 0.05).toFixed(2));
    } else if (action === 'zoomOut') {
      scale = Math.max(0.4, +(scale - 0.05).toFixed(2));
    } else if (action === 'up') {
      dy = Math.max(-300, dy - 10);
    } else if (action === 'down') {
      dy = Math.min(300, dy + 10);
    } else if (action === 'right') {
      dx = Math.min(300, dx + 10);
    } else if (action === 'left') {
      dx = Math.max(-300, dx - 10);
    }

    setter({ scale, dx, dy });
  };

  const handleResetTransform = (target?: 'dish' | 'logo') => {
    const tgt = target || activeImageControlTarget;
    const initial = { scale: 1, dx: 0, dy: 0 };
    if (tgt === 'dish') {
      setSessionDishTransform(initial);
    } else {
      setSessionLogoTransform(initial);
    }
  };

  const handleResetAllPosterSettings = () => {
    try {
      localStorage.removeItem(POSTER_CACHE_KEY);
      sessionStorage.removeItem(POSTER_CACHE_KEY);
    } catch {}

    // Reset colors
    setPosterPrimaryColor('');
    setPosterQrColor('');
    setPosterCardBgColor('');
    setPosterTableBadgeBg('');
    setPosterTableBadgeColor('');
    setPosterTitleColor('');
    setPosterTextColor('');

    // Reset badge
    setTableBadgeMode('table');
    setTableNumber('');
    setWelcomeBadgeText('نتشرف بخدمتكم • أهلاً وسهلاً بكم');

    // Reset scan texts
    setPosterTitle('قائمتنا الرقمية وعروضنا الحصرية');
    setPosterSubtitle('امسح الرمز للاطلاع على قائمة المنيو، العروض الحصرية، والطلب المباشر');
    setPosterEnglishText('Scan QR Code for Digital Menu & Offers');
    setPosterDigitalBadge('منيو إلكتروني ذكي');
    setPosterInstructions('افتح كاميرا هاتفك ووجّهها نحو الرمز مباشرة');
    setIncludeEnglish(true);
    setIncludeContact(true);

    // Reset wave texts
    setPosterWaveTitle('استمتع بأشهى المأكولات والمشروبات');
    setPosterWaveSubtitle('نختار أجود المكونات الطازجة لنقدم لكم تجربة استثنائية لا تُنسى في كل زيارة.');

    // Reset images & identity
    setSessionPosterLogo('');
    setSessionPosterDish('');
    setRemoveLogoSquareFrame(false); // استعادة الإطار الافتراضي للصورة الشخصية الافتراضية
    setRemoveDishCircleFrame(false); // استعادة الإطار الافتراضي لصورة الغلاف الافتراضية
    setSessionDishTransform({ scale: 1, dx: 0, dy: 0 });
    setSessionLogoTransform({ scale: 1, dx: 0, dy: 0 });
    setCoverImage(defaultShopCover);

    setCacheSavedNotice(true);
    setTimeout(() => setCacheSavedNotice(false), 3000);
  };

  // Derive Active Template (Synchronized directly with the Admin QR Poster Designer template)
  const activeTemplate: PosterTemplate = systemDefaultTemplate;

  // Construct URLs
  const menuOffersUrl = `${window.location.origin}/business/${business.id}/menu-offers`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(menuOffersUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSettings = async () => {
    try {
      // ⚡ Only digital menu options are saved to Firestore database (Poster configurations remain strictly in client Cache)
      await onSave({
        menuQrEnabled: isEnabled,
        menuQrThemeColor: themeColor,
        menuQrSecondaryColor: secondaryColor,
        menuQrLayout: layout,
        menuQrWelcomeText: welcomeText,
        menuQrCoverImage: coverImage,
        menuQrShowPrices: showPrices,
        disableDirectOrder,
        taxRate: Number(taxRate) || 0,
        serviceRate: Number(serviceRate) || 0,
        serviceFixedFee: Number(serviceFixedFee) || 0,
        tippingEnabled,
        cliqAlias: cliqAlias.trim(),
        cliqPhone: cliqPhone.trim(),
        walletName: walletName.trim(),
        walletPhone: walletPhone.trim(),
        receiptFooterMessage: receiptFooterMessage.trim(),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving menu QR settings:', err);
    }
  };

  const handlePrint = () => {
    printPosterTemplate(activeTemplate, business, posterExtraVars);
  };

  const handleExportPng = async () => {
    setIsExportingPng(true);
    try {
      await exportPosterAsPng('merchant-poster-preview-element', `بوستر_QR_${business.name.replace(/\s+/g, '_')}.png`);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleDownloadQrOnly = async () => {
    setIsDownloadingQr(true);
    try {
      const targetUrl = tableBadgeMode === 'table' && tableNumber.trim()
        ? `${menuOffersUrl}?table=${encodeURIComponent(tableNumber.trim())}`
        : menuOffersUrl;
      const qrColor = posterQrColor || themeColor || '#1a4d2e';
      const filename = `QR_منيو_${business.name.replace(/\s+/g, '_')}${tableNumber.trim() ? `_طاولة_${tableNumber.trim()}` : ''}.png`;
      await downloadQrCodeAsPng(targetUrl, filename, qrColor, '#ffffff');
    } catch (err) {
      console.error('Error downloading QR code:', err);
    } finally {
      setIsDownloadingQr(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in">
      
      {/* Banner Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-stone-200">
        <div>
          <h3 className="text-base font-black text-[#2d2a26] flex items-center gap-2">
            <QrCode className="h-6 w-6 text-[#1a4d2e]" />
            <span>نظام المنيو الذكي والـ QR المطور للمطاعم والمقاهي</span>
          </h3>
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

      {/* 🧭 THREE SEPARATE DEDICATED TABS NAVIGATOR */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-2 p-1.5 bg-stone-100 rounded-2xl border border-stone-200/90 w-full">
        
        {/* Tab 1: تصميم ومظهر صفحة المنيو الرقمي */}
        <button
          type="button"
          onClick={() => setActiveSubTab('menu_design')}
          className={`flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
            activeSubTab === 'menu_design'
              ? 'bg-white text-purple-900 shadow-sm border border-stone-200/90 ring-1 ring-black/5'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
          }`}
        >
          <div className={`p-1.5 rounded-lg shrink-0 ${activeSubTab === 'menu_design' ? 'bg-purple-100 text-purple-800' : 'bg-stone-200 text-stone-600'}`}>
            <Smartphone className="h-4 w-4" />
          </div>
          <div className="text-right min-w-0">
            <span className="block font-black truncate">1. مظهر صفحة المنيو</span>
          </div>
        </button>

        {/* Tab 2: تخصيص بوستر الـ QR وقالب التصميم */}
        <button
          type="button"
          onClick={() => setActiveSubTab('poster_customizer')}
          className={`flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
            activeSubTab === 'poster_customizer'
              ? 'bg-white text-emerald-900 shadow-sm border border-stone-200/90 ring-1 ring-black/5'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
          }`}
        >
          <div className={`p-1.5 rounded-lg shrink-0 ${activeSubTab === 'poster_customizer' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'}`}>
            <Printer className="h-4 w-4" />
          </div>
          <div className="text-right min-w-0">
            <span className="block font-black truncate">2. بوسترات QR وطباعة الملصقات</span>
          </div>
        </button>

      </div>

      {/* ========================================================================= */}
      {/* 📄 SUB-TAB 1: DIGITAL MENU PAGE DESIGN & APPEARANCE                     */}
      {/* ========================================================================= */}
      {activeSubTab === 'menu_design' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start animate-in fade-in">
          
          {/* LEFT: Controls for Menu Website */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-2xs space-y-5">
              <div className="pb-3 border-b border-stone-100">
                <h4 className="font-black text-sm text-stone-900 flex items-center gap-2">
                  <Palette className="h-4 w-4 text-purple-600" />
                  <span>1. إعدادات تصميم ومظهر صفحة المنيو الرقمي (الموبايل والويب)</span>
                </h4>
              </div>

              {/* Theme Colors */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-stone-800">اللون الأساسي لثيم صفحة المنيو والأزرار:</label>
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
                  <span className="text-[11px] text-stone-500 font-bold">أو اختر لوناً مخصصاً لصفحة المنيو:</span>
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
                  <label className="block text-xs font-black text-stone-800">طريقة عرض وجبات المنيو في الصفحة:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'grid', label: 'شبكة كروت (Grid)', icon: LayoutGrid },
                      { id: 'list', label: 'قائمة غنية (List)', icon: FileText },
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
                              ? 'bg-purple-50 text-purple-800 border-purple-400 font-black ring-1 ring-purple-400'
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
                    <div>
                      <span className="text-[11px] font-black text-stone-800 block">عرض أسعار الوجبات</span>
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
                  <label className="block text-xs font-black text-stone-800">الرسالة الترحيبية في أعلى صفحة المنيو:</label>
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
                <label className="block text-xs font-black text-stone-800">صورة غلاف رأسية المنيو (Cover Banner):</label>
                <div className="grid grid-cols-6 gap-2">
                  {/* Business Own Cover Image */}
                  {defaultShopCover && (
                    <button
                      type="button"
                      onClick={() => setCoverImage(defaultShopCover)}
                      className={`relative h-14 w-full rounded-xl overflow-hidden border cursor-pointer transition-all ${
                        coverImage === defaultShopCover ? 'ring-2 ring-emerald-600 ring-offset-2 scale-102 border-transparent' : 'border-stone-200 hover:opacity-90'
                      }`}
                      title="غلاف المحل الأصلي (الافتراضي)"
                    >
                      <img src={defaultShopCover} className="w-full h-full object-cover" alt="غلاف المحل" />
                      <div className="absolute top-1 right-1 bg-emerald-700 text-white text-[8px] font-bold px-1 rounded">غلافك</div>
                      {coverImage === defaultShopCover && (
                        <div className="absolute inset-0 bg-emerald-950/40 flex items-center justify-center text-white">
                          <Check className="h-4 w-4 stroke-[3px]" />
                        </div>
                      )}
                    </button>
                  )}
                  {COVER_PRESETS.filter(p => p.url !== defaultShopCover).map((p, idx) => {
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

            {/* CARD A: Direct Ordering Control */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-2xs space-y-4">
              <div className="pb-3 border-b border-stone-100">
                <h4 className="font-black text-sm text-stone-900 flex items-center gap-2">
                  <Settings className="h-4 w-4 text-emerald-600" />
                  <span>2. خيارات الطلب المباشر وتذييل الفاتورة</span>
                </h4>
              </div>

              {/* Disable Direct Order Toggle */}
              <button
                type="button"
                onClick={() => setDisableDirectOrder(!disableDirectOrder)}
                className="w-full p-4 bg-stone-50 hover:bg-stone-100 rounded-2xl border border-stone-200 text-right transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-black text-stone-800 block">تعطيل الطلب المباشر للزبائن</span>
                </div>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                  disableDirectOrder ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-stone-300 text-transparent'
                }`}>
                  <Check className="h-3 w-3 stroke-[3px]" />
                </div>
              </button>

              {/* Receipt Footer Message */}
              <div className="space-y-1">
                <label className="block text-xs font-black text-stone-800">رسالة تذييل الفاتورة للطباعة الحرارية:</label>
                <input
                  type="text"
                  value={receiptFooterMessage}
                  onChange={(e) => setReceiptFooterMessage(e.target.value)}
                  placeholder="مثال: شكراً لزيارتكم وصحتين وعافية!"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:bg-white focus:border-stone-400"
                />
              </div>
            </div>

            {/* CARD B: Taxes, Services & Tips */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-2xs space-y-4">
              <div className="pb-3 border-b border-stone-100">
                <h4 className="font-black text-sm text-stone-900 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-600" />
                  <span>3. إعدادات الضرائب، رسوم الخدمة، والإكراميات</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-stone-700">نسبة الضريبة المضافة (%):</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={taxRate || ''}
                    onChange={(e) => setTaxRate(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-800 focus:outline-none focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-stone-700">نسبة الخدمة المضافة (%):</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={serviceRate || ''}
                    onChange={(e) => setServiceRate(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-800 focus:outline-none focus:bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-stone-700">رسوم خدمة ثابتة (دينار):</label>
                  <input
                    type="number"
                    step="0.05"
                    min={0}
                    value={serviceFixedFee || ''}
                    onChange={(e) => setServiceFixedFee(Math.max(0, Number(e.target.value) || 0))}
                    placeholder="0.00"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-800 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              {/* Tipping Enable Toggle */}
              <button
                type="button"
                onClick={() => setTippingEnabled(!tippingEnabled)}
                className="w-full p-3 bg-stone-50 hover:bg-stone-100 rounded-2xl border border-stone-200 text-right transition-all cursor-pointer flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-black text-stone-800 block">تفعيل خيار الإكرامية ولدعم الطاقم (Tip)</span>
                </div>
                <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all shrink-0 ${
                  tippingEnabled ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-stone-300 text-transparent'
                }`}>
                  <Check className="h-3 w-3 stroke-[3px]" />
                </div>
              </button>
            </div>

            {/* CARD C: Payments (CliQ & Local Wallets) */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-2xs space-y-4">
              <div className="pb-3 border-b border-stone-100">
                <h4 className="font-black text-sm text-stone-900 flex items-center gap-2">
                  <Languages className="h-4 w-4 text-blue-600" />
                  <span>4. تيسير الدفع الإلكتروني والمحافظ المحلية (CliQ / المحافظ)</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3 bg-stone-50/50 p-4 rounded-2xl border border-stone-100">
                  <span className="text-xs font-black text-[#1a4d2e] block">نظام كليك الفوري (CliQ):</span>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-stone-600">اسم مستعار / Alias:</label>
                    <input
                      type="text"
                      value={cliqAlias}
                      onChange={(e) => setCliqAlias(e.target.value)}
                      placeholder="مثال: IrbidBurger"
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-stone-600">رقم الهاتف لكليك (في حال عدم وجود Alias):</label>
                    <input
                      type="text"
                      value={cliqPhone}
                      onChange={(e) => setCliqPhone(e.target.value)}
                      placeholder="مثال: 079XXXXXXXX"
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-800"
                    />
                  </div>
                </div>

                <div className="space-y-3 bg-stone-50/50 p-4 rounded-2xl border border-stone-100">
                  <span className="text-xs font-black text-blue-700 block">المحافظ المحلية (Zain Cash / Orange Money...):</span>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-stone-600">مزود خدمة المحفظة:</label>
                    <input
                      type="text"
                      value={walletName}
                      onChange={(e) => setWalletName(e.target.value)}
                      placeholder="مثال: زين كاش (Zain Cash)"
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-800"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-stone-600">رقم هاتف المحفظة الإلكترونية:</label>
                    <input
                      type="text"
                      value={walletPhone}
                      onChange={(e) => setWalletPhone(e.target.value)}
                      placeholder="مثال: 079XXXXXXXX"
                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-800"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button for Menu Design */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveSettings}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 text-white font-black text-xs transition-all shadow-md cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-4.5 w-4.5" />
                <span>{isSaving ? 'جاري حفظ التعديلات...' : 'حفظ وتطبيق تصميم صفحة المنيو'}</span>
              </button>

              {saveSuccess && (
                <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-2xl animate-in fade-in">
                  تم الحفظ بنجاح!
                </span>
              )}
            </div>
          </div>

          {/* RIGHT: Mobile Screen Interactive Simulation Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-stone-900 p-4 sm:p-5 rounded-3xl border border-stone-800 shadow-xl text-white flex flex-col items-center">
              
              <div className="w-full flex items-center justify-between mb-3 text-stone-300">
                <span className="text-xs font-black flex items-center gap-1.5 text-stone-200">
                  <Smartphone className="h-4 w-4 text-purple-400" />
                  <span>محاكاة مظهر صفحة المنيو في هاتف الزبون</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-stone-800 text-stone-300 border border-stone-700">
                  Live Mobile View
                </span>
              </div>

              {/* Phone Frame Simulator */}
              <div className="w-full max-w-[320px] bg-stone-950 rounded-[32px] border-4 border-stone-800 shadow-2xl overflow-hidden text-stone-900">
                
                {/* Phone Speaker & Camera Notch */}
                <div className="bg-stone-900 py-1.5 flex justify-center items-center gap-2">
                  <div className="w-12 h-1 bg-stone-700 rounded-full" />
                  <div className="w-2 h-2 bg-stone-700 rounded-full" />
                </div>

                {/* Inner Mobile Screen Content */}
                <div className="bg-stone-50 max-h-[480px] overflow-y-auto pb-4">
                  {/* Header Cover Banner */}
                  <div className="relative h-28 w-full bg-stone-200">
                    <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    <div className="absolute bottom-2 right-3 left-3 flex items-center gap-2">
                      <img 
                        src={business.logoUrl || business.imageUrl || (business as any)?.image || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=120&q=80'} 
                        alt="Logo" 
                        className="w-10 h-10 rounded-xl object-cover border-2 border-white shadow-md bg-white shrink-0" 
                      />
                      <div className="text-white min-w-0">
                        <h5 className="font-black text-xs truncate">{business.name}</h5>
                        <p className="text-[9px] text-stone-200 truncate">{business.category || 'مطعم ومقهى'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Welcome Message Box */}
                  <div className="p-3 bg-white border-b border-stone-100">
                    <div className="p-2 rounded-xl text-[10px] font-bold leading-relaxed" style={{ backgroundColor: `${themeColor}15`, color: themeColor }}>
                      {welcomeText}
                    </div>
                  </div>

                  {/* Category Pills Simulated */}
                  <div className="px-3 py-2 flex gap-1.5 overflow-x-auto no-scrollbar">
                    <span className="px-2.5 py-1 rounded-full text-[9px] font-black text-white shrink-0 shadow-xs" style={{ backgroundColor: themeColor }}>
                      الأكثر طلباً
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-stone-200 text-stone-700 shrink-0">
                      وجبات رئيسية
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-stone-200 text-stone-700 shrink-0">
                      مقبلات ومشروبات
                    </span>
                  </div>

                  {/* Simulated Dishes (Grid vs List) */}
                  <div className="p-3 space-y-2">
                    {layout === 'grid' ? (
                      <div className="grid grid-cols-2 gap-2">
                        {[1, 2].map((idx) => (
                          <div key={idx} className="bg-white rounded-xl border border-stone-200 p-2 shadow-2xs space-y-1">
                            <div className="h-16 w-full rounded-lg bg-stone-100 overflow-hidden">
                              <img src={COVER_PRESETS[idx].url} className="w-full h-full object-cover" alt="" />
                            </div>
                            <span className="font-black text-[10px] text-stone-900 block truncate">وجبة الشيف المميزة</span>
                            {showPrices && (
                              <span className="text-[9px] font-black block" style={{ color: themeColor }}>
                                4.50 د.أ
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {[1, 2].map((idx) => (
                          <div key={idx} className="bg-white rounded-xl border border-stone-200 p-2 shadow-2xs flex items-center gap-2">
                            <img src={COVER_PRESETS[idx].url} className="w-12 h-12 rounded-lg object-cover shrink-0" alt="" />
                            <div className="flex-1 min-w-0">
                              <span className="font-black text-[10px] text-stone-900 block truncate">وجبة الشيف المميزة</span>
                              <span className="text-[8px] text-stone-400 block truncate">مكونات طازجة مع صوص خاص</span>
                            </div>
                            {showPrices && (
                              <span className="text-[10px] font-black shrink-0" style={{ color: themeColor }}>
                                4.50 د.أ
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Action Links */}
              <div className="w-full space-y-2 mt-4">
                <Link
                  to={`/business/${business.id}/menu-offers`}
                  target="_blank"
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl transition-all text-center flex items-center justify-center gap-2 shadow-sm"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>معاينة وتجربة شكل المنيو الرقمي والعروض لمشروعك</span>
                </Link>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`w-full py-2.5 px-3 border font-black text-xs rounded-2xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 ${
                      copied 
                        ? 'bg-emerald-900/60 text-emerald-300 border-emerald-600' 
                        : 'bg-stone-800 border-stone-700 text-stone-300 hover:bg-stone-750'
                    }`}
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5 text-stone-400" />}
                    <span>{copied ? 'تم النسخ بنجاح!' : 'نسخ رابط صفحة المنيو'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadQrOnly}
                    disabled={isDownloadingQr}
                    className="w-full py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-950 font-black text-xs rounded-2xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 disabled:opacity-50"
                  >
                    <QrCode className="h-3.5 w-3.5 text-emerald-700 shrink-0" />
                    <span>{isDownloadingQr ? 'جاري التحميل...' : 'تحميل الـ QR كصورة'}</span>
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 🖨️ SUB-TAB 2: PRINTABLE QR POSTER CUSTOMIZER & TEMPLATES               */}
      {/* ========================================================================= */}
      {activeSubTab === 'poster_customizer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start animate-in fade-in">
          
          {/* LEFT: Controls for Printable Poster */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-2xs space-y-5">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                <div>
                  <h4 className="font-black text-sm text-stone-900 flex items-center gap-2">
                    <Printer className="h-4 w-4 text-[#1a4d2e]" />
                    <span>2. تخصيص بوستر الـ QR وقالب التصميم المعتمد</span>
                  </h4>
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={handleResetAllPosterSettings}
                    className="px-3 py-1.5 text-xs font-black text-stone-700 hover:text-rose-700 bg-stone-100 hover:bg-rose-50 border border-stone-200/90 hover:border-rose-200 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs active:scale-95"
                    title="استعادة كافة نصوص وألوان وهوية البوستر الافتراضية"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-stone-500 hover:text-rose-600" />
                    <span>استعادة الافتراضيات</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadQrOnly}
                    disabled={isDownloadingQr}
                    className="px-3 py-1.5 text-xs font-black text-emerald-950 bg-emerald-100/90 hover:bg-emerald-200 border border-emerald-300 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs active:scale-95 disabled:opacity-50"
                    title="تحميل رمز الـ QR فقط كصورة PNG عالية الدقة"
                  >
                    <QrCode className="h-3.5 w-3.5 text-emerald-800" />
                    <span>{isDownloadingQr ? 'جاري التحميل...' : 'تحميل الـ QR كصورة'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportPng}
                    disabled={isExportingPng}
                    className="px-3 py-1.5 text-xs font-black text-amber-950 bg-amber-100/90 hover:bg-amber-200 border border-amber-200/90 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs active:scale-95 disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5 text-amber-800" />
                    <span>{isExportingPng ? 'جاري التصدير...' : 'تحميل البوستر PNG'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="px-3.5 py-1.5 text-xs font-black text-white bg-[#1a4d2e] hover:bg-emerald-900 border border-[#1a4d2e] rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm active:scale-95"
                  >
                    <Printer className="h-3.5 w-3.5 text-emerald-300" />
                    <span>طباعة A4</span>
                  </button>
                </div>
              </div>

              {cacheSavedNotice && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                  <Check className="h-4 w-4 text-emerald-700" />
                  <span>تمت استعادة إعدادات وهوية البوستر الافتراضية بنجاح!</span>
                </div>
              )}

              {/* Quick Theme Palettes for Poster */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
                      <Palette className="h-4 w-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-stone-900">تخصيص ثيم وألوان البوستر المطبوع لمحلك</h5>
                    </div>
                  </div>

                  {(posterPrimaryColor || posterQrColor || posterCardBgColor || posterTableBadgeBg || posterTableBadgeColor || posterTitleColor || posterTextColor) && (
                    <button
                      type="button"
                      onClick={resetToTemplateDefaultColors}
                      className="px-2.5 py-1 text-[10px] font-bold text-stone-600 hover:text-stone-900 bg-stone-200/80 hover:bg-stone-300 rounded-lg flex items-center gap-1 transition-all cursor-pointer self-start sm:self-auto"
                      title="استعادة الألوان الأصلية للقالب"
                    >
                      <RefreshCw className="h-3 w-3" />
                      <span>استعادة ألوان القالب</span>
                    </button>
                  )}
                </div>

                {/* Quick Theme Palettes */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-stone-700 block">ثيمات لونية جاهزة وسريعة للبوستر:</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {POSTER_COLOR_PALETTES.map((palette) => {
                      const isSelected = posterPrimaryColor === palette.primary;
                      return (
                        <button
                          key={palette.id}
                          type="button"
                          onClick={() => applyPresetPalette(palette)}
                          className={`p-2 rounded-xl border transition-all flex items-center gap-2 text-right cursor-pointer ${
                            isSelected
                              ? 'border-purple-600 bg-purple-50/50 shadow-xs ring-1 ring-purple-600'
                              : 'border-stone-200 bg-white hover:border-stone-400 hover:shadow-xs'
                          }`}
                        >
                          <div className="w-5 h-5 rounded-full shrink-0 shadow-xs border border-white" style={{ backgroundColor: palette.primary }} />
                          <span className={`text-[10px] font-black truncate ${isSelected ? 'text-purple-900' : 'text-stone-800'}`}>
                            {palette.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 📝 SECTION 1: ALL POSTER TEXTS (Collapsible unified section, no suggestion chips) */}
              <div className="bg-stone-50 rounded-2xl border border-stone-200/90 overflow-hidden transition-all shadow-2xs">
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => setIsPosterTextsOpen(prev => !prev)}
                  className="w-full p-4 flex items-center justify-between text-right hover:bg-stone-100/80 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-stone-900 flex items-center gap-2">
                        <span>تخصيص نصوص وعبارات البوستر</span>
                        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/60">
                          {isPosterTextsOpen ? 'مفتوح' : 'مطوي'}
                        </span>
                      </h5>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-stone-500 shrink-0">
                    <span className="text-[11px] font-bold hidden sm:inline text-stone-400">
                      {isPosterTextsOpen ? 'إغلاق القسم' : 'عرض وتعديل النصوص'}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-stone-700 shadow-2xs">
                      {isPosterTextsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </button>

                {/* Accordion Body */}
                {isPosterTextsOpen && (
                  <div className="p-4 pt-2 border-t border-stone-200/80 bg-stone-50/50 space-y-4 animate-in fade-in duration-200">
                    
                    {/* A. Table Badge / Welcome Message */}
                    <div className="p-3.5 bg-white rounded-xl border border-stone-200/90 shadow-2xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            <span>1. شارة الطاولة أو العبارة الترحيبية (أعلى كارت الباركود):</span>
                          </span>
                        </div>

                        {/* Mode Toggle Buttons */}
                        <div className="flex items-center bg-stone-100 p-0.5 rounded-xl self-start sm:self-auto border border-stone-200">
                          <button
                            type="button"
                            onClick={() => setTableBadgeMode('table')}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                              tableBadgeMode === 'table'
                                ? 'bg-white text-stone-900 shadow-xs'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            رقم الطاولة / الجلسة
                          </button>
                          <button
                            type="button"
                            onClick={() => setTableBadgeMode('welcome')}
                            className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                              tableBadgeMode === 'welcome'
                                ? 'bg-white text-emerald-800 shadow-xs'
                                : 'text-stone-600 hover:text-stone-900'
                            }`}
                          >
                            عبارة ترحيبية بالضيوف
                          </button>
                        </div>
                      </div>

                      {tableBadgeMode === 'table' ? (
                        <div className="space-y-1.5 pt-1">
                          <label className="block text-[11px] font-bold text-stone-700">رقم الطاولة أو اسم الجلسة:</label>
                          <input
                            type="text"
                            value={tableNumber}
                            onChange={(e) => setTableNumber(e.target.value)}
                            placeholder="مثال: 5، أو طاولة 12، أو الجلسة الخارجية (اتركها فارغة لبوستر عام)"
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:bg-white focus:border-stone-400"
                          />
                        </div>
                      ) : (
                        <div className="space-y-1.5 pt-1">
                          <label className="block text-[11px] font-bold text-stone-700">العبارة الترحيبية داخل الشارة:</label>
                          <input
                            type="text"
                            value={welcomeBadgeText}
                            onChange={(e) => setWelcomeBadgeText(e.target.value)}
                            placeholder="مثال: نتشرف بخدمتكم • أهلاً وسهلاً بكم"
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:bg-white focus:border-stone-400"
                          />
                        </div>
                      )}
                    </div>

                    {/* B. Main Scan Card Texts */}
                    <div className="p-3.5 bg-white rounded-xl border border-stone-200/90 shadow-2xs space-y-3">
                      <div className="space-y-0.5">
                        <span className="text-xs font-black text-stone-900 block">
                          2. نصوص بطاقة المسح والباركود (المنطقة الرئيسية):
                        </span>
                      </div>

                      {/* Scan Title */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-stone-700">العنوان الرئيسي للمسح بالبوستر:</label>
                        <input
                          type="text"
                          value={posterTitle}
                          onChange={(e) => setPosterTitle(e.target.value)}
                          placeholder="مثال: قائمتنا الرقمية وعروضنا الحصرية"
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:bg-white focus:border-stone-400"
                        />
                      </div>

                      {/* Scan Subtitle */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-stone-700">العبارة التوجيهية للمسح (الوصف الفرعي):</label>
                        <input
                          type="text"
                          value={posterSubtitle}
                          onChange={(e) => setPosterSubtitle(e.target.value)}
                          placeholder="مثال: امسح الرمز للاطلاع على قائمة المنيو، العروض الحصرية، والطلب المباشر"
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:bg-white focus:border-stone-400"
                        />
                      </div>

                      {/* Digital Badge and Camera Instructions */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-stone-700">شارة منيو رقمي (الأعلى):</label>
                          <input
                            type="text"
                            value={posterDigitalBadge}
                            onChange={(e) => setPosterDigitalBadge(e.target.value)}
                            placeholder="منيو إلكتروني ذكي"
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-800 focus:outline-none focus:bg-white focus:border-stone-400"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-stone-700">تعليمات وإرشادات الكاميرا:</label>
                          <input
                            type="text"
                            value={posterInstructions}
                            onChange={(e) => setPosterInstructions(e.target.value)}
                            placeholder="افتح كاميرا هاتفك ووجّهها نحو الرمز مباشرة"
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-800 focus:outline-none focus:bg-white focus:border-stone-400"
                          />
                        </div>
                      </div>

                      {includeEnglish && (
                        <div className="space-y-1 pt-1">
                          <label className="block text-[11px] font-bold text-stone-700">العبارة التوجيهية باللغة الإنجليزية (Bilingual):</label>
                          <input
                            type="text"
                            value={posterEnglishText}
                            onChange={(e) => setPosterEnglishText(e.target.value)}
                            placeholder="Scan QR Code for Digital Menu & Offers"
                            dir="ltr"
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-bold font-mono text-stone-800 focus:outline-none focus:bg-white focus:border-stone-400"
                          />
                        </div>
                      )}
                    </div>

                    {/* C. Bottom Wavy Section Texts */}
                    <div className="p-3.5 bg-white rounded-xl border border-stone-200/90 shadow-2xs space-y-3">
                      <div className="space-y-0.5">
                        <span className="text-xs font-black text-stone-900 block">
                          3. نصوص القسم السفلي (التموجي / الترويجي):
                        </span>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-stone-700">عنوان القسم السفلي الترويجي:</label>
                        <input
                          type="text"
                          value={posterWaveTitle}
                          onChange={(e) => setPosterWaveTitle(e.target.value)}
                          placeholder="مثال: استمتع بأشهى المأكولات والمشروبات"
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:bg-white focus:border-stone-400"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-stone-700">وصف وخاتمة القسم السفلي:</label>
                        <textarea
                          rows={2}
                          value={posterWaveSubtitle}
                          onChange={(e) => setPosterWaveSubtitle(e.target.value)}
                          placeholder="مثال: نختار أجود المكونات الطازجة لنقدم لكم تجربة استثنائية لا تُنسى في كل زيارة."
                          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:bg-white focus:border-stone-400 resize-none"
                        />
                      </div>
                    </div>

                  </div>
                )}
              </div>

              {/* 🖼️ SECTION 2: POSTER IMAGES & IDENTITY (Collapsible Accordion) */}
              <div className="bg-stone-50 rounded-2xl border border-stone-200/90 overflow-hidden transition-all shadow-2xs">
                {/* Accordion Header */}
                <button
                  type="button"
                  onClick={() => setIsPosterImagesOpen(prev => !prev)}
                  className="w-full p-4 flex items-center justify-between text-right hover:bg-stone-100/80 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                      <Camera className="h-4 w-4 text-[#1a4d2e]" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-stone-900 flex items-center gap-2">
                        <span>تخصيص صور وهوية البوستر</span>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                          {isPosterImagesOpen ? 'مفتوح' : 'مطوي'}
                        </span>
                      </h5>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-stone-500 shrink-0">
                    <span className="text-[11px] font-bold hidden sm:inline text-stone-400">
                      {isPosterImagesOpen ? 'إغلاق القسم' : 'تعديل الصور والأحجام'}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-stone-700 shadow-2xs">
                      {isPosterImagesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </button>

                {/* Accordion Body */}
                {isPosterImagesOpen && (
                  <div className="p-4 sm:p-5 pt-2 border-t border-stone-200/80 bg-stone-50/50 space-y-4 animate-in fade-in duration-200">
                    
                    {uploadError && (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{uploadError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* A. Merchant Logo Customizer for Poster */}
                      <div className={`p-3.5 bg-white rounded-xl border transition-all space-y-3 ${
                        activeImageControlTarget === 'logo'
                          ? 'border-emerald-600 ring-2 ring-emerald-600/15 shadow-xs'
                          : 'border-stone-200/90 shadow-2xs'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                            <Store className="h-3.5 w-3.5 text-[#1a4d2e]" />
                            <span>1. شعار المحل في البوستر</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setActiveImageControlTarget('logo')}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                                activeImageControlTarget === 'logo'
                                  ? 'bg-emerald-700 text-white shadow-2xs'
                                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                              }`}
                              title="تحديد الشعار لضبط الحجم والموضع"
                            >
                              {activeImageControlTarget === 'logo' ? '✓ قيد التحكم' : 'تحديد للضبط'}
                            </button>
                            {sessionPosterLogo ? (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                شعار مخصص للبوستر
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                الصورة الشخصية للمحل (الافتراضي)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="relative w-14 h-14 rounded-xl border border-stone-200 bg-stone-50 overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                            <img
                              src={sessionPosterLogo || business.logoUrl || business.imageUrl || (business as any)?.image || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80'}
                              alt="Logo"
                              className="w-full h-full object-contain p-1"
                            />
                          </div>

                          <div className="flex-1 space-y-1.5">
                            <input
                              ref={logoInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleLogoUpload}
                              className="hidden"
                              id="poster-custom-logo-input"
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <label
                                htmlFor="poster-custom-logo-input"
                                className={`px-3 py-1.5 rounded-xl text-[11px] font-black cursor-pointer inline-flex items-center gap-1.5 transition-all shadow-2xs ${
                                  isUploadingLogo 
                                    ? 'bg-stone-200 text-stone-400 cursor-wait'
                                    : 'bg-[#1a4d2e] hover:bg-emerald-800 text-white'
                                }`}
                              >
                                <Upload className="h-3.5 w-3.5" />
                                <span>{isUploadingLogo ? 'جاري المعالجة...' : 'رفع شعار جديد'}</span>
                              </label>

                              {sessionPosterLogo && (
                                <button
                                  type="button"
                                  onClick={handleClearSessionLogo}
                                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer inline-flex items-center gap-1"
                                  title="استعادة الصورة الشخصية والشعار الافتراضي للمحل"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>استعادة الصورة الشخصية للمحل</span>
                                </button>
                              )}
                            </div>
                            <div className="flex items-center justify-end text-[10px] text-stone-400">
                              <span className="font-mono text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded">
                                {Math.round(sessionLogoTransform.scale * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Logo Frame Restriction Toggle Switch */}
                        <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-stone-800">إضافة إطار:</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                              !removeLogoSquareFrame 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : 'bg-stone-100 text-stone-500'
                            }`}>
                              {!removeLogoSquareFrame ? 'مفعّل (مع إطار)' : 'بدون إطار'}
                            </span>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={!removeLogoSquareFrame}
                            onClick={() => setRemoveLogoSquareFrame(prev => !prev)}
                            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              !removeLogoSquareFrame ? 'bg-emerald-600' : 'bg-stone-300'
                            }`}
                            title={!removeLogoSquareFrame ? 'إلغاء الإطار' : 'إضافة إطار للشعار'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                !removeLogoSquareFrame ? '-translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* B. Promotional Food Photo Customizer for Poster */}
                      <div className={`p-3.5 bg-white rounded-xl border transition-all space-y-3 ${
                        activeImageControlTarget === 'dish'
                          ? 'border-amber-600 ring-2 ring-amber-600/15 shadow-xs'
                          : 'border-stone-200/90 shadow-2xs'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                            <Utensils className="h-3.5 w-3.5 text-amber-600" />
                            <span>2. صورة الوجبة الترويجية</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setActiveImageControlTarget('dish')}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-all cursor-pointer ${
                                activeImageControlTarget === 'dish'
                                  ? 'bg-amber-600 text-white shadow-2xs'
                                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                              }`}
                              title="تحديد صورة الوجبة لضبط الحجم والموضع"
                            >
                              {activeImageControlTarget === 'dish' ? '✓ قيد التحكم' : 'تحديد للضبط'}
                            </button>
                            {sessionPosterDish ? (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                صورة مخصصة
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                صورة غلاف المحل (الافتراضي)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="relative w-14 h-14 rounded-xl border border-stone-200 bg-stone-50 overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
                            <img
                              src={sessionPosterDish || coverImage}
                              alt="Dish"
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div className="flex-1 space-y-1.5">
                            <input
                              ref={dishInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleDishUpload}
                              className="hidden"
                              id="poster-custom-dish-input"
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <label
                                htmlFor="poster-custom-dish-input"
                                className={`px-3 py-1.5 rounded-xl text-[11px] font-black cursor-pointer inline-flex items-center gap-1.5 transition-all shadow-2xs ${
                                  isUploadingDish 
                                    ? 'bg-stone-200 text-stone-400 cursor-wait'
                                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                                }`}
                              >
                                <Camera className="h-3.5 w-3.5" />
                                <span>{isUploadingDish ? 'جاري المعالجة...' : 'رفع وجبة جديدة'}</span>
                              </label>

                              {sessionPosterDish && (
                                <button
                                  type="button"
                                  onClick={handleClearSessionDish}
                                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer inline-flex items-center gap-1"
                                  title="استعادة صورة غلاف المحل الافتراضية"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>استعادة غلاف المحل</span>
                                </button>
                              )}
                            </div>
                            <div className="flex items-center justify-end text-[10px] text-stone-400">
                              <span className="font-mono text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded">
                                {Math.round(sessionDishTransform.scale * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Food Photo Frame Restriction Toggle Switch */}
                        <div className="pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-stone-800">إضافة إطار:</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                              !removeDishCircleFrame 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-stone-100 text-stone-500'
                            }`}>
                              {!removeDishCircleFrame ? 'مفعّل (إطار دائري)' : 'بدون إطار'}
                            </span>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={!removeDishCircleFrame}
                            onClick={() => setRemoveDishCircleFrame(prev => !prev)}
                            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              !removeDishCircleFrame ? 'bg-amber-600' : 'bg-stone-300'
                            }`}
                            title={!removeDishCircleFrame ? 'إلغاء الإطار الدائري' : 'إضافة إطار دائري أبيض للوجبة'}
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                !removeDishCircleFrame ? '-translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Alternative preset selector when custom image is not active */}
                        {!sessionPosterDish && (
                          <div className="pt-2 border-t border-stone-100 flex items-center gap-2">
                            <span className="text-[10px] font-bold text-stone-500 shrink-0">من النماذج:</span>
                            <select
                              value={coverImage}
                              onChange={(e) => setCoverImage(e.target.value)}
                              className="flex-1 bg-stone-50 border border-stone-200 rounded-lg px-2 py-1 text-[11px] font-bold text-stone-700 outline-none truncate"
                            >
                               {defaultShopCover && (
                                <option value={defaultShopCover}>صورة غلاف المحل (الافتراضي الدائم)</option>
                              )}
                              {COVER_PRESETS.filter(p => p.url !== defaultShopCover).map((p, idx) => (
                                <option key={idx} value={p.url}>{p.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                    </div>

                    {/* C. Interactive Controls for Image Size & Position in Poster */}
                    <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs space-y-3.5">
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-stone-150">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-xl bg-emerald-50 text-[#1a4d2e] border border-emerald-200 flex items-center justify-center shrink-0">
                            <Move className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <span className="text-xs font-black text-stone-900 block">
                              ضبط الحجم والموضع
                            </span>
                          </div>
                        </div>

                        {/* Reset button */}
                        <button
                          type="button"
                          onClick={() => handleResetTransform()}
                          className="self-start sm:self-center px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 border border-stone-200 transition-all cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
                          title="إعادة ضبط الحجم والموضع إلى الوضع الافتراضي"
                        >
                          <RotateCcw className="h-3 w-3 text-stone-500" />
                          <span>إعادة الضبط الافتراضي</span>
                        </button>
                      </div>

                      {/* Target Selector Tabs: Dish Photo vs Merchant Logo */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-stone-500 shrink-0">
                          تحديد الصورة للضبط:
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => setActiveImageControlTarget('dish')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 border shadow-2xs ${
                            activeImageControlTarget === 'dish'
                              ? 'bg-amber-600 text-white border-amber-600 ring-2 ring-amber-600/20'
                              : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          <Utensils className="h-3.5 w-3.5" />
                          <span>صورة الوجبة الترويجية</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            activeImageControlTarget === 'dish' ? 'bg-amber-700 text-white' : 'bg-stone-200/80 text-stone-600'
                          }`}>
                            {Math.round(sessionDishTransform.scale * 100)}%
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveImageControlTarget('logo')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 border shadow-2xs ${
                            activeImageControlTarget === 'logo'
                              ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] ring-2 ring-emerald-700/20'
                              : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                          }`}
                        >
                          <Store className="h-3.5 w-3.5" />
                          <span>شعار المحل</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            activeImageControlTarget === 'logo' ? 'bg-emerald-800 text-white' : 'bg-stone-200/80 text-stone-600'
                          }`}>
                            {Math.round(sessionLogoTransform.scale * 100)}%
                          </span>
                        </button>
                      </div>

                      {/* 6 Control Buttons Grid (تكبير، تصغير، يمين، يسار، أعلى، أسفل) */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                        
                        {/* 1. Zoom In */}
                        <button
                          type="button"
                          onClick={() => handleTransformAction('zoomIn')}
                          className="p-2.5 bg-stone-50 hover:bg-stone-100 active:bg-amber-50 rounded-xl border border-stone-200 hover:border-amber-400 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 group shadow-2xs"
                          title="تكبير بنسبة 5%"
                        >
                          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center transition-colors">
                            <ZoomIn className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-[11px] font-black text-stone-800">تكبير (+)</span>
                          <span className="text-[9px] text-stone-400 font-mono">+5%</span>
                        </button>

                        {/* 2. Zoom Out */}
                        <button
                          type="button"
                          onClick={() => handleTransformAction('zoomOut')}
                          className="p-2.5 bg-stone-50 hover:bg-stone-100 active:bg-amber-50 rounded-xl border border-stone-200 hover:border-amber-400 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 group shadow-2xs"
                          title="تصغير بنسبة 5%"
                        >
                          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center transition-colors">
                            <ZoomOut className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-[11px] font-black text-stone-800">تصغير (-)</span>
                          <span className="text-[9px] text-stone-400 font-mono">-5%</span>
                        </button>

                        {/* 3. Move Right */}
                        <button
                          type="button"
                          onClick={() => handleTransformAction('right')}
                          className="p-2.5 bg-stone-50 hover:bg-stone-100 active:bg-sky-50 rounded-xl border border-stone-200 hover:border-sky-400 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 group shadow-2xs"
                          title="تحريك لليمين"
                        >
                          <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-800 group-hover:bg-sky-600 group-hover:text-white flex items-center justify-center transition-colors">
                            <ArrowRight className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-[11px] font-black text-stone-800">يمين (→)</span>
                          <span className="text-[9px] text-stone-400 font-mono">+10px</span>
                        </button>

                        {/* 4. Move Left */}
                        <button
                          type="button"
                          onClick={() => handleTransformAction('left')}
                          className="p-2.5 bg-stone-50 hover:bg-stone-100 active:bg-sky-50 rounded-xl border border-stone-200 hover:border-sky-400 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 group shadow-2xs"
                          title="تحريك لليسار"
                        >
                          <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-800 group-hover:bg-sky-600 group-hover:text-white flex items-center justify-center transition-colors">
                            <ArrowLeft className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-[11px] font-black text-stone-800">يسار (←)</span>
                          <span className="text-[9px] text-stone-400 font-mono">-10px</span>
                        </button>

                        {/* 5. Move Up */}
                        <button
                          type="button"
                          onClick={() => handleTransformAction('up')}
                          className="p-2.5 bg-stone-50 hover:bg-stone-100 active:bg-emerald-50 rounded-xl border border-stone-200 hover:border-emerald-400 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 group shadow-2xs"
                          title="تحريك للأعلى"
                        >
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-[#1a4d2e] group-hover:bg-emerald-700 group-hover:text-white flex items-center justify-center transition-colors">
                            <ArrowUp className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-[11px] font-black text-stone-800">أعلى (↑)</span>
                          <span className="text-[9px] text-stone-400 font-mono">-10px</span>
                        </button>

                        {/* 6. Move Down */}
                        <button
                          type="button"
                          onClick={() => handleTransformAction('down')}
                          className="p-2.5 bg-stone-50 hover:bg-stone-100 active:bg-emerald-50 rounded-xl border border-stone-200 hover:border-emerald-400 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer active:scale-95 group shadow-2xs"
                          title="تحريك للأسفل"
                        >
                          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-[#1a4d2e] group-hover:bg-emerald-700 group-hover:text-white flex items-center justify-center transition-colors">
                            <ArrowDown className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-[11px] font-black text-stone-800">أسفل (↓)</span>
                          <span className="text-[9px] text-stone-400 font-mono">+10px</span>
                        </button>

                      </div>

                      {/* Subtle Live Stats Strip */}
                      {(() => {
                        const currentTf = activeImageControlTarget === 'dish' ? sessionDishTransform : sessionLogoTransform;
                        return (
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-stone-500 font-medium">
                            <div className="flex items-center gap-3 font-mono">
                              <span>الحجم: <strong className="text-stone-800">{Math.round(currentTf.scale * 100)}%</strong></span>
                              <span>•</span>
                              <span>أفقي: <strong className="text-stone-800">{currentTf.dx > 0 ? `+${currentTf.dx}px` : `${currentTf.dx}px`}</strong></span>
                              <span>•</span>
                              <span>رأسي: <strong className="text-stone-800">{currentTf.dy > 0 ? `+${currentTf.dy}px` : `${currentTf.dy}px`}</strong></span>
                            </div>
                          </div>
                        );
                      })()}

                    </div>

                  </div>
                )}
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
                  </div>
                  <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                    includeContact ? 'bg-[#1a4d2e] border-[#1a4d2e] text-white' : 'bg-white border-stone-300 text-transparent'
                  }`}>
                    <Check className="h-3 w-3 stroke-[3px]" />
                  </div>
                </button>

              </div>

            </div>

            {/* Bulk Table QR Generation Card */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200 shadow-2xs space-y-5">
              <div className="pb-3 border-b border-stone-100">
                <h4 className="font-black text-sm text-stone-900 flex items-center gap-2">
                  <QrCode className="h-4 w-4 text-emerald-600" />
                  <span>التوليد الجماعي لرموز QR الطاولات (Bulk QR Generation)</span>
                </h4>
              </div>

              <div className="space-y-4">
                <div className="flex gap-4 p-1 bg-stone-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setBulkType('range')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      bulkType === 'range' ? 'bg-white text-emerald-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    نطاق أرقام متسلسل
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkType('custom')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      bulkType === 'custom' ? 'bg-white text-emerald-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    قائمة طاولات مخصصة
                  </button>
                </div>

                {bulkType === 'range' ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-stone-700">البدء من طاولة رقم:</label>
                      <input
                        type="number"
                        min={1}
                        value={bulkStart}
                        onChange={(e) => setBulkStart(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-800"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-stone-700">الانتهاء عند طاولة رقم:</label>
                      <input
                        type="number"
                        min={bulkStart}
                        value={bulkEnd}
                        onChange={(e) => setBulkEnd(Math.max(bulkStart, Number(e.target.value) || bulkStart))}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs font-bold text-stone-800"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-stone-700">أدخل أسماء الطاولات (مفصولة بفاصلة):</label>
                    <input
                      type="text"
                      value={bulkCustomList}
                      onChange={(e) => setBulkCustomList(e.target.value)}
                      placeholder="مثال: 1, 2, 3, VIP-1, VIP-2, الطابق الثاني"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    let tables: string[] = [];
                    if (bulkType === 'range') {
                      for (let i = bulkStart; i <= bulkEnd; i++) {
                        tables.push(String(i));
                      }
                    } else {
                      tables = bulkCustomList
                        .split(',')
                        .map(t => t.trim())
                        .filter(t => t.length > 0);
                    }

                    if (tables.length === 0) {
                      alert('يرجى تحديد الطاولات المراد طباعتها أولاً.');
                      return;
                    }
                    printBulkPosterTemplates(activeTemplate, business, tables, posterExtraVars);
                  }}
                  className="w-full py-3 bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="h-4 w-4" />
                  <span>توليد وطباعة بوسترات الطاولات جماعياً ({bulkType === 'range' ? bulkEnd - bulkStart + 1 : bulkCustomList.split(',').filter(x => x.trim()).length} بوسترات)</span>
                </button>
              </div>
            </div>

            {/* Action Buttons for Saving poster settings */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveSettings}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-[#1a4d2e] to-emerald-800 hover:from-emerald-800 hover:to-emerald-900 text-white font-black text-xs transition-all shadow-md cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-4.5 w-4.5" />
                <span>{isSaving ? 'جاري حفظ الإعدادات...' : 'حفظ وتثبيت إعدادات بوستر الـ QR'}</span>
              </button>

              {saveSuccess && (
                <span className="text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-2xl animate-in fade-in">
                  تم حفظ التعديلات بنجاح!
                </span>
              )}
            </div>

          </div>

          {/* RIGHT: Live Printable A4 Poster Preview */}
          <div className="lg:col-span-5 space-y-5">
            <div className="bg-stone-100 p-4 sm:p-6 rounded-3xl border border-stone-200/80 shadow-inner flex flex-col items-center">
              
              <div className="w-full flex items-center justify-between mb-3 text-stone-600">
                <span className="text-xs font-black flex items-center gap-1.5 text-stone-900">
                  <Eye className="h-4 w-4 text-[#1a4d2e]" />
                  <span>معاينة حية لبوستر الطاولة (A4)</span>
                </span>
              </div>

              {/* Live Canvas Poster Frame */}
              <div className="w-full flex items-center justify-center">
                <PosterCanvasPreview
                  template={activeTemplate}
                  business={business}
                  extraVars={posterExtraVars}
                  id="merchant-poster-preview-element"
                />
              </div>

              {/* Poster Operations Actions */}
              <div className="w-full mt-4 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleExportPng}
                    disabled={isExportingPng}
                    className="py-3 px-3 bg-amber-100/90 hover:bg-amber-200 border border-amber-300 text-amber-950 font-black text-xs rounded-2xl transition-all shadow-2xs cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    <Download className="h-4 w-4 text-amber-800 shrink-0" />
                    <span>{isExportingPng ? 'جاري التحميل...' : 'تحميل البوستر PNG'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadQrOnly}
                    disabled={isDownloadingQr}
                    className="py-3 px-3 bg-emerald-100/90 hover:bg-emerald-200 border border-emerald-300 text-emerald-950 font-black text-xs rounded-2xl transition-all shadow-2xs cursor-pointer inline-flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                  >
                    <QrCode className="h-4 w-4 text-emerald-800 shrink-0" />
                    <span>{isDownloadingQr ? 'جاري التحميل...' : 'تحميل الـ QR كصورة'}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-stone-900 to-stone-800 hover:from-stone-950 hover:to-black text-white font-black text-xs rounded-2xl transition-all shadow-sm cursor-pointer inline-flex items-center justify-center gap-2 active:scale-95"
                >
                  <Printer className="h-4 w-4 text-emerald-300 shrink-0" />
                  <span>طباعة بوستر A4</span>
                </button>
              </div>

            </div>
          </div>

        </div>
      )}

    </div>
  );
}
