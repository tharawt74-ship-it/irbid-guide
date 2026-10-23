import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate, useSearchParams } from 'react-router';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  MapPin, 
  Search, 
  Filter, 
  Sparkles, 
  Phone, 
  Globe, 
  X, 
  Crosshair, 
  ChevronDown, 
  Store, 
  Clock, 
  ExternalLink, 
  SlidersHorizontal,
  Layers,
  ChevronRight,
  ChevronLeft,
  List,
  Map as MapIcon,
  Crown,
  Briefcase,
  Percent,
  Star,
  Image as ImageIcon,
  Package,
  CheckCircle2,
  Heart,
  RotateCcw,
  Navigation,
  Copy,
  Check,
  Flame,
  Gift,
  Tag,
  DollarSign,
  Users,
  Award,
  Building2,
  Loader2,
  Share2,
  Truck,
  Maximize2,
  Plus,
  Minus
} from 'lucide-react';
import { collection, getDocs, query, limit, where, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Business, MenuItem } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { 
  getCachedBusinesses, 
  setCachedBusinesses, 
  getCachedOffers, 
  setCachedOffers, 
  getCachedJobs, 
  setCachedJobs,
  isBusinessesCacheFresh,
  isOffersCacheFresh
} from '../lib/dataCache';
import { BUSINESS_CATEGORIES, MainCategory } from '../lib/categories';
import { getBusinessVipStatus } from '../lib/vipHelper';
import { SEO } from '../components/common/SEO';
import { VoiceSearchButton } from '../components/common/VoiceSearchButton';
import { cn } from '../lib/utils';
import { WhatsAppIcon } from '../components/common/WhatsAppIcon';
import { 
  getWhatsAppUrl, 
  formatBusinessWhatsAppMessage,
  formatMenuItemWhatsAppMessage,
  formatOfferWhatsAppMessage,
  formatJobWhatsAppMessage
} from '../lib/contactHelper';
import { WhatsApp3DIcon, Phone3DIcon } from '../components/common/PremiumContactButtons';
import { VerifiedBadge } from '../components/vip/VerifiedBadge';
import { getLiveWorkingStatus } from '../lib/businessHoursHelper';
import { 
  checkReviewRateLimit, 
  checkIpReviewRateLimit, 
  recordReviewSubmission, 
  recordIpReviewLock, 
  getDeviceFingerprint, 
  containsUrlOrLink, 
  stripUrlsAndLinks, 
  sanitizeInput, 
  executeReCaptcha, 
  isBotSubmission, 
  recordSubmissionTime 
} from '../lib/security';
import { submitReviewAtomically } from '../utils/firestoreTransactions';
import { getCategoryFallbackImage } from '../lib/categoryOfferConfig';

function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} م`;
  }
  return `${km.toFixed(1)} كم`;
}

function renderOfferDurationText(item: any): string {
  if (!item.durationMode) {
    return item.expiresIn || 'لفترة محدودة';
  }
  if (item.durationMode === 'recurring_weekly') {
    const days = item.recurringDays || [];
    if (days.length === 0) return 'متكرر أسبوعياً';
    return `نشط كل يوم: ${days.join('، ')}`;
  }
  if (item.expiresAt) {
    const timeLeftMs = item.expiresAt - Date.now();
    if (timeLeftMs <= 0) {
      return 'منتهي الصلاحية';
    }
    const totalHoursLeft = timeLeftMs / (3600 * 1000);
    if (totalHoursLeft < 1) {
      return 'ينتهي خلال أقل من ساعة';
    }
    if (totalHoursLeft < 24) {
      return `متبقي ${Math.floor(totalHoursLeft)} ساعة`;
    }
    const daysLeft = Math.floor(totalHoursLeft / 24);
    return `ينتهي خلال ${daysLeft} يوم`;
  }
  return item.expiresIn || 'لفترة محدودة';
}

function formatOfferPrice(price?: string | number): string {
  if (price === undefined || price === null) return '';
  const str = String(price).trim();
  if (!str) return '';
  if (str.includes('د.أ') || str.includes('دينار')) return str;
  return `${str} د.أ`;
}

type MapTab = 'stores' | 'offers' | 'jobs';
type StoreDetailTab = 'services' | 'offers' | 'jobs' | 'gallery' | 'reviews';

/* ========================================================================= */
/* MODAL: PRODUCT / SERVICE DETAILS (Modal on desktop, Bottom Sheet on mobile) */
/* ========================================================================= */
function MapProductDetailModal({
  product,
  business,
  onClose
}: {
  product: MenuItem;
  business: Business;
  onClose: () => void;
}) {
  const storePageUrl = business.username ? `/@${business.username}` : `/business/${business.id}`;
  const phone = business.phone || '';
  const priceDisplay = product.price ? `${product.price} د.أ` : '';
  const whatsappMsg = formatMenuItemWhatsAppMessage(business.name, product.name, priceDisplay);
  const wpRaw = business.socialLinks?.whatsapp || (business as any).whatsapp || business.phone;
  const whatsappUrl = wpRaw ? getWhatsAppUrl(wpRaw, whatsappMsg) : null;
  const isAvailable = product.isAvailable !== false;

  return typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[100000] bg-stone-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden" dir="rtl">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative z-10 bg-white rounded-t-3xl sm:rounded-3xl max-w-xl w-full max-h-[88vh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-stone-200 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 text-right">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-100 shrink-0 bg-white">
          <div className="min-w-0 flex-1 pl-2">
            <h3 className="font-black text-base sm:text-lg text-stone-900 truncate">
              {product.name}
            </h3>
            <p className="text-xs text-stone-500 font-bold truncate">
              {business.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Product Image Frame */}
          <div className="relative h-56 sm:h-64 w-full rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
            <img
              src={product.imageUrl || business.coverImage || business.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800'}
              alt={product.name}
              className={`w-full h-full object-cover ${!isAvailable ? 'grayscale contrast-90' : ''}`}
            />
            {/* Status Badges */}
            <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-start">
              {!isAvailable ? (
                <span className="bg-stone-900/90 text-stone-200 text-xs font-black px-3 py-1 rounded-full shadow-md backdrop-blur-xs">
                  غير متوفر حالياً
                </span>
              ) : (
                <span className="bg-emerald-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-md">
                  متوفر
                </span>
              )}
            </div>
            {product.category && (
              <div className="absolute top-3 left-3">
                <span className="bg-stone-900/80 text-amber-300 text-xs font-bold px-2.5 py-1 rounded-xl shadow-md backdrop-blur-xs">
                  {product.category}
                </span>
              </div>
            )}
          </div>

          {/* Pricing & Availability Card */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-stone-400 block mb-0.5">السعر:</span>
              <div className="flex items-baseline gap-2">
                {product.price ? (
                  <span className="text-2xl font-black text-[#1a4d2e]">
                    {product.price} د.أ
                  </span>
                ) : (
                  <span className="text-base font-black text-stone-700">السعر حسب الطلب</span>
                )}
                {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                  <span className="text-sm font-bold text-stone-400 line-through">
                    {product.originalPrice} د.أ
                  </span>
                )}
              </div>
            </div>
            <Link
              to={storePageUrl}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1a4d2e] bg-white border border-stone-200 px-3 py-1.5 rounded-xl hover:bg-stone-100 transition-colors"
            >
              <Store className="w-3.5 h-3.5" />
              <span>صفحة المحل</span>
            </Link>
          </div>

          {/* Product Description */}
          {product.description && (
            <div className="space-y-1.5">
              <h4 className="font-bold text-xs text-stone-700">الوصف والتفاصيل:</h4>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed bg-white p-3.5 rounded-xl border border-stone-200 whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          {/* Store Info Banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center gap-3">
            {business.logoUrl || business.imageUrl ? (
              <img
                src={business.logoUrl || business.imageUrl}
                alt={business.name}
                className="w-11 h-11 rounded-xl object-cover border border-emerald-200 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-[#1a4d2e] text-white flex items-center justify-center font-bold text-xs shrink-0">
                <Store className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h5 className="font-black text-xs text-stone-900 truncate">{business.name}</h5>
                <VerifiedBadge size="sm" businessName={business.name} />
              </div>
              <p className="text-[11px] text-stone-500 truncate flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-[#ff9f1c] shrink-0" />
                <span className="truncate">{business.address || 'إربد'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer (Action Buttons) */}
        <div className="p-3.5 sm:p-4 bg-stone-50 border-t border-stone-200 flex items-center gap-2 shrink-0">
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <WhatsApp3DIcon className="w-4 h-4 text-white" />
              <span>طلب عبر الواتساب</span>
            </a>
          ) : null}
          {phone ? (
            <a
              href={`tel:${phone}`}
              className="py-2.5 px-4 rounded-xl bg-[#1a4d2e] hover:bg-[#133c23] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Phone3DIcon className="w-4 h-4 text-white" />
              <span>اتصال</span>
            </a>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  ) : null;
}

/* ========================================================================= */
/* MODAL: OFFER DETAILS (Modal on desktop, Bottom Sheet on mobile) */
/* ========================================================================= */
function MapOfferDetailModal({
  offer,
  business,
  onClose
}: {
  offer: any;
  business: Business;
  onClose: () => void;
}) {
  const [copiedCode, setCopiedCode] = useState(false);
  const phone = offer.phone || business.phone || '';
  const wpRaw = offer.whatsapp || offer.phone || business.socialLinks?.whatsapp || (business as any).whatsapp || business.phone;
  const whatsappMsg = formatOfferWhatsAppMessage(offer.title, business.name);
  const whatsappUrl = wpRaw ? getWhatsAppUrl(wpRaw, whatsappMsg) : null;
  const durationText = renderOfferDurationText(offer);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[100000] bg-stone-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden" dir="rtl">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative z-10 bg-white rounded-t-3xl sm:rounded-3xl max-w-xl w-full max-h-[88vh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-stone-200 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 text-right">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-100 shrink-0 bg-white">
          <div className="min-w-0 flex-1 pl-2">
            <h3 className="font-black text-base sm:text-lg text-stone-900 truncate">
              {offer.title}
            </h3>
            <p className="text-xs text-stone-500 font-bold truncate">
              {business.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Hero Offer Image Frame */}
          <div className="relative h-56 sm:h-64 w-full rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
            <img
              src={offer.image || business.coverImage || business.imageUrl || getCategoryFallbackImage(offer.category || business.category, business.subCategory)}
              alt={offer.title}
              className="w-full h-full object-cover"
            />
            {/* Status Badges */}
            <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-start">
              {offer.isHot && (
                <span className="bg-red-600 text-white text-[11px] font-black px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 fill-white" />
                  <span>سوبر هُوت</span>
                </span>
              )}
              {offer.isStudent && (
                <span className="bg-amber-500 text-stone-950 text-[11px] font-black px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5" />
                  <span>خصم طلابي</span>
                </span>
              )}
            </div>

            {offer.discountPercentage ? (
              <div className="absolute top-3 left-3">
                <span className="bg-[#1a4d2e] text-white text-xs font-black px-3 py-1.5 rounded-xl shadow-md border border-emerald-600/30 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-emerald-300" />
                  <span>خصم {offer.discountPercentage}%</span>
                </span>
              </div>
            ) : null}
          </div>

          {/* Pricing & Duration Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 flex flex-col justify-center">
              <span className="text-[10px] font-bold text-stone-400 block mb-0.5">تفاصيل السعر:</span>
              <div className="flex items-baseline gap-2">
                {offer.newPrice ? (
                  <span className="text-xl font-black text-[#1a4d2e]">
                    {formatOfferPrice(offer.newPrice)}
                  </span>
                ) : (
                  <span className="text-base font-black text-[#1a4d2e]">خصم خاص</span>
                )}
                {offer.oldPrice && (
                  <span className="text-xs font-bold text-stone-400 line-through">
                    {formatOfferPrice(offer.oldPrice)}
                  </span>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col justify-center">
              <span className="text-[10px] font-bold text-stone-400 block mb-0.5">مدة العرض:</span>
              <div className="flex items-center gap-1.5 text-stone-800">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="text-xs font-black text-stone-900">{durationText}</span>
              </div>
            </div>
          </div>

          {/* Coupon Code Ticket (if available) */}
          {offer.code && (
            <div className="p-3.5 rounded-2xl bg-stone-50 border-2 border-dashed border-red-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-red-100 text-red-600 rounded-xl shrink-0">
                  <Tag className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-black text-stone-900 block truncate">كود الخصم الحصري</span>
                  <code className="text-red-600 font-mono font-black text-sm">{offer.code}</code>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopyCode(offer.code)}
                className="py-1.5 px-3 rounded-lg bg-white border border-stone-200 hover:bg-stone-100 text-stone-800 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shrink-0 shadow-2xs"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-stone-500" />
                    <span>نسخ</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Offer Description */}
          {offer.description && (
            <div className="space-y-1.5">
              <h4 className="font-bold text-xs text-stone-700">تفاصيل العرض:</h4>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed bg-white p-3.5 rounded-xl border border-stone-200 whitespace-pre-line">
                {offer.description}
              </p>
            </div>
          )}

          {/* Store Info Banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center gap-3">
            {business.logoUrl || business.imageUrl ? (
              <img
                src={business.logoUrl || business.imageUrl}
                alt={business.name}
                className="w-11 h-11 rounded-xl object-cover border border-emerald-200 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-[#1a4d2e] text-white flex items-center justify-center font-bold text-xs shrink-0">
                <Store className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h5 className="font-black text-xs text-stone-900 truncate">{business.name}</h5>
                <VerifiedBadge size="sm" businessName={business.name} />
              </div>
              <p className="text-[11px] text-stone-500 truncate flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-[#ff9f1c] shrink-0" />
                <span className="truncate">{business.address || 'إربد'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-stone-50 border-t border-stone-200 flex items-center gap-2 shrink-0">
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <WhatsApp3DIcon className="w-4 h-4 text-white" />
              <span>استفسار عبر الواتساب</span>
            </a>
          ) : null}
          {phone ? (
            <a
              href={`tel:${phone}`}
              className="py-2.5 px-4 rounded-xl bg-[#1a4d2e] hover:bg-[#133c23] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Phone3DIcon className="w-4 h-4 text-white" />
              <span>اتصال</span>
            </a>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  ) : null;
}

/* ========================================================================= */
/* MODAL: JOB DETAILS (Modal on desktop, Bottom Sheet on mobile) */
/* ========================================================================= */
function MapJobDetailModal({
  job,
  business,
  onClose
}: {
  job: any;
  business: Business;
  onClose: () => void;
}) {
  const storePageUrl = business.username ? `/@${business.username}` : `/business/${business.id}`;
  const phone = job.contactPhone || job.phone || business.phone || '';
  const wpRaw = job.contactWhatsapp || job.whatsapp || phone;
  const whatsappMsg = formatJobWhatsAppMessage(job.title, job.company || business.name);
  const whatsappUrl = wpRaw ? getWhatsAppUrl(wpRaw, whatsappMsg) : null;

  return typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[100000] bg-stone-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden" dir="rtl">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative z-10 bg-white rounded-t-3xl sm:rounded-3xl max-w-xl w-full max-h-[88vh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-stone-200 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 text-right">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-100 shrink-0 bg-white">
          <div className="min-w-0 flex-1 pl-2">
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              {job.category && (
                <span className="bg-[#1a4d2e]/10 text-[#1a4d2e] text-[10px] font-black px-2 py-0.5 rounded-md">
                  {job.category}
                </span>
              )}
              {(job.type || job.jobType) && (
                <span className="bg-stone-100 text-stone-600 text-[10px] font-bold px-2 py-0.5 rounded-md">
                  {job.type || job.jobType}
                </span>
              )}
              {job.isUrgent && (
                <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Flame className="w-3 h-3 fill-white" />
                  <span>شاغر عاجل</span>
                </span>
              )}
            </div>
            <h3 className="font-black text-base sm:text-lg text-stone-900 truncate">
              {job.title}
            </h3>
            <p className="text-xs text-stone-500 font-bold truncate">
              {job.company || business.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Specs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-200">
            <div className="space-y-0.5">
              <span className="text-[10px] text-stone-400 font-bold block">الموقع في إربد:</span>
              <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#ff9f1c]" />
                {job.location || business.address || 'إربد'}
              </span>
            </div>

            {job.salary && (
              <div className="space-y-0.5">
                <span className="text-[10px] text-stone-400 font-bold block">الراتب / الأجر:</span>
                <span className="text-xs font-black text-emerald-700 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  {job.salary}
                </span>
              </div>
            )}

            {job.workHours && (
              <div className="space-y-0.5">
                <span className="text-[10px] text-stone-400 font-bold block">أوقات العمل:</span>
                <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-sky-600" />
                  {job.workHours}
                </span>
              </div>
            )}

            {job.experienceLevel && (
              <div className="space-y-0.5">
                <span className="text-[10px] text-stone-400 font-bold block">الخبرة المطلوبة:</span>
                <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-purple-600" />
                  {job.experienceLevel}
                </span>
              </div>
            )}

            {job.genderPreference && (
              <div className="space-y-0.5">
                <span className="text-[10px] text-stone-400 font-bold block">الجنس:</span>
                <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-stone-500" />
                  {job.genderPreference === 'males' ? 'ذكور فقط' : job.genderPreference === 'females' ? 'إناث فقط' : 'متاح للذكور والإناث'}
                </span>
              </div>
            )}
          </div>

          {/* Benefits */}
          {job.benefits && job.benefits.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="font-bold text-xs text-stone-700">المزايا والحوافز المقدمة:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-emerald-50/40 p-3 rounded-xl border border-emerald-100">
                {job.benefits.map((benefit: string, idx: number) => (
                  <div key={idx} className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {job.description && (
            <div className="space-y-1.5">
              <h4 className="font-bold text-xs text-stone-700">الوصف الوظيفي:</h4>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed bg-white p-3.5 rounded-xl border border-stone-200 whitespace-pre-line">
                {job.description}
              </p>
            </div>
          )}

          {/* Requirements */}
          {job.requirements && job.requirements.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="font-bold text-xs text-stone-700">المتطلبات والشروط:</h4>
              <ul className="space-y-1.5 text-xs text-stone-700 bg-stone-50 p-3 rounded-xl border border-stone-200">
                {job.requirements.map((req: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1a4d2e] shrink-0 mt-0.5" />
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* How to apply */}
          {job.howToApply && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
              <span className="font-bold block mb-0.5">طريقة التقديم:</span>
              <span>{job.howToApply}</span>
            </div>
          )}

          {/* Store Info Banner */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-[#1a4d2e] text-white flex items-center justify-center font-bold text-xs shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h5 className="font-black text-xs text-stone-900 truncate">{job.company || business.name}</h5>
                <p className="text-[11px] text-stone-500 truncate">{business.address || 'إربد'}</p>
              </div>
            </div>
            <Link
              to={storePageUrl}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#1a4d2e] bg-white border border-stone-200 px-3 py-1.5 rounded-xl hover:bg-stone-50 transition-colors shrink-0"
            >
              <Store className="w-3.5 h-3.5" />
              <span>صفحة المحل</span>
            </Link>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-stone-50 border-t border-stone-200 flex items-center gap-2 shrink-0">
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2.5 px-3 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <WhatsApp3DIcon className="w-4 h-4 text-white" />
              <span>قدم عبر الواتساب الآن</span>
            </a>
          ) : null}
          {phone ? (
            <a
              href={`tel:${phone}`}
              className="py-2.5 px-4 rounded-xl bg-[#1a4d2e] hover:bg-[#133c23] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Phone3DIcon className="w-4 h-4 text-white" />
              <span>اتصال</span>
            </a>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  ) : null;
}

/* ========================================================================= */
/* MODAL: ADD REVIEW (Modal on desktop, Bottom Sheet on mobile) */
/* ========================================================================= */
function MapReviewModal({
  business,
  isOpen,
  onClose,
  onReviewSubmitted
}: {
  business: Business;
  isOpen: boolean;
  onClose: () => void;
  onReviewSubmitted: (newReview: any) => void;
}) {
  const { currentUser } = useAuth();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockStatus, setLockStatus] = useState<{ locked: boolean; message: string; remainingHours?: number } | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  useEffect(() => {
    if (!isOpen || !business?.id) return;

    let isMounted = true;
    setCheckingEligibility(true);
    setLockStatus(null);
    setError(null);

    const verifyReviewEligibility = async () => {
      // 1. Browser/Device Local Rate Limit
      const localCheck = checkReviewRateLimit(business.id);
      if (!localCheck.allowed) {
        if (isMounted) {
          setLockStatus({
            locked: true,
            message: localCheck.reason || 'لقد تم تسجيل تقييم لهذا المحل مؤخراً من جهازك. حفاظاً على مصداقية التقييمات، يمكنك إضافة تقييم جديد بعد 24 ساعة.'
          });
          setCheckingEligibility(false);
        }
        return;
      }

      // 2. Server-side IP 24-hour rate limit (persists across cleared browsing data & switching browsers)
      try {
        const ipCheck = await checkIpReviewRateLimit(business.id);
        if (!ipCheck.allowed && isMounted) {
          setLockStatus({
            locked: true,
            message: ipCheck.message || 'لقد تم تسجيل تقييم لهذا المحل مؤخراً من جهازك أو شبكتك. حفاظاً على مصداقية التقييمات، يمكنك إضافة تقييم جديد بعد 24 ساعة.',
            remainingHours: ipCheck.remainingHours
          });
          setCheckingEligibility(false);
          return;
        }
      } catch (ipErr) {
        console.warn('IP initial rate limit check failed:', ipErr);
      }

      // 3. Database-level same-account check (prevents same account reviewing multiple times across different devices)
      if (currentUser && db) {
        try {
          const qUserReview = query(
            collection(db, 'reviews'),
            where('businessId', '==', business.id),
            where('userId', '==', currentUser.uid)
          );
          const userSnap = await getDocs(qUserReview);
          const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
          const now = Date.now();
          let hasRecent = false;
          let newestTime = 0;

          userSnap.forEach((docSnap) => {
            const rev = docSnap.data();
            if (rev.createdAt) {
              const diff = now - rev.createdAt;
              if (diff < TWENTY_FOUR_HOURS) {
                hasRecent = true;
                if (rev.createdAt > newestTime) {
                  newestTime = rev.createdAt;
                }
              }
            }
          });

          if (hasRecent && isMounted) {
            const remainingHours = Math.ceil((TWENTY_FOUR_HOURS - (now - newestTime)) / (60 * 60 * 1000));
            setLockStatus({
              locked: true,
              message: `لقد قمت بإضافة تقييم لهذا المحل مؤخراً باستخدام هذا الحساب. حفاظاً على مصداقية التقييمات، يمكنك إضافة تقييم جديد بعد ${remainingHours} ساعة.`,
              remainingHours
            });
            setCheckingEligibility(false);
            return;
          }
        } catch (dbErr) {
          console.warn('User review history check error:', dbErr);
        }
      }

      if (isMounted) {
        setCheckingEligibility(false);
      }
    };

    verifyReviewEligibility();

    return () => {
      isMounted = false;
    };
  }, [isOpen, business?.id, currentUser?.uid]);

  if (!isOpen) return null;

  const ratingLabels: Record<number, string> = {
    1: 'سيء',
    2: 'مقبول',
    3: 'جيد',
    4: 'جيد جداً',
    5: 'ممتاز'
  };

  const currentLabel = ratingLabels[hoverRating || rating] || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 0. Honeypot Bot Trap
    if (isBotSubmission(honeypot)) {
      onClose();
      return;
    }

    if (!rating || rating < 1) {
      setError('يرجى اختيار التقييم بالنجوم');
      return;
    }

    if (lockStatus?.locked) {
      setError(lockStatus.message);
      return;
    }

    // 1. Strict Link & URL Validation (Anti-Spam / Anti-Phishing)
    if (containsUrlOrLink(comment)) {
      setError('عذراً، يمنع نشر الروابط أو عناوين المواقع الإلكترونية في التقييمات نهائياً. التقييم مخصص للملاحظات والآراء النصية فقط.');
      return;
    }

    // 2. Strict XSS and Code Injection Sanitization
    const cleanComment = stripUrlsAndLinks(sanitizeInput(comment.trim()));
    if (comment.trim() && !cleanComment) {
      setError('عذراً، يمنع إدراج الروابط في التقييمات. التقييم مخصص للملاحظات والآراء النصية فقط.');
      return;
    }

    // 3. Local Rate Limit Verification
    const rateLimit = checkReviewRateLimit(business.id);
    if (!rateLimit.allowed) {
      setError(rateLimit.reason || 'يرجى الانتظار قبل إضافة تقييم جديد لحماية المنصة من التعليقات المتكررة.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      // 4. Server-side IP 24-Hour Rate Limit (Survives browsing data wipe & browser changes)
      let activeIpLockId = '';
      try {
        const ipCheck = await checkIpReviewRateLimit(business.id);
        if (!ipCheck.allowed) {
          setError(ipCheck.message || 'لقد تم تسجيل تقييم لهذا المحل مؤخراً من جهازك أو شبكتك. حفاظاً على مصداقية التقييمات، يمكنك إضافة تقييم جديد بعد 24 ساعة.');
          setSubmitting(false);
          return;
        }
        activeIpLockId = ipCheck.lockId || '';
      } catch (ipErr) {
        console.warn('IP check error in map review:', ipErr);
      }

      // 5. Database-level same-account check (Multi-device protection)
      if (currentUser && db) {
        const qUserReview = query(
          collection(db, 'reviews'),
          where('businessId', '==', business.id),
          where('userId', '==', currentUser.uid)
        );
        const userReviewSnap = await getDocs(qUserReview);
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        const now = Date.now();
        let hasRecentReview = false;
        let newestReviewTime = 0;

        userReviewSnap.forEach((docSnap) => {
          const rev = docSnap.data();
          if (rev.createdAt) {
            const diff = now - rev.createdAt;
            if (diff < TWENTY_FOUR_HOURS) {
              hasRecentReview = true;
              if (rev.createdAt > newestReviewTime) {
                newestReviewTime = rev.createdAt;
              }
            }
          }
        });

        if (hasRecentReview) {
          const remainingHours = Math.ceil((TWENTY_FOUR_HOURS - (now - newestReviewTime)) / (60 * 60 * 1000));
          setError(`لقد قمت بإضافة تقييم لهذا المحل مؤخراً باستخدام هذا الحساب. حفاظاً على مصداقية التقييمات، يمكنك إضافة تقييم جديد بعد ${remainingHours} ساعة.`);
          setSubmitting(false);
          return;
        }
      }

      // 6. Google reCAPTCHA Enterprise
      let recaptchaToken = '';
      try {
        recaptchaToken = await executeReCaptcha('map_review_submit');
      } catch (rcError) {
        console.warn('reCAPTCHA execution fallback:', rcError);
      }

      // 7. Hardware & Environment Device Fingerprinting
      let deviceFingerprint = '';
      try {
        deviceFingerprint = await getDeviceFingerprint();
      } catch {}

      const rawUserName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'مستخدم';
      const cleanUserName = stripUrlsAndLinks(sanitizeInput(rawUserName)) || 'مستخدم';

      const reviewData = {
        businessId: business.id,
        userId: currentUser?.uid || ('guest-' + Date.now()),
        userName: cleanUserName,
        rating,
        comment: cleanComment,
        deviceFingerprint: deviceFingerprint || 'fp_gen',
        recaptchaToken: recaptchaToken || 'token_generated',
        createdAt: Date.now()
      };

      let newReviewId = 'rev-' + Date.now();

      // 8. Atomic Firestore Transaction with Rate Lock
      if (db) {
        try {
          const atomicRes = await submitReviewAtomically(db, business.id, {
            ...reviewData,
            ipLockId: activeIpLockId || undefined
          });
          newReviewId = atomicRes.reviewId;
        } catch (atomicErr: any) {
          if (atomicErr?.message === 'LIMIT_EXCEEDED') {
            setError('لقد تم تسجيل تقييم لهذا المحل مؤخراً. يرجى الانتظار 24 ساعة قبل إضافة تقييم جديد.');
            setSubmitting(false);
            return;
          }
          console.warn('Error adding atomic review to firestore, using fallback:', atomicErr);
          const docRef = await addDoc(collection(db, 'reviews'), reviewData);
          newReviewId = docRef.id;
        }
      }

      // 9. Record client-side rate limits and server IP lock
      recordReviewSubmission(business.id);
      recordSubmissionTime('review_submit');
      recordIpReviewLock(business.id, newReviewId, rating).catch((err) => {
        console.warn('Failed to record IP review lock:', err);
      });

      onReviewSubmitted({ id: newReviewId, ...reviewData });
      onClose();
    } catch (err) {
      console.error('Error submitting review:', err);
      setError('حدث خطأ أثناء إرسال التقييم، يرجى المحاولة لاحقاً');
    } finally {
      setSubmitting(false);
    }
  };

  const isFormDisabled = submitting || lockStatus?.locked || checkingEligibility;

  return typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[100000] bg-stone-950/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden" dir="rtl">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative z-10 bg-white rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[88vh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-stone-200 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200 text-right">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-100 shrink-0 bg-white">
          <div className="min-w-0 flex-1 pl-2">
            <h3 className="font-black text-base text-stone-900 truncate">
              إضافة تقييم
            </h3>
            <p className="text-xs text-stone-500 font-bold truncate">
              {business.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Honeypot Bot Trap */}
          <input
            type="text"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            aria-hidden="true"
            className="sr-only opacity-0 absolute -z-10 pointer-events-none"
            autoComplete="off"
          />

          {/* Locked Notice if already reviewed */}
          {lockStatus?.locked && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-bold leading-relaxed">
              {lockStatus.message}
            </div>
          )}

          {/* Star Selection */}
          <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/80 text-center space-y-2">
            <span className="text-xs font-bold text-stone-700 block">حدد تقييمك:</span>
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  disabled={isFormDisabled}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 cursor-pointer transition-transform hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <Star
                    className={cn(
                      "w-8 h-8 sm:w-9 sm:h-9 transition-colors",
                      (hoverRating || rating) >= star
                        ? "fill-amber-400 text-amber-400"
                        : "text-stone-300"
                    )}
                  />
                </button>
              ))}
            </div>
            {currentLabel && (
              <span className="inline-block text-xs font-black text-amber-700 bg-amber-100/70 px-3 py-0.5 rounded-full">
                {currentLabel}
              </span>
            )}
          </div>

          {/* Comment Textarea */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 block">
              رأيك أو ملاحظاتك (اختياري):
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={isFormDisabled}
              rows={4}
              placeholder="اكتب تجربتك أو رأيك في هذا المحل..."
              className="w-full p-3 rounded-xl border border-stone-200 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] resize-none disabled:bg-stone-50 disabled:text-stone-400 disabled:cursor-not-allowed"
            />
          </div>

          {error && (
            <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
              {error}
            </p>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isFormDisabled}
              className="w-full py-3 bg-[#1a4d2e] hover:bg-[#133c23] text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري إرسال التقييم...</span>
                </>
              ) : checkingEligibility ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري التحقق...</span>
                </>
              ) : lockStatus?.locked ? (
                <span>تم تسجيل تقييمك مسبقاً</span>
              ) : (
                <span>إرسال التقييم</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  ) : null;
}

interface StoreDetailPanelProps {
  business: Business;
  activeDetailTab: StoreDetailTab;
  setActiveDetailTab: (tab: StoreDetailTab) => void;
  onClose: () => void;
  activeOffers: any[];
  activeJobs: any[];
  reviews: any[];
  loadingReviews: boolean;
  photos: string[];
  onPreviewPhoto: (url: string) => void;
  userDistanceKm?: number | null;
  onSelectProduct?: (product: MenuItem) => void;
  onSelectOffer?: (offer: any) => void;
  onSelectJob?: (job: any) => void;
  onOpenAddReview?: () => void;
  onShare?: (business: Business) => void;
}

function StoreDetailPanel({
  business,
  activeDetailTab,
  setActiveDetailTab,
  onClose,
  activeOffers,
  activeJobs,
  reviews,
  loadingReviews,
  photos,
  onPreviewPhoto,
  userDistanceKm,
  onSelectProduct,
  onSelectOffer,
  onSelectJob,
  onOpenAddReview,
  onShare
}: StoreDetailPanelProps) {
  const { userFavorites, toggleFavorite } = useAuth();
  const isFav = userFavorites.includes(business.id);
  const vip = getBusinessVipStatus(business);
  const liveStatus = getLiveWorkingStatus(business.workingHours);
  const phone = business.phone;

  const wpRaw = business.socialLinks?.whatsapp || (business as any).whatsapp || business.phone;
  const whatsAppUrl = wpRaw
    ? (wpRaw.startsWith('http') || wpRaw.startsWith('wa.me'))
      ? (wpRaw.startsWith('wa.me') ? `https://${wpRaw}` : wpRaw)
      : getWhatsAppUrl(wpRaw, formatBusinessWhatsAppMessage(business.name))
    : null;

  const googleMapsUrl = (business.googlePlaceUrl && business.googlePlaceUrl.startsWith('http'))
    ? business.googlePlaceUrl
    : (business.latitude && business.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${business.latitude},${business.longitude}`
      : null);

  const storePageUrl = business.username ? `/@${business.username}` : `/business/${business.id}`;

  const tabs: { id: StoreDetailTab; label: string; count?: number; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'services', label: 'منتجات أو خدمات', icon: Package },
    { id: 'offers', label: 'العروض والخصومات', count: activeOffers.length, icon: Percent },
    { id: 'jobs', label: 'الوظائف', count: activeJobs.length, icon: Briefcase },
    { id: 'gallery', label: 'معرض الصور', count: photos.length, icon: ImageIcon },
    { id: 'reviews', label: 'التقييمات', count: business.reviewCount || reviews.length, icon: Star },
  ];

  return (
    <div className="h-full bg-white overflow-y-auto text-right select-text overscroll-contain" dir="rtl">
      {/* Top Header with cover banner, Favorite & Close buttons */}
      <div className="relative border-b border-stone-100 bg-white">
        <div className="h-32 sm:h-36 w-full relative overflow-hidden bg-gradient-to-r from-stone-800 to-stone-900 shrink-0">
          {business.coverImage || business.imageUrl || business.image ? (
            <img
              src={business.coverImage || business.imageUrl || business.image}
              alt={business.name}
              className="w-full h-full object-cover opacity-85"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-tr from-[#1a4d2e] via-[#245e39] to-emerald-700 opacity-90" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

          {/* Favorite Button on Banner */}
          <button
            type="button"
            onClick={() => toggleFavorite(business.id)}
            className={cn(
              "absolute top-3 right-3 p-1.5 rounded-full backdrop-blur-md transition-all cursor-pointer z-10 flex items-center justify-center shadow-md",
              isFav
                ? "bg-rose-500 text-white"
                : "bg-black/40 hover:bg-black/60 text-white"
            )}
            title={isFav ? "إزالة من المفضلة" : "حفظ في المفضلة"}
          >
            <Heart className={cn("w-4 h-4", isFav && "fill-white")} />
          </button>

          {/* Share Button on Banner */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onShare) onShare(business);
            }}
            className="absolute top-3 left-12 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all cursor-pointer z-10 flex items-center justify-center shadow-md"
            title="مشاركة رابط المحل"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Close Button X */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 left-3 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all cursor-pointer z-10"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Business Header Info: Logo overlapping cover edge, text cleanly placed below in white section */}
        <div className="px-4 pb-3 bg-white">
          <div className="flex items-end justify-between gap-3 -mt-9 sm:-mt-10 mb-2 relative z-10">
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white p-1 border-2 border-white shadow-md overflow-hidden shrink-0 flex items-center justify-center">
              {business.logoUrl || business.imageUrl || business.image ? (
                <img
                  src={business.logoUrl || business.imageUrl || business.image}
                  alt={business.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-full bg-stone-50 rounded-xl flex items-center justify-center text-stone-400">
                  <Store className="w-8 h-8" />
                </div>
              )}
            </div>

            <div className="pb-1">
              <span className={cn("inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] border shadow-2xs", liveStatus.badgeBg)}>
                <span className={cn("w-2 h-2 rounded-full", liveStatus.dotColor, liveStatus.isOpen && "animate-pulse")} />
                <span>{liveStatus.statusText}</span>
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-black text-base sm:text-lg text-stone-900 leading-tight">
                {business.name}
              </h3>
              {vip.isVip && (
                <VerifiedBadge size="sm" businessName={business.name} />
              )}
            </div>
            <p className="text-xs font-bold text-stone-500">
              {business.category || business.subCategory}
            </p>
          </div>
        </div>

        {/* Rating, Status & Address Line */}
        <div className="px-4 pb-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-black text-stone-900">{(business.rating || 5).toFixed(1)}</span>
              <span className="text-stone-400 font-medium">({business.reviewCount || 0} تقييم)</span>
            </div>

            {liveStatus.hoursDisplay && (
              <span className="text-[11px] text-stone-500 font-medium hidden sm:inline">
                {liveStatus.hoursDisplay}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 text-xs text-stone-600">
            <div className="flex items-center gap-1.5 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="truncate">{business.address || business.district || 'إربد'}</span>
            </div>
            {userDistanceKm !== undefined && userDistanceKm !== null && (
              <span className="shrink-0 text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                تبعد {formatDistance(userDistanceKm)}
              </span>
            )}
          </div>

          {/* Action Buttons Row */}
          <div className="pt-2 flex items-center gap-2 flex-wrap">
            <Link
              to={storePageUrl}
              className="flex-1 min-w-[120px] h-9 sm:h-10 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs px-2.5"
            >
              <Store className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">زيارة صفحة المحل</span>
            </Link>

            {phone && (
              <a
                href={`tel:${phone}`}
                className="h-9 sm:h-10 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-colors shrink-0"
                title="اتصال"
              >
                <Phone className="h-3.5 w-3.5 text-stone-700" />
                <span className="hidden sm:inline">اتصال</span>
              </a>
            )}

            {whatsAppUrl && (
              <a
                href={whatsAppUrl}
                target="_blank"
                rel="noreferrer"
                className="h-9 sm:h-10 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-colors shrink-0"
                title="واتساب"
              >
                <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">واتساب</span>
              </a>
            )}

            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="h-9 sm:h-10 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-colors shrink-0"
                title="رابط موقع المحل على جوجل ماب"
              >
                <MapPin className="h-3.5 w-3.5 text-blue-600" />
                <span className="hidden sm:inline">جوجل ماب</span>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation Bar (Sticky at top when scrolling) */}
      <div className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur-md shadow-2xs">
        <div className="flex items-center gap-1 px-2 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeDetailTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveDetailTab(tab.id)}
                className={cn(
                  "py-2.5 px-3 border-b-2 font-bold text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer shrink-0",
                  isActive
                    ? "border-[#1a4d2e] text-[#1a4d2e] font-black"
                    : "border-transparent text-stone-500 hover:text-stone-800"
                )}
              >
                <Icon className={cn("w-3.5 h-3.5", isActive ? "text-[#1a4d2e]" : "text-stone-400")} />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span
                    className={cn(
                      "px-1.5 py-0.2 rounded-full text-[10px] font-black",
                      tab.id === 'offers'
                        ? "bg-red-500 text-white"
                        : tab.id === 'jobs'
                        ? "bg-[#1a4d2e] text-white"
                        : "bg-stone-200 text-stone-700"
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Area (Flows naturally in unified scroll) */}
      <div className="p-4 space-y-3 pb-8">
        {/* Tab 1: منتجات أو خدمات */}
        {activeDetailTab === 'services' && (
          <div className="space-y-3">
            {business.menuItems && business.menuItems.length > 0 ? (
              <div className="space-y-2">
                {business.menuItems.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    onClick={() => onSelectProduct?.(item)}
                    className="p-3 rounded-xl border border-stone-200/80 bg-stone-50/50 flex items-start gap-3 hover:bg-stone-100 transition-colors cursor-pointer group"
                  >
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-14 h-14 rounded-lg object-cover shrink-0 border border-stone-200 group-hover:scale-105 transition-transform"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="font-bold text-xs text-stone-900 truncate group-hover:text-[#1a4d2e] transition-colors">{item.name}</h5>
                        {item.price && (
                          <span className="text-xs font-black text-[#1a4d2e] shrink-0">
                            {item.price} د.أ
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-stone-500 line-clamp-2 mt-0.5">
                          {item.description}
                        </p>
                      )}
                      <div className="mt-1.5 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 group-hover:underline">
                          <span>عرض التفاصيل</span>
                          <ChevronLeft className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (business as any).services && Array.isArray((business as any).services) && (business as any).services.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {((business as any).services as string[]).map((srv, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{srv}</span>
                  </span>
                ))}
              </div>
            ) : (
              <div className="py-8 px-4 text-center space-y-3 bg-stone-50/60 rounded-2xl border border-dashed border-stone-200">
                <Package className="h-8 w-8 mx-auto text-stone-300" />
                <p className="text-xs text-stone-500 font-bold">
                  لا توجد منتجات أو خدمات مدرجة حالياً في القائمة
                </p>
                <Link
                  to={storePageUrl}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#1a4d2e] hover:underline"
                >
                  <span>تصفح صفحة المحل لمزيد من التفاصيل</span>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: العروض والخصومات */}
        {activeDetailTab === 'offers' && (
          <div className="space-y-3">
            {activeOffers.length > 0 ? (
              activeOffers.map((offer) => (
                <div
                  key={offer.id}
                  onClick={() => onSelectOffer?.(offer)}
                  className="p-3.5 rounded-2xl border border-red-200 bg-red-50/30 space-y-2 hover:bg-red-50/70 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-black text-xs text-stone-900 group-hover:text-red-700 transition-colors">{offer.title}</h5>
                      {offer.description && (
                        <p className="text-[11px] text-stone-600 line-clamp-2 mt-1">
                          {offer.description}
                        </p>
                      )}
                    </div>
                    {offer.discountPercentage ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-black text-xs shrink-0 shadow-xs">
                        {offer.discountPercentage}% خصم
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-black text-xs shrink-0">
                        عرض خاص
                      </span>
                    )}
                  </div>
                  <div className="pt-2 border-t border-red-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectOffer?.(offer);
                      }}
                      className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center gap-1 cursor-pointer"
                    >
                      <span>تفاصيل العرض</span>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 px-4 text-center space-y-2 bg-stone-50/60 rounded-2xl border border-dashed border-stone-200">
                <Percent className="h-8 w-8 mx-auto text-stone-300" />
                <p className="text-xs text-stone-500 font-bold">
                  لا توجد عروض أو خصومات فعالة حالياً لهذه المنشأة
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: الوظائف */}
        {activeDetailTab === 'jobs' && (
          <div className="space-y-3">
            {activeJobs.length > 0 ? (
              activeJobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => onSelectJob?.(job)}
                  className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/30 space-y-2 hover:bg-emerald-50/70 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-black text-xs text-stone-900 group-hover:text-[#1a4d2e] transition-colors">{job.title}</h5>
                      {job.type && (
                        <span className="inline-block mt-1 text-[10px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                          {job.type}
                        </span>
                      )}
                      {job.description && (
                        <p className="text-[11px] text-stone-600 line-clamp-2 mt-1">
                          {job.description}
                        </p>
                      )}
                    </div>
                    {job.salary && (
                      <span className="text-xs font-black text-[#1a4d2e] shrink-0 bg-white px-2 py-1 rounded-lg border border-emerald-200">
                        {job.salary}
                      </span>
                    )}
                  </div>
                  <div className="pt-2 border-t border-emerald-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectJob?.(job);
                      }}
                      className="text-xs font-bold text-[#1a4d2e] hover:text-[#133b22] flex items-center gap-1 cursor-pointer"
                    >
                      <span>عرض تفاصيل الوظيفة</span>
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 px-4 text-center space-y-2 bg-stone-50/60 rounded-2xl border border-dashed border-stone-200">
                <Briefcase className="h-8 w-8 mx-auto text-stone-300" />
                <p className="text-xs text-stone-500 font-bold">
                  لا توجد شواغر وظيفية معلنة حالياً لهذه المنشأة
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: معرض الصور */}
        {activeDetailTab === 'gallery' && (
          <div>
            {photos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {photos.map((url, idx) => (
                  <div
                    key={idx}
                    onClick={() => onPreviewPhoto(url)}
                    className="aspect-square rounded-xl overflow-hidden bg-stone-100 border border-stone-200 cursor-pointer group relative"
                  >
                    <img
                      src={url}
                      alt={`صورة ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 px-4 text-center space-y-2 bg-stone-50/60 rounded-2xl border border-dashed border-stone-200">
                <ImageIcon className="h-8 w-8 mx-auto text-stone-300" />
                <p className="text-xs text-stone-500 font-bold">
                  لم يقم المحل بإضافة صور للمعرض بعد
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: التقييمات */}
        {activeDetailTab === 'reviews' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/80 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-black text-stone-900">
                    {(business.rating || 5).toFixed(1)}
                  </span>
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "w-4 h-4",
                          i < Math.round(business.rating || 5)
                            ? "fill-amber-400 text-amber-400"
                            : "text-stone-300"
                        )}
                      />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-stone-500 font-bold mt-0.5">
                  بناءً على {business.reviewCount || reviews.length || 0} تقييم
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenAddReview}
                className="h-8 px-3 rounded-lg bg-white border border-amber-300 text-stone-800 text-xs font-bold flex items-center gap-1 hover:bg-amber-50 transition-colors shadow-2xs shrink-0 cursor-pointer"
              >
                <span>أضف تقييمك</span>
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
            </div>

            {loadingReviews ? (
              <div className="py-6 text-center text-xs text-stone-400">جاري تحميل التقييمات...</div>
            ) : reviews.length > 0 ? (
              <div className="space-y-2 mt-2">
                {reviews.map((rev) => (
                  <div key={rev.id} className="p-3 rounded-xl border border-stone-200/80 bg-white space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-stone-900">{rev.userName || 'مستخدم'}</span>
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "w-3 h-3",
                              i < Math.round(rev.rating || 5)
                                ? "fill-amber-400 text-amber-400"
                                : "text-stone-300"
                            )}
                          />
                        ))}
                      </div>
                    </div>
                    {rev.comment && (
                      <p className="text-xs text-stone-600 line-clamp-3">{rev.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-stone-400">
                لا توجد تقييمات مكتوبة بعد، شارك تجربتك عبر صفحة المحل الرسمية
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function InteractiveMapPage() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState<Business[]>(() => getCachedBusinesses() || []);
  const [offers, setOffers] = useState<any[]>(() => getCachedOffers() || []);
  const [jobs, setJobs] = useState<any[]>(() => getCachedJobs() || []);
  const [activeTab, setActiveTab] = useState<MapTab>('stores');
  const [loading, setLoading] = useState<boolean>(() => !getCachedBusinesses() || getCachedBusinesses()!.length === 0);
  
  // Auth & Favorites
  const { currentUser, userFavorites, toggleFavorite } = useAuth();

  // Detail Modals state (Product, Offer, Job, Add Review)
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<{ product: MenuItem; business: Business } | null>(null);
  const [selectedDetailOffer, setSelectedDetailOffer] = useState<{ offer: any; business: Business } | null>(null);
  const [selectedDetailJob, setSelectedDetailJob] = useState<{ job: any; business: Business } | null>(null);
  const [isAddReviewOpen, setIsAddReviewOpen] = useState<boolean>(false);

  const handleOpenAddReview = () => {
    if (!currentUser) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }
    setIsAddReviewOpen(true);
  };

  const handleReviewAdded = (newReview: any) => {
    setBusinessReviews(prev => [newReview, ...prev]);
    setSelectedBusiness(prev => {
      if (!prev) return null;
      const count = prev.reviewCount || businessReviews.length || 0;
      const currentRating = prev.rating || 5;
      const newCount = count + 1;
      const newRating = Number(((currentRating * count + newReview.rating) / newCount).toFixed(1));
      return {
        ...prev,
        reviewCount: newCount,
        rating: newRating
      };
    });
  };

  // URL Deep link search params
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters state
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>('all');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [openNowFilter, setOpenNowFilter] = useState<boolean>(false);
  const [favoritesOnlyFilter, setFavoritesOnlyFilter] = useState<boolean>(false);
  const [isNearestFilterActive, setIsNearestFilterActive] = useState<boolean>(false);
  const [deliveryOnlyFilter, setDeliveryOnlyFilter] = useState<boolean>(false);
  const [sortByRating, setSortByRating] = useState<boolean>(false);
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState<string>('');
  const [appliedSearch, setAppliedSearch] = useState<string>('');
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState<boolean>(false);
  const [hoveredStoreId, setHoveredStoreId] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [isMobileFullDetailOpen, setIsMobileFullDetailOpen] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [isSidePanelCollapsed, setIsSidePanelCollapsed] = useState<boolean>(false);
  const [storeDetailTab, setStoreDetailTab] = useState<StoreDetailTab>('services');
  const [businessReviews, setBusinessReviews] = useState<{ id: string; userName?: string; rating: number; comment?: string; createdAt?: any }[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'split'>('map');
  const [isFiltersSheetOpen, setIsFiltersSheetOpen] = useState<boolean>(false);
  const [isDesktopFiltersOpen, setIsDesktopFiltersOpen] = useState<boolean>(false);
  const [isMobileListOpen, setIsMobileListOpen] = useState<boolean>(false);

  // References
  const desktopSearchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchContainerRef = useRef<HTMLDivElement>(null);
  const updateMarkersRef = useRef<(() => void) | null>(null);
  const markersByBizId = useRef<Map<string, L.Marker>>(new Map());

  // Leaflet map references & state
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const isProgrammaticMoveRef = useRef<boolean>(false);

  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets');
  const [showSearchAreaBtn, setShowSearchAreaBtn] = useState<boolean>(false);
  const [searchAreaBounds, setSearchAreaBounds] = useState<L.LatLngBounds | null>(null);

  // 1. Fetch businesses, offers, and jobs if cache is empty
  useEffect(() => {
    let isMounted = true;
    const fetchStoresAndData = async () => {
      // Check cache first for instant render and zero DB reads
      const cachedB = getCachedBusinesses();
      const cachedO = getCachedOffers();
      const cachedJ = getCachedJobs();

      if (cachedB && cachedB.length > 0) {
        if (isMounted) {
          setBusinesses(cachedB);
          if (cachedO) setOffers(cachedO);
          if (cachedJ) setJobs(cachedJ);
          setLoading(false);
        }
        if (isBusinessesCacheFresh()) {
          return;
        }
      }

      try {
        if (!db) return;
        const snap = await getDocs(query(collection(db, 'businesses'), limit(80)));
        const list: Business[] = [];
        snap.forEach((doc) => {
          const data = doc.data() as any;
          if (!data.isHidden) {
            list.push({ id: doc.id, ...data });
          }
        });
        if (isMounted) {
          setBusinesses(list);
          setCachedBusinesses(list);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Failed to load businesses:', err);
        if (isMounted) setLoading(false);
      }

      // Fetch offers if not fresh
      if (!isOffersCacheFresh()) {
        try {
          const offSnap = await getDocs(query(collection(db, 'offers'), limit(40)));
          const offList: any[] = [];
          offSnap.forEach((d) => offList.push({ id: d.id, ...d.data() }));
          if (isMounted) {
            setOffers(offList);
            setCachedOffers(offList);
          }
        } catch (e) {
          console.warn('Error fetching offers:', e);
        }
      }

      // Fetch jobs
      try {
        const jobSnap = await getDocs(query(collection(db, 'jobs'), limit(40)));
        const jobList: any[] = [];
        jobSnap.forEach((d) => jobList.push({ id: d.id, ...d.data() }));
        if (isMounted) {
          setJobs(jobList);
          setCachedJobs(jobList);
        }
      } catch (e) {
        console.warn('Error fetching jobs:', e);
      }
    };

    fetchStoresAndData();

    const handleJobDeleted = (e: any) => {
      const deletedId = e.detail?.jobId;
      if (deletedId) {
        setJobs(prev => prev.filter(j => j.id !== deletedId));
      }
    };
    const handleOfferDeleted = (e: any) => {
      const deletedId = e.detail?.offerId;
      if (deletedId) {
        setOffers(prev => prev.filter(o => o.id !== deletedId));
        setSelectedDetailOffer(curr => curr?.offer?.id === deletedId ? null : curr);
      }
    };

    window.addEventListener('shoof_job_deleted', handleJobDeleted);
    window.addEventListener('shoof_offer_deleted', handleOfferDeleted);

    return () => {
      isMounted = false;
      window.removeEventListener('shoof_job_deleted', handleJobDeleted);
      window.removeEventListener('shoof_offer_deleted', handleOfferDeleted);
    };
  }, []);

  // Check if an offer is active and not expired
  const isOfferActive = (offer: any): boolean => {
    if (!offer) return false;
    if (offer.durationMode === 'recurring_weekly') return true;

    const now = Date.now();
    if (offer.expiresAt) {
      const expNum = Number(offer.expiresAt);
      if (!isNaN(expNum) && expNum > 0 && expNum <= now) return false;
    }

    if (offer.endDate) {
      const endParsed = new Date(offer.endDate).getTime();
      if (!isNaN(endParsed)) {
        const endTimestamp = String(offer.endDate).trim().length <= 10 
          ? endParsed + 24 * 3600 * 1000 - 1 
          : endParsed;
        if (endTimestamp <= now) return false;
      }
    }

    if (offer.createdAt && typeof offer.createdAt === 'number') {
      if (offer.durationMode === 'today' && now > offer.createdAt + 24 * 3600 * 1000) return false;
      if (offer.durationMode === '3days' && now > offer.createdAt + 3 * 24 * 3600 * 1000) return false;
      if (offer.durationMode === 'weekend' && now > offer.createdAt + 4 * 24 * 3600 * 1000) return false;
      if (offer.durationMode === 'week' && now > offer.createdAt + 7 * 24 * 3600 * 1000) return false;
      if (offer.durationMode === 'hours' && offer.durationHours && Number(offer.durationHours) > 0) {
        if (now > offer.createdAt + Number(offer.durationHours) * 3600 * 1000) return false;
      }
      if (offer.durationMode === 'days' && offer.durationDays && Number(offer.durationDays) > 0) {
        if (now > offer.createdAt + Number(offer.durationDays) * 24 * 3600 * 1000) return false;
      }
    }

    return true;
  };

  // Check if a job is active
  const isJobActive = (job: any): boolean => {
    if (!job) return false;
    if (job.status === 'closed' || job.status === 'rejected') return false;
    return true;
  };

  const businessOffersMap = useMemo(() => {
    const map = new Map<string, any[]>();
    offers.filter(isOfferActive).forEach((o) => {
      if (o.businessId) {
        const arr = map.get(o.businessId) || [];
        arr.push(o);
        map.set(o.businessId, arr);
      }
      if (o.businessName) {
        const key = String(o.businessName).trim().toLowerCase();
        const arr = map.get(key) || [];
        arr.push(o);
        map.set(key, arr);
      }
    });
    return map;
  }, [offers]);

  const businessJobsMap = useMemo(() => {
    const map = new Map<string, any[]>();
    jobs.filter(isJobActive).forEach((j) => {
      if (j.businessId) {
        const arr = map.get(j.businessId) || [];
        arr.push(j);
        map.set(j.businessId, arr);
      }
      const compName = j.company || j.companyName;
      if (compName) {
        const key = String(compName).trim().toLowerCase();
        const arr = map.get(key) || [];
        arr.push(j);
        map.set(key, arr);
      }
    });
    return map;
  }, [jobs]);

  const getBusinessActiveOffers = (b: Business) => {
    const byId = b.id ? businessOffersMap.get(b.id) || [] : [];
    const byName = b.name ? businessOffersMap.get(b.name.trim().toLowerCase()) || [] : [];
    const set = new Map();
    [...byId, ...byName].forEach((o) => { if (o.id) set.set(o.id, o); });
    return Array.from(set.values());
  };

  const getBusinessActiveJobs = (b: Business) => {
    const byId = b.id ? businessJobsMap.get(b.id) || [] : [];
    const byName = b.name ? businessJobsMap.get(b.name.trim().toLowerCase()) || [] : [];
    const set = new Map();
    [...byId, ...byName].forEach((j) => { if (j.id) set.set(j.id, j); });
    return Array.from(set.values());
  };

  // Photos collection for selected business
  const storePhotos = useMemo(() => {
    if (!selectedBusiness) return [];
    const list: string[] = [];
    if (selectedBusiness.coverImage && typeof selectedBusiness.coverImage === 'string') {
      list.push(selectedBusiness.coverImage);
    }
    if (selectedBusiness.imageUrl && typeof selectedBusiness.imageUrl === 'string' && !list.includes(selectedBusiness.imageUrl)) {
      list.push(selectedBusiness.imageUrl);
    }
    if (selectedBusiness.image && typeof selectedBusiness.image === 'string' && !list.includes(selectedBusiness.image)) {
      list.push(selectedBusiness.image);
    }
    const bizImages = (selectedBusiness as any).images;
    if (Array.isArray(bizImages)) {
      bizImages.forEach((img: any) => {
        if (typeof img === 'string' && img && !list.includes(img)) list.push(img);
      });
    }
    if (Array.isArray(selectedBusiness.gallery)) {
      selectedBusiness.gallery.forEach((item) => {
        const url = typeof item === 'string' ? item : item?.url;
        if (url && typeof url === 'string' && !list.includes(url)) list.push(url);
      });
    }
    return list;
  }, [selectedBusiness]);

  const selectedStoreOffers = useMemo(() => {
    if (!selectedBusiness) return [];
    return getBusinessActiveOffers(selectedBusiness);
  }, [selectedBusiness, businessOffersMap]);

  const selectedStoreJobs = useMemo(() => {
    if (!selectedBusiness) return [];
    return getBusinessActiveJobs(selectedBusiness);
  }, [selectedBusiness, businessJobsMap]);

  // Open Store Details Window/Sheet with the appropriate tab
  const handleOpenStoreDetails = (business: Business, expandMobile = false) => {
    setSelectedBusiness(business);
    if (expandMobile) {
      setIsMobileFullDetailOpen(true);
    }
    setIsSidePanelCollapsed(false);

    // Sync with URL deep link
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('store', business.id);
      return next;
    }, { replace: true });

    if (activeTab === 'offers') {
      setStoreDetailTab('offers');
    } else if (activeTab === 'jobs') {
      setStoreDetailTab('jobs');
    } else {
      setStoreDetailTab('services');
    }
    if (mapInstanceRef.current && business.latitude && business.longitude) {
      const lat = parseFloat(business.latitude);
      const lng = parseFloat(business.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        isProgrammaticMoveRef.current = true;
        mapInstanceRef.current.flyTo([lat, lng], 16, { animate: true, duration: 0.8 });
        setTimeout(() => {
          isProgrammaticMoveRef.current = false;
        }, 1200);
      }
    }
  };

  // Close Store Details Window/Sheet
  const handleCloseStoreDetails = () => {
    setSelectedBusiness(null);
    setIsMobileFullDetailOpen(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('store');
      next.delete('storeId');
      return next;
    }, { replace: true });
  };

  // Share store link
  const handleShareStore = async (biz: Business, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const shareUrl = `${window.location.origin}/map?store=${encodeURIComponent(biz.id)}`;
    if (typeof navigator !== 'undefined' && navigator.share && /mobile|android|iphone/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: biz.name,
          text: `استكشف ${biz.name} على الخريطة التفاعلية`,
          url: shareUrl
        });
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2500);
      }
    } catch (err) {
      console.warn('Clipboard write failed:', err);
    }
  };

  // Initial deep link synchronization from URL
  useEffect(() => {
    const storeIdParam = searchParams.get('store') || searchParams.get('storeId');
    if (storeIdParam && businesses.length > 0) {
      const found = businesses.find((b) => b.id === storeIdParam || b.username === storeIdParam);
      if (found) {
        handleOpenStoreDetails(found, false);
      }
    }
  }, [businesses, searchParams]);

  // Distance for selected business from user location
  const selectedBusinessDistanceKm = useMemo(() => {
    if (!selectedBusiness || !userLocation) return null;
    const lat = selectedBusiness.latitude ? parseFloat(selectedBusiness.latitude) : null;
    const lng = selectedBusiness.longitude ? parseFloat(selectedBusiness.longitude) : null;
    if (lat === null || isNaN(lat) || lng === null || isNaN(lng)) return null;
    return getDistanceInKm(userLocation[0], userLocation[1], lat, lng);
  }, [selectedBusiness, userLocation]);

  // Fetch reviews for selected business on-demand
  useEffect(() => {
    if (!selectedBusiness) {
      setBusinessReviews([]);
      return;
    }
    let isMounted = true;
    const fetchReviews = async () => {
      try {
        setLoadingReviews(true);
        const q = query(
          collection(db, 'reviews'),
          where('businessId', '==', selectedBusiness.id),
          limit(8)
        );
        const snap = await getDocs(q);
        if (isMounted) {
          const revs: any[] = [];
          snap.forEach((doc) => {
            revs.push({ id: doc.id, ...doc.data() });
          });
          setBusinessReviews(revs);
        }
      } catch (e) {
        console.warn('Error fetching reviews:', e);
      } finally {
        if (isMounted) setLoadingReviews(false);
      }
    };
    fetchReviews();
    return () => {
      isMounted = false;
    };
  }, [selectedBusiness?.id]);

  // Available subcategories based on chosen main category
  const availableSubcategories = useMemo(() => {
    if (selectedMainCategory === 'all') return [];
    return BUSINESS_CATEGORIES[selectedMainCategory as MainCategory] || [];
  }, [selectedMainCategory]);

  const handleMainCategoryChange = (cat: string) => {
    setSelectedMainCategory(cat);
    setSelectedSubCategory('all');
  };

  const handleSubCategoryChange = (sub: string) => {
    setSelectedSubCategory(sub);
  };

  // Reset all applied filters
  const handleResetFilters = () => {
    setSelectedMainCategory('all');
    setSelectedSubCategory('all');
    setOpenNowFilter(false);
    setFavoritesOnlyFilter(false);
    setIsNearestFilterActive(false);
    setDeliveryOnlyFilter(false);
    setSortByRating(false);
    setMaxDistanceKm(null);
    setSearchAreaBounds(null);
    setShowSearchAreaBtn(false);
    setSearchInput('');
    setAppliedSearch('');
    setSelectedBusiness(null);
  };

  // Reset viewport to fit all stores
  const handleFitAllStores = () => {
    if (!mapInstanceRef.current) return;
    if (mapPins.length > 0) {
      const bounds = L.latLngBounds(mapPins.map((p) => [p.lat, p.lng]));
      isProgrammaticMoveRef.current = true;
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
      setTimeout(() => {
        isProgrammaticMoveRef.current = false;
      }, 1200);
    } else {
      isProgrammaticMoveRef.current = true;
      mapInstanceRef.current.setView([32.5514, 35.8514], 14, { animate: true });
      setTimeout(() => {
        isProgrammaticMoveRef.current = false;
      }, 1200);
    }
  };

  // Autocomplete suggestions based on user search input
  const autocompleteSuggestions = useMemo(() => {
    const query = searchInput.trim().toLowerCase();
    if (!query || query.length < 1) return { stores: [], categories: [], districts: [] };

    // Stores matching
    const matchingStores = businesses
      .filter((b) => (b.name || '').toLowerCase().includes(query) || (b.category || '').toLowerCase().includes(query))
      .slice(0, 5);

    // Categories matching
    const allCategories = Object.keys(BUSINESS_CATEGORIES);
    const matchingCategories = allCategories
      .filter((cat) => cat.toLowerCase().includes(query))
      .slice(0, 3);

    // Subcategories matching
    const matchingSubcategories: string[] = [];
    Object.values(BUSINESS_CATEGORIES).flat().forEach((sub) => {
      if (sub.toLowerCase().includes(query) && !matchingSubcategories.includes(sub)) {
        matchingSubcategories.push(sub);
      }
    });

    // Districts matching
    const districtsSet = new Set<string>();
    businesses.forEach((b) => {
      if (b.district && b.district.toLowerCase().includes(query)) {
        districtsSet.add(b.district);
      }
    });

    return {
      stores: matchingStores,
      categories: [...matchingCategories, ...matchingSubcategories.slice(0, 2)],
      districts: Array.from(districtsSet).slice(0, 3)
    };
  }, [searchInput, businesses]);

  // Click outside listener for search autocomplete
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        desktopSearchContainerRef.current &&
        !desktopSearchContainerRef.current.contains(e.target as Node) &&
        mobileSearchContainerRef.current &&
        !mobileSearchContainerRef.current.contains(e.target as Node)
      ) {
        setIsAutocompleteOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Triggered ONLY when clicking "تطبيق الفلاتر"
  const handleApplyFilters = () => {
    setIsFiltersSheetOpen(false);
    setIsDesktopFiltersOpen(false);

    if (!mapInstanceRef.current) return;

    if (mapPins.length === 1) {
      const single = mapPins[0];
      handleOpenStoreDetails(single.business, true);
    } else if (mapPins.length > 1) {
      const bounds = L.latLngBounds(mapPins.map((p) => [p.lat, p.lng]));
      isProgrammaticMoveRef.current = true;
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
      setTimeout(() => {
        isProgrammaticMoveRef.current = false;
      }, 1200);
      setSelectedBusiness(null);
    } else {
      setSelectedBusiness(null);
    }
  };

  // 3. Filtered businesses
  const filteredBusinesses = useMemo(() => {
    return businesses.filter((b) => {
      // Search query filter (only applied upon submit/enter)
      if (appliedSearch.trim()) {
        const query = appliedSearch.toLowerCase().trim();
        const matchesName = (b.name || '').toLowerCase().includes(query);
        const matchesDesc = (b.description || '').toLowerCase().includes(query);
        const matchesDistrict = (b.district || '').toLowerCase().includes(query);
        const matchesAddress = (b.address || '').toLowerCase().includes(query);
        const matchesCat = (b.category || '').toLowerCase().includes(query);
        const matchesSubCat = (b.subCategory || '').toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesDistrict && !matchesAddress && !matchesCat && !matchesSubCat) {
          return false;
        }
      }

      // Main category filter
      if (selectedMainCategory !== 'all') {
        const subs = BUSINESS_CATEGORIES[selectedMainCategory as MainCategory] || [];
        const bizCat = b.category || '';
        const bizSub = b.subCategory || '';
        const matchesMain = bizCat === selectedMainCategory || subs.includes(bizCat) || subs.includes(bizSub);
        if (!matchesMain) {
          return false;
        }
      }

      // Subcategory filter
      if (selectedSubCategory !== 'all') {
        const bizCat = b.category || '';
        const bizSub = b.subCategory || '';
        if (bizCat !== selectedSubCategory && bizSub !== selectedSubCategory) {
          return false;
        }
      }

      // Open now filter (مفتوح الآن)
      if (openNowFilter) {
        const live = getLiveWorkingStatus(b.workingHours);
        if (!live.isOpen) {
          return false;
        }
      }

      // Delivery available filter (خدمة التوصيل متاحة)
      if (deliveryOnlyFilter) {
        const hasDelivery = Boolean(
          b.deliveryAvailable || 
          (b.description && (b.description.includes('توصيل') || b.description.toLowerCase().includes('delivery')))
        );
        if (!hasDelivery) {
          return false;
        }
      }

      // Favorites only filter
      if (favoritesOnlyFilter) {
        if (!userFavorites.includes(b.id)) {
          return false;
        }
      }

      return true;
    });
  }, [businesses, appliedSearch, selectedMainCategory, selectedSubCategory, openNowFilter, deliveryOnlyFilter, favoritesOnlyFilter, userFavorites]);

  // Businesses that have pinned their location on the map (valid coordinates set by merchant)
  const mapPins = useMemo(() => {
    let list = filteredBusinesses
      .map((b) => {
        const lat = b.latitude ? parseFloat(b.latitude) : null;
        const lng = b.longitude ? parseFloat(b.longitude) : null;

        // Do not place pins or default coordinates if the store has not pinned its location
        if (lat === null || isNaN(lat) || lng === null || isNaN(lng)) {
          return null;
        }

        // Re-search in this area bounds filter
        if (searchAreaBounds && !searchAreaBounds.contains([lat, lng])) {
          return null;
        }

        const activeOffers = getBusinessActiveOffers(b);
        const activeJobs = getBusinessActiveJobs(b);

        // Filter based on active tab:
        // Only businesses with active offers show pins in offers tab
        if (activeTab === 'offers' && activeOffers.length === 0) {
          return null;
        }
        // Only businesses with active jobs show pins in jobs tab
        if (activeTab === 'jobs' && activeJobs.length === 0) {
          return null;
        }

        const distanceKm = userLocation ? getDistanceInKm(userLocation[0], userLocation[1], lat, lng) : null;

        // Geographic distance radius filter
        if (maxDistanceKm !== null && distanceKm !== null && distanceKm > maxDistanceKm) {
          return null;
        }

        const vip = getBusinessVipStatus(b);
        return {
          business: b,
          lat,
          lng,
          isVip: vip.isVip,
          activeOffersCount: activeOffers.length,
          activeJobsCount: activeJobs.length,
          distanceKm
        };
      })
      .filter((item): item is { 
        business: Business; 
        lat: number; 
        lng: number; 
        isVip: boolean;
        activeOffersCount: number;
        activeJobsCount: number;
        distanceKm: number | null;
      } => item !== null);

    // If sort by rating is active, sort highest rated first
    if (sortByRating) {
      list.sort((a, b) => (b.business.rating || 0) - (a.business.rating || 0));
    }

    // If nearest filter is active and userLocation is available, sort closest first
    if (isNearestFilterActive && userLocation) {
      list.sort((a, b) => {
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    }

    return list;
  }, [filteredBusinesses, activeTab, businessOffersMap, businessJobsMap, searchAreaBounds, userLocation, maxDistanceKm, isNearestFilterActive, sortByRating]);

  // Switch map appearance: Streets vs Satellite
  const toggleMapStyle = () => {
    if (!mapInstanceRef.current) return;
    const nextStyle = mapStyle === 'streets' ? 'satellite' : 'streets';
    setMapStyle(nextStyle);
    if (tileLayerRef.current) {
      try {
        mapInstanceRef.current.removeLayer(tileLayerRef.current);
      } catch (e) {
        console.warn('Error removing tile layer:', e);
      }
    }
    const newLayer = nextStyle === 'satellite'
      ? L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: '',
          maxZoom: 19
        })
      : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '',
          maxZoom: 19
        });
    newLayer.addTo(mapInstanceRef.current);
    tileLayerRef.current = newLayer;
  };

  // Re-search in this area
  const handleSearchThisArea = () => {
    if (!mapInstanceRef.current) return;
    const bounds = mapInstanceRef.current.getBounds();
    setSearchAreaBounds(bounds);
    setShowSearchAreaBtn(false);
    setSelectedBusiness(null);
  };

  // Toggle Nearest to you filter
  const handleToggleNearestFilter = () => {
    if (!isNearestFilterActive) {
      setIsNearestFilterActive(true);
      if (!userLocation) {
        handleLocateUser();
      }
    } else {
      setIsNearestFilterActive(false);
      setMaxDistanceKm(null);
    }
  };

  // 4. Initialize Map once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Clean up any stale map instance or lingering leaflet id on DOM element
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.remove();
      } catch (err) {
        console.warn('Error removing previous map instance:', err);
      }
      mapInstanceRef.current = null;
    }
    if ((mapContainerRef.current as any)._leaflet_id) {
      delete (mapContainerRef.current as any)._leaflet_id;
    }

    try {
      const map = L.map(mapContainerRef.current, {
        center: [32.5514, 35.8514],
        zoom: 14,
        zoomControl: false,
        attributionControl: false
      });

      // OpenStreetMap Tile Layer
      const tile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '',
        maxZoom: 19
      }).addTo(map);
      tileLayerRef.current = tile;

      // Listen for map movements to show "إعادة البحث في هذه المنطقة" and re-cluster pins
      map.on('dragend', () => {
        if (!isProgrammaticMoveRef.current) {
          setShowSearchAreaBtn(true);
        }
      });
      map.on('zoomend', () => {
        if (!isProgrammaticMoveRef.current) {
          setShowSearchAreaBtn(true);
        }
        if (updateMarkersRef.current) {
          updateMarkersRef.current();
        }
      });

      // Group layer for markers
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;
      mapInstanceRef.current = map;

      // Invalidate size immediately and on brief delays
      map.invalidateSize();
      const t1 = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
      const t2 = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 400);

      // ResizeObserver to automatically resize map when container size changes
      let resizeObserver: ResizeObserver | null = null;
      if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
        resizeObserver = new ResizeObserver(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        });
        resizeObserver.observe(mapContainerRef.current);
      }

      const handleResize = () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      };
      window.addEventListener('resize', handleResize);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        window.removeEventListener('resize', handleResize);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
        if (mapInstanceRef.current) {
          try {
            mapInstanceRef.current.remove();
          } catch (err) {
            console.warn('Error removing map on cleanup:', err);
          }
          mapInstanceRef.current = null;
        }
        if (mapContainerRef.current) {
          delete (mapContainerRef.current as any)._leaflet_id;
        }
      };
    } catch (e) {
      console.error('Error creating interactive map:', e);
    }
  }, []);

  // 5. Update Map Markers with Marker Clustering, Spiderfier, and Hover Sync
  const updateMapMarkers = () => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    markersLayer.clearLayers();
    markersByBizId.current.clear();

    const currentZoom = map.getZoom();

    // Group pins into clusters if zoom < 18 and screen distance < 45px
    type PinItem = typeof mapPins[0];
    interface ClusterGroup {
      center: [number, number];
      point: L.Point;
      items: PinItem[];
    }

    const clusters: ClusterGroup[] = [];
    const clusterRadius = 45;

    mapPins.forEach((pin) => {
      const pt = map.latLngToLayerPoint([pin.lat, pin.lng]);
      let added = false;

      if (currentZoom < 18) {
        for (const cl of clusters) {
          if (pt.distanceTo(cl.point) <= clusterRadius) {
            cl.items.push(pin);
            added = true;
            break;
          }
        }
      }

      if (!added) {
        clusters.push({
          center: [pin.lat, pin.lng],
          point: pt,
          items: [pin]
        });
      }
    });

    clusters.forEach((cl) => {
      if (cl.items.length === 1) {
        // Individual Pin
        const { business, lat, lng } = cl.items[0];
        const isHovered = hoveredStoreId === business.id;
        const isSelected = selectedBusiness?.id === business.id;

        let pinHtml = '';

        if (activeTab === 'offers') {
          // Red inverted drop pin with % icon
          pinHtml = `
            <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-red-600 to-rose-500 border-2 border-white shadow-lg cursor-pointer transform ${isHovered || isSelected ? 'scale-130 ring-4 ring-amber-400 z-50' : 'hover:scale-125 ring-2 ring-red-400/40'} transition-all duration-200">
              <span class="text-white text-xs font-black tracking-tighter">%</span>
              <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-600 rotate-45 border-r border-b border-white"></div>
            </div>
          `;
        } else if (activeTab === 'jobs') {
          // Green inverted drop pin with briefcase icon
          pinHtml = `
            <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-[#1a4d2e] via-emerald-600 to-emerald-500 border-2 border-white shadow-lg cursor-pointer transform ${isHovered || isSelected ? 'scale-130 ring-4 ring-amber-400 z-50' : 'hover:scale-125 ring-2 ring-emerald-400/40'} transition-all duration-200">
              <svg class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                <rect width="20" height="14" x="2" y="6" rx="2"/>
              </svg>
              <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[#1a4d2e] rotate-45 border-r border-b border-white"></div>
            </div>
          `;
        } else {
          // Pin Icon: Inverted drop with store logo or gold pin
          const hasLogo = Boolean(business.logoUrl && business.logoUrl.trim().length > 0);
          const safeLogo = hasLogo ? (business.logoUrl || '').replace(/"/g, '&quot;') : '';
          const safeName = (business.name || '').replace(/"/g, '&quot;');

          pinHtml = hasLogo ? `
            <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-amber-500 shadow-lg cursor-pointer transform ${isHovered || isSelected ? 'scale-130 ring-4 ring-emerald-500 z-50' : 'hover:scale-125 ring-2 ring-amber-400/40'} transition-all duration-200">
              <div class="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center">
                <img src="${safeLogo}" alt="${safeName}" class="w-full h-full object-cover" onerror="this.parentElement.parentElement.className='relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 border-2 border-white shadow-lg ring-2 ring-amber-400/40 cursor-pointer transform hover:scale-125 transition-transform duration-200'; this.parentElement.innerHTML='<span class=\\'text-white text-xs font-black\\'>★</span>';" />
              </div>
              <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-600 rotate-45 border-r border-b border-white"></div>
            </div>
          ` : `
            <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 border-2 border-white shadow-lg cursor-pointer transform ${isHovered || isSelected ? 'scale-130 ring-4 ring-emerald-500 z-50' : 'hover:scale-125 ring-2 ring-amber-400/40'} transition-all duration-200">
              <span class="text-white text-xs font-black">★</span>
              <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-600 rotate-45 border-r border-b border-white"></div>
            </div>
          `;
        }

        const pinIcon = L.divIcon({
          className: 'interactive-map-pin',
          html: pinHtml,
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32]
        });

        const marker = L.marker([lat, lng], { 
          icon: pinIcon, 
          zIndexOffset: isHovered || isSelected ? 1000 : 0 
        });

        // Click to select store (opens mini preview card on mobile)
        marker.on('click', () => {
          handleOpenStoreDetails(business, false);
        });

        // Hover sync between map pin and sidebar list
        marker.on('mouseover', () => {
          setHoveredStoreId(business.id);
        });
        marker.on('mouseout', () => {
          setHoveredStoreId(null);
        });

        markersByBizId.current.set(business.id, marker);
        markersLayer.addLayer(marker);
      } else {
        // Multi-Pin Cluster Marker
        const count = cl.items.length;
        const clusterGradient = activeTab === 'offers'
          ? 'from-red-600 via-rose-600 to-red-500 ring-red-400/50'
          : activeTab === 'jobs'
          ? 'from-[#1a4d2e] via-emerald-600 to-teal-500 ring-emerald-400/50'
          : 'from-[#1a4d2e] via-emerald-700 to-amber-600 ring-[#1a4d2e]/40';

        const clusterHtml = `
          <div class="relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-tr ${clusterGradient} text-white font-black text-xs border-2 border-white shadow-xl ring-4 cursor-pointer transform hover:scale-115 transition-transform duration-200">
            <span>+${count}</span>
            <div class="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border border-white animate-pulse"></div>
          </div>
        `;

        const clusterIcon = L.divIcon({
          className: 'interactive-map-cluster',
          html: clusterHtml,
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });

        const clusterMarker = L.marker(cl.center, { icon: clusterIcon, zIndexOffset: 500 });

        // Cluster click: Zoom in or Spiderfier fan-out
        clusterMarker.on('click', () => {
          const bounds = L.latLngBounds(cl.items.map((p) => [p.lat, p.lng]));
          const isIdentical = bounds.getSouthWest().distanceTo(bounds.getNorthEast()) < 15;

          if (currentZoom >= 17 || isIdentical) {
            // Spiderfier: fan pins out in a circular arrangement around the cluster center
            const spiderRadius = 0.00035; // ~35 meters offset
            isProgrammaticMoveRef.current = true;

            cl.items.forEach((item, idx) => {
              const angle = (2 * Math.PI * idx) / cl.items.length;
              const sLat = cl.center[0] + spiderRadius * Math.cos(angle);
              const sLng = cl.center[1] + spiderRadius * Math.sin(angle);

              const spiderPin = L.marker([sLat, sLng], {
                icon: L.divIcon({
                  className: 'interactive-map-pin animate-in zoom-in-75 duration-200',
                  html: `
                    <div class="relative flex items-center justify-center w-8 h-8 rounded-full bg-white border-2 border-amber-500 shadow-xl ring-2 ring-amber-400/40 cursor-pointer transform hover:scale-125 transition-transform">
                      <span class="text-stone-900 text-[10px] font-black">${idx + 1}</span>
                    </div>
                  `,
                  iconSize: [32, 32],
                  iconAnchor: [16, 16]
                }),
                zIndexOffset: 1200
              });

              spiderPin.on('click', () => {
                handleOpenStoreDetails(item.business, false);
              });
              markersLayer.addLayer(spiderPin);
            });

            if (typeof window !== 'undefined' && window.innerWidth < 1024) {
              handleOpenStoreDetails(cl.items[0].business, false);
            }
          } else {
            isProgrammaticMoveRef.current = true;
            map.fitBounds(bounds, { padding: [60, 60], maxZoom: 17, animate: true });
            setTimeout(() => {
              isProgrammaticMoveRef.current = false;
            }, 800);
          }
        });

        markersLayer.addLayer(clusterMarker);
      }
    });
  };

  // Keep updateMarkersRef synchronized with latest function
  useEffect(() => {
    updateMarkersRef.current = updateMapMarkers;
    updateMapMarkers();
  }, [mapPins, activeTab, hoveredStoreId, selectedBusiness?.id]);

  // 6. User Location GPS Trigger
  const handleLocateUser = () => {
    if (!navigator.geolocation) {
      alert('ميزة تحديد الموقع غير مدعومة في متصفحك');
      return;
    }
    setIsLocatingUser(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocatingUser(false);
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation([lat, lng]);

        if (mapInstanceRef.current) {
          if (userMarkerRef.current) {
            try {
              mapInstanceRef.current.removeLayer(userMarkerRef.current);
            } catch (err) {
              console.warn(err);
            }
          }
          const userIcon = L.divIcon({
            className: 'user-pulse-marker',
            html: `
              <div class="relative flex items-center justify-center w-6 h-6">
                <div class="absolute w-6 h-6 bg-blue-500/30 rounded-full animate-ping"></div>
                <div class="w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-md"></div>
              </div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });
          userMarkerRef.current = L.marker([lat, lng], { icon: userIcon }).addTo(mapInstanceRef.current);
          isProgrammaticMoveRef.current = true;
          mapInstanceRef.current.flyTo([lat, lng], 15, { animate: true });
          setTimeout(() => {
            isProgrammaticMoveRef.current = false;
          }, 1200);
        }
      },
      (err) => {
        setIsLocatingUser(false);
        console.warn('Geolocation error:', err);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Search Execution: Triggered ONLY on Enter or Search click, not on typing
  const handleExecuteSearch = (queryToSearch?: string) => {
    const term = (queryToSearch !== undefined ? queryToSearch : searchInput).trim();
    setAppliedSearch(term);

    if (!term) {
      if (mapInstanceRef.current && mapPins.length > 0) {
        const bounds = L.latLngBounds(mapPins.map((p) => [p.lat, p.lng]));
        isProgrammaticMoveRef.current = true;
        mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
        setTimeout(() => {
          isProgrammaticMoveRef.current = false;
        }, 1200);
      }
      return;
    }

    const termLower = term.toLowerCase();
    const matchingBusinesses = businesses.filter((b) => {
      if (selectedMainCategory !== 'all') {
        const subs = BUSINESS_CATEGORIES[selectedMainCategory as MainCategory] || [];
        const bizCat = b.category || '';
        const bizSub = b.subCategory || '';
        if (bizCat !== selectedMainCategory && !subs.includes(bizCat) && !subs.includes(bizSub)) {
          return false;
        }
      }
      if (selectedSubCategory !== 'all') {
        const bizCat = b.category || '';
        const bizSub = b.subCategory || '';
        if (bizCat !== selectedSubCategory && bizSub !== selectedSubCategory) {
          return false;
        }
      }

      const matchesName = (b.name || '').toLowerCase().includes(termLower);
      const matchesDesc = (b.description || '').toLowerCase().includes(termLower);
      const matchesDistrict = (b.district || '').toLowerCase().includes(termLower);
      const matchesAddress = (b.address || '').toLowerCase().includes(termLower);
      const matchesCat = (b.category || '').toLowerCase().includes(termLower);
      const matchesSubCat = (b.subCategory || '').toLowerCase().includes(termLower);
      return matchesName || matchesDesc || matchesDistrict || matchesAddress || matchesCat || matchesSubCat;
    });

    const matchingPinsList = matchingBusinesses.map((b) => {
      const lat = b.latitude ? parseFloat(b.latitude) : null;
      const lng = b.longitude ? parseFloat(b.longitude) : null;
      if (lat === null || isNaN(lat) || lng === null || isNaN(lng)) {
        return null;
      }
      return { business: b, lat, lng };
    }).filter((p): p is { business: Business; lat: number; lng: number } => p !== null);

    if (!mapInstanceRef.current) return;

    if (matchingPinsList.length === 1) {
      const single = matchingPinsList[0];
      handleOpenStoreDetails(single.business);
    } else if (matchingPinsList.length > 1) {
      const bounds = L.latLngBounds(matchingPinsList.map((p) => [p.lat, p.lng]));
      isProgrammaticMoveRef.current = true;
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
      setTimeout(() => {
        isProgrammaticMoveRef.current = false;
      }, 1200);
      setSelectedBusiness(null);
    }
  };

  // Clear search input and restore map view
  const handleClearSearch = () => {
    setSearchInput('');
    setAppliedSearch('');
    setSearchAreaBounds(null);
    setShowSearchAreaBtn(false);
    setSelectedBusiness(null);

    if (!mapInstanceRef.current) return;

    // Filter businesses without search query
    const remainingBusinesses = businesses.filter((b) => {
      if (selectedMainCategory !== 'all') {
        const subs = BUSINESS_CATEGORIES[selectedMainCategory as MainCategory] || [];
        const bizCat = b.category || '';
        const bizSub = b.subCategory || '';
        if (bizCat !== selectedMainCategory && !subs.includes(bizCat) && !subs.includes(bizSub)) {
          return false;
        }
      }
      if (selectedSubCategory !== 'all') {
        const bizCat = b.category || '';
        const bizSub = b.subCategory || '';
        if (bizCat !== selectedSubCategory && bizSub !== selectedSubCategory) {
          return false;
        }
      }
      return true;
    });

    const validPins = remainingBusinesses.map((b) => {
      const lat = b.latitude ? parseFloat(b.latitude) : null;
      const lng = b.longitude ? parseFloat(b.longitude) : null;
      if (lat === null || isNaN(lat) || lng === null || isNaN(lng)) {
        return null;
      }
      return { business: b, lat, lng };
    }).filter((p): p is { business: Business; lat: number; lng: number } => p !== null);

    if (validPins.length === 1) {
      handleOpenStoreDetails(validPins[0].business);
    } else if (validPins.length > 1) {
      const bounds = L.latLngBounds(validPins.map((p) => [p.lat, p.lng]));
      isProgrammaticMoveRef.current = true;
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
      setTimeout(() => {
        isProgrammaticMoveRef.current = false;
      }, 1200);
    }
  };

  // Fly map to store and open details when clicking a store card in sidebar
  const handleSelectStoreFromList = (biz: Business) => {
    handleOpenStoreDetails(biz);
  };

  return (
    <div className="relative w-full h-full flex-1 flex flex-col min-h-0 bg-stone-100 overflow-hidden" dir="rtl">
      <style>{`
        .leaflet-control-attribution,
        .leaflet-control-container .leaflet-control-attribution,
        .leaflet-bottom.leaflet-right .leaflet-control-attribution,
        .leaflet-container .leaflet-control-attribution {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
          height: 0 !important;
          width: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
          font-size: 0 !important;
          line-height: 0 !important;
        }
      `}</style>
      <SEO
        title="الخريطة التفاعلية لمدينة إربد | دليل إربد"
        description="استكشف محلات ومطاعم ومنشآت إربد المعتمدة على الخريطة التفاعلية المباشرة"
      />

      {/* Mobile Bottom Sheet for Filters */}
      {isFiltersSheetOpen && (
        <div className="fixed inset-0 z-50 sm:hidden flex flex-col justify-end">
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsFiltersSheetOpen(false)}
          />
          <div className="relative z-10 bg-white rounded-t-2xl shadow-2xl border-t border-stone-200 p-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
            <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
              <h3 className="font-black text-sm text-stone-900">خيارات الفلترة</h3>
              <button
                type="button"
                onClick={() => setIsFiltersSheetOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-full cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  القسم الرئيسي
                </label>
                <div className="relative">
                  <select
                    value={selectedMainCategory}
                    onChange={(e) => handleMainCategoryChange(e.target.value)}
                    className="w-full h-11 pl-8 pr-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 outline-none appearance-none cursor-pointer"
                  >
                    <option value="all">جميع الأقسام الرئيسية</option>
                    {Object.keys(BUSINESS_CATEGORIES).map((catName) => (
                      <option key={catName} value={catName}>
                        {catName}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                </div>
              </div>

              {selectedMainCategory !== 'all' && availableSubcategories.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    التصنيف الفرعي
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSubCategory}
                      onChange={(e) => handleSubCategoryChange(e.target.value)}
                      className="w-full h-11 pl-8 pr-3 bg-emerald-50/60 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-950 outline-none appearance-none cursor-pointer"
                    >
                      <option value="all">كافة التصنيفات الفرعية ({availableSubcategories.length})</option>
                      {availableSubcategories.map((subName) => (
                        <option key={subName} value={subName}>
                          {subName}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* فلتر مفتوح الآن */}
              <div className="pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setOpenNowFilter((prev) => !prev)}
                  className={cn(
                    "w-full h-11 px-3.5 rounded-xl border font-bold text-xs flex items-center justify-between transition-all cursor-pointer",
                    openNowFilter
                      ? "bg-emerald-50 border-emerald-400 text-emerald-900"
                      : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Clock className={cn("h-4 w-4", openNowFilter ? "text-emerald-600" : "text-stone-400")} />
                    <span>مفتوح الآن</span>
                  </div>
                  <div className={cn(
                    "w-8 h-4.5 rounded-full p-0.5 transition-colors flex items-center",
                    openNowFilter ? "bg-[#1a4d2e] justify-end" : "bg-stone-300 justify-start"
                  )}>
                    <span className="w-3.5 h-3.5 rounded-full bg-white shadow-xs" />
                  </div>
                </button>
              </div>

              {/* فلتر المفضلة فقط */}
              <div>
                <button
                  type="button"
                  onClick={() => setFavoritesOnlyFilter((prev) => !prev)}
                  className={cn(
                    "w-full h-11 px-3.5 rounded-xl border font-bold text-xs flex items-center justify-between transition-all cursor-pointer",
                    favoritesOnlyFilter
                      ? "bg-rose-50 border-rose-300 text-rose-900"
                      : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Heart className={cn("h-4 w-4", favoritesOnlyFilter ? "fill-rose-500 text-rose-500" : "text-stone-400")} />
                    <span>المفضلة فقط ({userFavorites.length})</span>
                  </div>
                  <div className={cn(
                    "w-8 h-4.5 rounded-full p-0.5 transition-colors flex items-center",
                    favoritesOnlyFilter ? "bg-rose-600 justify-end" : "bg-stone-300 justify-start"
                  )}>
                    <span className="w-3.5 h-3.5 rounded-full bg-white shadow-xs" />
                  </div>
                </button>
              </div>

              {/* فلتر خدمة التوصيل متاحة */}
              <div>
                <button
                  type="button"
                  onClick={() => setDeliveryOnlyFilter((prev) => !prev)}
                  className={cn(
                    "w-full h-11 px-3.5 rounded-xl border font-bold text-xs flex items-center justify-between transition-all cursor-pointer",
                    deliveryOnlyFilter
                      ? "bg-amber-50 border-amber-400 text-amber-950"
                      : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Truck className={cn("h-4 w-4", deliveryOnlyFilter ? "text-amber-700" : "text-stone-400")} />
                    <span>خدمة التوصيل متاحة</span>
                  </div>
                  <div className={cn(
                    "w-8 h-4.5 rounded-full p-0.5 transition-colors flex items-center",
                    deliveryOnlyFilter ? "bg-amber-600 justify-end" : "bg-stone-300 justify-start"
                  )}>
                    <span className="w-3.5 h-3.5 rounded-full bg-white shadow-xs" />
                  </div>
                </button>
              </div>

              {/* فلتر الترتيب حسب التقييم */}
              <div>
                <button
                  type="button"
                  onClick={() => setSortByRating((prev) => !prev)}
                  className={cn(
                    "w-full h-11 px-3.5 rounded-xl border font-bold text-xs flex items-center justify-between transition-all cursor-pointer",
                    sortByRating
                      ? "bg-amber-50 border-amber-400 text-amber-950"
                      : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Star className={cn("h-4 w-4", sortByRating ? "fill-amber-500 text-amber-500" : "text-stone-400")} />
                    <span>ترتيب حسب الأعلى تقييماً</span>
                  </div>
                  <div className={cn(
                    "w-8 h-4.5 rounded-full p-0.5 transition-colors flex items-center",
                    sortByRating ? "bg-amber-600 justify-end" : "bg-stone-300 justify-start"
                  )}>
                    <span className="w-3.5 h-3.5 rounded-full bg-white shadow-xs" />
                  </div>
                </button>
              </div>

              {/* فلتر النطاق الجغرافي (الأقرب إليك) */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  نطاق المسافة (الأقرب إليك)
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: null, label: 'الكل' },
                    { id: 3, label: '3 كم' },
                    { id: 5, label: '5 كم' },
                    { id: 10, label: '10 كم' },
                  ].map((dist) => (
                    <button
                      key={String(dist.id)}
                      type="button"
                      onClick={() => {
                        setMaxDistanceKm(dist.id);
                        if (dist.id !== null) {
                          setIsNearestFilterActive(true);
                          if (!userLocation) handleLocateUser();
                        }
                      }}
                      className={cn(
                        "h-8.5 rounded-xl text-xs font-bold transition-all cursor-pointer border text-center",
                        maxDistanceKm === dist.id
                          ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                          : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                      )}
                    >
                      {dist.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleApplyFilters}
                  className="flex-1 h-10 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  تطبيق الفلاتر
                </button>
                {(selectedMainCategory !== 'all' || selectedSubCategory !== 'all' || openNowFilter || favoritesOnlyFilter || deliveryOnlyFilter || sortByRating || maxDistanceKm !== null) && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="h-10 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    إعادة ضبط
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content: Map + Side Panel */}
      <div className="relative flex-1 w-full h-full min-h-0 flex overflow-hidden pb-0">
        {/* Map Container */}
        <div className="relative flex-1 w-full h-full min-h-0 bg-stone-100">
          <div 
            ref={mapContainerRef} 
            className="w-full h-full min-h-[350px] z-10" 
            style={{ width: '100%', height: '100%' }}
          />

          {/* Desktop & Tablet Floating Controls: شريط البحث نصف مدور الطرفين وزري الفلاتر والقائمة الجانبية أسفل رأسية الموقع */}
          <div className="hidden sm:flex flex-col items-start gap-2 absolute top-3.5 right-4 sm:right-6 z-30 pointer-events-auto">
            <div className="flex items-center gap-2.5">
              {/* Search Input with Voice Search & Autocomplete */}
              <div ref={desktopSearchContainerRef} className="relative w-72 md:w-80 lg:w-96">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setIsAutocompleteOpen(false);
                    handleExecuteSearch();
                  }}
                  className="relative w-full"
                >
                  <button
                    type="submit"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#1a4d2e] cursor-pointer p-0.5"
                    title="بحث"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                  <input
                    type="text"
                    value={searchInput}
                    onFocus={() => {
                      if (searchInput.trim().length > 0) {
                        setIsAutocompleteOpen(true);
                      }
                    }}
                    onChange={(e) => {
                      setSearchInput(e.target.value);
                      setIsAutocompleteOpen(e.target.value.trim().length > 0);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setIsAutocompleteOpen(false);
                        handleExecuteSearch();
                      } else if (e.key === 'Escape') {
                        setIsAutocompleteOpen(false);
                      }
                    }}
                    placeholder="ابحث باسم المحل، المنطقة، أو الخدمة..."
                    className="w-full h-11 pr-11 pl-20 bg-white/95 backdrop-blur-md border border-stone-200/90 rounded-full shadow-lg text-xs font-bold text-stone-800 placeholder-stone-400 focus:outline-none focus:border-[#1a4d2e] transition-all [&::-webkit-search-cancel-button]:appearance-none"
                  />
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                    {searchInput && (
                      <button
                        type="button"
                        onClick={() => {
                          handleClearSearch();
                          setIsAutocompleteOpen(false);
                        }}
                        className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
                        title="مسح البحث"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <VoiceSearchButton
                      onTranscript={(text) => {
                        setSearchInput(text);
                        handleExecuteSearch(text);
                        setIsAutocompleteOpen(false);
                      }}
                      size="sm"
                    />
                  </div>
                </form>

                {/* Autocomplete Dropdown */}
                {isAutocompleteOpen && searchInput.trim().length > 0 && (
                  <div className="absolute top-12.5 inset-x-0 bg-white/98 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-200/90 py-2 z-50 max-h-80 overflow-y-auto space-y-1 animate-in fade-in zoom-in-95 duration-150 text-right">
                    {/* Stores Section */}
                    {autocompleteSuggestions.stores.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-[10px] font-black text-stone-400">
                          محلات ومنشآت
                        </div>
                        {autocompleteSuggestions.stores.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setSearchInput(s.name);
                              handleExecuteSearch(s.name);
                              handleOpenStoreDetails(s, true);
                              setIsAutocompleteOpen(false);
                            }}
                            className="px-3.5 py-2 hover:bg-stone-50 flex items-center gap-2.5 cursor-pointer transition-colors"
                          >
                            <div className="w-8 h-8 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-200 flex items-center justify-center">
                              {s.logoUrl || s.imageUrl || s.image ? (
                                <img src={s.logoUrl || s.imageUrl || s.image} alt={s.name} className="w-full h-full object-cover" />
                              ) : (
                                <Store className="w-4 h-4 text-stone-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="font-bold text-xs text-stone-900 truncate">{s.name}</h5>
                              <p className="text-[10px] text-stone-500 font-bold truncate">
                                {s.category} {s.district ? `• ${s.district}` : ''}
                              </p>
                            </div>
                            {s.rating > 0 && (
                              <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0">
                                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                <span>{s.rating.toFixed(1)}</span>
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Categories Section */}
                    {autocompleteSuggestions.categories.length > 0 && (
                      <div className="border-t border-stone-100 pt-1">
                        <div className="px-3 py-1 text-[10px] font-black text-stone-400">
                          أقسام وتصنيفات
                        </div>
                        {autocompleteSuggestions.categories.map((cat) => (
                          <div
                            key={cat}
                            onClick={() => {
                              if (BUSINESS_CATEGORIES[cat as MainCategory]) {
                                setSelectedMainCategory(cat);
                              }
                              handleExecuteSearch(cat);
                              setIsAutocompleteOpen(false);
                            }}
                            className="px-3.5 py-2 hover:bg-emerald-50/70 flex items-center justify-between cursor-pointer transition-colors text-stone-800 hover:text-emerald-900 font-bold text-xs"
                          >
                            <div className="flex items-center gap-2">
                              <Tag className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{cat}</span>
                            </div>
                            <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                              تصفح القسم
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Districts Section */}
                    {autocompleteSuggestions.districts.length > 0 && (
                      <div className="border-t border-stone-100 pt-1">
                        <div className="px-3 py-1 text-[10px] font-black text-stone-400">
                          مناطق وأحياء
                        </div>
                        {autocompleteSuggestions.districts.map((dst) => (
                          <div
                            key={dst}
                            onClick={() => {
                              setSearchInput(dst);
                              handleExecuteSearch(dst);
                              setIsAutocompleteOpen(false);
                            }}
                            className="px-3.5 py-2 hover:bg-stone-50 flex items-center gap-2 cursor-pointer transition-colors text-stone-800 font-bold text-xs"
                          >
                            <MapPin className="w-3.5 h-3.5 text-stone-400" />
                            <span>{dst}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* View All Search Button */}
                    <div className="border-t border-stone-100 pt-1 px-2 pb-1">
                      <button
                        type="button"
                        onClick={() => {
                          handleExecuteSearch();
                          setIsAutocompleteOpen(false);
                        }}
                        className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-[#1a4d2e] rounded-xl text-xs font-bold transition-colors text-center cursor-pointer"
                      >
                        عرض كافة نتائج البحث عن &quot;{searchInput}&quot;
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Filter Pill Button (الفلاتر) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDesktopFiltersOpen((prev) => !prev)}
                  className={cn(
                    "h-11 px-4 rounded-full border shadow-lg font-bold text-xs flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md active:scale-95 shrink-0",
                    (selectedMainCategory !== 'all' || selectedSubCategory !== 'all' || openNowFilter || favoritesOnlyFilter || deliveryOnlyFilter || sortByRating || maxDistanceKm !== null || isDesktopFiltersOpen)
                      ? "bg-[#1a4d2e] text-white border-[#1a4d2e]"
                      : "bg-white/95 border-stone-200/90 text-stone-800 hover:bg-stone-50"
                  )}
                  title="الفلاتر"
                >
                  <SlidersHorizontal className={cn("h-4 w-4", (selectedMainCategory !== 'all' || selectedSubCategory !== 'all' || openNowFilter || favoritesOnlyFilter || deliveryOnlyFilter || sortByRating || maxDistanceKm !== null || isDesktopFiltersOpen) ? "text-white" : "text-[#1a4d2e]")} />
                  <span>الفلاتر</span>
                  {(selectedMainCategory !== 'all' || selectedSubCategory !== 'all' || openNowFilter || favoritesOnlyFilter || deliveryOnlyFilter || sortByRating || maxDistanceKm !== null) && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </button>

                {/* Desktop Filters Dropdown Popover */}
                {isDesktopFiltersOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-35"
                      onClick={() => setIsDesktopFiltersOpen(false)}
                    />
                    <div className="absolute top-13 right-0 z-40 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-200/90 p-4 w-76 sm:w-80 space-y-3.5 animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                        <h3 className="font-black text-xs text-stone-900">خيارات الفلترة</h3>
                        <button
                          type="button"
                          onClick={() => setIsDesktopFiltersOpen(false)}
                          className="p-1 text-stone-400 hover:text-stone-700 rounded-full cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1.5">
                          القسم الرئيسي
                        </label>
                        <div className="relative">
                          <select
                            value={selectedMainCategory}
                            onChange={(e) => handleMainCategoryChange(e.target.value)}
                            className="w-full h-9.5 pl-8 pr-3 bg-stone-50 border border-stone-200 rounded-xl text-xs font-bold text-stone-800 outline-none appearance-none cursor-pointer"
                          >
                            <option value="all">جميع الأقسام الرئيسية</option>
                            {Object.keys(BUSINESS_CATEGORIES).map((catName) => (
                              <option key={catName} value={catName}>
                                {catName}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400 pointer-events-none" />
                        </div>
                      </div>

                      {selectedMainCategory !== 'all' && availableSubcategories.length > 0 && (
                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1.5">
                            التصنيف الفرعي
                          </label>
                          <div className="relative">
                            <select
                              value={selectedSubCategory}
                              onChange={(e) => handleSubCategoryChange(e.target.value)}
                              className="w-full h-9.5 pl-8 pr-3 bg-emerald-50/60 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-950 outline-none appearance-none cursor-pointer"
                            >
                              <option value="all">كافة التصنيفات الفرعية ({availableSubcategories.length})</option>
                              {availableSubcategories.map((subName) => (
                                <option key={subName} value={subName}>
                                  {subName}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-emerald-600 pointer-events-none" />
                          </div>
                        </div>
                      )}

                      {/* فلتر مفتوح الآن */}
                      <div className="pt-2 border-t border-stone-100">
                        <button
                          type="button"
                          onClick={() => setOpenNowFilter((prev) => !prev)}
                          className={cn(
                            "w-full h-9.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-between transition-all cursor-pointer",
                            openNowFilter
                              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                              : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Clock className={cn("h-3.5 w-3.5", openNowFilter ? "text-emerald-600" : "text-stone-400")} />
                            <span>مفتوح الآن</span>
                          </div>
                          <div className={cn(
                            "w-7.5 h-4 rounded-full p-0.5 transition-colors flex items-center",
                            openNowFilter ? "bg-[#1a4d2e] justify-end" : "bg-stone-300 justify-start"
                          )}>
                            <span className="w-3 h-3 rounded-full bg-white shadow-xs" />
                          </div>
                        </button>
                      </div>

                      {/* فلتر المفضلة فقط */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setFavoritesOnlyFilter((prev) => !prev)}
                          className={cn(
                            "w-full h-9.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-between transition-all cursor-pointer",
                            favoritesOnlyFilter
                              ? "bg-rose-50 border-rose-300 text-rose-900"
                              : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Heart className={cn("h-3.5 w-3.5", favoritesOnlyFilter ? "fill-rose-500 text-rose-500" : "text-stone-400")} />
                            <span>المفضلة فقط ({userFavorites.length})</span>
                          </div>
                          <div className={cn(
                            "w-7.5 h-4 rounded-full p-0.5 transition-colors flex items-center",
                            favoritesOnlyFilter ? "bg-rose-600 justify-end" : "bg-stone-300 justify-start"
                          )}>
                            <span className="w-3 h-3 rounded-full bg-white shadow-xs" />
                          </div>
                        </button>
                      </div>

                      {/* فلتر خدمة التوصيل متاحة */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setDeliveryOnlyFilter((prev) => !prev)}
                          className={cn(
                            "w-full h-9.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-between transition-all cursor-pointer",
                            deliveryOnlyFilter
                              ? "bg-amber-50 border-amber-300 text-amber-950"
                              : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Truck className={cn("h-3.5 w-3.5", deliveryOnlyFilter ? "text-amber-700" : "text-stone-400")} />
                            <span>خدمة التوصيل متاحة</span>
                          </div>
                          <div className={cn(
                            "w-7.5 h-4 rounded-full p-0.5 transition-colors flex items-center",
                            deliveryOnlyFilter ? "bg-amber-600 justify-end" : "bg-stone-300 justify-start"
                          )}>
                            <span className="w-3 h-3 rounded-full bg-white shadow-xs" />
                          </div>
                        </button>
                      </div>

                      {/* فلتر الترتيب حسب التقييم */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setSortByRating((prev) => !prev)}
                          className={cn(
                            "w-full h-9.5 px-3 rounded-xl border font-bold text-xs flex items-center justify-between transition-all cursor-pointer",
                            sortByRating
                              ? "bg-amber-50 border-amber-300 text-amber-950"
                              : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Star className={cn("h-3.5 w-3.5", sortByRating ? "fill-amber-500 text-amber-500" : "text-stone-400")} />
                            <span>ترتيب حسب الأعلى تقييماً</span>
                          </div>
                          <div className={cn(
                            "w-7.5 h-4 rounded-full p-0.5 transition-colors flex items-center",
                            sortByRating ? "bg-amber-600 justify-end" : "bg-stone-300 justify-start"
                          )}>
                            <span className="w-3 h-3 rounded-full bg-white shadow-xs" />
                          </div>
                        </button>
                      </div>

                      {/* فلتر النطاق الجغرافي (الأقرب إليك) */}
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1.5">
                          نطاق المسافة (الأقرب إليك)
                        </label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { id: null, label: 'الكل' },
                            { id: 3, label: '3 كم' },
                            { id: 5, label: '5 كم' },
                            { id: 10, label: '10 كم' },
                          ].map((dist) => (
                            <button
                              key={String(dist.id)}
                              type="button"
                              onClick={() => {
                                setMaxDistanceKm(dist.id);
                                if (dist.id !== null) {
                                  setIsNearestFilterActive(true);
                                  if (!userLocation) handleLocateUser();
                                }
                              }}
                              className={cn(
                                "h-8 rounded-lg text-xs font-bold transition-all cursor-pointer border text-center",
                                maxDistanceKm === dist.id
                                  ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                                  : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                              )}
                            >
                              {dist.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-stone-100">
                        <button
                          type="button"
                          onClick={handleApplyFilters}
                          className="flex-1 h-9 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
                        >
                          تطبيق الفلاتر
                        </button>
                        {(selectedMainCategory !== 'all' || selectedSubCategory !== 'all' || openNowFilter || favoritesOnlyFilter || deliveryOnlyFilter || sortByRating || maxDistanceKm !== null) && (
                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="h-9 px-3 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                          >
                            إعادة ضبط
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Nearest Pill Button (الأقرب إليك) */}
              <button
                type="button"
                onClick={handleToggleNearestFilter}
                className={cn(
                  "h-11 px-4 rounded-full border shadow-lg font-bold text-xs flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md active:scale-95 shrink-0",
                  isNearestFilterActive
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white/95 border-stone-200/90 text-stone-800 hover:bg-stone-50"
                )}
                title="ترتيب وفلترة حسب الأقرب إليك"
              >
                <Navigation className={cn("h-4 w-4", isNearestFilterActive ? "text-white" : "text-blue-600")} />
                <span>الأقرب إليك</span>
              </button>

              {/* Side List Pill Button (قائمة المحلات) */}
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
                    setViewMode((prev) => (prev === 'map' ? 'split' : 'map'));
                  } else {
                    setIsMobileListOpen((prev) => !prev);
                  }
                }}
                className={cn(
                  "h-11 px-4 rounded-full border shadow-lg font-bold text-xs flex items-center gap-2 transition-all cursor-pointer backdrop-blur-md active:scale-95 shrink-0",
                  (viewMode === 'split' || isMobileListOpen)
                    ? "bg-[#1a4d2e] text-white border-[#1a4d2e]"
                    : "bg-white/95 border-stone-200/90 text-stone-800 hover:bg-stone-50"
                )}
                title="قائمة المحلات"
              >
                <List className={cn("h-4 w-4", (viewMode === 'split' || isMobileListOpen) ? "text-white" : "text-[#1a4d2e]")} />
                <span>قائمة المحلات</span>
              </button>
            </div>

            {/* Desktop Tabs أسفل شريط البحث */}
            <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-full border border-stone-200/90 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('stores');
                  setSelectedBusiness(null);
                }}
                className={cn(
                  "h-8 px-3.5 rounded-full text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer",
                  activeTab === 'stores'
                    ? "bg-[#1a4d2e] text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/70"
                )}
              >
                <Store className="h-3.5 w-3.5" />
                <span>محلات</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('offers');
                  setSelectedBusiness(null);
                }}
                className={cn(
                  "h-8 px-3.5 rounded-full text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer",
                  activeTab === 'offers'
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/70"
                )}
              >
                <Percent className="h-3.5 w-3.5" />
                <span>عروض وخصومات</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('jobs');
                  setSelectedBusiness(null);
                }}
                className={cn(
                  "h-8 px-3.5 rounded-full text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer",
                  activeTab === 'jobs'
                    ? "bg-[#1a4d2e] text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/70"
                )}
              >
                <Briefcase className="h-3.5 w-3.5" />
                <span>وظائف</span>
              </button>
            </div>
          </div>

          {/* Mobile Floating Search Bar: نصف مدور الطرفين أسفل رأسية الموقع */}
          <div className="sm:hidden absolute top-3 inset-x-3 z-30 pointer-events-auto flex flex-col items-center gap-2">
            <div ref={mobileSearchContainerRef} className="relative w-full">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setIsAutocompleteOpen(false);
                  handleExecuteSearch();
                }}
                className="relative w-full"
              >
                <button
                  type="submit"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-[#1a4d2e] cursor-pointer p-0.5"
                  title="بحث"
                >
                  <Search className="h-4 w-4" />
                </button>
                <input
                  type="text"
                  value={searchInput}
                  onFocus={() => {
                    if (searchInput.trim().length > 0) {
                      setIsAutocompleteOpen(true);
                    }
                  }}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setIsAutocompleteOpen(e.target.value.trim().length > 0);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setIsAutocompleteOpen(false);
                      handleExecuteSearch();
                    } else if (e.key === 'Escape') {
                      setIsAutocompleteOpen(false);
                    }
                  }}
                  placeholder="ابحث باسم المحل، المنطقة، أو الخدمة..."
                  className="w-full h-11 pr-11 pl-20 bg-white/95 backdrop-blur-md border border-stone-200/90 rounded-full shadow-lg text-xs font-bold text-stone-800 placeholder-stone-400 focus:outline-none focus:border-[#1a4d2e] transition-all [&::-webkit-search-cancel-button]:appearance-none"
                />
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => {
                        handleClearSearch();
                        setIsAutocompleteOpen(false);
                      }}
                      className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full transition-colors cursor-pointer"
                      title="مسح البحث"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <VoiceSearchButton
                    onTranscript={(text) => {
                      setSearchInput(text);
                      handleExecuteSearch(text);
                      setIsAutocompleteOpen(false);
                    }}
                    size="sm"
                  />
                </div>
              </form>

              {/* Mobile Autocomplete Dropdown */}
              {isAutocompleteOpen && searchInput.trim().length > 0 && (
                <div className="absolute top-12.5 inset-x-0 bg-white/98 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-200/90 py-2 z-50 max-h-72 overflow-y-auto space-y-1 animate-in fade-in zoom-in-95 duration-150 text-right">
                  {/* Stores Section */}
                  {autocompleteSuggestions.stores.length > 0 && (
                    <div>
                      <div className="px-3 py-1 text-[10px] font-black text-stone-400">
                        محلات ومنشآت
                      </div>
                      {autocompleteSuggestions.stores.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSearchInput(s.name);
                            handleExecuteSearch(s.name);
                            handleOpenStoreDetails(s, true);
                            setIsAutocompleteOpen(false);
                          }}
                          className="px-3 py-2 hover:bg-stone-50 flex items-center gap-2.5 cursor-pointer transition-colors"
                        >
                          <div className="w-8 h-8 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-200 flex items-center justify-center">
                            {s.logoUrl || s.imageUrl || s.image ? (
                              <img src={s.logoUrl || s.imageUrl || s.image} alt={s.name} className="w-full h-full object-cover" />
                            ) : (
                              <Store className="w-4 h-4 text-stone-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-xs text-stone-900 truncate">{s.name}</h5>
                            <p className="text-[10px] text-stone-500 font-bold truncate">
                              {s.category} {s.district ? `• ${s.district}` : ''}
                            </p>
                          </div>
                          {s.rating > 0 && (
                            <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0">
                              <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                              <span>{s.rating.toFixed(1)}</span>
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Categories Section */}
                  {autocompleteSuggestions.categories.length > 0 && (
                    <div className="border-t border-stone-100 pt-1">
                      <div className="px-3 py-1 text-[10px] font-black text-stone-400">
                        أقسام وتصنيفات
                      </div>
                      {autocompleteSuggestions.categories.map((cat) => (
                        <div
                          key={cat}
                          onClick={() => {
                            if (BUSINESS_CATEGORIES[cat as MainCategory]) {
                              setSelectedMainCategory(cat);
                            }
                            handleExecuteSearch(cat);
                            setIsAutocompleteOpen(false);
                          }}
                          className="px-3 py-2 hover:bg-emerald-50/70 flex items-center justify-between cursor-pointer transition-colors text-stone-800 font-bold text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Tag className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{cat}</span>
                          </div>
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                            تصفح
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Districts Section */}
                  {autocompleteSuggestions.districts.length > 0 && (
                    <div className="border-t border-stone-100 pt-1">
                      <div className="px-3 py-1 text-[10px] font-black text-stone-400">
                        مناطق وأحياء
                      </div>
                      {autocompleteSuggestions.districts.map((dst) => (
                        <div
                          key={dst}
                          onClick={() => {
                            setSearchInput(dst);
                            handleExecuteSearch(dst);
                            setIsAutocompleteOpen(false);
                          }}
                          className="px-3 py-2 hover:bg-stone-50 flex items-center gap-2 cursor-pointer transition-colors text-stone-800 font-bold text-xs"
                        >
                          <MapPin className="w-3.5 h-3.5 text-stone-400" />
                          <span>{dst}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* View All Search Button */}
                  <div className="border-t border-stone-100 pt-1 px-2 pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        handleExecuteSearch();
                        setIsAutocompleteOpen(false);
                      }}
                      className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-[#1a4d2e] rounded-xl text-xs font-bold transition-colors text-center cursor-pointer"
                    >
                      عرض كافة نتائج البحث عن &quot;{searchInput}&quot;
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Tabs أسفل شريط البحث */}
            <div className="flex items-center gap-1 bg-white/95 backdrop-blur-md p-1 rounded-full border border-stone-200/90 shadow-lg max-w-full overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('stores');
                  setSelectedBusiness(null);
                }}
                className={cn(
                  "h-8 px-3 rounded-full text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0",
                  activeTab === 'stores'
                    ? "bg-[#1a4d2e] text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/70"
                )}
              >
                <Store className="h-3.5 w-3.5" />
                <span>محلات</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('offers');
                  setSelectedBusiness(null);
                }}
                className={cn(
                  "h-8 px-3 rounded-full text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0",
                  activeTab === 'offers'
                    ? "bg-red-600 text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/70"
                )}
              >
                <Percent className="h-3.5 w-3.5" />
                <span>عروض وخصومات</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('jobs');
                  setSelectedBusiness(null);
                }}
                className={cn(
                  "h-8 px-3 rounded-full text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0",
                  activeTab === 'jobs'
                    ? "bg-[#1a4d2e] text-white shadow-xs"
                    : "text-stone-600 hover:text-stone-900 hover:bg-stone-100/70"
                )}
              >
                <Briefcase className="h-3.5 w-3.5" />
                <span>وظائف</span>
              </button>
            </div>
          </div>

          {/* Floating Pill Action Buttons on Mobile: فوق أعلى ال bottom navbar */}
          {!selectedBusiness && (
            <div className="sm:hidden absolute bottom-[84px] inset-x-0 z-20 flex items-center justify-center gap-2 pointer-events-none px-3 animate-in fade-in duration-200">
              <button
                type="button"
                onClick={() => setIsFiltersSheetOpen(true)}
                className={cn(
                  "pointer-events-auto h-10 px-3.5 rounded-full border shadow-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md active:scale-95 shrink-0",
                  (selectedMainCategory !== 'all' || selectedSubCategory !== 'all' || openNowFilter || favoritesOnlyFilter || deliveryOnlyFilter || sortByRating || maxDistanceKm !== null)
                    ? "bg-[#1a4d2e] text-white border-[#1a4d2e]"
                    : "bg-white/95 border-stone-200/90 text-stone-800 hover:bg-stone-50"
                )}
                title="الفلاتر"
              >
                <SlidersHorizontal className={cn("h-4 w-4", (selectedMainCategory !== 'all' || selectedSubCategory !== 'all' || openNowFilter || favoritesOnlyFilter || deliveryOnlyFilter || sortByRating || maxDistanceKm !== null) ? "text-white" : "text-[#1a4d2e]")} />
                <span>الفلاتر</span>
                {(selectedMainCategory !== 'all' || selectedSubCategory !== 'all' || openNowFilter || favoritesOnlyFilter || deliveryOnlyFilter || sortByRating || maxDistanceKm !== null) && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                )}
              </button>

              {/* زر الأقرب إليك بجانب زري الفلاتر وقائمة المحلات */}
              <button
                type="button"
                onClick={handleToggleNearestFilter}
                className={cn(
                  "pointer-events-auto h-10 px-3.5 rounded-full border shadow-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md active:scale-95 shrink-0",
                  isNearestFilterActive
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white/95 border-stone-200/90 text-stone-800 hover:bg-stone-50"
                )}
                title="ترتيب وفلترة حسب الأقرب إليك"
              >
                <Navigation className={cn("h-4 w-4", isNearestFilterActive ? "text-white" : "text-blue-600")} />
                <span>الأقرب إليك</span>
              </button>

              <button
                type="button"
                onClick={() => setIsMobileListOpen(true)}
                className="pointer-events-auto h-10 px-3.5 rounded-full border border-stone-200/90 bg-white/95 hover:bg-stone-50 text-stone-800 font-bold text-xs flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all active:scale-95 cursor-pointer shrink-0"
                title="قائمة المحلات"
              >
                <List className="h-4 w-4 text-[#1a4d2e]" />
                <span>
                  {activeTab === 'offers' ? `قائمة العروض (${mapPins.length})` : activeTab === 'jobs' ? `قائمة الوظائف (${mapPins.length})` : `قائمة المحلات (${mapPins.length})`}
                </span>
              </button>
            </div>
          )}

          {/* Mobile Mini Preview Floating Card (بطاقة المعاينة المصغرة السريعة للهاتف) */}
          {selectedBusiness && !isMobileFullDetailOpen && (
            <div className="sm:hidden absolute bottom-[84px] inset-x-3 z-30 pointer-events-auto animate-in slide-in-from-bottom-4 duration-200">
              <div 
                onClick={() => setIsMobileFullDetailOpen(true)}
                className="bg-white/95 backdrop-blur-md rounded-2xl p-3 border border-stone-200/90 shadow-2xl flex items-center gap-3 cursor-pointer relative"
              >
                {/* Store Thumbnail */}
                <div className="w-16 h-16 rounded-xl bg-stone-100 overflow-hidden shrink-0 border border-stone-200 relative">
                  {selectedBusiness.logoUrl || selectedBusiness.imageUrl || selectedBusiness.image ? (
                    <img
                      src={selectedBusiness.logoUrl || selectedBusiness.imageUrl || selectedBusiness.image}
                      alt={selectedBusiness.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-stone-400">
                      <Store className="w-6 h-6" />
                    </div>
                  )}
                </div>

                {/* Store Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="font-black text-sm text-stone-900 truncate">
                      {selectedBusiness.name}
                    </h4>
                    {getBusinessVipStatus(selectedBusiness).isVip && (
                      <VerifiedBadge size="sm" businessName={selectedBusiness.name} />
                    )}
                  </div>
                  <p className="text-[11px] text-stone-500 font-bold truncate">
                    {selectedBusiness.category || selectedBusiness.subCategory} • {selectedBusiness.district || selectedBusiness.address || 'إربد'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {selectedBusiness.rating > 0 && (
                      <span className="flex items-center gap-0.5 text-[11px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span>{selectedBusiness.rating.toFixed(1)}</span>
                      </span>
                    )}
                    {selectedBusinessDistanceKm !== null && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                        {formatDistance(selectedBusinessDistanceKm)}
                      </span>
                    )}
                    {(() => {
                      const st = getLiveWorkingStatus(selectedBusiness.workingHours);
                      return (
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md", st.isOpen ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600")}>
                          {st.statusText}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={handleCloseStoreDetails}
                    className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 self-end cursor-pointer"
                    title="إغلاق"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleShareStore(selectedBusiness, e)}
                      className="p-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl cursor-pointer"
                      title="مشاركة"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMobileFullDetailOpen(true)}
                      className="px-2.5 py-1.5 bg-[#1a4d2e] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                    >
                      التفاصيل
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Re-search in this area floating button */}
          {showSearchAreaBtn && (
            <div className="absolute top-28 sm:top-24 left-1/2 -translate-x-1/2 z-25 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                type="button"
                onClick={handleSearchThisArea}
                className="h-8.5 px-4 rounded-full bg-white/95 hover:bg-white text-stone-800 border border-stone-200/90 shadow-xl backdrop-blur-md text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 hover:border-[#1a4d2e] hover:text-[#1a4d2e]"
              >
                <RotateCcw className="h-3.5 w-3.5 text-[#1a4d2e]" />
                <span>إعادة البحث في هذه المنطقة</span>
              </button>
            </div>
          )}

          {/* Area boundary filter chip if active */}
          {searchAreaBounds && !showSearchAreaBtn && (
            <div className="absolute top-28 sm:top-24 left-1/2 -translate-x-1/2 z-25 pointer-events-auto animate-in fade-in duration-200">
              <div className="h-8 pl-2 pr-3.5 rounded-full bg-[#1a4d2e] text-white shadow-lg text-xs font-bold flex items-center gap-1.5">
                <span>ضمن النطاق المحدد ({mapPins.length})</span>
                <button
                  type="button"
                  onClick={() => {
                    setSearchAreaBounds(null);
                    setShowSearchAreaBtn(false);
                  }}
                  className="p-1 rounded-full hover:bg-white/20 text-white cursor-pointer"
                  title="إلغاء نطاق البحث"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {/* Unified Floating Map Controls Pillar on Left (Zoom +, Zoom -, Fit All, Satellite, GPS) */}
          <div className="absolute bottom-36 sm:bottom-6 left-3 sm:left-6 z-25 flex flex-col items-center gap-2 pointer-events-auto">
            {/* Zoom Controls */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-stone-200/90 shadow-xl overflow-hidden flex flex-col">
              <button
                type="button"
                onClick={() => mapInstanceRef.current?.zoomIn()}
                className="p-2.5 hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer border-b border-stone-100 flex items-center justify-center"
                title="تكبير الخريطة"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => mapInstanceRef.current?.zoomOut()}
                className="p-2.5 hover:bg-stone-100 text-stone-700 transition-colors cursor-pointer flex items-center justify-center"
                title="تصغير الخريطة"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>

            {/* Fit All Stores Button (إعادة ضبط الرؤية الشاملة) */}
            <button
              type="button"
              onClick={handleFitAllStores}
              className="bg-white/95 backdrop-blur-md hover:bg-white text-stone-800 p-2.5 rounded-2xl shadow-xl border border-stone-200/90 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
              title="إعادة ضبط الرؤية الشاملة لكافة المحلات"
            >
              <Maximize2 className="w-4 h-4 text-[#1a4d2e]" />
            </button>

            {/* Switch map appearance: Streets vs Satellite */}
            <button
              type="button"
              onClick={toggleMapStyle}
              className={cn(
                "bg-white/95 backdrop-blur-md hover:bg-white p-2.5 rounded-2xl shadow-xl border border-stone-200/90 transition-all active:scale-95 cursor-pointer flex items-center justify-center",
                mapStyle === 'satellite' ? "text-emerald-700 ring-2 ring-emerald-500/40" : "text-stone-700"
              )}
              title={mapStyle === 'streets' ? 'التبديل إلى مظهر القمر الصناعي' : 'التبديل إلى مظهر الشوارع'}
            >
              <Layers className="w-4 h-4" />
            </button>

            {/* GPS Location Button */}
            <button
              type="button"
              onClick={handleLocateUser}
              disabled={isLocatingUser}
              className={cn(
                "bg-white/95 backdrop-blur-md hover:bg-white p-2.5 rounded-2xl shadow-xl border border-stone-200/90 transition-all active:scale-95 cursor-pointer flex items-center justify-center",
                userLocation ? "text-blue-600 ring-2 ring-blue-500/40" : "text-stone-700"
              )}
              title="تحديد موقعي الحالي"
            >
              <Crosshair className={cn("w-4 h-4 text-blue-600", isLocatingUser && "animate-spin")} />
            </button>
          </div>

        </div>

        {/* Desktop Store Details Window (Google Maps style side panel with Collapsible support) */}
        {selectedBusiness && (
          <aside
            className={cn(
              "hidden lg:flex bg-white flex-col shadow-2xl z-20 transition-all duration-300 relative shrink-0 h-full",
              isSidePanelCollapsed ? "w-0 border-r-0" : "w-96 xl:w-[420px] border-r border-stone-200"
            )}
          >
            {/* The Single Toggle Button on the Inner Border */}
            <button
              type="button"
              onClick={() => {
                setIsSidePanelCollapsed((prev) => !prev);
                setTimeout(() => mapInstanceRef.current?.invalidateSize(), 310);
              }}
              className="absolute top-1/2 -translate-y-1/2 -right-6 z-40 w-6 h-12 bg-white hover:bg-stone-50 border border-stone-200 rounded-r-xl shadow-md flex items-center justify-center text-stone-600 hover:text-[#1a4d2e] cursor-pointer transition-colors active:scale-95"
              title={isSidePanelCollapsed ? "إظهار تفاصيل المحل" : "طي تفاصيل المحل"}
            >
              {isSidePanelCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            <div className={cn("w-full h-full flex flex-col overflow-hidden transition-opacity duration-200", isSidePanelCollapsed && "opacity-0 pointer-events-none")}>
              <StoreDetailPanel
                business={selectedBusiness}
                activeDetailTab={storeDetailTab}
                setActiveDetailTab={setStoreDetailTab}
                onClose={handleCloseStoreDetails}
                activeOffers={selectedStoreOffers}
                activeJobs={selectedStoreJobs}
                reviews={businessReviews}
                loadingReviews={loadingReviews}
                photos={storePhotos}
                onPreviewPhoto={setPreviewPhoto}
                userDistanceKm={selectedBusinessDistanceKm}
                onSelectProduct={(product) => setSelectedDetailProduct({ product, business: selectedBusiness })}
                onSelectOffer={(offer) => setSelectedDetailOffer({ offer, business: selectedBusiness })}
                onSelectJob={(job) => setSelectedDetailJob({ job, business: selectedBusiness })}
                onOpenAddReview={handleOpenAddReview}
                onShare={handleShareStore}
              />
            </div>
          </aside>
        )}

        {/* Desktop Split View: Stores Side Panel (only when NO store is selected with Collapsible support) */}
        {!selectedBusiness && viewMode === 'split' && (
          <aside
            className={cn(
              "hidden lg:flex bg-white flex-col shadow-xl z-20 transition-all duration-300 relative shrink-0 h-full",
              isSidePanelCollapsed ? "w-0 border-r-0" : "w-96 border-r border-stone-200"
            )}
          >
            {/* The Single Toggle Button on the Inner Border */}
            <button
              type="button"
              onClick={() => {
                setIsSidePanelCollapsed((prev) => !prev);
                setTimeout(() => mapInstanceRef.current?.invalidateSize(), 310);
              }}
              className="absolute top-1/2 -translate-y-1/2 -right-6 z-40 w-6 h-12 bg-white hover:bg-stone-50 border border-stone-200 rounded-r-xl shadow-md flex items-center justify-center text-stone-600 hover:text-[#1a4d2e] cursor-pointer transition-colors active:scale-95"
              title={isSidePanelCollapsed ? "إظهار قائمة المحلات" : "طي قائمة المحلات"}
            >
              {isSidePanelCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            <div className={cn("w-full h-full flex flex-col overflow-hidden transition-opacity duration-200", isSidePanelCollapsed && "opacity-0 pointer-events-none")}>
              <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-stone-900">
                    {activeTab === 'offers' ? 'منشآت العروض والخصومات' : activeTab === 'jobs' ? 'منشآت الشواغر الوظيفية' : 'قائمة المنشآت على الخريطة'}
                  </h3>
                  <span className="text-xs text-stone-500 font-bold">
                    {mapPins.length} {activeTab === 'offers' ? 'منشأة لديها عروض' : activeTab === 'jobs' ? 'منشأة لديها شواغر' : 'منشأة'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 cursor-pointer"
                  title="إغلاق القائمة"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {mapPins.length === 0 ? (
                <div className="p-8 text-center space-y-2 text-stone-400">
                  <MapPin className="h-8 w-8 mx-auto text-stone-300" />
                  <p className="text-xs font-bold">
                    {activeTab === 'offers' 
                      ? 'لا توجد منشآت لديها عروض فعالة حالياً' 
                      : activeTab === 'jobs' 
                      ? 'لا توجد منشآت لديها شواغر وظيفية حالياً' 
                      : 'لا توجد منشآت مطابقة للفلاتر الحالية'}
                  </p>
                </div>
              ) : (
                mapPins.map(({ business, isVip, activeOffersCount, activeJobsCount, distanceKm }) => (
                  <div
                    key={business.id}
                    onClick={() => handleSelectStoreFromList(business)}
                    onMouseEnter={() => setHoveredStoreId(business.id)}
                    onMouseLeave={() => setHoveredStoreId(null)}
                    className={cn(
                      "p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 relative group",
                      selectedBusiness?.id === business.id
                        ? "bg-emerald-50/70 border-emerald-400 shadow-xs"
                        : hoveredStoreId === business.id
                        ? "bg-amber-50/60 border-amber-300 shadow-xs ring-1 ring-amber-300"
                        : "bg-white hover:bg-stone-50 border-stone-200/80 shadow-2xs"
                    )}
                  >
                    <div className="w-12 h-12 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                      {business.logoUrl || business.imageUrl || business.image ? (
                        <img
                          src={business.logoUrl || business.imageUrl || business.image}
                          alt={business.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-stone-400">
                          <Store className="h-5 w-5" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-black text-xs text-stone-900 leading-snug break-words">
                          {business.name}
                        </h4>
                        {isVip && (
                          <VerifiedBadge size="sm" businessName={business.name} />
                        )}
                        {/* الوسم الذهبي: تقييم المحل وعدد المقيمين الكلي */}
                        <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 border border-amber-300 text-amber-950 px-1.5 py-0.5 rounded-md text-[10px] font-black shrink-0 shadow-2xs">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />
                          <span>{(business.rating || 5).toFixed(1)}</span>
                          <span className="text-amber-800 font-bold">({business.reviewCount || 0})</span>
                        </span>
                        {activeTab === 'offers' && activeOffersCount > 0 && (
                          <span className="text-[10px] text-red-600 font-bold bg-red-50 border border-red-200 px-1.5 py-0.2 rounded shrink-0">
                            {activeOffersCount} عرض
                          </span>
                        )}
                        {activeTab === 'jobs' && activeJobsCount > 0 && (
                          <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded shrink-0">
                            {activeJobsCount} وظيفة
                          </span>
                        )}
                        {distanceKm !== null && distanceKm !== undefined && (
                          <span className="text-[10px] text-blue-700 font-bold bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded shrink-0">
                            {formatDistance(distanceKm)}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-stone-500 truncate font-bold">
                        {business.category || business.subCategory}
                      </p>
                      <p className="text-[10px] text-stone-400 truncate">
                        {business.district || business.address || 'إربد'}
                      </p>
                    </div>

                    {/* زر الحفظ في المفضلة السريع */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(business.id);
                      }}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors cursor-pointer shrink-0",
                        userFavorites.includes(business.id)
                          ? "text-rose-500 hover:bg-rose-50"
                          : "text-stone-300 hover:text-rose-500 hover:bg-stone-100"
                      )}
                      title={userFavorites.includes(business.id) ? "إزالة من المفضلة" : "حفظ في المفضلة"}
                    >
                      <Heart className={cn("h-4 w-4", userFavorites.includes(business.id) && "fill-rose-500 text-rose-500")} />
                    </button>

                    <ChevronLeft className="h-4 w-4 text-stone-300 shrink-0" />
                  </div>
                ))
              )}
            </div>
            </div>
          </aside>
        )}

        {/* Mobile Stores List Drawer */}
        {isMobileListOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileListOpen(false)}
            />
            {/* Drawer */}
            <div className="relative z-10 w-full max-w-sm sm:max-w-md h-full bg-white flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
              <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-sm text-stone-900">
                    {activeTab === 'offers' ? 'منشآت العروض والخصومات' : activeTab === 'jobs' ? 'منشآت الشواغر الوظيفية' : 'قائمة المنشآت على الخريطة'}
                  </h3>
                  <span className="text-xs text-stone-500 font-bold">
                    {mapPins.length} {activeTab === 'offers' ? 'منشأة لديها عروض' : activeTab === 'jobs' ? 'منشأة لديها شواغر' : 'منشأة'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileListOpen(false)}
                  className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 cursor-pointer"
                  title="إغلاق"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {mapPins.length === 0 ? (
                  <div className="p-8 text-center space-y-2 text-stone-400">
                    <MapPin className="h-8 w-8 mx-auto text-stone-300" />
                    <p className="text-xs font-bold">
                      {activeTab === 'offers' 
                        ? 'لا توجد منشآت لديها عروض فعالة حالياً' 
                        : activeTab === 'jobs' 
                        ? 'لا توجد منشآت لديها شواغر وظيفية حالياً' 
                        : 'لا توجد منشآت مطابقة للفلاتر الحالية'}
                    </p>
                  </div>
                ) : (
                  mapPins.map(({ business, isVip, activeOffersCount, activeJobsCount, distanceKm }) => (
                    <div
                      key={business.id}
                      onClick={() => {
                        handleSelectStoreFromList(business);
                        setIsMobileFullDetailOpen(true);
                        setIsMobileListOpen(false);
                      }}
                      onMouseEnter={() => setHoveredStoreId(business.id)}
                      onMouseLeave={() => setHoveredStoreId(null)}
                      className={cn(
                        "p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 relative",
                        selectedBusiness?.id === business.id
                          ? "bg-emerald-50/70 border-emerald-400 shadow-xs"
                          : hoveredStoreId === business.id
                          ? "bg-amber-50/60 border-amber-300 shadow-xs ring-1 ring-amber-300"
                          : "bg-white hover:bg-stone-50 border-stone-200/80 shadow-2xs"
                      )}
                    >
                      <div className="w-12 h-12 rounded-lg bg-stone-100 overflow-hidden shrink-0 border border-stone-200">
                        {business.logoUrl || business.imageUrl || business.image ? (
                          <img
                            src={business.logoUrl || business.imageUrl || business.image}
                            alt={business.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-stone-400">
                            <Store className="h-5 w-5" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-black text-xs text-stone-900 leading-snug break-words">
                            {business.name}
                          </h4>
                          {isVip && (
                            <VerifiedBadge size="sm" businessName={business.name} />
                          )}
                          {/* الوسم الذهبي: تقييم المحل وعدد المقيمين الكلي */}
                          <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-100 via-amber-50 to-amber-100 border border-amber-300 text-amber-950 px-1.5 py-0.5 rounded-md text-[10px] font-black shrink-0 shadow-2xs">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500 shrink-0" />
                            <span>{(business.rating || 5).toFixed(1)}</span>
                            <span className="text-amber-800 font-bold">({business.reviewCount || 0})</span>
                          </span>
                          {activeTab === 'offers' && activeOffersCount > 0 && (
                            <span className="text-[10px] text-red-600 font-bold bg-red-50 border border-red-200 px-1.5 py-0.2 rounded shrink-0">
                              {activeOffersCount} عرض
                            </span>
                          )}
                          {activeTab === 'jobs' && activeJobsCount > 0 && (
                            <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded shrink-0">
                              {activeJobsCount} وظيفة
                            </span>
                          )}
                          {distanceKm !== null && distanceKm !== undefined && (
                            <span className="text-[10px] text-blue-700 font-bold bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded shrink-0">
                              {formatDistance(distanceKm)}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-stone-500 truncate font-bold">
                          {business.category || business.subCategory}
                        </p>
                        <p className="text-[10px] text-stone-400 truncate">
                          {business.district || business.address || 'إربد'}
                        </p>
                      </div>

                      {/* زر الحفظ في المفضلة السريع */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(business.id);
                        }}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors cursor-pointer shrink-0",
                          userFavorites.includes(business.id)
                            ? "text-rose-500 hover:bg-rose-50"
                            : "text-stone-300 hover:text-rose-500 hover:bg-stone-100"
                        )}
                        title={userFavorites.includes(business.id) ? "إزالة من المفضلة" : "حفظ في المفضلة"}
                      >
                        <Heart className={cn("h-4 w-4", userFavorites.includes(business.id) && "fill-rose-500 text-rose-500")} />
                      </button>

                      <ChevronLeft className="h-4 w-4 text-stone-300 shrink-0" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Bottom Sheet for Store Details */}
        {selectedBusiness && isMobileFullDetailOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
              onClick={handleCloseStoreDetails}
            />
            {/* Bottom Sheet */}
            <div className="relative z-10 w-full max-h-[85vh] h-[80vh] bg-white rounded-t-3xl shadow-2xl border-t border-stone-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
              <div className="pt-2.5 pb-1 flex justify-center shrink-0">
                <div className="w-12 h-1.5 bg-stone-300 rounded-full" />
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <StoreDetailPanel
                  business={selectedBusiness}
                  activeDetailTab={storeDetailTab}
                  setActiveDetailTab={setStoreDetailTab}
                  onClose={handleCloseStoreDetails}
                  activeOffers={selectedStoreOffers}
                  activeJobs={selectedStoreJobs}
                  reviews={businessReviews}
                  loadingReviews={loadingReviews}
                  photos={storePhotos}
                  onPreviewPhoto={setPreviewPhoto}
                  userDistanceKm={selectedBusinessDistanceKm}
                  onSelectProduct={(product) => setSelectedDetailProduct({ product, business: selectedBusiness })}
                  onSelectOffer={(offer) => setSelectedDetailOffer({ offer, business: selectedBusiness })}
                  onSelectJob={(job) => setSelectedDetailJob({ job, business: selectedBusiness })}
                  onOpenAddReview={handleOpenAddReview}
                  onShare={handleShareStore}
                />
              </div>
            </div>
          </div>
        )}

        {/* Copy to Clipboard Notification Toast */}
        {copyFeedback && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-60 bg-stone-900/90 text-white backdrop-blur-md px-4 py-2 rounded-full shadow-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 pointer-events-none">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>تم نسخ رابط المحل إلى الحافظة بنجاح</span>
          </div>
        )}

        {/* Photo Lightbox */}
        {previewPhoto && (
          <div
            className="fixed inset-0 z-60 bg-black/85 backdrop-blur-xs flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setPreviewPhoto(null)}
          >
            <button
              type="button"
              onClick={() => setPreviewPhoto(null)}
              className="absolute top-4 left-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/40 cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={previewPhoto}
              alt="معاينة الصورة"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
          </div>
        )}

        {/* Modals for Product, Offer, Job and Review Details */}
        {selectedDetailProduct && (
          <MapProductDetailModal
            product={selectedDetailProduct.product}
            business={selectedDetailProduct.business}
            onClose={() => setSelectedDetailProduct(null)}
          />
        )}
        {selectedDetailOffer && (
          <MapOfferDetailModal
            offer={selectedDetailOffer.offer}
            business={selectedDetailOffer.business}
            onClose={() => setSelectedDetailOffer(null)}
          />
        )}
        {selectedDetailJob && (
          <MapJobDetailModal
            job={selectedDetailJob.job}
            business={selectedDetailJob.business}
            onClose={() => setSelectedDetailJob(null)}
          />
        )}
        {isAddReviewOpen && selectedBusiness && (
          <MapReviewModal
            business={selectedBusiness}
            isOpen={isAddReviewOpen}
            onClose={() => setIsAddReviewOpen(false)}
            onReviewSubmitted={handleReviewAdded}
          />
        )}
      </div>
    </div>
  );
}
export default InteractiveMapPage;
