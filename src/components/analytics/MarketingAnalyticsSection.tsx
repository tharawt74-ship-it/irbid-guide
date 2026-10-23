import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, Eye, Phone, MessageSquare, MapPin, 
  Sparkles, Crown, ArrowUpRight, BarChart3, Calendar, 
  Users, Zap, Target, Bell, Megaphone, Share2, 
  Bookmark, CheckCircle2, ChevronDown, Layers, ArrowLeft,
  Clock, ShieldAlert, PlusCircle
} from 'lucide-react';
import { WhatsAppIcon } from '../common/WhatsAppIcon';
import { Business, MarketingRequest } from '../../types';

interface MarketingAnalyticsSectionProps {
  business?: Business;
  marketingRequests?: MarketingRequest[];
  isOwner?: boolean;
  onOpenMarketingHub?: () => void;
}

type ServiceCategory = 'all' | 'sponsored' | 'push_notifications' | 'homepage_banner' | 'promo_card';

export function MarketingAnalyticsSection({
  business,
  marketingRequests = [],
  isOwner = true,
  onOpenMarketingHub
}: MarketingAnalyticsSectionProps) {
  const [activeCategory, setActiveCategory] = useState<ServiceCategory>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<'all' | '7d' | '30d'>('all');

  // Filter requests matching this business
  const businessCampaigns = useMemo(() => {
    if (!business) return marketingRequests;
    return marketingRequests.filter(
      r => r.businessId === business.id || (r.businessName && r.businessName === business.name)
    );
  }, [business, marketingRequests]);

  // Filter by selected service category
  const filteredCampaigns = useMemo(() => {
    if (activeCategory === 'all') return businessCampaigns;
    return businessCampaigns.filter(r => r.serviceType === activeCategory);
  }, [businessCampaigns, activeCategory]);

  // Calculate real metrics strictly from campaign stats in Firestore
  const analyticsData = useMemo(() => {
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversions = 0;

    businessCampaigns.forEach(req => {
      const stats = req.stats || {};
      const imp = stats.impressions || 0;
      const clk = stats.clicks || 0;
      const conv = stats.conversions || (stats.calls || 0) + (stats.whatsapp || 0) + (stats.directions || 0);

      totalImpressions += imp;
      totalClicks += clk;
      totalConversions += conv;
    });

    const realCtr = totalImpressions > 0 
      ? ((totalClicks / totalImpressions) * 100).toFixed(1) 
      : '0.0';

    return {
      totalImpressions,
      totalClicks,
      totalConversions,
      realCtr,
      campaignCount: businessCampaigns.length,
      activeCount: businessCampaigns.filter(r => r.status === 'approved' || r.status === 'completed').length,
    };
  }, [businessCampaigns]);

  const getServiceTitle = (serviceType: string) => {
    switch (serviceType) {
      case 'sponsored':
        return 'صدارة نتائج البحث والتصنيف المميز';
      case 'push_notifications':
        return 'إشعار جماعي مباشر للهواتف';
      case 'homepage_banner':
        return 'بانر إعلاني رئيسي بالصفحة الأولى';
      case 'promo_card':
        return 'بطاقة ترويجية مدمجة بالقوائم';
      default:
        return 'حملة ترويجية وتسويقية';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'active':
        return {
          label: 'حملة نشطة',
          className: 'bg-emerald-50 text-emerald-800 border-emerald-200'
        };
      case 'pending':
        return {
          label: 'قيد المراجعة والاعتماد',
          className: 'bg-amber-50 text-amber-800 border-amber-200'
        };
      case 'completed':
        return {
          label: 'حملة مكتملة',
          className: 'bg-stone-100 text-stone-700 border-stone-200'
        };
      case 'rejected':
        return {
          label: 'غير معتمدة',
          className: 'bg-rose-50 text-rose-800 border-rose-200'
        };
      default:
        return {
          label: 'غير مفعلة',
          className: 'bg-stone-100 text-stone-600 border-stone-200'
        };
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* Top Section Header */}
      <div className="bg-gradient-to-l from-stone-900 via-stone-800 to-stone-900 text-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-sm border border-stone-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-xl font-black">إحصائيات الأداء للخدمات التسويقية</h3>
              <span className="bg-amber-500 text-stone-950 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                سجل حقيقي
              </span>
            </div>
            <p className="text-stone-300 text-xs">
              قراءات فعلية ومباشرة مسجلة لحملاتك الإعلانية في دليل إربد التجاري
            </p>
          </div>
        </div>

        {/* Campaign Action Button */}
        {isOwner && onOpenMarketingHub && (
          <button
            type="button"
            onClick={onOpenMarketingHub}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-stone-950 text-xs font-black px-4 py-2.5 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <PlusCircle className="h-4 w-4" />
            <span>طلب أو تفعيل خدمة تسويقية</span>
          </button>
        )}
      </div>

      {/* KPI Real Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Ad Impressions */}
        <div className="bg-white p-4.5 rounded-2xl border border-stone-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">إجمالي ظهور الإعلانات</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Eye className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-900">
            {analyticsData.totalImpressions.toLocaleString('en-US')}
          </div>
          <div className="text-[11px] font-medium text-stone-500">
            مرات ظهور إعلاناتك أمام الزوار
          </div>
        </div>

        {/* Ad Clicks */}
        <div className="bg-white p-4.5 rounded-2xl border border-stone-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">إجمالي النقرات المسجلة</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Zap className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-900">
            {analyticsData.totalClicks.toLocaleString('en-US')}
          </div>
          <div className="text-[11px] font-medium text-stone-500">
            نقرات مباشرة على الإعلان
          </div>
        </div>

        {/* Real CTR */}
        <div className="bg-white p-4.5 rounded-2xl border border-stone-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">معدل النقر إلى الظهور (CTR)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#1a4d2e]">
            %{analyticsData.realCtr}
          </div>
          <div className="text-[11px] font-medium text-stone-500">
            نسبة التفاعل الفعلي
          </div>
        </div>

        {/* Conversions */}
        <div className="bg-white p-4.5 rounded-2xl border border-stone-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-stone-500">التواصل والتحويل المباشر</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Target className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-950">
            {analyticsData.totalConversions.toLocaleString('en-US')}
          </div>
          <div className="text-[11px] font-medium text-stone-500">
            تواصلات مباشرة ناتجة عن الإعلان
          </div>
        </div>

      </div>

      {/* Service Category Navigation Tabs */}
      <div className="bg-stone-100 p-1.5 rounded-2xl border border-stone-200 flex flex-wrap gap-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
            activeCategory === 'all'
              ? 'bg-[#1a4d2e] text-white shadow-2xs'
              : 'text-stone-600 hover:text-stone-900 bg-white/50 hover:bg-white'
          }`}
        >
          جميع الخدمات ({businessCampaigns.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('sponsored')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeCategory === 'sponsored'
              ? 'bg-[#1a4d2e] text-white shadow-2xs'
              : 'text-stone-600 hover:text-stone-900 bg-white/50 hover:bg-white'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>صدارة البحث</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('push_notifications')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeCategory === 'push_notifications'
              ? 'bg-[#1a4d2e] text-white shadow-2xs'
              : 'text-stone-600 hover:text-stone-900 bg-white/50 hover:bg-white'
          }`}
        >
          <Bell className="h-3.5 w-3.5" />
          <span>إشعار جماعي</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('homepage_banner')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeCategory === 'homepage_banner'
              ? 'bg-[#1a4d2e] text-white shadow-2xs'
              : 'text-stone-600 hover:text-stone-900 bg-white/50 hover:bg-white'
          }`}
        >
          <Megaphone className="h-3.5 w-3.5" />
          <span>بانر إعلاني</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory('promo_card')}
          className={`px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
            activeCategory === 'promo_card'
              ? 'bg-[#1a4d2e] text-white shadow-2xs'
              : 'text-stone-600 hover:text-stone-900 bg-white/50 hover:bg-white'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>بطاقة ترويجية</span>
        </button>
      </div>

      {/* Main Campaign List or Clean Real Empty State */}
      {filteredCampaigns.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-8 sm:p-10 text-center space-y-4 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-700 mx-auto flex items-center justify-center border border-amber-200">
            <Sparkles className="h-7 w-7" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h4 className="text-base sm:text-lg font-black text-stone-900">
              لا توجد حملات تسويقية نشطة أو سابقة
            </h4>
            <p className="text-xs text-stone-500 leading-relaxed font-medium">
              لم يتم تسجيل حملات ترويجية في هذا القسم بعد. يمكنك تفعيل خدمة صدارة البحث أو الإشعارات الهاتفية أو البانرات لزيادة عدد زوارك ومبيعاتك.
            </p>
          </div>

          {isOwner && onOpenMarketingHub && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onOpenMarketingHub}
                className="bg-[#1a4d2e] hover:bg-[#153e25] text-white text-xs font-black px-6 py-3 rounded-xl shadow-xs transition-all inline-flex items-center gap-2 cursor-pointer"
              >
                <PlusCircle className="h-4 w-4" />
                <span>تصفح وطلب الخدمات التسويقية المتاحة</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-black text-stone-700 px-1">
            <span>سجل الحملات التسويقية المسجلة ({filteredCampaigns.length})</span>
            <span className="text-stone-400 font-medium text-[11px]">يتم تحديث الإحصائيات مع كل تفاعل جديد</span>
          </div>

          <div className="grid grid-cols-1 gap-3.5">
            {filteredCampaigns.map((campaign) => {
              const statusBadge = getStatusBadge(campaign.status);
              const stats = campaign.stats || {};
              const imp = stats.impressions || 0;
              const clk = stats.clicks || 0;
              const conv = stats.conversions || (stats.calls || 0) + (stats.whatsapp || 0) + (stats.directions || 0);
              const ctr = imp > 0 ? ((clk / imp) * 100).toFixed(1) : '0.0';

              return (
                <div 
                  key={campaign.id}
                  className="bg-white border border-stone-200 rounded-2xl p-5 shadow-2xs hover:border-[#1a4d2e]/30 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-stone-900 text-sm">
                          {getServiceTitle(campaign.serviceType)}
                        </span>
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${statusBadge.className}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 font-medium flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-stone-400" />
                        <span>تاريخ الطلب: {campaign.createdAt ? new Date(campaign.createdAt).toLocaleDateString('ar-JO') : 'مسجل'}</span>
                      </div>
                    </div>

                    {(campaign.startDate || campaign.endDate) && (
                      <div className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-stone-600 font-bold self-start sm:self-center">
                        فترة التفعيل: {campaign.startDate || 'فوري'} - {campaign.endDate || 'حسب الباقة'}
                      </div>
                    )}
                  </div>

                  {/* Real Stats Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50/70 p-3.5 rounded-xl border border-stone-200/80">
                    <div className="space-y-0.5 text-right">
                      <span className="text-[11px] font-bold text-stone-500 block">الظهور المسجل</span>
                      <span className="text-base font-black text-stone-900">{imp.toLocaleString('en-US')}</span>
                    </div>

                    <div className="space-y-0.5 text-right">
                      <span className="text-[11px] font-bold text-stone-500 block">النقرات المسجلة</span>
                      <span className="text-base font-black text-stone-900">{clk.toLocaleString('en-US')}</span>
                    </div>

                    <div className="space-y-0.5 text-right">
                      <span className="text-[11px] font-bold text-stone-500 block">معدل CTR</span>
                      <span className="text-base font-black text-[#1a4d2e]">%{ctr}</span>
                    </div>

                    <div className="space-y-0.5 text-right">
                      <span className="text-[11px] font-bold text-stone-500 block">التواصل والتحويل</span>
                      <span className="text-base font-black text-purple-950">{conv.toLocaleString('en-US')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
