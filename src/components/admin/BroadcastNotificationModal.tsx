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
  CheckCircle2,
  Bookmark,
  Plus,
  Trash2,
  Stethoscope,
  Home,
  Sliders,
  Search,
  Check,
  Zap,
  Tag
} from 'lucide-react';
import { AppNotification } from '../../types';
import { BUSINESS_CATEGORIES, MainCategory, IRBID_REGIONS_CATEGORIZED } from '../../lib/categories';

interface BroadcastNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (notification: Omit<AppNotification, 'id' | 'createdAt'>) => Promise<void>;
}

export interface NotificationTemplate {
  id: string;
  category: 'business' | 'medical' | 'offer' | 'job' | 'housing' | 'system' | 'custom';
  categoryLabel: string;
  title: string;
  message: string;
  type: AppNotification['type'];
  badge: string;
  link: string;
  isCustom?: boolean;
}

const DEFAULT_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'tpl_biz_welcome',
    category: 'business',
    categoryLabel: 'محلات تجارية',
    title: 'انضمام محل تجاري جديد: {اسم_المحل} 🏬',
    message: 'نُرحب بانضمام {اسم_المحل} رسمياً إلى دليل شو في بإربد! استكشف المنتجات والعروض والخدمات المتاحة الآن.',
    type: 'business',
    badge: 'محل جديد 🌟',
    link: '/business/ID'
  },
  {
    id: 'tpl_biz_vip',
    category: 'business',
    categoryLabel: 'محلات تجارية',
    title: 'انضمام مميز بالباقة الذهبية: {اسم_المحل} ⭐',
    message: 'نُرحب بـ {اسم_المحل} بالباقة الذهبية VIP وحصولهم على ميزة صدارة البحث والإطار المميز بالدليل!',
    type: 'business',
    badge: 'صدارة وممول ⭐',
    link: '/business/ID'
  },
  {
    id: 'tpl_med_welcome',
    category: 'medical',
    categoryLabel: 'منشآت طبية',
    title: 'انضمام منشأة طبية جديدة: {اسم_المنشأة} 🩺',
    message: 'انضمت منشأة {اسم_المنشأة} رسمياً إلى دليل الرعاية الطبية والصحية بشو في بإربد! أهلاً وسهلاً بهم.',
    type: 'business',
    badge: 'منشأة طبية جديدة 🩺',
    link: '/medical'
  },
  {
    id: 'tpl_med_offer',
    category: 'medical',
    categoryLabel: 'منشآت طبية',
    title: 'عروض وفحوصات طبية لدى: {اسم_المنشأة} 🩺',
    message: 'خصومات وعروض مميزة على الفحوصات والاستشارات الطبية لدى {اسم_المنشأة}، احجز موعدك اليوم.',
    type: 'offer',
    badge: 'عرض طبي 🩺',
    link: '/medical'
  },
  {
    id: 'tpl_offer_discount',
    category: 'offer',
    categoryLabel: 'عروض وتخفيضات',
    title: 'تنزيلات وعروض حصرية جديدة في إربد 🔥',
    message: 'استمتع بخصومات وتصفيات حصرية لدى أرقى المحلات والمتاجر في إربد! تفقّد قسم العروض الآن.',
    type: 'offer',
    badge: 'تنزيلات حصرية 🔥',
    link: '/offers'
  },
  {
    id: 'tpl_offer_coupon',
    category: 'offer',
    categoryLabel: 'عروض وتخفيضات',
    title: 'كود خصم حصري لمستخدمي شو في بإربد 🎁',
    message: 'استخدم كود الخصم الخاص واحصل على تخفيض فوري لدى المحلات المشاركة بالدليل.',
    type: 'offer',
    badge: 'كود خصم 🎁',
    link: '/offers'
  },
  {
    id: 'tpl_job_vacancy',
    category: 'job',
    categoryLabel: 'وظائف وشواغر',
    title: 'شواغر وفرص عمل جديدة متاحة الآن 💼',
    message: 'تتوفر فرص عمل وشواغر جديدة لدى شركات ومحلات إربد، قدّم طلبك مباشرة وتواصل مع أصحاب العمل.',
    type: 'job',
    badge: 'شاغر وظيفي 💼',
    link: '/jobs'
  },
  {
    id: 'tpl_housing_student',
    category: 'housing',
    categoryLabel: 'عقارات وسكنات',
    title: 'سكنات طلابية وشقق مفروشة جديدة 🏠',
    message: 'تمت إضافة شقق وسكنات طلابية حديثة في إربد بالقرب من الجامعات، تصفح الصور والتفاصيل والتواصل المباشر.',
    type: 'system',
    badge: 'سكنات وعقارات 🏠',
    link: '/housing'
  },
  {
    id: 'tpl_sys_feature',
    category: 'system',
    categoryLabel: 'تحديثات النظام',
    title: 'تحديث جديد وميزات مميزة بمنصة شو في بإربد 🚀',
    message: 'أطلقنا ميزات جديدة لتسهيل تصفح المحلات والعروض والخدمات بالمنصة! تفقّد التحديث الجديد.',
    type: 'news',
    badge: 'تحديث جديد 🚀',
    link: '/news'
  }
];

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

  // Templates state
  const [showTemplates, setShowTemplates] = useState(true);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');
  const [templateSearch, setTemplateSearch] = useState('');
  const [customTemplates, setCustomTemplates] = useState<NotificationTemplate[]>([]);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isSavingCustomTpl, setIsSavingCustomTpl] = useState(false);
  const [appliedTplId, setAppliedTplId] = useState<string | null>(null);

  // Load custom templates from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_custom_notification_templates');
      if (saved) {
        setCustomTemplates(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Error loading custom notification templates:", e);
    }
  }, []);

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
      setAppliedTplId(null);
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

  const applyTemplate = (tpl: NotificationTemplate) => {
    setTitle(tpl.title);
    setMessage(tpl.message);
    setType(tpl.type);
    setBadge(tpl.badge);
    setLink(tpl.link);
    setAppliedTplId(tpl.id);
  };

  const handleSaveCurrentAsCustomTemplate = () => {
    if (!title.trim() || !message.trim()) {
      alert("الرجاء كتابة عنوان ونص الإشعار أولاً قبل حفظ القالب");
      return;
    }
    const tplName = newTemplateName.trim() || title.trim().substring(0, 25);
    const newTpl: NotificationTemplate = {
      id: 'custom_' + Date.now(),
      category: 'custom',
      categoryLabel: 'قوالبي المخصصة',
      title: title.trim(),
      message: message.trim(),
      type,
      badge: badge.trim() || 'إشعار خاص 🌟',
      link: link.trim() || '/',
      isCustom: true
    };

    const updated = [newTpl, ...customTemplates];
    setCustomTemplates(updated);
    try {
      localStorage.setItem('admin_custom_notification_templates', JSON.stringify(updated));
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }
    setNewTemplateName('');
    setIsSavingCustomTpl(false);
    setSelectedCategoryTab('custom');
    setAppliedTplId(newTpl.id);
  };

  const handleDeleteCustomTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customTemplates.filter(t => t.id !== id);
    setCustomTemplates(updated);
    try {
      localStorage.setItem('admin_custom_notification_templates', JSON.stringify(updated));
    } catch (err) {
      console.warn("Error updating custom templates:", err);
    }
    if (appliedTplId === id) setAppliedTplId(null);
  };

  const insertVariable = (variable: string) => {
    setMessage(prev => (prev ? prev + ' ' + variable : variable));
  };

  const allTemplates = [...customTemplates, ...DEFAULT_TEMPLATES];

  const filteredTemplates = allTemplates.filter(tpl => {
    const matchesTab = selectedCategoryTab === 'all' || tpl.category === selectedCategoryTab;
    const matchesSearch = !templateSearch.trim() || 
      tpl.title.toLowerCase().includes(templateSearch.toLowerCase()) || 
      tpl.message.toLowerCase().includes(templateSearch.toLowerCase()) ||
      tpl.badge.toLowerCase().includes(templateSearch.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return createPortal(
    <div className="fixed inset-0 z-[100000] bg-stone-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-hidden" dir="rtl">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl max-w-2xl w-full max-h-[92dvh] sm:max-h-[90vh] shadow-2xl border border-stone-200 relative my-0 sm:my-auto animate-in fade-in zoom-in-95 flex flex-col overflow-hidden">
        
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5e1da] p-4 sm:px-6 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[#2d2a26]">بث إشعار جماعي وإدارة القوالب</h3>
              <p className="text-xs text-stone-500">اختر قالباً صاه جاهزاً أو صغ تنبيهاً مخصصاً لجميع مستخدمي المنصة</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">

            {/* TEMPLATE MANAGER SECTION */}
            <div className="bg-stone-50 rounded-2xl border border-stone-200/80 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowTemplates(!showTemplates)}
                  className="flex items-center gap-2 text-xs font-black text-purple-900 cursor-pointer hover:text-purple-700 transition-colors"
                >
                  <Bookmark className="h-4 w-4 text-purple-600" />
                  <span>قوالب الإشعارات الجاهزة والمصاغة ({allTemplates.length})</span>
                  <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md font-bold">
                    {showTemplates ? 'إخفاء المكتبة ▲' : 'عرض القوالب ▼'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSavingCustomTpl(!isSavingCustomTpl)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/70 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-amber-600" />
                  <span>حفظ القالب الحالي</span>
                </button>
              </div>

              {/* Inline Save Form */}
              {isSavingCustomTpl && (
                <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200 text-xs space-y-2 animate-in fade-in">
                  <span className="font-bold text-amber-900 block">حفظ الإشعار الحالي كقالب مخصص لاستخدامه مستقبلاً:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTemplateName}
                      onChange={e => setNewTemplateName(e.target.value)}
                      placeholder="اسم القالب (اختياري)..."
                      className="flex-1 bg-white border border-amber-300 rounded-lg px-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCurrentAsCustomTemplate}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors"
                    >
                      حفظ الآن
                    </button>
                  </div>
                </div>
              )}

              {/* Templates Drawer */}
              {showTemplates && (
                <div className="space-y-2.5 pt-1">
                  {/* Category Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
                    {[
                      { id: 'all', label: 'الكل 🌐' },
                      { id: 'business', label: '🏬 محلات' },
                      { id: 'medical', label: '🩺 طبية' },
                      { id: 'offer', label: '🔥 عروض' },
                      { id: 'job', label: '💼 وظائف' },
                      { id: 'housing', label: '🏠 عقارات' },
                      { id: 'system', label: '🚀 تحديثات' },
                      { id: 'custom', label: `⭐ مخصصة (${customTemplates.length})` }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSelectedCategoryTab(tab.id)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap cursor-pointer transition-all ${
                          selectedCategoryTab === tab.id
                            ? 'bg-purple-700 text-white shadow-2xs'
                            : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Search Template Input */}
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-stone-400 absolute right-2.5 top-2.5" />
                    <input
                      type="text"
                      value={templateSearch}
                      onChange={e => setTemplateSearch(e.target.value)}
                      placeholder="ابحث في صياغات وقوالب الإشعارات..."
                      className="w-full bg-white border border-stone-200 rounded-xl pr-8 pl-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>

                  {/* Templates List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                    {filteredTemplates.length === 0 ? (
                      <div className="col-span-2 text-center py-4 text-xs text-stone-400 bg-white rounded-xl border border-dashed border-stone-200">
                        لا توجد قوالب تطابق هذا البحث أو الفئة.
                      </div>
                    ) : (
                      filteredTemplates.map(tpl => {
                        const isApplied = appliedTplId === tpl.id;
                        return (
                          <div
                            key={tpl.id}
                            onClick={() => applyTemplate(tpl)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between text-right group ${
                              isApplied
                                ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-500'
                                : 'bg-white border-stone-200 hover:border-purple-200 hover:bg-purple-50/40'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-xs font-black text-stone-900 line-clamp-1">
                                  {tpl.title}
                                </span>
                                <span className="text-[9px] bg-stone-100 text-stone-600 font-bold px-1.5 py-0.5 rounded shrink-0">
                                  {tpl.badge}
                                </span>
                              </div>
                              <p className="text-[10px] text-stone-500 line-clamp-2 leading-relaxed">
                                {tpl.message}
                              </p>
                            </div>

                            <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-stone-100 text-[10px]">
                              <span className="text-purple-700 font-bold flex items-center gap-1">
                                {isApplied ? <Check className="h-3 w-3 text-purple-600" /> : <Zap className="h-3 w-3 text-stone-400 group-hover:text-purple-600" />}
                                <span>{isApplied ? 'تم التعبئة' : 'تطبيق القالب'}</span>
                              </span>

                              {tpl.isCustom && (
                                <button
                                  type="button"
                                  onClick={(e) => handleDeleteCustomTemplate(tpl.id, e)}
                                  className="text-red-400 hover:text-red-600 p-0.5 rounded cursor-pointer"
                                  title="حذف القالب المخصص"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* TYPE SELECTOR */}
            <div>
              <label className="block text-xs font-black text-stone-700 mb-2">نوع الإشعار واللون البصري</label>
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
                      className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border text-center transition-all cursor-pointer ${
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

            {/* TITLE */}
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

            {/* MESSAGE BODY & QUICK VARIABLES */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-black text-stone-700">نص ومحتوى الإشعار *</label>
                <div className="flex items-center gap-1 text-[10px] text-stone-500">
                  <span>إدراج متغير:</span>
                  {[
                    '{اسم_المحل}',
                    '{اسم_المنشأة}',
                    '{المنطقة}',
                    '{الخصم}'
                  ].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      className="bg-stone-100 hover:bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded border border-stone-200 cursor-pointer font-mono font-bold"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                required
                rows={3}
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="اكتب تفاصيل التنبيه أو العرض أو الخبر الذي ترغب بإيصاله للجميع..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white transition-all text-stone-800 resize-none"
              ></textarea>
            </div>

            {/* TARGETING FILTERS */}
            <div className="p-3.5 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-3">
              <div className="text-xs font-black text-purple-900 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span>استهداف فئة أو منطقة محددة (اختياري)</span>
                </div>
                <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md font-bold">
                  Targeted Push
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Region Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-purple-950 mb-1">المنطقة / الشارع</label>
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

                {/* Category Filter */}
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

              {/* Sub Category Filter */}
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

            {/* LINK & BADGE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-black text-stone-700 mb-1">الرابط الموجه (Route)</label>
                <input
                  type="text"
                  dir="ltr"
                  value={link}
                  onChange={e => setLink(e.target.value)}
                  placeholder="/offers أو /business/ID"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white transition-all text-left text-stone-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-stone-700 mb-1">شارة الإشعار (Badge)</label>
                <input
                  type="text"
                  value={badge}
                  onChange={e => setBadge(e.target.value)}
                  placeholder="مثال: عرض جديد 🔥"
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white transition-all text-stone-800 font-bold"
                />
              </div>
            </div>

            {/* LIVE PREVIEW BOX */}
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 space-y-1.5">
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

          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:px-6 bg-stone-50/90 border-t border-[#e5e1da] shrink-0 sticky bottom-0 z-10 flex items-center justify-end gap-3">
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
