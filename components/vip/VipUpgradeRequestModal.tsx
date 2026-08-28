import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Crown, BarChart3, UtensilsCrossed, ShieldCheck, Zap, MessageSquare } from 'lucide-react';
import { Business } from '../../types';

interface VipUpgradeRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business;
}

export function VipUpgradeRequestModal({
  isOpen,
  onClose,
  business,
}: VipUpgradeRequestModalProps) {

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

  const whatsappMessage = encodeURIComponent(
    `السلام عليكم، أرغب بترقية محلي (${business.name}) إلى الباقة الذهبية VIP للاستفادة من مميزات الإحصائيات والمنيو الرقمي والتوثيق الذهبي.\nمعرف المحل: ${business.id}`
  );

  // Admin WhatsApp or general support contact
  const whatsappUrl = `https://wa.me/966500000000?text=${whatsappMessage}`;

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl border border-amber-200 relative my-auto animate-in fade-in zoom-in-95 space-y-6">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-amber-400 to-amber-600 text-white p-3 rounded-2xl shadow-md">
              <Crown className="h-7 w-7 fill-white" />
            </div>
            <div>
              <span className="text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full inline-block mb-1">
                ترقية حصرية
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-[#2d2a26]">
                ترقية ({business.name}) إلى VIP
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 bg-stone-100 text-stone-500 hover:bg-stone-200 rounded-full transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Benefits List */}
        <div className="space-y-3">
          <p className="text-sm font-bold text-stone-600">
            احصل على المميزات الذهبية الحصرية لهذا المحل عند الترقية:
          </p>

          <div className="grid grid-cols-1 gap-2.5 pt-1">
            <div className="flex items-start gap-3 p-3 bg-amber-50/70 border border-amber-200/60 rounded-2xl">
              <div className="bg-amber-500 text-white p-2 rounded-xl mt-0.5">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-stone-800">لوحة الإحصائيات والتحليلات التفاعلية</h4>
                <p className="text-xs text-stone-600">تتبع زوار المحل، نقرات الواتساب، والمكالمات ومعدلات التحويل لحظياً.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-2xl">
              <div className="bg-emerald-600 text-white p-2 rounded-xl mt-0.5">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-stone-800">كتالوج المنتجات والمنيو الرقمي</h4>
                <p className="text-xs text-stone-600">عرض أصناف المحل وأسعارها بصورة تفاعلية مع إمكانية البحث والتسوق المباشر.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-blue-50/70 border border-blue-200/60 rounded-2xl">
              <div className="bg-blue-600 text-white p-2 rounded-xl mt-0.5">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-stone-800">شارة التوثيق الذهبية وشهرة أعلى</h4>
                <p className="text-xs text-stone-600">إظهار علامة التوثيق الذهبي المعتمدة وأولوية الظهور في نتائج البحث.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 space-y-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black py-3.5 px-4 rounded-2xl shadow-lg transition-all text-sm cursor-pointer"
          >
            <MessageSquare className="h-5 w-5 fill-white" />
            <span>طلب الترقية عبر الواتساب</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-stone-500 hover:text-stone-800 font-bold text-xs transition-colors cursor-pointer"
          >
            إلغاء
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
