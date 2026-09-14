import React, { useState, useMemo } from 'react';
import { 
  Users, Stethoscope, Award, Search, Check, ShieldCheck, 
  Calendar, Phone, Sparkles, Pill, Microscope, HeartPulse, 
  GraduationCap, ChevronLeft, ArrowRight, UserCheck, Activity
} from 'lucide-react';
import { Business, MedicalFacilityInfo, MedicalDoctor } from '../../types';
import { isEmergencyFacility } from '../../lib/medicalHelper';

interface MedicalStaffTabProps {
  business?: Business | null;
  medicalProfile: MedicalFacilityInfo;
  onBackToAbout?: () => void;
  onOpenBooking?: (doctorName?: string) => void;
}

export function MedicalStaffTab({
  business,
  medicalProfile,
  onBackToAbout,
  onOpenBooking
}: MedicalStaffTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');

  const isPharmacy = useMemo(() => {
    const cat = (business?.category || '').toLowerCase();
    const sub = (business?.subCategory || '').toLowerCase();
    const name = (business?.name || '').toLowerCase();
    return business?.facilityType === 'pharmacy' || 
           cat.includes('صيدل') || 
           sub.includes('صيدل') || 
           name.includes('صيدلية') || 
           name.includes('صيدليات');
  }, [business]);

  const isLab = useMemo(() => {
    const cat = (business?.category || '').toLowerCase();
    const name = (business?.name || '').toLowerCase();
    return cat.includes('مختبر') || cat.includes('أشعة') || name.includes('مختبر') || name.includes('أشعة');
  }, [business]);

  const isRehab = useMemo(() => {
    const cat = (business?.category || '').toLowerCase();
    const name = (business?.name || '').toLowerCase();
    return cat.includes('علاج طبيعي') || cat.includes('تأهيل') || name.includes('علاج طبيعي') || name.includes('تأهيل');
  }, [business]);

  const isHospital = useMemo(() => {
    const cat = (business?.category || '').toLowerCase();
    const name = (business?.name || '').toLowerCase();
    return cat.includes('مستشف') || cat.includes('مركز شامل') || name.includes('مستشفى') || name.includes('مراكز شاملة');
  }, [business]);

  // Aggregate staff list: combining doctorsList and primary doctorProfile if not duplicate
  const staffList: MedicalDoctor[] = useMemo(() => {
    const list: MedicalDoctor[] = [];
    const seenNames = new Set<string>();

    if (medicalProfile.doctorsList && medicalProfile.doctorsList.length > 0) {
      medicalProfile.doctorsList.forEach(doc => {
        if (doc.name && !seenNames.has(doc.name.trim())) {
          seenNames.add(doc.name.trim());
          list.push(doc);
        }
      });
    }

    if (medicalProfile.doctorProfile && medicalProfile.doctorProfile.name) {
      const pName = medicalProfile.doctorProfile.name.trim();
      if (!seenNames.has(pName)) {
        seenNames.add(pName);
        list.unshift(medicalProfile.doctorProfile);
      }
    }

    return list;
  }, [medicalProfile.doctorsList, medicalProfile.doctorProfile]);

  // Filter staff by search and role
  const filteredStaff = useMemo(() => {
    return staffList.filter(member => {
      const matchesSearch = 
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.subspecialty || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (member.degrees || []).some(d => d.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;
      if (selectedRole === 'all') return true;
      if (selectedRole === 'consultants') return (member.title || '').includes('استشاري') || (member.title || '').includes('رئيس');
      if (selectedRole === 'specialists') return (member.title || '').includes('أخصائي') || (member.title || '').includes('اختصاصي');
      if (selectedRole === 'pharmacists') return (member.title || '').includes('صيدل');
      if (selectedRole === 'therapists') return (member.title || '').includes('معالج') || (member.title || '').includes('تأهيل');
      return true;
    });
  }, [staffList, searchTerm, selectedRole]);

  return (
    <div className="space-y-6 sm:space-y-8 text-right animate-in fade-in duration-200" dir="rtl">
      
      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#e5e1da] p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {onBackToAbout && (
          <button
            type="button"
            onClick={onBackToAbout}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            <span>العودة للملف الطبي</span>
          </button>
        )}

        {/* Search */}
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث بالاسم، التخصص الدقيق، المؤهل أو البورد..."
            className="w-full text-xs pr-9 pl-3 py-2.5 rounded-xl bg-stone-50 border border-stone-200 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-stone-800"
          />
        </div>

        {/* Roles Filter */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSelectedRole('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer ${
              selectedRole === 'all'
                ? 'bg-[#1a4d2e] text-white shadow-2xs'
                : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            الكل ({staffList.length})
          </button>
          
          <button
            type="button"
            onClick={() => setSelectedRole('consultants')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer ${
              selectedRole === 'consultants'
                ? 'bg-blue-700 text-white shadow-2xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            الاستشاريون
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole('specialists')}
            className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer ${
              selectedRole === 'specialists'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            الاختصاصيون
          </button>
        </div>
      </div>

      {/* 3. Medical Staff Cards Grid */}
      {filteredStaff.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {filteredStaff.map((member, idx) => {
            const isConsultant = (member.title || '').includes('استشاري');
            const isPharmacist = (member.title || '').includes('صيدل') || isPharmacy;
            const isPhysio = (member.title || '').includes('علاج طبيعي') || isRehab;

            return (
              <div
                key={idx}
                className="bg-white rounded-3xl border border-[#e5e1da] p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Top Row: Avatar & Basic Info */}
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#1a4d2e] to-emerald-700 text-white flex items-center justify-center font-black text-xl sm:text-2xl shadow-md shrink-0 overflow-hidden relative">
                      {member.avatarUrl ? (
                        <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                      ) : isPharmacist ? (
                        <Pill className="h-8 w-8 text-emerald-200" />
                      ) : isLab ? (
                        <Microscope className="h-8 w-8 text-emerald-200" />
                      ) : isPhysio ? (
                        <HeartPulse className="h-8 w-8 text-emerald-200" />
                      ) : (
                        <Stethoscope className="h-8 w-8 text-emerald-200" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-black text-base sm:text-lg text-stone-900 leading-tight">
                          {member.name}
                        </h3>
                        <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                      </div>

                      <p className="text-xs font-bold text-emerald-800 line-clamp-1">
                        {member.title || (isPharmacy ? 'صيدلي مسؤول' : 'طبيب اختصاصي')}
                      </p>

                      {member.experienceYears && (
                        <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-900 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                          <Sparkles className="h-3 w-3 text-amber-600" />
                          <span>خبرة {member.experienceYears} سنة</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Subspecialty / Department */}
                  {member.subspecialty && (
                    <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200/70 space-y-1">
                      <span className="text-[10px] font-black text-stone-400 block">
                        {isPharmacy ? 'القسم / المهام الصيدلانية:' : 'التخصص الدقيق والقسم:'}
                      </span>
                      <p className="text-xs font-black text-stone-800 leading-snug">
                        {member.subspecialty}
                      </p>
                    </div>
                  )}

                  {/* Degrees & Certifications */}
                  {member.degrees && member.degrees.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black text-stone-400 flex items-center gap-1">
                        <GraduationCap className="h-3.5 w-3.5 text-stone-400" />
                        <span>المؤهلات العلمية والبورد المعتمد:</span>
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {member.degrees.map((deg, dIdx) => (
                          <span
                            key={dIdx}
                            className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-950 border border-emerald-200/70"
                          >
                            <Check className="h-3 w-3 text-emerald-700 shrink-0" />
                            <span>{deg}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bio / Summary */}
                  {member.bio && (
                    <p className="text-xs text-stone-600 font-medium leading-relaxed pt-1 border-t border-stone-100">
                      {member.bio}
                    </p>
                  )}
                </div>

                {/* Card Action: Book / Contact */}
                <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between gap-2">
                  {member.licenseNumber && (
                    <span className="text-[10px] font-mono font-bold text-stone-400">
                      رقم الترخيص: {member.licenseNumber}
                    </span>
                  )}

                  {onOpenBooking && !isPharmacy && (
                    <button
                      type="button"
                      onClick={() => onOpenBooking(member.name)}
                      className="mr-auto px-4 py-2 bg-[#1a4d2e] hover:bg-emerald-800 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Calendar className="h-3.5 w-3.5 text-emerald-300" />
                      <span>حجز موعد مع {member.name.split(' ')[0]}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-stone-50 rounded-3xl border border-dashed border-stone-200 p-8 sm:p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
            <Users className="h-7 w-7" />
          </div>
          <h4 className="text-base font-black text-stone-800">لم يتم العثور على كوادر مطابقة للبحث</h4>
          <p className="text-xs text-stone-500 font-bold max-w-md mx-auto">
            جرب البحث بكلمات أخرى أو اختر "الكل" لعرض كافة أعضاء الكادر الطبي المسجلين.
          </p>
          <button
            type="button"
            onClick={() => { setSearchTerm(''); setSelectedRole('all'); }}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-black transition-colors"
          >
            إعادة ضبط البحث
          </button>
        </div>
      )}

      {/* 4. Accreditation & Guarantee Footer */}
      <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200/60 flex items-start gap-3 text-xs font-bold text-emerald-950 leading-relaxed">
        <ShieldCheck className="h-5 w-5 text-[#1a4d2e] shrink-0 mt-0.5" />
        <div>
          <span className="font-black text-emerald-900 block mb-0.5">ضمان الكفاءة والترخيص الرسمي:</span>
          جميع الكوادر الطبية والصيدلانية والمخبرية المسجلة في منصة بلدك إربد حاصلة على شهادات مزاولة مهنة معتمدة من وزارة الصحة الأردنية والنقابات المهنية المختصة.
        </div>
      </div>
    </div>
  );
}
