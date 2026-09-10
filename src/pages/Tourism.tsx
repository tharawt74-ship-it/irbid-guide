import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useParams, useNavigate } from 'react-router';
import { 
  MapPin, Compass, Search, Clock, Award, Info, 
  ExternalLink, Phone, Globe, ChevronRight, X, 
  Plus, Pencil, Trash2, Check, Star, RefreshCw, 
  Send, ShieldCheck, Share2, ArrowRight, DollarSign, Calendar
} from 'lucide-react';
import { collection, getDocs, doc, setDoc, deleteDoc, addDoc, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getAppConfig } from '../lib/demoDataHelper';
import { SEO } from '../components/common/SEO';
import { BannerSlideshow } from '../components/BannerSlideshow';
import { HomepageBanner } from '../types';
import { fetchPageBanners, DEFAULT_TOURISM_BANNERS } from '../lib/pageBanners';
import { useConfirm } from '../contexts/ConfirmContext';
import { ImageUploader } from '../components/ui/ImageUploader';

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
  createdAt?: number;
}

const CATEGORIES = ['الكل', 'معالم أثرية', 'طبيعة ومحميات', 'ترفيه ومتنزهات', 'متاحف وثقافة'];

const PRESET_IMAGES = [
  { label: 'أم قيس الأثرية', url: 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=800&q=80' },
  { label: 'غابات طبيعية برقش', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=800&q=80' },
  { label: 'وسط مدينة إربد', url: 'https://images.unsplash.com/photo-1566121318535-b28fe4063df4?auto=format&fit=crop&w=800&q=80' },
  { label: 'بحيرات وطبيعة', url: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800&q=80' },
  { label: 'حدائق ومسطحات خضراء', url: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=800&q=80' }
];

const SEED_TOURISM_SPOTS: TourismSpot[] = [
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
  }
];

export function Tourism() {
  const { confirm } = useConfirm();
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const [spots, setSpots] = useState<TourismSpot[]>([]);
  const [banners, setBanners] = useState<HomepageBanner[]>(DEFAULT_TOURISM_BANNERS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState<TourismSpot | null>(null);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<'أثري' | 'طبيعة' | 'ترفيه' | 'ثقافة'>('أثري');
  const [formImage, setFormImage] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formGoogleMapsUrl, setFormGoogleMapsUrl] = useState('');
  const [formOpeningHours, setFormOpeningHours] = useState('8:00 صباحاً - 5:00 مساءً');
  const [formEntryFee, setFormEntryFee] = useState('مجاني');
  const [formRating, setFormRating] = useState('4.8');
  const [formTagsString, setFormTagsString] = useState('');
  const [formTipsString, setFormTipsString] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  useEffect(() => {
    fetchPageBanners(['سياحة', 'آثار', 'معالم', 'أم قيس', 'طبيعة'], DEFAULT_TOURISM_BANNERS, 'tourism')
      .then(res => setBanners(res))
      .catch(() => setBanners(DEFAULT_TOURISM_BANNERS));

    async function loadTourismSpots() {
      setLoading(true);
      try {
        if (!db) {
          setSpots(SEED_TOURISM_SPOTS);
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

        if (items.length === 0 && appConfig.showDemoData) {
          // Seed the static spots into Firestore
          for (const spot of SEED_TOURISM_SPOTS) {
            const docRef = doc(collection(db, 'tourism'), spot.id);
            await setDoc(docRef, { ...spot, isDemo: true });
          }
          setSpots(SEED_TOURISM_SPOTS);
        } else {
          setSpots(items);
        }
      } catch (err) {
        console.error("Error loading tourism spots:", err);
        setSpots(SEED_TOURISM_SPOTS);
      } finally {
        setLoading(false);
      }
    }
    loadTourismSpots();
  }, []);

  const openAddModal = () => {
    if (!isAdmin) {
      showToast('عذراً، إضافة المعالم السياحية مقتصرة على الإدارة فقط');
      return;
    }
    setEditingSpot(null);
    setFormName('');
    setFormCategory('أثري');
    setFormImage(PRESET_IMAGES[0].url);
    setFormDescription('');
    setFormLocation('');
    setFormGoogleMapsUrl('');
    setFormOpeningHours('طوال اليوم');
    setFormEntryFee('مجاني');
    setFormRating('4.8');
    setFormTagsString('');
    setFormTipsString('');
    setIsModalOpen(true);
  };

  const openEditModal = (e: React.MouseEvent, spot: TourismSpot) => {
    e.stopPropagation(); // Avoid triggering details navigation
    if (!isAdmin) {
      showToast('عذراً، تعديل المعالم مقتصر على الإدارة فقط');
      return;
    }
    setEditingSpot(spot);
    setFormName(spot.name || '');
    setFormCategory(spot.category || 'أثري');
    setFormImage(spot.image || PRESET_IMAGES[0].url);
    setFormDescription(spot.description || '');
    setFormLocation(spot.location || '');
    setFormGoogleMapsUrl(spot.googleMapsUrl || '');
    setFormOpeningHours(spot.openingHours || 'طوال اليوم');
    setFormEntryFee(spot.entryFee || 'مجاني');
    setFormRating(String(spot.rating || 4.8));
    setFormTagsString((spot.tags || []).join('، '));
    setFormTipsString((spot.tips || []).join('\n'));
    setIsModalOpen(true);
  };

  const handleSaveSpot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      showToast('عذراً، تعديل ونشر المعالم متاح للمدراء فقط');
      return;
    }
    if (!formName.trim() || !formDescription.trim() || !formLocation.trim()) {
      showToast('يرجى تعبئة الحقول الأساسية المطلوبة');
      return;
    }

    setSaving(true);
    const tags = formTagsString
      ? formTagsString.split('،').map(t => t.trim()).filter(Boolean)
      : formCategory === 'أثري' ? ['تاريخ', 'آثار'] : formCategory === 'طبيعة' ? ['طبيعة', 'محمية'] : ['ثقافة', 'إربد'];
    
    const tips = formTipsString
      ? formTipsString.split('\n').map(t => t.trim()).filter(Boolean)
      : ['ارتداء حذاء مشي مريح وملائم للموقع', 'المحافظة التامة على نظافة وجمال المكان'];

    const spotPayload = {
      name: formName.trim(),
      category: formCategory,
      image: formImage.trim() || PRESET_IMAGES[0].url,
      description: formDescription.trim(),
      location: formLocation.trim(),
      googleMapsUrl: formGoogleMapsUrl.trim() || `https://maps.google.com/?q=${encodeURIComponent(formName.trim())}`,
      openingHours: formOpeningHours.trim() || 'مفتوح طوال اليوم',
      entryFee: formEntryFee.trim() || 'مجاني',
      rating: Number(formRating) || 4.8,
      tags,
      tips,
      createdAt: editingSpot?.createdAt || Date.now()
    };

    try {
      if (editingSpot) {
        // Edit mode
        if (db) {
          await setDoc(doc(db, 'tourism', editingSpot.id), spotPayload, { merge: true });
        }
        setSpots(prev => prev.map(item => item.id === editingSpot.id ? { id: editingSpot.id, ...spotPayload } as TourismSpot : item));
        showToast('تم تعديل المعلم السياحي بنجاح 🎉');
      } else {
        // Add new mode
        let newId = `spot-${Date.now()}`;
        if (db) {
          const docRef = await addDoc(collection(db, 'tourism'), spotPayload);
          newId = docRef.id;
        }
        const newSpot: TourismSpot = { id: newId, ...spotPayload } as TourismSpot;
        setSpots(prev => [newSpot, ...prev]);
        showToast('تمت إضافة المعلم السياحي الجديد بنجاح 🚀');
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save tourism spot:', err);
      showToast('حدث خطأ أثناء حفظ المعلم السياحي');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSpot = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Avoid detail view trigger
    if (!isAdmin) {
      showToast('عذراً، حذف المعالم مقتصر على مدير الموقع فقط');
      return;
    }
    if (!(await confirm({ message: 'هل أنت متأكد من حذف هذا المعلم السياحي نهائياً من دليل إربد؟' }))) return;

    try {
      if (db) {
        await deleteDoc(doc(db, 'tourism', id));
      }
      setSpots(prev => prev.filter(item => item.id !== id));
      showToast('تم حذف المعلم بنجاح');
      if (searchParams.get('id') === id) {
        setSearchParams({});
      }
    } catch (err) {
      console.error('Failed to delete tourism spot:', err);
      showToast('تعذر حذف المعلم');
    }
  };

  const filteredSpots = spots.filter(spot => {
    const matchesCategory = selectedCategory === 'الكل' || 
      spot.category === (selectedCategory === 'معالم أثرية' ? 'أثري' : selectedCategory === 'طبيعة ومحميات' ? 'طبيعة' : selectedCategory === 'ترفيه ومتنزهات' ? 'ترفيه' : 'ثقافة');
    const matchesSearch = 
      spot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spot.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      spot.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (spot.tags || []).some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  // Share link
  const handleShare = async (spot: TourismSpot) => {
    const shareUrl = `${window.location.origin}/tourism/${spot.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: spot.name,
          text: spot.description,
          url: shareUrl
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        showToast('تم نسخ رابط المعلم السياحي بنجاح! 🔗');
      }
    } catch (err) {
      await navigator.clipboard.writeText(shareUrl);
      showToast('تم نسخ رابط المعلم السياحي بنجاح! 🔗');
    }
  };

  const activeSpotId = routeId || searchParams.get('id');
  const activeSpot = spots.find(spot => spot.id === activeSpotId);

  // If a specific Tourism Spot details "page" is active, render the beautiful details view
  if (activeSpot) {
    const relatedSpots = spots
      .filter(s => s.id !== activeSpot.id && s.category === activeSpot.category)
      .slice(0, 3);

    return (
      <div className="w-full space-y-8 pb-16 max-w-4xl mx-auto" dir="rtl">
        <SEO 
          title={`${activeSpot.name} | معالم إربد السياحية`}
          description={activeSpot.description}
          canonicalUrl={`https://shofierbid.com/tourism?id=${activeSpot.id}`}
        />

        {/* Back navigation & Quick Admin tools */}
        <div className="flex items-center justify-between bg-white px-4 py-3.5 rounded-2xl border border-[#e5e1da] shadow-xs">
          <button
            onClick={() => {
              if (routeId) {
                navigate('/tourism');
              } else {
                setSearchParams({});
              }
            }}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-stone-600 hover:text-[#1a4d2e] transition-colors cursor-pointer"
          >
            <ArrowRight className="h-4 w-4 text-[#1a4d2e]" />
            <span>العودة لدليل السياحة والمعالم</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleShare(activeSpot)}
              className="p-2 bg-stone-50 hover:bg-stone-100 text-stone-700 rounded-xl border border-stone-200 cursor-pointer transition-all flex items-center gap-1.5 text-xs font-black"
              title="مشاركة المعلم"
            >
              <Share2 className="h-4 w-4 text-[#ff9f1c]" />
              <span className="hidden sm:inline">مشاركة</span>
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={(e) => openEditModal(e, activeSpot)}
                  className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200 cursor-pointer transition-all"
                  title="تعديل المعلم"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => handleDeleteSpot(e, activeSpot.id)}
                  className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-200 cursor-pointer transition-all"
                  title="حذف المعلم"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Dynamic Detail Card */}
        <article className="bg-white rounded-3xl border border-[#e5e1da] shadow-sm overflow-hidden">
          {/* Main Photo banner */}
          <div className="relative aspect-[16/9] md:aspect-[21/9] w-full bg-stone-100 overflow-hidden">
            <img 
              src={activeSpot.image} 
              alt={activeSpot.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-4 right-4 bg-[#1a4d2e] text-white px-3.5 py-1.5 rounded-full text-xs font-black shadow-md">
              {activeSpot.category === 'أثري' ? '🕌 معالم أثرية' : activeSpot.category === 'طبيعة' ? '🌲 طبيعة ومحميات' : activeSpot.category === 'ترفيه' ? '🎡 ترفيه ومتنزهات' : '🏛️ متاحف وثقافة'}
            </div>
            
            <div className="absolute bottom-4 right-4 bg-amber-500 text-stone-950 px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1 shadow-sm">
              <Star className="h-3.5 w-3.5 fill-stone-950 stroke-none" />
              <span>{activeSpot.rating} / 5.0</span>
            </div>
          </div>

          <div className="p-6 sm:p-10 space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black text-stone-900">{activeSpot.name}</h1>
              <p className="text-xs sm:text-sm font-bold text-stone-500 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-[#ff9f1c]" />
                <span>{activeSpot.location}</span>
              </p>
            </div>

            {/* Description */}
            <div className="space-y-2.5">
              <h3 className="font-black text-xs text-stone-400 uppercase tracking-wider">لمحة ومقدمة تفصيلية:</h3>
              <p className="text-stone-700 text-sm sm:text-base leading-relaxed whitespace-pre-line bg-stone-50 p-5 rounded-2xl border border-stone-200">
                {activeSpot.description}
              </p>
            </div>

            {/* Practical Logistics Panel */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-emerald-50/40 p-5 rounded-2xl border border-emerald-100">
              <div className="space-y-1 text-xs">
                <span className="font-black text-[#1a4d2e] block flex items-center gap-1">
                  <Clock className="h-4 w-4 text-[#ff9f1c]" />
                  ⏱ أوقات الدوام والزيارة:
                </span>
                <span className="text-stone-700 font-bold">{activeSpot.openingHours}</span>
              </div>
              <div className="space-y-1 text-xs">
                <span className="font-black text-[#1a4d2e] block flex items-center gap-1">
                  <DollarSign className="h-4 w-4 text-emerald-600" />
                  💵 تذاكر ورسوم الدخول:
                </span>
                <span className="text-stone-700 font-bold">{activeSpot.entryFee}</span>
              </div>
            </div>

            {/* Expert Tips */}
            {activeSpot.tips && activeSpot.tips.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-black text-sm text-[#1a4d2e] flex items-center gap-2 border-b border-stone-100 pb-2">
                  <Award className="h-4 w-4 text-[#ff9f1c]" />
                  <span>نصائح وتوجيهات الخبراء للزوار:</span>
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm text-stone-700 bg-stone-50 p-5 rounded-2xl border border-stone-200/80">
                  {activeSpot.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2.5">
                      <div className="h-2 w-2 rounded-full bg-emerald-600 shrink-0 mt-2"></div>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tags list */}
            {activeSpot.tags && activeSpot.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {activeSpot.tags.map((tag, idx) => (
                  <span key={idx} className="bg-stone-50 text-stone-600 border border-stone-200 text-xs font-bold px-3 py-1 rounded-xl">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Navigation and Actions */}
            <div className="pt-6 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-stone-500 font-medium">
                *الأسعار وأوقات الدوام قد تتغير حسب المواسم السياحية وقرارات وزارة السياحة والآثار.
              </span>
              <a
                href={activeSpot.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex justify-center items-center gap-2 px-6 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-sm rounded-xl transition-all shadow-md cursor-pointer"
              >
                <Compass className="h-4 w-4 text-[#ff9f1c]" />
                <span>عرض على خرائط Google</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </article>

        {/* Related Spots section */}
        {relatedSpots.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-black text-stone-900 flex items-center gap-2">
              <Compass className="h-5 w-5 text-[#ff9f1c]" />
              <span>معالم سياحية أخرى مشابهة</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedSpots.map(spot => (
                <div
                  key={spot.id}
                  onClick={() => navigate(`/tourism/${spot.id}`)}
                  className="bg-white rounded-2xl border border-[#e5e1da] p-3 shadow-3xs hover:shadow-sm cursor-pointer hover:border-[#1a4d2e]/30 transition-all flex flex-col gap-3 group"
                >
                  <div className="aspect-[16/10] w-full bg-stone-100 rounded-xl overflow-hidden relative">
                    <img 
                      src={spot.image} 
                      alt={spot.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2 bg-white/90 px-2 py-0.5 rounded-lg text-[9px] font-black text-[#1a4d2e]">
                      {spot.category}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs sm:text-sm text-stone-900 line-clamp-1 leading-tight group-hover:text-[#1a4d2e]">
                      {spot.name}
                    </h4>
                    <span className="text-[10px] text-stone-500 flex items-center gap-0.5">
                      <MapPin className="h-3 w-3 text-[#ff9f1c]" />
                      <span className="truncate">{spot.location}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 sm:space-y-10 pb-16 relative" dir="rtl">
      <SEO 
        title="السياحة ومعالم إربد | أم قيس، طبقة فحل، غابات برقش وتل إربد"
        description="دليل الأماكن السياحية والآثار والطبيعة في محافظة إربد وعروس الشمال: أم قيس، طبقة فحل، غابات برقش، سد وادي العرب، بيت عرار الثقافي، ومتحف التراث الأردني."
        keywords={['سياحة إربد', 'معالم إربد', 'أم قيس', 'طبقة فحل', 'غابات برقش', 'سد وادي العرب', 'بيت عرار', 'آثار إربد']}
        canonicalUrl="https://shofierbid.com/tourism"
      />
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999999] bg-[#1a4d2e] text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-500/30 animate-fade-in">
          <Check className="h-5 w-5 text-[#ff9f1c]" />
          <span className="font-bold text-sm">{toastMessage}</span>
        </div>
      )}

      {/* Banner Slideshow */}
      <BannerSlideshow banners={banners} />

      {/* Page Header & Search Bar (Compact & Sleek) */}
      <div className="bg-white rounded-2xl md:rounded-3xl p-3.5 sm:p-5 border border-[#e5e1da] shadow-xs space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="inline-flex items-center gap-1 bg-emerald-50 text-[#1a4d2e] border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-black">
                <Compass className="h-3 w-3 text-[#1a4d2e]" />
                <span>اكتشف سياحة إربد</span>
              </div>
              {isAdmin && (
                <div className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full text-[11px] font-bold">
                  <ShieldCheck className="h-3 w-3 text-emerald-700" />
                  <span>لوحة إدارة المعالم</span>
                </div>
              )}
            </div>
            
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
              أماكن سياحية ومعالم إربد
            </h1>
            
            <p className="hidden sm:block text-stone-500 text-xs font-medium leading-relaxed">
              استكشف آثار أم قيس وبيلا، أحضان غابات برقش والمتاحف العريقة.
            </p>
          </div>

          {/* Quick Actions in Banner - Only for Admin */}
          {isAdmin && (
            <div className="shrink-0">
              <button
                onClick={openAddModal}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-[#1a4d2e] hover:bg-[#143e25] text-white px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-xs cursor-pointer"
              >
                <Plus className="h-4 w-4 text-[#ff9f1c]" />
                <span>إضافة معلم جديد</span>
              </button>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن معلّم (أم قيس، غابة، متحف، سد)..."
            className="w-full bg-[#fdfcfb] text-stone-900 placeholder:text-stone-400 border border-[#e5e1da] rounded-xl px-3.5 py-2.5 pr-10 text-xs sm:text-sm focus:outline-none focus:border-[#1a4d2e] focus:bg-white transition-all shadow-inner"
          />
          <Search className="h-4 w-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-stone-100">
        {CATEGORIES.map(cat => (
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
          <RefreshCw className="h-8 w-8 text-[#1a4d2e] animate-spin" />
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
              onClick={() => navigate(`/tourism/${spot.id}`)}
              className="bg-white rounded-3xl border border-[#e5e1da] overflow-hidden hover:shadow-xl hover:border-[#1a4d2e]/30 transition-all flex flex-col justify-between group cursor-pointer relative"
            >
              {/* Actions panel overlay - Admin only */}
              {isAdmin && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-md p-1 rounded-xl z-20">
                  <button
                    onClick={(e) => openEditModal(e, spot)}
                    className="p-1.5 bg-white/90 hover:bg-white text-stone-700 hover:text-[#1a4d2e] rounded-lg transition-colors cursor-pointer"
                    title="تعديل المعلم"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteSpot(e, spot.id)}
                    className="p-1.5 bg-white/90 hover:bg-red-50 text-stone-700 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                    title="حذف المعلم"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <div>
                {/* Photo Header */}
                <div className="relative aspect-[16/10] overflow-hidden bg-stone-100">
                  <img 
                    src={spot.image} 
                    alt={spot.name} 
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-md text-stone-800 px-2.5 py-1 rounded-lg text-[10px] font-black shadow-2xs">
                    {spot.category === 'أثري' ? '🏯 معالم أثرية' : spot.category === 'طبيعة' ? '🌲 طبيعة ومحميات' : spot.category === 'ترفيه' ? '🎡 ترفيه وتسلية' : '🏛️ ثقافة وفنون'}
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
                  {spot.tags && spot.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {spot.tags.slice(0, 3).map((tag, idx) => (
                        <span key={idx} className="bg-stone-50 text-stone-600 border border-stone-200/50 text-[10px] font-bold px-2 py-0.5 rounded-md">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
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

      {/* Add / Edit Tourism Spot Modal - Admin Only */}
      {isModalOpen && isAdmin && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 relative my-auto animate-scale-in">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#e5e1da] pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-[#1a4d2e]/10 text-[#1a4d2e] p-2.5 rounded-2xl">
                  {editingSpot ? <Pencil className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#2d2a26]">
                    {editingSpot ? 'تعديل المعلم السياحي' : 'إضافة معلم سياحي جديد'}
                  </h3>
                  <p className="text-xs text-stone-500">
                    أدخل معلومات وموقع المعلم السياحي في دليل إربد
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveSpot} className="space-y-5">
              
              {/* Name */}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">
                  اسم المعلم السياحي <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: مدينة أم قيس الأثرية، محمية برقش..."
                  className="w-full p-3.5 bg-stone-50 border border-[#e5e1da] rounded-xl text-[#2d2a26] text-sm focus:bg-white focus:border-[#1a4d2e] focus:ring-2 focus:ring-[#1a4d2e]/20 outline-none transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">
                  الوصف والنبذة التاريخية والجمالية للمكان <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="تحدث بالتفصيل عن أهمية المكان ومظهره التراثي أو الطبيعي وخصائصه..."
                  className="w-full p-3.5 bg-stone-50 border border-[#e5e1da] rounded-xl text-[#2d2a26] text-sm focus:bg-white focus:border-[#1a4d2e] outline-none transition-all resize-none"
                ></textarea>
              </div>

              {/* Category & Rating */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">
                    القسم / التصنيف
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full p-3 bg-stone-50 border border-[#e5e1da] rounded-xl text-[#2d2a26] text-sm focus:bg-white focus:border-[#1a4d2e] outline-none"
                  >
                    <option value="أثري">أثري / تاريخي 🏯</option>
                    <option value="طبيعة">طبيعة ومحميات 🌲</option>
                    <option value="ترفيه">ترفيه وتسلية 🎡</option>
                    <option value="ثقافة">ثقافة ومتاحف 🏛️</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">
                    تقييم المعلم (من 5.0)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={formRating}
                    onChange={(e) => setFormRating(e.target.value)}
                    placeholder="4.8"
                    className="w-full p-3 bg-stone-50 border border-[#e5e1da] rounded-xl text-[#2d2a26] text-sm focus:bg-white focus:border-[#1a4d2e] outline-none"
                  />
                </div>
              </div>

              {/* Location & Google Maps URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">
                    الموقع بالتفصيل <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="مثال: لواء بني كنانة، شمال إربد..."
                    className="w-full p-3 bg-stone-50 border border-[#e5e1da] rounded-xl text-[#2d2a26] text-sm focus:bg-white focus:border-[#1a4d2e] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">
                    رابط خرائط Google للموقع
                  </label>
                  <input
                    type="url"
                    value={formGoogleMapsUrl}
                    onChange={(e) => setFormGoogleMapsUrl(e.target.value)}
                    placeholder="https://maps.google.com/?q=..."
                    className="w-full p-3 bg-stone-50 border border-[#e5e1da] rounded-xl text-[#2d2a26] text-sm focus:bg-white focus:border-[#1a4d2e] outline-none"
                  />
                </div>
              </div>

              {/* Opening Hours & Entry Fee */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">
                    أوقات الزيارة / الدوام
                  </label>
                  <input
                    type="text"
                    value={formOpeningHours}
                    onChange={(e) => setFormOpeningHours(e.target.value)}
                    placeholder="مثال: 8:00 صباحاً - 6:00 مساءً"
                    className="w-full p-3 bg-stone-50 border border-[#e5e1da] rounded-xl text-[#2d2a26] text-sm focus:bg-white focus:border-[#1a4d2e] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1.5">
                    رسوم أو تذاكر الدخول
                  </label>
                  <input
                    type="text"
                    value={formEntryFee}
                    onChange={(e) => setFormEntryFee(e.target.value)}
                    placeholder="مثال: مجاني / مواطن: 1 دينار"
                    className="w-full p-3 bg-stone-50 border border-[#e5e1da] rounded-xl text-[#2d2a26] text-sm focus:bg-white focus:border-[#1a4d2e] outline-none"
                  />
                </div>
              </div>

              {/* Tags List */}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">
                  الوسوم والكلمات الدلالية (افصل بينها بـ "،")
                </label>
                <input
                  type="text"
                  value={formTagsString}
                  onChange={(e) => setFormTagsString(e.target.value)}
                  placeholder="مثال: آثار رومانية، إطلالة بحيرة، مسارات مشي..."
                  className="w-full p-3 bg-stone-50 border border-[#e5e1da] rounded-xl text-[#2d2a26] text-sm focus:bg-white focus:border-[#1a4d2e] outline-none"
                />
              </div>

              {/* Expert Tips */}
              <div>
                <label className="block text-sm font-bold text-stone-700 mb-1.5">
                  نصائح وإرشادات الخبراء للزوار (اكتب كل نصيحة في سطر مستقل)
                </label>
                <textarea
                  rows={4}
                  value={formTipsString}
                  onChange={(e) => setFormTipsString(e.target.value)}
                  placeholder="مثال: أفضل وقت للزيارة هو قبيل الغروب\nارتداء أحذية مشي مريحة للموقع الأثري"
                  className="w-full p-3 bg-stone-50 border border-[#e5e1da] rounded-xl text-[#2d2a26] text-sm focus:bg-white focus:border-[#1a4d2e] outline-none resize-none"
                ></textarea>
              </div>

              {/* Image Uploader & Presets */}
              <div className="space-y-2">
                <ImageUploader
                  label="صورة المعلم السياحي الرئيسية (رفع من الجهاز)"
                  folder="tourism"
                  value={formImage}
                  onChange={(url) => setFormImage(url)}
                  aspectRatio="cover"
                  placeholder="اختر ملف صورة للمعلم من جهازك أو اسحبها هنا"
                />

                {/* Quick Presets */}
                <div className="pt-1">
                  <span className="text-xs font-semibold text-stone-500 block mb-1.5">أو اختر صورة جاهزة مناسبة:</span>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_IMAGES.map((img) => (
                      <button
                        key={img.label}
                        type="button"
                        onClick={() => setFormImage(img.url)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          formImage === img.url 
                            ? 'bg-[#1a4d2e] text-white border-[#1a4d2e]' 
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {img.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e5e1da]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-[#e5e1da] font-bold text-sm text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving || !formName.trim() || !formDescription.trim() || !formLocation.trim()}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#1a4d2e] hover:bg-[#133b22] text-white font-bold text-sm transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>{editingSpot ? 'حفظ التعديلات' : 'نشر المعلم الآن'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
