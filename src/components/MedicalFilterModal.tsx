import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  SlidersHorizontal, 
  X, 
  RotateCcw, 
  Sparkles, 
  Star, 
  Clock, 
  MapPin, 
  Compass, 
  Stethoscope, 
  Layers, 
  ShieldCheck, 
  Heart, 
  CalendarCheck, 
  ChevronDown
} from 'lucide-react';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { Business } from '../types';
import { POPULAR_JORDANIAN_INSURANCES } from '../lib/medicalHelper';
import { matchesMedicalSpecialty } from '../pages/Medical';

export interface AppliedMedicalFilters {
  sortBy: 'default' | 'rating' | 'trusted';
  specialtyId: string;
  subspecialty: string;
  region: string;
  insuranceName: string;
  openNowOnly: boolean;
  directInsuranceOnly: boolean;
  appointmentOnly: boolean;
  favoritesOnly: boolean;
}

interface MedicalFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Active applied filters
  sortBy: 'default' | 'rating' | 'trusted';
  specialtyId: string;
  subspecialty: string;
  region: string;
  insuranceName: string;
  openNowOnly: boolean;
  directInsuranceOnly: boolean;
  appointmentOnly: boolean;
  favoritesOnly: boolean;
  userFavorites: string[];
  onApplyFilters: (filters: AppliedMedicalFilters) => void;
  // Matching preview
  businesses: Business[];
}

export function MedicalFilterModal({
  isOpen,
  onClose,
  sortBy,
  specialtyId,
  subspecialty,
  region,
  insuranceName,
  openNowOnly,
  directInsuranceOnly,
  appointmentOnly,
  favoritesOnly,
  userFavorites,
  onApplyFilters,
  businesses
}: MedicalFilterModalProps) {
  const { medicalCategories, neighborhoods } = useSystemSettings();

  // Internal draft staging state
  const [draftSortBy, setDraftSortBy] = useState<'default' | 'rating' | 'trusted'>(sortBy);
  const [draftSpecialtyId, setDraftSpecialtyId] = useState<string>(specialtyId);
  const [draftSubspecialty, setDraftSubspecialty] = useState<string>(subspecialty);
  const [draftLocationGroup, setDraftLocationGroup] = useState<string>('');
  const [draftNeighborhood, setDraftNeighborhood] = useState<string>('');
  const [draftInsurance, setDraftInsurance] = useState<string>(insuranceName);
  const [draftOpenNow, setDraftOpenNow] = useState<boolean>(openNowOnly);
  const [draftDirectInsurance, setDraftDirectInsurance] = useState<boolean>(directInsuranceOnly);
  const [draftAppointment, setDraftAppointment] = useState<boolean>(appointmentOnly);
  const [draftFavorites, setDraftFavorites] = useState<boolean>(favoritesOnly);

  // Sync draft state with incoming active filters whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setDraftSortBy(sortBy);
      setDraftSpecialtyId(specialtyId);
      setDraftSubspecialty(subspecialty);
      setDraftInsurance(insuranceName);
      setDraftOpenNow(openNowOnly);
      setDraftDirectInsurance(directInsuranceOnly);
      setDraftAppointment(appointmentOnly);
      setDraftFavorites(favoritesOnly);

      if (!region || region === 'الكل') {
        setDraftLocationGroup('');
        setDraftNeighborhood('');
      } else {
        const foundByArea = neighborhoods.find(g => g.areas.includes(region));
        if (foundByArea) {
          setDraftLocationGroup(foundByArea.groupName);
          setDraftNeighborhood(region);
        } else {
          const foundByGroup = neighborhoods.find(g => g.groupName === region);
          if (foundByGroup) {
            setDraftLocationGroup(region);
            setDraftNeighborhood('');
          } else {
            setDraftLocationGroup('');
            setDraftNeighborhood(region);
          }
        }
      }
    }
  }, [
    isOpen,
    sortBy,
    specialtyId,
    subspecialty,
    region,
    insuranceName,
    openNowOnly,
    directInsuranceOnly,
    appointmentOnly,
    favoritesOnly,
    neighborhoods
  ]);

  const selectedSpecObj = draftSpecialtyId ? medicalCategories.find(s => s.id === draftSpecialtyId) : null;
  const currentSubspecialties = selectedSpecObj?.subspecialties || [];

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

  // Count active draft filters
  const draftActiveCount = useMemo(() => {
    let count = 0;
    if (draftSortBy !== 'default') count++;
    if (draftSpecialtyId) count++;
    if (draftSubspecialty) count++;
    if (effectiveDraftRegion) count++;
    if (draftInsurance) count++;
    if (draftOpenNow) count++;
    if (draftDirectInsurance) count++;
    if (draftAppointment) count++;
    if (draftFavorites) count++;
    return count;
  }, [
    draftSortBy,
    draftSpecialtyId,
    draftSubspecialty,
    effectiveDraftRegion,
    draftInsurance,
    draftOpenNow,
    draftDirectInsurance,
    draftAppointment,
    draftFavorites
  ]);

  // Preview count of matching facilities with draft filters
  const draftMatchingCount = useMemo(() => {
    return businesses.filter(b => {
      // Location match
      if (effectiveDraftRegion) {
        const matchesRegion = b.district === effectiveDraftRegion || (b.address || '').includes(effectiveDraftRegion) || b.region === effectiveDraftRegion;
        if (!matchesRegion) return false;
      }

      // Specialty match
      if (draftSpecialtyId && selectedSpecObj) {
        if (!matchesMedicalSpecialty(b, draftSpecialtyId, selectedSpecObj, draftSubspecialty || null)) {
          return false;
        }
      }

      // Insurance match
      if (draftInsurance) {
        const bInsurances = b.medicalProfile?.insurances || [];
        const hasIns = bInsurances.some(ins => {
          const insName = typeof ins === 'string' ? ins : ins.name;
          return insName.includes(draftInsurance) || draftInsurance.includes(insName);
        }) || (b.description || '').includes(draftInsurance);
        if (!hasIns) return false;
      }

      // Direct insurance toggle
      if (draftDirectInsurance) {
        const hasDirect = (b.medicalProfile?.insurances || []).some(ins => {
          if (typeof ins === 'string') return true;
          return ins.isDirectBilling;
        }) || (b.description || '').includes('تأمين');
        if (!hasDirect) return false;
      }

      // Favorites toggle
      if (draftFavorites && !userFavorites.includes(b.id)) {
        return false;
      }

      return true;
    }).length;
  }, [
    businesses,
    effectiveDraftRegion,
    draftSpecialtyId,
    selectedSpecObj,
    draftSubspecialty,
    draftInsurance,
    draftDirectInsurance,
    draftFavorites,
    userFavorites
  ]);

  const handleClearDraftFilters = () => {
    setDraftSortBy('default');
    setDraftSpecialtyId('');
    setDraftSubspecialty('');
    setDraftLocationGroup('');
    setDraftNeighborhood('');
    setDraftInsurance('');
    setDraftOpenNow(false);
    setDraftDirectInsurance(false);
    setDraftAppointment(false);
    setDraftFavorites(false);
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
      specialtyId: draftSpecialtyId,
      subspecialty: draftSubspecialty,
      region: effectiveDraftRegion,
      insuranceName: draftInsurance,
      openNowOnly: draftOpenNow,
      directInsuranceOnly: draftDirectInsurance,
      appointmentOnly: draftAppointment,
      favoritesOnly: draftFavorites
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
            <SlidersHorizontal className="h-4.5 w-4.5 text-blue-600" />
            <h3 className="font-bold text-stone-900 text-sm sm:text-base">تصفية نتائج البحث والرعاية الطبية</h3>
            {draftActiveCount > 0 && (
              <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-600 text-white rounded-full">
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
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span>الترتيب والفرز</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDraftSortBy('default')}
                className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs ${
                  draftSortBy === 'default'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span>الافتراضي</span>
              </button>

              <button
                type="button"
                onClick={() => setDraftSortBy('rating')}
                className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs ${
                  draftSortBy === 'rating'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <Star className={`h-3.5 w-3.5 ${draftSortBy === 'rating' ? 'text-amber-300' : 'text-amber-500'}`} />
                <span>الأعلى تقييماً</span>
              </button>

              <button
                type="button"
                onClick={() => setDraftSortBy('trusted')}
                className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs ${
                  draftSortBy === 'trusted'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <ShieldCheck className={`h-3.5 w-3.5 ${draftSortBy === 'trusted' ? 'text-white' : 'text-blue-500'}`} />
                <span>الأكثر ثقة</span>
              </button>
            </div>
          </div>

          {/* Section 2: الاختصاص والموقع الجغرافي (Grid 2x2) */}
          <div className="space-y-2.5 pt-2 border-t border-stone-100">
            <label className="font-bold text-stone-800 flex items-center gap-1.5 text-xs sm:text-sm">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span>الاختصاص والنطاق الجغرافي</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              {/* Specialty */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-stone-700 mb-1">
                  <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
                  <span>الاختصاص الطبي</span>
                </label>
                <div className="relative">
                  <select
                    value={draftSpecialtyId}
                    onChange={(e) => {
                      setDraftSpecialtyId(e.target.value);
                      setDraftSubspecialty('');
                    }}
                    className="w-full h-10 pr-3 pl-8 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="">كافة الاختصاصات الطبية</option>
                    {medicalCategories.map((spec) => (
                      <option key={spec.id} value={spec.id}>
                        {spec.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="h-4 w-4 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Subspecialty */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-stone-700 mb-1">
                  <Layers className="h-3.5 w-3.5 text-blue-600" />
                  <span>التخصص الدقيق</span>
                </label>
                <div className="relative">
                  <select
                    value={draftSubspecialty}
                    disabled={!draftSpecialtyId || currentSubspecialties.length === 0}
                    onChange={(e) => setDraftSubspecialty(e.target.value)}
                    className={`w-full h-10 pr-3 pl-8 rounded-xl border text-xs font-bold transition-all appearance-none cursor-pointer ${
                      !draftSpecialtyId || currentSubspecialties.length === 0
                        ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                        : 'bg-stone-50 text-stone-800 border-stone-200 focus:outline-none focus:border-blue-600 focus:bg-white'
                    }`}
                  >
                    <option value="">
                      {!draftSpecialtyId 
                        ? 'اختر الاختصاص أولاً' 
                        : currentSubspecialties.length === 0 
                          ? 'لا توجد تخصصات دقيقة' 
                          : 'كافة التخصصات الدقيقة'}
                    </option>
                    {currentSubspecialties.map((sub) => (
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
                  <MapPin className="h-3.5 w-3.5 text-blue-600" />
                  <span>المنطقة أو اللواء</span>
                </label>
                <div className="relative">
                  <select
                    value={draftLocationGroup}
                    onChange={(e) => handleLocationGroupChange(e.target.value)}
                    className="w-full h-10 pr-3 pl-8 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-all appearance-none cursor-pointer"
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
                  <Compass className="h-3.5 w-3.5 text-blue-600" />
                  <span>الحي أو الشارع</span>
                </label>
                <div className="relative">
                  <select
                    value={draftNeighborhood}
                    onChange={(e) => handleNeighborhoodChange(e.target.value)}
                    className="w-full h-10 pr-3 pl-8 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-all appearance-none cursor-pointer"
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

          {/* Section 3: شركات التأمين الطبي المعتمدة */}
          <div className="space-y-1.5 pt-2 border-t border-stone-100">
            <label className="flex items-center gap-1.5 text-[11px] font-bold text-stone-700 mb-1">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
              <span>شركات التأمين الطبي المعتمدة</span>
            </label>
            <div className="relative">
              <select
                value={draftInsurance}
                onChange={(e) => setDraftInsurance(e.target.value)}
                className="w-full h-10 pr-3 pl-8 rounded-xl bg-stone-50 border border-stone-200 text-xs font-bold text-stone-800 focus:outline-none focus:border-blue-600 focus:bg-white transition-all appearance-none cursor-pointer"
              >
                <option value="">جميع شركات ونقابات التأمين الطبي</option>
                {POPULAR_JORDANIAN_INSURANCES.map((ins) => (
                  <option key={ins.name} value={ins.name}>
                    {ins.name} ({ins.type})
                  </option>
                ))}
              </select>
              <ChevronDown className="h-4 w-4 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Section 4: الحالة والجاهزية */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <label className="font-bold text-stone-800 flex items-center gap-1.5 text-xs sm:text-sm">
              <SlidersHorizontal className="h-4 w-4 text-blue-600" />
              <span>الحالة والجاهزية</span>
            </label>

            <div className="space-y-2">
              {/* Open Now Toggle */}
              <div 
                onClick={() => setDraftOpenNow(!draftOpenNow)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all select-none ${
                  draftOpenNow ? 'bg-blue-50/70 border-blue-200' : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-bold text-stone-800">مفتوح الآن واستقبال طوارئ</span>
                </div>
                <div 
                  className={`w-11 h-6 rounded-full transition-colors duration-200 p-0.5 shrink-0 ${
                    draftOpenNow ? 'bg-blue-600' : 'bg-stone-300'
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

              {/* Direct Insurance Toggle */}
              <div 
                onClick={() => setDraftDirectInsurance(!draftDirectInsurance)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all select-none ${
                  draftDirectInsurance ? 'bg-emerald-50/70 border-emerald-200' : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold text-stone-800">يقبل التأمين الصحي المباشر</span>
                </div>
                <div 
                  className={`w-11 h-6 rounded-full transition-colors duration-200 p-0.5 shrink-0 ${
                    draftDirectInsurance ? 'bg-blue-600' : 'bg-stone-300'
                  }`}
                  dir="ltr"
                >
                  <div 
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      draftDirectInsurance ? 'translate-x-5' : 'translate-x-0'
                    }`} 
                  />
                </div>
              </div>

              {/* Appointment Available Toggle */}
              <div 
                onClick={() => setDraftAppointment(!draftAppointment)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all select-none ${
                  draftAppointment ? 'bg-purple-50/70 border-purple-200' : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-bold text-stone-800">يتوفر حجز مسبق واستشارة</span>
                </div>
                <div 
                  className={`w-11 h-6 rounded-full transition-colors duration-200 p-0.5 shrink-0 ${
                    draftAppointment ? 'bg-blue-600' : 'bg-stone-300'
                  }`}
                  dir="ltr"
                >
                  <div 
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      draftAppointment ? 'translate-x-5' : 'translate-x-0'
                    }`} 
                  />
                </div>
              </div>

              {/* Favorites Toggle */}
              <div 
                onClick={() => setDraftFavorites(!draftFavorites)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all select-none ${
                  draftFavorites ? 'bg-rose-50/70 border-rose-200' : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Heart className={`h-4 w-4 ${draftFavorites ? 'fill-rose-500 text-rose-500' : 'text-rose-500'}`} />
                  <span className="text-xs font-bold text-stone-800">العيادات والمراكز في المفضلة</span>
                </div>
                <div 
                  className={`w-11 h-6 rounded-full transition-colors duration-200 p-0.5 shrink-0 ${
                    draftFavorites ? 'bg-rose-600' : 'bg-stone-300'
                  }`}
                  dir="ltr"
                >
                  <div 
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      draftFavorites ? 'translate-x-5' : 'translate-x-0'
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
            className="h-11 sm:h-12 flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm shadow-sm active:scale-98 transition-all cursor-pointer flex items-center justify-center border border-transparent text-center"
          >
            <span>تطبيق الفلترة (عرض {draftMatchingCount} نتيجة)</span>
          </button>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
