import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Gift, Check, Clock, Trash2, Tag, Copy, ExternalLink, Calendar, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router';
import { fetchUserRewards, markRewardUsed, deleteReward, UserReward } from '../../lib/rewardHelper';

export function VisitorRewardsTab() {
  const { currentUser } = useAuth();
  const [rewards, setRewards] = useState<(UserReward & { isCampaignExpired?: boolean; giftCodeEndDate?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRewards() {
      if (!currentUser) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const list = await fetchUserRewards(currentUser.uid);

        // Now for each reward, fetch the business to see if the overall campaign has ended
        const rewardsWithBizStatus = await Promise.all(list.map(async (reward) => {
          if (!db) return { ...reward, isCampaignExpired: false, giftCodeEndDate: undefined };
          try {
            const bizDoc = await getDoc(doc(db, 'businesses', reward.businessId));
            if (bizDoc.exists()) {
              const bizData = bizDoc.data();
              const giftCodeEndDate = bizData.giftCodeEndDate;
              const giftCodeEnabled = bizData.giftCodeEnabled;
              let isCampaignExpired = false;
              if (giftCodeEndDate) {
                const todayStr = new Date().toISOString().split('T')[0];
                if (todayStr > giftCodeEndDate || !giftCodeEnabled) {
                  isCampaignExpired = true;
                }
              }
              return { ...reward, isCampaignExpired, giftCodeEndDate };
            }
          } catch (e) {
            console.error("Error fetching business info for reward:", e);
          }
          return { ...reward, isCampaignExpired: false, giftCodeEndDate: undefined };
        }));

        // Check for auto-deletion of items older than 3 days
        const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const activeRewards: typeof rewardsWithBizStatus = [];

        for (const reward of rewardsWithBizStatus) {
          const isCodeExpired = now > reward.expiresAt;
          const isUsedOver3Days = reward.used && reward.usedAt && (reward.usedAt + threeDaysMs < now);
          const isCodeExpiredOver3Days = isCodeExpired && (reward.expiresAt + threeDaysMs < now);
          
          let isCampaignExpiredOver3Days = false;
          if (reward.isCampaignExpired && reward.giftCodeEndDate) {
            const expDate = new Date(reward.giftCodeEndDate).getTime();
            if (expDate + threeDaysMs < now) {
              isCampaignExpiredOver3Days = true;
            }
          }

          if (isUsedOver3Days || isCodeExpiredOver3Days || isCampaignExpiredOver3Days) {
            // Auto delete from database and local storage!
            try {
              await deleteReward(currentUser.uid, reward.id, reward.code);
            } catch (err) {
              console.error("Auto delete failed:", err);
            }
          } else {
            activeRewards.push(reward);
          }
        }

        // Sort by createdAt descending
        activeRewards.sort((a, b) => b.createdAt - a.createdAt);
        setRewards(activeRewards);
      } catch (err) {
        console.error("Error fetching rewards:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRewards();
  }, [currentUser]);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleMarkAsUsed = async (rewardId: string, code: string, currentUsed: boolean) => {
    if (!currentUser) return;
    const nextUsed = !currentUsed;
    const nextUsedAt = nextUsed ? Date.now() : undefined;
    try {
      await markRewardUsed(currentUser.uid, rewardId, code, nextUsed);
      setRewards(prev => prev.map(r => (r.id === rewardId || r.code === code) ? { ...r, used: nextUsed, usedAt: nextUsedAt } : r));
    } catch (err) {
      console.error("Error updating used status:", err);
    }
  };

  const getStatusBadge = (reward: typeof rewards[0]) => {
    const today = Date.now();
    const isCodeExpired = today > reward.expiresAt;
    const isCampaignExpired = reward.isCampaignExpired;

    if (reward.used) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 text-[11px] font-black shadow-3xs">
          <Check className="h-3.5 w-3.5 text-red-600" />
          <span>تم الاستهلاك ✔️</span>
        </span>
      );
    }

    if (isCodeExpired || isCampaignExpired) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-black">
          <AlertTriangle className="h-3 w-3" />
          <span>منتهي الصلاحية</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-200/60">
        <Clock className="h-3 w-3" />
        <span>جاهز للاستخدام</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block w-8 h-8 rounded-full border-2 border-stone-200 border-t-emerald-600 animate-spin"></div>
        <p className="text-xs font-bold text-stone-500 mt-3">جاري تحميل مكافآتك الكريمة...</p>
      </div>
    );
  }

  if (rewards.length === 0) {
    return (
      <div className="text-center py-12 bg-stone-50/50 rounded-2xl border border-dashed border-stone-200 p-6 space-y-3 text-stone-500 text-right" dir="rtl">
        <Gift className="h-10 w-10 text-stone-300 mx-auto" />
        <h4 className="text-xs font-black text-stone-800 text-center">لا توجد لديك مكافآت أو أكواد خصم حالياً</h4>
        <p className="text-[11px] text-stone-500 max-w-sm mx-auto text-center leading-relaxed">
          قم بتقييم ومراجعة المحلات المفضلة لديك التي تفعّل برنامج مكافآت التقييمات، واحصل على أكواد خصم فوري كهدية ترحيبية وتوفير رائع!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-right" dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rewards.map((reward) => {
          const today = Date.now();
          const isCodeExpired = today > reward.expiresAt;
          const isExpired = isCodeExpired || reward.isCampaignExpired;

          return (
            <div
              key={reward.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 bg-white relative overflow-hidden ${
                reward.used 
                  ? "border-stone-100 opacity-75" 
                  : isExpired 
                    ? "border-rose-100 bg-rose-50/10" 
                    : "border-emerald-100 hover:border-emerald-200 shadow-3xs"
              }`}
            >
              {/* Card Header */}
              <div className="flex justify-between items-start gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-stone-400 block">كوبون خصم من تقييم</span>
                  <Link 
                    to={`/business/${reward.businessId}`}
                    className="text-xs font-black text-stone-950 hover:underline hover:text-emerald-700 flex items-center gap-1"
                  >
                    <span>{reward.businessName}</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
                {getStatusBadge(reward)}
              </div>

              {/* Coupon Visual representation with QR Code */}
              <div className={`p-4 rounded-2xl border border-dashed flex flex-col items-center justify-center gap-3 relative transition-all ${
                reward.used 
                  ? "bg-red-50/40 border-red-200" 
                  : "bg-stone-50 border-stone-200"
              }`}>
                {/* Visual Stamp Watermark for Consumed Codes */}
                {reward.used && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                    <div className="border-3 border-red-600/80 text-red-600/90 font-black text-lg px-4 py-1.5 rounded-xl uppercase tracking-widest rotate-[-12deg] bg-white/80 backdrop-blur-xs shadow-sm flex items-center gap-1.5">
                      <Check className="h-5 w-5 stroke-[3]" />
                      <span>مُستهلَك (تم الاستخدام)</span>
                    </div>
                  </div>
                )}

                <div className="w-full flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-stone-500 block">قيمة الخصم</span>
                    <span className={`text-xl font-black ${reward.used ? "text-stone-400 line-through" : "text-[#1a4d2e]"}`}>
                      {reward.discountPercent}% خصم
                    </span>
                  </div>
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                    reward.used
                      ? "bg-red-100 text-red-700 border-red-200"
                      : "text-stone-400 bg-white border-stone-100"
                  }`}>
                    {reward.used ? "تم صرف الخصم لدى المحل" : "رمز QR Code للخصم 📱"}
                  </span>
                </div>
                
                {/* QR Code Container */}
                <div className="p-3 bg-white rounded-xl border border-stone-150 flex flex-col items-center justify-center gap-2 shadow-3xs w-full max-w-[180px] mx-auto relative group">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(reward.code)}`}
                    alt="QR Code Coupon"
                    className={`w-32 h-32 object-contain rounded-md transition-all ${reward.used || isExpired ? "opacity-25 grayscale filter contrast-75" : "group-hover:scale-105"}`}
                    referrerPolicy="no-referrer"
                  />
                  <div className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border select-all tracking-wider ${
                    reward.used
                      ? "text-red-700 bg-red-50 border-red-200"
                      : "text-stone-500 bg-stone-50 border-stone-100"
                  }`}>
                    {reward.code}
                  </div>
                </div>

                <div className="w-full flex justify-between items-center text-[10px] text-stone-400 font-bold px-1">
                  <span>{reward.used ? "هذا الكوبون تم استهلاكه بنجاح" : "أظهر الرمز لصاحب المحل لمسحه ضوئياً"}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(reward.code, reward.id)}
                    className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === reward.id ? (
                      <>
                        <Check className="h-3 w-3" />
                        <span>تم النسخ!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>نسخ الرمز كتابةً</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Validity Details & Actions */}
              <div className="flex items-center justify-between gap-3 text-[10px] text-stone-500 font-bold border-t border-stone-100 pt-3">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-stone-400" />
                  <span>
                    {reward.used && reward.usedAt ? (
                      <span className="text-red-600 font-black">
                        استُهلك بتاريخ: {new Date(reward.usedAt).toLocaleDateString('ar-JO')}
                      </span>
                    ) : (
                      <>صالح لغاية: {new Date(reward.expiresAt).toLocaleDateString('ar-JO')}</>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      if (!currentUser || !confirm('هل أنت متأكد من حذف هذه المكافأة من قائمتك؟')) return;
                      await deleteReward(currentUser.uid, reward.id, reward.code);
                      setRewards(prev => prev.filter(r => r.id !== reward.id && r.code !== reward.code));
                    }}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="حذف المكافأة"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Expired alert details if campaign stopped */}
              {!reward.used && reward.isCampaignExpired && !isCodeExpired && (
                <div className="text-[9px] font-bold text-rose-600 mt-1">
                  ⚠️ الكود انتهى بسبب انتهاء أو إيقاف حملة مكافآت التقييمات للمنشأة كلياً.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
