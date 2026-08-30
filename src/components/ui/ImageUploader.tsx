import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Trash2, CheckCircle2, Sparkles, Link as LinkIcon, RefreshCw, AlertCircle, Crop as CropIcon } from 'lucide-react';
import { uploadAndCompressImage } from '../../lib/storageHelper';
import { formatFileSize } from '../../lib/imageCompression';
import { ImageCropModal, CropAspectRatio } from './ImageCropModal';

interface ImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  aspectRatio?: 'square' | 'cover' | 'banner';
  placeholder?: string;
  className?: string;
  enableCrop?: boolean;
}

export function ImageUploader({
  value,
  onChange,
  folder = 'uploads',
  label,
  aspectRatio = 'square',
  placeholder = 'اختر صورة من جهازك أو اسحبها هنا',
  className = '',
  enableCrop = true
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStats, setUploadStats] = useState<{ original: number; compressed: number; ratio: number } | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState('image.jpg');
  const [pendingFileType, setPendingFileType] = useState('image/jpeg');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startUploadProcess = async (file: File) => {
    setIsUploading(true);
    setProgress(5);
    setUploadStats(null);

    try {
      const result = await uploadAndCompressImage(file, {
        folder,
        onProgress: (pct) => setProgress(pct),
        maxWidth: aspectRatio === 'banner' ? 1920 : 1200,
        maxHeight: aspectRatio === 'banner' ? 800 : 1200,
        quality: 0.82
      });

      onChange(result.url);
      setUploadStats({
        original: result.originalSize,
        compressed: result.compressedSize,
        ratio: result.savedPercentage
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("حدث خطأ أثناء تحميل الصورة. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert("يرجى اختيار ملف صورة صالح (JPG, PNG, WebP)!");
      return;
    }

    if (enableCrop) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result as string);
        setPendingFileName(file.name);
        setPendingFileType(file.type || (file.name.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'));
        setCropModalOpen(true);
      };
      reader.readAsDataURL(file);
    } else {
      startUploadProcess(file);
    }
  };

  const handleCropComplete = (croppedFile: File) => {
    setCropModalOpen(false);
    startUploadProcess(croppedFile);
  };

  const handleOpenCropForCurrent = () => {
    if (value) {
      setImageToCrop(value);
      const isPng = value.toLowerCase().includes('.png') || value.startsWith('data:image/png');
      setPendingFileName(isPng ? 'recropped.png' : 'recropped.jpg');
      setPendingFileType(isPng ? 'image/png' : 'image/jpeg');
      setCropModalOpen(true);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleCustomUrlSubmit = (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();
    if (customUrl.trim()) {
      onChange(customUrl.trim());
      setShowUrlInput(false);
    }
  };

  const getAspectClass = () => {
    switch (aspectRatio) {
      case 'banner':
        return 'aspect-[21/9] sm:aspect-[3/1]';
      case 'cover':
        return 'aspect-[16/9]';
      case 'square':
      default:
        return 'aspect-square max-w-[180px]';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        {label ? (
          <label className="block text-xs font-bold text-stone-700">{label}</label>
        ) : <span />}
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[11px] font-bold text-[#1a4d2e] hover:underline flex items-center gap-1 shrink-0"
        >
          <LinkIcon className="h-3 w-3" />
          <span>{showUrlInput ? '📁 رفع ملف صورة من الجهاز' : '🔗 أو إدخال رابط صورة'}</span>
        </button>
      </div>

      {/* Alternative URL Input Tab */}
      {showUrlInput ? (
        <div className="flex gap-2">
          <input
            type="url"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCustomUrlSubmit(e);
              }
            }}
            placeholder="انسخ رابط الصورة المباشر هنا (https://...)"
            className="flex-1 bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-[#1a4d2e]"
          />
          <button
            type="button"
            onClick={handleCustomUrlSubmit}
            className="bg-[#1a4d2e] text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-[#143d24]"
          >
            تطبيق
          </button>
        </div>
      ) : (
        /* Drag and Drop Box or Image Preview */
        <div>
          {value ? (
            /* Active Image Preview Box */
            <div className={`relative group rounded-2xl overflow-hidden border border-stone-200 bg-stone-100 shadow-sm ${getAspectClass()}`}>
              <img
                src={value}
                alt="Preview"
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2 flex-wrap">
                {enableCrop && (
                  <button
                    type="button"
                    onClick={handleOpenCropForCurrent}
                    className="p-2 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md transition-all hover:scale-105"
                    title="قص وتعديل المقاس"
                  >
                    <CropIcon className="h-3.5 w-3.5" />
                    <span>قص</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 bg-white/90 text-stone-800 rounded-xl hover:bg-white text-xs font-bold flex items-center gap-1 shadow-md transition-all hover:scale-105"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>تغيير</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChange('')}
                  className="p-2 bg-red-600/90 text-white rounded-xl hover:bg-red-700 text-xs font-bold flex items-center gap-1 shadow-md transition-all hover:scale-105"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>حذف</span>
                </button>
              </div>

              {/* Compression Badge overlay if available */}
              {uploadStats && uploadStats.ratio > 0 && (
                <div className="absolute bottom-2 right-2 bg-stone-900/80 backdrop-blur-md text-emerald-400 text-[10px] font-black px-2 py-1 rounded-lg border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  <span>تم الضغط ({uploadStats.ratio}% توفير)</span>
                </div>
              )}
            </div>
          ) : (
            /* Upload Zone Drop Area */
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                dragActive
                  ? 'border-[#1a4d2e] bg-emerald-50/50 scale-[1.01]'
                  : 'border-stone-300 hover:border-[#1a4d2e] bg-stone-50 hover:bg-stone-100/80'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileSelect(e.target.files[0]);
                    e.target.value = ''; // Reset input to allow selecting same file if needed
                  }
                }}
                className="hidden"
              />

              {isUploading ? (
                <div className="py-4 space-y-2 w-full max-w-xs mx-auto">
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#1a4d2e]">
                    <Sparkles className="h-4 w-4 animate-spin" />
                    <span>جاري ضغط الصورة ونقلها إلى التخزين...</span>
                  </div>
                  <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-[#1a4d2e] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-stone-500">{progress}%</span>
                </div>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#1a4d2e] flex items-center justify-center shadow-xs">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-stone-800">{placeholder}</p>
                    <p className="text-[10px] text-stone-500 font-medium">
                      يتيح لك قص وتدوير وتكبير وتحديد المقاس قبل الرفع التلقائي
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Upload Stats Note */}
      {uploadStats && !isUploading && (
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          <span>
            الحجم الأصلي: {formatFileSize(uploadStats.original)} ← المضغوط: {formatFileSize(uploadStats.compressed)} (وفرت {uploadStats.ratio}%)
          </span>
        </div>
      )}

      {/* Interactive Crop Modal */}
      {imageToCrop && (
        <ImageCropModal
          isOpen={cropModalOpen}
          imageSrc={imageToCrop}
          initialAspectRatio={aspectRatio}
          fileName={pendingFileName}
          fileType={pendingFileType}
          onClose={() => {
            setCropModalOpen(false);
            setImageToCrop(null);
          }}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
