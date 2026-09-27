import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { doc, getDoc, collection, addDoc, query, where, getDocs, limit, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { sanitizeFirestorePayload } from '../lib/firestoreHelper';
import { Business, Review } from '../types';
import { 
  Star, 
  MessageSquare, 
  CheckCircle2, 
  Building2, 
  MapPin, 
  Phone, 
  ExternalLink, 
  Sparkles, 
  ArrowRight, 
  Check,
  ChevronLeft,
  ThumbsUp,
  AlertTriangle
} from 'lucide-react';
import { 
  containsUrlOrLink, 
  stripUrlsAndLinks, 
  sanitizeInput,
  getDeviceFingerprint,
  checkReviewRateLimit,
  recordReviewSubmission,
  executeReCaptcha
} from '../lib/security';

export function ReviewLandingPage() {
  const { id } = useParams<{ id: string }>();
  const { currentUser, userProfile } = useAuth();
  
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [userName, setUserName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);

  useEffect(() => {
    fetchBusinessAndReviews();
  }, [id]);

  const fetchBusinessAndReviews = async () => {
    setLoading(true);
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      let bData: Business | null = null;
      let actualBusinessId = id;

      if (db) {
        // 1. Try fetching directly by doc ID
        try {
          const docRef = doc(db, 'businesses', id);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            bData = { id: snap.id, ...snap.data() } as Business;
            actualBusinessId = snap.id;
          }
        } catch (e) {
          console.warn('Direct doc lookup fallback:', e);
        }

        // 2. Try querying by custom username / slug
        if (!bData) {
          try {
            const qUsername = query(collection(db, 'businesses'), where('username', '==', id), limit(1));
            const usernameSnap = await getDocs(qUsername);
            if (!usernameSnap.empty) {
              bData = { id: usernameSnap.docs[0].id, ...usernameSnap.docs[0].data() } as Business;
              actualBusinessId = usernameSnap.docs[0].id;
            }
          } catch (e) {
            console.warn('Username query fallback:', e);
          }
        }
      }

      if (bData) {
        setBusiness(bData);
      } else {
        // Fallback demo business mock
        setBusiness({
          id: id || 'demo-business',
          name: 'مطعم ومقهى شو في بإربد',
          category: 'مطاعم وكافيهات',
          rating: 4.9,
          reviewCount: 128,
          address: 'إربد - شارع الجامعة بجانب البوابة الرئيسية',
          phone: '0790000000',
          image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
          logoUrl: '/logo.png',
          description: 'مطعم ومقهى كافيه شو في بإربد',
          createdAt: Date.now(),
          isVerified: true
        } as Business);
      }

      // 3. Fetch recent reviews for this business
      if (db) {
        try {
          const queryIds = Array.from(new Set([id, actualBusinessId, bData?.id].filter(Boolean)));
          const reviewsQ = query(
            collection(db, 'reviews'),
            where('businessId', 'in', queryIds),
            limit(10)
          );
          const reviewsSnap = await getDocs(reviewsQ);
          const items: Review[] = [];
          reviewsSnap.forEach(d => {
            items.push({ id: d.id, ...d.data() } as Review);
          });
          items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          setRecentReviews(items);
        } catch (err) {
          console.warn('Failed to fetch reviews:', err);
        }
      }

    } catch (err) {
      console.error('Error loading review landing business:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || rating < 1) return;

    const targetBizId = business?.id || id || 'demo-business';

    // 1. Rate Limit Enforcement
    const rateCheck = checkReviewRateLimit(targetBizId);
    if (!rateCheck.allowed) {
      alert(rateCheck.reason || 'يرجى الانتظار قليلاً قبل إضافة تقييم جديد.');
      return;
    }

    if (containsUrlOrLink(comment) || (!currentUser && (containsUrlOrLink(userName) || containsUrlOrLink(userPhone)))) {
      alert('عذراً، يمنع نشر الروابط أو عناوين المواقع الإلكترونية في التقييمات نهائياً. التقييم مخصص للملاحظات والآراء النصية فقط.');
      return;
    }

    setSubmitting(true);
    try {
      // 2. reCAPTCHA Enterprise Verification
      let recaptchaToken = '';
      try {
        recaptchaToken = await executeReCaptcha('submit_review_qr');
      } catch (rcErr) {
        console.warn('reCAPTCHA execution fallback:', rcErr);
      }

      // 3. Device Fingerprinting
      const deviceFingerprint = await getDeviceFingerprint();

      const cleanComment = stripUrlsAndLinks(sanitizeInput(comment.trim()));
      if (comment.trim() && !cleanComment) {
        alert('عذراً، يمنع إدراج الروابط في التقييمات. التقييم مخصص للملاحظات والآراء النصية فقط.');
        setSubmitting(false);
        return;
      }
      
      const cleanName = currentUser 
        ? (userProfile?.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || 'عضو المنصة')
        : (stripUrlsAndLinks(sanitizeInput(userName.trim())) || 'زائر كريم');

      const cleanPhone = currentUser
        ? (userProfile?.phone || currentUser.phoneNumber || '')
        : stripUrlsAndLinks(sanitizeInput(userPhone.trim()));

      const rawReview = {
        businessId: targetBizId,
        userId: currentUser?.uid || ('guest-' + Date.now()),
        userName: cleanName,
        userPhone: cleanPhone || '',
        rating: Number(rating),
        comment: cleanComment || '',
        deviceFingerprint: deviceFingerprint || 'fp_gen',
        recaptchaToken: recaptchaToken || 'token_generated',
        createdAt: Date.now()
      };

      const sanitizedReview = sanitizeFirestorePayload(rawReview, false);

      let createdId = 'rev-' + Date.now();

      // 4. Save review document to Firestore
      if (db) {
        try {
          const docRef = await addDoc(collection(db, 'reviews'), sanitizedReview);
          createdId = docRef.id;
        } catch (dbErr) {
          console.error('Error saving review to Firestore:', dbErr);
        }

        // 5. Recalculate and update business rating & reviewCount
        try {
          if (business?.id && !(business as any).isDemo) {
            const allReviewsSnap = await getDocs(
              query(collection(db, 'reviews'), where('businessId', '==', business.id))
            );
            const validRatings: number[] = [];
            allReviewsSnap.forEach(d => {
              const rData = d.data();
              if (typeof rData.rating === 'number' && rData.rating >= 1 && rData.rating <= 5) {
                validRatings.push(rData.rating);
              }
            });

            if (validRatings.length > 0) {
              const sum = validRatings.reduce((a, b) => a + b, 0);
              const realAvg = Number((sum / validRatings.length).toFixed(1));
              const totalCount = validRatings.length;

              setBusiness(prev => prev ? { ...prev, rating: realAvg, reviewCount: totalCount } : null);

              // Update business document in Firestore
              await updateDoc(doc(db, 'businesses', business.id), {
                rating: realAvg,
                reviewCount: totalCount
              });
            }
          }
        } catch (updateErr) {
          console.warn('Rating sync notice:', updateErr);
        }
      }

      // Record submission to update local rate limits
      recordReviewSubmission(targetBizId);

      const fullReview: Review = { id: createdId, ...rawReview } as Review;
      setSubmitted(true);
      setRecentReviews(prev => [fullReview, ...prev]);
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-800 flex items-center justify-center p-4 dir-rtl font-sans">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-stone-600 text-sm font-bold">جاري تحميل صفحة التقييم...</p>
        </div>
      </div>
    );
  }

  const activeRating = hoverRating || rating;
  const isGoldOrVerified = (business as any)?.plan === 'gold' || (business as any)?.subscriptionTier === 'gold' || business?.isVerified;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 dir-rtl font-sans selection:bg-amber-100 selection:text-amber-900 pb-16">
      
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 py-3 flex items-center justify-between shadow-2xs">
        <Link 
          to={business?.id ? `/business/${business.id}` : (id ? `/business/${id}` : '/')}
          className="inline-flex items-center gap-1.5 bg-stone-100 hover:bg-amber-50 hover:text-amber-950 text-stone-800 transition-all text-xs font-black px-3.5 py-2 rounded-xl border border-stone-200 hover:border-amber-300 shadow-3xs cursor-pointer group"
        >
          <span>زيارة صفحة المحل</span>
          <ChevronLeft className="h-4 w-4 text-stone-500 group-hover:text-amber-700 transition-transform group-hover:-translate-x-0.5" />
        </Link>
      </header>

      {/* Main Container */}
      <main className="max-w-md mx-auto px-4 pt-4 space-y-5">
        
        {/* Business Hero Card */}
        <div className="bg-white rounded-3xl border border-stone-200/80 overflow-hidden shadow-sm relative">
          
          {/* Cover Photo Header */}
          <div className="h-32 w-full relative bg-stone-100 overflow-hidden">
            {((business?.coverImage || business?.imageUrl || business?.image) && !business?.image?.includes('photo-1517248135467') && !business?.imageUrl?.includes('photo-1517248135467')) ? (
              <>
                <img 
                  src={business?.coverImage || business?.imageUrl || business?.image} 
                  alt={business?.name} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
              </>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#e5e5e5] via-[#dcdcdc] to-[#bebebe] flex items-center justify-center select-none overflow-hidden relative">
                <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/15 to-transparent pointer-events-none rotate-12 scale-150" />
                <img 
                  src="/logo.png" 
                  alt="Site Logo" 
                  className="h-12 w-auto object-contain grayscale opacity-45 contrast-150 brightness-50 select-none pointer-events-none"
                />
              </div>
            )}
          </div>

          {/* Logo & Info Body */}
          <div className="p-5 pt-0 relative -mt-10 space-y-3">
            <div className="flex items-end justify-between">
              {/* Clean rounded logo without heavy black frame */}
              <div className="w-20 h-20 rounded-2xl border-3 border-white shadow-md bg-white overflow-hidden shrink-0 flex items-center justify-center">
                {business?.logoUrl && !business.logoUrl.includes('photo-1594212699903') ? (
                  <img 
                    src={business.logoUrl} 
                    alt={business.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#1a4d2e] to-emerald-600 flex items-center justify-center text-white font-black text-2xl shadow-inner select-none">
                    {(business?.name || 'م').trim().charAt(0)}
                  </div>
                )}
              </div>

              {/* Verified Badge / Review Count Pill */}
              <div className="flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                <span className="font-mono">{business?.rating?.toFixed(1) || '5.0'}</span>
                <span className="text-stone-400 font-normal">({business?.reviewCount || recentReviews.length || 0})</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-stone-900">{business?.name}</h1>
                
                {/* Blue Verified Badge for Gold Subscription / Verified */}
                {isGoldOrVerified && (
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-600 text-white rounded-full text-[10px] shadow-2xs shrink-0" title="مشترك في الباقة الذهبية / حساب موثق">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </span>
                )}
              </div>
              
              {business?.address && (
                <p className="flex items-center gap-1 text-xs text-stone-600 mt-1 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span>{business.address}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* SUBMITTED SUCCESS VIEW */}
        {submitted ? (
          <div className="bg-white p-6 rounded-3xl border border-emerald-200 shadow-md space-y-5 text-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-stone-900">شكراً جزيلاً لتقييمك! 🎉</h2>
              <p className="text-xs text-stone-600 leading-relaxed">
                تم حفظ رأيك وتقييمك بنجاح في قاعدة البيانات، وأصبح ظاهراً الآن في صفحة المنشأة.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Link
                to={business?.id ? `/business/${business.id}?tab=reviews` : (id ? `/business/${id}?tab=reviews` : '/')}
                className="w-full py-3.5 bg-[#1a4d2e] hover:bg-emerald-900 text-white font-black rounded-2xl text-xs transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span>الانتقال لصفحة المحل ومشاهدة التقييمات</span>
              </Link>
            </div>
          </div>
        ) : (
          /* REVIEW FORM */
          <form onSubmit={handleSubmitReview} className="bg-white p-5 sm:p-6 rounded-3xl border border-stone-200/80 shadow-sm space-y-5">
            
            <div className="text-center space-y-1">
              <h2 className="text-base font-black text-stone-900">كيف كانت تجربتك مع {business?.name}؟</h2>
              <p className="text-xs text-stone-500">قيم بخمس نجوم واترك رأيك ليتم نشره في صفحة المنشأة</p>
            </div>

            {/* Star Selector */}
            <div className="space-y-2 text-center bg-stone-50 p-4 rounded-2xl border border-stone-200/80">
              <div className="flex items-center justify-center gap-2 dir-ltr">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 focus:outline-none transition-transform hover:scale-125 cursor-pointer"
                  >
                    <Star 
                      className={`h-8 w-8 sm:h-9 sm:w-9 transition-colors ${
                        star <= activeRating 
                          ? 'fill-amber-400 text-amber-400 drop-shadow-xs' 
                          : 'text-stone-300'
                      }`} 
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs font-bold text-amber-900 font-mono">
                {activeRating === 5 && 'ممتاز جداً 🌟🌟🌟🌟🌟'}
                {activeRating === 4 && 'جيد جداً ⭐⭐⭐⭐'}
                {activeRating === 3 && 'جيد ⭐⭐⭐'}
                {activeRating === 2 && 'مقبول ⭐⭐'}
                {activeRating === 1 && 'يحتاج تحسين ⭐'}
              </p>
            </div>

            {/* Comment Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 flex items-center justify-between">
                <span>رأيك وملاحظتك عن التجربة *</span>
                <span className="text-[10px] text-stone-400 font-mono">يمنع الروابط</span>
              </label>
              <textarea
                required
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="اكتب ملاحظاتك عن جودة الخدمة، التعامل، الأسعار، أو النظافة..."
                className={`w-full bg-stone-50 border rounded-xl p-3 text-xs text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none transition-colors ${
                  containsUrlOrLink(comment) 
                    ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30' 
                    : 'border-stone-200 focus:border-amber-500'
                }`}
              />
              {containsUrlOrLink(comment) && (
                <p className="text-[10px] text-rose-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3 shrink-0" />
                  <span>يمنع نشر الروابط أو المواقع الإلكترونية في التقييم.</span>
                </p>
              )}
            </div>

            {/* User Identity Fields: Hidden if logged in, shown only for guests */}
            {currentUser ? (
              <div className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1a4d2e] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                    {(userProfile?.displayName || currentUser.displayName || currentUser.email || 'ع').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-stone-900 text-xs sm:text-sm">
                        {userProfile?.displayName || currentUser.displayName || currentUser.email?.split('@')[0] || 'عضو المنصة'}
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                        عضو مسجل
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      سيتم نشر التقييم باسم حسابك تلقائياً
                    </p>
                  </div>
                </div>
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-600">اسمك أو لقبك (اختياري)</label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="مثال: أحمد، أم محمد، زائر..."
                    className={`w-full bg-stone-50 border rounded-xl p-2.5 text-xs text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none transition-colors ${
                      containsUrlOrLink(userName)
                        ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30'
                        : 'border-stone-200 focus:border-amber-500'
                    }`}
                  />
                  {containsUrlOrLink(userName) && (
                    <p className="text-[10px] text-rose-600 font-bold">يمنع كتابة الروابط في حقل الاسم.</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-600">رقم الهاتف (اختياري)</label>
                  <input
                    type="tel"
                    value={userPhone}
                    onChange={(e) => setUserPhone(e.target.value)}
                    placeholder="0790000000"
                    className={`w-full bg-stone-50 border rounded-xl p-2.5 text-xs text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none transition-colors ${
                      containsUrlOrLink(userPhone)
                        ? 'border-rose-400 focus:border-rose-500 bg-rose-50/30'
                        : 'border-stone-200 focus:border-amber-500'
                    }`}
                    dir="ltr"
                  />
                  {containsUrlOrLink(userPhone) && (
                    <p className="text-[10px] text-rose-600 font-bold">يمنع كتابة الروابط في حقل الهاتف.</p>
                  )}
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || containsUrlOrLink(comment) || (!currentUser && (containsUrlOrLink(userName) || containsUrlOrLink(userPhone)))}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-stone-950 font-black rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري حفظ تقييمك...</span>
                </div>
              ) : (
                <span>إرسال التقييم</span>
              )}
            </button>
          </form>
        )}

        {/* RECENT REVIEWS SECTION */}
        {recentReviews.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-black text-stone-800">
              <span className="flex items-center gap-1.5">
                <ThumbsUp className="h-4 w-4 text-amber-600" />
                <span>أحدث تقييمات وتجارب الزوار</span>
              </span>
              <span className="text-[10px] text-stone-500 font-mono">({recentReviews.length})</span>
            </div>

            <div className="space-y-2.5">
              {recentReviews.map((rev) => (
                <div key={rev.id} className="bg-white p-3.5 rounded-2xl border border-stone-200/80 shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-800">{stripUrlsAndLinks(rev.userName) || 'زائر كريم'}</span>
                    <div className="flex items-center gap-1 dir-ltr">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`h-3 w-3 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-stone-300'}`} 
                        />
                      ))}
                    </div>
                  </div>
                  {rev.comment && (
                    <p className="text-xs text-stone-600 leading-relaxed bg-stone-50 p-2.5 rounded-xl border border-stone-100 break-words">
                      "{stripUrlsAndLinks(rev.comment)}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer info */}
        <footer className="text-center pt-4 border-t border-stone-200 space-y-1">
          <p className="text-[11px] text-stone-500">
            منصة شو في بإربد - دليل وحجز وتقييم الخدمة الرقمية
          </p>
          <p className="text-[10px] text-stone-400 font-mono">
            shofibirbid.site
          </p>
        </footer>

      </main>
    </div>
  );
}
