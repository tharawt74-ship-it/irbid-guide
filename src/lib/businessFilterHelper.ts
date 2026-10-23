import { Business } from '../types';
import { getLiveWorkingStatus } from './businessHoursHelper';
import { isBusinessCurrentlyFeatured, compareBusinessesByTier } from './vipHelper';

export type SortTab = 'all' | 'featured' | 'popular' | 'top_rated' | 'recent';
export type DeliveryFilterOption = 'all' | 'available' | 'unavailable';
export type PaymentMethodOption = 'all' | 'cash' | 'card' | 'cliq';

export interface AppliedBusinessFilters {
  activeTab: SortTab;
  regionFilter: string;
  categoryFilter: string;
  subCategoryFilter: string;
  openNowFilter: boolean;
  favoritesOnly: boolean;
  deliveryFilter: DeliveryFilterOption;
  hasOffersOnly: boolean;
  paymentMethodFilter: PaymentMethodOption;
}

export function matchBusinessCategory(
  b: Business,
  categoryFilter: string,
  subCategoryFilter: string,
  categories: { name: string; subcategories?: string[] }[]
): boolean {
  if (!categoryFilter) return true;
  const targetCat = categories.find(c => c.name === categoryFilter);
  const validSubCats = targetCat?.subcategories || [];
  const bizCat = b.category || "";
  const bizSubCat = (b as any).subCategory || (b as any).subcategory || "";

  if (subCategoryFilter) {
    if (subCategoryFilter.includes('أسنان') || subCategoryFilter.includes('اسنان')) {
      return bizCat.includes('أسنان') || bizCat.includes('اسنان') || bizSubCat.includes('أسنان') || bizSubCat.includes('اسنان');
    } else if (subCategoryFilter.includes('مستشفيات')) {
      return bizCat.includes('مستشف') || bizSubCat.includes('مستشف');
    } else if (subCategoryFilter.includes('صيدل')) {
      return bizCat.includes('صيدل') || bizSubCat.includes('صيدل');
    } else if (subCategoryFilter.includes('مختبر')) {
      return bizCat.includes('مختبر') || bizCat.includes('أشعة') || bizCat.includes('بصر') || bizSubCat.includes('مختبر');
    } else if (subCategoryFilter.includes('عيادات أطباء')) {
      return (bizCat.includes('عياد') || bizCat.includes('طبيب') || bizCat.includes('دكتور')) && !bizCat.includes('أسنان') && !bizCat.includes('اسنان') && !bizCat.includes('بيطر');
    } else if (subCategoryFilter.includes('علاج طبيعي')) {
      return bizCat.includes('علاج') || bizSubCat.includes('علاج');
    } else if (subCategoryFilter.includes('بيطر')) {
      return bizCat.includes('بيطر') || bizSubCat.includes('بيطر');
    } else {
      return bizCat === subCategoryFilter || bizSubCat === subCategoryFilter;
    }
  } else {
    if (categoryFilter.includes('صحة وطب')) {
      return bizCat.includes('صحة') || bizCat.includes('طب') || bizCat.includes('عياد') || bizCat.includes('مستشف') || bizCat.includes('صيدل') || bizCat.includes('مختبر') || bizCat.includes('علاج') || bizCat.includes('أسنان') || bizCat.includes('اسنان') || bizCat.includes('بيطر') || validSubCats.includes(bizCat);
    } else {
      return bizCat === categoryFilter || validSubCats.includes(bizCat) || validSubCats.includes(bizSubCat);
    }
  }
}

export function matchBusinessOffers(
  b: Business,
  businessIdsWithOffers: Set<string>,
  businessNamesWithOffers: Set<string>
): boolean {
  if (businessIdsWithOffers.has(b.id)) return true;
  if (b.name && businessNamesWithOffers.has(b.name.trim())) return true;
  if ((b as any).hasOffers || (typeof (b as any).offersCount === 'number' && (b as any).offersCount > 0)) return true;
  if (typeof b.giftCodeDiscountPercent === 'number' && b.giftCodeDiscountPercent > 0) return true;
  if ((b as any).attachedItem?.type === 'offer') return true;
  const desc = (b.description || '').toLowerCase();
  if (desc.includes('خصم') || desc.includes('عروض') || desc.includes('تخفيض') || desc.includes('تنزيلات') || desc.includes('offer') || desc.includes('discount')) {
    return true;
  }
  return false;
}

export function matchBusinessPayment(b: Business, method: PaymentMethodOption): boolean {
  if (method === 'all') return true;
  const methods: string[] = b.paymentMethods || (b as any).medicalProfile?.paymentMethods || ['كاش', 'فيزا', 'كليك'];
  const joined = methods.join(' ').toLowerCase();
  const desc = (b.description || '').toLowerCase();

  if (method === 'cash') {
    return joined.includes('كاش') || joined.includes('نقد') || joined.includes('cash') || !methods.length;
  }
  if (method === 'card') {
    return joined.includes('فيزا') || joined.includes('بطاق') || joined.includes('ماستركارد') || joined.includes('ائتمان') || joined.includes('visa') || joined.includes('card') || desc.includes('فيزا') || desc.includes('بطاقة');
  }
  if (method === 'cliq') {
    return joined.includes('كليك') || joined.includes('cliq') || desc.includes('كليك') || desc.includes('cliq');
  }
  return true;
}

export function matchBusinessDelivery(b: Business, delivery: DeliveryFilterOption): boolean {
  if (delivery === 'all') return true;
  const hasDelivery = Boolean(
    b.deliveryAvailable || 
    (b.description && (b.description.includes('توصيل') || b.description.toLowerCase().includes('delivery')))
  );
  return delivery === 'available' ? hasDelivery : !hasDelivery;
}

export function countMatchingBusinesses(
  businesses: Business[],
  filters: AppliedBusinessFilters,
  options: {
    categories: { name: string; subcategories?: string[] }[];
    userFavorites: string[];
    businessIdsWithOffers: Set<string>;
    businessNamesWithOffers: Set<string>;
  }
): number {
  const now = Date.now();
  return businesses.filter(b => {
    // 1. Category
    if (!matchBusinessCategory(b, filters.categoryFilter, filters.subCategoryFilter, options.categories)) {
      return false;
    }

    // 2. Region
    if (filters.regionFilter && filters.regionFilter !== 'الكل') {
      const match = b.district === filters.regionFilter || (b.address || '').includes(filters.regionFilter);
      if (!match) return false;
    }

    // 3. Open Now
    if (filters.openNowFilter) {
      const status = getLiveWorkingStatus(b.workingHours);
      if (!status.isOpen) return false;
    }

    // 4. Favorites Only
    if (filters.favoritesOnly) {
      if (!options.userFavorites.includes(b.id)) return false;
    }

    // 5. Delivery
    if (!matchBusinessDelivery(b, filters.deliveryFilter)) {
      return false;
    }

    // 6. Offers / Discounts Only
    if (filters.hasOffersOnly) {
      if (!matchBusinessOffers(b, options.businessIdsWithOffers, options.businessNamesWithOffers)) {
        return false;
      }
    }

    // 7. Payment Method
    if (!matchBusinessPayment(b, filters.paymentMethodFilter)) {
      return false;
    }

    // 8. Featured Tab Filter
    if (filters.activeTab === 'featured') {
      if (!isBusinessCurrentlyFeatured(b, now)) return false;
    }

    return true;
  }).length;
}
