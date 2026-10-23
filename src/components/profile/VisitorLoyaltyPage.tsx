import React, { useEffect, useState } from 'react';
import { 
  Award, 
  Gift, 
  Sparkles, 
  Check, 
  Store, 
  QrCode, 
  RefreshCw, 
  Copy, 
  Maximize2, 
  X,
  Phone,
  Mail,
  ShieldCheck,
  ChevronLeft
} from 'lucide-react';
import { QRCodeDisplay } from '../common/QRCodeDisplay';
import { useAuth } from '../../contexts/AuthContext';
import { UserLoyaltyCard } from '../../types';
import { fetchUserLoyaltyCards } from '../../lib/loyaltyHelper';
import { Link } from 'react-router';

export function VisitorLoyaltyPage() {
  const { currentUser } = useAuth();
  const [cards, setCards] = useState<UserLoyaltyCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'ready' | 'active'>('all');
  const [copiedId, setCopiedId] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedCardForClaim, setSelectedCardForClaim] = useState<UserLoyaltyCard | null>(null);

  // Payload encoded in the visitor's QR code
  const loyaltyQrPayload = currentUser?.uid 
    ? `shofi_loyalty_user:${currentUser.uid}`
    : '';

  const loadCards = async () => {
    if (!currentUser?.uid) return;
    setLoading(true);
    try {
      const list = await fetchUserLoyaltyCards(currentUser.uid);
      setCards(list);
    } catch (e) {
      console.warn('Error loading user loyalty cards:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCards();
  }, [currentUser?.uid]);

  const handleCopyId = () => {
    if (!currentUser?.uid) return;
    navigator.clipboard.writeText(currentUser.uid);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const filteredCards = cards.filter(card => {
    const isReady = card.isRewardReady || (card.currentStamps >= (card.targetStamps || 6));
    if (filter === 'ready') return isReady;
    if (filter === 'active') return !isReady;
    return true;
  });

  const readyRewardsCount = cards.filter(c => c.isRewardReady || c.currentStamps >= (c.targetStamps || 6)).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto" dir="rtl">
      {/* QR Code Presentation */}
      <div className="flex flex-col items-center justify-center text-center space-y-4 pt-2">
        <div 
          onClick={() => setIsQrModalOpen(true)}
          className="bg-white p-4 rounded-3xl shadow-sm border border-stone-200 relative cursor-pointer group hover:scale-102 transition-transform"
        >
          {currentUser && loyaltyQrPayload ? (
            <QRCodeDisplay 
              value={loyaltyQrPayload}
              size={170}
              level="H"
              includeMargin={false}
            />
          ) : (
            <div className="w-44 h-44 flex items-center justify-center text-stone-400 text-xs text-center p-4">
              يرجى تسجيل الدخول لعرض رمز الـ QR الخاص بك
            </div>
          )}
          <div className="absolute inset-0 bg-stone-950/20 backdrop-blur-3xs rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-black gap-1">
            <Maximize2 className="h-4 w-4" />
            <span>تكبير</span>
          </div>
        </div>

        {/* Buttons: تكبير الرمز و نسخ رقم الولاء */}
        <div className="flex items-center justify-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsQrModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span>تكبير الرمز</span>
          </button>

          <button
            type="button"
            onClick={handleCopyId}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all border border-stone-200 cursor-pointer active:scale-95"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>{copiedId ? 'تم النسخ' : 'نسخ رقم الولاء'}</span>
          </button>
        </div>
      </div>

      {/* Pillshaped Filter Tabs */}
      <div className="flex items-center justify-center gap-2 pt-1 pb-1">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
            filter === 'all'
              ? 'bg-[#1a4d2e] text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          الكل
        </button>

        <button
          type="button"
          onClick={() => setFilter('ready')}
          className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
            filter === 'ready'
              ? 'bg-[#1a4d2e] text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          مكافآت جاهزة
        </button>

        <button
          type="button"
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-full text-xs font-black transition-all cursor-pointer ${
            filter === 'active'
              ? 'bg-[#1a4d2e] text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          قيد التجميع
        </button>
      </div>

      {/* 3. CARDS LIST / GRID */}
      {loading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-3xl border border-stone-200">
          <div className="w-9 h-9 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-stone-400">جارٍ تحميل بطاقات الولاء الخاصة بك...</p>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-stone-200 p-6">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-3xl flex items-center justify-center mx-auto border border-amber-200">
            <Award className="h-8 w-8" />
          </div>
          <h4 className="text-base font-black text-stone-900">
            {filter === 'ready' ? 'لا توجد مكافآت جاهزة للاستلام حالياً' : 'ليس لديك بطاقات ولاء نشطة بعد'}
          </h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
            عند زيارتك للمحلات والمطاعم المشاركة، اطلب من المحل مسح رمز الـ QR الظاهر في أعلى الصفحة لتسجيل أول ختم لك وبدء تجميع مكافأتك.
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white text-xs font-black rounded-xl transition-all shadow-xs"
            >
              <Store className="h-4 w-4" />
              <span>استكشف المحلات في إربد</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {filteredCards.map((card) => {
            const target = card.targetStamps || 6;
            const current = card.currentStamps || 0;
            const percent = Math.min(100, Math.round((current / target) * 100));
            const isReady = card.isRewardReady || current >= target;

            return (
              <div
                key={card.id}
                className={`rounded-3xl p-5 sm:p-6 border transition-all flex flex-col justify-between relative overflow-hidden ${
                  isReady
                    ? 'bg-gradient-to-br from-emerald-950 via-stone-950 to-teal-950 text-white border-emerald-500/50 shadow-lg'
                    : 'bg-white border-stone-200/90 text-stone-900 shadow-xs'
                }`}
              >
                {/* Store Header */}
                <div>
                  <div className="flex items-center justify-between gap-3 border-b pb-3 mb-4 border-stone-100 dark:border-white/10">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border ${
                        isReady ? 'bg-white/10 border-white/20' : 'bg-stone-50 border-stone-200'
                      }`}>
                        {card.businessLogoUrl ? (
                          <img src={card.businessLogoUrl} alt={card.businessName} className="w-full h-full object-cover" />
                        ) : (
                          <Store className={`h-5 w-5 ${isReady ? 'text-emerald-400' : 'text-[#1a4d2e]'}`} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm sm:text-base font-black truncate">{card.businessName}</h4>
                        <span className={`text-[11px] font-bold block ${isReady ? 'text-stone-300' : 'text-stone-400'}`}>
                          {card.businessCategory || 'محل تجاري'}
                        </span>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border shrink-0 ${
                      isReady
                        ? 'bg-emerald-500 text-stone-950 border-emerald-400 shadow-xs animate-pulse'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {isReady ? 'المكافأة جاهزة' : `${current} من ${target} أختام`}
                    </span>
                  </div>

                  {/* Stamp Circles Grid */}
                  <div className="py-2">
                    <div className="flex items-center justify-between text-[11px] font-bold mb-2">
                      <span className={isReady ? 'text-emerald-300' : 'text-stone-500'}>
                        الأختام: {current} من {target}
                      </span>
                      <span className={isReady ? 'text-emerald-300' : 'text-stone-500'}>
                        {percent}%
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      {Array.from({ length: target }).map((_, i) => {
                        const isStamped = i < current;
                        return (
                          <div
                            key={i}
                            className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-0.5 border text-center transition-all ${
                              isStamped
                                ? (isReady
                                    ? 'bg-emerald-400 text-stone-950 border-emerald-300 shadow-xs scale-102'
                                    : 'bg-amber-500 text-white border-amber-600 shadow-2xs')
                                : (isReady
                                    ? 'bg-white/5 border-dashed border-white/20 text-white/30'
                                    : 'bg-stone-50 border-dashed border-stone-200 text-stone-300')
                            }`}
                          >
                            {isStamped ? (
                              <>
                                <Check className="h-4 w-4 stroke-[3]" />
                                <span className="text-[8px] font-black">مختوم</span>
                              </>
                            ) : (
                              <span className="text-xs font-black">{i + 1}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Reward Footer */}
                <div className="pt-4 border-t mt-4 border-stone-100 dark:border-white/10 space-y-3">
                  <div className="flex items-center gap-2">
                    <Gift className={`h-4 w-4 shrink-0 ${isReady ? 'text-emerald-400' : 'text-amber-500'}`} />
                    <div className="min-w-0">
                      <span className={`text-[10px] font-bold block ${isReady ? 'text-stone-300' : 'text-stone-400'}`}>
                        المكافأة:
                      </span>
                      <span className={`text-xs font-black truncate block ${isReady ? 'text-white' : 'text-stone-800'}`}>
                        {card.rewardTitle || 'مكافأة مجانية'}
                      </span>
                    </div>
                  </div>

                  {isReady && (
                    <button
                      type="button"
                      onClick={() => setSelectedCardForClaim(card)}
                      className="w-full py-2.5 px-3 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>إبراز البطاقة لاستلام الهدية من المحل</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FULL-SCREEN QR CODE MODAL FOR EASY CASHIER SCANNING */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-[100020] bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-5 border border-stone-200 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h4 className="text-sm font-black text-stone-900">رمز الولاء الخاص بك</h4>
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-inner border border-stone-200 inline-block">
              <QRCodeDisplay 
                value={loyaltyQrPayload}
                size={230}
                level="H"
                includeMargin={false}
              />
            </div>

            <div className="space-y-1">
              <h5 className="text-sm font-black text-stone-900">{currentUser?.displayName || 'زبون المنصة'}</h5>
              <p className="text-xs text-stone-500 leading-relaxed">
                أظهر هذه الشاشة لكاشير المحل ليقوم بمسح الرمز وإضافة الختم فوراً
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsQrModalOpen(false)}
              className="w-full py-2.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white text-xs font-black rounded-xl transition-all cursor-pointer"
            >
              تم
            </button>
          </div>
        </div>
      )}

      {/* CLAIM REWARD DETAIL MODAL */}
      {selectedCardForClaim && (
        <div className="fixed inset-0 z-[100020] bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 border border-stone-200 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto border border-emerald-200">
              <Gift className="h-7 w-7" />
            </div>

            <div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                مكافأة جاهزة للاستلام
              </span>
              <h4 className="text-base font-black text-stone-900 mt-2">
                {selectedCardForClaim.businessName}
              </h4>
              <p className="text-xs text-stone-600 mt-1 font-bold">
                {selectedCardForClaim.rewardTitle}
              </p>
            </div>

            <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-[11px] text-stone-600 space-y-1">
              <p className="font-bold text-stone-800">أظهر هذه الشاشة لمحاسب المحل عند الدفع</p>
              <p>رقم تعريف البطاقة: <span className="font-mono font-bold text-stone-900">{selectedCardForClaim.id}</span></p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedCardForClaim(null)}
              className="w-full py-2.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white font-black text-xs rounded-xl transition-all cursor-pointer"
            >
              تم
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
