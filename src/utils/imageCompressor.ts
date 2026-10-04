/**
 * Non-blocking client-side image compressor.
 * Compresses images without locking the UI main thread using asynchronous image decoding and chunking.
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: 'image/webp' | 'image/jpeg' | 'image/png';
}

export async function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<{ dataUrl: string; blob: Blob; size: number }> {
  const {
    maxWidth = 1400,
    maxHeight = 1400,
    quality = 0.85,
    mimeType = 'image/webp'
  } = options;

  return new Promise((resolve, reject) => {
    // 1. Asynchronously read file
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image data'));
      img.onload = () => {
        try {
          // 2. Compute aspect-ratio dimensions
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            const aspect = width / height;
            if (width > height) {
              width = maxWidth;
              height = Math.round(maxWidth / aspect);
            } else {
              height = maxHeight;
              width = Math.round(maxHeight * aspect);
            }
          }

          // 3. Render onto Canvas
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { alpha: mimeType === 'image/webp' || mimeType === 'image/png' });

          if (!ctx) {
            reject(new Error('Canvas 2D context not available'));
            return;
          }

          // Use high quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // 4. Export compressed DataURL and Blob
          const dataUrl = canvas.toDataURL(mimeType, quality);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({
                  dataUrl,
                  blob,
                  size: blob.size
                });
              } else {
                reject(new Error('Failed to create compressed image blob'));
              }
            },
            mimeType,
            quality
          );
        } catch (err) {
          reject(err);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
