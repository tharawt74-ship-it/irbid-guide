/**
 * Client-side image compression utility.
 * Resizes large images to max dimensions and compresses to high-quality WebP / JPEG
 * to reduce bandwidth and storage usage before uploading to Firebase Storage.
 */

export interface CompressionResult {
  file: File;
  previewUrl: string;
  originalSize: number; // in bytes
  compressedSize: number; // in bytes
  ratio: number; // percentage saved
}

export async function compressImage(
  file: File,
  maxWidth: number = 1600,
  maxHeight: number = 1600,
  quality: number = 0.82
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    // If already small (< 150KB), resolve directly
    if (file.size < 150 * 1024) {
      const previewUrl = URL.createObjectURL(file);
      return resolve({
        file,
        previewUrl,
        originalSize: file.size,
        compressedSize: file.size,
        ratio: 0,
      });
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("فشل قراءة ملف الصورة"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("فشل تحميل الصورة للتصغير"));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate scaled dimensions
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error("فشل تجهيز مساحة الرسام لتصغير الصورة"));
        }

        // Check if file is PNG or WebP to preserve alpha transparency
        const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
        const outputType = isPng ? 'image/png' : 'image/jpeg';
        
        // Draw image onto canvas (clear canvas first to guarantee true transparency)
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to PNG or JPEG blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error("فشل تحويل الصورة للملف المضغوط"));
            }

            const compressedFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, "") + (isPng ? '.png' : '.jpg'),
              { type: outputType, lastModified: Date.now() }
            );

            const previewUrl = URL.createObjectURL(blob);
            const savedBytes = Math.max(0, file.size - compressedFile.size);
            const ratio = Math.round((savedBytes / file.size) * 100);

            resolve({
              file: compressedFile,
              previewUrl,
              originalSize: file.size,
              compressedSize: compressedFile.size,
              ratio,
            });
          },
          outputType,
          isPng ? undefined : quality
        );
      };

      if (e.target?.result) {
        img.src = e.target.result as string;
      }
    };

    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 بكت';
  const k = 1024;
  const sizes = ['بايت', 'كيلوبايت KB', 'ميغابايت MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
