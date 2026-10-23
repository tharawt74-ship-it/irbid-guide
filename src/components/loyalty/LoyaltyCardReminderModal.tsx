import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { X, Award, Gift, Check, Sparkles, ChevronLeft } from 'lucide-react';
import { UserLoyaltyCard } from '../../types';

interface LoyaltyCardReminderModalProps {
  card: UserLoyaltyCard;
  isOpen: boolean;
  onClose: () => void;
}

export function LoyaltyCardReminderModal({
  card,
  isOpen,
  onClose
}: LoyaltyCardReminderModalProps) {
  const navigate = useNavigate();

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

  const target = card.targetStamps || 6;
  const current = card.currentStamps || 0;
  const percent = Math.min(100, Math.round((current / target) * 100));
  const isReady = card.isRewardReady || current >= target;

  const handleGoToLoyalty = () => {
    onClose();
    navigate('/profile?tab=loyalty');
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[999999] bg-stone-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="max-w-md w-full bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden p-5 sm:p-6 space-y-4 my-0 sm:my-auto animate-in fade-in zoom-in-95 duration-200 max-h-[90dvh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#1a4d2e]/10 text-[#1a4d2e] flex items-center justify-center shrink-0">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900 leading-tight">
                تذكير ببطاقة الولاء
              </h3>
              <p className="text-xs font-bold text-stone-500">
                {card.businessName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="إغلاق"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Notice Box */}
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            {isReady ? <Sparkles className="h-5 w-5" /> : <Award className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-sm font-black text-emerald-950">
              {isReady ? 'مكافأتك جاهزة للاستلام' : 'لديك بطاقة ولاء نشطة في هذا المحل'}
            </h4>
            <p className="text-[11px] font-medium text-emerald-800 mt-0.5">
              {isReady
                ? 'لقد أكملت جميع الأختام ويمكنك استلام هديتك عند زيارتك'
                : 'أظهر رمز الولاء عند الشراء لإضافة الأختام إلى بطاقتك'}
            </p>
          </div>
        </div>

        {/* Progress & Stamps Display */}
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-stone-700">
              الأختام: {current} من {target}
            </span>
            <span className="font-mono text-[#1a4d2e] font-black">
              نسبة الإنجاز: {percent}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isReady ? 'bg-emerald-500' : 'bg-[#1a4d2e]'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>

          {/* Stamp circles */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            {Array.from({ length: target }).map((_, idx) => {
              const isStamped = idx < current;
              return (
                <div
                  key={idx}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold border transition-all ${
                    isStamped
                      ? 'bg-amber-500 text-white border-amber-600 shadow-2xs font-mono'
                      : 'bg-white text-stone-400 border-dashed border-stone-300 font-mono'
                  }`}
                >
                  {isStamped ? <Check className="h-4 w-4 stroke-[3]" /> : idx + 1}
                </div>
              );
            })}
          </div>
        </div>

        {/* Reward Box */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Gift className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-bold text-amber-900 block">
              المكافأة المستحقة
            </span>
            <span className="text-xs font-black text-stone-900 truncate block">
              {card.rewardTitle || 'مكافأة مجانية'}
            </span>
            {card.rewardDescription && (
              <span className="text-[10px] text-stone-500 block truncate mt-0.5">
                {card.rewardDescription}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleGoToLoyalty}
            className="w-full py-3 px-4 bg-[#1a4d2e] hover:bg-[#133b22] text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <span>عرض بطاقة الولاء</span>
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            متابعة تصفح المحل
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
