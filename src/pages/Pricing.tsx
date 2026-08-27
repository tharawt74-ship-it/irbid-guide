import React, { useState } from 'react';
import { Link } from 'react-router';
import { 
  Check, Sparkles, Crown, Zap, ShieldCheck, MapPin, 
  Phone, MessageSquare, Image, Search, Globe, Star, 
  BadgeCheck, UtensilsCrossed, Images, Tag, MessageCircle, 
  TrendingUp, Radio, HelpCircle, ArrowLeft, ArrowRight,
  Smartphone, BarChart3, Award, Flame, Send, Video
} from 'lucide-react';
import { SEO } from '../components/common/SEO';

export function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'yearly' | 'monthly'>('yearly');

  // Simple icon component helper
  const StoreIcon = ({ className }: { className?: string }) => <MapPin className={className} />;

  return (
    <div className="w-full space-y-12 sm:space-y-16 pb-16">
      <SEO 
        title="أضف محلك - باقات الاشتراك | دليل إربد"
        description="انضم لأكبر منصة تجارية في إربد وضاعف زبائنك. استعرض باقات الاشتراك لإضافة محلك أو شركتك في دليل شو في بإربد الشامل وابدأ باستقبال العملاء الجدد."
        keywords={['أضف محلك', 'باقات إربد', 'تسجيل المحلات', 'تسويق في إربد', 'إعلانات إربد']}
        canonicalUrl="https://shofierbid.com/pricing"
      />
      {/* Header / Hero */}
      <div className="text-center space-y-4 max-w-3xl mx-auto pt-4">
        <div className="inline-flex items-center gap-2 bg-[#ff9f1c]/15 text-[#e68a00] px-4 py-1.5 rounded-full text-xs sm:text-sm font-black border border-[#ff9f1c]/30">
          <Sparkles className="h-4 w-4 text-[#ff9f1c]" />
          <span>باقات الاشتراك والترويج لأصحاب الأعمال في إربد</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#2d2a26] tracking-tight leading-tight">
          انضم لأكبر منصة تجارية في <span className="text-[#1a4d2e]">إربد</span> وضاعف زبائنك
        </h1>

        <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
          اختر الباقة الأنسب لحجم نشاطك التجاري؛ من التواجد الرقمي الأساسي إلى الإدارة الذكية المتكاملة والحملات الترويجية الفورية.
        </p>

        {/* Guarantee Banner */}
        <div className="inline-flex items-center gap-3 bg-stone-50 border border-[#e5e1da] px-5 py-2.5 rounded-2xl text-xs sm:text-sm text-stone-600 font-semibold">
          <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>دعم فني مخصص وتهيئة كاملة لصفحتك من قبل فريق شو في بإربد</span>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        
        {/* 1. Basic Tier */}
        <div className="bg-white rounded-3xl border border-[#e5e1da] p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-[#1a4d2e]/30 transition-all relative">
          <div className="space-y-6">
            
            {/* Header */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-stone-100 text-stone-700 px-3 py-1 rounded-full text-xs font-black">
                <StoreIcon className="h-3.5 w-3.5 text-[#1a4d2e]" />
                <span>الباقة 01</span>
              </div>
              <h2 className="text-2xl font-black text-[#2d2a26]">الباقة الأساسية</h2>
              <p className="text-xs text-stone-400 font-bold">Basic Tier</p>
              
              {/* Slogan */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                <p className="text-xs sm:text-sm font-extrabold text-[#1a4d2e]">
                  "الظهور الرقمي الذكي والوصول لزبائن إربد"
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed">
              الحل المثالي للانطلاق وبناء تواجد رسمي على محركات البحث والخرائط للوصول لسكان وطلبة إربد.
            </p>

            <div className="border-t border-[#e5e1da] pt-4">
              <h3 className="text-xs font-black text-stone-400 uppercase tracking-wider mb-4">
                الميزات المشمولة بالكامل:
              </h3>

              <ul className="space-y-3.5 text-xs sm:text-sm text-stone-700">
                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <strong className="text-stone-900 block font-bold">بروفايل مخصص للمنشأة</strong>
                    <span className="text-stone-500 text-xs">الاسم التجاري، الشعار، نبذة تعريفية، وساعات العمل اليومية.</span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <strong className="text-stone-900 block font-bold">الموقع الجغرافي الدقيق</strong>
                    <span className="text-stone-500 text-xs">ربط مباشر مع خرائط جوجل (Google Maps) لسهولة وصول الزبائن.</span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <strong className="text-stone-900 block font-bold">أزرار التواصل السريع</strong>
                    <span className="text-stone-500 text-xs">زر اتصال بنقرة واحدة + زر محادثة مباشرة وفورية عبر الواتساب.</span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <strong className="text-stone-900 block font-bold">روابط التواصل الاجتماعي</strong>
                    <span className="text-stone-500 text-xs">ربط حسابات المنشأة (فيسبوك، إنستغرام، تيك توك، وغيرها).</span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <strong className="text-stone-900 block font-bold">معرض صور تعريفي</strong>
                    <span className="text-stone-500 text-xs">إمكانية رفع حتى 5 صور عالية الدقة للمكان والمنتجات.</span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <strong className="text-stone-900 block font-bold">الظهور في نتائج البحث والفلترة</strong>
                    <span className="text-stone-500 text-xs">ظهور المنشأة عند البحث حسب المنطقة، التصنيف، وساعات العمل.</span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <strong className="text-stone-900 block font-bold">التهيئة لمحركات البحث (SEO)</strong>
                    <span className="text-stone-500 text-xs">أرشفة رسمية لصفحة محلك لتظهر على نتائج بحث Google.</span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <strong className="text-stone-900 block font-bold">استقبال التقييمات والآراء</strong>
                    <span className="text-stone-500 text-xs">إمكانية استقبال تقييمات النجوم وآراء زوار إربد على صفحتك.</span>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 mt-6 border-t border-[#e5e1da]">
            <Link
              to="/contact?package=basic"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-stone-900 hover:bg-black text-white font-black rounded-2xl text-sm transition-all shadow-xs hover:scale-[1.02] active:scale-95"
            >
              <span>اشترك في الباقة الأساسية</span>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* 2. Golden Tier (Featured / VIP) */}
        <div className="bg-gradient-to-b from-[#1a4d2e] to-[#0f311c] rounded-3xl p-6 sm:p-8 flex flex-col justify-between text-white shadow-2xl relative border-2 border-[#ff9f1c] lg:-translate-y-3">
          
          {/* Popular Badge */}
          <div className="absolute -top-4 right-1/2 translate-x-1/2 bg-gradient-to-r from-[#ff9f1c] to-[#f39209] text-white px-4 py-1 rounded-full text-xs font-black tracking-wide shadow-md flex items-center gap-1.5">
            <Crown className="h-3.5 w-3.5 text-white" />
            <span>الأكثر طلباً واكتمالاً (VIP)</span>
          </div>

          <div className="space-y-6 pt-2">
            
            {/* Header */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-white/15 text-amber-300 px-3 py-1 rounded-full text-xs font-black backdrop-blur-md">
                <Sparkles className="h-3.5 w-3.5" />
                <span>الباقة 02 • الذهبية</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">الباقة الذهبية (VIP)</h2>
              <p className="text-xs text-amber-200/80 font-bold">Golden / VIP Tier</p>
              
              {/* Slogan */}
              <div className="p-3 bg-white/10 rounded-xl border border-white/20 backdrop-blur-sm">
                <p className="text-xs sm:text-sm font-extrabold text-amber-300">
                  "إدارة متكاملة، مبيعات أكثر، وتفاعل مباشر مع الزبائن"
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-200 leading-relaxed">
              تشمل كل ميزات الباقة الأساسية بالكامل + حزمة أدوات تسويقية وتفاعلية متطورة لمضاعفة مبيعاتك.
            </p>

            <div className="border-t border-white/15 pt-4">
              <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5" />
                <span>الميزات الإضافية الحصرية:</span>
              </h3>

              <ul className="space-y-3.5 text-xs sm:text-sm text-stone-100">
                
                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-[#ff9f1c] text-white rounded-lg shrink-0 mt-0.5 shadow-xs">
                    <BadgeCheck className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <strong className="text-white block font-bold flex items-center gap-1">
                      <span>شارة التوثيق الرسمية</span>
                      <span className="text-sky-400 text-xs">✔️ (العلامة الزرقاء)</span>
                    </strong>
                    <span className="text-stone-300 text-xs">لزيادة الموثوقية وبناء أعلى درجات الثقة لدى زبائن إربد.</span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-[#ff9f1c] text-white rounded-lg shrink-0 mt-0.5 shadow-xs">
                    <UtensilsCrossed className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <strong className="text-white block font-bold">المنيو والكتالوج الرقمي التفاعلي</strong>
                    <span className="text-stone-300 text-xs">نشر قائمة الطعام أو المنتجات والخدمات مع الأسعار والصور.</span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-[#ff9f1c] text-white rounded-lg shrink-0 mt-0.5 shadow-xs">
                    <Images className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <strong className="text-white block font-bold">معرض صور وجو المحل (حصري VIP) 📸</strong>
                    <span className="text-stone-300 text-xs">تبويب مخصص لعرض صور وجو المحل الفاخر من الداخل والخارج كمعرض صور تفاعلي يتيح للزبائن معايشة تجربة المكان الحقيقية قبل زيارته.</span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-[#ff9f1c] text-white rounded-lg shrink-0 mt-0.5 shadow-xs">
                    <Tag className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <strong className="text-white block font-bold">نشر وإدارة العروض والخصومات</strong>
                    <span className="text-stone-300 text-xs">صلاحية نشر العروض بصفحة التخفيضات (نسب، 1+1، خصم طلاب) مع مؤقت تنازلي.</span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-[#ff9f1c] text-white rounded-lg shrink-0 mt-0.5 shadow-xs">
                    <Video className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <strong className="text-white block font-bold">منصة ريلزات وفيديوهات المحل التفاعلية (Reels)</strong>
                    <span className="text-stone-300 text-xs">إمكانية دمج لقطات وفيديوهات ترويجية من فيسبوك وإنستغرام ويوتيوب شورتس لزيادة المبيعات بأسلوب تفاعلي.</span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-[#ff9f1c] text-white rounded-lg shrink-0 mt-0.5 shadow-xs">
                    <Star className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <strong className="text-white block font-bold">إدارة السمعة والرد على التقييمات</strong>
                    <span className="text-stone-300 text-xs">الرد الرسمي على مراجعات الزبائن وتثبيت أفضل التقييمات بأعلى الصفحة.</span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-[#ff9f1c] text-white rounded-lg shrink-0 mt-0.5 shadow-xs">
                    <MessageCircle className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <strong className="text-white block font-bold">المراسلة والتواصل المباشر</strong>
                    <span className="text-stone-300 text-xs">استقبال استفسارات ورسائل زوار الموقع والتفاعل معهم فورياً.</span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-[#ff9f1c] text-white rounded-lg shrink-0 mt-0.5 shadow-xs">
                    <Smartphone className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <strong className="text-white block font-bold flex items-center gap-1.5">
                      <span>حزمة الترويج الميداني الذكية</span>
                      <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.2 rounded font-black">هدية مجانية</span>
                    </strong>
                    <span className="text-stone-300 text-xs">ستاند طاولة أو ملصق ذكي (NFC & QR) لجمع التقييمات وعرض المنيو بلمسة واحدة.</span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-[#ff9f1c] text-white rounded-lg shrink-0 mt-0.5 shadow-xs">
                    <BarChart3 className="h-3.5 w-3.5 stroke-[2.5]" />
                  </div>
                  <div>
                    <strong className="text-white block font-bold">لوحة تحكم وإحصائيات متقدمة (Dashboard)</strong>
                    <ul className="text-stone-300 text-xs list-disc list-inside space-y-1 mt-1 font-medium">
                      <li>معرفة عدد الزيارات اليومية والشهرية لصفحتك.</li>
                      <li>تتبع عدد النقرات على زر الاتصال والواتساب والمنيو.</li>
                      <li><span className="text-amber-300 font-bold">مؤشر المنافسة:</span> مقارنة أداء صفحتك ونموها بمتوسط منافسيك في إربد.</li>
                    </ul>
                  </div>
                </li>

              </ul>
            </div>
          </div>

          <div className="pt-8 mt-6 border-t border-white/20">
            <Link
              to="/contact?package=golden"
              className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-gradient-to-r from-[#ff9f1c] to-[#f39209] hover:from-[#f39209] hover:to-[#e68a00] text-white font-black rounded-2xl text-base transition-all shadow-xl hover:scale-[1.02] active:scale-95"
            >
              <Crown className="h-5 w-5" />
              <span>اختر الباقة الذهبية VIP الآن</span>
            </Link>
          </div>
        </div>

        {/* 3. Pay Per Use Tier */}
        <div className="bg-white rounded-3xl border border-[#e5e1da] p-6 sm:p-8 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-[#1a4d2e]/30 transition-all relative">
          <div className="space-y-6">
            
            {/* Header */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-xs font-black">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span>الباقة 03 • حسب الطلب</span>
              </div>
              <h2 className="text-2xl font-black text-[#2d2a26]">الدفع حسب الاستخدام</h2>
              <p className="text-xs text-stone-400 font-bold">Pay Per Use</p>
              
              {/* Slogan */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80">
                <p className="text-xs sm:text-sm font-extrabold text-[#1a4d2e]">
                  "ترويج فوري للوصول إلى آلاف الزبائن في مواسمك وعروضك الكبرى"
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-500 leading-relaxed">
              متاحة للمشتركين الأساسيين والذهبيين لتعزيز الحملات الإعلانية، الافتتاحات الجديدة، وتخفيضات المواسم.
            </p>

            <div className="border-t border-[#e5e1da] pt-4">
              <h3 className="text-xs font-black text-stone-400 uppercase tracking-wider mb-4">
                خيارات الترويج المرنة عند الطلب:
              </h3>

              <ul className="space-y-3.5 text-xs sm:text-sm text-stone-700">
                
                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-amber-100 text-amber-700 rounded-lg shrink-0 mt-0.5">
                    <Search className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <strong className="text-stone-900 block font-bold">الظهور في صدارة البحث (Sponsored Listing)</strong>
                    <span className="text-stone-500 text-xs">تثبيت المنشأة كـ "إعلان ممول" في النتيجة الأولى عند بحث المستخدم عن تصنيفك أو منطقتك بإربد.</span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-amber-100 text-amber-700 rounded-lg shrink-0 mt-0.5">
                    <Radio className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <strong className="text-stone-900 block font-bold">إرسال إشعارات جماعية (Push Notifications)</strong>
                    <span className="text-stone-500 text-xs">إرسال إشعار فوري بعرضك أو افتتاحك الجديد لهواتف جميع مستخدمي المنصة في إربد.</span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-amber-100 text-amber-700 rounded-lg shrink-0 mt-0.5">
                    <Flame className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <strong className="text-stone-900 block font-bold">بانر إعلاني مميز (Homepage Banner)</strong>
                    <span className="text-stone-500 text-xs">وضع إعلانك في المساحات الإعلانية الرئيسية في أعلى الموقع أو صفحات الأقسام الكبرى.</span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-amber-100 text-amber-700 rounded-lg shrink-0 mt-0.5">
                    <Smartphone className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <strong className="text-stone-900 block font-bold">ستاندات وبطاقات NFC إضافية</strong>
                    <span className="text-stone-500 text-xs">طلب كميات إضافية من بطاقات وستاندات التقييم والمنيو الذكية لتوزيعها على جميع طاولات أو فروع محلك.</span>
                  </div>
                </li>

                <li className="flex items-start gap-2.5">
                  <div className="p-1 bg-amber-100 text-amber-700 rounded-lg shrink-0 mt-0.5">
                    <TrendingUp className="h-3.5 w-3.5 stroke-[3]" />
                  </div>
                  <div>
                    <strong className="text-stone-900 block font-bold">التغطية على منصات التواصل (Social Media Shoutout)</strong>
                    <span className="text-stone-500 text-xs">نشر ريلز أو بوست تعريفي بعروضك وافتتاحك على صفحات "شو في بإربد" الرسمية على السوشيال ميديا.</span>
                  </div>
                </li>

              </ul>
            </div>
          </div>

          <div className="pt-8 mt-6 border-t border-[#e5e1da]">
            <Link
              to="/contact?package=pay_per_use"
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-[#1a4d2e] hover:bg-[#133b22] text-white font-black rounded-2xl text-sm transition-all shadow-xs hover:scale-[1.02] active:scale-95"
            >
              <span>طلب حملة إعلانية مخصصة</span>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </div>
        </div>

      </div>

      {/* Feature Comparison Matrix Banner */}
      <div className="bg-white rounded-3xl border border-[#e5e1da] p-6 sm:p-10 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e5e1da] pb-6">
          <div className="space-y-1">
            <h3 className="text-xl sm:text-2xl font-black text-[#2d2a26] flex items-center gap-2">
              <Award className="h-6 w-6 text-[#ff9f1c]" />
              <span>جدول المقارنة السريعة بين الباقات</span>
            </h3>
            <p className="text-stone-500 text-xs sm:text-sm">
              تعرف على الفروقات الرئيسية بين الباقات لاختيار الأنسب لنشاطك التجاري في إربد
            </p>
          </div>

          <Link
            to="/contact"
            className="inline-flex items-center gap-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shrink-0"
          >
            <Send className="h-4 w-4" />
            <span>طلب انضمام فوري</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-stone-400 font-bold">
                <th className="py-3 px-4">الميزة أو الخدمة</th>
                <th className="py-3 px-4 text-center">الأساسية (Basic)</th>
                <th className="py-3 px-4 text-center text-[#1a4d2e] font-black">الذهبية (VIP) ⭐</th>
                <th className="py-3 px-4 text-center text-amber-600">الدفع حسب الاستخدام</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium text-stone-700">
              <tr>
                <td className="py-3.5 px-4 font-bold text-stone-900">بروفايل مخصص وخريطة Google</td>
                <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">مشمول ✔️</td>
                <td className="py-3.5 px-4 text-center text-emerald-600 font-bold bg-emerald-50/50">مشمول ✔️</td>
                <td className="py-3.5 px-4 text-center text-stone-400">-</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-bold text-stone-900">أزرار الواتساب والاتصال السريع</td>
                <td className="py-3.5 px-4 text-center text-emerald-600 font-bold">مشمول ✔️</td>
                <td className="py-3.5 px-4 text-center text-emerald-600 font-bold bg-emerald-50/50">مشمول ✔️</td>
                <td className="py-3.5 px-4 text-center text-stone-400">-</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-bold text-stone-900">معرض الصور</td>
                <td className="py-3.5 px-4 text-center text-stone-600">حتى 5 صور</td>
                <td className="py-3.5 px-4 text-center text-[#1a4d2e] font-bold bg-emerald-50/50">غير محدود 📸</td>
                <td className="py-3.5 px-4 text-center text-stone-400">-</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-bold text-stone-900">شارة التوثيق الزرقاء الرسمية</td>
                <td className="py-3.5 px-4 text-center text-stone-300">✕</td>
                <td className="py-3.5 px-4 text-center text-sky-600 font-black bg-emerald-50/50">مشمولة ✔️</td>
                <td className="py-3.5 px-4 text-center text-stone-400">-</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-bold text-stone-900">المنيو الرقمي والكتالوج مع الأسعار</td>
                <td className="py-3.5 px-4 text-center text-stone-300">✕</td>
                <td className="py-3.5 px-4 text-center text-emerald-600 font-bold bg-emerald-50/50">مشمول ✔️</td>
                <td className="py-3.5 px-4 text-center text-stone-400">-</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-bold text-stone-900">نشر العروض والخصومات في صفحة العروض</td>
                <td className="py-3.5 px-4 text-center text-stone-300">✕</td>
                <td className="py-3.5 px-4 text-center text-orange-600 font-bold bg-emerald-50/50">مشمول (مع مؤقت تنازلي)</td>
                <td className="py-3.5 px-4 text-center text-amber-600">ترويج إضافي</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-bold text-stone-900">ستاند طاولة ذكي NFC & QR Code</td>
                <td className="py-3.5 px-4 text-center text-stone-300">✕</td>
                <td className="py-3.5 px-4 text-center text-emerald-600 font-black bg-emerald-50/50">هدية مجانية 🎁</td>
                <td className="py-3.5 px-4 text-center text-amber-600">طلب كميات إضافية</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-bold text-stone-900">لوحة إحصائيات ومؤشر المنافسة</td>
                <td className="py-3.5 px-4 text-center text-stone-300">✕</td>
                <td className="py-3.5 px-4 text-center text-emerald-600 font-bold bg-emerald-50/50">متقدمة وشاملة</td>
                <td className="py-3.5 px-4 text-center text-stone-400">-</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 font-bold text-stone-900">صدارة البحث والبانرات وإشعارات Push</td>
                <td className="py-3.5 px-4 text-center text-stone-300">✕</td>
                <td className="py-3.5 px-4 text-center text-stone-400 bg-emerald-50/50">خصم تفضيلي</td>
                <td className="py-3.5 px-4 text-center text-amber-600 font-black">متاح حسب الحملة 🔥</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-stone-50 rounded-3xl border border-[#e5e1da] p-6 sm:p-10 space-y-6">
        <div className="text-center space-y-2 max-w-xl mx-auto">
          <div className="inline-flex items-center gap-1.5 text-stone-500 text-xs font-bold">
            <HelpCircle className="h-4 w-4 text-[#ff9f1c]" />
            <span>الأسئلة الشائعة</span>
          </div>
          <h3 className="text-2xl font-black text-[#2d2a26]">كل ما تحتاج معرفته عن الاشتراك</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div className="bg-white p-5 rounded-2xl border border-[#e5e1da] space-y-2">
            <h4 className="font-bold text-sm text-[#2d2a26]">كيف يتم تفعيل حساب محلي بعد إرسال الطلب؟</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              يقوم فريق عمل "شو في بإربد" بمراجعة بيانات المحل والتواصل معكم هاتفياً أو عبر الواتساب لتجهيز البروفايل والصور خلال 24 ساعة فقط.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e5e1da] space-y-2">
            <h4 className="font-bold text-sm text-[#2d2a26]">ما هو ستاند التقييم الذكي NFC & QR Code؟</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              هو ستاند أنيق يتم وضعه على كاونتر المحل أو طاولات المطعم، يكفي أن يمرر الزبون هاتفه فوقه ليفتح صفحة تقييم محلك أو المنيو مباشرة بدون كتابة أي روابط.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e5e1da] space-y-2">
            <h4 className="font-bold text-sm text-[#2d2a26]">هل يمكنني التبديل بين الباقات في أي وقت؟</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              نعم بالتأكيد! يمكنك ترقية اشتراكك من الباقة الأساسية إلى الباقة الذهبية VIP أو طلب خدمات الدفع حسب الاستخدام في أي وقت مع احتساب الفارق.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e5e1da] space-y-2">
            <h4 className="font-bold text-sm text-[#2d2a26]">هل تشمل الباقات دعم محركات البحث في جوجل؟</h4>
            <p className="text-xs text-stone-500 leading-relaxed">
              نعم، جميع صفحات المنشآت يتم فهرستها وأرشفتها بأحدث معايير SEO لتظهر عند بحث سكان وزوار إربد على جوجل عن نوع نشاطكم التجاري.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

function StoreIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
      <path d="M2 7h20" />
      <path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" />
    </svg>
  );
}
