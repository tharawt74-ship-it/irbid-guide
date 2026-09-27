import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { Html5Qrcode } from 'html5-qrcode';
import { collection, query, where, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { checkCodeRedeemedStatus, recordCodeRedemption, markRewardUsed } from '../../lib/rewardHelper';
import { 
  Store, 
  QrCode, 
  Scan, 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  X, 
  Gift, 
  Copy, 
  ExternalLink, 
  Smartphone, 
  Laptop, 
  Share2, 
  Check, 
  Sparkles, 
  ChevronDown, 
  ChevronUp 
} from 'lucide-react';
import { Business } from '../../types';

interface MerchantQrScannerProps {
  businesses: Business[];
}

export function MerchantQrScanner({ businesses }: MerchantQrScannerProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [showEmbeddedScanner, setShowEmbeddedScanner] = useState(false);

  // Embedded Scanner State
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [lookupCode, setLookupCode] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [scannedReward, setScannedReward] = useState<any | null>(null);
  const [consumeLoading, setConsumeLoading] = useState(false);
  const [consumeSuccess, setConsumeSuccess] = useState(false);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  // Dynamic absolute link for the standalone cashier scanner
  const scannerTerminalUrl = `${window.location.origin}/merchant/scanner`;
  const qrImageSrc = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(scannerTerminalUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(scannerTerminalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Start the camera scanner (for embedded view)
  const startScanner = async () => {
    setScanError(null);
    setLookupError(null);
    setConsumeSuccess(false);
    setScannedReward(null);

    try {
      if (!qrScannerRef.current) {
        qrScannerRef.current = new Html5Qrcode("qr-reader-container");
      }
      
      setScanning(true);
      await qrScannerRef.current.start(
        { facingMode: "environment" },
        { fps: 10 },
        (decodedText) => {
          handleCodeLookup(decodedText);
          stopScanner();
        },
        () => {}
      );
    } catch (err: any) {
      const errString = String(err?.message || err || '');
      const isPermissionDenied = 
        err?.name === 'NotAllowedError' || 
        errString.includes('Permission denied') ||
        errString.includes('NotAllowedError');

      if (isPermissionDenied) {
        setScanError("لم يتم منح إذن الكاميرا. يمكنك كتابة الكود يدوياً بالأسفل للتحقق فوراً.");
      } else {
        setScanError("تعذر تشغيل الكاميرا. يرجى التأكد من صلاحية الكاميرا أو كتابة الكود يدوياً.");
      }
      setScanning(false);
    }
  };

  // Stop the camera scanner
  const stopScanner = async () => {
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      try {
        await qrScannerRef.current.stop();
      } catch (err) {}
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      if (qrScannerRef.current && qrScannerRef.current.isScanning) {
        qrScannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Lookup code in database or fallback
  const handleCodeLookup = async (code: string) => {
    const trimmedCode = code.trim();
    if (!trimmedCode) return;

    setLookupLoading(true);
    setLookupError(null);
    setScannedReward(null);
    setConsumeSuccess(false);

    try {
      let rawData: any = null;
      let targetCode = trimmedCode;

      if (trimmedCode.startsWith('{') && trimmedCode.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmedCode);
          if (parsed.code) {
            targetCode = parsed.code;
            rawData = parsed;
          }
        } catch (e) {}
      }

      const redeemedCheck = await checkCodeRedeemedStatus(targetCode);
      let rewardData: any = null;

      if (db) {
        try {
          const q = query(collection(db, 'user_rewards'), where('code', '==', targetCode));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const rewardDoc = snap.docs[0];
            rewardData = { id: rewardDoc.id, ...rewardDoc.data() };
          }
        } catch (colErr) {}
      }

      if (!rewardData) {
        if (rawData && rawData.code) {
          rewardData = {
            id: 'qr_' + rawData.code,
            businessId: rawData.businessId,
            businessName: rawData.businessName || 'منشأة تجارية',
            code: rawData.code,
            discountPercent: rawData.discountPercent || 15,
            createdAt: rawData.createdAt || Date.now(),
            expiresAt: rawData.expiresAt || (Date.now() + 30 * 86400000),
            used: rawData.used || false,
            userId: rawData.userId || ''
          };
        } else {
          const parts = targetCode.split('-');
          if (parts.length >= 3 && !isNaN(Number(parts[1]))) {
            const discountPercent = Number(parts[1]);
            const prefix = parts[0].toUpperCase();
            const matchedBiz = businesses.find(b => {
              const clean = (b.name || '').replace(/[^\w\s]/gi, '').trim().split(/\s+/)[0].toUpperCase();
              return clean === prefix || (b.name || '').toUpperCase().includes(prefix);
            }) || businesses[0];

            if (matchedBiz) {
              rewardData = {
                id: 'code_' + targetCode,
                businessId: matchedBiz.id,
                businessName: matchedBiz.name,
                code: targetCode,
                discountPercent: discountPercent,
                createdAt: Date.now() - 86400000,
                expiresAt: Date.now() + (Number(matchedBiz.giftCodeValidityDays || 30) * 86400000),
                used: false
              };
            }
          }
        }
      }

      if (!rewardData) {
        setLookupError("⚠️ رمز الخصم هذا غير موجود أو خاطئ! يرجى التأكد من الكود لإعادة المحاولة.");
        setLookupLoading(false);
        return;
      }

      if (redeemedCheck.isRedeemed || rewardData.used) {
        rewardData.used = true;
        if (redeemedCheck.redeemedAt && !rewardData.usedAt) {
          rewardData.usedAt = redeemedCheck.redeemedAt;
        }
      }

      const isOwner = businesses.some(b => b.id === rewardData.businessId);

      setScannedReward({
        ...rewardData,
        isOwner
      });
    } catch (err) {
      console.error("Error looking up reward code:", err);
      setLookupError("حدث خطأ أثناء التحقق من الكود.");
    } finally {
      setLookupLoading(false);
    }
  };

  // Consume code
  const handleConsumeCode = async () => {
    if (!scannedReward || scannedReward.used || !scannedReward.isOwner) return;

    setConsumeLoading(true);
    try {
      await recordCodeRedemption(
        scannedReward.code,
        scannedReward.businessId || '',
        scannedReward.businessName || '',
        scannedReward.discountPercent || 0,
        undefined,
        scannedReward.userId
      );

      if (scannedReward.userId) {
        await markRewardUsed(scannedReward.userId, scannedReward.id, scannedReward.code, true);
      }

      if (db) {
        if (scannedReward.id && !scannedReward.id.startsWith('code_') && !scannedReward.id.startsWith('qr_')) {
          try {
            const rewardRef = doc(db, 'user_rewards', scannedReward.id);
            await updateDoc(rewardRef, {
              used: true,
              usedAt: Date.now()
            });
          } catch (e) {}
        }
      }

      setConsumeSuccess(true);
      setScannedReward(prev => prev ? { ...prev, used: true, usedAt: Date.now() } : null);
    } catch (err) {
      setLookupError("فشل في استهلاك وتحديث حالة الكوبون.");
    } finally {
      setConsumeLoading(false);
    }
  };

  const handleReset = () => {
    setScannedReward(null);
    setLookupError(null);
    setConsumeSuccess(false);
    setLookupCode('');
  };

  return (
    <div className="bg-white border border-stone-200/80 rounded-3xl p-5 sm:p-7 space-y-6 text-right dir-rtl shadow-xs">
      
      {/* Header */}
      <div className="border-b border-stone-100 pb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
            <QrCode className="h-5 w-5 text-emerald-700 shrink-0" />
            <span>ماسح أكواد الـ QR للمكافآت والخصومات</span>
          </h3>
          <p className="text-xs text-stone-500 mt-1">
            اختر الطريقة المناسبة لفحص وتفعيل كود الخصم للزبون
          </p>
        </div>
      </div>

      {/* Two Main Options Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        
        {/* OPTION 1: Scan QR Code with Cashier Phone */}
        <div className="bg-gradient-to-br from-emerald-50/70 via-stone-50 to-emerald-50/40 p-6 rounded-3xl border border-emerald-200/90 flex flex-col justify-between space-y-5 relative shadow-xs">
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-emerald-600 text-white font-mono font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                1
              </span>
              <h4 className="text-sm font-black text-emerald-950 flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-emerald-700" />
                <span>تصوير الـ QR code وفتحه على هاتف الكاشير (بدون حساب)</span>
              </h4>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed pr-9">
              امسح الكود بكاميرا جوال الموظف أو الكاشير لفتح شاشة الماسح الضوئي للمحل مباشرة، بدون إدخال اسم مستخدم أو كلمة سر.
            </p>
          </div>

          {/* QR Code Graphic Box */}
          <div className="bg-white p-4 rounded-2xl border border-emerald-200/80 shadow-sm flex flex-col items-center justify-center space-y-3 text-center my-2">
            <div className="p-2 bg-white rounded-xl border border-stone-200 shadow-2xs">
              <img 
                src={qrImageSrc} 
                alt="رابط ماسح الـ QR للكاشير" 
                className="w-40 h-40 object-contain rounded-lg"
              />
            </div>
            <p className="text-[11px] font-bold text-stone-700">
              📱 وجّه كاميرا الجوال نحو هذا الرمز للفتح المباشر
            </p>
          </div>

          {/* Direct Link Share & Copy Actions */}
          <div className="space-y-2 pt-2 border-t border-emerald-200/60">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                {copiedLink ? <Check className="h-4 w-4 text-emerald-200" /> : <Copy className="h-4 w-4" />}
                <span>{copiedLink ? 'تم نسخ الرابط!' : 'نسخ رابط الماسح'}</span>
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(`رابط ماسح أكواد الخصم لكاشير المنشأة:\n${scannerTerminalUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-3 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0"
                title="إرسال رابط الماسح عبر واتساب للموظفين"
              >
                <Share2 className="h-4 w-4 text-emerald-700" />
                <span>إرسال بـ WhatsApp</span>
              </a>
            </div>
          </div>

        </div>

        {/* OPTION 2: Open QR Scanner page directly on this PC/screen */}
        <div className="bg-gradient-to-br from-indigo-50/70 via-stone-50 to-indigo-50/40 p-6 rounded-3xl border border-indigo-200/90 flex flex-col justify-between space-y-5 relative shadow-xs">
          
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-indigo-600 text-white font-mono font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                2
              </span>
              <h4 className="text-sm font-black text-indigo-950 flex items-center gap-1.5">
                <Laptop className="h-4 w-4 text-indigo-700" />
                <span>زر فتح صفحة ماسح الـ QR code مباشرة</span>
              </h4>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed pr-9">
              قم بفتح شاشة الماسح الضوئي الكاملة مباشرة على جهاز الكمبيوتر الحالي للبدء بفحص وتقييم الخصومات.
            </p>
          </div>

          <div className="py-6 px-4 bg-white rounded-2xl border border-indigo-200/80 text-center space-y-4 my-auto shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto border border-indigo-200">
              <ExternalLink className="h-6 w-6" />
            </div>
            
            <div>
              <h5 className="text-xs font-black text-stone-900">شاشة الماسح الكاملة (الكاشير)</h5>
              <p className="text-[11px] text-stone-500 mt-0.5">تفتح شاشة الماسح المستقلة بشاشة كاملة وبأصوات تنبيه تفاعلية</p>
            </div>

            <Link
              to="/merchant/scanner"
              target="_blank"
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md active:scale-98 cursor-pointer"
            >
              <ExternalLink className="h-4 w-4" />
              <span>فتح صفحة الماسح الضوئي الكاملة 🚀</span>
            </Link>
          </div>

          {/* Toggle button to expand inline camera/manual input below if needed */}
          <div className="pt-2 border-t border-indigo-200/60">
            <button
              type="button"
              onClick={() => setShowEmbeddedScanner(prev => !prev)}
              className="w-full py-2.5 px-3 bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <span>{showEmbeddedScanner ? 'إخفاء الماسح المباشر هنا' : 'أو تجربة واستخدام الماسح المباشر هُنا'}</span>
              {showEmbeddedScanner ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

        </div>

      </div>

      {/* EMBEDDED INLINE SCANNER (Expanded on demand) */}
      {showEmbeddedScanner && (
        <div className="pt-6 border-t border-stone-200 space-y-5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-black text-stone-900 flex items-center gap-2">
              <Scan className="h-4 w-4 text-emerald-600" />
              <span>الماسح الضوئي المباشر والتحقق اليدوي</span>
            </h4>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-200">
              معاينة سريعة
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* Camera */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-stone-700">1. مسح الكود بالكاميرا</span>
              <div className="relative overflow-hidden rounded-2xl bg-stone-950 border border-stone-800 aspect-square flex flex-col items-center justify-center text-center p-4">
                <div id="qr-reader-container" className="absolute inset-0 w-full h-full object-cover"></div>

                {!scanning && !consumeSuccess && (
                  <div className="z-10 space-y-3">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                      <Scan className="h-7 w-7 animate-pulse" />
                    </div>
                    <button
                      type="button"
                      onClick={startScanner}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2 mx-auto"
                    >
                      <QrCode className="h-4 w-4" />
                      <span>تشغيل الكاميرا</span>
                    </button>
                  </div>
                )}

                {scanning && (
                  <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center">
                    <button
                      type="button"
                      onClick={stopScanner}
                      className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                    >
                      <X className="h-4 w-4" />
                      <span>إيقاف</span>
                    </button>
                  </div>
                )}
              </div>

              {scanError && (
                <p className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
                  {scanError}
                </p>
              )}
            </div>

            {/* Manual Verification */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-stone-700">2. البحث وإدخال الكود يدوياً</span>
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCodeLookup(lookupCode);
                }}
                className="flex gap-2"
              >
                <div className="relative grow">
                  <input
                    type="text"
                    value={lookupCode}
                    onChange={(e) => setLookupCode(e.target.value)}
                    placeholder="أدخل الكود (مثال: SHOP-15-XXXX)..."
                    className="w-full pr-9 pl-3 py-2.5 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-600 text-left font-mono"
                    dir="ltr"
                  />
                  <Search className="absolute right-3 top-3 h-4 w-4 text-stone-400" />
                </div>
                <button
                  type="submit"
                  disabled={lookupLoading || !lookupCode.trim()}
                  className="px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  {lookupLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span>تحقق</span>
                </button>
              </form>

              {lookupError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-700">
                  {lookupError}
                </div>
              )}

              {/* Result display */}
              {scannedReward && (
                <div className="bg-stone-50 border border-stone-200 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-800">{scannedReward.businessName}</span>
                    <span className="text-sm font-black font-mono text-emerald-700">خصم {scannedReward.discountPercent}%</span>
                  </div>

                  {scannedReward.used ? (
                    <div className="p-2.5 bg-rose-100 text-rose-800 rounded-xl text-xs font-black flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-rose-600" />
                      <span>تم استخدام وتفعيل هذا الكود سابقاً!</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleConsumeCode}
                      disabled={consumeLoading || !scannedReward.isOwner}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {consumeLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                      <span>تأكيد وتفعيل الخصم للزبون الآن</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
