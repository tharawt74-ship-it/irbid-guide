import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  QrCode, 
  Keyboard, 
  ArrowRight, 
  Store, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Camera, 
  RotateCcw, 
  SwitchCamera,
  Sparkles, 
  Clock, 
  Tag, 
  Percent, 
  Copy, 
  ClipboardCheck, 
  Search,
  Volume2,
  VolumeX,
  Building2,
  Check,
  Zap,
  Info,
  ImageIcon,
  ExternalLink,
  RefreshCw,
  UploadCloud
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, increment, setDoc } from 'firebase/firestore';
import { markRewardUsed, recordCodeRedemption, checkCodeRedeemedStatus, UserReward } from '../lib/rewardHelper';
import { cn } from '../lib/utils';
import { Business } from '../types';

export function MerchantScannerPage() {
  const navigate = useNavigate();
  const { currentUser, ownedBusinesses } = useAuth();

  // Active businesses that have gift code enabled
  const activeBusinesses = (ownedBusinesses || []).filter(b => 
    b.giftCodeEnabled === true || (b as any).giftCodeEnabled === 'true'
  );

  // Tab State: 'scan' | 'manual'
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');

  // Scanner State
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<'permission_denied' | 'general_error' | string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [shakeScreen, setShakeScreen] = useState<boolean>(false);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Manual Input State
  const [manualCode, setManualCode] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Scanned / Looked-up Result State
  const [verifiedReward, setVerifiedReward] = useState<{
    reward: UserReward;
    matchedBusiness?: Business | null;
    isOwnedByMerchant: boolean;
    isExpired: boolean;
    isAlreadyUsed: boolean;
  } | null>(null);

  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isConsuming, setIsConsuming] = useState<boolean>(false);
  const [consumeSuccess, setConsumeSuccess] = useState<boolean>(false);

  // Trigger Haptic Vibration & Screen Shake
  const triggerShake = () => {
    setShakeScreen(true);
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([150, 80, 150, 80, 300]);
      } catch (e) {}
    }
    setTimeout(() => {
      setShakeScreen(false);
    }, 700);
  };

  // Session Redemption History
  const [recentRedemptions, setRecentRedemptions] = useState<Array<{
    code: string;
    storeName: string;
    discountPercent: number;
    timestamp: number;
  }>>([]);

  // Selected Store Filter for Multi-Store merchants (null means auto-detect)
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string | null>(null);

  // Play Sound Helper
  const playBeep = (isSuccess = true) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      if (isSuccess) {
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.35);
      } else {
        osc.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.3);
      }
    } catch (e) {
      // AudioContext might be blocked or not supported
    }
  };

  // Start QR Scanner
  const startScanner = async () => {
    setCameraError(null);
    setLookupError(null);
    setVerifiedReward(null);
    setConsumeSuccess(false);

    try {
      if (!qrScannerRef.current) {
        qrScannerRef.current = new Html5Qrcode("merchant-qr-reader-full");
      }

      if (qrScannerRef.current.isScanning) {
        await qrScannerRef.current.stop();
      }

      setIsScanning(true);
      await qrScannerRef.current.start(
        { facingMode },
        {
          fps: 12,
          qrbox: (width, height) => {
            const minSide = Math.min(width, height);
            const size = Math.min(280, Math.floor(minSide * 0.75));
            return { width: size, height: size };
          }
        },
        (decodedText) => {
          handleProcessCode(decodedText);
          stopScanner();
        },
        () => {
          // Ignored per-frame warnings
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
        console.info("Camera permission not granted by user or browser iframe policy:", err);
        setCameraError("permission_denied");
      } else {
        console.warn("Camera scanner notice:", err);
        setCameraError("general_error");
      }
      setIsScanning(false);
    }
  };

  // Stop QR Scanner
  const stopScanner = async () => {
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      try {
        await qrScannerRef.current.stop();
      } catch (err) {
        console.info("Notice stopping scanner:", err);
      }
    }
    setIsScanning(false);
  };

  // Scan QR Code from an Image file (e.g. screenshot or photo taken from gallery)
  const handleScanImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSearching(true);
    setLookupError(null);
    setVerifiedReward(null);
    setConsumeSuccess(false);

    try {
      if (!qrScannerRef.current) {
        qrScannerRef.current = new Html5Qrcode("merchant-qr-reader-full");
      }

      if (qrScannerRef.current.isScanning) {
        await qrScannerRef.current.stop();
        setIsScanning(false);
      }

      const decodedText = await qrScannerRef.current.scanFile(file, true);
      await handleProcessCode(decodedText);
    } catch (err: any) {
      console.info("QR image decode notice:", err);
      triggerShake();
      playBeep(false);
      setLookupError("لم نتمكن من قراءة رمز QR من الصورة المرفقة. يرجى التأكد من وضوح الرمز أو إدخال الكود يدوياً.");
    } finally {
      setIsSearching(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Flip Camera
  const toggleCamera = async () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    if (isScanning) {
      await stopScanner();
      setTimeout(() => {
        startScanner();
      }, 300);
    }
  };

  // Cleanup on unmount or tab change
  useEffect(() => {
    if (activeTab === 'scan') {
      const timer = setTimeout(() => {
        startScanner();
      }, 400);
      return () => {
        clearTimeout(timer);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [activeTab, facingMode]);

  // Clean on unmount
  useEffect(() => {
    return () => {
      if (qrScannerRef.current && qrScannerRef.current.isScanning) {
        qrScannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Process code from either QR or Manual Input
  const handleProcessCode = async (rawCodeInput: string) => {
    const trimmed = rawCodeInput.trim();
    if (!trimmed) return;

    setIsSearching(true);
    setLookupError(null);
    setVerifiedReward(null);
    setConsumeSuccess(false);

    try {
      let targetCode = trimmed;
      let parsedPayload: any = null;

      // 1. If input is a URL (e.g. from scanning a URL QR code), extract the code parameter
      if (trimmed.includes('://') || trimmed.includes('?') || trimmed.includes('=')) {
        try {
          const urlStr = trimmed.startsWith('http') ? trimmed : `https://shoofi.app/${trimmed.startsWith('?') ? trimmed : '?' + trimmed}`;
          const urlObj = new URL(urlStr);
          const extractedParam = urlObj.searchParams.get('giftCode') || 
                                 urlObj.searchParams.get('code') || 
                                 urlObj.searchParams.get('c') || 
                                 urlObj.searchParams.get('reward');
          if (extractedParam) {
            targetCode = extractedParam;
          }
        } catch (e) {
          // ignore URL parse errors
        }
      }

      // 2. Handle JSON payload in QR code
      if (targetCode.startsWith('{') && targetCode.endsWith('}')) {
        try {
          parsedPayload = JSON.parse(targetCode);
          if (parsedPayload.code) {
            targetCode = parsedPayload.code;
          }
        } catch (e) {
          // not JSON, keep as raw string
        }
      }

      // 3. Clean prefixes and standardize uppercase
      targetCode = targetCode
        .replace(/^(CODE:|GIFT:|GIFT_CODE:|QR:|COUPON:)/i, '')
        .trim()
        .toUpperCase();

      // 0. Perform Global Single-Use Redemption Check across all storage tiers
      const redeemedCheck = await checkCodeRedeemedStatus(targetCode);

      let foundReward: UserReward | null = null;

      // 1. Try querying Firestore user_rewards collection by code
      if (db) {
        try {
          const q = query(collection(db, 'user_rewards'), where('code', '==', targetCode));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const docData = snap.docs[0].data();
            foundReward = {
              id: snap.docs[0].id,
              userId: docData.userId || '',
              businessId: docData.businessId || '',
              businessName: docData.businessName || '',
              code: docData.code || targetCode,
              discountPercent: Number(docData.discountPercent || 10),
              createdAt: Number(docData.createdAt || Date.now()),
              expiresAt: Number(docData.expiresAt || (Date.now() + 30 * 86400000)),
              used: Boolean(docData.used),
              usedAt: docData.usedAt ? Number(docData.usedAt) : undefined,
              isCampaignExpired: Boolean(docData.isCampaignExpired),
              giftCodeEndDate: docData.giftCodeEndDate || undefined
            };
          }
        } catch (err) {
          console.info("Direct collection query failed, attempting secondary verification:", err);
        }
      }

      // 2. If not found in user_rewards or collection read failed:
      if (!foundReward && parsedPayload && parsedPayload.code) {
        foundReward = {
          id: 'qr_' + parsedPayload.code,
          userId: parsedPayload.userId || '',
          businessId: parsedPayload.businessId || '',
          businessName: parsedPayload.businessName || '',
          code: parsedPayload.code,
          discountPercent: Number(parsedPayload.discountPercent || 15),
          createdAt: Number(parsedPayload.createdAt || Date.now()),
          expiresAt: Number(parsedPayload.expiresAt || (Date.now() + 30 * 86400000)),
          used: Boolean(parsedPayload.used),
          usedAt: parsedPayload.usedAt ? Number(parsedPayload.usedAt) : undefined
        };
      }

      // 3. Fallback syntax parse: PREFIX-DISCOUNT-SUFFIX (e.g. SHOP-15-X9Y2)
      if (!foundReward) {
        const parts = targetCode.split('-');
        if (parts.length >= 2 && !isNaN(Number(parts[1]))) {
          const discountVal = Number(parts[1]);
          const prefix = parts[0].toUpperCase();

          // Match which business owns this prefix among ALL merchant businesses
          const matchedByPrefix = (ownedBusinesses || []).find(b => {
            const cleanName = (b.name || '').replace(/[^\w\s\u0600-\u06FF]/gi, '').trim().split(/\s+/)[0].toUpperCase();
            return cleanName === prefix || (b.name || '').toUpperCase().includes(prefix);
          }) || activeBusinesses[0];

          if (matchedByPrefix) {
            foundReward = {
              id: 'code_' + targetCode,
              userId: '',
              businessId: matchedByPrefix.id,
              businessName: matchedByPrefix.name,
              code: targetCode,
              discountPercent: discountVal,
              createdAt: Date.now() - 86400000,
              expiresAt: Date.now() + (Number(matchedByPrefix.giftCodeValidityDays || 30) * 86400000),
              used: false
            };
          }
        }
      }

      if (!foundReward) {
        triggerShake();
        playBeep(false);
        setLookupError("رمز الخصم هذا غير صالح أو غير موجود في النظام. يرجى التحقق من صحة الكود.");
        return;
      }

      // Enforce global redeemed check: if previously recorded as used anywhere, mark as used
      if (redeemedCheck.isRedeemed || foundReward.used) {
        foundReward.used = true;
        if (redeemedCheck.redeemedAt && !foundReward.usedAt) {
          foundReward.usedAt = redeemedCheck.redeemedAt;
        }
      }

      // SMART MULTI-STORE MATCHING:
      // Match against all businesses owned by this merchant
      const matchedBusiness = (ownedBusinesses || []).find(b => b.id === foundReward?.businessId) || null;
      const isOwnedByMerchant = Boolean(matchedBusiness);

      // Check Expiry & Used status
      const now = Date.now();
      const isExpired = foundReward.expiresAt < now;
      const isAlreadyUsed = Boolean(foundReward.used);

      if (!isOwnedByMerchant || isAlreadyUsed || isExpired) {
        triggerShake();
        playBeep(false);
      } else {
        playBeep(true);
      }

      setVerifiedReward({
        reward: foundReward,
        matchedBusiness,
        isOwnedByMerchant,
        isExpired,
        isAlreadyUsed
      });

    } catch (err) {
      console.error("Lookup error:", err);
      triggerShake();
      setLookupError("حدث خطأ أثناء معالجة الكود. يرجى المحاولة مجدداً.");
    } finally {
      setIsSearching(false);
    }
  };

  // Consume / Redeem Code Action
  const handleConfirmConsume = async () => {
    if (!verifiedReward || !verifiedReward.isOwnedByMerchant || verifiedReward.isAlreadyUsed || verifiedReward.isExpired) {
      return;
    }

    setIsConsuming(true);
    try {
      const { reward, matchedBusiness } = verifiedReward;

      // 0. Register globally in redeemed_codes collection and cache to guarantee SINGLE-USE
      await recordCodeRedemption(
        reward.code,
        matchedBusiness?.id || reward.businessId,
        matchedBusiness?.name || reward.businessName,
        reward.discountPercent,
        currentUser?.uid,
        reward.userId
      );

      // 1. Mark used in storage helper (users/{userId}.rewards & localStorage & user_rewards)
      if (reward.userId) {
        await markRewardUsed(reward.userId, reward.id, reward.code, true);
      }
      
      if (db) {
        try {
          if (reward.id && !reward.id.startsWith('code_') && !reward.id.startsWith('qr_')) {
            const ref = doc(db, 'user_rewards', reward.id);
            await updateDoc(ref, {
              used: true,
              usedAt: Date.now()
            });
          } else {
            const newRewardDocRef = doc(db, 'user_rewards', `redeemed_${reward.code}`);
            await setDoc(newRewardDocRef, {
              code: reward.code,
              businessId: matchedBusiness?.id || reward.businessId,
              businessName: matchedBusiness?.name || reward.businessName,
              discountPercent: reward.discountPercent,
              used: true,
              usedAt: Date.now(),
              redeemedByMerchantId: currentUser?.uid || ''
            }, { merge: true });
          }
        } catch (colErr) {
          console.info("Direct user_rewards collection update bypassed:", colErr);
        }
      }

      // 2. Increment store's redeemed count if possible
      if (db && matchedBusiness) {
        try {
          const bizRef = doc(db, 'businesses', matchedBusiness.id);
          await updateDoc(bizRef, {
            giftCodeRedeemedCount: increment(1)
          });
        } catch (bizErr) {
          console.info("Store redeemed count increment bypassed:", bizErr);
        }
      }

      // Haptic feedback
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([80, 50, 150]);
        } catch (e) {}
      }

      playBeep(true);
      setConsumeSuccess(true);

      // Add to session redemptions history
      setRecentRedemptions(prev => [
        {
          code: reward.code,
          storeName: matchedBusiness?.name || reward.businessName,
          discountPercent: reward.discountPercent,
          timestamp: Date.now()
        },
        ...prev
      ]);

      // Update state to show used
      setVerifiedReward(prev => prev ? {
        ...prev,
        isAlreadyUsed: true,
        reward: {
          ...prev.reward,
          used: true,
          usedAt: Date.now()
        }
      } : null);

    } catch (err) {
      console.error("Error consuming code:", err);
      triggerShake();
      alert("حدث خطأ أثناء تسجيل استهلاك الكود. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsConsuming(false);
    }
  };

  // Paste from clipboard helper
  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setManualCode(text.trim().toUpperCase());
      }
    } catch (err) {
      console.info("Clipboard paste permission required");
    }
  };

  // Reset for next scan
  const handleResetForNextScan = () => {
    setVerifiedReward(null);
    setLookupError(null);
    setConsumeSuccess(false);
    setManualCode('');
    if (activeTab === 'scan') {
      startScanner();
    }
  };

  // Determine Screen Dynamic Theme State: 'blue' (default) | 'green' (valid active code) | 'yellow' (consumed successfully) | 'red' (already consumed / invalid / error)
  const screenTheme: 'blue' | 'green' | 'yellow' | 'red' = (() => {
    if (consumeSuccess) return 'yellow';
    if (verifiedReward) {
      if (!verifiedReward.isOwnedByMerchant || verifiedReward.isAlreadyUsed || verifiedReward.isExpired) {
        return 'red';
      }
      return 'green';
    }
    if (lookupError) return 'red';
    return 'blue';
  })();

  const isBlueState = screenTheme === 'blue';
  const isGreenState = screenTheme === 'green';
  const isYellowState = screenTheme === 'yellow';
  const isRedState = screenTheme === 'red';

  return (
    <div 
      className={cn(
        "min-h-screen text-white flex flex-col justify-between transition-colors duration-500 selection:bg-white selection:text-stone-900",
        isBlueState && "bg-gradient-to-b from-[#071a38] via-[#0d2a58] to-[#041124]",
        isGreenState && "bg-gradient-to-b from-[#032a15] via-[#074724] to-[#02160b]",
        isYellowState && "bg-gradient-to-b from-[#332003] via-[#543806] to-[#1f1301]",
        isRedState && "bg-gradient-to-b from-[#3a0707] via-[#500c0c] to-[#1e0303]",
        shakeScreen && "animate-scanner-shake"
      )} 
      dir="rtl"
    >
      {/* Dynamic Background Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {isBlueState && (
          <>
            <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] bg-blue-500/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-[5%] left-[-10%] w-[320px] h-[320px] bg-cyan-500/15 rounded-full blur-[100px]" />
          </>
        )}
        {isGreenState && (
          <>
            <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] bg-emerald-500/30 rounded-full blur-[100px]" />
            <div className="absolute bottom-[5%] left-[-10%] w-[320px] h-[320px] bg-teal-400/25 rounded-full blur-[100px]" />
          </>
        )}
        {isYellowState && (
          <>
            <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] bg-amber-500/35 rounded-full blur-[100px]" />
            <div className="absolute bottom-[5%] left-[-10%] w-[320px] h-[320px] bg-yellow-400/25 rounded-full blur-[100px]" />
          </>
        )}
        {isRedState && (
          <>
            <div className="absolute top-[-10%] right-[-10%] w-[350px] h-[350px] bg-rose-600/35 rounded-full blur-[100px]" />
            <div className="absolute bottom-[5%] left-[-10%] w-[320px] h-[320px] bg-red-500/25 rounded-full blur-[100px]" />
          </>
        )}
      </div>
      
      {/* 1. Sleek Minimal Header */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-black/25 border-b border-white/10 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          
          {/* Status Indicator */}
          <div className="flex items-center gap-2">
            <span className={cn(
              "w-2.5 h-2.5 rounded-full animate-ping",
              isBlueState && "bg-cyan-400",
              isGreenState && "bg-emerald-400",
              isYellowState && "bg-amber-400",
              isRedState && "bg-rose-400"
            )} />
            <div className="text-right">
              <h1 className="text-sm font-black text-white tracking-wide">
                ماسح كودات الخصم
              </h1>
              <span className={cn(
                "text-[10px] font-bold block transition-colors leading-tight",
                isBlueState && "text-cyan-300",
                isGreenState && "text-emerald-300",
                isYellowState && "text-amber-300",
                isRedState && "text-rose-300"
              )}>
                {isYellowState ? 'تم استهلاك الخصم بنجاح' : isGreenState ? 'تم التحقق بنجاح • كود فعال' : isRedState ? 'تنبيه • كود مستهلك أو غير مطابق' : 'نظام التحقق الذكي للمحلات'}
              </span>
            </div>
          </div>

          {/* Active Store Count Badge */}
          <div className="bg-white/15 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 text-[11px] font-black text-white flex items-center gap-1.5 shadow-sm">
            <Store className="h-3.5 w-3.5 text-white shrink-0" />
            <span className="hidden sm:inline">
              {activeBusinesses.length === 1 ? activeBusinesses[0].name : `${activeBusinesses.length} محلات`}
            </span>
            <span className="sm:hidden font-mono">
              {activeBusinesses.length}
            </span>
          </div>
        </div>
      </header>

      {/* Hidden File Input for QR Image Scan */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        className="hidden"
        onChange={handleScanImageFile}
      />

      {/* 2. Main Content Area */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-center z-10 relative">

        {/* TAB 1: Camera Scanner */}
        {activeTab === 'scan' && !verifiedReward && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3.5 my-auto w-full">
            
            {/* Viewfinder Frame */}
            <div className={cn(
              "relative w-full aspect-square max-w-[320px] rounded-[32px] overflow-hidden bg-black/80 border-2 shadow-2xl flex items-center justify-center transition-all",
              isBlueState && "border-cyan-400/50 shadow-cyan-950/60",
              isGreenState && "border-emerald-400/60 shadow-emerald-950/70",
              isRedState && "border-rose-500/70 shadow-rose-950/70"
            )}>
              
              {/* HTML5 QR Container */}
              <div id="merchant-qr-reader-full" className="w-full h-full overflow-hidden" />

              {/* Viewfinder Visual Overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
                
                {/* Top brackets */}
                <div className="w-full flex justify-between">
                  <div className={cn(
                    "w-8 h-8 border-t-4 border-r-4 rounded-tr-xl transition-colors",
                    isBlueState && "border-cyan-400",
                    isGreenState && "border-emerald-400",
                    isRedState && "border-rose-400"
                  )} />
                  <div className={cn(
                    "w-8 h-8 border-t-4 border-l-4 rounded-tl-xl transition-colors",
                    isBlueState && "border-cyan-400",
                    isGreenState && "border-emerald-400",
                    isRedState && "border-rose-400"
                  )} />
                </div>

                {/* Laser animation bar */}
                {isScanning && (
                  <div className={cn(
                    "w-4/5 h-0.5 animate-laser-scan absolute left-1/2 -translate-x-1/2 shadow-lg transition-all",
                    isBlueState && "bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#38bdf8]",
                    isGreenState && "bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#34d399]",
                    isRedState && "bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_15px_#f43f5e]"
                  )} />
                )}

                {/* Bottom brackets */}
                <div className="w-full flex justify-between">
                  <div className={cn(
                    "w-8 h-8 border-b-4 border-r-4 rounded-br-xl transition-colors",
                    isBlueState && "border-cyan-400",
                    isGreenState && "border-emerald-400",
                    isRedState && "border-rose-400"
                  )} />
                  <div className={cn(
                    "w-8 h-8 border-b-4 border-l-4 rounded-bl-xl transition-colors",
                    isBlueState && "border-cyan-400",
                    isGreenState && "border-emerald-400",
                    isRedState && "border-rose-400"
                  )} />
                </div>
              </div>

              {/* Camera Error Fallback */}
              {cameraError && (
                <div className="absolute inset-0 bg-stone-900/95 p-5 flex flex-col items-center justify-center text-center space-y-3 z-10 backdrop-blur-md">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-lg">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white">
                      {cameraError === 'permission_denied' 
                        ? 'إذن الكاميرا محظور أو غير متاح' 
                        : 'تعذر تشغيل كاميرا الماسح'}
                    </h4>
                    <p className="text-[11px] text-stone-300 font-medium leading-relaxed mt-1 max-w-[240px] mx-auto">
                      {cameraError === 'permission_denied'
                        ? 'يبدو أن إذن الكاميرا محظور في المتصفح. يمكنك إدخال الكود يدوياً، أو مسح صورة الرمز مباشرة.'
                        : 'حدث خطأ أثناء تشغيل الكاميرا. يرجى المحاولة مجدداً أو كتابة الكود يدوياً.'}
                    </p>
                  </div>

                  <div className="w-full space-y-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('manual')}
                      className="w-full py-2.5 px-3 bg-white text-stone-900 hover:bg-stone-100 rounded-xl text-xs font-black shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <Keyboard className="h-4 w-4 text-blue-600" />
                      <span>إدخال الكود يدوياً</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 px-3 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold border border-white/20 cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                    >
                      <ImageIcon className="h-4 w-4 text-cyan-300" />
                      <span>مسح من صورة أو لقطة شاشة</span>
                    </button>

                    <div className="flex items-center justify-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={startScanner}
                        className="text-[11px] text-cyan-300 hover:text-white font-medium cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>إعادة المحاولة</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Back Button (Pill shaped, White, Width of Scanner Box, Icon only) */}
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="الرجوع"
              title="الرجوع"
              className="w-full max-w-[320px] h-12 rounded-full bg-white hover:bg-stone-100 text-stone-900 flex items-center justify-center shadow-xl hover:shadow-2xl transition-all active:scale-95 cursor-pointer border border-white/80 shrink-0"
            >
              <ArrowRight className="h-6 w-6 text-stone-900" />
            </button>

            {/* 4 Iconic Circular White Buttons Below the Back Button */}
            <div className="w-full max-w-[320px] grid grid-cols-4 gap-3">
              
              {/* Button 1: الصوت (Sound Toggle) */}
              <button
                type="button"
                onClick={() => setSoundEnabled(prev => !prev)}
                className={cn(
                  "w-full aspect-square rounded-full bg-white hover:bg-stone-100 text-stone-900 shadow-xl hover:shadow-2xl transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-white/80",
                  !soundEnabled && "opacity-75"
                )}
                aria-label={soundEnabled ? "كتم الصوت" : "تشغيل الصوت"}
                title={soundEnabled ? "كتم الصوت" : "تشغيل الصوت"}
              >
                {soundEnabled ? (
                  <Volume2 className="h-6 w-6 text-stone-900" />
                ) : (
                  <VolumeX className="h-6 w-6 text-stone-400" />
                )}
              </button>

              {/* Button 2: تبديل الكاميرا (Camera Switch) */}
              <button
                type="button"
                onClick={toggleCamera}
                className="w-full aspect-square rounded-full bg-white hover:bg-stone-100 text-stone-900 shadow-xl hover:shadow-2xl transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-white/80"
                aria-label="تبديل الكاميرا (أمامية / خلفية)"
                title="تبديل الكاميرا (أمامية / خلفية)"
              >
                <SwitchCamera className="h-6 w-6 text-stone-900" />
              </button>

              {/* Button 3: التبديل بين مسح رمز وإدخال الكود يدوي (Switch QR / Manual) */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('manual');
                  setLookupError(null);
                  stopScanner();
                }}
                className="w-full aspect-square rounded-full bg-white hover:bg-stone-100 text-stone-900 shadow-xl hover:shadow-2xl transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-white/80"
                aria-label="التبديل إلى الإدخال اليدوي للكود"
                title="التبديل إلى الإدخال اليدوي للكود"
              >
                <Keyboard className="h-6 w-6 text-stone-900" />
              </button>

              {/* Button 4: مسح من صورة أو لقطة شاشة (Scan from Image) */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-square rounded-full bg-white hover:bg-stone-100 text-stone-900 shadow-xl hover:shadow-2xl transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-white/80"
                aria-label="مسح رمز QR من صورة أو لقطة شاشة"
                title="مسح رمز QR من صورة أو لقطة شاشة"
              >
                <ImageIcon className="h-6 w-6 text-stone-900" />
              </button>

            </div>
          </div>
        )}

        {/* TAB 2: Manual Code Input */}
        {activeTab === 'manual' && !verifiedReward && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3.5 my-auto w-full">
            
            <div className="w-full max-w-[320px] bg-white/10 backdrop-blur-xl p-5 rounded-[28px] border border-white/15 shadow-xl space-y-4">
              <div>
                <label className="block text-xs font-bold text-white mb-2 text-right">
                  أدخل رمز الخصم المكتوب على كوبون العميل:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    placeholder="مثال: ALBARAKA-15-X9Y2"
                    className="w-full pl-20 pr-4 py-3.5 bg-black/40 border border-white/20 focus:border-cyan-400 rounded-2xl text-white font-mono font-black text-xs sm:text-sm tracking-widest outline-none transition-all placeholder:text-white/40 placeholder:tracking-normal text-center"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck="false"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleProcessCode(manualCode);
                      }
                    }}
                  />
                  
                  {/* Paste button inside input */}
                  <button
                    type="button"
                    onClick={handlePasteCode}
                    className="absolute inset-y-1.5 left-1.5 px-3 bg-white text-stone-900 hover:bg-stone-100 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm"
                  >
                    <ClipboardCheck className="h-3.5 w-3.5 text-blue-600" />
                    <span>لصق</span>
                  </button>
                </div>
              </div>

              {/* Verify button */}
              <button
                type="button"
                onClick={() => handleProcessCode(manualCode)}
                disabled={!manualCode.trim() || isSearching}
                className="w-full py-3.5 bg-white text-stone-900 hover:bg-stone-100 disabled:bg-white/20 disabled:text-white/40 rounded-2xl text-sm font-black transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed active:scale-95"
              >
                {isSearching ? (
                  <span className="inline-block w-5 h-5 border-2 border-stone-400 border-t-stone-900 rounded-full animate-spin" />
                ) : (
                  <>
                    <Search className="h-4 w-4 text-blue-600" />
                    <span>التحقق من الكود الذكي</span>
                  </>
                )}
              </button>
            </div>

            {/* Back Button (Pill shaped, White, Width of Scanner Box, Icon only) */}
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="الرجوع"
              title="الرجوع"
              className="w-full max-w-[320px] h-12 rounded-full bg-white hover:bg-stone-100 text-stone-900 flex items-center justify-center shadow-xl hover:shadow-2xl transition-all active:scale-95 cursor-pointer border border-white/80 shrink-0"
            >
              <ArrowRight className="h-6 w-6 text-stone-900" />
            </button>

            {/* 4 Iconic Circular White Buttons Below the Back Button */}
            <div className="w-full max-w-[320px] grid grid-cols-4 gap-3">
              
              {/* Button 1: الصوت (Sound Toggle) */}
              <button
                type="button"
                onClick={() => setSoundEnabled(prev => !prev)}
                className={cn(
                  "w-full aspect-square rounded-full bg-white hover:bg-stone-100 text-stone-900 shadow-xl hover:shadow-2xl transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-white/80",
                  !soundEnabled && "opacity-75"
                )}
                aria-label={soundEnabled ? "كتم الصوت" : "تشغيل الصوت"}
                title={soundEnabled ? "كتم الصوت" : "تشغيل الصوت"}
              >
                {soundEnabled ? (
                  <Volume2 className="h-6 w-6 text-stone-900" />
                ) : (
                  <VolumeX className="h-6 w-6 text-stone-400" />
                )}
              </button>

              {/* Button 2: تبديل الكاميرا (Camera Switch) */}
              <button
                type="button"
                onClick={toggleCamera}
                className="w-full aspect-square rounded-full bg-white hover:bg-stone-100 text-stone-900 shadow-xl hover:shadow-2xl transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-white/80"
                aria-label="تبديل الكاميرا (أمامية / خلفية)"
                title="تبديل الكاميرا (أمامية / خلفية)"
              >
                <SwitchCamera className="h-6 w-6 text-stone-900" />
              </button>

              {/* Button 3: التبديل إلى مسح الكاميرا */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('scan');
                  setLookupError(null);
                  startScanner();
                }}
                className="w-full aspect-square rounded-full bg-white hover:bg-stone-100 text-stone-900 shadow-xl hover:shadow-2xl transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-white/80"
                aria-label="التبديل إلى مسح رمز QR بالكاميرا"
                title="التبديل إلى مسح رمز QR بالكاميرا"
              >
                <QrCode className="h-6 w-6 text-stone-900" />
              </button>

              {/* Button 4: مسح من صورة أو لقطة شاشة (Scan from Image) */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-square rounded-full bg-white hover:bg-stone-100 text-stone-900 shadow-xl hover:shadow-2xl transition-all active:scale-95 cursor-pointer flex items-center justify-center border border-white/80"
                aria-label="مسح رمز QR من صورة أو لقطة شاشة"
                title="مسح رمز QR من صورة أو لقطة شاشة"
              >
                <ImageIcon className="h-6 w-6 text-stone-900" />
              </button>

            </div>

            {/* Quick store list */}
            {activeBusinesses.length > 0 && (
              <div className="w-full max-w-[320px] bg-black/20 backdrop-blur-md p-3.5 rounded-2xl border border-white/10 mt-2">
                <span className="text-[10px] font-bold text-white/70 block mb-1.5 text-right">
                  محلاتك المفعّلة المسجلة في هذا الجهاز:
                </span>
                <div className="space-y-1.5">
                  {activeBusinesses.map(biz => (
                    <div key={biz.id} className="flex items-center justify-between text-xs bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
                      <span className="font-bold text-white text-[11px] truncate max-w-[180px]">{biz.name}</span>
                      <span className="text-cyan-300 font-black text-xs">%{biz.giftCodeDiscountPercent || 15} خصم</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lookup Error Message */}
        {lookupError && !verifiedReward && (
          <div className="my-4 p-4 rounded-2xl bg-rose-950/80 border-2 border-rose-500 text-rose-200 text-xs font-bold flex items-center gap-3 text-right shadow-xl animate-in fade-in">
            <XCircle className="h-6 w-6 text-rose-400 shrink-0" />
            <div className="flex-1">
              <span>{lookupError}</span>
            </div>
            <button
              type="button"
              onClick={handleResetForNextScan}
              className="px-3 py-1 bg-white text-stone-900 rounded-xl text-[11px] font-black shrink-0 cursor-pointer hover:bg-stone-100"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* 3. VERIFIED REWARD RESULT CARD (YELLOW ON CONSUMPTION, GREEN ON VALID, RED ON ALREADY CONSUMED) */}
        {verifiedReward && (
          <div className="flex-1 flex flex-col justify-start space-y-4 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Ownership Check Banner */}
            {!verifiedReward.isOwnedByMerchant ? (
              /* ALIEN STORE WARNING: Code belongs to ANOTHER business */
              <div className="bg-rose-950/80 border-2 border-rose-500 p-5 rounded-3xl text-right space-y-3 shadow-2xl">
                <div className="flex items-center gap-3 text-rose-300">
                  <AlertTriangle className="h-7 w-7 text-rose-400 shrink-0" />
                  <div>
                    <h3 className="text-base font-black text-white">
                      هذا الكود مخصص لمحل آخر!
                    </h3>
                    <p className="text-xs text-rose-200 font-bold mt-0.5">
                      كود الخصم هذا صادر لمحل: <span className="underline font-black text-white">{verifiedReward.reward.businessName || 'منشأة أخرى'}</span>
                    </p>
                  </div>
                </div>

                <p className="text-xs text-rose-100 font-medium leading-relaxed bg-black/30 p-3.5 rounded-2xl border border-rose-500/40">
                  لا يمكنك قبول أو استهلاك هذا الكود لأنه ليس مخصصاً لأي من محلاتك أو فروعك المسجلة في حسابك. يرجى إبلاغ العميل بمراجعة المحل المكتوب في الكوبون.
                </p>

                <button
                  type="button"
                  onClick={handleResetForNextScan}
                  className="w-full py-3 bg-white text-stone-900 hover:bg-stone-100 rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md"
                >
                  مسح كود آخر
                </button>
              </div>
            ) : consumeSuccess ? (
              /* 🟡 YELLOW / GOLDEN SUCCESS CARD: Newly Consumed Code */
              <div className="bg-amber-950/70 border-2 border-amber-400 p-6 rounded-[32px] text-right space-y-5 shadow-2xl shadow-amber-950/80 backdrop-blur-xl relative overflow-hidden animate-in fade-in zoom-in-95">
                
                {/* Golden Celebration Header */}
                <div className="flex items-center justify-between pb-3 border-b border-amber-400/20">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center shrink-0 shadow-lg font-black text-xl">
                      <Sparkles className="h-6 w-6 text-amber-950 fill-amber-950" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-amber-300 block uppercase tracking-wider">
                        عملية ناجحة ومكتملة
                      </span>
                      <h3 className="text-base font-black text-white">
                        تم استهلاك الخصم بنجاح!
                      </h3>
                    </div>
                  </div>

                  <span className="text-[11px] font-black px-3 py-1 rounded-full bg-amber-400 text-amber-950 shadow-md flex items-center gap-1">
                    <Check className="h-3.5 w-3.5 text-amber-950 stroke-[3]" />
                    <span>تم الخصم الآن</span>
                  </span>
                </div>

                {/* Big Golden Discount Display */}
                <div className="p-4 rounded-2xl bg-black/40 border border-amber-400/40 flex items-center justify-between shadow-inner">
                  <div>
                    <span className="text-xs text-amber-200/80 font-bold block mb-0.5">قيمة الخصم المطبّقة:</span>
                    <span className="text-3xl font-black text-amber-300">
                      %{verifiedReward.reward.discountPercent} خصم
                    </span>
                    <span className="block text-[11px] text-amber-200 font-bold mt-0.5">
                      تم احتساب وتطبيق الخصم للزبون بنجاح
                    </span>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-amber-400 text-amber-950 border border-amber-300 flex items-center justify-center font-black text-2xl shadow-md">
                    %
                  </div>
                </div>

                {/* Consumption Details Breakdown */}
                <div className="space-y-2.5 bg-black/30 p-4 rounded-2xl border border-white/10 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">رمز الكود المستهلك:</span>
                    <span className="font-mono font-black text-amber-300 text-sm bg-white/15 px-2.5 py-0.5 rounded-lg border border-amber-400/30">
                      {verifiedReward.reward.code}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-white/70">المحل المعتمد:</span>
                    <span className="font-bold text-white">
                      {verifiedReward.matchedBusiness?.name || verifiedReward.reward.businessName}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-white/70">وقت وتاريخ الاستهلاك:</span>
                    <span className="font-bold text-amber-200">
                      الآن • {new Date().toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-white/10">
                    <span className="text-white/70">حالة الكود الآن:</span>
                    <span className="font-black text-amber-950 bg-amber-400 px-2.5 py-0.5 rounded-md shadow-sm">
                      مستهلك ومغلق
                    </span>
                  </div>
                </div>

                {/* Primary Action Button to Scan Next */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleResetForNextScan}
                    className="w-full py-4 bg-white hover:bg-stone-100 text-stone-950 rounded-2xl text-sm font-black transition-all cursor-pointer shadow-xl shadow-amber-950/80 flex items-center justify-center gap-2 active:scale-95"
                  >
                    <RefreshCw className="h-4 w-4 text-amber-700" />
                    <span>مسح كود جديد</span>
                  </button>
                </div>
              </div>
            ) : verifiedReward.isAlreadyUsed ? (
              /* 🔴 RED CARD: Already Used / Consumed Code Scanned */
              <div className="p-5 rounded-[32px] text-right space-y-4 shadow-2xl relative overflow-hidden transition-all backdrop-blur-xl border-2 bg-rose-950/70 border-rose-500 shadow-rose-950/70 animate-in fade-in">
                
                {/* CONSUMED ALERT BANNER */}
                <div className="bg-rose-600 border-2 border-white p-4 rounded-2xl flex items-center gap-3 text-right shadow-xl">
                  <XCircle className="h-7 w-7 text-white shrink-0" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-white">
                        كود مستهلك مسبقاً!
                      </h4>
                      <span className="text-[10px] font-black bg-white text-rose-700 px-2.5 py-0.5 rounded-full shadow-sm">
                        غير صالح للصرف
                      </span>
                    </div>
                    <p className="text-xs text-rose-100 font-bold mt-1">
                      {verifiedReward.reward.usedAt 
                        ? `تم صرف واستهلاك هذا الكود مسبقاً بتاريخ ${new Date(verifiedReward.reward.usedAt).toLocaleDateString('ar-JO')} الساعة ${new Date(verifiedReward.reward.usedAt).toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' })}`
                        : 'تم استخدام هذا الكود مسبقاً ولا يمكن قبوله أو صرفه مجدداً.'}
                    </p>
                  </div>
                </div>

                {/* Store Identity Badge */}
                <div className="flex items-center justify-between pb-3 border-b border-white/15">
                  <div className="flex items-center gap-2.5">
                    <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-lg border border-white/20">
                      <Store className="h-6 w-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-rose-200 block">
                        المحل المعتمد للكوبون
                      </span>
                      <h3 className="text-sm font-black text-white">
                        {verifiedReward.matchedBusiness?.name || verifiedReward.reward.businessName}
                      </h3>
                    </div>
                  </div>

                  <span className="text-[11px] font-black px-3 py-1 rounded-full border shadow-sm flex items-center gap-1 bg-rose-900/80 text-white border-rose-400">
                    <XCircle className="h-3.5 w-3.5 text-white" />
                    <span>مستهلك مسبقاً</span>
                  </span>
                </div>

                {/* Crossed Out Discount Percentage */}
                <div className="p-4 rounded-2xl bg-black/40 border border-rose-500/40 flex items-center justify-between shadow-inner">
                  <div>
                    <span className="text-xs text-white/70 font-bold block mb-0.5">قيمة الخصم:</span>
                    <span className="text-3xl font-black text-rose-300 line-through opacity-75">
                      %{verifiedReward.reward.discountPercent} خصم
                    </span>
                    <span className="block text-[11px] text-rose-200 font-bold mt-0.5">
                      (هذا الكود تم صرفه بالفعل ولا يمكن تكراره)
                    </span>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-rose-600/30 border border-rose-400 text-rose-200 flex items-center justify-center font-black text-2xl shadow-md">
                    %
                  </div>
                </div>

                {/* Code Details */}
                <div className="space-y-2 bg-black/30 p-3.5 rounded-2xl border border-white/10 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">رمز الكود:</span>
                    <span className="font-mono font-black text-white text-sm bg-white/15 px-2.5 py-0.5 rounded-lg border border-white/20">
                      {verifiedReward.reward.code}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-white/70">حالة الكود:</span>
                    <span className="font-black text-white bg-rose-600 px-2.5 py-1 rounded-lg border border-rose-400 flex items-center gap-1 shadow-sm">
                      <XCircle className="h-3.5 w-3.5" />
                      <span>مستهلك مسبقاً</span>
                    </span>
                  </div>
                </div>

                {/* Action button */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleResetForNextScan}
                    className="w-full py-3.5 bg-white text-stone-900 hover:bg-stone-100 rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <RefreshCw className="h-4 w-4 text-stone-700" />
                    <span>مسح كود آخر</span>
                  </button>
                </div>
              </div>
            ) : verifiedReward.isExpired ? (
              /* ⚠️ EXPIRED CARD */
              <div className="p-5 rounded-[32px] text-right space-y-4 shadow-2xl relative overflow-hidden backdrop-blur-xl border-2 bg-amber-950/70 border-amber-500 shadow-amber-950/60">
                <div className="p-3.5 rounded-2xl bg-amber-900/80 border border-amber-500 text-center space-y-2 shadow-md">
                  <p className="text-xs text-amber-200 font-bold">
                    انتهت صلاحية هذا الكود في تاريخ {new Date(verifiedReward.reward.expiresAt).toLocaleDateString('ar-JO')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetForNextScan}
                  className="w-full py-3 bg-white text-stone-900 hover:bg-stone-100 rounded-2xl text-xs font-black transition-all cursor-pointer"
                >
                  مسح كود آخر
                </button>
              </div>
            ) : (
              /* 🟢 GREEN CARD: Valid Active Code Ready to Consume */
              <div className="bg-emerald-950/70 border-2 border-emerald-400 p-6 rounded-[32px] text-right space-y-5 shadow-2xl shadow-emerald-950/80 backdrop-blur-xl relative overflow-hidden animate-in fade-in zoom-in-95">
                
                {/* Store Identity & Verification Header */}
                <div className="flex items-center justify-between pb-3 border-b border-emerald-400/20">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-400 text-emerald-950 flex items-center justify-center shrink-0 shadow-lg font-black text-xl border border-emerald-300">
                      <Store className="h-6 w-6 text-emerald-950" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-emerald-300 block uppercase tracking-wider">
                        المحل المعتمد للكوبون
                      </span>
                      <h3 className="text-base font-black text-white leading-snug">
                        {verifiedReward.matchedBusiness?.name || verifiedReward.reward.businessName}
                      </h3>
                    </div>
                  </div>

                  <span className="text-[11px] font-black px-3.5 py-1.5 rounded-full bg-emerald-400 text-emerald-950 shadow-md flex items-center gap-1.5 border border-emerald-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-950 stroke-[2.5]" />
                    <span>جاهز للاستهلاك</span>
                  </span>
                </div>

                {/* Big Luminous Discount Percentage Box */}
                <div className="p-4 rounded-2xl bg-black/40 border border-emerald-400/40 flex items-center justify-between shadow-inner">
                  <div>
                    <span className="text-xs text-emerald-200/80 font-bold block mb-0.5">قيمة الخصم المعتمدة:</span>
                    <span className="text-3xl font-black text-emerald-300">
                      %{verifiedReward.reward.discountPercent} خصم
                    </span>
                    <span className="block text-[11px] text-emerald-200 font-bold mt-0.5">
                      كود أصلي وفعال، يرجى تطبيق الخصم للزبون
                    </span>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-emerald-400 text-emerald-950 border border-emerald-300 flex items-center justify-center font-black text-2xl shadow-md">
                    %
                  </div>
                </div>

                {/* Code Details Table */}
                <div className="space-y-2.5 bg-black/30 p-4 rounded-2xl border border-white/10 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-white/70">رمز الكود:</span>
                    <span className="font-mono font-black text-emerald-300 text-sm bg-white/15 px-2.5 py-0.5 rounded-lg border border-emerald-400/30">
                      {verifiedReward.reward.code}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-white/70">المحل المعتمد:</span>
                    <span className="font-bold text-white">
                      {verifiedReward.matchedBusiness?.name || verifiedReward.reward.businessName}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-white/70">تاريخ انتهاء الصلاحية:</span>
                    <span className="font-bold text-emerald-200">
                      {new Date(verifiedReward.reward.expiresAt).toLocaleDateString('ar-JO')}
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-1 border-t border-white/10">
                    <span className="text-white/70">حالة الكود:</span>
                    <span className="font-black text-emerald-950 bg-emerald-400 px-2.5 py-0.5 rounded-md shadow-sm">
                      صالح وجاهز للصرف
                    </span>
                  </div>
                </div>

                {/* Ready to Consume Primary Action Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={handleConfirmConsume}
                    disabled={isConsuming}
                    className="w-full py-4 bg-white hover:bg-stone-100 text-stone-950 rounded-2xl text-sm font-black transition-all shadow-xl shadow-emerald-950/80 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    {isConsuming ? (
                      <span className="inline-block w-5 h-5 border-2 border-stone-400 border-t-stone-950 rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                        <span>تأكيد استهلاك الخصم (%{verifiedReward.reward.discountPercent})</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleResetForNextScan}
                    className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-white/15"
                  >
                    إلغاء والعودة للمسح
                  </button>
                </div>

              </div>
            )}
          </div>
        )}

      </main>

      {/* 5. Minimal Footer */}
      <footer className="p-3 text-center text-[10px] text-white/50 border-t border-white/10 z-10 relative">
        منصة شو في إربد • قارئ وماسح الكوبونات المعتمد للمحلات
      </footer>

    </div>
  );
}
export default MerchantScannerPage;
