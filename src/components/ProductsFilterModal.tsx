import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  SlidersHorizontal, 
  X, 
  RotateCcw, 
  Sparkles, 
  Flame, 
  Clock, 
  MapPin, 
  Compass, 
  Folder, 
  Layers, 
  Truck, 
  ChevronDown,
  Tag,
  ArrowUpDown
} from 'lucide-react';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { ProductItem } from '../pages/Products';

export interface AppliedProductsFilters {
  activeSortTab: 'all' | 'popular' | 'recent' | 'price_asc' | 'price_desc';
  category: string;
  subCategory: string;
  region: string;
  discountOnly: boolean;
  deliveryOnly: boolean;
  minPrice: string;
  maxPrice: string;
}

interface ProductsFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Active applied filters
  activeSortTab: 'all' | 'popular' | 'recent' | 'price_asc' | 'price_desc';
  selectedCategory: string;
  selectedSubCategory: string;
  selectedRegion: string;
  discountOnly: boolean;
  deliveryOnly: boolean;
  minPrice: string;
  maxPrice: string;
  onApplyFilters: (filters: AppliedProductsFilters) => void;
  // Matching count preview
  products: ProductItem[];
}

export function ProductsFilterModal({
  isOpen,
  onClose,
  activeSortTab,
  selectedCategory,
  selectedSubCategory,
  selectedRegion,
  discountOnly,
  deliveryOnly,
  minPrice,
  maxPrice,
  onApplyFilters,
  products
}: ProductsFilterModalProps) {
  const { categories, neighborhoods } = useSystemSettings();

  // Internal draft staging state
  const [draftSortTab, setDraftSortTab] = useState<'all' | 'popular' | 'recent' | 'price_asc' | 'price_desc'>(activeSortTab);
  const [draftCategory, setDraftCategory] = useState<string>(selectedCategory);
  const [draftSubCategory, setDraftSubCategory] = useState<string>(selectedSubCategory);
  const [draftLocationGroup, setDraftLocationGroup] = useState<string>('');
  const [draftNeighborhood, setDraftNeighborhood] = useState<string>('');
  const [draftDiscountOnly, setDraftDiscountOnly] = useState<boolean>(discountOnly);
  const [draftDeliveryOnly, setDraftDeliveryOnly] = useState<boolean>(deliveryOnly);
  const [draftMinPrice, setDraftMinPrice] = useState<string>(minPrice);
  const [draftMaxPrice, setDraftMaxPrice] = useState<string>(maxPrice);

  // Sync draft state with incoming active filters whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setDraftSortTab(activeSortTab);
      setDraftCategory(selectedCategory);
      setDraftSubCategory(selectedSubCategory);
      setDraftDiscountOnly(discountOnly);
      setDraftDeliveryOnly(deliveryOnly);
      setDraftMinPrice(minPrice);
      setDraftMaxPrice(maxPrice);

      if (!selectedRegion || selectedRegion === 'الكل') {
        setDraftLocationGroup('');
        setDraftNeighborhood('');
      } else {
        const foundByArea = neighborhoods.find(g => g.areas.includes(selectedRegion));
        if (foundByArea) {
          setDraftLocationGroup(foundByArea.groupName);
          setDraftNeighborhood(selectedRegion);
        } else {
          const foundByGroup = neighborhoods.find(g => g.groupName === selectedRegion);
          if (foundByGroup) {
            setDraftLocationGroup(selectedRegion);
            setDraftNeighborhood('');
          } else {
            setDraftLocationGroup('');
            setDraftNeighborhood(selectedRegion);
          }
        }
      }
    }
  }, [
    isOpen,
    activeSortTab,
    selectedCategory,
    selectedSubCategory,
    selectedRegion,
    discountOnly,
    deliveryOnly,
    minPrice,
    maxPrice,
    neighborhoods
  ]);

  const selectedCategoryObj = categories.find(c => c.name === draftCategory);
  const currentSubcategories = selectedCategoryObj?.subcategories || [];

  const availableNeighborhoodAreas = useMemo(() => {
    if (draftLocationGroup) {
      const targetGroup = neighborhoods.find(g => g.groupName === draftLocationGroup);
      return targetGroup ? targetGroup.areas : [];
    }
    return neighborhoods.flatMap(g => g.areas);
  }, [draftLocationGroup, neighborhoods]);

  const handleLocationGroupChange = (groupName: string) => {
    setDraftLocationGroup(groupName);
    setDraftNeighborhood('');
  };

  const handleNeighborhoodChange = (neighborhoodName: string) => {
    setDraftNeighborhood(neighborhoodName);
    if (neighborhoodName && !draftLocationGroup) {
      const foundGroup = neighborhoods.find(g => g.areas.includes(neighborhoodName));
      if (foundGroup) {
        setDraftLocationGroup(foundGroup.groupName);
      }
    }
  };

  const effectiveDraftRegion = draftNeighborhood || draftLocationGroup || '';

  // Quick price preset handler
  const handlePricePreset = (min: string, max: string) => {
    setDraftMinPrice(min);
    setDraftMaxPrice(max);
  };

  // Count active draft filters
  const draftActiveCount = useMemo(() => {
    let count = 0;
    if (draftSortTab !== 'all') count++;
    if (draftCategory && draftCategory !== 'الكل') count++;
    if (draftSubCategory) count++;
    if (effectiveDraftRegion) count++;
    if (draftDiscountOnly) count++;
    if (draftDeliveryOnly) count++;
    if (draftMinPrice.trim()) count++;
    if (draftMaxPrice.trim()) count++;
    return count;
  }, [
    draftSortTab,
    draftCategory,
    draftSubCategory,
    effectiveDraftRegion,
    draftDiscountOnly,
    draftDeliveryOnly,
    draftMinPrice,
    draftMaxPrice
  ]);

  // Preview count of matching products with draft filters
  const draftMatchingCount = useMemo(() => {
    return products.filter(p => {
      // Category match
      if (draftCategory && draftCategory !== 'الكل') {
        const validSubCats = categories.find(c => c.name === draftCategory)?.subcategories || [];
        const pCat = p.category || p.businessCategory || '';
        const pSub = p.businessSubCategory || '';

        if (draftSubCategory) {
          if (pCat !== draftSubCategory && pSub !== draftSubCategory) return false;
        } else {
          if (pCat !== draftCategory && !validSubCats.includes(pCat) && !validSubCats.includes(pSub)) return false;
        }
      }

      // Region match
      if (effectiveDraftRegion) {
        const reg = effectiveDraftRegion.toLowerCase();
        const bizAddr = (p.businessAddress || '').toLowerCase();
        const bizDist = (p.businessDistrict || '').toLowerCase();
        const bizReg = (p.businessRegion || '').toLowerCase();
        const matches = bizAddr.includes(reg) || bizDist.includes(reg) || bizReg.includes(reg);
        if (!matches) return false;
      }

      // Discount only toggle
      if (draftDiscountOnly) {
        const numPrice = parseFloat(String(p.price).replace(/[^0-9.]/g, '')) || 0;
        const numOrig = parseFloat(String(p.originalPrice || '').replace(/[^0-9.]/g, '')) || 0;
        const hasDiscount = numOrig > numPrice;
        if (!hasDiscount) return false;
      }

      // Delivery only toggle
      if (draftDeliveryOnly) {
        const hasDel = Boolean((p as any).deliveryAvailable || (p as any).businessDelivery || (p as any).businessHasDelivery);
        if (!hasDel && (p as any).deliveryAvailable === false) return false;
      }

      // Price range
      const numericPrice = parseFloat(String(p.price).replace(/[^0-9.]/g, '')) || 0;
      if (draftMinPrice.trim()) {
        const min = parseFloat(draftMinPrice);
        if (!isNaN(min) && numericPrice < min) return false;
      }
      if (draftMaxPrice.trim()) {
        const max = parseFloat(draftMaxPrice);
        if (!isNaN(max) && numericPrice > max) return false;
      }

      return true;
    }).length;
  }, [
    products,
    draftCategory,
    draftSubCategory,
    effectiveDraftRegion,
    draftDiscountOnly,
    draftDeliveryOnly,
    draftMinPrice,
    draftMaxPrice,
    categories
  ]);

  const handleClearDraftFilters = () => {
    setDraftSortTab('all');
    setDraftCategory('الكل');
    setDraftSubCategory('');
    setDraftLocationGroup('');
    setDraftNeighborhood('');
    setDraftDiscountOnly(false);
    setDraftDeliveryOnly(false);
    setDraftMinPrice('');
    setDraftMaxPrice('');
  };

  // Lock background body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const handleApply = () => {
    onApplyFilters({
      activeSortTab: draftSortTab,
      category: draftCategory,
      subCategory: draftSubCategory,
      region: effectiveDraftRegion,
      discountOnly: draftDiscountOnly,
      deliveryOnly: draftDeliveryOnly,
      minPrice: draftMinPrice,
      maxPrice: draftMaxPrice
    });
    onClose();
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity duration-200 overflow-hidden" dir="rtl">
      {/* Backdrop */}
      <div 
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Content */}
      <div className="relative w-full sm:max-w-2xl bg-white rounded-t-[28px] rounded-b-none sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden z-10 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 my-0 sm:my-auto">
        
        {/* Mobile Pull Handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-12 h-1.5 bg-stone-300 rounded-full" />
        </div>

        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70 shrink-0">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4.5 w-4.5 text-emerald-700" />
            <h3 className="font-bold text-stone-900 text-sm sm:text-base">فلترة وتخصيص المنتجات والخدمات</h3>
            {draftActiveCount > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-700 text-white rounded-full">
                {draftActiveCount}
              </span>
            )}
          </div>
          
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-200/60 transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-3.5 sm:p-5 overflow-y-auto space-y-4 text-xs min-h-0">
          
          {/* Section 1: الترتيب والفرز */}
          <div className="space-y-2">
            <label className="font-bold text-stone-800 flex items-center gap-1.5 text-xs sm:text-sm">
              <Sparkles className="h-4 w-4 text-emerald-700" />
              <span>الترتيب والفرز</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => setDraftSortTab('all')}
                className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer flex items-center justify-center gap-1 text-xs ${
                  draftSortTab === 'all'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span>الكل</span>
              </button>

              <button
                type="button"
                onClick={() => setDraftSortTab('popular')}
                className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer flex items-center justify-center gap-1 text-xs ${
                  draftSortTab === 'popular'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <Flame className={`h-3.5 w-3.5 ${draftSortTab === 'popular' ? 'text-amber-300' : 'text-amber-500'}`} />
                <span>الأكثر طلباً</span>
              </button>

              <button
                type="button"
                onClick={() => setDraftSortTab('recent')}
                className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer flex items-center justify-center gap-1 text-xs ${
                  draftSortTab === 'recent'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <Clock className={`h-3.5 w-3.5 ${draftSortTab === 'recent' ? 'text-white' : 'text-blue-500'}`} />
                <span>الأحدث</span>
              </button>

              <button
                type="button"
                onClick={() => setDraftSortTab('price_asc')}
                className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer flex items-center justify-center gap-1 text-xs ${
                  draftSortTab === 'price_asc'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <ArrowUpDown className="h-3 w-3" />
                <span>الأقل سعراً</span>
              </button>

              <button
                type="button"
                onClick={() => setDraftSortTab('price_desc')}
                className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer flex items-center justify-center gap-1 text-xs ${
                  draftSortTab === 'price_desc'
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <ArrowUpDown className="h-3 w-3" />
                <span>الأعلى سعراً</span>
              </button>
            </div>
          </div>

          {/* Section 2: القسم والنطاق الجغرافي (Grid 2x2) */}
          <div className="space-y-2.5 pt-2 border-t border-stone-100">
            <label className="font-bold text-stone-800 flex items-center gap-1.5 text-xs sm:text-sm">
              <MapPin className="h-4 w-4 text-emerald-700" />
              <span>القسم والنطاق الجغرافي</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              {/* Category */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-stone-700 mb-1">
                  <Folder className="h-3.5 w-3.5 text-emerald-700" />
                  <span>القسم</span>
                </label>
                <div className="relative">
                  <select
                    value={draftCategory}
                    onChange={(e) => {
                      setDraftCategory(e.target.value);
                      setDraftSubCategory('');
                    }}
                    className="w-full h-10 pr-3 pl-8 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="الكل">كافة الأقسام</option>
                    {categories.map((cat) => (
                      <option key={cat.id || cat.name} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="h-4 w-4 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* SubCategory */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-stone-700 mb-1">
                  <Layers className="h-3.5 w-3.5 text-emerald-700" />
                  <span>التصنيف الفرعي</span>
                </label>
                <div className="relative">
                  <select
                    value={draftSubCategory}
                    disabled={draftCategory === 'الكل' || currentSubcategories.length === 0}
                    onChange={(e) => setDraftSubCategory(e.target.value)}
                    className={`w-full h-10 pr-3 pl-8 rounded-xl border text-xs font-bold transition-all appearance-none cursor-pointer ${
                      draftCategory === 'الكل' || currentSubcategories.length === 0
                        ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                        : 'bg-stone-50 text-stone-800 border-stone-200 focus:outline-none focus:border-emerald-600 focus:bg-white'
                    }`}
                  >
                    <option value="">
                      {draftCategory === 'الكل' 
                        ? 'اختر القسم أولاً' 
                        : currentSubcategories.length === 0 
                          ? 'لا توجد تصنيفات فرعية' 
                          : 'كافة التصنيفات الفرعية'}
                    </option>
                    {currentSubcategories.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="h-4 w-4 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Region Group */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-stone-700 mb-1">
                  <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                  <span>المنطقة أو اللواء</span>
                </label>
                <div className="relative">
                  <select
                    value={draftLocationGroup}
                    onChange={(e) => handleLocationGroupChange(e.target.value)}
                    className="w-full h-10 pr-3 pl-8 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="">كافة المناطق والألوية</option>
                    {neighborhoods.map((group) => (
                      <option key={group.groupName} value={group.groupName}>
                        {group.groupName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="h-4 w-4 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Neighborhood */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-stone-700 mb-1">
                  <Compass className="h-3.5 w-3.5 text-emerald-700" />
                  <span>الحي أو الشارع</span>
                </label>
                <div className="relative">
                  <select
                    value={draftNeighborhood}
                    onChange={(e) => handleNeighborhoodChange(e.target.value)}
                    className="w-full h-10 pr-3 pl-8 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="">كافة الأحياء والشوارع</option>
                    {draftLocationGroup ? (
                      availableNeighborhoodAreas.map((area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))
                    ) : (
                      neighborhoods.map((group) => (
                        <optgroup key={group.groupName} label={group.groupName}>
                          {group.areas.map((area) => (
                            <option key={area} value={area}>
                              {area}
                            </option>
                          ))}
                        </optgroup>
                      ))
                    )}
                  </select>
                  <ChevronDown className="h-4 w-4 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

            </div>
          </div>

          {/* Section 3: نطاق السعر والميزانية */}
          <div className="space-y-2.5 pt-2 border-t border-stone-100">
            <label className="font-bold text-stone-800 flex items-center gap-1.5 text-xs sm:text-sm">
              <Tag className="h-4 w-4 text-emerald-700" />
              <span>نطاق السعر (بالدينار الأردني)</span>
            </label>

            {/* Price Presets */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {[
                { label: 'الكل', min: '', max: '' },
                { label: 'أقل من 5', min: '', max: '5' },
                { label: '5 - 15', min: '5', max: '15' },
                { label: '15 - 50', min: '15', max: '50' },
                { label: 'أكثر من 50', min: '50', max: '' },
              ].map((preset) => {
                const isSelected = draftMinPrice === preset.min && draftMaxPrice === preset.max;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handlePricePreset(preset.min, preset.max)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <span>{preset.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Input Range */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div>
                <label className="text-[11px] font-bold text-stone-600 mb-1 block">الحد الأدنى للسعر</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="من"
                  value={draftMinPrice}
                  onChange={(e) => setDraftMinPrice(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-center"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold text-stone-600 mb-1 block">الحد الأقصى للسعر</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="إلى"
                  value={draftMaxPrice}
                  onChange={(e) => setDraftMaxPrice(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition-all text-center"
                />
              </div>
            </div>
          </div>

          {/* Section 4: خيارات وميزات المنتجات */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <label className="font-bold text-stone-800 flex items-center gap-1.5 text-xs sm:text-sm">
              <SlidersHorizontal className="h-4 w-4 text-emerald-700" />
              <span>خيارات وميزات خاصة</span>
            </label>

            <div className="space-y-2">
              {/* Discount Only Toggle */}
              <div 
                onClick={() => setDraftDiscountOnly(!draftDiscountOnly)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all select-none ${
                  draftDiscountOnly ? 'bg-emerald-50/70 border-emerald-200' : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-emerald-700" />
                  <span className="text-xs font-bold text-stone-800">منتجات عليها خصم حالي</span>
                </div>
                <div 
                  className={`w-11 h-6 rounded-full transition-colors duration-200 p-0.5 shrink-0 ${
                    draftDiscountOnly ? 'bg-emerald-700' : 'bg-stone-300'
                  }`}
                  dir="ltr"
                >
                  <div 
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      draftDiscountOnly ? 'translate-x-5' : 'translate-x-0'
                    }`} 
                  />
                </div>
              </div>

              {/* Delivery Available Toggle */}
              <div 
                onClick={() => setDraftDeliveryOnly(!draftDeliveryOnly)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all select-none ${
                  draftDeliveryOnly ? 'bg-blue-50/70 border-blue-200' : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-bold text-stone-800">يتوفر خدمة توصيل</span>
                </div>
                <div 
                  className={`w-11 h-6 rounded-full transition-colors duration-200 p-0.5 shrink-0 ${
                    draftDeliveryOnly ? 'bg-emerald-700' : 'bg-stone-300'
                  }`}
                  dir="ltr"
                >
                  <div 
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      draftDeliveryOnly ? 'translate-x-5' : 'translate-x-0'
                    }`} 
                  />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Modal Footer with Identical Vertical Height (h-11 sm:h-12) */}
        <div className="p-3.5 sm:p-4 border-t border-stone-100 bg-stone-50 flex items-center gap-2.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={handleClearDraftFilters}
            disabled={draftActiveCount === 0}
            className={`h-11 sm:h-12 px-3.5 sm:px-4 rounded-xl sm:rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer border shrink-0 ${
              draftActiveCount > 0
                ? 'bg-white border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300'
                : 'bg-stone-100 border-stone-200 text-stone-400 cursor-not-allowed'
            }`}
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            <span>مسح جميع الفلاتر</span>
          </button>

          <button
            type="button"
            onClick={handleApply}
            className="h-11 sm:h-12 flex-1 bg-emerald-700 hover:bg-emerald-800 text-white px-3 sm:px-4 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm shadow-sm active:scale-98 transition-all cursor-pointer flex items-center justify-center border border-transparent text-center"
          >
            <span>تطبيق الفلترة (عرض {draftMatchingCount} نتيجة)</span>
          </button>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
