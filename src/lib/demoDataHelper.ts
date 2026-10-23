import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase';

export interface AppConfig {
  showDemoData: boolean;
  priceBasic?: number;
  priceSilver?: number;
  priceGolden?: number;
  priceSponsored?: number; // Business Top Search
  priceSponsoredProduct?: number; // Single Product Top Search
  priceSponsoredMenu?: number; // Full Menu Top Search
  priceSponsoredOffer?: number; // Single Offer Top Search
  priceSponsoredOffersGroup?: number; // Multiple Offers Top Search
  priceSponsoredJob?: number; // Single Job Top Search
  priceSponsoredJobsGroup?: number; // Multiple Jobs Top Search
  priceSponsoredAllInclusive?: number; // All-inclusive Top Search
  pricePushNotifications?: number;
  priceHomepageBanner?: number;
  pricePromoCard?: number;
  priceMessaging1Month?: number;
  priceMessaging3Months?: number;
  priceMessaging6Months?: number;
  priceMessaging1Year?: number;
  priceHousingExtraWeek?: number;
  priceHousingFeatured3Days?: number;
  enableAiAssistant?: boolean;
}

export const DEFAULT_APP_CONFIG: AppConfig = {
  showDemoData: false,
  enableAiAssistant: true,
  priceBasic: 0,
  priceSilver: 5,
  priceGolden: 12,
  priceSponsored: 15,
  priceSponsoredProduct: 7,
  priceSponsoredMenu: 12,
  priceSponsoredOffer: 6,
  priceSponsoredOffersGroup: 12,
  priceSponsoredJob: 8,
  priceSponsoredJobsGroup: 14,
  priceSponsoredAllInclusive: 25,
  pricePushNotifications: 10,
  priceHomepageBanner: 25,
  pricePromoCard: 20,
  priceMessaging1Month: 5,
  priceMessaging3Months: 12,
  priceMessaging6Months: 20,
  priceMessaging1Year: 35
};

export async function getAppConfig(): Promise<AppConfig> {
  if (!db) return DEFAULT_APP_CONFIG;
  try {
    const configDoc = await getDoc(doc(db, 'settings', 'appConfig'));
    if (configDoc.exists()) {
      return { ...DEFAULT_APP_CONFIG, ...configDoc.data() } as AppConfig;
    }
  } catch (err) {
    console.warn("Could not fetch appConfig:", err);
  }
  return DEFAULT_APP_CONFIG;
}

export async function setAppConfig(config: Partial<AppConfig>): Promise<void> {
  if (!db) return;
  try {
    await setDoc(doc(db, 'settings', 'appConfig'), config, { merge: true });
  } catch (err) {
    console.error("Error setting appConfig:", err);
  }
}

export const DEMO_SEED_DATA = {
  businesses: [] as any[],
  housings: [] as any[],
  jobs: [] as any[],
  news: [] as any[],
  offers: [] as any[],
  notifications: [] as any[]
};

export async function seedDemoDataToFirestore(): Promise<{ count: number; businessesCount: number }> {
  return { count: 0, businessesCount: 0 };
}

export async function clearDemoDataFromFirestore(): Promise<{ count: number }> {
  if (!db) return { count: 0 };

  let totalDeleted = 0;
  const collectionsToClean = ['businesses', 'jobs', 'news', 'offers', 'notifications', 'housings'];

  for (const colName of collectionsToClean) {
    try {
      const q = query(collection(db, colName), where('isDemo', '==', true));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(doc(db, colName, d.id));
        totalDeleted++;
      }
    } catch (err) {
      console.warn(`Error cleaning demo data from ${colName}:`, err);
    }
  }

  return { count: totalDeleted };
}
