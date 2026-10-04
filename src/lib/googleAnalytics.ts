export function initGoogleAnalytics(gaId?: string) {
  const measurementId = gaId || import.meta.env.VITE_GA_ID || "";
  if (!measurementId || typeof window === 'undefined') return;

  // Prevent multiple injections
  if (document.getElementById('ga-gtag-script')) return;

  try {
    const script = document.createElement('script');
    script.id = 'ga-gtag-script';
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);

    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) {
      (window as any).dataLayer.push(args);
    }
    (window as any).gtag = gtag;
    gtag('js', new Date());
    gtag('config', measurementId);
  } catch (error) {
    console.warn("Google Analytics failed to load:", error);
  }
}
