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
  ogImage = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200',
  ogType = 'website',
  schemaData,
  author = 'شو في بإربد (Shofi Erbid)'
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
    setMetaTag('og:title', fullTitle, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:type', ogType, true);
    setMetaTag('og:image', ogImage, true);
    setMetaTag('og:site_name', 'شو في بإربد - الدليل الشامل لمدينة إربد', true);
    setMetaTag('og:locale', 'ar_JO', true);
    if (canonicalUrl) {
      setMetaTag('og:url', canonicalUrl, true);
    }

    // 4. Twitter Card Meta
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', fullTitle);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', ogImage);

    // 5. Canonical Link
    let linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (canonicalUrl) {
      if (!linkCanonical) {
        linkCanonical = document.createElement('link');
        linkCanonical.setAttribute('rel', 'canonical');
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.setAttribute('href', canonicalUrl);
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
            "@id": "https://shofierbid.com/#website",
            "url": "https://shofierbid.com",
            "name": "شو في بإربد؟",
            "alternateName": ["Shofi Erbid", "دليل إربد", "دليل محافظة إربد الشامل"],
            "description": "المنصة والدليل الرقمي الشامل والأكبر لكل ما يخص محافظة إربد: مطاعم، مقاهي، محلات تجارية، وظائف، عروض، وسكنات.",
            "inLanguage": "ar-JO",
            "potentialAction": {
              "@type": "SearchAction",
              "target": "https://shofierbid.com/?search={search_term_string}",
              "query-input": "required name=search_term_string"
            }
          },
          {
            "@type": "Organization",
            "@id": "https://shofierbid.com/#organization",
            "name": "شو في بإربد - Shofi Erbid",
            "url": "https://shofierbid.com",
            "logo": "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=512",
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
