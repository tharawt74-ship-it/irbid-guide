import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Calendar, Clock, User, Phone, Shield, FileText, CheckCircle2, 
  MessageSquare, Sparkles, Stethoscope, AlertCircle, ChevronLeft
} from 'lucide-react';
import { Business, MedicalFacilityInfo } from '../../types';
import { POPULAR_JORDANIAN_INSURANCES } from '../../lib/medicalHelper';
import { WhatsAppIcon } from '../common/WhatsAppIcon';

interface MedicalAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  business?: Business | null;
  medicalProfile: MedicalFacilityInfo;
}

export function MedicalAppointmentModal({
  isOpen,
  onClose,
  business,
  medicalProfile
}: MedicalAppointmentModalProps) {
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [visitType, setVisitType] = useState<'first_visit' | 'follow_up' | 'urgent' | 'home_visit'>('first_visit');
  const [selectedInsurance, setSelectedInsurance] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('صباحاً (10:00 - 01:00)');
  const [symptomsNotes, setSymptomsNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !business) return null;

  const visitTypes = [
    { id: 'first_visit', label: 'كشفية جديدة أول مرة', desc: medicalProfile?.consultationFee || 'حسب تعرفة النقابة' },
    { id: 'follow_up', label: 'مراجعة دورية (متابعة)', desc: 'متابعة الحالة واستشارة الطبيب' },
    { id: 'urgent', label: 'كشف / استشارة مستعجلة', desc: 'أولوية في جدول المواعيد' },
    ...(medicalProfile?.offersHomeVisits ? [{ id: 'home_visit', label: 'طلب زيارة / فحص منزلي', desc: 'رعاية صحية في مكان إقامتك' }] : [])
  ];

  const timeslots = [
    'صباحاً (10:00 - 01:00)',
    'ظهراً (01:00 - 04:00)',
    'مساءً (04:00 - 08:00)',
    'أي وقت متاح للمركز'
  ];

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim() || !patientPhone.trim()) {
      alert('يرجى كتابة الاسم ورقم الهاتف لإتمام الحجز.');
      return;
    }

    setIsSubmitting(true);

    const typeLabel = visitTypes.find(t => t.id === visitType)?.label || 'كشفية';
    const cleanPhone = (business?.phone || business?.socialLinks?.whatsapp || '').replace(/[^0-9]/g, '');

    // Format professional WhatsApp appointment message
    const msg = `مرحباً، أود حجز موعد كشفية لدى *${business?.name || 'العيادة'}* عبر منصة شو في بإربد:

👤 *اسم المريض:* ${patientName}
📱 *رقم الهاتف:* ${patientPhone}
🩺 *نوع الزيارة:* ${typeLabel}
🛡️ *التأمين الصحي:* ${selectedInsurance || 'دفع نقدي / بدون تأمين'}
📅 *التاريخ المفضل:* ${preferredDate || 'أقرب موعد متاح'}
⏰ *الفترة الزمنية:* ${preferredTime}
${symptomsNotes.trim() ? `📝 *ملاحظات/استفسار:* ${symptomsNotes}` : ''}

يرجى تأكيد توقيت الموعد المناسب وشكراً جزيلاً.`;

    const encodedMsg = encodeURIComponent(msg);
    let targetUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
    
    // If no international code, adjust for Jordan (07XXXXXXXX -> 9627XXXXXXXX)
    if (cleanPhone.startsWith('07') && cleanPhone.length === 10) {
      targetUrl = `https://wa.me/962${cleanPhone.substring(1)}?text=${encodedMsg}`;
    }

    setIsSuccess(true);
    setTimeout(() => {
      window.open(targetUrl, '_blank');
      setIsSubmitting(false);
      onClose();
      setIsSuccess(false);
    }, 1000);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/80 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden">
      <div 
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-stone-200 overflow-hidden z-10 animate-in slide-in-from-bottom-5 duration-200 max-h-[88dvh] sm:max-h-[85vh] flex flex-col my-0 sm:my-auto">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-stone-300 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-l from-[#1a4d2e] via-emerald-800 to-teal-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-xs border border-white/10">
              <Stethoscope className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-black text-sm sm:text-base">حجز موعد كشفية واستشارة</h3>
                <span className="bg-emerald-400/20 text-emerald-200 text-[10px] px-2 py-0.5 rounded-full font-bold border border-emerald-400/30">
                  تأكيد فوري
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 font-medium truncate max-w-[260px]">
                {business.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Notice Bar */}
        <div className="bg-emerald-50/80 px-4 py-2.5 border-b border-emerald-100/80 flex items-center gap-2 text-xs font-bold text-emerald-900">
          <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{medicalProfile.bookingNotice || 'يتم تأكيد الموعد فورياً وتحديد الساعة الدقيقة لتجنب الانتظار.'}</span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleBookingSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 text-right">
          {/* Patient Info */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-black text-stone-800 mb-1 flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-emerald-700" />
                <span>اسم المريض الثلاثي *</span>
              </label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="مثال: أحمد محمد القضاة"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none transition-all font-medium text-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-stone-800 mb-1 flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-emerald-700" />
                <span>رقم الهاتف / الواتساب للتأكيد *</span>
              </label>
              <input
                type="tel"
                required
                dir="ltr"
                value={patientPhone}
                onChange={(e) => setPatientPhone(e.target.value)}
                placeholder="07XXXXXXXX"
                className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none transition-all font-medium text-stone-900 text-right"
              />
            </div>
          </div>

          {/* Visit Type */}
          <div>
            <label className="block text-xs font-black text-stone-800 mb-2 flex items-center gap-1">
              <Stethoscope className="h-3.5 w-3.5 text-emerald-700" />
              <span>نوع الزيارة والكشفية *</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {visitTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setVisitType(type.id as any)}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                    visitType === type.id
                      ? 'bg-emerald-50/80 border-emerald-600 text-emerald-950 ring-1 ring-emerald-600'
                      : 'bg-stone-50/60 border-stone-200 text-stone-700 hover:bg-stone-100/80'
                  }`}
                >
                  <span className="text-xs font-black">{type.label}</span>
                  <span className="text-[10px] text-stone-500 font-semibold mt-0.5">{type.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Insurance Selector */}
          <div>
            <label className="block text-xs font-black text-stone-800 mb-1 flex items-center gap-1">
              <Shield className="h-3.5 w-3.5 text-emerald-700" />
              <span>جهة التأمين الصحي (إن وجدت)</span>
            </label>
            <select
              value={selectedInsurance}
              onChange={(e) => setSelectedInsurance(e.target.value)}
              className="w-full text-xs sm:text-sm px-3.5 py-2.5 rounded-xl border border-stone-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none transition-all font-medium text-stone-900 bg-white"
            >
              <option value="">دفع كشفية نقدي / بدون تأمين</option>
              {POPULAR_JORDANIAN_INSURANCES.map((ins, i) => (
                <option key={i} value={ins.name}>
                  {ins.name} ({ins.type})
                </option>
              ))}
            </select>
          </div>

          {/* Preferred Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-stone-800 mb-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-emerald-700" />
                <span>اليوم المفضل</span>
              </label>
              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-stone-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none transition-all font-medium text-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-stone-800 mb-1 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-emerald-700" />
                <span>الفترة المفضلة</span>
              </label>
              <select
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-stone-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none transition-all font-medium text-stone-900 bg-white"
              >
                {timeslots.map((slot, i) => (
                  <option key={i} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-black text-stone-800 mb-1 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-emerald-700" />
              <span>الأعراض أو سبب الاستشارة (اختياري)</span>
            </label>
            <textarea
              rows={2}
              value={symptomsNotes}
              onChange={(e) => setSymptomsNotes(e.target.value)}
              placeholder="مثال: فحص دوري، ألم أسنان مفاجئ، مراجعة تحاليل..."
              className="w-full text-xs sm:text-sm px-3.5 py-2 rounded-xl border border-stone-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none transition-all font-medium text-stone-900 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-l from-[#1a4d2e] to-emerald-700 hover:from-[#133b22] hover:to-emerald-800 text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSuccess ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                  <span>جاري تحويلك لتأكيد الموعد...</span>
                </>
              ) : (
                <>
                  <WhatsAppIcon className="h-4 w-4" />
                  <span>إرسال وتأكيد الموعد عبر الواتساب فوراً</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-stone-400 mt-2 font-bold">
              لا توجد رسوم دفع مسبقة، يتم دفع الكشفية مباشرة في العيادة أو بالبطاقة التأمينية.
            </p>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
