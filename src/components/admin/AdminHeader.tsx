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
  ShieldAlert
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
  onRefresh: () => void;
  onOpenAddBusiness: () => void;
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
  onRefresh,
  onOpenAddBusiness,
  onOpenBroadcastModal,
  onExportData,
  isRefreshing
}: AdminHeaderProps) {
  const tabs = [
    { id: 'overview', label: 'لوحة التحليلات', icon: Layers, count: null },
    { id: 'requests', label: 'طلبات الإضافة', icon: Store, count: pendingRequestsCount, isAlert: pendingRequestsCount > 0 },
    { id: 'editSuggestions', label: 'اقتراحات التعديل', icon: Edit3, count: pendingSuggestionsCount, isAlert: pendingSuggestionsCount > 0 },
    { id: 'ownershipClaims', label: 'إثبات ملكية المحلات', icon: ShieldCheck, count: null },
    { id: 'reviewReports', label: 'بلاغات التقييمات الكيدية', icon: ShieldAlert, count: pendingReportsCount, isAlert: pendingReportsCount > 0 },
    { id: 'businesses', label: 'دليل المحلات', icon: Store, count: businessesCount },
    { id: 'marketing', label: 'الحملات التسويقية', icon: Megaphone, count: pendingMarketingCount, isAlert: pendingMarketingCount > 0 },
    { id: 'subscriptions', label: 'أرباح واشتراكات الباقات', icon: Crown, count: null },
    { id: 'jobs', label: 'إدارة الوظائف', icon: Briefcase, count: jobsCount },
    { id: 'news', label: 'إدارة الأخبار', icon: Newspaper, count: null },
    { id: 'housing', label: 'إدارة العقارات والسكنيات', icon: HomeIcon, count: null },
    { id: 'tourism', label: 'إدارة السياحة والمعالم', icon: Compass, count: null },
    { id: 'audit', label: 'سجل الأنشطة والعمليات', icon: History, count: null },
    { id: 'broadcast', label: 'مركز الإشعارات', icon: Bell, count: null },
    { id: 'supervisors', label: 'إدارة المشرفين', icon: ShieldCheck, count: null },
    { id: 'accounts', label: 'جميع الحسابات', icon: Users, count: null },
    { id: 'settings', label: 'الإعدادات والنسخ', icon: Settings, count: null },
  ];

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
                <span>دليل شو في بإربد • الإصدار 2.5</span>
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
              onClick={onOpenAddBusiness}
              className="inline-flex items-center gap-2 bg-[#ff9f1c] hover:bg-[#f39209] text-white px-4.5 py-2.5 rounded-2xl font-black text-xs sm:text-sm transition-all shadow-md hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة محل جديد</span>
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

      {/* Navigation Tabs Bar */}
      <div className="bg-white p-2 rounded-2xl border border-[#e5e1da] shadow-xs flex items-center gap-1.5 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#1a4d2e] text-white shadow-xs'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-[#ff9f1c]' : 'text-stone-400'}`} />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                    tab.isAlert
                      ? 'bg-red-500 text-white animate-pulse'
                      : isActive
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
  );
}
