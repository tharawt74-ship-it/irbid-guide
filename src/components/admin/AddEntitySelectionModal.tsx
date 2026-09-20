import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Store, Stethoscope, X, ArrowLeft, ShieldCheck, Sparkles, Building2 } from 'lucide-react';

interface AddEntitySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBusiness: () => void;
  onSelectMedical: () => void;
}

export function AddEntitySelectionModal({
  isOpen,
  onClose,
  onSelectBusiness,
  onSelectMedical
}: AddEntitySelectionModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100000] bg-stone-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden animate-in fade-in duration-200"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-lg w-full p-5 sm:p-8 shadow-2xl border border-stone-200 relative my-0 sm:my-auto animate-in zoom-in-95 duration-200 flex flex-col max-h-[88dvh] sm:max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-1 sm:hidden shrink-0" />
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-black border border-emerald-100 mb-1">
                <ShieldCheck className="h-3 w-3 text-emerald-600" />
                <span>صلاحية إدارة المنصة</span>
              </div>
              <h3 className="text-xl font-black text-stone-900">إضافة منشأة جديدة بالدليل</h3>
              <p className="text-xs text-stone-500">اختر نوع المنشأة التي ترغب في إضافتها وتوثيقها</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Selection Cards */}
        <div className="grid grid-cols-1 gap-3.5">
          {/* 1. Add Commercial Business */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectBusiness();
            }}
            className="group w-full p-4.5 rounded-2xl border-2 border-stone-200 hover:border-[#1a4d2e] bg-stone-50/60 hover:bg-emerald-50/40 transition-all text-right cursor-pointer flex items-center justify-between gap-4 shadow-xs hover:shadow-md"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white group-hover:bg-[#1a4d2e] text-[#1a4d2e] group-hover:text-white flex items-center justify-center transition-all shadow-xs border border-stone-200 group-hover:border-[#1a4d2e] shrink-0">
                <Store className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-black text-stone-900 group-hover:text-[#1a4d2e] transition-colors">
                  إضافة محل أو نشاط تجاري
                </h4>
                <p className="text-xs text-stone-500 group-hover:text-stone-700 transition-colors leading-relaxed mt-0.5">
                  مطاعم، كافيهات، متاجر، ملابس، صالونات، خدمات عامة وغيرها
                </p>
              </div>
            </div>

            <div className="w-8 h-8 rounded-xl bg-white group-hover:bg-[#1a4d2e] text-stone-400 group-hover:text-white flex items-center justify-center transition-all shrink-0 border border-stone-200 group-hover:border-[#1a4d2e]">
              <ArrowLeft className="h-4 w-4" />
            </div>
          </button>

          {/* 2. Add Medical Facility */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectMedical();
            }}
            className="group w-full p-4.5 rounded-2xl border-2 border-amber-200/80 hover:border-amber-500 bg-amber-50/40 hover:bg-amber-50 transition-all text-right cursor-pointer flex items-center justify-between gap-4 shadow-xs hover:shadow-md"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white group-hover:bg-amber-500 text-amber-600 group-hover:text-white flex items-center justify-center transition-all shadow-xs border border-amber-200 group-hover:border-amber-500 shrink-0">
                <Stethoscope className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-stone-900 group-hover:text-amber-900 transition-colors">
                    إضافة منشأة أو عيادة طبية
                  </h4>
                  <span className="bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-md">
                    طبي مخصص
                  </span>
                </div>
                <p className="text-xs text-stone-500 group-hover:text-stone-700 transition-colors leading-relaxed mt-0.5">
                  عيادات أطباء، مراكز طبية، مستشفيات، صيدليات، مختبرات وعلاج طبيعي
                </p>
              </div>
            </div>

            <div className="w-8 h-8 rounded-xl bg-white group-hover:bg-amber-500 text-amber-600 group-hover:text-white flex items-center justify-center transition-all shrink-0 border border-amber-200 group-hover:border-amber-500">
              <ArrowLeft className="h-4 w-4" />
            </div>
          </button>
        </div>

        {/* Footer Note */}
        <div className="pt-2 text-center">
          <p className="text-[11px] text-stone-400 font-medium">
            ستفتح لك استمارة الإضافة المتوافقة مع نوع النشاط المحدد لتوثيقه وربطه بحساب صاحبه فوراً.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
