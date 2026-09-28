import { collection, query, where, getDocs, doc, writeBatch, DocumentReference } from 'firebase/firestore';
import { db } from './firebase';
import { invalidateCache } from './dataCache';

/**
 * Performs an optimized batched cascading deletion for a business:
 * Deletes the business document itself, and all associated items:
 * - Offers (العروض والتخفيضات)
 * - Jobs (الوظائف الشاغرة)
 * - Banners (الإعلانات والبنرات)
 * - Marketing requests (طلبات التسويق)
 * - Reviews & Review Reports (التقييمات والبلاغات)
 * - Edit suggestions (مقترحات التعديل)
 * - Business Posts & QR codes
 * 
 * Uses Firestore writeBatch in chunks <= 450 items to eliminate N+1 latency & roundtrip bottlenecks.
 */
export async function deleteBusinessCascading(businessId: string, businessName?: string): Promise<void> {
  if (!db || !businessId) return;

  try {
    const refsToDelete: DocumentReference[] = [];

    // 1. Target business document
    refsToDelete.push(doc(db, 'businesses', businessId));
    refsToDelete.push(doc(db, 'banners', `business_banner_${businessId}`));

    // 2. Query all linked collections in parallel
    const queryPromises = [
      getDocs(query(collection(db, 'offers'), where('businessId', '==', businessId))),
      getDocs(query(collection(db, 'jobs'), where('businessId', '==', businessId))),
      getDocs(query(collection(db, 'banners'), where('businessId', '==', businessId))),
      getDocs(query(collection(db, 'marketingRequests'), where('businessId', '==', businessId))),
      getDocs(query(collection(db, 'reviews'), where('businessId', '==', businessId))),
      getDocs(query(collection(db, 'review_reports'), where('businessId', '==', businessId))),
      getDocs(query(collection(db, 'edit_suggestions'), where('businessId', '==', businessId))),
      getDocs(query(collection(db, 'business_posts'), where('businessId', '==', businessId)))
    ];

    if (businessName) {
      queryPromises.push(
        getDocs(query(collection(db, 'offers'), where('businessName', '==', businessName))),
        getDocs(query(collection(db, 'jobs'), where('company', '==', businessName)))
      );
    }

    const queryResults = await Promise.allSettled(queryPromises);

    const seenPaths = new Set<string>();
    seenPaths.add(`businesses/${businessId}`);
    seenPaths.add(`banners/business_banner_${businessId}`);

    for (const res of queryResults) {
      if (res.status === 'fulfilled' && res.value?.docs) {
        for (const d of res.value.docs) {
          if (!seenPaths.has(d.ref.path)) {
            seenPaths.add(d.ref.path);
            refsToDelete.push(d.ref);
          }
        }
      }
    }

    // 3. Execute deletions using writeBatch in batches of 450 (Firestore limit is 500 ops per batch)
    const BATCH_SIZE = 450;
    for (let i = 0; i < refsToDelete.length; i += BATCH_SIZE) {
      const chunk = refsToDelete.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const ref of chunk) {
        batch.delete(ref);
      }
      await batch.commit().catch(err => {
        console.warn('Batch deletion chunk warning:', err);
      });
    }

    invalidateCache();
  } catch (err) {
    console.error("Fatal error in deleteBusinessCascading:", err);
    throw err;
  }
}
