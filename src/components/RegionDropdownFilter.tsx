import { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Search, X, Check, Building2, Trees, Sparkles } from 'lucide-react';
import { IRBID_REGIONS_CATEGORIZED } from '../lib/categories';

interface RegionDropdownFilterProps {
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
}

export function RegionDropdownFilter({ selectedRegion, onSelectRegion }: RegionDropdownFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const totalAreasCount = IRBID_REGIONS_CATEGORIZED.reduce((acc, g) => acc + g.areas.length, 0);

  // Filter groups according to search query
  const filteredGroups = IRBID_REGIONS_CATEGORIZED.map(group => {
    const matchingAreas = group.areas.filter(area =>
      area.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );
    return {
      ...group,
      areas: matchingAreas
    };
  }).filter(group => group.areas.length > 0);

  const handleSelect = (region: string) => {
    onSelectRegion(region === 'الكل' ? '' : region);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className={`bg-white rounded-2xl p-4 sm:p-5 border border-[#e5e1da] shadow-xs space-y-3 relative ${isOpen ? 'z-50' : 'z-20'}`}>
      
      {/* Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
            <MapPin className="h-5 w-5 text-[#ff9f1c]" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm sm:text-base text-[#2d2a26] flex items-center gap-1.5">
              <span>تحديد الشارع أو الحي أو القرية في إربد</span>
              <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                شامل ({totalAreasCount}+ منطقة)
              </span>
            </h3>
            <p className="text-[11px] text-stone-500">اختر المنطقه أو ابحث عن القريـة/الشارع لتصفية المحلات والخدمات فوراً</p>
          </div>
        </div>

        {selectedRegion && selectedRegion !== 'الكل' && (
          <button
            onClick={() => onSelectRegion('')}
            className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition-all cursor-pointer border border-red-200"
          >
            <X className="h-3.5 w-3.5" />
            <span>عرض كل المحافظة</span>
          </button>
        )}
      </div>

      {/* Main Dropdown Control Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        
        {/* Custom Rich Dropdown Selector (Desktop & Interactive Mobile) */}
        <div className="md:col-span-8 relative z-50" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`w-full px-4 py-3 rounded-2xl border text-right transition-all flex items-center justify-between gap-3 cursor-pointer select-none ${
              selectedRegion && selectedRegion !== 'الكل'
                ? 'bg-[#1a4d2e]/5 border-[#1a4d2e] text-[#1a4d2e] font-black ring-2 ring-[#1a4d2e]/10'
                : 'bg-stone-50 border-stone-200 text-stone-800 hover:bg-stone-100 font-bold'
            }`}
          >
            <div className="flex items-center gap-2.5 truncate">
              <MapPin className={`h-5 w-5 shrink-0 ${selectedRegion ? 'text-[#1a4d2e]' : 'text-amber-500'}`} />
              <span className="text-sm truncate">
                {selectedRegion && selectedRegion !== 'الكل' 
                  ? `المنطقة المختارة: ${selectedRegion}`
                  : '📍 اضغط هنا لاختيار المنطقة / القرية / الشارع من القائمة المنسدلة...'}
              </span>
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              {selectedRegion && selectedRegion !== 'الكل' && (
                <span className="text-[10px] bg-[#1a4d2e] text-white px-2 py-0.5 rounded-full font-bold">
                  نشط
                </span>
              )}
              <ChevronDown className={`h-5 w-5 text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          {/* Expanded Dropdown Menu Panels (Responsive Dual Layouts) */}
          {isOpen && (
            <>
              {/* 1. DESKTOP VIEW: Spacious Absolute Dropdown Aligning Right */}
              <div className="hidden md:flex flex-col absolute top-full right-0 mt-2 bg-white rounded-2xl border border-stone-200 shadow-2xl z-[150] overflow-hidden max-h-[450px] w-[640px] lg:w-[760px] animate-in fade-in slide-in-from-top-2">
                
                {/* Search Box Inside Dropdown */}
                <div className="p-3 bg-stone-50 border-b border-stone-200 sticky top-0 z-10 flex items-center justify-between gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث بالاسم: بيت رأس، شارع الجامعة، الرمثا، الحصن..."
                      className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2 pl-9 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] font-bold text-[#2d2a26]"
                      autoFocus
                    />
                    <Search className="h-4 w-4 text-stone-400 absolute left-3 top-2.5" />
                    {searchQuery && (
                      <button 
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-stone-200 rounded-lg text-stone-400 hover:text-stone-700 cursor-pointer text-xs font-bold shrink-0 transition-colors"
                  >
                    إغلاق ×
                  </button>
                </div>

                {/* Scrollable Regions List */}
                <div className="overflow-y-auto p-3 space-y-4 divide-y divide-stone-100">
                  
                  {/* Option to show All */}
                  {(!searchQuery || 'الكل جميع المناطق'.includes(searchQuery)) && (
                    <button
                      type="button"
                      onClick={() => handleSelect('الكل')}
                      className={`w-full px-4 py-3 rounded-xl text-right text-xs font-black transition-colors flex items-center justify-between cursor-pointer ${
                        !selectedRegion || selectedRegion === 'الكل'
                          ? 'bg-[#1a4d2e] text-white shadow-sm'
                          : 'bg-emerald-50 text-emerald-950 hover:bg-emerald-100'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
                        <span>جميع مناطق وقرى إربد (إلغاء تصفية البحث)</span>
                      </span>
                      {(!selectedRegion || selectedRegion === 'الكل') && <Check className="h-4 w-4" />}
                    </button>
                  )}

                  {filteredGroups.length === 0 ? (
                    <div className="p-8 text-center text-xs text-stone-500 space-y-1">
                      <p className="font-bold text-stone-700">لا توجد منطقة مطابقة لـ "{searchQuery}"</p>
                      <p className="text-[10px]">تأكد من كتابة الاسم بشكل صحيح أو تصفح القائمة الكاملة</p>
                    </div>
                  ) : (
                    filteredGroups.map((group, idx) => (
                      <div key={idx} className="pt-3 first:pt-0">
                        <div className="px-3 py-1.5 text-xs font-black text-amber-900 bg-amber-50/70 rounded-lg mb-2 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <span>{group.groupName}</span>
                          </span>
                          <span className="text-[10px] text-amber-800 font-extrabold">{group.areas.length} منطقة</span>
                        </div>

                        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-1.5">
                          {group.areas.map((area) => {
                            const isSelected = selectedRegion === area;
                            return (
                              <button
                                type="button"
                                key={area}
                                onClick={() => handleSelect(area)}
                                className={`px-3 py-2 rounded-lg text-right text-xs transition-all flex items-center justify-between gap-1.5 cursor-pointer font-bold ${
                                  isSelected
                                    ? 'bg-[#1a4d2e] text-white shadow-xs font-black'
                                    : 'text-stone-700 hover:bg-[#1a4d2e]/5 hover:text-[#1a4d2e]'
                                }`}
                              >
                                <span className="truncate" title={area}>{area}</span>
                                {isSelected && <Check className="h-3.5 w-3.5 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}

                </div>
              </div>

              {/* 2. MOBILE VIEW: Elegant Slide-Up Bottom Sheet Overlay */}
              <div className="md:hidden fixed inset-0 z-[9999] flex items-end justify-center">
                {/* Dark Backdrop */}
                <div 
                  className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300"
                  onClick={() => setIsOpen(false)}
                />

                {/* Bottom Sheet Panel */}
                <div className="relative bg-white w-full max-h-[85vh] rounded-t-[28px] shadow-2xl flex flex-col overflow-hidden z-10 animate-in slide-in-from-bottom duration-300 ease-out">
                  {/* Pull/Drag indicator */}
                  <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto my-3 shrink-0" />

                  {/* Header */}
                  <div className="px-5 pb-3 border-b border-stone-100 flex items-center justify-between shrink-0">
                    <div className="text-right">
                      <h4 className="text-sm font-black text-[#2d2a26]">تحديد منطقة البحث في إربد 📍</h4>
                      <p className="text-[10px] text-stone-500 font-bold">اختر الشارع أو القرية لتصفية النتائج فوراً</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-500 transition-colors cursor-pointer"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Search bar */}
                  <div className="p-4 bg-stone-50 border-b border-stone-100 sticky top-0 z-10 shrink-0">
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ابحث عن: شارع الجامعة، أيدون، الرمثا، الصريح..."
                        className="w-full bg-white border border-stone-200 rounded-xl pr-4 pl-9 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] font-black text-[#2d2a26] text-right"
                      />
                      <Search className="h-4 w-4 text-stone-400 absolute left-3 top-3.5" />
                      {searchQuery && (
                        <button 
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-3 text-stone-400 hover:text-stone-700 cursor-pointer p-1"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scrollable Regions Content */}
                  <div className="overflow-y-auto p-4 space-y-4 divide-y divide-stone-100 flex-1">
                    
                    {/* Option to show All */}
                    {(!searchQuery || 'الكل جميع المناطق'.includes(searchQuery)) && (
                      <button
                        type="button"
                        onClick={() => handleSelect('الكل')}
                        className={`w-full px-4 py-3 rounded-xl text-right text-xs font-black transition-colors flex items-center justify-between cursor-pointer ${
                          !selectedRegion || selectedRegion === 'الكل'
                            ? 'bg-[#1a4d2e] text-white shadow-xs'
                            : 'bg-emerald-50 text-emerald-950'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
                          <span>جميع مناطق وقرى إربد (إلغاء التصفية)</span>
                        </span>
                        {(!selectedRegion || selectedRegion === 'الكل') && <Check className="h-4 w-4" />}
                      </button>
                    )}

                    {filteredGroups.length === 0 ? (
                      <div className="py-12 text-center text-xs text-stone-500 space-y-1">
                        <p className="font-bold text-stone-700">عذراً، لم نجد منطقة باسم "{searchQuery}"</p>
                        <p className="text-[10px]">يرجى التأكد من التهجئة الصحيحة للاسم المبحوث عنه</p>
                      </div>
                    ) : (
                      filteredGroups.map((group, idx) => (
                        <div key={idx} className="pt-3 first:pt-0 text-right">
                          <div className="px-3 py-1 text-[11px] font-black text-amber-900 bg-amber-50/80 rounded-lg mb-2 flex items-center justify-between">
                            <span>{group.groupName}</span>
                            <span className="text-[9px] text-amber-800 font-extrabold">{group.areas.length} منطقة</span>
                          </div>

                          {/* Beautiful single-column layout on tiny screens, spacious 2 columns on medium screens */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                            {group.areas.map((area) => {
                              const isSelected = selectedRegion === area;
                              return (
                                <button
                                  type="button"
                                  key={area}
                                  onClick={() => handleSelect(area)}
                                  className={`px-4 py-3 rounded-xl text-right text-xs transition-all flex items-center justify-between gap-2 cursor-pointer font-bold border ${
                                    isSelected
                                      ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] font-black shadow-xs'
                                      : 'text-stone-700 bg-stone-50 hover:bg-stone-100 border-stone-100 active:bg-stone-200'
                                  }`}
                                >
                                  <span className="font-bold">{area}</span>
                                  {isSelected ? (
                                    <Check className="h-4 w-4 shrink-0 text-white" />
                                  ) : (
                                    <MapPin className="h-3 w-3 shrink-0 text-stone-300" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}

                  </div>

                  {/* Mobile Footer Sticky Action */}
                  <div className="p-4 bg-stone-50 border-t border-stone-100 shrink-0 text-center">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="w-full bg-[#1a4d2e] text-white py-3 px-4 rounded-xl font-bold text-xs shadow-md active:bg-emerald-950 transition-colors"
                    >
                      إغلاق القائمة والرجوع
                    </button>
                  </div>

                </div>
              </div>
            </>
          )}
        </div>

        {/* Native Select Option for Ultra-Fast Mobile Accessibility */}
        <div className="hidden md:block md:col-span-4">
          <div className="relative">
            <select
              value={selectedRegion || 'الكل'}
              onChange={(e) => onSelectRegion(e.target.value === 'الكل' ? '' : e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-3 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] appearance-none pr-3 pl-8 cursor-pointer shadow-2xs"
            >
              <option value="الكل">🌐 القائمة السريعة (جميع المناطق)</option>
              {IRBID_REGIONS_CATEGORIZED.map((group, i) => (
                <optgroup key={i} label={group.groupName}>
                  {group.areas.map((area) => (
                    <option key={area} value={area}>
                      📍 {area}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown className="h-4 w-4 text-stone-400 absolute left-3 top-3.5 pointer-events-none" />
          </div>
        </div>

      </div>

    </div>
  );
}
