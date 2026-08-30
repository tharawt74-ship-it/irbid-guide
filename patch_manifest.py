import re

with open('src/contexts/SystemSettingsContext.tsx', 'r') as f:
    content = f.read()

# find the loadSettings useEffect and insert our dynamic manifest code after it
dynamic_manifest_code = """  // Save current settings to Firestore"""

replacement = """  // Dynamically update site icon and PWA manifest when logoUrl changes
  useEffect(() => {
    if (!globalSettings.logoUrl) return;

    const logo = globalSettings.logoUrl;
    const siteName = globalSettings.siteName || "شو في بإربد";

    // Update standard favicon
    let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.href = logo;

    // Update Apple Touch Icon
    let appleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      document.head.appendChild(appleIcon);
    }
    appleIcon.href = logo;

    // Generate Dynamic Manifest for PWA
    const manifest = {
      name: siteName + " | الدليل الشامل",
      short_name: siteName,
      description: "دليل المحلات التجاري وسوق العمل والعروض",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#1a4d2e",
      orientation: "portrait-primary",
      dir: "rtl",
      lang: "ar",
      icons: [
        {
          src: logo,
          sizes: "192x192",
          type: "image/png",
          purpose: "any maskable"
        },
        {
          src: logo,
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable"
        }
      ]
    };

    const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const manifestUrl = URL.createObjectURL(manifestBlob);

    let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    } else {
      if (manifestLink.href.startsWith('blob:')) {
        URL.revokeObjectURL(manifestLink.href);
      }
    }
    manifestLink.href = manifestUrl;

    return () => {
      if (manifestUrl.startsWith('blob:')) {
        URL.revokeObjectURL(manifestUrl);
      }
    };
  }, [globalSettings.logoUrl, globalSettings.siteName]);

  // Save current settings to Firestore"""

content = content.replace(dynamic_manifest_code, replacement)

with open('src/contexts/SystemSettingsContext.tsx', 'w') as f:
    f.write(content)
