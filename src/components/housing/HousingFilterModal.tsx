import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  SlidersHorizontal, 
  X, 
  RotateCcw, 
  Building2, 
  MapPin, 
  Compass, 
  GraduationCap, 
  DollarSign, 
  Layers, 
  Calendar, 
  Check, 
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { useSystemSettings } from '../../contexts/SystemSettingsContext';
import { HousingItem } from '../../types';

export interface AppliedHousingFilters {
  sortBy: string;
  district: string;
  minPrice: string;
  maxPrice: string;
  rooms: string;
  furnished: string;
  rentDuration: string;
  nearestUniv: string;
  gender: string;
  services: string[];
}

export interface HousingFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCategory: 'sale' | 'rent' | 'students' | 'roommates';
  sortBy: string;
  selectedDistrict: string;
  minPrice: string;
  maxPrice: string;
  selectedRooms: string;
  selectedFurnished: string;
  selectedRentDuration: string;
  selectedUniv: string;
  selectedGender: string;
  selectedServices: string[];
  onApplyFilters: (filters: AppliedHousingFilters) => void;
  housings: HousingItem[];
  roommates: any[];
}

export function HousingFilterModal({
  isOpen,
  onClose,
  activeCategory,
  sortBy,
  selectedDistrict,
  minPrice,
  maxPrice,
  selectedRooms,
  selectedFurnished,
  selectedRentDuration,
  selectedUniv,
  selectedGender,
  selectedServices,
  onApplyFilters,
  housings,
  roommates
}: HousingFilterModalProps) {
  const { neighborhoods } = useSystemSettings();

  // Internal draft staging state
  const [draftSortBy, setDraftSortBy] = useState<string>(sortBy);
  const [draftLocationGroup, setDraftLocationGroup] = useState<string>('');
  const [draftNeighborhood, setDraftNeighborhood] = useState<string>('');
  const [draftDistrict, setDraftDistrict] = useState<string>(selectedDistrict);
  const [draftMinPrice, setDraftMinPrice] = useState<string>(minPrice);
  const [draftMaxPrice, setDraftMaxPrice] = useState<string>(maxPrice);
  const [draftRooms, setDraftRooms] = useState<string>(selectedRooms);
  const [draftFurnished, setDraftFurnished] = useState<string>(selectedFurnished);
  const [draftRentDuration, setDraftRentDuration] = useState<string>(selectedRentDuration);
  const [draftUniv, setDraftUniv] = useState<string>(selectedUniv);
  const [draftGender, setDraftGender] = useState<string>(selectedGender);
  const [draftServices, setDraftServices] = useState<string[]>(selectedServices);

  // Sync draft state with incoming active filters whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setDraftSortBy(sortBy);
      setDraftMinPrice(minPrice);
      setDraftMaxPrice(maxPrice);
      setDraftRooms(selectedRooms);
      setDraftFurnished(selectedFurnished);
      setDraftRentDuration(selectedRentDuration);
      setDraftUniv(selectedUniv);
      setDraftGender(selectedGender);
      setDraftServices(selectedServices);
      setDraftDistrict(selectedDistrict);

      if (!selectedDistrict || selectedDistrict === 'الكل') {
        setDraftLocationGroup('');
        setDraftNeighborhood('');
      } else {
        const foundByArea = neighborhoods.find(g => g.areas.includes(selectedDistrict));
        if (foundByArea) {
          setDraftLocationGroup(foundByArea.groupName);
          setDraftNeighborhood(selectedDistrict);
        } else {
          const foundByGroup = neighborhoods.find(g => g.groupName === selectedDistrict);
          if (foundByGroup) {
            setDraftLocationGroup(selectedDistrict);
            setDraftNeighborhood('');
          } else {
            setDraftLocationGroup('');
            setDraftNeighborhood(selectedDistrict);
          }
        }
      }
    }
  }, [
    isOpen,
    sortBy,
    selectedDistrict,
    minPrice,
    maxPrice,
    selectedRooms,
    selectedFurnished,
    selectedRentDuration,
    selectedUniv,
    selectedGender,
    selectedServices,
    neighborhoods
  ]);

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
    setDraftDistrict(groupName || 'الكل');
  };

  const handleNeighborhoodChange = (neighborhoodName: string) => {
    setDraftNeighborhood(neighborhoodName);
    if (neighborhoodName) {
      setDraftDistrict(neighborhoodName);
      if (!draftLocationGroup) {
        const foundGroup = neighborhoods.find(g => g.areas.includes(neighborhoodName));
        if (foundGroup) {
          setDraftLocationGroup(foundGroup.groupName);
        }
      }
    } else {
      setDraftDistrict(draftLocationGroup || 'الكل');
    }
  };

  const effectiveDraftDistrict = draftNeighborhood || draftLocationGroup || draftDistrict || 'الكل';

  // Count active draft filters
  const draftActiveCount = useMemo(() => {
    let count = 0;
    if (draftSortBy !== 'newest') count++;
    if (effectiveDraftDistrict && effectiveDraftDistrict !== 'الكل') count++;
    if (activeCategory !== 'roommates') {
      if (draftMinPrice.trim()) count++;
      if (draftMaxPrice.trim()) count++;
      if (draftRooms !== 'الكل') count++;
      if (draftFurnished !== 'الكل') count++;
      if (draftRentDuration !== 'الكل') count++;
      if (draftServices.length > 0) count++;
    }
    if (activeCategory === 'students' || activeCategory === 'roommates') {
      if (draftUniv !== 'الكل') count++;
      if (draftGender !== 'الكل') count++;
    }
    return count;
  }, [
    draftSortBy,
    effectiveDraftDistrict,
    activeCategory,
    draftMinPrice,
    draftMaxPrice,
    draftRooms,
    draftFurnished,
    draftRentDuration,
    draftServices,
    draftUniv,
    draftGender
  ]);

  // Preview count of matching items with draft filters
  const draftMatchingCount = useMemo(() => {
    if (activeCategory === 'roommates') {
      return roommates.filter(rm => {
        if (draftGender !== 'الكل') {
          const matchesGender = 
            (draftGender === 'ذكر' && (rm.gender === 'طالب' || rm.gender === 'ذكر')) ||
            (draftGender === 'أنثى' && (rm.gender === 'طالبة' || rm.gender === 'أنثى'));
          if (!matchesGender) return false;
        }
        if (draftUniv !== 'الكل') {
          const matchesUniv = rm.university && rm.university.toLowerCase().includes(draftUniv.toLowerCase());
          if (!matchesUniv) return false;
        }
        return true;
      }).length;
    }

    return housings.filter(h => {
      // 1. Category
      if (activeCategory === 'rent') {
        const hType = (h.type || '').trim();
        const isNotRent = hType.includes('بيع') || hType.includes('استثمار') || h.pricePeriod === 'إجمالي' || hType.includes('طالبات') || hType.includes('طلاب');
        if (isNotRent) return false;
      } else if (activeCategory === 'sale') {
        const hType = (h.type || '').trim();
        const isSale = hType.includes('بيع') || hType.includes('استثمار') || h.pricePeriod === 'إجمالي';
        if (!isSale) return false;
      } else if (activeCategory === 'students') {
        const isStudent = (h as any).isStudentHousing || (h.type && (h.type.includes('طالبات') || h.type.includes('طلاب')));
        if (!isStudent) return false;
      }

      // 2. District
      if (effectiveDraftDistrict && effectiveDraftDistrict !== 'الكل') {
        const matchesDistrict = (h.location || '').includes(effectiveDraftDistrict) || (h.district || '') === effectiveDraftDistrict;
        if (!matchesDistrict) return false;
      }

      // 3. Price
      if (draftMinPrice) {
        const min = parseFloat(draftMinPrice);
        if (!isNaN(min) && h.price < min) return false;
      }
      if (draftMaxPrice) {
        const max = parseFloat(draftMaxPrice);
        if (!isNaN(max) && h.price > max) return false;
      }

      // 4. University
      if (activeCategory === 'students' && draftUniv !== 'الكل') {
        const univStr = (h as any).nearestUniversity || h.university || '';
        const matchesUniv = univStr && univStr.toLowerCase().includes(draftUniv.toLowerCase());
        if (!matchesUniv) return false;
      }

      // 5. Gender
      if (activeCategory === 'students' && draftGender !== 'الكل') {
        const tGender = (h as any).targetGender || h.gender || (h.type?.includes('طالبات') ? 'طالبات' : h.type?.includes('طلاب') ? 'طلاب' : '');
        if (draftGender === 'ذكر' && tGender !== 'طلاب' && tGender !== 'شباب' && tGender !== 'ذكر') return false;
        if (draftGender === 'أنثى' && tGender !== 'طالبات' && tGender !== 'إناث' && tGender !== 'أنثى') return false;
      }

      // 6. Rooms
      if (draftRooms !== 'الكل') {
        const hRooms = (h as any).rooms || h.roomsCount || '';
        if (draftRooms === 'استوديو') {
          if (!hRooms.includes('استوديو') && !h.type?.includes('استوديو')) return false;
        } else if (draftRooms === 'غرفة') {
          if (hRooms !== 'غرفة' && hRooms !== '1') return false;
        } else if (draftRooms === 'غرفتين') {
          if (hRooms !== 'غرفتين' && hRooms !== '2') return false;
        } else if (draftRooms === '3 غرف') {
          if (hRooms !== '3 غرف' && hRooms !== '3') return false;
        } else if (draftRooms === '4+ غرف') {
          const num = parseInt(hRooms);
          if (isNaN(num) || num < 4) return false;
        }
      }

      // 7. Furnished
      if (draftFurnished !== 'الكل') {
        const hFurnished = h.isFurnished || '';
        if (draftFurnished === 'مفروش بالكامل') {
          if (hFurnished !== 'مفروش بالكامل' && !(h.services?.includes('مفروش بالكامل'))) return false;
        } else if (draftFurnished === 'شبه مفروش') {
          if (hFurnished !== 'شبه مفروش') return false;
        } else if (draftFurnished === 'غير مفروش') {
          if (hFurnished.includes('مفروش') && !hFurnished.includes('غير مفروش')) return false;
        }
      }

      // 8. Rent Duration
      if (activeCategory !== 'sale' && draftRentDuration !== 'الكل') {
        const hPeriod = h.pricePeriod || 'شهري';
        if (hPeriod !== draftRentDuration) return false;
      }

      // 9. Services
      if (draftServices.length > 0) {
        const hasAllServices = draftServices.every(srv => 
          h.services && h.services.some(s => s.toLowerCase().includes(srv.toLowerCase()))
        );
        if (!hasAllServices) return false;
      }

      return true;
    }).length;
  }, [
    housings,
    roommates,
    activeCategory,
    effectiveDraftDistrict,
    draftMinPrice,
    draftMaxPrice,
    draftUniv,
    draftGender,
    draftRooms,
    draftFurnished,
    draftRentDuration,
    draftServices
  ]);

  const handleClearDraftFilters = () => {
    setDraftSortBy('newest');
    setDraftLocationGroup('');
    setDraftNeighborhood('');
    setDraftDistrict('الكل');
    setDraftMinPrice('');
    setDraftMaxPrice('');
    setDraftRooms('الكل');
    setDraftFurnished('الكل');
    setDraftRentDuration('الكل');
    setDraftUniv('الكل');
    setDraftGender('الكل');
    setDraftServices([]);
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
      sortBy: draftSortBy,
      district: effectiveDraftDistrict,
      minPrice: draftMinPrice,
      maxPrice: draftMaxPrice,
      rooms: draftRooms,
      furnished: draftFurnished,
      rentDuration: draftRentDuration,
      nearestUniv: draftUniv,
      gender: draftGender,
      services: draftServices
    });
    onClose();
  };

  const toggleService = (srv: string) => {
    if (draftServices.includes(srv)) {
      setDraftServices(draftServices.filter(s => s !== srv));
    } else {
      setDraftServices([...draftServices, srv]);
    }
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
            <h3 className="font-bold text-stone-900 text-sm sm:text-base">خيارات البحث وفلترة العقارات</h3>
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
          
          {/* Section 1: الترتيب والفرز */}
          <div className="space-y-2">
            <label className="font-bold text-stone-800 flex items-center gap-1.5 text-xs sm:text-sm">
              <Sparkles className="h-4 w-4 text-[#1a4d2e]" />
              <span>الترتيب والفرز</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setDraftSortBy('newest')}
                className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer text-xs ${
                  draftSortBy === 'newest'
                    ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span>الأحدث أولاً</span>
              </button>

              {activeCategory !== 'roommates' && (
                <>
                  <button
                    type="button"
                    onClick={() => setDraftSortBy('price_asc')}
                    className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer text-xs ${
                      draftSortBy === 'price_asc'
                        ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <span>الأقل سعراً</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDraftSortBy('price_desc')}
                    className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer text-xs ${
                      draftSortBy === 'price_desc'
                        ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <span>الأعلى سعراً</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDraftSortBy('verified_first')}
                    className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer text-xs ${
                      draftSortBy === 'verified_first'
                        ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <span>الموثق والمميز</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Section 2: الموقع والحي والجامعة */}
          <div className="space-y-2.5 pt-2 border-t border-stone-100">
            <label className="font-bold text-stone-800 flex items-center gap-1.5 text-xs sm:text-sm">
              <MapPin className="h-4 w-4 text-[#1a4d2e]" />
              <span>الموقع والنطاق الجغرافي</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
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

            {/* University and Gender (for students / roommates) */}
            {(activeCategory === 'students' || activeCategory === 'roommates') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* Nearest University */}
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] font-bold text-stone-700 mb-1">
                    <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
                    <span>الجامعة الأقرب</span>
                  </label>
                  <div className="relative">
                    <select
                      value={draftUniv}
                      onChange={(e) => setDraftUniv(e.target.value)}
                      className="w-full h-10 pr-3 pl-8 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-800 focus:outline-none focus:border-[#1a4d2e] focus:bg-white transition-all appearance-none cursor-pointer"
                    >
                      <option value="الكل">كل المواقع والجامعات</option>
                      <option value="اليرموك">جامعة اليرموك</option>
                      <option value="العلوم والتكنولوجيا">جامعة العلوم والتكنولوجيا (JUST)</option>
                      <option value="إربد الأهلية">جامعة إربد الأهلية</option>
                      <option value="جدارا">جامعة جدارا</option>
                      <option value="أخرى / وسط المدينة">وسط البلد والمواصلات</option>
                    </select>
                    <ChevronDown className="h-4 w-4 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* Target Gender */}
                <div>
                  <label className="text-[11px] font-bold text-stone-700 mb-1 block">الجنس المستهدف</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { value: 'الكل', label: 'الكل' },
                      { value: 'ذكر', label: 'ذكور (طلاب)' },
                      { value: 'أنثى', label: 'إناث (طالبات)' }
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDraftGender(opt.value)}
                        className={`h-10 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                          draftGender === opt.value
                            ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: الميزانية والسعر (بالدينار الأردني) */}
          {activeCategory !== 'roommates' && (
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <label className="font-bold text-stone-800 flex items-center gap-1.5 text-xs sm:text-sm">
                <DollarSign className="h-4 w-4 text-[#1a4d2e]" />
                <span>نطاق السعر (بالدينار الأردني)</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-bold text-stone-600 mb-1 block">الحد الأدنى للسعر</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="من"
                    value={draftMinPrice}
                    onChange={(e) => setDraftMinPrice(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-[#1a4d2e] text-center focus:outline-none focus:border-[#1a4d2e] focus:bg-white transition-all"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-stone-600 mb-1 block">الحد الأقصى للسعر</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="إلى"
                    value={draftMaxPrice}
                    onChange={(e) => setDraftMaxPrice(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-[#1a4d2e] text-center focus:outline-none focus:border-[#1a4d2e] focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section 4: مواصفات العقار (التقسيم والتأثيث والمدة) */}
          {activeCategory !== 'roommates' && (
            <div className="space-y-3 pt-2 border-t border-stone-100">
              {/* Rooms count */}
              <div className="space-y-1.5">
                <label className="font-bold text-stone-800 flex items-center gap-1.5 text-xs">
                  <Layers className="h-3.5 w-3.5 text-[#1a4d2e]" />
                  <span>التقسيم والغرف</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {['الكل', 'استوديو', 'غرفة', 'غرفتين', '3 غرف', '4+ غرف'].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setDraftRooms(opt)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        draftRooms === opt
                          ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <span>{opt}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Furnishing condition */}
              <div className="space-y-1.5">
                <label className="font-bold text-stone-800 flex items-center gap-1.5 text-xs">
                  <Building2 className="h-3.5 w-3.5 text-[#1a4d2e]" />
                  <span>حالة التأثيث</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { value: 'الكل', label: 'الكل' },
                    { value: 'مفروش بالكامل', label: 'مفروش بالكامل' },
                    { value: 'شبه مفروش', label: 'شبه مفروش' },
                    { value: 'غير مفروش', label: 'غير مفروش' }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDraftFurnished(opt.value)}
                      className={`p-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        draftFurnished === opt.value
                          ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rent duration (for Rent & Students) */}
              {(activeCategory === 'rent' || activeCategory === 'students') && (
                <div className="space-y-1.5">
                  <label className="font-bold text-stone-800 flex items-center gap-1.5 text-xs">
                    <Calendar className="h-3.5 w-3.5 text-[#1a4d2e]" />
                    <span>مدة الإيجار</span>
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {[
                      { value: 'الكل', label: 'الكل' },
                      { value: 'شهري', label: 'شهري' },
                      { value: 'فصلي', label: 'فصلي' },
                      { value: 'سنوي', label: 'سنوي' },
                      { value: 'يومي', label: 'يومي' }
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDraftRentDuration(opt.value)}
                        className={`p-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                          draftRentDuration === opt.value
                            ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 5: المرافق والخدمات المتاحة */}
          {activeCategory !== 'roommates' && (
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <label className="font-bold text-stone-800 flex items-center gap-1.5 text-xs sm:text-sm">
                  <SlidersHorizontal className="h-4 w-4 text-[#1a4d2e]" />
                  <span>المرافق والتجهيزات المتوفرة</span>
                </label>
                {draftServices.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDraftServices([])}
                    className="text-[11px] font-bold text-stone-500 hover:text-[#1a4d2e] cursor-pointer"
                  >
                    مسح التحديد
                  </button>
                )}
              </div>

              {/* Group 1: أساسيات البناء */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-stone-500 block">أساسيات البناء والموقع</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    'مصعد',
                    'تكييف',
                    'تدفئة',
                    'كراج سيارات',
                    'حارس',
                    'قريب من المواصلات',
                    'كاميرات حماية',
                    'خزان ماء إضافي'
                  ].map((srv) => {
                    const isChecked = draftServices.includes(srv);
                    return (
                      <button
                        key={srv}
                        type="button"
                        onClick={() => toggleService(srv)}
                        className={`p-2 rounded-xl text-xs font-bold border transition-all text-right flex items-center justify-between gap-1.5 cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-black'
                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <span>{srv}</span>
                        {isChecked && <Check className="h-3.5 w-3.5 text-[#1a4d2e] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Group 2: الأجهزة والتأثيث */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-stone-500 block">الأجهزة والفرش الداخلي</span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {[
                    'إنترنت فايبر',
                    'شرفة / بلكونة',
                    'غسالة',
                    'ثلاجة',
                    'سخان شمسي / كيزر',
                    'تلفزيون ذكي',
                    'غاز وطباخ',
                    'مكتب للدراسة',
                    'قريب من سوبرماركت'
                  ].map((srv) => {
                    const isChecked = draftServices.includes(srv);
                    return (
                      <button
                        key={srv}
                        type="button"
                        onClick={() => toggleService(srv)}
                        className={`p-2 rounded-xl text-xs font-bold border transition-all text-right flex items-center justify-between gap-1.5 cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-black'
                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <span>{srv}</span>
                        {isChecked && <Check className="h-3.5 w-3.5 text-[#1a4d2e] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

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
            <span>تطبيق الفلترة (عرض {draftMatchingCount} عقار)</span>
          </button>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
