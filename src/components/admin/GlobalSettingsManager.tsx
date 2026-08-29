import React, { useState } from 'react';
import { useSystemSettings } from '../../contexts/SystemSettingsContext';
import { Globe, Save, Phone, Mail, MessageSquare, Facebook, Instagram, Share2 } from 'lucide-react';

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

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">رابط الشعار (Logo Image URL)</label>
            <input
              type="text"
              value={formData.logoUrl}
              onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
              className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800"
            />
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
