import React, { useState, useEffect } from 'react';
import { 
  Star, MessageSquareText, Reply, Send, Check, 
  Trash2, AlertCircle, Clock, ShieldCheck, Lock, Crown,
  Gift, QrCode, MessageSquare, Settings2, BarChart3
} from 'lucide-react';
import { Business, Review } from '../../../types';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getBusinessVipStatus } from '../../../lib/vipHelper';
import { VipUpgradeRequestModal } from '../../vip/VipUpgradeRequestModal';
import { sanitizeInput, containsUrlOrLink, stripUrlsAndLinks } from '../../../lib/security';
import { ReviewsQrTab } from '../ReviewsQrTab';
import { invalidateCache } from '../../../lib/dataCache';
import { cn } from '../../../lib/utils';

interface MedicalReviewsTabProps {
  business: Business;
  showToast: (msg: string) => void;
}

export function MedicalReviewsTab({ business, showToast }: MedicalReviewsTabProps) {
  const [reviewsSubTab, setReviewsSubTab] = useState<'list' | 'rewards' | 'qr'>('list');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState<{ [reviewId: string]: string }>({});
  const [submittingReply, setSubmittingReply] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [giftEnabled, setGiftEnabled] = useState(!!business.giftCodeEnabled);

  const vipStatus = getBusinessVipStatus(business);

  useEffect(() => {
    fetchReviews();
  }, [business.id]);

  const fetchReviews = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'reviews'),
        where('businessId', '==', business.id)
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Review[];
      // Sort newest first
      items.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
      setReviews(items);
    } catch (err) {
      console.error('Error fetching medical reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (reviewId: string) => {
    if (!vipStatus.isVip) {
      showToast('الرد الرسمي على المراجعين متاح فقط للمشتركين بالباقة الذهبية VIP 👑');
      setShowUpgradeModal(true);
      return;
    }

    const text = replyText[reviewId]?.trim();
    if (!text || !db) return;

    if (containsUrlOrLink(text)) {
      alert('عذراً، يمنع إدراج الروابط في الردود نهائياً. الرد مخصص للنصوص والتوضيحات فقط.');
      return;
    }

    setSubmittingReply(reviewId);

    try {
      const replyData = {
        text: stripUrlsAndLinks(sanitizeInput(text)),
        createdAt: Date.now(),
        authorName: sanitizeInput(business.name || 'إدارة المنشأة الطبية')
      };

      await updateDoc(doc(db, 'reviews', reviewId), {
        reply: replyData
      });

      setReviews(prev => prev.map(r => {
        if (r.id === reviewId) {
          return { ...r, reply: replyData };
        }
        return r;
      }));

      setReplyText(prev => ({ ...prev, [reviewId]: '' }));
      showToast('تم إرسال رد العيادة الرسمي على المراجع بنجاح');
    } catch (err) {
      console.error('Error replying to review:', err);
      alert('حدث خطأ أثناء إرسال الرد.');
    } finally {
      setSubmittingReply(null);
    }
  };

  const handleDeleteReply = async (reviewId: string) => {
    if (!confirm('هل أنت متأكد من رغبتك في حذف هذا الرد؟') || !db) return;

    try {
      await updateDoc(doc(db, 'reviews', reviewId), {
        reply: null
      });

      setReviews(prev => prev.map(r => {
        if (r.id === reviewId) {
          const copy = { ...r };
          delete copy.reply;
          return copy;
        }
        return r;
      }));

      showToast('تم حذف الرد بنجاح.');
    } catch (err) {
      console.error('Error deleting reply:', err);
    }
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1)
    : (business.rating || 5.0).toFixed(1);

  return (
    <div className="p-2 sm:p-6 space-y-4 sm:space-y-6 text-right" dir="rtl">
      <div className="space-y-4 pb-4 border-b border-stone-200/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#2d2a26] flex items-center gap-2">
              <MessageSquareText className="h-5 w-5 text-teal-700" />
              <span>مركز إدارة تقييمات وآراء المرضى والمراجعين</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              تابع آراء المرضى، صمم بوستر التقييم المطبوع للعيادة، وخصص برنامج مكافآت المراجعات
            </p>
          </div>

          {/* 3 Sub-tabs Selector - Zero Scroll Grid */}
          <div className="grid grid-cols-3 gap-1 bg-stone-100/90 p-1 rounded-2xl border border-stone-200/80 w-full lg:w-auto lg:min-w-[420px] shrink-0">
            <button
              type="button"
              onClick={() => setReviewsSubTab('list')}
              className={`px-2 sm:px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                reviewsSubTab === 'list'
                  ? 'bg-white text-teal-800 shadow-sm font-black'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">التقييمات والمراجعات</span>
            </button>

            <button
              type="button"
              onClick={() => setReviewsSubTab('rewards')}
              className={`px-2 sm:px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                reviewsSubTab === 'rewards'
                  ? 'bg-white text-teal-800 shadow-sm font-black'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <Gift className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">برنامج المكافآت</span>
            </button>

            <button
              type="button"
              onClick={() => setReviewsSubTab('qr')}
              className={`px-2 sm:px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                reviewsSubTab === 'qr'
                  ? 'bg-white text-amber-900 shadow-sm font-black'
                  : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
              }`}
            >
              <QrCode className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span className="truncate">بوستر QR</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUB-TAB 1: REVIEWS LIST */}
      {reviewsSubTab === 'list' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-xs font-black text-amber-900">
            <span>إجمالي المراجعات المسجلة للمنشأة</span>
            <div className="flex items-center gap-1 text-amber-600">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-sm font-black">{avgRating}</span>
              <span className="text-stone-400 mr-2">({reviews.length} تقييم)</span>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-stone-400">
              جاري تحميل آراء المراجعين...
            </div>
          ) : reviews.length === 0 ? (
            <div className="bg-stone-50 border-0 sm:border border-stone-200/80 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center space-y-2 shadow-none sm:shadow-2xs">
              <Star className="h-8 w-8 text-stone-300 mx-auto" />
              <h4 className="text-xs font-black text-stone-700">لا توجد تقييمات مسجلة بعد</h4>
              <p className="text-[11px] text-stone-400 max-w-sm mx-auto">
                ستظهر هنا جميع تعليقات وتقييمات المرضى عند تقييم المنشأة عبر المنصة، ويمكنك الرد عليها بصفة المنشأة الرسمية.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev) => (
                <div key={rev.id} className="bg-white border-0 sm:border border-stone-200 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 space-y-3 shadow-none sm:shadow-2xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-700 font-black text-xs flex items-center justify-center">
                        {(rev.userName || 'م').charAt(0)}
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-stone-900">{stripUrlsAndLinks(rev.userName) || 'مريض / مراجع'}</h5>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex text-amber-400">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3 w-3 ${i < (rev.rating || 5) ? 'fill-amber-400 text-amber-400' : 'text-stone-200'}`}
                              />
                            ))}
                          </div>
                          <span className="text-[10px] text-stone-400">
                            {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('ar-JO') : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {rev.comment && (
                    <p className="text-xs text-stone-700 font-bold leading-relaxed bg-stone-50/60 p-3 rounded-xl border border-stone-100 break-words">
                      {stripUrlsAndLinks(rev.comment)}
                    </p>
                  )}

                  {/* Business Official Reply */}
                  {rev.reply ? (
                    <div className="bg-teal-50/60 border border-teal-200 rounded-xl p-3 mr-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-teal-950 flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-teal-700" />
                          رد رسمي من {stripUrlsAndLinks(rev.reply.authorName) || 'المنشأة الطبية'}:
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteReply(rev.id)}
                          className="text-[10px] text-stone-400 hover:text-red-600 transition-colors"
                        >
                          حذف الرد
                        </button>
                      </div>
                      <p className="text-xs text-stone-700 leading-relaxed font-bold">
                        {stripUrlsAndLinks(rev.reply.text)}
                      </p>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-stone-100 space-y-2">
                      {vipStatus.isVip ? (
                        <div className="space-y-1.5">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={replyText[rev.id] || ''}
                              onChange={(e) => setReplyText({ ...replyText, [rev.id]: e.target.value })}
                              placeholder="اكتب رداً رسمياً للمراجع نيابة عن العيادة (نصوص فقط دون روابط)..."
                              className={`flex-1 px-3 py-2 rounded-xl border text-xs font-bold outline-none transition-colors ${
                                containsUrlOrLink(replyText[rev.id])
                                  ? 'border-rose-400 bg-rose-50/20 focus:ring-1 focus:ring-rose-500'
                                  : 'border-stone-200 focus:ring-1 focus:ring-teal-600'
                              }`}
                            />
                            <button
                              type="button"
                              disabled={submittingReply === rev.id || !replyText[rev.id]?.trim() || containsUrlOrLink(replyText[rev.id])}
                              onClick={() => handleSendReply(rev.id)}
                              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50 shrink-0"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>{submittingReply === rev.id ? 'إرسال...' : 'رد رسمي'}</span>
                            </button>
                          </div>
                          {containsUrlOrLink(replyText[rev.id]) && (
                            <p className="text-[10px] text-rose-600 font-bold">عذراً، يمنع نشر الروابط في الردود الرسمية (نصوص فقط لا غير).</p>
                          )}
                        </div>
                      ) : (
                        <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                            <span className="text-xs font-bold text-amber-950">
                              الرد الرسمي على تقييمات المرضى متاح حصرياً للباقة الذهبية VIP
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowUpgradeModal(true)}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg text-xs font-black shadow-xs transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                          >
                            <Crown className="h-3.5 w-3.5 fill-white" />
                            <span>ترقية VIP</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: REWARDS PROGRAM */}
      {reviewsSubTab === 'rewards' && (
        <div className="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-3.5 shadow-2xs text-right" dir="rtl">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
            <div className="flex items-center gap-2 font-black text-emerald-900 text-sm">
              <Gift className="h-5 w-5 text-emerald-700" />
              <span>برنامج مكافآت تقييمات المراجعين والمرضى</span>
            </div>
            
            {/* Toggle switch */}
            <button
              type="button"
              onClick={async () => {
                if (!db) return;
                const newVal = !giftEnabled;
                setGiftEnabled(newVal);
                await updateDoc(doc(db, 'businesses', business.id), {
                  giftCodeEnabled: newVal
                });
                invalidateCache();
                showToast(newVal ? 'تم تفعيل برنامج مكافآت المراجعين بنجاح' : 'تم تعطيل برنامج المكافآت');
              }}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                giftEnabled ? "bg-emerald-600" : "bg-stone-200"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out",
                  giftEnabled ? "translate-x-[-20px]" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <p className="text-xs text-stone-600 leading-relaxed font-medium">
            عند تفعيل هذا البرنامج، سيحصل المرضى والمراجعون الذين يكتبون تقييماً للعيادة أو المجمع الطبي على كود خصم فوري أو قسيمة فحص مجاني/خصم كهدية تقديراً لهم.
          </p>
        </div>
      )}

      {/* SUB-TAB 3: REVIEWS QR POSTER */}
      {reviewsSubTab === 'qr' && (
        <ReviewsQrTab business={business} isMedical={true} />
      )}

      {showUpgradeModal && (
        <VipUpgradeRequestModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          business={business}
        />
      )}
    </div>
  );
}
