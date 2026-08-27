import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Megaphone, 
  Phone, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  Star, 
  DollarSign, 
  Clock, 
  Calendar, 
  ExternalLink,
  ShieldCheck,
  Send,
  Building2
} from 'lucide-react';
import { MarketingRequest, Business } from '../../types';

interface MarketingDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: MarketingRequest | null;
  business?: Business | null;
  onStatusChange: (reqId: string, newStatus: MarketingRequest['status'], businessId?: string, serviceType?: string) => Promise<void>;
  onDelete: (reqId: string) => Promise<void>;
}

export function MarketingDetailsModal({
  isOpen,
  onClose,
  request,
  business,
  onStatusChange,
  onDelete
}: MarketingDetailsModalProps) {
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

  if (!isOpen || !request || typeof document === 'undefined') return null;

  const getServicePricing = (type: string) => {
    switch (type) {
      case 'sponsored': return { price: '15 دينار / أسبوعياً', desc: 'ظهور المحل في صدارة نتائج البحث والتصنيفات وبانر مميز' };
      case 'push_notifications': return { price: '10 دنانير / إشعار', desc: 'إشعار فوري موجه لجميع مستخدمي المنصة في إربد' };
      case 'homepage_banner': return { price: '25 دينار / أسبوعياً', desc: 'إعلان رئيسي بارز في سلايدر أعلى الصفحة الرئيسية' };
      case 'nfc_stands': return { price: '8 دنانير / للقطعة', desc: 'ستاند طاولة ذكي لتقييم جوجل مابس وزيادة المتابعين' };
      case 'social_media': return { price: '50 دينار / تغطية', desc: 'تصوير فيديو ريل وتغطية احترافية عبر منصاتنا' };
      default: return { price: '15 دينار', desc: 'خدمة تسويقية مخصصة' };
    }
  };

  const serviceInfo = getServicePricing(request.serviceType);

  // Generate WhatsApp message link
  const generateWhatsAppUrl = () => {
    const phone = business?.phone || '';
    if (!phone) return null;
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const finalPhone = cleanPhone.startsWith('07') ? `962${cleanPhone.substring(1)}` : cleanPhone;
    const message = encodeURIComponent(`مرحباً أخي الكريم من إدارة منصة "شو في بإربد"، بخصوص طلبك لخدمة (${request.serviceName}) لمحل (${request.businessName}). نود تأكيد تفاصيل الحملة وتفعيلها.`);
    return `https://wa.me/${finalPhone}?text=${message}`;
  };

  const whatsappUrl = generateWhatsAppUrl();

  return createPortal(
    <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto" dir="rtl">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 relative my-auto animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5e1da] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xl font-black text-[#2d2a26]">تفاصيل الطلب التسويقي</h3>
              <p className="text-xs text-stone-500">متابعة الحملة الإعلانية والتواصل مع صاحب المحل</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Details */}
        <div className="space-y-4">
          
          {/* Business & Service Info Box */}
          <div className="bg-gradient-to-l from-stone-50 to-purple-50/40 p-5 rounded-2xl border border-purple-100 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-stone-500 block">اسم المحل:</span>
                <span className="text-lg font-black text-[#2d2a26]">{request.businessName}</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-black ${
                request.status === 'completed' || request.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-800'
                  : request.status === 'contacted'
                  ? 'bg-blue-100 text-blue-800'
                  : request.status === 'rejected'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {request.status === 'completed' || request.status === 'approved'
                  ? 'مفعّل ومعتمد ✅'
                  : request.status === 'contacted'
                  ? 'تم التواصل 📞'
                  : request.status === 'rejected'
                  ? 'مرفوض ❌'
                  : 'قيد الانتظار ⏳'}
              </span>
            </div>

            <div className="pt-2 border-t border-purple-100/60 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-stone-500 font-bold block mb-0.5">نوع الباقة المطلوبة:</span>
                <span className="text-purple-700 font-black">{request.serviceName}</span>
              </div>
              <div>
                <span className="text-stone-500 font-bold block mb-0.5">سعر الباقة المقدر:</span>
                <span className="text-emerald-700 font-black">{serviceInfo.price}</span>
              </div>
            </div>

            <p className="text-[11px] text-stone-600 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-stone-200">
              {serviceInfo.desc}
            </p>
          </div>

          {/* Contact Details */}
          <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-2 text-xs">
            <div className="font-black text-stone-700 mb-1">بيانات التواصل مع التاجر:</div>
            
            {business?.phone && (
              <div className="flex items-center justify-between">
                <span className="text-stone-500">رقم هاتف المحل:</span>
                <span className="font-mono font-bold text-stone-800" dir="ltr">{business.phone}</span>
              </div>
            )}

            {request.userEmail && (
              <div className="flex items-center justify-between">
                <span className="text-stone-500">البريد الإلكتروني:</span>
                <span className="font-mono text-stone-800">{request.userEmail}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-stone-500">تاريخ إنشاء الطلب:</span>
              <span className="text-stone-700">{new Date(request.createdAt).toLocaleString('ar-EG')}</span>
            </div>

            {business?.id && (
              <div className="pt-2 flex items-center justify-end">
                <a
                  href={`/business/${business.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#1a4d2e] hover:underline font-bold inline-flex items-center gap-1 text-[11px]"
                >
                  <ExternalLink className="h-3 w-3" />
                  معاينة صفحة المحل الحالية
                </a>
              </div>
            )}
          </div>

          {/* Quick Communication Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 min-w-[140px] bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-2 shadow-xs"
              >
                <MessageSquare className="h-4 w-4" />
                <span>محادثة واتساب سريعة</span>
              </a>
            )}

            {business?.phone && (
              <a
                href={`tel:${business.phone}`}
                className="bg-stone-100 hover:bg-stone-200 text-stone-800 p-2.5 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5"
              >
                <Phone className="h-4 w-4" />
                <span>اتصال هاتف</span>
              </a>
            )}
          </div>

          {/* Status Changer Actions */}
          <div className="space-y-2 pt-2 border-t border-stone-200">
            <div className="text-xs font-black text-stone-700">تغيير حالة الإعلان والتفعيل الفوري:</div>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={async () => {
                  await onStatusChange(request.id!, 'completed', request.businessId, request.serviceType);
                  onClose();
                }}
                className="bg-[#1a4d2e] hover:bg-[#143e25] text-white p-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4 text-[#ff9f1c]" />
                <span>اعتماد وتفعيل الخدمة ⭐</span>
              </button>

              <button
                onClick={async () => {
                  await onStatusChange(request.id!, 'contacted', request.businessId, request.serviceType);
                  onClose();
                }}
                className="bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Clock className="h-4 w-4" />
                <span>تم التواصل مع العميل</span>
              </button>

              <button
                onClick={async () => {
                  await onStatusChange(request.id!, 'rejected', request.businessId, request.serviceType);
                  onClose();
                }}
                className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <XCircle className="h-4 w-4" />
                <span>رفض أو إلغاء التفعيل</span>
              </button>

              <button
                onClick={async () => {
                  await onDelete(request.id!);
                  onClose();
                }}
                className="bg-stone-50 hover:bg-red-50 text-stone-600 hover:text-red-700 border border-stone-200 p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>حذف الطلب نهائياً 🗑️</span>
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>,
    document.body
  );
}
