import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  deleteDoc, 
  writeBatch,
  addDoc
} from 'firebase/firestore';
import { db } from './firebase';

export interface AppConfig {
  showDemoData: boolean;
  priceBasic?: number;
  priceSilver?: number;
  priceGolden?: number;
  priceSponsored?: number;
  pricePushNotifications?: number;
  priceHomepageBanner?: number;
  priceNfcStands?: number;
  priceSocialMedia?: number;
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  showDemoData: false,
  priceBasic: 0,
  priceSilver: 5,
  priceGolden: 12,
  priceSponsored: 15,
  pricePushNotifications: 10,
  priceHomepageBanner: 25,
  priceNfcStands: 8,
  priceSocialMedia: 50
};

export async function getAppConfig(): Promise<AppConfig> {
  if (!db) return DEFAULT_APP_CONFIG;
  try {
    const configDoc = await getDoc(doc(db, 'settings', 'appConfig'));
    if (configDoc.exists()) {
      return { ...DEFAULT_APP_CONFIG, ...configDoc.data() } as AppConfig;
    }
  } catch (err) {
    console.warn("Could not fetch appConfig:", err);
  }
  return DEFAULT_APP_CONFIG;
}

export async function setAppConfig(config: Partial<AppConfig>): Promise<void> {
  if (!db) return;
  try {
    await setDoc(doc(db, 'settings', 'appConfig'), config, { merge: true });
  } catch (err) {
    console.error("Error setting appConfig:", err);
  }
}

export const DEMO_SEED_DATA = {
  businesses: [
    {
      isDemo: true,
      name: 'كافيه لافا (Lava Specialty Coffee)',
      category: 'مطاعم ومقاهي',
      description: 'مقهى مختص بالقهوة الساخنة والباردة والمشروبات المبتكرة وجلسات هادئة ممتازة للدراسة.',
      address: 'شارع الجامعة، مقابل البوابة الشمالية لليرموك، إربد',
      phone: '0788123456',
      whatsapp: '962788123456',
      rating: 4.8,
      reviewsCount: 142,
      views: 320,
      isVerified: true,
      isFeatured: true,
      packagePlan: 'golden',
      imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=800',
      createdAt: Date.now() - 86400000 * 5
    },
    {
      isDemo: true,
      name: 'مطعم ومشاوي عروس الشمال',
      category: 'مطاعم ومقاهي',
      description: 'أجود أنواع المشاوي الشامية والكباب والوجبات العائلية بأسعار شعبية طازجة يومياً.',
      address: 'شارع الثلاثين، بالقرب من دوار الثقافة، إربد',
      phone: '0777345678',
      whatsapp: '962777345678',
      rating: 4.6,
      reviewsCount: 98,
      views: 210,
      isVerified: true,
      isFeatured: false,
      packagePlan: 'basic',
      imageUrl: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&q=80&w=800',
      createdAt: Date.now() - 86400000 * 3
    }
  ],
  jobs: [
    {
      isDemo: true,
      title: 'باريستا ومعد مشروبات مختصة',
      company: 'كافيه لافا (Lava Specialty Coffee)',
      category: 'مطاعم ومقاهي',
      jobType: 'دوام كامل',
      location: 'شارع الجامعة، بجانب بوابة اليرموك الشمالية',
      salary: '320 - 380 دينار + إكراميات',
      workHours: 'شفت 8 ساعات (صباحي أو مسائي)',
      experienceLevel: 'خبرة من سنة إلى 3 سنوات',
      genderPreference: 'all',
      benefits: ['🍔 وجبة طعام يومية مجانية', '🎉 إكراميات يومية', '✨ تدريب مدفوع'],
      description: 'مطلوب باريستا محترف لديه خبرة في إعداد القهوة المختصة واللاتيه آرت وإدارة محطة العمل بسرعة واحترافية.',
      requirements: ['خبرة لا تقل عن سنة', 'إتقان الرسم على القهوة', 'اللباقة وحسن الاستقبال'],
      howToApply: 'إرسال السيرة الذاتية أو أعمال اللاتيه آرت عبر الواتساب',
      contactPhone: '0788123456',
      contactWhatsapp: '962788123456',
      isUrgent: true,
      createdAt: Date.now() - 3600000 * 4
    },
    {
      isDemo: true,
      title: 'موظف مبيعات وتسويق إلكتروني (مناسب للطلاب)',
      company: 'مجموعة النجوم للتجارة والإلكترونيات',
      category: 'تسويق وتكنولوجيا',
      jobType: 'مناسب للطلاب',
      location: 'إربد سيتي سنتر، الطابق الثاني',
      salary: '280 دينار + عمولات مبيعات مجزية',
      workHours: 'ساعات مرنة متوافقة مع أوقات المحاضرات',
      experienceLevel: 'بدون خبرة (مرحب بالخريجين والطلبة)',
      genderPreference: 'all',
      benefits: ['💰 عمولات مبيعات', '🎓 ساعات مرنة تتناسب مع الدراسة'],
      description: 'نبحث عن شاب أو شابة بشغف للتسويق الرقمي والمبيعات للرد على استفسارات الزبائن.',
      requirements: ['طالب جامعي أو خريج جديد', 'مهارة عالية في التواصل', 'ساعات عمل مرنة'],
      howToApply: 'التقديم عبر الواتساب مع ذكر التخصص والجامعة',
      contactPhone: '0799654321',
      contactWhatsapp: '962799654321',
      isUrgent: true,
      createdAt: Date.now() - 3600000 * 12
    }
  ],
  news: [
    {
      isDemo: true,
      title: 'بلدية إربد الكبرى تطلق خطة لتطوير وتعبيد وتجميل الشوارع الحيوية',
      excerpt: 'بدأت كوادر بلدية إربد الكبرى بتنفيذ حزمة مشاريع جديدة لتطوير البنية التحتية، وإعادة تأهيل الطرق الرئيسية والإنارة في مختلف مناطق عروس الشمال.',
      category: 'أخبار المدينة',
      date: 'منذ ساعتين',
      readTime: '3 دقائق',
      location: 'وسط البلد، إربد',
      imageUrl: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=900&q=80',
      isHot: true,
      source: 'إعلام بلدية إربد',
      createdAt: Date.now() - 7200000
    },
    {
      isDemo: true,
      title: 'جامعة اليرموك تعلن عن فعاليات أسبوع الريادة والابتكار والبحث العلمي',
      excerpt: 'تستعد جامعة اليرموك لاستقبال نخبة من المبتكرين والشركات الناشئة في ملتقى الإبداع السنوي، بمشاركة واسعة من طلبة الجامعات والمجتمع المحلي.',
      category: 'تعليم وجامعات',
      date: 'منذ 5 ساعات',
      readTime: '4 دقائق',
      location: 'جامعة اليرموك',
      imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=900&q=80',
      isHot: true,
      source: 'دائرة العلاقات العامة - اليرموك',
      createdAt: Date.now() - 18000000
    }
  ],
  offers: [
    {
      isDemo: true,
      title: 'عرض الوجبة العائلية: 2 بيتزا كبيرة + بطاطا ولتر كولا',
      businessName: 'بيتزا روما الإيطالية',
      category: 'مطاعم ومقاهي',
      discountPercentage: '35%',
      oldPrice: '18 د.أ',
      newPrice: '11.70 د.أ',
      code: 'ROMA35',
      expiresIn: 'ينتهي خلال 3 أيام',
      description: 'استمتع بأشهى بيتزا حطب إيطالية في إربد مع جبنة الموزاريلا الفاخرة.',
      location: 'شارع الجامعة - قرب إشارة الإسكان',
      phone: '0791112233',
      whatsapp: '962791112233',
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800',
      isHot: true,
      createdAt: Date.now() - 3600000 * 6
    },
    {
      isDemo: true,
      title: 'خصم خاص لطلبة الجامعات على جميع مشروبات القهوة المختصة',
      businessName: 'كافيه لافا (Lava Coffee)',
      category: 'مطاعم ومقاهي',
      discountPercentage: '25%',
      oldPrice: '2.50 د.أ',
      newPrice: '1.85 د.أ',
      code: 'STUDENT25',
      expiresIn: 'ساري طوال الفصل الدراسي',
      description: 'أظهر هويتك الجامعية (اليرموك، التكنو، جدارا) واحصل على خصم فوري.',
      location: 'شارع الجامعة - مقابل البوابة الشمالية لليرموك',
      phone: '0788123456',
      whatsapp: '962788123456',
      image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=800',
      isStudent: true,
      isHot: true,
      createdAt: Date.now() - 3600000 * 10
    }
  ],
  notifications: [
    {
      isDemo: true,
      title: 'خصم خاص 30% في مطعم ومقهى ديوان زمان',
      message: 'استمتع بأشهى الوجبات والمشروبات بخصم مميز لفترة محدودة على شارع الجامعة.',
      type: 'offer',
      link: '/offers',
      createdAt: Date.now() - 1000 * 60 * 15,
      badge: 'عرض جديد 🔥',
      userId: 'all'
    },
    {
      isDemo: true,
      title: 'أهلاً بك في منصة شو في بإربد! 🌟',
      message: 'دليلك الشامل الذكي لاكتشاف أفضل المحلات، المطاعم، والخدمات في عروس الشمال.',
      type: 'system',
      link: '/',
      createdAt: Date.now() - 1000 * 60 * 60 * 48,
      badge: 'ترحيب 👋',
      userId: 'all'
    }
  ]
};

export async function seedDemoDataToFirestore(): Promise<{ count: number }> {
  if (!db) throw new Error('Database connection not available');

  let totalAdded = 0;

  // Seed Businesses
  for (const b of DEMO_SEED_DATA.businesses) {
    await addDoc(collection(db, 'businesses'), b);
    totalAdded++;
  }

  // Seed Jobs
  for (const j of DEMO_SEED_DATA.jobs) {
    await addDoc(collection(db, 'jobs'), j);
    totalAdded++;
  }

  // Seed News
  for (const n of DEMO_SEED_DATA.news) {
    await addDoc(collection(db, 'news'), n);
    totalAdded++;
  }

  // Seed Offers
  for (const o of DEMO_SEED_DATA.offers) {
    await addDoc(collection(db, 'offers'), o);
    totalAdded++;
  }

  // Seed Notifications
  for (const notif of DEMO_SEED_DATA.notifications) {
    await addDoc(collection(db, 'notifications'), notif);
    totalAdded++;
  }

  // Enable showDemoData in appConfig
  await setAppConfig({ showDemoData: true });

  return { count: totalAdded };
}

export async function clearDemoDataFromFirestore(): Promise<{ count: number }> {
  if (!db) throw new Error('Database connection not available');

  let totalDeleted = 0;
  const collectionsToClean = ['businesses', 'jobs', 'news', 'offers', 'notifications'];

  for (const colName of collectionsToClean) {
    try {
      const q = query(collection(db, colName), where('isDemo', '==', true));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(doc(db, colName, d.id));
        totalDeleted++;
      }
    } catch (err) {
      console.warn(`Error cleaning demo data from ${colName}:`, err);
    }
  }

  return { count: totalDeleted };
}
