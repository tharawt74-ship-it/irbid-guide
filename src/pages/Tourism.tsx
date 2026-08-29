import React, { useState, useEffect } from 'react';
import { 
  MapPin, Compass, Search, Clock, Award, Info, 
  ExternalLink, Phone, Globe, ChevronRight, X
} from 'lucide-react';
import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getAppConfig } from '../lib/demoDataHelper';
import { SEO } from '../components/common/SEO';

export interface TourismSpot {
  id: string;
  name: string;
  category: 'أثري' | 'طبيعة' | 'ترفيه' | 'ثقافة';
  image: string;
  description: string;
  location: string;
  googleMapsUrl: string;
  openingHours: string;
  entryFee: string;
  rating: number;
  tags: string[];
  tips: string[];
}

const TOURISM_SPOTS: TourismSpot[] = [
  {
    id: '1',
    name: 'مدينة أم قيس الأثرية (جدارا)',
    category: 'أثري',
    image: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=800&q=80',
    description: 'واحدة من مدن الديكابولس اليونانية الرومانية القديمة. تتميز بحجارتها البازلتية السوداء الفريدة وأعمدتها الشامخة ومدرجها الروماني العريق. تقع على تلة مرتفعة تطل ببانوراما ساحرة على بحيرة طبريا، هضبة الجولان، ونهر اليرموك.',
    location: 'لواء بني كنانة، شمال إربد (حوالي 28 كم)',
    googleMapsUrl: 'https://maps.google.com/?q=Umm+Qais+Archaeological+Site',
    openingHours: '8:00 صباحاً - 6:00 مساءً (تختلف شتاءً)',
    entryFee: 'مواطن: 1 دينار | مقيم/عربي: 2 دينار | أجنبي: 5 دنانير (مشمول بالـ Jordan Pass)',
    rating: 4.9,
    tags: ['آثار رومانية', 'إطلالة بحيرة', 'ديكابولس', 'مطعم مطل'],
    tips: [
      'أفضل وقت للزيارة هو قبيل الغروب لمشاهدة الغروب فوق طبريا.',
      'تضم الموقع مطعماً فاخراً مبنياً من الحجارة الأثرية بإطلالة بانورامية.',
      'احرص على زيارة المتحف الأثري داخل الموقع لرؤية التماثيل والنقوش.'
    ]
  },
  {
    id: '2',
    name: 'محمية وغابات برقش (مغارة الظهر)',
    category: 'طبيعة',
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80',
    description: 'تعتبر غابات برقش من أجمل الغابات الطبيعية في الأردن، حيث تكسوها أشجار البلوط والملول والخروب العتيقة. تضم المنطقة أيضاً "مغارة الظهر" الطبيعية الفريدة التي تحتوي على صواعد وهوابط جيولوجية مدهشة تشكلت عبر ملايين السنين.',
    location: 'لواء الكورة، جنوب غرب إربد (حوالي 30 كم)',
    googleMapsUrl: 'https://maps.google.com/?q=Burqush+Forests',
    openingHours: 'مفتوح دائماً (المحمية والمغارة تتطلب تنسيقاً)',
    entryFee: 'مجاني للغابات العامة | رسوم رمزية للمغارة والمحمية',
    rating: 4.7,
    tags: ['غابات طبيعية', 'مسارات مشي', 'مغارات وجيولوجيا', 'تخييم عائلي'],
    tips: [
      'منطقة مثالية للنزهات العائلية (الرحلات والطهي في الهواء الطلق).',
      'يرجى الحفاظ على نظافة المكان وجمع المخلفات لسلامة أشجار البلوط النادرة.',
      'الربيع هو الفصل الذهبي حيث تكتسي الأرض ببساط أخضر من زهور الدحنون.'
    ]
  },
  {
    id: '3',
    name: 'متحف دار السرايا الأثري (قلعة إربد)',
    category: 'ثقافة',
    image: 'https://images.unsplash.com/photo-1566121318535-b28fe4063df4?auto=format&fit=crop&w=800&q=80',
    description: 'قلعة عثمانية مهيبة بنيت في منتصف القرن التاسع عشر فوق تل إربد الصناعي. كانت تستخدم كمركز إداري وسجن، ثم تم تحويلها إلى متحف أثري متكامل يروي تاريخ محافظة إربد عبر العصور من العصر الحجري وحتى العصر الإسلامي المتأخر من خلال ساحاتها الجميلة وقاعاتها السبع المقببة.',
    location: 'وسط البلد، إربد (بجانب تل إربد وحسبة المفرّق)',
    googleMapsUrl: 'https://maps.google.com/?q=Dar+As-Saraya+Museum+Irbid',
    openingHours: '8:00 صباحاً - 4:00 مساءً (الجمعة مغلق)',
    entryFee: 'مواطن: مجاني | مقيم/عربي: 1 دينار | أجنبي: 2 دينار',
    rating: 4.6,
    tags: ['عمارة عثمانية', 'تاريخ إربد', 'وسط المدينة', 'متاحف وطنية'],
    tips: [
      'الموقع يتوسط قلب إربد التاريخي، لذا يمكنك دمج الزيارة مع جولة تسوق بوسط البلد.',
      'التقط صوراً رائعة في الفناء الداخلي المفتوح المحاط بالأقواس الحجرية الجميلة.',
      'اسأل موظفي الاستقبال عن قصة لوحات الفسيفساء المعروضة.'
    ]
  },
  {
    id: '4',
    name: 'طبقة فحل الأثرية (بيلا)',
    category: 'أثري',
    image: 'https://images.unsplash.com/photo-1608958416802-53b9bf49fc35?auto=format&fit=crop&w=800&q=80',
    description: 'موقع أثري مذهل يقع في غور الأردن الشمالي. تعتبر بيلا واحدة من أقدم المدن التاريخية في العالم، حيث سُكنت باستمرار منذ أكثر من 6000 عام. تحتوي على بقايا كنائس بيزنطية، معابد كنعانية، مسرح روماني ومستوطنات إسلامية مبكرة تحيط بها تلال طبيعية ساحرة.',
    location: 'لواء الأغوار الشمالية، غرب إربد (حوالي 35 كم)',
    googleMapsUrl: 'https://maps.google.com/?q=Pella+Archaeological+Site+Jordan',
    openingHours: '8:00 صباحاً - 5:00 مساءً',
    entryFee: 'مواطن: 1 دينار | أجنبي: 3 دنانير (مشمول بالـ Jordan Pass)',
    rating: 4.8,
    tags: ['آثار كنعانية', 'كنائس بيزنطية', 'غور الأردن', 'مناظر طبيعية'],
    tips: [
      'المنطقة دافئة جداً في الشتاء وتعد مهرباً رائعاً من برودة المرتفعات.',
      'يتطلب الصعود لبعض الكنائس العلوية لياقة خفيفة وأحذية مخصصة للمشي.',
      'الربيع هناك مبكر جداً (يبدأ من يناير وفبراير) وتكتسي التلال بجمال لا يصدق.'
    ]
  },
  {
    id: '5',
    name: 'حديقة الملك عبد الله الثاني بن الحسين',
    category: 'ترفيه',
    image: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=800&q=80',
    description: 'أكبر متنزه ترفيهي وبيئي حضري في شمال الأردن. تمتد على مساحة تزيد عن 170 دونماً وتضم مساحات خضراء شاسعة، بحيرة صناعية، ملاعب رياضية، مساراً مخصصاً للمشي وركوب الدراجات، مناطق ألعاب مظللة ومسرحاً مكشوفاً للفعاليات الصيفية.',
    location: 'جنوب إربد، بجانب منطقة الحصن والحي الجنوبي',
    googleMapsUrl: 'https://maps.google.com/?q=King+Abdullah+II+Park+Irbid',
    openingHours: '9:00 صباحاً - 11:00 مساءً',
    entryFee: 'دخول مجاني (بعض الألعاب والمرافق برسوم رمزية)',
    rating: 4.5,
    tags: ['متنزه حضري', 'ألعاب أطفال', 'رياضة وجري', 'مناسب للعائلات'],
    tips: [
      'مزدحمة جداً في عطلة نهاية الأسبوع؛ يفضل زيارتها عصراً خلال أيام الأسبوع للهدوء.',
      'تمنع الحديقة إدخال أدوات الشواء والطهي للحفاظ على جودة المسطحات الخضراء.',
      'مكان رائع لركوب الأطفال الدراجات والسكوتر بأمان تام بعيداً عن السيارات.'
    ]
  },
  {
    id: '6',
    name: 'سد وادي العرب والبحيرة',
    category: 'طبيعة',
    image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80',
    description: 'بحيرة اصطناعية ضخمة وجميلة تكونت خلف سد وادي العرب الركامي. تحيط بالبحيرة جبال وسهول خضراء متعرجة لترسم مشهداً طبيعياً شبيهاً بالبحيرات الأوروبية خلال فصلي الشتاء والربيع. يعتبر مقصداً شهيراً جداً لهواة التصوير ومحبي النزهات الهادئة.',
    location: 'شمال غرب إربد، قرب الشونة الشمالية (حوالي 22 كم)',
    googleMapsUrl: 'https://maps.google.com/?q=Wadi+Arab+Dam+Jordan',
    openingHours: 'مفتوح دائماً (المناطق المحيطة بالبحيرة)',
    entryFee: 'مجاني',
    rating: 4.6,
    tags: ['بحيرة اصطناعية', 'مناظر طبيعية', 'هدوء واستجمام', 'تصوير فوتوغرافي'],
    tips: [
      'السباحة في البحيرة أو السد ممنوعة منعاً باتاً لخطورتها الشديدة.',
      'الطريق المؤدي إلى السد متعرج وجبلي ويوفر إطلالات علوية مذهلة للغاية لغروب الشمس.',
      'احرص على أخذ مستلزماتك وأطعمتك معك لقلة المحلات التجارية بجانب البحيرة مباشرة.'
    ]
  },
  {
    id: '7',
    name: 'بيت عرار الثقافي (منزل شاعر الأردن)',
    category: 'ثقافة',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80',
    description: 'البيت التاريخي لشاعر الأردن الكبير مصطفى وهبي التل (عرار). بني في عام 1888 بأسلوب العمارة الشامية التراثية مستخدماً الحجارة البازلتية السوداء والحجر الجيري الأبيض مع ساحة داخلية مرصوفة تظللها شجرة توت عتيقة. تحول البيت لمركز ثقافي حيوي يحتضن الندوات والمصنفات الفنية وعبق الكلمات.',
    location: 'سفح تل إربد الشمالي، بالقرب من وسط البلد',
    googleMapsUrl: 'https://maps.google.com/?q=Beit+Arar+Cultural+Center+Irbid',
    openingHours: '8:30 صباحاً - 3:00 مساءً (الجمعة والسبت مغلق)',
    entryFee: 'مجاني',
    rating: 4.7,
    tags: ['بيت تراثي', 'ثقافة وأدب', 'مصطفى وهبي التل', 'هدوء تراثي'],
    tips: [
      'البيت يعتبر واحة هادئة جداً وجميلة في وسط المدينة المزدحم.',
      'يضم القبر التذكاري للشاعر عرار تحت شجرة التوت في الساحة السماوية.',
      'تأمل الصور والرسائل القديمة والمخطوطات الأصلية المعلقة في الغرف التاريخية.'
    ]
  }
];

export function Tourism() {
  const [spots, setSpots] = useState<TourismSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  const [selectedSpot, setSelectedSpot] = useState<TourismSpot | null>(null);

  useEffect(() => {
    async function loadTourismSpots() {
      setLoading(true);
      try {
        if (!db) {
          setSpots(TOURISM_SPOTS);
          setLoading(false);
          return;
        }
        const appConfig = await getAppConfig();
        const ref = collection(db, 'tourism');
        const snap = await getDocs(ref);
        let items: TourismSpot[] = [];
        snap.forEach(d => {
          const data = d.data();
          if (!appConfig.showDemoData && data.isDemo) {
            return;
          }
          items.push({ id: d.id, ...data } as TourismSpot);
        });

        if (items.length === 0) {
          // Seed the static spots into Firestore so it's populated for the user/admin
          for (const spot of TOURISM_SPOTS) {
            const docRef = doc(collection(db, 'tourism'), spot.id);
            await setDoc(docRef, { ...spot, isDemo: true });
          }
          setSpots(TOURISM_SPOTS);
        } else {
          setSpots(items);
        }
      } catch (err) {
        console.error("Error loading tourism spots:", err);
        setSpots(TOURISM_SPOTS);
      } finally {
        setLoading(false);
      }
    }
    loadTourismSpots();
  }, []);

  const filteredSpots = spots.filter(spot => {
    const matchesCategory = selectedCategory === 'الكل' || spot.category === (selectedCategory === 'معالم أثرية' ? 'أثري' : selectedCategory === 'طبيعة ومحميات' ? 'طبيعة' : selectedCategory === 'ترفيه ومتنزهات' ? 'ترفيه' : 'ثقافة');
    const matchesSearch = 
      spot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spot.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spot.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spot.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full space-y-8 sm:space-y-10 pb-16 relative" dir="rtl">
      <SEO 
        title="السياحة ومعالم إربد | أم قيس، طبقة فحل، غابات برقش وتل إربد"
        description="دليل الأماكن السياحية والآثار والطبيعة في محافظة إربد وعروس الشمال: أم قيس، طبقة فحل، غابات برقش، سد وادي العرب، بيت عرار الثقافي، ومتحف التراث الأردني."
        keywords={['سياحة إربد', 'معالم إربد', 'أم قيس', 'طبقة فحل', 'غابات برقش', 'سد وادي العرب', 'بيت عرار', 'آثار إربد']}
        canonicalUrl="https://shofierbid.com/tourism"
      />
      {/* Tourism Banner Header */}
      <div className="bg-gradient-to-l from-[#1a4d2e] via-[#153e25] to-[#0c2617] rounded-3xl p-6 sm:p-10 text-white relative overflow-hidden shadow-lg border border-[#1a4d2e]/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-24 -mt-24"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#ff9f1c]/15 rounded-full blur-2xl pointer-events-none -ml-12 -mb-12"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-[#ff9f1c] text-white px-3.5 py-1.5 rounded-full text-xs font-black shadow-xs">
              <Compass className="h-4 w-4 animate-spin-slow" />
              <span>اكتشف إربد التراث والطبيعة</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              أماكن سياحية ومعالم إربد
            </h1>
            
            <p className="text-stone-200 text-sm sm:text-base leading-relaxed font-normal">
              دليلك السياحي الموثق لاستكشاف "عروس الشمال" الأردنية؛ من الآثار اليونانية الرومانية القديمة في أم قيس وبيلا، إلى أحضان غابات برقش الخلابة والمنازل الثقافية العريقة في قلب المدينة.
            </p>
          </div>


        </div>

        {/* Search Bar inside Header */}
        <div className="pt-6 relative z-10 max-w-xl">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن معلّم (أم قيس، غابة، متحف، سد)..."
              className="w-full bg-white/10 backdrop-blur-md text-white placeholder:text-stone-300 border border-white/20 rounded-2xl px-5 py-3.5 pr-11 text-sm focus:outline-none focus:bg-white/20 focus:border-white transition-colors"
            />
            <Search className="h-5 w-5 text-stone-300 absolute right-3.5 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-300 hover:text-white p-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {['الكل', 'معالم أثرية', 'طبيعة ومحميات', 'ترفيه ومتنزهات', 'متاحف وثقافة'].map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === cat
                ? 'bg-[#1a4d2e] text-white shadow-xs font-black'
                : 'bg-white text-stone-600 border border-[#e5e1da] hover:bg-stone-50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Display Results */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4 bg-white rounded-3xl border border-[#e5e1da]">
          <div className="w-10 h-10 border-4 border-[#1a4d2e]/20 border-t-[#1a4d2e] rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-[#1a4d2e]">جاري تحميل المعالم والأماكن السياحية في إربد...</p>
        </div>
      ) : filteredSpots.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#e5e1da] space-y-4">
          <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto text-stone-400">
            <Compass className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-stone-800">لا توجد معالم تطابق بحثك حالياً</h3>
          <p className="text-stone-500 text-sm max-w-md mx-auto">
            جرّب تغيير كلمات البحث أو تصفح الأقسام الأخرى لاستكشاف المزيد من معالم عروس الشمال.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSpots.map((spot) => (
            <div
              key={spot.id}
              onClick={() => setSelectedSpot(spot)}
              className="bg-white rounded-3xl border border-[#e5e1da] overflow-hidden hover:shadow-xl transition-all flex flex-col justify-between group cursor-pointer"
            >
              <div>
                {/* Photo Header */}
                <div className="relative aspect-[16/10] overflow-hidden bg-stone-100">
                  <img 
                    src={spot.image} 
                    alt={spot.name} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-stone-800 px-2.5 py-1 rounded-lg text-[10px] font-black shadow-2xs">
                    {spot.category === 'أثري' ? '🏯 معالم أثرية' : spot.category === 'طبيعة' ? '🌲 طبيعة ومحميات' : spot.category === 'ترفيه' ? '🎡 ترفيه وتسلية' : '🏛️ ثقافة وفنون'}
                  </div>
                  <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md text-white px-2 py-0.5 rounded-md text-xs font-bold flex items-center gap-1">
                    <span className="text-amber-400 font-bold">★</span>
                    <span>{spot.rating}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                  <h3 className="font-black text-lg text-stone-900 group-hover:text-[#1a4d2e] transition-colors leading-tight">
                    {spot.name}
                  </h3>
                  
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium">
                    <MapPin className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                    <span className="truncate">{spot.location}</span>
                  </div>

                  <p className="text-stone-600 text-xs leading-relaxed line-clamp-3">
                    {spot.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {spot.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="bg-stone-50 text-stone-600 border border-stone-200/50 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer Click */}
              <div className="p-5 pt-0">
                <div className="pt-3.5 border-t border-stone-100 flex items-center justify-between text-xs font-black text-[#1a4d2e] group-hover:underline">
                  <span className="flex items-center gap-1">
                    <span>التفاصيل ونصائح الزيارة</span>
                    <Info className="h-4 w-4 text-[#ff9f1c]" />
                  </span>
                  <ChevronRight className="h-4 w-4 transform rotate-180 group-hover:-translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tourism Spot Detail Modal */}
      {selectedSpot && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[94vh] overflow-y-auto p-5 sm:p-8 shadow-2xl border border-stone-200 relative my-auto animate-in fade-in zoom-in-95 space-y-6">
            
            {/* Modal Image & Exit Button */}
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-stone-100 border border-stone-200">
              <img 
                src={selectedSpot.image} 
                alt={selectedSpot.name} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => setSelectedSpot(null)}
                className="absolute top-4 right-4 p-2 bg-black/60 text-white hover:bg-black/80 rounded-full transition-colors"
                title="إغلاق"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="absolute bottom-4 right-4 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-black shadow-md">
                {selectedSpot.category === 'أثري' ? 'معالم أثرية' : selectedSpot.category === 'طبيعة' ? 'طبيعة ومحميات' : selectedSpot.category === 'ترفيه' ? 'ترفيه ومتنزهات' : 'ثقافة وفنون'}
              </div>
            </div>

            {/* Title & Category info */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-black text-stone-900">{selectedSpot.name}</h2>
                <span className="bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1">
                  ★ {selectedSpot.rating} / 5
                </span>
              </div>
              <p className="text-sm text-stone-500 font-bold flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-[#ff9f1c]" />
                <span>{selectedSpot.location}</span>
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h4 className="font-black text-xs text-stone-400 uppercase tracking-wider">حول المعلَم أو الموقع:</h4>
              <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-line bg-stone-50 p-4 rounded-2xl border border-stone-200">
                {selectedSpot.description}
              </p>
            </div>

            {/* Logistics Box (Entry fees & hours) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100 text-xs text-stone-700">
              <div className="space-y-1">
                <span className="font-black text-emerald-900 block">⏱ أوقات الدوام والزيارة:</span>
                <span>{selectedSpot.openingHours}</span>
              </div>
              <div className="space-y-1">
                <span className="font-black text-emerald-900 block">💵 رسوم وتذاكر الدخول:</span>
                <span>{selectedSpot.entryFee}</span>
              </div>
            </div>

            {/* Expert Local Tips */}
            <div className="space-y-2">
              <h4 className="font-black text-xs text-[#1a4d2e] uppercase tracking-wider">💡 نصائح وتوجيهات للزوار:</h4>
              <ul className="space-y-2 text-xs sm:text-sm text-stone-700 bg-[#1a4d2e]/5 p-4 rounded-2xl border border-[#1a4d2e]/10">
                {selectedSpot.tips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <Award className="h-4 w-4 text-[#ff9f1c] shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Action buttons */}
            <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-stone-500 font-medium">
                *الأسعار وأوقات الدوام قد تتغير حسب المواسم السياحية وقرارات وزارة السياحة والآثار.
              </span>
              
                <a
                  href={selectedSpot.googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-6 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm rounded-xl transition-all shadow-md cursor-pointer"
                >
                  <Compass className="h-4 w-4" />
                  <span>افتح الاتجاهات على الخريطة</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
            </div>

          </div>
        </div>
      )}



    </div>
  );
}
