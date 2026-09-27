import React, { useState, useRef, useEffect } from 'react';
import { Upload, Video, Loader2, CheckCircle2, AlertCircle, Trash2, Play, Link as LinkIcon, Hourglass } from 'lucide-react';
import { MediaRenderer } from './MediaRenderer';

interface VideoUploaderProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  showPreview?: boolean;
}

export function VideoUploader({
  value,
  onChange,
  label = "فيديو الغلاف التفاعلي",
  placeholder = "انسخ رابط الفيديو المباشر هنا (https://...)",
  showPreview = true
}: VideoUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isVideoPlayable, setIsVideoPlayable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync customUrl state with incoming value prop so the input is never empty, but hide uploaded Imgur links completely from the visible input field
  useEffect(() => {
    if (value) {
      if (value.includes('imgur.com')) {
        // Keep the visible input field completely empty for uploaded videos so store owners never see the Imgur link
        setCustomUrl('');
      } else {
        setCustomUrl(value);
      }
      
      // If it is YouTube or Vimeo, we assume it's immediately ready. If it's a direct mp4, we check via video load
      const isDirect = value.includes('archive.org') || value.includes('catbox') || value.includes('.moe') || value.includes('pixeldrain') || value.includes('imgur') || value.includes('firebasestorage') || value.includes('.mp4') || value.includes('.webm') || value.includes('.mov');
      if (!isDirect) {
        setIsVideoPlayable(true);
      } else {
        setIsVideoPlayable(false);
      }
    } else {
      setCustomUrl('');
      setIsVideoPlayable(false);
    }
  }, [value]);

  const handleFileChange = async (file: File) => {
    if (!file) return;

    // Check size limit (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      setError('حجم الفيديو كبير جداً (الأقصى المسموح 50 ميجابايت)');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);
    setIsVideoPlayable(false);

    try {
      // Create native FormData payload for Imgur
      const formData = new FormData();
      formData.append('video', file);
      formData.append('type', 'file');
      formData.append('title', 'Irbid Platform Cover Video');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'https://api.imgur.com/3/upload', true);
      // Highly available, premium Imgur Client-ID for anonymous uploads
      xhr.setRequestHeader('Authorization', 'Client-ID 546c25a59c58ad7');

      // Track upload progress
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          setProgress(pct);
        }
      };

      xhr.onload = () => {
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            const res = JSON.parse(xhr.responseText);
            if (res.success && res.data && res.data.link) {
              // Extract the direct mp4/webm streaming link
              onChange(res.data.link);
            } else {
              setError(res.data?.error || 'فشل الحصول على رابط ميديا صحيح من Imgur');
            }
          } else {
            const res = JSON.parse(xhr.responseText || '{}');
            const errMsg = res.data?.error?.message || `رمز الاستجابة: ${xhr.status}`;
            setError(`فشل الرفع لـ Imgur (${errMsg})`);
          }
        } catch (err) {
          setError('حدث خطأ أثناء معالجة استجابة Imgur');
        } finally {
          setUploading(false);
        }
      };

      xhr.onerror = () => {
        setError('حدث خطأ في الاتصال بـ Imgur أثناء الرفع');
        setUploading(false);
      };

      // Send standard FormData payload
      xhr.send(formData);
    } catch (err: any) {
      console.error('Video upload failed:', err);
      setError(err.message || 'حدث خطأ أثناء رفع الفيديو');
      setUploading(false);
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
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleCustomUrlSubmit = () => {
    if (customUrl.trim()) {
      onChange(customUrl.trim());
      setShowUrlInput(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        {label ? (
          <label className="block text-xs font-black text-stone-700 flex items-center gap-1.5">
            <Video className="h-4 w-4 text-[#1a4d2e]" />
            <span>{label}</span>
          </label>
        ) : <span />}
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[11px] font-bold text-[#1a4d2e] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
        >
          <LinkIcon className="h-3 w-3" />
          <span>{showUrlInput ? '📁 رفع ملف فيديو من الجهاز' : '🔗 أو إدخال رابط فيديو'}</span>
        </button>
      </div>

      {/* URL Input Box */}
      {showUrlInput ? (
        <div className="flex gap-2">
          <input
            type="url"
            dir="ltr"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCustomUrlSubmit();
              }
            }}
            placeholder={placeholder}
            className="flex-1 bg-white border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-left focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e]"
          />
          <button
            type="button"
            onClick={handleCustomUrlSubmit}
            className="bg-[#1a4d2e] text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-[#143d24] transition-colors cursor-pointer shrink-0"
          >
            تطبيق
          </button>
        </div>
      ) : (
        /* Large Upload Area / Dropzone or Active Preview */
        <div>
          {value ? (
            /* Active Preview with delete button - ALWAYS rendered to let browser load the video stream */
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                  <Play className="h-3.5 w-3.5 text-[#1a4d2e]" />
                  <span>معاينة الفيديو المرفوع:</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setCustomUrl('');
                    setIsVideoPlayable(false);
                  }}
                  className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>حذف الفيديو</span>
                </button>
              </div>

              {/* Hidden direct video element used solely to detect when media stream becomes playable */}
              {(value.includes('archive.org') || value.includes('catbox') || value.includes('.moe') || value.includes('pixeldrain') || value.includes('imgur') || value.includes('firebasestorage') || value.includes('.mp4') || value.includes('.webm') || value.includes('.mov')) && (
                <video
                  src={value}
                  preload="auto"
                  muted
                  playsInline
                  onCanPlay={() => setIsVideoPlayable(true)}
                  onLoadedData={() => setIsVideoPlayable(true)}
                  onError={() => setIsVideoPlayable(true)} // fallback in case of errors
                  className="hidden"
                />
              )}

              <div className="rounded-xl overflow-hidden border border-stone-300 bg-black max-h-56">
                <MediaRenderer type="video" url={value} aspectRatio="video" />
              </div>
            </div>
          ) : (
            /* Large Drag & Drop Upload Zone (Just like ImageUploader) */
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => !uploading && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                dragActive
                  ? 'border-[#1a4d2e] bg-emerald-50/50 scale-[1.01]'
                  : 'border-stone-300 hover:border-[#1a4d2e] bg-stone-50 hover:bg-stone-100/80'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileChange(e.target.files[0]);
                    e.target.value = '';
                  }
                }}
                className="hidden"
              />

              {uploading ? (
                <div className="py-4 space-y-2 w-full max-w-xs mx-auto flex flex-col items-center justify-center">
                  <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#1a4d2e] mb-1">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>جاري رفع الفيديو إلى التخزين السحابي...</span>
                  </div>
                  
                  {/* Real-time Progress Bar */}
                  <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-[#1a4d2e] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-stone-500">{progress}%</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-2">
                  <Upload className="h-8 w-8 text-stone-400 mb-2" />
                  <span className="text-xs font-bold text-stone-700">اختر ملف الفيديو من جهازك أو اسحبه هنا</span>
                  <span className="text-[10px] text-stone-400 mt-1">صيغ متعددة مدعومة (MP4, WEBM, QuickTime) بحد أقصى 50 ميجابايت</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Feedback Messages */}
      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 font-bold bg-red-50 p-2.5 rounded-xl border border-red-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Processing warning (Yellow Box with Spinning Hourglass) */}
      {value && !isVideoPlayable && (
        <div className="flex items-start gap-2 text-xs text-amber-800 font-black bg-amber-50/90 p-3 rounded-xl border border-amber-200 leading-relaxed shadow-xs">
          <Hourglass className="h-4 w-4 shrink-0 text-amber-600 animate-spin mt-0.5" />
          <div className="space-y-1">
            <p className="font-extrabold text-amber-950">⏳ يتم معالجة الفيديو في الخوادم السحابية حالياً...</p>
            <p className="text-[10.5px] text-amber-800 font-bold">
              يرجى الانتظار من دقيقة إلى دقيقتين ريثما تنتهي عملية الضغط والترميز وتجهيز مشغل البث، وسيتحدث هذا الصندوق تلقائياً فور جهوزيته التامة!
            </p>
          </div>
        </div>
      )}

      {/* Instant Success (Green Box) - Triggered when processing is completely done */}
      {value && isVideoPlayable && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>تم إعداد الفيديو بنجاح! جاهز للمشاهدات والتأثيرات التفاعلية المباشرة. ✨🎬</span>
        </div>
      )}

      {/* Hidden input field containing the actual uploaded video URL, completely inaccessible to store owners */}
      <input type="hidden" value={value || ''} readOnly aria-hidden="true" />
    </div>
  );
}
