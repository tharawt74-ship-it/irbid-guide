import React from 'react';
import { AlertTriangle, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { motion, AnimatePresence } from 'motion/react';

export function CartConflictModal() {
  const { pendingConflict, businessName, confirmReplaceCart, cancelConflict, items } = useCart();

  if (!pendingConflict) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5 text-right relative overflow-hidden"
        >
          {/* Header Icon */}
          <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="h-6 w-6 text-amber-600 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900">سلتك تحتوي على طلبات من محل آخر!</h3>
              <p className="text-xs text-stone-500 font-medium">لا يمكن دمج طلبات من محلين مختلفين في نفس السلة</p>
            </div>
          </div>

          {/* Explanation Box */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-xs space-y-2 text-stone-800">
            <p className="leading-relaxed font-bold text-amber-950">
              تحتوي سلتك الحالية على <span className="font-black text-amber-700 font-mono">({items.length})</span> أصناف من محل: <span className="font-black underline">{businessName}</span>.
            </p>
            <p className="leading-relaxed text-stone-600">
              أنتم الآن تحاولون إضافة صنف (<span className="font-bold text-stone-900">{pendingConflict.item.name}</span>) من محل آخر: <span className="font-bold text-stone-900">{pendingConflict.business.name}</span>.
            </p>
          </div>

          <p className="text-xs text-stone-500 font-bold leading-relaxed">
            يرجى اختيار ما تود القيام به:
          </p>

          {/* Action Buttons */}
          <div className="space-y-2.5 pt-1">
            <button
              onClick={confirmReplaceCart}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <Trash2 className="h-4 w-4" />
              <span>تفريغ السلة القديمة وبدء طلب جديد من ({pendingConflict.business.name})</span>
            </button>

            <button
              onClick={cancelConflict}
              className="w-full bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-stone-200"
            >
              <ShoppingBag className="h-4 w-4 text-stone-600" />
              <span>الإبقاء على السلة القديمة لـ ({businessName}) بدون إضافة</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
