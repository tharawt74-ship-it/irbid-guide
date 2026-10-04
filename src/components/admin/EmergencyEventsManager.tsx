import React, { useState, useEffect } from 'react';
import { 
  AlertCircle,
  Save, Power, CheckCircle2, Eye, ExternalLink, Calendar,
  Clock, X
} from 'lucide-react';
import { useSystemSettings } from '../../contexts/SystemSettingsContext';
import { EmergencyBannerConfig } from '../../types';

const DEFAULT_BANNER: EmergencyBannerConfig = {
  enabled: false,
  type: 'announcement',
  title: '',
  message: '',
  badgeText: '',
  linkText: '',
  linkUrl: '',
  isUrgent: false,
  showDismiss: true
};

interface EmergencyEventsManagerProps {
  showToast: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export function EmergencyEventsManager({ showToast }: EmergencyEventsManagerProps) {
  const { globalSettings, updateGlobalSettings } = useSystemSettings();
  const [bannerConfig, setBannerConfig] = useState<EmergencyBannerConfig>(() => {
    return globalSettings.emergencyBanner || DEFAULT_BANNER;
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (globalSettings.emergencyBanner) {
      setBannerConfig(globalSettings.emergencyBanner);
    }
  }, [globalSettings.emergencyBanner]);

  const handleSave = async (updatedState?: EmergencyBannerConfig) => {
    const toSave = updatedState || bannerConfig;
    setIsSaving(true);
    try {
      const updatedGlobal = {
        ...globalSettings,
        emergencyBanner: {
          ...toSave,
          updatedAt: Date.now()
        }
      };

      await updateGlobalSettings(updatedGlobal);
      showToast(
        toSave.enabled 
          ? 'تم تفعيل ونشر شريط التنبيهات في أعلى الموقع بنجاح' 
          : 'تم إيقاف وحفظ إعدادات شريط التنبيهات بنجاح', 
        'success'
      );
    } catch (err) {
      console.error('Error saving emergency banner config:', err);
      showToast('حدث خطأ أثناء حفظ التنبيه', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = () => {
    const nextState = { ...bannerConfig, enabled: !bannerConfig.enabled };
    setBannerConfig(nextState);
    handleSave(nextState);
  };

  // Preview styling helper
  const getBannerStyle = (type: EmergencyBannerConfig['type']) => {
    switch (type) {
      case 'emergency':
        return 'bg-gradient-to-r from-red-600 via-rose-700 to-red-800 text-white border-red-500';
      case 'weather':
        return 'bg-gradient-to-r from-sky-600 via-blue-700 to-indigo-800 text-white border-sky-500';
      case 'greeting':
        return 'bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 text-white border-amber-400';
      case 'announcement':
      default:
        return 'bg-gradient-to-r from-emerald-700 via-[#1a4d2e] to-teal-800 text-white border-emerald-500';
    }
  };

  const getBadgeStyle = (type: EmergencyBannerConfig['type']) => {
    switch (type) {
      case 'emergency':
        return 'bg-white text-red-700';
      case 'weather':
        return 'bg-white text-blue-700';
      case 'greeting':
        return 'bg-stone-900 text-amber-300';
      case 'announcement':
      default:
        return 'bg-amber-400 text-stone-950';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            bannerConfig.enabled ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-stone-100 text-stone-500'
          }`}>
            <AlertCircle className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-stone-900">إشعارات الطوارئ والمناسبات والطقس</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                bannerConfig.enabled ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-stone-100 text-stone-600'
              }`}>
                {bannerConfig.enabled ? 'مفعل ويظهر للزوار' : 'معطل حالياً'}
              </span>
            </div>
            <p className="text-stone-500 text-xs">نشر شريط تنبيهي عاجل في أعلى الموقع للمنخفضات الجوية، تعليق الدوام، أو تهاني الأعياد</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggle}
            className={`h-10 px-4 rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-xs cursor-pointer active:scale-95 ${
              bannerConfig.enabled
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-emerald-700 hover:bg-emerald-800 text-white'
            }`}
          >
            <Power className="h-4 w-4" />
            <span>{bannerConfig.enabled ? 'تعطيل الشريط' : 'تفعيل ونشر الشريط فوراً'}</span>
          </button>
        </div>
      </div>

      {/* Live Preview Bar */}
      <div className="bg-white rounded-3xl p-5 border border-stone-200/90 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-stone-700 flex items-center gap-1.5">
            <Eye className="h-4 w-4 text-emerald-600" />
            <span>معاينة حية لشكل الشريط أعلى الموقع:</span>
          </span>
          <span className="text-[10px] text-stone-400 font-medium">يظهر في قمة جميع صفحات الموقع</span>
        </div>

        <div className={`p-3 sm:p-3.5 rounded-2xl shadow-md border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${getBannerStyle(bannerConfig.type)}`}>
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            {bannerConfig.badgeText && (
              <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black shrink-0 ${getBadgeStyle(bannerConfig.type)}`}>
                {bannerConfig.badgeText}
              </span>
            )}
            <div className="min-w-0">
              <span className="font-black text-xs block truncate">{bannerConfig.title || 'عنوان التنبيه...'}</span>
              <span className="text-[11px] text-white/90 line-clamp-1 mt-0.5">{bannerConfig.message || 'نص التنبيه أو البلاغ سيظهر هنا للزوار عند التفعيل...'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {bannerConfig.linkText && bannerConfig.linkUrl && (
              <span className="px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white text-[10px] font-black border border-white/30 flex items-center gap-1 cursor-pointer">
                <span>{bannerConfig.linkText}</span>
                <ExternalLink className="h-3 w-3" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Configuration Form */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/90 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-stone-900 pb-3 border-b border-stone-100">
          تخصيص محتوى وإعدادات شريط التنبيه
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">نوع التنبيه والشكل اللوني</label>
            <select
              value={bannerConfig.type}
              onChange={(e) => setBannerConfig({ ...bannerConfig, type: e.target.value as any })}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:border-emerald-600 bg-white"
            >
              <option value="weather">طقس وأحوال جوية (أزرق سماوي)</option>
              <option value="emergency">طوارئ وتنبيه عاجل (أحمر ناري)</option>
              <option value="announcement">إعلان رسمي هام (أخضر زمردي)</option>
              <option value="greeting">مناسبات وأعياد وتهاني (ذهبي)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">شارة التنبيه (Badge Text)</label>
            <input
              type="text"
              value={bannerConfig.badgeText || ''}
              onChange={(e) => setBannerConfig({ ...bannerConfig, badgeText: e.target.value })}
              placeholder="مثال: طقس إربد، عاجل، تنبيه سير"
              className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">عنوان التنبيه الرئيسي</label>
          <input
            type="text"
            required
            value={bannerConfig.title}
            onChange={(e) => setBannerConfig({ ...bannerConfig, title: e.target.value })}
            placeholder="مثال: تنبيه الأحوال الجوية في إربد"
            className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-black focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-stone-700 mb-1">نص التنبيه والتفاصيل</label>
          <textarea
            rows={2}
            required
            value={bannerConfig.message}
            onChange={(e) => setBannerConfig({ ...bannerConfig, message: e.target.value })}
            placeholder="اكتب تفاصيل التنبيه الموجهة لأهالي وطلاب إربد..."
            className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-medium focus:outline-none focus:border-emerald-600"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">نص زر التوجيه (اختياري)</label>
            <input
              type="text"
              value={bannerConfig.linkText || ''}
              onChange={(e) => setBannerConfig({ ...bannerConfig, linkText: e.target.value })}
              placeholder="مثال: تفاصيل القرار، عروض العيد"
              className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-bold focus:outline-none focus:border-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">رابط الوجهة (URL)</label>
            <input
              type="text"
              value={bannerConfig.linkUrl || ''}
              onChange={(e) => setBannerConfig({ ...bannerConfig, linkUrl: e.target.value })}
              placeholder="مثال: /news أو /offers أو رابط خارجي"
              className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs font-mono text-left focus:outline-none focus:border-emerald-600"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={bannerConfig.isUrgent}
              onChange={(e) => setBannerConfig({ ...bannerConfig, isUrgent: e.target.checked })}
              className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-stone-300"
            />
            <span className="text-xs font-bold text-stone-800">تفعيل تأثير النبض العاجل (Pulse Animation)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={bannerConfig.showDismiss !== false}
              onChange={(e) => setBannerConfig({ ...bannerConfig, showDismiss: e.target.checked })}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-stone-300"
            />
            <span className="text-xs font-bold text-stone-800">السماح للزائر بإغلاق الشريط مؤقتاً</span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-100">
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-[#1a4d2e] hover:bg-[#133b22] text-white text-xs font-black flex items-center gap-2 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'جارٍ الحفظ...' : 'حفظ ونشر التعديلات'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
