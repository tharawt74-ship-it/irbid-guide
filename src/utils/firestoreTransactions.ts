import { 
  doc, 
  collection, 
  runTransaction, 
  writeBatch, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  getDocs, 
  DocumentSnapshot,
  Firestore,
  increment
} from 'firebase/firestore';

/**
 * Result of submitting a review atomically.
 */
export interface AtomicReviewResult {
  reviewId: string;
  newAverageRating: number;
  newReviewCount: number;
}

/**
 * Safely and atomically adds a review and recalculates the business average rating
 * inside a single Firestore Transaction, completely eliminating Race Conditions.
 */
export async function submitReviewAtomically(
  db: Firestore,
  businessId: string,
  reviewData: {
    userId: string;
    userName: string;
    userPhone?: string;
    rating: number;
    comment: string;
    deviceFingerprint?: string;
    recaptchaToken?: string;
    createdAt?: number;
  }
): Promise<AtomicReviewResult> {
  const reviewRef = doc(collection(db, 'reviews'));
  const businessRef = doc(db, 'businesses', businessId);
  
  // Determine unique lock ID to prevent same-account multi-device or guest multi-device reviews within 24h
  let lockId = `${reviewData.userId}_${businessId}`;
  if (reviewData.userPhone) {
    const cleanPhone = reviewData.userPhone.trim();
    if (cleanPhone) {
      lockId = `phone_${cleanPhone}_${businessId}`;
    }
  }
  const lockRef = doc(db, 'reviews_locks', lockId);
  const ratingValue = Math.min(5, Math.max(1, Number(reviewData.rating) || 5));

  const result = await runTransaction(db, async (transaction) => {
    // 0. Rate limiting check inside transaction to block multi-device concurrent bypasses
    const lockSnap = await transaction.get(lockRef);
    if (lockSnap.exists()) {
      const lockData = lockSnap.data();
      const lastCreated = Number(lockData?.createdAt) || 0;
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
      if (Date.now() - lastCreated < TWENTY_FOUR_HOURS) {
        throw new Error('LIMIT_EXCEEDED');
      }
    }

    const businessDoc = await transaction.get(businessRef);
    if (!businessDoc.exists()) {
      throw new Error(`Business with ID ${businessId} not found.`);
    }

    const bizData = businessDoc.data() || {};
    const currentCount = Number(bizData.reviewCount) || 0;
    const currentAvg = Number(bizData.rating) || 5;
    
    // If ratingSum is maintained, use it, otherwise derive from currentAvg * currentCount
    const currentSum = typeof bizData.ratingSum === 'number' 
      ? bizData.ratingSum 
      : (currentCount > 0 ? currentAvg * currentCount : 0);

    const newReviewCount = currentCount + 1;
    const newRatingSum = currentSum + ratingValue;
    const newAverageRating = Number((newRatingSum / newReviewCount).toFixed(1));

    // 1. Create review doc
    transaction.set(reviewRef, {
      ...reviewData,
      businessId,
      rating: ratingValue,
      createdAt: reviewData.createdAt || Date.now()
    });

    // 1b. Create or update the rate-limit lock document
    transaction.set(lockRef, {
      createdAt: Date.now(),
      userId: reviewData.userId,
      userPhone: reviewData.userPhone || '',
      businessId
    });

    // 2. Update business rating, reviewCount, and ratingSum atomically
    transaction.update(businessRef, {
      rating: newAverageRating,
      reviewCount: newReviewCount,
      ratingSum: newRatingSum
    });

    return {
      reviewId: reviewRef.id,
      newAverageRating,
      newReviewCount
    };
  });

  return result;
}

/**
 * Helper to perform atomic batch deletes in chunks of 500 (Firestore maximum)
 */
export async function deleteDocumentsInBatch(
  db: Firestore,
  collectionName: string,
  docIds: string[]
): Promise<number> {
  if (!docIds || docIds.length === 0) return 0;

  const BATCH_SIZE = 450;
  let totalDeleted = 0;

  for (let i = 0; i < docIds.length; i += BATCH_SIZE) {
    const chunk = docIds.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const id of chunk) {
      batch.delete(doc(db, collectionName, id));
    }

    await batch.commit();
    totalDeleted += chunk.length;
  }

  return totalDeleted;
}

/**
 * Helper to perform atomic batch updates in chunks of 500
 */
export async function updateDocumentsInBatch(
  db: Firestore,
  collectionName: string,
  updates: { id: string; data: Record<string, any> }[]
): Promise<number> {
  if (!updates || updates.length === 0) return 0;

  const BATCH_SIZE = 450;
  let totalUpdated = 0;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const chunk = updates.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);

    for (const item of chunk) {
      batch.update(doc(db, collectionName, item.id), item.data);
    }

    await batch.commit();
    totalUpdated += chunk.length;
  }

  return totalUpdated;
}

/**
 * Standard Paginated Query Helper with cursor support and default limits
 */
export interface PaginatedResult<T> {
  items: T[];
  lastVisible: DocumentSnapshot | null;
  hasMore: boolean;
}

export async function fetchPaginatedCollection<T>(
  db: Firestore,
  collectionName: string,
  options: {
    pageSize?: number;
    lastDoc?: DocumentSnapshot | null;
    orderByField?: string;
    orderDirection?: 'asc' | 'desc';
    whereFilters?: [string, any, any][];
  } = {}
): Promise<PaginatedResult<T>> {
  const {
    pageSize = 30,
    lastDoc = null,
    orderByField = 'createdAt',
    orderDirection = 'desc',
    whereFilters = []
  } = options;

  let qConstraints: any[] = [
    collection(db, collectionName),
    orderBy(orderByField, orderDirection),
    limit(pageSize + 1) // Fetch 1 extra to check if there is a next page
  ];

  for (const [field, op, val] of whereFilters) {
    qConstraints.push(where(field, op, val));
  }

  if (lastDoc) {
    qConstraints.push(startAfter(lastDoc));
  }

  const queryRef = query(qConstraints[0], ...qConstraints.slice(1));
  const snap = await getDocs(queryRef);

  const docs = snap.docs;
  const hasMore = docs.length > pageSize;
  const slicedDocs = hasMore ? docs.slice(0, pageSize) : docs;

  const items = slicedDocs.map(d => ({ id: d.id, ...(d.data() as Record<string, any>) } as T));
  const lastVisible = slicedDocs.length > 0 ? slicedDocs[slicedDocs.length - 1] : null;

  return {
    items,
    lastVisible,
    hasMore
  };
}
