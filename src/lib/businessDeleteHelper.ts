import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, writeBatch, getDoc, DocumentReference } from 'firebase/firestore';
import { db, storage, auth } from './firebase';
import { ref, deleteObject } from 'firebase/storage';
import { removeBusinessFromAllCaches, removeOfferFromCache, removeJobFromCache } from './dataCache';
import { Business } from '../types';

/**
 * Safely removes a file from Firebase Storage if it matches the bucket URL.
 */
async function safelyDeleteStorageUrl(url?: string | null) {
  if (!storage || !url || typeof url !== 'string') return;
  if (!url.includes('firebasestorage.googleapis.com')) return;
  try {
    const fileRef = ref(storage, url);
    await deleteObject(fileRef).catch(() => null);
  } catch {
    // Non-blocking cleanup
  }
}

/**
 * Performs a comprehensive cascading deletion for a business or medical facility:
 * - Deletes the main business document and child branches
 * - Purges all associated images from storage (logo, cover, menu items, doctor photos, gallery)
 * - Deletes all related items across all collections (offers, jobs, banners, reviews, reports, requests, posts, orders, notifications)
 * - Purges all runtime memory and persistent localStorage caches
 */
export async function deleteBusinessCascading(businessId: string, businessName?: string): Promise<void> {
  if (!db || !businessId) return;

  try {
    const mainBizRef = doc(db, 'businesses', businessId);
    
    // 1. Fetch current document data to discover all image URLs & child details before deletion
    const currentBizSnap = await getDoc(mainBizRef).catch(() => null);
    const bizData = currentBizSnap?.exists() ? currentBizSnap.data() : null;
    const resolvedName = businessName || bizData?.name || '';

    // Collect all image URLs for storage cleanup
    const imageUrlsToDelete: (string | null | undefined)[] = [];
    if (bizData) {
      if (bizData.image) imageUrlsToDelete.push(bizData.image);
      if (bizData.coverImage) imageUrlsToDelete.push(bizData.coverImage);
      if (Array.isArray(bizData.images)) {
        bizData.images.forEach((img: any) => {
          if (typeof img === 'string') imageUrlsToDelete.push(img);
          else if (img?.url) imageUrlsToDelete.push(img.url);
        });
      }
      if (bizData.aboutMedia?.url) imageUrlsToDelete.push(bizData.aboutMedia.url);
      if (bizData.aboutImageUrl) imageUrlsToDelete.push(bizData.aboutImageUrl);
      if (bizData.aboutVideoUrl) imageUrlsToDelete.push(bizData.aboutVideoUrl);

      // Menu items & products photos
      if (Array.isArray(bizData.menuItems)) {
        bizData.menuItems.forEach((item: any) => {
          if (item?.image) imageUrlsToDelete.push(item.image);
          if (Array.isArray(item?.images)) imageUrlsToDelete.push(...item.images);
        });
      }

      // Medical profile staff, amenities & procedures
      if (bizData.medicalProfile) {
        const med = bizData.medicalProfile;
        if (Array.isArray(med.staff)) {
          med.staff.forEach((s: any) => {
            if (s?.photoUrl) imageUrlsToDelete.push(s.photoUrl);
          });
        }
        if (Array.isArray(med.amenities)) {
          med.amenities.forEach((a: any) => {
            if (a?.imageUrl) imageUrlsToDelete.push(a?.imageUrl);
          });
        }
        if (Array.isArray(med.procedures)) {
          med.procedures.forEach((p: any) => {
            if (p?.imageUrl) imageUrlsToDelete.push(p?.imageUrl);
          });
        }
      }
    }

    // 2. Query all linked collections and child branches
    const queryPromises = [
      getDocs(query(collection(db, 'businesses'), where('parentBusinessId', '==', businessId))),
      getDocs(query(collection(db, 'offers'), where('businessId', '==', businessId))),
      getDocs(query(collection(db, 'jobs'), where('businessId', '==', businessId))),
      getDocs(query(collection(db, 'banners'), where('businessId', '==', businessId))),
      getDocs(query(collection(db, 'marketingRequests'), where('businessId', '==', businessId))),
      getDocs(query(collection(db, 'reviews'), where('businessId', '==', businessId))),
      getDocs(query(collection(db, 'review_reports'), where('businessId', '==', businessId))),
      getDocs(query(collection(db, 'edit_suggestions'), where('businessId', '==', businessId))),
      getDocs(query(collection(db, 'business_posts'), where('businessId', '==', businessId))),
      getDocs(query(collection(db, 'businessRequests'), where('businessId', '==', businessId))),
      getDocs(query(collection(db, 'upgradeRequests'), where('businessId', '==', businessId))),
      getDocs(query(collection(db, 'ownership_claims'), where('businessId', '==', businessId))),
      getDocs(query(collection(db, 'orders'), where('businessId', '==', businessId))),
      getDocs(query(collection(db, 'notifications'), where('businessId', '==', businessId))),
      getDocs(query(collection(db, 'notifications'), where('targetId', '==', businessId))),
      getDocs(query(collection(db, 'bannerBookingRequests'), where('businessId', '==', businessId)))
    ];

    if (resolvedName) {
      queryPromises.push(
        getDocs(query(collection(db, 'offers'), where('businessName', '==', resolvedName))),
        getDocs(query(collection(db, 'jobs'), where('company', '==', resolvedName))),
        getDocs(query(collection(db, 'businessRequests'), where('name', '==', resolvedName))),
        getDocs(query(collection(db, 'marketingRequests'), where('businessName', '==', resolvedName)))
      );
    }

    const queryResults = await Promise.allSettled(queryPromises);

    const refsToDelete: DocumentReference[] = [];
    const seenPaths = new Set<string>();

    // Add main biz and direct banner
    refsToDelete.push(mainBizRef);
    seenPaths.add(`businesses/${businessId}`);
    refsToDelete.push(doc(db, 'banners', `business_banner_${businessId}`));
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

    // 3. Direct delete attempt on the main business document first
    try {
      await deleteDoc(mainBizRef);
    } catch (directErr) {
      console.warn('Initial direct deleteDoc notice:', directErr);
    }

    // 4. Batch delete all gathered documents
    const BATCH_SIZE = 450;
    for (let i = 0; i < refsToDelete.length; i += BATCH_SIZE) {
      const chunk = refsToDelete.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const ref of chunk) {
        batch.delete(ref);
      }
      try {
        await batch.commit();
      } catch (batchErr) {
        console.warn('Batch deletion failed, executing fallback individual deletes:', batchErr);
        for (const ref of chunk) {
          await deleteDoc(ref).catch(() => null);
        }
      }
    }

    // 5. Final direct delete check on mainBizRef
    await deleteDoc(mainBizRef).catch(() => null);

    // 6. Delete images from Firebase Storage in background
    Promise.allSettled(
      imageUrlsToDelete.filter(Boolean).map(url => safelyDeleteStorageUrl(url))
    ).catch(() => null);

    // 7. Thoroughly purge all memory and persistent caches
    removeBusinessFromAllCaches(businessId);
  } catch (err) {
    console.error("Fatal error in deleteBusinessCascading:", err);
    throw err;
  }
}

/**
  * Cascading deletion for an offer:
  * - Deletes the offer document from Firestore
  * - Purges local memory and localStorage caches and dispatches cross-tab events
  * - Cleans up all linked notifications from Firestore (client-side and via Admin API)
  * - Reverts associated menu item discounted prices back to original prices
  */
export async function deleteOfferCascading(
  offerId: string,
  businessId?: string,
  business?: Business | null
): Promise<void> {
  if (!offerId) return;

  // 1. Delete the offer document from Firestore
  if (db) {
    try {
      await deleteDoc(doc(db, 'offers', offerId));
    } catch (err) {
      console.warn('Error deleting offer from Firestore:', err);
    }
  }

  // 2. Remove from local memory and localStorage caches and trigger cross-tab sync
  removeOfferFromCache(offerId);

  // 3. Client-side attempt to delete matching notifications in Firestore
  if (db) {
    try {
      const notifPromises = [
        getDocs(query(collection(db, 'notifications'), where('offerId', '==', offerId))),
        getDocs(query(collection(db, 'notifications'), where('targetId', '==', offerId))),
        getDoc(doc(db, 'notifications', `notif_offer_${offerId}`)),
        getDoc(doc(db, 'notifications', offerId))
      ];
      const results = await Promise.allSettled(notifPromises);
      for (const res of results) {
        if (res.status === 'fulfilled') {
          if ('docs' in res.value && Array.isArray((res.value as any).docs)) {
            for (const nDoc of (res.value as any).docs) {
              deleteDoc(doc(db, 'notifications', nDoc.id)).catch(() => {});
            }
          } else if ('exists' in res.value && (res.value as any).exists()) {
            deleteDoc((res.value as any).ref).catch(() => {});
          }
        }
      }
    } catch {
      // non-blocking
    }
  }

  // 4. Server-side notification cleanup via Admin SDK for global broadcast notifications
  try {
    const token = await auth?.currentUser?.getIdToken();
    if (token) {
      fetch('/api/notifications/delete-linked', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          entityType: 'offer',
          entityId: offerId,
          businessId: businessId || business?.id
        })
      }).catch(() => {});
    }
  } catch {
    // non-blocking
  }

  // 5. Price Reversion Lifecycle: Revert any menu items linked to this deleted offer
  if (db && business && Array.isArray(business.menuItems)) {
    let hasReverted = false;
    const updatedMenuItems = business.menuItems.map((item: any) => {
      if (item.activeOfferId === offerId && item.originalPrice) {
        hasReverted = true;
        const reverted = { ...item, price: item.originalPrice };
        delete reverted.originalPrice;
        delete reverted.activeOfferId;
        return reverted;
      }
      return item;
    });
    if (hasReverted && business.id) {
      try {
        await updateDoc(doc(db, 'businesses', business.id), { menuItems: updatedMenuItems });
      } catch (mErr) {
        console.warn('Error reverting menu item prices on offer deletion:', mErr);
      }
    }
  }
}

/**
  * Cascading deletion for a job:
  * - Deletes the job document from Firestore
  * - Purges local memory and localStorage caches and dispatches cross-tab events
  * - Cleans up all linked notifications from Firestore (client-side and via Admin API)
  */
export async function deleteJobCascading(
  jobId: string,
  businessId?: string
): Promise<void> {
  if (!jobId) return;

  // 1. Delete the job document from Firestore
  if (db) {
    try {
      await deleteDoc(doc(db, 'jobs', jobId));
    } catch (err) {
      console.warn('Error deleting job from Firestore:', err);
    }
  }

  // 2. Remove from local memory and localStorage caches and trigger cross-tab sync
  removeJobFromCache(jobId);

  // 3. Client-side attempt to delete matching notifications in Firestore
  if (db) {
    try {
      const notifPromises = [
        getDocs(query(collection(db, 'notifications'), where('jobId', '==', jobId))),
        getDocs(query(collection(db, 'notifications'), where('targetId', '==', jobId))),
        getDoc(doc(db, 'notifications', `notif_job_${jobId}`)),
        getDoc(doc(db, 'notifications', jobId))
      ];
      const results = await Promise.allSettled(notifPromises);
      for (const res of results) {
        if (res.status === 'fulfilled') {
          if ('docs' in res.value && Array.isArray((res.value as any).docs)) {
            for (const nDoc of (res.value as any).docs) {
              deleteDoc(doc(db, 'notifications', nDoc.id)).catch(() => {});
            }
          } else if ('exists' in res.value && (res.value as any).exists()) {
            deleteDoc((res.value as any).ref).catch(() => {});
          }
        }
      }
    } catch {
      // non-blocking
    }
  }

  // 4. Server-side notification cleanup via Admin SDK
  try {
    const token = await auth?.currentUser?.getIdToken();
    if (token) {
      fetch('/api/notifications/delete-linked', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          entityType: 'job',
          entityId: jobId,
          businessId
        })
      }).catch(() => {});
    }
  } catch {
    // non-blocking
  }
}

