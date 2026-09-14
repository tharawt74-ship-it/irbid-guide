import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import { 
  X, 
  Check, 
  RotateCw, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  RefreshCw, 
  Crop as CropIcon, 
  Sliders
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

export function getRadianAngle(degreeValue: number) {
  return (degreeValue * Math.PI) / 180;
}

export function rotateSize(width: number, height: number, rotation: number) {
  const rotRad = getRadianAngle(rotation);
  return {
    width: Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height: Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number },
  rotation = 0
): Promise<HTMLCanvasElement | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  const rotRad = getRadianAngle(rotation);
  const { width: bBoxWidth, height: bBoxHeight } = rotateSize(image.width, image.height, rotation);

  canvas.width = bBoxWidth;
  canvas.height = bBoxHeight;

  ctx.translate(bBoxWidth / 2, bBoxHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);

  ctx.drawImage(image, 0, 0);

  const croppedCanvas = document.createElement('canvas');
  const croppedCtx = croppedCanvas.getContext('2d');

  if (!croppedCtx) return null;

  croppedCanvas.width = pixelCrop.width;
  croppedCanvas.height = pixelCrop.height;
  
  croppedCtx.imageSmoothingEnabled = true;
  croppedCtx.imageSmoothingQuality = 'high';

  croppedCtx.drawImage(
    canvas,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return croppedCanvas;
}

export type CropAspectRatio = '1:1' | '16:9' | '4:3' | '3:1' | 'free';

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  initialAspectRatio?: 'square' | 'cover' | 'banner' | 'free' | '1:1' | '16:9' | '4:3' | '3:1';
  onClose: () => void;
  onCropComplete: (croppedFile: File, croppedDataUrl: string) => void;
  fileName?: string;
  fileType?: string;
}

export function ImageCropModal({
  isOpen,
  imageSrc,
  initialAspectRatio = '1:1',
  onClose,
  onCropComplete,
  fileName = 'cropped-image.jpg',
  fileType
}: ImageCropModalProps) {
  const getInitialRatio = (): CropAspectRatio => {
    if (initialAspectRatio === 'square' || initialAspectRatio === '1:1') return '1:1';
    if (initialAspectRatio === 'cover' || initialAspectRatio === '16:9') return '16:9';
    if (initialAspectRatio === 'banner' || initialAspectRatio === '3:1') return '3:1';
    if (initialAspectRatio === '4:3') return '4:3';
    return 'free';
  };

  const [aspectRatio, setAspectRatio] = useState<CropAspectRatio>(getInitialRatio());
  const [naturalAspect, setNaturalAspect] = useState<number | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load natural aspect ratio of the image
  useEffect(() => {
    if (imageSrc) {
      const img = new Image();
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          const aspect = img.naturalWidth / img.naturalHeight;
          setNaturalAspect(aspect);
        }
      };
      img.src = imageSrc;
    }
  }, [imageSrc]);

  useEffect(() => {
    if (isOpen) {
      setAspectRatio(getInitialRatio());
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setCroppedAreaPixels(null);
    }
  }, [isOpen, imageSrc, initialAspectRatio]);

  // Inject handle DOM elements into the cropper area for tactile visualization
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const cropArea = document.querySelector('.custom-crop-area');
      if (cropArea && !cropArea.querySelector('.crop-handle-tl')) {
        const handles = [
          { cls: 'crop-handle crop-handle-corner crop-handle-tl', title: 'تحكم بالزاوية العلوية' },
          { cls: 'crop-handle crop-handle-corner crop-handle-tr', title: 'تحكم بالزاوية العلوية' },
          { cls: 'crop-handle crop-handle-corner crop-handle-bl', title: 'تحكم بالزاوية السفلية' },
          { cls: 'crop-handle crop-handle-corner crop-handle-br', title: 'تحكم بالزاوية السفلية' },
          { cls: 'crop-handle crop-handle-edge-h crop-handle-t', title: 'تحكم بالحافة العلوية' },
          { cls: 'crop-handle crop-handle-edge-h crop-handle-b', title: 'تحكم بالحافة السفلية' },
          { cls: 'crop-handle crop-handle-edge-v crop-handle-l', title: 'تحكم بالحافة الجانبية' },
          { cls: 'crop-handle crop-handle-edge-v crop-handle-r', title: 'تحكم بالحافة الجانبية' },
        ];

        handles.forEach(h => {
          const el = document.createElement('div');
          el.className = h.cls;
          el.title = h.title;
          cropArea.appendChild(el);
        });
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [isOpen, aspectRatio, zoom, rotation]);

  const onCropChange = (crop: { x: number; y: number }) => setCrop(crop);
  const onZoomChange = (zoom: number) => setZoom(zoom);
  const onRotationChange = (rotation: number) => setRotation(rotation);
  
  const onCropCompleteCb = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handlePerformCrop = async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    setIsProcessing(true);

    try {
      const canvas = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);

      if (!canvas) throw new Error("Canvas rendering failed");

      const isPngOrWebp = fileType === 'image/png' || 
                          fileType === 'image/webp' ||
                          fileName.toLowerCase().endsWith('.png') || 
                          fileName.toLowerCase().endsWith('.webp') || 
                          imageSrc.startsWith('data:image/png') ||
                          imageSrc.startsWith('data:image/webp');
      
      const mimeType = isPngOrWebp ? 'image/png' : 'image/jpeg';
      const ext = isPngOrWebp ? '.png' : '.jpg';
      const dataUrl = canvas.toDataURL(mimeType, isPngOrWebp ? undefined : 0.92);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const croppedFile = new File([blob], fileName.replace(/\.[^/.]+$/, "") + "-cropped" + ext, {
            type: mimeType,
            lastModified: Date.now()
          });
          onCropComplete(croppedFile, dataUrl);
          onClose();
        }
        setIsProcessing(false);
      }, mimeType, isPngOrWebp ? undefined : 0.92);

    } catch (err) {
      console.error("Cropping failed:", err);
      alert("حدث خطأ أثناء قص الصورة، سيتم استخدام الصورة الأصلية.");
      setIsProcessing(false);
    }
  };

  // Determine active aspect ratio value (defaults to full natural image aspect on 'free')
  const aspectValue = aspectRatio === '1:1' ? 1 : 
                      aspectRatio === '16:9' ? 16 / 9 : 
                      aspectRatio === '4:3' ? 4 / 3 : 
                      aspectRatio === '3:1' ? 3 / 1 : 
                      (naturalAspect || undefined);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      <div 
        data-no-bottom-sheet="true"
        className="fixed inset-0 z-[9999999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/90 backdrop-blur-md select-none" 
        dir="rtl"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-stone-900 border border-stone-700/80 w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col h-[94dvh] sm:h-[88vh] max-h-[820px] overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-stone-800 flex items-center justify-between bg-stone-950/90 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#1a4d2e] text-white flex items-center justify-center shadow-xs">
                <CropIcon className="h-4 w-4 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white">تعديل وقص الصورة</h3>
                <p className="text-[11px] text-stone-400 font-medium">اسحب إطار القص، المقابض أو استخدم التكبير للحصول على النتيجة المطلوبة</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Aspect Ratios Switcher */}
          <div className="px-3 py-2 sm:px-4 sm:py-2.5 bg-stone-950/60 border-b border-stone-800/80 flex items-center justify-between gap-2 overflow-x-auto shrink-0 scrollbar-none">
            <span className="text-[11px] font-bold text-stone-400 shrink-0 flex items-center gap-1">
              <Sliders className="h-3.5 w-3.5 text-emerald-500" />
              <span>نسبة الأبعاد:</span>
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {[
                { id: 'free', label: 'كامل الصورة (حر)' },
                { id: '1:1', label: 'مربع 1:1' },
                { id: '16:9', label: 'غلاف 16:9' },
                { id: '4:3', label: 'عريض 4:3' },
                { id: '3:1', label: 'بانر 3:1' }
              ].map((ratio) => (
                <button
                  key={ratio.id}
                  type="button"
                  onClick={() => setAspectRatio(ratio.id as CropAspectRatio)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    aspectRatio === ratio.id
                      ? 'bg-[#1a4d2e] text-emerald-100 border border-emerald-500/50 shadow-xs ring-1 ring-emerald-400/30'
                      : 'bg-stone-800/80 text-stone-400 hover:text-stone-200 hover:bg-stone-700 border border-transparent'
                  }`}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cropper Viewport Container */}
          <div className="relative flex-1 w-full min-h-[160px] bg-stone-950 overflow-hidden">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspectValue}
              onCropChange={onCropChange}
              onCropComplete={onCropCompleteCb}
              onZoomChange={onZoomChange}
              onRotationChange={onRotationChange}
              showGrid={true}
              cropShape="rect"
              objectFit="contain"
              restrictPosition={true}
              classes={{
                cropAreaClassName: 'custom-crop-area',
                containerClassName: 'bg-stone-950'
              }}
              onMediaLoaded={(mediaSize) => {
                if (mediaSize.naturalWidth && mediaSize.naturalHeight) {
                  setNaturalAspect(mediaSize.naturalWidth / mediaSize.naturalHeight);
                }
              }}
            />
          </div>

          {/* Tool Controls (Zoom + Rotate + Reset) */}
          <div className="px-4 py-2 sm:px-5 sm:py-2.5 bg-stone-950/90 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Zoom Slider Control */}
            <div className="flex items-center gap-2 min-w-[180px] flex-1 max-w-xs">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, +(z - 0.1).toFixed(2)))}
                className="w-7 h-7 rounded-lg bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 flex items-center justify-center transition-all cursor-pointer"
                title="تصغير"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-emerald-500 cursor-pointer h-1.5 bg-stone-700 rounded-lg"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, +(z + 0.1).toFixed(2)))}
                className="w-7 h-7 rounded-lg bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 flex items-center justify-center transition-all cursor-pointer"
                title="تكبير"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Transform Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRotation((r) => (r - 90) % 360)}
                className="px-2.5 py-1.5 rounded-xl bg-stone-800/90 text-stone-300 hover:text-white hover:bg-stone-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="تدوير لليسار 90°"
              >
                <RotateCcw className="h-3.5 w-3.5 text-emerald-400" />
                <span className="hidden sm:inline">تدوير لليسار</span>
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="px-2.5 py-1.5 rounded-xl bg-stone-800/90 text-stone-300 hover:text-white hover:bg-stone-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="تدوير لليمين 90°"
              >
                <RotateCw className="h-3.5 w-3.5 text-emerald-400" />
                <span className="hidden sm:inline">تدوير لليمين</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setRotation(0);
                  setCrop({ x: 0, y: 0 });
                }}
                className="px-2.5 py-1.5 rounded-xl bg-stone-800/60 text-stone-400 hover:text-stone-200 hover:bg-stone-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="إعادة ضبط الإطار"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">إعادة ضبط</span>
              </button>
            </div>
          </div>

          {/* Permanently Sticky Bottom Footer Actions (Always & Ever visible) */}
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 bg-stone-950 border-t border-stone-800/90 flex items-center justify-between gap-3 shrink-0 sticky bottom-0 z-40 shadow-[0_-4px_25px_rgba(0,0,0,0.6)]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white text-xs sm:text-sm font-bold transition-all cursor-pointer min-h-[42px]"
            >
              إلغاء الأمر
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={handlePerformCrop}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#1a4d2e] to-[#256f43] hover:from-[#143d24] hover:to-[#1a4d2e] text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:pointer-events-none min-h-[42px]"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  <span>جاري القص...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 sm:h-5 sm:w-5 stroke-[3px]" />
                  <span>اعتماد وقص</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
}
