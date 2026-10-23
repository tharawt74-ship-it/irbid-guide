import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  SlidersHorizontal, 
  X, 
  RotateCcw, 
  Clock, 
  Heart, 
  Truck, 
  Compass, 
  Crown, 
  TrendingUp, 
  Star, 
  MapPin, 
  Folder, 
  Layers,
  CreditCard, 
  Tag, 
  Banknote, 
  Wallet,
  ChevronDown
} from 'lucide-react';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { Business } from '../types';
import { 
  SortTab, 
  DeliveryFilterOption, 
  PaymentMethodOption, 
  AppliedBusinessFilters,
  countMatchingBusinesses 
} from '../lib/businessFilterHelper';

export type { SortTab, DeliveryFilterOption, PaymentMethodOption };

export interface BusinessFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: SortTab;
  regionFilter: string;
  categoryFilter: string;
  subCategoryFilter: string;
  openNowFilter: boolean;
  favoritesOnly: boolean;
  deliveryFilter: DeliveryFilterOption;
  hasOffersOnly: boolean;
  paymentMethodFilter: PaymentMethodOption;
  onApplyFilters: (filters: AppliedBusinessFilters) => void;
  businesses: Business[];
  userFavorites: string[];
  userFavoritesCount: number;
  businessIdsWithOffers: Set<string>;
  businessNamesWithOffers: Set<string>;
}

export function BusinessFilterModal({
  isOpen,
  onClose,
  activeTab,
  regionFilter,
  categoryFilter,
  subCategoryFilter,
  openNowFilter,
  favoritesOnly,
  deliveryFilter,
  hasOffersOnly,
  paymentMethodFilter,
  onApplyFilters,
  businesses,
  userFavorites,
  userFavoritesCount,
  businessIdsWithOffers,
  businessNamesWithOffers,
}: BusinessFilterModalProps) {
  const { categories, neighborhoods } = useSystemSettings();

  // Internal draft staging state
  const [draftTab, setDraftTab] = useState<SortTab>(activeTab);
  const [draftRegion, setDraftRegion] = useState<string>(regionFilter);
  const [draftCategory, setDraftCategory] = useState<string>(categoryFilter);
  const [draftSubCategory, setDraftSubCategory] = useState<string>(subCategoryFilter);
  const [draftLocationGroup, setDraftLocationGroup] = useState<string>('');
  const [draftNeighborhood, setDraftNeighborhood] = useState<string>('');
  const [draftOpenNow, setDraftOpenNow] = useState<boolean>(openNowFilter);
  const [draftFavoritesOnly, setDraftFavoritesOnly] = useState<boolean>(favoritesOnly);
  const [draftDelivery, setDraftDelivery] = useState<DeliveryFilterOption>(deliveryFilter);
  const [draftHasOffersOnly, setDraftHasOffersOnly] = useState<boolean>(hasOffersOnly);
  const [draftPaymentMethod, setDraftPaymentMethod] = useState<PaymentMethodOption>(paymentMethodFilter);

  // Sync draft state with incoming active filters whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setDraftTab(activeTab);
      setDraftRegion(regionFilter);
      setDraftCategory(categoryFilter);
      setDraftSubCategory(subCategoryFilter);
      setDraftOpenNow(openNowFilter);
      setDraftFavoritesOnly(favoritesOnly);
      setDraftDelivery(deliveryFilter);
      setDraftHasOffersOnly(hasOffersOnly);
      setDraftPaymentMethod(paymentMethodFilter);

      if (!regionFilter || regionFilter === 'الكل') {
        setDraftLocationGroup('');
        setDraftNeighborhood('');
      } else {
        const foundByArea = neighborhoods.find(g => g.areas.includes(regionFilter));
        if (foundByArea) {
          setDraftLocationGroup(foundByArea.groupName);
          setDraftNeighborhood(regionFilter);
        } else {
          const foundByGroup = neighborhoods.find(g => g.groupName === regionFilter);
          if (foundByGroup) {
            setDraftLocationGroup(regionFilter);
            setDraftNeighborhood('');
          } else {
            setDraftLocationGroup('');
            setDraftNeighborhood(regionFilter);
          }
        }
      }
    }
  }, [
    isOpen, 
    activeTab, 
    regionFilter, 
    categoryFilter, 
    subCategoryFilter, 
    openNowFilter, 
    favoritesOnly, 
    deliveryFilter, 
    hasOffersOnly, 
    paymentMethodFilter,
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
  }, [neighborhoods, draftLocationGroup]);

  const handleLocationGroupChange = (newGroup: string) => {
    setDraftLocationGroup(newGroup);
    if (!newGroup) {
      setDraftNeighborhood('');
      setDraftRegion('');
      return;
    }
    const targetGroup = neighborhoods.find(g => g.groupName === newGroup);
    if (draftNeighborhood && targetGroup && !targetGroup.areas.includes(draftNeighborhood)) {
      setDraftNeighborhood('');
      setDraftRegion(newGroup);
    } else if (!draftNeighborhood) {
      setDraftRegion(newGroup);
    }
  };

  const handleNeighborhoodChange = (newArea: string) => {
    setDraftNeighborhood(newArea);
    if (newArea) {
      setDraftRegion(newArea);
      const parentGroup = neighborhoods.find(g => g.areas.includes(newArea));
      if (parentGroup && parentGroup.groupName !== draftLocationGroup) {
        setDraftLocationGroup(parentGroup.groupName);
      }
    } else {
      setDraftRegion(draftLocationGroup || '');
    }
  };

  // Calculate current active count in draft
  const draftActiveCount = useMemo(() => {
    let count = 0;
    if (draftTab !== 'all') count++;
    if (draftRegion && draftRegion !== 'الكل') count++;
    if (draftCategory) count++;
    if (draftSubCategory) count++;
    if (draftOpenNow) count++;
    if (draftFavoritesOnly) count++;
    if (draftDelivery !== 'all') count++;
    if (draftHasOffersOnly) count++;
    if (draftPaymentMethod !== 'all') count++;
    return count;
  }, [
    draftTab, 
    draftRegion, 
    draftCategory, 
    draftSubCategory, 
    draftOpenNow, 
    draftFavoritesOnly, 
    draftDelivery, 
    draftHasOffersOnly, 
    draftPaymentMethod
  ]);

  // Dynamically calculate matching businesses for the current draft selection
  const draftMatchingCount = useMemo(() => {
    const draftFilters: AppliedBusinessFilters = {
      activeTab: draftTab,
      regionFilter: draftRegion,
      categoryFilter: draftCategory,
      subCategoryFilter: draftSubCategory,
      openNowFilter: draftOpenNow,
      favoritesOnly: draftFavoritesOnly,
      deliveryFilter: draftDelivery,
      hasOffersOnly: draftHasOffersOnly,
      paymentMethodFilter: draftPaymentMethod,
    };
    return countMatchingBusinesses(businesses, draftFilters, {
      categories,
      userFavorites,
      businessIdsWithOffers,
      businessNamesWithOffers,
    });
  }, [
    businesses,
    categories,
    userFavorites,
    businessIdsWithOffers,
    businessNamesWithOffers,
    draftTab,
    draftRegion,
    draftCategory,
    draftSubCategory,
    draftOpenNow,
    draftFavoritesOnly,
    draftDelivery,
    draftHasOffersOnly,
    draftPaymentMethod,
  ]);

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

  // Reset draft state to defaults
  const handleClearDraftFilters = () => {
    setDraftTab('all');
    setDraftRegion('');
    setDraftCategory('');
    setDraftSubCategory('');
    setDraftLocationGroup('');
    setDraftNeighborhood('');
    setDraftOpenNow(false);
    setDraftFavoritesOnly(false);
    setDraftDelivery('all');
    setDraftHasOffersOnly(false);
    setDraftPaymentMethod('all');
  };

  // Commit and apply draft filters to main page
  const handleApply = () => {
    onApplyFilters({
      activeTab: draftTab,
      regionFilter: draftRegion,
      categoryFilter: draftCategory,
      subCategoryFilter: draftSubCategory,
      openNowFilter: draftOpenNow,
      favoritesOnly: draftFavoritesOnly,
      deliveryFilter: draftDelivery,
      hasOffersOnly: draftHasOffersOnly,
      paymentMethodFilter: draftPaymentMethod,
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
            <SlidersHorizontal className="h-4.5 w-4.5 text-[#1a4d2e]" />
            <h3 className="font-bold text-stone-900 text-sm sm:text-base">فلترة وتخصيص المنشآت</h3>
            {draftActiveCount > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-bold bg-[#1a4d2e] text-white rounded-full">
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
          
          {/* Section 1: الترتيب وطريقة العرض (Pill tabs at the top for consistency) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-stone-800 flex items-center gap-1.5 text-xs sm:text-sm">
                <SlidersHorizontal className="h-4 w-4 text-[#1a4d2e]" />
                <span>الترتيب والفرز</span>
              </label>
              {draftTab !== 'all' && (
                <button
                  type="button"
                  onClick={() => setDraftTab('all')}
                  className="text-[11px] font-bold text-stone-500 hover:text-[#1a4d2e] cursor-pointer"
                >
                  الافتراضي
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2">
              {[
                { id: 'all', label: 'الكل', icon: Compass },
                { id: 'featured', label: 'المميزة', icon: Crown },
                { id: 'popular', label: 'الأكثر شعبية', icon: TrendingUp },
                { id: 'top_rated', label: 'الأعلى تقييماً', icon: Star },
                { id: 'recent', label: 'الأحدث', icon: Clock },
              ].map((tab) => {
                const IconComponent = tab.icon;
                const isSelected = draftTab === tab.id;
                return (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => setDraftTab(tab.id as SortTab)}
                    className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs ${
                      isSelected
                        ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <IconComponent className={`h-3.5 w-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-stone-500'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: التصنيف والموقع الجغرافي (Grid 2x2) */}
          <div className="space-y-2.5 pt-2 border-t border-stone-100">
            <label className="font-bold text-stone-800 flex items-center gap-1.5 text-xs sm:text-sm">
              <MapPin className="h-4 w-4 text-[#1a4d2e]" />
              <span>القسم والنطاق الجغرافي</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              {/* Category */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-stone-700 mb-1">
                  <Folder className="h-3.5 w-3.5 text-[#1a4d2e]" />
                  <span>القسم</span>
                </label>
                <div className="relative">
                  <select
                    value={draftCategory}
                    onChange={(e) => {
                      setDraftCategory(e.target.value);
                      setDraftSubCategory('');
                    }}
                    className="w-full h-10 pr-3 pl-8 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-800 focus:outline-none focus:border-[#1a4d2e] focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="">كافة الأقسام</option>
                    {categories.map((cat) => (
                      <option key={cat.id || cat.name} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="h-4 w-4 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Subcategory */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-stone-700 mb-1">
                  <Layers className="h-3.5 w-3.5 text-[#1a4d2e]" />
                  <span>التصنيف الفرعي</span>
                </label>
                <div className="relative">
                  <select
                    value={draftSubCategory}
                    disabled={!draftCategory || currentSubcategories.length === 0}
                    onChange={(e) => setDraftSubCategory(e.target.value)}
                    className={`w-full h-10 pr-3 pl-8 rounded-xl border text-xs font-bold transition-all appearance-none cursor-pointer ${
                      !draftCategory || currentSubcategories.length === 0
                        ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                        : 'bg-stone-50 text-stone-800 border-stone-200 focus:outline-none focus:border-[#1a4d2e] focus:bg-white'
                    }`}
                  >
                    <option value="">
                      {!draftCategory 
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
                  <MapPin className="h-3.5 w-3.5 text-[#1a4d2e]" />
                  <span>المنطقة أو اللواء</span>
                </label>
                <div className="relative">
                  <select
                    value={draftLocationGroup}
                    onChange={(e) => handleLocationGroupChange(e.target.value)}
                    className="w-full h-10 pr-3 pl-8 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-800 focus:outline-none focus:border-[#1a4d2e] focus:bg-white transition-all appearance-none cursor-pointer"
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
                  <Compass className="h-3.5 w-3.5 text-[#1a4d2e]" />
                  <span>الحي أو الشارع</span>
                </label>
                <div className="relative">
                  <select
                    value={draftNeighborhood}
                    onChange={(e) => handleNeighborhoodChange(e.target.value)}
                    className="w-full h-10 pr-3 pl-8 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-800 focus:outline-none focus:border-[#1a4d2e] focus:bg-white transition-all appearance-none cursor-pointer"
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

          {/* Section 3: وسائل الدفع والتوصيل */}
          <div className="space-y-3 pt-2 border-t border-stone-100">
            {/* Payment Methods */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-stone-800 flex items-center gap-1.5 text-xs">
                  <CreditCard className="h-3.5 w-3.5 text-[#1a4d2e]" />
                  <span>وسيلة الدفع المقبولة</span>
                </label>
                {draftPaymentMethod !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setDraftPaymentMethod('all')}
                    className="text-[11px] font-bold text-stone-500 hover:text-[#1a4d2e] cursor-pointer"
                  >
                    الكل
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'all', label: 'الكل', icon: Wallet },
                  { id: 'cash', label: 'كاش ونقد', icon: Banknote },
                  { id: 'card', label: 'بطاقة ائتمان وفيزا', icon: CreditCard },
                  { id: 'cliq', label: 'كليك CliQ', icon: Wallet },
                ].map((opt) => {
                  const IconComp = opt.icon;
                  const isSelected = draftPaymentMethod === opt.id;
                  return (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setDraftPaymentMethod(opt.id as PaymentMethodOption)}
                      className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs ${
                        isSelected
                          ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <IconComp className="h-3.5 w-3.5 shrink-0" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Delivery Option */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-stone-800 flex items-center gap-1.5 text-xs">
                  <Truck className="h-3.5 w-3.5 text-[#1a4d2e]" />
                  <span>خدمة التوصيل</span>
                </label>
                {draftDelivery !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setDraftDelivery('all')}
                    className="text-[11px] font-bold text-stone-500 hover:text-[#1a4d2e] cursor-pointer"
                  >
                    الكل
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setDraftDelivery('all')}
                  className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer text-xs ${
                    draftDelivery === 'all'
                      ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <span>الكل</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDraftDelivery('available')}
                  className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs ${
                    draftDelivery === 'available'
                      ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <Truck className="h-3.5 w-3.5 shrink-0" />
                  <span>يتوفر توصيل</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDraftDelivery('unavailable')}
                  className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer text-xs ${
                    draftDelivery === 'unavailable'
                      ? 'bg-stone-800 text-white border-stone-800 shadow-xs'
                      : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  <span>زيارة المكان فقط</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section 4: خيارات وحالة المنشأة (Toggles) */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <label className="font-bold text-stone-800 flex items-center gap-1.5 text-xs sm:text-sm">
              <SlidersHorizontal className="h-4 w-4 text-[#1a4d2e]" />
              <span>خيارات وحالة المنشأة</span>
            </label>

            <div className="space-y-2">
              {/* Offers toggle */}
              <div
                onClick={() => setDraftHasOffersOnly(!draftHasOffersOnly)}
                className={`w-full p-3 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                  draftHasOffersOnly
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                    : 'bg-stone-50 text-stone-800 border-stone-200 hover:bg-stone-100'
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setDraftHasOffersOnly(!draftHasOffersOnly);
                  }
                }}
              >
                <div className="flex items-center gap-2.5">
                  <Tag className="h-4 w-4 text-[#1a4d2e] shrink-0" />
                  <span className="text-xs font-bold">يوجد عروض وخصومات حالية</span>
                </div>
                <div 
                  className={`w-11 h-6 rounded-full transition-colors duration-200 p-0.5 shrink-0 ${
                    draftHasOffersOnly ? 'bg-[#1a4d2e]' : 'bg-stone-300'
                  }`}
                  dir="ltr"
                >
                  <div 
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      draftHasOffersOnly ? 'translate-x-5' : 'translate-x-0'
                    }`} 
                  />
                </div>
              </div>

              {/* Open now toggle */}
              <div
                onClick={() => setDraftOpenNow(!draftOpenNow)}
                className={`w-full p-3 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                  draftOpenNow
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                    : 'bg-stone-50 text-stone-800 border-stone-200 hover:bg-stone-100'
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setDraftOpenNow(!draftOpenNow);
                  }
                }}
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="text-xs font-bold">مفتوح ويستقبل الزبائن الآن</span>
                </div>
                <div 
                  className={`w-11 h-6 rounded-full transition-colors duration-200 p-0.5 shrink-0 ${
                    draftOpenNow ? 'bg-[#1a4d2e]' : 'bg-stone-300'
                  }`}
                  dir="ltr"
                >
                  <div 
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      draftOpenNow ? 'translate-x-5' : 'translate-x-0'
                    }`} 
                  />
                </div>
              </div>

              {/* Favorites toggle */}
              <div
                onClick={() => setDraftFavoritesOnly(!draftFavoritesOnly)}
                className={`w-full p-3 rounded-xl border text-right transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                  draftFavoritesOnly
                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                    : 'bg-stone-50 text-stone-800 border-stone-200 hover:bg-stone-100'
                }`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setDraftFavoritesOnly(!draftFavoritesOnly);
                  }
                }}
              >
                <div className="flex items-center gap-2.5">
                  <Heart className={`h-4 w-4 shrink-0 ${draftFavoritesOnly ? 'fill-rose-500 text-rose-500' : 'text-rose-500'}`} />
                  <span className="text-xs font-bold">المنشآت المحفوظة في المفضلة ({userFavoritesCount})</span>
                </div>
                <div 
                  className={`w-11 h-6 rounded-full transition-colors duration-200 p-0.5 shrink-0 ${
                    draftFavoritesOnly ? 'bg-rose-600' : 'bg-stone-300'
                  }`}
                  dir="ltr"
                >
                  <div 
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      draftFavoritesOnly ? 'translate-x-5' : 'translate-x-0'
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
            className="h-11 sm:h-12 flex-1 bg-[#1a4d2e] hover:bg-[#143e24] text-white px-3 sm:px-4 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm shadow-sm active:scale-98 transition-all cursor-pointer flex items-center justify-center border border-transparent text-center"
          >
            <span>تطبيق الفلترة (عرض {draftMatchingCount} منشأة)</span>
          </button>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
