import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Check, Trash2, Plus, ArrowUp, ArrowDown, 
  Image as ImageIcon, ShoppingBag, Layers, 
  ExternalLink, Upload, AlertCircle, Link as LinkIcon,
  Video as VideoIcon
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Business, MenuItem, VipCarouselSlide, VipCustomSections } from '../../types';
import { VipStatusResult } from '../../lib/vipHelper';
import { uploadAndCompressImage } from '../../lib/storageHelper';
import { compressAndSanitizeFirestorePayload } from '../../lib/firestoreHelper';
import { invalidateCache } from '../../lib/dataCache';
import { MediaRenderer } from '../common/MediaRenderer';

interface VipPageCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  business: Business;
  vipInfo: VipStatusResult;
  onSaved: (updatedSections: VipCustomSections) => void;
}

export function VipPageCustomizerModal({
  isOpen,
  onClose,
  business,
  vipInfo,
  onSaved
}: VipPageCustomizerModalProps) {
  if (!isOpen) return null;

  // Determine limits based on VIP tier
  const isTrial = Boolean(vipInfo.isTrial);
  const maxCarouselImages = isTrial ? 2 : 5;
  const maxProducts = isTrial ? 5 : 10;

  const currentConfig: VipCustomSections = business.vipCustomSections || {};

  // Local state for configuration
  const [carouselEnabled, setCarouselEnabled] = useState<boolean>(
    currentConfig.carouselEnabled ?? true
  );
  const [productsSliderEnabled, setProductsSliderEnabled] = useState<boolean>(
    currentConfig.productsSliderEnabled ?? true
  );
  const [videoEnabled, setVideoEnabled] = useState<boolean>(
    currentConfig.videoEnabled ?? true
  );

  const initialOrder: ('carousel' | 'products_slider' | 'video')[] = (() => {
    const saved = currentConfig.blockOrder;
    if (saved && Array.isArray(saved) && saved.length > 0) {
      const list = [...saved] as ('carousel' | 'products_slider' | 'video')[];
      if (!list.includes('carousel')) list.push('carousel');
      if (!list.includes('products_slider')) list.push('products_slider');
      if (!list.includes('video')) list.push('video');
      return list;
    }
    return ['carousel', 'products_slider', 'video'];
  })();

  const [blockOrder, setBlockOrder] = useState<('carousel' | 'products_slider' | 'video')[]>(initialOrder);

  const [carouselImages, setCarouselImages] = useState<VipCarouselSlide[]>(
    currentConfig.carouselImages ? [...currentConfig.carouselImages] : []
  );
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    currentConfig.selectedProductIds ? [...currentConfig.selectedProductIds] : []
  );

  // Video state
  const [videoUrl, setVideoUrl] = useState<string>(currentConfig.videoUrl || '');
  const [videoTitle, setVideoTitle] = useState<string>(currentConfig.videoTitle || '');

  // New slide form state
  const [isAddingSlide, setIsAddingSlide] = useState(false);
  const [newSlideUrl, setNewSlideUrl] = useState('');
  const [newSlideTitle, setNewSlideTitle] = useState('');
  const [newSlideLink, setNewSlideLink] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search filter for products
  const [productSearch, setProductSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const menuItems: MenuItem[] = business.menuItems || [];
  const filteredProducts = menuItems.filter(item => 
    !productSearch.trim() || 
    item.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(productSearch.toLowerCase()))
  );

  // Reordering functions
  const moveBlockUp = (index: number) => {
    if (index <= 0) return;
    const newOrder = [...blockOrder];
    const temp = newOrder[index - 1];
    newOrder[index - 1] = newOrder[index];
    newOrder[index] = temp;
    setBlockOrder(newOrder);
  };

  const moveBlockDown = (index: number) => {
    if (index >= blockOrder.length - 1) return;
    const newOrder = [...blockOrder];
    const temp = newOrder[index + 1];
    newOrder[index + 1] = newOrder[index];
    newOrder[index] = temp;
    setBlockOrder(newOrder);
  };

  // Image upload handler
  const handleFileUpload = async (file: File) => {
    if (carouselImages.length >= maxCarouselImages) {
      alert(`وصلت للحد الأقصى المسموح به (${maxCarouselImages} صور) في باقتك الحالية.`);
      return;
    }

    setIsUploadingImage(true);
    setErrorMessage(null);
    try {
      const result = await uploadAndCompressImage(file, {
        folder: `businesses/${business.id}/carousel`,
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 0.9
      });
      setNewSlideUrl(result.url);
    } catch (err) {
      console.error('Error uploading carousel image:', err);
      setErrorMessage('حدث خطأ أثناء رفع الصورة');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleAddSlide = () => {
    if (!newSlideUrl.trim()) {
      setErrorMessage('يرجى تحديد أو رفع صورة أولاً');
      return;
    }

    if (carouselImages.length >= maxCarouselImages) {
      setErrorMessage(`لا يمكنك إضافة أكثر من ${maxCarouselImages} صور`);
      return;
    }

    const newSlide: VipCarouselSlide = {
      id: `slide_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      url: newSlideUrl.trim(),
      title: newSlideTitle.trim() || undefined,
      link: newSlideLink.trim() || undefined
    };

    setCarouselImages(prev => [...prev, newSlide]);
    setNewSlideUrl('');
    setNewSlideTitle('');
    setNewSlideLink('');
    setIsAddingSlide(false);
    setErrorMessage(null);
  };

  const handleRemoveSlide = (slideId: string) => {
    setCarouselImages(prev => prev.filter(s => s.id !== slideId));
  };

  const handleToggleProduct = (productId: string) => {
    if (selectedProductIds.includes(productId)) {
      setSelectedProductIds(prev => prev.filter(id => id !== productId));
    } else {
      if (selectedProductIds.length >= maxProducts) {
        alert(`وصلت للحد الأقصى المسموح به (${maxProducts} منتجات) في باقتك الحالية.`);
        return;
      }
      setSelectedProductIds(prev => [...prev, productId]);
    }
  };

  // Save to Firestore
  const handleSave = async () => {
    if (!db || !business.id) return;

    setIsSaving(true);
    setErrorMessage(null);

    const updatedSections: VipCustomSections = {
      carouselEnabled,
      productsSliderEnabled,
      videoEnabled,
      videoUrl: videoUrl.trim() || undefined,
      videoTitle: videoTitle.trim() || undefined,
      blockOrder,
      carouselImages: carouselImages.slice(0, maxCarouselImages),
      selectedProductIds: selectedProductIds.slice(0, maxProducts)
    };

    try {
      const docRef = doc(db, 'businesses', business.id);
      const sanitizedPayload = await compressAndSanitizeFirestorePayload(
        { vipCustomSections: updatedSections },
        true
      );

      await updateDoc(docRef, sanitizedPayload);
      invalidateCache();
      onSaved(updatedSections);
      onClose();
    } catch (err) {
      console.error('Error saving vip custom sections:', err);
      setErrorMessage('حدث خطأ أثناء حفظ التعديلات');
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden z-10 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-l from-[#1a4d2e] to-emerald-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/10 rounded-xl">
              <Layers className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base">تخصيص عناصر الواجهة</h3>
              <p className="text-xs text-emerald-100 font-medium">
                {isTrial ? 'الاشتراك الذهبي التجريبي' : 'الاشتراك الذهبي'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-right">
          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Block Reordering & Activation */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-stone-900">
                ترتيب وظهور العناصر في التبويب الأول
              </h4>
              <span className="text-xs text-stone-500">
                استخدم الأسهم لتغيير الترتيب لأعلى أو لأسفل
              </span>
            </div>

            <div className="space-y-2">
              {blockOrder.map((blockKey, index) => {
                const isCarousel = blockKey === 'carousel';
                const isProducts = blockKey === 'products_slider';
                const isVideo = blockKey === 'video';

                const isEnabled = isCarousel 
                  ? carouselEnabled 
                  : isProducts 
                  ? productsSliderEnabled 
                  : videoEnabled;

                const toggleEnabled = () => {
                  if (isCarousel) setCarouselEnabled(prev => !prev);
                  else if (isProducts) setProductsSliderEnabled(prev => !prev);
                  else setVideoEnabled(prev => !prev);
                };

                let title = '';
                let subtitle = '';
                let Icon = ImageIcon;

                if (isCarousel) {
                  title = 'كاروسل سلايد شو للصور';
                  subtitle = `الحد المسموح به: حتى ${maxCarouselImages} صور (${carouselImages.length} مضافة)`;
                  Icon = ImageIcon;
                } else if (isProducts) {
                  title = 'سلايدر سكرول لمنتجات وخدمات المحل';
                  subtitle = `الحد المسموح به: حتى ${maxProducts} منتجات (${selectedProductIds.length} مختارة)`;
                  Icon = ShoppingBag;
                } else if (isVideo) {
                  title = 'فيديو من يوتيوب أو فيسبوك أو إنستغرام';
                  subtitle = videoUrl ? 'تم إدراج رابط فيديو' : 'لم يتم إدراج رابط بعد';
                  Icon = VideoIcon;
                }

                return (
                  <div 
                    key={blockKey}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isEnabled 
                        ? 'bg-stone-50 border-stone-200' 
                        : 'bg-stone-100/60 border-stone-200 text-stone-400 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl shrink-0 ${isEnabled ? 'bg-white shadow-2xs text-[#1a4d2e]' : 'bg-stone-200 text-stone-500'}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-bold text-xs sm:text-sm text-stone-900">
                          {title}
                        </p>
                        <p className="text-[11px] text-stone-500">
                          {subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Move Up */}
                      <button
                        type="button"
                        onClick={() => moveBlockUp(index)}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        title="تحريك لأعلى"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        onClick={() => moveBlockDown(index)}
                        disabled={index === blockOrder.length - 1}
                        className="p-1.5 rounded-lg bg-white border border-stone-200 text-stone-700 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        title="تحريك لأسفل"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>

                      {/* Checkbox toggle */}
                      <label className="flex items-center gap-1.5 mr-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={toggleEnabled}
                          className="w-4 h-4 text-[#1a4d2e] rounded border-stone-300 focus:ring-[#1a4d2e]"
                        />
                        <span className="text-xs font-bold text-stone-700">تفعيل</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <hr className="border-stone-100" />

          {/* Section 1: Carousel Management */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-[#1a4d2e]" />
                  <span>صور الكاروسل سلايد شو</span>
                </h4>
                <p className="text-xs text-stone-500">
                  {carouselImages.length} من أصل {maxCarouselImages} صور مسموحة
                </p>
              </div>

              {carouselImages.length < maxCarouselImages && !isAddingSlide && (
                <button
                  type="button"
                  onClick={() => setIsAddingSlide(true)}
                  className="px-3 py-1.5 bg-[#1a4d2e] hover:bg-[#133c23] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>إضافة صورة</span>
                </button>
              )}
            </div>

            {/* Add Slide Sub-form */}
            {isAddingSlide && (
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800">إضافة شريحة جديدة</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingSlide(false);
                      setNewSlideUrl('');
                      setNewSlideTitle('');
                      setNewSlideLink('');
                    }}
                    className="text-stone-400 hover:text-stone-600 text-xs cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-medium text-stone-700">
                    رابط الصورة أو رفع من جهازك
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://example.com/banner.jpg"
                      value={newSlideUrl}
                      onChange={(e) => setNewSlideUrl(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:border-[#1a4d2e]"
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="px-3 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>{isUploadingImage ? 'جاري الرفع...' : 'رفع'}</span>
                    </button>
                  </div>
                  {newSlideUrl && (
                    <div className="mt-2 w-full h-24 rounded-xl overflow-hidden border border-stone-200 bg-black">
                      <img src={newSlideUrl} alt="معاينة" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      عنوان الشريحة (اختياري)
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: خصومات حصرية"
                      value={newSlideTitle}
                      onChange={(e) => setNewSlideTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:border-[#1a4d2e]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">
                      رابط عند النقر (اختياري)
                    </label>
                    <input
                      type="url"
                      placeholder="https://... أو /menu"
                      value={newSlideLink}
                      onChange={(e) => setNewSlideLink(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:border-[#1a4d2e]"
                    />
                  </div>
                </div>

                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={handleAddSlide}
                    disabled={!newSlideUrl.trim() || isUploadingImage}
                    className="px-4 py-2 bg-[#1a4d2e] hover:bg-[#133c23] text-white text-xs font-bold rounded-xl disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    تأكيد الإضافة
                  </button>
                </div>
              </div>
            )}

            {/* List of current slides */}
            {carouselImages.length === 0 && !isAddingSlide ? (
              <p className="text-xs text-stone-500 py-3 text-center bg-stone-50 rounded-xl border border-dashed border-stone-200">
                لم تقم بإضافة أي صورة للسلايد شو بعد
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {carouselImages.map((slide, idx) => (
                  <div 
                    key={slide.id}
                    className="p-2.5 bg-stone-50 border border-stone-200 rounded-xl flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-14 h-10 rounded-lg overflow-hidden bg-black shrink-0 border border-stone-200">
                        <img src={slide.url} alt={`شريحة ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-stone-900 truncate">
                          {slide.title || `شريحة ${idx + 1}`}
                        </p>
                        {slide.link && (
                          <p className="text-[10px] text-stone-400 truncate flex items-center gap-1">
                            <LinkIcon className="h-2.5 w-2.5" />
                            <span className="truncate">{slide.link}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSlide(slide.id)}
                      className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="حذف الشريحة"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-stone-100" />

          {/* Section 2: Products Slider Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-[#1a4d2e]" />
                  <span>تحديد منتجات وخدمات السلايدر</span>
                </h4>
                <p className="text-xs text-stone-500">
                  تم تحديد {selectedProductIds.length} من أصل {maxProducts} منتجات مسموحة
                </p>
              </div>

              {selectedProductIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedProductIds([])}
                  className="text-xs text-red-600 hover:underline font-medium cursor-pointer"
                >
                  إلغاء التحديد
                </button>
              )}
            </div>

            {menuItems.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs text-amber-900">
                لا توجد منتجات مسجلة في قائمة المحل حالياً. يمكنك إضافة المنتجات من تبويب القائمة ثم تحديدها هنا
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="ابحث في المنتجات..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:border-[#1a4d2e]"
                />

                <div className="max-h-56 overflow-y-auto space-y-1.5 p-1 border border-stone-200 rounded-xl bg-stone-50/50">
                  {filteredProducts.map((product) => {
                    const isSelected = selectedProductIds.includes(product.id);
                    const disabled = !isSelected && selectedProductIds.length >= maxProducts;

                    return (
                      <div
                        key={product.id}
                        onClick={() => !disabled && handleToggleProduct(product.id)}
                        className={`p-2 rounded-xl flex items-center justify-between gap-2.5 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border border-emerald-300'
                            : disabled
                            ? 'opacity-40 cursor-not-allowed bg-stone-100'
                            : 'bg-white hover:bg-stone-100 border border-stone-100'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={disabled}
                            onChange={() => handleToggleProduct(product.id)}
                            className="w-4 h-4 text-[#1a4d2e] rounded border-stone-300 focus:ring-[#1a4d2e]"
                            onClick={(e) => e.stopPropagation()}
                          />
                          {product.imageUrl && (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-8 h-8 rounded-lg object-cover shrink-0 border border-stone-200"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-stone-900 truncate">
                              {product.name}
                            </p>
                            <p className="text-[11px] text-[#1a4d2e] font-semibold">
                              {product.price} د.أ
                            </p>
                          </div>
                        </div>

                        {product.category && (
                          <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md shrink-0">
                            {product.category}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <hr className="border-stone-100" />

          {/* Section 3: Video URL from YouTube, Facebook, or Instagram */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-stone-900 flex items-center gap-2">
                  <VideoIcon className="h-4 w-4 text-[#1a4d2e]" />
                  <span>فيديو من يوتيوب أو فيسبوك أو إنستغرام</span>
                </h4>
                <p className="text-xs text-stone-500">
                  أضف رابط فيديو من يوتيوب أو ريلز إنستغرام أو فيديو فيسبوك
                </p>
              </div>

              {videoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setVideoUrl('');
                    setVideoTitle('');
                  }}
                  className="text-xs text-red-600 hover:underline font-medium cursor-pointer"
                >
                  حذف الفيديو
                </button>
              )}
            </div>

            <div className="space-y-3 bg-stone-50 border border-stone-200 rounded-2xl p-3.5">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  رابط الفيديو (يوتيوب، فيسبوك، أو إنستغرام)
                </label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=... أو https://instagram.com/reel/... أو https://fb.watch/..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:border-[#1a4d2e] bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  عنوان الفيديو (اختياري)
                </label>
                <input
                  type="text"
                  placeholder="مثال: جولة تعريفية داخل المحل"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-stone-300 rounded-xl focus:outline-none focus:border-[#1a4d2e] bg-white"
                />
              </div>

              {videoUrl.trim() && (
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-bold text-stone-800 block">
                    معاينة الفيديو
                  </span>
                  <div className="rounded-xl overflow-hidden border border-stone-200">
                    <MediaRenderer
                      type="video"
                      url={videoUrl.trim()}
                      caption={videoTitle.trim() || undefined}
                      aspectRatio="video"
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-[#1a4d2e] hover:bg-[#133c23] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
