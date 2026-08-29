import React from 'react';
import { Clock, Moon, AlertCircle } from 'lucide-react';
import { WorkingHours } from '../../types';

interface Props {
  workingHours: WorkingHours;
  onChange: (wh: WorkingHours) => void;
}

export function WorkingHoursEditor({ workingHours, onChange }: Props) {
  return (
    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4.5 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-5 w-5 text-[#1a4d2e]" />
        <h4 className="font-bold text-stone-800">مواعيد وساعات العمل الحية (مفتوح / مغلق تلقائياً لجميع الباقات)</h4>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-start-3">
          <label className="block text-xs font-bold text-stone-600 mb-1 text-center">ساعة الفتح الاعتيادية</label>
          <input
            type="time"
            value={workingHours.openTime || ''}
            onChange={e => onChange({ ...workingHours, openTime: e.target.value })}
            disabled={workingHours.isOpen24Hours || workingHours.isCustomClosed}
            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] disabled:opacity-50 text-center"
            dir="ltr"
          />
        </div>
        <div className="sm:col-start-2">
          <label className="block text-xs font-bold text-stone-600 mb-1 text-center">ساعة الإغلاق الاعتيادية</label>
          <input
            type="time"
            value={workingHours.closeTime || ''}
            onChange={e => onChange({ ...workingHours, closeTime: e.target.value })}
            disabled={workingHours.isOpen24Hours || workingHours.isCustomClosed}
            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] disabled:opacity-50 text-center"
            dir="ltr"
          />
        </div>
        <div className="sm:col-start-1">
          <label className="block text-xs font-bold text-stone-600 mb-1 text-center">أيام العمل</label>
          <input
            type="text"
            value={workingHours.days || ''}
            onChange={e => onChange({ ...workingHours, days: e.target.value })}
            placeholder="طوال أيام الأسبوع"
            disabled={workingHours.isOpen24Hours || workingHours.isCustomClosed}
            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] disabled:opacity-50 text-center"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6 pt-3 justify-center sm:justify-start flex-row-reverse border-t border-stone-200/60">
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm font-bold text-[#1a4d2e]">مفتوح على مدار 24 ساعة</span>
          <input
            type="checkbox"
            checked={workingHours.isOpen24Hours || false}
            onChange={e => onChange({ ...workingHours, isOpen24Hours: e.target.checked, isCustomClosed: false })}
            className="rounded h-4 w-4 text-[#1a4d2e] focus:ring-[#1a4d2e] border-stone-300"
          />
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm font-bold text-red-600">إغلاق مؤقت (إجازة / صيانة)</span>
          <input
            type="checkbox"
            checked={workingHours.isCustomClosed || false}
            onChange={e => onChange({ ...workingHours, isCustomClosed: e.target.checked, isOpen24Hours: false })}
            className="rounded h-4 w-4 text-red-600 focus:ring-red-600 border-stone-300"
          />
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm font-bold text-amber-700 flex items-center gap-1">
            <Moon className="h-4 w-4 text-amber-600" />
            تفعيل نظام ساعات شهر رمضان المبارك
          </span>
          <input
            type="checkbox"
            checked={workingHours.isRamadanMode || false}
            onChange={e => onChange({ ...workingHours, isRamadanMode: e.target.checked })}
            className="rounded h-4 w-4 text-amber-600 focus:ring-amber-600 border-stone-300"
          />
        </label>
      </div>

      {/* Ramadan Timings Settings */}
      {workingHours.isRamadanMode && (
        <div className="p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-xl space-y-3 animate-in fade-in">
          <div className="flex items-center gap-1.5 text-xs font-black text-amber-900">
            <Moon className="h-4 w-4 text-amber-600" />
            <span>تحديد مواعيد العمل في شهر رمضان المبارك (قبل/بعد السحور والإفطار)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-amber-900 mb-1">وقت فتح المحل برمضان</label>
              <input
                type="time"
                value={workingHours.ramadanOpenTime || '14:00'}
                onChange={e => onChange({ ...workingHours, ramadanOpenTime: e.target.value })}
                className="w-full bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs font-bold text-stone-800 text-center"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-amber-900 mb-1">وقت إغلاق المحل برمضان</label>
              <input
                type="time"
                value={workingHours.ramadanCloseTime || '02:30'}
                onChange={e => onChange({ ...workingHours, ramadanCloseTime: e.target.value })}
                className="w-full bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs font-bold text-stone-800 text-center"
                dir="ltr"
              />
            </div>
          </div>
        </div>
      )}

      {/* Exceptional note field */}
      <div className="pt-2">
        <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
          <AlertCircle className="h-3.5 w-3.5 text-stone-400" />
          ملاحظة أو تنبيه خاص بالدوام والساعات الاستثنائية (مثال: نغلق أيام الجمعة فقط بعد الصلاة)
        </label>
        <input
          type="text"
          value={workingHours.exceptionalNote || ''}
          onChange={e => onChange({ ...workingHours, exceptionalNote: e.target.value })}
          placeholder="اكتب أي ملاحظة توضيحية للزبائن حول مواعيد العطل والأعياد هنا..."
          className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20"
        />
      </div>
    </div>
  );
}
