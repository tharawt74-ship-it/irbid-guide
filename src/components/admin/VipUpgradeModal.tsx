import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Crown, 
  Sparkles, 
  Calendar, 
  Clock, 
  X, 
  Check, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowDownCircle, 
  ArrowUpCircle,
  HelpCircle,
  Hourglass,
  CalendarDays,
  Info,
  Store
} from 'lucide-react';
import { Business } from '../../types';
import { getBusinessVipStatus } from '../../lib/vipHelper';
import { recordAuditLog } from '../../lib/auditLogHelper';

interface VipUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business | null;
  onSave: (updatedBusiness: Business) => Promise<void>;
}

export function VipUpgradeModal({
  isOpen,
  onClose,
  business,
  onSave
}: VipUpgradeModalProps) {
  const [packagePlan, setPackagePlan] = useState<'golden' | 'basic' | 'pay_per_use'>('golden');
  const [isVerified, setIsVerified] = useState(true);
  const [scheduleType, setScheduleType] = useState<'permanent' | 'custom_duration' | 'custom_dates'>('permanent');
  const [presetDurationDays, setPresetDurationDays] = useState<number>(30);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [vipNotes, setVipNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form state when business changes or modal opens
  useEffect(() => {
    if (business) {
      const vipStatus = getBusinessVipStatus(business);
      const isCurrentlyGolden = business.packagePlan === 'golden' || business.packagePlan === 'vip' || !!business.isVerified;
      
      const rawPlan = business.packagePlan === 'pay_per_use' ? 'pay_per_use' : 'basic';
      setPackagePlan(isCurrentlyGolden ? 'golden' : rawPlan);
      setIsVerified(business.isVerified !== undefined ? business.isVerified : isCurrentlyGolden);
      setVipNotes(business.vipNotes || '');

      // Check existing dates
      if (business.vipSubscriptionExpiresAt || business.vipSubscriptionStartsAt) {
        setScheduleType('custom_dates');
        if (business.vipSubscriptionStartsAt) {
          const sDate = new Date(business.vipSubscriptionStartsAt);
          setStartDate(sDate.toISOString().slice(0, 10));
        } else {
          setStartDate(new Date().toISOString().slice(0, 10));
        }

        if (business.vipSubscriptionExpiresAt) {
          const eDate = new Date(business.vipSubscriptionExpiresAt);
          setEndDate(eDate.toISOString().slice(0, 10));
        } else {
          setEndDate('');
        }
      } else {
        setScheduleType('permanent');
        setStartDate(new Date().toISOString().slice(0, 10));
        setEndDate('');
      }
    }
  }, [business, isOpen]);

  // Lock scroll
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

  if (!isOpen || !business) return null;

  const currentVipStatus = getBusinessVipStatus(business);

  const handleApplyPreset = (days: number) => {
    setPresetDurationDays(days);
    setScheduleType('custom_duration');
    const today = new Date();
    const future = new Date();
    future.setDate(today.getDate() + days);

    setStartDate(today.toISOString().slice(0, 10));
    setEndDate(future.toISOString().slice(0, 10));
  };

  const handleRevokeUpgrade = async () => {
    setIsSubmitting(true);
    try {
      await onSave({
        ...business,
        packagePlan: 'basic',
        isVerified: false,
        vipSubscriptionStartsAt: undefined,
        vipSubscriptionExpiresAt: undefined,
        isVipScheduled: false,
        vipNotes: vipNotes ? `${vipNotes} (تم سحب الترقية في ${new Date().toLocaleDateString('ar-JO')})` : undefined
      });
      onClose();
    } catch (err) {
      console.error('Error revoking VIP upgrade:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let startsAt: number | undefined = undefined;
      let expiresAt: number | undefined = undefined;
      let isScheduled = false;

      if (packagePlan === 'golden') {
        if (scheduleType === 'custom_duration' && presetDurationDays > 0) {
          const now = Date.now();
          startsAt = now;
          expiresAt = now + (presetDurationDays * 24 * 60 * 60 * 1000);
          isScheduled = true;
        } else if (scheduleType === 'custom_dates') {
          if (startDate) {
            startsAt = new Date(startDate).setHours(0, 0, 0, 0);
          }
          if (endDate) {
            expiresAt = new Date(endDate).setHours(23, 59, 59, 999);
          }
          isScheduled = !!(startDate || endDate);
        } else {
          // Permanent
          startsAt = Date.now();
          expiresAt = undefined;
          isScheduled = false;
        }
      } else {
        // Basic or Pay per use
        startsAt = undefined;
        expiresAt = undefined;
        isScheduled = false;
      }

      await onSave({
        ...business,
        packagePlan,
        isVerified: packagePlan === 'golden' ? isVerified : false,
        vipSubscriptionStartsAt: startsAt,
        vipSubscriptionExpiresAt: expiresAt,
        isVipScheduled: isScheduled,
        vipNotes: vipNotes || undefined
      });

      recordAuditLog({
        action: 'UPDATE_VIP',
        actionAr: 'تحديث وترقية الباقة الإعلانية VIP',
        details: `تم تعديل باقة محل "${business.name}" إلى ${packagePlan === 'golden' ? 'الباقة الذهبية (VIP Gold)' : packagePlan === 'pay_per_use' ? 'باقة الدفع حسب الاستخدام' : 'الباقة الأساسية'}`,
        performedBy: 'مدير النظام (Admin)',
        userRole: 'admin',
        targetId: business.id,
        targetName: business.name,
        timestamp: Date.now()
      });

      onClose();
    } catch (err) {
      console.error('Error saving VIP settings:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return typeof document !== 'undefined' ? createPortal(
    <div 
      className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto" 
      dir="rtl"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-7 shadow-2xl border border-stone-200 my-auto relative animate-in fade-in zoom-in-95 text-right space-y-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black text-stone-900">إدارة وترقية الباقة الذهبية VIP</h3>
                <span className="text-[10px] bg-amber-100 text-amber-900 font-black px-2 py-0.5 rounded-full border border-amber-200">
                  لوحة المشرف
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                تحديد باقة المحل: <span className="font-bold text-stone-800">{business.name}</span> وجدولة فترات الاشتراك
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Status Banner */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${currentVipStatus.badgeColor}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/70 flex items-center justify-center font-black">
              {currentVipStatus.isVip ? '👑' : '🏬'}
            </div>
            <div>
              <div className="text-xs font-bold text-stone-600">الحالة الحالية للباقة:</div>
              <div className="text-sm font-black flex items-center gap-1.5">
                <span>{currentVipStatus.statusLabel}</span>
                {currentVipStatus.isVip && (
                  <ShieldCheck className="h-4 w-4 text-amber-600" />
                )}
              </div>
            </div>
          </div>

          {currentVipStatus.isVip && (
            <button
              type="button"
              onClick={handleRevokeUpgrade}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 text-xs font-black bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-xl shadow-xs transition-all hover:scale-105 cursor-pointer disabled:opacity-50"
            >
              <ArrowDownCircle className="h-4 w-4" />
              <span>سحب الترقية فوراً</span>
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Step 1: Select Plan */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-stone-800">
              ١. تحديد نوع الباقة للمنشأة:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label 
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  packagePlan === 'golden'
                    ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-400/30'
                    : 'bg-white border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="packagePlan"
                  value="golden"
                  checked={packagePlan === 'golden'}
                  onChange={() => {
                    setPackagePlan('golden');
                    setIsVerified(true);
                  }}
                  className="mt-1 text-amber-600 focus:ring-amber-500"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-950">
                    <Crown className="h-4 w-4 text-amber-600" />
                    <span>الباقة الذهبية VIP (ترقية كاملة)</span>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-tight">
                    منيو رقمي + إحصائيات ونقرات فورية + شارة توثيق معتمدة + الرد على التقييمات.
                  </p>
                </div>
              </label>

              <label 
                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  packagePlan === 'basic'
                    ? 'bg-stone-100 border-stone-400 ring-2 ring-stone-400/30'
                    : 'bg-white border-stone-200 hover:border-stone-300'
                }`}
              >
                <input
                  type="radio"
                  name="packagePlan"
                  value="basic"
                  checked={packagePlan === 'basic'}
                  onChange={() => {
                    setPackagePlan('basic');
                    setIsVerified(false);
                  }}
                  className="mt-1 text-stone-600 focus:ring-stone-500"
                />
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-black text-stone-800">
                    <Store className="h-4 w-4 text-stone-500" />
                    <span>الباقة الأساسية (مجانية)</span>
                  </div>
                  <p className="text-[11px] text-stone-500 leading-tight">
                    ظهور اعتيادي في الدليل مع ساعات العمل الحية وخريطة الموقع فقط.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Conditional Golden Upgrade Controls */}
          {packagePlan === 'golden' && (
            <div className="p-4 sm:p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-4 animate-in fade-in slide-in-from-top-2">
              
              <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
                <div className="flex items-center gap-2 font-black text-xs text-stone-800">
                  <Clock className="h-4 w-4 text-[#1a4d2e]" />
                  <span>٢. جدولة مدة الترقية الذهبية (VIP Duration):</span>
                </div>
              </div>

              {/* Schedule Type Options */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setScheduleType('permanent')}
                  className={`py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    scheduleType === 'permanent'
                      ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  ترقية دائمة (بدون انتهاء)
                </button>

                <button
                  type="button"
                  onClick={() => handleApplyPreset(30)}
                  className={`py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    scheduleType === 'custom_duration'
                      ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  فترة محددة (أيام / أشهر)
                </button>

                <button
                  type="button"
                  onClick={() => setScheduleType('custom_dates')}
                  className={`py-2 px-3 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                    scheduleType === 'custom_dates'
                      ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs'
                      : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                  }`}
                >
                  تحديد تواريخ مخصصة 🗓️
                </button>
              </div>

              {/* Fast Presets when custom duration is chosen */}
              {scheduleType === 'custom_duration' && (
                <div className="p-3.5 bg-white rounded-xl border border-stone-200 space-y-2.5 animate-in fade-in">
                  <div className="text-[11px] font-bold text-stone-600">اختر مدة الترقية السريعة:</div>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'أسبوع (7 أيام)', days: 7 },
                      { label: 'شهر (30 يوماً)', days: 30 },
                      { label: '3 أشهر (90 يوماً)', days: 90 },
                      { label: '6 أشهر (180 يوماً)', days: 180 },
                      { label: 'سنة كاملة (365 يوماً)', days: 365 },
                    ].map((preset) => (
                      <button
                        key={preset.days}
                        type="button"
                        onClick={() => handleApplyPreset(preset.days)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                          presetDurationDays === preset.days
                            ? 'bg-amber-100 border-amber-400 text-amber-950 font-black'
                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {endDate && (
                    <div className="text-[11px] font-bold text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200 mt-2 flex items-center gap-1.5">
                      <Hourglass className="h-3.5 w-3.5 text-emerald-600" />
                      <span>ستنتهي هذه الترقية تلقائياً بتاريخ: <strong>{new Date(endDate).toLocaleDateString('ar-JO')}</strong></span>
                    </div>
                  )}
                </div>
              )}

              {/* Custom Date Pickers */}
              {scheduleType === 'custom_dates' && (
                <div className="p-3.5 bg-white rounded-xl border border-stone-200 space-y-3 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-stone-400" />
                        <span>تاريخ بدء الترقية:</span>
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center gap-1">
                        <CalendarDays className="h-3 w-3 text-stone-400" />
                        <span>تاريخ انتهاء الترقية (اختياري):</span>
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        min={startDate || undefined}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-stone-500">
                    * إذا تم ترك تاريخ الانتهاء فارغاً، ستظل الترقية سارية حتى سحبها يدوياً.
                  </p>
                </div>
              )}

              {/* Verification Badge Toggle */}
              <div className="pt-2">
                <label className="flex items-center justify-between p-3 bg-white rounded-xl border border-stone-200 cursor-pointer hover:bg-stone-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-amber-600" />
                    <div>
                      <span className="text-xs font-bold text-stone-800 block">إظهار "العلامة الزرقاء" للحساب الموثّق 🔵</span>
                      <span className="text-[10px] text-stone-500">وسام التوثيق المعتمد بالشارة الزرقاء على بطاقات وصفحة المحل</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isVerified}
                    onChange={e => setIsVerified(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                </label>
              </div>

            </div>
          )}

          {/* Admin Internal Notes */}
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              ملاحظات إدارية عن الترقية أو العقد (اختياري للمشرف):
            </label>
            <input
              type="text"
              value={vipNotes}
              onChange={e => setVipNotes(e.target.value)}
              placeholder="مثال: تم الدفع نقداً - اشتراك تجريبي لمدة شهر - ممثل المبيعات: أحمد"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
            />
          </div>

          {/* Action Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>جاري الحفظ...</span>
              ) : (
                <>
                  <Check className="h-4 w-4 text-[#ff9f1c]" />
                  <span>حفظ وتطبيق التغييرات</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>,
    document.body
  ) : null;
}
