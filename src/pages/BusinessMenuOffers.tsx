import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { motion } from 'motion/react';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, collection, query, where, getDocs, onSnapshot, setDoc, limit } from 'firebase/firestore';
import { saveLocalOrder, subscribeToLocalOrders } from '../lib/ordersSyncHelper';
import { updateBusinessMenuItemsInCache } from '../lib/dataCache';
import { Business, MenuItem, PromoDeal, MenuItemVersion } from '../types';
import { NotFound } from './NotFound';
import { VerifiedBadge } from '../components/vip/VerifiedBadge';
import { getBusinessVipStatus } from '../lib/vipHelper';

export function isFoodAndDrinkBusiness(biz: Business | null | undefined): boolean {
  if (!biz) return false;
  const cat = (biz.category || '').toLowerCase();
  const subcat = ((biz as any).subcategory || '').toLowerCase();

  const foodKeywords = [
    'مطاعم', 'مطعم', 'مأكولات', 'طعام', 'وجبات', 'كافيه', 'كافيهات', 'مقهى',
    'مشروبات', 'عصائر', 'حلويات', 'مخابز', 'معجنات', 'شاورما', 'برجر', 'بيتزا',
    'فلافل', 'كنافة', 'كريب', 'وافل', 'قهوة', 'شاي', 'آيس كريم', 'مأكولات شعبية',
    'مشاوي', 'أطعمة', 'food', 'cafe', 'restaurant', 'sweets', 'bakery', 'coffee'
  ];

  return foodKeywords.some(keyword => 
    cat.includes(keyword) || subcat.includes(keyword)
  );
}
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
 ChevronDown,
 ChevronUp,
 Info, 
 HelpCircle, 
 AlertTriangle,
 Compass,
 ArrowRight,
 Clock,
 Heart,
 Tag,
 Star,
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
 SlidersHorizontal,
 Home,
 Truck,
 FileText,
 Sparkles,
 Leaf,
 CookingPot,
 Check,
 Store,
 RotateCcw,
 Receipt,
 QrCode
} from 'lucide-react';
import { 
 getDeviceFingerprint, 
 checkOrderRateLimit, 
 recordOrderSubmission, 
 executeReCaptcha 
} from '../lib/security';

interface CartItem {
 id: string;
 name: string;
 price: number;
 quantity: number;
 imageUrl?: string;
 prepTimeMinutes?: number;
}

export default function BusinessMenuOffers() {
 const { id } = useParams<{ id: string }>();
 const [business, setBusiness] = useState<Business | null>(null);
 const [offers, setOffers] = useState<PromoDeal[]>([]);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 
 // Tabs State: 'menu' | 'offers' | 'cart'
 const [activeTab, setActiveTab] = useState<'menu' | 'offers' | 'cart'>('menu');
 
 // View Mode: 'grid' or 'list'
 const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
 
 // Filter & Search states
 const [searchQuery, setSearchQuery] = useState('');
 const [selectedCategory, setSelectedCategory] = useState<string>('all');
 
 // Selected Food detail modal
 const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
 const [selectedVersion, setSelectedVersion] = useState<MenuItemVersion | null>(null);
 const [modalQuantity, setModalQuantity] = useState<number>(1);
 const [shareCopied, setShareCopied] = useState(false);
 const [isInfoBannerCollapsed, setIsInfoBannerCollapsed] = useState(false);

 useEffect(() => {
 setSelectedVersion(null); // Default to "الطلب الأساسي (بدون إضافات)"
 setModalQuantity(1); // Default quantity
 }, [selectedItem]);

 // Cart State Management
 const [cart, setCart] = useState<CartItem[]>([]);
	const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
 const [customerTable, setCustomerTable] = useState('');
 const [orderNotes, setOrderNotes] = useState('');

 // Payment states (CliQ / Local wallets Jordan)
 const [paymentMethod, setPaymentMethod] = useState<'cash' | 'cliq' | 'wallet'>('cash');
 const [paymentTxId, setPaymentTxId] = useState('');
 const [paymentSenderName, setPaymentSenderName] = useState('');

 // Tipping states
 const [tipAmount, setTipAmount] = useState<number>(0);
 const [tipType, setTipType] = useState<'none' | '0.5' | '1' | '2' | 'percent_5' | 'percent_10' | 'custom'>('none');
 const [customTipValue, setCustomTipValue] = useState('');

 // Auto-extract table number query param on load
 useEffect(() => {
 const params = new URLSearchParams(window.location.search);
 const tableParam = params.get('table');
 if (tableParam) {
 setCustomerTable(tableParam);
 setCustomerFlow('menu'); // Automatically direct to menu when scanned from a table!
 }
 }, []);

 // Dynamically calculate Tip Amount based on selected Tip Type and Subtotal
 useEffect(() => {
 if (tipType === 'none') {
 setTipAmount(0);
 } else if (tipType === '0.5') {
 setTipAmount(0.5);
 } else if (tipType === '1') {
 setTipAmount(1.0);
 } else if (tipType === '2') {
 setTipAmount(2.0);
 } else if (tipType === 'percent_5') {
 setTipAmount(Number((totalPrice * 0.05).toFixed(2)));
 } else if (tipType === 'percent_10') {
 setTipAmount(Number((totalPrice * 0.10).toFixed(2)));
 } else if (tipType === 'custom') {
 setTipAmount(Number(customTipValue) || 0);
 }
 }, [tipType, customTipValue, totalPrice]);
 
 // Checkout & Direct Order states
 const [customerName, setCustomerName] = useState('');
 const [customerPhone, setCustomerPhone] = useState('');
 const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('dine_in');
 const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
 const [formError, setFormError] = useState<string | null>(null);
 const [activeOrder, setActiveOrder] = useState<any | null>(null);
 const [timeLeft, setTimeLeft] = useState<string>('');

 // Selection Flow State: 'select' | 'menu' | 'track'
 const [customerFlow, setCustomerFlow] = useState<'select' | 'menu' | 'track'>('select');
 const [trackCode, setTrackCode] = useState('');
 const [isSearchingTrack, setIsSearchingTrack] = useState(false);
 const [trackError, setTrackError] = useState<string | null>(null);

 // Radial Clip Reveal Page Transition State
 const [radialTransition, setRadialTransition] = useState<{
 active: boolean;
 x: number;
 y: number;
 radius: string;
 bgGradient: string;
 iconType: 'menu' | 'track' | 'select';
 title: string;
 stage: 'start' | 'expanding' | 'shrinking' | 'none';
 }>({
 active: false,
 x: 0,
 y: 0,
 radius: '0px',
 bgGradient: 'from-emerald-600 via-teal-700 to-emerald-950',
 iconType: 'menu',
 title: 'جاري فتح قائمة المنيو والعروض...',
 stage: 'none',
 });

 const triggerRadialTransition = (
 targetFlow: 'select' | 'menu' | 'track',
 e?: React.MouseEvent | React.FormEvent,
 customTheme?: { bg: string; iconType: 'menu' | 'track' | 'select'; title: string }
 ) => {
 let clickX = window.innerWidth / 2;
 let clickY = window.innerHeight / 2;

 if (e && 'clientX' in e && (e.clientX !== 0 || e.clientY !== 0)) {
 clickX = (e as React.MouseEvent).clientX;
 clickY = (e as React.MouseEvent).clientY;
 } else if (e && e.currentTarget && 'getBoundingClientRect' in e.currentTarget) {
 const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
 clickX = rect.left + rect.width / 2;
 clickY = rect.top + rect.height / 2;
 }

 let theme: { bg: string; iconType: 'menu' | 'track' | 'select'; title: string } = {
 bg: 'from-emerald-600 via-teal-700 to-emerald-950',
 iconType: 'menu',
 title: 'جاري فتح قائمة الطعام والعروض...',
 };

 if (targetFlow === 'track') {
 theme = {
 bg: 'from-blue-600 via-indigo-700 to-blue-950',
 iconType: 'track',
 title: 'جاري تحويلك لصفحة تتبع الطلب...',
 };
 } else if (targetFlow === 'select') {
 theme = {
 bg: 'from-stone-800 via-stone-900 to-stone-950',
 iconType: 'select',
 title: 'العودة لبوابة الترحيب والاختيار...',
 };
 }

 if (customTheme) theme = customTheme;

 // Phase 1: Set initial click origin with 0px radius
 setRadialTransition({
 active: true,
 x: clickX,
 y: clickY,
 radius: '0px',
 bgGradient: theme.bg,
 iconType: theme.iconType,
 title: theme.title,
 stage: 'start',
 });

 // Phase 2: Expand radial circle to 160vmax on next frame
 requestAnimationFrame(() => {
 requestAnimationFrame(() => {
 setRadialTransition(prev => ({
 ...prev,
 radius: '160vmax',
 stage: 'expanding',
 }));
 });
 });

 // Phase 3: Switch underlying flow state when fully covered (~320ms)
 setTimeout(() => {
 setCustomerFlow(targetFlow);
 window.scrollTo({ top: 0, behavior: 'smooth' });
 }, 320);

 // Phase 4: Begin fade/shrink phase (~480ms)
 setTimeout(() => {
 setRadialTransition(prev => ({
 ...prev,
 stage: 'shrinking',
 }));
 }, 480);

 // Phase 5: Deactivate transition overlay (~780ms)
 setTimeout(() => {
 setRadialTransition(prev => ({
 ...prev,
 active: false,
 stage: 'none',
 }));
 }, 780);
 };

 


 // Handle Search Track Order by 4-digit code
 const handleSearchTrackOrder = async (e: React.FormEvent) => {
 e.preventDefault();
 if (trackCode.length !== 4) {
 setTrackError('الرجاء إدخال كود مكون من 4 أرقام.');
 return;
 }
 setIsSearchingTrack(true);
 setTrackError(null);
 try {
 const q = query(
 collection(db, 'orders'),
 where('businessId', '==', id),
 where('shortCode', '==', trackCode)
 );
 const snap = await getDocs(q);
 if (!snap.empty) {
 const orderData: any = { id: snap.docs[0].id, ...snap.docs[0].data() };

 const refTime = (orderData.status === 'completed' && orderData.completedAt) 
 ? orderData.completedAt 
 : (orderData.createdAt || Date.now());
 const elapsed = Date.now() - refTime;

 if (elapsed > 30 * 60 * 1000 || orderData.status === 'cancelled' || orderData.status === 'rejected') {
 setTrackError('لم يتم العثور على أي طلب مطابق لهذا الكود. الرجاء التأكد وإعادة المحاولة.');
 return;
 }

 setActiveOrder(orderData);
 localStorage.setItem(`irbid_active_order_${id}`, JSON.stringify(orderData));
 
 // Transition directly to track view with Radial Clip Reveal
 triggerRadialTransition('track', e);
 } else {
 setTrackError('لم يتم العثور على أي طلب مطابق لهذا الكود. الرجاء التأكد وإعادة المحاولة.');
 }
 } catch (err) {
 console.warn("Error tracking order:", err);
 setTrackError('حدث خطأ أثناء البحث عن الطلب. يرجى إعادة المحاولة.');
 } finally {
 setIsSearchingTrack(false);
 }
 };

  // 1. Load active order from localStorage on mount
  useEffect(() => {
    if (!id) return;
    const storedOrderRaw = localStorage.getItem(`irbid_active_order_${id}`);
    if (storedOrderRaw) {
      try {
        const storedOrder = JSON.parse(storedOrderRaw);
        const elapsed = Date.now() - (storedOrder.createdAt || 0);
        if (
          elapsed < 1800000 &&
          storedOrder.status !== 'completed' &&
          storedOrder.status !== 'cancelled' &&
          storedOrder.status !== 'rejected'
        ) {
          setActiveOrder(storedOrder);
        } else {
          localStorage.removeItem(`irbid_active_order_${id}`);
        }
      } catch (e) {
        console.warn("Error loading stored order:", e);
      }
    }
  }, [id]);

  // 2. Real-Time dynamic listener for the active order (Local Sync & Firestore)
  useEffect(() => {
    if (!activeOrder?.id) return;
    let unsubscribeFirestore: (() => void) | undefined;
    let unsubscribeLocal: (() => void) | undefined;

    const handleOrderUpdate = (updatedData: any) => {
      if (!updatedData) return;
      const isEnded =
        updatedData.status === 'completed' ||
        updatedData.status === 'cancelled' ||
        updatedData.status === 'rejected';

      if (isEnded) {
        if (id) {
          localStorage.removeItem(`irbid_active_order_${id}`);
        }
      } else if (id) {
        localStorage.setItem(`irbid_active_order_${id}`, JSON.stringify(updatedData));
      }

      setActiveOrder(prev => {
        if (!prev) return updatedData;
        return { ...prev, ...updatedData };
      });
    };

    // A. Subscribe to cross-tab / local storage updates
    unsubscribeLocal = subscribeToLocalOrders((updatedData) => {
      if (
        updatedData &&
        (updatedData.id === activeOrder.id ||
          String(updatedData.shortCode) === String(activeOrder.shortCode))
      ) {
        handleOrderUpdate(updatedData);
      }
    });

    // B. Subscribe to Firestore updates
    if (db) {
      try {
        unsubscribeFirestore = onSnapshot(doc(db, "orders", activeOrder.id), (snapshot) => {
          if (snapshot.exists()) {
            const updatedData = { id: snapshot.id, ...snapshot.data() };
            saveLocalOrder(updatedData);
            handleOrderUpdate(updatedData);
          }
        }, (error) => {
          console.warn("Active order listener warning:", error?.message || error);
        });
      } catch (_) {}
    }

    return () => {
      if (unsubscribeFirestore) unsubscribeFirestore();
      if (unsubscribeLocal) unsubscribeLocal();
    };
  }, [activeOrder?.id, id]);

  useEffect(() => {
    if (!activeOrder) return;
    
    const updateTimer = () => {
      const refTime = (activeOrder.status === 'completed' && activeOrder.completedAt)
        ? activeOrder.completedAt
        : (activeOrder.createdAt || Date.now());
      const elapsed = Date.now() - refTime;
      const remainingMs = 30 * 60 * 1000 - elapsed;

      if (remainingMs <= 0) {
        setTimeLeft('expired');
        localStorage.removeItem(`irbid_active_order_${id}`);
        setActiveOrder(null);
      } else {
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        setTimeLeft(`${mins}:${secs.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeOrder, id]);

 useEffect(() => {
    if (!id || !db) return;
    setLoading(true);

    let unsubscribeBiz = () => {};
    let isCancelled = false;

    const attachListener = (targetId: string) => {
      const docRef = doc(db, 'businesses', targetId);
      unsubscribeBiz = onSnapshot(docRef, (docSnap) => {
        if (!docSnap.exists()) {
          setError('المحل غير موجود أو ربما تم حذفه.');
          setLoading(false);
          return;
        }

        const bizData = { id: docSnap.id, ...docSnap.data() } as Business;
        const vipStatus = getBusinessVipStatus(bizData);
        if (!vipStatus.isVip) {
          setError('هذا المحل مشترك في الباقة الأساسية. المنيو الرقمي والعروض متاحة حصراً للمحلات المشتركة في الباقة الذهبية.');
          setLoading(false);
          return;
        }
        setBusiness(bizData);
        if (Array.isArray(bizData.menuItems)) {
          updateBusinessMenuItemsInCache(docSnap.id, bizData.menuItems);
        }

        if (bizData.menuQrLayout === 'list') {
          setViewMode('list');
        } else {
          setViewMode('grid');
        }
        setLoading(false);
      }, (err) => {
        console.warn("onSnapshot business listener warning, falling back to getDoc:", err);
        getDoc(docRef).then((snap) => {
          if (snap.exists()) {
            const bData = { id: snap.id, ...snap.data() } as Business;
            const vipStatus = getBusinessVipStatus(bData);
            if (!vipStatus.isVip) {
              setError('هذا المحل مشترك في الباقة الأساسية. المنيو الرقمي والعروض متاحة حصراً للمحلات المشتركة في الباقة الذهبية.');
              setLoading(false);
              return;
            }
            setBusiness(bData);
            if (Array.isArray(bData.menuItems)) {
              updateBusinessMenuItemsInCache(snap.id, bData.menuItems);
            }
          }
        }).catch(() => {});
        setLoading(false);
      });

      const offersQuery = query(collection(db, 'offers'), where('businessId', 'in', [targetId, id]));
      getDocs(offersQuery).then(offersSnap => {
        const fetchedOffers = offersSnap.docs.map(d => ({ id: d.id, ...d.data() } as PromoDeal));
        setOffers(fetchedOffers);
      }).catch(err => {
        console.warn("Error fetching offers:", err);
      });
    };

    const cleanParam = id.startsWith('@') ? id.substring(1).trim().toLowerCase() : id.trim().toLowerCase();
    if (!id.startsWith('@')) {
      attachListener(id);
    } else {
      const qUsername = query(collection(db, 'businesses'), where('username', '==', cleanParam), limit(1));
      getDocs(qUsername).then(uSnap => {
        if (isCancelled) return;
        if (!uSnap.empty) {
          attachListener(uSnap.docs[0].id);
        } else {
          attachListener(id);
        }
      }).catch(() => attachListener(id));
    }

    return () => {
      isCancelled = true;
      unsubscribeBiz();
    };
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
 if (!isOffer && (item as MenuItem).isAvailable === false) {
 setFormError("عذراً، هذا الصنف غير متوفر حالياً في المطبخ.");
 setTimeout(() => setFormError(null), 3500);
 return;
 }
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
 imageUrl: itemImage,
 prepTimeMinutes: !isPromo ? (item as MenuItem).prepTimeMinutes : undefined
 };
 saveCartToStorage([...cart, newItem]);
 }

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
	const isDirectOrderingDisabled = business?.disableDirectOrder === true || (business as any)?.disableDirectOrder === 'true';

 if (loading) {
 return (
 <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4">
 <div className="w-12 h-12 rounded-full border-4 border-stone-200 border-t-emerald-600 animate-spin mb-4"></div>
 <p className="text-sm font-bold text-stone-500">جاري تحميل منيو المحل والخصومات الحصرية...</p>
 </div>
 );
 }

 if (error || !business || !isFoodAndDrinkBusiness(business)) {
   return <NotFound />;
 }

 // Check if feature is enabled by merchant
 const isFeatureEnabled = business.menuQrEnabled ?? true;
 if (!isFeatureEnabled) {
 return (
 <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-4 text-center">
 <div className="w-24 h-24 bg-stone-200/50 rounded-full flex items-center justify-center text-stone-400 mb-6 border border-stone-200 shadow-inner">
 <Utensils className="h-12 w-12" />
 </div>
 <h3 className="text-lg font-black text-stone-800">المنيو الرقمي غير مفعّل حالياً</h3>
 <p className="text-xs text-stone-500 mt-2 max-w-sm leading-relaxed">
 نعتذر منك! لم يقم <strong>{business.name}</strong> بتفعيل المنيو الرقمي عبر الـ QR حالياً. يمكنك تصفح العروض العامة وموقع المحل من صفحته الرسمية.
 </p>
 <div className="flex flex-col sm:flex-row gap-2.5 mt-6 w-full max-w-xs">
 <Link 
 to={`/business/${business.id}`}
 className="px-5 py-2.5 bg-stone-900 hover:bg-stone-950 text-white text-xs font-black rounded-xl transition-all shadow-xs text-center"
 >
 زيارة صفحة المحل الرسمية
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
 const rawCover = business.menuQrCoverImage || business.coverImage || business.imageUrl || '';
 const coverUrl = rawCover && !rawCover.includes('photo-1517248135467') && !rawCover.includes('photo-1555396273') ? rawCover : '';

 // Extract menu categories dynamically
 const menuItems = business.menuItems || [];
 const categoriesInMenu = Array.from(new Set(menuItems.map(item => item.category || 'عام'))).filter(Boolean);

 // Filter menu items by search query and category
 const filteredMenuItems = menuItems.filter(item => {
 const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
 (item.description || '').toLowerCase().includes(searchQuery.toLowerCase());
 const matchesCategory = selectedCategory === 'all' || (item.category || 'عام') === selectedCategory;
 return matchesSearch && matchesCategory;
 }).sort((a, b) => {
 const aUnavailable = a.isAvailable === false || (a.trackStock && a.stockCount === 0);
 const bUnavailable = b.isAvailable === false || (b.trackStock && b.stockCount === 0);
 if (aUnavailable && !bUnavailable) return 1;
 if (!aUnavailable && bUnavailable) return -1;
 return 0;
 });

 const handleShare = () => {
 navigator.clipboard.writeText(window.location.href);
 setShareCopied(true);
 setTimeout(() => setShareCopied(false), 2000);
 };

 const handlePlaceDirectOrder = async (e: React.FormEvent) => {
 e.preventDefault();
 setFormError(null);

 if (cart.length === 0) {
 setFormError("سلتك فارغة! يرجى إضافة وجبات من المنيو قبل الإرسال.");
 return;
 }
 if (!business) {
 setFormError("تعذر قراءة بيانات المطعم، يرجى إعادة تحميل الصفحة.");
 return;
 }
 if (!customerName.trim()) {
 setFormError("يرجى كتابة الاسم الكريم لتأكيد إرسال الطلب.");
 return;
 }
 if (!customerPhone.trim()) {
 setFormError("يرجى إدخال رقم الهاتف لتأكيد الطلب والتواصل مع المطعم.");
 return;
 }

 const targetBizId = String(business.id || id || '');
 const rateLimit = checkOrderRateLimit(targetBizId);
 if (!rateLimit.allowed) {
  setFormError(rateLimit.reason || "يرجى الانتظار قبل إرسال طلب جديد لهذا المطعم.");
  return;
 }

  try {
  setIsSubmittingOrder(true);

  let recaptchaToken = '';
  try {
   recaptchaToken = await executeReCaptcha('submit_order_qr');
  } catch (rcErr) {
   console.warn("reCAPTCHA enterprise execution fallback:", rcErr);
  }

  const deviceFingerprint = await getDeviceFingerprint();
	const orderId = 'ORD_' + Math.random().toString(36).substr(2, 9).toUpperCase();
	const shortCode = Math.floor(1000 + Math.random() * 9000).toString();
	
	const subtotal = totalPrice;
	const serviceRateVal = business.serviceRate || 0;
	const serviceFixedVal = business.serviceFixedFee || 0;
	const taxRateVal = business.taxRate || 0;

	const serviceFee = (subtotal * serviceRateVal / 100) + serviceFixedVal;
	const taxFee = subtotal * taxRateVal / 100;
	const grandTotal = subtotal + serviceFee + taxFee + tipAmount;

	const cleanOrderPayload: Record<string, any> = {
		id: orderId,
		businessId: String(business.id || id || ''),
		businessName: String(business.name || ''),
		items: cart.map(item => ({
			id: String(item.id || ''),
			name: String(item.name || ''),
			price: Number(item.price) || 0,
			quantity: Number(item.quantity) || 1,
			imageUrl: String(item.imageUrl || '')
		})),
		subtotal: Number(subtotal) || 0,
		serviceFee: Number(serviceFee) || 0,
		taxFee: Number(taxFee) || 0,
		tipAmount: Number(tipAmount) || 0,
		totalPrice: Number(grandTotal) || 0,
		customerName: customerName.trim(),
		customerPhone: customerPhone.trim(),
		orderType: orderType,
		tableNumber: customerTable.trim() || 'غير محدد',
		notes: orderNotes.trim() || '',
		status: 'pending',
		createdAt: Date.now(),
		shortCode: shortCode,
		paymentMethod: paymentMethod,
		paymentTxId: paymentTxId.trim(),
		paymentSenderName: paymentSenderName.trim(),
		deviceFingerprint: deviceFingerprint,
		recaptchaToken: recaptchaToken || 'token_verified'
	};

	const merchantIdVal = business.userId || business.ownerId || auth.currentUser?.uid || '';
	if (merchantIdVal) {
		cleanOrderPayload.merchantId = String(merchantIdVal);
	}

	recordOrderSubmission(targetBizId);

	setCart([]);
	localStorage.removeItem(`cart_${id}`);
	localStorage.setItem(`irbid_active_order_${id}`, JSON.stringify(cleanOrderPayload));
	setActiveOrder(cleanOrderPayload);
	saveLocalOrder(cleanOrderPayload);

 // 2. Persist to Firestore database directly and via backend API proxy
 try {
   if (auth && !auth.currentUser) {
     try {
       const { signInAnonymously } = await import('firebase/auth');
       await signInAnonymously(auth);
     } catch (_) {}
   }

   if (db) {
     await setDoc(doc(db, 'orders', orderId), cleanOrderPayload);
   }
 } catch (firestoreErr) {
   console.warn("Direct Firestore save notice (trying API proxy):", firestoreErr);
   try {
     await fetch('/api/orders', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(cleanOrderPayload)
     });
   } catch (apiErr) {
     console.warn("Order API proxy notice:", apiErr);
   }
 }

 // Also dispatch to /api/orders in background to ensure sync
 fetch('/api/orders', {
   method: 'POST',
   headers: { 'Content-Type': 'application/json' },
   body: JSON.stringify(cleanOrderPayload)
 }).catch(() => {});

 triggerRadialTransition('track');

 } catch (error: any) {
 console.error("Failed to place order:", error);
 setFormError("حدث خطأ أثناء معالجة الطلب، يرجى المحاولة مرة أخرى.");
 } finally {
 setIsSubmittingOrder(false);
 }
 };

 // Determine whether to show the main hero header banner
 // RULE: On Cart Page view (activeTab === 'cart' when flow === 'menu'), hide cover, restaurant name, welcome text, and open store button completely!
 const isCartView = customerFlow === 'menu' && activeTab === 'cart';

 return (
 <div 
 className="min-h-screen text-stone-800 selection:bg-emerald-100 selection:text-emerald-950 font-sans relative transition-colors duration-300" 
 style={{ backgroundColor: customerFlow === 'select' ? themePrimaryColor : '#fafaf8' }}
 dir="rtl"
 >
 
 {/* RADIAL CLIP REVEAL PAGE TRANSITION OVERLAY */}
 {radialTransition.active && (
 <div 
 className={`fixed inset-0 z-[999999] pointer-events-none flex flex-col items-center justify-center text-white bg-gradient-to-br ${radialTransition.bgGradient} shadow-2xl overflow-hidden`}
 style={{
 clipPath: `circle(${radialTransition.radius} at ${radialTransition.x}px ${radialTransition.y}px)`,
 transition: radialTransition.stage === 'expanding' 
 ? 'clip-path 400ms cubic-bezier(0.16, 1, 0.3, 1)' 
 : 'opacity 300ms ease-out, clip-path 300ms ease-in',
 opacity: radialTransition.stage === 'shrinking' ? 0 : 1,
 }}
 >
 {/* Centered Business Logo/Emblem Only (No icons, no text) */}
 <div className="flex items-center justify-center animate-in zoom-in-90 duration-300">
 {business?.logoUrl && !business.logoUrl.includes('photo-1594212699903') ? (
 <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl overflow-hidden bg-white border-4 border-white/80 shadow-2xl flex items-center justify-center shrink-0 animate-pulse">
 <img 
 src={business.logoUrl} 
 className="w-full h-full object-cover" 
 alt={business.name || 'Logo'} 
 referrerPolicy="no-referrer"
 />
 </div>
 ) : (
 <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-white text-stone-900 font-black text-4xl sm:text-5xl shadow-2xl flex items-center justify-center shrink-0 border-4 border-white/80 select-none animate-pulse">
 {(business?.name || 'م').trim().charAt(0)}
 </div>
 )}
 </div>
 </div>
 )}

 {/* ======================================================== */}
 {/* 1. WELCOME SCREEN VIEW (FULL-SCREEN BRAND COLOR & COVER) */}
 {/* ======================================================== */}
 {customerFlow === 'select' ? (
 <div 
 className="min-h-screen relative flex flex-col justify-center items-center px-4 py-10 overflow-hidden select-none"
 style={{ backgroundColor: themePrimaryColor }}
 >
 {/* Full Screen Transparent Cover Photo Overlay */}
 {coverUrl ? (
 <div className="absolute inset-0 pointer-events-none overflow-hidden">
 <img 
 src={coverUrl} 
 className="w-full h-full object-cover opacity-30 mix-blend-overlay scale-105" 
 alt="" 
 />
 <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
 </div>
 ) : (
 <div className="absolute inset-0 pointer-events-none overflow-hidden">
 <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/10 to-transparent rotate-12 scale-150" />
 <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />
 </div>
 )}

 {/* Share Button Overlay */}
 <div className="absolute top-5 right-5 z-20">
 <button 
 type="button"
 onClick={handleShare}
 className="p-3 rounded-2xl bg-black/30 backdrop-blur-md text-white hover:bg-black/50 transition-all border border-white/20 shadow-lg flex items-center justify-center cursor-pointer"
 title="مشاركة المنيو"
 >
 <Share2 className="h-5 w-5" />
 </button>
 </div>

 {/* Share Toast Notification */}
 {shareCopied && (
 <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200000] bg-stone-900 text-white px-5 py-3.5 rounded-2xl text-xs font-black shadow-2xl border border-stone-800 animate-in fade-in zoom-in-95 flex items-center gap-2">
 <Check className="h-4 w-4 text-emerald-400" />
 <span>تم نسخ رابط المنيو والـ QR لمشاركته بنجاح!</span>
 </div>
 )}

 {/* Centered Welcome Screen Content Container */}
 <div className="relative z-10 w-full max-w-md mx-auto space-y-6 sm:space-y-7 animate-in fade-in zoom-in-95 duration-500">
 
 {/* Store Branding: Logo ABOVE Heading */}
 <div className="text-center space-y-4 flex flex-col items-center">
 {business?.logoUrl && !business.logoUrl.includes('photo-1594212699903') ? (
 <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden bg-white border-2 border-white/80 shadow-2xl flex items-center justify-center shrink-0">
 <img 
 src={business.logoUrl} 
 className="w-full h-full object-cover" 
 alt={business.name} 
 referrerPolicy="no-referrer"
 />
 </div>
 ) : (
 <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white/20 backdrop-blur-md text-white font-black text-4xl shadow-2xl flex items-center justify-center shrink-0 border-2 border-white/60 select-none">
 {(business?.name || 'م').trim().charAt(0)}
 </div>
 )}

 <div className="space-y-1.5 text-white">
 <h2 className="text-2xl sm:text-3xl font-black text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)]">
 مرحباً بك في {business?.name}
 </h2>
 <p className="text-xs sm:text-sm text-white/90 font-bold leading-relaxed max-w-xs mx-auto drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
 يسعدنا خدمتك عبر المنيو الذكي والطلبات المباشرة في منصة شو في إربد
 </p>
 </div>
 </div>

 {/* Active order notification banner */}
 {(() => {
 if (!activeOrder) return null;
 if (activeOrder.status === 'cancelled' || activeOrder.status === 'rejected') return null;
 
 const refTime = (activeOrder.status === 'completed' && activeOrder.completedAt)
 ? activeOrder.completedAt
 : (activeOrder.createdAt || Date.now());
 const elapsed = Date.now() - refTime;
 if (elapsed >= 30 * 60 * 1000) return null;

 const isCompleted = activeOrder.status === 'completed';

 return (
 <div className="bg-white/95 backdrop-blur-md border border-white/80 p-4 rounded-3xl flex items-center justify-between shadow-xl animate-in fade-in duration-300">
 <div className="space-y-1 text-right">
 <div className="flex items-center gap-1.5 text-emerald-800">
 {isCompleted ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : <Clock className="h-4 w-4 text-emerald-600 animate-spin" />}
 <span className="text-[10px] font-black uppercase tracking-wider">
 {isCompleted ? 'طلبك مكتمل وجاهز الآن!' : 'لديك طلب نشط قيد المتابعة!'}
 </span>
 </div>
 <p className="text-xs font-black text-stone-800">
 كود التتبع: <span className="font-mono bg-emerald-100 text-emerald-950 px-2.5 py-1 rounded-md text-sm font-black">{activeOrder.shortCode || '----'}</span>
 </p>
 </div>
 <button
 type="button"
 onClick={(e) => triggerRadialTransition('track', e)}
 className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-md cursor-pointer flex items-center gap-1.5"
 >
 <span>عرض التتبع</span>
 <ChevronRight className="h-4 w-4 rotate-180" />
 </button>
 </div>
 );
 })()}

 {/* Gateway Selection Buttons */}
 <div className="grid grid-cols-1 gap-4">
 {/* Option 1: Place New Order */}
 <button
 type="button"
 onClick={(e) => triggerRadialTransition('menu', e)}
 className="p-5 sm:p-6 rounded-3xl bg-white/95 backdrop-blur-md border border-white/80 hover:border-emerald-500 hover:shadow-2xl transition-all flex items-center justify-between group cursor-pointer shadow-lg text-right w-full"
 >
 <div className="space-y-1 text-right">
 <div className="flex items-center gap-2">
 <Utensils className="h-5 w-5 text-emerald-600 shrink-0" />
 <h3 className="text-base sm:text-lg font-black text-stone-950 group-hover:text-emerald-700 transition-colors">طلب وجبات جديدة</h3>
 </div>
 <p className="text-xs text-stone-500 font-bold leading-relaxed">تصفح أقسام الأطعمة والمشروبات، أضفها لسلتك واطلب فوراً</p>
 </div>
 <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
 <ChevronRight className="h-5 w-5 rotate-180" />
 </div>
 </button>

 {/* Option 2: Track Active Order */}
 <button
 type="button"
 onClick={(e) => triggerRadialTransition('track', e)}
 className="p-5 sm:p-6 rounded-3xl bg-white/95 backdrop-blur-md border border-white/80 hover:border-blue-500 hover:shadow-2xl transition-all flex items-center justify-between group cursor-pointer shadow-lg text-right w-full"
 >
 <div className="space-y-1 text-right">
 <div className="flex items-center gap-2">
 <Clock className="h-5 w-5 text-blue-600 shrink-0" />
 <h3 className="text-base sm:text-lg font-black text-stone-950 group-hover:text-blue-700 transition-colors">تتبع حالة طلب قائم</h3>
 </div>
 <p className="text-xs text-stone-500 font-bold leading-relaxed">أدخل كود التتبع المكون من 4 أرقام لمعرفة حالة طلبك الحالي</p>
 </div>
 <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
 <ChevronRight className="h-5 w-5 rotate-180" />
 </div>
 </button>
 </div>

 </div>
 </div>
 ) : (
 /* STANDARD VIEW FOR MENU / TRACK / CART */
 <>
 {/* Header Banner (Hidden in Cart View) */}
 {!isCartView ? (
 <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-stone-950">
 {coverUrl ? (
 <>
 <img 
 src={coverUrl} 
 className="w-full h-full object-cover opacity-60 scale-100 hover:scale-105 transition-transform duration-1000 ease-out" 
 alt={business.name} 
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent"></div>
 </>
 ) : (
 <div className="absolute inset-0 bg-gradient-to-br from-[#e5e5e5] via-[#dcdcdc] to-[#bebebe] flex items-center justify-center select-none overflow-hidden">
 <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/15 to-transparent pointer-events-none rotate-12 scale-150" />
 <img 
 src="/logo.png" 
 alt="Site Logo" 
 className="h-16 w-auto object-contain grayscale opacity-45 contrast-150 brightness-50 select-none pointer-events-none"
 />
 <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
 </div>
 )}
 
 {/* Navigation Overlays */}
 <div className="absolute top-5 inset-x-4 max-w-4xl mx-auto flex justify-between items-center z-10 px-2">
 <button
 type="button"
 onClick={(e) => triggerRadialTransition('select', e)}
 className="p-3 rounded-2xl bg-black/40 backdrop-blur-xl text-white hover:bg-black/60 transition-all border border-white/10 shadow-lg flex items-center justify-center cursor-pointer"
 title="العودة لشاشة الترحيب والاختيار"
 >
 <ChevronRight className="h-5 w-5" />
 </button>
 
 <div className="flex items-center gap-2">
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
 {business.logoUrl && !business.logoUrl.includes('photo-1594212699903') ? (
 <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-white/10 backdrop-blur-md border-2 border-white/40 shadow-xl shrink-0 flex items-center justify-center">
 <img 
 src={business.logoUrl} 
 className="w-full h-full object-cover" 
 alt={business.name} 
 referrerPolicy="no-referrer"
 />
 </div>
 ) : (
 <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#1a4d2e] to-emerald-600 border-2 border-white/40 shadow-xl shrink-0 flex items-center justify-center text-white font-black text-2xl select-none">
 {(business.name || 'م').trim().charAt(0)}
 </div>
 )}

 <div className="space-y-1 text-right">
 <div className="flex items-center gap-2">
 <h1 className="text-xl sm:text-3xl font-black drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] text-white leading-tight">{business.name}</h1>
 {getBusinessVipStatus(business).isVip && (
 <VerifiedBadge size="md" businessName={business.name} />
 )}
 </div>
 <p className="text-xs sm:text-sm text-white/95 max-w-sm sm:max-w-md leading-relaxed font-bold drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)] line-clamp-2">
 {menuWelcome}
 </p>
 </div>
 </div>
 </div>
 </div>
 ) : (
 /* DEDICATED CLEAN TOP HEADER FOR CART PAGE VIEW */
 <div className="bg-white/95 backdrop-blur-md border-b border-stone-200/80 sticky top-0 z-50 shadow-xs">
 <div className="max-w-4xl mx-auto px-3 sm:px-6 py-2.5 sm:py-4 flex items-center justify-between gap-2">
 <button
 type="button"
 onClick={() => setActiveTab('menu')}
 className="px-3 sm:px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
 >
 <ChevronRight className="h-4 w-4 shrink-0" />
 <span className="hidden xs:inline sm:inline">العودة للمنيو</span>
 <span className="inline xs:hidden sm:hidden">المنيو</span>
 </button>

 <div className="flex items-center gap-1.5 sm:gap-2 text-stone-900 font-black text-sm sm:text-lg min-w-0 truncate">
 <ShoppingCart className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-emerald-600 shrink-0" />
 <span className="truncate">سلة الطلبات</span>
 {totalItems > 0 && (
 <span className="bg-emerald-100 text-emerald-800 text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full shrink-0">
 {totalItems}
 </span>
 )}
 </div>

 <button
 type="button"
 onClick={handleShare}
 className="p-2 sm:p-2.5 rounded-xl bg-stone-100 text-stone-600 hover:bg-stone-200 transition-all cursor-pointer shrink-0"
 title="مشاركة"
 >
 <Share2 className="h-4 w-4" />
 </button>
 </div>
 </div>
 )}

 {/* Share Toast Notification */}
 {shareCopied && (
 <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200000] bg-stone-900 text-white px-5 py-3.5 rounded-2xl text-xs font-black shadow-2xl border border-stone-800 animate-in fade-in zoom-in-95 flex items-center gap-2">
 <Check className="h-4 w-4 text-emerald-400" />
 <span>تم نسخ رابط المنيو والـ QR لمشاركته بنجاح!</span>
 </div>
 )}

 {/* Main Container */}
 <div className={`max-w-4xl mx-auto px-4 sm:px-6 mt-6 ${isCartView ? "hidden" : ""}`}>

 {customerFlow === 'track' && !activeOrder && (
 <div className="max-w-md mx-auto py-8 space-y-6 animate-in fade-in zoom-in-95 duration-300">
 <div className="text-center space-y-2.5">
 <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto text-blue-600 border border-blue-100 shadow-xs">
 <Compass className="h-8 w-8" />
 </div>
 <h2 className="text-2xl font-black text-stone-900">تتبع طلبك المباشر</h2>
 <p className="text-xs text-stone-500 font-bold leading-relaxed">الرجاء إدخال رمز التتبع المكون من 4 أرقام والذي حصلت عليه عند إرسال الطلب</p>
 </div>

 <form onSubmit={handleSearchTrackOrder} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xl space-y-4">
 <div className="space-y-2 text-right">
 <label className="text-xs font-black text-stone-600 block text-right">رمز التتبع (4 أرقام):</label>
 <input
 type="text"
 maxLength={4}
 value={trackCode}
 onChange={(e) => setTrackCode(e.target.value.replace(/[^0-9]/g, ''))}
 placeholder="مثال: 5832"
 className="w-full px-4.5 py-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-center font-mono text-xl font-black focus:outline-none focus:border-blue-500 tracking-widest text-stone-900"
 />
 </div>

 {trackError && (
 <p className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-xl text-right">{trackError}</p>
 )}

 <button
 type="submit"
 disabled={trackCode.length !== 4 || isSearchingTrack}
 className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs sm:text-sm font-black transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
 >
 {isSearchingTrack ? (
 <span className="inline-block w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
 ) : (
 <span>ابحث وتتبع الآن</span>
 )}
 </button>
 </form>

 <button
 type="button"
 onClick={(e) => triggerRadialTransition('select', e)}
 className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl text-xs font-black transition-all text-center cursor-pointer"
 >
 العودة للرئيسية
 </button>
 </div>
 )}

 {customerFlow === 'track' && activeOrder && (
 <div className="space-y-6 pb-6 animate-in fade-in duration-300">
 {/* Custom Active Order Tracker */}
 <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xl space-y-6 max-w-lg mx-auto text-center relative overflow-hidden">
 
 {/* Confirmed Order 4-Digit Banner */}
 <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200 text-center space-y-1">
 <span className="text-[10px] font-black text-blue-800 block tracking-wider uppercase">كود التتبع الخاص بالطلب</span>
 <p className="text-2xl font-mono font-black text-blue-950 tracking-wider">
 {activeOrder.shortCode || '----'}
 </p>
 <p className="text-[10px] text-blue-700 font-bold leading-relaxed">اعرض هذا الرقم للنادل أو الكاشير لتأكيد أو مراجعة طلبك داخل الصالة</p>
 </div>

 {/* QR Code Section for Cashier Scanning */}
 {activeOrder.status === 'pending' && (
 <div className="p-4 sm:p-5 bg-stone-50 rounded-3xl border border-stone-200/80 space-y-3 w-full animate-in fade-in duration-300">
 <div className="flex items-center justify-center gap-2 text-emerald-800 font-black text-xs sm:text-sm">
 <QrCode className="h-5 w-5 text-emerald-600 animate-bounce shrink-0" />
 <span>رمز الـ QR لتأكيد الطلب عند الكاشير أو النادل:</span>
 </div>
 <div className="bg-white p-3.5 rounded-2xl inline-block border border-stone-200 shadow-xs mx-auto">
 <img 
 src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${activeOrder.id}`} 
 alt="Order QR Code" 
 className="w-40 h-40 sm:w-48 sm:h-48 object-contain mx-auto"
 />
 </div>
 <p className="text-[11px] font-bold text-stone-600 leading-relaxed">
 اعرض هذا الـ QR أو كود التتبع أعلاه للموظف لمسحه بتطبيق الكاشير وتأكيد طلبك فوراً 🍽️
 </p>
 </div>
 )}

 {/* Order Tracker Header */}
 <div className="space-y-2">
 <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-600 border border-blue-100 shadow-2xs">
 <Clock className="h-8 w-8 text-blue-600 animate-spin" />
 </div>
 <h3 className="text-xl font-black text-stone-900">تتبع حالة طلبك مباشرة</h3>
 <p className="text-xs text-stone-500 font-bold">رقم الطلب الفريد: <span className="font-mono bg-stone-100 text-stone-700 px-2.5 py-1 rounded-md font-bold text-xs">{activeOrder.id}</span></p>
 </div>

 {/* Status Stepper */}
 <div className="relative py-4 max-w-xs mx-auto">
 <div className="absolute top-1/2 left-4 right-4 h-1 bg-stone-100 -translate-y-1/2 z-0"></div>
 <div 
 className="absolute top-1/2 right-4 h-1 bg-blue-500 -translate-y-1/2 z-0 transition-all duration-500"
 style={{
 width: activeOrder.status === 'pending' ? '15%' :
 activeOrder.status === 'processing' ? '55%' :
 activeOrder.status === 'completed' ? '100%' : '0%',
 left: 'auto'
 }}
 ></div>

 <div className="relative z-10 flex justify-between">
 <div className="flex flex-col items-center space-y-1">
 <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
 activeOrder.status === 'pending' || activeOrder.status === 'processing' || activeOrder.status === 'completed'
 ? 'bg-blue-500 border-blue-500 text-white shadow-xs'
 : 'bg-white border-stone-200 text-stone-400'
 }`}>
 1
 </div>
 <span className="text-[10px] font-black text-stone-800">قيد الانتظار</span>
 </div>

 <div className="flex flex-col items-center space-y-1">
 <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
 activeOrder.status === 'processing' || activeOrder.status === 'completed'
 ? 'bg-blue-500 border-blue-500 text-white shadow-xs'
 : activeOrder.status === 'pending'
 ? 'bg-blue-50 border-blue-300 text-blue-600 animate-pulse'
 : 'bg-white border-stone-200 text-stone-400'
 }`}>
 2
 </div>
 <span className="text-[10px] font-black text-stone-800">قيد التحضير</span>
 </div>

 <div className="flex flex-col items-center space-y-1">
 <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
 activeOrder.status === 'completed'
 ? 'bg-blue-500 border-blue-500 text-white shadow-xs'
 : 'bg-white border-stone-200 text-stone-400'
 }`}>
 3
 </div>
 <span className="text-[10px] font-black text-stone-800">جاهز ومكتمل</span>
 </div>
 </div>
 </div>

 {/* Status Callout Banner */}
 <div className={`p-4 rounded-2xl border text-xs sm:text-sm font-black leading-relaxed flex items-center justify-center gap-2 ${
 activeOrder.status === 'pending'
 ? 'bg-amber-50/50 border-amber-200 text-amber-900'
 : activeOrder.status === 'processing'
 ? 'bg-blue-50 border-blue-200 text-blue-900 animate-pulse'
 : activeOrder.status === 'completed'
 ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
 : 'bg-rose-50 border-rose-200 text-rose-950'
 }`}>
 {activeOrder.status === 'pending' && (
 <>
 <Clock className="h-4 w-4 text-amber-600 shrink-0" />
 <span>تم إرسال طلبك بنجاح وهو بانتظار قبول وتأكيد إدارة المحل حالياً...</span>
 </>
 )}
 {activeOrder.status === 'processing' && (
 <>
 <CookingPot className="h-4 w-4 text-blue-600 shrink-0" />
 <span>تم قبول طلبك! إدارة المحل تقوم الآن بتحضير وجباتك بكل عناية...</span>
 </>
 )}
 {activeOrder.status === 'completed' && (
 <>
 <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
 <span>طلبك جاهز ومكتمل الآن! صحة وعافية على قلبك...</span>
 </>
 )}
 {activeOrder.status === 'cancelled' && (
 <>
 <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
 <span>نعتذر منك، تم إلغاء الطلب من قبل إدارة المحل.</span>
 </>
 )}
 </div>

 {/* Order Details */}
 <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/60 text-right space-y-2">
 <h4 className="text-xs font-black text-stone-500 border-b border-stone-200/50 pb-1.5 flex justify-between">
 <span>تفاصيل طلبك المباشر:</span>
 <span className="text-[10px] font-bold text-stone-400">حالة الدفع: نقداً عند الاستلام</span>
 </h4>
 {activeOrder.items?.map((item: any, idx: number) => (
 <div key={idx} className="flex justify-between text-xs font-bold text-stone-700">
 <span>{item.quantity} {item.name}</span>
 <span>{(item.price * item.quantity).toFixed(2)} د.أ</span>
 </div>
 ))}
 <div className="flex justify-between text-xs font-black text-stone-900 border-t border-stone-200/50 pt-2">
 <span>الحساب الإجمالي:</span>
 <span className="text-emerald-800 text-sm">{activeOrder.totalPrice.toFixed(2)} د.أ</span>
 </div>
 {activeOrder.tableNumber && (
 <div className="text-xs font-bold text-stone-600 pt-1 flex items-center gap-1">
 <MapPin className="h-3.5 w-3.5 text-stone-400" />
 <span>موقع الاستلام / الطاولة: <strong className="text-stone-900">{activeOrder.tableNumber}</strong></span>
 </div>
 )}
 </div>

 <div className="flex gap-2">
 <button
 type="button"
 onClick={(e) => {
 setActiveOrder(null);
 triggerRadialTransition('track', e);
 }}
 className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-black transition-all cursor-pointer"
 >
 تتبع طلب آخر
 </button>
 <button
 type="button"
 onClick={(e) => {
 triggerRadialTransition('menu', e);
 }}
 className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer"
 >
 تصفح المنيو
 </button>
 </div>

 </div>
 </div>
 )}

 {customerFlow === 'menu' && (
 <>
 {activeTab === 'menu' && (
 <div className="space-y-6 pb-44 sm:pb-48">
	{isDirectOrderingDisabled && (
		<div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-3 sm:p-3.5 text-amber-950 text-xs shadow-3xs transition-all duration-300">
			<div className="flex items-center justify-between gap-2.5">
				<div className="flex items-center gap-2">
					<div className="w-6 h-6 rounded-lg bg-amber-200/60 flex items-center justify-center text-amber-800 shrink-0">
						<Info className="h-3.5 w-3.5" />
					</div>
					<div className="font-black text-amber-900 text-xs sm:text-sm">
						تنبيه!
					</div>
				</div>
				<button
					type="button"
					onClick={() => setIsInfoBannerCollapsed(!isInfoBannerCollapsed)}
					className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 text-[10px] font-black transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
				>
					<span>{isInfoBannerCollapsed ? 'عرض التنبيه' : 'طي'}</span>
					{isInfoBannerCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
				</button>
			</div>
			
			{!isInfoBannerCollapsed && (
				<p className="text-[11px] sm:text-xs text-amber-900 font-bold leading-relaxed pt-2 mt-2 border-t border-amber-200/60">
					الطلب يتم شخصياً: تصفح وأضف وجباتك للسلة لإظهارها للنادل أو الكاشير وحساب التكلفة بسهولة 🍽️
				</p>
			)}
		</div>
	)}
 
 {/* Filter and View Layout Toggler (Sticky Header at Top) */}
 <div className="sticky top-3 z-40 bg-white/90 backdrop-blur-md p-3 sm:p-4 rounded-3xl border border-stone-200/80 shadow-sm space-y-3">
 
 {/* Categories Scroller */}
 {categoriesInMenu.length > 0 && (
 <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none snap-x" dir="rtl">
 <button
 type="button"
 onClick={() => setSelectedCategory('all')}
 className={`px-4.5 py-2 rounded-full text-xs font-black cursor-pointer shrink-0 transition-all ${
 selectedCategory === 'all'
 ? 'bg-[var(--primary-color)] text-white shadow-sm'
 : 'bg-stone-100 text-stone-600 hover:bg-stone-200/80 hover:text-stone-800'
 }`}
 style={{ '--primary-color': themePrimaryColor } as any}
 >
 الكل
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
 className={`w-full h-full object-cover group-hover:scale-102 transition-transform duration-500 ${(item.isAvailable === false || (item.trackStock && item.stockCount === 0)) ? 'grayscale opacity-70 contrast-90 brightness-95' : ''}`} 
 alt={item.name} 
 />
 ) : (
 <div className="w-full h-full flex items-center justify-center bg-stone-100/50 text-stone-400">
 <Utensils className="h-12 w-12 opacity-40" />
 </div>
 )}
 
 {item.isAvailable === false ? (
 <span className="absolute top-3 right-3 bg-stone-900/90 text-white font-black text-[9px] px-2.5 py-1 rounded-full shadow-md z-10">
 غير متوفر حالياً
 </span>
 ) : item.badge && item.badge !== 'none' && (
 <span className="absolute top-3 right-3 bg-rose-600 text-white font-black text-[9px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
 {item.badge === 'popular' && <Flame className="h-3 w-3 fill-white" />}
 {item.badge === 'spicy' && <Flame className="h-3 w-3 text-amber-300 fill-amber-300" />}
 {item.badge === 'vegetarian' && <Leaf className="h-3 w-3 text-emerald-200" />}
 {item.badge === 'new' && <Sparkles className="h-3 w-3 text-amber-200" />}
 {item.badge === 'popular' ? 'الأكثر طلباً' : item.badge === 'spicy' ? 'حار' : item.badge === 'vegetarian' ? 'نباتي' : 'جديد'}
 </span>
 )}

 {item.prepTimeMinutes && item.prepTimeMinutes > 0 && (
 <span className="absolute top-3 left-3 bg-stone-900/85 backdrop-blur-md text-amber-300 font-black text-[9px] px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md border border-amber-400/20">
 <Clock className="h-3 w-3 text-amber-400" />
 <span>{item.prepTimeMinutes} دقيقة</span>
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
 
 {item.isAvailable === false ? (
 <span className="px-3.5 py-2 bg-stone-100 text-stone-500 rounded-xl text-xs font-black border border-stone-200 select-none">
 غير متوفر حالياً
 </span>
 ) : item.versions && item.versions.length > 0 ? (
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
 <span className="bg-rose-50 text-rose-700 font-bold text-[8px] px-2 py-0.5 rounded-full border border-rose-200 flex items-center gap-1">
 <Flame className="h-2.5 w-2.5" />
 {item.badge === 'popular' ? 'محبوب' : 'جديد'}
 </span>
 )}
 </div>
 
 <p className="text-xs text-stone-500 line-clamp-1 leading-relaxed cursor-pointer" onClick={() => setSelectedItem(item)}>
 {item.description || 'وجبة طازجة مجهزة بمكونات غنية ومختارة بدقة لأجلكم.'}
 </p>
 
 <div className="flex items-center gap-3 text-[10px] text-stone-400 font-bold flex-wrap">
 <span>فئة: <strong className="text-stone-600">{item.category || 'عام'}</strong></span>
 {showPrices && (
 <span className="text-[var(--primary-color)] bg-[var(--primary-color)]/5 border border-[var(--primary-color)]/10 px-2.5 py-0.5 rounded-lg font-black" style={{ '--primary-color': themePrimaryColor } as any}>
 {item.price} د.أ
 </span>
 )}
 {item.prepTimeMinutes && item.prepTimeMinutes > 0 && (
 <span className="text-amber-800 bg-amber-50/90 border border-amber-200/80 px-2 py-0.5 rounded-lg font-black flex items-center gap-1">
 <Clock className="h-3 w-3 text-amber-600" />
 <span>⏱️ {item.prepTimeMinutes} دقيقة</span>
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
 <img src={item.imageUrl} className={`w-full h-full object-cover group-hover:scale-102 transition-transform duration-500 ${(item.isAvailable === false || (item.trackStock && item.stockCount === 0)) ? 'grayscale opacity-70 contrast-90 brightness-95' : ''}`} alt="" />
 </div>
 ) : (
 <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center text-stone-400 border border-stone-100">
 <Utensils className="h-5 w-5 opacity-40" />
 </div>
 )}

 {/* Add button */}
 {item.isAvailable === false ? (
 <span className="px-2.5 py-1.5 bg-stone-100 text-stone-500 rounded-xl text-xs font-bold border border-stone-200 select-none">
 غير متوفر
 </span>
 ) : item.versions && item.versions.length > 0 ? (
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
 <div className="space-y-5 pb-24">
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
 <span className="absolute top-3.5 right-3.5 bg-rose-600 text-white font-black text-xs px-3 py-1 rounded-full shadow-md flex items-center gap-1">
 <Flame className="h-3.5 w-3.5 fill-white" />
 <span>وفر {savePercent}%</span>
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
 <button
 type="button"
 id={`add-btn-${offer.id}`}
 onClick={() => addToCart(offer, true)}
 className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-800 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border border-emerald-100"
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
 </>
 )}

 </div>

 {/* VIEW 3: FULL PAGE SHOPPING CART */}
 {customerFlow === 'menu' && activeTab === 'cart' && (
 <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-28 sm:pb-32 animate-in fade-in duration-300">
 <div className="bg-white p-4 sm:p-8 rounded-3xl border border-stone-200/80 shadow-xs space-y-5 sm:space-y-6">
 
 <div className="flex items-center justify-between border-b border-stone-100 pb-3.5 gap-2">
 <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
 <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shrink-0">
 <ShoppingCart className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
 </div>
 <div className="min-w-0">
 <h2 className="text-base sm:text-xl font-black text-stone-900 truncate">سلة طلباتك المحددة</h2>
 <p className="text-[11px] sm:text-xs text-stone-500 font-bold truncate">
  {isDirectOrderingDisabled ? 'راجع أصنافك المختارة لتسجيلها مع النادل أو الكاشير' : 'تأكد من الأصناف وبيانات التوصيل ثم أرسل الطلب مباشرة'}
 </p>
 </div>
 </div>
 {cart.length > 0 && (
 <button
 type="button"
 onClick={clearCart}
 className="text-[11px] sm:text-xs font-black text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
 >
 <Trash2 className="h-3.5 w-3.5" />
 <span className="hidden sm:inline">مسح السلة بالكامل</span>
 <span className="inline sm:hidden">مسح</span>
 </button>
 )}
 </div>

 {cart.length === 0 ? (
 <div className="py-10 sm:py-12 flex flex-col items-center justify-center text-center space-y-4">
 <div className="w-20 h-20 sm:w-24 sm:h-24 bg-stone-50 rounded-full flex items-center justify-center text-stone-300 border border-stone-100 shadow-2xs">
 <ShoppingBag className="h-10 w-10 sm:h-12 sm:w-12 text-stone-400" />
 </div>
 <h3 className="text-base font-black text-stone-800">السلة فارغة حالياً</h3>
 <p className="text-xs sm:text-sm text-stone-500 max-w-sm leading-relaxed px-2">
 {isDirectOrderingDisabled 
  ? 'تصفح منيو الطعام أو العروض الفعالة وأضف وجباتك هنا لتجهيز طلبك للنادل أو الكاشير!' 
  : 'تصفح منيو الطعام أو العروض الفعالة وأضف وجباتك المفضلة هنا لتتمكن من إرسالها للمحل مباشرة!'}
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
 <div className="space-y-5 sm:space-y-6">
 
 {/* Cart Items List */}
 <div className="divide-y divide-stone-100">
 {cart.map(item => (
 <div key={item.id} className="py-3.5 sm:py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 {/* Item Info */}
 <div className="flex items-center gap-3 min-w-0 flex-1">
 {item.imageUrl ? (
 <img src={item.imageUrl} className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-stone-100 shrink-0" alt="" />
 ) : (
 <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-stone-50 flex items-center justify-center text-stone-400 shrink-0 border border-stone-100">
 <Utensils className="h-5 w-5 sm:h-6 sm:w-6" />
 </div>
 )}
 <div className="min-w-0 flex-1">
 <h4 className="font-black text-xs sm:text-base text-stone-900 truncate leading-snug">{item.name}</h4>
 <div className="flex items-center gap-2 mt-0.5">
 <span className="text-xs font-black text-emerald-700">{(item.price * item.quantity).toFixed(2)} د.أ</span>
 <span className="text-[10px] text-stone-400 font-bold">({item.price} د.أ/قطع)</span>
 </div>
 </div>
 </div>

 {/* Quantity controls & Delete */}
 <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-t-0 border-stone-100">
 <div className="flex items-center bg-stone-100 rounded-xl p-1 border border-stone-200/50">
 <button
 type="button"
 onClick={() => updateQuantity(item.id, -1)}
 className="p-1.5 rounded-lg text-stone-600 hover:bg-white transition-colors cursor-pointer"
 >
 <Minus className="h-3.5 w-3.5" />
 </button>
 <span className="text-xs sm:text-sm font-black text-stone-800 px-3">{item.quantity}</span>
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

 {/* In-Person Ordering Presentation Section OR Online Checkout Form */}
 {isDirectOrderingDisabled ? (
 <div className="space-y-4 sm:space-y-5 text-right animate-in fade-in duration-300">
 {/* Notice Banner */}
 <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl sm:rounded-3xl p-4 sm:p-5 text-amber-950 space-y-3 shadow-3xs">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-2xl bg-amber-200/80 flex items-center justify-center text-amber-900 shrink-0 shadow-3xs">
 <Utensils className="h-5 w-5" />
 </div>
 <div>
 <h4 className="text-sm sm:text-base font-black text-amber-950">الطلب يتم شخصياً عبر النادل أو الكاشير</h4>
 <p className="text-[11px] sm:text-xs text-amber-800 font-bold mt-0.5">
 هذا المنيو مخصص لتجهيز اختياراتك وحساب التكلفة بسهولة
 </p>
 </div>
 </div>
 <div className="bg-white/80 p-3.5 rounded-2xl border border-amber-200/70 text-xs font-bold text-amber-900 leading-relaxed flex items-center gap-2">
 <Info className="h-4 w-4 text-amber-700 shrink-0" />
 <span>يرجى إظهار قائمة الأصناف بالسلة أدناه للموظف لتسجيل طلبك فوراً 🍽️</span>
 </div>
 </div>

 


 {/* Bill summary */}
 <div className="bg-amber-50/50 rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-amber-200/70 flex flex-col md:flex-row md:items-stretch justify-between gap-5 text-right w-full">
 <div className="space-y-2 flex-1">
 <div className="flex items-center gap-1.5 text-xs text-stone-600 font-bold">
 <span>إجمالي عدد الأصناف المحددة:</span>
 <span className="bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full text-[10px] font-black">{totalItems} أصناف</span>
 </div>
 
 <div className="space-y-1 pt-1 border-t border-amber-200/50 text-xs text-stone-600 font-bold">
 <div className="flex justify-between">
 <span>مجموع أسعار الوجبات:</span>
 <span>{totalPrice.toFixed(2)} د.أ</span>
 </div>
 {business.taxRate > 0 && (
 <div className="flex justify-between">
 <span>الضريبة ({business.taxRate}%):</span>
 <span>{(totalPrice * (business.taxRate || 0) / 100).toFixed(2)} د.أ</span>
 </div>
 )}
 {business.serviceRate > 0 && (
 <div className="flex justify-between">
 <span>رسوم الخدمة ({business.serviceRate}%):</span>
 <span>{(totalPrice * (business.serviceRate || 0) / 100).toFixed(2)} د.أ</span>
 </div>
 )}
 </div>

 <div className="flex justify-between items-baseline gap-2 pt-2.5 border-t-2 border-dashed border-amber-300/80">
 <span className="text-xs sm:text-sm font-black text-stone-800">الحساب الإجمالي التقريبي:</span>
 <span className="text-xl sm:text-2xl font-black text-amber-950">
 {(
 totalPrice + 
 (totalPrice * (business.serviceRate || 0) / 100) + 
 (business.serviceFixedFee || 0) + 
 (totalPrice * (business.taxRate || 0) / 100)
 ).toFixed(2)} د.أ
 </span>
 </div>
 </div>
 </div>

 {/* Return to menu button */}
 <div className="flex flex-col sm:flex-row gap-3 pt-1">
 <button
 type="button"
 onClick={() => setActiveTab('menu')}
 className="flex-1 py-3.5 px-5 bg-stone-900 hover:bg-stone-950 text-white text-xs sm:text-sm font-black rounded-xl sm:rounded-2xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
 >
 <Plus className="h-4 w-4" />
 <span>إضافة وجبات أخرى من المنيو</span>
 </button>
 </div>
 </div>
 ) : (
 /* Checkout Details Form */
 <form onSubmit={handlePlaceDirectOrder} className="bg-stone-50/80 rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-stone-200/60 space-y-4 text-right">
 <div className="flex items-center gap-2 pb-2.5 border-b border-stone-200/50">
 <FileText className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
 <h5 className="text-xs sm:text-sm font-black text-stone-800">بيانات طلب الطعام وإرساله للمطعم مباشرة:</h5>
 </div>

 {/* Order Type Segmented Selector */}
 <div className="space-y-1.5">
 <label className="text-xs font-black text-stone-600 block">نوع الطلب وتفضيل الاستلام:</label>
 <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
 {[
 { id: 'dine_in', label: 'داخل المطعم', icon: Utensils },
 { id: 'takeaway', label: 'سفري (تيك أواي)', icon: ShoppingBag },
 { id: 'delivery', label: 'توصيل للمنزل', icon: Truck }
 ].map((t) => {
 const IconComponent = t.icon;
 const isSelected = orderType === t.id;
 return (
 <button
 key={t.id}
 type="button"
 onClick={() => setOrderType(t.id as any)}
 className={`py-2.5 sm:py-3 px-1 sm:px-2 text-center text-[10.5px] sm:text-xs font-black rounded-xl sm:rounded-2xl transition-all cursor-pointer border flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 ${
 isSelected
 ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
 : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
 }`}
 >
 <IconComponent className={`h-4 w-4 shrink-0 ${isSelected ? 'text-white' : 'text-stone-500'}`} />
 <span className="truncate">{t.label}</span>
 </button>
 );
 })}
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-4">
 {/* Customer Name */}
 <div className="space-y-1.5">
 <label className="text-xs font-black text-stone-600 block">الاسم الكريم بالكامل <span className="text-rose-500">*</span>:</label>
 <input 
 type="text" 
 value={customerName}
 onChange={(e) => setCustomerName(e.target.value)}
 placeholder="مثال: أحمد العلي"
 className="w-full bg-white border border-stone-200/80 rounded-xl sm:rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 text-stone-800"
 />
 </div>

 {/* Customer Phone */}
 <div className="space-y-1.5">
 <label className="text-xs font-black text-stone-600 block">رقم هاتف للتأكيد أو التواصل <span className="text-rose-500">*</span>:</label>
 <input 
 type="tel" 
 value={customerPhone}
 onChange={(e) => setCustomerPhone(e.target.value)}
 placeholder="مثال: 079XXXXXXX"
 className="w-full bg-white border border-stone-200/80 rounded-xl sm:rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 text-stone-800"
 />
 </div>

 {/* Conditional Table Number or Address */}
 {orderType === 'dine_in' && (
 <div className="space-y-1.5 md:col-span-2">
 <label className="text-xs font-black text-stone-600 block">رقم الطاولة (اختياري - إذا كنت تجلس بالصالة):</label>
 <input 
 type="text" 
 value={customerTable}
 onChange={(e) => setCustomerTable(e.target.value)}
 placeholder="مثال: طاولة رقم 4، أو صالة العائلات طاولة 2"
 className="w-full bg-white border border-stone-200/80 rounded-xl sm:rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 text-stone-800"
 />
 </div>
 )}

 {orderType === 'delivery' && (
 <div className="space-y-1.5 md:col-span-2">
 <label className="text-xs font-black text-stone-600 block">عنوان التوصيل التفصيلي في إربد:</label>
 <input 
 type="text" 
 value={customerTable}
 onChange={(e) => setCustomerTable(e.target.value)}
 placeholder="مثال: شارع الجامعة، خلف فندق الجود، عمارة 14 شقة 3"
 className="w-full bg-white border border-stone-200/80 rounded-xl sm:rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 text-stone-800"
 />
 </div>
 )}

 {/* Order notes */}
	<div className="space-y-1.5 md:col-span-2">
	<label className="text-xs font-black text-stone-600 block">ملاحظات إضافية على الوجبات:</label>
	<input 
	type="text"
	value={orderNotes}
	onChange={(e) => setOrderNotes(e.target.value)}
	placeholder="مثال: بدون بصل، زيادة كاتشب، حار خفيف..."
	className="w-full bg-white border border-stone-200/80 rounded-xl sm:rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 text-stone-800"
	/>
	</div>

	{/* Feature 4: CliQ & Local Mobile Wallet Integration */}
	<div className="space-y-3 md:col-span-2 bg-stone-50 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-stone-200/80 mt-2">
		<span className="text-xs font-black text-stone-800 block">تفضيلات وطريقة الدفع:</span>
		<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
			<button
				type="button"
				onClick={() => setPaymentMethod('cash')}
				className={`p-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center gap-1.5 cursor-pointer ${
					paymentMethod === 'cash' ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-3xs' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
				}`}
			>
				<span>💵 دفع نقدي بالصالة / عند الاستلام</span>
			</button>
			
			{(business.cliqAlias || business.cliqPhone) && (
				<button
					type="button"
					onClick={() => setPaymentMethod('cliq')}
					className={`p-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center gap-1.5 cursor-pointer ${
						paymentMethod === 'cliq' ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-3xs' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
					}`}
				>
					<span>⚡ دفع سريع عبر كليك (CliQ)</span>
				</button>
			)}
			
			{business.walletPhone && (
				<button
					type="button"
					onClick={() => setPaymentMethod('wallet')}
					className={`p-3 rounded-xl border text-xs font-bold transition-all text-center flex flex-col items-center gap-1.5 cursor-pointer ${
						paymentMethod === 'wallet' ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-3xs' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
					}`}
				>
					<span>📱 تحويل محفظة إلكترونية</span>
				</button>
			)}
		</div>

		{/* Interactive CliQ details display */}
		{paymentMethod === 'cliq' && (
			<div className="p-4 bg-white rounded-xl border border-stone-150 space-y-3 animate-in fade-in duration-200">
				<div className="space-y-1">
					<span className="text-[11px] text-stone-400 block font-bold">يرجى تحويل مبلغ الطلب الإجمالي إلى حساب كليك الخاص بالمحل:</span>
					{business.cliqAlias && (
						<div className="flex items-center justify-between bg-stone-50 p-2.5 rounded-lg border border-stone-100">
							<span className="text-xs font-bold text-stone-700">الاسم المستعار (Alias): <strong>{business.cliqAlias}</strong></span>
							<button
								type="button"
								onClick={() => {
									navigator.clipboard.writeText(business.cliqAlias || '');
									alert('تم نسخ الـ Alias بنجاح!');
								}}
								className="text-[10px] text-emerald-700 hover:underline font-bold"
							>نسخ</button>
						</div>
					)}
					{business.cliqPhone && (
						<div className="flex items-center justify-between bg-stone-50 p-2.5 rounded-lg border border-stone-100 mt-1.5">
							<span className="text-xs font-bold text-stone-700">رقم الهاتف لكليك: <strong>{business.cliqPhone}</strong></span>
							<button
								type="button"
								onClick={() => {
									navigator.clipboard.writeText(business.cliqPhone || '');
									alert('تم نسخ رقم الهاتف بنجاح!');
								}}
								className="text-[10px] text-emerald-700 hover:underline font-bold"
							>نسخ</button>
						</div>
					)}
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					<div className="space-y-1">
						<label className="block text-[11px] font-bold text-stone-600">اسم المحوّل للتأكيد <span className="text-rose-500">*</span>:</label>
						<input
							type="text"
							required
							value={paymentSenderName}
							onChange={(e) => setPaymentSenderName(e.target.value)}
							placeholder="الاسم المسجل في كليك"
							className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-800"
						/>
					</div>
					<div className="space-y-1">
						<label className="block text-[11px] font-bold text-stone-600">رقم مرجع التحويل (Tx ID):</label>
						<input
							type="text"
							value={paymentTxId}
							onChange={(e) => setPaymentTxId(e.target.value)}
							placeholder="الرقم المرجعي المكون من 12 خانة"
							className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-800 font-mono"
						/>
					</div>
				</div>
			</div>
		)}

		{/* Interactive Mobile Wallet details display */}
		{paymentMethod === 'wallet' && (
			<div className="p-4 bg-white rounded-xl border border-stone-150 space-y-3 animate-in fade-in duration-200">
				<div className="space-y-1">
					<span className="text-[11px] text-stone-400 block font-bold">يرجى تحويل مبلغ الطلب الإجمالي إلى محفظة المحل:</span>
					<div className="flex items-center justify-between bg-stone-50 p-2.5 rounded-lg border border-stone-100">
						<span className="text-xs font-bold text-stone-700">مزود المحفظة: <strong>{business.walletName || 'زين كاش (Zain Cash)'}</strong></span>
					</div>
					<div className="flex items-center justify-between bg-stone-50 p-2.5 rounded-lg border border-stone-100 mt-1.5">
						<span className="text-xs font-bold text-stone-700">رقم هاتف المحفظة: <strong>{business.walletPhone}</strong></span>
						<button
							type="button"
							onClick={() => {
								navigator.clipboard.writeText(business.walletPhone || '');
								alert('تم نسخ رقم المحفظة بنجاح!');
							}}
							className="text-[10px] text-emerald-700 hover:underline font-bold"
						>نسخ</button>
					</div>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
					<div className="space-y-1">
						<label className="block text-[11px] font-bold text-stone-600">اسم صاحب المحفظة المحوّل منها <span className="text-rose-500">*</span>:</label>
						<input
							type="text"
							required
							value={paymentSenderName}
							onChange={(e) => setPaymentSenderName(e.target.value)}
							placeholder="اسم المحول للتأكيد"
							className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-800"
						/>
					</div>
					<div className="space-y-1">
						<label className="block text-[11px] font-bold text-stone-600">رقم مرجع عملية التحويل (Reference):</label>
						<input
							type="text"
							value={paymentTxId}
							onChange={(e) => setPaymentTxId(e.target.value)}
							placeholder="رقم العملية من الإشعار المستلم"
							className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-800 font-mono"
						/>
					</div>
				</div>
			</div>
		)}
	</div>

	{/* Feature 3: Tipping Section */}
	{business.tippingEnabled && (
		<div className="space-y-2 md:col-span-2 bg-amber-50/50 p-4 rounded-2xl border border-amber-200/60 mt-2">
			<span className="text-xs font-black text-amber-800 block">💡 إكرامية طاقم التوصيل / العمل (Tip):</span>
			<div className="flex flex-wrap gap-1.5">
				{[
					{ id: 'none', label: 'بدون إكرامية' },
					{ id: '0.5', label: '0.50 د.أ' },
					{ id: '1', label: '1.00 د.أ' },
					{ id: '2', label: '2.00 د.أ' },
					{ id: 'percent_5', label: '5% من الفاتورة' },
					{ id: 'percent_10', label: '10% من الفاتورة' },
					{ id: 'custom', label: 'إدخال مبلغ مخصص' }
				].map((t) => (
					<button
						key={t.id}
						type="button"
						onClick={() => setTipType(t.id as any)}
						className={`text-xs px-3 py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
							tipType === t.id ? 'bg-amber-600 border-amber-600 text-white shadow-2xs' : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
						}`}
					>
						{t.label}
					</button>
				))}
			</div>
			
			{tipType === 'custom' && (
				<div className="space-y-1 max-w-[180px] animate-in slide-in-from-top-2">
					<input
						type="number"
						step="0.1"
						min="0"
						value={customTipValue}
						onChange={(e) => setCustomTipValue(e.target.value)}
						placeholder="المبلغ بالدينار د.أ"
						className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-800 font-bold"
					/>
				</div>
			)}
		</div>
	)}
	</div>

	{/* Display Form Error if present */}
 {formError && (
 <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-black flex items-center gap-2 animate-in fade-in">
 <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
 <span>{formError}</span>
 </div>
 )}

 {/* Calculations and Actions */}
	<div className="bg-emerald-50/70 rounded-2xl sm:rounded-3xl p-5 sm:p-6 border border-emerald-100 flex flex-col md:flex-row md:items-stretch justify-between gap-6 mt-5 text-right w-full">
		<div className="space-y-2 flex-1">
			<div className="flex items-center gap-1.5 text-xs text-stone-500 font-bold">
				<span>عدد الأصناف الإجمالي:</span>
				<span className="bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded-full text-[10px] font-black">{totalItems} أصناف</span>
			</div>
			
			<div className="space-y-1 pt-1 border-t border-emerald-100/50 text-xs text-stone-600 font-bold">
				<div className="flex justify-between">
					<span>قيمة الوجبات (سعر أساسي):</span>
					<span>{totalPrice.toFixed(2)} د.أ</span>
				</div>
				
				{business.serviceRate > 0 || business.serviceFixedFee > 0 ? (
					<div className="flex justify-between">
						<span>رسوم الخدمة ({business.serviceRate || 0}% + {business.serviceFixedFee || 0} د.أ ثابته):</span>
						<span>{((totalPrice * (business.serviceRate || 0) / 100) + (business.serviceFixedFee || 0)).toFixed(2)} د.أ</span>
					</div>
				) : null}
				
				{business.taxRate > 0 ? (
					<div className="flex justify-between">
						<span>الضريبة المضافة ({business.taxRate || 0}%):</span>
						<span>{(totalPrice * (business.taxRate || 0) / 100).toFixed(2)} د.أ</span>
					</div>
				) : null}
				
				{tipAmount > 0 ? (
					<div className="flex justify-between text-amber-800">
						<span>مبلغ الإكرامية ولدعم الطاقم (Tip):</span>
						<span>{tipAmount.toFixed(2)} د.أ</span>
					</div>
				) : null}

				{(() => {
					const maxPrep = cart.reduce((m, item) => Math.max(m, item.prepTimeMinutes || 0), 0);
					if (maxPrep === 0) return null;
					return (
						<div className="flex items-center justify-between text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200/80 font-bold text-xs mt-1">
							<span className="flex items-center gap-1.5">
								<Clock className="h-4 w-4 text-amber-600 shrink-0" />
								<span>وقت التحضير المتوقع للطلب:</span>
							</span>
							<span className="bg-amber-200/80 px-2.5 py-0.5 rounded-lg font-black text-amber-950">
								~{maxPrep} دقيقة
							</span>
						</div>
					);
				})()}
			</div>

			<div className="flex justify-between items-baseline gap-2 pt-2 border-t-2 border-dashed border-emerald-200">
				<span className="text-xs sm:text-sm font-black text-stone-800">المبلغ الإجمالي النهائي للفاتورة:</span>
				<span className="text-lg sm:text-2xl font-black text-emerald-800">
					{(
						totalPrice + 
						(totalPrice * (business.serviceRate || 0) / 100) + 
						(business.serviceFixedFee || 0) + 
						(totalPrice * (business.taxRate || 0) / 100) + 
						tipAmount
					).toFixed(2)} د.أ
				</span>
			</div>
			<span className="text-[10px] text-stone-400 font-bold block leading-relaxed pt-1">
				طريقة الدفع المختارة: {paymentMethod === 'cash' ? 'نقداً بالصالة / عند الاستلام' : paymentMethod === 'cliq' ? 'تحويل فوري عبر CliQ' : 'تحويل محفظة إلكترونية'}
			</span>
		</div>
	</div>

 <div className="flex flex-col gap-3">
 <button
 type="submit"
 disabled={isSubmittingOrder}
 className="w-full py-3.5 sm:py-4 px-5 bg-[#1a4d2e] hover:bg-[#123a24] text-white text-xs sm:text-sm font-black rounded-xl sm:rounded-2xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
 >
 {isSubmittingOrder ? (
 <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
 ) : (
 <CheckCircle className="h-5 w-5" />
 )}
 <span>إرسال الطلب مباشرة للمطعم</span>
 </button>
 </div>

 </form>
 )}

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
 <img src={selectedItem.imageUrl} className={`w-full h-full object-cover ${(selectedItem.isAvailable === false || (selectedItem.trackStock && selectedItem.stockCount === 0)) ? 'grayscale opacity-70 contrast-90 brightness-95' : ''}`} alt="" />
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
 <h4 className="font-black text-sm text-stone-900">تفاصيل وجبة المنيو</h4>
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

 {/* Estimated Preparation Time */}
 {selectedItem.prepTimeMinutes && selectedItem.prepTimeMinutes > 0 && (
 <div className="flex items-center justify-between p-3.5 bg-amber-50/90 border border-amber-200/80 rounded-2xl">
 <div className="flex items-center gap-2.5">
 <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-800 shrink-0">
 <Clock className="h-4 w-4 text-amber-700" />
 </div>
 <div>
 <span className="text-[10px] font-bold text-amber-800 block">وقت التحضير المتوقع للوجبة:</span>
 <span className="text-xs font-black text-amber-950">حوالي {selectedItem.prepTimeMinutes} دقيقة</span>
 </div>
 </div>
 <span className="text-[10px] bg-amber-200/70 text-amber-950 font-black px-2.5 py-1 rounded-full border border-amber-300/50">
 طازج حسب الطلب ⏱️
 </span>
 </div>
 )}

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
 <button
 type="button"
 onClick={() => setSelectedItem(null)}
 className="px-4 py-2.5 border border-stone-200 hover:bg-stone-100 rounded-xl text-xs font-bold text-stone-600 transition-colors flex-1 cursor-pointer"
 >
 إغلاق
 </button>

 {selectedItem.isAvailable === false ? (
 <div className="flex-1.5 py-2.5 bg-stone-100 text-stone-500 text-xs font-black rounded-xl text-center border border-stone-200 select-none">
 هذا الصنف غير متوفر حالياً
 </div>
 ) : (
 <button
 type="button"
 onClick={() => {
 addToCart(selectedItem, false, selectedVersion || undefined, modalQuantity);
 setSelectedItem(null);
 }}
 className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl cursor-pointer flex-1.5 shadow-md flex items-center justify-center gap-1.5"
 >
 <Plus className="h-4 w-4" />
 <span>إضافة للطلب</span>
 </button>
 )}
 </div>

 </div>

 </div>
 </div>
 )}

 {/* Floating Bottom Navbar & Search Bar right above it */}
 {customerFlow === 'menu' && (
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

 {/* Floating Bottom Tab Bar - Sophisticated Pillshaped */}
 <div 
 className="w-full pointer-events-auto bg-white/95 backdrop-blur-md rounded-full border border-stone-200/80 shadow-[0_16px_40px_rgba(0,0,0,0.18)] p-1.5 sm:p-2 grid grid-cols-3 gap-1 sm:gap-2 relative z-10"
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
 window.scrollTo({ top: 0, behavior: 'smooth' });
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
 )}
 </>
 )}

</div>
 );
}
