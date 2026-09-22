import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { motion } from 'motion/react';
import { db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Business, MenuItem, PromoDeal, MenuItemVersion } from '../types';
import { 
  Utensils, 
  Flame, 
  Search, 
  Phone, 
  MapPin, 
  ChevronRight, 
  Share2, 
  ShoppingBag, 
  ChevronLeft, 
  Info, 
  HelpCircle, 
  AlertTriangle,
  Compass,
  ArrowRight,
  Clock,
  Heart,
  Tag,
  Star,
  ExternalLink,
  Plus,
  Minus,
  MessageCircle,
  X,
  LayoutGrid,
  List,
  ShoppingCart,
  Trash2,
  CheckCircle,
  Clock3,
  SlidersHorizontal
} from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
}

export default function BusinessMenuOffers() {
  const { id } = useParams<{ id: string }>();
  const [business, setBusiness] = useState<Business | null>(null);
  const [offers, setOffers] = useState<PromoDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Tabs State: 'menu' | 'offers' | 'cart'
  const [activeTab, setActiveTab] = useState<'menu' | 'offers' | 'cart'>('menu');
  
  // View Mode: 'grid' or 'list' (initially comes from business.menuQrLayout or 'grid', but is dynamically toggled)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Selected Food detail modal
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<MenuItemVersion | null>(null);
  const [modalQuantity, setModalQuantity] = useState<number>(1);
  const [shareCopied, setShareCopied] = useState(false);

  useEffect(() => {
    setSelectedVersion(null); // Default to "الطلب الأساسي (بدون إضافات)"
    setModalQuantity(1); // Default quantity
  }, [selectedItem]);

  // Cart State Management
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerTable, setCustomerTable] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  useEffect(() => {
    const fetchBusinessAndOffers = async () => {
      if (!id) return;
      try {
        setLoading(true);
        // Fetch Store doc
        const docRef = doc(db, 'businesses', id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          setError('المحل غير موجود أو ربما تم حذفه.');
          setLoading(false);
          return;
        }
        
        const bizData = { id: docSnap.id, ...docSnap.data() } as Business;
        setBusiness(bizData);
        
        // Use layout configuration saved by merchant as default
        if (bizData.menuQrLayout === 'list') {
          setViewMode('list');
        } else {
          setViewMode('grid');
        }

        // Fetch Offers for this business
        const offersQuery = query(collection(db, 'offers'), where('businessId', '==', id));
        const offersSnap = await getDocs(offersQuery);
        const fetchedOffers = offersSnap.docs.map(d => ({ id: d.id, ...d.data() } as PromoDeal));
        setOffers(fetchedOffers);
        
      } catch (err) {
        console.error("Error fetching menu & offers:", err);
        setError('حدث خطأ أثناء تحميل البيانات، الرجاء إعادة المحاولة.');
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessAndOffers();
  }, [id]);

  // Load cart from localStorage initially
  useEffect(() => {
    if (id) {
      const savedCart = localStorage.getItem(`cart_${id}`);
      if (savedCart) {
        try {
          setCart(JSON.parse(savedCart));
        } catch (e) {
          console.error("Error parsing cart storage:", e);
        }
      }
    }
  }, [id]);

  // Save cart changes to localStorage
  const saveCartToStorage = (updatedCart: CartItem[]) => {
    setCart(updatedCart);
    if (id) {
      localStorage.setItem(`cart_${id}`, JSON.stringify(updatedCart));
    }
  };

  // Add item to cart
  const addToCart = (item: MenuItem | PromoDeal, isOffer: boolean = false, selectedVersion?: MenuItemVersion, quantity: number = 1) => {
    const isPromo = isOffer;
    const itemId = !isPromo && selectedVersion ? `${item.id}-${selectedVersion.id}` : item.id;
    let itemName = isPromo ? (item as PromoDeal).title : (item as MenuItem).name;
    let itemPrice = parseFloat(String(isPromo ? (item as PromoDeal).newPrice : (item as MenuItem).price)) || 0;
    const itemImage = isPromo ? ((item as PromoDeal).image || (item as PromoDeal).imageUrl) : (item as MenuItem).imageUrl;

    if (!isPromo && selectedVersion) {
      itemName = `${(item as MenuItem).name} (${selectedVersion.name})`;
      const versionPriceVal = parseFloat(String(selectedVersion.price)) || 0;
      if (selectedVersion.priceType === 'fixed') {
        itemPrice = versionPriceVal;
      } else if (selectedVersion.priceType === 'additional') {
        itemPrice = itemPrice + versionPriceVal;
      }
    }

    const existingIndex = cart.findIndex(c => c.id === itemId);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += quantity;
      saveCartToStorage(updated);
    } else {
      const newItem: CartItem = {
        id: itemId,
        name: itemName,
        price: itemPrice,
        quantity: quantity,
        imageUrl: itemImage
      };
      saveCartToStorage([...cart, newItem]);
    }

    // Success bounce/feedback
    const btn = document.getElementById(`add-btn-${item.id}`);
    if (btn) {
      btn.classList.add('scale-95', 'bg-emerald-600', 'text-white');
      setTimeout(() => {
        btn.classList.remove('scale-95', 'bg-emerald-600', 'text-white');
      }, 300);
    }
  };

  // Update quantity
  const updateQuantity = (itemId: string, delta: number) => {
    const updated = cart.map(item => {
      if (item.id === itemId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean) as CartItem[];
    
    saveCartToStorage(updated);
  };

  // Remove item from cart
  const removeFromCart = (itemId: string) => {
    const updated = cart.filter(item => item.id !== itemId);
    saveCartToStorage(updated);
  };

  // Clear Cart
  const clearCart = () => {
    saveCartToStorage([]);
  };

  // Calculate Cart Totals
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-full border-4 border-stone-200 border-t-emerald-600 animate-spin mb-4"></div>
        <p className="text-sm font-bold text-stone-500">جاري تحميل منيو المحل والخصومات الحصرية...</p>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-full text-rose-500 mb-4">
          <AlertTriangle className="h-10 w-10 animate-bounce" />
        </div>
        <h3 className="text-lg font-black text-stone-800">عذراً، لم نتمكن من العثور على المحل المطلوب</h3>
        <p className="text-xs text-stone-500 mt-2 max-w-sm leading-relaxed">{error || 'قد يكون الرابط الذي اتبعته غير صحيح أو أن المحل لم يفعل قائمته الرقمية بعد.'}</p>
        <Link 
          to="/" 
          className="mt-6 px-6 py-2.5 bg-gradient-to-r from-emerald-700 to-emerald-800 text-white rounded-xl text-xs font-black shadow-md inline-flex items-center gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          <span>العودة للرئيسية</span>
        </Link>
      </div>
    );
  }

  // Check if feature is enabled by merchant
  const isFeatureEnabled = business.menuQrEnabled ?? true;
  if (!isFeatureEnabled) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-24 h-24 bg-stone-200/50 rounded-full flex items-center justify-center text-stone-400 mb-6 border border-stone-200 shadow-inner">
          <Utensils className="h-12 w-12" />
        </div>
        <h3 className="text-lg font-black text-stone-800">المنيو الرقمي غير مفعّل حالياً 🔒</h3>
        <p className="text-xs text-stone-500 mt-2 max-w-sm leading-relaxed">
          نعتذر منك يا غالي! لم يقم <strong>{business.name}</strong> بتفعيل المنيو الرقمي عبر الـ QR حالياً. يمكنك تصفح العروض العامة وموقع المحل من صفحته الرسمية.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5 mt-6 w-full max-w-xs">
          <Link 
            to={`/business/${business.id}`}
            className="px-5 py-2.5 bg-stone-900 hover:bg-stone-950 text-white text-xs font-black rounded-xl transition-all shadow-xs text-center"
          >
            زيارة صفحة المحل الرسمية 🏢
          </Link>
          <Link 
            to="/"
            className="px-5 py-2.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-700 text-xs font-bold rounded-xl transition-all text-center"
          >
            تصفح دليل إربد
          </Link>
        </div>
      </div>
    );
  }

  // Design Theme variables
  const themePrimaryColor = business.menuQrThemeColor || '#dc2626';
  const showPrices = business.menuQrShowPrices ?? true;
  const menuWelcome = business.menuQrWelcomeText || 'أهلاً بكم في قائمتنا الرقمية! تفضلوا باستكشاف وجباتنا وعروضنا الحصرية والطلب مباشرة.';
  const coverUrl = business.menuQrCoverImage || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80';

  // Extract menu categories dynamically
  const menuItems = business.menuItems || [];
  const categoriesInMenu = Array.from(new Set(menuItems.map(item => item.category || 'عام'))).filter(Boolean);

  // Filter menu items by search query and category
  const filteredMenuItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || (item.category || 'عام') === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  // Compile Cart Items for WhatsApp message
  const sendCartToWhatsApp = () => {
    if (cart.length === 0) return;
    
    let message = `*طلب جديد من المنيو الرقمي لـ (${business.name})* 🍽️✨\n`;
    message += `-----------------------------\n`;
    
    cart.forEach((item, idx) => {
      message += `${idx + 1}. *${item.name}* (الكمية: ${item.quantity}) - ${item.price * item.quantity} د.أ\n`;
    });
    
    message += `-----------------------------\n`;
    if (customerTable) {
      message += `📍 *رقم الطاولة / العنوان:* طاولة رقم [ ${customerTable} ]\n`;
    }
    if (orderNotes) {
      message += `📝 *ملاحظات الطلب:* ${orderNotes}\n`;
    }
    message += `💰 *المجموع الكلي:* *${totalPrice.toFixed(2)} د.أ*\n\n`;
    message += `شكراً لكم! تم إرسال الطلب عبر خدمة منيو الـ QR المطور.`;

    const encodedText = encodeURIComponent(message);
    const whatsappPhone = business.phone ? business.phone.replace(/^0/, '') : '962790000000';
    const whatsappUrl = `https://wa.me/962${whatsappPhone}?text=${encodedText}`;
    
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] pb-64 text-stone-800 selection:bg-emerald-100 selection:text-emerald-950 font-sans" dir="rtl">
      
      {/* 1. CINEMATIC MODERN HEADER & HERO COVER */}
      <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-stone-950">
        <img 
          src={coverUrl} 
          className="w-full h-full object-cover opacity-60 scale-100 hover:scale-105 transition-transform duration-1000 ease-out" 
          alt={business.name} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent"></div>
        
        {/* Navigation Overlays */}
        <div className="absolute top-5 inset-x-4 max-w-4xl mx-auto flex justify-between items-center z-10 px-2">
          <Link 
            to={`/business/${business.id}`}
            className="p-3 rounded-2xl bg-black/40 backdrop-blur-xl text-white hover:bg-black/60 transition-all border border-white/10 shadow-lg flex items-center justify-center"
            title="العودة لصفحة المحل"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
          
          <div className="flex items-center gap-2">
            {/* Go to page button (White, square shaped) */}
            <Link 
              to={business.username ? `/@${business.username}` : `/business/${business.id}`}
              className="p-3 rounded-2xl bg-white text-stone-900 hover:bg-stone-50 transition-all shadow-lg flex items-center justify-center border border-stone-200 cursor-pointer"
              title="انتقل لصفحتنا"
            >
              <ExternalLink className="h-5 w-5" />
            </Link>

            {/* Share Button */}
            <button 
              type="button"
              onClick={handleShare}
              className="p-3 rounded-2xl bg-black/40 backdrop-blur-xl text-white hover:bg-black/60 transition-all border border-white/10 shadow-lg flex items-center justify-center cursor-pointer"
              title="مشاركة المنيو"
            >
              <Share2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Store Title Overlay */}
        <div className="absolute bottom-6 inset-x-4 max-w-4xl mx-auto px-4 text-white space-y-2">
          <div className="flex items-center gap-3.5">
            {/* Business Logo/Avatar */}
            {business.logoUrl || business.imageUrl || business.image ? (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-white/10 backdrop-blur-md border-2 border-white/40 shadow-xl shrink-0 flex items-center justify-center">
                <img 
                  src={business.logoUrl || business.imageUrl || business.image} 
                  className="w-full h-full object-cover" 
                  alt={business.name}
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/30 shadow-xl shrink-0 flex items-center justify-center">
                <Utensils className="h-6 w-6 text-white" />
              </div>
            )}

            <div className="space-y-1 text-right">
              <h1 className="text-xl sm:text-3xl font-black drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] text-white leading-tight">{business.name}</h1>
              <p className="text-xs sm:text-sm text-white/95 max-w-sm sm:max-w-md leading-relaxed font-bold drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] line-clamp-2">
                أهلاً وسهلاً بكم في محلنا! تفضلوا باستكشاف أشهى مأكولاتنا ومشروباتنا وعروضنا الحصرية.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Share Toast Notification */}
      {shareCopied && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200000] bg-stone-900 text-white px-5 py-3.5 rounded-2xl text-xs font-black shadow-2xl border border-stone-800 animate-in fade-in zoom-in-95 flex items-center gap-2">
          <span>تم نسخ رابط المنيو والـ QR لمشاركته مع أصدقائك! 🔗🎉</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-6">
        
        {/* ======================================================== */}
        {/* VIEW 1: DIGITAL MENU TAB */}
        {/* ======================================================== */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            
            {/* Filter and View Layout Toggler (Sticky Header at Top) */}
            <div className="sticky top-3 z-40 bg-white/90 backdrop-blur-md p-4 rounded-3xl border border-stone-200/80 shadow-sm space-y-4">
              
              {/* Categories Scroller */}
              {categoriesInMenu.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none snap-x" dir="rtl">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className={`px-4.5 py-2 rounded-full text-xs font-black cursor-pointer shrink-0 transition-all ${
                      selectedCategory === 'all'
                        ? 'bg-[var(--primary-color)] text-white shadow-sm font-black'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80 hover:text-stone-800'
                    }`}
                    style={{ '--primary-color': themePrimaryColor } as any}
                  >
                    الكل 🍽️
                  </button>
                  {categoriesInMenu.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4.5 py-2 rounded-full text-xs font-black cursor-pointer shrink-0 transition-all ${
                        selectedCategory === cat
                          ? 'bg-[var(--primary-color)] text-white shadow-sm'
                          : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80 hover:text-stone-800'
                      }`}
                      style={{ '--primary-color': themePrimaryColor } as any}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Menu Items Rendering list/grid */}
            {filteredMenuItems.length === 0 ? (
              <div className="bg-white border border-stone-200/80 p-12 rounded-3xl text-center space-y-3">
                <div className="w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center text-stone-400 mx-auto border border-stone-100">
                  <Utensils className="h-8 w-8" />
                </div>
                <h4 className="text-sm font-black text-stone-700">لم نجد أي وجبات مطابقة للبحث</h4>
                <p className="text-xs text-stone-400 max-w-xs mx-auto">تأكد من كتابة اسم الصنف أو الوجبة بشكل صحيح، أو تصفح الأقسام الأخرى.</p>
              </div>
            ) : (
              
              /* CHOSEN DYNAMIC VIEW MODE */
              viewMode === 'grid' ? (
                /* GRID CARDS LAYOUT */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {filteredMenuItems.map(item => (
                    <div 
                      key={item.id}
                      className="bg-white rounded-3xl border border-stone-200/80 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      {/* Image header */}
                      <div 
                        onClick={() => setSelectedItem(item)}
                        className="relative h-44 w-full bg-stone-50 overflow-hidden cursor-pointer"
                      >
                        {item.imageUrl ? (
                          <img 
                            src={item.imageUrl} 
                            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" 
                            alt={item.name} 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-stone-100/50 text-stone-400">
                            <Utensils className="h-12 w-12 opacity-40" />
                          </div>
                        )}
                        
                        {item.badge && item.badge !== 'none' && (
                          <span className="absolute top-3 right-3 bg-rose-600 text-white font-black text-[9px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                            <Flame className="h-3 w-3 fill-white" />
                            {item.badge === 'popular' ? 'الأكثر طلباً 🔥' : item.badge === 'spicy' ? 'حار 🌶️' : item.badge === 'vegetarian' ? 'نباتي 🌿' : 'جديد ✨'}
                          </span>
                        )}
                      </div>
                      
                      {/* Item Info and Action */}
                      <div className="p-4.5 space-y-3.5 flex-1 flex flex-col justify-between">
                        <div className="cursor-pointer" onClick={() => setSelectedItem(item)}>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-black text-sm text-stone-900 group-hover:text-[var(--primary-color)] transition-colors leading-tight" style={{ '--primary-color': themePrimaryColor } as any}>
                              {item.name}
                            </h4>
                            
                            {showPrices && (
                              <span className="text-xs font-black text-[var(--primary-color)] shrink-0 bg-[var(--primary-color)]/5 px-2.5 py-1 rounded-xl border border-[var(--primary-color)]/10" style={{ '--primary-color': themePrimaryColor } as any}>
                                {item.price} د.أ
                              </span>
                            )}
                          </div>
                          
                          <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed mt-1.5">
                            {item.description || 'صنف طازج ومعد بأيدينا من أفضل المكونات الطبيعية الممتازة.'}
                          </p>
                        </div>

                        {/* Interactive shopping buttons */}
                        <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                          <span className="text-[10px] text-stone-400 font-bold shrink-0">فئة: <strong className="text-stone-700">{item.category || 'عام'}</strong></span>
                          
                          {item.versions && item.versions.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setSelectedItem(item)}
                              className="px-4 py-2 bg-amber-50 hover:bg-amber-600 hover:text-white text-amber-800 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs border border-amber-100"
                            >
                              <span>تخصيص الطلب</span>
                              <ChevronLeft className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              id={`add-btn-${item.id}`}
                              onClick={() => addToCart(item)}
                              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs border border-emerald-100"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>إضافة للسلة</span>
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              ) : (
                /* DETAILED MODERN LIST LAYOUT */
                <div className="space-y-3.5">
                  {filteredMenuItems.map(item => (
                    <div 
                      key={item.id}
                      className="bg-white rounded-3xl border border-stone-200/80 p-4 flex items-center justify-between gap-4 hover:shadow-xs transition-all group"
                    >
                      {/* Left Side: item texts */}
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setSelectedItem(item)}>
                          <h4 className="font-black text-sm sm:text-base text-stone-900 group-hover:text-[var(--primary-color)] transition-colors truncate" style={{ '--primary-color': themePrimaryColor } as any}>
                            {item.name}
                          </h4>
                          {item.badge && item.badge !== 'none' && (
                            <span className="bg-rose-50 text-rose-700 font-bold text-[8px] px-2 py-0.5 rounded-full border border-rose-200">
                              {item.badge === 'popular' ? 'محبوب 🔥' : 'جديد ✨'}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-xs text-stone-500 line-clamp-1 leading-relaxed cursor-pointer" onClick={() => setSelectedItem(item)}>
                          {item.description || 'وجبة طازجة مجهزة بمكونات غنية ومختارة بدقة لأجلكم.'}
                        </p>
                        
                        <div className="flex items-center gap-3 text-[10px] text-stone-400 font-bold">
                          <span>فئة: <strong className="text-stone-600">{item.category || 'عام'}</strong></span>
                          {showPrices && (
                            <span className="text-[var(--primary-color)] bg-[var(--primary-color)]/5 border border-[var(--primary-color)]/10 px-2.5 py-0.5 rounded-lg font-black" style={{ '--primary-color': themePrimaryColor } as any}>
                              {item.price} د.أ
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right Side: thumbnail & quick add button */}
                      <div className="flex items-center gap-3 shrink-0">
                        {item.imageUrl ? (
                          <div 
                            onClick={() => setSelectedItem(item)}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-stone-50 border border-stone-100 cursor-pointer"
                          >
                            <img src={item.imageUrl} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" alt="" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center text-stone-400 border border-stone-100">
                            <Utensils className="h-5 w-5 opacity-40" />
                          </div>
                        )}

                        {/* Add button */}
                        {item.versions && item.versions.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setSelectedItem(item)}
                            className="p-2.5 bg-amber-50 hover:bg-amber-600 text-amber-800 hover:text-white rounded-2xl transition-all cursor-pointer border border-amber-100 shadow-3xs"
                            title="تخصيص الطلب"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            id={`add-btn-${item.id}`}
                            onClick={() => addToCart(item)}
                            className="p-2.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-800 hover:text-white rounded-2xl transition-all cursor-pointer border border-emerald-100 shadow-3xs"
                            title="إضافة للسلة"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              )

            )}

          </div>
        )}

        {/* ======================================================== */}
        {/* VIEW 2: OFFERS TAB */}
        {/* ======================================================== */}
        {activeTab === 'offers' && (
          <div className="space-y-5">
            {offers.length === 0 ? (
              <div className="bg-white border border-stone-200/80 p-12 rounded-3xl text-center space-y-3">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mx-auto">
                  <Tag className="h-8 w-8" />
                </div>
                <h4 className="text-sm font-black text-stone-700">لا يوجد عروض نشطة حالياً لهذا المحل</h4>
                <p className="text-xs text-stone-400 leading-relaxed max-w-sm mx-auto">لم يقم المحل بإدراج خصومات ترويجية لهذا اليوم، تصفح المنيو لاستكشاف الوجبات والأسعار المتوفرة.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab('menu')}
                  className="mt-3 px-5 py-2.5 bg-stone-900 hover:bg-stone-950 text-white rounded-xl text-xs font-black shadow-sm transition-colors cursor-pointer"
                >
                  تصفح قائمة الوجبات
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {offers.map(offer => {
                  const nPrice = parseFloat(String(offer.newPrice || ''));
                  const oPrice = parseFloat(String(offer.oldPrice || ''));
                  const savePercent = nPrice && oPrice && oPrice > nPrice
                    ? Math.round(((oPrice - nPrice) / oPrice) * 100)
                    : 0;

                  return (
                    <div 
                      key={offer.id}
                      className="bg-white rounded-3xl border border-stone-200/80 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      {/* Image header with discount badge */}
                      <div className="relative h-48 w-full bg-stone-50 overflow-hidden">
                        {offer.image || offer.imageUrl ? (
                          <img src={offer.image || offer.imageUrl} className="w-full h-full object-cover" alt={offer.title} />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center">
                            <Tag className="h-12 w-12 text-amber-500/40" />
                          </div>
                        )}

                        {/* Top Overlays */}
                        {savePercent > 0 && (
                          <span className="absolute top-3.5 right-3.5 bg-rose-600 text-white font-black text-xs px-3 py-1 rounded-full shadow-md flex items-center gap-1 animate-bounce">
                            <Flame className="h-3.5 w-3.5 fill-white animate-pulse" />
                            <span>وفر {savePercent}% 🔥</span>
                          </span>
                        )}

                        {/* Expiry Overlay */}
                        {(offer.expiresIn || offer.expiresAt) && (
                          <span className="absolute bottom-3.5 left-3.5 bg-black/60 backdrop-blur-md text-white text-[9px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1">
                            <Clock className="h-3 w-3 text-amber-400" />
                            <span>ينتهي خلال: {offer.expiresIn || (offer.expiresAt ? new Date(offer.expiresAt).toLocaleDateString('ar-JO') : '')}</span>
                          </span>
                        )}
                      </div>

                      {/* Details */}
                      <div className="p-5 space-y-4 flex-1 flex flex-col justify-between text-right">
                        <div>
                          <h4 className="font-black text-sm sm:text-base text-stone-900 leading-tight">{offer.title}</h4>
                          <p className="text-xs text-stone-500 mt-2 leading-relaxed whitespace-pre-wrap line-clamp-3">{offer.description}</p>
                        </div>

                        {/* Pricing and cart addition */}
                        <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-rose-600">
                              {offer.newPrice} د.أ
                            </span>
                            {offer.oldPrice && (
                              <span className="text-xs font-bold text-stone-400 line-through">
                                {offer.oldPrice} د.أ
                              </span>
                            )}
                          </div>

                          <div className="flex gap-1.5">
                            {/* Quick Add to Cart */}
                            <button
                              type="button"
                              id={`add-btn-${offer.id}`}
                              onClick={() => addToCart(offer, true)}
                              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 rounded-xl text-xs font-black transition-all flex items-center gap-1 cursor-pointer border border-emerald-100"
                              title="أضف العرض للسلة"
                            >
                              <ShoppingBag className="h-4 w-4" />
                              <span>أضف للطلب</span>
                            </button>
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

        {/* VIEW 3: FULL PAGE SHOPPING CART */}
        {activeTab === 'cart' && (
          <div className="space-y-6 pb-36 animate-in fade-in duration-300">
            <div className="bg-white p-6 rounded-3xl border border-stone-200/80 shadow-xs space-y-6">
              
              <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <ShoppingCart className="h-6 w-6 text-emerald-600" />
                  <h2 className="text-lg sm:text-xl font-black text-stone-900">سلة طلباتك المحددة 🛒</h2>
                </div>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs font-black text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                  >
                    مسح السلة بالكامل
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-24 h-24 bg-stone-50 rounded-full flex items-center justify-center text-stone-300 border border-stone-100 shadow-2xs">
                    <ShoppingBag className="h-12 w-12 text-stone-400" />
                  </div>
                  <h3 className="text-base font-black text-stone-800">السلة فارغة حالياً</h3>
                  <p className="text-xs sm:text-sm text-stone-500 max-w-sm leading-relaxed">
                    تصفح منيو الطعام أو العروض الفعالة وأضف وجباتك اللذيذة هنا لتتمكن من إرسالها للمحل مباشرة عبر الواتساب!
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('menu')}
                    className="px-6 py-3 bg-[var(--primary-color)] text-white rounded-2xl text-xs sm:text-sm font-black shadow-md hover:opacity-90 transition-all cursor-pointer flex items-center gap-2"
                    style={{ '--primary-color': themePrimaryColor } as any}
                  >
                    <span>تصفح منيو الوجبات الآن</span>
                    <ArrowRight className="h-4 w-4 rotate-180" />
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  
                  {/* Cart Items List */}
                  <div className="divide-y divide-stone-100">
                    {cart.map(item => (
                      <div key={item.id} className="py-4 flex items-center gap-4 justify-between">
                        {/* Item Info */}
                        <div className="flex items-center gap-3.5 min-w-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} className="w-14 h-14 rounded-2xl object-cover border border-stone-100 shrink-0" alt="" />
                          ) : (
                            <div className="w-14 h-14 rounded-2xl bg-stone-50 flex items-center justify-center text-stone-400 shrink-0 border border-stone-100">
                              <Utensils className="h-6 w-6" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-black text-sm sm:text-base text-stone-900 truncate">{item.name}</h4>
                            <span className="text-xs text-stone-500 font-bold">{item.price} د.أ للواحد</span>
                          </div>
                        </div>

                        {/* Quantity controls & Delete */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center bg-stone-100 rounded-xl p-1 border border-stone-200/50">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, -1)}
                              className="p-1.5 rounded-lg text-stone-600 hover:bg-white transition-colors cursor-pointer"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="text-sm font-black text-stone-800 px-3">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, 1)}
                              className="p-1.5 rounded-lg text-stone-600 hover:bg-white transition-colors cursor-pointer"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title="إزالة الصنف"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Table details or address & notes */}
                  <div className="bg-stone-50 rounded-3xl p-5 border border-stone-200/60 space-y-4">
                    <h5 className="text-xs font-black text-stone-500 uppercase tracking-wider">تفاصيل التوصيل أو رقم الطاولة</h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Table number */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-stone-600 block">رقم الطاولة (إذا كنت تجلس داخل المحل) أو العنوان:</label>
                        <input 
                          type="text" 
                          value={customerTable}
                          onChange={(e) => setCustomerTable(e.target.value)}
                          placeholder="مثال: طاولة رقم 4، أو توصيل لمنزل رقم..."
                          className="w-full bg-white border border-stone-200/80 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 text-stone-800"
                        />
                      </div>

                      {/* Order notes */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-stone-600 block">ملاحظات إضافية على الوجبات:</label>
                        <input 
                          type="text"
                          value={orderNotes}
                          onChange={(e) => setOrderNotes(e.target.value)}
                          placeholder="مثال: بدون بصل، زيادة كاتشب، حار خفيف..."
                          className="w-full bg-white border border-stone-200/80 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 text-stone-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Summary calculations & Submit button */}
                  <div className="bg-emerald-50/50 rounded-3xl p-6 border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 text-right">
                      <div className="flex items-center gap-1.5 text-xs text-stone-500 font-bold">
                        <span>عدد الأصناف الإجمالي:</span>
                        <span className="bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded-full text-[10px] font-black">{totalItems} أصناف</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-black text-stone-800">الحساب الإجمالي التقريبي:</span>
                        <span className="text-xl sm:text-2xl font-black text-emerald-800">{totalPrice.toFixed(2)} د.أ</span>
                      </div>
                      <span className="text-[10px] text-stone-400 font-bold block leading-relaxed">
                        ملاحظة: يتم احتساب الضرائب وأجور التوصيل من خلال إدارة المحل مباشرة عند الطلب.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={sendCartToWhatsApp}
                      className="py-3.5 px-6 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs sm:text-sm font-black rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg hover:scale-101 cursor-pointer"
                    >
                      <MessageCircle className="h-5 w-5 fill-white" />
                      <span>إرسال الطلب عبر الواتساب</span>
                    </button>
                  </div>

                </div>
              )}

            </div>
          </div>
        )}

      {/* ======================================================== */}
      {/* 5. FOOD ITEM DETAIL MODAL */}
      {/* ======================================================== */}
      {selectedItem && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[300000] overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-md w-full flex flex-col overflow-hidden my-auto animate-in zoom-in-95">
            
            {/* Modal Image Header if exists */}
            {selectedItem.imageUrl ? (
              <div className="relative h-56 bg-stone-50 w-full overflow-hidden">
                <img src={selectedItem.imageUrl} className="w-full h-full object-cover" alt="" />
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-3 right-3 p-2 rounded-full bg-black/40 backdrop-blur-xs text-white hover:bg-black/60 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="p-4 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
                <h4 className="font-black text-sm text-stone-900">تفاصيل وجبة المنيو 🍽️</h4>
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="p-1 rounded-full hover:bg-stone-100 text-stone-500 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Modal body */}
            <div className="p-5 sm:p-6 space-y-5 text-right">
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-black text-base sm:text-lg text-stone-950">{selectedItem.name}</h3>
                  {showPrices && (
                    <span className="text-base font-black text-[var(--primary-color)] shrink-0 bg-[var(--primary-color)]/5 border border-[var(--primary-color)]/10 px-3 py-1 rounded-xl" style={{ '--primary-color': themePrimaryColor } as any}>
                      {(() => {
                        let base = parseFloat(String(selectedItem.price)) || 0;
                        if (selectedVersion) {
                          const vPrice = parseFloat(String(selectedVersion.price)) || 0;
                          if (selectedVersion.priceType === 'fixed') {
                            base = vPrice;
                          } else if (selectedVersion.priceType === 'additional') {
                            base = base + vPrice;
                          }
                        }
                        return base.toFixed(2);
                      })()} د.أ
                    </span>
                  )}
                </div>
                
                <span className="text-[10px] bg-stone-100 text-stone-500 px-2.5 py-0.5 rounded-full font-bold inline-block">
                  التصنيف: {selectedItem.category || 'عام'}
                </span>
              </div>

              {/* Description */}
              <div className="space-y-1 bg-stone-50/80 p-3.5 rounded-2xl border border-stone-200/50">
                <span className="text-[10px] font-black text-stone-400 block uppercase">مكونات وتفاصيل الوجبة:</span>
                <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-wrap">{selectedItem.description || 'صنف طازج يتم تحضيره يومياً بأجود المكونات الطازجة.'}</p>
              </div>

              {/* Customization Options: Sizes or Addons */}
              {selectedItem.versions && selectedItem.versions.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-[10px] font-black text-stone-400 block uppercase">
                    {selectedItem.versionType === 'sizes' ? 'الرجاء اختيار الحجم المطلوب:' : 'الرجاء اختيار الإضافة المطلوبة:'}
                  </span>
                  <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1">
                    
                    {/* Option 0: Basic Order (Default) */}
                    <button
                      type="button"
                      onClick={() => setSelectedVersion(null)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
                        selectedVersion === null
                          ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/5 ring-2 ring-[var(--primary-color)]/10 font-black'
                          : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-600'
                      }`}
                      style={{ '--primary-color': themePrimaryColor } as any}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          selectedVersion === null ? 'border-[var(--primary-color)] text-[var(--primary-color)]' : 'border-stone-300'
                        }`}>
                          {selectedVersion === null && (
                            <div className="w-2 h-2 rounded-full bg-[var(--primary-color)]" style={{ '--primary-color': themePrimaryColor } as any} />
                          )}
                        </div>
                        <span className="text-xs sm:text-sm font-bold">الطلب الأساسي (بدون إضافات)</span>
                      </div>
                      {showPrices && (
                        <span className="text-xs font-black">
                          {parseFloat(selectedItem.price).toFixed(2)} د.أ
                        </span>
                      )}
                    </button>

                    {/* Versions/Options loaded from business */}
                    {selectedItem.versions.map((ver) => {
                      const isSelected = selectedVersion?.id === ver.id;
                      const verPrice = parseFloat(String(ver.price)) || 0;
                      return (
                        <button
                          key={ver.id}
                          type="button"
                          onClick={() => setSelectedVersion(ver)}
                          className={`flex items-center justify-between p-3.5 rounded-2xl border text-right transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/5 ring-2 ring-[var(--primary-color)]/10 font-black'
                              : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-600'
                          }`}
                          style={{ '--primary-color': themePrimaryColor } as any}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-[var(--primary-color)] text-[var(--primary-color)]' : 'border-stone-300'
                            }`}>
                              {isSelected && (
                                <div className="w-2 h-2 rounded-full bg-[var(--primary-color)]" style={{ '--primary-color': themePrimaryColor } as any} />
                              )}
                            </div>
                            <span className="text-xs sm:text-sm font-bold">{ver.name}</span>
                          </div>
                          {showPrices && (
                            <span className="text-xs font-black">
                              {ver.priceType === 'fixed' 
                                ? `${verPrice.toFixed(2)} د.أ` 
                                : ver.priceType === 'additional' 
                                ? `+ ${verPrice.toFixed(2)} د.أ` 
                                : 'مجاناً'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity Selector Option */}
              <div className="bg-stone-50/80 p-3.5 rounded-2xl border border-stone-200/50 flex items-center justify-between gap-4">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-black text-stone-800">الكمية المطلوبة</span>
                  <span className="text-[10px] text-stone-400 font-bold">حدد عدد الوجبات للطلب</span>
                </div>
                <div className="flex items-center gap-3 bg-white border border-stone-200/60 rounded-full p-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setModalQuantity(prev => Math.max(1, prev - 1))}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-stone-50 hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm font-black text-stone-900">{modalQuantity}</span>
                  <button
                    type="button"
                    onClick={() => setModalQuantity(prev => prev + 1)}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-stone-50 hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-stone-100 flex items-center gap-3">
                
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2.5 border border-stone-200 hover:bg-stone-100 rounded-xl text-xs font-bold text-stone-600 transition-colors flex-1 cursor-pointer"
                >
                  إغلاق
                </button>

                {/* Add to cart directly from Modal */}
                <button
                  type="button"
                  onClick={() => {
                    addToCart(selectedItem, false, selectedVersion || undefined, modalQuantity);
                    setSelectedItem(null);
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl cursor-pointer flex-1.5 shadow-md flex items-center justify-center gap-1.5 animate-pulse-subtle"
                >
                  <Plus className="h-4 w-4" />
                  <span>إضافة للطلب 🛒</span>
                </button>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* Floating Bottom Navbar & Search Bar right above it */}
      <div className="fixed bottom-2 sm:bottom-3 inset-x-4 max-w-lg mx-auto z-50 flex flex-col gap-1.5 pointer-events-none">
        {/* Search Bar & Layout Switcher - Slim Pillshaped Row */}
        {activeTab === 'menu' && (
          <div className="w-full pointer-events-auto bg-white/95 backdrop-blur-md rounded-full border border-stone-200/80 shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-1.5 animate-in slide-in-from-bottom-2 duration-300 flex items-center gap-2">
            
            {/* Input Wrapper */}
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في المنيو..."
                className="w-full bg-stone-50 border border-stone-100 rounded-full pl-4 pr-11 py-2.5 text-xs sm:text-sm font-bold text-stone-800 outline-none focus:bg-white focus:ring-2 focus:ring-[var(--primary-color)]/20 transition-all placeholder:text-stone-400"
                style={{ '--primary-color': themePrimaryColor } as any}
              />
              <Search className="absolute top-1/2 right-4 -translate-y-1/2 h-4 w-4 text-stone-400" />
              {searchQuery && (
                <button 
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute top-1/2 left-4 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Layout Switcher - Pillshaped Widget */}
            <div className="flex bg-stone-100 p-0.5 rounded-full border border-stone-200/50 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-full transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-stone-900 shadow-sm font-black'
                    : 'text-stone-400 hover:text-stone-600'
                }`}
                title="عرض الشبكة (بطاقات)"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-full transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-stone-900 shadow-sm font-black'
                    : 'text-stone-400 hover:text-stone-600'
                }`}
                title="عرض القائمة (طولي)"
              >
                <List className="h-4 w-4" />
              </button>
            </div>

          </div>
        )}

        {/* Floating Bottom Tab Bar - Sophisticated & Generously Proportioned Pillshaped */}
        <div 
          className="w-full pointer-events-auto bg-white/95 backdrop-blur-md rounded-full border border-stone-200/80 shadow-[0_16px_40px_rgba(0,0,0,0.18)] p-2 grid grid-cols-3 gap-2 relative z-10"
          style={{ '--primary-color': themePrimaryColor } as any}
        >
          {/* Tab 1: Menu (Right Side) */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('menu');
              window.scrollTo({ top: 320, behavior: 'smooth' });
            }}
            className="py-3.5 px-3 rounded-full text-center text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer relative"
          >
            {activeTab === 'menu' && (
              <motion.div
                layoutId="activePillTab"
                className="absolute inset-0 bg-[var(--primary-color)] rounded-full -z-10"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <Utensils className={`h-4.5 w-4.5 transition-colors duration-200 ${activeTab === 'menu' ? 'text-white' : 'text-stone-400'}`} />
            <span className={`transition-colors duration-200 ${activeTab === 'menu' ? 'text-white' : 'text-stone-600'}`}>المنيو</span>
          </button>

          {/* Tab 2: Offers (Center) */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('offers');
              window.scrollTo({ top: 320, behavior: 'smooth' });
            }}
            className="py-3.5 px-3 rounded-full text-center text-xs sm:text-sm font-black relative transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {activeTab === 'offers' && (
              <motion.div
                layoutId="activePillTab"
                className="absolute inset-0 bg-[var(--primary-color)] rounded-full -z-10"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <Tag className={`h-4.5 w-4.5 transition-colors duration-200 ${activeTab === 'offers' ? 'text-white' : 'text-amber-500'}`} />
            <span className={`transition-colors duration-200 ${activeTab === 'offers' ? 'text-white' : 'text-stone-600'}`}>العروض</span>
            {offers.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all duration-200 ${
                activeTab === 'offers' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
              }`}>
                {offers.length}
              </span>
            )}
          </button>

          {/* Tab 3: Integrated Shopping Cart (Left Side) */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('cart');
              window.scrollTo({ top: 320, behavior: 'smooth' });
            }}
            className="py-3.5 px-3 rounded-full text-center text-xs sm:text-sm font-black relative transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {activeTab === 'cart' && (
              <motion.div
                layoutId="activePillTab"
                className="absolute inset-0 bg-emerald-500 rounded-full -z-10"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <div className="relative">
              <ShoppingCart className={`h-4.5 w-4.5 transition-colors duration-200 ${activeTab === 'cart' ? 'text-white' : totalItems > 0 ? 'text-emerald-600 animate-bounce' : 'text-stone-400'}`} />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white rounded-full text-[8px] h-4 w-4 flex items-center justify-center font-black animate-pulse">
                  {totalItems}
                </span>
              )}
            </div>
            <div className="flex flex-col items-start leading-none text-right">
              <span className={`transition-colors duration-200 ${activeTab === 'cart' ? 'text-white' : 'text-stone-600'}`}>السلة</span>
              {totalItems > 0 && (
                <span className={`text-[8.5px] font-black leading-none mt-0.5 transition-colors duration-200 ${activeTab === 'cart' ? 'text-white/90' : 'text-emerald-600'}`}>
                  {totalPrice.toFixed(2)} د.أ
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Sho Fee Irbid Credit Label */}
        <div className="w-full text-center pointer-events-auto mt-0.5 animate-in fade-in duration-500 leading-none">
          <Link
            to="/"
            className="text-[9px] font-bold text-stone-400 hover:text-stone-600 transition-colors tracking-wide leading-none"
          >
            بواسطة شوفي بإربد؟
          </Link>
        </div>
      </div>

    </div>
  );
}
