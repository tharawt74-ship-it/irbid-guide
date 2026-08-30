import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Check, 
  RotateCw, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  RefreshCw, 
  Crop as CropIcon, 
  Sparkles,
  FlipHorizontal,
  Sliders,
  Move
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  // Normalize initial aspect ratio
  const getInitialRatio = (): CropAspectRatio => {
    if (initialAspectRatio === 'square' || initialAspectRatio === '1:1') return '1:1';
    if (initialAspectRatio === 'cover' || initialAspectRatio === '16:9') return '16:9';
    if (initialAspectRatio === 'banner' || initialAspectRatio === '3:1') return '3:1';
    if (initialAspectRatio === '4:3') return '4:3';
    return 'free';
  };

  const [aspectRatio, setAspectRatio] = useState<CropAspectRatio>(getInitialRatio());
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFlippedH, setIsFlippedH] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset state when a new image is loaded
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setRotation(0);
      setIsFlippedH(false);
      setPosition({ x: 0, y: 0 });
      setAspectRatio(getInitialRatio());
      setImageLoaded(false);
    }
  }, [isOpen, imageSrc, initialAspectRatio]);

  // Handle Drag / Pan Events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * -0.0015;
    setZoom((prev) => Math.min(Math.max(0.5, prev + zoomDelta), 3.5));
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Crop Aspect ratio calculation for visual frame
  const getFrameAspectStyle = () => {
    switch (aspectRatio) {
      case '1:1':
        return { aspectRatio: '1 / 1', maxWidth: '320px', maxHeight: '320px' };
      case '16:9':
        return { aspectRatio: '16 / 9', maxWidth: '440px', maxHeight: '250px' };
      case '4:3':
        return { aspectRatio: '4 / 3', maxWidth: '380px', maxHeight: '285px' };
      case '3:1':
        return { aspectRatio: '3 / 1', maxWidth: '460px', maxHeight: '160px' };
      case 'free':
      default:
        return { width: '85%', height: '80%', maxWidth: '440px', maxHeight: '340px' };
    }
  };

  // Execute Canvas Cropping
  const handlePerformCrop = async () => {
    if (!imageRef.current || !containerRef.current) return;
    setIsProcessing(true);

    try {
      const img = imageRef.current;
      const cropFrame = containerRef.current.querySelector('.crop-frame-box') as HTMLElement;
      if (!cropFrame) throw new Error("Crop frame not found");

      const frameRect = cropFrame.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();

      // Create output canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Could not create canvas context");

      // Calculate output dimensions
      let targetWidth = 1200;
      let targetHeight = 1200;

      if (aspectRatio === '1:1') {
        targetWidth = 1000;
        targetHeight = 1000;
      } else if (aspectRatio === '16:9') {
        targetWidth = 1280;
        targetHeight = 720;
      } else if (aspectRatio === '4:3') {
        targetWidth = 1200;
        targetHeight = 900;
      } else if (aspectRatio === '3:1') {
        targetWidth = 1500;
        targetHeight = 500;
      } else {
        const ratio = frameRect.width / frameRect.height;
        targetWidth = 1200;
        targetHeight = Math.round(1200 / ratio);
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Draw high quality background & setup transforms
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Transform space
      ctx.save();
      ctx.translate(targetWidth / 2, targetHeight / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(isFlippedH ? -1 : 1, 1);

      // Relative scale between preview and natural image size
      const scaleFactorX = targetWidth / frameRect.width;
      const scaleFactorY = targetHeight / frameRect.height;

      // Offset from frame center to image center in preview
      const frameCenterX = frameRect.left + frameRect.width / 2;
      const frameCenterY = frameRect.top + frameRect.height / 2;
      const imgCenterX = imgRect.left + imgRect.width / 2;
      const imgCenterY = imgRect.top + imgRect.height / 2;

      const deltaX = (imgCenterX - frameCenterX) * scaleFactorX;
      const deltaY = (imgCenterY - frameCenterY) * scaleFactorY;

      const drawWidth = imgRect.width * scaleFactorX;
      const drawHeight = imgRect.height * scaleFactorY;

      ctx.drawImage(
        img,
        deltaX - drawWidth / 2,
        deltaY - drawHeight / 2,
        drawWidth,
        drawHeight
      );

      ctx.restore();

      // Detect if original image is PNG/WebP or transparent to preserve alpha channel
      const isPngOrWebp = fileType === 'image/png' || 
                          fileType === 'image/webp' ||
                          fileName.toLowerCase().endsWith('.png') || 
                          fileName.toLowerCase().endsWith('.webp') || 
                          imageSrc.startsWith('data:image/png') ||
                          imageSrc.startsWith('data:image/webp');
      
      const mimeType = isPngOrWebp ? 'image/png' : 'image/jpeg';
      const ext = isPngOrWebp ? '.png' : '.jpg';
      
      // For PNG, toDataURL/toBlob do not take quality argument
      const dataUrl = isPngOrWebp ? canvas.toDataURL('image/png') : canvas.toDataURL('image/jpeg', 0.92);
      
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-stone-900 border border-stone-700/80 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
        >
          {/* Modal Header */}
          <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between bg-stone-950/60 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#1a4d2e] text-white flex items-center justify-center shadow-xs">
                <CropIcon className="h-4 w-4 text-emerald-300" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white">تعديل وقص الصورة (Crop & Edit)</h3>
                <p className="text-[11px] text-stone-400 font-medium">قم بضبط المقاس، التكبير، والتدوير للوصول للمظهر المثالي</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-stone-800 text-stone-400 hover:text-white hover:bg-stone-700 flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Aspect Ratio Selector Bar */}
          <div className="px-4 py-2.5 bg-stone-950/40 border-b border-stone-800 flex items-center justify-between gap-2 overflow-x-auto shrink-0">
            <span className="text-[11px] font-bold text-stone-400 shrink-0 flex items-center gap-1">
              <Sliders className="h-3.5 w-3.5 text-stone-400" />
              <span>نسبة الأبعاد:</span>
            </span>
            <div className="flex items-center gap-1.5 shrink-0">
              {[
                { id: '1:1', label: 'مربع 1:1 (شعار/أيقونة)' },
                { id: '16:9', label: 'غلاف 16:9' },
                { id: '4:3', label: 'عريض 4:3' },
                { id: '3:1', label: 'بانر عريض 3:1' },
                { id: 'free', label: 'حر (بدون تقييد)' }
              ].map((ratio) => (
                <button
                  key={ratio.id}
                  type="button"
                  onClick={() => setAspectRatio(ratio.id as CropAspectRatio)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    aspectRatio === ratio.id
                      ? 'bg-[#1a4d2e] text-emerald-200 border border-emerald-500/40 shadow-xs'
                      : 'bg-stone-800/80 text-stone-400 hover:text-stone-200 hover:bg-stone-800 border border-transparent'
                  }`}
                >
                  {ratio.label}
                </button>
              ))}
            </div>
          </div>

          {/* Main Visual Crop Workspace */}
          <div
            ref={containerRef}
            onWheel={handleWheel}
            className="relative flex-1 bg-stone-950 overflow-hidden flex items-center justify-center select-none min-h-[280px] sm:min-h-[360px] cursor-grab active:cursor-grabbing p-4"
          >
            {/* Movable and Transformable Target Image */}
            <div
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg) scaleX(${isFlippedH ? -1 : 1})`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
              }}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="absolute inline-block touch-none"
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop subject"
                onLoad={() => setImageLoaded(true)}
                crossOrigin="anonymous"
                className="max-w-[480px] sm:max-w-[600px] max-h-[380px] object-contain pointer-events-none"
                draggable={false}
              />
            </div>

            {/* Dark Mask Vignette & Overlay */}
            <div className="absolute inset-0 pointer-events-none bg-black/45 backdrop-brightness-75" />

            {/* Visual Cropping Window Frame */}
            <div
              style={getFrameAspectStyle()}
              className="crop-frame-box relative z-10 w-full rounded-2xl border-2 border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.55),0_0_20px_rgba(16,185,129,0.3)] pointer-events-none flex items-center justify-center transition-all duration-300"
            >
              {/* Grid guide lines */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-30 pointer-events-none">
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-white" />
                <div className="border-r border-white" />
                <div />
              </div>

              {/* Corner markers */}
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-300 rounded-tr" />
              <span className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-300 rounded-tl" />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-300 rounded-br" />
              <span className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-300 rounded-bl" />

              {/* Helper Drag Prompt */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-stone-900/80 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-stone-700/80 text-[10px] font-bold text-emerald-300/90 flex items-center gap-1 shadow-sm whitespace-nowrap">
                <Move className="h-2.5 w-2.5" />
                <span>اسحب الصورة لتحريكها داخل الإطار</span>
              </div>
            </div>
          </div>

          {/* Controls Bar: Zoom, Rotation, Flip */}
          <div className="px-5 py-3 bg-stone-950/80 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Zoom Slider Control */}
            <div className="flex items-center gap-2 min-w-[200px] flex-1 max-w-xs">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                className="w-7 h-7 rounded-lg bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 flex items-center justify-center transition-all cursor-pointer"
                title="تصغير"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-emerald-500 cursor-pointer h-1.5 bg-stone-700 rounded-lg"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
                className="w-7 h-7 rounded-lg bg-stone-800 text-stone-300 hover:text-white hover:bg-stone-700 flex items-center justify-center transition-all cursor-pointer"
                title="تكبير"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <span className="text-[11px] font-black text-emerald-400 w-10 text-left" dir="ltr">
                {Math.round(zoom * 100)}%
              </span>
            </div>

            {/* Transform Controls (Rotate & Flip) */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setRotation((r) => (r - 90) % 360)}
                className="p-2 rounded-xl bg-stone-800/90 text-stone-300 hover:text-white hover:bg-stone-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                title="تدوير لليسار 90°"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">تدوير -90°</span>
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-2 rounded-xl bg-stone-800/90 text-stone-300 hover:text-white hover:bg-stone-700 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                title="تدوير لليمين 90°"
              >
                <RotateCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">تدوير +90°</span>
              </button>
              <button
                type="button"
                onClick={() => setIsFlippedH(!isFlippedH)}
                className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  isFlippedH
                    ? 'bg-emerald-800/80 text-emerald-200 border border-emerald-600'
                    : 'bg-stone-800/90 text-stone-300 hover:text-white hover:bg-stone-700'
                }`}
                title="عكس أفقي"
              >
                <FlipHorizontal className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">عكس</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setRotation(0);
                  setIsFlippedH(false);
                  setPosition({ x: 0, y: 0 });
                }}
                className="p-2 rounded-xl bg-stone-800/60 text-stone-400 hover:text-stone-200 hover:bg-stone-800 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                title="إعادة ضبط"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">إعادة ضبط</span>
              </button>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="px-5 py-3.5 bg-stone-950 border-t border-stone-800 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-white text-xs font-bold transition-all cursor-pointer"
            >
              إلغاء
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={handlePerformCrop}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1a4d2e] to-[#256f43] hover:from-[#143d24] hover:to-[#1a4d2e] text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>جاري قص الصورة...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 stroke-[3px]" />
                    <span>تأكيد واعتماد القص</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
