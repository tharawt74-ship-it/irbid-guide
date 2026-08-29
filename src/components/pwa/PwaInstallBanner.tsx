import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles, Check, Share, Monitor, ShieldCheck } from 'lucide-react';

export function triggerPwaInstallModal() {
  window.dispatchEvent(new CustomEvent('openPwaInstallModal'));
}

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [forceModalOpen, setForceModalOpen] = useState(false);

  useEffect(() => {
    // Check if already running in standalone mode (installed as PWA)
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsStandalone(true);
    }

    // Check if dismissed recently
    const isDismissed = localStorage.getItem('pwa_banner_dismissed');
    if (isDismissed) {
      const dismissedTime = parseInt(isDismissed, 10);
      if (Date.now() - dismissedTime < 3 * 24 * 60 * 60 * 1000) {
        setDismissed(true);
      }
    }

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Capture standard install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleCustomTrigger = () => {
      setForceModalOpen(true);
      setDismissed(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('openPwaInstallModal', handleCustomTrigger);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('openPwaInstallModal', handleCustomTrigger);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User installed the PWA');
      }
      setDeferredPrompt(null);
      setForceModalOpen(false);
    } else {
      setShowIosGuide(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setForceModalOpen(false);
    localStorage.setItem('pwa_banner_dismissed', Date.now().toString());
  };

  // Full Modal view when user explicitly clicks "تنزيل التطبيق" button anywhere
  if (forceModalOpen) {
    return (
      <div className="fixed inset-0 z-[100] bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" dir="rtl">
        <div className="bg-stone-900 text-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-stone-800 space-y-6 relative overflow-hidden">
          {/* Top subtle glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#1a4d2e]/40 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1a4d2e] to-emerald-700 text-white flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-lg">
                <Smartphone className="h-7 w-7 text-emerald-300" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-white">تنزيل تطبيق "شو في بإربد؟"</h3>
                  <span className="bg-emerald-500/20 text-emerald-400 text-xs font-black px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    مجاني 100%
                  </span>
                </div>
                <p className="text-xs text-stone-300 mt-1">
                  تطبيق الويب التفاعلي السريع (PWA) بدون الحاجة لمتجر تطبيقات!
                </p>
              </div>
            </div>

            <button
              onClick={() => setForceModalOpen(false)}
              className="text-stone-400 hover:text-white p-2 rounded-xl hover:bg-stone-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-stone-800/80 p-3 rounded-2xl border border-stone-700/60 flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-stone-200 font-bold">خفيف وسريع بدون مساحة</span>
            </div>
            <div className="bg-stone-800/80 p-3 rounded-2xl border border-stone-700/60 flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="text-stone-200 font-bold">تنبيهات فورية بالعروض</span>
            </div>
          </div>

          {/* Action Button */}
          {deferredPrompt ? (
            <button
              onClick={handleInstallClick}
              className="w-full bg-gradient-to-r from-[#1a4d2e] to-emerald-600 hover:from-[#143d24] hover:to-emerald-700 text-white font-black py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-xl text-sm cursor-pointer active:scale-98"
            >
              <Download className="h-5 w-5 text-emerald-300 animate-bounce" />
              <span>تثبيت التطبيق بنقرة واحدة الآن 📲</span>
            </button>
          ) : (
            <div className="space-y-4 pt-2 border-t border-stone-800">
              <h4 className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                <span>تعليمات تثبيت التطبيق على شاشة جهازك الرئيسية:</span>
              </h4>

              <div className="space-y-3 text-xs">
                {/* Android Chrome */}
                <div className="bg-stone-800/90 p-4 rounded-2xl border border-stone-700/80 space-y-1.5">
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>📱 أجهزة الأندرويد (Android - Chrome):</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-stone-300 text-[11px] leading-relaxed">
                    <li>اضغط على قائمة خيارات المتصفح الثلاث نقاط <span className="font-bold text-amber-400">⋮</span> في أعلى المتصفح.</li>
                    <li>اختر <span className="font-bold text-emerald-300">"تثبيت التطبيق"</span> أو <span className="font-bold text-emerald-300">"إضافة إلى الشاشة الرئيسية"</span>.</li>
                  </ol>
                </div>

                {/* iPhone Safari */}
                <div className="bg-stone-800/90 p-4 rounded-2xl border border-stone-700/80 space-y-1.5">
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>🍏 أجهزة الآيفون (iPhone - Safari):</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-stone-300 text-[11px] leading-relaxed">
                    <li>اضغط على زر المشاركة <Share className="inline h-3.5 w-3.5 text-sky-400 mx-0.5" /> في أسفل شاشة Safari.</li>
                    <li>اختر <span className="font-bold text-white">"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</span>.</li>
                    <li>اضغط <span className="font-bold text-emerald-400">"إضافة"</span> في الزاوية العلوية.</li>
                  </ol>
                </div>

                {/* Desktop Chrome */}
                <div className="bg-stone-800/90 p-4 rounded-2xl border border-stone-700/80 space-y-1.5">
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>💻 أجهزة الكمبيوتر (Desktop):</span>
                  </div>
                  <p className="text-[11px] text-stone-300 leading-relaxed">
                    انقر على أيقونة التثبيت <Monitor className="inline h-3.5 w-3.5 text-emerald-400 mx-1" /> الموجودة بجانب شريط العنوان (URL) في متصفح كروم أو إيدج.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setForceModalOpen(false)}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Floating bottom bar banner
  if (isStandalone || dismissed) return null;
  if (!deferredPrompt && !isIos) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300" dir="rtl">
      <div className="bg-stone-900/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-stone-800 flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#1a4d2e] flex items-center justify-center shrink-0 border border-emerald-500/30 shadow-inner">
              <Smartphone className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="text-sm font-black text-white">ثبّت تطبيق "شو في بإربد؟"</h4>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  تطبيق مجاني
                </span>
              </div>
              <p className="text-xs text-stone-300 mt-0.5 leading-tight">
                تصفح أسرع وإشعارات فورية بالعروض والوظائف على هاتفك.
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="text-stone-400 hover:text-white p-1 rounded-lg hover:bg-stone-800 transition-colors"
            title="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 pt-1 border-t border-stone-800">
          <button
            onClick={handleInstallClick}
            className="flex-1 bg-[#1a4d2e] hover:bg-[#143d24] text-white text-xs font-black py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer"
          >
            <Download className="h-4 w-4 text-emerald-400 animate-bounce" />
            <span>{isIos ? 'طريقة تثبيت التطبيق للـ iPhone' : 'تثبيت التطبيق على الجهاز الآن'}</span>
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-2.5 text-xs font-bold text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition-colors cursor-pointer"
          >
            لاحقاً
          </button>
        </div>

        {/* iOS Instruction Modal / Accordion */}
        {showIosGuide && (
          <div className="mt-2 p-3 bg-stone-800 rounded-xl text-xs space-y-2 border border-stone-700 animate-in fade-in">
            <div className="flex items-center justify-between text-emerald-400 font-bold">
              <span>خطوات التثبيت على الآيفون (iOS):</span>
              <button onClick={() => setShowIosGuide(false)} className="text-stone-400 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-stone-300 text-[11px] leading-relaxed">
              <li>اضغط على زر المشاركة <Share className="inline h-3 w-3 text-sky-400 mx-0.5" /> في أسفل شاشة Safari.</li>
              <li>اختر <span className="font-bold text-white">"إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</span>.</li>
              <li>اضغط <span className="font-bold text-emerald-400">"إضافة"</span> للوصول للتطبيق كأي تطبيق أساسي!</li>
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
