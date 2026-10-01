import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { doc, getDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCachedBusinesses, setCachedBusinesses } from '../lib/dataCache';
import { 
  ArrowLeft, Clock, MapPin, Store, Phone, Sparkles, Share2, 
  ShoppingBag, ShieldCheck, ChevronLeft, ChevronRight, CheckCircle2,
  Tag, Flame, Stethoscope, Star, ExternalLink
} from 'lucide-react';
import { getGoogleMapsEmbedUrl, getGoogleMapsActionUrls, extractCoordsOrEmbedFromUrl } from '../lib/googleReviewsHelper';
import { WhatsApp3DIcon, Phone3DIcon } from '../components/common/PremiumContactButtons';
import { getWhatsAppUrl } from '../lib/contactHelper';
import { ShareButton } from '../components/ShareButton';
import { SEO } from '../components/common/SEO';
import { DEMO_SEED_DATA } from '../lib/demoDataHelper';
import { Business, MenuItem, MenuItemVersion } from '../types';
import { VerifiedBadge } from '../components/vip/VerifiedBadge';
import { getBusinessVipStatus } from '../lib/vipHelper';
import { getCanonicalBusinessCategory } from '../lib/categories';
import { cleanCategoryName } from '../components/CategoryButtonLabel';

export interface ExtendedProduct extends MenuItem {
  businessId: string;
  businessName: string;
  businessLogo?: string;
  businessImage?: string;
  businessCategory?: string;
  businessSubCategory?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessWhatsapp?: string;
  businessRating?: number;
  businessIsVerified?: boolean;
  businessIsVip?: boolean;
}

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<ExtendedProduct | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ExtendedProduct[]>([]);
  const [subcategoryProducts, setSubcategoryProducts] = useState<ExtendedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<MenuItemVersion | null>(null);
  const [asyncEmbedMapUrl, setAsyncEmbedMapUrl] = useState<string>('');

  useEffect(() => {
    if (!business?.googlePlaceUrl || !business.googlePlaceUrl.trim()) {
      setAsyncEmbedMapUrl('');
      return;
    }

    const immediate = getGoogleMapsEmbedUrl(business);
    if (immediate) {
      setAsyncEmbedMapUrl(immediate);
      return;
    }

    const rawUrl = business.googlePlaceUrl.trim();
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      const cacheKey = `resolved_map_embed_${rawUrl}`;
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          setAsyncEmbedMapUrl(cached);
          return;
        }
      } catch (e) {}

      let isMounted = true;
      fetch(`/api/resolve-map-url?url=${encodeURIComponent(rawUrl)}`)
        .then(res => res.json())
        .then(data => {
          if (!isMounted) return;
          if (data.lat && data.lng) {
            const embed = `https://maps.google.com/maps?q=${data.lat},${data.lng}&hl=ar&z=16&output=embed`;
            setAsyncEmbedMapUrl(embed);
            try { sessionStorage.setItem(cacheKey, embed); } catch (e) {}
          } else if (data.query) {
            const embed = `https://maps.google.com/maps?q=${encodeURIComponent(data.query + ' إربد')}&hl=ar&z=16&output=embed`;
            setAsyncEmbedMapUrl(embed);
            try { sessionStorage.setItem(cacheKey, embed); } catch (e) {}
          } else if (data.finalUrl) {
            const parsed = extractCoordsOrEmbedFromUrl(data.finalUrl);
            if (parsed) {
              setAsyncEmbedMapUrl(parsed);
              try { sessionStorage.setItem(cacheKey, parsed); } catch (e) {}
            }
          }
        })
        .catch(err => {
          console.warn('Error resolving short map url:', err);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [business?.googlePlaceUrl, business?.id]);

  useEffect(() => {
    async function loadProductData() {
      if (!id) return;
      window.scrollTo(0, 0);
      setLoading(true);

      try {
        let foundProduct: ExtendedProduct | null = null;
        let foundBusiness: Business | null = null;
        let allFetchedBusinesses: Business[] = [];

        // 1. Try to load businesses from cache first
        const cached = getCachedBusinesses();
        if (cached && cached.length > 0) {
          allFetchedBusinesses = cached.filter(b => !b.isHidden && b.status !== 'rejected');
        } else if (db) {
          // If not cached, fetch all businesses from Firestore to build a complete list
          try {
            const snap = await getDocs(query(collection(db, 'businesses'), limit(150)));
            const fetched: Business[] = [];
            snap.forEach(docSnap => {
              const data = docSnap.data();
              if (data && !data.isHidden && data.status !== 'rejected') {
                fetched.push({ id: docSnap.id, ...data } as Business);
              }
            });
            if (fetched.length > 0) {
              setCachedBusinesses(fetched);
              allFetchedBusinesses = [...fetched];
            }
          } catch (e) {
            console.error("Failed fetching businesses from Firestore:", e);
          }
        }

        // 2. Only use DEMO_SEED_DATA if allFetchedBusinesses is completely empty (no live businesses in database)
        if (allFetchedBusinesses.length === 0) {
          const demoBizs = (DEMO_SEED_DATA.businesses || []) as unknown as Business[];
          allFetchedBusinesses = demoBizs.map((demoB, idx) => ({
            id: (demoB as any).id || (demoB as any).username || `demo-b-${idx}`,
            ...demoB
          })) as Business[];
        }

        // Ensure every business in allFetchedBusinesses has a valid ID
        allFetchedBusinesses = allFetchedBusinesses.map((b, idx) => {
          if (!b.id) {
            return { ...b, id: (b as any).username || `biz_auto_${idx}` };
          }
          return b;
        });

        // 3. Search for the product with ID `id` in the complete merged list of businesses
        for (const bData of allFetchedBusinesses) {
          const bVipStatus = getBusinessVipStatus(bData);
          if (Array.isArray(bData.menuItems)) {
            for (let idx = 0; idx < bData.menuItems.length; idx++) {
              const item = bData.menuItems[idx];
              const itemId = item.id || `biz_${bData.id}_item_${idx}`;
              if (
                itemId === id || 
                item.id === id || 
                String(itemId) === String(id) ||
                (id && id.includes('_item_') && id.endsWith(`_item_${idx}`))
              ) {
                const { mainCategory, subCategory } = getCanonicalBusinessCategory(bData);
                foundBusiness = bData;
                foundProduct = {
                  ...item,
                  id: itemId,
                  businessId: bData.id,
                  businessName: bData.name || 'محل تجاري',
                  businessLogo: bData.logoUrl || bData.imageUrl,
                  businessImage: item.imageUrl || bData.imageUrl || bData.coverImage,
                  businessCategory: mainCategory,
                  businessSubCategory: subCategory,
                  businessAddress: bData.address || 'إربد',
                  businessPhone: bData.phone,
                  businessWhatsapp: bData.whatsapp || bData.socialLinks?.whatsapp || bData.phone,
                  businessIsVerified: bVipStatus.isVerified || Boolean(bData.isVerified),
                  businessIsVip: bVipStatus.isVip || Boolean(bData.isVip)
                };
                break;
              }
            }
          }
          if (foundProduct) break;

          // Medical consultation fallback
          if (id.startsWith('med_consult_') && (id === `med_consult_${bData.id}` || id.endsWith(bData.id))) {
            const { mainCategory, subCategory } = getCanonicalBusinessCategory(bData);
            foundBusiness = bData;
            const fee = bData.medicalProfile?.consultationFee || '15';
            const feeNumericOnly = fee.replace(/[^0-9.-]/g, '');
            foundProduct = {
              id: `med_consult_${bData.id}`,
              name: 'كشفية ومعاينة طبية بالعيادة',
              price: feeNumericOnly || fee,
              category: 'معاينات واستشارات',
              description: 'تشمل الفحص السريري والاستشارة الطبية المتخصصة وتقديم التشخيص الدقيق.',
              isPopular: true,
              isAvailable: true,
              businessId: bData.id,
              businessName: bData.name || 'منشأة طبية',
              businessLogo: bData.logoUrl || bData.imageUrl,
              businessImage: bData.imageUrl,
              businessCategory: mainCategory,
              businessSubCategory: subCategory,
              businessAddress: bData.address || 'إربد',
              businessPhone: bData.phone,
              businessWhatsapp: bData.whatsapp || bData.socialLinks?.whatsapp || bData.phone,
              businessIsVerified: bVipStatus.isVerified || Boolean(bData.isVerified),
              businessIsVip: bVipStatus.isVip || Boolean(bData.isVip)
            };
            break;
          }
        }

        if (foundProduct) {
          const prodBizVip = getBusinessVipStatus(foundBusiness);
          if (!prodBizVip.isVip) {
            setProduct(null);
            setBusiness(null);
            return;
          }

          setProduct(foundProduct);
          setBusiness(foundBusiness);

          // 1. Related products from the SAME business (Pick max 3 products)
          if (foundBusiness && Array.isArray((foundBusiness as Business).menuItems)) {
            const rels: ExtendedProduct[] = [];
            (foundBusiness as Business).menuItems!.forEach((mItem, idx) => {
              const relId = mItem.id || `biz_${foundBusiness!.id}_item_${idx}`;
              if (relId !== (foundProduct as ExtendedProduct).id && mItem.name && mItem.name.trim() !== (foundProduct as ExtendedProduct).name?.trim()) {
                rels.push({
                  ...mItem,
                  id: relId,
                  businessId: foundBusiness!.id,
                  businessName: foundBusiness!.name,
                  businessLogo: foundBusiness!.logoUrl,
                  businessCategory: foundBusiness!.category
                });
              }
            });
            const shuffled = [...rels].sort(() => 0.5 - Math.random());
            setRelatedProducts(shuffled.slice(0, 3));
          }

          // 2. Similar products ONLY from OTHER different businesses matching the EXACT SAME subcategory
          const { subCategory: targetSubCat } = getCanonicalBusinessCategory(foundBusiness);
          const targetSubClean = cleanCategoryName(targetSubCat);

          const exactSubMatchProducts: ExtendedProduct[] = [];

          const currentBizId = String(foundBusiness?.id || (foundProduct as ExtendedProduct)?.businessId || '');
          const currentBizName = ((foundBusiness?.name || (foundProduct as ExtendedProduct)?.businessName) || '').trim().toLowerCase();

          // Check if there are real live businesses from Firestore
          const hasRealLiveBusinesses = allFetchedBusinesses.some(b => !(b as any).isDemo && !(b as any).isFake);

          allFetchedBusinesses.forEach(b => {
            if (!b) return;
            const bId = String(b.id || (b as any).username || '');
            const bName = (b.name || '').trim().toLowerCase();

            // STRICT REQUIREMENT 1: Must be from OTHER different stores!
            if (currentBizId && bId && bId === currentBizId) return;
            if (currentBizName && bName && bName === currentBizName) return;

            // STRICT ZERO-FAKE DIRECTIVE: Exclude any fake, mock or demo businesses
            const isMockBusiness = Boolean(
              (b as any).isDemo || 
              (b as any).isFake || 
              (b as any).isMock || 
              bId.startsWith('demo-') || 
              bId.startsWith('mock-')
            );
            if (hasRealLiveBusinesses && isMockBusiness) return;
            if (b.isHidden || b.status === 'rejected') return;

            const { mainCategory: bMainCat, subCategory: bSubCat } = getCanonicalBusinessCategory(b);
            const bSubClean = cleanCategoryName(bSubCat);

            // STRICT REQUIREMENT 2: Subcategory of store 'b' MUST EXACTLY MATCH targetSubCat
            const isExactSameSubCategory = Boolean(
              (targetSubCat && bSubCat && targetSubCat.trim() === bSubCat.trim()) ||
              (targetSubClean && bSubClean && targetSubClean === bSubClean)
            );

            // If store 'b' does NOT share the exact same subcategory, DO NOT suggest its products!
            if (!isExactSameSubCategory) return;

            if (Array.isArray(b.menuItems) && b.menuItems.length > 0) {
              const bVip = getBusinessVipStatus(b);
              if (!bVip.isVip) return;
              b.menuItems.forEach((mItem, idx) => {
                if (!mItem || !mItem.name || mItem.isAvailable === false) return;
                
                // Strictly exclude any fake or demo product
                const isMockProduct = Boolean(
                  (mItem as any).isDemo || 
                  (mItem as any).isFake || 
                  (mItem as any).isMock || 
                  (typeof mItem.id === 'string' && (mItem.id.startsWith('demo-') || mItem.id.startsWith('mock-')))
                );
                if (hasRealLiveBusinesses && isMockProduct) return;

                const prodId = mItem.id || `biz_${b.id}_item_${idx}`;
                // Exclude current product itself
                if (prodId === (foundProduct as ExtendedProduct)?.id || (mItem.name && (foundProduct as ExtendedProduct)?.name && mItem.name.trim() === (foundProduct as ExtendedProduct)?.name?.trim())) return;

                exactSubMatchProducts.push({
                  ...mItem,
                  id: prodId,
                  businessId: b.id,
                  businessName: b.name || 'محل تجاري',
                  businessLogo: b.logoUrl || b.imageUrl,
                  businessImage: mItem.imageUrl || b.imageUrl || b.coverImage,
                  businessCategory: bMainCat,
                  businessSubCategory: bSubCat,
                  businessAddress: b.address || 'إربد',
                  businessPhone: b.phone,
                  businessWhatsapp: b.whatsapp || b.socialLinks?.whatsapp || b.phone,
                  businessIsVerified: bVip.isVerified || Boolean(b.isVerified),
                  businessIsVip: bVip.isVip || Boolean(b.isVip)
                });
              });
            }
          });

          // ONLY display products from stores matching the exact same subcategory
          const shuffledExact = [...exactSubMatchProducts].sort(() => 0.5 - Math.random());
          let finalSimilar = shuffledExact.slice(0, 6);

          if (hasRealLiveBusinesses) {
            finalSimilar = finalSimilar.filter(p => !(p as any).isDemo && !(p as any).isFake && !(p as any).isMock && !String(p.id).startsWith('demo-'));
          }

          setSubcategoryProducts(finalSimilar);
        }
      } catch (err) {
        console.error("Error loading product detail:", err);
      } finally {
        setLoading(false);
      }
    }

    loadProductData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdfcfb] flex items-center justify-center py-20" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-700 rounded-full animate-spin"></div>
          <p className="text-stone-500 font-bold text-sm">جاري تحميل تفاصيل المنتج...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#fdfcfb] py-16 px-4 text-right" dir="rtl">
        <div className="max-w-md mx-auto bg-white rounded-3xl border border-stone-200 p-8 text-center space-y-4 shadow-xs">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto">
            <ShoppingBag className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-black text-stone-800">المنتج غير موجود</h3>
          <p className="text-stone-500 text-sm">
            ربما تم حذف هذا الصنف أو تحريكه أو أن الرابط غير صحيح.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-700 to-teal-600 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-md cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>العودة لصفحة المنتجات والخدمات</span>
          </Link>
        </div>
      </div>
    );
  }

  const isUnavailable = product.isAvailable === false || (product.trackStock && product.stockCount === 0);
  const priceNum = selectedVersion && selectedVersion.priceType === 'fixed' && selectedVersion.price
    ? parseFloat(String(selectedVersion.price))
    : parseFloat(String(product.price)) || 0;
  const origPriceNum = product.originalPrice ? parseFloat(product.originalPrice) : 0;
  const hasDiscount = origPriceNum > priceNum;

  const phoneNum = product.businessPhone || business?.phone || '';
  const whatsappNum = product.businessWhatsapp || business?.whatsapp || phoneNum;

  const whatsappMessage = `مرحباً ${product.businessName}، أود طلب (${product.name}${selectedVersion ? ` - ${selectedVersion.name}` : ''}) بسعر ${priceNum.toFixed(2)} د.أ المعروض على منصة شو في بإربد.`;
  const whatsappUrl = getWhatsAppUrl(whatsappNum, whatsappMessage);

  const totalBusinessProductsCount = Array.isArray(business?.menuItems) && business.menuItems.length > 0 
    ? business.menuItems.length 
    : (relatedProducts.length + 1);

  const { viewUrl: actionGoogleMapsUrl } = business ? getGoogleMapsActionUrls(business) : { viewUrl: '' };
  const immediateEmbedMapUrl = business ? getGoogleMapsEmbedUrl(business) : '';
  const fallbackSearchEmbed = product ? `https://maps.google.com/maps?q=${encodeURIComponent(`${product.businessName} ${product.businessAddress || 'إربد'}`)}&hl=ar&z=15&output=embed` : '';
  const embedMapUrl = asyncEmbedMapUrl || immediateEmbedMapUrl || fallbackSearchEmbed;
  const googleMapsUrl = actionGoogleMapsUrl || business?.googlePlaceUrl || (product ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${product.businessName} ${product.businessAddress || 'إربد'}`)}` : '');

  return (
    <div className="min-h-screen bg-[#fdfcfb] pb-28 lg:pb-16 pt-0 lg:pt-6 text-[#2d2a26]" dir="rtl">
      <SEO 
        title={`${product.name} - ${product.businessName} | منصة شو في بإربد`}
        description={product.description || `تصفح تفاصيل ${product.name} من ${product.businessName} في إربد.`}
        ogImage={product.imageUrl || product.businessImage}
      />

      {/* ========================================================================= */}
      {/* MOBILE & TABLET EXCLUSIVE NATIVE APP-STYLE LAYOUT (< lg viewports) */}
      {/* ========================================================================= */}
      <div className="block lg:hidden w-full">
        
        {/* 1. App Translucent Top Bar */}
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200/80 px-4 py-2.5 flex items-center justify-between shadow-2xs">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full bg-stone-100 active:bg-stone-200 text-stone-700 flex items-center justify-center shrink-0 transition-colors"
            title="رجوع"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="text-center min-w-0 px-2 flex-1">
            <h2 className="text-xs font-black text-stone-900 truncate">
              {product.name}
            </h2>
            <p className="text-[10px] font-bold text-stone-500 truncate">
              {product.businessName}
            </p>
          </div>

          <div className="shrink-0">
            <ShareButton
              title={`${product.name} - ${product.businessName}`}
              text={`شاهد (${product.name}) لدى ${product.businessName} بسعر ${priceNum.toFixed(2)} د.أ على منصة شو في بإربد!`}
              url={window.location.href}
              size="sm"
              variant="ghost"
              className="w-9 h-9 p-0 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center"
            />
          </div>
        </div>

        {/* 2. Hero Image Banner (Native App Style) */}
        <div className="relative h-72 sm:h-96 w-full bg-stone-900 overflow-hidden">
          <img 
            src={product.imageUrl || product.businessImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'} 
            alt={product.name}
            className={`w-full h-full object-cover ${
              isUnavailable ? 'grayscale contrast-90 brightness-95' : ''
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/25 to-transparent" />

          {/* Status Badges Overlay */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1 items-start">
            {isUnavailable ? (
              <span className="bg-stone-800/90 text-stone-200 font-black text-[11px] px-3 py-1 rounded-full shadow-md backdrop-blur-xs">
                غير متوفر حالياً
              </span>
            ) : (
              product.isPopular && (
                <span className="bg-red-600 text-white font-black text-[11px] px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 fill-white" />
                  <span>الأكثر طلباً</span>
                </span>
              )
            )}
          </div>

          <div className="absolute top-3 left-3 z-10">
            <span className="bg-stone-900/80 text-amber-300 font-black text-[11px] px-3 py-1 rounded-xl shadow-md border border-stone-700/50 backdrop-blur-xs">
              {product.businessSubCategory || product.category || product.businessCategory || 'صنف'}
            </span>
          </div>

          {/* Store Quick Info Box at Bottom of Hero */}
          <div className="absolute bottom-3 right-3 left-3 text-white">
            <Link
              to={`/business/${product.businessId}`}
              className="flex items-center gap-2.5 p-2 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 active:bg-black/60 transition-all"
            >
              {product.businessLogo ? (
                <img 
                  src={product.businessLogo} 
                  alt={product.businessName} 
                  className="w-10 h-10 rounded-xl object-cover border border-white/20 shrink-0" 
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  <Store className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-amber-300 truncate">
                    {product.businessName}
                  </span>
                  {(product.businessIsVip || product.businessIsVerified || (business && getBusinessVipStatus(business).isVip)) && (
                    <VerifiedBadge size="sm" businessName={product.businessName} />
                  )}
                </div>
                <p className="text-[10px] text-white/80 flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3 text-amber-400 shrink-0" />
                  <span className="truncate">{product.businessAddress || 'إربد'}</span>
                </p>
              </div>
              <ChevronLeft className="h-4 w-4 text-white/70 shrink-0" />
            </Link>
          </div>
        </div>

        {/* 3. Product Body Content Sheet */}
        <div className="-mt-4 relative z-10 bg-white rounded-t-3xl border-t border-stone-200/80 p-4 sm:p-6 shadow-xl space-y-5">
          
          {/* Header Title & Price */}
          <div className="space-y-2 border-b border-stone-150 pb-4">
            <h1 className="text-lg sm:text-xl font-black text-stone-900 leading-snug">
              {product.name}
            </h1>

            <div className="flex items-baseline gap-2 pt-1">
              <span className="text-2xl font-black text-red-600">
                {priceNum.toFixed(2)} د.أ
              </span>
              {hasDiscount && (
                <>
                  <span className="text-xs text-stone-400 font-bold line-through">
                    {origPriceNum.toFixed(2)} د.أ
                  </span>
                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                    خصم {Math.round(((origPriceNum - priceNum) / origPriceNum) * 100)}%
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Description */}
          {product.description && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-black text-stone-400 uppercase tracking-wide">
                التفاصيل والوصف:
              </h3>
              <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-medium bg-stone-50/80 p-3.5 rounded-2xl border border-stone-150">
                {product.description}
              </p>
            </div>
          )}

          {/* Preparation Time */}
          {product.prepTimeMinutes && product.prepTimeMinutes > 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-950 text-xs font-bold">
              <Clock className="h-4 w-4 text-amber-700 shrink-0" />
              <span>وقت التحضير والتجهيز: حوالي {product.prepTimeMinutes} دقيقة</span>
            </div>
          )}

          {/* Options & Sizes Selector */}
          {Array.isArray(product.versions) && product.versions.length > 0 && (
            <div className="space-y-2.5 pt-2 border-t border-stone-150">
              <h3 className="text-xs font-black text-stone-800">الأحجام والخيارات المتاحة:</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {product.versions.map((ver) => {
                  const isSel = selectedVersion?.id === ver.id;
                  return (
                    <button
                      key={ver.id}
                      type="button"
                      onClick={() => setSelectedVersion(isSel ? null : ver)}
                      className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer active:scale-98 ${
                        isSel 
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-xs' 
                          : 'bg-stone-50/50 border-stone-200 text-stone-800 hover:bg-stone-100'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-black block">{ver.name}</span>
                        {ver.description && <span className="text-[10px] text-stone-500 block">{ver.description}</span>}
                      </div>
                      {ver.price && (
                        <span className="text-xs font-black text-red-600">
                          {ver.price} د.أ
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Store Actions & Map Container */}
          <div className="bg-stone-50 rounded-2xl p-4 border border-stone-200/80 space-y-3">
            <h3 className="text-xs font-black text-stone-900">
              خيارات التواصل وموقع المحل:
            </h3>

            <div className="space-y-2">
              {/* 1. Visit Store Page */}
              <Link
                to={`/business/${product.businessId}`}
                className="w-full py-2.5 px-3 bg-white hover:bg-stone-100 border border-stone-200 text-stone-900 rounded-xl text-xs font-black flex items-center justify-center gap-2 active:scale-98 transition-all shadow-2xs"
              >
                <Store className="h-4 w-4 text-emerald-800" />
                <span>زيارة صفحة المحل الرسمية</span>
              </Link>

              {/* 2. Direct Call */}
              {phoneNum ? (
                <a
                  href={`tel:${phoneNum}`}
                  className="w-full py-2.5 px-3 bg-stone-900 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 active:scale-98 transition-all shadow-2xs"
                >
                  <Phone3DIcon className="w-4 h-4" />
                  <span>الاتصال الهاتفي المباشر</span>
                </a>
              ) : null}

              {/* 3. WhatsApp Direct */}
              {whatsappNum ? (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 active:scale-98 transition-all shadow-2xs"
                >
                  <WhatsApp3DIcon className="w-4 h-4" />
                  <span>التواصل السريع عبر واتساب</span>
                </a>
              ) : null}

              {/* 4. Google Maps */}
              {Boolean(embedMapUrl) && (
                <div className="pt-2 space-y-2">
                  <span className="text-[11px] font-black text-stone-700 block">موقع المحل على الخريطة:</span>
                  <div className="rounded-2xl overflow-hidden border border-stone-200 shadow-2xs bg-stone-100 relative group/map">
                    <iframe
                      title={`خريطة ${product.businessName}`}
                      width="100%"
                      height="180"
                      className="w-full h-44 border-0 block group-hover/map:opacity-95 transition-opacity"
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={embedMapUrl}
                    />
                    <div className="p-2.5 bg-white flex items-center justify-between border-t border-stone-200">
                      <span className="text-[11px] font-bold text-stone-600 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-red-500" />
                        <span>موقع المحل على الخريطة</span>
                      </span>
                      {googleMapsUrl && (
                        <a
                          href={googleMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors"
                        >
                          <span>تكبير الخريطة</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {Boolean(googleMapsUrl) && (
                    <a
                      href={googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-3 bg-stone-900 hover:bg-black text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-98"
                    >
                      <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                      <span>فتح موقع المحل على خرائط Google</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Related Products Carousel */}
          {relatedProducts.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-stone-900">
                  منتجات أخرى من نفس المحل:
                </h3>
                <Link
                  to={`/business/${product.businessId || business?.id}?tab=products`}
                  className="text-[11px] font-black text-emerald-800"
                >
                  عرض الكل ({totalBusinessProductsCount})
                </Link>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none snap-x -mx-4 px-4">
                {relatedProducts.map((rel) => {
                  const relPrice = parseFloat(String(rel.price)) || 0;
                  return (
                    <Link
                      key={rel.id}
                      to={`/products/${rel.id}`}
                      className="w-36 shrink-0 snap-start bg-white rounded-2xl border border-stone-200 p-2.5 shadow-2xs active:scale-98 transition-all flex flex-col justify-between"
                    >
                      <div className="w-full aspect-square rounded-xl bg-stone-100 overflow-hidden mb-2">
                        {rel.imageUrl ? (
                          <img src={rel.imageUrl} alt={rel.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400">
                            <ShoppingBag className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <h4 className="text-xs font-black text-stone-900 truncate">
                        {rel.name}
                      </h4>
                      <span className="text-xs font-black text-red-600 block mt-1">
                        {relPrice.toFixed(2)} د.أ
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subcategory Suggested Products Carousel */}
          {subcategoryProducts.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-stone-150">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-emerald-700" />
                  <span>منتجات مشابهة</span>
                </h3>
                <Link 
                  to={`/products?category=${encodeURIComponent(product.businessCategory || '')}&subCategory=${encodeURIComponent(product.businessSubCategory || '')}`} 
                  className="text-[11px] font-black text-emerald-800"
                >
                  عرض الكل
                </Link>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none snap-x -mx-4 px-4">
                {subcategoryProducts.map((subP) => {
                  const subPPrice = parseFloat(String(subP.price)) || 0;
                  return (
                    <Link
                      key={subP.id}
                      to={`/products/${subP.id}`}
                      className="w-36 shrink-0 snap-start bg-white rounded-2xl border border-stone-200 p-2.5 shadow-2xs active:scale-98 transition-all flex flex-col justify-between"
                    >
                      <div className="w-full aspect-square rounded-xl bg-stone-100 overflow-hidden mb-2">
                        <img
                          src={subP.imageUrl || subP.businessImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'}
                          alt={subP.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-[9px] font-bold text-stone-400 truncate block">
                        {subP.businessName}
                      </span>
                      <h4 className="text-xs font-black text-stone-900 truncate">
                        {subP.name}
                      </h4>
                      <span className="text-xs font-black text-red-600 block mt-0.5">
                        {subPPrice.toFixed(2)} د.أ
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Floating App Bottom Action Bar (Mobile/Tablet Only) */}
        <div className="fixed bottom-0 left-0 right-0 z-[120] bg-white/95 backdrop-blur-md border-t border-stone-200/90 px-4 py-3 shadow-2xl flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-stone-400 block">السعر المطلوب:</span>
            <span className="text-lg sm:text-xl font-black text-red-600 leading-none">
              {priceNum.toFixed(2)} د.أ
            </span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-4 bg-emerald-500 active:bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-md active:scale-95 transition-all"
            >
              <WhatsApp3DIcon className="w-4.5 h-4.5" />
              <span>طلب عبر واتساب</span>
            </a>

            {phoneNum ? (
              <a
                href={`tel:${phoneNum}`}
                className="p-3 bg-stone-900 active:bg-stone-800 text-white rounded-xl flex items-center justify-center shadow-md active:scale-95 transition-all"
                title="اتصال هاتفي"
              >
                <Phone3DIcon className="w-4.5 h-4.5" />
              </a>
            ) : null}
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* DESKTOP EXCLUSIVE LAYOUT (hidden lg:block - 100% UNTOUCHED & PRESERVED) */}
      {/* ========================================================================= */}
      <div className="hidden lg:block max-w-5xl mx-auto px-6 space-y-8">
        {/* Main Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Column: Image & Details */}
          <div className="lg:col-span-2 bg-white rounded-3xl border border-stone-200 shadow-xs overflow-hidden space-y-0">
            
            {/* Image Header */}
            <div className="relative h-72 sm:h-96 w-full bg-stone-100 overflow-hidden">
              <img 
                src={product.imageUrl || product.businessImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'} 
                alt={product.name}
                className={`w-full h-full object-cover ${
                  isUnavailable ? 'grayscale contrast-90 brightness-95' : ''
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* Status Badges */}
              <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 items-start">
                {isUnavailable ? (
                  <span className="bg-stone-500 text-white font-black text-xs px-4 py-2 rounded-full shadow-lg">
                    غير متوفر حالياً
                  </span>
                ) : (
                  product.isPopular && (
                    <span className="bg-red-600 text-white font-black text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5">
                      <Flame className="h-3.5 w-3.5 fill-white" />
                      <span>الأكثر طلباً</span>
                    </span>
                  )
                )}
              </div>

              {/* Category Badge on Image Box */}
              <div className="absolute top-4 left-4 z-10">
                <span className="bg-emerald-800/90 text-white font-black text-xs px-4 py-2 rounded-2xl shadow-xl border border-emerald-700/50 backdrop-blur-xs">
                  <span>{product.businessSubCategory || product.category || product.businessCategory || 'صنف'}</span>
                </span>
              </div>

              {/* Overlaid Store Name */}
              <div className="absolute bottom-4 right-4 left-4 text-white">
                <div className="flex items-center gap-1.5 mb-1">
                  <Link
                    to={`/business/${product.businessId}`}
                    className="text-sm font-bold text-amber-300 hover:underline block"
                  >
                    {product.businessName}
                  </Link>
                  {(product.businessIsVip || product.businessIsVerified || (business && getBusinessVipStatus(business).isVip)) && (
                    <VerifiedBadge size="sm" businessName={product.businessName} />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-white/90">
                  <MapPin className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>{product.businessAddress || 'إربد'}</span>
                </div>
              </div>
            </div>

            {/* Product Body Content */}
            <div className="p-6 sm:p-8 space-y-6">
              <div className="space-y-2 border-b border-stone-150 pb-6">
                <div className="flex items-center justify-between gap-3">
                  <h1 className="text-xl sm:text-2xl font-black text-stone-900 leading-tight">
                    {product.name}
                  </h1>
                </div>

                {/* Price Display in Red */}
                <div className="flex items-center gap-3 pt-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-red-600">
                      {priceNum.toFixed(2)} د.أ
                    </span>
                    {hasDiscount && (
                      <span className="text-sm text-stone-400 font-bold line-through">
                        {origPriceNum.toFixed(2)} د.أ
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {product.description && (
                <div className="space-y-2">
                  <h3 className="text-xs font-black text-stone-400 uppercase tracking-wide">
                    الوصف والتفاصيل:
                  </h3>
                  <p className="text-sm text-stone-700 leading-relaxed font-medium bg-stone-50 p-4 rounded-2xl border border-stone-100">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Preparation Time */}
              {product.prepTimeMinutes && product.prepTimeMinutes > 0 && (
                <div className="flex items-center gap-2.5 p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs font-bold">
                  <Clock className="h-4.5 w-4.5 text-amber-700 shrink-0" />
                  <span>وقت التجهيز والتحضير المتوقع: حوالي {product.prepTimeMinutes} دقيقة</span>
                </div>
              )}

              {/* Versions / Options selector if present */}
              {Array.isArray(product.versions) && product.versions.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-stone-150">
                  <h3 className="text-xs font-black text-stone-700">الخيارات والأحجام المتاحة:</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {product.versions.map((ver) => {
                      const isSel = selectedVersion?.id === ver.id;
                      return (
                        <button
                          key={ver.id}
                          type="button"
                          onClick={() => setSelectedVersion(isSel ? null : ver)}
                          className={`p-3 rounded-2xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                            isSel 
                              ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-2xs' 
                              : 'bg-white border-stone-200 text-stone-800 hover:border-emerald-300'
                          }`}
                        >
                          <div>
                            <span className="text-xs font-black block">{ver.name}</span>
                            {ver.description && <span className="text-[10px] text-stone-500 font-medium block">{ver.description}</span>}
                          </div>
                          {ver.price && (
                            <span className="text-xs font-black text-red-600">
                              {ver.price} د.أ
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Primary Direct Actions */}
              <div className="pt-4 border-t border-stone-150 space-y-3">
                <h3 className="text-xs font-black text-stone-700">تواصل مع المحل للطلب السريع أو المشاركة:</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* WhatsApp Order Button */}
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-98"
                  >
                    <WhatsApp3DIcon className="w-4.5 h-4.5" />
                    <span>طلب عبر واتساب</span>
                  </a>

                  {/* Direct Phone Call Button */}
                  {phoneNum ? (
                    <a
                      href={`tel:${phoneNum}`}
                      className="py-3.5 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-98"
                    >
                      <Phone3DIcon className="w-4.5 h-4.5" />
                      <span>اتصال هاتفي مع المحل</span>
                    </a>
                  ) : (
                    <button
                      disabled
                      className="py-3.5 px-3 bg-stone-100 text-stone-400 rounded-2xl text-xs font-black flex items-center justify-center gap-2 opacity-60"
                    >
                      <Phone className="w-4 h-4" />
                      <span>الهاتف غير متاح</span>
                    </button>
                  )}

                  {/* Share Product Button */}
                  <div className="flex items-center justify-center">
                    <ShareButton
                      title={`${product.name} - ${product.businessName}`}
                      text={`شاهد (${product.name}) لدى ${product.businessName} بسعر ${priceNum.toFixed(2)} د.أ على منصة شو في بإربد!`}
                      url={window.location.href}
                      size="md"
                      variant="outline"
                      className="w-full h-full py-3 px-3 rounded-2xl flex items-center justify-center gap-2 font-black text-xs border-stone-200 hover:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Business Info & Actions */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-4 shadow-xs text-right">
              
              {/* Shop Header with Rating */}
              <div className="flex items-center gap-3 border-b border-stone-150 pb-4">
                {product.businessLogo ? (
                  <img 
                    src={product.businessLogo} 
                    alt={product.businessName} 
                    className="w-12 h-12 rounded-2xl object-cover border border-stone-200 shrink-0" 
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Store className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-black text-stone-900 truncate">{product.businessName}</h4>
                    {(product.businessIsVip || product.businessIsVerified || (business && getBusinessVipStatus(business).isVip)) && (
                      <VerifiedBadge size="sm" businessName={product.businessName} />
                    )}
                  </div>
                  <span className="text-xs text-stone-500 font-bold block truncate">{product.businessSubCategory || product.businessCategory || 'محل تجاري'}</span>
                  
                  {/* Rating below Store Name */}
                  <div className="flex items-center gap-1.5 mt-1 text-xs">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0" />
                    <span className="font-black text-stone-800">
                      {(business?.rating || product.businessRating || 4.8).toFixed(1)}
                    </span>
                    <span className="text-stone-400 text-[10px] font-bold">
                      ({business?.reviewCount || 24} تقييم)
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-1">
                
                {/* 1. Visit Store Page Button */}
                <Link
                  to={`/business/${product.businessId}`}
                  className="w-full py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Store className="h-4 w-4 text-emerald-800" />
                  <span>زيارة صفحة المحل</span>
                </Link>

                {/* 2. Phone Call Button */}
                {phoneNum ? (
                  <a
                    href={`tel:${phoneNum}`}
                    className="w-full py-3 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-98"
                  >
                    <Phone3DIcon className="w-4.5 h-4.5" />
                    <span>التواصل عبر الهاتف</span>
                  </a>
                ) : null}

                {/* 3. WhatsApp Button */}
                {whatsappNum ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 px-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-98"
                  >
                    <WhatsApp3DIcon className="w-4.5 h-4.5" />
                    <span>التواصل عبر واتساب</span>
                  </a>
                ) : null}

                {/* 4. Google Maps Location Window */}
                {Boolean(embedMapUrl) && (
                  <div className="pt-2 space-y-2">
                    <span className="text-xs font-black text-stone-700 block">موقع المحل على الخريطة:</span>
                    <div className="rounded-2xl overflow-hidden border border-stone-200/90 shadow-2xs bg-stone-100 relative group/map">
                      <iframe
                        title={`خريطة ${product.businessName}`}
                        width="100%"
                        height="190"
                        className="w-full h-48 border-0 block group-hover/map:opacity-95 transition-opacity"
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={embedMapUrl}
                      />
                      <div className="p-2.5 bg-white flex items-center justify-between border-t border-stone-200">
                        <span className="text-[11px] font-bold text-stone-600 flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-red-500" />
                          <span>موقع المحل على الخريطة</span>
                        </span>
                        {googleMapsUrl && (
                          <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors"
                          >
                            <span>تكبير الخريطة</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </div>

                    {Boolean(googleMapsUrl) && (
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 px-3 bg-stone-900 hover:bg-black text-white rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-98 mt-2"
                      >
                        <MapPin className="h-4 w-4 text-emerald-400" />
                        <span>فتح موقع المحل على خرائط Google</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Related Products from Same Business */}
            <div className="bg-white rounded-3xl border border-stone-200 p-6 space-y-4 shadow-xs text-right">
              <h4 className="text-xs font-black text-stone-800 uppercase tracking-wide">
                منتجات أخرى من نفس المحل:
              </h4>

              {relatedProducts.length > 0 && (
                <div className="space-y-3">
                  {relatedProducts.map((rel) => {
                    const relPrice = parseFloat(String(rel.price)) || 0;
                    return (
                      <Link
                        key={rel.id}
                        to={`/products/${rel.id}`}
                        className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-stone-50 border border-transparent hover:border-stone-200 transition-all group"
                      >
                        <div className="w-12 h-12 rounded-xl bg-stone-100 overflow-hidden shrink-0">
                          {rel.imageUrl ? (
                            <img src={rel.imageUrl} alt={rel.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-400">
                              <ShoppingBag className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-black text-stone-900 truncate group-hover:text-emerald-700 transition-colors">
                            {rel.name}
                          </h5>
                          <span className="text-xs font-bold text-red-600 block">
                            {relPrice.toFixed(2)} د.أ
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              <Link
                to={`/business/${product.businessId || business?.id}?tab=products`}
                className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-[#1a4d2e] border border-emerald-200/90 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs mt-2"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>عرض جميع المنتجات ({totalBusinessProductsCount})</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Section 1: Subcategory Products */}
        {subcategoryProducts.length > 0 && (
          <div className="pt-8 border-t border-stone-200/80 space-y-6 text-right">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-black text-stone-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-700" />
                <span>منتجات مشابهة</span>
              </h3>
              <Link
                to={`/products?category=${encodeURIComponent(product.businessCategory || '')}&subCategory=${encodeURIComponent(product.businessSubCategory || '')}`}
                className="text-xs font-black text-emerald-800 hover:underline"
              >
                عرض الكل
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5 sm:gap-4">
              {subcategoryProducts.map((subP) => {
                const subPPrice = parseFloat(String(subP.price)) || 0;
                return (
                  <Link
                    key={subP.id}
                    to={`/products/${subP.id}`}
                    className="bg-white rounded-2xl border border-stone-200/90 overflow-hidden shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all flex flex-col group p-2.5"
                  >
                    <div className="w-full aspect-square rounded-xl bg-stone-100 overflow-hidden mb-2 relative">
                      <img
                        src={subP.imageUrl || subP.businessImage || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'}
                        alt={subP.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-[10px] font-bold text-stone-400 truncate block">
                        {subP.businessName}
                      </span>
                      {(subP.businessIsVip || subP.businessIsVerified) && (
                        <VerifiedBadge size="sm" businessName={subP.businessName} />
                      )}
                    </div>
                    <h5 className="text-xs font-black text-stone-900 truncate group-hover:text-emerald-700 transition-colors leading-snug">
                      {subP.name}
                    </h5>
                    <span className="text-xs font-black text-red-600 mt-1 block">
                      {subPPrice.toFixed(2)} د.أ
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductDetail;
