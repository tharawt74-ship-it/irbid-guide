import React, { useState, useEffect } from 'react';
import {
  Palette,
  Ruler,
  Shirt,
  ShieldCheck,
  Check,
  Plus,
  ShoppingBag,
  Sparkles,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import {
  MenuItem,
  FashionMatrixVariant,
  FashionSizeGuide,
  FashionFabricCare,
  FashionReturnPolicy
} from '../../../types';

export function calculateVariantDisplayPrice(basePrice: string | number, variant?: FashionMatrixVariant): number {
  const base = typeof basePrice === 'number' ? basePrice : parseFloat(String(basePrice)) || 0;
  if (!variant) return base;
  if (variant.priceType === 'free') return base;
  if (variant.priceType === 'additional' && variant.price) {
    const add = parseFloat(String(variant.price)) || 0;
    return base + add;
  }
  if ((variant.priceType === 'fixed' || !variant.priceType) && variant.price) {
    const fixed = parseFloat(String(variant.price));
    return isNaN(fixed) ? base : fixed;
  }
  return base;
}

interface FashionProductDetailViewProps {
  item: MenuItem;
  catalogItems?: MenuItem[];
  onAddToCart?: (item: MenuItem, selectedVariant?: FashionMatrixVariant) => void;
  onSelectColorSize?: (variant: FashionMatrixVariant) => void;
  isOfficialVip?: boolean;
}

export const FashionProductDetailView: React.FC<FashionProductDetailViewProps> = ({
  item,
  catalogItems = [],
  onAddToCart,
  onSelectColorSize,
  isOfficialVip = false
}) => {
  // 1. Matrix State
  const matrix = item.fashionMatrix || [];
  const uniqueColors = Array.from(new Set(matrix.map(v => v.colorName)));
  const [selectedColor, setSelectedColor] = useState<string>(uniqueColors[0] || '');

  // Filter available sizes for chosen color
  const sizesForColor = matrix.filter(v => v.colorName === selectedColor);
  const [selectedSize, setSelectedSize] = useState<string>(sizesForColor[0]?.size || '');

  // Current active variant
  const activeVariant = matrix.find(
    v => v.colorName === selectedColor && v.size === selectedSize
  );

  // Sync active variant to parent whenever color or size changes
  useEffect(() => {
    if (activeVariant && onSelectColorSize) {
      onSelectColorSize(activeVariant);
    }
  }, [activeVariant, onSelectColorSize]);

  // 2. Modals state
  const [showSizeGuideModal, setShowSizeGuideModal] = useState(false);
  const [showZoomModal, setShowZoomModal] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);

  // Gallery items combining main image and gallery images (if official VIP)
  const allImages: string[] = [];
  if (item.imageUrl) allImages.push(item.imageUrl);
  if (isOfficialVip && item.galleryImages && item.galleryImages.length > 0) {
    item.galleryImages.forEach(img => {
      if (!allImages.includes(img)) allImages.push(img);
    });
  }

  // Handle color change
  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    const availableSizes = matrix.filter(v => v.colorName === color);
    if (availableSizes.length > 0) {
      // Keep existing size if available, otherwise switch to first
      const stillHasSize = availableSizes.some(v => v.size === selectedSize);
      if (!stillHasSize) {
        setSelectedSize(availableSizes[0].size);
      }
    }
  };

  // Outfit items lookup
  const suggestedOutfitItems = (item.outfitSuggestions || [])
    .map(id => catalogItems.find(c => c.id === id))
    .filter((c): c is MenuItem => !!c);

  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* 1. COLOR & SIZE MATRIX SECTOR */}
      {matrix.length > 0 && (
        <div className="p-3.5 bg-stone-50/90 rounded-2xl border border-stone-200/80 space-y-3">
          {/* Colors Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                <Palette className="h-3.5 w-3.5 text-amber-600" />
                <span>اللون المختار:</span>
                <span className="text-amber-800 font-bold">{selectedColor}</span>
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-0.5">
              {uniqueColors.map(color => {
                const colorVariants = matrix.filter(v => v.colorName === color);
                const colorHex = colorVariants.find(v => v.colorHex)?.colorHex;
                const isSelected = selectedColor === color;
                const isOutOfStock = colorVariants.every(v => (v.stockCount ?? 1) === 0);

                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleColorChange(color)}
                    disabled={isOutOfStock}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-600 bg-amber-50 text-amber-950 shadow-2xs ring-1 ring-amber-600'
                        : isOutOfStock
                        ? 'border-stone-200 bg-stone-100/70 text-stone-400 opacity-60 cursor-not-allowed'
                        : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    {colorHex && (
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-stone-300 shrink-0"
                        style={{ backgroundColor: colorHex }}
                      />
                    )}
                    <span>{color}</span>
                    {isOutOfStock && (
                      <span className="text-[9px] text-rose-500 font-normal">(نفد)</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sizes Selection for chosen color */}
          <div className="space-y-1.5 pt-1 border-t border-stone-200/60">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                <Ruler className="h-3.5 w-3.5 text-amber-600" />
                <span>المقاس المتوفر:</span>
                <span className="text-amber-800 font-bold">{selectedSize}</span>
              </span>

              {/* Size guide trigger button */}
              {item.sizeGuide && item.sizeGuide.rows.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowSizeGuideModal(true)}
                  className="text-[11px] font-black text-amber-700 hover:text-amber-800 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Ruler className="h-3 w-3" />
                  <span>دليل المقاسات الذكي</span>
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-0.5">
              {sizesForColor.map(variant => {
                const isSelected = selectedSize === variant.size;
                const isOutOfStock = (variant.stockCount ?? 1) === 0;

                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => {
                      setSelectedSize(variant.size);
                      if (onSelectColorSize) onSelectColorSize(variant);
                    }}
                    disabled={isOutOfStock}
                    className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold font-mono transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-600 bg-amber-600 text-white shadow-xs'
                        : isOutOfStock
                        ? 'border-stone-200 bg-stone-100 text-stone-400 line-through cursor-not-allowed opacity-60'
                        : 'border-stone-200 bg-white text-stone-800 hover:border-amber-400'
                    }`}
                  >
                    <span>{variant.size}</span>
                    {variant.priceType === 'additional' && variant.price ? (
                      <span className="text-[9px] block font-sans opacity-90">+{variant.price} د.أ</span>
                    ) : variant.priceType === 'free' ? (
                      <span className="text-[9px] block font-sans opacity-90">مجاناً</span>
                    ) : variant.price ? (
                      <span className="text-[9px] block font-sans opacity-90">{variant.price} د.أ</span>
                    ) : null}
                    {isOutOfStock && (
                      <span className="text-[8px] block font-sans text-rose-500 font-normal">(نفد)</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Variant Stock Notice & Live Dynamic Price */}
            {activeVariant && (
              <div className="pt-2 flex items-center justify-between text-xs flex-wrap gap-2 border-t border-stone-200/60 mt-2">
                <div className="flex items-center gap-1.5 font-bold">
                  {(activeVariant.stockCount ?? 1) === 0 ? (
                    <span className="text-rose-700 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200">
                      هذا المقاس نفد حالياً بهذا اللون (غير متوفر)
                    </span>
                  ) : activeVariant.stockCount !== undefined && activeVariant.stockCount <= 5 ? (
                    <span className="text-amber-800 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                      كمية محدودة: متبقي {activeVariant.stockCount} قطع فقط من هذا المقاس واللون
                    </span>
                  ) : (
                    <span className="text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                      متوفر في المخزن ({activeVariant.stockCount !== undefined ? `${activeVariant.stockCount} قطعة` : 'جاهز للطلب'})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-xl border border-stone-200 shadow-3xs">
                  <span className="text-[10px] text-stone-500 font-bold">السعر لهذا الاختيار:</span>
                  <span className="font-black text-[#1a4d2e] font-mono text-sm">
                    {calculateVariantDisplayPrice(item.price, activeVariant).toFixed(2)} د.أ
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. MULTI-ANGLE GALLERY THUMBNAILS & ZOOM (VIP Official exclusive) */}
      {allImages.length > 1 && isOfficialVip && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-black text-stone-800">
            <span>زوايا عرض القطعة والتفاصيل:</span>
            <button
              type="button"
              onClick={() => setShowZoomModal(true)}
              className="text-[10px] font-bold text-amber-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Maximize2 className="h-3 w-3" />
              <span>تكبير فائق وتفاصيل الخامة</span>
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {allImages.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setActiveGalleryIndex(idx);
                  setShowZoomModal(true);
                }}
                className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                  activeGalleryIndex === idx
                    ? 'border-amber-600 shadow-xs ring-1 ring-amber-600'
                    : 'border-stone-200 hover:border-stone-300'
                }`}
              >
                <img
                  referrerPolicy="no-referrer"
                  src={img}
                  alt={`زاوية ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. FABRIC & CARE SECTION */}
      {item.fabricDetails && (item.fabricDetails.fabricType || (item.fabricDetails.careInstructions && item.fabricDetails.careInstructions.length > 0)) && (
        <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-black text-stone-900">
            <Shirt className="h-4 w-4 text-amber-600" />
            <span>تفاصيل القماش وإرشادات العناية:</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {item.fabricDetails.fabricType && (
              <div className="bg-white p-2 rounded-xl border border-stone-100">
                <span className="text-[10px] text-stone-400 block font-bold">نوع القماش والخامة</span>
                <span className="text-stone-900 font-bold">{item.fabricDetails.fabricType}</span>
              </div>
            )}

            {item.fabricDetails.stretchLevel && (
              <div className="bg-white p-2 rounded-xl border border-stone-100">
                <span className="text-[10px] text-stone-400 block font-bold">نسبة المرونة والتمدد</span>
                <span className="text-stone-900 font-bold">
                  {item.fabricDetails.stretchLevel === 'non_stretch' ? 'غير متمدد (ثابت)' :
                   item.fabricDetails.stretchLevel === 'slight_stretch' ? 'تمدد طفيف ومريح' :
                   item.fabricDetails.stretchLevel === 'medium_stretch' ? 'تمدد متوسط (ستريتش)' : 'عالي المرونة'}
                </span>
              </div>
            )}
          </div>

          {/* Care instruction tags */}
          {item.fabricDetails.careInstructions && item.fabricDetails.careInstructions.length > 0 && (
            <div className="space-y-1 pt-1">
              <span className="text-[10px] font-bold text-stone-500 block">إرشادات الغسيل والحفظ:</span>
              <div className="flex flex-wrap gap-1.5">
                {item.fabricDetails.careInstructions.map((inst, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-bold bg-white text-stone-700 border border-stone-200 px-2 py-0.5 rounded-lg flex items-center gap-1"
                  >
                    <Check className="h-2.5 w-2.5 text-emerald-600" />
                    <span>{inst}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. RETURN & EXCHANGE POLICY BADGE */}
      {item.returnPolicy && (
        <div className="p-3 bg-amber-50/50 rounded-2xl border border-amber-200/60 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-black text-amber-950">
            <ShieldCheck className="h-4 w-4 text-amber-700" />
            <span>سياسة الاستبدال والاسترجاع:</span>
            <span className="text-[11px] font-bold text-amber-900">
              {item.returnPolicy.allowedType === 'exchange_and_return' ? `متاح الاستبدال والاسترجاع خلال ${item.returnPolicy.periodDays || 3} أيام` :
               item.returnPolicy.allowedType === 'exchange_only' ? `استبدال المقاس متاح خلال ${item.returnPolicy.periodDays || 3} أيام` :
               'لا يمكن الاستبدال أو الاسترجاع لهذه القطعة'}
            </span>
          </div>

          {item.returnPolicy.customNotice && (
            <p className="text-[10px] text-stone-600 leading-relaxed pr-5">
              {item.returnPolicy.customNotice}
            </p>
          )}
        </div>
      )}

      {/* 5. COMPLETE THE LOOK / OUTFIT SUGGESTIONS */}
      {suggestedOutfitItems.length > 0 && (
        <div className="p-3.5 bg-gradient-to-r from-stone-50 via-white to-amber-50/30 rounded-2xl border border-stone-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-black text-stone-900">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span>أكمل الإطلالة (تنسيقات متناسقة مع القطعة):</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {suggestedOutfitItems.map(outfit => (
              <div
                key={outfit.id}
                className="bg-white p-2 rounded-xl border border-stone-200 flex flex-col justify-between hover:shadow-2xs transition-all"
              >
                {outfit.imageUrl ? (
                  <img
                    referrerPolicy="no-referrer"
                    src={outfit.imageUrl}
                    alt={outfit.name}
                    className="w-full aspect-square object-cover rounded-lg mb-1.5"
                  />
                ) : (
                  <div className="w-full aspect-square bg-stone-100 rounded-lg flex items-center justify-center mb-1.5">
                    <Shirt className="h-6 w-6 text-stone-400" />
                  </div>
                )}
                <div className="space-y-0.5">
                  <span className="text-[11px] font-bold text-stone-900 line-clamp-1 block">{outfit.name}</span>
                  <span className="text-[10px] font-black text-[#1a4d2e] font-mono block">{outfit.price} د.أ</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SIZE GUIDE MODAL */}
      {showSizeGuideModal && item.sizeGuide && (
        <div className="fixed inset-0 z-[100050] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Ruler className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-stone-900">
                    {item.sizeGuide.title || 'دليل المقاسات الدقيق'}
                  </h4>
                  <span className="text-[10px] text-stone-500">
                    القياسات بالسنتيمتر (cm)
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSizeGuideModal(false)}
                className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-full cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Fit Note */}
            {item.sizeGuide.fitNote && (
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 flex items-start gap-2">
                <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="font-bold leading-relaxed">{item.sizeGuide.fitNote}</span>
              </div>
            )}

            {/* Measurements Table */}
            <div className="overflow-x-auto rounded-xl border border-stone-200">
              <table className="w-full text-right text-xs">
                <thead className="bg-stone-50 border-b border-stone-200 text-[10px] font-black text-stone-600">
                  <tr>
                    <th className="p-2.5">المقاس</th>
                    <th className="p-2.5">الصدر</th>
                    <th className="p-2.5">الخصر</th>
                    <th className="p-2.5">الكتف</th>
                    <th className="p-2.5">الطول</th>
                    <th className="p-2.5">الكم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {item.sizeGuide.rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/30">
                      <td className="p-2.5 font-bold font-mono text-amber-900">{row.size}</td>
                      <td className="p-2.5 font-mono">{row.chest ? `${row.chest} cm` : '-'}</td>
                      <td className="p-2.5 font-mono">{row.waist ? `${row.waist} cm` : '-'}</td>
                      <td className="p-2.5 font-mono">{row.shoulder ? `${row.shoulder} cm` : '-'}</td>
                      <td className="p-2.5 font-mono">{row.length ? `${row.length} cm` : '-'}</td>
                      <td className="p-2.5 font-mono">{row.sleeve ? `${row.sleeve} cm` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowSizeGuideModal(false)}
                className="w-full py-2.5 bg-stone-900 hover:bg-black text-white text-xs font-black rounded-xl cursor-pointer"
              >
                إغلاق دليل المقاسات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN ZOOM & DETAIL GALLERY MODAL */}
      {showZoomModal && allImages.length > 0 && isOfficialVip && (
        <div className="fixed inset-0 z-[100060] bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6">
          <div className="flex items-center justify-between text-white pb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black">معاينة تفاصيل وخامة القطعة</span>
              <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">
                {activeGalleryIndex + 1} / {allImages.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowZoomModal(false)}
              className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-full cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Main zoomed image */}
          <div className="flex-1 flex items-center justify-center relative overflow-hidden my-auto max-h-[75vh]">
            <img
              referrerPolicy="no-referrer"
              src={allImages[activeGalleryIndex]}
              alt="صورة مكبرة"
              className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl transition-transform duration-300"
            />

            {/* Nav arrows */}
            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveGalleryIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))}
                  className="absolute left-2 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full cursor-pointer"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveGalleryIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))}
                  className="absolute right-2 p-3 bg-black/50 hover:bg-black/80 text-white rounded-full cursor-pointer"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnails */}
          <div className="flex items-center justify-center gap-2 pt-3 overflow-x-auto no-scrollbar">
            {allImages.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveGalleryIndex(i)}
                className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  activeGalleryIndex === i ? 'border-amber-500 scale-105' : 'border-white/30 opacity-60'
                }`}
              >
                <img
                  referrerPolicy="no-referrer"
                  src={img}
                  alt={`مصغر ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
