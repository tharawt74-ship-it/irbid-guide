import React, { useState, useMemo } from 'react';
import { 
  Shield, 
  Award, 
  Building2, 
  Search, 
  Phone, 
  MessageSquare, 
  FileText, 
  AlertCircle, 
  ArrowRight, 
  Calendar
} from 'lucide-react';
import { Business, MedicalFacilityInfo, MedicalInsurance } from '../../types';
import { POPULAR_JORDANIAN_INSURANCES } from '../../lib/medicalHelper';
import { WhatsAppIcon } from '../common/WhatsAppIcon';

interface MedicalInsurancesTabProps {
  business: Business;
  medicalProfile: MedicalFacilityInfo;
  onBackToAbout?: () => void;
  onOpenBooking?: () => void;
}

export function MedicalInsurancesTab({
  business,
  medicalProfile,
  onBackToAbout,
  onOpenBooking
}: MedicalInsurancesTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'syndicate' | 'company' | 'public'>('all');

  // Ensure full insurances list
  const insurancesList: MedicalInsurance[] = useMemo(() => {
    const raw = (medicalProfile?.insurances && medicalProfile.insurances.length > 0)
      ? medicalProfile.insurances
      : POPULAR_JORDANIAN_INSURANCES;
      
    return raw.map(ins => {
      if (typeof ins === 'string') {
        const isSyn = (ins as string).includes('نقابة');
        const isPub = (ins as string).includes('جامعة') || (ins as string).includes('حكوم');
        return { 
          name: ins, 
          type: isSyn ? 'نقابة' : (isPub ? 'جامعي/حكومي' : 'شركة تأمين'), 
          isDirectBilling: true,
          coverageDetails: isSyn ? 'تغطية مباشرة بنموذج النقابة المعتمد' : 'تغطية مباشرة للكشفيات والإجراءات'
        };
      }
      return ins;
    });
  }, [medicalProfile?.insurances]);

  // Counts
  const syndicatesCount = useMemo(() => 
    insurancesList.filter(ins => ins.type === 'نقابة' || ins.name.includes('نقابة')).length,
    [insurancesList]
  );
  const companiesCount = useMemo(() => 
    insurancesList.filter(ins => ins.type === 'شركة تأمين' || (!ins.name.includes('نقابة') && !ins.name.includes('جامعة'))).length,
    [insurancesList]
  );
  const publicCount = useMemo(() => 
    insurancesList.filter(ins => ins.type === 'جامعي/حكومي' || ins.name.includes('جامعة') || ins.name.includes('حكوم')).length,
    [insurancesList]
  );

  // Filtered List
  const filteredInsurances = useMemo(() => {
    return insurancesList.filter(ins => {
      const matchesSearch = ins.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
                            (ins.coverageDetails || '').toLowerCase().includes(searchQuery.toLowerCase().trim());
      
      if (!matchesSearch) return false;

      if (selectedCategory === 'syndicate') {
        return ins.type === 'نقابة' || ins.name.includes('نقابة');
      }
      if (selectedCategory === 'company') {
        return ins.type === 'شركة تأمين' || (!ins.name.includes('نقابة') && !ins.name.includes('جامعة'));
      }
      if (selectedCategory === 'public') {
        return ins.type === 'جامعي/حكومي' || ins.name.includes('جامعة') || ins.name.includes('حكوم');
      }
      return true;
    });
  }, [insurancesList, searchQuery, selectedCategory]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
      {/* Top Header Card */}
      <div className="bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
        {/* Subtle Decorative Background Circles */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                <Shield className="h-6 w-6" />
              </div>
              <div>
                <span className="text-xs font-black text-blue-300 uppercase tracking-wider">التأمين الصحي والمطالبات المباشرة</span>
                <h2 className="text-xl sm:text-2xl font-black text-white">شركات التأمين والنقابات المعتمدة</h2>
              </div>
            </div>

            {onBackToAbout && (
              <button
                type="button"
                onClick={onBackToAbout}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ArrowRight className="h-3.5 w-3.5" />
                <span>العودة للملف الطبي</span>
              </button>
            )}
          </div>

          <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-3xl">
            تتعامل منشأة <strong className="text-white font-bold">{business.name}</strong> مع شبكة واسعة من كبرى شركات التأمين الصحي الخاصة، النقابات المهنية، وصناديق التأمين الجامعي في الأردن لتوفير تغطية كشفيات وإجراءات طبية معتمدة وميسرة بدون تعقيد.
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2.5 pt-2">
            <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-3 text-center">
              <div className="text-lg sm:text-xl font-black text-white">{insurancesList.length}</div>
              <div className="text-[11px] text-blue-200 font-bold">إجمالي الجهات المعتمدة</div>
            </div>
            <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-3 text-center">
              <div className="text-lg sm:text-xl font-black text-blue-300">{syndicatesCount}</div>
              <div className="text-[11px] text-blue-200 font-bold">نقابات مهنية</div>
            </div>
            <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-3 text-center">
              <div className="text-lg sm:text-xl font-black text-emerald-300">{companiesCount}</div>
              <div className="text-[11px] text-blue-200 font-bold">شركات تأمين خاصة</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Section */}
      <div className="bg-stone-50/80 border border-stone-200/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Live Search Input */}
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث بالاسم عن شركة تأمينك أو نقابتك (مثال: نقابة المهندسين، gig، نات هيلث)..."
              className="w-full bg-white border border-stone-200/90 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm font-bold text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 hover:text-stone-600 bg-stone-100 hover:bg-stone-200 px-2 py-0.5 rounded-md cursor-pointer"
              >
                مسح
              </button>
            )}
          </div>

          {/* Direct Booking Shortcut */}
          {onOpenBooking && (
            <button
              type="button"
              onClick={onOpenBooking}
              className="px-5 py-2.5 bg-[#1a4d2e] hover:bg-[#153e25] text-white rounded-xl text-xs font-black inline-flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer shrink-0"
            >
              <Calendar className="h-4 w-4" />
              <span>حجز موعد كشفية بالتأمين</span>
            </button>
          )}
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide text-xs font-bold">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
            }`}
          >
            جميع التأمينات ({insurancesList.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('syndicate')}
            className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === 'syndicate'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
            }`}
          >
            النقابات المهنية ({syndicatesCount})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('company')}
            className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
              selectedCategory === 'company'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
            }`}
          >
            شركات التأمين الخاصة ({companiesCount})
          </button>
          {publicCount > 0 && (
            <button
              type="button"
              onClick={() => setSelectedCategory('public')}
              className={`px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                selectedCategory === 'public'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
              }`}
            >
              التأمينات الجامعية والحكومية ({publicCount})
            </button>
          )}
        </div>
      </div>

      {/* Main List of Insurances (LIST FORMAT - NOT GRID) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-black text-base sm:text-lg text-stone-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            <span>قائمة الجهات المعتمدة ({filteredInsurances.length})</span>
          </h3>
          {searchQuery && (
            <span className="text-xs font-bold text-stone-500">
              نتائج البحث عن: "{searchQuery}"
            </span>
          )}
        </div>

        {filteredInsurances.length > 0 ? (
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-stone-200/80 divide-y divide-stone-100 overflow-hidden shadow-xs">
            {filteredInsurances.map((ins, index) => {
              const isSyndicate = ins.type === 'نقابة' || ins.name.includes('نقابة');
              const isPublic = ins.type === 'جامعي/حكومي' || ins.name.includes('جامعة');

              return (
                <div
                  key={index}
                  className="p-4 sm:p-5 hover:bg-blue-50/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 group"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-2xs ${
                      isSyndicate
                        ? 'bg-blue-50 text-blue-700 border border-blue-200/80'
                        : isPublic
                        ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                    }`}>
                      {isSyndicate ? (
                        <Award className="h-5 w-5" />
                      ) : isPublic ? (
                        <Building2 className="h-5 w-5" />
                      ) : (
                        <Shield className="h-5 w-5" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-sm sm:text-base font-black text-stone-900 group-hover:text-blue-900 transition-colors">
                          {ins.name}
                        </span>
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                          isSyndicate
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : isPublic
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}>
                          {ins.type || (isSyndicate ? 'نقابة مهنية' : 'شركة تأمين')}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 font-medium">
                        {ins.coverageDetails || (isSyndicate 
                          ? 'تغطية معتمدة بنموذج النقابة للكشفيات' 
                          : 'تغطية تأمينية معتمدة للكشفيات والإجراءات الطبية وفق فئة بطاقتك')}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-stone-50/80 rounded-2xl border border-dashed border-stone-200 p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
              <Search className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-black text-stone-800">لم يتم العثور على جهة تأمينية مطابقة</h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto font-medium">
              لم نجد شركة تأمين بالاسم "{searchQuery}". يرجى التحقق من صحة الاسم أو التواصل مباشرة مع المنشأة للاستفسار.
            </p>
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
              className="text-xs font-black text-blue-700 hover:underline cursor-pointer"
            >
              عرض جميع الشركات المعتمدة
            </button>
          </div>
        )}
      </div>

      {/* Not Found? Contact the Facility */}
      <div className="bg-gradient-to-r from-stone-50 via-blue-50/40 to-stone-50 border border-blue-100 rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="space-y-1 text-center sm:text-right">
          <h4 className="text-sm sm:text-base font-black text-stone-900 flex items-center justify-center sm:justify-start gap-2">
            <AlertCircle className="h-4.5 w-4.5 text-blue-700" />
            <span>لم تجد شركتك التأمينية في القائمة أعلاه؟</span>
          </h4>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {business.phone && (
            <a
              href={`tel:${business.phone}`}
              className="px-4 py-2.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 rounded-xl text-xs font-black inline-flex items-center gap-2 shadow-2xs transition-all"
            >
              <Phone className="h-4 w-4 text-emerald-600" />
              <span>استفسار هاتفي</span>
            </a>
          )}
          {(business.whatsapp || business.socialLinks?.whatsapp || business.phone) && (
            <a
              href={`https://wa.me/${((business.whatsapp || business.socialLinks?.whatsapp || business.phone || '').startsWith('07') ? '962' + (business.whatsapp || business.socialLinks?.whatsapp || business.phone || '').substring(1) : (business.whatsapp || business.socialLinks?.whatsapp || business.phone || '')).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`مرحباً، أود الاستفسار عن قبول تأميني الطبي لدى ${business.name}.`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black inline-flex items-center gap-2 shadow-sm transition-all"
            >
              <WhatsAppIcon className="h-4 w-4" />
              <span>استفسار واتساب</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
