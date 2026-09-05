import React, { useState, useEffect } from 'react';
import { 
  Clock, Moon, Sun, AlertCircle, Check, X, 
  Calendar, Sparkles, Palmtree, RefreshCw,
  HelpCircle, ShieldCheck
} from 'lucide-react';
import { WorkingHours } from '../../types';
import { formatTimeToArabic, getLiveWorkingStatus } from '../../lib/businessHoursHelper';

interface WorkingHoursEditorProps {
  workingHours: WorkingHours;
  onChange: (wh: WorkingHours) => void;
  /** Set to true ONLY in business edit / profile dashboard views */
  showVacationToggle?: boolean;
  /** Optional title override */
  title?: string;
}

interface DayItem {
  id: string;
  name: string;
  short: string;
  dayIndex: number;
}

export const ALL_DAYS: DayItem[] = [
  { id: 'sat', name: 'السبت', short: 'سبت', dayIndex: 6 },
  { id: 'sun', name: 'الأحد', short: 'أحد', dayIndex: 0 },
  { id: 'mon', name: 'الإثنين', short: 'إثنين', dayIndex: 1 },
  { id: 'tue', name: 'الثلاثاء', short: 'ثلاثاء', dayIndex: 2 },
  { id: 'wed', name: 'الأربعاء', short: 'أربعاء', dayIndex: 3 },
  { id: 'thu', name: 'الخميس', short: 'خميس', dayIndex: 4 },
  { id: 'fri', name: 'الجمعة', short: 'جمعة', dayIndex: 5 },
];

/** Helper to generate nice Arabic readable summary of selected days */
export function generateDaysSummary(selected: string[]): string {
  if (!selected || selected.length === 0) return 'مغلق مؤقتاً (لم تحدد أيام)';
  if (selected.length === 7) return 'طوال أيام الأسبوع (يومياً)';
  
  const allNames = ALL_DAYS.map(d => d.name);
  const isSatToThu = selected.length === 6 && !selected.includes('الجمعة');
  if (isSatToThu) return 'من السبت إلى الخميس (عطلة الجمعة)';

  const isSunToThu = selected.length === 5 && !selected.includes('الجمعة') && !selected.includes('السبت');
  if (isSunToThu) return 'من الأحد إلى الخميس (دوام أسبوعي)';

  const isWeekendOnly = selected.length === 2 && selected.includes('الجمعة') && selected.includes('السبت');
  if (isWeekendOnly) return 'عطلة نهاية الأسبوع (الجمعة والسبت)';

  return selected.join('، ');
}

/** Helper to parse initial days string into string[] */
export function parseInitialDays(daysStr?: string, existingSelected?: string[]): string[] {
  if (existingSelected && Array.isArray(existingSelected) && existingSelected.length > 0) {
    return existingSelected;
  }

  const str = daysStr?.trim() || '';
  if (!str || str.includes('طوال') || str.includes('يوميا') || str.includes('يومياً') || str.includes('7 أيام')) {
    return ALL_DAYS.map(d => d.name);
  }

  if (str.includes('السبت إلى الخميس') || str.includes('السبت للخميس')) {
    return ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  }

  if (str.includes('الأحد إلى الخميس') || str.includes('الأحد للخميس')) {
    return ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  }

  const found: string[] = [];
  ALL_DAYS.forEach(d => {
    if (str.includes(d.name)) found.push(d.name);
  });

  return found.length > 0 ? found : ALL_DAYS.map(d => d.name);
}

export function WorkingHoursEditor({
  workingHours,
  onChange,
  showVacationToggle = false,
  title = 'مواعيد وساعات العمل الحية (مفتوح / مغلق تلقائياً لجميع الباقات)'
}: WorkingHoursEditorProps) {
  
  // Selected days state
  const selectedDays = parseInitialDays(workingHours.days, workingHours.selectedDays);

  const handleToggleDay = (dayName: string) => {
    let updated: string[];
    if (selectedDays.includes(dayName)) {
      // Don't allow empty, or allow minimum 1
      updated = selectedDays.filter(d => d !== dayName);
    } else {
      // Keep order matching ALL_DAYS
      const orderMap = ALL_DAYS.map(d => d.name);
      updated = [...selectedDays, dayName].sort((a, b) => orderMap.indexOf(a) - orderMap.indexOf(b));
    }

    const summary = generateDaysSummary(updated);
    onChange({
      ...workingHours,
      selectedDays: updated,
      days: summary
    });
  };

  const handleApplyPreset = (preset: 'all' | 'sat_thu' | 'sun_thu' | 'clear') => {
    let updated: string[] = [];
    if (preset === 'all') {
      updated = ALL_DAYS.map(d => d.name);
    } else if (preset === 'sat_thu') {
      updated = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
    } else if (preset === 'sun_thu') {
      updated = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
    } else if (preset === 'clear') {
      updated = [];
    }

    const summary = generateDaysSummary(updated);
    onChange({
      ...workingHours,
      selectedDays: updated,
      days: summary
    });
  };

  // Check live status for simulator
  const liveStatus = getLiveWorkingStatus(workingHours);

  // Check if overnight
  const openTime = workingHours.openTime || '09:00';
  const closeTime = workingHours.closeTime || '23:00';
  const [openH] = openTime.split(':').map(Number);
  const [closeH] = closeTime.split(':').map(Number);
  const isOvernight = closeH < openH;

  return (
    <div className="bg-white border border-stone-200/90 rounded-3xl p-4 sm:p-6 space-y-6 shadow-xs" dir="rtl">
      {/* 1. Header & Live Simulator Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#1a4d2e]/10 text-[#1a4d2e] rounded-2xl">
            <Clock className="h-6 w-6 text-[#1a4d2e]" />
          </div>
          <div>
            <h4 className="font-black text-stone-900 text-sm sm:text-base">
              {title}
            </h4>
            <p className="text-stone-500 text-xs mt-0.5">
              يتم تحديث شارة (مفتوح / مغلق) في صفحة محلك والبحث تلقائياً حسب التوقيت المعتمد
            </p>
          </div>
        </div>

        {/* Live Simulator Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto bg-stone-50 border border-stone-200 px-3.5 py-2 rounded-2xl">
          <span className="text-[11px] font-bold text-stone-500">معاينة الحالة الآن:</span>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black border ${liveStatus.badgeBg}`}>
            <span className={`w-2 h-2 rounded-full ${liveStatus.dotColor}`} />
            <span>{liveStatus.statusText}</span>
          </span>
        </div>
      </div>

      {/* 2. 24/7 Hours Quick Card */}
      <div className="bg-stone-50/70 border border-stone-200/80 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100/80 text-emerald-800 rounded-xl">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-black text-stone-900 block">هل المحل مفتوح على مدار 24 ساعة؟</span>
            <span className="text-[11px] text-stone-500">مثل الصيدليات، محطات الوقود، والمحلات التي تعمل ليلاً ونهاراً</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onChange({
            ...workingHours,
            isOpen24Hours: !workingHours.isOpen24Hours,
            isCustomClosed: false
          })}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 ${
            workingHours.isOpen24Hours
              ? 'bg-[#1a4d2e] text-white shadow-xs'
              : 'bg-white border border-stone-200 text-stone-700 hover:border-emerald-500'
          }`}
        >
          {workingHours.isOpen24Hours ? (
            <>
              <Check className="h-4 w-4 text-[#ff9f1c]" />
              <span>مفتوح 24/7 مفعل</span>
            </>
          ) : (
            <span>تفعيل 24 ساعة</span>
          )}
        </button>
      </div>

      {/* 3. Seven Days of the Week Selection Cards */}
      {!workingHours.isOpen24Hours && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-[#1a4d2e]" />
                <span>أيام العمل الأسبوعية (انقر على اليوم لتحديده أو إلغائه):</span>
              </label>
              <p className="text-[11px] text-stone-500 mt-0.5">
                الأيام المحددة بالأخضر تعني أن المحل يستقبل الزبائن فيها، والأيام الرمادية هي أيام العطلة الأسبوعية
              </p>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => handleApplyPreset('all')}
                className="px-2.5 py-1 bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 rounded-lg text-[11px] font-bold text-stone-600 transition-colors cursor-pointer"
              >
                طوال الأسبوع (7 أيام)
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('sat_thu')}
                className="px-2.5 py-1 bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 rounded-lg text-[11px] font-bold text-stone-600 transition-colors cursor-pointer"
              >
                السبت - الخميس
              </button>
              <button
                type="button"
                onClick={() => handleApplyPreset('sun_thu')}
                className="px-2.5 py-1 bg-stone-100 hover:bg-emerald-50 hover:text-emerald-800 border border-stone-200 rounded-lg text-[11px] font-bold text-stone-600 transition-colors cursor-pointer"
              >
                الأحد - الخميس
              </button>
            </div>
          </div>

          {/* 7 Days Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {ALL_DAYS.map((day) => {
              const isSelected = selectedDays.includes(day.name);
              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => handleToggleDay(day.name)}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-50/90 border-emerald-500 text-[#1a4d2e] ring-2 ring-emerald-500/10 shadow-xs font-black'
                      : 'bg-stone-50/70 border-stone-200 text-stone-400 hover:border-stone-300 hover:text-stone-600'
                  }`}
                >
                  <span className="text-xs sm:text-sm font-black block">{day.name}</span>
                  <div className="mt-0.5">
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                        <Check className="h-2.5 w-2.5" />
                        <span>مفتوح</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-stone-200 text-stone-500 px-2 py-0.5 rounded-full">
                        <X className="h-2.5 w-2.5" />
                        <span>عطلة</span>
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Current Days Summary Display */}
          <div className="bg-stone-50 border border-stone-200/80 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs">
            <span className="text-stone-500 font-bold">ملخص الأيام المعروض للزبائن:</span>
            <span className="font-black text-[#1a4d2e]">{workingHours.days || generateDaysSummary(selectedDays)}</span>
          </div>
        </div>
      )}

      {/* 4. Open & Close Times */}
      {!workingHours.isOpen24Hours && (
        <div className="p-4 sm:p-5 rounded-2xl border border-stone-200 bg-stone-50/50 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-stone-800 flex items-center gap-1.5">
              <Sun className="h-4 w-4 text-amber-600" />
              ساعات العمل اليومية الاعتيادية:
            </span>
            <span className="text-[11px] text-stone-500 font-medium">نظام 12 ساعة متاح للمعاينة</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Open Time */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700">
                ساعة الفتح اليومية: <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  dir="ltr"
                  value={workingHours.openTime || '09:00'}
                  onChange={e => onChange({ ...workingHours, openTime: e.target.value })}
                  className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] text-center"
                />
              </div>
              <p className="text-[11px] text-stone-500 text-center font-bold">
                تفتح الساعة: <span className="text-[#1a4d2e]">{formatTimeToArabic(workingHours.openTime || '09:00')}</span>
              </p>
            </div>

            {/* Close Time */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700">
                ساعة الإغلاق اليومية: <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="time"
                  dir="ltr"
                  value={workingHours.closeTime || '23:00'}
                  onChange={e => onChange({ ...workingHours, closeTime: e.target.value })}
                  className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] text-center"
                />
              </div>
              <p className="text-[11px] text-stone-500 text-center font-bold">
                تغلق الساعة: <span className="text-stone-800">{formatTimeToArabic(workingHours.closeTime || '23:00')}</span>
              </p>
            </div>
          </div>

          {isOvernight && (
            <div className="p-2.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 flex items-center gap-2">
              <Moon className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>نظام دوام ليلي: يمتد الإغلاق لبعد منتصف الليل (حتى {formatTimeToArabic(closeTime)} فجراً)</span>
            </div>
          )}
        </div>
      )}

      {/* 5. VACATION / TEMPORARY CLOSURE (ONLY IN EDIT / OWNER PROFILE VIEWS) */}
      {showVacationToggle && (
        <div className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-3.5 ${
          workingHours.isCustomClosed 
            ? 'bg-rose-50/90 border-rose-300 ring-2 ring-rose-500/10' 
            : 'bg-stone-50 border-stone-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl ${workingHours.isCustomClosed ? 'bg-rose-600 text-white' : 'bg-stone-200 text-stone-600'}`}>
                <Palmtree className="h-5 w-5" />
              </div>
              <div>
                <h5 className="font-black text-stone-900 text-xs sm:text-sm">
                  وضع الإجازة والإغلاق المؤقت للمحل
                </h5>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  فعّل هذا الخيار في حال السفر، الأعياد، الجرد، أو إجراء أعمال صيانة لمنع توجه الزبائن دون جدوى
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onChange({
                ...workingHours,
                isCustomClosed: !workingHours.isCustomClosed,
                isOpen24Hours: false
              })}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                workingHours.isCustomClosed
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-700 hover:border-rose-300'
              }`}
            >
              {workingHours.isCustomClosed ? 'المحل في وضع الإجازة 🏖️ (مفعل)' : 'تفعيل إجازة مؤقتة'}
            </button>
          </div>

          {workingHours.isCustomClosed && (
            <div className="pt-2 border-t border-rose-200/80 space-y-2.5 animate-in fade-in">
              <label className="block text-xs font-bold text-rose-900">
                سبب الإجازة أو موعد استئناف العمل (سيظهر للزبائن كشعار تنبيه):
              </label>
              <input
                type="text"
                value={workingHours.vacationReason || ''}
                onChange={e => onChange({ ...workingHours, vacationReason: e.target.value })}
                placeholder="مثال: إجازة عيد الأضحى المبارك - نعود لاستقبالكم يوم الأحد القادم"
                className="w-full bg-white border border-rose-300 rounded-xl px-4 py-2.5 text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <div className="p-3 bg-white/80 rounded-xl border border-rose-200 text-[11px] text-rose-800 font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>تنبيه: سيظهر لجميع زوار موقع دليل إربد أن محلك "مغلق مؤقتاً" مع توضيح سبب الإجازة حتى تقوم بإلغاء تفعيل هذا الخيار.</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. Ramadan Special Timings Mode */}
      <div className="border-t border-stone-100 pt-3">
        <label className="flex items-center justify-between p-3 bg-amber-50/50 hover:bg-amber-50 border border-amber-200/70 rounded-2xl cursor-pointer transition-colors">
          <span className="text-xs font-bold text-amber-900 flex items-center gap-2">
            <Moon className="h-4 w-4 text-amber-600" />
            <span>تفعيل مواعيد شهر رمضان المبارك (أوقات الإفطار والسحور)</span>
          </span>
          <input
            type="checkbox"
            checked={workingHours.isRamadanMode || false}
            onChange={e => onChange({ ...workingHours, isRamadanMode: e.target.checked })}
            className="rounded h-4 w-4 text-amber-600 focus:ring-amber-600 border-amber-300 cursor-pointer"
          />
        </label>

        {workingHours.isRamadanMode && (
          <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl mt-3 space-y-3 animate-in fade-in">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-900">
              <Moon className="h-4 w-4 text-amber-600" />
              <span>تحديد مواعيد العمل في شهر رمضان المبارك:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-amber-900 mb-1">وقت فتح المحل برمضان</label>
                <input
                  type="time"
                  value={workingHours.ramadanOpenTime || '14:00'}
                  onChange={e => onChange({ ...workingHours, ramadanOpenTime: e.target.value })}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 text-center"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-amber-900 mb-1">وقت إغلاق المحل برمضان</label>
                <input
                  type="time"
                  value={workingHours.ramadanCloseTime || '02:30'}
                  onChange={e => onChange({ ...workingHours, ramadanCloseTime: e.target.value })}
                  className="w-full bg-white border border-amber-300 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 text-center"
                  dir="ltr"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 7. Exceptional Note */}
      <div className="space-y-1.5 pt-1">
        <label className="block text-xs font-bold text-stone-700 flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-stone-400" />
          <span>ملاحظة أو تنبيه خاص بالدوام (اختياري - مثل: استراحة صلاة الجمعة):</span>
        </label>
        <input
          type="text"
          value={workingHours.exceptionalNote || ''}
          onChange={e => onChange({ ...workingHours, exceptionalNote: e.target.value })}
          placeholder="اكتب أي ملاحظة توضيحية للزبائن حول مواعيد العطل والأعياد هنا..."
          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
        />
      </div>
    </div>
  );
}
