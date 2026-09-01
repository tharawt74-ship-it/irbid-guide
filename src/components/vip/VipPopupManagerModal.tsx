import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Sparkles, Crown, Image as ImageIcon, Video, 
  Save, Eye, CheckCircle2, AlertCircle, Link, HelpCircle,
  ToggleLeft, ToggleRight, Loader2
} from 'lucide-react';
import { Business, VipPopupConfig } from '../../types';
import { ImageUploader } from '../ui/ImageUploader';
import { VipWelcomePopupModal } from './VipWelcomePopupModal';
import { MediaRenderer } from '../common/MediaRenderer';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { sanitizeFirestorePayload, compressAndSanitizeFirestorePayload } from '../../lib/firestoreHelper';
import { invalidateCache } from '../../lib/dataCache';

interface VipPopupManagerModalProps {
  business: Business;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (updatedPopup: VipPopupConfig) => void;
}

export function VipPopupManagerModal({
  business,
  isOpen,
  onClose,
  onUpdated
}: VipPopupManagerModalProps) {
  const currentPopup: VipPopupConfig = business.vipPopup || {
    enabled: false,
    type: 'video',
    title: '',
    description: '',
    videoUrl: '',
    imageUrl: '',
    buttonText: '',
    buttonUrl: ''
  };

  const [enabled, setEnabled] = useState<boolean>(!!currentPopup.enabled);
  const [type, setType] = useState<'image' | 'video'>(currentPopup.type || 'video');
  const [title, setTitle] = useState(currentPopup.title || '');
  const [description, setDescription] = useState(currentPopup.description || '');
  const [videoUrl, setVideoUrl] = useState(currentPopup.videoUrl || '');
  const [imageUrl, setImageUrl] = useState(currentPopup.imageUrl || '');
  const [buttonText, setButtonText] = useState(currentPopup.buttonText || '');
  const [buttonUrl, setButtonUrl] = useState(currentPopup.buttonUrl || '');

  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen || typeof document === 'undefined') return null;

  const currentPreviewConfig: VipPopupConfig = {
    enabled,
    type,
    title: title.trim() || undefined,
    description: description.trim() || undefined,
    videoUrl: videoUrl.trim() || undefined,
    imageUrl: imageUrl.trim() || undefined,
    buttonText: buttonText.trim() || undefined,
    buttonUrl: buttonUrl.trim() || undefined
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business?.id || !db) return;

    setIsSaving(true);
    setErrorMsg('');
    setSaveSuccess(false);

    try {
      const popupPayload: VipPopupConfig = {
        enabled,
        type,
        title: title.trim(),
        description: description.trim(),
        videoUrl: videoUrl.trim(),
        imageUrl: imageUrl.trim(),
        buttonText: buttonText.trim(),
        buttonUrl: buttonUrl.trim()
      };

      const docRef = doc(db, 'businesses', business.id);
      const sanitized = await compressAndSanitizeFirestorePayload({ vipPopup: popupPayload }, true);
      await updateDoc(docRef, sanitized);

      invalidateCache();
      try {
        sessionStorage.removeItem(`dismissed_vip_popup_${business.id}`);
      } catch (e) {}

      if (onUpdated) {
        onUpdated(popupPayload);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Error saving VIP popup settings:', err);
      setErrorMsg('حدث خطأ أثناء حفظ الإعدادات، يرجى المحاولة مجدداً.');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      dir="rtl"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-stone-200 relative my-auto animate-in fade-in zoom-in-95"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-[#1a4d2e] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-amber-200 shadow-xs">
              <Crown className="h-5 w-5 fill-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                  ميزة حصرية لـ VIP
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                إدارة النافذة المنبثقة الترحيبية (صورة أو فيديو)
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="p-5 sm:p-7 space-y-6 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>تم حفظ إعدادات النافذة المنبثقة بنجاح!</span>
            </div>
          )}

          {/* Enable/Disable Toggle */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-black text-stone-900">تفعيل ظهور النافذة المنبثقة للزوار</span>
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                عند تفعيل هذا الخيار، ستظهر نافذة منبثقة تفاعلية للزوار تلقائياً بمجرد فتح صفحة محلك لعرض أحدث العروض، الريلز أو الصور.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`p-2 rounded-xl transition-all flex items-center gap-1.5 font-black text-xs cursor-pointer shrink-0 ${
                enabled 
                  ? 'bg-emerald-600 text-white shadow-md' 
                  : 'bg-stone-200 text-stone-600 hover:bg-stone-300'
              }`}
            >
              {enabled ? (
                <>
                  <ToggleRight className="h-5 w-5" />
                  <span>مفعلة</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="h-5 w-5" />
                  <span>معطلة</span>
                </>
              )}
            </button>
          </div>

          {/* Media Type Selector */}
          <div className="space-y-3">
            <label className="block text-xs font-black text-stone-800">
              نوع المحتوى المعروض داخل النافذة:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setType('video')}
                className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  type === 'video'
                    ? 'border-[#1a4d2e] bg-[#1a4d2e]/10 text-[#1a4d2e] shadow-xs'
                    : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-white'
                }`}
              >
                <Video className="h-4 w-4" />
                <span>رابط مقطع فيديو (يوتيوب / ريلز / تيك توك)</span>
              </button>

              <button
                type="button"
                onClick={() => setType('image')}
                className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  type === 'image'
                    ? 'border-[#1a4d2e] bg-[#1a4d2e]/10 text-[#1a4d2e] shadow-xs'
                    : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-white'
                }`}
              >
                <ImageIcon className="h-4 w-4" />
                <span>صورة أو بوستر إعلاني</span>
              </button>
            </div>
          </div>

          {/* Video URL Input */}
          {type === 'video' && (
            <div className="space-y-2 bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <label className="block text-xs font-black text-stone-800">
                رابط مقطع الفيديو (YouTube / Shorts / Instagram Reels / TikTok / Facebook / MP4)
              </label>
              <div className="relative">
                <input
                  type="url"
                  dir="ltr"
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... أو https://www.instagram.com/reel/..."
                  className="w-full bg-white border border-stone-300 rounded-xl px-3.5 py-2.5 pl-9 text-xs text-left font-mono text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e]"
                />
                <Video className="h-4 w-4 text-stone-400 absolute top-3 left-3 pointer-events-none" />
              </div>
              <p className="text-[11px] text-stone-500 flex items-center gap-1.5 pt-1">
                <HelpCircle className="h-3.5 w-3.5 text-[#1a4d2e]" />
                <span>يدعم روابط يوتيوب العادية وشورتس، وريلز إنستغرام، وفيديوهات فيسبوك وملفات الفيديو المباشرة.</span>
              </p>

              {videoUrl && (
                <div className="mt-3 pt-3 border-t border-stone-200">
                  <div className="text-[11px] font-bold text-stone-600 mb-1.5">معاينة مشغل الفيديو:</div>
                  <MediaRenderer type="video" url={videoUrl} aspectRatio="video" />
                </div>
              )}
            </div>
          )}

          {/* Image Uploader */}
          {type === 'image' && (
            <div className="space-y-2 bg-stone-50 p-4 rounded-2xl border border-stone-200">
              <ImageUploader
                label="اختر أو ارفع صورة البوستر الإعلاني من جهازك"
                folder="popups"
                value={imageUrl}
                onChange={(url) => setImageUrl(url)}
                aspectRatio="banner"
                placeholder="اضغط لرفع صورة العرض المنبثق"
              />
              {imageUrl && (
                <div className="mt-3 pt-3 border-t border-stone-200">
                  <div className="text-[11px] font-bold text-stone-600 mb-1.5">معاينة الصورة:</div>
                  <MediaRenderer type="image" url={imageUrl} aspectRatio="video" />
                </div>
              )}
            </div>
          )}

          {/* Title & Description */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black text-stone-800 mb-1.5">
                عنوان النافذة المنبثقة <span className="text-stone-400 font-normal">(اختياري)</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="مثال: خصم 25% بمناسبة الافتتاح، أو شاهد ريلز أطباقنا المميزة"
                className="w-full bg-[#fdfcfb] border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e]"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-stone-800 mb-1.5">
                النص التوضيحي أو تفاصيل العرض <span className="text-stone-400 font-normal">(اختياري)</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="اكتب رسالة ترحيبية أو كود الخصم أو تفاصيل الوجبة أو المنتج..."
                className="w-full bg-[#fdfcfb] border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] resize-none leading-relaxed"
              />
            </div>
          </div>

          {/* Action Button Settings */}
          <div className="bg-stone-50 p-4 sm:p-5 rounded-2xl border border-stone-200 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-200">
              <Link className="h-4 w-4 text-[#1a4d2e]" />
              <h4 className="text-xs font-black text-stone-800">زر الإجراء والتفاعل (Call to Action)</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-black text-stone-700 mb-1">
                  نص الزر
                </label>
                <input
                  type="text"
                  value={buttonText}
                  onChange={e => setButtonText(e.target.value)}
                  placeholder="مثال: اطلب الآن عبر واتساب"
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-stone-700 mb-1">
                  رابط مخصص للزر <span className="text-stone-400 font-normal">(فارغ = واتساب المحل)</span>
                </label>
                <input
                  type="url"
                  dir="ltr"
                  value={buttonUrl}
                  onChange={e => setButtonUrl(e.target.value)}
                  placeholder="https://wa.me/... أو رابط خارجي"
                  className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs text-left font-mono text-stone-800"
                />
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-800 px-4 py-2.5 rounded-xl text-xs font-black transition-colors cursor-pointer"
            >
              <Eye className="h-4 w-4 text-amber-600" />
              <span>معاينة النافذة المنبثقة الحية</span>
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-stone-500 hover:bg-stone-100 cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-[#1a4d2e] to-[#2d7a4b] hover:from-[#133b22] hover:to-[#1a4d2e] text-white px-6 py-2.5 rounded-xl text-xs font-black transition-all shadow-md cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>حفظ التعديلات</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Live Preview Modal */}
      {showPreview && (
        <VipWelcomePopupModal
          business={business}
          popupConfig={currentPreviewConfig}
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          isPreview={true}
        />
      )}
    </div>,
    document.body
  );
}
