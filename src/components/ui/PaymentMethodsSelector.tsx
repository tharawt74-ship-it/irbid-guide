import React from 'react';
import { Banknote, CreditCard, Smartphone, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface PaymentMethodsSelectorProps {
  value?: string[];
  onChange: (methods: string[]) => void;
  label?: string;
  className?: string;
}

export const PAYMENT_METHOD_OPTIONS = [
  { id: 'كاش', label: 'كاش (نقدي)', keyMatches: ['كاش', 'cash', 'نقد'], icon: Banknote },
  { id: 'فيزا', label: 'فيزا / بطاقات إلكترونية', keyMatches: ['فيزا', 'visa', 'بطاق', 'ائتمان'], icon: CreditCard },
  { id: 'كليك', label: 'كليك (CliQ)', keyMatches: ['كليك', 'cliq', 'CliQ'], icon: Smartphone },
];

export function isMethodSelected(currentValues: string[] = [], optionId: string): boolean {
  const matches = PAYMENT_METHOD_OPTIONS.find(o => o.id === optionId)?.keyMatches || [optionId];
  return currentValues.some(val => matches.some(m => val.toLowerCase().includes(m.toLowerCase())));
}

export function PaymentMethodsSelector({
  value = ['كاش', 'فيزا', 'كليك'],
  onChange,
  label = 'خيارات الدفع المتاحة',
  className = ''
}: PaymentMethodsSelectorProps) {
  const toggleMethod = (optionId: string) => {
    const isCurrentlySelected = isMethodSelected(value, optionId);
    if (isCurrentlySelected) {
      // Filter out matching elements
      const optionMatches = PAYMENT_METHOD_OPTIONS.find(o => o.id === optionId)?.keyMatches || [optionId];
      const nextValue = value.filter(val => !optionMatches.some(m => val.toLowerCase().includes(m.toLowerCase())));
      onChange(nextValue);
    } else {
      onChange([...value, optionId]);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <label className="block text-xs font-bold text-stone-700 flex items-center justify-between">
        <span>{label}</span>
        <span className="text-[10px] text-stone-500 font-normal">انقر لتفعيل/إلغاء تفعيل خيار الدفع</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {PAYMENT_METHOD_OPTIONS.map((opt) => {
          const selected = isMethodSelected(value, opt.id);
          const Icon = opt.icon;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggleMethod(opt.id)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none active:scale-95",
                selected
                  ? "bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs"
                  : "bg-stone-50 text-stone-500 border-stone-200/80 hover:bg-stone-100 hover:text-stone-700"
              )}
            >
              <Icon className={cn("h-4 w-4", selected ? "text-amber-300" : "text-stone-400")} />
              <span>{opt.label}</span>
              {selected ? (
                <span className="w-4 h-4 rounded-full bg-emerald-500/30 text-emerald-200 flex items-center justify-center mr-1">
                  <Check className="h-3 w-3" />
                </span>
              ) : (
                <span className="w-4 h-4 rounded-full border border-stone-300 mr-1" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
