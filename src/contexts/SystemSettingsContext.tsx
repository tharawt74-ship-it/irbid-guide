import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, auth } from '../lib/firebase';
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
import { MEDICAL_SPECIALTIES } from '../lib/medicalCategories';


const DEFAULT_STORIES: StoryConfig[] = [
  { id: 'st_1', title: 'عروض المطاعم', imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80', active: true },
  { id: 'st_2', title: 'كافيهات شارع الجامعة', imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=300&q=80', active: true },
  { id: 'st_3', title: 'شقق للطلاب', imageUrl: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=300&q=80', active: true }
];

const DEFAULT_GLOBAL_SETTINGS: GlobalSiteSettings = {
  siteName: 'شو في بإربد؟',
  siteSubtitle: 'دليل عروس الشمال والمحلات والخدمات الشامل',
  logoUrl: '',
  useFullLogo: true,
  logoHeight: 68,
  contactPhone: '0790000000',
  whatsappNumber: '962790000000',
  contactEmail: 'info@shoof-irbid.com',
  facebookUrl: 'https://facebook.com/shoof.irbid',
  instagramUrl: 'https://instagram.com/shoof.irbid',
  tiktokUrl: 'https://tiktok.com/@shoof.irbid',
  xUrl: 'https://x.com/shoof_irbid',
  footerDescription: 'المنصة والمحرك الإعلاني التفاعلي الأول في إربد للبحث واكتشاف أفضل المطاعم، الكافيهات، الخدمات، والفعاليات.',
  enableAiAssistant: true
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
      'شارة التوثيق الزرقاء الرسمية ✓ للموثوقية العالية',
      'نافذة ترحيبية منبثقة تفاعلية 🎬 (صورة أو فيديو عند فتح صفحة المحل)',
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
      'إشعار ترويجي فوري موجه لجميع مستخدمي المنصة (15 د.أ / إشعار)'
    ]
  }
];

const DEFAULT_STATIC_PAGES: StaticPagesConfig = {
  aboutUsText: 'منصة "شو في بإربد؟" هي الدليل الرقمي والخدمي الأضخم لمدينة ومحافظة إربد. تهدف للربط السلس بين المحلات التجارية والخدمية وسكان وزوار إربد.',
  termsText: `الشروط والأحكام لاتفاقية استخدام منصة "شو في بإربد؟"

مقدمة:
تُعد منصة "شو في بإربد؟" (المشار إليها فيما بعد بـ "المنصة") دليلاً رقمياً ووسيطاً إعلانياً ومعلوماتياً يهدف إلى تسهيل الوصول إلى المحلات التجارية، السكنات والعقارات، المنشآت الطبية، والوظائف في محافظة إربد. لا تمثل المنصة أياً من الجهات المدرجة فيها، وتقتصر مسؤوليتها على توفير مساحة إعلانية ومعلوماتية فقط.

1. إخلاء المسؤولية العامة (المعاملات التجارية والمالية):
المنصة وإدارتها ومُلّاكها ومطوروها يخلون مسؤوليتهم القانونية والمالية والأخلاقية بشكل كامل ومطلق عن أي تعاملات، اتفاقيات، حجوزات، أو مدفوعات تتم بين المستخدمين (الزوار/الزبائن) وبين أصحاب المحلات، أو العقارات، أو المنشآت الطبية، أو أصحاب العمل. أي نزاع مالي أو تجاري ينشأ بين الأطراف هو مسؤوليتهم المباشرة والشخصية، ولا يحق لأي طرف الرجوع على المنصة بأي مطالبة أو تعويض.

2. قطاع السكنات والعقارات:
تقتصر مسؤولية المنصة على عرض الإعلانات العقارية والسكنية كما يزودنا بها أصحابها. المنصة غير مسؤولة عن جودة العقار، مدى مطابقته للصور أو الوصف، أو أي خلافات تعاقدية، تأمينات، أو شروط تأجيرية وبيع بين المؤجر والمستأجر، أو البائع والمشتري. يتعين على المستخدمين معاينة العقارات والتأكد من صفتها القانونية وتوقيع العقود بشكل مستقل خارج المنصة.

3. قطاع المنشآت الطبية والصحية (العيادات والمراكز والمستشفيات):
- المنصة لا تقدم أي استشارات طبية أو رعاية صحية. 
- تقع المسؤولية الطبية، المهنية، والجنائية كاملة على عاتق المنشآت الطبية المدرجة (الأطباء، العيادات، المختبرات، وغيرها) فيما يخص صحة التراخيص، جودة التشخيص والعلاج، والأخطاء الطبية.
- لا تضمن المنصة دقة المواعيد الطبية أو صحة الأسعار (الكشفيات) المذكورة، وهي خاضعة للتغيير من قبل المنشأة الطبية المعنية. المنصة تُخلي مسؤوليتها التامة عن أي ضرر جسدي، أو نفسي، أو مادي يلحق بالمراجعين نتيجة تعاملهم مع هذه المنشآت.

4. قطاع الوظائف:
إعلانات الوظائف المعروضة تعود مسؤوليتها لأصحاب العمل. المنصة لا تضمن التوظيف، ولا تتحمل أي مسؤولية عن طبيعة بيئة العمل، الرواتب، عقود العمل، أو أي خلافات عمالية قد تنشأ بين الموظف وصاحب العمل. يجب على المتقدمين للوظائف التحقق من صحة وقانونية العروض بأنفسهم.

5. دقة ومصداقية المحتوى (المنيو، العروض، الأسعار):
يلتزم أصحاب الصفحات والمحلات بتوفير معلومات دقيقة ومحدثة. مع ذلك، لا تتحمل المنصة مسؤولية أي أخطاء، تغيير في الأسعار، انتهاء للعروض، أو اختلاف في الخدمات والمنتجات المقدمة على أرض الواقع عما هو معروض في المنصة. 

6. المحتوى الذي ينشئه المستخدمون (التقييمات والتعليقات):
التقييمات والمراجعات تعبر عن آراء أصحابها فقط ولا تمثل رأي المنصة. تحتفظ المنصة بالحق المطلق في حذف أو تعديل أي محتوى يتضمن إساءة، تشهير، أو مخالفة للقوانين والآداب العامة، دون الحاجة لتقديم أي مبرر، وللمنصة الحق في إيقاف أو حظر حسابات المخالفين.

7. حدود المسؤولية والتعويض:
بموافقتك على استخدام هذه المنصة، فإنك كزائر أو كمعلن (صاحب منشأة/عقار) تقر وتوافق على تعويض منصة "شو في بإربد؟" وإدارتها عن أي خسائر، أضرار، أو مطالبات قانونية (بما في ذلك أتعاب المحاماة) تنتج عن سوء استخدامك للمنصة أو مخالفتك لهذه الشروط والأحكام أو تعديك على حقوق أي طرف ثالث. المنصة مقدمة "كما هي" دون أي ضمانات صريحة أو ضمنية من أي نوع.

8. التعديلات على الشروط والأحكام:
تحتفظ إدارة المنصة بالحق في تعديل، إضافة، أو إزالة أي جزء من هذه الشروط والأحكام في أي وقت دون إشعار مسبق. يُعتبر استمرارك في استخدام المنصة بعد أي تعديلات بمثابة موافقة صريحة وقانونية منك على الشروط الجديدة.

* يعتبر دخولك واستخدامك لمنصة "شو في بإربد؟" أو تسجيلك كصاحب منشأة أو عقار أو عيادة إقراراً تاماً ونهائياً وموافقة قانونية ملزمة منك على كافة الشروط والأحكام المذكورة أعلاه.`,
  privacyText: `سياسة الخصوصية لمنصة "شو في بإربد؟"

مقدمة:
نحن في منصة "شو في بإربد؟" نولي أهمية بالغة لخصوصية زوارنا ومستخدمينا (سواء كانوا زواراً عاديين أو أصحاب محلات، عقارات، منشآت طبية، أو باحثين عن وظائف). تشرح هذه السياسة كيفية جمعنا للمعلومات، استخدامها، والحدود القانونية لمسؤوليتنا تجاه حماية تلك البيانات.

1. المعلومات التي يتم جمعها:
- بيانات التسجيل: عند إنشاء حساب (سواء كصاحب منشأة أو مستخدم)، قد نقوم بجمع معلومات أساسية مثل الاسم، البريد الإلكتروني، ورقم الهاتف.
- بيانات المنشآت: المعلومات العامة التي يقدمها أصحاب الأعمال والمحلات والعقارات والمنشآت الطبية بهدف عرضها للجمهور (مثل أرقام الهواتف، مواقع العيادات، صور السكنات، المنيو، وقوائم الأسعار).
- معلومات الاستخدام: نقوم بجمع بيانات تقنية غير تحديدية حول كيفية استخدام الزوار للمنصة (مثل الصفحات المزورة والروابط المنقورة) لتحسين جودة وتجربة الاستخدام.

2. كيفية استخدام البيانات:
- تُستخدم بيانات المنشآت الطبية، العقارية، والمحلات بغرض عرضها للعامة كدليل إعلاني ورقمي لتسهيل وصول الزوار إليها.
- نستخدم بيانات التواصل الخاصة بالزوار وأصحاب المنشآت لأغراض الدعم الفني والإشعارات الإدارية.
- لا نقوم ببيع أو تأجير بيانات المستخدمين الشخصية (مثل البريد الإلكتروني وكلمات المرور) لأي أطراف خارجية أو شركات تسويق.

3. حدود المسؤولية عن مشاركة البيانات مع جهات خارجية:
المنصة تعمل كدليل للربط بين المستخدم وصاحب المنشأة، وعليه:
- التواصل المباشر: أي معلومات يشاركها المستخدم (الزائر أو الزبون) مباشرةً مع صاحب المحل، أو مالك العقار، أو المنشأة الطبية (سواء عبر مكالمات الهاتف، رسائل الواتساب، أو الروابط الخارجية المدرجة في المنصة) تقع خارج نطاق سيطرتنا ومسؤوليتنا تماماً.
- القطاع الطبي والصحي: المنصة ليست مسؤولة قانونياً عن سرية أي بيانات صحية أو طبية شخصية يشاركها المريض مع الأطباء والعيادات المدرجة عبر وسائل التواصل المتوفرة في المنصة. العلاقة بين المريض والمنشأة الطبية هي علاقة مستقلة، ولا تضمن المنصة أي حماية (مثل HIPAA أو ما يعادلها) للمراسلات الطبية الخارجية.
- قطاع الوظائف: أي سيرة ذاتية (CV) أو بيانات شخصية يرسلها الباحث عن عمل لصاحب العمل بناءً على إعلان وظيفي في المنصة تكون تحت مسؤولية المتقدم وصاحب العمل حصراً، ولا نتحمل أي مسؤولية عن كيفية معالجة أصحاب العمل لهذه البيانات.

4. حماية البيانات وأمن المعلومات:
نتخذ إجراءات أمنية وتقنية معقولة لحماية المنصة وقواعد البيانات من الاختراق أو الوصول غير المصرح به. ومع ذلك، نُخلي مسؤوليتنا الكاملة عن أي تسريب للبيانات ينتج عن أطراف ثالثة (مثل مزودي خدمات الاستضافة)، أو اختراقات سيبرانية خارجة عن سيطرتنا، أو نتيجة إهمال المستخدم في حماية معلومات حسابه وكلمة المرور الخاصة به.

5. المحتوى العام والمراجعات (التقييمات):
أي تقييمات أو تعليقات يكتبها المستخدم في المنصة تُعتبر معلومات عامة وغير سرية. بمجرد نشرها، يحق للجميع قراءتها، وتخلي المنصة مسؤوليتها عن أي تبعات لانتشار هذه المعلومات العامة.

6. حقوق المستخدم:
- يحق لأي مستخدم أو صاحب منشأة طلب تعديل بياناته المعروضة للعامة أو حذف حسابه بالكامل من المنصة في أي وقت عبر إعدادات الحساب أو بالتواصل مع الدعم الفني.
- بمجرد حذف الحساب، سيتم إخفاء بيانات المنشأة أو المستخدم من العرض العام، لكن قد نحتفظ ببعض السجلات الداخلية لأغراض أمنية وقانونية لفترة محدودة.

7. التعديلات على سياسة الخصوصية:
نحتفظ بالحق الكامل في تعديل أو تحديث "سياسة الخصوصية" في أي وقت لتتوافق مع الخدمات الجديدة أو المتطلبات القانونية. استخدامك المستمر للمنصة بعد أي تعديل يُعد إقراراً وقبولاً ملزماً منك بالنسخة المحدثة.

* استخدامك لمنصة "شو في بإربد؟" أو تصفحك لها أو تسجيلك كصاحب عمل أو مستخدم يُعد موافقة صريحة وقانونية على جميع بنود سياسة الخصوصية وإخلاء المسؤولية المذكورة أعلاه.`,
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
  isSettingsLoaded: boolean;
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

  medicalCategories: any[];
  addMedicalCategory: (cat: any) => Promise<void>;
  updateMedicalCategory: (id: string, updated: any) => Promise<void>;
  deleteMedicalCategory: (id: string) => Promise<void>;
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

  const [medicalCategories, setMedicalCategories] = useState<any[]>(() => {
    return MEDICAL_SPECIALTIES.map(spec => ({
      id: spec.id,
      name: spec.name,
      description: spec.description,
      iconName: spec.id === 'dentistry' ? 'Tooth' : (spec.id === 'hospitals' ? 'Building2' : spec.id === 'pharmacies' ? 'Pill' : spec.id === 'laboratories' ? 'Microscope' : spec.id === 'internal' ? 'Heart' : spec.id === 'surgery' ? 'Activity' : spec.id === 'pediatrics' ? 'Baby' : spec.id === 'obgyn' ? 'User' : spec.id === 'minors' ? 'Eye' : spec.id === 'rehab' ? 'Zap' : spec.id === 'psych-neuro' ? 'Brain' : 'Stethoscope'),
      isFemale: spec.isFemale || false,
      subspecialties: spec.subspecialties || [],
      keywords: spec.keywords || [],
      defaultProcedures: spec.defaultProcedures || [],
      active: true
    }));
  });

  const [neighborhoods, setNeighborhoods] = useState<IrbidAreaGroup[]>(IRBID_REGIONS_CATEGORIZED);
  const [vipPlans, setVipPlans] = useState<VipPlanConfig[]>(DEFAULT_VIP_PLANS);
  
  const [globalSettings, setGlobalSettings] = useState<GlobalSiteSettings>(() => {
    try {
      const cached = localStorage.getItem('shoof_global_settings');
      if (cached) {
        return { ...DEFAULT_GLOBAL_SETTINGS, ...JSON.parse(cached) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_GLOBAL_SETTINGS;
  });

  const [isSettingsLoaded, setIsSettingsLoaded] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem('shoof_global_settings');
    } catch {
      return false;
    }
  });

  const [staticPages, setStaticPages] = useState<StaticPagesConfig>(DEFAULT_STATIC_PAGES);
  const [seasonalCampaigns, setSeasonalCampaigns] = useState<SeasonalCampaign[]>(DEFAULT_SEASONAL_CAMPAIGNS);
  const [stories, setStories] = useState<StoryConfig[]>(DEFAULT_STORIES);

  // Load settings from Firestore on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        let data: any = null;
        
        // 1. Try to fetch from server-side API (guarantees bypass of client-side rules/permissions)
        try {
          const apiRes = await fetch('/api/system-settings', { cache: 'no-store' });
          if (apiRes.ok) {
            const resJson = await apiRes.json();
            if (resJson.success && resJson.settings) {
              data = resJson.settings;
            }
          }
        } catch (apiErr) {
          console.warn('Could not fetch settings from server API, falling back to direct Firestore:', apiErr);
        }

        // 2. Fallback to direct client-side Firestore read
        if (!data && db) {
          const docRef = doc(db, 'systemConfig', 'settings');
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            data = snap.data();
          }
        }

        if (data) {
          if (data.categories) {
            const sanitizedCats = (data.categories as CategoryConfig[]).map(c => {
              if (c.name.includes('تعليم وتدريب') || c.name === '🎓 تعليم وتدريب') {
                return {
                  ...c,
                  subcategories: c.subcategories.filter(sc => sc !== 'معلمون ومعلمات ودروس خصوصية')
                };
              }
              if (c.name.includes('صحة وطب') || c.name === '🏥 صحة وطب') {
                return {
                  ...c,
                  subcategories: BUSINESS_CATEGORIES["🏥 صحة وطب"]
                };
              }
              return c;
            }).filter(
              c => !c.name.includes('عقارات وسكنات') && c.name !== '🏠 عقارات وسكنات'
            );
            
            // Ensure newly added default categories (like teachers and home projects) exist
            const defaultCatEntries = Object.entries(BUSINESS_CATEGORIES);
            const existingCatNames = new Set(sanitizedCats.map(c => c.name));
            
            const missingDefaults: CategoryConfig[] = [];
            defaultCatEntries.forEach(([catName, subcats], idx) => {
              if (!existingCatNames.has(catName)) {
                missingDefaults.push({
                  id: `cat_def_${idx + 1}_${Date.now()}`,
                  name: catName,
                  iconName: catName.includes('معلمات') ? 'GraduationCap' : catName.includes('منزلية') ? 'Home' : 'Folder',
                  description: `جميع ${catName} في إربد`,
                  subcategories: subcats,
                  active: true
                });
              }
            });

            const mergedCats = [...sanitizedCats, ...missingDefaults];
            setCategories(mergedCats.length > 0 ? mergedCats : categories);
          }
          if (data.neighborhoods) setNeighborhoods(data.neighborhoods);
          if (data.vipPlans) {
            const sanitizedPlans = (data.vipPlans as VipPlanConfig[]).map(plan => {
              if (plan.id === 'golden') {
                return {
                  ...plan,
                  features: plan.features.map(f => 
                    f.includes('توثيق ذهبية') || f.includes('كرت المحل')
                      ? 'شارة التوثيق الزرقاء الرسمية ✓ للموثوقية العالية'
                      : f
                  )
                };
              }
              return plan;
            });
            setVipPlans(sanitizedPlans);
            try {
              if (db) {
                await updateDoc(doc(db, 'systemConfig', 'settings'), { vipPlans: sanitizedPlans });
              }
            } catch (fsErr) {
              console.warn('Failed to auto-migrate vipPlans in Firestore:', fsErr);
            }
          }
          if (data.globalSettings) {
            setGlobalSettings(data.globalSettings);
            try {
              localStorage.setItem('shoof_global_settings', JSON.stringify(data.globalSettings));
            } catch {
              // ignore
            }
          }
          if (data.staticPages) {
            let loadedPages = data.staticPages;
            let needsUpdate = false;
            if (!loadedPages.termsText || loadedPages.termsText.includes('باستخدامك للمنصة، فإنك توافق على الالتزام بالقوانين والشروط المعمول بها')) {
              loadedPages.termsText = DEFAULT_STATIC_PAGES.termsText;
              needsUpdate = true;
            }
            if (!loadedPages.privacyText || loadedPages.privacyText.includes('نحن نلتزم بحماية خصوصية بيانات جميع زوار وأصحاب المحلات وعدم مشاركتها مع أي أطراف ثالثة.')) {
              loadedPages.privacyText = DEFAULT_STATIC_PAGES.privacyText;
              needsUpdate = true;
            }
            if (needsUpdate) {
              try {
                if (db) {
                  await updateDoc(doc(db, 'systemConfig', 'settings'), { staticPages: loadedPages });
                }
              } catch (fsErr) {
                console.warn('Failed to auto-migrate static pages in Firestore:', fsErr);
              }
            }
            setStaticPages(loadedPages);
          }
          if (data.seasonalCampaigns) setSeasonalCampaigns(data.seasonalCampaigns);
          if (data.stories) setStories(data.stories);
          if (data.medicalCategories) setMedicalCategories(data.medicalCategories);
        } else {
          // Auto-seed Firestore with default configuration if it is empty
          if (db) {
            try {
              await setDoc(doc(db, 'systemConfig', 'settings'), {
                globalSettings: DEFAULT_GLOBAL_SETTINGS,
                vipPlans: DEFAULT_VIP_PLANS,
                staticPages: DEFAULT_STATIC_PAGES,
                seasonalCampaigns: DEFAULT_SEASONAL_CAMPAIGNS,
                stories: DEFAULT_STORIES,
                categories: categories,
                neighborhoods: neighborhoods
              });
              console.log('Successfully seeded Firestore with default system settings!');
            } catch (seedErr) {
              console.warn('Could not auto-seed system settings into Firestore (expected if write rules or auth is not set up):', seedErr);
            }
          }
        }
      } catch (err) {
        console.warn('Could not load system config from Firestore:', err);
      } finally {
        setIsSettingsLoaded(true);
      }
    }
    loadSettings();
  }, []);

  // Dynamically update site icon and PWA manifest when logoUrl changes
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

  // Save current settings to Firestore
  const saveAllToFirestore = async (newConfig: any) => {
    try {
      // Remove undefined values from nested objects to prevent Firestore setDoc error
      const cleanedConfig = JSON.parse(JSON.stringify(newConfig));
      
      // 1. Try saving via the secure server-side API (bypasses direct write rules)
      try {
        const token = auth?.currentUser ? await auth.currentUser.getIdToken() : null;
        if (token) {
          const apiRes = await fetch('/api/system-settings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(cleanedConfig)
          });
          if (apiRes.ok) {
            const resJson = await apiRes.json();
            if (resJson.success) {
              console.log('Successfully saved system config via server API!');
              return;
            }
          }
        }
      } catch (apiErr) {
        console.warn('Failed to save config via server API, falling back to direct Firestore setDoc:', apiErr);
      }

      // 2. Fallback to direct client Firestore setDoc
      if (db) {
        await setDoc(doc(db, 'systemConfig', 'settings'), cleanedConfig, { merge: true });
        console.log('Successfully saved system config via direct Firestore setDoc!');
      }
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

  const addMedicalCategory = async (cat: any) => {
    const updated = [...medicalCategories, cat];
    setMedicalCategories(updated);
    await saveAllToFirestore({ medicalCategories: updated });
  };

  const updateMedicalCategory = async (id: string, updatedFields: any) => {
    const updated = medicalCategories.map(c => c.id === id ? { ...c, ...updatedFields } : c);
    setMedicalCategories(updated);
    await saveAllToFirestore({ medicalCategories: updated });
  };

  const deleteMedicalCategory = async (id: string) => {
    const updated = medicalCategories.filter(c => c.id !== id);
    setMedicalCategories(updated);
    await saveAllToFirestore({ medicalCategories: updated });
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
    try {
      localStorage.setItem('shoof_global_settings', JSON.stringify(updated));
    } catch {
      // ignore
    }
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
        isSettingsLoaded,
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
        deleteCampaign,
        medicalCategories,
        addMedicalCategory,
        updateMedicalCategory,
        deleteMedicalCategory
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
