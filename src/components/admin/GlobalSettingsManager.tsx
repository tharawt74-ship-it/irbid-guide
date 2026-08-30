import React, { useState } from 'react';
import { useSystemSettings } from '../../contexts/SystemSettingsContext';
import { Globe, Save, Phone, Mail, MessageSquare, Facebook, Instagram, Share2, Image as ImageIcon, LayoutGrid, CheckCircle2 } from 'lucide-react';
import { ImageUploader } from '../ui/ImageUploader';

interface GlobalSettingsManagerProps {
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export function GlobalSettingsManager({ showToast }: GlobalSettingsManagerProps) {
  const { globalSettings, updateGlobalSettings } = useSystemSettings();
  const [formData, setFormData] = useState(globalSettings);

  const handleSave = async () => {
    await updateGlobalSettings(formData);
    showToast('تم حفظ إعدادات الهوية والتواصل بنجاح');
  };

  return (
    <div className="bg-white rounded-3xl p-6 border border-[#e5e1da] shadow-xs space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-sky-50 rounded-2xl text-sky-700">
            <Globe className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-stone-900">إعدادات الهوية والتواصل وشعار المنصة</h2>
            <p className="text-stone-500 text-xs">تعديل اسم الموقع، الشعار، أرقام التواصل وروابط وسائل التواصل الاجتماعي</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="inline-flex items-center justify-center gap-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-5 py-2.5 rounded-xl text-xs font-black transition-colors cursor-pointer shadow-xs"
        >
          <Save className="h-4 w-4 text-[#ff9f1c]" />
          <span>حفظ التغييرات</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Brand Info */}
        <div className="space-y-4 border border-stone-200 rounded-2xl p-5 bg-stone-50/50">
          <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
            <span>بيانات الهوية والمسمى</span>
          </h3>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">اسم الموقع الرئيسي</label>
            <input
              type="text"
              value={formData.siteName}
              onChange={e => setFormData({ ...formData, siteName: e.target.value })}
              className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">العنوان الفرعي (Tagline)</label>
            <input
              type="text"
              value={formData.siteSubtitle}
              onChange={e => setFormData({ ...formData, siteSubtitle: e.target.value })}
              className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800"
            />
          </div>

          {/* Logo / Icon Upload via ImageUploader */}
          <div className="space-y-3 pt-2">
            <ImageUploader
              label="شعار أو أيقونة المنصة (رفع مباشر من الجهاز)"
              folder="site_brand"
              value={formData.logoUrl || ''}
              onChange={(url) => setFormData(prev => ({ ...prev, logoUrl: url }))}
              aspectRatio="cover"
              placeholder="اختر ملف صورة الشعار أو الأيقونة من جهازك"
            />

            {/* Logo Display Mode Selector */}
            <div className="bg-white p-3.5 rounded-xl border border-stone-200/90 space-y-2">
              <label className="block text-xs font-black text-stone-800 flex items-center gap-1.5">
                <LayoutGrid className="h-3.5 w-3.5 text-[#1a4d2e]" />
                <span>نمط عرض الشعار في شريط التنقل (الهيدر):</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, useFullLogo: false })}
                  className={`flex flex-col items-start text-right p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                    !formData.useFullLogo
                      ? 'border-[#1a4d2e] bg-[#1a4d2e]/5 text-[#1a4d2e] font-black shadow-2xs'
                      : 'border-stone-200 bg-stone-50/50 text-stone-600 hover:bg-stone-100 font-medium'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold">أيقونة + اسم المنصة</span>
                    {!formData.useFullLogo && <CheckCircle2 className="h-4 w-4 text-[#1a4d2e]" />}
                  </div>
                  <span className="text-[10px] text-stone-500 font-normal">
                    تظهر صورة اللوجو كأيقونة بجانب الاسم والنص الفرعي
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, useFullLogo: true })}
                  className={`flex flex-col items-start text-right p-3 rounded-xl border text-xs transition-all cursor-pointer ${
                    formData.useFullLogo
                      ? 'border-[#1a4d2e] bg-[#1a4d2e]/5 text-[#1a4d2e] font-black shadow-2xs'
                      : 'border-stone-200 bg-stone-50/50 text-stone-600 hover:bg-stone-100 font-medium'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold">لوجو كامل مخصص</span>
                    {formData.useFullLogo && <CheckCircle2 className="h-4 w-4 text-[#1a4d2e]" />}
                  </div>
                  <span className="text-[10px] text-stone-500 font-normal">
                    يتم عرض صورة اللوجو الكامل وتختفي النصوص والأيقونة الافتراضية
                  </span>
                </button>
              </div>

              {/* Logo Height / Size Adjustment Slider & Presets */}
              <div className="pt-3 border-t border-stone-100 mt-2 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-700">حجم الشعار داخل الشريط العلوي:</span>
                  <span className="text-xs font-black text-[#1a4d2e] bg-[#1a4d2e]/10 px-2.5 py-1 rounded-lg border border-[#1a4d2e]/20" dir="ltr">
                    {formData.logoHeight || 52} px
                  </span>
                </div>
                
                <input
                  type="range"
                  min="28"
                  max="80"
                  step="2"
                  value={formData.logoHeight || 52}
                  onChange={(e) => setFormData({ ...formData, logoHeight: Number(e.target.value) })}
                  className="w-full accent-[#1a4d2e] cursor-pointer"
                />

                {/* Preset Size Buttons */}
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[
                    { label: 'صغير', size: 36 },
                    { label: 'متوسط', size: 48 },
                    { label: 'كبير', size: 58 },
                    { label: 'كبير جداً', size: 68 },
                    { label: 'أقصى حجم', size: 78 }
                  ].map((preset) => {
                    const isSelected = (formData.logoHeight || 52) === preset.size;
                    return (
                      <button
                        key={preset.size}
                        type="button"
                        onClick={() => setFormData({ ...formData, logoHeight: preset.size })}
                        className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl text-[11px] font-black transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs scale-102'
                            : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100 hover:text-stone-900'
                        }`}
                      >
                        <span>{preset.label}</span>
                        <span className={`text-[9px] font-bold mt-0.5 ${isSelected ? 'text-emerald-200' : 'text-stone-400'}`}>
                          {preset.size}px
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Live Logo Preview Container */}
                <div className="mt-3 p-3 bg-stone-100/80 rounded-2xl border border-stone-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-stone-500 block">معاينة فورية لحجم الشعار:</span>
                  <div className="bg-white rounded-xl p-3 border border-stone-200/90 flex items-center justify-center min-h-[64px] overflow-hidden">
                    {formData.useFullLogo && formData.logoUrl ? (
                      <img 
                        src={formData.logoUrl} 
                        alt="معاينة اللوجو" 
                        style={{ height: `${formData.logoHeight || 52}px` }}
                        className="max-h-[64px] max-w-full object-contain"
                      />
                    ) : (
                      <div className="flex items-center gap-3">
                        <div 
                          style={{
                            width: `${Math.min(54, Math.max(34, Math.round((formData.logoHeight || 52) * 0.8)))}px`,
                            height: `${Math.min(54, Math.max(34, Math.round((formData.logoHeight || 52) * 0.8)))}px`
                          }}
                          className="rounded-2xl bg-gradient-to-br from-[#1a4d2e] to-[#133b22] text-white flex items-center justify-center shadow-xs overflow-hidden shrink-0"
                        >
                          {formData.logoUrl ? (
                            <img src={formData.logoUrl} alt="معاينة" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="h-6 w-6 text-[#ff9f1c]" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span 
                            style={{ fontSize: `${Math.min(22, Math.max(14, Math.round((formData.logoHeight || 52) * 0.34)))}px` }}
                            className="font-black text-[#1a4d2e] leading-none"
                          >
                            {formData.siteName || 'اسم الموقع'}
                          </span>
                          <span className="text-[10px] font-bold text-stone-400 mt-1">{formData.siteSubtitle || 'العنوان الفرعي'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">وصف الفوتر والموقع العام</label>
            <textarea
              rows={3}
              value={formData.footerDescription}
              onChange={e => setFormData({ ...formData, footerDescription: e.target.value })}
              className="w-full bg-white border border-stone-200 rounded-xl p-3 text-xs font-bold text-stone-800"
            />
          </div>
        </div>

        {/* Contact & Social Links */}
        <div className="space-y-4 border border-stone-200 rounded-2xl p-5 bg-stone-50/50">
          <h3 className="font-black text-sm text-stone-900 flex items-center gap-2">
            <span>أرقام وروابط التواصل الاجتماعي</span>
          </h3>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
              <Phone className="h-3.5 w-3.5 text-stone-500" />
              <span>رقم الهاتف المباشر للدعم</span>
            </label>
            <input
              type="text"
              value={formData.contactPhone}
              onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
              className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 dir-ltr text-right"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
              <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
              <span>رقم واتساب الإدارة الرسمية</span>
            </label>
            <input
              type="text"
              value={formData.whatsappNumber}
              onChange={e => setFormData({ ...formData, whatsappNumber: e.target.value })}
              className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 dir-ltr text-right"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
              <Mail className="h-3.5 w-3.5 text-stone-500" />
              <span>البريد الإلكتروني الرسمي</span>
            </label>
            <input
              type="email"
              value={formData.contactEmail}
              onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
              className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 dir-ltr text-right"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
              <Facebook className="h-3.5 w-3.5 text-blue-600" />
              <span>رابط صفحة فيسبوك</span>
            </label>
            <input
              type="text"
              value={formData.facebookUrl}
              onChange={e => setFormData({ ...formData, facebookUrl: e.target.value })}
              className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 dir-ltr text-right"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1 flex items-center gap-1">
              <Instagram className="h-3.5 w-3.5 text-pink-600" />
              <span>رابط حساب إنستغرام</span>
            </label>
            <input
              type="text"
              value={formData.instagramUrl}
              onChange={e => setFormData({ ...formData, instagramUrl: e.target.value })}
              className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 dir-ltr text-right"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
