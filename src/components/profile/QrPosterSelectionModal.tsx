import React from 'react';
import { createPortal } from 'react-dom';
import { X, QrCode, Utensils, Star, ArrowRight, Sparkles } from 'lucide-react';

interface QrPosterSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMenuPoster: () => void;
  onSelectReviewsPoster: () => void;
  businessName?: string;
}

export function QrPosterSelectionModal({
  isOpen,
  onClose,
  onSelectMenuPoster,
  onSelectReviewsPoster,
  businessName
}: QrPosterSelectionModalProps) {
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-xl w-full flex flex-col overflow-hidden shadow-2xl border border-stone-200 relative my-0 sm:my-auto animate-in fade-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="bg-white border-b border-stone-200/80 p-4 sm:p-5 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-stone-100 border border-stone-200/80 flex items-center justify-center text-stone-800 shadow-2xs shrink-0">
              <QrCode className="h-5 w-5 text-stone-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-stone-600 bg-stone-100 border border-stone-200/60 px-2 py-0.5 rounded-md">
                  بوسترات وطاولات QR
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-stone-500 truncate max-w-[180px]">
                  {businessName}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-stone-900 mt-0.5">
                اختر نوع بوستر الـ QR للطباعة والتخصيص
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4">
          <p className="text-xs sm:text-sm text-stone-600 font-medium leading-relaxed">
            بصفتك مطعماً مسجلاً، يمكنك طباعة وتخصيص نوعين من ملصقات وطاولات الـ QR الذكية لـ {businessName || 'محلك'}:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            {/* Option 1: Menu QR Poster */}
            <button
              type="button"
              onClick={() => {
                onSelectMenuPoster();
                onClose();
              }}
              className="bg-stone-50 hover:bg-emerald-50/70 border-2 border-stone-200/90 hover:border-[#1a4d2e] rounded-2xl p-4 sm:p-5 text-right flex flex-col justify-between transition-all group cursor-pointer shadow-2xs hover:shadow-md"
            >
              <div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-[#1a4d2e] group-hover:bg-[#1a4d2e] group-hover:text-white flex items-center justify-center mb-3 transition-colors">
                  <Utensils className="h-5 w-5" />
                </div>
                <h4 className="text-sm font-black text-stone-900 group-hover:text-[#1a4d2e] transition-colors mb-1.5">
                  تعديل بوستر المنيو الرقمي QR
                </h4>
                <p className="text-xs text-stone-500 group-hover:text-stone-700 leading-relaxed font-normal">
                  تخصيص بوستر الـ QR وقالب التصميم المعتمد لطاولات الطعام والمنيو في قسم المنيو والباركود.
                </p>
              </div>

              <div className="mt-4 flex items-center gap-1.5 text-xs font-black text-[#1a4d2e]">
                <span>تخصيص بوستر المنيو</span>
                <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180 group-hover:translate-x-[-3px] transition-transform" />
              </div>
            </button>

            {/* Option 2: Reviews QR Poster */}
            <button
              type="button"
              onClick={() => {
                onSelectReviewsPoster();
                onClose();
              }}
              className="bg-stone-50 hover:bg-amber-50/70 border-2 border-stone-200/90 hover:border-amber-600 rounded-2xl p-4 sm:p-5 text-right flex flex-col justify-between transition-all group cursor-pointer shadow-2xs hover:shadow-md"
            >
              <div>
                <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center mb-3 transition-colors">
                  <Star className="h-5 w-5 fill-amber-500 text-amber-500 group-hover:fill-white group-hover:text-white" />
                </div>
                <h4 className="text-sm font-black text-stone-900 group-hover:text-amber-900 transition-colors mb-1.5">
                  تعديل بوستر التقييمات QR
                </h4>
                <p className="text-xs text-stone-500 group-hover:text-stone-700 leading-relaxed font-normal">
                  تخصيص وطباعة بوستر باركود جمع تقييمات ومراجعات الزوار والعملاء في قسم آراء ومراجعات.
                </p>
              </div>

              <div className="mt-4 flex items-center gap-1.5 text-xs font-black text-amber-700">
                <span>تخصيص بوستر التقييمات</span>
                <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180 group-hover:translate-x-[-3px] transition-transform" />
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-stone-50 border-t border-stone-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
