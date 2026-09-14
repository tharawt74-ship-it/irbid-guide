import React, { useState, useEffect } from 'react';
import { 
  Star, MessageSquareText, Reply, Send, Check, 
  Trash2, AlertCircle, Clock, ShieldCheck, Lock, Crown
} from 'lucide-react';
import { Business, Review } from '../../../types';
import { db } from '../../../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getBusinessVipStatus } from '../../../lib/vipHelper';
import { VipUpgradeRequestModal } from '../../vip/VipUpgradeRequestModal';
import { sanitizeInput } from '../../../lib/security';

interface MedicalReviewsTabProps {
  business: Business;
  showToast: (msg: string) => void;
}

export function MedicalReviewsTab({ business, showToast }: MedicalReviewsTabProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState<{ [reviewId: string]: string }>({});
  const [submittingReply, setSubmittingReply] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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
    setSubmittingReply(reviewId);

    try {
      const replyData = {
        text: sanitizeInput(text),
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
      showToast('تم إرسال رد العيادة الرسمي على المراجع بنجاح 💬');
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
    <div className="p-4 sm:p-6 space-y-6 text-right" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
        <div>
          <h3 className="text-base font-black text-[#2d2a26] flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-teal-700" />
            تقييمات وآراء المراجعين والردود الرسمية
          </h3>
          <p className="text-xs text-stone-500 mt-0.5">
            الرد المباشر على ملاحظات وتجارب المرضى يعزز من موثوقية المنشأة ورعايتها
          </p>
        </div>

        {/* Rating Summary Pill */}
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 px-3.5 py-2 rounded-xl text-xs font-black text-amber-900">
          <div className="flex items-center gap-1 text-amber-600">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-black">{avgRating}</span>
          </div>
          <span className="text-stone-300">|</span>
          <span>{reviews.length} تقييم مسجل</span>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-stone-400">
          جاري تحميل آراء المراجعين...
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-8 text-center space-y-2">
          <Star className="h-8 w-8 text-stone-300 mx-auto" />
          <h4 className="text-xs font-black text-stone-700">لا توجد تقييمات مسجلة بعد</h4>
          <p className="text-[11px] text-stone-400 max-w-sm mx-auto">
            ستظهر هنا جميع تعليقات وتقييمات المرضى عند تقييم المنشأة عبر منصة بلديتي، ويمكنك الرد عليها بصفة المنشأة الرسمية.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <div key={rev.id} className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-stone-100 text-stone-700 font-black text-xs flex items-center justify-center">
                    {(rev.userName || 'م').charAt(0)}
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-stone-900">{rev.userName || 'مريض / مراجع'}</h5>
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
                <p className="text-xs text-stone-700 font-bold leading-relaxed bg-stone-50/60 p-3 rounded-xl border border-stone-100">
                  {rev.comment}
                </p>
              )}

              {/* Business Official Reply */}
              {rev.reply ? (
                <div className="bg-teal-50/60 border border-teal-200 rounded-xl p-3 mr-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black text-teal-950 flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-teal-700" />
                      رد رسمي من {rev.reply.authorName || 'المنشأة الطبية'}:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteReply(rev.id)}
                      className="text-[10px] text-stone-400 hover:text-red-600 transition-colors"
                    >
                      حذف الرد ✕
                    </button>
                  </div>
                  <p className="text-xs text-stone-700 leading-relaxed font-bold">
                    {rev.reply.text}
                  </p>
                </div>
              ) : (
                <div className="pt-2 border-t border-stone-100 space-y-2">
                  {vipStatus.isVip ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={replyText[rev.id] || ''}
                        onChange={(e) => setReplyText({ ...replyText, [rev.id]: e.target.value })}
                        placeholder="اكتب رداً رسمياً للمراجع نيابة عن العيادة..."
                        className="flex-1 px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold outline-none focus:ring-1 focus:ring-teal-600"
                      />
                      <button
                        type="button"
                        disabled={submittingReply === rev.id || !replyText[rev.id]?.trim()}
                        onClick={() => handleSendReply(rev.id)}
                        className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50 shrink-0"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>{submittingReply === rev.id ? 'إرسال...' : 'رد رسمي'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-amber-600 shrink-0" />
                        <span className="text-xs font-bold text-amber-950">
                          الرد الرسمي على تقييمات المرضى متاح حصرياً للباقة الذهبية VIP 👑
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
