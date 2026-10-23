import React, { useState, useEffect } from 'react';
import { 
  Award, 
  Users, 
  CheckCircle2, 
  Settings, 
  Plus, 
  Search, 
  Sparkles, 
  Gift, 
  QrCode, 
  Clock, 
  Check, 
  Shield, 
  Save, 
  Eye, 
  RefreshCw,
  Phone,
  UserCheck,
  AlertCircle,
  X,
  Camera,
  Scan
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Business, LoyaltyProgramConfig, UserLoyaltyCard } from '../../types';
import { 
  DEFAULT_LOYALTY_CONFIG, 
  fetchBusinessLoyaltySubscribers, 
  addStampToLoyaltyCard, 
  redeemLoyaltyReward, 
  saveBusinessLoyaltyConfig,
  parseLoyaltyUserQr,
  resolveLoyaltyUser
} from '../../lib/loyaltyHelper';

interface MerchantLoyaltyManagerProps {
  business: Business;
  onBusinessUpdated?: (updated: Business) => void;
  showToast?: (message: string) => void;
}

export function MerchantLoyaltyManager({
  business,
  onBusinessUpdated,
  showToast
}: MerchantLoyaltyManagerProps) {
  // Sub-tabs: 'subscribers' | 'settings'
  const [activeTab, setActiveTab] = useState<'subscribers' | 'settings'>('subscribers');

  // Subscribers list
  const [subscribers, setSubscribers] = useState<UserLoyaltyCard[]>([]);
  const [loadingSubscribers, setLoadingSubscribers] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Config State
  const initialConfig: LoyaltyProgramConfig = business.loyaltyProgram || {
    ...DEFAULT_LOYALTY_CONFIG,
    rewardTitle: `مكافأة خاصة من ${business.name}`
  };
  const [config, setConfig] = useState<LoyaltyProgramConfig>(initialConfig);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Quick Add Stamp Modal / Inline state
  const [isAddStampOpen, setIsAddStampOpen] = useState(false);
  const [targetCustomerIdentifier, setTargetCustomerIdentifier] = useState('');
  const [targetCustomerName, setTargetCustomerName] = useState('');
  const [isAddingStamp, setIsAddingStamp] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  // Camera QR Scanner state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerLoading, setScannerLoading] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [scanSuccessResult, setScanSuccessResult] = useState<{
    card: UserLoyaltyCard;
    isNew: boolean;
  } | null>(null);
  const qrScannerInstanceRef = React.useRef<Html5Qrcode | null>(null);

  const startLoyaltyScanner = async () => {
    setIsScannerOpen(true);
    setScannerError(null);
    setScanSuccessResult(null);
    setScannerLoading(true);

    try {
      await new Promise(r => setTimeout(r, 200));
      if (!qrScannerInstanceRef.current) {
        qrScannerInstanceRef.current = new Html5Qrcode("loyalty-merchant-qr-reader");
      }

      await qrScannerInstanceRef.current.start(
        { facingMode: "environment" },
        { fps: 12 },
        async (decodedText) => {
          await handleScanDecodedText(decodedText);
        },
        () => {}
      );
      setScannerLoading(false);
    } catch (err: any) {
      console.warn("Loyalty scanner start notice:", err);
      setScannerError("تعذر تشغيل الكاميرا. يرجى التأكد من صلاحية الكاميرا أو استخدام الإضافة اليدوية.");
      setScannerLoading(false);
    }
  };

  const stopLoyaltyScanner = async () => {
    if (qrScannerInstanceRef.current) {
      try {
        if (qrScannerInstanceRef.current.isScanning) {
          await qrScannerInstanceRef.current.stop();
        }
      } catch (e) {}
    }
    setIsScannerOpen(false);
    setScanSuccessResult(null);
    setScannerError(null);
  };

  const handleScanDecodedText = async (decodedText: string) => {
    const parsed = await resolveLoyaltyUser(decodedText);
    const uid = parsed?.userId || (decodedText.startsWith('shofi_loyalty_user:') ? decodedText.replace('shofi_loyalty_user:', '').trim() : (decodedText.length > 10 ? decodedText.trim() : null));

    if (!uid) {
      setScannerError("رمز الـ QR غير صالح لبطاقات الولاء.");
      return;
    }

    try {
      if (qrScannerInstanceRef.current && qrScannerInstanceRef.current.isScanning) {
        await qrScannerInstanceRef.current.stop().catch(() => {});
      }

      const res = await addStampToLoyaltyCard({
        businessId: business.id,
        businessName: business.name,
        businessCategory: business.category,
        businessLogoUrl: business.imageUrl || business.logoUrl,
        targetStamps: config.targetStamps,
        rewardTitle: config.rewardTitle,
        rewardDescription: config.rewardDescription,
        userId: uid,
        userName: parsed?.userName,
        userPhone: parsed?.userPhone,
        userEmail: parsed?.userEmail,
        stampsCount: 1
      });

      if (res.success && res.card) {
        const isNew = (res.card.currentStamps === 1 && !res.card.totalCompletedCards);
        setScanSuccessResult({
          card: res.card,
          isNew
        });
        await loadSubscribers();
      } else {
        setScannerError(res.message || "تعذر تسجيل الختم.");
      }
    } catch (err) {
      setScannerError("حدث خطأ أثناء معالجة الختم.");
    }
  };

  useEffect(() => {
    return () => {
      if (qrScannerInstanceRef.current && qrScannerInstanceRef.current.isScanning) {
        qrScannerInstanceRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Load subscribers
  const loadSubscribers = async () => {
    if (!business?.id) return;
    setLoadingSubscribers(true);
    try {
      const list = await fetchBusinessLoyaltySubscribers(business.id);
      setSubscribers(list);
    } catch (e) {
      console.warn('Error loading loyalty subscribers:', e);
    } finally {
      setLoadingSubscribers(false);
    }
  };

  useEffect(() => {
    loadSubscribers();
  }, [business.id]);

  // Handle Save Settings
  const handleSaveSettings = async () => {
    if (!business.id) return;
    setIsSavingConfig(true);
    try {
      const ok = await saveBusinessLoyaltyConfig(business.id, config);
      if (ok) {
        if (onBusinessUpdated) {
          onBusinessUpdated({
            ...business,
            loyaltyProgram: config
          });
        }
        if (showToast) {
          showToast('تم حفظ وتحديث إعدادات بطاقة الولاء بنجاح');
        }
      }
    } catch (err) {
      console.error('Error saving loyalty config:', err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Handle Direct Add Stamp to a customer
  const handleAddStampSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const identifier = targetCustomerIdentifier.trim();
    if (!identifier) {
      setActionMessage({ text: 'يرجى إدخال رقم هاتف الزبون أو بريده', isError: true });
      return;
    }

    setIsAddingStamp(true);
    setActionMessage(null);

    const resolved = await resolveLoyaltyUser(identifier);
    const isEmail = identifier.includes('@');
    const finalUid = resolved?.userId || ('user_' + identifier.replace(/[^a-zA-Z0-9]/g, '_'));

    try {
      const res = await addStampToLoyaltyCard({
        businessId: business.id,
        businessName: business.name,
        businessCategory: business.category,
        businessLogoUrl: business.imageUrl || business.logoUrl,
        targetStamps: config.targetStamps,
        rewardTitle: config.rewardTitle,
        rewardDescription: config.rewardDescription,
        userId: finalUid,
        userEmail: resolved?.userEmail || (isEmail ? identifier : undefined),
        userPhone: resolved?.userPhone || (!isEmail && !resolved ? identifier : undefined),
        userName: targetCustomerName.trim() || resolved?.userName || undefined,
        stampsCount: 1
      });

      if (res.success) {
        setActionMessage({ text: res.message });
        setTargetCustomerIdentifier('');
        setTargetCustomerName('');
        await loadSubscribers();
        setTimeout(() => {
          setIsAddStampOpen(false);
          setActionMessage(null);
        }, 1500);
      } else {
        setActionMessage({ text: res.message, isError: true });
      }
    } catch (err) {
      setActionMessage({ text: 'حدث خطأ أثناء إضافة الختم', isError: true });
    } finally {
      setIsAddingStamp(false);
    }
  };

  // Direct Stamp increment for existing subscriber
  const handleIncrementSubscriberStamp = async (sub: UserLoyaltyCard) => {
    try {
      const res = await addStampToLoyaltyCard({
        businessId: business.id,
        businessName: business.name,
        businessCategory: business.category,
        businessLogoUrl: business.imageUrl || business.logoUrl,
        targetStamps: config.targetStamps,
        rewardTitle: config.rewardTitle,
        rewardDescription: config.rewardDescription,
        userId: sub.userId,
        userEmail: sub.userEmail,
        userPhone: sub.userPhone,
        userName: sub.userName,
        stampsCount: 1
      });
      if (res.success) {
        if (showToast) showToast(`تمت إضافة ختم للزبون ${sub.userName || ''}`);
        await loadSubscribers();
      }
    } catch (e) {
      console.warn('Error adding stamp:', e);
    }
  };

  // Handle Redeem Reward
  const handleRedeemReward = async (sub: UserLoyaltyCard) => {
    try {
      const res = await redeemLoyaltyReward(sub.id);
      if (res.success) {
        if (showToast) showToast(`تم استبدال وتسليم المكافأة بنجاح`);
        await loadSubscribers();
      }
    } catch (e) {
      console.warn('Error redeeming reward:', e);
    }
  };

  // Filtered subscribers
  const filteredSubscribers = subscribers.filter(s => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      (s.userName || '').toLowerCase().includes(q) ||
      (s.userPhone || '').includes(q) ||
      (s.userEmail || '').toLowerCase().includes(q)
    );
  });

  // Calculate stats
  const totalSubscribers = subscribers.length;
  const totalStampsGiven = subscribers.reduce((acc, curr) => acc + (curr.currentStamps || 0), 0);
  const rewardsReadyCount = subscribers.filter(s => s.isRewardReady).length;
  const totalCardsCompleted = subscribers.reduce((acc, curr) => acc + (curr.totalCompletedCards || 0), 0);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header and Sub-Tab Navigation */}
      <div className="bg-white border border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-stone-900 leading-tight">
              برنامج بطاقات الولاء والأختام الرقمية
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              زيادة تكرار زيارات الزبائن عبر منحهم أختاماً رقمية ومكافآت مجانية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl self-start sm:self-auto border border-stone-200/60">
          <button
            type="button"
            onClick={() => setActiveTab('subscribers')}
            className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'subscribers'
                ? 'bg-white text-[#1a4d2e] shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>المشتركون والأختام</span>
            {totalSubscribers > 0 && (
              <span className="text-[10px] bg-stone-200 text-stone-700 px-1.5 py-0.2 rounded-full font-bold">
                {totalSubscribers}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-2 rounded-lg text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-white text-[#1a4d2e] shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>إعدادات البرنامج</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: SUBSCRIBERS & STATS */}
      {activeTab === 'subscribers' && (
        <div className="space-y-6">
          {/* Metrics Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-stone-500 block mb-1">إجمالي المشتركين</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-stone-900">{totalSubscribers}</span>
                <span className="text-xs text-stone-400 font-medium">زبون</span>
              </div>
            </div>

            <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-stone-500 block mb-1">الأختام الممنوحة</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-600">{totalStampsGiven}</span>
                <span className="text-xs text-stone-400 font-medium">ختم</span>
              </div>
            </div>

            <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-stone-500 block mb-1">مكافآت جاهزة للاستلام</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600">{rewardsReadyCount}</span>
                <span className="text-xs text-stone-400 font-medium">مكافأة</span>
              </div>
            </div>

            <div className="bg-white border border-stone-200/80 rounded-2xl p-4 shadow-2xs">
              <span className="text-[11px] font-bold text-stone-500 block mb-1">بطاقات مكتملة</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-teal-700">{totalCardsCompleted}</span>
                <span className="text-xs text-stone-400 font-medium">دورة</span>
              </div>
            </div>
          </div>

          {/* Action Bar: Search & Quick Stamp Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="البحث بالاسم أو رقم الهاتف أو البريد..."
                className="w-full pl-4 pr-10 py-2.5 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-none focus:border-[#1a4d2e]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={startLoyaltyScanner}
                className="inline-flex items-center justify-center gap-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all shadow-xs cursor-pointer active:scale-98"
              >
                <QrCode className="h-4 w-4 text-[#ff9f1c]" />
                <span>مسح QR الزبون لإضافة ختم</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddStampOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-98"
              >
                <Plus className="h-4 w-4 text-stone-500" />
                <span>إضافة يدوية</span>
              </button>

              <button
                type="button"
                onClick={loadSubscribers}
                title="تحديث البيانات"
                className="p-2.5 bg-white border border-stone-200 hover:border-stone-300 rounded-xl text-stone-600 transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-4 w-4 ${loadingSubscribers ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* CAMERA QR SCANNER MODAL */}
          {isScannerOpen && (
            <div className="fixed inset-0 z-[100000] bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-white shrink-0">
                  <div className="flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-[#1a4d2e]" />
                    <h4 className="text-sm sm:text-base font-black text-stone-900">
                      مسح كود الزبون لتسجيل الختم
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={stopLoyaltyScanner}
                    className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-5 flex-1 overflow-y-auto space-y-4">
                  {scanSuccessResult ? (
                    <div className="py-4 text-center space-y-4 animate-in fade-in zoom-in-95">
                      <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-sm">
                        <Check className="h-8 w-8 stroke-[3]" />
                      </div>

                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 inline-block">
                          {scanSuccessResult.isNew ? 'تم تفعيل بطاقة جديدة' : 'تم تسجيل الختم بنجاح'}
                        </span>
                        <h4 className="text-base font-black text-stone-900">
                          {scanSuccessResult.card.userName || 'الزبون'}
                        </h4>
                        <p className="text-xs text-stone-600 font-bold">
                          رصيد الأختام الحالي: {scanSuccessResult.card.currentStamps} من {scanSuccessResult.card.targetStamps}
                        </p>
                      </div>

                      {scanSuccessResult.card.isRewardReady && (
                        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-black text-emerald-900 space-y-1">
                          <p>اكتملت بطاقة الزبون</p>
                          <p className="font-bold text-[11px] text-emerald-700">{scanSuccessResult.card.rewardTitle}</p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setScanSuccessResult(null);
                            startLoyaltyScanner();
                          }}
                          className="flex-1 py-2.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer"
                        >
                          مسح زبون آخر
                        </button>
                        <button
                          type="button"
                          onClick={stopLoyaltyScanner}
                          className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                        >
                          تم الإغلاق
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {scannerError && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800">
                          {scannerError}
                        </div>
                      )}

                      <div className="relative aspect-square max-w-[280px] mx-auto rounded-2xl overflow-hidden bg-black flex items-center justify-center border-2 border-emerald-500/50 shadow-inner">
                        <div id="loyalty-merchant-qr-reader" className="w-full h-full overflow-hidden" />
                        
                        {scannerLoading && (
                          <div className="absolute inset-0 bg-stone-950/80 flex flex-col items-center justify-center text-white text-xs font-bold gap-2">
                            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                            <span>جارٍ تشغيل الكاميرا...</span>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-stone-500 text-center leading-relaxed">
                        وجّه الكاميرا نحو رمز الـ QR الظاهر في صفحة بطاقة الولاء لدى الزبون لتسجيل الختم فوراً.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Add Stamp Modal */}
          {isAddStampOpen && (
            <div className="fixed inset-0 z-[100000] bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-[#1a4d2e]" />
                    <h4 className="text-base font-black text-stone-900">إضافة ختم لزبون</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddStampOpen(false);
                      setActionMessage(null);
                    }}
                    className="text-stone-400 hover:text-stone-600 text-sm font-bold"
                  >
                    إغلاق
                  </button>
                </div>

                {actionMessage && (
                  <div className={`p-3 rounded-xl text-xs font-bold border ${
                    actionMessage.isError 
                      ? 'bg-rose-50 text-rose-800 border-rose-200' 
                      : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    {actionMessage.text}
                  </div>
                )}

                <form onSubmit={handleAddStampSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      رقم هاتف الزبون أو البريد أو رقم الولاء *
                    </label>
                    <input
                      type="text"
                      required
                      value={targetCustomerIdentifier}
                      onChange={(e) => setTargetCustomerIdentifier(e.target.value)}
                      placeholder="مثال: 0791234567 أو رقم الولاء..."
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:border-[#1a4d2e]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      اسم الزبون (اختياري)
                    </label>
                    <input
                      type="text"
                      value={targetCustomerName}
                      onChange={(e) => setTargetCustomerName(e.target.value)}
                      placeholder="مثال: أحمد الزعبي"
                      className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:border-[#1a4d2e]"
                    />
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 font-medium">
                    سيتم منح الزبون ختماً إضافياً في بطاقة ولاء ({business.name}). وعند اكتمال {config.targetStamps} أختام ستتفعل مكافأته تلقائياً.
                  </div>

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddStampOpen(false);
                        setActionMessage(null);
                      }}
                      className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingStamp}
                      className="px-5 py-2.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isAddingStamp ? 'جارٍ الإضافة...' : 'تأكيد الختم'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Subscribers List Table / Cards */}
          <div className="bg-white border border-stone-200/80 rounded-2xl overflow-hidden shadow-2xs">
            {loadingSubscribers ? (
              <div className="py-12 text-center text-stone-400 text-xs font-medium">
                جارٍ تحميل بيانات المشتركين...
              </div>
            ) : filteredSubscribers.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <Award className="h-10 w-10 text-stone-300 mx-auto" />
                <h4 className="text-sm font-black text-stone-700">لا يوجد مشتركون مسجلون حالياً</h4>
                <p className="text-xs text-stone-400 max-w-sm mx-auto">
                  اضغط على زر (إضافة ختم لزبون) عند أول زيارة لأي عميل لبدء تجميع أختامه.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {filteredSubscribers.map((sub) => {
                  const target = sub.targetStamps || config.targetStamps || 6;
                  const current = sub.currentStamps || 0;
                  const percent = Math.min(100, Math.round((current / target) * 100));
                  const isReady = sub.isRewardReady || current >= target;

                  return (
                    <div key={sub.id} className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-stone-50/50 transition-colors">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-stone-900 truncate">
                            {sub.userName || 'زبون مميز'}
                          </h4>
                          {isReady && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <Sparkles className="h-3 w-3 text-emerald-600" />
                              <span>مكافأة جاهزة للاستلام</span>
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 font-medium">
                          {sub.userPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3 text-stone-400" />
                              <span>{sub.userPhone}</span>
                            </span>
                          )}
                          {sub.userEmail && (
                            <span className="truncate max-w-[200px]">
                              {sub.userEmail}
                            </span>
                          )}
                          {sub.totalCompletedCards > 0 && (
                            <span className="text-teal-700 font-bold">
                              أكمل {sub.totalCompletedCards} بطاقة سابقة
                            </span>
                          )}
                        </div>

                        {/* Stamp Progress Bar & Visual Dots */}
                        <div className="pt-2 max-w-md">
                          <div className="flex items-center justify-between text-[11px] font-bold text-stone-600 mb-1">
                            <span>الأختام: {current} من {target}</span>
                            <span>{percent}%</span>
                          </div>
                          <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 rounded-full ${
                                isReady ? 'bg-emerald-500' : 'bg-[#1a4d2e]'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>

                          {/* Visual Stamp Circles */}
                          <div className="flex items-center gap-1.5 pt-2">
                            {Array.from({ length: target }).map((_, i) => {
                              const isStamped = i < current;
                              return (
                                <div
                                  key={i}
                                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border transition-all ${
                                    isStamped
                                      ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                                      : 'bg-stone-50 text-stone-300 border-dashed border-stone-300'
                                  }`}
                                >
                                  {isStamped ? <Check className="h-3 w-3 stroke-[3]" /> : i + 1}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                        {isReady ? (
                          <button
                            type="button"
                            onClick={() => handleRedeemReward(sub)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer active:scale-98"
                          >
                            <Gift className="h-4 w-4" />
                            <span>استبدال وتسليم الهدية</span>
                          </button>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => handleIncrementSubscriberStamp(sub)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-black rounded-xl transition-colors cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5 text-[#1a4d2e]" />
                          <span>+ ختم</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PROGRAM SETTINGS */}
      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Settings Form */}
          <div className="lg:col-span-7 bg-white border border-stone-200/90 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h4 className="text-base font-black text-stone-900">إعدادات وتخصيص بطاقة الولاء</h4>
              
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <span className="text-xs font-bold text-stone-600">
                  {config.enabled ? 'البرنامج مفعّل' : 'البرنامج معطّل'}
                </span>
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-stone-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1a4d2e] relative" />
              </label>
            </div>

            <div className="space-y-4">
              {/* Target Stamps */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1.5">
                  عدد الأختام المطلوبة لاكتمال البطاقة *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[5, 6, 8, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setConfig({ ...config, targetStamps: num })}
                      className={`py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                        config.targetStamps === num
                          ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-2xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      {num} أختام
                    </button>
                  ))}
                </div>
              </div>

              {/* Reward Title */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  عنوان المكافأة أو الهدية عند الاكتمال *
                </label>
                <input
                  type="text"
                  value={config.rewardTitle}
                  onChange={(e) => setConfig({ ...config, rewardTitle: e.target.value })}
                  placeholder="مثال: وجبة شاورما مجانية أو قهوة من اختيارك"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:border-[#1a4d2e]"
                />
              </div>

              {/* Reward Description */}
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">
                  تفاصيل وشروط الحصول على المكافأة (اختياري)
                </label>
                <textarea
                  rows={2}
                  value={config.rewardDescription || ''}
                  onChange={(e) => setConfig({ ...config, rewardDescription: e.target.value })}
                  placeholder="مثال: تسري المكافأة على الطلبات المباشرة من المحل فقط"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:border-[#1a4d2e]"
                />
              </div>

              {/* Expiry Days & PIN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    صلاحية تجميع الأختام (بالأيام)
                  </label>
                  <select
                    value={config.stampExpiryDays || 90}
                    onChange={(e) => setConfig({ ...config, stampExpiryDays: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:border-[#1a4d2e]"
                  >
                    <option value={30}>30 يوماً</option>
                    <option value={60}>60 يوماً</option>
                    <option value={90}>90 يوماً (موصى به)</option>
                    <option value={180}>180 يوماً</option>
                    <option value={0}>بدون انتهاء صلاحية</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-800 mb-1">
                    رمز PIN السري السريع للكاشير
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={config.secretPin || '1234'}
                    onChange={(e) => setConfig({ ...config, secretPin: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs sm:text-sm font-mono font-bold focus:bg-white focus:outline-none focus:border-[#1a4d2e]"
                  />
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleSaveSettings}
                  disabled={isSavingConfig}
                  className="w-full py-3 bg-[#1a4d2e] hover:bg-[#133b22] text-white text-xs sm:text-sm font-black rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{isSavingConfig ? 'جارٍ حفظ الإعدادات...' : 'حفظ إعدادات بطاقة الولاء'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Stamp Card Visual Preview */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black text-stone-700">
              <Eye className="h-4 w-4 text-[#1a4d2e]" />
              <span>معاينة حية لشكل بطاقة الولاء لدى الزبائن</span>
            </div>

            <div className="bg-gradient-to-br from-stone-900 via-stone-850 to-stone-950 text-white rounded-3xl p-5 shadow-xl border border-stone-700 relative overflow-hidden">
              {/* Decorative Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center overflow-hidden shrink-0">
                    {business.imageUrl || business.logoUrl ? (
                      <img src={business.imageUrl || business.logoUrl} alt={business.name} className="w-full h-full object-cover" />
                    ) : (
                      <Award className="h-5 w-5 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <h5 className="text-sm font-black text-white leading-tight">{business.name}</h5>
                    <span className="text-[10px] text-stone-400 font-medium">بطاقة ولاء رقمية</span>
                  </div>
                </div>

                <div className="text-left">
                  <span className="text-[10px] text-amber-400 font-bold bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                    {config.targetStamps} أختام
                  </span>
                </div>
              </div>

              {/* Stamps Grid Preview */}
              <div className="py-5 relative z-10">
                <div className="grid grid-cols-4 gap-2.5">
                  {Array.from({ length: config.targetStamps }).map((_, idx) => {
                    // Preview first 2 stamps stamped
                    const isStamped = idx < 2;
                    return (
                      <div
                        key={idx}
                        className={`aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all ${
                          isStamped
                            ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md scale-102'
                            : 'bg-white/5 border-dashed border-white/20 text-white/40'
                        }`}
                      >
                        {isStamped ? (
                          <>
                            <Award className="h-5 w-5" />
                            <span className="text-[9px] font-black">تم الختم</span>
                          </>
                        ) : (
                          <>
                            <span className="text-xs font-black">{idx + 1}</span>
                            <span className="text-[8px] font-medium">ختم</span>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reward Preview Footer */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-2 relative z-10">
                <div className="flex items-center gap-2">
                  <Gift className="h-4 w-4 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[10px] text-stone-400 block font-bold">المكافأة:</span>
                    <span className="text-xs font-black text-white truncate block">
                      {config.rewardTitle || 'مكافأة مجانية'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-stone-400 shrink-0">
                  {config.stampExpiryDays ? `${config.stampExpiryDays} يوم` : 'دائم'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
