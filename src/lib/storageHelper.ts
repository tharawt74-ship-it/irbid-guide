import { storage } from './firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { compressImage } from './imageCompression';

export interface UploadOptions {
  folder?: string; // e.g. 'businesses', 'menus', 'offers', 'avatars'
  onProgress?: (progress: number) => void;
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export interface UploadResult {
  url: string;
  originalSize: number;
  compressedSize: number;
  savedPercentage: number;
  storageMethod: 'firebase_storage' | 'base64_fallback';
}

/**
 * Compresses an image file client-side and uploads it to Firebase Storage.
 * Provides fallback to Base64 data URL if Firebase Storage is unavailable.
 */
export async function uploadAndCompressImage(
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> {
  const {
    folder = 'uploads',
    onProgress,
    maxWidth = 1600,
    maxHeight = 1600,
    quality = 0.82
  } = options;

  // Step 1: Compress image client-side
  if (onProgress) onProgress(10);
  const compressed = await compressImage(file, maxWidth, maxHeight, quality);
  if (onProgress) onProgress(35);

  const fallbackToBase64 = async (): Promise<UploadResult> => {
    if (onProgress) onProgress(70);
    const base64Url = await convertFileToBase64(compressed.file);
    if (onProgress) onProgress(100);
    return {
      url: base64Url,
      originalSize: compressed.originalSize,
      compressedSize: compressed.compressedSize,
      savedPercentage: compressed.ratio,
      storageMethod: 'base64_fallback'
    };
  };

  // Step 2: Try Firebase Storage upload with safety timeout (5 seconds)
  if (storage) {
    try {
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${compressed.file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const storageRef = ref(storage, `${folder}/${fileName}`);

      return await new Promise<UploadResult>((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, compressed.file);
        let isDone = false;

        // Safety timeout: If Firebase Storage upload stalls for more than 4 seconds, cancel and use Base64
        const timeoutId = setTimeout(() => {
          if (!isDone) {
            isDone = true;
            try { uploadTask.cancel(); } catch (_) {}
            console.warn("Firebase Storage upload timed out, falling back to Base64 instantly.");
            fallbackToBase64().then(resolve).catch(reject);
          }
        }, 4000);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            if (isDone) return;
            const pct = snapshot.totalBytes > 0 
              ? Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 60) + 35 
              : 35;
            if (onProgress) onProgress(Math.min(95, pct));
          },
          (error) => {
            if (isDone) return;
            isDone = true;
            clearTimeout(timeoutId);
            console.warn("Firebase Storage upload failed, switching to Base64 fallback:", error);
            fallbackToBase64().then(resolve).catch(reject);
          },
          async () => {
            if (isDone) return;
            isDone = true;
            clearTimeout(timeoutId);
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              if (onProgress) onProgress(100);
              resolve({
                url: downloadUrl,
                originalSize: compressed.originalSize,
                compressedSize: compressed.compressedSize,
                savedPercentage: compressed.ratio,
                storageMethod: 'firebase_storage'
              });
            } catch (err) {
              console.warn("Failed to get download URL, using Base64 fallback:", err);
              fallbackToBase64().then(resolve).catch(reject);
            }
          }
        );
      });
    } catch (e) {
      console.warn("Storage exception, using Base64 fallback:", e);
      return await fallbackToBase64();
    }
  }

  // Fallback if Firebase Storage instance is null
  return await fallbackToBase64();
}

function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
