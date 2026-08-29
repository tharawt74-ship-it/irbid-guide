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
  if (onProgress) onProgress(30);

  // Step 2: Try Firebase Storage upload if initialized
  if (storage) {
    try {
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${compressed.file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const storageRef = ref(storage, `${folder}/${fileName}`);

      return new Promise<UploadResult>((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, compressed.file);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 60) + 30; // 30% -> 90%
            if (onProgress) onProgress(pct);
          },
          (error) => {
            console.warn("Firebase Storage upload failed, switching to Base64 fallback:", error);
            // Fallback to Base64 Data URL if storage rules block or storage fails
            convertFileToBase64(compressed.file).then((base64Url) => {
              if (onProgress) onProgress(100);
              resolve({
                url: base64Url,
                originalSize: compressed.originalSize,
                compressedSize: compressed.compressedSize,
                savedPercentage: compressed.ratio,
                storageMethod: 'base64_fallback'
              });
            }).catch(reject);
          },
          async () => {
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
              const base64Url = await convertFileToBase64(compressed.file);
              if (onProgress) onProgress(100);
              resolve({
                url: base64Url,
                originalSize: compressed.originalSize,
                compressedSize: compressed.compressedSize,
                savedPercentage: compressed.ratio,
                storageMethod: 'base64_fallback'
              });
            }
          }
        );
      });
    } catch (e) {
      console.warn("Storage exception, using Base64 fallback:", e);
    }
  }

  // Fallback if Firebase Storage instance is null
  const base64Url = await convertFileToBase64(compressed.file);
  if (onProgress) onProgress(100);
  return {
    url: base64Url,
    originalSize: compressed.originalSize,
    compressedSize: compressed.compressedSize,
    savedPercentage: compressed.ratio,
    storageMethod: 'base64_fallback'
  };
}

function convertFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
