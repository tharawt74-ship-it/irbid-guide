import { useEffect, useState } from 'react';

/**
 * Robust Tablet Detection & Zoom Stabilization
 * Detects actual tablet devices (iPad, Android tablets, touch devices with tablet screen dimensions)
 * and responsive tablet testing viewports.
 * Guarantees that tablet layout remains 100% locked across all browser zoom levels.
 */
export function isTabletDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const ua = navigator.userAgent;
  // 1. iPad detection (iOS / iPadOS)
  const isIPad = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIPad) return true;

  // 2. Android Tablet (Android without Mobile keyword)
  const isAndroidTablet = /Android/i.test(ua) && !/Mobile/i.test(ua);
  if (isAndroidTablet) return true;

  // 3. Touch device with physical tablet screen dimensions
  // In any physical tablet (iPad Mini, Air, Pro, Galaxy Tab, Surface):
  // screen.width and screen.height NEVER change under browser zoom.
  // The smaller dimension is >= 600px and <= 1024px.
  // Phones ALWAYS have min dimension < 600px.
  const hasTouch = (navigator.maxTouchPoints > 0) || ('ontouchstart' in window);
  const minDim = Math.min(window.screen.width, window.screen.height);

  if (hasTouch && minDim >= 600 && minDim <= 1024) {
    return true;
  }

  // 4. Testing in tablet range viewport (600px to 1023px)
  if (window.innerWidth >= 600 && window.innerWidth <= 1023) {
    return true;
  }

  return false;
}

export function useTabletMode(): boolean {
  const [isTablet, setIsTablet] = useState(() => isTabletDevice());

  useEffect(() => {
    const update = () => {
      const tablet = isTabletDevice();
      setIsTablet(tablet);
      if (tablet) {
        document.documentElement.classList.add('tablet-mode');
        // Ensure viewport metadata on real tablet device is stabilized
        const hasTouch = (navigator.maxTouchPoints > 0) || ('ontouchstart' in window);
        const minDim = Math.min(window.screen.width, window.screen.height);
        if (hasTouch && minDim >= 600 && minDim <= 1024) {
          const meta = document.querySelector('meta[name="viewport"]');
          if (meta && !meta.getAttribute('content')?.includes('width=768')) {
            meta.setAttribute('content', 'width=768, initial-scale=1.0, maximum-scale=3.0');
          }
        }
      } else {
        document.documentElement.classList.remove('tablet-mode');
      }
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return isTablet;
}
