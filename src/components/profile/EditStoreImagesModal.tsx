import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera, Image as ImageIcon, Video, Save, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Business } from '../../types';
import { ImageUploader } from '../ui/ImageUploader';
import { VideoUploader } from '../common/VideoUploader';

interface EditStoreImagesModalProps {
  business: Business;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: { imageUrl: string; logoUrl: string; coverVideoUrl: string }) => Promise<void>;
  isMedical?: boolean;
}

export function EditStoreImagesModal({
  business,
  isOpen,
  onClose,
  onSave,
  isMedical = false
}: EditStoreImagesModalProps) {
  const [logoUrl, setLogoUrl] = useState(business.logoUrl || '');
  const [imageUrl, setImageUrl] = useState(business.imageUrl || '');
  const [coverVideoUrl, setCoverVideoUrl] = useState(business.coverVideoUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLogoUrl(business.logoUrl || '');
      setImageUrl(business.imageUrl || '');
      setCoverVideoUrl(business.coverVideoUrl || '');
      setSaveSuccess(false);
      setErrorMessage('');
    }
  }, [isOpen, business]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage('');
    try {
      await onSave({
        logoUrl: logoUrl.trim(),
        imageUrl: imageUrl.trim(),
        coverVideoUrl: coverVideoUrl.trim()
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Error updating store images:', err);
      setErrorMessage('حدث خطأ أثناء حفظ الصور، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
      onClick={onClose}
      dir="rtl"
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[90dvh] sm:max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-stone-200 relative my-0 sm:my-auto animate-in fade-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        {/* Mobile drag handle */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="bg-white border-b border-stone-200/80 p-4 sm:p-5 sm:px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-stone-100 border border-stone-200/80 flex items-center justify-center text-stone-800 shadow-2xs shrink-0">
              <Camera className="h-5 w-5 text-stone-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-[11px] font-black tracking-wider text-stone-600 bg-stone-100 border border-stone-200/60 px-2 py-0.5 rounded-md inline-block">
                  {isMedical ? 'هوية المنشأة الطبية' : 'هوية المحل التجاري'}
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold text-stone-500 truncate max-w-[180px]">
                  {business.name}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-stone-900 mt-0.5">
                تعديل صور {isMedical ? 'المنشأة والعيادة' : 'المحل'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-500 hover:text-stone-800 flex items-center justify-center transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-4 sm:p-6 space-y-5 flex-1 overflow-y-auto">
            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>تم حفظ الصور والشعار بنجاح!</span>
              </div>
            )}

            {/* 1. Logo */}
            <div className="space-y-1.5 bg-stone-50/70 p-3.5 sm:p-4 rounded-2xl border border-stone-200/80">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  1
                </div>
                <h4 className="text-xs sm:text-sm font-black text-stone-900">
                  شعار المحل / اللوجو (صورة دائرية)
                </h4>
              </div>
              <ImageUploader
                label="اختر شعار المحل أو اللوجو"
                folder="logos"
                value={logoUrl}
                onChange={url => setLogoUrl(url)}
                aspectRatio="square"
                placeholder="اختر ملف الشعار من جهازك"
              />
              <p className="text-[11px] text-stone-500 font-medium">
                الصورة الدائرية الممثلة للمحل وتظهر في نتائج البحث والبطاقات وبوسترات الـ QR.
              </p>
            </div>

            {/* 2. Cover Image */}
            <div className="space-y-1.5 bg-stone-50/70 p-3.5 sm:p-4 rounded-2xl border border-stone-200/80">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  2
                </div>
                <h4 className="text-xs sm:text-sm font-black text-stone-900">
                  صورة غلاف المحل الرئيسية (الواجهة أو الديكور)
                </h4>
              </div>
              <ImageUploader
                label="صورة الغلاف العريضة"
                folder="businesses"
                value={imageUrl}
                onChange={url => setImageUrl(url)}
                aspectRatio="cover"
                placeholder="اختر صورة غلاف المحل من جهازك"
              />
              <p className="text-[11px] text-stone-500 font-medium">
                الصورة العريضة التي تعكس واجهة محلك أو الديكور الداخلي وتظهر أعلى صفحة المحل.
              </p>
            </div>

            {/* 3. Cover Video */}
            <div className="space-y-1.5 bg-stone-50/70 p-3.5 sm:p-4 rounded-2xl border border-stone-200/80">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                  3
                </div>
                <h4 className="text-xs sm:text-sm font-black text-stone-900">
                  فيديو الغلاف التفاعلي (اختياري)
                </h4>
              </div>
              <VideoUploader
                value={coverVideoUrl}
                onChange={url => setCoverVideoUrl(url)}
                label="رابط أو ملف فيديو الغلاف"
                placeholder="انسخ رابط فيديو أو ارفعه هنا"
              />
              <p className="text-[11px] text-stone-500 font-medium">
                عند تمرير الزائر الماوس فوق بطاقة المحل أو زيارة صفحته يعمل الفيديو تلقائياً لزيادة الجاذبية.
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-[#1a4d2e] hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  <span>جارٍ الحفظ...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>حفظ صور المحل</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
