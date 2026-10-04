import React, { useState, useEffect, useMemo } from 'react';
import { 
  Award, 
  Search, 
  Store, 
  User, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Percent, 
  RefreshCw,
  QrCode,
  Tag,
  AlertCircle
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy, limit, setDoc } from 'firebase/firestore';

interface ReviewRewardsAuditProps {
  showToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export function ReviewRewardsAudit({ showToast }: ReviewRewardsAuditProps) {
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'used'>('all');
  const [verifyingCode, setVerifyingCode] = useState('');
  const [verificationResult, setVerificationResult] = useState<any | null>(null);

  const fetchRewards = async () => {
    if (!db) return;
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'user_rewards'), orderBy('createdAt', 'desc'), limit(150)));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRewards(list);
    } catch (err) {
      console.error('Error fetching review rewards:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  const handleMarkAsRedeemed = async (reward: any) => {
    if (!db) return;
    try {
      await updateDoc(doc(db, 'user_rewards', reward.id), {
        isUsed: true,
        redeemedAt: Date.now()
      });

      // Also record in redeemed_codes registry
      if (reward.code) {
        await setDoc(doc(db, 'redeemed_codes', reward.code), {
          code: reward.code,
          used: true,
          businessId: reward.businessId || '',
          redeemedAt: Date.now()
        }, { merge: true });
      }

      showToast(`تم تعليم الكود (${reward.code}) كمستخدم بنجاح`);
      setRewards(prev => prev.map(r => r.id === reward.id ? { ...r, isUsed: true, redeemedAt: Date.now() } : r));
    } catch (err) {
      console.error('Error marking code as redeemed:', err);
      showToast('فشل تعديل حالة الكود', 'error');
    }
  };

  // Instant code verifier
  const handleVerifyCode = () => {
    if (!verifyingCode.trim()) return;
    const clean = verifyingCode.trim().toUpperCase();
    const matched = rewards.find(r => (r.code || '').toUpperCase() === clean);

    if (matched) {
      setVerificationResult({
        found: true,
        data: matched
      });
    } else {
      setVerificationResult({
        found: false,
        code: clean
      });
    }
  };

  const filteredRewards = useMemo(() => {
    return rewards.filter(r => {
      const isUsed = !!r.isUsed;
      if (statusFilter === 'valid' && isUsed) return false;
      if (statusFilter === 'used' && !isUsed) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCode = (r.code || '').toLowerCase().includes(q);
        const matchStore = (r.businessName || '').toLowerCase().includes(q);
        const matchUser = (r.userName || r.userPhone || r.userId || '').toLowerCase().includes(q);
        return matchCode || matchStore || matchUser;
      }
      return true;
    });
  }, [rewards, statusFilter, searchQuery]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-amber-50 text-amber-700 font-bold">
              <Award className="h-5 w-5" />
            </div>
            <h3 className="text-xl font-black text-stone-900">سجل مكافآت وكوبونات التقييمات</h3>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            سجل وتدقيق أكواد الخصم الممنوحة للزبائن عند تقييم المحلات عبر الـ QR وتتبع حالات استخدامها.
          </p>
        </div>

        <button
          onClick={fetchRewards}
          className="inline-flex items-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2 rounded-2xl text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث السجل</span>
        </button>
      </div>

      {/* Code Verification Quick Tool */}
      <div className="bg-emerald-50/60 p-5 rounded-3xl border border-emerald-200 space-y-3">
        <div className="flex items-center gap-2">
          <QrCode className="h-4 w-4 text-[#1a4d2e]" />
          <h4 className="font-black text-xs text-emerald-950">فحص والتحقق الفوري من صلاحية كود خصم</h4>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            value={verifyingCode}
            onChange={e => setVerifyingCode(e.target.value)}
            placeholder="أدخل كود الخصم للتحقق (مثال: IRBID-9821)"
            className="w-full sm:flex-1 bg-white border border-emerald-300 rounded-xl px-4 py-2 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
          />
          <button
            onClick={handleVerifyCode}
            className="w-full sm:w-auto bg-[#1a4d2e] hover:bg-[#133b22] text-white px-5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            فحص الكود
          </button>
        </div>

        {verificationResult && (
          <div className="p-3 bg-white rounded-2xl border border-emerald-200 text-xs animate-in fade-in">
            {verificationResult.found ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-black text-emerald-800">الكود صحيح ومسجل: </span>
                  <span className="font-mono font-bold text-stone-900">{verificationResult.data.code}</span>
                  <span className="text-stone-400 mx-1">·</span>
                  <span className="text-stone-700">المحل: <strong>{verificationResult.data.businessName}</strong></span>
                  <span className="text-stone-400 mx-1">·</span>
                  <span className="text-stone-700">نسبة الخصم: <strong>{verificationResult.data.discountPercent || 10}%</strong></span>
                </div>
                <div>
                  {verificationResult.data.isUsed ? (
                    <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2.5 py-1 rounded-full">
                      تم استخدامه مسبقاً
                    </span>
                  ) : (
                    <button
                      onClick={() => handleMarkAsRedeemed(verificationResult.data)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1 rounded-lg"
                    >
                      تعليم كمستخدم الآن
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-red-600 font-bold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                <span>الكود ({verificationResult.code}) غير موجود في سجل المكافآت أو غير صالح</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحث بالكود، اسم المحل، أو بيانات الزبون..."
            className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-10 pl-4 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-700 focus:outline-none w-full sm:w-auto"
        >
          <option value="all">كافة الكوبونات ({rewards.length})</option>
          <option value="valid">أكواد سارية المفعول</option>
          <option value="used">أكواد تم استبدالها واستخدامها</option>
        </select>
      </div>

      {/* Rewards Table */}
      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center text-xs font-bold text-stone-400">
          جاري تحميل سجل المكافآت...
        </div>
      ) : filteredRewards.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-stone-200 text-center space-y-2">
          <Award className="h-10 w-10 text-stone-300 mx-auto" />
          <h4 className="text-sm font-black text-stone-700">لا توجد أكواد مكافآت مسجلة</h4>
          <p className="text-xs text-stone-400">عند قيام الزوار بتقييم المحلات عبر الـ QR سيتم تسجيل أكواد خصوماتهم هنا تلقائياً</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-black">
                <tr>
                  <th className="p-4">كود الخصم</th>
                  <th className="p-4">المحل المانح</th>
                  <th className="p-4">الزبون / المستخدم</th>
                  <th className="p-4">نسبة الخصم</th>
                  <th className="p-4">الحالة</th>
                  <th className="p-4">تاريخ المنح</th>
                  <th className="p-4 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredRewards.map(reward => {
                  const isUsed = !!reward.isUsed;

                  return (
                    <tr key={reward.id} className="hover:bg-stone-50 transition-colors">
                      <td className="p-4">
                        <span className="font-mono font-black text-xs text-[#1a4d2e] bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                          {reward.code || 'CODE-XXXX'}
                        </span>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-stone-800 flex items-center gap-1">
                          <Store className="h-3.5 w-3.5 text-stone-400" />
                          <span>{reward.businessName || 'محل بإربد'}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-bold text-stone-700 flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-stone-400" />
                          <span>{reward.userName || reward.userPhone || 'زائر موثق'}</span>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="font-black text-stone-900 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md text-[11px]">
                          {reward.discountPercent || 10}%
                        </span>
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        {isUsed ? (
                          <span className="bg-stone-100 text-stone-600 text-[10px] font-bold px-2.5 py-1 rounded-full">
                            تم الاستخدام
                          </span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2.5 py-1 rounded-full">
                            ساري المفعول
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-stone-500 font-mono text-[11px] whitespace-nowrap">
                        {reward.createdAt ? new Date(reward.createdAt).toLocaleDateString('ar-JO') : '-'}
                      </td>

                      <td className="p-4 text-center">
                        {!isUsed && (
                          <button
                            onClick={() => handleMarkAsRedeemed(reward)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            تعليم كمستخدم
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
