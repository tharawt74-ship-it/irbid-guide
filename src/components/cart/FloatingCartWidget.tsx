import React, { useState } from 'react';
import { ShoppingBag, X, Trash2, ChevronDown, ChevronUp, MessageCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { Link, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';

export function FloatingCartWidget() {
  const { 
    items, 
    businessName, 
    totalCount, 
    totalPrice, 
    clearCart, 
    isFloatingCartVisible, 
    hideFloatingCart, 
    showFloatingCart,
    sendOrderViaWhatsapp,
    updateQuantity
  } = useCart();

  const navigate = useNavigate();

  // If no items in cart, do not show anything
  if (totalCount === 0) return null;

  return (
    <>
      <AnimatePresence>
        {/* Expanded Floating Cart Card */}
        {isFloatingCartVisible ? (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-22 left-3 right-3 md:bottom-6 md:left-auto md:right-6 md:w-[380px] z-50"
            dir="rtl"
          >
            <div className="bg-white/98 backdrop-blur-md rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.18)] border-2 border-amber-400/80 p-4 space-y-3.5 relative overflow-hidden">
              
              {/* Header */}
              <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0 font-bold">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-stone-900 leading-tight">سلتك / قائمة حجزك الحالية</h4>
                    <p className="text-[11px] text-stone-500 font-medium">
                      {businessName ? `محل: ${businessName}` : `تم تحديد ${totalCount} خدمات/أصناف`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={clearCart}
                    className="flex items-center gap-1 text-[11px] font-bold text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                    title="تفريغ السلة"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">تفريغ</span>
                  </button>

                  <button
                    onClick={hideFloatingCart}
                    className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors cursor-pointer"
                    title="إخفاء نافذة السلة العائمة (يبقى المحتوى حفظاً)"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Item List Preview (Max 3 visible with scroll) */}
              <div className="max-h-36 overflow-y-auto space-y-2 text-xs divide-y divide-stone-100 pr-1">
                {items.map((cartItem) => {
                  const p = typeof cartItem.price === 'number' ? cartItem.price : parseFloat(cartItem.price) || 0;
                  const itemTotal = p * cartItem.quantity;
                  return (
                    <div key={cartItem.id} className="pt-2 first:pt-0 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="font-black text-stone-900 block truncate">{cartItem.name}</span>
                        <span className="text-[10px] text-stone-500 font-bold">
                          ({cartItem.quantity} × {p.toFixed(2)} د.أ)
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-black text-amber-700 font-mono text-xs">
                          {itemTotal.toFixed(2)} د.أ
                        </span>

                        <div className="flex items-center gap-1 bg-stone-100 rounded-lg p-0.5">
                          <button
                            onClick={() => updateQuantity(cartItem.id, -1)}
                            className="w-5 h-5 rounded-md bg-white text-stone-700 flex items-center justify-center font-bold hover:bg-stone-200 text-xs cursor-pointer shadow-3xs"
                          >
                            -
                          </button>
                          <span className="w-4 text-center font-bold text-[11px]">{cartItem.quantity}</span>
                          <button
                            onClick={() => updateQuantity(cartItem.id, 1)}
                            className="w-5 h-5 rounded-md bg-white text-stone-700 flex items-center justify-center font-bold hover:bg-stone-200 text-xs cursor-pointer shadow-3xs"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Calculation Row */}
              <div className="flex items-center justify-between pt-2 border-t border-stone-200 text-xs font-black">
                <span className="text-stone-600">الحساب الإجمالي التقريبي:</span>
                <span className="text-base text-[#1a4d2e] font-mono">{totalPrice.toFixed(2)} د.أ</span>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={sendOrderViaWhatsapp}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                >
                  <MessageCircle className="h-4 w-4" />
                  <span>تأكيد الطلب والحجز عبر الواتساب</span>
                </button>

                <button
                  onClick={() => navigate('/cart')}
                  className="w-10 h-10 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl flex items-center justify-center shrink-0 cursor-pointer shadow-xs"
                  title="عرض السلة بالكامل"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Minimized Floating Bubble Button */
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-22 right-4 md:bottom-6 md:right-6 z-50"
            dir="rtl"
          >
            <button
              onClick={showFloatingCart}
              className="group flex items-center gap-3 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-4 py-3 rounded-full shadow-2xl border-2 border-amber-400 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <div className="relative">
                <ShoppingBag className="h-6 w-6 text-amber-300" />
                <span className="absolute -top-2 -right-2.5 bg-red-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#1a4d2e]">
                  {totalCount}
                </span>
              </div>
              <div className="flex flex-col text-right">
                <span className="text-xs font-black text-amber-300">سلتك المفتوحة</span>
                <span className="text-[10px] font-bold text-emerald-100 font-mono">{totalPrice.toFixed(2)} د.أ</span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
