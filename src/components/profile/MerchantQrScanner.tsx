import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { collection, query, where, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { handleFirestoreError, OperationType } from '../../lib/firestoreHelper';
import { checkCodeRedeemedStatus, recordCodeRedemption, markRewardUsed } from '../../lib/rewardHelper';
import { Store, QrCode, Scan, Search, AlertTriangle, CheckCircle, RefreshCw, X, Gift, Calendar, Sparkles, XCircle } from 'lucide-react';
import { Business } from '../../types';

interface MerchantQrScannerProps {
  businesses: Business[];
}

export function MerchantQrScanner({ businesses }: MerchantQrScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [lookupCode, setLookupCode] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [scannedReward, setScannedReward] = useState<any | null>(null);
  const [consumeLoading, setConsumeLoading] = useState(false);
  const [consumeSuccess, setConsumeSuccess] = useState(false);

  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  // Start the camera scanner
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
        {
          fps: 10,
          qrbox: (width, height) => {
            const size = Math.min(width, height) * 0.7;
            return { width: size, height: size };
          }
        },
        (decodedText) => {
          // Found a code!
          handleCodeLookup(decodedText);
          stopScanner();
        },
        () => {
          // Frame scanner warnings (can ignore)
        }
      );
    } catch (err: any) {
      const errString = String(err?.message || err || '');
      const isPermissionDenied = 
        err?.name === 'NotAllowedError' || 
        errString.includes('Permission denied') ||
        errString.includes('NotAllowedError') ||
        errString.includes('PermissionDeniedError');

      if (isPermissionDenied) {
        console.info("QR Camera permission not granted or restricted by policy:", err);
        setScanError("لم يتم منح إذن الكاميرا في المتصفح. يمكنك إدخال الكود يدوياً بالأسفل للتحقق فوراً.");
      } else {
        console.warn("Camera scanner notice:", err);
        setScanError("عذراً، تعذر تشغيل الكاميرا. يرجى التأكد من إذن الكاميرا أو كتابة الكود يدوياً بالأسفل.");
      }
      setScanning(false);
    }
  };

  // Stop the camera scanner
  const stopScanner = async () => {
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      try {
        await qrScannerRef.current.stop();
      } catch (err) {
        console.info("Notice stopping QR scanner:", err);
      }
    }
    setScanning(false);
  };

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      if (qrScannerRef.current && qrScannerRef.current.isScanning) {
        qrScannerRef.current.stop().catch(err => console.info("Scanner stop cleanup notice:", err));
      }
    };
  }, []);

  // Lookup the QR Code / Text coupon code in database
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

      // Check if scanned data is JSON
      if (trimmedCode.startsWith('{') && trimmedCode.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmedCode);
          if (parsed.code) {
            targetCode = parsed.code;
            rawData = parsed;
          }
        } catch (e) {}
      }

      // 0. Perform Global Single-Use Redemption Check across all caches & firestore
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
        } catch (colErr) {
          console.info("user_rewards query restricted, falling back to parsed verification:", colErr);
        }
      }

      // If not found in user_rewards or collection was restricted:
      if (!rewardData) {
        if (rawData && rawData.code) {
          rewardData = {
            id: 'qr_' + rawData.code,
            businessId: rawData.businessId,
            businessName: rawData.businessName || 'محل بإربد',
            code: rawData.code,
            discountPercent: rawData.discountPercent || 15,
            createdAt: rawData.createdAt || Date.now(),
            expiresAt: rawData.expiresAt || (Date.now() + 30 * 86400000),
            used: rawData.used || false,
            userId: rawData.userId || ''
          };
        } else {
          // Fallback parsing: CODE format is usually PREFIX-DISCOUNT-SUFFIX (e.g. SHOP-15-X9Y2)
          const parts = targetCode.split('-');
          if (parts.length >= 3 && !isNaN(Number(parts[1]))) {
            const discountPercent = Number(parts[1]);
            const prefix = parts[0].toUpperCase();
            // Find which merchant business matches this prefix
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
        setLookupError("⚠️ رمز الخصم هذا غير موجود أو خاطئ! يرجى التأكد من الرمز وإعادة المحاولة.");
        setLookupLoading(false);
        return;
      }

      // Enforce global redeemed check: if previously recorded as used anywhere, mark as used
      if (redeemedCheck.isRedeemed || rewardData.used) {
        rewardData.used = true;
        if (redeemedCheck.redeemedAt && !rewardData.usedAt) {
          rewardData.usedAt = redeemedCheck.redeemedAt;
        }
      }

      // Verify ownership: Does this code belong to one of this merchant's businesses?
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

  // Mark the reward as consumed/used
  const handleConsumeCode = async () => {
    if (!scannedReward || scannedReward.used || !scannedReward.isOwner) return;

    setConsumeLoading(true);
    try {
      // 0. Register globally in redeemed_codes collection and cache to guarantee SINGLE-USE
      await recordCodeRedemption(
        scannedReward.code,
        scannedReward.businessId || '',
        scannedReward.businessName || '',
        scannedReward.discountPercent || 0,
        undefined,
        scannedReward.userId
      );

      // 1. Mark used in storage helper
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
          } catch (colErr) {
            console.info("Could not update user_rewards doc directly:", colErr);
          }
        } else {
          try {
            const newRewardDocRef = doc(db, 'user_rewards', `redeemed_${scannedReward.code}`);
            await setDoc(newRewardDocRef, {
              code: scannedReward.code,
              businessId: scannedReward.businessId || '',
              businessName: scannedReward.businessName || '',
              discountPercent: scannedReward.discountPercent || 0,
              used: true,
              usedAt: Date.now()
            }, { merge: true });
          } catch (colErr) {}
        }
      }

      // Also record redeemed coupon on the business document
      if (db && scannedReward.businessId) {
        try {
          const bizRef = doc(db, 'businesses', scannedReward.businessId);
          await updateDoc(bizRef, {
            lastRedeemedCoupon: {
              code: scannedReward.code,
              discountPercent: scannedReward.discountPercent,
              redeemedAt: Date.now()
            }
          });
        } catch (bizErr) {
          console.info("Non-fatal: could not update business redeemed coupon:", bizErr);
        }
      }

      setConsumeSuccess(true);
      // Update local object status to reflect in UI
      setScannedReward(prev => prev ? { ...prev, used: true, usedAt: Date.now() } : null);
    } catch (err) {
      console.error("Error consuming coupon code:", err);
      setLookupError("فشل في استهلاك وتحديث حالة الكوبون.");
    } finally {
      setConsumeLoading(false);
    }
  };

  // Reset states to start scanning/inputting another code
  const handleReset = () => {
    setScannedReward(null);
    setLookupError(null);
    setConsumeSuccess(false);
    setLookupCode('');
  };

  return (
    <div className="bg-white border border-stone-200 rounded-3xl p-6 space-y-6 text-right" dir="rtl">
      <div className="border-b border-stone-100 pb-4">
        <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
          <QrCode className="h-5 w-5 text-emerald-600" />
          <span>ماسح أكواد الـ QR للمكافآت والخصومات</span>
        </h3>
        <p className="text-xs text-stone-500 mt-1">
          قم بمسح رمز QR أو إدخال كود الخصم يدوياً للتحقق من صلاحيته وتفعيله للزبون فوراً.
        </p>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Scanner and Camera controls */}
        <div className="space-y-4">
          <h4 className="text-xs font-black text-stone-800">1. مسح الكود بالكاميرا</h4>
          
          <div className="relative overflow-hidden rounded-2xl bg-stone-950 border border-stone-800 aspect-square flex flex-col items-center justify-center text-center p-4">
            {/* The scanning container */}
            <div id="qr-reader-container" className="absolute inset-0 w-full h-full object-cover"></div>

            {/* Visual Overlays when NOT scanning */}
            {!scanning && !consumeSuccess && (
              <div className="z-10 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                  <Scan className="h-8 w-8 animate-pulse" />
                </div>
                <div>
                  <button
                    type="button"
                    onClick={startScanner}
                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-2 mx-auto"
                  >
                    <QrCode className="h-4 w-4" />
                    <span>تشغيل كاميرا الماسح</span>
                  </button>
                </div>
                <p className="text-[10px] text-stone-400 font-medium max-w-[200px] mx-auto leading-relaxed">
                  يتطلب إعطاء إذن الكاميرا للتعرف التلقائي الفوري على رموز QR.
                </p>
              </div>
            )}

            {/* Overlays when scanning is running */}
            {scanning && (
              <div className="absolute inset-x-0 bottom-4 z-10 flex justify-center">
                <button
                  type="button"
                  onClick={stopScanner}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <X className="h-4 w-4" />
                  <span>إيقاف الكاميرا</span>
                </button>
              </div>
            )}

            {/* Scanner Frame Visual Indicator */}
            {scanning && (
              <div className="absolute inset-0 border-4 border-emerald-500/30 m-8 rounded-xl pointer-events-none flex items-center justify-center">
                <div className="w-4/5 h-1 bg-emerald-400/80 animate-[bounce_2s_infinite] rounded-full"></div>
              </div>
            )}
          </div>

          {scanError && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-700">
              {scanError}
            </div>
          )}
        </div>

        {/* Manual Input & Details */}
        <div className="space-y-4">
          <h4 className="text-xs font-black text-stone-800">2. البحث اليدوي أو النتائج 📋</h4>

          {/* Form for manual lookup */}
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
                placeholder="أدخل كود الخصم يدوياً (مثال: BIZ-15-XXXX)..."
                className="w-full pr-10 pl-3 py-3 border border-stone-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-emerald-600 text-left placeholder:text-right font-mono"
                dir="ltr"
              />
              <Search className="absolute right-3.5 top-3.5 h-4 w-4 text-stone-400" />
            </div>
            <button
              type="submit"
              disabled={lookupLoading || !lookupCode.trim()}
              className="px-5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              {lookupLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span>تحقق</span>
            </button>
          </form>

          {/* Error message */}
          {lookupError && (
            <div className="p-4 bg-rose-50 border border-rose-150 rounded-2xl text-xs font-bold text-rose-700 leading-relaxed">
              {lookupError}
            </div>
          )}

          {/* Scanned / Lookup Result */}
          {scannedReward && (
            <div className={`p-5 rounded-2xl border ${scannedReward.used ? 'border-amber-100 bg-amber-50/10' : !scannedReward.isOwner ? 'border-rose-100 bg-rose-50/10' : 'border-emerald-100 bg-emerald-50/10'} space-y-4`}>
              <div className="flex justify-between items-start border-b border-stone-100 pb-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-stone-400 block">كوبون مسترجع للتحقق</span>
                  <span className="text-xs font-black text-stone-900 font-mono tracking-wide">{scannedReward.code}</span>
                </div>
                <div className="text-left">
                  {scannedReward.used ? (
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black">مستهلك سابقاً</span>
                  ) : Date.now() > scannedReward.expiresAt ? (
                    <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full text-[10px] font-black">منتهي الصلاحية</span>
                  ) : (
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-black">صالح للاستخدام</span>
                  )}
                </div>
              </div>

              {/* Reward stats/details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-stone-400 block mb-1">المنشأة المستهدفة</span>
                  <div className="font-bold text-stone-800 flex items-center gap-1">
                    <Store className="h-3.5 w-3.5 text-stone-400" />
                    <span>{scannedReward.businessName}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-stone-400 block mb-1">قيمة الخصم للزبون</span>
                  <div className="font-black text-emerald-700 text-sm flex items-center gap-1">
                    <Gift className="h-3.5 w-3.5" />
                    <span>خصم {scannedReward.discountPercent}%</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-stone-400 block mb-1">تاريخ انتهاء الكود</span>
                  <div className="font-bold text-stone-600 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-stone-400" />
                    <span>{new Date(scannedReward.expiresAt).toLocaleDateString('ar-JO')}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-stone-400 block mb-1">تأكيد المالك للمحل</span>
                  <div className="font-bold text-stone-800">
                    {scannedReward.isOwner ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>منشأة تابعة لك</span>
                      </span>
                    ) : (
                      <span className="text-rose-700 font-bold flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        <span>منشأة غير تابعة لك!</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Warnings and action buttons */}
              {scannedReward.used && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] font-bold text-amber-800 leading-relaxed">
                  هذا الرمز تم استخدامه مسبقاً في تاريخ <strong>{scannedReward.usedAt ? new Date(scannedReward.usedAt).toLocaleString('ar-JO') : 'غير محدد'}</strong>، لا يمكن تفعيله مرة أخرى للزبون.
                </div>
              )}

              {!scannedReward.used && Date.now() > scannedReward.expiresAt && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] font-bold text-rose-800 leading-relaxed">
                  هذا الكود غير صالح للاستخدام حالياً لأنه تجاوز تاريخ الصلاحية المحدد له بالأيام.
                </div>
              )}

              {!scannedReward.isOwner && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] font-bold text-rose-800 leading-relaxed">
                  هذا الكود يخص منشأة أخرى وليس لأي من المحلات التي تديرها من حسابك. لا يجب عليك منحه خصماً من متجرك.
                </div>
              )}

              {/* Action button to consume code */}
              {!scannedReward.used && Date.now() <= scannedReward.expiresAt && scannedReward.isOwner && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleConsumeCode}
                    disabled={consumeLoading}
                    className="w-full py-3 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {consumeLoading ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    <span>تأكيد استهلاك الخصم وتفعيله للزبون</span>
                  </button>
                </div>
              )}

              {/* Success state */}
              {consumeSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2 text-emerald-800 text-xs leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <Sparkles className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-black text-emerald-900 mb-1">تم تفعيل واستهلاك الكود بنجاح!</h5>
                    <p className="font-semibold text-[11px] text-emerald-700">
                      تم خصم نسبة <strong>{scannedReward.discountPercent}%</strong> للزبون وتعديل حالة الكوبون إلى مستهلك بقاعدة البيانات. سيختفي تلقائياً من تطبيق الزبون خلال 3 أيام.
                    </p>
                  </div>
                </div>
              )}

              {/* Reset button to clear search */}
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-stone-500 hover:text-stone-800 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>التحقق من كود آخر</span>
                </button>
              </div>
            </div>
          )}

          {/* No search performed yet placeholder */}
          {!scannedReward && !lookupError && !lookupLoading && (
            <div className="p-10 bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-center space-y-2">
              <QrCode className="h-8 w-8 text-stone-300 mx-auto" />
              <p className="text-xs text-stone-500 font-bold">في انتظار مسح الكود أو إدخاله يدوياً...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
