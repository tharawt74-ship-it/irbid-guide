import { deleteField } from 'firebase/firestore';

/**
 * Sanitizes an object payload before saving to Firebase Firestore.
 * Firestore throws an error if an object contains any `undefined` properties.
 * 
 * - When `isUpdate` is true (for updateDoc): `undefined` properties are converted to `deleteField()` so Firestore removes them cleanly.
 * - When `isUpdate` is false (for setDoc): `undefined` properties are omitted/deleted from the payload.
 */
export function sanitizeFirestorePayload<T extends Record<string, any>>(obj: T, isUpdate = true): Record<string, any> {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized: Record<string, any> = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];

    if (value === undefined) {
      if (isUpdate) {
        sanitized[key] = deleteField();
      }
      // If setDoc (not update), omit the undefined key
    } else if (value !== null && typeof value === 'object' && !(value instanceof Date) && typeof value.toDate !== 'function') {
      if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          item !== null && typeof item === 'object' ? sanitizeFirestorePayload(item, false) : item
        );
      } else {
        // Plain object map inside document
        sanitized[key] = sanitizeFirestorePayload(value, false);
      }
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
