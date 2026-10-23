import { useState, useEffect } from 'react';

/**
 * Robust detection for tablet devices across all zoom levels and viewports.
 * Guarantees that the tablet version keeps its consistent tablet UI
 * whether viewed at 100% zoom, zoomed in (110%-200%), or zoomed out (75%-90%).
 */
export function checkIsTablet(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent.toLowerCase();

  // 1. iPad check (including modern iPadOS Safari which identifies as Macintosh with touch points)
  const isIPad = ua.includes('ipad') || (ua.includes('macintosh') && navigator.maxTouchPoints > 1);
  if (isIPad) return true;

  // 2. Android tablet check (Android without "mobile")
  const isAndroidTablet = ua.includes('android') && !ua.includes('mobile');
  if (isAndroidTablet) return true;

  // 3. Other known tablet UAs
  if (/tablet|playbook|silk/i.test(ua)) return true;

  // 4. Physical touch device with screen dimensions in tablet range:
  // Phones: min(screen.width, screen.height) is <= 480px.
  // Tablets: min(screen.width, screen.height) is >= 600px and <= 1024px.
  // Screen dimensions do NOT change when zooming in the browser.
  if (navigator.maxTouchPoints > 0) {
    const minDim = Math.min(window.screen.width, window.screen.height);
    const maxDim = Math.max(window.screen.width, window.screen.height);
    if (minDim >= 600 && minDim <= 1024 && maxDim <= 1400) {
      return true;
    }
  }

  // 5. Standard tablet viewport width at 100% zoom (768px to 1023px)
  if (window.innerWidth >= 768 && window.innerWidth < 1024) {
    return true;
  }

  // 6. Desktop browser resized to tablet window width, then zoomed:
  if (typeof window.outerWidth === 'number' && window.outerWidth >= 768 && window.outerWidth < 1024) {
    return true;
  }

  return false;
}

export function useIsTablet(): boolean {
  const [isTablet, setIsTablet] = useState<boolean>(() => {
    return checkIsTablet();
  });

  useEffect(() => {
    const update = () => {
      setIsTablet(checkIsTablet());
    };

    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return isTablet;
}
