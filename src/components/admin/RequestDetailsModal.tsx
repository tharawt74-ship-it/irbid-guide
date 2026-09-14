import React from 'react';
import { 
  X, 
  Building2, 
  Stethoscope, 
  Phone, 
  MapPin, 
  Globe, 
  Crown, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  User, 
  Mail, 
  ShieldCheck, 
  Award, 
  DollarSign, 
  Calendar, 
  FileText, 
  Sparkles, 
  Activity, 
  Heart, 
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { WhatsAppIcon } from '../common/WhatsAppIcon';
import { getWhatsAppUrl } from '../../lib/contactHelper';

interface RequestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: any | null;
  onApprove?: (req: any) => void;
  onReject?: (reqId: string, reqName: string) => void;
}

export function RequestDetailsModal({
  isOpen,
  onClose,
  request,
  onApprove,
  onReject
}: RequestDetailsModalProps) {
  if (!isOpen || !request) return null;

  const isMedical = 
    request.requestType === 'medical_facility_registration' ||
    Boolean(request.medicalProfile) ||
    (request.category || '').includes('طب') ||
    (request.category || '').includes('صحة') ||
    (request.category || '').includes('عياد') ||
    (request.category || '').includes('صيدل') ||
    (request.category || '').includes('مختبر');

  const isTrialOrBasic = request.isVipTrial || request.selectedPackagePlan === 'basic' || (request.packagePlan === 'basic' && request.isVipTrial !== false);
  const isExplicitGolden = !isTrialOrBasic && (request.packagePlan === 'golden' || request.packagePlan === 'vip' || request.selectedPackagePlan === 'golden');

  const planName = 
    isTrialOrBasic ? 'الباقة الأساسية (مع هدية شهر تجريبي مجاني في VIP 🎁)' :
    isExplicitGolden ? 'الباقة الذهبية (VIP 🌟)' :
    request.packagePlan === 'pay_per_use' ? 'باقة حسب الاستخدام' :
    'الباقة الأساسية';

  const billingPeriodLabel = 
    isTrialOrBasic ? 'اشتراك مجاني دائم (مع تجربة شهر VIP)' :
    request.billingPeriod === 'yearly' ? 'الدفع السنوي (الافتراضي)' :
    request.billingPeriod === 'monthly' ? 'الدفع الشهري' :
    'غير محدد';

  const docName = request.medicalProfile?.doctorProfile?.name || request.doctorName || request.ownerName || '';
  const docTitle = request.medicalProfile?.doctorProfile?.title || request.professionalTitle || request.doctorTitle || '';
  const docDegrees = request.medicalProfile?.doctorProfile?.degrees || request.degrees || [];
  const licenseNum = request.medicalProfile?.licenseNumber || request.licenseNumber || '';
  const fee = request.medicalProfile?.consultationFee || request.consultationFee || '';
  const followUp = request.medicalProfile?.followUpPolicy || request.followUpPolicy || '';
  const insurances = request.medicalProfile?.insurances || request.selectedInsurances || [];
  const procedures = request.medicalProfile?.procedures || request.proceduresList || [];
  const hasEmergency = request.medicalProfile?.has24Emergency || request.has24Emergency;
  const homeVisits = request.offersHomeVisits || request.medicalProfile?.offersHomeVisits;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-stone-900/70 backdrop-blur-xs animate-in fade-in duration-200" dir="rtl">
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-2xl w-full max-w-3xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className={`p-5 sm:p-6 border-b text-white flex items-center justify-between shrink-0 ${
          isMedical 
            ? 'bg-gradient-to-r from-[#1a4d2e] via-emerald-800 to-[#143d24] border-emerald-700/50' 
            : 'bg-gradient-to-r from-stone-900 via-stone-800 to-stone-950 border-stone-700'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-inner shrink-0 ${
              isMedical ? 'bg-emerald-700/60 text-emerald-200 border border-emerald-500/30' : 'bg-stone-700 text-amber-400 border border-stone-600'
            }`}>
              {isMedical ? <Stethoscope className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white">{request.name}</h2>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                  request.status === 'approved' 
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40' 
                    : request.status === 'rejected'
                    ? 'bg-red-500/20 text-red-200 border-red-400/40'
                    : 'bg-amber-400/20 text-amber-200 border-amber-400/40 animate-pulse'
                }`}>
                  {request.status === 'approved' ? 'مقبول وموثق ✅' : request.status === 'rejected' ? 'مرفوض ❌' : 'قيد المراجعة ⏳'}
                </span>
              </div>
              <p className="text-xs text-stone-200/80 font-medium mt-0.5">
                {isMedical ? 'طلب انضمام منشأة طبية / عيادة' : 'طلب انضمام محل / نشاط تجاري بالدليل'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* Package Selection Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-amber-100/50 to-emerald-50 border border-amber-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500 text-amber-950 font-black">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xs text-stone-500 font-bold block">باقة الاشتراك المحددة بالنموذج:</span>
                <span className="text-sm font-black text-stone-900 flex items-center gap-1.5">
                  <span>{planName}</span>
                  {request.packagePlan === 'golden' && (
                    <Sparkles className="h-4 w-4 text-amber-600" />
                  )}
                </span>
              </div>
            </div>

            <div className="text-left">
              <span className="text-xs text-stone-500 font-bold block">دورة الفوترة والدفع:</span>
              <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200 inline-block mt-0.5">
                {billingPeriodLabel}
              </span>
            </div>
          </div>

          {/* Section 1: Business Identity & Category */}
          <div className="bg-stone-50 rounded-2xl border border-stone-200/80 p-4 space-y-3">
            <h3 className="text-xs font-black text-stone-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-200/80 pb-2">
              <Building2 className="h-4 w-4 text-[#1a4d2e]" />
              <span>هوية المشروع / المنشأة والتصنيف</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-stone-400 font-bold block">اسم المنشأة / العيادة:</span>
                <span className="font-black text-stone-900 text-sm">{request.name}</span>
              </div>
              <div>
                <span className="text-stone-400 font-bold block">التصنيف الرئيسي والفرعي:</span>
                <span className="font-black text-stone-800 bg-stone-200/70 px-2.5 py-1 rounded-lg inline-block mt-0.5">
                  {request.category} {request.subCategory ? `• ${request.subCategory}` : ''}
                </span>
              </div>
            </div>

            {request.description && (
              <div className="pt-1">
                <span className="text-stone-400 font-bold block mb-1">وصف المنشأة والمعلومات العامة:</span>
                <p className="p-3 bg-white rounded-xl border border-stone-200/80 text-stone-700 text-xs leading-relaxed font-medium">
                  {request.description}
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Owner & Contact Details */}
          <div className="bg-stone-50 rounded-2xl border border-stone-200/80 p-4 space-y-3">
            <h3 className="text-xs font-black text-stone-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-200/80 pb-2">
              <User className="h-4 w-4 text-[#1a4d2e]" />
              <span>معلومات المالك ومسؤول التواصل</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-stone-400 font-bold block">اسم المالك / المسؤول:</span>
                <span className="font-black text-stone-900">{request.ownerName || 'غير محدد'}</span>
              </div>

              <div>
                <span className="text-stone-400 font-bold block">رقم الهاتف المباشر:</span>
                <a href={`tel:${request.phone}`} className="font-mono font-bold text-emerald-700 hover:underline inline-flex items-center gap-1" dir="ltr">
                  <Phone className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{request.phone || 'غير مدخل'}</span>
                </a>
              </div>

              <div>
                <span className="text-stone-400 font-bold block">رقم الواتساب:</span>
                <a 
                  href={getWhatsAppUrl(request.whatsapp || request.phone, `مرحباً بكم من منصة شو في بإربد`)}
                  target="_blank" 
                  rel="noreferrer" 
                  className="font-mono font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                  dir="ltr"
                >
                  <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{request.whatsapp || request.phone || 'غير مدخل'}</span>
                </a>
              </div>

              {request.userEmail && (
                <div>
                  <span className="text-stone-400 font-bold block">البريد الإلكتروني للحساب:</span>
                  <span className="font-mono font-medium text-stone-800">{request.userEmail}</span>
                </div>
              )}

              {request.emergencyPhone && (
                <div>
                  <span className="text-stone-400 font-bold block">هاتف الطوارئ:</span>
                  <span className="font-mono font-bold text-red-600" dir="ltr">{request.emergencyPhone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Location & Address */}
          <div className="bg-stone-50 rounded-2xl border border-stone-200/80 p-4 space-y-3">
            <h3 className="text-xs font-black text-stone-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-stone-200/80 pb-2">
              <MapPin className="h-4 w-4 text-red-500" />
              <span>الموقع الجغرافي والعنوان</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-stone-400 font-bold block">المنطقة / الحي في إربد:</span>
                <span className="font-black text-stone-900">{request.district || request.region || 'إربد'}</span>
              </div>

              <div>
                <span className="text-stone-400 font-bold block">العنوان التفصيلي:</span>
                <span className="font-bold text-stone-800">{request.address || 'غير محدد'}</span>
              </div>
            </div>

            {(request.googlePlaceUrl || request.googleMapsUrl) && (
              <div className="pt-2">
                <a
                  href={request.googlePlaceUrl || request.googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs hover:bg-blue-100 transition-colors border border-blue-200"
                >
                  <Globe className="h-4 w-4 text-blue-600" />
                  <span>فتح الموقع في خرائط Google Maps</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          {/* Section 4: Medical Specific Information (If applicable) */}
          {isMedical && (
            <div className="bg-emerald-50/60 rounded-2xl border border-emerald-200/80 p-4 space-y-3">
              <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5 border-b border-emerald-200 pb-2">
                <Stethoscope className="h-4 w-4 text-emerald-700" />
                <span>تفاصيل الكادر الطبي والتخصصات والرعاية</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {docName && (
                  <div>
                    <span className="text-stone-500 font-bold block">الطبيب المسؤول / المشرف:</span>
                    <span className="font-black text-emerald-950 text-sm">{docName}</span>
                  </div>
                )}

                {docTitle && (
                  <div>
                    <span className="text-stone-500 font-bold block">المسمى الطبي / اللقب:</span>
                    <span className="font-bold text-stone-800">{docTitle}</span>
                  </div>
                )}

                {licenseNum && (
                  <div>
                    <span className="text-stone-500 font-bold block">رقم ترخيص المزاولة:</span>
                    <span className="font-mono font-bold text-stone-800">{licenseNum}</span>
                  </div>
                )}

                {fee && (
                  <div>
                    <span className="text-stone-500 font-bold block">رسوم الكشفية:</span>
                    <span className="font-black text-emerald-800">{fee}</span>
                  </div>
                )}
              </div>

              {followUp && (
                <div className="text-xs">
                  <span className="text-stone-500 font-bold block">سياسة المراجعة:</span>
                  <span className="font-medium text-stone-700">{followUp}</span>
                </div>
              )}

              {/* Insurances Badge List */}
              {Array.isArray(insurances) && insurances.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs text-stone-500 font-bold block mb-1.5">التأمينات الصحية المعتمدة:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {insurances.map((ins: any, idx: number) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-white border border-emerald-200 text-emerald-900 text-[11px] font-bold shadow-3xs">
                        🛡️ {typeof ins === 'string' ? ins : ins.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Procedures & Specializations */}
              {Array.isArray(procedures) && procedures.length > 0 && (
                <div className="pt-2">
                  <span className="text-xs text-stone-500 font-bold block mb-1.5">الإجراءات والخدمات الطبية:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {procedures.map((proc: any, idx: number) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-white border border-stone-200 text-stone-800 text-[11px] font-bold shadow-3xs">
                        • {typeof proc === 'string' ? proc : proc.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Emergency & Home Visit Features */}
              <div className="flex flex-wrap gap-3 pt-2">
                {hasEmergency && (
                  <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-black border border-red-200 flex items-center gap-1">
                    <Activity className="h-3.5 w-3.5 text-red-600" />
                    <span>خدمة طوارئ 24/7 متوفرة</span>
                  </span>
                )}
                {homeVisits && (
                  <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-black border border-blue-200 flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5 text-blue-600" />
                    <span>خدمة الزيارات المنزلية متوفرة</span>
                  </span>
                )}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 bg-stone-50 border-t border-stone-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {request.phone && (
              <a
                href={getWhatsAppUrl(request.whatsapp || request.phone, `مرحباً بكم من إدارة شو في بإربد بخصوص طلب تسجل منشأتكم (${request.name})`)}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold inline-flex items-center gap-1.5 transition-colors"
              >
                <WhatsAppIcon className="h-4 w-4 text-emerald-600" />
                <span>تواصل واتساب</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-2">
            {request.status === 'pending' && onReject && (
              <button
                onClick={() => {
                  onReject(request.id, request.name);
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <XCircle className="h-4 w-4" />
                <span>رفض الطلب</span>
              </button>
            )}

            {request.status === 'pending' && onApprove && (
              <button
                onClick={() => {
                  onApprove(request);
                  onClose();
                }}
                className="px-6 py-2.5 rounded-xl bg-[#1a4d2e] hover:bg-[#143e25] text-white text-xs font-black transition-colors cursor-pointer shadow-md flex items-center gap-1.5 active:scale-95"
              >
                <ShieldCheck className="h-4 w-4 text-[#ff9f1c]" />
                <span>قبول وتوثيق المنشأة 🛡️</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
