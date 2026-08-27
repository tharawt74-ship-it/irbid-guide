import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Business } from '../../types';
import { db } from '../../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Clock, Bell, Sparkles, CheckCircle2, X } from 'lucide-react';

interface ScheduledNotificationModalProps {
  business: Business;
  isOpen: boolean;
  onClose: () => void;
  onScheduled: (msg: string) => void;
}

export function ScheduledNotificationModal({ business, isOpen, onClose, onScheduled }: ScheduledNotificationModalProps) {
  const { currentUser, isAdmin } = useAuth();
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().slice(0, 10));
  const [scheduledTime, setScheduledTime] = useState('18:00');
  const [scheduledNotes, setScheduledNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || typeof document === 'undefined') return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (business.userId !== currentUser.uid && !isAdmin) {
      alert("غير مصرح لك بجدولة إشعارات لغير محلك الخاص!");
      return;
    }

    setIsSubmitting(true);

    try {
      if (db && currentUser) {
        await addDoc(collection(db, 'marketingRequests'), {
          businessId: business.id,
          businessName: business.name,
          userId: currentUser.uid,
          userEmail: currentUser.email || '',
          serviceType: 'scheduled_push_notification',
          serviceName: 'جدولة إشعار ترويجي مخصص',
          scheduledDate,
          scheduledTime,
          scheduledNotes: scheduledNotes.trim() || 'لا توجد ملاحظات إضافية',
          status: 'pending',
          createdAt: Date.now()
        });
      }

      onScheduled(`تم جدولة موعد الإشعار الترويجي لـ "${business.name}" بتاريخ ${scheduledDate} الساعة ${scheduledTime} بنجاح!`);
      onClose();
    } catch (err) {
      console.error("Error scheduling notification:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-5 text-right my-auto animate-in fade-in zoom-in-95">
        
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
              <Calendar className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900">جدولة موعد الإشعار الترويجي (Scheduled Slot)</h3>
              <p className="text-xs text-stone-500">حدد الوقت واليوم المناسب لإرسال إشعار العرض لزبائن إربد</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold text-stone-800">
          <div>
            <label className="block text-stone-700 mb-1">اسم المحل المروج له</label>
            <input
              type="text"
              disabled
              value={business.name}
              className="w-full bg-stone-100 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-black text-stone-700 cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-stone-700 mb-1">تاريخ الإرسال المطلوب *</label>
              <input
                type="date"
                required
                value={scheduledDate}
                onChange={e => setScheduledDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
              />
            </div>

            <div>
              <label className="block text-stone-700 mb-1">ساعة الإرسال المحددة *</label>
              <input
                type="time"
                required
                value={scheduledTime}
                onChange={e => setScheduledTime(e.target.value)}
                className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
              />
            </div>
          </div>

          <div>
            <label className="block text-stone-700 mb-1">نص العرض أو ملاحظات الإشعار</label>
            <textarea
              rows={3}
              value={scheduledNotes}
              onChange={e => setScheduledNotes(e.target.value)}
              placeholder="اكتب تفاصيل العرض الإعلاني المراد تضمينه داخل الإشعار..."
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-xs font-medium text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] resize-none"
            ></textarea>
          </div>

          <div className="p-3 bg-sky-50 rounded-xl border border-sky-100 text-[11px] text-sky-900 leading-relaxed font-medium">
            ⏰ <strong>ملاحظة:</strong> سيتم حجز خانة زمنية مخصصة (Notification Slot) وسيصل إشعارك تلقائياً لجميع مستخدمي التطبيق في الوقت المحدد.
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-200 font-bold text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#1a4d2e] hover:bg-[#133b22] text-white font-black text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Bell className="h-4 w-4 text-[#ff9f1c]" />
              <span>{isSubmitting ? 'جاري الحجز...' : 'تأكيد وحجز موعد الإشعار'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>,
    document.body
  );
}
