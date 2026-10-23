import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, Briefcase, Clock, Calendar, ShieldCheck, UserCheck, 
  FileText, Phone, CheckCircle2, ChevronDown, Upload, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Business, MenuItem, ConsultationPackage } from '../../../types';
import { 
  CONSULTATION_TYPES, 
  getConsultationActionLabel, 
  formatConsultationPrice,
  generateConsultationWhatsAppMessage 
} from '../../../lib/professionalServicesHelper';
import { WhatsApp3DIcon, Phone3DIcon } from '../../common/PremiumContactButtons';

interface ProfessionalConsultationModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: MenuItem;
  business: Business;
  initialAction?: 'request_consultation' | 'book_appointment' | 'submit_project';
}

export function ProfessionalConsultationModal({
  isOpen,
  onClose,
  item,
  business,
  initialAction
}: ProfessionalConsultationModalProps) {
  const [actionType, setActionType] = useState<'request_consultation' | 'book_appointment' | 'submit_project'>(
    initialAction || item.consultationActionType || 'request_consultation'
  );

  const [selectedType, setSelectedType] = useState<string>(() => {
    if (item.consultationTypes && item.consultationTypes.length > 0) {
      const first = CONSULTATION_TYPES.find(t => t.id === item.consultationTypes![0]);
      return first ? first.label : 'استشارة حضورية بالمكتب';
    }
    return 'استشارة حضورية بالمكتب';
  });

  const [selectedPackage, setSelectedPackage] = useState<ConsultationPackage | null>(null);
  const [clientName, setClientName] = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [projectFileUrl, setProjectFileUrl] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const priceInfo = formatConsultationPrice(item);
  const phone = business.phone || '';
  const whatsappPhone = business.whatsapp || business.socialLinks?.whatsapp || phone;

  const handleSendWhatsApp = () => {
    let rawPhone = whatsappPhone.replace(/[^0-9]/g, '');
    if (rawPhone.startsWith('07')) {
      rawPhone = '962' + rawPhone.substring(1);
    } else if (!rawPhone.startsWith('962') && rawPhone.length === 9) {
      rawPhone = '962' + rawPhone;
    }

    const message = generateConsultationWhatsAppMessage(business.name, item, {
      actionType,
      consultationType: selectedType,
      clientName: clientName.trim() || undefined,
      preferredDate: preferredDate.trim() || undefined,
      projectFileUrl: projectFileUrl.trim() || undefined,
      notes: notes.trim() || undefined
    });

    if (rawPhone) {
      window.open(`https://wa.me/${rawPhone}?text=${encodeURIComponent(message)}`, '_blank');
      onClose();
    } else {
      alert(`رقم هاتف ${business.name} غير متوفر للتواصل المباشر.`);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100000] bg-stone-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden" dir="rtl">
      <div className="absolute inset-0" onClick={onClose} />

      <motion.div
        initial={{ y: '100%', opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative z-10 bg-white w-full sm:max-w-xl max-h-[90vh] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-stone-200 text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1a4d2e] text-white flex items-center justify-center shadow-xs">
              <Briefcase className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-stone-900">
                {getConsultationActionLabel(actionType)}
              </h3>
              <p className="text-[10px] text-stone-500 font-bold">{business.name}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-stone-200/70 hover:bg-stone-300/80 text-stone-600 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
          {/* Service Summary Card */}
          <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="text-sm font-black text-stone-900">{item.name}</h4>
                {item.category && (
                  <span className="text-[10px] text-stone-500 font-bold block">{item.category}</span>
                )}
              </div>
              <div className="text-left shrink-0">
                <span className="text-xs sm:text-sm font-black text-[#1a4d2e] block">
                  {priceInfo.formatted}
                </span>
                {item.consultationPriceRange?.isEstimate && (
                  <span className="text-[9px] text-stone-400 font-medium block">أتعاب تقديرية</span>
                )}
              </div>
            </div>

            {item.description && (
              <p className="text-xs text-stone-600 leading-relaxed pt-1 border-t border-stone-200/60">
                {item.description}
              </p>
            )}

            {/* Quick Metadata: Duration & Types */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-bold text-stone-600">
              {item.consultationDuration && (
                <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200/80 px-2 py-0.5 rounded-lg">
                  <Clock className="h-3 w-3 text-amber-700" />
                  <span>مدة الجلسة: {item.consultationDuration}</span>
                </span>
              )}
            </div>
          </div>

          {/* Expert Profile Card (if configured) */}
          {item.expertProfile?.name && (
            <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-white border border-emerald-300 text-emerald-800 flex items-center justify-center font-black shadow-3xs shrink-0">
                  <UserCheck className="h-5 w-5 text-emerald-700" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-emerald-950">{item.expertProfile.name}</span>
                    <span className="text-[9px] bg-emerald-200/70 text-emerald-900 px-1.5 py-0.2 rounded font-bold">معتمد</span>
                  </div>
                  {item.expertProfile.title && (
                    <span className="text-[10px] text-emerald-800 font-bold block truncate">
                      {item.expertProfile.title}
                    </span>
                  )}
                  {item.expertProfile.experienceYears && (
                    <span className="text-[10px] text-stone-500 font-medium block">
                      {item.expertProfile.experienceYears}
                    </span>
                  )}
                </div>
              </div>

              {item.expertProfile.credentials && item.expertProfile.credentials.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1 border-t border-emerald-200/60">
                  {item.expertProfile.credentials.map((cred, idx) => (
                    <span key={idx} className="text-[9px] bg-white text-stone-700 border border-emerald-200 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                      <ShieldCheck className="h-2.5 w-2.5 text-emerald-600" />
                      <span>{cred}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Consultation Packages (if any) */}
          {item.consultationPackages && item.consultationPackages.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-black text-stone-800">
                باقات الاستشارات المتاحة:
              </label>
              <div className="space-y-1.5">
                {item.consultationPackages.map((pkg) => {
                  const isSelected = selectedPackage?.id === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPackage(isSelected ? null : pkg)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                        isSelected
                          ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-2xs'
                          : 'bg-white border-stone-200 text-stone-800 hover:border-stone-300'
                      }`}
                    >
                      <div>
                        <span className="font-black block">{pkg.name}</span>
                        {pkg.duration && <span className={`text-[10px] block ${isSelected ? 'text-white/80' : 'text-stone-400'}`}>{pkg.duration}</span>}
                      </div>
                      <span className="font-mono font-black">{pkg.price} د.أ</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Tabs Selector */}
          <div className="grid grid-cols-3 gap-1.5 bg-stone-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActionType('request_consultation')}
              className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                actionType === 'request_consultation' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
              }`}
            >
              طلب استشارة
            </button>
            <button
              type="button"
              onClick={() => setActionType('book_appointment')}
              className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                actionType === 'book_appointment' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
              }`}
            >
              حجز موعد
            </button>
            <button
              type="button"
              onClick={() => setActionType('submit_project')}
              className={`py-1.5 px-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                actionType === 'submit_project' ? 'bg-white text-stone-900 shadow-2xs' : 'text-stone-600'
              }`}
            >
              تقييم مشروع
            </button>
          </div>

          {/* Consultation Type Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-stone-800">
              طريقة تقديم الاستشارة المفضلة:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CONSULTATION_TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedType(t.label)}
                  className={`p-2 rounded-xl border text-right transition-all cursor-pointer text-xs font-bold ${
                    selectedType === t.label
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-950 font-black'
                      : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* If Book Appointment: Date input */}
          {actionType === 'book_appointment' && (
            <div className="space-y-1">
              <label className="block text-xs font-black text-stone-800">
                الموعد أو التاريخ المقترح للجلسة
              </label>
              <input
                type="text"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                placeholder="مثال: غداً الساعة 12 ظهراً، أو يوم الثلاثاء القادم"
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
              />
            </div>
          )}

          {/* If Submit Project: File / Cloud URL input */}
          {actionType === 'submit_project' && (
            <div className="space-y-1">
              <label className="block text-xs font-black text-stone-800">
                رابط ملف المشروع أو المخططات (Google Drive / Dropbox / PDF)
              </label>
              <input
                type="url"
                value={projectFileUrl}
                onChange={(e) => setProjectFileUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-left focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1a4d2e]"
                dir="ltr"
              />
            </div>
          )}

          {/* Client Notes / Brief */}
          <div className="space-y-1">
            <label className="block text-xs font-black text-stone-800">
              تفاصيل وموضوع الاستشارة أو المشروع
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="اكتب نبذة مختصرة عن الاستشارة أو الخدمة المطلوبة لتسهيل دراسة طلبك..."
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1a4d2e] resize-none"
            />
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-stone-200 bg-stone-50 flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <WhatsApp3DIcon className="w-4 h-4" />
            <span>إرسال الطلب عبر واتساب</span>
          </button>

          {phone ? (
            <a
              href={`tel:${phone}`}
              className="p-3 bg-stone-900 hover:bg-black text-white rounded-xl flex items-center justify-center shadow-md transition-all cursor-pointer"
              title="اتصال هاتفي مباشر"
            >
              <Phone3DIcon className="w-4 h-4" />
            </a>
          ) : null}
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
