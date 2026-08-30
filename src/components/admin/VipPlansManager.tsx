import React, { useState } from 'react';
import { useSystemSettings } from '../../contexts/SystemSettingsContext';
import { VipPlanConfig } from '../../types';
import { Crown, DollarSign, Edit3, Check, Plus, Trash2, Info, Sparkles, Save, X, Percent } from 'lucide-react';

interface VipPlansManagerProps {
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export function VipPlansManager({ showToast }: VipPlansManagerProps) {
  const { vipPlans, updateVipPlan } = useSystemSettings();
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Local edit states
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editYearlyPrice, setEditYearlyPrice] = useState<number>(0);
  const [editInternalNote, setEditInternalNote] = useState<string>('');
  const [editFeatures, setEditFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState<string>('');

  const handleStartEdit = (plan: VipPlanConfig) => {
    setEditingId(plan.id);
    setEditPrice(plan.price);
    setEditYearlyPrice(plan.yearlyPrice || 0);
    setEditInternalNote(plan.internalNote || '');
    setEditFeatures([...plan.features]);
    setNewFeature('');
  };

  const handleSave = async (planId: string) => {
    if (editPrice < 0 || (editYearlyPrice !== undefined && editYearlyPrice < 0)) {
      showToast('الأسعار لا يمكن أن تكون بقيمة سالبة!', 'error');
      return;
    }

    try {
      await updateVipPlan(planId, {
        price: Number(editPrice),
        yearlyPrice: editYearlyPrice ? Number(editYearlyPrice) : undefined,
        internalNote: editInternalNote || undefined,
        features: editFeatures,
      });
      showToast('تم حفظ تعديلات الباقة بنجاح ومزامنتها على الموقع', 'success');
      setEditingId(null);
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء حفظ التعديلات!', 'error');
    }
  };

  const handleAddFeature = () => {
    if (!newFeature.trim()) return;
    if (editFeatures.includes(newFeature.trim())) {
      showToast('هذه الميزة مضافة مسبقاً!', 'info');
      return;
    }
    setEditFeatures([...editFeatures, newFeature.trim()]);
    setNewFeature('');
  };

  const handleRemoveFeature = (index: number) => {
    setEditFeatures(editFeatures.filter((_, idx) => idx !== index));
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#e5e1da] shadow-xs space-y-6 text-right" dir="rtl">
      
      {/* Header with detailed strategic alerts */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="p-3.5 bg-amber-50 rounded-2xl text-amber-600">
            <Crown className="h-6 w-6 fill-amber-500 text-amber-500 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-black text-stone-900">إدارة الباقات والأسعار الاستراتيجية</h2>
            <p className="text-stone-500 text-xs mt-0.5">التحكم بالباقة الأساسية، الباقة الذهبية VIP، والخدمات التسويقية الإضافية</p>
          </div>
        </div>
      </div>

      {/* Marketing Psychology Banner */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50/10 to-transparent border border-emerald-100 p-4.5 rounded-2xl text-xs text-emerald-950 space-y-2 leading-relaxed">
        <span className="font-black flex items-center gap-1.5 text-emerald-800">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          💡 استراتيجية التسعير المتفق عليها لعلم النفس التسويقي:
        </span>
        <ul className="list-disc pr-4 space-y-1 text-stone-600">
          <li>
            <strong className="text-emerald-800">الباقة الأساسية:</strong> السعر هو <strong className="text-emerald-800">2 دينار مدى الحياة</strong>. لا يظهر هذا السعر للعامة على الموقع (يظهر كـ "سعر رمزي تفعيل للأبد") لحماية مصداقيتك وتجنب الشعور بالمخادعة، وسوف تبلغهم به بشكل شخصي فور تواصلهم بالواتساب.
          </li>
          <li>
            <strong className="text-emerald-800">الباقة الذهبية VIP:</strong> تظهر بسعر <strong className="text-emerald-800">19 د.أ شهرياً</strong> أو <strong className="text-emerald-800">119 د.أ سنوياً</strong>. عند تفعيل السنوي، يبرز النظام تلقائياً نسبة توفير <strong className="text-emerald-800">48%</strong> وتجزئة تكلفة تعادل <strong className="text-emerald-800">9.9 د.أ فقط شهرياً</strong> كحافز قوي للاشتراك السنوي لجمع كاش فوري سريع.
          </li>
        </ul>
      </div>

      {/* Plans List and Editor cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {vipPlans.map((plan) => {
          const isEditing = editingId === plan.id;
          
          // Calculate discount preview dynamically for VIP Gold
          let discountPercent = 0;
          let calculatedMonthlyEquivalent = 0;
          if (plan.id === 'golden') {
            const currentPrice = isEditing ? editPrice : plan.price;
            const currentYearlyPrice = isEditing ? editYearlyPrice : (plan.yearlyPrice || 119);
            if (currentPrice > 0 && currentYearlyPrice > 0) {
              const fullYearPrice = currentPrice * 12;
              discountPercent = Math.round(((fullYearPrice - currentYearlyPrice) / fullYearPrice) * 100);
              calculatedMonthlyEquivalent = Number((currentYearlyPrice / 12).toFixed(1));
            }
          }

          return (
            <div
              key={plan.id}
              className={`border rounded-2xl bg-white p-5 flex flex-col justify-between space-y-5 transition-all relative ${
                plan.id === 'golden' 
                  ? 'border-amber-400 shadow-md ring-4 ring-amber-400/5' 
                  : 'border-stone-200'
              }`}
            >
              {plan.id === 'golden' && (
                <div className="absolute top-4 left-4 bg-amber-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Percent className="h-2.5 w-2.5" />
                  <span>خصم تشجيعي مفعّل</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Badge and Name */}
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${plan.badgeColor}`}>
                    {plan.badge}
                  </span>
                  <span className="text-xs font-bold text-stone-400">{plan.period}</span>
                </div>

                <div>
                  <h3 className="text-base font-black text-stone-900">{plan.name}</h3>
                  {plan.internalNote && (
                    <p className="text-[10px] text-red-600 bg-red-50 border border-red-100 px-2 py-1 rounded-md mt-1 font-bold">
                      ⚠️ {plan.internalNote}
                    </p>
                  )}
                </div>

                {/* EDITING INTERFACE */}
                {isEditing ? (
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
                    <span className="text-xs font-black text-stone-800 block pb-1 border-b border-stone-200">
                      📝 نافذة تعديل الأسعار
                    </span>
                    
                    {/* Basic Plan Editor */}
                    {plan.id === 'basic' && (
                      <div className="space-y-2.5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-500 block">سعر التفعيل الرمزي (داخلي د.أ):</label>
                          <div className="relative">
                            <input
                              type="number"
                              value={editPrice}
                              onChange={e => setEditPrice(Number(e.target.value))}
                              className="w-full bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-xs font-black text-stone-900 focus:outline-none focus:border-[#1a4d2e]"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-stone-400">دينار</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-stone-500 block">الملاحظة الداخلية للمدير:</label>
                          <textarea
                            value={editInternalNote}
                            onChange={e => setEditInternalNote(e.target.value)}
                            className="w-full bg-white border border-stone-300 rounded-lg p-2 text-[10px] font-bold text-stone-700 h-16 resize-none focus:outline-none focus:border-[#1a4d2e]"
                            placeholder="اكتب ملاحظة التفعيل..."
                          />
                        </div>
                      </div>
                    )}

                    {/* Gold VIP Plan Editor (Monthly & Yearly) */}
                    {plan.id === 'golden' && (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-stone-500 block">السعر الشهري (د.أ):</label>
                            <input
                              type="number"
                              value={editPrice}
                              onChange={e => setEditPrice(Number(e.target.value))}
                              className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-black text-[#1a4d2e]"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-bold text-stone-500 block">السعر السنوي (د.أ):</label>
                            <input
                              type="number"
                              value={editYearlyPrice}
                              onChange={e => setEditYearlyPrice(Number(e.target.value))}
                              className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs font-black text-[#1a4d2e]"
                            />
                          </div>
                        </div>

                        {/* Real-time Psychological Calculations */}
                        <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100 text-[10px] text-amber-950 space-y-1 font-bold">
                          <div className="flex justify-between">
                            <span>نسبة الخصم المعروضة:</span>
                            <span className="text-red-600">{discountPercent}% خصم 🔥</span>
                          </div>
                          <div className="flex justify-between">
                            <span>التكلفة الشهرية المقابلة:</span>
                            <span className="text-emerald-700">{calculatedMonthlyEquivalent} د.أ / شهر</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pay Per Use Editor */}
                    {plan.id !== 'basic' && plan.id !== 'golden' && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-stone-500 block">سعر التكلفة البدئية (د.أ):</label>
                        <input
                          type="number"
                          value={editPrice}
                          onChange={e => setEditPrice(Number(e.target.value))}
                          className="w-full bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-xs font-black"
                        />
                      </div>
                    )}

                    {/* Features Editor Inside Form */}
                    <div className="space-y-2 pt-2 border-t border-stone-200">
                      <label className="text-[10px] font-black text-stone-700 block">إدارة وتعديل المميزات:</label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={newFeature}
                          onChange={e => setNewFeature(e.target.value)}
                          placeholder="ميزة جديدة..."
                          className="flex-1 bg-white border border-stone-300 rounded-lg px-2 py-1 text-[10px]"
                        />
                        <button
                          type="button"
                          onClick={handleAddFeature}
                          className="bg-[#1a4d2e] hover:bg-[#133b22] text-white p-1 rounded-lg transition-colors cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                        {editFeatures.map((feat, idx) => (
                          <div key={idx} className="flex items-center justify-between gap-2 p-1.5 bg-white border border-stone-200 rounded-md">
                            <span className="text-[9px] text-stone-600 line-clamp-1">{feat}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFeature(idx)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded-sm cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Save / Cancel buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        onClick={() => handleSave(plan.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Save className="h-3 w-3" />
                        <span>حفظ التعديلات</span>
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="bg-stone-200 hover:bg-stone-300 text-stone-700 py-1.5 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <X className="h-3 w-3" />
                        <span>إلغاء</span>
                      </button>
                    </div>

                  </div>
                ) : (
                  /* NORMAL PREVIEW MODE */
                  <div className="space-y-4">
                    {/* Price Showcase Area */}
                    <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-100 flex flex-col justify-center space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-stone-500">
                          {plan.id === 'basic' ? 'قيمة الرسوم الداخلية:' : 'سعر الباقة النشط:'}
                        </span>
                        <button
                          onClick={() => handleStartEdit(plan)}
                          className="text-[#1a4d2e] hover:bg-[#1a4d2e]/10 px-2 py-1 rounded-md text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>تعديل الباقة والأسعار</span>
                        </button>
                      </div>

                      {plan.id === 'basic' ? (
                        <div className="space-y-1 pt-1">
                          <span className="text-lg font-black text-red-600 block">
                            {plan.price} د.أ <span className="text-xs text-stone-500 font-bold">(داخلي بالواتساب)</span>
                          </span>
                          <span className="text-[9px] text-stone-400 block font-semibold leading-relaxed">
                            💡 يظهر للجمهور كـ "سعر رمزي" لمنع الإحراج وتجنب التناقض.
                          </span>
                        </div>
                      ) : plan.id === 'golden' ? (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-stone-700">الاشتراك الشهري:</span>
                            <span className="text-sm font-black text-[#1a4d2e]">{plan.price} د.أ</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-stone-700">الاشتراك السنوي:</span>
                            <span className="text-sm font-black text-amber-600">{plan.yearlyPrice || 119} د.أ</span>
                          </div>
                          <div className="bg-emerald-50 border border-emerald-100 p-1.5 rounded-lg text-[9px] text-emerald-800 text-center font-extrabold">
                            السنوي يعادل {calculatedMonthlyEquivalent} د.أ / شهرياً (وفر {discountPercent}% 🔥)
                          </div>
                        </div>
                      ) : (
                        <span className="text-lg font-black text-[#1a4d2e] pt-1">
                          {plan.price} د.أ <span className="text-xs font-normal text-stone-400">/{plan.period}</span>
                        </span>
                      )}
                    </div>

                    {/* Features list showcase */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-stone-700 block">المميزات المعروضة للجمهور ({plan.features.length}):</span>
                      <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                        {plan.features.map((feat, fIdx) => (
                          <li key={fIdx} className="text-[10px] text-stone-600 flex items-start gap-1.5 leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
