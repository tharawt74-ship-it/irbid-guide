import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Synchronizes a user's updated display name across all past reviews, ratings, and comments in Firestore.
 */
export async function syncUserReviewsDisplayName(userId: string, newDisplayName: string): Promise<void> {
  if (!db || !userId || !newDisplayName?.trim()) return;

  const cleanName = newDisplayName.trim();

  try {
    // Sync 'reviews' collection where userId matches
    const reviewsRef = collection(db, 'reviews');
    const reviewsQuery = query(reviewsRef, where('userId', '==', userId));
    const reviewsSnapshot = await getDocs(reviewsQuery);

    if (!reviewsSnapshot.empty) {
      const docs = reviewsSnapshot.docs;
      const batchSize = 400;

      for (let i = 0; i < docs.length; i += batchSize) {
        const chunk = docs.slice(i, i + batchSize);
        const batch = writeBatch(db);
        chunk.forEach(docSnap => {
          batch.update(docSnap.ref, {
            userName: cleanName,
            authorName: cleanName
          });
        });
        await batch.commit();
      }
    }
  } catch (error) {
    console.warn("Could not sync user reviews display name:", error);
  }
}
