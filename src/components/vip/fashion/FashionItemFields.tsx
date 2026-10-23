import React, { useState, useEffect } from 'react';
import {
  Palette,
  Ruler,
  Shirt,
  Sparkles,
  ShieldCheck,
  Plus,
  Trash2,
  Image as ImageIcon,
  Check,
  RotateCcw,
  Layers,
  Crown,
  SlidersHorizontal,
  CheckCircle2,
  Edit2
} from 'lucide-react';
import {
  FashionMatrixVariant,
  FashionSizeGuide,
  FashionFabricCare,
  FashionReturnPolicy,
  MenuItem,
  MenuItemVersion
} from '../../../types';

interface FashionItemFieldsProps {
  // 1. Matrix
  fashionMatrix: FashionMatrixVariant[];
  setFashionMatrix: React.Dispatch<React.SetStateAction<FashionMatrixVariant[]>>;

  // 2. Size Guide
  sizeGuide: FashionSizeGuide | undefined;
  setSizeGuide: React.Dispatch<React.SetStateAction<FashionSizeGuide | undefined>>;

  // 3. Fabric & Care
  fabricDetails: FashionFabricCare | undefined;
  setFabricDetails: React.Dispatch<React.SetStateAction<FashionFabricCare | undefined>>;

  // 4. Multi-Angle Gallery (VIP Official exclusive)
  galleryImages: string[];
  setGalleryImages: React.Dispatch<React.SetStateAction<string[]>>;
  isOfficialVip: boolean;

  // 5. Return Policy
  returnPolicy: FashionReturnPolicy | undefined;
  setReturnPolicy: React.Dispatch<React.SetStateAction<FashionReturnPolicy | undefined>>;

  // 6. Complete The Look
  outfitSuggestions: string[];
  setOutfitSuggestions: React.Dispatch<React.SetStateAction<string[]>>;
  availableItems: MenuItem[];
  currentItemId?: string;

  // 7. Integrated Versions & Add-ons
  versions?: MenuItemVersion[];
  setVersions?: React.Dispatch<React.SetStateAction<MenuItemVersion[]>>;
  versionType?: 'sizes' | 'addons';
  setVersionType?: React.Dispatch<React.SetStateAction<'sizes' | 'addons'>>;
  versionName?: string;
  setVersionName?: React.Dispatch<React.SetStateAction<string>>;
  versionPriceType?: 'fixed' | 'additional' | 'free';
  setVersionPriceType?: React.Dispatch<React.SetStateAction<'fixed' | 'additional' | 'free'>>;
  versionPrice?: string;
  setVersionPrice?: React.Dispatch<React.SetStateAction<string>>;
  editingVersionId?: string | null;
  setEditingVersionId?: React.Dispatch<React.SetStateAction<string | null>>;
  handleAddOrUpdateVersion?: (e: React.MouseEvent) => void;
  handleRemoveVersion?: (id: string) => void;
  handleStartEditVersion?: (version: MenuItemVersion) => void;
  handleCancelEditVersion?: () => void;
  basePrice?: string;
}

const PRESET_CLOTHING_COLORS = [
  { name: 'أسود', hex: '#000000' },
  { name: 'أبيض', hex: '#FFFFFF' },
  { name: 'كحلي', hex: '#1e3a8a' },
  { name: 'رمادي', hex: '#64748b' },
  { name: 'بيج', hex: '#d4b996' },
  { name: 'بني', hex: '#78350f' },
  { name: 'زيتي', hex: '#3f6212' },
  { name: 'خمري', hex: '#881337' },
  { name: 'أزرق سماوي', hex: '#38bdf8' },
  { name: 'وردي', hex: '#f472b6' }
];

const PRESET_CLOTHING_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'];

const PRESET_FABRICS = [
  'قطن 100% طبيعي',
  'قطن مخلوط مع ليكرا',
  'كتان طبيعي بارد',
  'جينز دنيم عالي الجودة',
  'صوف فاخر',
  'حرير طبيعي',
  'شيفون ناعم',
  'بوليستر مريح ومعالج',
  'جلد طبيعي',
  'قماش كريب مطاطي'
];

const PRESET_CARE_INSTRUCTIONS = [
  'غسيل بماء بارد (30 درجة مئوية)',
  'غسيل يدوي خفيف',
  'لا يُستخدم المبيض إطلاقاً',
  'كي بدرجة حرارة منخفضة',
  'يُفضل التنظيف الجاف (Dry Clean)',
  'تجفيف في الظل بعيداً عن الشمس المباشرة',
  'غسيل مع ألوان مماثلة'
];

export const FashionItemFields: React.FC<FashionItemFieldsProps> = ({
  fashionMatrix,
  setFashionMatrix,
  sizeGuide,
  setSizeGuide,
  fabricDetails,
  setFabricDetails,
  galleryImages,
  setGalleryImages,
  isOfficialVip,
  returnPolicy,
  setReturnPolicy,
  outfitSuggestions,
  setOutfitSuggestions,
  availableItems,
  currentItemId,
  versions,
  setVersions,
  versionType = 'sizes',
  setVersionType,
  versionName = '',
  setVersionName,
  versionPriceType = 'fixed',
  setVersionPriceType,
  versionPrice = '',
  setVersionPrice,
  editingVersionId,
  setEditingVersionId,
  handleAddOrUpdateVersion,
  handleRemoveVersion,
  handleStartEditVersion,
  handleCancelEditVersion,
  basePrice = '0'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'sizeguide' | 'fabric' | 'versions' | 'gallery' | 'policy' | 'outfit'>('matrix');

  // Matrix builder local state
  const [newColor, setNewColor] = useState('أسود');
  const [newColorHex, setNewColorHex] = useState('#000000');
  const [newSize, setNewSize] = useState('M');
  const [newStock, setNewStock] = useState('10');
  const [newPriceType, setNewPriceType] = useState<'same' | 'fixed' | 'additional' | 'free'>('same');
  const [newPriceOverride, setNewPriceOverride] = useState('');
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);

  // Lock versionType to addons for fashion clothing
  useEffect(() => {
    if (setVersionType && versionType !== 'addons') {
      setVersionType('addons');
    }
  }, [setVersionType, versionType]);

  // Gallery local input
  const [newImageUrl, setNewImageUrl] = useState('');

  // Handle adding or updating variant in matrix
  const handleAddMatrixVariant = () => {
    if (!newColor.trim() || !newSize.trim()) return;

    // Check if duplicate variant already exists (excluding current editing item)
    const exists = fashionMatrix.some(
      v => v.id !== editingVariantId && v.colorName === newColor.trim() && v.size === newSize.trim()
    );
    if (exists) {
      alert('هذا المزيج من اللون والمقاس مضاف مسبقاً في الجدول');
      return;
    }

    const priceValue = (newPriceType === 'same' || newPriceType === 'free')
      ? undefined
      : newPriceOverride.trim() || undefined;

    const newVariant: FashionMatrixVariant = {
      id: editingVariantId || ('var_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)),
      colorName: newColor.trim(),
      colorHex: newColorHex || undefined,
      size: newSize.trim(),
      stockCount: newStock !== '' ? Math.max(0, parseInt(newStock, 10)) : undefined,
      priceType: newPriceType === 'same' ? undefined : newPriceType,
      price: priceValue
    };

    if (editingVariantId) {
      setFashionMatrix(fashionMatrix.map(v => v.id === editingVariantId ? newVariant : v));
      setEditingVariantId(null);
    } else {
      setFashionMatrix([...fashionMatrix, newVariant]);
    }

    setNewPriceOverride('');
    setNewPriceType('same');
  };

  const handleStartEditVariant = (v: FashionMatrixVariant) => {
    setEditingVariantId(v.id);
    setNewColor(v.colorName);
    setNewColorHex(v.colorHex || '#000000');
    setNewSize(v.size);
    setNewStock(v.stockCount !== undefined ? v.stockCount.toString() : '');
    setNewPriceType(v.priceType || (v.price ? 'fixed' : 'same'));
    setNewPriceOverride(v.price || '');
  };

  const handleCancelEditVariant = () => {
    setEditingVariantId(null);
    setNewPriceOverride('');
    setNewPriceType('same');
  };

  const handleRemoveVariant = (id: string) => {
    setFashionMatrix(fashionMatrix.filter(v => v.id !== id));
    if (editingVariantId === id) {
      handleCancelEditVariant();
    }
  };

  // Preset size guide template loader
  const handleLoadSizeGuidePreset = (type: 'men_shirts' | 'women_dresses' | 'kids') => {
    if (type === 'men_shirts') {
      setSizeGuide({
        title: 'جدول مقاسات القمصان والبلوزات الرجالية',
        fitType: 'regular_fit',
        fitNote: 'قصة منتظمة مطابقة للمقاس القياسي المعتاد، نوصي باختيار مقاسك المعتاد',
        measureUnit: 'cm',
        rows: [
          { size: 'S', chest: '96', shoulder: '43', length: '70', sleeve: '63' },
          { size: 'M', chest: '102', shoulder: '45', length: '72', sleeve: '64' },
          { size: 'L', chest: '108', shoulder: '47', length: '74', sleeve: '65' },
          { size: 'XL', chest: '114', shoulder: '49', length: '76', sleeve: '66' },
          { size: 'XXL', chest: '120', shoulder: '51', length: '78', sleeve: '67' }
        ]
      });
    } else if (type === 'women_dresses') {
      setSizeGuide({
        title: 'جدول قياسات الأزياء والفساتين النسائية',
        fitType: 'regular_fit',
        fitNote: 'قصة انسيابية أنيقة، يرجى مطابقة محيط الصدر والخصر بدقة قبل الطلب',
        measureUnit: 'cm',
        rows: [
          { size: '36 / S', chest: '86', waist: '68', length: '120', shoulder: '37' },
          { size: '38 / M', chest: '90', waist: '72', length: '122', shoulder: '38' },
          { size: '40 / L', chest: '96', waist: '78', length: '124', shoulder: '40' },
          { size: '42 / XL', chest: '102', waist: '84', length: '126', shoulder: '42' }
        ]
      });
    } else {
      setSizeGuide({
        title: 'جدول قياسات ملابس الأطفال حسب الفئة العمرية',
        fitType: 'regular_fit',
        fitNote: 'القياسات تتطابق مع النمو الطبيعي للأطفال بالسنتيمتر',
        measureUnit: 'cm',
        rows: [
          { size: 'سنتين (2Y)', chest: '54', length: '40', waist: '50' },
          { size: '4 سنوات (4Y)', chest: '58', length: '46', waist: '53' },
          { size: '6 سنوات (6Y)', chest: '64', length: '52', waist: '56' },
          { size: '8 سنوات (8Y)', chest: '70', length: '58', waist: '60' },
          { size: '10 سنوات (10Y)', chest: '76', length: '64', waist: '63' }
        ]
      });
    }
  };

  // Add row to size guide
  const handleAddSizeGuideRow = () => {
    const currentRows = sizeGuide?.rows || [];
    const newRow = { size: 'M', chest: '', length: '', shoulder: '', sleeve: '', waist: '' };
    setSizeGuide({
      title: sizeGuide?.title || 'جدول المقاسات',
      fitType: sizeGuide?.fitType || 'regular_fit',
      fitNote: sizeGuide?.fitNote || 'مطابق للمقاس المعتاد',
      measureUnit: 'cm',
      rows: [...currentRows, newRow]
    });
  };

  // Gallery add
  const handleAddGalleryImage = () => {
    if (!newImageUrl.trim()) return;
    setGalleryImages([...galleryImages, newImageUrl.trim()]);
    setNewImageUrl('');
  };

  const handleRemoveGalleryImage = (idx: number) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== idx));
  };

  // Toggle Outfit Suggestion Item
  const handleToggleOutfitItem = (itemId: string) => {
    if (outfitSuggestions.includes(itemId)) {
      setOutfitSuggestions(outfitSuggestions.filter(id => id !== itemId));
    } else {
      setOutfitSuggestions([...outfitSuggestions, itemId]);
    }
  };

  // Toggle Care Instruction
  const handleToggleCareInstruction = (inst: string) => {
    const current = fabricDetails?.careInstructions || [];
    const updated = current.includes(inst)
      ? current.filter(i => i !== inst)
      : [...current, inst];
    setFabricDetails({
      ...fabricDetails,
      careInstructions: updated
    });
  };

  return (
    <div className="space-y-4 pt-2 border-t border-amber-200/60">
      {/* Fashion Banner Identifier */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-50/20 border border-amber-200 p-3 rounded-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0">
            <Shirt className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-amber-950">أدوات متجر الأزياء والملابس الاحترافية</h4>
            <p className="text-[10px] text-stone-500">مصفوفة المقاسات والألوان، جداول القياس، تفاصيل الأقمشة وسياسة الاستبدال</p>
          </div>
        </div>
        <span className="text-[10px] font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200">
          مخصص لقطاع الملابس
        </span>
      </div>

      {/* Internal Navigation Sub-tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-black">
        <button
          type="button"
          onClick={() => setActiveSubTab('matrix')}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeSubTab === 'matrix'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <Palette className="h-3.5 w-3.5" />
          <span>الألوان والمقاسات ({fashionMatrix.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('sizeguide')}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeSubTab === 'sizeguide'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <Ruler className="h-3.5 w-3.5" />
          <span>دليل المقاسات</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('fabric')}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeSubTab === 'fabric'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <Shirt className="h-3.5 w-3.5" />
          <span>القماش والغسيل</span>
        </button>

        {versions && setVersions && (
          <button
            type="button"
            onClick={() => setActiveSubTab('versions')}
            className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === 'versions'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>إضافات وخيارات ({versions.length})</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveSubTab('gallery')}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeSubTab === 'gallery'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <ImageIcon className="h-3.5 w-3.5" />
          <span>معرض التفاصيل ({galleryImages.length})</span>
          {!isOfficialVip && (
            <Crown className="h-3 w-3 text-amber-500 shrink-0" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('policy')}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeSubTab === 'policy'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>الاستبدال والاسترجاع</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('outfit')}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeSubTab === 'outfit'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>أكمل الإطلالة ({outfitSuggestions.length})</span>
        </button>
      </div>

      {/* TAB 1: COLOR & SIZE MATRIX */}
      {activeSubTab === 'matrix' && (
        <div className="bg-stone-50/80 p-4 rounded-2xl border border-stone-200 space-y-3">
          <div>
            <h5 className="text-xs font-black text-stone-900">مصفوفة الألوان والمقاسات المتوفرة (Color & Size Matrix)</h5>
            <p className="text-[10px] text-stone-500">حدد مخزون كل لون مع كل مقاس متوفر لتمكين الزبون من اختيار دقيق ومنع نفاد الكميات</p>
          </div>

          {/* Builder Row */}
          <div className="bg-white p-3.5 rounded-xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 pb-2">
              <span className="text-xs font-black text-stone-800">
                {editingVariantId ? 'تعديل بيانات المقاس واللون المختار:' : 'إضافة مقاس ولون جديد للمصفوفة:'}
              </span>
              {editingVariantId && (
                <button
                  type="button"
                  onClick={handleCancelEditVariant}
                  className="text-[10px] text-stone-500 hover:text-stone-800 font-bold underline cursor-pointer"
                >
                  إلغاء التعديل
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
              {/* Color picker & presets */}
              <div className="sm:col-span-4 space-y-1">
                <label className="text-[10px] font-black text-stone-700 block">اللون واسم الدرجة</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={newColorHex}
                    onChange={(e) => setNewColorHex(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-stone-300 cursor-pointer p-0.5 shrink-0"
                    title="اختر درجة اللون"
                  />
                  <input
                    type="text"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    placeholder="مثال: أسود، كحلي، بيج"
                    className="w-full px-2.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg font-bold"
                  />
                </div>
                {/* Fast presets */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {PRESET_CLOTHING_COLORS.slice(0, 5).map((col) => (
                    <button
                      key={col.name}
                      type="button"
                      onClick={() => {
                        setNewColor(col.name);
                        setNewColorHex(col.hex);
                      }}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center gap-1 cursor-pointer"
                    >
                      <span className="w-2 h-2 rounded-full border border-stone-300" style={{ backgroundColor: col.hex }} />
                      <span>{col.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Size picker */}
              <div className="sm:col-span-4 space-y-1">
                <label className="text-[10px] font-black text-stone-700 block">المقاس</label>
                <input
                  type="text"
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value)}
                  placeholder="مثال: S, M, L, 38, 40"
                  className="w-full px-2.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg font-bold"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {PRESET_CLOTHING_SIZES.slice(0, 6).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setNewSize(sz)}
                      className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stock Count */}
              <div className="sm:col-span-4 space-y-1">
                <label className="text-[10px] font-black text-stone-700 block">الكمية المتوفرة بالمخزن</label>
                <input
                  type="number"
                  min="0"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                  placeholder="10"
                  className="w-full px-2.5 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg font-bold"
                />
                <span className="text-[9px] text-stone-400 block">المخزون الدقيق لهذا المقاس واللون</span>
              </div>
            </div>

            {/* Pricing Method Selector for Variant */}
            <div className="pt-2 border-t border-stone-100 space-y-2">
              <label className="text-[10px] font-black text-stone-700 block">
                طريقة تسعير هذا المقاس واللون:
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setNewPriceType('same')}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                    newPriceType === 'same'
                      ? 'bg-stone-900 border-stone-900 text-white shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  السعر الأساسي ({basePrice} د.أ)
                </button>

                <button
                  type="button"
                  onClick={() => setNewPriceType('fixed')}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                    newPriceType === 'fixed'
                      ? 'bg-[#1a4d2e] border-[#1a4d2e] text-white shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  سعر ثابت خاص
                </button>

                <button
                  type="button"
                  onClick={() => setNewPriceType('additional')}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                    newPriceType === 'additional'
                      ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  + زيادة على السعر
                </button>

                <button
                  type="button"
                  onClick={() => setNewPriceType('free')}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                    newPriceType === 'free'
                      ? 'bg-sky-600 border-sky-600 text-white shadow-xs'
                      : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                  }`}
                >
                  مجاناً (بدون تكلفة)
                </button>
              </div>

              {(newPriceType === 'fixed' || newPriceType === 'additional') && (
                <div className="flex items-center gap-2 pt-1 animate-in fade-in duration-150">
                  <label className="text-[10px] font-bold text-stone-700 shrink-0">
                    {newPriceType === 'fixed' ? 'حدد السعر الثابت لهذا المقاس:' : 'قيمة الزيادة على السعر الأساسي:'}
                  </label>
                  <div className="relative max-w-xs flex-1">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={newPriceOverride}
                      onChange={(e) => setNewPriceOverride(e.target.value)}
                      placeholder={newPriceType === 'fixed' ? 'مثال: 25.00' : 'مثال: 3.00'}
                      className="w-full p-2 pl-10 bg-stone-50 border border-stone-200 rounded-lg text-xs font-black text-[#1a4d2e] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-stone-400 font-bold">د.أ</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Button Row */}
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-stone-100">
              {editingVariantId && (
                <button
                  type="button"
                  onClick={handleCancelEditVariant}
                  className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  إلغاء التعديل
                </button>
              )}
              <button
                type="button"
                onClick={handleAddMatrixVariant}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                {editingVariantId ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>تحديث بيانات المقاس واللون</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>إضافة المقاس واللون للجدول</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* List of active variants */}
          {fashionMatrix.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
              <table className="w-full text-right text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-[10px] font-black text-stone-600">
                  <tr>
                    <th className="p-2.5">اللون</th>
                    <th className="p-2.5">المقاس</th>
                    <th className="p-2.5">الكمية بالمخزن</th>
                    <th className="p-2.5">طريقة التسعير والسعر</th>
                    <th className="p-2.5 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {fashionMatrix.map((v) => (
                    <tr key={v.id} className={`hover:bg-stone-50/50 ${editingVariantId === v.id ? 'bg-amber-50/50' : ''}`}>
                      <td className="p-2.5 font-bold text-stone-900 flex items-center gap-1.5">
                        {v.colorHex && (
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-stone-300 shrink-0"
                            style={{ backgroundColor: v.colorHex }}
                          />
                        )}
                        <span>{v.colorName}</span>
                      </td>
                      <td className="p-2.5 font-mono font-bold text-amber-900">{v.size}</td>
                      <td className="p-2.5 font-mono">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          (v.stockCount ?? 0) === 0
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : (v.stockCount ?? 0) <= 5
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {v.stockCount !== undefined ? `${v.stockCount} قطعة` : 'غير محدد'}
                        </span>
                      </td>
                      <td className="p-2.5 font-bold">
                        {v.priceType === 'fixed' && v.price ? (
                          <span className="text-[#1a4d2e] font-mono">{v.price} د.أ (سعر ثابت)</span>
                        ) : v.priceType === 'additional' && v.price ? (
                          <span className="text-amber-700 font-mono">+{v.price} د.أ (زيادة)</span>
                        ) : v.priceType === 'free' ? (
                          <span className="text-sky-700 font-bold">مجاناً</span>
                        ) : v.price ? (
                          <span className="text-stone-800 font-mono">{v.price} د.أ</span>
                        ) : (
                          <span className="text-stone-500 font-bold">السعر الأساسي المعتمد</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEditVariant(v)}
                            className="p-1 text-stone-500 hover:text-amber-700 hover:bg-stone-100 rounded-md transition-colors cursor-pointer"
                            title="تعديل المقاس واللون"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(v.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            title="حذف"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[11px] text-stone-400 italic text-center py-2">
              لم تقم بإضافة ألوان ومقاسات تفصيلية بعد. يمكنك إضافة المقاسات والألوان المتوفرة أعلاه.
            </p>
          )}
        </div>
      )}

      {/* TAB 2: SIZE GUIDE */}
      {activeSubTab === 'sizeguide' && (
        <div className="bg-stone-50/80 p-4 rounded-2xl border border-stone-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h5 className="text-xs font-black text-stone-900">دليل المقاسات وجدول القياسات الدقيق (Size Guide & Fit Chart)</h5>
              <p className="text-[10px] text-stone-500">يساعد المشتري على معرفة مقاسه الدقيق بالسنتيمتر لتفادي مشاكل المقاسات غير المناسبة</p>
            </div>
            {/* Quick Templates */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold text-stone-500">قوالب جاهزة:</span>
              <button
                type="button"
                onClick={() => handleLoadSizeGuidePreset('men_shirts')}
                className="text-[10px] font-bold px-2 py-1 bg-white hover:bg-stone-100 text-stone-700 rounded-lg border border-stone-200 cursor-pointer"
              >
                قمصان وبلايز رجالي
              </button>
              <button
                type="button"
                onClick={() => handleLoadSizeGuidePreset('women_dresses')}
                className="text-[10px] font-bold px-2 py-1 bg-white hover:bg-stone-100 text-stone-700 rounded-lg border border-stone-200 cursor-pointer"
              >
                فساتين وأزياء نسائية
              </button>
              <button
                type="button"
                onClick={() => handleLoadSizeGuidePreset('kids')}
                className="text-[10px] font-bold px-2 py-1 bg-white hover:bg-stone-100 text-stone-700 rounded-lg border border-stone-200 cursor-pointer"
              >
                أطفال حسب العمر
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-stone-200">
            <div>
              <label className="text-[10px] font-black text-stone-700 block mb-1">عنوان جدول القياسات</label>
              <input
                type="text"
                value={sizeGuide?.title || ''}
                onChange={(e) => setSizeGuide({ ...sizeGuide, rows: sizeGuide?.rows || [], title: e.target.value })}
                placeholder="مثال: جدول مقاسات القمصان الرجالية"
                className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-stone-700 block mb-1">نوع القصة والمقاس (Fit Type)</label>
              <select
                value={sizeGuide?.fitType || 'regular_fit'}
                onChange={(e) => setSizeGuide({ ...sizeGuide, rows: sizeGuide?.rows || [], fitType: e.target.value as any })}
                className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg font-bold"
              >
                <option value="true_to_size">مطابق للمقاس المعتاد (True to Size)</option>
                <option value="regular_fit">قصة عادية مريحة (Regular Fit)</option>
                <option value="slim_fit">قصة ضيقة ومجسمة (Slim Fit)</option>
                <option value="oversized">قصة فضفاضة واسعة (Oversized)</option>
                <option value="loose">قصة مريحة واسعة (Loose Fit)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-black text-stone-700 block mb-1">نصيحة وتوجيه المقاس للمشتري</label>
              <input
                type="text"
                value={sizeGuide?.fitNote || ''}
                onChange={(e) => setSizeGuide({ ...sizeGuide, rows: sizeGuide?.rows || [], fitNote: e.target.value })}
                placeholder="مثال: قصة قياسية مطابقة لمقاسك المعتاد، نوصي باختيار مقاسك القياسي"
                className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg font-bold"
              />
            </div>
          </div>

          {/* Table of measurements */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-stone-800">أبعاد المقاسات (بالسنتيمتر cm):</span>
              <button
                type="button"
                onClick={handleAddSizeGuideRow}
                className="text-[10px] font-bold px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3 w-3" />
                <span>إضافة سطر قياس</span>
              </button>
            </div>

            {sizeGuide && sizeGuide.rows.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
                <table className="w-full text-right text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200 text-[10px] font-black text-stone-600">
                    <tr>
                      <th className="p-2">المقاس</th>
                      <th className="p-2">الصدر (cm)</th>
                      <th className="p-2">الخصر (cm)</th>
                      <th className="p-2">الكتف (cm)</th>
                      <th className="p-2">الطول (cm)</th>
                      <th className="p-2">الكم (cm)</th>
                      <th className="p-2 text-center">حذف</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {sizeGuide.rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={row.size}
                            onChange={(e) => {
                              const updated = [...sizeGuide.rows];
                              updated[rIdx].size = e.target.value;
                              setSizeGuide({ ...sizeGuide, rows: updated });
                            }}
                            className="w-20 px-2 py-1 text-xs bg-stone-50 border border-stone-200 rounded font-bold"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={row.chest || ''}
                            onChange={(e) => {
                              const updated = [...sizeGuide.rows];
                              updated[rIdx].chest = e.target.value;
                              setSizeGuide({ ...sizeGuide, rows: updated });
                            }}
                            placeholder="96"
                            className="w-16 px-2 py-1 text-xs bg-stone-50 border border-stone-200 rounded font-mono"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={row.waist || ''}
                            onChange={(e) => {
                              const updated = [...sizeGuide.rows];
                              updated[rIdx].waist = e.target.value;
                              setSizeGuide({ ...sizeGuide, rows: updated });
                            }}
                            placeholder="78"
                            className="w-16 px-2 py-1 text-xs bg-stone-50 border border-stone-200 rounded font-mono"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={row.shoulder || ''}
                            onChange={(e) => {
                              const updated = [...sizeGuide.rows];
                              updated[rIdx].shoulder = e.target.value;
                              setSizeGuide({ ...sizeGuide, rows: updated });
                            }}
                            placeholder="44"
                            className="w-16 px-2 py-1 text-xs bg-stone-50 border border-stone-200 rounded font-mono"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={row.length || ''}
                            onChange={(e) => {
                              const updated = [...sizeGuide.rows];
                              updated[rIdx].length = e.target.value;
                              setSizeGuide({ ...sizeGuide, rows: updated });
                            }}
                            placeholder="72"
                            className="w-16 px-2 py-1 text-xs bg-stone-50 border border-stone-200 rounded font-mono"
                          />
                        </td>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={row.sleeve || ''}
                            onChange={(e) => {
                              const updated = [...sizeGuide.rows];
                              updated[rIdx].sleeve = e.target.value;
                              setSizeGuide({ ...sizeGuide, rows: updated });
                            }}
                            placeholder="64"
                            className="w-16 px-2 py-1 text-xs bg-stone-50 border border-stone-200 rounded font-mono"
                          />
                        </td>
                        <td className="p-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = sizeGuide.rows.filter((_, i) => i !== rIdx);
                              setSizeGuide({ ...sizeGuide, rows: updated });
                            }}
                            className="p-1 text-rose-500 hover:text-rose-700 cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-[11px] text-stone-400 italic text-center py-2 bg-white rounded-xl border border-stone-200">
                اختر أحد القوالب الجاهزة أعلاه أو اضغط "إضافة سطر قياس" لبدء جدول المقاسات
              </p>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: FABRIC & CARE */}
      {activeSubTab === 'fabric' && (
        <div className="bg-stone-50/80 p-4 rounded-2xl border border-stone-200 space-y-3">
          <div>
            <h5 className="text-xs font-black text-stone-900">تفاصيل القماش والخامات والعناية (Fabric & Care Instructions)</h5>
            <p className="text-[10px] text-stone-500">حدد نوع الخامات وطريقة الغسيل الصحيحة لتعزيز ثقة المشتري بجودة القطعة</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-stone-200">
            {/* Fabric type */}
            <div>
              <label className="text-[10px] font-black text-stone-700 block mb-1">نوع القماش والخامة الأساسية</label>
              <input
                type="text"
                value={fabricDetails?.fabricType || ''}
                onChange={(e) => setFabricDetails({ ...fabricDetails, fabricType: e.target.value })}
                placeholder="مثال: قطن 100% طبيعي، كتان، جينز"
                className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg font-bold"
              />
              <div className="flex flex-wrap gap-1 pt-1.5">
                {PRESET_FABRICS.slice(0, 5).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFabricDetails({ ...fabricDetails, fabricType: f })}
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 cursor-pointer"
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Stretch level */}
            <div>
              <label className="text-[10px] font-black text-stone-700 block mb-1">نسبة التمدد والمرونة (Stretch)</label>
              <select
                value={fabricDetails?.stretchLevel || 'non_stretch'}
                onChange={(e) => setFabricDetails({ ...fabricDetails, stretchLevel: e.target.value as any })}
                className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg font-bold"
              >
                <option value="non_stretch">غير متمدد (ثابت / قماش رسمي)</option>
                <option value="slight_stretch">تمدد طفيف (مريح للارتداء اليومي)</option>
                <option value="medium_stretch">تمدد متوسط (ليكرا / ستريتش)</option>
                <option value="high_stretch">عالي المرونة والتمدد (سبورت / رياضى)</option>
              </select>
            </div>

            {/* Thickness */}
            <div>
              <label className="text-[10px] font-black text-stone-700 block mb-1">سماكة القماش</label>
              <select
                value={fabricDetails?.thickness || 'medium'}
                onChange={(e) => setFabricDetails({ ...fabricDetails, thickness: e.target.value as any })}
                className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg font-bold"
              >
                <option value="light">خفيف وبارد (صيفي)</option>
                <option value="medium">متوسط السماكة (مناسب لجميع الفصول)</option>
                <option value="heavy">سميك وثقيل (شتوي / دافئ)</option>
              </select>
            </div>

            {/* Transparency */}
            <div>
              <label className="text-[10px] font-black text-stone-700 block mb-1">مستوى الشفافية</label>
              <select
                value={fabricDetails?.transparency || 'opaque'}
                onChange={(e) => setFabricDetails({ ...fabricDetails, transparency: e.target.value as any })}
                className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg font-bold"
              >
                <option value="opaque">غير شفاف تماماً (معتم ومبطن)</option>
                <option value="semi_sheer">شفافية خفيفة</option>
                <option value="sheer">شيفون / شفاف يتطلب بطانة</option>
              </select>
            </div>
          </div>

          {/* Care instructions badges */}
          <div className="space-y-1.5 bg-white p-3 rounded-xl border border-stone-200">
            <span className="text-[10px] font-black text-stone-800 block">تعليمات الغسيل والكّي السريعة (اختر ما يناسب القطعة):</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_CARE_INSTRUCTIONS.map((inst) => {
                const isSelected = fabricDetails?.careInstructions?.includes(inst);
                return (
                  <button
                    key={inst}
                    type="button"
                    onClick={() => handleToggleCareInstruction(inst)}
                    className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200 border border-transparent'
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3 text-amber-700" />}
                    <span>{inst}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3.5: INTEGRATED ADD-ONS & OPTIONS */}
      {activeSubTab === 'versions' && versions && setVersions && (
        <div className="bg-stone-50/80 p-4 rounded-2xl border border-stone-200 space-y-3.5 animate-in fade-in duration-200">
          <div>
            <h5 className="text-xs font-black text-stone-900">الإضافات والخيارات التكميلية (Add-ons & Options)</h5>
            <p className="text-[10px] text-stone-500">إضافة خيارات تكميلية للقطعة مثل تغليف الهدايا، كرت الإهداء، التطريز، أو تقصير وتعديل الطول دون تكرار المقاسات</p>
          </div>

          <div className="bg-gradient-to-br from-amber-50/50 via-white to-emerald-50/30 border border-amber-200/80 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-amber-200/40 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-amber-700" />
                <h4 className="text-xs font-black text-stone-900">إضافات ومكملات القطعة</h4>
              </div>
              {versions.length > 0 && (
                <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded-full">
                  {versions.length} إضافات مسجلة
                </span>
              )}
            </div>

            {/* Quick Preset Buttons for Apparel Add-ons */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-stone-500">خيارات وإضافات مقترحة سريعة:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {['تغليف هدايا فاخر', 'كرت إهداء مخصص', 'تطريز اسم أو عبارة', 'تقصير وتعديل طول', 'كيس قماش فاخر', 'علبة هدايا بشريطة'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setVersionName && setVersionName(preset)}
                    className="text-[10px] bg-white border border-stone-200 text-stone-700 hover:border-amber-500 hover:bg-amber-50 px-2 py-0.5 rounded-lg font-bold transition-all cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Version Inputs */}
            <div className="space-y-2.5 bg-white p-3 rounded-xl border border-stone-200 shadow-3xs">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-6">
                  <label className="block text-[10px] font-bold text-stone-600 mb-1">اسم الإضافة أو الخيار</label>
                  <input
                    type="text"
                    value={versionName}
                    onChange={(e) => setVersionName && setVersionName(e.target.value)}
                    placeholder="مثال: تغليف هدايا فاخر"
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-amber-600"
                  />
                </div>

                <div className="sm:col-span-6">
                  <label className="block text-[10px] font-bold text-stone-600 mb-1">طريقة التسعير</label>
                  <div className="grid grid-cols-3 gap-1 bg-stone-100 p-0.5 rounded-lg border border-stone-200">
                    <button
                      type="button"
                      onClick={() => setVersionPriceType && setVersionPriceType('fixed')}
                      className={`py-1 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                        versionPriceType === 'fixed'
                          ? 'bg-[#1a4d2e] text-white shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      سعر ثابت
                    </button>
                    <button
                      type="button"
                      onClick={() => setVersionPriceType && setVersionPriceType('additional')}
                      className={`py-1 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                        versionPriceType === 'additional'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      + زيادة
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVersionPriceType && setVersionPriceType('free');
                        setVersionPrice && setVersionPrice('0');
                      }}
                      className={`py-1 text-[10px] font-black rounded-md transition-all cursor-pointer ${
                        versionPriceType === 'free'
                          ? 'bg-sky-600 text-white shadow-xs'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      مجاناً
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                {versionPriceType !== 'free' ? (
                  <div className="flex-1 flex items-center gap-1.5">
                    <label className="text-[10px] font-bold text-stone-600 shrink-0">
                      {versionPriceType === 'fixed' ? 'السعر المحدد:' : 'قيمة الزيادة:'}
                    </label>
                    <div className="relative flex-1">
                      <input
                        type="number"
                        step="0.05"
                        min="0"
                        value={versionPrice}
                        onChange={(e) => setVersionPrice && setVersionPrice(e.target.value)}
                        placeholder={versionPriceType === 'fixed' ? 'مثال: 15.00' : 'مثال: 2.00'}
                        className="w-full p-1.5 pl-8 bg-stone-50 border border-stone-200 rounded-lg text-xs font-black text-[#1a4d2e] focus:outline-none focus:ring-1 focus:ring-amber-600"
                      />
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-stone-400 font-bold">د.أ</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 text-[11px] text-sky-700 bg-sky-50 px-2.5 py-1.5 rounded-lg border border-sky-200 font-bold">
                    هذا الخيار مجاني بالكامل للزبون
                  </div>
                )}

                <div className="flex items-center gap-1">
                  {editingVersionId && handleCancelEditVersion && (
                    <button
                      type="button"
                      onClick={handleCancelEditVersion}
                      className="px-2.5 py-1.5 bg-stone-200 text-stone-700 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      إلغاء
                    </button>
                  )}
                  {handleAddOrUpdateVersion && (
                    <button
                      type="button"
                      onClick={handleAddOrUpdateVersion}
                      disabled={!versionName.trim() || (versionPriceType !== 'free' && !versionPrice.trim())}
                      className="px-3.5 py-1.5 bg-[#1a4d2e] hover:bg-[#133b22] disabled:opacity-40 text-white rounded-lg text-xs font-black transition-colors cursor-pointer flex items-center gap-1"
                    >
                      {editingVersionId ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                      <span>{editingVersionId ? 'تعديل' : 'إضافة'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* List of Added Versions */}
            {versions.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-bold text-stone-500">
                  الإضافات والخيارات المسجلة لهذا الصنف:
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {versions.map((v) => {
                    const bPrice = parseFloat(basePrice) || 0;
                    const verP = parseFloat(String(v.price)) || 0;
                    const finalEstimated = v.priceType === 'fixed' ? verP : v.priceType === 'additional' ? bPrice + verP : bPrice;

                    return (
                      <div
                        key={v.id}
                        className={`p-2 bg-white rounded-xl border flex items-center justify-between gap-2 text-xs transition-all ${
                          editingVersionId === v.id ? 'border-amber-500 ring-1 ring-amber-400' : 'border-stone-200'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-black text-stone-900 text-xs truncate">{v.name}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {v.priceType === 'fixed' && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.2 rounded">
                                سعر ثابت: {v.price} د.أ
                              </span>
                            )}
                            {v.priceType === 'additional' && (
                              <span className="text-[10px] bg-amber-100 text-amber-900 font-black px-1.5 py-0.2 rounded">
                                +{v.price} د.أ ({finalEstimated > 0 ? `الإجمالي: ${finalEstimated.toFixed(2)} د.أ` : ''})
                              </span>
                            )}
                            {v.priceType === 'free' && (
                              <span className="text-[10px] bg-sky-100 text-sky-800 font-black px-1.5 py-0.2 rounded">
                                مجاناً (0 د.أ)
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {handleStartEditVersion && (
                            <button
                              type="button"
                              onClick={() => handleStartEditVersion(v)}
                              className="p-1 text-stone-500 hover:text-amber-700 hover:bg-amber-50 rounded cursor-pointer"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          )}
                          {handleRemoveVersion && (
                            <button
                              type="button"
                              onClick={() => handleRemoveVersion(v.id)}
                              className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: MULTI-ANGLE GALLERY (VIP OFFICIAL EXCLUSIVE) */}
      {activeSubTab === 'gallery' && (
        <div className="bg-stone-50/80 p-4 rounded-2xl border border-stone-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h5 className="text-xs font-black text-stone-900">معرض الصور الزاوي وتفاصيل الخامة (Zoom & Multi-Angle)</h5>
                <span className="text-[9px] font-black bg-gradient-to-r from-amber-500 to-amber-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  <span>حصري لاشتراك VIP الرسمي</span>
                </span>
              </div>
              <p className="text-[10px] text-stone-500">
                إضافة صور من زوايا متعددة (أمامي، خلفي، صورة مقربة لملمس القماش والتطريز، صورة الموديل)
              </p>
            </div>
          </div>

          {!isOfficialVip ? (
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <Crown className="h-5 w-5" />
              </div>
              <h5 className="text-xs font-black text-amber-950">ميزة معرض الزوايا والتكبير الفائق مخصصة لاشتراك VIP الرسمي</h5>
              <p className="text-[10px] text-stone-600 max-w-md mx-auto leading-relaxed">
                هذه الميزة التنافسية تتيح لمحلات الملابس الرسمية المشتركة في باقة VIP عرض صور تفاصيل القماش والخياطة وزوايا العرض المختلفة لزيادة المبيعات بنسبة ملحوظة.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Image Input */}
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="ضع رابط صورة الزاوية الإضافية (مثال: صورة خلفية، أو مقربة للخامة)"
                  className="flex-1 px-3 py-2 text-xs bg-white border border-stone-200 rounded-xl font-medium"
                />
                <button
                  type="button"
                  onClick={handleAddGalleryImage}
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer shrink-0 shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>إضافة صورة</span>
                </button>
              </div>

              {/* Gallery Grid */}
              {galleryImages.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {galleryImages.map((imgUrl, iIdx) => (
                    <div key={iIdx} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200 bg-stone-100 group">
                      <img
                        referrerPolicy="no-referrer"
                        src={imgUrl}
                        alt={`زاوية ${iIdx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveGalleryImage(iIdx)}
                        className="absolute top-1.5 left-1.5 w-6 h-6 bg-black/70 hover:bg-rose-600 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
                        title="حذف الصورة"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                      <span className="absolute bottom-1 right-1.5 text-[9px] font-black bg-black/60 text-white px-1.5 py-0.5 rounded">
                        زاوية {iIdx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-stone-400 italic text-center py-3 bg-white rounded-xl border border-stone-200">
                  لم تقم بإضافة صور زوايا إضافية بعد. أضف روابط صور العرض الأمامية والخلفية وتفاصيل القماش.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: RETURN POLICY */}
      {activeSubTab === 'policy' && (
        <div className="bg-stone-50/80 p-4 rounded-2xl border border-stone-200 space-y-3">
          <div>
            <h5 className="text-xs font-black text-stone-900">سياسة الاستبدال والاسترجاع لقطاع الملابس (Return & Exchange Policy)</h5>
            <p className="text-[10px] text-stone-500">توضيح شروط مدة الاستبدال وفحص الملابس لتفادي النزاعات بعد الشراء</p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-stone-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-stone-700 block mb-1">نوع السياسة المعتمدة لهذه القطعة</label>
                <select
                  value={returnPolicy?.allowedType || 'exchange_and_return'}
                  onChange={(e) => setReturnPolicy({ ...returnPolicy, allowedType: e.target.value as any })}
                  className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg font-bold"
                >
                  <option value="exchange_and_return">إمكانية الاستبدال والاسترجاع</option>
                  <option value="exchange_only">استبدال المقاس أو الموديل فقط (بدون استرجاع نقدي)</option>
                  <option value="no_return_or_exchange">لا يمكن الاستبدال أو الاسترجاع (أزياء خاصة / تخفيضات نهائية)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-stone-700 block mb-1">مهلة الاستبدال / الاسترجاع (بالأيام)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={returnPolicy?.periodDays ?? 3}
                  onChange={(e) => setReturnPolicy({ ...returnPolicy, periodDays: parseInt(e.target.value, 10) || 3 })}
                  placeholder="3"
                  className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg font-bold font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-stone-700 block mb-1">شروط الاستبدال الإضافية الواضحة للزبون</label>
              <textarea
                rows={2}
                value={returnPolicy?.customNotice || ''}
                onChange={(e) => setReturnPolicy({ ...returnPolicy, customNotice: e.target.value })}
                placeholder="مثال: يشترط وجود التاغ والبطاقة الأصلية، وأن تكون القطعة بحالتها الأصلية غير مغسولة أو ملبوسة، مع إبراز فاتورة الشراء."
                className="w-full px-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg font-medium leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: COMPLETE THE LOOK */}
      {activeSubTab === 'outfit' && (
        <div className="bg-stone-50/80 p-4 rounded-2xl border border-stone-200 space-y-3">
          <div>
            <h5 className="text-xs font-black text-stone-900">تنسيق وتكامل «أكمل الإطلالة» (Complete the Look / Outfit Suggestions)</h5>
            <p className="text-[10px] text-stone-500">اختر قطعاً من كتالوج متجرك تتناسق مع هذه القطعة لتظهر للزبون كمجموعة مقترحة كاملة</p>
          </div>

          <div className="bg-white p-3 rounded-xl border border-stone-200 space-y-2">
            <span className="text-[10px] font-black text-stone-700 block">حدد القطع المتناسقة من متجرك:</span>

            {availableItems && availableItems.length > 1 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto p-1">
                {availableItems
                  .filter(it => it.id !== currentItemId)
                  .map((it) => {
                    const isSelected = outfitSuggestions.includes(it.id);
                    return (
                      <div
                        key={it.id}
                        onClick={() => handleToggleOutfitItem(it.id)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-amber-50/80 border-amber-300 shadow-2xs'
                            : 'bg-stone-50/50 border-stone-200 hover:border-stone-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {it.imageUrl ? (
                            <img
                              referrerPolicy="no-referrer"
                              src={it.imageUrl}
                              alt={it.name}
                              className="w-8 h-8 rounded-lg object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-stone-200 flex items-center justify-center shrink-0">
                              <Shirt className="h-4 w-4 text-stone-500" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-stone-900 truncate block">{it.name}</span>
                            <span className="text-[10px] text-stone-500 font-mono">{it.price} د.أ</span>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors shrink-0 ${
                          isSelected
                            ? 'bg-amber-600 border-amber-600 text-white'
                            : 'border-stone-300 bg-white'
                        }`}>
                          {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-[11px] text-stone-400 italic text-center py-3">
                لا توجد أصناف أخرى كافية في الكتالوج لربطها بالإطلالة حالياً
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
