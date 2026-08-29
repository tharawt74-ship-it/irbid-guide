import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Review } from '../../types';
import { Star, MessageSquare, Trash2, Edit3, Check, X, ExternalLink, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

export function VisitorReviewsTab() {
  const { currentUser } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUserReviews() {
      if (!currentUser || !db) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const q = query(
          collection(db, 'reviews'),
          where('userId', '==', currentUser.uid)
        );
        const snap = await getDocs(q);
        const list: Review[] = [];
        snap.forEach(d => {
          list.push({ id: d.id, ...d.data() } as Review);
        });
        // Sort descending by createdAt
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setReviews(list);
      } catch (err) {
        console.error("Error fetching user reviews:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchUserReviews();
  }, [currentUser]);

  const handleDeleteReview = async (reviewId: string) => {
    if (!db || !confirm('هل أنت متأكد من رغبتك في حذف هذا التقييم؟')) return;
    try {
      await deleteDoc(doc(db, 'reviews', reviewId));
      setReviews(prev => prev.filter(r => r.id !== reviewId));
      setStatusMessage('تم حذف التقييم بنجاح');
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      console.error("Error deleting review:", err);
      alert('حدث خطأ أثناء محاولة حذف التقييم.');
    }
  };

  const handleStartEdit = (rev: Review) => {
    setEditingReviewId(rev.id);
    setEditRating(rev.rating);
    setEditComment(rev.comment);
  };

  const handleSaveEdit = async (reviewId: string) => {
    if (!db || !editComment.trim()) return;
    setIsSaving(true);
    try {
      const ref = doc(db, 'reviews', reviewId);
      await updateDoc(ref, {
        rating: editRating,
        comment: editComment.trim(),
        updatedAt: Date.now()
      });

      setReviews(prev => prev.map(r => r.id === reviewId ? {
        ...r,
        rating: editRating,
        comment: editComment.trim()
      } : r));

      setEditingReviewId(null);
      setStatusMessage('تم تحديث التقييم بنجاح!');
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      console.error("Error updating review:", err);
      alert('تعذر حفظ التعديل.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-3">
        <div className="w-8 h-8 rounded-full border-2 border-[#1a4d2e] border-t-transparent animate-spin"></div>
        <p className="text-xs text-stone-500 font-bold">جاري تحميل تقييماتك...</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 px-4 bg-stone-50/70 rounded-2xl border border-dashed border-stone-200 space-y-4">
        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-2xs">
          <Star className="h-7 w-7" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h4 className="text-base font-black text-stone-800">لم تكتب أي تقييم بعد</h4>
          <p className="text-xs text-stone-500 leading-relaxed">
            شارك أهالي إربد وزوارها تجاربك الصادقة وآراءك في المطاعم والكافيهات والمحلات لمساعدة الجميع في اختيار الأفضل.
          </p>
        </div>
        <Link 
          to="/"
          className="inline-flex items-center gap-2 bg-[#1a4d2e] text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-[#133b22] transition-colors shadow-2xs"
        >
          <span>تصفح المحلات وقيّم تجربتك</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {statusMessage && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <Check className="h-4 w-4 text-emerald-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[#1a4d2e]" />
          <h3 className="text-base font-black text-stone-800">تقييماتي وآرائي المنشورة ({reviews.length})</h3>
        </div>
        <span className="text-xs text-stone-500">خاصة بحسابك الشخصي فقط</span>
      </div>

      <div className="space-y-3">
        {reviews.map((rev) => {
          const isEditing = editingReviewId === rev.id;

          return (
            <div 
              key={rev.id} 
              className="bg-white border border-stone-200 rounded-2xl p-5 shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star 
                        key={s} 
                        className={`h-4 w-4 ${s <= (isEditing ? editRating : rev.rating) ? 'fill-amber-500' : 'text-stone-300'}`} 
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-stone-500">
                    {rev.createdAt ? formatDistanceToNow(rev.createdAt, { addSuffix: true, locale: ar }) : ''}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {!isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(rev)}
                        className="p-1.5 text-stone-500 hover:text-[#1a4d2e] hover:bg-stone-50 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                        title="تعديل التقييم"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">تعديل</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteReview(rev.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors text-xs font-bold flex items-center gap-1"
                        title="حذف التقييم"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">حذف</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingReviewId(null)}
                      className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors text-xs font-bold"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-stone-700 ml-2">تعديل النجوم:</span>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setEditRating(num)}
                        className="p-1 text-amber-500 hover:scale-110 transition-transform"
                      >
                        <Star className={`h-5 w-5 ${num <= editRating ? 'fill-amber-500' : 'text-stone-300'}`} />
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={editComment}
                    onChange={(e) => setEditComment(e.target.value)}
                    rows={3}
                    className="w-full p-3 rounded-xl border border-stone-300 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                    placeholder="اكتب تفاصيل تجربتك هنا..."
                  />

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingReviewId(null)}
                      className="px-3 py-1.5 text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 rounded-lg"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveEdit(rev.id)}
                      className="px-4 py-1.5 text-xs font-bold text-white bg-[#1a4d2e] hover:bg-[#133b22] rounded-lg shadow-2xs disabled:opacity-50 flex items-center gap-1"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التعديل'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-medium bg-stone-50/50 p-3 rounded-xl border border-stone-100">
                  {rev.comment}
                </p>
              )}

              {/* Reply from Store Owner if present */}
              {rev.reply && (
                <div className="bg-emerald-50/80 border border-emerald-200/80 p-3 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between text-[#1a4d2e] font-black">
                    <span>رد إدارة المنشأة ({rev.reply.authorName || 'صاحب المحل'}):</span>
                    {rev.reply.createdAt && (
                      <span className="text-[10px] text-stone-500 font-normal">
                        {formatDistanceToNow(rev.reply.createdAt, { addSuffix: true, locale: ar })}
                      </span>
                    )}
                  </div>
                  <p className="text-stone-700 font-medium leading-relaxed">{rev.reply.text}</p>
                </div>
              )}

              <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                <Link
                  to={`/business/${rev.businessId}`}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1a4d2e] hover:underline"
                >
                  <span>عرض صفحة المحل في الدليل</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
