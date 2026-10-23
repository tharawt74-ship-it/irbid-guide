import React from 'react';
import { 
  Briefcase, Clock, Calendar, ShieldCheck, UserCheck, 
  FileText, Phone, CheckCircle2, Video, Users, Sparkles, ChevronLeft
} from 'lucide-react';
import { MenuItem, ConsultationPackage, ExpertProfile } from '../../../types';
import { CONSULTATION_TYPES, getConsultationActionLabel, formatConsultationPrice } from '../../../lib/professionalServicesHelper';

interface ProfessionalServiceDetailSectionProps {
  product: MenuItem;
  businessName: string;
  onOpenConsultationModal: (action: 'request_consultation' | 'book_appointment' | 'submit_project', selectedPkg?: ConsultationPackage) => void;
}

export function ProfessionalServiceDetailSection({
  product,
  businessName,
  onOpenConsultationModal
}: ProfessionalServiceDetailSectionProps) {
  const priceInfo = formatConsultationPrice(product);
  const expert = product.expertProfile;
  const packages = product.consultationPackages || [];
  const types = product.consultationTypes || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. Quick Consultation Specs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Duration Spec */}
        {product.consultationDuration && (
          <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <span className="text-[10px] text-amber-800/80 font-bold block">مدة الجلسة الاستشارية:</span>
              <span className="text-xs sm:text-sm font-black text-amber-950">{product.consultationDuration}</span>
            </div>
          </div>
        )}

        {/* Pricing / Fees Spec */}
        <div className="p-3.5 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Briefcase className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <span className="text-[10px] text-emerald-800/80 font-bold block">الأتعاب والاستشارات:</span>
            <span className="text-xs sm:text-sm font-black text-emerald-950">{priceInfo.formatted}</span>
            {priceInfo.isEstimate && (
              <span className="text-[9px] text-emerald-700 font-bold block">أتعاب تقديرية بحسب طبيعة المشروع</span>
            )}
          </div>
        </div>
      </div>

      {/* 2. Available Consultation Channels */}
      {types.length > 0 && (
        <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-4 space-y-2.5">
          <h4 className="text-xs font-black text-stone-900 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#1a4d2e]" />
            <span>قنوات تقديم الاستشارة المعتمدة:</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CONSULTATION_TYPES.filter(t => types.includes(t.id as any)).map((t) => {
              const Icon = t.id === 'written' ? FileText : t.id === 'phone' ? Phone : t.id === 'in_person' ? Users : Video;
              return (
                <div 
                  key={t.id}
                  className="p-2.5 bg-white rounded-xl border border-stone-200/70 flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5 text-[#1a4d2e]" />
                  </div>
                  <span className="text-[11px] font-bold text-stone-800 leading-tight">{t.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Primary Professional Action Buttons (Replacing shopping buttons) */}
      <div className="bg-stone-50/80 border border-stone-200/80 rounded-2xl p-4 space-y-3">
        <h4 className="text-xs font-black text-stone-900">
          خيارات التواصل والخدمة المهنية المباشرة:
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          
          {/* Button 1: Request Consultation */}
          <button
            type="button"
            onClick={() => onOpenConsultationModal('request_consultation')}
            className="py-3 px-3.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Briefcase className="h-4 w-4" />
            <span>طلب استشارة مهنية</span>
          </button>

          {/* Button 2: Book Consulting Appointment */}
          <button
            type="button"
            onClick={() => onOpenConsultationModal('book_appointment')}
            className="py-3 px-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Calendar className="h-4 w-4" />
            <span>حجز موعد استشاري</span>
          </button>

          {/* Button 3: Submit Project File for Evaluation */}
          <button
            type="button"
            onClick={() => onOpenConsultationModal('submit_project')}
            className="py-3 px-3.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <FileText className="h-4 w-4" />
            <span>إرسال ملف المشروع للتقييم</span>
          </button>
        </div>
      </div>

      {/* 4. Expert & Consultant Profile Card (ملف الخبراء والمستشارين) */}
      {expert && expert.name && (
        <div className="bg-white border-2 border-stone-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5 text-right">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2 text-xs font-black text-stone-900">
              <UserCheck className="h-4.5 w-4.5 text-[#1a4d2e]" />
              <span>ملف الخبير / المستشار المسؤول:</span>
            </div>
            {expert.experienceYears && (
              <span className="text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                خبرة {expert.experienceYears}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3.5">
            {expert.avatarUrl ? (
              <img 
                src={expert.avatarUrl} 
                alt={expert.name} 
                className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-600/30 shrink-0 shadow-2xs" 
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-[#1a4d2e] text-white flex items-center justify-center font-black text-base shrink-0 shadow-2xs">
                {expert.name.slice(0, 2)}
              </div>
            )}
            
            <div className="min-w-0 space-y-1">
              <h3 className="text-sm sm:text-base font-black text-stone-900">{expert.name}</h3>
              {expert.title && (
                <p className="text-xs font-bold text-emerald-800">{expert.title}</p>
              )}
              {expert.bio && (
                <p className="text-xs text-stone-600 leading-relaxed font-medium pt-0.5">
                  {expert.bio}
                </p>
              )}
            </div>
          </div>

          {/* Credentials list */}
          {expert.credentials && expert.credentials.length > 0 && (
            <div className="pt-2 border-t border-stone-100 space-y-1.5">
              <span className="text-[10px] font-black text-stone-500 block">المؤهلات والاعتمادات المهنية:</span>
              <div className="flex flex-wrap gap-1.5">
                {expert.credentials.map((cred, idx) => (
                  <span 
                    key={idx} 
                    className="inline-flex items-center gap-1 text-[10px] bg-stone-50 text-stone-800 border border-stone-200 px-2 py-0.5 rounded-lg font-bold"
                  >
                    <ShieldCheck className="h-3 w-3 text-emerald-700" />
                    <span>{cred}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. Consultation Packages (باقات الاستشارات) */}
      {packages.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-stone-900 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-600" />
              <span>باقات الاستشارات المتوفرة:</span>
            </h4>
            <span className="text-[10px] font-bold text-stone-500">اختر الباقة المناسبة لمشروعك</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {packages.map((pkg) => (
              <div 
                key={pkg.id}
                className="p-4 bg-white rounded-2xl border-2 border-stone-200/80 hover:border-[#1a4d2e]/60 transition-all shadow-xs flex flex-col justify-between space-y-3 text-right group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="text-xs sm:text-sm font-black text-stone-900 leading-snug group-hover:text-[#1a4d2e] transition-colors">
                      {pkg.name}
                    </h5>
                    <div className="text-left shrink-0">
                      <span className="text-xs sm:text-sm font-black text-[#1a4d2e] font-mono block">
                        {pkg.price ? `${pkg.price} د.أ` : 'أتعاب متفق عليها'}
                      </span>
                      {pkg.duration && (
                        <span className="text-[9px] text-stone-400 font-bold block">{pkg.duration}</span>
                      )}
                    </div>
                  </div>

                  {/* Features list */}
                  {pkg.features && pkg.features.length > 0 && (
                    <div className="space-y-1 pt-1.5 border-t border-stone-100">
                      {pkg.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-start gap-1.5 text-[11px] text-stone-600 font-medium leading-relaxed">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onOpenConsultationModal('request_consultation', pkg)}
                  className="w-full py-2 px-3 bg-stone-100 hover:bg-[#1a4d2e] hover:text-white text-stone-800 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-auto"
                >
                  <span>طلب هذه الباقة</span>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
