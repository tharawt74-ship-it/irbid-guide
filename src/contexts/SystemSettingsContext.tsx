import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import {
  CategoryConfig,
  VipPlanConfig,
  GlobalSiteSettings,
  StaticPagesConfig,
  SeasonalCampaign,
  StoryConfig
} from '../types';
import { BUSINESS_CATEGORIES, IRBID_REGIONS_CATEGORIZED, IrbidAreaGroup } from '../lib/categories';


const DEFAULT_STORIES: StoryConfig[] = [
  { id: 'st_1', title: 'عروض المطاعم', imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80', active: true },
  { id: 'st_2', title: 'كافيهات شارع الجامعة', imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=300&q=80', active: true },
  { id: 'st_3', title: 'شقق للطلاب', imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=300&q=80', active: true }
];

const DEFAULT_GLOBAL_SETTINGS: GlobalSiteSettings = {
  siteName: 'شو في بإربد؟',
  siteSubtitle: 'دليل عروس الشمال والمحلات والخدمات الشامل',
  logoUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=120&q=80',
  contactPhone: '0790000000',
  whatsappNumber: '962790000000',
  contactEmail: 'info@shoof-irbid.com',
  facebookUrl: 'https://facebook.com/shoof.irbid',
  instagramUrl: 'https://instagram.com/shoof.irbid',
  tiktokUrl: 'https://tiktok.com/@shoof.irbid',
  xUrl: 'https://x.com/shoof_irbid',
  footerDescription: 'المنصة والمحرك الإعلاني التفاعلي الأول في إربد للبحث واكتشاف أفضل المطاعم، الكافيهات، الخدمات، والفعاليات.'
};



const DEFAULT_VIP_PLANS: VipPlanConfig[] = [
  {
    id: 'basic',
    name: 'الباقة الأساسية',
    badge: 'الأساسية',
    price: 2,
    period: 'تفعيل للأبد بسعر رمزي',
    badgeColor: 'bg-stone-100 text-stone-800 border-stone-300',
    internalNote: 'سعر تفعيل رمزي (2 د.أ مدى الحياة أو لحين توقف الخدمة/بيع الموقع - لا يظهر للعامة)',
    features: [
      'صفحة محل احترافية متكاملة',
      'إظهار أرقام الهاتف والاتصال المباشر والواتساب',
      'خريطة الموقع الحية (جوجل ماب)',
      'ساعات العمل المباشرة والخصوصية',
      'دعم تقييمات المنصة وآراء الزوار',
      'ظهور اعتيادي في نتائج البحث والتصنيفات'
    ]
  },
  {
    id: 'golden',
    name: 'الباقة الذهبية VIP',
    badge: 'الذهبية',
    price: 19,
    yearlyPrice: 119,
    period: 'شهرياً (أو 119 د.أ سنوياً)',
    popular: true,
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    features: [
      'شارة التوثيق الذهبية ⭐ لتمييز المحل',
      'كتالوج المنتجات والمنيو الرقمي التفاعلي بالكامل',
      'لوحة الإحصائيات الشاملة والتحليلات ونقرات الزوار',
      'توفير حسابات موظفين مشتركة 👥 لإدارة الفريق والمنيو',
      'نشر العروض الخاصة والتخفيضات والكوبونات غير المحدودة',
      'الرد الرسمي على تقييمات ومراجعات الزبائن ومتابعتهم',
      'أولوية الظهور القصوى في نتائج البحث وقوائم التوصيات'
    ]
  },
  {
    id: 'pay_per_use',
    name: 'الخدمات والحملات التسويقية الإضافية',
    badge: 'حملات تسويقية',
    price: 15,
    period: 'تبدأ من',
    badgeColor: 'bg-[#1a4d2e] text-white border-[#1a4d2e]',
    features: [
      'إعلان بانر متحرك أعلى الصفحة الرئيسية (29 د.أ / أسبوع)',
      'صدارة نتائج البحث للمحل Sponsored (19 د.أ / أسبوع)',
      'إشعار ترويجي فوري موجه لجميع مستخدمي المنصة (15 د.أ / إشعار)',
      'تغطية فيديو سوشيال ميديا وتصوير ومونتاج ريلز احترافي (69 د.أ / تغطية)',
      'توفير ستاندات وطاولات تقييم NFC الذكية (12 د.أ / ستاند مبرمج)'
    ]
  }
];

const DEFAULT_STATIC_PAGES: StaticPagesConfig = {
  aboutUsText: 'منصة "شو في بإربد؟" هي الدليل الرقمي والخدمي الأضخم لمدينة ومحافظة إربد. تهدف للربط السلس بين المحلات التجارية والخدمية وسكان وزوار إربد.',
  termsText: 'باستخدامك للمنصة، فإنك توافق على الالتزام بالقوانين والشروط المعمول بها لضمان تجربة صحية وآمنة لجميع المستخدمين.',
  privacyText: 'نحن نلتزم بحماية خصوصية بيانات جميع زوار وأصحاب المحلات وعدم مشاركتها مع أي أطراف ثالثة.',
  emergencyNumbers: [
    { id: '1', title: 'طوارئ الدفاع المدني والأمن العام', number: '911' },
    { id: '2', title: 'طوارئ كهرباء إربد', number: '027201000' },
    { id: '3', title: 'مستشفى الأميرة بسمة التعليمي', number: '027242111' },
    { id: '4', title: 'مستشفى الملك المؤسس عبدالله الجامعي', number: '027200600' }
  ]
};

const DEFAULT_SEASONAL_CAMPAIGNS: SeasonalCampaign[] = [
  {
    id: 'camp_back_to_school',
    title: 'عروض العودة إلى الجامعات والمدارس 🎒',
    subtitle: 'أقوى الخصومات من المكتبات والمطاعم والكافيهات لطلاب جامعة اليرموك والتكنو',
    badge: 'موسم الطلاب',
    discountText: 'خصومات تصل لغاية 35%',
    bannerUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
    active: true
  }
];

interface SystemSettingsContextType {
  categories: CategoryConfig[];
  neighborhoods: IrbidAreaGroup[];
  vipPlans: VipPlanConfig[];
  globalSettings: GlobalSiteSettings;
  staticPages: StaticPagesConfig;
  seasonalCampaigns: SeasonalCampaign[];
  stories: StoryConfig[];
  updateStories: (newStories: StoryConfig[]) => Promise<void>;
  addCategory: (cat: CategoryConfig) => Promise<void>;
  updateCategory: (id: string, updated: Partial<CategoryConfig>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  updateNeighborhoods: (groups: IrbidAreaGroup[]) => Promise<void>;
  
  updateVipPlan: (id: string, updated: Partial<VipPlanConfig>) => Promise<void>;
  updateGlobalSettings: (updated: GlobalSiteSettings) => Promise<void>;
  updateStaticPages: (updated: StaticPagesConfig) => Promise<void>;
  addCampaign: (camp: SeasonalCampaign) => Promise<void>;
  updateCampaign: (id: string, updated: Partial<SeasonalCampaign>) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export function SystemSettingsProvider({ children }: { children: React.ReactNode }) {
  const [categories, setCategories] = useState<CategoryConfig[]>(() => {
    return Object.entries(BUSINESS_CATEGORIES).map(([catName, subcats], idx) => ({
      id: `cat_${idx + 1}`,
      name: catName,
      iconName: 'Folder',
      description: `جميع ${catName} في إربد`,
      subcategories: subcats,
      active: true
    }));
  });

  const [neighborhoods, setNeighborhoods] = useState<IrbidAreaGroup[]>(IRBID_REGIONS_CATEGORIZED);
  const [vipPlans, setVipPlans] = useState<VipPlanConfig[]>(DEFAULT_VIP_PLANS);
  const [globalSettings, setGlobalSettings] = useState<GlobalSiteSettings>(DEFAULT_GLOBAL_SETTINGS);
  const [staticPages, setStaticPages] = useState<StaticPagesConfig>(DEFAULT_STATIC_PAGES);
  const [seasonalCampaigns, setSeasonalCampaigns] = useState<SeasonalCampaign[]>(DEFAULT_SEASONAL_CAMPAIGNS);
  const [stories, setStories] = useState<StoryConfig[]>(DEFAULT_STORIES);

  // Load settings from Firestore on mount
  useEffect(() => {
    async function loadSettings() {
      if (!db) return;
      try {
        const docRef = doc(db, 'systemConfig', 'settings');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.categories) setCategories(data.categories);
          if (data.neighborhoods) setNeighborhoods(data.neighborhoods);
          if (data.vipPlans) setVipPlans(data.vipPlans);
          if (data.globalSettings) setGlobalSettings(data.globalSettings);
          if (data.staticPages) setStaticPages(data.staticPages);
          if (data.seasonalCampaigns) setSeasonalCampaigns(data.seasonalCampaigns);
          if (data.stories) setStories(data.stories);
        }
      } catch (err) {
        console.warn('Could not load system config from Firestore:', err);
      }
    }
    loadSettings();
  }, []);

  // Save current settings to Firestore
  const saveAllToFirestore = async (newConfig: any) => {
    if (!db) return;
    try {
      // Remove undefined values from nested objects to prevent Firestore setDoc error
      const cleanedConfig = JSON.parse(JSON.stringify(newConfig));
      await setDoc(doc(db, 'systemConfig', 'settings'), cleanedConfig, { merge: true });
    } catch (err) {
      console.error('Failed to save system config:', err);
    }
  };

  const addCategory = async (cat: CategoryConfig) => {
    const updated = [...categories, cat];
    setCategories(updated);
    await saveAllToFirestore({ categories: updated });
  };

  const updateCategory = async (id: string, updatedFields: Partial<CategoryConfig>) => {
    const updated = categories.map(c => c.id === id ? { ...c, ...updatedFields } : c);
    setCategories(updated);
    await saveAllToFirestore({ categories: updated });
  };

  const deleteCategory = async (id: string) => {
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    await saveAllToFirestore({ categories: updated });
  };

  const updateNeighborhoods = async (groups: IrbidAreaGroup[]) => {
    setNeighborhoods(groups);
    await saveAllToFirestore({ neighborhoods: groups });
  };

  

  const updateVipPlan = async (id: string, updatedFields: Partial<VipPlanConfig>) => {
    const updated = vipPlans.map(p => p.id === id ? { ...p, ...updatedFields } : p);
    setVipPlans(updated);
    await saveAllToFirestore({ vipPlans: updated });
  };

  const updateGlobalSettings = async (updated: GlobalSiteSettings) => {
    setGlobalSettings(updated);
    await saveAllToFirestore({ globalSettings: updated });
  };

  const updateStaticPages = async (updated: StaticPagesConfig) => {
    setStaticPages(updated);
    await saveAllToFirestore({ staticPages: updated });
  };

  
  

  
  const updateStories = async (newStories: StoryConfig[]) => {
    setStories(newStories);
    await saveAllToFirestore({ stories: newStories });
  };

  const addCampaign = async (camp: SeasonalCampaign) => {
    const updated = [...seasonalCampaigns, camp];
    setSeasonalCampaigns(updated);
    await saveAllToFirestore({ seasonalCampaigns: updated });
  };

  const updateCampaign = async (id: string, updatedFields: Partial<SeasonalCampaign>) => {
    const updated = seasonalCampaigns.map(c => c.id === id ? { ...c, ...updatedFields } : c);
    setSeasonalCampaigns(updated);
    await saveAllToFirestore({ seasonalCampaigns: updated });
  };

  const deleteCampaign = async (id: string) => {
    const updated = seasonalCampaigns.filter(c => c.id !== id);
    setSeasonalCampaigns(updated);
    await saveAllToFirestore({ seasonalCampaigns: updated });
  };

  return (
    <SystemSettingsContext.Provider
      value={{
        categories,
        neighborhoods,
        vipPlans,
        globalSettings,
        staticPages,
        seasonalCampaigns,
        stories,
        updateStories,
        addCategory,
        updateCategory,
        deleteCategory,
        updateNeighborhoods,
        
        updateVipPlan,
        updateGlobalSettings,
        updateStaticPages,
        addCampaign,
        updateCampaign,
        deleteCampaign
      }}
    >
      {children}
    </SystemSettingsContext.Provider>
  );
}

export function useSystemSettings() {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    throw new Error('useSystemSettings must be used within a SystemSettingsProvider');
  }
  return context;
}
