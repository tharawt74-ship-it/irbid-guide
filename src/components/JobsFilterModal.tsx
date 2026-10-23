import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  SlidersHorizontal, 
  X, 
  RotateCcw, 
  Sparkles, 
  Clock, 
  MapPin, 
  Compass, 
  Briefcase, 
  Layers, 
  Banknote, 
  GraduationCap, 
  Flame, 
  ChevronDown,
  CheckCircle2,
  Building,
  Laptop
} from 'lucide-react';
import { useSystemSettings } from '../contexts/SystemSettingsContext';
import { JobOffer } from '../types';

export interface AppliedJobsFilters {
  sortTab: 'all' | 'recent' | 'salary' | 'urgent';
  category: string;
  subCategory: string;
  region: string;
  jobType: string;
  workplaceType?: string;
  noExperienceOnly: boolean;
  salaryDisclosedOnly: boolean;
  studentFriendlyOnly: boolean;
  urgentOnly: boolean;
}

interface JobsFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Active applied filters
  sortTab: 'all' | 'recent' | 'salary' | 'urgent';
  category: string;
  subCategory: string;
  region: string;
  jobType: string;
  workplaceType?: string;
  noExperienceOnly: boolean;
  salaryDisclosedOnly: boolean;
  studentFriendlyOnly: boolean;
  urgentOnly: boolean;
  onApplyFilters: (filters: AppliedJobsFilters) => void;
  // Matching preview
  jobs: JobOffer[];
}

export const JOB_TYPE_OPTIONS = [
  'الكل',
  'دوام كامل',
  'دوام جزئي',
  'مناسب للطلاب',
  'عن بعد'
];

export function JobsFilterModal({
  isOpen,
  onClose,
  sortTab,
  category,
  subCategory,
  region,
  jobType,
  workplaceType = 'الكل',
  noExperienceOnly,
  salaryDisclosedOnly,
  studentFriendlyOnly,
  urgentOnly,
  onApplyFilters,
  jobs
}: JobsFilterModalProps) {
  const { categories, neighborhoods } = useSystemSettings();

  // Internal draft staging state
  const [draftSortTab, setDraftSortTab] = useState<'all' | 'recent' | 'salary' | 'urgent'>(sortTab);
  const [draftCategory, setDraftCategory] = useState<string>(category);
  const [draftSubCategory, setDraftSubCategory] = useState<string>(subCategory);
  const [draftLocationGroup, setDraftLocationGroup] = useState<string>('');
  const [draftNeighborhood, setDraftNeighborhood] = useState<string>('');
  const [draftJobType, setDraftJobType] = useState<string>(jobType || 'الكل');
  const [draftWorkplaceType, setDraftWorkplaceType] = useState<string>(workplaceType || 'الكل');
  const [draftNoExperience, setDraftNoExperience] = useState<boolean>(noExperienceOnly);
  const [draftSalaryDisclosed, setDraftSalaryDisclosed] = useState<boolean>(salaryDisclosedOnly);
  const [draftStudentFriendly, setDraftStudentFriendly] = useState<boolean>(studentFriendlyOnly);
  const [draftUrgent, setDraftUrgent] = useState<boolean>(urgentOnly);

  // Sync draft state with incoming active filters whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setDraftSortTab(sortTab);
      setDraftCategory(category);
      setDraftSubCategory(subCategory);
      setDraftJobType(jobType || 'الكل');
      setDraftWorkplaceType(workplaceType || 'الكل');
      setDraftNoExperience(noExperienceOnly);
      setDraftSalaryDisclosed(salaryDisclosedOnly);
      setDraftStudentFriendly(studentFriendlyOnly);
      setDraftUrgent(urgentOnly);

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
    sortTab,
    category,
    subCategory,
    region,
    jobType,
    workplaceType,
    noExperienceOnly,
    salaryDisclosedOnly,
    studentFriendlyOnly,
    urgentOnly,
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

  // Count active draft filters
  const draftActiveCount = useMemo(() => {
    let count = 0;
    if (draftSortTab !== 'all') count++;
    if (draftCategory && draftCategory !== 'الكل') count++;
    if (draftSubCategory) count++;
    if (effectiveDraftRegion) count++;
    if (draftJobType && draftJobType !== 'الكل') count++;
    if (draftWorkplaceType && draftWorkplaceType !== 'الكل') count++;
    if (draftNoExperience) count++;
    if (draftSalaryDisclosed) count++;
    if (draftStudentFriendly) count++;
    if (draftUrgent) count++;
    return count;
  }, [
    draftSortTab,
    draftCategory,
    draftSubCategory,
    effectiveDraftRegion,
    draftJobType,
    draftWorkplaceType,
    draftNoExperience,
    draftSalaryDisclosed,
    draftStudentFriendly,
    draftUrgent
  ]);

  // Preview count of matching jobs with draft filters
  const draftMatchingCount = useMemo(() => {
    return jobs.filter(j => {
      // Category match
      if (draftCategory && draftCategory !== 'الكل') {
        const cat = j.category || j.businessCategory || '';
        const sub = j.subCategory || j.businessSubCategory || '';
        const validSubCats = categories.find(c => c.name === draftCategory)?.subcategories || [];
        if (draftSubCategory) {
          if (cat !== draftSubCategory && sub !== draftSubCategory) return false;
        } else {
          if (cat !== draftCategory && !validSubCats.includes(cat) && !validSubCats.includes(sub)) return false;
        }
      }

      // Region match
      if (effectiveDraftRegion) {
        const reg = effectiveDraftRegion.toLowerCase();
        const loc = (j.location || '').toLowerCase();
        const bDist = (j.businessDistrict || '').toLowerCase();
        const bAddr = (j.businessAddress || '').toLowerCase();
        const matches = loc.includes(reg) || bDist.includes(reg) || bAddr.includes(reg);
        if (!matches) return false;
      }

      // Job Type match
      if (draftJobType && draftJobType !== 'الكل') {
        if (j.jobType !== draftJobType) return false;
      }

      // Workplace Type match
      if (draftWorkplaceType && draftWorkplaceType !== 'الكل') {
        const desc = (j.description || '').toLowerCase();
        if (draftWorkplaceType === 'عن بعد' && !desc.includes('عن بعد') && j.jobType !== 'عن بعد') return false;
        if (draftWorkplaceType === 'ميداني' && !desc.includes('ميداني')) return false;
        if (draftWorkplaceType === 'مكتبي' && desc.includes('ميداني')) return false;
      }

      // Toggles
      if (draftNoExperience) {
        const desc = (j.description || '').toLowerCase();
        const exp = (j.experienceLevel || '').toLowerCase();
        const req = (j.requirements || []).join(' ').toLowerCase();
        const allText = `${desc} ${exp} ${req}`;
        const hasNoExp = allText.includes('لا يشترط') || allText.includes('بدون خبرة') || allText.includes('حديث التخرج') || exp.includes('مبتدئ');
        if (!hasNoExp) return false;
      }

      if (draftSalaryDisclosed) {
        const sal = (j.salary || '').trim();
        if (!sal || sal === 'يحدد لاحقاً' || sal === 'غير محدد') return false;
      }

      if (draftStudentFriendly) {
        const typeMatch = j.jobType === 'مناسب للطلاب' || (j.description || '').includes('طلاب');
        if (!typeMatch) return false;
      }

      if (draftUrgent) {
        if (!j.isUrgent) return false;
      }

      return true;
    }).length;
  }, [
    jobs,
    draftCategory,
    draftSubCategory,
    effectiveDraftRegion,
    draftJobType,
    draftWorkplaceType,
    draftNoExperience,
    draftSalaryDisclosed,
    draftStudentFriendly,
    draftUrgent,
    categories
  ]);

  const handleClearDraftFilters = () => {
    setDraftSortTab('all');
    setDraftCategory('الكل');
    setDraftSubCategory('');
    setDraftLocationGroup('');
    setDraftNeighborhood('');
    setDraftJobType('الكل');
    setDraftWorkplaceType('الكل');
    setDraftNoExperience(false);
    setDraftSalaryDisclosed(false);
    setDraftStudentFriendly(false);
    setDraftUrgent(false);
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
      sortTab: draftSortTab,
      category: draftCategory,
      subCategory: draftSubCategory,
      region: effectiveDraftRegion,
      jobType: draftJobType,
      workplaceType: draftWorkplaceType,
      noExperienceOnly: draftNoExperience,
      salaryDisclosedOnly: draftSalaryDisclosed,
      studentFriendlyOnly: draftStudentFriendly,
      urgentOnly: draftUrgent
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
            <h3 className="font-bold text-stone-900 text-sm sm:text-base">تصفية الوظائف والشواغر</h3>
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
                onClick={() => setDraftSortTab('all')}
                className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs ${
                  draftSortTab === 'all'
                    ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <span>الكل</span>
              </button>

              <button
                type="button"
                onClick={() => setDraftSortTab('recent')}
                className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs ${
                  draftSortTab === 'recent'
                    ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <Clock className={`h-3.5 w-3.5 ${draftSortTab === 'recent' ? 'text-white' : 'text-blue-500'}`} />
                <span>الأحدث</span>
              </button>

              <button
                type="button"
                onClick={() => setDraftSortTab('salary')}
                className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs ${
                  draftSortTab === 'salary'
                    ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <Banknote className={`h-3.5 w-3.5 ${draftSortTab === 'salary' ? 'text-amber-300' : 'text-emerald-600'}`} />
                <span>رواتب معلنة</span>
              </button>

              <button
                type="button"
                onClick={() => setDraftSortTab('urgent')}
                className={`p-2.5 rounded-xl font-bold border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs ${
                  draftSortTab === 'urgent'
                    ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <Flame className={`h-3.5 w-3.5 ${draftSortTab === 'urgent' ? 'text-amber-300' : 'text-rose-500'}`} />
                <span>عاجلة وفورية</span>
              </button>
            </div>
          </div>

          {/* Section 2: المجال المهني والنطاق الجغرافي (Grid 2x2) */}
          <div className="space-y-2.5 pt-2 border-t border-stone-100">
            <label className="font-bold text-stone-800 flex items-center gap-1.5 text-xs sm:text-sm">
              <MapPin className="h-4 w-4 text-[#1a4d2e]" />
              <span>المجال المهني والنطاق الجغرافي</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              
              {/* Domain / Category */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-stone-700 mb-1">
                  <Briefcase className="h-3.5 w-3.5 text-[#1a4d2e]" />
                  <span>المجال والمهنة</span>
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
                    <option value="الكل">كافة المجالات والمهن</option>
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
                  <Layers className="h-3.5 w-3.5 text-[#1a4d2e]" />
                  <span>التخصص المهني الدقيق</span>
                </label>
                <div className="relative">
                  <select
                    value={draftSubCategory}
                    disabled={draftCategory === 'الكل' || currentSubcategories.length === 0}
                    onChange={(e) => setDraftSubCategory(e.target.value)}
                    className={`w-full h-10 pr-3 pl-8 rounded-xl border text-xs font-bold transition-all appearance-none cursor-pointer ${
                      draftCategory === 'الكل' || currentSubcategories.length === 0
                        ? 'bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed'
                        : 'bg-stone-50 text-stone-800 border-stone-200 focus:outline-none focus:border-[#1a4d2e] focus:bg-white'
                    }`}
                  >
                    <option value="">
                      {draftCategory === 'الكل' 
                        ? 'اختر المجال أولاً' 
                        : currentSubcategories.length === 0 
                          ? 'لا توجد تخصصات فرعية' 
                          : 'كافة التخصصات الفرعية'}
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

              {/* Location Group */}
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

          {/* Section 3: نوع الدوام وطبيعة العمل */}
          <div className="space-y-3 pt-2 border-t border-stone-100">
            {/* Job Type */}
            <div className="space-y-1.5">
              <label className="font-bold text-stone-800 flex items-center gap-1.5 text-xs">
                <Clock className="h-3.5 w-3.5 text-[#1a4d2e]" />
                <span>نوع الدوام</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                {JOB_TYPE_OPTIONS.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDraftJobType(type)}
                    className={`p-2 rounded-xl font-bold border text-center transition-all cursor-pointer text-xs ${
                      draftJobType === type
                        ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <span>{type}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Workplace Environment */}
            <div className="space-y-1.5">
              <label className="font-bold text-stone-800 flex items-center gap-1.5 text-xs">
                <Building className="h-3.5 w-3.5 text-[#1a4d2e]" />
                <span>بيئة ومكان العمل</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'الكل', label: 'الكل' },
                  { id: 'مكتبي', label: 'مكتبي / مقر العمل' },
                  { id: 'عن بعد', label: 'عن بعد / من المنزل' }
                ].map((wp) => (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => setDraftWorkplaceType(wp.id)}
                    className={`p-2 rounded-xl font-bold border text-center transition-all cursor-pointer text-xs ${
                      draftWorkplaceType === wp.id
                        ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <span>{wp.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 4: المتطلبات ومستوى الخبرة */}
          <div className="space-y-2 pt-2 border-t border-stone-100">
            <label className="font-bold text-stone-800 flex items-center gap-1.5 text-xs sm:text-sm">
              <SlidersHorizontal className="h-4 w-4 text-[#1a4d2e]" />
              <span>المتطلبات ومستوى الخبرة</span>
            </label>

            <div className="space-y-2">
              {/* No Experience Required Toggle */}
              <div 
                onClick={() => setDraftNoExperience(!draftNoExperience)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all select-none ${
                  draftNoExperience ? 'bg-emerald-50/70 border-emerald-200' : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold text-stone-800">لا يشترط خبرة سابقة (مبتدئ أو حديث تخرج)</span>
                </div>
                <div 
                  className={`w-11 h-6 rounded-full transition-colors duration-200 p-0.5 shrink-0 ${
                    draftNoExperience ? 'bg-[#1a4d2e]' : 'bg-stone-300'
                  }`}
                  dir="ltr"
                >
                  <div 
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      draftNoExperience ? 'translate-x-5' : 'translate-x-0'
                    }`} 
                  />
                </div>
              </div>

              {/* Salary Disclosed Toggle */}
              <div 
                onClick={() => setDraftSalaryDisclosed(!draftSalaryDisclosed)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all select-none ${
                  draftSalaryDisclosed ? 'bg-amber-50/70 border-amber-200' : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-bold text-stone-800">شواغر برواتب معلنة ومحددة</span>
                </div>
                <div 
                  className={`w-11 h-6 rounded-full transition-colors duration-200 p-0.5 shrink-0 ${
                    draftSalaryDisclosed ? 'bg-[#1a4d2e]' : 'bg-stone-300'
                  }`}
                  dir="ltr"
                >
                  <div 
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      draftSalaryDisclosed ? 'translate-x-5' : 'translate-x-0'
                    }`} 
                  />
                </div>
              </div>

              {/* Student Friendly Toggle */}
              <div 
                onClick={() => setDraftStudentFriendly(!draftStudentFriendly)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all select-none ${
                  draftStudentFriendly ? 'bg-blue-50/70 border-blue-200' : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-bold text-stone-800">مناسبة للطلاب الجامعيين (ساعات مرنة)</span>
                </div>
                <div 
                  className={`w-11 h-6 rounded-full transition-colors duration-200 p-0.5 shrink-0 ${
                    draftStudentFriendly ? 'bg-[#1a4d2e]' : 'bg-stone-300'
                  }`}
                  dir="ltr"
                >
                  <div 
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      draftStudentFriendly ? 'translate-x-5' : 'translate-x-0'
                    }`} 
                  />
                </div>
              </div>

              {/* Urgent Jobs Toggle */}
              <div 
                onClick={() => setDraftUrgent(!draftUrgent)}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all select-none ${
                  draftUrgent ? 'bg-rose-50/70 border-rose-200' : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-rose-500" />
                  <span className="text-xs font-bold text-stone-800">توظيف عاجل وبدء فوري</span>
                </div>
                <div 
                  className={`w-11 h-6 rounded-full transition-colors duration-200 p-0.5 shrink-0 ${
                    draftUrgent ? 'bg-[#1a4d2e]' : 'bg-stone-300'
                  }`}
                  dir="ltr"
                >
                  <div 
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                      draftUrgent ? 'translate-x-5' : 'translate-x-0'
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
            <span>تطبيق الفلترة (عرض {draftMatchingCount} شاغر)</span>
          </button>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
