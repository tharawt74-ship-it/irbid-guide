import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  TrendingUp, 
  Store, 
  Stethoscope, 
  Users, 
  Crown, 
  Eye, 
  Calendar, 
  Sparkles, 
  CheckCircle2, 
  MapPin, 
  Filter,
  BarChart3,
  DollarSign
} from 'lucide-react';
import { Business, MarketingRequest, JobOffer } from '../../types';
import { getBusinessVipStatus } from '../../lib/vipHelper';
import { isMedicalBusiness } from '../../lib/medicalHelper';

interface AdvancedReportingCenterProps {
  businesses: Business[];
  requests: any[];
  marketingRequests: MarketingRequest[];
  jobs: JobOffer[];
  showToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

export function AdvancedReportingCenter({
  businesses,
  requests,
  marketingRequests,
  jobs,
  showToast
}: AdvancedReportingCenterProps) {
  const [timeRange, setTimeRange] = useState<'all' | '30days' | '90days' | 'year'>('all');
  const [isExporting, setIsExporting] = useState(false);

  // Compute filtered dataset based on range
  const filteredData = useMemo(() => {
    const now = Date.now();
    let cutoff = 0;
    if (timeRange === '30days') cutoff = now - 30 * 24 * 3600 * 1000;
    else if (timeRange === '90days') cutoff = now - 90 * 24 * 3600 * 1000;
    else if (timeRange === 'year') cutoff = now - 365 * 24 * 3600 * 1000;

    const bizFiltered = businesses.filter(b => !cutoff || (b.createdAt || 0) >= cutoff || ((b as any).updatedAt || 0) >= cutoff);
    const mktFiltered = marketingRequests.filter(m => !cutoff || (m.createdAt || 0) >= cutoff);
    const jobsFiltered = jobs.filter(j => !cutoff || (j.createdAt || 0) >= cutoff);

    // Categories breakdown
    const categoryMap = new Map<string, number>();
    const neighborhoodMap = new Map<string, number>();
    let totalViews = 0;
    let vipCount = 0;
    let medicalCount = 0;
    let commercialCount = 0;

    bizFiltered.forEach(b => {
      const isMed = isMedicalBusiness(b);
      if (isMed) medicalCount++;
      else commercialCount++;

      const vip = getBusinessVipStatus(b);
      if (vip.isVip) vipCount++;

      totalViews += b.views || 0;

      const cat = b.category || 'أخرى';
      categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);

      const nh = (b as any).neighborhood || b.address || 'إربد';
      neighborhoodMap.set(nh, (neighborhoodMap.get(nh) || 0) + 1);
    });

    const topCategories = Array.from(categoryMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topNeighborhoods = Array.from(neighborhoodMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      totalBusinesses: bizFiltered.length,
      commercialCount,
      medicalCount,
      vipCount,
      totalViews,
      totalMarketing: mktFiltered.length,
      totalJobs: jobsFiltered.length,
      topCategories,
      topNeighborhoods
    };
  }, [businesses, marketingRequests, jobs, timeRange]);

  // Export CSV
  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const headers = ['اسم المنشأة', 'النوع', 'التصنيف', 'الحي / المنطقة', 'الهاتف', 'باقة VIP', 'المشاهدات', 'تاريخ الإضافة'];
      const rows = businesses.map(b => {
        const vip = getBusinessVipStatus(b);
        return [
          `"${b.name || ''}"`,
          `"${isMedicalBusiness(b) ? 'منشأة طبية' : 'محل تجاري'}"`,
          `"${b.category || ''}"`,
          `"${(b as any).neighborhood || b.address || ''}"`,
          `"${b.phone || b.ownerPhone || ''}"`,
          `"${vip.isVip ? 'باقة ذهبية VIP' : 'مجاني'}"`,
          `"${b.views || 0}"`,
          `"${b.createdAt ? new Date(b.createdAt).toLocaleDateString('ar-JO') : ''}"`
        ];
      });

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Irbid_Directory_Performance_Report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('تم تصدير تقرير الأداء بنجاح (CSV/Excel)');
    } catch (err) {
      console.error(err);
      showToast('فشل تصدير التقرير', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Print Official PDF Report
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-[#1a4d2e]/10 text-[#1a4d2e] font-bold">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-black text-stone-900">مركز التقارير الإحصائية المتقدمة</h3>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            استخراج وتصدير تقارير الأداء الدوري للمنصة والمحلات التجارية والمنشآت الطبية في إربد.
          </p>
        </div>

        {/* Actions & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Filter */}
          <div className="flex items-center gap-1 bg-stone-50 border border-stone-200 px-3 py-1.5 rounded-2xl text-xs font-bold text-stone-700">
            <Calendar className="h-3.5 w-3.5 text-stone-400" />
            <select
              value={timeRange}
              onChange={e => setTimeRange(e.target.value as any)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="all">كافة الفترات</option>
              <option value="30days">آخر 30 يوماً</option>
              <option value="90days">آخر 90 يوماً</option>
              <option value="year">العام الحالي</option>
            </select>
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>تصدير Excel/CSV</span>
          </button>

          {/* Print PDF */}
          <button
            onClick={handlePrintPDF}
            className="inline-flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-300 px-4 py-2 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-stone-500" />
            <span>طباعة / حفظ PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-1">
          <div className="flex items-center justify-between text-stone-400 text-xs font-bold">
            <span>إجمالي المنشآت</span>
            <Store className="h-4 w-4 text-[#1a4d2e]" />
          </div>
          <div className="text-2xl font-black text-stone-900">{filteredData.totalBusinesses}</div>
          <div className="text-[10px] text-stone-500 font-bold">{filteredData.commercialCount} تجاري | {filteredData.medicalCount} طبي</div>
        </div>

        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-1">
          <div className="flex items-center justify-between text-stone-400 text-xs font-bold">
            <span>باقات VIP الذهبية</span>
            <Crown className="h-4 w-4 text-[#ff9f1c]" />
          </div>
          <div className="text-2xl font-black text-stone-900">{filteredData.vipCount}</div>
          <div className="text-[10px] text-emerald-700 font-bold">
            {filteredData.totalBusinesses > 0 ? Math.round((filteredData.vipCount / filteredData.totalBusinesses) * 100) : 0}% نسبة المشتركين
          </div>
        </div>

        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-1">
          <div className="flex items-center justify-between text-stone-400 text-xs font-bold">
            <span>إجمالي المشاهدات</span>
            <Eye className="h-4 w-4 text-sky-600" />
          </div>
          <div className="text-2xl font-black text-stone-900">{filteredData.totalViews.toLocaleString()}</div>
          <div className="text-[10px] text-stone-500">تفاعل وتصفح البطاقات</div>
        </div>

        <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-1">
          <div className="flex items-center justify-between text-stone-400 text-xs font-bold">
            <span>الحملات التسويقية</span>
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-stone-900">{filteredData.totalMarketing}</div>
          <div className="text-[10px] text-stone-500">طلبات إعلانات وترويج</div>
        </div>
      </div>

      {/* Top Categories & Neighborhoods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Categories */}
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
          <h4 className="font-bold text-xs text-stone-700 flex items-center gap-1.5">
            <Store className="h-3.5 w-3.5 text-[#1a4d2e]" />
            <span>القطاعات الأكثر تسجيلاً في إربد</span>
          </h4>
          <div className="space-y-2">
            {filteredData.topCategories.map(([cat, count]) => (
              <div key={cat} className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-800">{cat}</span>
                <span className="bg-white border border-stone-200 px-2 py-0.5 rounded-lg font-black text-stone-600 text-[11px]">{count} منشأة</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Neighborhoods */}
        <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-3">
          <h4 className="font-bold text-xs text-stone-700 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-amber-600" />
            <span>المناطق والأحياء الأكثر نشاطاً</span>
          </h4>
          <div className="space-y-2">
            {filteredData.topNeighborhoods.map(([nh, count]) => (
              <div key={nh} className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-800">{nh}</span>
                <span className="bg-white border border-stone-200 px-2 py-0.5 rounded-lg font-black text-stone-600 text-[11px]">{count} منشأة</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
