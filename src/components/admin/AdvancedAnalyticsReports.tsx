import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, Download, MapPin, 
  Store, Eye, Calendar, Printer, 
  FileText, BarChart3,
  Award, CheckCircle2, Star, Stethoscope, ShieldCheck
} from 'lucide-react';
import { Business } from '../../types';

interface AdvancedAnalyticsReportsProps {
  businesses?: Business[];
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export function AdvancedAnalyticsReports({ businesses = [], showToast }: AdvancedAnalyticsReportsProps) {
  const [reportMonth, setReportMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // 1. Real Core Metrics Calculated Directly From Database
  const totalBusinesses = businesses.length;
  const vipBusinesses = useMemo(() => {
    return businesses.filter(b => 
      b.isVip || 
      (b as any).vipStatus === 'active' || 
      (b as any).packagePlan === 'golden' || 
      (b as any).packagePlan === 'vip' || 
      (b as any).selectedPackagePlan === 'golden' || 
      (b as any).selectedPackagePlan === 'vip'
    ).length;
  }, [businesses]);

  const verifiedBusinesses = useMemo(() => {
    return businesses.filter(b => b.isVerified || (b as any).verified).length;
  }, [businesses]);

  const medicalBusinesses = useMemo(() => {
    return businesses.filter(b => 
      b.category === 'صحة وطب' || 
      (b as any).isMedical || 
      !!b.medicalProfile
    ).length;
  }, [businesses]);

  const totalReviews = useMemo(() => {
    return businesses.reduce((acc, b) => acc + (b.reviewCount || 0), 0);
  }, [businesses]);

  const avgRating = useMemo(() => {
    const rated = businesses.filter(b => typeof b.rating === 'number' && b.rating > 0);
    if (rated.length === 0) return '0.0';
    const sum = rated.reduce((acc, b) => acc + (b.rating || 0), 0);
    return (sum / rated.length).toFixed(1);
  }, [businesses]);

  // 2. Real District Breakdown
  const districtStats = useMemo(() => {
    const map = new Map<string, number>();
    businesses.forEach(b => {
      const dist = b.district?.trim() || 'إربد - عام';
      map.set(dist, (map.get(dist) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalBusinesses > 0 ? Math.round((count / totalBusinesses) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [businesses, totalBusinesses]);

  // 3. Real Category Breakdown
  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    businesses.forEach(b => {
      const cat = b.category?.trim() || 'أخرى';
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalBusinesses > 0 ? Math.round((count / totalBusinesses) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [businesses, totalBusinesses]);

  // 4. Real Top Rated Businesses
  const topRatedBusinesses = useMemo(() => {
    return [...businesses]
      .filter(b => typeof b.rating === 'number' && b.rating > 0)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.reviewCount || 0) - (a.reviewCount || 0))
      .slice(0, 5);
  }, [businesses]);

  const handleExportCsv = () => {
    try {
      if (businesses.length === 0) {
        showToast('لا توجد بيانات منشآت لتصديرها حالياً', 'info');
        return;
      }
      const headers = ['اسم المنشأة', 'التصنيف', 'المنطقة', 'التقييم', 'عدد التقييمات', 'باقة VIP', 'الحالة'];
      const rows = businesses.map(b => [
        `"${b.name || ''}"`,
        `"${b.category || ''}"`,
        `"${b.district || b.address || ''}"`,
        b.rating || 0,
        b.reviewCount || 0,
        b.isVip ? 'VIP' : 'عادي',
        (b.isVerified || (b as any).verified) ? 'موثق' : 'غير موثق'
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `shoof_irbid_real_analytics_${reportMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('تم تصدير تقرير المنشآت الفعلي بنجاح', 'success');
    } catch {
      showToast('فشل تصدير ملف CSV', 'error');
    }
  };

  const handlePrintExecutiveReport = () => {
    setIsGeneratingPdf(true);
    setTimeout(() => {
      window.print();
      setIsGeneratingPdf(false);
      showToast('تم إرسال التقرير التنفيذي إلى الطابعة / حفظ PDF', 'success');
    }, 400);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#1a4d2e] flex items-center justify-center shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-stone-900">رادار الإحصائيات والتقارير التنفيذية</h2>
            <p className="text-stone-500 text-xs">تحليل واقعي مبني على بيانات المنشآت الحقيقية المسجلة وتوزيعها الجغرافي والقطاعي</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="month"
            value={reportMonth}
            onChange={(e) => setReportMonth(e.target.value)}
            className="h-10 px-3 rounded-xl border border-stone-200 text-xs font-bold bg-white focus:outline-none"
          />

          <button
            type="button"
            onClick={handleExportCsv}
            className="h-10 px-3.5 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>تصدير CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrintExecutiveReport}
            disabled={isGeneratingPdf}
            className="h-10 px-4 rounded-xl bg-[#1a4d2e] hover:bg-[#133b22] text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Printer className="h-4 w-4" />
            <span>طباعة تقرير PDF التنفيذي</span>
          </button>
        </div>
      </div>

      {/* Main Executive KPIs Overview (100% Real Database Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4.5 border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">إجمالي المنشآت المسجلة</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Store className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-stone-900 mt-2">{totalBusinesses}</p>
          <p className="text-[11px] text-stone-500 font-bold mt-1">
            في قاعدة بيانات دليل إربد
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">منشآت باقة VIP الذهبية</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Award className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-stone-900 mt-2">{vipBusinesses}</p>
          <p className="text-[11px] text-amber-700 font-bold mt-1">
            منشأة ذات ظهور مميز
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">العيادات والمنشآت الطبية</span>
            <span className="p-2 rounded-xl bg-teal-50 text-teal-700">
              <Stethoscope className="h-4 w-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-stone-900 mt-2">{medicalBusinesses}</p>
          <p className="text-[11px] text-teal-700 font-bold mt-1">
            ضمن الدليل الطبي المعتمد
          </p>
        </div>

        <div className="bg-white rounded-2xl p-4.5 border border-stone-200/90 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">تقييمات الزبائن والمتوسط</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Star className="h-4 w-4 fill-amber-400" />
            </span>
          </div>
          <p className="text-2xl font-black text-stone-900 mt-2">{avgRating} <span className="text-xs text-stone-400 font-medium">/ 5</span></p>
          <p className="text-[11px] text-stone-500 font-bold mt-1">
            إجمالي {totalReviews} مراجعة مسجلة
          </p>
        </div>
      </div>

      {/* Two Column Section: Real Category Breakdown & Real Geographical Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real Category Distribution */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                <BarChart3 className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-black text-stone-900">توزيع المنشآت حسب التصنيف والقطاع</h3>
            </div>
            <span className="text-[10px] font-bold text-stone-400">إحصاء فعلي</span>
          </div>

          {categoryStats.length === 0 ? (
            <p className="text-xs text-stone-400 py-6 text-center">لا توجد منشآت مسجلة بعد</p>
          ) : (
            <div className="space-y-3 pt-1">
              {categoryStats.map((cat, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-stone-900 font-black">{cat.name}</span>
                    <span className="font-mono text-emerald-800 font-black">{cat.count} منشأة ({cat.percentage}%)</span>
                  </div>

                  <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-emerald-600 to-teal-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, cat.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Real Geographical Distribution */}
        <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-sky-50 text-sky-700">
                <MapPin className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-black text-stone-900">التوزيع الجغرافي للمنشآت في إربد</h3>
            </div>
            <span className="text-[10px] font-bold text-stone-400">حسب المناطق المسجلة</span>
          </div>

          {districtStats.length === 0 ? (
            <p className="text-xs text-stone-400 py-6 text-center">لا توجد عناوين مسجلة بعد</p>
          ) : (
            <div className="space-y-3 pt-1">
              {districtStats.map((dist, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-stone-900 font-black">{dist.name}</span>
                    <span className="font-mono text-sky-800 font-black">{dist.count} منشأة ({dist.percentage}%)</span>
                  </div>

                  <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-sky-600 to-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, dist.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Real Top Rated Establishments Section */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Award className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-black text-stone-900">أعلى المنشآت تقييماً في دليل إربد</h3>
          </div>
          <span className="text-[10px] font-bold text-stone-400">مبني على تقييمات الزبائن الحقيقية</span>
        </div>

        {topRatedBusinesses.length === 0 ? (
          <p className="text-xs text-stone-400 py-6 text-center">لا توجد تقييمات مسجلة بعد للمنشآت</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {topRatedBusinesses.map((b, idx) => (
              <div key={b.id || idx} className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200/70 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-stone-900 truncate max-w-[180px]">{b.name}</span>
                  <div className="flex items-center gap-1 bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md text-[11px] font-black shrink-0">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                    <span>{b.rating?.toFixed(1) || '0.0'}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-stone-500 font-medium">
                  <span>{b.category || 'عام'}</span>
                  <span>{b.reviewCount || 0} تقييم</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Printable Executive Report Card */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-stone-100 text-stone-700">
              <FileText className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-black text-stone-900">الملخص التنفيذي لدليل إربد ({reportMonth})</h3>
          </div>
          <button
            type="button"
            onClick={handlePrintExecutiveReport}
            className="px-3.5 py-1.5 rounded-xl bg-stone-900 text-white hover:bg-stone-800 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>طباعة / حفظ التقرير PDF</span>
          </button>
        </div>

        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/80 text-xs text-stone-700 space-y-2 leading-relaxed">
          <p className="font-bold text-stone-900">بيانات منصة "شو في بإربد":</p>
          <p>
            يضم الدليل حالياً <strong>{totalBusinesses}</strong> منشأة ومحل تجاري وطبي مسجل في إربد، منها <strong>{vipBusinesses}</strong> منشأة مشتركة في باقة VIP، و <strong>{verifiedBusinesses}</strong> منشأة موثقة رسمياً، بالإضافة إلى <strong>{medicalBusinesses}</strong> عيادة ومنشأة طبية. يبلغ إجمالي تقييمات الزوار المسجلة في النظام <strong>{totalReviews}</strong> تقييم بمتوسط تقييم عام يبلغ <strong>{avgRating}</strong> من 5 نجوم.
          </p>
        </div>
      </div>
    </div>
  );
}
