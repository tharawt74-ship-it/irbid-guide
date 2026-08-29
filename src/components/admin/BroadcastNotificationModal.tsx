import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Send, 
  Bell, 
  Flame, 
  Briefcase, 
  Sparkles, 
  Newspaper, 
  Store, 
  Link as LinkIcon,
  CheckCircle2
} from 'lucide-react';
import { AppNotification } from '../../types';
import { BUSINESS_CATEGORIES, MainCategory, IRBID_REGIONS_CATEGORIZED } from '../../lib/categories';

interface BroadcastNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (notification: Omit<AppNotification, 'id' | 'createdAt'>) => Promise<void>;
}

export function BroadcastNotificationModal({
  isOpen,
  onClose,
  onSend
}: BroadcastNotificationModalProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AppNotification['type']>('offer');
  const [link, setLink] = useState('/offers');
  const [badge, setBadge] = useState('تنبيه هام 📢');
  const [targetArea, setTargetArea] = useState('all');
  const [targetCategory, setTargetCategory] = useState('all');
  const [targetSubCategory, setTargetSubCategory] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;

    setIsSubmitting(true);
    try {
      await onSend({
        title: title.trim(),
        message: message.trim(),
        type,
        link: link.trim() || '/',
        badge: badge.trim() || undefined,
        userId: 'all',
        targetArea: targetArea !== 'all' ? targetArea : undefined,
        targetCategory: targetCategory !== 'all' ? targetCategory : undefined,
        targetSubCategory: targetSubCategory !== 'all' ? targetSubCategory : undefined
      });
      onClose();
      // Reset
      setTitle('');
      setMessage('');
      setType('offer');
      setLink('/offers');
      setBadge('تنبيه هام 📢');
      setTargetArea('all');
      setTargetCategory('all');
      setTargetSubCategory('all');
    } catch (error) {
      console.error('Error sending broadcast:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTypeChange = (newType: AppNotification['type']) => {
    setType(newType);
    switch (newType) {
      case 'offer':
        setBadge('عرض حصري 🔥');
        setLink('/offers');
        break;
      case 'job':
        setBadge('شاغر وظيفي 💼');
        setLink('/jobs');
        break;
      case 'marketing':
        setBadge('خدمات إعلانية 🚀');
        setLink('/packages');
        break;
      case 'news':
        setBadge('تحديث بالدليل 📢');
        setLink('/news');
        break;
      case 'business':
      case 'system':
      default:
        setBadge('إشعار عام 👋');
        setLink('/');
        break;
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 relative my-auto animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5e1da] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#2d2a26]">بث إشعار جماعي لجميع المستخدمين</h3>
              <p className="text-xs text-stone-500">سيصل الإشعار فوراً في شريط التنبيهات وصفحة الإشعارات</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Notification Type Selector */}
          <div>
            <label className="block text-xs font-black text-stone-700 mb-2">نوع الإشعار والتصنيف</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { id: 'offer', label: 'عرض وتخفيض', icon: Flame, color: 'text-red-600 border-red-200 bg-red-50' },
                { id: 'job', label: 'شاغر وظيفي', icon: Briefcase, color: 'text-emerald-700 border-emerald-200 bg-emerald-50' },
                { id: 'marketing', label: 'باقات تسويق', icon: Sparkles, color: 'text-purple-600 border-purple-200 bg-purple-50' },
                { id: 'news', label: 'أخبار وتحديث', icon: Newspaper, color: 'text-blue-600 border-blue-200 bg-blue-50' },
                { id: 'system', label: 'تنبيه عام', icon: Store, color: 'text-[#1a4d2e] border-stone-200 bg-stone-50' },
              ].map(item => {
                const Icon = item.icon;
                const isSelected = type === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleTypeChange(item.id as AppNotification['type'])}
                    className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? `${item.color} ring-2 ring-[#1a4d2e] font-black shadow-xs`
                        : 'border-stone-200 bg-stone-50/50 text-stone-500 hover:bg-stone-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[11px] whitespace-nowrap">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-black text-stone-700 mb-1.5">عنوان الإشعار *</label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="مثال: خصم 40% في جميع فروع مطعم ديوان زمان"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white transition-all font-bold text-stone-800"
            />
          </div>

          {/* Message Body */}
          <div>
            <label className="block text-xs font-black text-stone-700 mb-1.5">نص ومحتوى الإشعار *</label>
            <textarea
              required
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="اكتب تفاصيل التنبيه أو العرض أو الخبر الذي ترغب بإيصاله للجميع..."
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white transition-all text-stone-800 resize-none"
            ></textarea>
          </div>

          {/* Targeting Filters */}
          <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-3.5">
            <div className="text-xs font-black text-purple-900 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span>تحديد الجمهور المستهدف حسب المنطقة أو القطاع (Targeted Push)</span>
              </div>
              <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md font-bold">
                مطابق لفلاتر ونظام الموقع
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Region / Street Filter */}
              <div>
                <label className="block text-[11px] font-bold text-purple-950 mb-1">المنطقة / الشارع المستهدف</label>
                <select
                  value={targetArea}
                  onChange={e => setTargetArea(e.target.value)}
                  className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="all">🌐 جميع المناطق والشوارع (إربد كافّة)</option>
                  {IRBID_REGIONS_CATEGORIZED.map((group, gIdx) => (
                    <optgroup key={gIdx} label={group.groupName}>
                      {group.areas.map((area, aIdx) => (
                        <option key={aIdx} value={area}>
                          📍 {area}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Main Category / Sector Filter */}
              <div>
                <label className="block text-[11px] font-bold text-purple-950 mb-1">القطاع / التصنيف الرئيسي</label>
                <select
                  value={targetCategory}
                  onChange={e => {
                    setTargetCategory(e.target.value);
                    setTargetSubCategory('all');
                  }}
                  className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="all">🎯 جميع القطاعات والتصنيفات الرئيسية</option>
                  {Object.keys(BUSINESS_CATEGORIES).map((catKey) => (
                    <option key={catKey} value={catKey}>
                      {catKey}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sub Category Filter (Shown when a Main Category is selected) */}
            {targetCategory !== 'all' && BUSINESS_CATEGORIES[targetCategory as MainCategory] && (
              <div className="pt-1 border-t border-purple-100 animate-in fade-in">
                <label className="block text-[11px] font-bold text-purple-950 mb-1">التخصص الفرعي الدقيق (اختياري)</label>
                <select
                  value={targetSubCategory}
                  onChange={e => setTargetSubCategory(e.target.value)}
                  className="w-full bg-white border border-purple-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="all">🔍 جميع التخصصات الفرعية لـ ({targetCategory})</option>
                  {BUSINESS_CATEGORIES[targetCategory as MainCategory].map((subCat, sIdx) => (
                    <option key={sIdx} value={subCat}>
                      • {subCat}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Link and Badge */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-stone-700 mb-1.5">الرابط الموجه (Route / Link)</label>
              <input
                type="text"
                dir="ltr"
                value={link}
                onChange={e => setLink(e.target.value)}
                placeholder="/offers أو /business/ID"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white transition-all text-left text-stone-800"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-stone-700 mb-1.5">شارة الإشعار (Badge)</label>
              <input
                type="text"
                value={badge}
                onChange={e => setBadge(e.target.value)}
                placeholder="مثال: عرض جديد 🔥"
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white transition-all text-stone-800"
              />
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
            <div className="text-[11px] font-bold text-stone-400">معاينة شكل الإشعار عند المستلم:</div>
            <div className="flex items-start gap-3 bg-white p-3 rounded-xl border border-stone-100 shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-[#1a4d2e] text-white flex items-center justify-center shrink-0">
                <Bell className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-stone-900 truncate">{title || 'عنوان الإشعار التجريبي'}</span>
                  {badge && (
                    <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.2 rounded-full font-bold">
                      {badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-stone-500 line-clamp-1 mt-0.5">
                  {message || 'هنا سيظهر نص الإشعار الكامل الذي سيتلقاه المستخدم...'}
                </p>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-[#e5e1da] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-stone-200 font-bold text-sm text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-black text-sm transition-all shadow-md cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              <span>{isSubmitting ? 'جاري البث...' : 'إرسال التنبيه الآن'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>,
    document.body
  );
}
