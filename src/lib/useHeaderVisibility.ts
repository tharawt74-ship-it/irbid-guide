import { useState, useEffect } from 'react';

/**
 * Hook to track whether the main site header is currently visible or hidden due to scrolling.
 * This allows page-level sticky headers (Products, Jobs, Housing) to dynamically adjust
 * their `top` position so that when the main site header slides down upon scrolling up,
 * it smoothly pushes the page's sticky bar down rather than covering it.
 */
export function useHeaderVisibility(): boolean {
  const [showHeader, setShowHeader] = useState<boolean>(true);

  useEffect(() => {
    const handleHeaderVisibility = (e: Event) => {
      const customEvent = e as CustomEvent<{ visible: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.visible === 'boolean') {
        setShowHeader(customEvent.detail.visible);
      }
    };

    window.addEventListener('app-header-visibility', handleHeaderVisibility);

    let lastY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY;
          if (window.innerWidth < 1024) {
            if (currentY > lastY && currentY > 80) {
              setShowHeader(false);
            } else if (currentY < lastY || currentY <= 40) {
              setShowHeader(true);
            }
          } else {
            setShowHeader(true);
          }
          lastY = currentY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('app-header-visibility', handleHeaderVisibility);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return showHeader;
}
