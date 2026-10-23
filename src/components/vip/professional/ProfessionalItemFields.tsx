import React, { useState } from 'react';
import { 
  Briefcase, Clock, DollarSign, UserCheck, CheckCircle2,
  Plus, Trash2, ShieldCheck, FileText, Phone, Users, Video, Calendar
} from 'lucide-react';
import { 
  ConsultationPackage, 
  ExpertProfile, 
  ConsultationPriceRange 
} from '../../../types';
import { CONSULTATION_TYPES, CONSULTATION_ACTION_BUTTONS } from '../../../lib/professionalServicesHelper';

interface ProfessionalItemFieldsProps {
  // Tab 1: Services & Types & Duration
  consultationTypes: ('written' | 'phone' | 'in_person' | 'online_meeting')[];
  onChangeConsultationTypes: (types: ('written' | 'phone' | 'in_person' | 'online_meeting')[]) => void;
  consultationDuration: string;
  onChangeConsultationDuration: (val: string) => void;
  consultationActionType: 'request_consultation' | 'book_appointment' | 'submit_project';
  onChangeConsultationActionType: (action: 'request_consultation' | 'book_appointment' | 'submit_project') => void;

  // Tab 2: Pricing & Price Range
  price: string;
  onChangePrice: (val: string) => void;
  originalPrice: string;
  onChangeOriginalPrice: (val: string) => void;
  consultationPriceRange: ConsultationPriceRange;
  onChangePriceRange: (range: ConsultationPriceRange) => void;

  // Tab 3: Packages
  consultationPackages: ConsultationPackage[];
  onChangePackages: (packages: ConsultationPackage[]) => void;

  // Tab 4: Expert Profile
  expertProfile: ExpertProfile;
  onChangeExpertProfile: (profile: ExpertProfile) => void;

  activeTab: 'consultation' | 'pricing' | 'packages' | 'expert';
}

export function ProfessionalItemFields({
  consultationTypes,
  onChangeConsultationTypes,
  consultationDuration,
  onChangeConsultationDuration,
  consultationActionType,
  onChangeConsultationActionType,
  price,
  onChangePrice,
  originalPrice,
  onChangeOriginalPrice,
  consultationPriceRange,
  onChangePriceRange,
  consultationPackages,
  onChangePackages,
  expertProfile,
  onChangeExpertProfile,
  activeTab
}: ProfessionalItemFieldsProps) {
  // Local state for new package
  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgPrice, setNewPkgPrice] = useState('');
  const [newPkgDuration, setNewPkgDuration] = useState('');
  const [newPkgFeature, setNewPkgFeature] = useState('');
  const [newPkgFeatures, setNewPkgFeatures] = useState<string[]>([]);

  // Local state for new credential
  const [newCredential, setNewCredential] = useState('');

  const toggleConsultationType = (typeId: 'written' | 'phone' | 'in_person' | 'online_meeting') => {
    if (consultationTypes.includes(typeId)) {
      if (consultationTypes.length > 1) {
        onChangeConsultationTypes(consultationTypes.filter(t => t !== typeId));
      }
    } else {
      onChangeConsultationTypes([...consultationTypes, typeId]);
    }
  };

  const handleAddPackage = () => {
    if (!newPkgName.trim() || !newPkgPrice.trim()) return;
    const pkg: ConsultationPackage = {
      id: `pkg_${Date.now()}`,
      name: newPkgName.trim(),
      price: newPkgPrice.trim(),
      duration: newPkgDuration.trim() || undefined,
      features: newPkgFeatures.length > 0 ? newPkgFeatures : undefined
    };
    onChangePackages([...consultationPackages, pkg]);
    setNewPkgName('');
    setNewPkgPrice('');
    setNewPkgDuration('');
    setNewPkgFeatures([]);
  };

  const handleRemovePackage = (pkgId: string) => {
    onChangePackages(consultationPackages.filter(p => p.id !== pkgId));
  };

  const handleAddCredential = () => {
    if (!newCredential.trim()) return;
    const current = expertProfile.credentials || [];
    onChangeExpertProfile({
      ...expertProfile,
      credentials: [...current, newCredential.trim()]
    });
    setNewCredential('');
  };

  const handleRemoveCredential = (index: number) => {
    const current = expertProfile.credentials || [];
    onChangeExpertProfile({
      ...expertProfile,
      credentials: current.filter((_, idx) => idx !== index)
    });
  };

  const DURATION_PRESETS = [
    '30 دقيقة',
    '45 دقيقة',
    'ساعة واحدة',
    'ساعتان',
    'جلسة مفتوحة',
    'حسب متطلبات المشروع'
  ];

  return (
    <div className="space-y-4 text-right" dir="rtl">
      {/* TAB 1: CONSULTING SERVICES & TYPES */}
      {activeTab === 'consultation' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Consultation Type Selector */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
            <div>
              <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-[#1a4d2e]" />
                <span>أنواع وطرق تقديم الاستشارة المتاحة للعميل</span>
              </h4>
              <p className="text-[10px] text-stone-500 mt-0.5">
                حدد الطرق التي يمكن للعميل من خلالها تلقي هذه الاستشارة أو الخدمة المهنية
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {CONSULTATION_TYPES.map((t) => {
                const isSelected = consultationTypes.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleConsultationType(t.id)}
                    className={`p-3 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-50/80 border-emerald-600 text-emerald-950 shadow-2xs'
                        : 'bg-white border-stone-200 text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-4 h-4 rounded flex items-center justify-center border text-white text-[10px] font-black ${
                        isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-stone-300 bg-white'
                      }`}>
                        {isSelected && '✓'}
                      </div>
                      <div>
                        <span className="text-xs font-black block">{t.label}</span>
                        <span className="text-[10px] text-stone-400 font-medium">{t.hint}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Session Duration */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
            <div>
              <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-[#1a4d2e]" />
                <span>مدة الجلسة الاستشارية المتوقعة</span>
              </h4>
              <p className="text-[10px] text-stone-500 mt-0.5">
                توضح للعميل الوقت المخصص لدراسة ومناقشة قضيته أو مشروعه
              </p>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                value={consultationDuration}
                onChange={(e) => onChangeConsultationDuration(e.target.value)}
                placeholder="مثال: 45 دقيقة، ساعة واحدة، جلسة مفتوحة"
                className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20"
              />

              <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                <span className="text-[10px] text-stone-400 font-bold">مدد مقترحة:</span>
                {DURATION_PRESETS.map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => onChangeConsultationDuration(dur)}
                    className={`text-[10px] px-2.5 py-1 rounded-lg font-bold border transition-all cursor-pointer ${
                      consultationDuration === dur
                        ? 'bg-[#1a4d2e] text-white border-[#1a4d2e]'
                        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {dur}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Primary Action Button Type */}
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
            <div>
              <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-[#1a4d2e]" />
                <span>زر التواصل الاحترافي الأساسي المعروض للعميل</span>
              </h4>
              <p className="text-[10px] text-stone-500 mt-0.5">
                اختر صيغة الزر الأنسب لطبيعة الخدمة بدلاً من سلة التسوق التجارية
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {CONSULTATION_ACTION_BUTTONS.map((btn) => {
                const isSelected = consultationActionType === btn.id;
                return (
                  <button
                    key={btn.id}
                    type="button"
                    onClick={() => onChangeConsultationActionType(btn.id)}
                    className={`py-2.5 px-3 rounded-xl border text-center transition-all cursor-pointer text-xs font-black ${
                      isSelected
                        ? 'bg-[#1a4d2e] text-white border-[#1a4d2e] shadow-2xs'
                        : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    {btn.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRICING & PRICE RANGE */}
      {activeTab === 'pricing' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-4">
            <div>
              <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                <DollarSign className="h-4 w-4 text-[#1a4d2e]" />
                <span>نطاق الأتعاب وأسعار الخدمات الاستشارية</span>
              </h4>
              <p className="text-[10px] text-stone-500 mt-0.5">
                يمكنك تحديد سعر ثابت أو تحديد نطاق سعري مرن (الحد الأدنى والأعلى) بما يناسب العقود والاستشارات
              </p>
            </div>

            {/* Price Range inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-black text-stone-800 mb-1">
                  الحد الأدنى للأتعاب (د.أ)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={consultationPriceRange.minPrice || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onChangePriceRange({
                        ...consultationPriceRange,
                        minPrice: val
                      });
                      if (!price) onChangePrice(val);
                    }}
                    placeholder="مثال: 30"
                    className="w-full p-2.5 pl-10 bg-white border border-stone-200 rounded-xl text-xs font-black text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-bold">د.أ</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-stone-800 mb-1">
                  الحد الأعلى للأتعاب (د.أ)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={consultationPriceRange.maxPrice || ''}
                    onChange={(e) => {
                      onChangePriceRange({
                        ...consultationPriceRange,
                        maxPrice: e.target.value
                      });
                    }}
                    placeholder="مثال: 100"
                    className="w-full p-2.5 pl-10 bg-white border border-stone-200 rounded-xl text-xs font-black text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-bold">د.أ</span>
                </div>
              </div>
            </div>

            {/* Estimate Disclaimer checkbox */}
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={consultationPriceRange.isEstimate || false}
                onChange={(e) => onChangePriceRange({
                  ...consultationPriceRange,
                  isEstimate: e.target.checked
                })}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs font-bold text-stone-700">
                تقدير أولي يخضع لدراسة الملف وحجم القضية أو المخططات
              </span>
            </label>

            {/* Base / Single Price Override */}
            <div className="pt-3 border-t border-stone-200/60">
              <label className="block text-xs font-black text-stone-800 mb-1">
                سعر الخدمة الافتراضي للكتالوج (د.أ)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={price}
                  onChange={(e) => onChangePrice(e.target.value)}
                  placeholder="مثال: 50"
                  className="w-full p-2.5 pl-10 bg-white border border-stone-200 rounded-xl text-sm font-black text-[#1a4d2e] focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-bold">د.أ</span>
              </div>
              <p className="text-[10px] text-stone-400 mt-1">
                يستخدم كسعر مرجعي أساسي في حال عدم تحديد نطاق أتعاب
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PACKAGES */}
      {activeTab === 'packages' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-4">
            <div>
              <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-[#1a4d2e]" />
                <span>باقات الاستشارات والخدمات المهنية المتعددة</span>
              </h4>
              <p className="text-[10px] text-stone-500 mt-0.5">
                أضف باقات متكاملة مثل: باقة استشارة أولية، باقة إشراف شهري، باقة تدقيق شامل
              </p>
            </div>

            {/* Existing Packages List */}
            {consultationPackages.length > 0 && (
              <div className="space-y-2 pt-1">
                {consultationPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="p-3 bg-white border border-stone-200 rounded-xl flex items-center justify-between gap-3 shadow-3xs"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-stone-900">{pkg.name}</span>
                        {pkg.duration && (
                          <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded font-bold">
                            {pkg.duration}
                          </span>
                        )}
                      </div>
                      {pkg.features && pkg.features.length > 0 && (
                        <p className="text-[10px] text-stone-500 mt-1">
                          {pkg.features.join(' • ')}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-xs font-black text-[#1a4d2e] font-mono">
                        {pkg.price} د.أ
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemovePackage(pkg.id)}
                        className="p-1 text-stone-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="حذف الباقة"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Package Form */}
            <div className="p-3.5 bg-white border border-stone-200/90 rounded-xl space-y-3">
              <span className="text-xs font-black text-stone-800 block">إضافة باقة جديدة:</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">اسم الباقة</label>
                  <input
                    type="text"
                    value={newPkgName}
                    onChange={(e) => setNewPkgName(e.target.value)}
                    placeholder="مثال: باقة المرافقة الكاملة"
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">السعر (د.أ)</label>
                  <input
                    type="number"
                    value={newPkgPrice}
                    onChange={(e) => setNewPkgPrice(e.target.value)}
                    placeholder="مثال: 120"
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-stone-600 mb-1">مدة الباقة (اختياري)</label>
                  <input
                    type="text"
                    value={newPkgDuration}
                    onChange={(e) => setNewPkgDuration(e.target.value)}
                    placeholder="مثال: شهر كامل"
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Package features */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-stone-600">مميزات الباقة المشمولة</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPkgFeature}
                    onChange={(e) => setNewPkgFeature(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newPkgFeature.trim()) {
                          setNewPkgFeatures([...newPkgFeatures, newPkgFeature.trim()]);
                          setNewPkgFeature('');
                        }
                      }
                    }}
                    placeholder="اكتب ميزة ثم اضغط إضافة (مثال: دراسة وثائق القضية)"
                    className="flex-1 p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-medium focus:bg-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newPkgFeature.trim()) {
                        setNewPkgFeatures([...newPkgFeatures, newPkgFeature.trim()]);
                        setNewPkgFeature('');
                      }
                    }}
                    className="px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    إضافة ميزة
                  </button>
                </div>

                {newPkgFeatures.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {newPkgFeatures.map((f, i) => (
                      <span key={i} className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                        <span>{f}</span>
                        <button
                          type="button"
                          onClick={() => setNewPkgFeatures(newPkgFeatures.filter((_, idx) => idx !== i))}
                          className="hover:text-red-600 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleAddPackage}
                disabled={!newPkgName.trim() || !newPkgPrice.trim()}
                className="w-full py-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>حفظ وإضافة الباقة إلى القائمة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EXPERT PROFILE */}
      {activeTab === 'expert' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-4">
            <div>
              <h4 className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                <UserCheck className="h-4 w-4 text-[#1a4d2e]" />
                <span>ملف الخبراء والمستشارين المسؤولين عن الخدمة</span>
              </h4>
              <p className="text-[10px] text-stone-500 mt-0.5">
                يعزز الموثوقية العالية لدى العميل بإظهار اسم وتخصص المستشار أو المهندس المسؤول
              </p>
            </div>

            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-black text-stone-800 mb-1">
                    اسم الخبير أو المستشار
                  </label>
                  <input
                    type="text"
                    value={expertProfile.name || ''}
                    onChange={(e) => onChangeExpertProfile({ ...expertProfile, name: e.target.value })}
                    placeholder="مثال: المحامي أحمد الكيلاني، م. ريم البطاينة"
                    className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-stone-800 mb-1">
                    المسمى المهني والتخصص
                  </label>
                  <input
                    type="text"
                    value={expertProfile.title || ''}
                    onChange={(e) => onChangeExpertProfile({ ...expertProfile, title: e.target.value })}
                    placeholder="مثال: مستشار قانوني وشركات، مهندس معماري ومصمم داخلي"
                    className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-stone-800 mb-1">
                  سنوات الخبرة المعتمدة
                </label>
                <input
                  type="text"
                  value={expertProfile.experienceYears || ''}
                  onChange={(e) => onChangeExpertProfile({ ...expertProfile, experienceYears: e.target.value })}
                  placeholder="مثال: أكثر من 12 سنة خبرة في محاكم إربد وعمان"
                  className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20"
                />
              </div>

              {/* Professional Credentials / Syndicate Memberships */}
              <div className="space-y-2">
                <label className="block text-xs font-black text-stone-800">
                  الاعتمادات وعضويات النقابات الرسمية
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCredential}
                    onChange={(e) => setNewCredential(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCredential();
                      }
                    }}
                    placeholder="مثال: عضو نقابة المحامين الأردنيين، معتمد لدى محكمة البداية"
                    className="flex-1 p-2 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20"
                  />
                  <button
                    type="button"
                    onClick={handleAddCredential}
                    className="px-3.5 py-2 bg-[#1a4d2e] text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    إضافة
                  </button>
                </div>

                {expertProfile.credentials && expertProfile.credentials.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {expertProfile.credentials.map((cred, idx) => (
                      <span key={idx} className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200/80 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5">
                        <ShieldCheck className="h-3 w-3 text-amber-600 shrink-0" />
                        <span>{cred}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCredential(idx)}
                          className="hover:text-red-600 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Bio summary */}
              <div>
                <label className="block text-xs font-black text-stone-800 mb-1">
                  نبذة تعريفية موجزة عن المستشار
                </label>
                <textarea
                  rows={2}
                  value={expertProfile.bio || ''}
                  onChange={(e) => onChangeExpertProfile({ ...expertProfile, bio: e.target.value })}
                  placeholder="نبذة موجزة عن السيرة المهنية وأبرز الإنجازات..."
                  className="w-full p-2.5 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
