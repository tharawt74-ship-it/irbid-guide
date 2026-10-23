import React, { useState } from 'react';
import { 
  Plus, 
  Send, 
  RefreshCw, 
  Download, 
  ShieldCheck, 
  Search, 
  ExternalLink,
  Sparkles,
  Layers,
  Store,
  Briefcase,
  Megaphone,
  Bell,
  SlidersHorizontal,
  Settings,
  Users,
  History,
  Crown,
  Newspaper,
  Home as HomeIcon,
  Compass,
  Edit3,
  ShieldAlert,
  FolderTree,
  DollarSign,
  Globe,
  MapPin,
  FileText,
  Image as ImageIcon,
  Flame,
  Stethoscope,
  Building2,
  Bus,
  QrCode,
  Disc,
  MessageSquare,
  Calendar,
  HardDrive,
  ShoppingBag,
  Tag,
  Award,
  UserX,
  MessageSquareText,
  AlertCircle,
  TrendingUp
} from 'lucide-react';
import { Link } from 'react-router';

interface AdminHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingRequestsCount: number;
  pendingMarketingCount: number;
  businessesCount: number;
  jobsCount: number;
  pendingSuggestionsCount?: number;
  pendingReportsCount?: number;
  pendingHousingCount?: number;
  medicalFacilitiesCount?: number;
  pendingMedicalRequestsCount?: number;
  pendingShopsUpgradeCount?: number;
  pendingMedicalUpgradeCount?: number;
  pendingTicketsCount?: number;
  onRefresh: () => void;
  onOpenAddBusiness?: () => void;
  onOpenAddEntity?: () => void;
  onOpenBroadcastModal: () => void;
  onExportData: () => void;
  isRefreshing: boolean;
}

export function AdminHeader({
  activeTab,
  setActiveTab,
  pendingRequestsCount,
  pendingMarketingCount,
  businessesCount,
  jobsCount,
  pendingSuggestionsCount = 0,
  pendingReportsCount = 0,
  pendingHousingCount = 0,
  medicalFacilitiesCount = 0,
  pendingMedicalRequestsCount = 0,
  pendingShopsUpgradeCount = 0,
  pendingMedicalUpgradeCount = 0,
  pendingTicketsCount = 0,
  onRefresh,
  onOpenAddBusiness,
  onOpenAddEntity,
  onOpenBroadcastModal,
  onExportData,
  isRefreshing
}: AdminHeaderProps) {
  const groups = [
    {
      id: 'operations',
      label: 'مركز القيادة والعمليات اليومية',
      icon: Layers,
      tabs: [
        { id: 'overview', label: 'لوحة التحليلات والعمليات', icon: Layers, count: null },
        { id: 'emergency_events', label: 'إشعارات الطوارئ والمناسبات', icon: AlertCircle, count: null },
        { id: 'advanced_analytics', label: 'رادار الإحصائيات والتقارير التنفيذية', icon: TrendingUp, count: null },
        { id: 'requests', label: 'طلبات إضافة المحلات والمنشآت', icon: Store, count: pendingRequestsCount, isAlert: pendingRequestsCount > 0 },
        { id: 'central_orders', label: 'مراقب الطلبات الحية', icon: ShoppingBag, count: null },
        { id: 'editSuggestions', label: 'اقتراحات التعديل', icon: Edit3, count: pendingSuggestionsCount, isAlert: pendingSuggestionsCount > 0 },
        { id: 'ownershipClaims', label: 'إثبات وتوثيق الملكية', icon: ShieldCheck, count: null },
        { id: 'support_tickets', label: 'تذاكر الدعم والمساعدات', icon: MessageSquare, count: pendingTicketsCount || null, isAlert: (pendingTicketsCount || 0) > 0 },
      ]
    },
    {
      id: 'directory',
      label: 'دليل المنشآت والأعمال',
      icon: Store,
      tabs: [
        { id: 'businesses', label: 'إدارة المحلات والمنشآت', icon: Store, count: businessesCount, isAlert: pendingRequestsCount > 0 },
        { id: 'multi_branches', label: 'إدارة سلاسل وفروع المحلات', icon: Building2, count: null },
        { id: 'medical', label: 'إدارة المنشآت الطبية', icon: Stethoscope, count: medicalFacilitiesCount || null },
        { id: 'medical_requests', label: 'طلبات تسجيل المنشآت الطبية', icon: Building2, count: pendingMedicalRequestsCount || null, isAlert: (pendingMedicalRequestsCount || 0) > 0 },
        { id: 'live_offers', label: 'مراقبة العروض والخصومات', icon: Tag, count: null },
        { id: 'review_rewards_audit', label: 'سجل مكافآت التقييمات', icon: Award, count: null },
        { id: 'subscriptions_shops', label: 'ترقيات VIP للمحلات', icon: Crown, count: pendingShopsUpgradeCount || null, isAlert: (pendingShopsUpgradeCount || 0) > 0 },
        { id: 'subscriptions_medical', label: 'ترقيات VIP للمنشآت الطبية', icon: Crown, count: pendingMedicalUpgradeCount || null, isAlert: (pendingMedicalUpgradeCount || 0) > 0 },
        { id: 'reviewReports', label: 'بلاغات التقييمات والردود', icon: ShieldAlert, count: pendingReportsCount, isAlert: pendingReportsCount > 0 },
        { id: 'categories', label: 'تصنيفات المحلات', icon: FolderTree, count: null },
        { id: 'medical_categories', label: 'تصنيفات الرعاية الطبية', icon: Stethoscope, count: null },
      ]
    },
    {
      id: 'users_access',
      label: 'المستخدمين والحسابات والصلاحيات',
      icon: Users,
      tabs: [
        { id: 'accounts', label: 'جميع الحسابات', icon: Users, count: null },
        { id: 'supervisors', label: 'إدارة المشرفين والصلاحيات', icon: ShieldCheck, count: null },
        { id: 'audit', label: 'سجل الأنشطة والتدقيق', icon: History, count: null },
        { id: 'blacklist_manager', label: 'القائمة السوداء ومكافحة السبام', icon: UserX, count: null },
        { id: 'backup_center', label: 'مركز وأرشيف النسخ الاحتياطي', icon: HardDrive, count: null },
      ]
    },
    {
      id: 'marketing_finance',
      label: 'التسويق والإعلانات والمالية',
      icon: Megaphone,
      tabs: [
        { id: 'marketing', label: 'الحملات وطلبات التسويق', icon: Megaphone, count: pendingMarketingCount, isAlert: pendingMarketingCount > 0 },
        { id: 'ad_slots', label: 'حجز وجدولة المساحات الإعلانية', icon: Megaphone, count: null },
        { id: 'marketing_calendar', label: 'تقويم وجدول الحملات', icon: Calendar, count: null },
        { id: 'whatsapp_templates', label: 'قوالب رسائل الواتساب', icon: MessageSquareText, count: null },
        { id: 'banners', label: 'البانرات الإعلانية والستوريات', icon: ImageIcon, count: null },
        { id: 'broadcast', label: 'مركز الإشعارات والرسائل', icon: Bell, count: null },
        { id: 'vipPlans', label: 'أسعار باقات VIP', icon: DollarSign, count: null },
      ]
    },
    {
      id: 'content_settings',
      label: 'إدارة المحتوى وإعدادات المنظومة',
      icon: Settings,
      tabs: [
        { id: 'news_manager', label: 'إدارة أخبار ومقالات إربد', icon: Newspaper, count: null },
        { id: 'tourism_manager', label: 'إدارة المعالم السياحية والترفيهية', icon: Compass, count: null },
        { id: 'jobs', label: 'إدارة الوظائف والشواغر', icon: Briefcase, count: jobsCount },
        { id: 'housing', label: 'إدارة العقارات والسكني', icon: HomeIcon, count: pendingHousingCount, isAlert: (pendingHousingCount || 0) > 0 },
        { id: 'neighborhoods', label: 'أحياء ومناطق إربد', icon: MapPin, count: null },
        { id: 'wheel_studio', label: 'استوديو عجلة الحظ 3D', icon: Disc, count: null },
        { id: 'qr_studio', label: 'استوديو بوسترات الـ QR', icon: QrCode, count: null },
        { id: 'staticPages', label: 'الخصوصية والشروط', icon: FileText, count: null },
        { id: 'globalSettings', label: 'إعدادات المنظومة العامة', icon: Globe, count: null },
      ]
    }
  ];

  // Derive active group
  const activeGroup = groups.find(g => g.tabs.some(t => t.id === activeTab)) || groups[0];

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="bg-gradient-to-l from-[#1a4d2e] via-[#143e25] to-[#0a2314] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl border border-[#1a4d2e]/40">
        {/* Glow and Deco */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#ff9f1c]/15 rounded-full blur-2xl pointer-events-none -ml-16 -mb-16"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-[#ff9f1c] text-white px-3 py-1 rounded-full text-xs font-black shadow-xs">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>لوحة التحكم الإدارية المتقدمة</span>
              </span>
              <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur-md text-emerald-300 px-3 py-1 rounded-full text-xs font-bold">
                <Sparkles className="h-3.5 w-3.5 text-[#ff9f1c]" />
                <span>دليل شو في بإربد الإصدار 2.5</span>
              </span>
              <span className="inline-flex items-center gap-1 bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                متصل بالنظام
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white">
              إدارة المنصة، المحلات والخدمات التسويقية
            </h1>
            
            <p className="text-stone-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              تحكم مركزي شامل في مراجعة وتوثيق المحلات، مبيعات الخدمات الإعلانية، نشر الوظائف، إرسال الإشعارات الجماعية لجميع أهالي وطلاب إربد، وإعدادات المنظومة.
            </p>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0">
            <button
              onClick={onOpenAddEntity || onOpenAddBusiness}
              className="inline-flex items-center gap-2 bg-[#ff9f1c] hover:bg-[#f39209] text-white px-4.5 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة منشأة جديدة</span>
            </button>

            <button
              onClick={onOpenBroadcastModal}
              className="inline-flex items-center gap-2 bg-emerald-700/80 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all border border-emerald-500/30 cursor-pointer"
            >
              <Send className="h-4 w-4 text-[#ff9f1c]" />
              <span>إرسال إشعار عام</span>
            </button>

            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-stone-200 px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-colors border border-white/15 cursor-pointer disabled:opacity-50"
              title="تحديث البيانات من الخادم"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-[#ff9f1c]' : ''}`} />
              <span className="hidden sm:inline">تحديث</span>
            </button>

            <button
              onClick={onExportData}
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-stone-200 px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-colors border border-white/15 cursor-pointer"
              title="تصدير نسخة احتياطية من البيانات"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">نسخ احتياطي</span>
            </button>

            <Link
              to="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-stone-200 px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-colors border border-white/15 cursor-pointer"
              title="معاينة الموقع كزائر"
            >
              <ExternalLink className="h-4 w-4 text-sky-400" />
              <span className="hidden sm:inline">الموقع</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Structured Navigation Tab Groups & Sub-Tabs */}
      <div className="space-y-4" dir="rtl">
        <div>
          <span className="text-xs font-black text-stone-400 block mb-2 mr-1">الأقسام الرئيسية للوحة الإدارة</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full min-w-0">
            {groups.map((group) => {
              const GroupIcon = group.icon;
              const isGroupActive = activeGroup.id === group.id;
              
              // Calculate counts and alerts inside this group
              let totalCount = 0;
              let hasAlert = false;
              group.tabs.forEach(t => {
                if (t.count) totalCount += t.count;
                if (t.isAlert) hasAlert = true;
              });

              return (
                <button
                  key={group.id}
                  onClick={() => {
                    const isTabInGroup = group.tabs.some(t => t.id === activeTab);
                    if (!isTabInGroup && group.tabs.length > 0) {
                      setActiveTab(group.tabs[0].id);
                    }
                  }}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all duration-200 cursor-pointer min-w-0 ${
                    isGroupActive
                      ? 'bg-gradient-to-b from-[#1a4d2e] to-[#143e25] text-white border-[#1a4d2e] shadow-xs font-black'
                      : 'bg-white text-stone-600 border-[#e5e1da] hover:bg-stone-50 hover:text-stone-900 shadow-3xs'
                  }`}
                >
                  <GroupIcon className={`h-5 w-5 mb-1.5 shrink-0 ${isGroupActive ? 'text-[#ff9f1c]' : 'text-stone-400'}`} />
                  <span className="text-xs sm:text-sm font-black tracking-tight leading-tight truncate w-full px-1">{group.label}</span>
                  
                  {/* Alert Pulse or Count */}
                  {totalCount > 0 && (
                    <span className={`absolute top-2 left-2 text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                      hasAlert ? 'bg-red-500 text-white animate-pulse' : isGroupActive ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-600'
                    }`}>
                      {totalCount}
                    </span>
                  )}
                  {totalCount === 0 && hasAlert && (
                    <span className="absolute top-2 left-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-Tabs Ribbon for the Active Group */}
        <div className="bg-stone-50 p-2 rounded-2xl border border-stone-200/60 shadow-inner flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin min-w-0">
          <span className="text-[11px] font-black text-stone-400 px-2 select-none border-l border-stone-200 ml-1 shrink-0">التبويبات الفرعية:</span>
          {activeGroup.tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isTabActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isTabActive
                    ? 'bg-[#1a4d2e] text-white shadow-xs'
                    : 'text-stone-600 hover:bg-stone-200 hover:text-stone-900 bg-white border border-stone-200/50'
                }`}
              >
                <TabIcon className={`h-3.5 w-3.5 ${isTabActive ? 'text-[#ff9f1c]' : 'text-stone-400'}`} />
                <span>{tab.label}</span>
                
                {tab.count !== null && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                      tab.isAlert
                        ? 'bg-red-500 text-white animate-pulse'
                        : isTabActive
                        ? 'bg-white/20 text-white'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
