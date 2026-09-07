import { collection, getDocs, query } from 'firebase/firestore';
import { db } from './firebase';
import { HomepageBanner } from '../types';
import { getCachedBanners, setCachedBanners } from './dataCache';

export const DEFAULT_OFFERS_BANNERS: HomepageBanner[] = [
  {
    id: 'def-offers-1',
    type: 'text_and_button',
    title: 'أقوى العروض والخصومات في إربد 🔥',
    subtitle: 'وفر دراهمك واستمتع بأفضل وجبات المطاعم، الكافيهات، والملابس بأسعار مخفضة وكوبونات حصرية.',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=80',
    badgeText: 'خصومات تصل إلى 50%',
    buttonText: 'تصفح جميع العروض',
    buttonLink: '#offers-grid'
  },
  {
    id: 'def-offers-2',
    type: 'text_and_button',
    title: 'عروض المطاعم والكافيهات المختصة ☕🍔',
    subtitle: 'وجبات عائلية وساندويشات ومشروبات بأسعار مميزة لطلبة الجامعات وأهالي إربد.',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=80',
    badgeText: 'وجبات ومشروبات',
    buttonText: 'عروض المطاعم',
    buttonLink: '#offers-grid'
  },
  {
    id: 'def-offers-3',
    type: 'text_and_button',
    title: 'تخفيضات الأزياء والمحلات التجارية 🛍️',
    subtitle: 'أحدث صيحات الموضة، الأجهزة والإلكترونيات بعروض ترويجية مستمرة.',
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80',
    badgeText: 'تسوق وتوفير',
    buttonText: 'عروض التسوق',
    buttonLink: '#offers-grid'
  }
];

export const DEFAULT_JOBS_BANNERS: HomepageBanner[] = [
  {
    id: 'def-jobs-1',
    type: 'text_and_button',
    title: 'بوابة وظائف وشواغر محافظة إربد 💼',
    subtitle: 'فرص عمل يومية متجددة بدوام كامل وجزئي ومناسب لطلبة الجامعات في مختلف المجالات.',
    imageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1600&q=80',
    badgeText: 'شواغر يومية حية',
    buttonText: 'تصفح الوظائف المتاحة',
    buttonLink: '#jobs-grid'
  },
  {
    id: 'def-jobs-2',
    type: 'text_and_button',
    title: 'وظائف مبيعات، تسويق، وتكنولوجيا 💻',
    subtitle: 'شركات ومحلات إربد تبحث عن كفاءات وطاقات شبابية متميزة للانضمام لفرق عملها.',
    imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1600&q=80',
    badgeText: 'رواتب مجزية',
    buttonText: 'وظائف المبيعات والإدارة',
    buttonLink: '#jobs-grid'
  },
  {
    id: 'def-jobs-3',
    type: 'text_and_button',
    title: 'شواغر طلابية ودوام جزئي ومرن 🎓',
    subtitle: 'فرص عمل بأوقات مرنة تتناسب مع الجداول الدراسية لطلاب جامعتي اليرموك والتكنولوجيا.',
    imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1600&q=80',
    badgeText: 'مناسب للطلاب',
    buttonText: 'وظائف الدوام الجزئي',
    buttonLink: '#jobs-grid'
  }
];

export const DEFAULT_HOUSING_BANNERS: HomepageBanner[] = [
  {
    id: 'def-housing-1',
    type: 'text_and_button',
    title: 'دليل سكنات وعقارات إربد الجامعية 🏢',
    subtitle: 'سكنات طالبات آمنة بمشرفات، سكنات شبابية ممتازة، وأستوديوهات مفروشة قرب جامعتك.',
    imageUrl: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1600&q=80',
    badgeText: 'اليرموك والتكنو',
    buttonText: 'استكشف السكنات',
    buttonLink: '#housing-grid'
  },
  {
    id: 'def-housing-2',
    type: 'text_and_button',
    title: 'سكنات طالبات بإشراف أمني متكامل 🛡️',
    subtitle: 'سكنات مجهزة بإنترنت سريع، تدفئة، ومطبخ متكامل على بعد دقائق سيراً من بوابات الجامعات.',
    imageUrl: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=1600&q=80',
    badgeText: 'أمان وراحة',
    buttonText: 'سكنات الطالبات',
    buttonLink: '#housing-grid'
  },
  {
    id: 'def-housing-3',
    type: 'text_and_button',
    title: 'شقق عائلية وأستوديوهات مفروشة 🏠',
    subtitle: 'خيارات إيجار شهري وسنوي في أفضل أحياء إربد: الحي الشرقي، الحي الجنوبي، ودوار الثقافة.',
    imageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80',
    badgeText: 'شقق وأستوديوهات',
    buttonText: 'الشقق المفروشة',
    buttonLink: '#housing-grid'
  }
];

export const DEFAULT_TRANSPORT_BANNERS: HomepageBanner[] = [
  {
    id: 'def-transport-1',
    type: 'text_and_button',
    title: 'دليل وسائل النقل والمجمعات في إربد 🚌',
    subtitle: 'دليلك لمعرفة مجمع عمان الجديد، مجمع الشمال، ومجمع الأغوار وخطوط باصات الجامعات.',
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1600&q=80',
    badgeText: 'دليل المواصلات',
    buttonText: 'تصفح المجمعات',
    buttonLink: '#terminals-section'
  },
  {
    id: 'def-transport-2',
    type: 'text_and_button',
    title: 'خطوط السرفيس وباصات الجامعات 🎓🚍',
    subtitle: 'أوقات التردد وأسعار التذاكر لباصات جامعة اليرموك وجامعة العلوم والتكنولوجيا والمحافظات.',
    imageUrl: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1600&q=80',
    badgeText: 'خطوط الباصات',
    buttonText: 'خطوط السرفيس الداخلي',
    buttonLink: '#terminals-section'
  },
  {
    id: 'def-transport-3',
    type: 'text_and_button',
    title: 'تطبيقات التاكسي والتوصيل الذكي 🚖',
    subtitle: 'أرقام مكاتب التاكسي المعتمدة وتطبيقات النقل الذكية للتنقل المريح داخل أحياء إربد.',
    imageUrl: 'https://images.unsplash.com/photo-1556122071-e404be745793?auto=format&fit=crop&w=1600&q=80',
    badgeText: 'تكاسي ونقل ذكي',
    buttonText: 'تطبيقات التاكسي',
    buttonLink: '#terminals-section'
  }
];

export const DEFAULT_NEWS_BANNERS: HomepageBanner[] = [
  {
    id: 'def-news-1',
    type: 'text_and_button',
    title: 'أخبار ومستجدات إربد أولاً بأول 📰',
    subtitle: 'تغطية حية ومباشرة لأهم الأحداث المحلية، فعاليات الجامعات، مشاريع البلدية، والأنشطة.',
    imageUrl: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?auto=format&fit=crop&w=1600&q=80',
    badgeText: 'تغطية مستمرة',
    buttonText: 'أحدث الأخبار',
    buttonLink: '#news-grid'
  },
  {
    id: 'def-news-2',
    type: 'text_and_button',
    title: 'فعاليات ومهرجانات عروس الشمال 🎭',
    subtitle: 'دليلك للمعارض الفنية، الندوات الثقافية، والأنشطة المجتمعية في مراكز ومسارح إربد.',
    imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1600&q=80',
    badgeText: 'ثقافة وفعاليات',
    buttonText: 'فعاليات المدينة',
    buttonLink: '#news-grid'
  },
  {
    id: 'def-news-3',
    type: 'text_and_button',
    title: 'مشاريع وخدمات محافظة إربد 🏙️',
    subtitle: 'متابعة لأحدث التحسينات الحضرية، الطرق، والخدمات البلدية المقدمة للمواطنين.',
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80',
    badgeText: 'تنمية وخدمات',
    buttonText: 'أخبار الخدمات',
    buttonLink: '#news-grid'
  }
];

export const DEFAULT_TOURISM_BANNERS: HomepageBanner[] = [
  {
    id: 'def-tourism-1',
    type: 'text_and_button',
    title: 'أماكن سياحية ومعالم إربد الساحرة 🏛️🌲',
    subtitle: 'استكشف عبق التاريخ الروماني في أم قيس وطبقة فحل، وسحر الطبيعة في غابات برقش.',
    imageUrl: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=1600&q=80',
    badgeText: 'تاريخ وطبيعة',
    buttonText: 'استكشف المعالم',
    buttonLink: '#tourism-grid'
  },
  {
    id: 'def-tourism-2',
    type: 'text_and_button',
    title: 'مدينة أم قيس الأثرية (جدارا) 🌅',
    subtitle: 'أعمدة بازلتية سوداء ومدرج روماني بإطلالة بانورامية لا تُنسى على بحيرة طبريا وهضبة الجولان.',
    imageUrl: 'https://images.unsplash.com/photo-1590059390046-5991583d73b2?auto=format&fit=crop&w=1600&q=80',
    badgeText: 'آثار يونانية رومانية',
    buttonText: 'تفاصيل أم قيس',
    buttonLink: '#tourism-grid'
  },
  {
    id: 'def-tourism-3',
    type: 'text_and_button',
    title: 'محمية وغابات برقش وسد وادي العرب 🍃',
    subtitle: 'أجمل مسارات المشي والتخييم العائلي بين أشجار البلوط والبحيرات الطبيعية في شمال الأردن.',
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=80',
    badgeText: 'نزهات واستجمام',
    buttonText: 'معالم الطبيعة',
    buttonLink: '#tourism-grid'
  }
];

/**
 * Helper to fetch banners for a specific page.
 * Merges active Firestore banners (matching pageTarget or keywords) with high-quality fallback presets.
 */
export async function fetchPageBanners(
  categoryKeywords: string[],
  fallbackBanners: HomepageBanner[],
  pageKey?: string
): Promise<HomepageBanner[]> {
  try {
    const cached = getCachedBanners();
    let allBanners: HomepageBanner[] = [];

    if (cached && cached.length > 0) {
      allBanners = cached;
    } else if (db) {
      const q = query(collection(db, 'banners'));
      const snap = await getDocs(q);
      const items: HomepageBanner[] = [];
      const now = Date.now();
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.active) {
          const startsOk = !data.bannerStartDate || data.bannerStartDate <= now;
          const endsOk = !data.bannerExpiryDate || data.bannerExpiryDate > now;
          if (startsOk && endsOk) {
            items.push({ id: docSnap.id, ...data } as HomepageBanner);
          }
        }
      });
      if (items.length > 0) {
        setCachedBanners(items);
        allBanners = items;
      }
    }

    if (allBanners.length > 0) {
      // Find matching banners by pageTarget or by keyword search
      const pageMatched = allBanners.filter(b => {
        // Direct pageTarget match
        if (pageKey && b.pageTarget) {
          if (b.pageTarget === pageKey || b.pageTarget === 'all') return true;
          // If explicitly assigned to another page, skip
          return false;
        }
        if (!pageKey && b.pageTarget === 'all') return true;

        // Fallback keyword matching
        const cat = (b.category || '').toLowerCase();
        const title = (b.title || '').toLowerCase();
        const sub = (b.subtitle || '').toLowerCase();
        return categoryKeywords.some(k => 
          cat.includes(k.toLowerCase()) || 
          title.includes(k.toLowerCase()) || 
          sub.includes(k.toLowerCase())
        );
      });

      if (pageMatched.length > 0) {
        // Return matched banners combined with fallback to provide a rich carousel
        return [...pageMatched, ...fallbackBanners.slice(Math.max(0, 3 - pageMatched.length))];
      }

      // If no page-specific banner exists, combine general active banners with page-specific presets
      const generalBanners = allBanners.filter(b => !b.pageTarget || b.pageTarget === 'all');
      if (generalBanners.length > 0) {
        return [...generalBanners, ...fallbackBanners.slice(generalBanners.length)];
      }
    }

    return fallbackBanners;
  } catch (err) {
    console.error('Error loading page banners:', err);
    return fallbackBanners;
  }
}
