import React, { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'profile' | 'place' | 'business.business';
  schemaData?: Record<string, any> | Array<Record<string, any>>;
  author?: string;
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description = 'دليل إربد الشامل: اكتشف أفضل مطاعم، كافيهات، محلات تجارية، وظائف شاغرة، عروض وخصومات، سكنات طلابية، مواصلات، وأماكن سياحية في محافظة إربد وعروس الشمال.',
  keywords = [
    'إربد', 'اربد', 'دليل إربد', 'مطاعم إربد', 'كافيهات إربد', 'محلات إربد', 
    'سوق إربد', 'وظائف إربد', 'سكنات إربد', 'عروض إربد', 'جامعة اليرموك', 
    'جامعة العلوم والتكنولوجيا', 'شارع الجامعة إربد', 'عروس الشمال', 
    'مواصلات إربد', 'أم قيس', 'أطباء إربد', 'صيدليات إربد'
  ],
  canonicalUrl,
  ogImage = 'https://shofibirbid.site/ogimage.jpg',
  ogType = 'website',
  schemaData,
  author = 'شو في بإربد (ShofiBIrbid)'
}) => {
  const fullTitle = title 
    ? `${title} | شو في بإربد - الدليل الشامل لمحافظة إربد`
    : 'شو في بإربد؟ | الدليل الشامل لمحافظة إربد (مطاعم، محلات، وظائف، سكنات، عروض)';

  useEffect(() => {
    // 1. Update Title
    document.title = fullTitle;

    // Helper to set or update meta tags
    const setMetaTag = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attr}="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attr, name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // 2. Standard Meta
    setMetaTag('description', description);
    setMetaTag('keywords', keywords.join(', '));
    setMetaTag('author', author);
    setMetaTag('geo.region', 'JO-IR');
    setMetaTag('geo.placename', 'Irbid, Jordan');
    setMetaTag('geo.position', '32.5568;35.8469');
    setMetaTag('ICBM', '32.5568, 35.8469');
    setMetaTag('robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');

    // 3. OpenGraph / Social Meta
    const resolvedOgImage = ogImage.startsWith('http')
      ? ogImage
      : (typeof window !== 'undefined'
          ? `${window.location.origin}${ogImage.startsWith('/') ? '' : '/'}${ogImage}`
          : `https://shofibirbid.site/${ogImage.startsWith('/') ? ogImage.slice(1) : ogImage}`);

    setMetaTag('og:title', fullTitle, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:type', ogType, true);
    setMetaTag('og:image', resolvedOgImage, true);
    setMetaTag('og:image:secure_url', resolvedOgImage, true);
    if (resolvedOgImage.includes('ogimage.jpg')) {
      setMetaTag('og:image:type', 'image/jpeg', true);
      setMetaTag('og:image:width', '1376', true);
      setMetaTag('og:image:height', '768', true);
      setMetaTag('og:image:alt', fullTitle, true);
    }
    setMetaTag('og:site_name', 'شو في بإربد - الدليل الشامل لمدينة إربد', true);
    setMetaTag('og:locale', 'ar_JO', true);
    
    const resolvedCanonical = canonicalUrl || (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '');
    if (resolvedCanonical) {
      setMetaTag('og:url', resolvedCanonical, true);
    }

    // 4. Twitter Card Meta
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', fullTitle);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', resolvedOgImage);

    // 5. Canonical Link
    let linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (resolvedCanonical) {
      if (!linkCanonical) {
        linkCanonical = document.createElement('link');
        linkCanonical.setAttribute('rel', 'canonical');
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.setAttribute('href', resolvedCanonical);
    }

    // 6. Structured Data (JSON-LD) for Google & AI Search Engines (GEO)
    const scriptId = 'dynamic-jsonld-schema';
    let scriptTag = document.getElementById(scriptId) as HTMLScriptElement;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = scriptId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }

    if (schemaData) {
      scriptTag.textContent = JSON.stringify(schemaData);
    } else {
      // Default Global Schema for Irbid City Directory
      const defaultSchema = {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "City",
            "name": "إربد",
            "alternateName": ["Irbid", "عروس الشمال", "أربد", "محافظة إربد"],
            "description": "إربد هي ثاني أكبر محافظة في المملكة الأردنية الهاشمية وتلقب بعروس الشمال.",
            "containedInPlace": {
              "@type": "Country",
              "name": "الأردن",
              "alternateName": "Jordan"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": 32.5568,
              "longitude": 35.8469
            }
          },
          {
            "@type": "WebSite",
            "@id": "https://shofibirbid.site/#website",
            "url": "https://shofibirbid.site",
            "name": "شو في بإربد؟",
            "alternateName": ["ShofiBIrbid", "دليل إربد", "دليل محافظة إربد الشامل"],
            "description": "المنصة والدليل الرقمي الشامل والأكبر لكل ما يخص محافظة إربد: مطاعم، مقاهي، محلات تجارية، وظائف، عروض، وسكنات.",
            "inLanguage": "ar-JO",
            "image": "https://shofibirbid.site/favicon.jpg",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://shofibirbid.site/?search={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          },
          {
            "@type": "Organization",
            "@id": "https://shofibirbid.site/#organization",
            "name": "شو في بإربد - ShofiBIrbid",
            "url": "https://shofibirbid.site",
            "logo": "https://shofibirbid.site/favicon.jpg",
            "image": "https://shofibirbid.site/favicon.jpg",
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "إربد",
              "addressRegion": "محافظة إربد",
              "addressCountry": "JO"
            }
          }
        ]
      };
      scriptTag.textContent = JSON.stringify(defaultSchema);
    }

  }, [fullTitle, description, keywords, canonicalUrl, ogImage, ogType, schemaData, author]);

  return null;
};
