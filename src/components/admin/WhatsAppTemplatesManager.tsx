import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Save, 
  Phone, 
  Sparkles, 
  Copy, 
  CheckCircle2, 
  Info,
  Crown,
  Store,
  ShieldCheck,
  ShoppingBag,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { WhatsAppIcon } from '../common/WhatsAppIcon';
import { db } from '../../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface WhatsAppTemplatesManagerProps {
  showToast: (text: string, type?: 'success' | 'info' | 'error') => void;
}

interface TemplateItem {
  id: string;
  title: string;
  iconName: string;
  description: string;
  template: string;
  variables: string[];
}

const DEFAULT_TEMPLATES: Record<string, TemplateItem> = {
  vip_expiry: {
    id: 'vip_expiry',
    title: 'تذكير اقتراب انتهاء باقة VIP',
    iconName: 'Crown',
    description: 'يتم إرسالها لأصحاب المنشآت عند اقتراب موعد تجديد الباقة الذهبية',
    template: 'مرحباً إدارة {business_name} 🌹\n\nنود تذكيركم بأن اشتراك باقة VIP الذهبية لمنشأتكم على دليل (شو في بإربد) سينتهي بتاريخ {expiry_date}.\n\nللتجديد والحفاظ على صدارة المحل والظهور المميز، يرجى التواصل معنا أو تجديد الاشتراك من لوحة التحكم.',
    variables: ['{business_name}', '{expiry_date}']
  },
  welcome_merchant: {
    id: 'welcome_merchant',
    title: 'ترحيب باعتماد المحل الجديد',
    iconName: 'Store',
    description: 'يتم إرسالها لمالك المنشأة فور اعتماد طلبه ونشر محله بالدليل',
    template: 'أهلاً وسهلاً بك {owner_name} في عائلة دليل (شو في بإربد) 🎉\n\nتمت مراجعة واعتماد منشأتكم ({business_name}) وهي الآن منشورة ومتاحة لجميع زوار وأهالي إربد.\n\nرابط صفحتكم: {store_url}\nنتمنى لكم كل التوفيق والنجاح.',
    variables: ['{owner_name}', '{business_name}', '{store_url}']
  },
  claim_verification: {
    id: 'claim_verification',
    title: 'التحقق من إثبات ملكية المنشأة',
    iconName: 'ShieldCheck',
    description: 'يتم إرسالها عند تقديم طلب إثبات وتوثيق ملكية محل',
    template: 'مرحباً بك {owner_name} 👋\n\nبخصوص طلب توثيق ملكية منشأة ({business_name}) على منصة شو في بإربد، يرجى تزويدنا بصورة السجل التجاري أو رخصة المهن لإتمام عملية التوثيق وربط المحل بحسابكم.',
    variables: ['{owner_name}', '{business_name}']
  },
  new_order: {
    id: 'new_order',
    title: 'إشعار طلب طعام / شراء جديد',
    iconName: 'ShoppingBag',
    description: 'يتم إرسالها للمطعم أو التاجر عند ورود طلب أونلاين جديد من زبون',
    template: 'طلب جديد من منصة شو في بإربد! 🛎️\n\nرقم الطلب: #{order_id}\nاسم الزبون: {customer_name}\nرقم الهاتف: {customer_phone}\nالإجمالي: {order_total} د.أ\n\nيرجى الدخول للوحة التحكم لمتابعة وتجهيز الطلب.',
    variables: ['{order_id}', '{customer_name}', '{customer_phone}', '{order_total}']
  },
  support_ticket: {
    id: 'support_ticket',
    title: 'متابعة الدعم الفني والاستفسارات',
    iconName: 'HelpCircle',
    description: 'يتم إرسالها للرد المباشر على الشكاوى والاستفسارات الفنية',
    template: 'مرحباً أخي الكريم 👋\n\nبخصوص استفساركم الوارد لمنصة شو في بإربد، نحن سعداء بخدمتكم وفريق الدعم الفني جاهز لمساعدتكم في أي وقت.',
    variables: []
  }
};

export function WhatsAppTemplatesManager({ showToast }: WhatsAppTemplatesManagerProps) {
  const [officialPhone, setOfficialPhone] = useState(() => {
    try {
      const cached = localStorage.getItem('shoof_whatsapp_official_phone');
      if (cached) return cached;
    } catch {}
    return '0790000000';
  });

  const [templates, setTemplates] = useState<Record<string, TemplateItem>>(() => {
    try {
      const cached = localStorage.getItem('shoof_whatsapp_templates');
      if (cached) {
        return { ...DEFAULT_TEMPLATES, ...JSON.parse(cached) };
      }
    } catch {}
    return DEFAULT_TEMPLATES;
  });

  const [activeTemplateId, setActiveTemplateId] = useState<string>('vip_expiry');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!db) return;
    try {
      const snap = await getDoc(doc(db, 'systemConfig', 'whatsapp_templates'));
      if (snap.exists()) {
        const data = snap.data();
        if (data.officialPhone) {
          setOfficialPhone(data.officialPhone);
          try { localStorage.setItem('shoof_whatsapp_official_phone', data.officialPhone); } catch {}
        }
        if (data.templates) {
          const merged = { ...DEFAULT_TEMPLATES, ...data.templates };
          setTemplates(merged);
          try { localStorage.setItem('shoof_whatsapp_templates', JSON.stringify(merged)); } catch {}
        }
      }
    } catch (err) {
      console.warn('WhatsApp templates loader notice (using cached defaults):', err);
    }
  };

  const handleSave = async () => {
    if (!db) return;
    setSaving(true);
    try {
      const payload = {
        officialPhone: officialPhone.trim(),
        templates,
        updatedAt: Date.now()
      };

      await setDoc(doc(db, 'systemConfig', 'whatsapp_templates'), payload, { merge: true });

      try {
        localStorage.setItem('shoof_whatsapp_official_phone', officialPhone.trim());
        localStorage.setItem('shoof_whatsapp_templates', JSON.stringify(templates));
      } catch {}

      showToast('تم حفظ قوالب رسائل الواتساب وإعدادات الرقم بنجاح');
    } catch (err) {
      console.error('Error saving templates:', err);
      showToast('فشل حفظ القوالب', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTemplateChange = (id: string, text: string) => {
    setTemplates(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        template: text
      }
    }));
  };

  const currentTemplate = templates[activeTemplateId] || DEFAULT_TEMPLATES.vip_expiry;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-700 font-bold">
              <WhatsAppIcon className="h-5 w-5 fill-emerald-600" />
            </div>
            <h3 className="text-xl font-black text-stone-900">محرر قوالب رسائل الواتساب الجاهزة</h3>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            تخصيص وتعديل نصوص ورسائل الواتساب التلقائية المستخدمة للتواصل مع التجار والزبائن في إربد.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-5 py-2.5 rounded-2xl text-xs font-black transition-all shadow-xs cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
        </button>
      </div>

      {/* Official WhatsApp Phone Config */}
      <div className="bg-white p-5 rounded-3xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Phone className="h-4 w-4 text-[#1a4d2e]" />
          <div>
            <span className="text-xs font-black text-stone-800 block">رقم الواتساب الرسمي المعتمد للمنصة</span>
            <span className="text-[10px] text-stone-400">يستخدم لاستقبال استفسارات الزوار وطلبات الدعم</span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            value={officialPhone}
            onChange={e => setOfficialPhone(e.target.value)}
            placeholder="079XXXXXXX"
            className="w-full sm:w-48 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
          />
        </div>
      </div>

      {/* Templates Editor Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates List Selector */}
        <div className="bg-white p-4 rounded-3xl border border-stone-200 shadow-xs space-y-2">
          <h4 className="font-black text-xs text-stone-600 px-2 py-1">قائمة القوالب التلقائية</h4>
          {Object.values(templates).map(t => {
            const isSelected = t.id === activeTemplateId;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTemplateId(t.id)}
                className={`w-full text-right p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                  isSelected
                    ? 'bg-emerald-50/60 border-[#1a4d2e] shadow-2xs'
                    : 'bg-stone-50/50 border-stone-200/60 hover:bg-stone-50'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-white border border-stone-200 flex items-center justify-center shrink-0 text-[#1a4d2e]">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="font-black text-xs text-stone-900">{t.title}</div>
                  <div className="text-[10px] text-stone-400 line-clamp-1">{t.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Editor Area */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-5">
          <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
            <div>
              <h4 className="font-black text-sm text-stone-900">{currentTemplate.title}</h4>
              <p className="text-[11px] text-stone-400">{currentTemplate.description}</p>
            </div>
            <span className="text-[10px] font-mono bg-stone-100 text-stone-600 px-2.5 py-1 rounded-lg">
              {currentTemplate.id}
            </span>
          </div>

          {/* Variables hint */}
          {currentTemplate.variables && currentTemplate.variables.length > 0 && (
            <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-black text-emerald-900">
                <Info className="h-3.5 w-3.5 text-emerald-700" />
                <span>المتغيرات المتاحة لهذا القالب (يتم استبدالها تلقائياً بالبيانات الحقيقية):</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {currentTemplate.variables.map(v => (
                  <span key={v} className="bg-white border border-emerald-300 font-mono text-[11px] font-bold text-emerald-800 px-2 py-0.5 rounded-md">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Textarea Editor */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700">نص الرسالة</label>
            <textarea
              rows={8}
              value={currentTemplate.template}
              onChange={e => handleTemplateChange(currentTemplate.id, e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs font-sans font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] leading-relaxed"
            />
          </div>

          {/* Live Preview Box */}
          <div className="p-4 rounded-2xl bg-[#e5ddd5]/30 border border-stone-300/60 space-y-2">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">معاينة الرسالة للمستلم:</span>
            <div className="bg-white p-3.5 rounded-2xl rounded-tr-xs shadow-2xs text-xs text-stone-800 whitespace-pre-wrap leading-relaxed border border-stone-200 max-w-lg">
              {currentTemplate.template}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
