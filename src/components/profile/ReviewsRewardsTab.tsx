import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { invalidateCache } from '../../lib/dataCache';
import { Business, RewardCampaign } from '../../types';
import { cn } from '../../lib/utils';
import { 
  Gift, 
  Sparkles, 
  Check, 
  BarChart3, 
  Settings2, 
  Star, 
  Calendar, 
  Clock, 
  Users, 
  Percent, 
  ShieldCheck, 
  Tag, 
  CheckCircle2, 
  PauseCircle,
  XCircle,
  Eye, 
  AlertCircle,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit3,
  X,
  ExternalLink,
  ChevronRight,
  Search,
  Layers,
  Infinity as InfinityIcon,
  Hash
} from 'lucide-react';

interface ReviewsRewardsTabProps {
  business: Business;
  onUpdateBusiness: (updatedBiz: Business) => void;
  showToast?: (msg: string) => void;
}

export function ReviewsRewardsTab({ business, onUpdateBusiness, showToast }: ReviewsRewardsTabProps) {
  // Normalize campaigns: extract from `rewardCampaigns` or fallback to legacy single config if present
  const initialCampaigns: RewardCampaign[] = useMemo(() => {
    if (Array.isArray(business.rewardCampaigns) && business.rewardCampaigns.length > 0) {
      return business.rewardCampaigns;
    }
    // If business has legacy giftCode settings configured, migrate them as an initial campaign
    if (business.giftCodeDiscountPercent || business.giftCodeEnabled) {
      return [{
        id: 'legacy_default_campaign',
        title: 'حملة مكافآت التقييمات الترحيبية',
        status: business.giftCodeEnabled ? 'active' : 'paused',
        minStars: business.giftCodeMinStars || 1,
        limitType: business.giftCodeLimitType || 'unlimited',
        totalLimit: business.giftCodeTotalLimit || 100,
        discountPercent: business.giftCodeDiscountPercent || 10,
        validityDays: business.giftCodeValidityDays || 30,
        startDate: business.giftCodeStartDate || '',
        endDate: business.giftCodeEndDate || '',
        userLimit: business.giftCodeUserLimit || 'once',
        maxPerUser: business.giftCodeMaxPerUser || 1,
        grantedCount: business.giftCodeGrantedCount || 0,
        createdAt: Date.now() - 86400000,
      }];
    }
    return [];
  }, [business.rewardCampaigns, business.giftCodeEnabled, business.giftCodeDiscountPercent]);

  const [campaigns, setCampaigns] = useState<RewardCampaign[]>(initialCampaigns);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'paused' | 'expired'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<RewardCampaign | null>(null);
  const [statsCampaign, setStatsCampaign] = useState<RewardCampaign | null>(null);
  const [deletingCampaignId, setDeletingCampaignId] = useState<string | null>(null);

  // Form Fields State for Add / Edit
  const [formTitle, setFormTitle] = useState('');
  const [formMinStars, setFormMinStars] = useState<number>(4);
  const [formLimitType, setFormLimitType] = useState<'unlimited' | 'limited'>('unlimited');
  const [formTotalLimit, setFormTotalLimit] = useState<number>(100);
  const [formDiscountPercent, setFormDiscountPercent] = useState<number>(15);
  const [formValidityDays, setFormValidityDays] = useState<number>(30);
  const [formStartDate, setFormStartDate] = useState<string>('');
  const [formEndDate, setFormEndDate] = useState<string>('');
  const [formUserLimit, setFormUserLimit] = useState<'once' | 'per_review' | 'custom'>('once');
  const [formMaxPerUser, setFormMaxPerUser] = useState<number>(2);
  const [formStatus, setFormStatus] = useState<'active' | 'paused'>('active');

  const [isSaving, setIsSaving] = useState(false);

  // Sync when business prop changes
  useEffect(() => {
    setCampaigns(initialCampaigns);
  }, [initialCampaigns]);

  // Open Create Modal with fresh sensible defaults
  const handleOpenCreateModal = () => {
    setEditingCampaign(null);
    setFormTitle('حملة مكافآت تقييمات الزوار');
    setFormMinStars(4);
    setFormLimitType('unlimited');
    setFormTotalLimit(100);
    setFormDiscountPercent(15);
    setFormValidityDays(30);
    setFormStartDate('');
    setFormEndDate('');
    setFormUserLimit('once');
    setFormMaxPerUser(2);
    setFormStatus('active');
    setIsFormModalOpen(true);
  };

  // Open Edit Modal with existing campaign
  const handleOpenEditModal = (camp: RewardCampaign) => {
    setEditingCampaign(camp);
    setFormTitle(camp.title || 'حملة مكافآت التقييمات');
    setFormMinStars(camp.minStars || 1);
    setFormLimitType(camp.limitType || 'unlimited');
    setFormTotalLimit(camp.totalLimit || 100);
    setFormDiscountPercent(camp.discountPercent || 10);
    setFormValidityDays(camp.validityDays || 30);
    setFormStartDate(camp.startDate || '');
    setFormEndDate(camp.endDate || '');
    setFormUserLimit(camp.userLimit || 'once');
    setFormMaxPerUser(camp.maxPerUser || 2);
    setFormStatus(camp.status === 'paused' ? 'paused' : 'active');
    setIsFormModalOpen(true);
  };

  // Persist campaigns to Firestore and update parent business state
  const syncCampaignsToDatabase = async (updatedList: RewardCampaign[], successMsg?: string) => {
    if (!db) return;
    setIsSaving(true);
    try {
      // Determine primary active campaign for backwards-compatibility with legacy readers
      const primaryActive = updatedList.find(c => c.status === 'active') || updatedList[0];
      const hasAnyActive = updatedList.some(c => c.status === 'active');

      const payload: Partial<Business> = {
        rewardCampaigns: updatedList,
        giftCodeEnabled: hasAnyActive,
        giftCodeMinStars: primaryActive ? primaryActive.minStars : 1,
        giftCodeLimitType: primaryActive ? primaryActive.limitType : 'unlimited',
        giftCodeTotalLimit: primaryActive ? primaryActive.totalLimit : 100,
        giftCodeDiscountPercent: primaryActive ? primaryActive.discountPercent : 10,
        giftCodeValidityDays: primaryActive ? primaryActive.validityDays : 30,
        giftCodeStartDate: primaryActive?.startDate || '',
        giftCodeEndDate: primaryActive?.endDate || '',
        giftCodeUserLimit: primaryActive ? primaryActive.userLimit : 'once',
        giftCodeMaxPerUser: primaryActive ? primaryActive.maxPerUser : 1,
        giftCodeGrantedCount: updatedList.reduce((acc, c) => acc + (c.grantedCount || 0), 0),
      };

      await updateDoc(doc(db, 'businesses', business.id), payload);
      invalidateCache();

      const updatedBiz: Business = {
        ...business,
        ...payload,
      };

      setCampaigns(updatedList);
      onUpdateBusiness(updatedBiz);

      if (successMsg && showToast) {
        showToast(successMsg);
      }
    } catch (err) {
      console.error('Error syncing reward campaigns:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Save Add/Edit Modal
  const handleSaveCampaignForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = formTitle.trim() || 'حملة مكافآت التقييمات';

    if (editingCampaign) {
      // Edit existing campaign
      const updatedList = campaigns.map((c) => {
        if (c.id === editingCampaign.id) {
          return {
            ...c,
            title: finalTitle,
            status: formStatus,
            minStars: Number(formMinStars),
            limitType: formLimitType,
            totalLimit: Number(formTotalLimit),
            discountPercent: Number(formDiscountPercent),
            validityDays: Number(formValidityDays),
            startDate: formStartDate || '',
            endDate: formEndDate || '',
            userLimit: formUserLimit,
            maxPerUser: Number(formMaxPerUser),
          };
        }
        return c;
      });

      await syncCampaignsToDatabase(updatedList, 'تم حفظ وتحديث بيانات الحملة بنجاح.');
    } else {
      // Create brand new campaign
      const newCamp: RewardCampaign = {
        id: `camp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: finalTitle,
        status: formStatus,
        minStars: Number(formMinStars),
        limitType: formLimitType,
        totalLimit: Number(formTotalLimit),
        discountPercent: Number(formDiscountPercent),
        validityDays: Number(formValidityDays),
        startDate: formStartDate || '',
        endDate: formEndDate || '',
        userLimit: formUserLimit,
        maxPerUser: Number(formMaxPerUser),
        grantedCount: 0,
        createdAt: Date.now(),
      };

      const updatedList = [newCamp, ...campaigns];
      await syncCampaignsToDatabase(updatedList, 'تم إنشاء وبدء حملة المكافآت الجديدة بنجاح.');
    }

    setIsFormModalOpen(false);
    setEditingCampaign(null);
  };

  // Toggle Pause / Resume
  const handleToggleStatus = async (camp: RewardCampaign) => {
    const nextStatus: 'active' | 'paused' = camp.status === 'active' ? 'paused' : 'active';
    const updatedList = campaigns.map(c => c.id === camp.id ? { ...c, status: nextStatus } : c);
    const msg = nextStatus === 'active' 
      ? `تم استئناف وتشغيل حملة "${camp.title}"` 
      : `تم إيقاف حملة "${camp.title}" مؤقتاً`;
    await syncCampaignsToDatabase(updatedList, msg);
  };

  // Delete Campaign
  const handleDeleteCampaign = async (campId: string) => {
    const updatedList = campaigns.filter(c => c.id !== campId);
    await syncCampaignsToDatabase(updatedList, 'تم حذف الحملة من السجل بنجاح.');
    setDeletingCampaignId(null);
  };

  // Filtered & Searched campaigns
  const filteredCampaigns = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return campaigns.filter(c => {
      // Check if expired by end date
      const isDateExpired = Boolean(c.endDate && c.endDate < todayStr);
      const computedStatus = isDateExpired ? 'expired' : c.status;

      if (activeFilter === 'active' && computedStatus !== 'active') return false;
      if (activeFilter === 'paused' && computedStatus !== 'paused') return false;
      if (activeFilter === 'expired' && computedStatus !== 'expired') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (c.title || '').toLowerCase().includes(q) || String(c.discountPercent).includes(q);
      }
      return true;
    });
  }, [campaigns, activeFilter, searchQuery]);

  return (
    <div className="space-y-4 sm:space-y-5 text-right" dir="rtl">
      
      {/* 1. Wide / Full-Width Add New Campaign Button */}
      <div>
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="w-full py-3.5 sm:py-4 px-6 bg-[#1a4d2e] hover:bg-[#143d24] text-white font-black text-sm sm:text-base rounded-2xl sm:rounded-3xl transition-all shadow-sm hover:shadow-md active:scale-[0.99] cursor-pointer inline-flex items-center justify-center gap-2.5 border border-emerald-800"
        >
          <Plus className="h-5 w-5 stroke-[2.5] text-emerald-300 shrink-0" />
          <span>إضافة حملة مكافآت جديدة</span>
        </button>
      </div>

      {/* 2. Enhanced Filter Tabs / Full Search Bar Bar */}
      <div className="w-full">
        {isSearchOpen ? (
          <div className="relative flex items-center w-full bg-white border border-stone-200 rounded-2xl shadow-2xs p-1.5 animate-in fade-in duration-150">
            <div className="pr-3 pl-2 flex items-center pointer-events-none text-stone-400">
              <Search className="h-4 w-4 text-emerald-700" />
            </div>
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في أسماء الحملات أو نسب الخصم..."
              className="flex-1 py-2 pr-1 pl-3 bg-transparent text-xs sm:text-sm font-bold text-stone-900 placeholder-stone-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setIsSearchOpen(false);
              }}
              className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer shrink-0"
              title="إغلاق البحث والعودة للتبويبات"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2 bg-stone-100/90 p-1.5 rounded-2xl border border-stone-200/80">
            {/* Status Segmented Control Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto flex-1 min-w-0">
              {[
                { 
                  id: 'all', 
                  label: 'كافة الحملات', 
                  icon: Layers, 
                  iconColor: 'text-stone-600',
                  count: campaigns.length 
                },
                { 
                  id: 'active', 
                  label: 'الفعالة والنشطة', 
                  icon: CheckCircle2, 
                  iconColor: 'text-emerald-600',
                  count: campaigns.filter(c => c.status === 'active').length 
                },
                { 
                  id: 'paused', 
                  label: 'المتوقفة مؤقتاً', 
                  icon: PauseCircle, 
                  iconColor: 'text-amber-600',
                  count: campaigns.filter(c => c.status === 'paused').length 
                },
                { 
                  id: 'expired', 
                  label: 'المنتهية', 
                  icon: XCircle, 
                  iconColor: 'text-rose-600',
                  count: campaigns.filter(c => {
                    const today = new Date().toISOString().split('T')[0];
                    return c.status === 'expired' || Boolean(c.endDate && c.endDate < today);
                  }).length 
                }
              ].map((tab) => {
                const IconComp = tab.icon;
                const isActive = activeFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveFilter(tab.id as any)}
                    className={cn(
                      "px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center shrink-0 whitespace-nowrap",
                      isActive
                        ? "bg-white text-[#1a4d2e] shadow-sm ring-1 ring-stone-900/5"
                        : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50 font-bold"
                    )}
                  >
                    <IconComp className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-[#1a4d2e]" : tab.iconColor)} />
                    <span className="truncate">{tab.label}</span>
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold",
                      isActive ? "bg-emerald-100 text-emerald-900" : "bg-stone-200/80 text-stone-600"
                    )}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Icon-Only Search Button */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="p-2 sm:p-2.5 bg-white hover:bg-stone-50 text-stone-700 hover:text-[#1a4d2e] rounded-xl transition-all cursor-pointer border border-stone-200/80 shadow-2xs shrink-0 flex items-center justify-center"
              title="بحث في الحملات"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* 3. Campaigns List / Directory */}
      {filteredCampaigns.length === 0 ? (
        <div className="bg-white p-10 sm:p-14 rounded-3xl border border-stone-200/90 text-center space-y-4 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-500 flex items-center justify-center mx-auto">
            <Gift className="h-7 w-7 text-stone-400" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h4 className="text-sm sm:text-base font-black text-stone-900">
              {searchQuery ? 'لا توجد حملات مطابقة للبحث' : 'لا توجد حملات مكافآت مسجلة في هذا التبويب'}
            </h4>
            <p className="text-xs text-stone-500 font-bold leading-relaxed">
              ابدأ الآن بإنشاء حملة مكافآت لتحفيز الزوار على كتابة تقييمات إيجابية لنشاطك التجاري ومنحهم أكواد خصم فورية.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-[#1a4d2e] hover:bg-emerald-900 text-white font-black text-xs rounded-xl transition-all shadow-sm cursor-pointer inline-flex items-center gap-2 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>إضافة حملة جديدة</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:gap-4">
          {filteredCampaigns.map((camp) => {
            const todayStr = new Date().toISOString().split('T')[0];
            const isDateExpired = Boolean(camp.endDate && camp.endDate < todayStr);
            const isFullyConsumed = camp.limitType === 'limited' && camp.totalLimit && (camp.grantedCount >= camp.totalLimit);
            const effectiveStatus = isDateExpired ? 'expired' : camp.status;

            const consumedPercent = camp.limitType === 'limited' && camp.totalLimit && camp.totalLimit > 0
              ? Math.min(100, Math.round(((camp.grantedCount || 0) / camp.totalLimit) * 100))
              : 0;

            return (
              <div
                key={camp.id}
                className={cn(
                  "bg-white rounded-3xl border transition-all shadow-2xs p-4 sm:p-5 space-y-3.5",
                  effectiveStatus === 'active' 
                    ? "border-emerald-200/90 hover:border-emerald-300" 
                    : effectiveStatus === 'paused'
                    ? "border-amber-200/80 bg-amber-50/10"
                    : "border-stone-200 opacity-80"
                )}
              >
                {/* Campaign Header & Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs",
                      effectiveStatus === 'active' 
                        ? "bg-emerald-100 text-emerald-900" 
                        : effectiveStatus === 'paused'
                        ? "bg-amber-100 text-amber-900"
                        : "bg-stone-100 text-stone-600"
                    )}>
                      <Percent className="h-5 w-5" />
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm sm:text-base font-black text-stone-900">
                          {camp.title}
                        </h4>
                        
                        {/* Status Badge */}
                        {effectiveStatus === 'active' && (
                          <span className="text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>نشطة وتعمل</span>
                          </span>
                        )}

                        {effectiveStatus === 'paused' && (
                          <span className="text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <PauseCircle className="h-3 w-3 text-amber-600" />
                            <span>متوقفة مؤقتاً</span>
                          </span>
                        )}

                        {effectiveStatus === 'expired' && (
                          <span className="text-[10px] font-black bg-rose-50 text-rose-800 border border-rose-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-rose-600" />
                            <span>منتهية الصلاحية</span>
                          </span>
                        )}

                        {isFullyConsumed && (
                          <span className="text-[10px] font-black bg-stone-100 text-stone-700 border border-stone-300 px-2 py-0.5 rounded-full">
                            رصيد الأكواد مكتمل 100%
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-stone-500 font-bold">
                        <span>تاريخ الإنشاء: {new Date(camp.createdAt).toLocaleDateString('ar-JO')}</span>
                        <span>•</span>
                        <span>فترة الحملة: {camp.startDate && camp.endDate ? `${camp.startDate} إلى ${camp.endDate}` : 'متاحة دائماً'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Primary Highlight Badge */}
                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span className="text-sm sm:text-base font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-1 rounded-2xl shadow-2xs">
                      %{camp.discountPercent} خصم
                    </span>
                  </div>
                </div>

                {/* Campaign Key Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="bg-stone-50 p-2.5 rounded-2xl border border-stone-200/70 text-center space-y-0.5">
                    <span className="text-[10px] font-bold text-stone-500 block">شرط الاستحقاق</span>
                    <span className="text-xs font-black text-stone-800 flex items-center justify-center gap-1">
                      <span>{camp.minStars}</span>
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span>فما فوق</span>
                    </span>
                  </div>

                  <div className="bg-stone-50 p-2.5 rounded-2xl border border-stone-200/70 text-center space-y-0.5">
                    <span className="text-[10px] font-bold text-stone-500 block">الأكواد الممنوحة</span>
                    <span className="text-xs font-black text-emerald-700">
                      {camp.grantedCount || 0} كود
                    </span>
                  </div>

                  <div className="bg-stone-50 p-2.5 rounded-2xl border border-stone-200/70 text-center space-y-0.5">
                    <span className="text-[10px] font-bold text-stone-500 block">سعة الحملة</span>
                    <span className="text-xs font-black text-stone-800 inline-flex items-center justify-center gap-1">
                      {camp.limitType === 'unlimited' ? (
                        <>
                          <InfinityIcon className="h-3.5 w-3.5 text-stone-600" />
                          <span>غير محدود</span>
                        </>
                      ) : (
                        `${camp.totalLimit || 100} كود`
                      )}
                    </span>
                  </div>

                  <div className="bg-stone-50 p-2.5 rounded-2xl border border-stone-200/70 text-center space-y-0.5">
                    <span className="text-[10px] font-bold text-stone-500 block">صلاحية الكوبون</span>
                    <span className="text-xs font-black text-stone-800">
                      {camp.validityDays} يوماً
                    </span>
                  </div>
                </div>

                {/* Progress bar for limited campaigns */}
                {camp.limitType === 'limited' && (
                  <div className="p-3 bg-stone-50/80 rounded-2xl border border-stone-200/60 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-stone-600">
                      <span>نسبة استهلاك رصيد الأكواد: <strong className="text-emerald-800 font-black">{consumedPercent}%</strong></span>
                      <span>المتبقي: <strong className="text-stone-900 font-black">{Math.max(0, (camp.totalLimit || 100) - (camp.grantedCount || 0))}</strong> كود</span>
                    </div>
                    <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${consumedPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Action Buttons Toolbar for Each Campaign */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-100">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Stats Button */}
                    <button
                      type="button"
                      onClick={() => setStatsCampaign(camp)}
                      className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs active:scale-95"
                      title="عرض إحصائيات وأداء هذه الحملة"
                    >
                      <BarChart3 className="h-3.5 w-3.5 text-stone-600" />
                      <span>إحصائيات الحملة</span>
                    </button>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(camp)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/90 rounded-xl text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs active:scale-95"
                      title="تعديل شروط ونسبة خصم الحملة"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-emerald-700" />
                      <span>تعديل الحملة</span>
                    </button>

                    {/* Pause / Resume Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(camp)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs active:scale-95",
                        camp.status === 'active'
                          ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      )}
                      title={camp.status === 'active' ? 'إيقاف منح الأكواد من هذه الحملة مؤقتاً' : 'استئناف وتشغيل الحملة للزوار'}
                    >
                      {camp.status === 'active' ? (
                        <>
                          <Pause className="h-3.5 w-3.5 text-amber-700" />
                          <span>إيقاف مؤقت</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 text-white" />
                          <span>استئناف التشغيل</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => setDeletingCampaignId(camp.id)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer shrink-0"
                    title="حذف هذه الحملة من السجل"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CREATE / EDIT CAMPAIGN MODAL POPUP                                     */}
      {/* ========================================================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[200000] bg-stone-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden" dir="rtl">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[90dvh] sm:max-h-[88vh] shadow-2xl border border-stone-200 relative animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden text-right">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 p-4 sm:p-5 shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
                  <Gift className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-stone-900">
                    {editingCampaign ? 'تعديل بيانات وإعدادات الحملة' : 'بدء وتخصيص حملة مكافآت جديدة'}
                  </h3>
                  <p className="text-[11px] text-stone-500 font-bold">
                    حدد شروط استحقاق كود الخصم، نسبة الخصم، وسعة الأكواد
                  </p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-600 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form id="reward-campaign-form" onSubmit={handleSaveCampaignForm} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
              
              {/* Campaign Title */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-stone-900">
                  عنوان / اسم الحملة الترويجية:
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: حملة مكافآت الصيف للتقييمات المميزة"
                  className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs font-black text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
              </div>

              {/* 1. Min Stars Eligibility */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <label className="block text-xs font-black text-stone-900">
                  1. من يستحق الحصول على كود الهدية؟ (الحد الأدنى لتقييم النجوم)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { stars: 1, label: 'أي شخص يقيم المحل', desc: 'نجمة واحدة فأكثر (شامل للجميع)' },
                    { stars: 3, label: 'التقييمات الجيدة فأعلى', desc: '3 نجوم فأكثر' },
                    { stars: 4, label: 'التقييمات الممتازة (موصى به)', desc: '4 نجوم فأكثر لتحفيز الإيجابية' },
                    { stars: 5, label: 'التقييمات المثالية فقط', desc: '5 نجوم فقط (حصري للقمة)' },
                  ].map((item) => (
                    <button
                      key={item.stars}
                      type="button"
                      onClick={() => setFormMinStars(item.stars)}
                      className={cn(
                        "p-3 rounded-2xl border text-right transition-all cursor-pointer flex items-start gap-2.5",
                        formMinStars === item.stars
                          ? "bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-2xs"
                          : "bg-stone-50/60 border-stone-200/80 hover:bg-stone-100/70"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-full border mt-0.5 shrink-0 flex items-center justify-center text-[10px]",
                        formMinStars === item.stars ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-300"
                      )}>
                        {formMinStars === item.stars && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-xs text-stone-900">{item.label}</span>
                          <div className="flex items-center text-amber-400">
                            {Array.from({ length: item.stars }).map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-amber-400" />
                            ))}
                          </div>
                        </div>
                        <span className="text-[10px] text-stone-500 font-bold block">{item.desc}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Code Limit Type */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <label className="block text-xs font-black text-stone-900">
                  2. إجمالي عدد الأكواد المتاحة في هذه الحملة
                </label>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormLimitType('unlimited')}
                    className={cn(
                      "p-3 rounded-2xl border text-xs font-black transition-all text-center cursor-pointer flex items-center justify-center gap-2",
                      formLimitType === 'unlimited'
                        ? "bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-2xs"
                        : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                    )}
                  >
                    <InfinityIcon className="h-4 w-4 text-emerald-700" />
                    <span>عدد لا نهائي (مفتوح)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormLimitType('limited')}
                    className={cn(
                      "p-3 rounded-2xl border text-xs font-black transition-all text-center cursor-pointer flex items-center justify-center gap-2",
                      formLimitType === 'limited'
                        ? "bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20 shadow-2xs"
                        : "bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
                    )}
                  >
                    <Hash className="h-4 w-4 text-emerald-700" />
                    <span>عدد محدد برصيد</span>
                  </button>
                </div>

                {formLimitType === 'limited' && (
                  <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-1.5 animate-in fade-in">
                    <label className="block text-[11px] font-bold text-stone-700">
                      الحد الأقصى لعدد الأكواد المتاحة في الحملة:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={formTotalLimit}
                        onChange={(e) => setFormTotalLimit(Math.max(1, Number(e.target.value) || 1))}
                        className="w-full sm:w-48 bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-black text-stone-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                      />
                      <span className="text-xs font-bold text-stone-500">كود هدية</span>
                    </div>
                  </div>
                )}
              </div>

              {/* 3. Limit Per Account */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <label className="block text-xs font-black text-stone-900">
                  3. كم مرة يُمنح كود الخصم للحساب الواحد؟ (سياسة التكرار)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'once', title: 'كود واحد للحساب', desc: 'كود وحيد مدى الحياة' },
                    { id: 'per_review', title: 'كود لكل تقييم جديد', desc: 'كود مع كل زيارة وتقييم' },
                    { id: 'custom', title: 'سقف مخصص للحساب', desc: 'تحديد حد أقصى' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormUserLimit(item.id as any)}
                      className={cn(
                        "p-3 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between gap-1",
                        formUserLimit === item.id
                          ? "bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 shadow-2xs"
                          : "bg-stone-50/60 border-stone-200/80 hover:bg-stone-100"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-black text-xs text-stone-900">{item.title}</span>
                        <div className={cn(
                          "w-4 h-4 rounded-full border shrink-0 flex items-center justify-center text-[10px]",
                          formUserLimit === item.id ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-300"
                        )}>
                          {formUserLimit === item.id && <Check className="h-3 w-3 stroke-[3]" />}
                        </div>
                      </div>
                      <span className="text-[10px] text-stone-500 font-bold">{item.desc}</span>
                    </button>
                  ))}
                </div>

                {formUserLimit === 'custom' && (
                  <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-1.5 animate-in fade-in">
                    <label className="block text-[11px] font-bold text-stone-700">
                      الحد الأقصى لعدد الأكواد للحساب الواحد:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={formMaxPerUser}
                      onChange={(e) => setFormMaxPerUser(Math.max(1, Number(e.target.value) || 1))}
                      className="w-32 bg-white border border-stone-200 rounded-xl px-3.5 py-2 text-xs font-black text-stone-900 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* 4. Discount % and Validity Days */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-stone-100">
                {/* Discount % */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-stone-900">
                    4. نسبة الخصم الممنوحة للهدية (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={formDiscountPercent}
                      onChange={(e) => setFormDiscountPercent(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl pl-10 pr-4 py-2.5 text-sm font-black text-stone-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 font-black">
                      %
                    </div>
                  </div>

                  {/* Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                    {[5, 10, 15, 20, 25, 30].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setFormDiscountPercent(pct)}
                        className={cn(
                          "px-2 py-0.5 rounded-lg text-[10.5px] font-black transition-all cursor-pointer",
                          formDiscountPercent === pct 
                            ? "bg-emerald-600 text-white" 
                            : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                        )}
                      >
                        %{pct}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Validity Days */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-stone-900">
                    5. مدة صلاحية الكود (بالأيام)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={formValidityDays}
                      onChange={(e) => setFormValidityDays(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full bg-stone-50 border border-stone-200 rounded-2xl pl-14 pr-4 py-2.5 text-sm font-black text-stone-900 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 outline-none"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400 text-xs font-bold">
                      يوماً
                    </div>
                  </div>
                  <p className="text-[10px] text-stone-400 font-bold">
                    عدد الأيام المتاحة للزبون لاستخدام الكوبون بعد استلامه.
                  </p>
                </div>
              </div>

              {/* 5. Campaign Dates */}
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-stone-900">
                    6. فترة سريان الحملة الزمنية (اختياري)
                  </label>
                  {(formStartDate || formEndDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormStartDate('');
                        setFormEndDate('');
                      }}
                      className="text-[11px] text-rose-600 hover:text-rose-700 font-bold hover:underline cursor-pointer"
                    >
                      إلغاء التواريخ (متاحة دائماً)
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-stone-600">تاريخ البدء:</label>
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-bold text-stone-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-stone-600">تاريخ الانتهاء:</label>
                    <input
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50 text-xs font-bold text-stone-800"
                    />
                  </div>
                </div>
              </div>

              {/* Live Voucher Simulation inside Modal */}
              <div className="pt-2 border-t border-stone-100">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-900 via-[#1a4d2e] to-emerald-950 text-white text-center space-y-2 border border-emerald-700/40">
                  <span className="text-[10.5px] text-emerald-200 font-bold block">معاينة شكل كود الهدية للزبون:</span>
                  <div className="text-xl font-black text-amber-300 font-mono">
                    %{formDiscountPercent} خصم فوري
                  </div>
                  <div className="text-[10px] text-emerald-200/80 font-mono">
                    صالح لمدة {formValidityDays} يوماً عند تقييم {formMinStars} نجوم فأكثر
                  </div>
                </div>
              </div>

            </form>

            {/* Modal Sticky Footer Actions */}
            <div className="p-4 sm:px-6 bg-stone-50/90 border-t border-stone-100 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="px-5 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-700 rounded-xl text-xs font-black transition-colors cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="submit"
                form="reward-campaign-form"
                disabled={isSaving}
                className="px-6 py-2.5 bg-[#1a4d2e] hover:bg-emerald-900 text-white rounded-xl text-xs font-black transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Check className="h-4 w-4" />
                <span>{isSaving ? 'جاري الحفظ...' : editingCampaign ? 'حفظ التعديلات' : 'حفظ وبدء الحملة'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. CAMPAIGN STATS MODAL POPUP                                             */}
      {/* ========================================================================= */}
      {statsCampaign && (
        <div className="fixed inset-0 z-[200000] bg-stone-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden" dir="rtl">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full shadow-2xl border border-stone-200 relative animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden text-right">
            
            <div className="flex items-center justify-between border-b border-stone-100 p-4 sm:p-5 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-stone-900">إحصائيات أداء الحملة</h3>
                  <p className="text-[11px] text-stone-500 font-bold truncate max-w-[200px] sm:max-w-xs">{statsCampaign.title}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStatsCampaign(null)}
                className="p-2 text-stone-400 hover:text-stone-600 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              {/* Top Stats Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200 text-center space-y-0.5">
                  <span className="text-[10.5px] font-bold text-emerald-800 block">الأكواد الممنوحة</span>
                  <span className="text-2xl font-black text-emerald-700">{statsCampaign.grantedCount || 0}</span>
                  <span className="text-[10px] text-emerald-600 block">مكافأة ممنوحة</span>
                </div>

                <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 text-center space-y-0.5">
                  <span className="text-[10.5px] font-bold text-stone-500 block">سعة الحملة الإجمالية</span>
                  <span className="text-2xl font-black text-stone-800 inline-flex items-center justify-center gap-1">
                    {statsCampaign.limitType === 'unlimited' ? (
                      <>
                        <InfinityIcon className="h-5 w-5 text-stone-600" />
                        <span>غير محدود</span>
                      </>
                    ) : (
                      statsCampaign.totalLimit || 100
                    )}
                  </span>
                  <span className="text-[10px] text-stone-400 block">كود متاح</span>
                </div>
              </div>

              {/* Consumption progress */}
              {statsCampaign.limitType === 'limited' && (
                <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-stone-700">
                    <span>نسبة استهلاك الرصيد</span>
                    <span>{Math.round(((statsCampaign.grantedCount || 0) / (statsCampaign.totalLimit || 100)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-2.5">
                    <div
                      className="bg-emerald-600 h-2.5 rounded-full transition-all"
                      style={{ width: `${Math.min(100, ((statsCampaign.grantedCount || 0) / (statsCampaign.totalLimit || 100)) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-stone-500 font-bold">
                    <span>الأكواد المتبقية: {Math.max(0, (statsCampaign.totalLimit || 100) - (statsCampaign.grantedCount || 0))} كود</span>
                    <span>الهدف: {statsCampaign.totalLimit || 100} كود</span>
                  </div>
                </div>
              )}

              {/* Detailed Breakdown Strip */}
              <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 space-y-2.5 text-xs font-bold text-stone-700">
                <div className="flex justify-between pb-2 border-b border-stone-200/60">
                  <span className="text-stone-500">نسبة الخصم الممنوحة:</span>
                  <span className="text-emerald-700 font-black">%{statsCampaign.discountPercent} خصم</span>
                </div>

                <div className="flex justify-between pb-2 border-b border-stone-200/60">
                  <span className="text-stone-500">الحد الأدنى لتقييم النجوم:</span>
                  <span className="text-stone-800 font-black flex items-center gap-1">
                    <span>{statsCampaign.minStars} نجوم فأكثر</span>
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  </span>
                </div>

                <div className="flex justify-between pb-2 border-b border-stone-200/60">
                  <span className="text-stone-500">مدة صلاحية الكوبون للزبون:</span>
                  <span className="text-stone-800 font-black">{statsCampaign.validityDays} يوماً</span>
                </div>

                <div className="flex justify-between pb-2 border-b border-stone-200/60">
                  <span className="text-stone-500">سياسة المنح للحساب الواحد:</span>
                  <span className="text-stone-800 font-black">
                    {statsCampaign.userLimit === 'per_review' 
                      ? 'كود مع كل تقييم' 
                      : statsCampaign.userLimit === 'custom' 
                      ? `${statsCampaign.maxPerUser || 2} كودات كحد أقصى` 
                      : 'كود واحد فقط مدى الحياة'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-stone-500">فترة سريان الحملة:</span>
                  <span className="text-stone-800 font-black">
                    {statsCampaign.startDate && statsCampaign.endDate 
                      ? `${statsCampaign.startDate} إلى ${statsCampaign.endDate}` 
                      : 'مفتوحة ومتاحة دائماً'}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setStatsCampaign(null)}
                className="w-full py-2.5 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-black transition-colors cursor-pointer"
              >
                إغلاق نافذة الإحصائيات
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. DELETE CONFIRMATION MODAL                                              */}
      {/* ========================================================================= */}
      {deletingCampaignId && (
        <div className="fixed inset-0 z-[200000] bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 space-y-4 shadow-2xl text-right animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="font-black text-sm text-stone-900">هل أنت متأكد من حذف هذه الحملة؟</h4>
              <p className="text-xs text-stone-500 font-bold">
                سيتم إزالة هذه الحملة من سجل حملات المكافآت الخاصة بمحلك بشكل دائم.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCampaignId(null)}
                className="py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-black text-xs rounded-xl transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              
              <button
                type="button"
                onClick={() => handleDeleteCampaign(deletingCampaignId)}
                className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl transition-colors cursor-pointer shadow-sm active:scale-95"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
