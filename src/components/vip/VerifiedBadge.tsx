import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, Sparkles, X } from 'lucide-react';
import { createPortal } from 'react-dom';

export function BlueCheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#1d9bf0"
        d="M22.25 12c0-1.43-.88-2.67-2.19-3.15.2-1.46-.35-2.92-1.45-3.88-1.1-1.09-2.56-1.51-4.01-1.22C14.12 2.44 12.88 1.5 11.45 1.5c-1.43 0-2.67.94-3.15 2.25-1.46-.29-2.92.13-4.01 1.22-1.1.96-1.65 2.42-1.45 3.88C1.54 9.33.65 10.57.65 12c0 1.43.89 2.67 2.19 3.15-.2 1.46.35 2.92 1.45 3.88 1.1 1.09 2.56 1.51 4.01 1.22.48 1.31 1.72 2.25 3.15 2.25 1.43 0 2.67-.94 3.15-2.25 1.45.29 2.91-.13 4.01-1.22 1.1-.96 1.65-2.42 1.45-3.88 1.31-.48 2.2-1.72 2.2-3.15z"
      />
      <path
        fill="#ffffff"
        d="M9.86 15.75L6.6 12.48l1.41-1.41 1.85 1.85 6.06-6.06 1.41 1.41-7.47 7.48z"
      />
    </svg>
  );
}

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  businessName?: string;
  showText?: boolean;
  className?: string;
}

export function VerifiedBadge({
  size = 'md',
  businessName = 'هذا المحل',
  showText = false,
  className = ''
}: VerifiedBadgeProps) {
  const [showModal, setShowModal] = useState(false);

  const sizeClasses = {
    sm: 'p-1',
    md: 'p-1.5',
    lg: 'p-2'
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowModal(true);
        }}
        title="حساب موثّق بالشارة الزرقاء المعتمدة في منصة شو في بإربد (مثل فيسبوك وX)"
        className={`inline-flex items-center font-black rounded-full bg-sky-500/10 hover:bg-sky-500/20 text-[#0c7abf] border border-sky-300/60 shadow-xs hover:scale-105 transition-all cursor-pointer select-none backdrop-blur-xs ${sizeClasses[size]} ${className}`}
      >
        <BlueCheckIcon className={iconSizes[size]} />
        {showText && <span>موثّق</span>}
      </button>

      {/* Verification Trust Modal */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" 
          dir="rtl"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-sky-200 relative my-auto animate-in fade-in zoom-in-95 space-y-5 text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 left-5 p-2 bg-stone-100 hover:bg-stone-200 text-stone-500 rounded-full transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="w-16 h-16 bg-gradient-to-br from-sky-400 to-blue-600 text-white rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-sky-500/25">
              <BlueCheckIcon className="h-9 w-9" />
            </div>

            <div className="text-center space-y-1.5">
              <div className="inline-flex items-center gap-1.5 bg-sky-50 text-sky-800 text-xs font-black px-3 py-1 rounded-full border border-sky-200">
                <Sparkles className="h-3.5 w-3.5 text-sky-600" />
                <span>العلامة الزرقاء (حساب موثّق رسمياً)</span>
              </div>
              <h3 className="text-xl font-black text-[#2d2a26]">{businessName}</h3>
              <p className="text-xs text-stone-500 font-medium">منشأة موثّقة معتمدة تماماً مثل توثيق فيسبوك وX لدى منصة "شو في بإربد"</p>
            </div>

            <div className="bg-sky-50/70 border border-sky-200/80 rounded-2xl p-4 space-y-3 text-xs text-stone-700">
              <div className="flex items-start gap-2.5">
                <div className="p-1 bg-sky-500 text-white rounded-lg shrink-0 mt-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <strong className="block font-bold text-sky-950">بيانات تجارية دقيقة ومراجعة:</strong>
                  <span className="text-stone-600">تم التحقق من هوية المنشأة والموقع الجغرافي وأرقام التواصل الرسمية.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-1 bg-sky-500 text-white rounded-lg shrink-0 mt-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <strong className="block font-bold text-sky-950">إدارة تفاعلية حية:</strong>
                  <span className="text-stone-600">المنشأة تدار مباشرة بواسطة الإدارة المعتمدة مع إمكانية تحديث المنيو والرد على الزبائن.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="p-1 bg-sky-500 text-white rounded-lg shrink-0 mt-0.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
                <div>
                  <strong className="block font-bold text-sky-950">أولوية الظهور والمصداقية:</strong>
                  <span className="text-stone-600">حماية من التنتحل مع أولوية الظهور في نتائج البحث لزوار وسكان إربد.</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full py-3 bg-[#1a4d2e] hover:bg-[#133b22] text-white font-bold rounded-xl text-sm transition-colors shadow-xs"
            >
              فهمت ذلك، إغلاق
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

