import React, { useState, useEffect, useMemo } from 'react';
import { 
  Crown, 
  Sparkles, 
  Calendar, 
  Clock, 
  Search, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Filter, 
  Check, 
  X, 
  Store, 
  Stethoscope, 
  History, 
  Hourglass, 
  Layers, 
  ExternalLink, 
  ShieldCheck,
  Gift,
  Phone,
  User,
  SlidersHorizontal,
  ChevronDown,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { WhatsAppIcon } from '../common/WhatsAppIcon';
import { Business, UpgradeRequest } from '../../types';
import { getBusinessVipStatus } from '../../lib/vipHelper';
import { getJordanNow, formatJordanDateArabic } from '../../lib/jordanTime';
import { isMedicalBusiness } from '../../lib/medicalHelper';
import { useSystemSettings } from '../../contexts/SystemSettingsContext';
import { recordAuditLog } from '../../lib/auditLogHelper';

interface AdminSubscriptionsManagerProps {
  businesses: Business[];
  onOpenVipModal: (business: Business) => void;
  onShowToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  initialTarget?: 'shops' | 'medical';
  onRefreshData?: () => void;
}

export function AdminSubscriptionsManager({
  businesses,
  onOpenVipModal,
  onShowToast,
  initialTarget = 'shops',
  onRefreshData
}: AdminSubscriptionsManagerProps) {
  const { vipPlans } = useSystemSettings();

  // Primary Sector Sub-tab: 'shops' (المحلات) or 'medical' (المنشآت الطبية)
  const [activeSector, setActiveSector] = useState<'shops' | 'medical'>(initialTarget);

  // Secondary Sub-tab within the selected sector:
  // 1: 'subscriptions' (الاشتراكات الحالية وعرض كل محل/منشأة مع زر إدارة الباقة)
  // 2: 'upgrades' (إدارة طلبات الترقية للباقة الذهبية مع أرشيف الطلبات السابقة)
  const [activeSubTab, setActiveSubTab] = useState<'subscriptions' | 'upgrades'>('subscriptions');

  // Subscriptions Table Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'golden' | 'trial' | 'basic' | 'expiring_soon' | 'expired'>('all');

  // Upgrade Requests Filter
  const [upgradeStatusFilter, setUpgradeStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [upgradeSearch, setUpgradeSearch] = useState('');

  // Firestore Upgrade Requests State
  const [requests, setRequests] = useState<UpgradeRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Sync when initialTarget changes externally
  useEffect(() => {
    if (initialTarget) {
      setActiveSector(initialTarget);
    }
  }, [initialTarget]);

  // Real-time listener for upgradeRequests
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'upgradeRequests'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: UpgradeRequest[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as UpgradeRequest);
        });
        setRequests(list);
        setLoadingRequests(false);
      },
      (err) => {
        console.error('Error fetching upgrade requests:', err);
        setLoadingRequests(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Separate businesses into commercial shops and medical facilities
  const { commercialShops, medicalFacilities } = useMemo(() => {
    const shops: Business[] = [];
    const med: Business[] = [];

    businesses.forEach((b) => {
      const isMed = isMedicalBusiness(b) || !!b.medicalProfile || (b as any).requestType === 'medical_facility_registration';
      if (isMed) {
        med.push(b);
      } else {
        shops.push(b);
      }
    });

    return { commercialShops: shops, medicalFacilities: med };
  }, [businesses]);

  // Active list of accounts based on sector tab
  const currentSectorBusinesses = activeSector === 'shops' ? commercialShops : medicalFacilities;

  // Separate upgrade requests into shops and medical
  const { shopUpgradeRequests, medicalUpgradeRequests } = useMemo(() => {
    const shopsReqs: UpgradeRequest[] = [];
    const medReqs: UpgradeRequest[] = [];

    requests.forEach((req) => {
      const matchedBiz = businesses.find((b) => b.id === req.businessId);
      const isMed = matchedBiz
        ? isMedicalBusiness(matchedBiz) || !!matchedBiz.medicalProfile || (matchedBiz as any).requestType === 'medical_facility_registration'
        : (
            req.businessName?.includes('عياد') ||
            req.businessName?.includes('مستشف') ||
            req.businessName?.includes('دكتور') ||
            req.businessName?.includes('طبي') ||
            req.businessName?.includes('صيدل') ||
            req.businessName?.includes('مختبر') ||
            req.businessName?.includes('مركز طبي')
          );

      if (isMed) {
        medReqs.push(req);
      } else {
        shopsReqs.push(req);
      }
    });

    return { shopUpgradeRequests: shopsReqs, medicalUpgradeRequests: medReqs };
  }, [requests, businesses]);

  // Active list of upgrade requests based on sector tab
  const currentSectorRequests = activeSector === 'shops' ? shopUpgradeRequests : medicalUpgradeRequests;

  // Golden Plan Price from dynamic settings
  const goldenPlan = vipPlans.find((p) => p.id === 'golden');
  const goldenPrice = goldenPlan ? goldenPlan.price : 29;

  // Sector Statistics for KPIs
  const sectorStats = useMemo(() => {
    let goldenCount = 0;
    let trialCount = 0;
    let basicCount = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;
    let mrr = 0;

    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 3600 * 1000;

    currentSectorBusinesses.forEach((b) => {
      const vip = getBusinessVipStatus(b);
      const isTrial = !!b.isVipTrial || !!vip.isTrial;

      if (vip.isVip) {
        if (isTrial) {
          trialCount++;
        } else {
          goldenCount++;
          mrr += goldenPrice;
        }

        if (vip.expiresAt && vip.expiresAt < now) {
          expiredCount++;
        } else if (vip.expiresAt && vip.expiresAt - now < sevenDaysMs && vip.expiresAt > now) {
          expiringSoonCount++;
        }
      } else {
        basicCount++;
      }
    });

    const pendingRequests = currentSectorRequests.filter((r) => r.status === 'pending').length;

    return {
      totalAccounts: currentSectorBusinesses.length,
      goldenCount,
      trialCount,
      basicCount,
      expiringSoonCount,
      expiredCount,
      mrr,
      pendingRequests
    };
  }, [currentSectorBusinesses, currentSectorRequests, goldenPrice]);

  // Filtered Businesses for Sub-tab 1 (الاشتراكات الحالية)
  const filteredBusinesses = useMemo(() => {
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 3600 * 1000;

    return currentSectorBusinesses.filter((b) => {
      const vip = getBusinessVipStatus(b);
      const isTrial = !!b.isVipTrial || !!vip.isTrial;

      // Tier filter
      if (tierFilter === 'golden') {
        if (!vip.isVip || isTrial) return false;
      } else if (tierFilter === 'trial') {
        if (!isTrial) return false;
      } else if (tierFilter === 'basic') {
        if (vip.isVip) return false;
      } else if (tierFilter === 'expiring_soon') {
        if (!vip.expiresAt || vip.expiresAt < now || vip.expiresAt - now > sevenDaysMs) return false;
      } else if (tierFilter === 'expired') {
        if (!vip.expiresAt || vip.expiresAt >= now) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = b.name?.toLowerCase().includes(q);
        const matchOwner = b.ownerName?.toLowerCase().includes(q);
        const matchPhone = b.phone?.includes(q) || b.ownerPhone?.includes(q);
        const matchCategory = b.category?.toLowerCase().includes(q) || b.subCategory?.toLowerCase().includes(q);
        return matchName || matchOwner || matchPhone || matchCategory;
      }

      return true;
    });
  }, [currentSectorBusinesses, tierFilter, searchQuery]);

  // Filtered Upgrade Requests for Sub-tab 2 (طلبات الترقية والأرشيف)
  const filteredUpgradeRequests = useMemo(() => {
    return currentSectorRequests.filter((req) => {
      if (upgradeStatusFilter !== 'all' && req.status !== upgradeStatusFilter) {
        return false;
      }

      if (upgradeSearch.trim()) {
        const q = upgradeSearch.toLowerCase().trim();
        const matchName = req.businessName?.toLowerCase().includes(q);
        const matchPhone = req.ownerPhone?.includes(q);
        const matchEmail = req.ownerEmail?.toLowerCase().includes(q);
        return matchName || matchPhone || matchEmail;
      }

      return true;
    });
  }, [currentSectorRequests, upgradeStatusFilter, upgradeSearch]);

  // Deduplicated Upgrade Requests for counts
  const pendingRequestsCount = useMemo(() => {
    return currentSectorRequests.filter((r) => r.status === 'pending').length;
  }, [currentSectorRequests]);

  const archivedRequestsCount = useMemo(() => {
    return currentSectorRequests.filter((r) => r.status === 'approved' || r.status === 'rejected').length;
  }, [currentSectorRequests]);

  // Handle Approve / Reject Upgrade Request
  const handleUpdateRequestStatus = async (req: UpgradeRequest, newStatus: 'approved' | 'rejected') => {
    if (!req.id) return;
    setProcessingId(req.id);
    try {
      // Find all duplicate pending requests for the same business to resolve simultaneously
      const sameBizPending = currentSectorRequests.filter(
        (r) => r.businessId === req.businessId && r.status === 'pending'
      );
      const targets = sameBizPending.length > 0 ? sameBizPending : [req];

      const updatePromises = targets.map((r) =>
        updateDoc(doc(db, 'upgradeRequests', r.id!), {
          status: newStatus,
          updatedAt: new Date().toISOString()
        })
      );
      await Promise.all(updatePromises);

      // If approved, immediately upgrade the business document in Firestore
      if (newStatus === 'approved' && req.businessId) {
        const now = Date.now();
        const durationDays = req.cycle === 'yearly' ? 365 : 30;
        const expiresAt = now + durationDays * 24 * 60 * 60 * 1000;

        await updateDoc(doc(db, 'businesses', req.businessId), {
          packagePlan: 'golden',
          isVerified: true,
          isVip: true,
          isVipTrial: false,
          vipSubscriptionStartsAt: now,
          vipSubscriptionExpiresAt: expiresAt,
          isVipScheduled: true,
          vipNotes: `تمت الترقية للباقة الذهبية بقبول طلب الترقية بتاريخ ${formatJordanDateArabic(getJordanNow())} (${req.cycle === 'yearly' ? 'اشتراك سنوي' : 'اشتراك شهري'})`
        });

        // Record Audit Log
        await recordAuditLog({
          action: 'UPGRADE_VIP',
          actionAr: 'ترقية باقة VIP',
          targetId: req.businessId,
          targetName: req.businessName,
          performedBy: 'مدير المنصة',
          details: `الموافقة على طلب ترقية (${req.businessName}) إلى الباقة الذهبية VIP (${req.cycle === 'yearly' ? 'سنوي' : 'شهري'})`,
          timestamp: Date.now()
        });

        if (onRefreshData) onRefreshData();
      } else if (newStatus === 'rejected' && req.businessId) {
        await recordAuditLog({
          action: 'REJECT_UPGRADE',
          actionAr: 'رفض طلب ترقية',
          targetId: req.businessId,
          targetName: req.businessName,
          performedBy: 'مدير المنصة',
          details: `رفض طلب ترقية (${req.businessName}) للباقة الذهبية`,
          timestamp: Date.now()
        });
      }

      onShowToast(
        `تم ${newStatus === 'approved' ? 'قبول طلب الترقية وتفعيل الباقة الذهبية بنجاح 👑' : 'رفض طلب الترقية بنجاح'}`,
        newStatus === 'approved' ? 'success' : 'info'
      );
    } catch (err) {
      console.error('Error updating upgrade request status:', err);
      onShowToast('حدث خطأ أثناء معالجة الطلب', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Helper to format timestamps to Arabic date & time
  const formatDateTime = (val: any): string => {
    if (!val) return 'غير محدد';
    try {
      let d: Date;
      if (typeof val === 'number') {
        d = new Date(val);
      } else if (typeof val === 'string') {
        d = new Date(val);
      } else if (val?.toDate) {
        d = val.toDate();
      } else if (val instanceof Date) {
        d = val;
      } else {
        return 'غير محدد';
      }

      if (isNaN(d.getTime())) return 'غير محدد';

      return d.toLocaleDateString('ar-JO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'غير محدد';
    }
  };

  // Helper to format date only
  const formatDateOnly = (val: any): string => {
    if (!val) return 'دائم / غير محدد';
    try {
      let d: Date;
      if (typeof val === 'number') {
        d = new Date(val);
      } else if (typeof val === 'string') {
        d = new Date(val);
      } else if (val?.toDate) {
        d = val.toDate();
      } else if (val instanceof Date) {
        d = val;
      } else {
        return 'دائم / غير محدد';
      }

      if (isNaN(d.getTime())) return 'دائم / غير محدد';

      return d.toLocaleDateString('ar-JO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'دائم / غير محدد';
    }
  };

  // WhatsApp Reminder message
  const handleSendWhatsapp = (b: Business) => {
    const vip = getBusinessVipStatus(b);
    const expDateStr = vip.expiresAt ? formatDateOnly(vip.expiresAt) : 'قريباً';
    const isTrial = !!b.isVipTrial || !!vip.isTrial;
    const planName = isTrial ? 'تجربة الـ VIP الذهبية المجانية' : 'الباقة الذهبية المميزة';

    const message = `مرحباً بك إدارة ${activeSector === 'medical' ? 'منشأة' : 'محل'} "${b.name}" 🌸\nنود تذكيركم باشتراككم في منصة شو في بإربد (${planName}).\nتاريخ الانتهاء: ${expDateStr}.\nللتجديد والاستمرار في الظهور بصدارة البحث والاستفادة من الميزات يسرنا تواصلكم معنا.`;

    let phone = (b.phone || b.ownerPhone || '').replace(/[^0-9]/g, '');
    if (phone.startsWith('07')) {
      phone = '962' + phone.substring(1);
    }
    if (!phone) {
      onShowToast('لا يوجد رقم هاتف مسجل للتواصل عبر واتساب', 'error');
      return;
    }
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-l from-amber-950 via-[#2d2110] to-[#1a1408] rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-amber-800/40 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mt-20"></div>
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none -mr-16 -mb-16"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-amber-500 text-stone-950 px-3 py-1 rounded-full text-xs font-black shadow-xs">
                <Crown className="h-3.5 w-3.5 fill-stone-950" />
                <span>إدارة الاشتراكات والباقات</span>
              </span>
              <span className="inline-flex items-center gap-1 bg-white/10 backdrop-blur-md text-amber-200 px-3 py-1 rounded-full text-xs font-bold">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span>نظام الباقات الذهبية والفترات التجريبية</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white">
              إدارة اشتراكات وباقات الحسابات والترقيات
            </h1>
            <p className="text-stone-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              متابعة نوع اشتراك كل منشأة ومحل، تواريخ البدء والانتهاء، إهداء الفترات التجريبية، والموافقة على طلبات الترقية للباقة الذهبية مع الأرشيف الكامل.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/15 text-center min-w-[110px]">
              <span className="text-[10px] text-amber-200 font-bold block">العائد الشهري (MRR)</span>
              <div className="text-xl sm:text-2xl font-black text-amber-400 font-sans mt-0.5">
                {sectorStats.mrr} <span className="text-xs text-white/80 font-normal">د.أ</span>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/15 text-center min-w-[110px]">
              <span className="text-[10px] text-emerald-200 font-bold block">مشتركي VIP الذهبية</span>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 font-sans mt-0.5">
                {sectorStats.goldenCount}
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/15 text-center min-w-[110px]">
              <span className="text-[10px] text-sky-200 font-bold block">فترات تجريبية نشطة</span>
              <div className="text-xl sm:text-2xl font-black text-sky-400 font-sans mt-0.5">
                {sectorStats.trialCount}
              </div>
            </div>

            {sectorStats.pendingRequests > 0 && (
              <div className="bg-red-500/20 backdrop-blur-md rounded-2xl px-4 py-3 border border-red-500/30 text-center min-w-[110px] animate-pulse">
                <span className="text-[10px] text-red-200 font-bold block">طلبات ترقية معلقة</span>
                <div className="text-xl sm:text-2xl font-black text-red-400 font-sans mt-0.5">
                  {sectorStats.pendingRequests}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2 MAIN SUB-TABS: (1) المحلات | (2) المنشآت الطبية */}
      <div className="bg-white p-2 rounded-2xl border border-stone-200/80 shadow-xs">
        <div className="grid grid-cols-2 gap-2">
          {/* Sub-tab 1: المحلات */}
          <button
            onClick={() => setActiveSector('shops')}
            className={`flex flex-wrap sm:flex-nowrap items-center justify-center gap-1.5 sm:gap-2.5 py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeSector === 'shops'
                ? 'bg-[#1a4d2e] text-white shadow-md'
                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 bg-stone-50/60'
            }`}
          >
            <Store className={`h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0 ${activeSector === 'shops' ? 'text-[#ff9f1c]' : 'text-stone-400'}`} />
            <span className="text-center leading-tight">المحلات والأنشطة التجارية</span>
            <span
              className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full font-sans shrink-0 ${
                activeSector === 'shops' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
              }`}
            >
              {commercialShops.length}
            </span>
            {shopUpgradeRequests.filter((r) => r.status === 'pending').length > 0 && (
              <span className="bg-amber-500 text-stone-950 text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-black animate-pulse shrink-0">
                {shopUpgradeRequests.filter((r) => r.status === 'pending').length} ترقية
              </span>
            )}
          </button>

          {/* Sub-tab 2: المنشآت الطبية */}
          <button
            onClick={() => setActiveSector('medical')}
            className={`flex flex-wrap sm:flex-nowrap items-center justify-center gap-1.5 sm:gap-2.5 py-3 px-2 sm:px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeSector === 'medical'
                ? 'bg-[#1a4d2e] text-white shadow-md'
                : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 bg-stone-50/60'
            }`}
          >
            <Stethoscope className={`h-4 w-4 sm:h-4.5 sm:w-4.5 shrink-0 ${activeSector === 'medical' ? 'text-[#ff9f1c]' : 'text-stone-400'}`} />
            <span className="text-center leading-tight">المنشآت والمراكز الطبية</span>
            <span
              className={`text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full font-sans shrink-0 ${
                activeSector === 'medical' ? 'bg-white/20 text-white' : 'bg-stone-200 text-stone-700'
              }`}
            >
              {medicalFacilities.length}
            </span>
            {medicalUpgradeRequests.filter((r) => r.status === 'pending').length > 0 && (
              <span className="bg-amber-500 text-stone-950 text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-full font-black animate-pulse shrink-0">
                {medicalUpgradeRequests.filter((r) => r.status === 'pending').length} ترقية
              </span>
            )}
          </button>
        </div>
      </div>

      {/* SECONDARY SUB-TABS: 
          1- عرض كل محل واشتراكه الحالي مع زر لإدارة الباقة الذهبية
          2- إدارة طلبات الترقية للباقة الذهبية مع أرشيف الطلبات السابقة وتاريخ تقديم كل طلب 
      */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('subscriptions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeSubTab === 'subscriptions'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
            }`}
          >
            <Crown className={`h-4 w-4 ${activeSubTab === 'subscriptions' ? 'text-amber-500' : 'text-stone-400'}`} />
            <span>
              {activeSector === 'shops' ? 'اشتراكات المحلات الحالية' : 'اشتراكات المنشآت الطبية الحالية'}
            </span>
            <span className="text-[11px] font-sans px-1.5 py-0.5 rounded-md bg-stone-200 text-stone-700 font-bold">
              {currentSectorBusinesses.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('upgrades')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-black transition-all cursor-pointer ${
              activeSubTab === 'upgrades'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/50'
            }`}
          >
            <Clock className={`h-4 w-4 ${activeSubTab === 'upgrades' ? 'text-amber-500' : 'text-stone-400'}`} />
            <span>طلبات الترقية للباقة الذهبية والأرشيف</span>
            {pendingRequestsCount > 0 ? (
              <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-amber-500 text-stone-950 font-black animate-pulse">
                {pendingRequestsCount} معلق
              </span>
            ) : (
              <span className="text-[11px] font-sans px-1.5 py-0.5 rounded-md bg-stone-200 text-stone-700 font-bold">
                {currentSectorRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Dynamic Context Description */}
        <div className="text-xs text-stone-500 font-bold hidden md:block">
          {activeSector === 'shops' ? '🏪 إدارة قطاع المحلات والشركات' : '🩺 إدارة قطاع العيادات والمراكز والمستشفيات'}
        </div>
      </div>

      {/* =========================================================================================
          CONTENT FOR SUB-TAB 1: عرض كل محل/منشأة واشتراكه الحالي وتواريخ البدء والانتهاء وزر الإدارة
         ========================================================================================= */}
      {activeSubTab === 'subscriptions' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`ابحث باسم ${activeSector === 'shops' ? 'المحل أو المالك أو التصنيف' : 'المنشأة أو الطبيب أو التخصص'}...`}
                className="w-full bg-stone-50 text-stone-900 pr-9 pl-4 py-2 rounded-xl text-xs sm:text-sm font-bold border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-stone-600">
                <Filter className="h-3.5 w-3.5 text-stone-400" />
                <span>نوع الاشتراك:</span>
                <select
                  value={tierFilter}
                  onChange={(e) => setTierFilter(e.target.value as any)}
                  className="bg-transparent border-0 text-stone-900 font-black text-xs focus:ring-0 cursor-pointer pr-1"
                >
                  <option value="all">جميع الاشتراكات ({currentSectorBusinesses.length})</option>
                  <option value="golden">الباقة الذهبية VIP ({sectorStats.goldenCount})</option>
                  <option value="trial">فترة تجريبية VIP مجانية ({sectorStats.trialCount})</option>
                  <option value="basic">الباقة الأساسية ({sectorStats.basicCount})</option>
                  <option value="expiring_soon">تنتهي قريباً (خلال 7 أيام) ({sectorStats.expiringSoonCount})</option>
                  <option value="expired">منتهية الصلاحية ({sectorStats.expiredCount})</option>
                </select>
              </div>

              {tierFilter !== 'all' && (
                <button
                  onClick={() => setTierFilter('all')}
                  className="text-xs text-stone-500 hover:text-stone-800 bg-stone-100 hover:bg-stone-200 px-2.5 py-1.5 rounded-xl font-bold cursor-pointer transition-colors"
                >
                  إلغاء الفلتر
                </button>
              )}
            </div>
          </div>

          {/* Table of Subscriptions */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-stone-50/90 border-b border-stone-200 text-stone-600 font-bold">
                    <th className="p-3.5 sm:p-4">{activeSector === 'shops' ? 'المحل والنشاط' : 'المنشأة الطبية والتخصص'}</th>
                    <th className="p-3.5 sm:p-4">نوع الاشتراك الحالي</th>
                    <th className="p-3.5 sm:p-4">تاريخ بدء الاشتراك</th>
                    <th className="p-3.5 sm:p-4">تاريخ انتهاء الاشتراك</th>
                    <th className="p-3.5 sm:p-4">حالة الصلاحية</th>
                    <th className="p-3.5 sm:p-4 text-center">إدارة الباقة الذهبية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredBusinesses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-stone-400 font-bold">
                        لا توجد حسابات مطابقة للبحث أو الفلتر المحدد.
                      </td>
                    </tr>
                  ) : (
                    filteredBusinesses.map((b) => {
                      const vip = getBusinessVipStatus(b);
                      const isTrial = !!b.isVipTrial || !!vip.isTrial;
                      const now = Date.now();
                      const isExpired = !!vip.expiresAt && vip.expiresAt < now;
                      const isExpiringSoon = !!vip.expiresAt && !isExpired && vip.expiresAt - now < 7 * 24 * 3600 * 1000;

                      // Start and End dates
                      const startDateVal = b.vipSubscriptionStartsAt || b.createdAt;
                      const endDateVal = b.vipSubscriptionExpiresAt;

                      return (
                        <tr key={b.id} className="hover:bg-stone-50/80 transition-colors">
                          {/* Business Name & Owner */}
                          <td className="p-3.5 sm:p-4">
                            <div className="flex items-center gap-2">
                              <div className="font-black text-stone-900 text-sm">{b.name}</div>
                              {b.isVerified && (
                                <span title="موثق رسمياً">
                                  <ShieldCheck className="h-4 w-4 text-[#1a4d2e] shrink-0" />
                                </span>
                              )}
                            </div>
                            <div className="text-stone-500 text-[11px] mt-0.5 flex flex-wrap items-center gap-2 font-bold">
                              <span className="text-[#1a4d2e]">{b.category}</span>
                              {b.ownerName && <span>• المالك: {b.ownerName}</span>}
                              {(b.phone || b.ownerPhone) && (
                                <span dir="ltr" className="font-mono text-stone-400">
                                  {b.phone || b.ownerPhone}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Subscription Type */}
                          <td className="p-3.5 sm:p-4">
                            {isTrial ? (
                              <div className="inline-flex flex-col gap-0.5">
                                <span className="inline-flex items-center gap-1 font-black px-2.5 py-1 rounded-full border text-[11px] bg-amber-50 text-amber-900 border-amber-300">
                                  <Gift className="h-3.5 w-3.5 text-amber-600" />
                                  <span>تجربة مجانية في VIP</span>
                                </span>
                                {vip.daysRemaining !== undefined && (
                                  <span className="text-[10px] text-amber-700 font-bold mr-1">
                                    (متبقي {vip.daysRemaining} يوم)
                                  </span>
                                )}
                              </div>
                            ) : vip.isVip || b.packagePlan === 'golden' ? (
                              <span className="inline-flex items-center gap-1.5 font-black px-2.5 py-1 rounded-full border text-[11px] bg-gradient-to-r from-amber-100 to-amber-200 text-amber-950 border-amber-300 shadow-3xs">
                                <Crown className="h-3.5 w-3.5 text-amber-600 fill-amber-500" />
                                <span>الباقة الذهبية VIP</span>
                              </span>
                            ) : b.packagePlan === 'pay_per_use' ? (
                              <span className="inline-flex items-center gap-1 font-black px-2.5 py-1 rounded-full border text-[11px] bg-blue-50 text-blue-800 border-blue-200">
                                <span>الدفع عند الطلب</span>
                              </span>
                            ) : (
                              <span className="text-stone-600 font-bold bg-stone-100 px-2.5 py-1 rounded-full border border-stone-200 text-[11px] inline-flex items-center gap-1">
                                <span>الباقة الأساسية (مجانية)</span>
                              </span>
                            )}
                          </td>

                          {/* Start Date */}
                          <td className="p-3.5 sm:p-4">
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-stone-700 font-bold">
                              <Calendar className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                              <span>{formatDateOnly(startDateVal)}</span>
                            </div>
                            {b.vipSubscriptionStartsAt && (
                              <span className="text-[10px] text-stone-400 font-bold block mt-0.5">تاريخ بدء VIP</span>
                            )}
                          </td>

                          {/* Expiry Date */}
                          <td className="p-3.5 sm:p-4">
                            {endDateVal ? (
                              <div className="space-y-0.5">
                                <div
                                  className={`flex items-center gap-1.5 font-mono text-[11px] font-black ${
                                    isExpired
                                      ? 'text-red-600 line-through'
                                      : isExpiringSoon
                                      ? 'text-amber-600 font-black'
                                      : 'text-stone-800'
                                  }`}
                                >
                                  <Clock className="h-3.5 w-3.5 shrink-0" />
                                  <span>{formatDateOnly(endDateVal)}</span>
                                </div>
                                {isExpiringSoon && (
                                  <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold inline-block">
                                    ينتهي قريباً
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-stone-400 text-[11px] font-bold">دائم / غير محدد</span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="p-3.5 sm:p-4">
                            {isExpired ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-md">
                                <AlertTriangle className="h-3 w-3" />
                                <span>منتهي الصلاحية</span>
                              </span>
                            ) : vip.isVip ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                <span>{isTrial ? 'تجربة سارية' : 'ساري ونشط'}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md">
                                <span>أساسي مستمر</span>
                              </span>
                            )}
                          </td>

                          {/* Actions: Manage VIP subscription button */}
                          <td className="p-3.5 sm:p-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => onOpenVipModal(b)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer shadow-xs ${
                                  vip.isVip
                                    ? 'bg-amber-500 hover:bg-amber-600 text-stone-950 hover:shadow-md'
                                    : 'bg-[#1a4d2e] hover:bg-[#143e25] text-white hover:shadow-md'
                                }`}
                                title="إدارة وترقية اشتراك الباقة الذهبية VIP وتحديد التواريخ"
                              >
                                <Crown className="h-3.5 w-3.5 fill-current" />
                                <span>{vip.isVip ? 'إدارة الباقة الذهبية' : 'ترقية إلى VIP'}</span>
                              </button>

                              {(b.phone || b.ownerPhone) && (
                                <button
                                  onClick={() => handleSendWhatsapp(b)}
                                  className="p-1.5 rounded-xl text-emerald-700 hover:bg-emerald-50 transition-colors border border-emerald-200 cursor-pointer"
                                  title="تواصل واتساب مع المالك لتذكير التجديد"
                                >
                                  <WhatsAppIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================================
          CONTENT FOR SUB-TAB 2: إدارة طلبات الترقية للباقة الذهبية مع أرشيف الطلبات وتاريخ تقديم كل طلب
         ========================================================================================= */}
      {activeSubTab === 'upgrades' && (
        <div className="space-y-4">
          {/* Sub-Filters: Pending vs Past Archive */}
          <div className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setUpgradeStatusFilter('pending')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  upgradeStatusFilter === 'pending'
                    ? 'bg-amber-500 text-stone-950 shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <Clock className="h-3.5 w-3.5" />
                <span>الطلبات المعلقة (قيد الانتظار)</span>
                {pendingRequestsCount > 0 && (
                  <span className="bg-stone-950 text-amber-300 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {pendingRequestsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setUpgradeStatusFilter('approved')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  upgradeStatusFilter === 'approved'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>أرشيف الطلبات المقبولة</span>
              </button>

              <button
                onClick={() => setUpgradeStatusFilter('rejected')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  upgradeStatusFilter === 'rejected'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>أرشيف الطلبات المرفوضة</span>
              </button>

              <button
                onClick={() => setUpgradeStatusFilter('all')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  upgradeStatusFilter === 'all'
                    ? 'bg-stone-800 text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <History className="h-3.5 w-3.5" />
                <span>كافة الطلبات والأرشيف ({currentSectorRequests.length})</span>
              </button>
            </div>

            {/* Search in Upgrade Requests */}
            <div className="relative min-w-[240px]">
              <input
                type="text"
                value={upgradeSearch}
                onChange={(e) => setUpgradeSearch(e.target.value)}
                placeholder="ابحث بالاسم أو الهاتف..."
                className="w-full bg-stone-50 text-stone-900 pr-9 pl-3 py-1.5 rounded-xl text-xs font-bold border border-stone-200 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
            </div>
          </div>

          {/* Upgrade Requests Grid / List */}
          {loadingRequests ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-stone-200">
              <RefreshCw className="h-8 w-8 text-stone-300 animate-spin mx-auto mb-2" />
              <p className="text-xs text-stone-500 font-bold">جاري تحميل طلبات الترقية والأرشيف...</p>
            </div>
          ) : filteredUpgradeRequests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-stone-200 space-y-3">
              <Crown className="h-12 w-12 text-stone-300 mx-auto" />
              <h3 className="font-bold text-stone-700 text-sm">
                {upgradeStatusFilter === 'pending'
                  ? 'لا توجد طلبات ترقية معلقة حالياً في هذا القسم'
                  : 'لا توجد طلبات سابقة مطابقة للفلتر المحدد'}
              </h3>
              <p className="text-xs text-stone-400 max-w-md mx-auto">
                عند قيام أصحاب {activeSector === 'shops' ? 'المحلات' : 'المنشآت الطبية'} بطلب ترقية حسابهم إلى الباقة الذهبية VIP، ستظهر الطلبات هنا مباشرة لإدارتها أو أرشفتها.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredUpgradeRequests.map((req) => {
                const isPending = req.status === 'pending';
                const isApproved = req.status === 'approved';
                const isRejected = req.status === 'rejected';
                const matchedBiz = businesses.find((b) => b.id === req.businessId);

                return (
                  <div
                    key={req.id}
                    className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5 ${
                      isPending
                        ? 'border-amber-300 bg-gradient-to-r from-amber-50/40 via-white to-white'
                        : 'border-stone-200'
                    }`}
                  >
                    {/* Details Column */}
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-0.5 rounded-lg flex items-center gap-1 border border-amber-200">
                          <Crown className="h-3 w-3 text-amber-600 fill-amber-500" />
                          <span>طلب ترقية VIP الذهبية</span>
                        </span>

                        <h3 className="font-black text-stone-900 text-base">{req.businessName}</h3>

                        {isPending && (
                          <span className="text-[10px] bg-amber-500/15 text-amber-800 border border-amber-300 px-2 py-0.5 rounded-md font-black flex items-center gap-1">
                            <Clock className="h-3 w-3 text-amber-600" />
                            <span>قيد الانتظار والمراجعة</span>
                          </span>
                        )}
                        {isApproved && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-md font-black flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>تمت الموافقة وتفعيل VIP (أرشيف)</span>
                          </span>
                        )}
                        {isRejected && (
                          <span className="text-[10px] bg-red-50 text-red-800 border border-red-300 px-2 py-0.5 rounded-md font-black flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-red-600" />
                            <span>طلب مرفوض (أرشيف)</span>
                          </span>
                        )}
                      </div>

                      {/* Information Grid with Exact Submission Date */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs bg-stone-50/80 p-3 rounded-xl border border-stone-100">
                        {/* 1: Requested Cycle */}
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-stone-400 block">دورة الباقة المطلوبة:</span>
                          <span className="font-black text-[#1a4d2e]">
                            {req.cycle === 'yearly' ? 'الباقة الذهبية (سنوي - 365 يوم)' : 'الباقة الذهبية (شهري - 30 يوم)'}
                          </span>
                        </div>

                        {/* 2: Price */}
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-stone-400 block">قيمة الاشتراك:</span>
                          <span className="font-black text-amber-700 font-sans text-sm">
                            {req.price} <span className="text-[11px] font-normal">د.أ</span>
                          </span>
                        </div>

                        {/* 3: Owner & Contact */}
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-stone-400 block">رقم وتواصل صاحب الطلب:</span>
                          <div className="flex items-center gap-1 font-mono font-bold text-stone-800">
                            <span dir="ltr">{req.ownerPhone || 'غير متوفر'}</span>
                            {req.ownerPhone && (
                              <a
                                href={`https://wa.me/${req.ownerPhone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-600 hover:text-emerald-700 mr-1"
                                title="مراسلة واتساب"
                              >
                                <WhatsAppIcon className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* 4: Exact Submission Date & Time (تاريخ تقديم كل طلب) */}
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-stone-400 block">تاريخ ووقت تقديم الطلب:</span>
                          <div className="flex items-center gap-1 font-black text-stone-900 font-mono text-[11px]">
                            <Calendar className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                            <span>{formatDateTime(req.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Updated date if archived */}
                      {req.updatedAt && !isPending && (
                        <div className="text-[10px] text-stone-400 font-bold flex items-center gap-1">
                          <History className="h-3 w-3" />
                          <span>تاريخ آخر معالجة بالأرشيف: {formatDateTime(req.updatedAt)}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions Column */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-100">
                      {isPending ? (
                        <>
                          <button
                            disabled={processingId === req.id}
                            onClick={() => handleUpdateRequestStatus(req, 'approved')}
                            className="inline-flex items-center justify-center gap-1.5 bg-[#1a4d2e] hover:bg-[#143e25] text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Check className="h-4 w-4 text-[#ff9f1c]" />
                            <span>قبول الطلب وتفعيل VIP فوراً</span>
                          </button>

                          <button
                            disabled={processingId === req.id}
                            onClick={() => handleUpdateRequestStatus(req, 'rejected')}
                            className="inline-flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-red-200 cursor-pointer disabled:opacity-50"
                          >
                            <X className="h-3.5 w-3.5" />
                            <span>رفض الطلب</span>
                          </button>

                          {matchedBiz && (
                            <button
                              onClick={() => onOpenVipModal(matchedBiz)}
                              className="inline-flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-amber-200 cursor-pointer"
                              title="تخصيص مدة وتواريخ الباقة الذهبية قبل الموافقة"
                            >
                              <Crown className="h-3 w-3 text-amber-600" />
                              <span>تخصيص في نافذة VIP</span>
                            </button>
                          )}
                        </>
                      ) : (
                        matchedBiz && (
                          <button
                            onClick={() => onOpenVipModal(matchedBiz)}
                            className="inline-flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 px-3.5 py-2 rounded-xl text-xs font-black transition-colors cursor-pointer"
                          >
                            <Crown className="h-3.5 w-3.5 text-amber-600" />
                            <span>إدارة اشتراك المنشأة</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
