import React, { useState, useMemo } from 'react';
import { 
  Crown, 
  Clock, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Store, 
  Calendar, 
  RefreshCw, 
  ArrowUpRight,
  Sparkles,
  Phone
} from 'lucide-react';
import { WhatsAppIcon } from '../common/WhatsAppIcon';
import { Business } from '../../types';
import { getBusinessVipStatus } from '../../lib/vipHelper';
import { db } from '../../lib/firebase';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';

interface VipExpiryRemindersProps {
  businesses: Business[];
  onOpenVipModal: (business: Business) => void;
  showToast: (text: string, type?: 'success' | 'info' | 'error') => void;
  onRefreshTrigger?: () => void;
}

export function VipExpiryReminders({
  businesses,
  onOpenVipModal,
  showToast,
  onRefreshTrigger
}: VipExpiryRemindersProps) {
  const [sendingNotificationId, setSendingNotificationId] = useState<string | null>(null);
  const [extendingId, setExtendingId] = useState<string | null>(null);

  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 3600 * 1000;

  // Filter VIP businesses expiring within 7 days or recently expired
  const expiringBusinesses = useMemo(() => {
    return businesses.map(b => {
      const vip = getBusinessVipStatus(b);
      const bVipUntil = (b as any).vipUntil || vip.expiresAt;
      return {
        business: b,
        vip,
        isExpiringSoon: vip.isVip && !!vip.expiresAt && (vip.expiresAt - now < sevenDaysMs) && vip.expiresAt > now,
        isExpired: !vip.isVip && !!bVipUntil && bVipUntil < now && (now - bVipUntil < 30 * 24 * 3600 * 1000)
      };
    }).filter(item => item.isExpiringSoon || item.isExpired);
  }, [businesses, now]);

  // Send in-app notification to merchant
  const handleSendInAppReminder = async (b: Business, expiresAt?: number) => {
    if (!db) return;
    const targetUid = b.userId || b.ownerId;
    if (!targetUid) {
      showToast('لم يتم العثور على معرّف حساب المالك لإرسال الإشعار', 'error');
      return;
    }

    setSendingNotificationId(b.id);
    try {
      const formattedDate = expiresAt ? new Date(expiresAt).toLocaleDateString('ar-JO') : 'قريباً';
      await addDoc(collection(db, 'notifications'), {
        userId: targetUid,
        title: 'تذكير: اقتراب موعد تجديد باقة VIP الذهبية',
        message: `مرحباً بك! نود تذكيرك بأن اشتراك باقة VIP الذهبية لمنشأتك (${b.name}) سينتهي بتاريخ ${formattedDate}. بادر بالتجديد للحفاظ على صدارة محلك وظهورك المميز.`,
        type: 'vip_reminder',
        createdAt: Date.now(),
        isRead: false
      });

      showToast(`تم إرسال إشعار التذكير لحساب مالك (${b.name}) بنجاح`);
    } catch (err) {
      console.error('Error sending reminder:', err);
      showToast('حدث خطأ أثناء إرسال الإشعار', 'error');
    } finally {
      setSendingNotificationId(null);
    }
  };

  // 1-Click Fast 30-Day Extension
  const handleFastExtend = async (b: Business) => {
    if (!db) return;
    setExtendingId(b.id);
    try {
      const bVipUntil = (b as any).vipUntil;
      const currentExpiry = bVipUntil && bVipUntil > now ? bVipUntil : now;
      const newExpiry = currentExpiry + 30 * 24 * 3600 * 1000;

      await updateDoc(doc(db, 'businesses', b.id), {
        isVip: true,
        vipUntil: newExpiry,
        packagePlan: 'golden',
        vipPackageId: 'golden'
      });

      showToast(`تم تمديد باقة VIP لمنشأة (${b.name}) لمدة 30 يوماً بنجاح`);
      if (onRefreshTrigger) onRefreshTrigger();
    } catch (err) {
      console.error(err);
      showToast('فشل تمديد الباقة', 'error');
    } finally {
      setExtendingId(null);
    }
  };

  // WhatsApp reminder URL
  const getWhatsAppReminderUrl = (b: Business, expiresAt?: number) => {
    const rawPhone = (b.phone || b.ownerPhone || '').replace(/\D/g, '');
    let cleanPhone = rawPhone;
    if (cleanPhone.startsWith('07')) cleanPhone = '962' + cleanPhone.substring(1);
    else if (cleanPhone.startsWith('7')) cleanPhone = '962' + cleanPhone;

    const formattedDate = expiresAt ? new Date(expiresAt).toLocaleDateString('ar-JO') : 'خلال أيام';
    const text = encodeURIComponent(`مرحباً أخي الكريم / إدارة ${b.name} 🌹\n\nنود تذكيركم بأن اشتراك باقة VIP الذهبية الخاصة بفرعكم على دليل (شو في بإربد) قارب على الانتهاء بتاريخ ${formattedDate}.\n\nللتجديد والاستمرار بالصدارة، يرجى التواصل معنا أو الدخول للوحة تحكم محلك.`);

    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-black text-sm text-stone-900">تنبيهات ومتابعة انتهاء باقات VIP الذهبية</h4>
            <p className="text-[11px] text-stone-500">الاشتراكات التي أوشكت على الانتهاء خلال 7 أيام لإرسال تذكير التجديد الفوري</p>
          </div>
        </div>

        <span className="bg-amber-100 text-amber-900 text-xs font-bold px-2.5 py-0.5 rounded-full">
          {expiringBusinesses.length} اشتراك يحتاج متابعة
        </span>
      </div>

      {expiringBusinesses.length === 0 ? (
        <div className="text-center py-6 text-xs text-stone-400 font-bold flex items-center justify-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span>كافة اشتراكات باقات VIP سارية ولا توجد اشتراكات تنتهي قريباً</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {expiringBusinesses.map(({ business, vip, isExpired }) => {
            const daysRemaining = vip.expiresAt ? Math.ceil((vip.expiresAt - now) / (24 * 3600 * 1000)) : 0;
            const phone = business.phone || business.ownerPhone;

            return (
              <div key={business.id} className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-amber-700" />
                    <span className="font-black text-xs text-stone-900">{business.name}</span>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isExpired ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900'
                  }`}>
                    {isExpired ? 'منتهي حديثاً' : `متبقي ${daysRemaining} أيام`}
                  </span>
                </div>

                <div className="text-[11px] text-stone-600 flex items-center justify-between font-mono">
                  <span>تاريخ الانتهاء: {vip.expiresAt ? new Date(vip.expiresAt).toLocaleDateString('ar-JO') : 'غير محدد'}</span>
                  {phone && <span>الهاتف: {phone}</span>}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-1">
                  {/* WhatsApp Reminder */}
                  {phone && (
                    <a
                      href={getWhatsAppReminderUrl(business, vip.expiresAt)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1.5 px-2 rounded-xl text-center transition-colors flex items-center justify-center gap-1 shadow-2xs"
                    >
                      <WhatsAppIcon className="h-3.5 w-3.5 fill-white" />
                      <span>تذكير واتساب</span>
                    </a>
                  )}

                  {/* In-app Reminder */}
                  <button
                    onClick={() => handleSendInAppReminder(business, vip.expiresAt)}
                    disabled={sendingNotificationId === business.id}
                    className="flex-1 bg-stone-800 hover:bg-stone-900 text-white text-[11px] font-bold py-1.5 px-2 rounded-xl transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                  >
                    <Send className="h-3 w-3 text-amber-400" />
                    <span>إشعار داخلي</span>
                  </button>

                  {/* Fast 30-Day Extend */}
                  <button
                    onClick={() => handleFastExtend(business)}
                    disabled={extendingId === business.id}
                    className="bg-[#1a4d2e] hover:bg-[#133b22] text-white text-[11px] font-bold py-1.5 px-2.5 rounded-xl transition-colors shrink-0 disabled:opacity-50"
                    title="تمديد 30 يوماً فوراً"
                  >
                    +30 يوم
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
