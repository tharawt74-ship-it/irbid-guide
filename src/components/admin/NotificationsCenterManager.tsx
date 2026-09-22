import React, { useState, useEffect } from 'react';
import { 
  Send, 
  Bell, 
  Flame, 
  Briefcase, 
  Sparkles, 
  Newspaper, 
  Store, 
  Trash2, 
  Bookmark, 
  Plus, 
  Search, 
  Check, 
  Zap, 
  ExternalLink,
  Megaphone,
  Stethoscope,
  Home as HomeIcon,
  Filter,
  Edit3,
  RotateCcw,
  X,
  Smartphone,
  BellRing,
  Clock,
  Volume2,
  VolumeX,
  Eye,
  Users,
  Radio,
  Layers,
  AlertCircle,
  CheckCircle2,
  Wand2,
  Info,
  Calendar,
  ShieldAlert,
  Copy,
  FileText
} from 'lucide-react';
import { Link } from 'react-router';
import { AppNotification } from '../../types';
import { BUSINESS_CATEGORIES, MainCategory, IRBID_REGIONS_CATEGORIZED } from '../../lib/categories';

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

export const TEMPLATE_VARIABLES = [
  { key: '{اسم_المحل}', label: 'اسم المحل' },
  { key: '{اسم_المنشأة}', label: 'اسم المنشأة الطبية' },
  { key: '{المنطقة}', label: 'اسم المنطقة/الشارع' },
  { key: '{الخصم}', label: 'نسبة/قيمة الخصم' },
  { key: '{اسم_المستخدم}', label: 'اسم الزائر/العميل' },
  { key: '{اسم_المنصة}', label: 'اسم المنصة (شو في بإربد)' },
  { key: '{التاريخ}', label: 'تاريخ اليوم' },
];

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

interface NotificationsCenterManagerProps {
  onSendBroadcast: (notification: Omit<AppNotification, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteAllNotifications?: () => Promise<void>;
  isDeletingAllNotifications?: boolean;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export function NotificationsCenterManager({
  onSendBroadcast,
  onDeleteAllNotifications,
  isDeletingAllNotifications = false,
  showToast
}: NotificationsCenterManagerProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AppNotification['type']>('offer');
  const [link, setLink] = useState('/offers');
  const [badge, setBadge] = useState('تنبيه هام 📢');
  const [targetArea, setTargetArea] = useState('all');
  const [targetCategory, setTargetCategory] = useState('all');
  const [targetSubCategory, setTargetSubCategory] = useState('all');
  const [targetRole, setTargetRole] = useState<'all' | 'merchants' | 'users' | 'supervisors'>('all');
  const [priority, setPriority] = useState<'high' | 'normal'>('high');
  const [deliveryMode, setDeliveryMode] = useState<'now' | 'scheduled'>('now');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('18:00');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [activePreviewMode, setActivePreviewMode] = useState<'phone' | 'inapp' | 'banner'>('phone');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [focusedField, setFocusedField] = useState<'title' | 'message' | null>('message');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const QUICK_EMOJIS = ['🔥', '⚡', '🎁', '📢', '🌟', '📍', '🩺', '💼', '🏷️', '🏬', '🎉', '💡', '⏰', '🚀'];

  const ROUTE_PRESETS = [
    { label: 'العروض 🔥', path: '/offers' },
    { label: 'الوظائف 💼', path: '/jobs' },
    { label: 'الطبية 🩺', path: '/medical' },
    { label: 'العقارات 🏠', path: '/housing' },
    { label: 'المواصلات 🚌', path: '/transportation' },
    { label: 'الباقات 🚀', path: '/packages' },
    { label: 'المتاجر 🏬', path: '/stores' },
    { label: 'الرئيسية 🌐', path: '/' },
  ];

  // Templates state initialized from localStorage or DEFAULT_TEMPLATES
  const [templates, setTemplates] = useState<NotificationTemplate[]>(() => {
    try {
      const savedAll = localStorage.getItem('admin_all_notification_templates');
      if (savedAll) {
        return JSON.parse(savedAll);
      }
      const savedCustom = localStorage.getItem('admin_custom_notification_templates');
      if (savedCustom) {
        const customParsed = JSON.parse(savedCustom);
        return [...customParsed, ...DEFAULT_TEMPLATES];
      }
    } catch (e) {
      console.warn("Error loading notification templates:", e);
    }
    return DEFAULT_TEMPLATES;
  });

  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');
  const [templateSearch, setTemplateSearch] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [isSavingCustomTpl, setIsSavingCustomTpl] = useState(false);
  const [appliedTplId, setAppliedTplId] = useState<string | null>(null);

  // Edit Template Modal State
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const persistTemplates = (newTemplates: NotificationTemplate[]) => {
    setTemplates(newTemplates);
    try {
      localStorage.setItem('admin_all_notification_templates', JSON.stringify(newTemplates));
    } catch (e) {
      console.warn("Error saving templates to localStorage:", e);
    }
  };

  const handleFillSampleData = () => {
    setTitle('خصم حقيقي 35% لفترة محدودة لدى أفضل مطاعم ومقاهي إربد! 🔥');
    setMessage('بمناسبة الموسم الجديد، استمتع بتخفيضات ومزايا حصرية لدى المحلات والمتاجر المشاركة في دليل شو في بإربد. انقر الآن لتصفح العروض والقسائم المتاحة.');
    setType('offer');
    setBadge('تنزيلات الموسم 🔥');
    setLink('/offers');
    setTargetArea('all');
    setTargetCategory('all');
    setTargetSubCategory('all');
    setTargetRole('all');
    setPriority('high');
    setSoundEnabled(true);
    setAppliedTplId(null);
    if (showToast) showToast('تم تعبئة نموذج تجريبي احترافي بنجاح ✨');
  };

  const handleClearForm = () => {
    setTitle('');
    setMessage('');
    setType('offer');
    setLink('/offers');
    setBadge('تنبيه هام 📢');
    setTargetArea('all');
    setTargetCategory('all');
    setTargetSubCategory('all');
    setTargetRole('all');
    setPriority('high');
    setDeliveryMode('now');
    setAppliedTplId(null);
    if (showToast) showToast('تم مسح وتفريغ جميع حقول النموذج');
  };

  const insertEmoji = (emoji: string) => {
    if (focusedField === 'title') {
      setTitle(prev => prev + emoji);
    } else {
      setMessage(prev => prev + emoji);
    }
  };

  const handleOpenConfirmModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      if (showToast) showToast('الرجاء كتابة عنوان ونص الإشعار أولاً', 'error');
      return;
    }
    if (deliveryMode === 'scheduled' && (!scheduledDate || !scheduledTime)) {
      if (showToast) showToast('الرجاء تحديد تاريخ ووقت الجدولة الزمنية للإشعار', 'error');
      return;
    }
    setIsConfirmModalOpen(true);
  };

  const executeBroadcast = async () => {
    setIsSubmitting(true);
    try {
      await onSendBroadcast({
        title: title.trim(),
        message: message.trim(),
        type,
        link: link.trim() || '/',
        badge: badge.trim() || undefined,
        userId: targetRole === 'all' ? 'all' : targetRole,
        targetArea: targetArea !== 'all' ? targetArea : undefined,
        targetCategory: targetCategory !== 'all' ? targetCategory : undefined,
        targetSubCategory: targetSubCategory !== 'all' ? targetSubCategory : undefined
      });

      if (showToast) {
        if (deliveryMode === 'scheduled') {
          showToast(`تم جدولة بث الإشعار بنجاح للتاريخ: ${scheduledDate} الساعة ${scheduledTime} ⏰`, 'success');
        } else {
          showToast('تم إطلاق وبث الإشعار الجماعي لجميع المستهدفين بنجاح 🚀', 'success');
        }
      }

      handleClearForm();
      setIsConfirmModalOpen(false);
    } catch (error) {
      console.error('Error sending broadcast:', error);
      if (showToast) showToast('حدث خطأ أثناء بث الإشعار، يرجى المحاولة لاحقاً', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAudienceEstimateText = () => {
    let baseText = "جميع المسجلين والزوار في محافظة إربد (~ 15,000+ مستخدم)";
    if (targetRole === 'merchants') baseText = "أصحاب المحلات والتجار المسجلين بالدليل (~ 1,200+ صاحب متجر)";
    if (targetRole === 'supervisors') baseText = "طاقم المشرفين والمدراء الإداريين بالمنصة (~ 25 مشرف)";
    if (targetRole === 'users') baseText = "الزوار وأعضاء المنصة المسجلين فقط (~ 13,800+ زائر)";

    const areaPart = targetArea !== 'all' ? ` 📍 المنطقة: ${targetArea}` : ' 📍 كافة مناطق إربد';
    const categoryPart = targetCategory !== 'all' ? ` 🏬 القطاع: ${targetCategory}` : '';
    const subCategoryPart = targetSubCategory !== 'all' ? ` (${targetSubCategory})` : '';

    return `${baseText} | ${areaPart}${categoryPart}${subCategoryPart}`;
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

    const updated = [newTpl, ...templates];
    persistTemplates(updated);
    setNewTemplateName('');
    setIsSavingCustomTpl(false);
    setSelectedCategoryTab('custom');
    setAppliedTplId(newTpl.id);
    if (showToast) showToast('تم حفظ القالب المخصص بنجاح ⭐');
  };

  const handleDeleteTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = templates.filter(t => t.id !== id);
    persistTemplates(updated);
    if (appliedTplId === id) setAppliedTplId(null);
    if (showToast) showToast('تم حذف القالب');
  };

  const handleOpenEditTemplate = (tpl: NotificationTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTemplate({ ...tpl });
    setIsEditModalOpen(true);
  };

  const handleSaveEditedTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    if (!editingTemplate.title.trim() || !editingTemplate.message.trim()) {
      if (showToast) showToast('الرجاء كتابة العنوان والنص للقالب', 'error');
      return;
    }

    const updated = templates.map(t => t.id === editingTemplate.id ? editingTemplate : t);
    persistTemplates(updated);

    // Update form if currently applied
    if (appliedTplId === editingTemplate.id) {
      setTitle(editingTemplate.title);
      setMessage(editingTemplate.message);
      setBadge(editingTemplate.badge);
      setLink(editingTemplate.link);
      setType(editingTemplate.type);
    }

    setIsEditModalOpen(false);
    setEditingTemplate(null);
    if (showToast) showToast('تم حفظ وتعديل القالب بنجاح ⭐');
  };

  const handleResetTemplatesToDefault = () => {
    if (window.confirm('هل أنت متأكد من استعادة جميع القوالب إلى الوضع الافتراضي الاصلي؟ سيعيد هذا صياغة جميع القوالب للقيم الأصلية.')) {
      setTemplates(DEFAULT_TEMPLATES);
      try {
        localStorage.removeItem('admin_all_notification_templates');
        localStorage.removeItem('admin_custom_notification_templates');
      } catch (e) {}
      if (showToast) showToast('تمت استعادة القوالب الافتراضية بنجاح ⭐');
    }
  };

  const insertVariableToTitle = (variable: string) => {
    setTitle(prev => (prev ? prev + ' ' + variable : variable));
  };

  const insertVariableToMessage = (variable: string) => {
    setMessage(prev => (prev ? prev + ' ' + variable : variable));
  };

  const filteredTemplates = templates.filter(tpl => {
    const matchesTab = selectedCategoryTab === 'all' || tpl.category === selectedCategoryTab;
    const matchesSearch = !templateSearch.trim() || 
      tpl.title.toLowerCase().includes(templateSearch.toLowerCase()) || 
      tpl.message.toLowerCase().includes(templateSearch.toLowerCase()) ||
      tpl.badge.toLowerCase().includes(templateSearch.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Top Banner & Control Card */}
      <div className="bg-white p-6 rounded-3xl border border-[#e5e1da] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold shrink-0">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#2d2a26]">مركز الإشعارات وإدارة القوالب الشاملة 📢</h3>
              <p className="text-xs text-stone-500 mt-0.5">صياغة وبث وتصنيف الإشعارات الجماعية وتصميم القوالب المخصصة لجميع مستخدمي المنصة</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to="/notifications"
              target="_blank"
              className="inline-flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors"
            >
              <span>معاينة الإشعارات للمستخدمين</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>

            {onDeleteAllNotifications && (
              <button
                onClick={onDeleteAllNotifications}
                disabled={isDeletingAllNotifications}
                className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer"
                title="حذف جميع الإشعارات من قاعدة البيانات نهائياً لجميع المستخدمين"
              >
                <Trash2 className="h-4 w-4" />
                <span>{isDeletingAllNotifications ? 'جاري المسح...' : 'حذف كلي للإشعارات'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Info badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-start gap-2.5">
            <div className="p-1.5 bg-red-100 text-red-700 rounded-lg shrink-0 mt-0.5">
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <div className="font-black text-xs text-stone-800">إشعارات العروض والتنزيلات</div>
              <p className="text-[11px] text-stone-500 leading-relaxed">توجيه الزوار لصفحة التخفيضات زيادة في مبيعات المتاجر الشريكة.</p>
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-start gap-2.5">
            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
              <Briefcase className="h-4 w-4" />
            </div>
            <div>
              <div className="font-black text-xs text-stone-800">الشواغر والمنشآت الطبية</div>
              <p className="text-[11px] text-stone-500 leading-relaxed">الترحيب بالعيادات والفرص الوظيفية فور توفرها بمحافظة إربد.</p>
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-start gap-2.5">
            <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg shrink-0 mt-0.5">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="font-black text-xs text-stone-800">استهداف فئة أو منطقة محدودة</div>
              <p className="text-[11px] text-stone-500 leading-relaxed">تصفية البث لمنطقة جغرافية أو تصنيف تجاري/طبي محدد بسهولة.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container: Split into Templates Library & Broadcast Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN (LG 5): TEMPLATES LIBRARY & CUSTOM TEMPLATES */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-[#e5e1da] shadow-xs space-y-4 sticky top-20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-purple-600" />
                <h4 className="font-black text-base text-[#2d2a26]">مكتبة وقوالب الإشعارات الجاهزة</h4>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleResetTemplatesToDefault}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 px-2 py-1.5 rounded-xl transition-colors cursor-pointer"
                  title="استعادة الصياغات والقوالب الأصلية"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>ضبط افتراضي</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSavingCustomTpl(!isSavingCustomTpl)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 text-amber-600" />
                  <span>حفظ القالب الحالي</span>
                </button>
              </div>
            </div>

            {/* Save Current as Custom Template Box */}
            {isSavingCustomTpl && (
              <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-xs space-y-2 animate-in fade-in">
                <span className="font-bold text-amber-900 block">حفظ الصيغة الحالية في النموذج كقالب مخصص:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={e => setNewTemplateName(e.target.value)}
                    placeholder="اسم القالب (اختياري)..."
                    className="flex-1 bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveCurrentAsCustomTemplate}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-colors"
                  >
                    حفظ الآن
                  </button>
                </div>
              </div>
            )}

            {/* Category Tab Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {[
                { id: 'all', label: 'الكل 🌐' },
                { id: 'business', label: '🏬 محلات' },
                { id: 'medical', label: '🩺 طبية' },
                { id: 'offer', label: '🔥 عروض' },
                { id: 'job', label: '💼 وظائف' },
                { id: 'housing', label: '🏠 عقارات' },
                { id: 'system', label: '🚀 تحديثات' },
                { id: 'custom', label: `⭐ مخصصة (${templates.filter(t => t.category === 'custom' || t.isCustom).length})` }
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategoryTab(tab.id)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap cursor-pointer transition-all ${
                    selectedCategoryTab === tab.id
                      ? 'bg-purple-700 text-white shadow-2xs'
                      : 'bg-stone-50 border border-stone-200 text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Template Input */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-stone-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={templateSearch}
                onChange={e => setTemplateSearch(e.target.value)}
                placeholder="ابحث في صياغات ونصوص القوالب الجاهزة..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-9 pl-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>

            {/* Templates Cards List */}
            <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
              {filteredTemplates.length === 0 ? (
                <div className="text-center py-8 text-xs text-stone-400 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                  لا توجد قوالب تطابق هذا البحث أو الفئة.
                </div>
              ) : (
                filteredTemplates.map(tpl => {
                  const isApplied = appliedTplId === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => applyTemplate(tpl)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between text-right group ${
                        isApplied
                          ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-500/30 shadow-xs'
                          : 'bg-white border-stone-200 hover:border-purple-200 hover:bg-purple-50/30'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-xs font-black text-stone-900 line-clamp-1">
                            {tpl.title}
                          </span>
                          <span className="text-[10px] bg-stone-100 text-stone-600 font-bold px-2 py-0.5 rounded-md shrink-0">
                            {tpl.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-600 line-clamp-2 leading-relaxed">
                          {tpl.message}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-stone-100 text-[10px]">
                        <span className="text-purple-700 font-bold flex items-center gap-1">
                          {isApplied ? <Check className="h-3.5 w-3.5 text-purple-600" /> : <Zap className="h-3.5 w-3.5 text-stone-400 group-hover:text-purple-600" />}
                          <span>{isApplied ? 'مُفعّل بالنموذج' : 'تطبيق هذا القالب'}</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditTemplate(tpl, e)}
                            className="text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 transition-colors cursor-pointer text-[10px]"
                            title="تعديل صياغة ونص القالب والمتغيرات"
                          >
                            <Edit3 className="h-3 w-3 text-emerald-600" />
                            <span>تعديل القالب</span>
                          </button>

                          {(tpl.isCustom || tpl.category === 'custom') && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                              className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 cursor-pointer"
                              title="حذف القالب"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (LG 7): ADVANCED BROADCAST COMPOSER & PREVIEW */}
        <div className="lg:col-span-7 space-y-6">
          <form onSubmit={handleOpenConfirmModal} className="bg-white p-5 sm:p-7 rounded-3xl border border-[#e5e1da] shadow-xs space-y-6">
            
            {/* COMPOSER HEADER WITH QUICK ACTIONS */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-700 to-indigo-800 text-white flex items-center justify-center shadow-xs">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-black text-base text-[#2d2a26] flex items-center gap-2">
                    <span>صياغة وإرسال إشعار جماعي</span>
                    {appliedTplId && (
                      <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        <span>قالب مُمكّن</span>
                      </span>
                    )}
                  </h4>
                  <p className="text-[11px] text-stone-500">محرر التنبيهات المتقدم للبث الفوري والمجدول لجميع مستخدمي إربد</p>
                </div>
              </div>

              {/* QUICK ACTION TOOLBAR */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={handleFillSampleData}
                  className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="تعبئة حقول نموذج تجريبي احترافي بنقرة واحدة"
                >
                  <Wand2 className="h-3.5 w-3.5 text-purple-700" />
                  <span>نموذج تجريبي</span>
                </button>

                <button
                  type="button"
                  onClick={handleClearForm}
                  className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="تفريغ كافة الحقول"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-stone-500" />
                  <span>مسح</span>
                </button>
              </div>
            </div>

            {/* TYPE SELECTOR & VISUAL COLOR IDENTIFIER */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-black text-stone-800">نوع الإشعار ودرجة التمييز البصري</label>
                <span className="text-[10px] text-stone-400 font-bold">يحدد لون وقسم التنبيه في التطبيق</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'offer', label: 'عرض وتخفيض', icon: Flame, color: 'text-red-600 border-red-200 bg-red-50/70 hover:bg-red-50' },
                  { id: 'job', label: 'شاغر وظيفي', icon: Briefcase, color: 'text-emerald-700 border-emerald-200 bg-emerald-50/70 hover:bg-emerald-50' },
                  { id: 'marketing', label: 'باقات تسويق', icon: Sparkles, color: 'text-purple-600 border-purple-200 bg-purple-50/70 hover:bg-purple-50' },
                  { id: 'news', label: 'أخبار وتحديث', icon: Newspaper, color: 'text-blue-600 border-blue-200 bg-blue-50/70 hover:bg-blue-50' },
                  { id: 'system', label: 'تنبيه عام', icon: Store, color: 'text-[#1a4d2e] border-stone-200 bg-stone-50/70 hover:bg-stone-100' },
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
                          ? `${item.color} ring-2 ring-[#1a4d2e] font-black shadow-xs scale-[1.02]`
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

            {/* EMOJI & VARIABLE QUICK PALETTE TOOLBAR */}
            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-stone-700 flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>شريط إدراج الإيموجي والمتغيرات السريعة:</span>
                </span>
                <span className="text-[10px] text-stone-500">
                  انقر لإدراج الرمز في ({focusedField === 'title' ? 'العنوان' : 'النص'})
                </span>
              </div>

              {/* Quick Emojis */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-thin">
                {QUICK_EMOJIS.map((emoji, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="p-1.5 bg-white hover:bg-purple-100 border border-stone-200 rounded-lg text-sm cursor-pointer transition-colors shrink-0 hover:scale-110 active:scale-95"
                    title={`إدراج ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              {/* Variable Pills */}
              <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-stone-200/60">
                <span className="text-[10px] font-bold text-stone-400 ml-1">المتغيرات:</span>
                {TEMPLATE_VARIABLES.map(v => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => {
                      if (focusedField === 'title') insertVariableToTitle(v.key);
                      else insertVariableToMessage(v.key);
                    }}
                    className="bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold cursor-pointer transition-colors"
                    title={`إدراج ${v.label}`}
                  >
                    +{v.key}
                  </button>
                ))}
              </div>
            </div>

            {/* TITLE FIELD WITH CHAR COUNTER */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-stone-800">عنوان الإشعار *</label>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className={`font-mono font-bold ${title.length > 60 ? 'text-amber-600' : 'text-stone-400'}`}>
                    {title.length} / 65 حرف
                  </span>
                  {title.length > 0 && title.length <= 60 && (
                    <span className="text-emerald-600 font-bold">طول مثالي ✓</span>
                  )}
                </div>
              </div>
              <input
                type="text"
                required
                value={title}
                onFocus={() => setFocusedField('title')}
                onChange={e => setTitle(e.target.value)}
                placeholder="مثال: خصم 40% في جميع فروع {اسم_المحل} 🏬"
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white transition-all font-bold text-stone-800"
              />
            </div>

            {/* MESSAGE BODY FIELD WITH CHAR COUNTER */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-stone-800">نص ومحتوى الإشعار *</label>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className={`font-mono font-bold ${message.length > 180 ? 'text-amber-600' : 'text-stone-400'}`}>
                    {message.length} / 200 حرف
                  </span>
                  {message.length > 0 && message.length <= 180 && (
                    <span className="text-emerald-600 font-bold">واضح وقصير ✓</span>
                  )}
                </div>
              </div>
              <textarea
                required
                rows={3}
                value={message}
                onFocus={() => setFocusedField('message')}
                onChange={e => setMessage(e.target.value)}
                placeholder="اكتب تفاصيل التنبيه... يمكنك استخدام {اسم_المحل} أو {اسم_المنشأة} أو {الخصم}"
                className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white transition-all text-stone-800 resize-none leading-relaxed"
              ></textarea>
            </div>

            {/* TARGETING & ESTIMATED AUDIENCE WIDGET */}
            <div className="p-4 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-950 font-black text-xs">
                  <Filter className="h-4 w-4 text-purple-700" />
                  <span>تحديد الشريحة والجمهور المستهدف (Targeting)</span>
                </div>
                <span className="text-[10px] bg-purple-200 text-purple-900 font-extrabold px-2.5 py-0.5 rounded-full">
                  استهداف دقيق
                </span>
              </div>

              {/* Target Role Selector */}
              <div>
                <label className="block text-[11px] font-bold text-purple-950 mb-1.5">فئة الحسابات المستهدفة:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'all', label: 'الجميع (مسجلون وزوار)', icon: Users },
                    { id: 'merchants', label: 'التجار وأصحاب المحلات', icon: Store },
                    { id: 'users', label: 'الزوار والأعضاء', icon: Users },
                    { id: 'supervisors', label: 'المشرفون والمدراء', icon: Zap }
                  ].map(r => {
                    const isRSelected = targetRole === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setTargetRole(r.id as any)}
                        className={`p-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
                          isRSelected
                            ? 'bg-purple-700 text-white border-purple-800 shadow-xs'
                            : 'bg-white text-stone-700 border-purple-200 hover:bg-purple-100/50'
                        }`}
                      >
                        <span>{r.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Region & Category Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
                <div className="pt-2 border-t border-purple-100 animate-in fade-in">
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

              {/* AUDIENCE ESTIMATE LIVE BANNER */}
              <div className="p-3 bg-white/90 rounded-xl border border-purple-200 text-xs flex items-center gap-2.5 text-purple-950">
                <div className="p-1.5 bg-purple-100 text-purple-800 rounded-lg shrink-0">
                  <Radio className="h-4 w-4 animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-bold block text-[10px] text-purple-700">نطاق البث والوصول المتوقع:</span>
                  <span className="font-extrabold text-[11px] truncate block">{getAudienceEstimateText()}</span>
                </div>
              </div>
            </div>

            {/* ROUTE LINK & QUICK PRESET BUTTONS */}
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-stone-800 mb-1">الرابط الموجه (Destination Route)</label>
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
                  <label className="block text-xs font-black text-stone-800 mb-1">شارة الإشعار (Badge Text)</label>
                  <input
                    type="text"
                    value={badge}
                    onChange={e => setBadge(e.target.value)}
                    placeholder="مثال: عرض جديد 🔥"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white transition-all text-stone-800 font-bold"
                  />
                </div>
              </div>

              {/* Quick Route Presets */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                <span className="text-[10px] font-bold text-stone-400 shrink-0">روابط سريعة:</span>
                {ROUTE_PRESETS.map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => setLink(preset.path)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border whitespace-nowrap cursor-pointer transition-colors ${
                      link === preset.path
                        ? 'bg-[#1a4d2e] text-white border-[#1a4d2e]'
                        : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PRIORITY & SCHEDULING SETTINGS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
              {/* Priority & Sound */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-stone-800">أولوية وصوت التنبيه</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPriority(priority === 'high' ? 'normal' : 'high')}
                    className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold border cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                      priority === 'high'
                        ? 'bg-rose-50 text-rose-700 border-rose-200 ring-1 ring-rose-300'
                        : 'bg-white text-stone-600 border-stone-200'
                    }`}
                  >
                    <Flame className="h-3.5 w-3.5" />
                    <span>{priority === 'high' ? 'أولوية قصوى 🔥' : 'عادي 🔔'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold border cursor-pointer transition-all flex items-center justify-center gap-1 ${
                      soundEnabled
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-stone-100 text-stone-500 border-stone-200'
                    }`}
                    title={soundEnabled ? 'صوت التنبيه مفعل' : 'التنبيه صامت'}
                  >
                    {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                    <span>{soundEnabled ? 'مسموع' : 'صامت'}</span>
                  </button>
                </div>
              </div>

              {/* Delivery Timing */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-stone-800">توقيت البث</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMode('now')}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border cursor-pointer transition-all flex items-center justify-center gap-1 ${
                      deliveryMode === 'now'
                        ? 'bg-purple-700 text-white border-purple-800'
                        : 'bg-white text-stone-600 border-stone-200'
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span>فوري الآن</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMode('scheduled')}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold border cursor-pointer transition-all flex items-center justify-center gap-1 ${
                      deliveryMode === 'scheduled'
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-white text-stone-600 border-stone-200'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>جدولة بوقت</span>
                  </button>
                </div>
              </div>

              {/* Scheduled Inputs */}
              {deliveryMode === 'scheduled' && (
                <div className="sm:col-span-2 pt-2 border-t border-stone-200 grid grid-cols-2 gap-2 animate-in fade-in">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 mb-1">تاريخ البث:</label>
                    <input
                      type="date"
                      value={scheduledDate}
                      onChange={e => setScheduledDate(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs text-stone-800 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 mb-1">الوقت المحدد:</label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={e => setScheduledTime(e.target.value)}
                      className="w-full bg-white border border-stone-200 rounded-xl px-2.5 py-1.5 text-xs text-stone-800 font-bold"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* INTERACTIVE MULTI-DEVICE LIVE PREVIEW */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-purple-700" />
                  <span>معاينة حية وتفاعلية لشكل الإشعار عند المستلم:</span>
                </span>

                {/* Mode Selector Tabs */}
                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActivePreviewMode('phone')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      activePreviewMode === 'phone'
                        ? 'bg-white text-stone-900 shadow-2xs font-black'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <Smartphone className="h-3 w-3" />
                    <span>شاشة القفل</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePreviewMode('inapp')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      activePreviewMode === 'inapp'
                        ? 'bg-white text-stone-900 shadow-2xs font-black'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <Bell className="h-3 w-3" />
                    <span>صندوق المنصة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePreviewMode('banner')}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      activePreviewMode === 'banner'
                        ? 'bg-white text-stone-900 shadow-2xs font-black'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <BellRing className="h-3 w-3" />
                    <span>شريط البوب اب</span>
                  </button>
                </div>
              </div>

              {/* PREVIEW CONTAINER BASED ON MODE */}
              {activePreviewMode === 'phone' && (
                <div className="p-4 bg-stone-900 rounded-2xl border border-stone-800 text-white space-y-2 shadow-inner">
                  <div className="flex items-center justify-between text-[10px] text-stone-400 border-b border-stone-800/80 pb-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-[#1a4d2e] text-white flex items-center justify-center font-black text-[9px]">
                        شو
                      </div>
                      <span className="font-bold text-stone-200">شو في بإربد • الآن</span>
                    </div>
                    <span className="text-[10px] text-stone-500 font-mono">18:45</span>
                  </div>

                  <div className="pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <h5 className="font-black text-xs text-stone-100 line-clamp-1">{title || 'عنوان الإشعار التجريبي يظهر هنا'}</h5>
                      {badge && (
                        <span className="text-[9px] bg-purple-900/90 text-purple-200 border border-purple-700/50 px-2 py-0.5 rounded-md font-bold shrink-0">
                          {badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-300 leading-relaxed mt-1 line-clamp-2">
                      {message || 'هنا يظهر نص ومحتوى التنبيه الكامل كما يتلقاه المستخدم على شاشة هاتف الذكي...'}
                    </p>
                    <div className="mt-2 text-[10px] text-purple-400 font-mono flex items-center gap-1">
                      <span>الوجهة:</span>
                      <span className="underline">{link || '/offers'}</span>
                    </div>
                  </div>
                </div>
              )}

              {activePreviewMode === 'inapp' && (
                <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 space-y-2">
                  <div className="flex items-start gap-3 bg-white p-3.5 rounded-2xl border border-stone-200/80 shadow-xs">
                    <div className="w-9 h-9 rounded-xl bg-[#1a4d2e] text-white flex items-center justify-center shrink-0 shadow-2xs font-black">
                      <Bell className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-stone-900 truncate">{title || 'عنوان الإشعار التجريبي'}</span>
                        {badge && (
                          <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md font-bold shrink-0">
                            {badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-600 line-clamp-2 mt-1 leading-relaxed">
                        {message || 'هنا سيظهر نص الإشعار الكامل الذي سيتلقاه المستخدم بداخل القائمة...'}
                      </p>
                      <span className="text-[10px] text-stone-400 block mt-1.5 font-mono">الآن • لم يقرأ</span>
                    </div>
                  </div>
                </div>
              )}

              {activePreviewMode === 'banner' && (
                <div className="p-3.5 bg-purple-900 text-white rounded-2xl border border-purple-700 shadow-lg space-y-1.5 animate-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <BellRing className="h-4 w-4 text-amber-400 animate-bounce" />
                      <span className="font-black text-xs">{title || 'تنبيه عاجل من شو في بإربد'}</span>
                    </div>
                    <X className="h-3.5 w-3.5 text-purple-300 opacity-60" />
                  </div>
                  <p className="text-[11px] text-purple-100 line-clamp-2 leading-relaxed">
                    {message || 'تفاصيل التنبيه العاجل الموجه لأعلى الشاشة فور وصوله...'}
                  </p>
                </div>
              )}
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-900 hover:from-purple-800 hover:to-indigo-950 text-white font-black text-sm transition-all shadow-md cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2 hover:shadow-lg active:scale-[0.99]"
              >
                <Send className="h-4 w-4" />
                <span>{isSubmitting ? 'جاري التحضير للبث...' : 'مراجعة وتأكيد بث التنبيه لجميع المستهدفين 🚀'}</span>
              </button>
            </div>

          </form>
        </div>

      </div>

      {/* EDIT TEMPLATE MODAL */}
      {isEditModalOpen && editingTemplate && (
        <div className="fixed inset-0 z-[9999] bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in" dir="rtl">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-stone-200 shadow-2xl my-auto flex flex-col max-h-[88vh] overflow-hidden">
            
            {/* MODAL HEADER */}
            <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 text-purple-800 rounded-xl">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-stone-900">تعديل صياغة ومتغيرات القالب</h3>
                  <p className="text-[11px] sm:text-xs text-stone-500">تحديث عنوان ونص الإشعار وإدراج المتغيرات المخصصة</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingTemplate(null);
                }}
                className="p-2 text-stone-400 hover:text-stone-600 rounded-xl hover:bg-stone-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* MODAL FORM WITH INNER SCROLLBAR */}
            <form onSubmit={handleSaveEditedTemplate} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              
              {/* CATEGORY & BADGE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-stone-700 mb-1">فئة القالب</label>
                  <select
                    value={editingTemplate.category}
                    onChange={e => setEditingTemplate({ ...editingTemplate, category: e.target.value as any })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800"
                  >
                    <option value="business">🏬 محلات تجارية</option>
                    <option value="medical">🩺 منشآت طبية</option>
                    <option value="offer">🔥 عروض وتخفيضات</option>
                    <option value="job">💼 وظائف وشواغر</option>
                    <option value="housing">🏠 عقارات وسكنات</option>
                    <option value="system">🚀 تحديثات المنظومة</option>
                    <option value="custom">⭐ قوالب مخصصة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-stone-700 mb-1">شارة القالب (Badge)</label>
                  <input
                    type="text"
                    value={editingTemplate.badge}
                    onChange={e => setEditingTemplate({ ...editingTemplate, badge: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800"
                  />
                </div>
              </div>

              {/* TITLE WITH VARIABLE CHIPS */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="block text-xs font-black text-stone-700">عنوان القالب *</label>
                  <span className="text-[10px] font-bold text-purple-700">إدراج متغير في العنوان:</span>
                </div>

                <div className="flex flex-wrap items-center gap-1 pb-1">
                  {TEMPLATE_VARIABLES.map(v => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => setEditingTemplate({
                        ...editingTemplate,
                        title: editingTemplate.title ? `${editingTemplate.title} ${v.key}` : v.key
                      })}
                      className="bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-mono font-bold cursor-pointer transition-colors"
                      title={`إدراج ${v.label} في العنوان`}
                    >
                      + {v.key}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  required
                  value={editingTemplate.title}
                  onChange={e => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm font-bold text-stone-800 focus:bg-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* MESSAGE BODY WITH VARIABLE CHIPS */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="block text-xs font-black text-stone-700">نص ومحتوى القالب *</label>
                  <span className="text-[10px] font-bold text-purple-700">إدراج متغير في المحتوى:</span>
                </div>

                <div className="flex flex-wrap items-center gap-1 pb-1">
                  {TEMPLATE_VARIABLES.map(v => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => setEditingTemplate({
                        ...editingTemplate,
                        message: editingTemplate.message ? `${editingTemplate.message} ${v.key}` : v.key
                      })}
                      className="bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px] font-mono font-bold cursor-pointer transition-colors"
                      title={`إدراج ${v.label} في النص`}
                    >
                      + {v.key}
                    </button>
                  ))}
                </div>

                <textarea
                  required
                  rows={3}
                  value={editingTemplate.message}
                  onChange={e => setEditingTemplate({ ...editingTemplate, message: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm text-stone-800 focus:bg-white focus:ring-2 focus:ring-purple-500 resize-none"
                ></textarea>
              </div>

              {/* ROUTE LINK */}
              <div>
                <label className="block text-xs font-black text-stone-700 mb-1">الرابط الموجه (Route)</label>
                <input
                  type="text"
                  dir="ltr"
                  value={editingTemplate.link}
                  onChange={e => setEditingTemplate({ ...editingTemplate, link: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono text-left text-stone-800"
                />
              </div>

              {/* MODAL FOOTER ACTIONS PINNED */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 sticky bottom-0 bg-white/95 backdrop-blur-xs pb-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingTemplate(null);
                  }}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  إلغاء
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-black rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  حفظ تعديلات القالب ⭐
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* CONFIRMATION BROADCAST MODAL (STRICT COMPLIANCE: Z-[100000], MAX-H CONSTRAINT) */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-[100000] overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-lg w-full max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col overflow-hidden my-auto animate-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-800/80 rounded-xl">
                  <ShieldAlert className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base">تأكيد وإطلاق البث الجماعي للإشعار 🚀</h3>
                  <p className="text-[11px] text-purple-200">يرجى مراجعة تفاصيل التنبيه وشريحة المستهدفين قبل الإرسال النهائي</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body with internal scrolling */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-stone-800">
              
              {/* Target Audience Summary Card */}
              <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200 space-y-1.5">
                <span className="text-[10px] font-extrabold text-purple-800 uppercase tracking-wider block">
                  الجمهور والشريحة المستهدفة:
                </span>
                <p className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                  <Radio className="h-4 w-4 text-purple-600 animate-pulse" />
                  <span>{getAudienceEstimateText()}</span>
                </p>
              </div>

              {/* Notification Content Summary */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-stone-900">{title}</span>
                  {badge && (
                    <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2.5 py-0.5 rounded-full">
                      {badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-wrap">{message}</p>
                
                <div className="pt-2 border-t border-stone-200/80 text-[11px] font-mono text-stone-500 flex flex-wrap items-center justify-between gap-2">
                  <span>الرابط: <strong className="text-stone-800">{link}</strong></span>
                  <span>الأولوية: <strong className="text-rose-600">{priority === 'high' ? 'قصوى 🔥' : 'عادي'}</strong></span>
                </div>
              </div>

              {/* Timing Notice */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  {deliveryMode === 'scheduled' ? (
                    <span>
                      سيتم جدولة هذا الإشعار للبث التلقائي بتاريخ <strong>{scheduledDate}</strong> في تمام الساعة <strong>{scheduledTime}</strong>.
                    </span>
                  ) : (
                    <span>
                      سيتم بث وإرسال هذا الإشعار فوراً إلى جميع الأجهزة والحسابات المستهدفة في إربد بمجرد الضغط على زر التأكيد.
                    </span>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 text-xs font-bold transition-all cursor-pointer"
              >
                تعديل الإشعار
              </button>

              <button
                type="button"
                onClick={executeBroadcast}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-800 hover:from-purple-800 hover:to-indigo-900 text-white text-xs font-black transition-all shadow-md cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                <span>{isSubmitting ? 'جاري البث...' : 'تأكيد وإطلاق البث الجماعي فوراً 🚀'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
