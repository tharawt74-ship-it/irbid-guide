import { collection, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { invalidateCache } from './dataCache';

/**
 * Performs a cascading deletion for a business:
 * Deletes the business document itself, and all associated items:
 * - Offers (العروض والتخفيضات)
 * - Jobs (الوظائف الشاغرة)
 * - Banners (الإعلانات والبنرات)
 * - Marketing requests (طلبات التسويق)
 * - Reviews & Review Reports (التقييمات والبلاغات)
 * - Edit suggestions (مقترحات التعديل)
 */
export async function deleteBusinessCascading(businessId: string, businessName?: string): Promise<void> {
  if (!db || !businessId) return;

  try {
    // 1. Delete the business document itself
    await deleteDoc(doc(db, 'businesses', businessId)).catch(() => {});

    // 2. Delete linked Offers
    try {
      const offersSnap = await getDocs(query(collection(db, 'offers'), where('businessId', '==', businessId)));
      for (const d of offersSnap.docs) {
        await deleteDoc(doc(db, 'offers', d.id)).catch(() => {});
      }
      if (businessName) {
        const offersNameSnap = await getDocs(query(collection(db, 'offers'), where('businessName', '==', businessName)));
        for (const d of offersNameSnap.docs) {
          await deleteDoc(doc(db, 'offers', d.id)).catch(() => {});
        }
      }
    } catch (e) {
      console.warn("Error cascading delete offers:", e);
    }

    // 3. Delete linked Jobs
    try {
      const jobsSnap = await getDocs(query(collection(db, 'jobs'), where('businessId', '==', businessId)));
      for (const d of jobsSnap.docs) {
        await deleteDoc(doc(db, 'jobs', d.id)).catch(() => {});
      }
      if (businessName) {
        const jobsNameSnap = await getDocs(query(collection(db, 'jobs'), where('company', '==', businessName)));
        for (const d of jobsNameSnap.docs) {
          await deleteDoc(doc(db, 'jobs', d.id)).catch(() => {});
        }
      }
    } catch (e) {
      console.warn("Error cascading delete jobs:", e);
    }

    // 4. Delete linked Banners
    try {
      await deleteDoc(doc(db, 'banners', `business_banner_${businessId}`)).catch(() => {});
      const bannersSnap = await getDocs(query(collection(db, 'banners'), where('businessId', '==', businessId)));
      for (const d of bannersSnap.docs) {
        await deleteDoc(doc(db, 'banners', d.id)).catch(() => {});
      }
    } catch (e) {
      console.warn("Error cascading delete banners:", e);
    }

    // 5. Delete linked Marketing Requests
    try {
      const mktSnap = await getDocs(query(collection(db, 'marketingRequests'), where('businessId', '==', businessId)));
      for (const d of mktSnap.docs) {
        await deleteDoc(doc(db, 'marketingRequests', d.id)).catch(() => {});
      }
    } catch (e) {
      console.warn("Error cascading delete marketing requests:", e);
    }

    // 6. Delete linked Reviews
    try {
      const reviewsSnap = await getDocs(query(collection(db, 'reviews'), where('businessId', '==', businessId)));
      for (const d of reviewsSnap.docs) {
        await deleteDoc(doc(db, 'reviews', d.id)).catch(() => {});
      }
    } catch (e) {
      console.warn("Error cascading delete reviews:", e);
    }

    // 7. Delete linked Review Reports
    try {
      const reportsSnap = await getDocs(query(collection(db, 'review_reports'), where('businessId', '==', businessId)));
      for (const d of reportsSnap.docs) {
        await deleteDoc(doc(db, 'review_reports', d.id)).catch(() => {});
      }
    } catch (e) {
      console.warn("Error cascading delete review reports:", e);
    }

    // 8. Delete linked Edit Suggestions
    try {
      const suggestionsSnap = await getDocs(query(collection(db, 'edit_suggestions'), where('businessId', '==', businessId)));
      for (const d of suggestionsSnap.docs) {
        await deleteDoc(doc(db, 'edit_suggestions', d.id)).catch(() => {});
      }
    } catch (e) {
      console.warn("Error cascading delete edit suggestions:", e);
    }

    invalidateCache();
  } catch (err) {
    console.error("Fatal error in deleteBusinessCascading:", err);
    throw err;
  }
}
