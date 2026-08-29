import React, { useState } from 'react';
import { useSystemSettings } from '../../contexts/SystemSettingsContext';
import { VipPlanConfig } from '../../types';
import { Crown, DollarSign, Edit3, Check, Plus, Trash2 } from 'lucide-react';

interface VipPlansManagerProps {
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export function VipPlansManager({ showToast }: VipPlansManagerProps) {
  const { vipPlans, updateVipPlan } = useSystemSettings();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);

  const handleStartEdit = (plan: VipPlanConfig) => {
    setEditingId(plan.id);
    setEditPrice(plan.price);
  };

  const handleSave = async (plan: VipPlanConfig) => {
    await updateVipPlan(plan.id, { price: Number(editPrice) });
    showToast(`تم تحديث سعر (${plan.name}) إلى ${editPrice} د.أ`);
    setEditingId(null);
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#e5e1da] shadow-xs space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
        <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
          <Crown className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-black text-stone-900">إدارة أسعار وتفاصيل باقات اشتراك VIP</h2>
          <p className="text-stone-500 text-xs">التحكم في أسعار الاشتراكات والمميزات المقدمة لأصحاب المحلات في إربد</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {vipPlans.map((plan) => (
          <div
            key={plan.id}
            className={`border rounded-2xl p-5 bg-white relative flex flex-col justify-between space-y-4 ${
              plan.popular ? 'border-amber-400 shadow-md ring-2 ring-amber-400/20' : 'border-stone-200'
            }`}
          >
            {plan.popular && (
              <span className="absolute -top-3 right-4 bg-amber-500 text-white text-[10px] font-black px-3 py-0.5 rounded-full shadow-xs">
                الأكثر طلباً ⭐
              </span>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${plan.badgeColor}`}>
                  {plan.badge}
                </span>
                <span className="text-xs font-bold text-stone-400">{plan.period}</span>
              </div>

              <h3 className="text-lg font-black text-stone-900 mb-2">{plan.name}</h3>

              {/* Price Edit Area */}
              <div className="bg-stone-50 p-3 rounded-xl border border-stone-100 flex items-center justify-between mb-4">
                <span className="text-xs font-bold text-stone-500">سعر الاشتراك:</span>
                {editingId === plan.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editPrice}
                      onChange={e => setEditPrice(Number(e.target.value))}
                      className="w-20 bg-white border border-amber-400 rounded-lg px-2 py-1 text-sm font-black text-amber-950"
                    />
                    <button
                      onClick={() => handleSave(plan)}
                      className="bg-[#1a4d2e] text-white p-1.5 rounded-lg"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black text-[#1a4d2e]">{plan.price} <span className="text-xs font-normal">د.أ</span></span>
                    <button
                      onClick={() => handleStartEdit(plan)}
                      className="p-1 text-stone-400 hover:text-stone-700"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-xs font-black text-stone-700 block">المميزات المتضمنة:</span>
                <ul className="space-y-1.5">
                  {plan.features.map((feat, fIdx) => (
                    <li key={fIdx} className="text-xs text-stone-600 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
