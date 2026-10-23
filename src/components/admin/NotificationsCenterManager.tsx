import React, { useState, useEffect, useMemo } from 'react';
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
  AlertCircle, 
  CheckCircle2, 
  Wand2, 
  Calendar, 
  ShieldAlert, 
  Copy, 
  History, 
  BarChart3, 
  SmartphoneNfc, 
  RefreshCw, 
  UserCheck, 
  Layers,
  Megaphone
} from 'lucide-react';
import { AppNotification } from '../../types';
import { BUSINESS_CATEGORIES, MainCategory, IRBID_REGIONS_CATEGORIZED } from '../../lib/categories';
import { db, auth } from '../../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { requestPushPermission } from '../../lib/pushNotifications';

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

export interface ScheduledNotificationItem {
  id: string;
  title: string;
  body: string;
  type: string;
  badge: string;
  link: string;
  targetGroup: string;
  scheduledTimestamp: number;
  scheduledDateStr?: string;
  status: 'pending' | 'processing' | 'sent' | 'cancelled';
  createdAt?: string;
  createdBy?: string;
}

export interface PushMetrics {
  totalSubscriptions: number;
  totalDevices: number;
  merchantsCount: number;
  supervisorsCount: number;
  usersCount: number;
  totalSentNotifications: number;
  pendingScheduledCount: number;
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
    title: 'انضمام محل تجاري جديد: {اسم_المحل}',
    message: 'نرحب بانضمام {اسم_المحل} رسمياً إلى دليل شو في بإربد. استكشف المنتجات والعروض والخدمات المتاحة الآن.',
    type: 'business',
    badge: 'محل جديد',
    link: '/business/ID'
  },
  {
    id: 'tpl_biz_vip',
    category: 'business',
    categoryLabel: 'محلات تجارية',
    title: 'انضمام مميز بالباقة الذهبية: {اسم_المحل}',
    message: 'نرحب بـ {اسم_المحل} بالباقة الذهبية وحصولهم على ميزة صدارة البحث والتوثيق المعتمد بالدليل.',
    type: 'business',
    badge: 'صدارة وممول',
    link: '/business/ID'
  },
  {
    id: 'tpl_med_welcome',
    category: 'medical',
    categoryLabel: 'منشآت طبية',
    title: 'انضمام منشأة طبية جديدة: {اسم_المنشأة}',
    message: 'انضمت منشأة {اسم_المنشأة} رسمياً إلى دليل الرعاية الطبية والصحية بشو في بإربد.',
    type: 'business',
    badge: 'منشأة طبية جديدة',
    link: '/medical'
  },
  {
    id: 'tpl_med_offer',
    category: 'medical',
    categoryLabel: 'منشآت طبية',
    title: 'عروض وفحوصات طبية لدى: {اسم_المنشأة}',
    message: 'خصومات وعروض مميزة على الفحوصات والاستشارات الطبية لدى {اسم_المنشأة}. احجز موعدك اليوم.',
    type: 'offer',
    badge: 'عرض طبي',
    link: '/medical'
  },
  {
    id: 'tpl_offer_discount',
    category: 'offer',
    categoryLabel: 'عروض وتخفيضات',
    title: 'تنزيلات وعروض حصرية جديدة في إربد',
    message: 'استمتع بخصومات وتصفيات حصرية لدى أرقى المحلات والمتاجر في إربد. تفقد قسم العروض الآن.',
    type: 'offer',
    badge: 'تنزيلات حصرية',
    link: '/offers'
  },
  {
    id: 'tpl_offer_coupon',
    category: 'offer',
    categoryLabel: 'عروض وتخفيضات',
    title: 'كود خصم حصري لمستخدمي شو في بإربد',
    message: 'استخدم كود الخصم الخاص واحصل على تخفيض فوري لدى المحلات المشاركة بالدليل.',
    type: 'offer',
    badge: 'كود خصم',
    link: '/offers'
  },
  {
    id: 'tpl_job_vacancy',
    category: 'job',
    categoryLabel: 'وظائف وشواغر',
    title: 'شواغر وفرص عمل جديدة متاحة الآن',
    message: 'تتوفر فرص عمل وشواغر جديدة لدى شركات ومحلات إربد. قدم طلبك مباشرة وتواصل مع أصحاب العمل.',
    type: 'job',
    badge: 'شاغر وظيفي',
    link: '/jobs'
  },
  {
    id: 'tpl_housing_student',
    category: 'housing',
    categoryLabel: 'عقارات وسكنات',
    title: 'سكنات طلابية وشقق مفروشة جديدة',
    message: 'تمت إضافة شقق وسكنات طلابية حديثة في إربد بالقرب من الجامعات مع إمكانية التواصل المباشر.',
    type: 'system',
    badge: 'سكنات وعقارات',
    link: '/housing'
  },
  {
    id: 'tpl_sys_feature',
    category: 'system',
    categoryLabel: 'تحديثات النظام',
    title: 'تحديث جديد وميزات مميزة بمنصة شو في بإربد',
    message: 'أطلقنا ميزات جديدة لتسهيل تصفح المحلات والعروض والخدمات بالمنصة. تفقد التحديث الجديد.',
    type: 'news',
    badge: 'تحديث جديد',
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
  // Navigation Tabs
  const [activeMainTab, setActiveMainTab] = useState<'composer' | 'history' | 'scheduled' | 'stats'>('composer');

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<AppNotification['type']>('offer');
  const [link, setLink] = useState('/offers');
  const [badge, setBadge] = useState('تنبيه هام');
  const [targetArea, setTargetArea] = useState('all');
  const [targetCategory, setTargetCategory] = useState('all');
  const [targetSubCategory, setTargetSubCategory] = useState('all');
  const [targetRole, setTargetRole] = useState<'all' | 'merchants' | 'users' | 'supervisors' | 'direct'>('all');
  const [directUserIdentifier, setDirectUserIdentifier] = useState('');
  const [priority, setPriority] = useState<'high' | 'normal'>('high');
  const [deliveryMode, setDeliveryMode] = useState<'now' | 'scheduled'>('now');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('18:00');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [activePreviewMode, setActivePreviewMode] = useState<'phone' | 'inapp' | 'banner'>('phone');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [focusedField, setFocusedField] = useState<'title' | 'message' | null>('message');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Templates Management State
  const [templates, setTemplates] = useState<NotificationTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('admin_all_notification_templates');
      return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
    } catch (e) {
      return DEFAULT_TEMPLATES;
    }
  });
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>('all');
  const [templateSearch, setTemplateSearch] = useState('');
  const [appliedTplId, setAppliedTplId] = useState<string | null>(null);
  const [isSavingCustomTpl, setIsSavingCustomTpl] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Live Database Streams (History & Scheduled & Stats)
  const [sentHistory, setSentHistory] = useState<any[]>([]);
  const [scheduledList, setScheduledList] = useState<ScheduledNotificationItem[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [metrics, setMetrics] = useState<PushMetrics>({
    totalSubscriptions: 0,
    totalDevices: 0,
    merchantsCount: 0,
    supervisorsCount: 0,
    usersCount: 0,
    totalSentNotifications: 0,
    pendingScheduledCount: 0
  });
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Load Real Stats from Backend API
  const refreshMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const currentUser = auth?.currentUser;
      const idToken = currentUser ? await currentUser.getIdToken() : '';
      const res = await fetch('/api/push/stats', {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (e) {
      console.warn("Could not load push stats:", e);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    refreshMetrics();
  }, []);

  // Listen to Firestore `notifications` collection in real-time
  useEffect(() => {
    if (!db) return;
    const notifsRef = collection(db, 'notifications');
    const q = query(notifsRef, orderBy('createdAt', 'desc'), limit(100));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: any[] = [];
      snapshot.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() });
      });
      setSentHistory(items);
    }, (err) => {
      console.warn("History listener error:", err);
    });

    return () => unsubscribe();
  }, []);

  // Listen to Firestore `scheduledNotifications` in real-time
  useEffect(() => {
    if (!db) return;
    const schedRef = collection(db, 'scheduledNotifications');
    const q = query(schedRef, orderBy('scheduledTimestamp', 'asc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: ScheduledNotificationItem[] = [];
      snapshot.forEach(docSnap => {
        items.push({ id: docSnap.id, ...docSnap.data() } as ScheduledNotificationItem);
      });
      setScheduledList(items);
    }, (err) => {
      console.warn("Scheduled listener error:", err);
    });

    return () => unsubscribe();
  }, []);

  // Route presets
  const ROUTE_PRESETS = [
    { label: 'العروض', path: '/offers' },
    { label: 'الوظائف', path: '/jobs' },
    { label: 'الطبية', path: '/medical' },
    { label: 'العقارات', path: '/housing' },
    { label: 'المواصلات', path: '/transportation' },
    { label: 'الأماكن السياحية', path: '/tourism' },
    { label: 'الرئيسية', path: '/' }
  ];

  // Save templates to localStorage
  const persistTemplates = (newTemplates: NotificationTemplate[]) => {
    setTemplates(newTemplates);
    try {
      localStorage.setItem('admin_all_notification_templates', JSON.stringify(newTemplates));
    } catch (e) {}
  };

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      if (selectedCategoryTab !== 'all') {
        if (selectedCategoryTab === 'custom') {
          if (!t.isCustom && t.category !== 'custom') return false;
        } else if (t.category !== selectedCategoryTab) {
          return false;
        }
      }
      if (templateSearch.trim()) {
        const q = templateSearch.toLowerCase().trim();
        return t.title.toLowerCase().includes(q) || t.message.toLowerCase().includes(q) || t.badge.toLowerCase().includes(q);
      }
      return true;
    });
  }, [templates, selectedCategoryTab, templateSearch]);

  // Insert Variable
  const insertVariableToTitle = (variable: string) => {
    setTitle(prev => prev ? `${prev} ${variable}` : variable);
  };

  const insertVariableToMessage = (variable: string) => {
    setMessage(prev => prev ? `${prev} ${variable}` : variable);
  };

  // Sample data filler
  const handleFillSampleData = () => {
    setTitle('خصومات كبرى تصل إلى 50% في أسواق إربد');
    setMessage('استفد من التخفيضات الاستثنائية لدى المحلات والأسواق الشريكة في إربد. سارع بزيارة قسم العروض للاطلاع على التفاصيل.');
    setType('offer');
    setBadge('تخفيضات خاصة');
    setLink('/offers');
    setTargetArea('all');
    setTargetCategory('all');
    setTargetSubCategory('all');
    setTargetRole('all');
    setPriority('high');
    setDeliveryMode('now');
    if (showToast) showToast('تمت تعبئة النموذج ببيانات تجريبية', 'info');
  };

  const handleClearForm = () => {
    setTitle('');
    setMessage('');
    setType('offer');
    setBadge('تنبيه هام');
    setLink('/offers');
    setTargetArea('all');
    setTargetCategory('all');
    setTargetSubCategory('all');
    setTargetRole('all');
    setDirectUserIdentifier('');
    setPriority('high');
    setDeliveryMode('now');
    setScheduledDate('');
    setScheduledTime('18:00');
    setAppliedTplId(null);
  };

  // Test Push to Admin's own device
  const handleSendTestToMyDevice = async () => {
    if (!title.trim() || !message.trim()) {
      if (showToast) showToast('يرجى كتابة عنوان ونص الإشعار أولاً لاختباره', 'error');
      return;
    }

    setIsSendingTest(true);
    try {
      const currentUser = auth?.currentUser;
      const status = await requestPushPermission(currentUser?.uid, 'admin');

      if (status.permission !== 'granted') {
        if (showToast) showToast('يرجى تفعيل إذن الإشعارات في متصفحك أولاً لاستقبال الإشعار التجريبي', 'error');
        return;
      }

      const idToken = currentUser ? await currentUser.getIdToken() : '';
      const res = await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          title: title.trim(),
          body: message.trim(),
          url: link.trim() || '/notifications',
          badge: badge.trim() || 'إشعار تجريبي'
        })
      });

      if (res.ok) {
        if (showToast) showToast('تم إرسال إشعار تجريبي فوري لهاتفك بنجاح', 'success');
      } else {
        if (showToast) showToast('تعذر إرسال الإشعار التجريبي، يرجى التأكد من تفعيل إذن المتصفح', 'error');
      }
    } catch (e) {
      console.error(e);
      if (showToast) showToast('حدث خطأ أثناء إرسال الإشعار التجريبي', 'error');
    } finally {
      setIsSendingTest(false);
    }
  };

  // Confirm and execute Broadcast or Schedule
  const handleOpenConfirmModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      if (showToast) showToast('الرجاء كتابة عنوان الإشعار', 'error');
      return;
    }
    if (!message.trim()) {
      if (showToast) showToast('الرجاء كتابة محتوى وتفاصيل الإشعار', 'error');
      return;
    }
    if (targetRole === 'direct' && !directUserIdentifier.trim()) {
      if (showToast) showToast('الرجاء إدخال البريد الإلكتروني أو المعرف للمستخدم المستهدف', 'error');
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
      const currentUser = auth?.currentUser;
      const idToken = currentUser ? await currentUser.getIdToken() : '';

      // Mode 1: Direct Single User Push
      if (targetRole === 'direct') {
        const isEmail = directUserIdentifier.includes('@');
        const res = await fetch('/api/push/send-direct', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            targetUserId: isEmail ? undefined : directUserIdentifier.trim(),
            targetEmail: isEmail ? directUserIdentifier.trim() : undefined,
            title: title.trim(),
            body: message.trim(),
            link: link.trim() || '/',
            badge: badge.trim() || 'إشعار خاص'
          })
        });

        if (res.ok) {
          if (showToast) showToast('تم إرسال الإشعار المباشر للمستخدم بنجاح', 'success');
          handleClearForm();
          setIsConfirmModalOpen(false);
          refreshMetrics();
          return;
        }
      }

      // Mode 2: Scheduled Notification
      if (deliveryMode === 'scheduled') {
        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        const scheduledTimestamp = scheduledDateTime.getTime();

        const res = await fetch('/api/queue/schedule', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({
            title: title.trim(),
            body: message.trim(),
            type,
            badge: badge.trim() || '',
            link: link.trim() || '/',
            targetGroup: targetRole === 'all' ? 'all' : targetRole,
            scheduledTimestamp,
            extraData: {
              targetArea: targetArea !== 'all' ? targetArea : '',
              targetCategory: targetCategory !== 'all' ? targetCategory : '',
              targetSubCategory: targetSubCategory !== 'all' ? targetSubCategory : ''
            }
          })
        });

        if (res.ok) {
          if (showToast) showToast(`تمت جدولة بث الإشعار بنجاح للتاريخ: ${scheduledDate} الساعة ${scheduledTime}`, 'success');
          handleClearForm();
          setIsConfirmModalOpen(false);
          refreshMetrics();
          return;
        }
      }

      // Mode 3: Immediate Broadcast
      await onSendBroadcast({
        title: title.trim(),
        message: message.trim(),
        type,
        link: link.trim() || '/',
        badge: badge.trim() || '',
        userId: targetRole === 'all' ? 'all' : targetRole,
        targetArea: targetArea !== 'all' ? targetArea : '',
        targetCategory: targetCategory !== 'all' ? targetCategory : '',
        targetSubCategory: targetSubCategory !== 'all' ? targetSubCategory : ''
      });

      if (showToast) showToast('تم إطلاق وبث الإشعار الجماعي لجميع المستهدفين بنجاح', 'success');
      handleClearForm();
      setIsConfirmModalOpen(false);
      refreshMetrics();
    } catch (error) {
      console.error('Error sending broadcast:', error);
      if (showToast) showToast('حدث خطأ أثناء بث الإشعار، يرجى المحاولة لاحقاً', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Re-use / Duplicate sent notification into composer
  const handleReuseNotification = (item: any) => {
    setTitle(item.title || '');
    setMessage(item.message || item.body || '');
    setType(item.type || 'offer');
    setBadge(item.badge || '');
    setLink(item.link || item.url || '/');
    if (item.targetArea) setTargetArea(item.targetArea);
    if (item.targetCategory) setTargetCategory(item.targetCategory);
    if (item.targetSubCategory) setTargetSubCategory(item.targetSubCategory);
    setActiveMainTab('composer');
    if (showToast) showToast('تم نقل بيانات الإشعار للنموذج لإعادة إرساله أو تعديله', 'info');
  };

  // Delete single sent notification from archive
  const handleDeleteHistoryItem = async (id: string) => {
    if (!db) return;
    if (window.confirm('هل تريد حذف وسحب هذا الإشعار من قائمة الإشعارات؟')) {
      try {
        await deleteDoc(doc(db, 'notifications', id));
        if (showToast) showToast('تم حذف الإشعار بنجاح', 'success');
      } catch (err) {
        if (showToast) showToast('تعذر حذف الإشعار', 'error');
      }
    }
  };

  // Cancel scheduled notification
  const handleCancelScheduled = async (id: string) => {
    if (!db) return;
    if (window.confirm('هل تريد إلغاء جدولة وحذف هذا الإشعار المجدول؟')) {
      try {
        await deleteDoc(doc(db, 'scheduledNotifications', id));
        if (showToast) showToast('تم إلغاء الإشعار المجدول بنجاح', 'success');
        refreshMetrics();
      } catch (err) {
        if (showToast) showToast('تعذر إلغاء الإشعار المجدول', 'error');
      }
    }
  };

  const getAudienceEstimateText = () => {
    if (targetRole === 'direct') return `مستخدم محدد: ${directUserIdentifier || 'يرجى إدخال البريد أو المعرف'}`;
    if (targetRole === 'merchants') return `أصحاب المحلات والتجار (${metrics.merchantsCount} جهاز مسجل)`;
    if (targetRole === 'supervisors') return `طاقم المشرفين والمدراء (${metrics.supervisorsCount} جهاز مسجل)`;
    if (targetRole === 'users') return `الزوار والأعضاء المسجلون (${metrics.usersCount} جهاز مسجل)`;

    const total = metrics.totalSubscriptions > 0 ? `${metrics.totalSubscriptions} جهاز مشترك` : 'كافة الأجهزة والمستخدمين';
    const areaPart = targetArea !== 'all' ? ` | المنطقة: ${targetArea}` : ' | كافة مناطق إربد';
    const categoryPart = targetCategory !== 'all' ? ` | القطاع: ${targetCategory}` : '';
    const subCategoryPart = targetSubCategory !== 'all' ? ` (${targetSubCategory})` : '';

    return `${total}${areaPart}${categoryPart}${subCategoryPart}`;
  };

  const handleTypeChange = (newType: AppNotification['type']) => {
    setType(newType);
    switch (newType) {
      case 'offer':
        setBadge('عرض حصري');
        setLink('/offers');
        break;
      case 'job':
        setBadge('شاغر وظيفي');
        setLink('/jobs');
        break;
      case 'marketing':
        setBadge('خدمات إعلانية');
        setLink('/packages');
        break;
      case 'news':
        setBadge('تحديث بالدليل');
        setLink('/news');
        break;
      case 'business':
      case 'system':
      default:
        setBadge('إشعار عام');
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
      badge: badge.trim() || 'إشعار خاص',
      link: link.trim() || '/',
      isCustom: true
    };

    const updated = [newTpl, ...templates];
    persistTemplates(updated);
    setNewTemplateName('');
    setIsSavingCustomTpl(false);
    setSelectedCategoryTab('custom');
    setAppliedTplId(newTpl.id);
    if (showToast) showToast('تم حفظ القالب المخصص بنجاح');
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

    if (appliedTplId === editingTemplate.id) {
      setTitle(editingTemplate.title);
      setMessage(editingTemplate.message);
      setBadge(editingTemplate.badge);
      setLink(editingTemplate.link);
      setType(editingTemplate.type);
    }

    setIsEditModalOpen(false);
    setEditingTemplate(null);
    if (showToast) showToast('تم حفظ وتعديل القالب بنجاح');
  };

  const handleResetTemplatesToDefault = () => {
    if (window.confirm('هل أنت متأكد من استعادة جميع القوالب إلى الوضع الافتراضي الأصلي؟')) {
      setTemplates(DEFAULT_TEMPLATES);
      try {
        localStorage.removeItem('admin_all_notification_templates');
      } catch (e) {}
      if (showToast) showToast('تمت استعادة القوالب الافتراضية');
    }
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      
      {/* 1. TOP HEADER & MAIN NAVIGATION TABS */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#e5e1da] shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#1a4d2e] text-white flex items-center justify-center shadow-xs">
              <Megaphone className="h-6 w-6 text-[#ff9f1c]" />
            </div>
            <div>
              <h3 className="font-black text-xl text-[#2d2a26]">مركز وبث الإشعارات المتقدم</h3>
              <p className="text-xs text-stone-500 font-medium">إدارة البث الفوري والمجدول، الأرشيف، والإحصائيات الحية لأجهزة المستخدمين</p>
            </div>
          </div>

          {/* Quick Actions & Master Wipe */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={refreshMetrics}
              disabled={loadingMetrics}
              className="inline-flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingMetrics ? 'animate-spin' : ''}`} />
              <span>تحديث الإحصائيات</span>
            </button>

            {onDeleteAllNotifications && (
              <button
                type="button"
                onClick={onDeleteAllNotifications}
                disabled={isDeletingAllNotifications}
                className="inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-xs transition-colors cursor-pointer"
                title="حذف جميع الإشعارات من قاعدة البيانات نهائياً لجميع المستخدمين"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeletingAllNotifications ? 'جاري المسح...' : 'تفريغ صندوق الإشعارات'}</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. REAL-TIME DELIVERY & SUBSCRIBER METRICS BANNER */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <SmartphoneNfc className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-emerald-800 block">أجهزة مفعلة للإشعارات</span>
              <span className="text-lg font-black text-emerald-950 font-mono">
                {metrics.totalSubscriptions} <span className="text-[10px] font-normal text-emerald-700">جهاز</span>
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Store className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-amber-800 block">أجهزة أصحاب المحلات</span>
              <span className="text-lg font-black text-amber-950 font-mono">
                {metrics.merchantsCount} <span className="text-[10px] font-normal text-amber-700">متجر</span>
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <History className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-blue-800 block">إجمالي الإشعارات بالمنظومة</span>
              <span className="text-lg font-black text-blue-950 font-mono">
                {metrics.totalSentNotifications || sentHistory.length} <span className="text-[10px] font-normal text-blue-700">إشعار</span>
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-purple-50/80 rounded-2xl border border-purple-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-purple-800 block">إشعارات مجدولة قيد الانتظار</span>
              <span className="text-lg font-black text-purple-950 font-mono">
                {scheduledList.filter(s => s.status === 'pending').length} <span className="text-[10px] font-normal text-purple-700">مجدول</span>
              </span>
            </div>
          </div>
        </div>

        {/* 3. SECTION SWITCHER TABS */}
        <div className="flex items-center gap-2 border-t border-stone-100 pt-4 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveMainTab('composer')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeMainTab === 'composer'
                ? 'bg-[#1a4d2e] text-white shadow-xs'
                : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200'
            }`}
          >
            <Send className="h-4 w-4" />
            <span>إنشاء وبث إشعار جديد</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('history')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeMainTab === 'history'
                ? 'bg-[#1a4d2e] text-white shadow-xs'
                : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200'
            }`}
          >
            <History className="h-4 w-4" />
            <span>سجل أرشيف الإشعارات المرسلة ({sentHistory.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveMainTab('scheduled')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
              activeMainTab === 'scheduled'
                ? 'bg-[#1a4d2e] text-white shadow-xs'
                : 'bg-stone-50 hover:bg-stone-100 text-stone-600 border border-stone-200'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>طابور الإشعارات المجدولة ({scheduledList.length})</span>
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* TAB 1: COMPOSER & TEMPLATES & LIVE DEVICE PREVIEW                         */}
      {/* ========================================================================= */}
      {activeMainTab === 'composer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT COLUMN: TEMPLATES LIBRARY */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-3xl border border-[#e5e1da] shadow-xs space-y-4 sticky top-20">
              <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <Bookmark className="h-5 w-5 text-purple-600" />
                  <h4 className="font-black text-sm text-[#2d2a26]">قوالب الإشعارات المعتمدة</h4>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleResetTemplatesToDefault}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 px-2 py-1.5 rounded-xl transition-colors cursor-pointer"
                    title="استعادة الصياغات الأصلية"
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
                    <span>حفظ كقالب</span>
                  </button>
                </div>
              </div>

              {/* Save Current as Custom Template Box */}
              {isSavingCustomTpl && (
                <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-xs space-y-2">
                  <span className="font-bold text-amber-900 block">حفظ الصيغة الحالية في النموذج كقالب مخصص:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newTemplateName}
                      onChange={e => setNewTemplateName(e.target.value)}
                      placeholder="اسم القالب..."
                      className="flex-1 bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCurrentAsCustomTemplate}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs cursor-pointer transition-colors"
                    >
                      حفظ
                    </button>
                  </div>
                </div>
              )}

              {/* Category Tab Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                {[
                  { id: 'all', label: 'الكل' },
                  { id: 'business', label: 'محلات' },
                  { id: 'medical', label: 'طبية' },
                  { id: 'offer', label: 'عروض' },
                  { id: 'job', label: 'وظائف' },
                  { id: 'housing', label: 'عقارات' },
                  { id: 'system', label: 'تحديثات' },
                  { id: 'custom', label: `مخصصة (${templates.filter(t => t.category === 'custom' || t.isCustom).length})` }
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
                  placeholder="ابحث في صياغات ونصوص القوالب..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-9 pl-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              {/* Templates Cards List */}
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {filteredTemplates.length === 0 ? (
                  <div className="text-center py-8 text-xs text-stone-400 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                    لا توجد قوالب تطابق هذا البحث.
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
                            <span>{isApplied ? 'مُفعّل بالنموذج' : 'تطبيق القالب'}</span>
                          </span>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleOpenEditTemplate(tpl, e)}
                              className="text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md font-bold flex items-center gap-1 transition-colors cursor-pointer text-[10px]"
                            >
                              <Edit3 className="h-3 w-3 text-emerald-600" />
                              <span>تعديل</span>
                            </button>

                            {(tpl.isCustom || tpl.category === 'custom') && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                                className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 cursor-pointer"
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

          {/* RIGHT COLUMN: BROADCAST COMPOSER & LIVE PHONE PREVIEW */}
          <div className="lg:col-span-7 space-y-6">
            <form onSubmit={handleOpenConfirmModal} className="bg-white p-5 sm:p-7 rounded-3xl border border-[#e5e1da] shadow-xs space-y-6">
              
              {/* COMPOSER HEADER */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1a4d2e] to-emerald-900 text-white flex items-center justify-center shadow-xs">
                    <Send className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-base text-[#2d2a26] flex items-center gap-2">
                      <span>صياغة وإرسال التنبيه</span>
                      {appliedTplId && (
                        <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          <span>قالب جاهز</span>
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-stone-500">إرسال فوري ومجدول مع الاستهداف المباشر ومعاينة شاشة الهاتف</p>
                  </div>
                </div>

                {/* Quick Action Toolbar */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSendTestToMyDevice}
                    disabled={isSendingTest}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                    title="إرسال إشعار تجريبي مباشر لهاتف المدير الشخصي للتأكد من المظهر والصوت"
                  >
                    <Smartphone className="h-3.5 w-3.5 text-emerald-700" />
                    <span>{isSendingTest ? 'جاري الإرسال...' : 'إرسال تجريبي لهاتفي'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFillSampleData}
                    className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Wand2 className="h-3.5 w-3.5 text-purple-700" />
                    <span>نموذج تجريبي</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearForm}
                    className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-stone-500" />
                    <span>مسح</span>
                  </button>
                </div>
              </div>

              {/* TARGETING AUDIENCE SELECTOR */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                    <Filter className="h-4 w-4 text-[#1a4d2e]" />
                    <span>تحديد الشريحة والجمهور المستهدف:</span>
                  </label>
                  <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-full">
                    {getAudienceEstimateText()}
                  </span>
                </div>

                {/* Target Role Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'all', label: 'الجميع (عام)', icon: Radio },
                    { id: 'merchants', label: 'التجار والمحلات', icon: Store },
                    { id: 'users', label: 'الزوار والأعضاء', icon: Users },
                    { id: 'supervisors', label: 'المشرفون والمدراء', icon: Zap },
                    { id: 'direct', label: 'استهداف فردي خاص', icon: UserCheck }
                  ].map(r => {
                    const isSelected = targetRole === r.id;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setTargetRole(r.id as any)}
                        className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-1 ${
                          isSelected
                            ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-xs'
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <span>{r.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Direct User Input (If Direct Targeted Mode Selected) */}
                {targetRole === 'direct' && (
                  <div className="p-3 bg-white rounded-xl border border-emerald-300 space-y-1.5 animate-in fade-in">
                    <label className="block text-[11px] font-bold text-emerald-950">
                      البريد الإلكتروني أو معرّف المستخدم المستهدف (User ID):
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={directUserIdentifier}
                      onChange={e => setDirectUserIdentifier(e.target.value)}
                      placeholder="user@example.com أو uid_12345"
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                    />
                  </div>
                )}

                {/* Regional and Category Filter if not direct */}
                {targetRole !== 'direct' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">المنطقة / الشارع</label>
                      <select
                        value={targetArea}
                        onChange={e => setTargetArea(e.target.value)}
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                      >
                        <option value="all">كافة مناطق وشوارع إربد</option>
                        {IRBID_REGIONS_CATEGORIZED.map((group, gIdx) => (
                          <optgroup key={gIdx} label={group.groupName}>
                            {group.areas.map((area, aIdx) => (
                              <option key={aIdx} value={area}>
                                {area}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-stone-700 mb-1">القطاع / التصنيف الرئيسي</label>
                      <select
                        value={targetCategory}
                        onChange={e => {
                          setTargetCategory(e.target.value);
                          setTargetSubCategory('all');
                        }}
                        className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                      >
                        <option value="all">جميع القطاعات والتصنيفات</option>
                        {Object.keys(BUSINESS_CATEGORIES).map((catKey) => (
                          <option key={catKey} value={catKey}>
                            {catKey}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* TYPE SELECTOR */}
              <div>
                <label className="block text-xs font-black text-stone-800 mb-2">نوع وتصنيف الإشعار</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'offer', label: 'عرض وتخفيض', icon: Flame, color: 'text-red-600 border-red-200 bg-red-50/70' },
                    { id: 'job', label: 'شاغر وظيفي', icon: Briefcase, color: 'text-emerald-700 border-emerald-200 bg-emerald-50/70' },
                    { id: 'marketing', label: 'باقات تسويق', icon: Sparkles, color: 'text-purple-600 border-purple-200 bg-purple-50/70' },
                    { id: 'news', label: 'أخبار وتحديث', icon: Newspaper, color: 'text-blue-600 border-blue-200 bg-blue-50/70' },
                    { id: 'system', label: 'تنبيه عام', icon: Store, color: 'text-[#1a4d2e] border-stone-200 bg-stone-50/70' },
                  ].map(item => {
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
                        <span className="text-xs whitespace-nowrap font-bold">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* VARIABLE INSERTION BAR */}
              <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-200 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-purple-950 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-purple-700" />
                    <span>إدراج المتغيرات التلقائية:</span>
                  </span>
                  <span className="text-[10px] text-purple-700">
                    في ({focusedField === 'title' ? 'العنوان' : 'النص'})
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  {TEMPLATE_VARIABLES.map(v => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => {
                        if (focusedField === 'title') insertVariableToTitle(v.key);
                        else insertVariableToMessage(v.key);
                      }}
                      className="bg-white hover:bg-purple-100 text-purple-900 border border-purple-200 px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer transition-colors"
                    >
                      +{v.key}
                    </button>
                  ))}
                </div>
              </div>

              {/* TITLE FIELD */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-stone-800">عنوان الإشعار *</label>
                  <span className="text-[10px] font-mono font-bold text-stone-400">
                    {title.length} / 65 حرف
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={title}
                  onFocus={() => setFocusedField('title')}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="اكتب عنوان الإشعار هنا..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white transition-all font-bold text-stone-800"
                />
              </div>

              {/* MESSAGE BODY FIELD */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black text-stone-800">نص ومحتوى الإشعار *</label>
                  <span className="text-[10px] font-mono font-bold text-stone-400">
                    {message.length} / 200 حرف
                  </span>
                </div>
                <textarea
                  required
                  rows={3}
                  value={message}
                  onFocus={() => setFocusedField('message')}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="اكتب محتوى الإشعار بالتفصيل..."
                  className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white transition-all text-stone-800 resize-none leading-relaxed"
                ></textarea>
              </div>

              {/* ROUTE & BADGE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-stone-800 mb-1">الرابط الموجه (Route)</label>
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
                  <label className="block text-xs font-black text-stone-800 mb-1">شارة الإشعار (Badge)</label>
                  <input
                    type="text"
                    value={badge}
                    onChange={e => setBadge(e.target.value)}
                    placeholder="مثال: عرض جديد"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:bg-white transition-all text-stone-800 font-bold"
                  />
                </div>
              </div>

              {/* QUICK ROUTE BUTTONS */}
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

              {/* PRIORITY & SCHEDULING SETTINGS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-200">
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
                      <span>{priority === 'high' ? 'أولوية قصوى' : 'عادي'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSoundEnabled(!soundEnabled)}
                      className={`py-1.5 px-3 rounded-xl text-xs font-bold border cursor-pointer transition-all flex items-center justify-center gap-1 ${
                        soundEnabled
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-stone-100 text-stone-500 border-stone-200'
                      }`}
                    >
                      {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                      <span>{soundEnabled ? 'مسموع' : 'صامت'}</span>
                    </button>
                  </div>
                </div>

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
                          ? 'bg-amber-600 text-white border-amber-700'
                          : 'bg-white text-stone-600 border-stone-200'
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>جدولة بوقت</span>
                    </button>
                  </div>
                </div>

                {deliveryMode === 'scheduled' && (
                  <div className="sm:col-span-2 pt-2 border-t border-stone-200 grid grid-cols-2 gap-2">
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

              {/* 4. REAL-TIME LIVE PHONE MOCKUP PREVIEW */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                    <Eye className="h-4 w-4 text-[#1a4d2e]" />
                    <span>معاينة حية لشكل الإشعار على شاشة الهاتف:</span>
                  </span>

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
                      <span>صندوق الوارد</span>
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
                      <span>بانر منبثق</span>
                    </button>
                  </div>
                </div>

                {/* LOCK SCREEN PREVIEW */}
                {activePreviewMode === 'phone' && (
                  <div className="p-4 bg-stone-900 rounded-3xl border border-stone-800 text-white space-y-2 shadow-inner">
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
                        <h5 className="font-black text-xs text-stone-100 line-clamp-1">{title || 'عنوان الإشعار يظهر هنا'}</h5>
                        {badge && (
                          <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded-md font-bold shrink-0">
                            {badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-stone-300 leading-relaxed mt-1 line-clamp-2">
                        {message || 'هنا يظهر نص ومحتوى التنبيه الكامل كما يتلقاه المستخدم على شاشة هاتفه...'}
                      </p>
                      <div className="mt-2 text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                        <span>الوجهة:</span>
                        <span className="underline">{link || '/offers'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* IN-APP INBOX PREVIEW */}
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
                            <span className="text-[10px] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md font-bold shrink-0">
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

                {/* BANNER POPUP PREVIEW */}
                {activePreviewMode === 'banner' && (
                  <div className="p-3.5 bg-[#1a4d2e] text-white rounded-2xl border border-emerald-700 shadow-lg space-y-1.5 animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <BellRing className="h-4 w-4 text-[#ff9f1c]" />
                        <span className="font-black text-xs">{title || 'تنبيه من منصة شو في بإربد'}</span>
                      </div>
                      <X className="h-3.5 w-3.5 text-emerald-200 opacity-60" />
                    </div>
                    <p className="text-[11px] text-emerald-100 line-clamp-2 leading-relaxed">
                      {message || 'تفاصيل التنبيه العاجل الموجه للمستخدم...'}
                    </p>
                  </div>
                )}
              </div>

              {/* SUBMIT BUTTON */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-[#1a4d2e] hover:bg-[#143d24] text-white font-black text-sm transition-all shadow-md cursor-pointer disabled:opacity-50 inline-flex items-center justify-center gap-2 hover:shadow-lg active:scale-[0.99]"
                >
                  <Send className="h-4 w-4" />
                  <span>{isSubmitting ? 'جاري التحضير للبث...' : 'مراجعة وتأكيد إرسال الإشعار'}</span>
                </button>
              </div>

            </form>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: SENT BROADCASTS ARCHIVE HISTORY                                   */}
      {/* ========================================================================= */}
      {activeMainTab === 'history' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#e5e1da] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
            <div>
              <h4 className="font-black text-base text-stone-900 flex items-center gap-2">
                <History className="h-5 w-5 text-[#1a4d2e]" />
                <span>سجل أرشيف الإشعارات المرسلة سابقاً</span>
              </h4>
              <p className="text-xs text-stone-500">استعراض وتكرار أو حذف الإشعارات الصادرة لجميع المشتركين</p>
            </div>

            {/* History Search */}
            <div className="relative w-full sm:w-72">
              <Search className="h-3.5 w-3.5 text-stone-400 absolute right-3 top-2.5" />
              <input
                type="text"
                value={historySearch}
                onChange={e => setHistorySearch(e.target.value)}
                placeholder="بحث في أرشيف الإشعارات..."
                className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-9 pl-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
              />
            </div>
          </div>

          {/* History List */}
          {sentHistory.length === 0 ? (
            <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400 text-xs">
              لا توجد إشعارات مسجلة في الأرشيف حالياً.
            </div>
          ) : (
            <div className="space-y-3">
              {sentHistory
                .filter(item => {
                  if (!historySearch.trim()) return true;
                  const q = historySearch.toLowerCase();
                  return (
                    (item.title && item.title.toLowerCase().includes(q)) ||
                    (item.message && item.message.toLowerCase().includes(q)) ||
                    (item.badge && item.badge.toLowerCase().includes(q))
                  );
                })
                .map((item) => {
                  const dateStr = item.createdAt 
                    ? (typeof item.createdAt === 'number' 
                        ? new Date(item.createdAt).toLocaleString('ar-JO') 
                        : new Date(item.createdAt).toLocaleString('ar-JO')) 
                    : 'تاريخ غير محدد';

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-2xl border border-stone-200 bg-white hover:border-[#1a4d2e]/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-xs text-stone-900">{item.title}</span>
                          {item.badge && (
                            <span className="text-[10px] bg-stone-100 text-stone-700 font-bold px-2 py-0.5 rounded-md">
                              {item.badge}
                            </span>
                          )}
                          <span className="text-[10px] text-stone-400 font-mono">
                            {dateStr}
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 leading-relaxed line-clamp-2">
                          {item.message || item.body}
                        </p>
                        {item.link && (
                          <div className="text-[10px] text-emerald-800 font-mono">
                            الرابط: {item.link}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                        <button
                          type="button"
                          onClick={() => handleReuseNotification(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#1a4d2e] border border-emerald-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                          title="نسخ بيانات هذا الإشعار للنموذج لإعادة إرساله"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span>إعادة استخدام</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteHistoryItem(item.id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          title="حذف الإشعار من السجل والصندوق"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SCHEDULED NOTIFICATIONS QUEUE                                     */}
      {/* ========================================================================= */}
      {activeMainTab === 'scheduled' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-[#e5e1da] shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div>
              <h4 className="font-black text-base text-stone-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-amber-600" />
                <span>طابور الإشعارات المجدولة زمنياً</span>
              </h4>
              <p className="text-xs text-stone-500">متابعة وإلغاء أو تعديل الإشعارات المؤقتة المجهزة للإرسال بالخلفية</p>
            </div>
          </div>

          {scheduledList.length === 0 ? (
            <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-stone-200 text-stone-400 text-xs">
              لا توجد إشعارات مجدولة في طابور الانتظار حالياً.
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledList.map((item) => {
                const isPending = item.status === 'pending';
                const scheduledDateDisplay = item.scheduledTimestamp 
                  ? new Date(item.scheduledTimestamp).toLocaleString('ar-JO') 
                  : (item.scheduledDateStr || 'تاريخ محدد');

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isPending ? 'bg-amber-50/40 border-amber-200' : 'bg-stone-50 border-stone-200 opacity-75'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-xs text-stone-900">{item.title}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isPending ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                        }`}>
                          {isPending ? 'قيد الانتظار' : 'تم الإرسال'}
                        </span>
                        <span className="text-[11px] text-amber-900 font-bold font-mono">
                          موعد البث: {scheduledDateDisplay}
                        </span>
                      </div>
                      <p className="text-xs text-stone-600 leading-relaxed">
                        {item.body}
                      </p>
                      <div className="text-[10px] text-stone-500 font-mono">
                        المستهدف: {item.targetGroup || 'الجميع'} | الرابط: {item.link || '/'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {isPending && (
                        <button
                          type="button"
                          onClick={() => handleCancelScheduled(item.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          <X className="h-3.5 w-3.5" />
                          <span>إلغاء الجدولة</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* EDIT TEMPLATE MODAL */}
      {isEditModalOpen && editingTemplate && (
        <div className="fixed inset-0 z-[9999] bg-stone-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in" dir="rtl">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-stone-200 shadow-2xl my-auto flex flex-col max-h-[88vh] overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-stone-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 text-purple-800 rounded-xl">
                  <Edit3 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-stone-900">تعديل صياغة القالب</h3>
                  <p className="text-xs text-stone-500">تحديث عنوان ونص الإشعار</p>
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

            <form onSubmit={handleSaveEditedTemplate} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              <div>
                <label className="block text-xs font-black text-stone-700 mb-1">عنوان القالب *</label>
                <input
                  type="text"
                  required
                  value={editingTemplate.title}
                  onChange={e => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-sm font-bold text-stone-800 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-stone-700 mb-1">نص ومحتوى القالب *</label>
                <textarea
                  required
                  rows={3}
                  value={editingTemplate.message}
                  onChange={e => setEditingTemplate({ ...editingTemplate, message: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm text-stone-800 focus:bg-white resize-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-stone-700 mb-1">شارة القالب</label>
                  <input
                    type="text"
                    value={editingTemplate.badge}
                    onChange={e => setEditingTemplate({ ...editingTemplate, badge: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-stone-700 mb-1">الرابط الموجه</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={editingTemplate.link}
                    onChange={e => setEditingTemplate({ ...editingTemplate, link: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono text-left text-stone-800"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingTemplate(null);
                  }}
                  className="px-4 py-2 bg-stone-100 text-stone-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-black rounded-xl cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION BROADCAST MODAL */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-[100000] overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl border border-stone-200 shadow-2xl max-w-lg w-full max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden my-auto animate-in zoom-in-95">
            
            <div className="p-4 sm:p-5 bg-[#1a4d2e] text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-900 rounded-xl">
                  <ShieldAlert className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-black text-base">تأكيد إطلاق الإشعار</h3>
                  <p className="text-xs text-emerald-200">يرجى مراجعة تفاصيل التنبيه والمستهدفين قبل الإرسال</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-stone-800">
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-1.5">
                <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                  الشريحة والجمهور المستهدف:
                </span>
                <p className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                  <Radio className="h-4 w-4 text-emerald-700" />
                  <span>{getAudienceEstimateText()}</span>
                </p>
              </div>

              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-stone-900">{title}</span>
                  {badge && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2.5 py-0.5 rounded-full">
                      {badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-600 leading-relaxed whitespace-pre-wrap">{message}</p>
                
                <div className="pt-2 border-t border-stone-200 text-[11px] font-mono text-stone-500 flex flex-wrap items-center justify-between gap-2">
                  <span>الرابط: <strong className="text-stone-800">{link}</strong></span>
                  <span>الأولوية: <strong className="text-rose-600">{priority === 'high' ? 'قصوى' : 'عادي'}</strong></span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  {deliveryMode === 'scheduled' ? (
                    <span>
                      سيتم جدولة هذا الإشعار للبث التلقائي بتاريخ <strong>{scheduledDate}</strong> في تمام الساعة <strong>{scheduledTime}</strong>.
                    </span>
                  ) : (
                    <span>
                      سيتم بث وإرسال هذا الإشعار فوراً إلى الأجهزة المستهدفة عبر الـ Web Push.
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 text-xs font-bold transition-all cursor-pointer"
              >
                تعديل
              </button>

              <button
                type="button"
                onClick={executeBroadcast}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-[#1a4d2e] hover:bg-[#143d24] text-white text-xs font-black transition-all shadow-md cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                <span>{isSubmitting ? 'جاري التنفيذ...' : (deliveryMode === 'scheduled' ? 'تأكيد وحفظ الجدولة' : 'تأكيد وإطلاق البث فوراً')}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
