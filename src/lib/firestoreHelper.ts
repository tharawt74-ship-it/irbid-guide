import { deleteField } from 'firebase/firestore';

/**
 * Compresses a base64 image string client-side using Canvas to ensure it stays small (<50KB).
 */
export function compressBase64Image(
  base64Str: string,
  maxDim = 800,
  quality = 0.65
): Promise<string> {
  return new Promise((resolve) => {
    if (
      !base64Str ||
      typeof base64Str !== 'string' ||
      !base64Str.startsWith('data:image/') ||
      base64Str.length < 35000 ||
      typeof window === 'undefined'
    ) {
      return resolve(base64Str);
    }

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, w);
        canvas.height = Math.max(1, h);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(base64Str);
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        if (compressed && compressed.length < base64Str.length) {
          resolve(compressed);
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => resolve(base64Str);
      img.src = base64Str;
    } catch (_) {
      resolve(base64Str);
    }
  });
}

/**
 * Recursively traverses an object/array and compresses any Base64 data URLs.
 */
export async function compressBase64InObject(
  obj: any,
  maxDim = 800,
  quality = 0.65
): Promise<any> {
  if (!obj || typeof obj !== 'object') {
    if (typeof obj === 'string' && obj.startsWith('data:image/') && obj.length > 35000) {
      return await compressBase64Image(obj, maxDim, quality);
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    const newArr = [];
    for (const item of obj) {
      newArr.push(await compressBase64InObject(item, maxDim, quality));
    }
    return newArr;
  }

  const newObj: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    newObj[key] = await compressBase64InObject(obj[key], maxDim, quality);
  }
  return newObj;
}

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

/**
 * Asynchronously compresses all base64 data URLs in a payload and sanitizes it for Firestore.
 * Ensures the payload strictly stays well below Firestore's 1MB limit.
 */
export async function compressAndSanitizeFirestorePayload<T extends Record<string, any>>(
  obj: T,
  isUpdate = true
): Promise<Record<string, any>> {
  if (!obj) return obj;

  // Pass 1: Standard image compression (600px max, 0.60 quality)
  let compressed = await compressBase64InObject(obj, 600, 0.60);

  // Check stringified size
  let jsonStr = '';
  try {
    jsonStr = JSON.stringify(compressed);
  } catch (e) {
    console.error("Payload stringify error", e);
  }

  // Pass 2: If still > 500KB, aggressive pass (400px max, 0.40 quality)
  if (jsonStr.length > 500000) {
    compressed = await compressBase64InObject(compressed, 400, 0.40);
  }

  return sanitizeFirestorePayload(compressed, isUpdate);
}

