const fs = require('fs');

let code = fs.readFileSync('src/contexts/SystemSettingsContext.tsx', 'utf8');

const regex = /const DEFAULT_VIP_PLANS: VipPlanConfig\[\] = \[[\s\S]*?\];/;
const newPlans = `const DEFAULT_VIP_PLANS: VipPlanConfig[] = [
  {
    id: 'basic',
    name: 'الباقة الأساسية',
    badge: 'الأساسية',
    price: 0,
    period: 'شهرياً',
    badgeColor: 'bg-stone-100 text-stone-800 border-stone-300',
    features: [
      'صفحة محل احترافية',
      'إظهار أرقام الهاتف والواتساب المباشر',
      'دعم التقييمات وآراء الزوار',
      'ظهور اعتيادي في نتائج البحث'
    ]
  },
  {
    id: 'golden',
    name: 'باقة ذهبية',
    badge: 'الذهبية',
    price: 29,
    period: 'شهرياً',
    popular: true,
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    features: [
      'شارة توثيق ذهبية ⭐ على كرت المحل',
      'منيو رقمي كامل مع صور الأطباق عالية الدقة',
      'أولوية الظهور في نتائج البحث والفلترة',
      'إحصائيات وتحليلات نقرات الزوار والاتصالات',
      'إمكانية إضافة العروض والتخفيضات'
    ]
  },
  {
    id: 'on-demand',
    name: 'باقة عند الطلب',
    badge: 'عند الطلب',
    price: 0,
    period: 'تواصل معنا للتسعير',
    badgeColor: 'bg-[#1a4d2e] text-white border-[#1a4d2e]',
    features: [
      'تثبيت المحل في السلايدر العلوي للصفحة الرئيسية',
      'تصوير احترافي للمنتجات والمطعم',
      'حملات إعلانية مميزة وتغطية سوشيال ميديا',
      'دعم إداري مخصص 24/7'
    ]
  }
];`;

code = code.replace(regex, newPlans);

fs.writeFileSync('src/contexts/SystemSettingsContext.tsx', code);
