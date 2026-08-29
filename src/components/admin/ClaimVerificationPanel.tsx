import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, getDocs, doc, updateDoc, orderBy } from 'firebase/firestore';
import { OwnershipClaim } from '../../types';
import { 
  ShieldCheck, CheckCircle2, XCircle, FileText, ExternalLink, 
  Search, Eye, Clock, Building2, User, Phone, Mail, AlertCircle
} from 'lucide-react';

export function ClaimVerificationPanel() {
  const [claims, setClaims] = useState<OwnershipClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedDocUrl, setSelectedDocUrl] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchClaims = async () => {
    setLoading(true);
    try {
      if (!db) return;
      const q = query(collection(db, 'ownership_claims'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list: OwnershipClaim[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as OwnershipClaim);
      });

      // If empty, seed a demo claim for demonstration & review
      if (list.length === 0) {
        list.push({
          id: 'claim-demo-1',
          businessId: 'biz-1',
          businessName: 'مطعم ونشويات ديوان زمان',
          applicantUid: 'user-merchant-1',
          applicantName: 'السيد أحمد التميمي',
          applicantPhone: '0791234567',
          applicantEmail: 'ahmed.diwan@gmail.com',
          documentUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
          notes: 'مرفق السجل التجاري ورخصة المهن الصادرة عن بلدية إربد الكبرى باسم صاحب المحل.',
          status: 'pending',
          createdAt: Date.now() - 3600000 * 24
        });
      }

      setClaims(list);
    } catch (err) {
      console.warn("Could not fetch ownership claims:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const handleApproveClaim = async (claim: OwnershipClaim) => {
    if (!window.confirm(`هل أنت متأكد من الموافقة على نقل ملكية محل "${claim.businessName}" إلى المستخدم ${claim.applicantName}؟`)) return;

    try {
      if (db) {
        // 1. Update claim status
        await updateDoc(doc(db, 'ownership_claims', claim.id), {
          status: 'approved',
          approvedAt: Date.now()
        });

        // 2. Transfer business ownership
        await updateDoc(doc(db, 'businesses', claim.businessId), {
          userId: claim.applicantUid,
          ownerName: claim.applicantName,
          isVerified: true
        });
      }

      setClaims(prev => prev.map(c => c.id === claim.id ? { ...c, status: 'approved' } : c));
      setActionSuccess(`تمت الموافقة ونقل ملكية محل "${claim.businessName}" بنجاح!`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRejectClaim = async (claimId: string) => {
    if (!window.confirm('هل أنت متأكد من رفض طلب ملكية هذا المحل؟')) return;

    try {
      if (db) {
        await updateDoc(doc(db, 'ownership_claims', claimId), {
          status: 'rejected',
          rejectedAt: Date.now()
        });
      }

      setClaims(prev => prev.map(c => c.id === claimId ? { ...c, status: 'rejected' } : c));
      setActionSuccess('تم رفض طلب الملكية.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredClaims = claims.filter(c => 
    c.businessName?.toLowerCase().includes(search.toLowerCase()) ||
    c.applicantName?.toLowerCase().includes(search.toLowerCase()) ||
    c.applicantPhone?.includes(search)
  );

  return (
    <div className="bg-white rounded-3xl border border-[#e5e1da] p-6 shadow-xs space-y-6 text-right" dir="rtl">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-stone-200">
        <div>
          <h3 className="text-lg font-black text-[#2d2a26] flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#1a4d2e]" />
            واجهة التحقق من وثائق إثبات ملكية المحلات التجارية (Ownership Claim Verification)
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            راجِع السجلات التجارية ورخص المهن المرفقة من أصحاب المحلات لنقل ملكية المحل وتفعيل الشارة الموثقة.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو رقم الهاتف..."
            className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-9 pl-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
          />
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Claims List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 rounded-full border-2 border-stone-200 border-t-[#1a4d2e] animate-spin"></div>
          <p className="text-xs font-bold text-stone-500 mt-2">جاري جلب طلبات إثبات الملكية...</p>
        </div>
      ) : filteredClaims.length === 0 ? (
        <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-2">
          <Building2 className="h-8 w-8 text-stone-300 mx-auto" />
          <h4 className="text-xs font-bold text-stone-700">لا توجد طلبات إثبات ملكية معلقة حالياً</h4>
          <p className="text-[11px] text-stone-400">ستظهر هنا أي وثائق وسجلات رسمية يرفعها التجار للمراجعة</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredClaims.map(claim => (
            <div key={claim.id} className="bg-stone-50/70 rounded-2xl border border-stone-200 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-stone-200/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#1a4d2e] flex items-center justify-center font-bold">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-stone-900">{claim.businessName}</h4>
                    <span className="text-[10px] text-stone-400 block mt-0.5">
                      تاريخ الطلب: {new Date(claim.createdAt).toLocaleDateString('ar-JO', { dateStyle: 'long' })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {claim.status === 'pending' && (
                    <span className="bg-amber-100 text-amber-800 text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      قيد التدقيق
                    </span>
                  )}
                  {claim.status === 'approved' && (
                    <span className="bg-emerald-100 text-emerald-800 text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      مقبول وموثق
                    </span>
                  )}
                  {claim.status === 'rejected' && (
                    <span className="bg-red-100 text-red-800 text-[11px] font-black px-3 py-1 rounded-full flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      مرفوض
                    </span>
                  )}
                </div>
              </div>

              {/* Applicant Details & Document Attachment */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-stone-200 space-y-2">
                  <span className="font-bold text-stone-400 text-[10px] block">بيانات مقدم الطلب:</span>
                  <div className="space-y-1.5 font-bold text-stone-800">
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-stone-400" />
                      <span>{claim.applicantName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-emerald-600" />
                      <a href={`tel:${claim.applicantPhone}`} className="hover:underline font-mono" dir="ltr">{claim.applicantPhone}</a>
                    </div>
                    {claim.applicantEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-blue-500" />
                        <span className="font-mono text-[11px]">{claim.applicantEmail}</span>
                      </div>
                    )}
                  </div>
                  {claim.notes && (
                    <p className="text-[11px] text-stone-600 bg-stone-50 p-2 rounded-lg border border-stone-100 font-medium">
                      "{claim.notes}"
                    </p>
                  )}
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-stone-200 space-y-2">
                  <span className="font-bold text-stone-400 text-[10px] block">الوثيقة الرسمية المرفقة (السجل التجاري / رخصة المهن):</span>
                  {claim.documentUrl ? (
                    <div className="flex items-center justify-between bg-stone-50 p-2 rounded-xl border border-stone-200">
                      <div className="flex items-center gap-2 text-stone-700 font-bold">
                        <FileText className="h-4 w-4 text-[#1a4d2e]" />
                        <span>وثيقة إثبات الملكية</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedDocUrl(claim.documentUrl || null)}
                        className="inline-flex items-center gap-1 bg-[#1a4d2e] text-white px-3 py-1 rounded-lg text-[11px] font-bold hover:bg-[#133b22] transition-colors cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>معاينة الوثيقة</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-stone-400 text-[11px] italic p-2">لم يتم رفع صورة وثيقة تجارية</div>
                  )}
                </div>
              </div>

              {/* Actions Footer */}
              {claim.status === 'pending' && (
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-200/60">
                  <button
                    type="button"
                    onClick={() => handleRejectClaim(claim.id)}
                    className="px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer"
                  >
                    رفض الطلب
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproveClaim(claim)}
                    className="px-5 py-2 rounded-xl bg-[#1a4d2e] hover:bg-[#133b22] text-white text-xs font-black shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>اعتماد الملكية وتوثيق المحل</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox / Document Preview Modal */}
      {selectedDocUrl && (
        <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-4 text-right">
            <div className="flex justify-between items-center border-b border-stone-100 pb-3">
              <h4 className="text-sm font-black text-stone-900">معاينة الوثيقة الرسمية / السجل التجاري</h4>
              <button
                type="button"
                onClick={() => setSelectedDocUrl(null)}
                className="text-stone-400 hover:text-stone-700 font-bold text-xs"
              >
                إغلاق ✕
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-2xl border border-stone-200 bg-stone-100 p-2 text-center">
              <img src={selectedDocUrl} alt="وثيقة الملكية" className="max-w-full h-auto mx-auto rounded-xl shadow-md" />
            </div>
            <div className="text-left">
              <a 
                href={selectedDocUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
              >
                <span>فتح الوثيقة بحجم كامل في نافذة جديدة</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
