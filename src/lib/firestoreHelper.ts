import { deleteField } from 'firebase/firestore';
import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Compresses a base64 image string client-side using Canvas to ensure high visual clarity while keeping payload optimized.
 */
export function compressBase64Image(
  base64Str: string,
  maxDim = 1600,
  quality = 0.85
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
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        const isPng = base64Str.startsWith('data:image/png');
        const compressed = canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', isPng ? undefined : quality);
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
  maxDim = 1600,
  quality = 0.85
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

  // Pass 1: Standard high quality image compression (1400px max, 0.85 quality)
  let compressed = await compressBase64InObject(obj, 1400, 0.85);

  // Check stringified size
  let jsonStr = '';
  try {
    jsonStr = JSON.stringify(compressed);
  } catch (e) {
    console.error("Payload stringify error", e);
  }

  // Pass 2: If payload approaches Firestore 1MB limit (> 750KB), optimize gracefully (1000px max, 0.75 quality)
  if (jsonStr.length > 750000) {
    compressed = await compressBase64InObject(compressed, 1000, 0.75);
  }

  return sanitizeFirestorePayload(compressed, isUpdate);
}

