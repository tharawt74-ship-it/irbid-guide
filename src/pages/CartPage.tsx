import React from 'react';
import { ShoppingBag, Trash2, MessageCircle, Phone, ArrowRight, Store, Plus, Minus, Check, ChevronLeft } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { Link, useNavigate } from 'react-router';
import { SEO } from '../components/common/SEO';

export function CartPage() {
  const { 
    items, 
    businessId, 
    businessName, 
    businessPhone, 
    totalCount, 
    totalPrice, 
    updateQuantity, 
    removeItem, 
    clearCart, 
    sendOrderViaWhatsapp 
  } = useCart();

  const navigate = useNavigate();

  return (
    <>
      <SEO 
        title="سلة التسوّق وقائمة الحجز | شو في بإربد؟" 
        description="مراجعة وتأكيد طلباتك وحجوزاتك المباشرة من محلات ومقاهي ومطاعم إربد."
      />

      <div className="max-w-3xl mx-auto space-y-6 pb-12" dir="rtl">
        {/* Page Header */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 flex items-center gap-2">
                <span>سلة التسوّق وقائمة الحجز</span>
                <span className="text-xs bg-[#1a4d2e] text-white px-2.5 py-0.5 rounded-full font-bold">
                  {totalCount} عنصر
                </span>
              </h1>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                مراجعة وتأكيد طلبك من محلات ودليل إربد
              </p>
            </div>
          </div>

          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="flex items-center gap-1.5 text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 px-3 py-2 rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span>تفريغ السلة</span>
            </button>
          )}
        </div>

        {/* Empty State */}
        {items.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center border border-stone-200 shadow-xs space-y-4 my-8">
            <div className="w-20 h-20 bg-stone-100 text-stone-400 rounded-3xl flex items-center justify-center mx-auto">
              <ShoppingBag className="h-10 w-10 stroke-1" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-black text-stone-800">سلتك فارغة حالياً</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
                لم تقم بإضافة أي أصناف أو وجبات أو خدمات إلى السلة بعد. يمكنك تصفح محلات إربد وعروضها المميزة وإضافتها بنقرة واحدة!
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/"
                className="inline-flex items-center gap-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white font-black px-6 py-3 rounded-2xl text-xs shadow-xs transition-colors"
              >
                <Store className="h-4 w-4" />
                <span>استكشف محلات وعروض إربد</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Cart Items List */}
            <div className="md:col-span-2 space-y-4">
              {/* Business Info Banner */}
              {businessName && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 shadow-3xs">
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-amber-800 block">الطلب من محل:</span>
                      <h3 className="text-sm font-black text-stone-900">{businessName}</h3>
                    </div>
                  </div>

                  {businessId && (
                    <Link
                      to={`/business/${businessId}`}
                      className="text-xs font-bold text-[#1a4d2e] hover:underline flex items-center gap-1 shrink-0 bg-white px-3 py-1.5 rounded-xl border border-stone-200"
                    >
                      <span>صفحة المحل</span>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              )}

              <div className="bg-white rounded-3xl border border-stone-200 shadow-xs divide-y divide-stone-100 overflow-hidden">
                {items.map((cartItem) => {
                  const p = typeof cartItem.price === 'number' ? cartItem.price : parseFloat(cartItem.price) || 0;
                  const itemTotal = p * cartItem.quantity;
                  return (
                    <div key={cartItem.id} className="p-4 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {cartItem.image ? (
                          <img 
                            src={cartItem.image} 
                            alt={cartItem.name} 
                            className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-stone-100"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center shrink-0 border border-stone-200/60">
                            <ShoppingBag className="h-6 w-6" />
                          </div>
                        )}

                        <div className="space-y-1 min-w-0 flex-1">
                          <h4 className="font-black text-stone-900 text-sm">{cartItem.name}</h4>
                          <p className="text-xs font-mono text-[#1a4d2e] font-bold">
                            {p.toFixed(2)} د.أ <span className="text-[10px] text-stone-400 font-sans">للعنصر</span>
                          </p>
                          {cartItem.options && cartItem.options.length > 0 && (
                            <p className="text-[10px] text-stone-500 font-medium">
                              خيارات: {cartItem.options.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Controls & Total */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-sm font-black text-stone-900 font-mono">
                          {itemTotal.toFixed(2)} د.أ
                        </span>

                        <div className="flex items-center gap-1.5 bg-stone-100 rounded-xl p-1 border border-stone-200">
                          <button
                            onClick={() => updateQuantity(cartItem.id, -1)}
                            className="w-6 h-6 rounded-lg bg-white text-stone-800 flex items-center justify-center font-black hover:bg-stone-200 text-xs cursor-pointer shadow-3xs"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center font-black text-xs font-mono">{cartItem.quantity}</span>
                          <button
                            onClick={() => updateQuantity(cartItem.id, 1)}
                            className="w-6 h-6 rounded-lg bg-white text-stone-800 flex items-center justify-center font-black hover:bg-stone-200 text-xs cursor-pointer shadow-3xs"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeItem(cartItem.id)}
                          className="text-[10px] font-bold text-red-500 hover:text-red-700 hover:underline cursor-pointer"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Summary & Actions Side Panel */}
            <div className="space-y-4">
              <div className="bg-white rounded-3xl border border-stone-200 shadow-xs p-5 space-y-4">
                <h3 className="font-black text-stone-900 border-b border-stone-100 pb-3 text-sm">ملخص الحساب</h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-stone-600">
                    <span>مجموع الأصناف:</span>
                    <span className="font-bold text-stone-900">{totalCount} قطعة/خدمة</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>المحل المستهدف:</span>
                    <span className="font-bold text-stone-900">{businessName || 'غير محدد'}</span>
                  </div>
                  <div className="flex justify-between text-stone-600">
                    <span>طريقة الاستلام:</span>
                    <span className="font-bold text-emerald-700">مباشر / حسب الاتفاق</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-200 flex justify-between items-center font-black text-stone-900 text-base">
                  <span>المجموع التقريبي:</span>
                  <span className="text-xl text-[#1a4d2e] font-mono">{totalPrice.toFixed(2)} د.أ</span>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={sendOrderViaWhatsapp}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>تأكيد الطلب والحجز عبر الواتساب</span>
                  </button>

                  {businessPhone && (
                    <a
                      href={`tel:${businessPhone}`}
                      className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Phone className="h-4 w-4" />
                      <span>اتصال مباشر بالمحل ({businessPhone})</span>
                    </a>
                  )}
                </div>

                <p className="text-[10px] text-stone-400 text-center font-medium leading-relaxed pt-1">
                  * الطلب يتم إرساله مباشرة لمحل ({businessName}) عبر الواتساب أو الهاتف لتجهيزه واستلامه.
                </p>
              </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}
