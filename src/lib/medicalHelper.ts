import { Business, MedicalFacilityInfo, MedicalInsurance, MedicalDoctor, MedicalProcedure, MedicalEquipment } from '../types';
import { MEDICAL_SPECIALTIES } from './medicalCategories';

export const POPULAR_JORDANIAN_INSURANCES: MedicalInsurance[] = [
  { name: 'نقابة المهندسين الأردنيين', type: 'نقابة', isDirectBilling: true, coverageDetails: 'تغطية مباشرة للكشفيات والإجراءات' },
  { name: 'نقابة المعلمين الأردنيين', type: 'نقابة', isDirectBilling: true, coverageDetails: 'تغطية كشفية وإجراءات مخبرية' },
  { name: 'نقابة المحامين النظاميين', type: 'نقابة', isDirectBilling: true, coverageDetails: 'تغطية مباشرة بنموذج النقابة' },
  { name: 'شركة الشرق العربي للتأمين (gig)', type: 'شركة تأمين', isDirectBilling: true, coverageDetails: 'شبكة الدرجة الأولى والثانية' },
  { name: 'النسر العربي للتأمين', type: 'شركة تأمين', isDirectBilling: true, coverageDetails: 'معتمد لجميع الشبكات' },
  { name: 'ميدنت الأردن (MedNet)', type: 'شركة تأمين', isDirectBilling: true, coverageDetails: 'بطاقة التأمين الإلكترونية المباشرة' },
  { name: 'نات هيلث (NatHealth)', type: 'شركة تأمين', isDirectBilling: true, coverageDetails: 'تغطية شاملة داخل الشبكة الطبية' },
  { name: 'الشركة الإسلامية للتأمين', type: 'شركة تأمين', isDirectBilling: true, coverageDetails: 'شبكة تأمين تكافلي معتمدة' },
  { name: 'الأولى للتأمين (Solidarity)', type: 'شركة تأمين', isDirectBilling: true, coverageDetails: 'تغطية مباشرة للكشفية والمختبر' },
  { name: 'تأمين موظفي جامعة اليرموك', type: 'جامعي/حكومي', isDirectBilling: true, coverageDetails: 'تغطية أعضاء الهيئة التدريسية والإدارية' },
  { name: 'تأمين جامعة العلوم والتكنولوجيا', type: 'جامعي/حكومي', isDirectBilling: true, coverageDetails: 'شبكة المستشفيات والعيادات المعتمدة' },
  { name: 'شركة ميد سيرفس (MedService)', type: 'شركة تأمين', isDirectBilling: true, coverageDetails: 'موافقة إلكترونية فورية' }
];

export function validateJordanianPhone(phoneStr: string): { isValid: boolean; message?: string } {
  if (!phoneStr || !phoneStr.trim()) return { isValid: true };
  const clean = phoneStr.replace(/[\s\-\(\)]/g, '');
  const normalized = clean.replace(/^(?:\+962|00962)/, '0');
  
  // Mobile numbers (077, 078, 079, 075 + 7 digits = 10 digits total)
  if (/^07[7895]\d{7}$/.test(normalized)) {
    return { isValid: true };
  }
  // Landline numbers in Irbid / North (02 + 7 digits = 9 digits total e.g. 027XXXXXX)
  if (/^02\d{7}$/.test(normalized)) {
    return { isValid: true };
  }
  // Other Jordan area codes (03, 05, 06 - 9 digits total)
  if (/^0[356]\d{7}$/.test(normalized)) {
    return { isValid: true };
  }
  return { 
    isValid: false, 
    message: 'رقم هاتف غير صالح. يجب أن يكون رقماً أردنياً خلوياً (07XXXXXXXX) أو أرضياً (02XXXXXXX).' 
  };
}

export function isMedicalBusiness(business?: Business | null): boolean {
  if (!business) return false;
  const category = (business.category || '').toLowerCase();
  const description = (business.description || '').toLowerCase();
  const name = (business.name || '').toLowerCase();

  const medicalKeywords = [
    'عيادات', 'مركز طبي', 'مستشفى', 'مستشفيات', 'صيدلية', 'صيدليات', 
    'مختبر', 'مختبرات', 'أشعة', 'أسنان', 'طب', 'طبي', 'دكتور', 
    'دكتورة', 'استشاري', 'أخصائي', 'عيادة', 'علاج طبيعي', 'رعاية صحية',
    'باطنية', 'جراحة', 'أطفال', 'نسائية', 'توليد', 'عيون', 'جلدية', 'قلب', 'أنف وأذن'
  ];

  return medicalKeywords.some(keyword => 
    category.includes(keyword) || 
    name.includes(keyword) || 
    description.includes(keyword)
  );
}

/**
 * Returns the exact "القسم الطبي الرئيسي / الاختصاص الفرعي" tag string for medical businesses.
 */
export function getMedicalSpecialtyBadgeText(business?: Business | null): string | null {
  if (!business || !isMedicalBusiness(business)) return null;

  const name = (business.name || '').toLowerCase();
  const desc = (business.description || '').toLowerCase();
  const cat = (business.category || '').toLowerCase();
  const subCat = ((business as any).subCategory || (business as any).subcategory || '').toLowerCase();
  const docSub = (
    business.medicalProfile?.doctorProfile?.subspecialty ||
    business.medicalProfile?.doctorsList?.[0]?.subspecialty ||
    ''
  ).toLowerCase();
  const docTitle = (business.medicalProfile?.doctorProfile?.title || '').toLowerCase();
  const facilityType = (business.facilityType || '').toLowerCase();

  const combinedText = `${name} ${cat} ${subCat} ${docSub} ${docTitle} ${desc} ${facilityType}`;

  let mainSpecialtyName = '';
  let subSpecialtyName = '';

  // 1. Determine Main Specialty (القسم الطبي الرئيسي)
  if (combinedText.includes('أسنان') || combinedText.includes('اسنان') || combinedText.includes('تقويم') || combinedText.includes('زراعة أسنان')) {
    mainSpecialtyName = 'طب وجراحة الفم والأسنان';
  } else if (combinedText.includes('عيون') || combinedText.includes('ليزك') || combinedText.includes('تصحيح نظر') || combinedText.includes('أنف وأذن') || combinedText.includes('جلدية') || combinedText.includes('ليزر') || combinedText.includes('بشرة')) {
    mainSpecialtyName = 'التخصصات الدقيقة والحواس';
  } else if (combinedText.includes('صيدل') || combinedText.includes('دواء') || facilityType === 'pharmacy') {
    mainSpecialtyName = 'الصيدليات والدواء';
  } else if (combinedText.includes('مختبر') || combinedText.includes('أشعة') || combinedText.includes('اشعة') || combinedText.includes('تحاليل') || facilityType === 'lab') {
    mainSpecialtyName = 'المختبرات ومراكز الأشعة';
  } else if (combinedText.includes('مستشف') || combinedText.includes('مجمع طبي') || combinedText.includes('مركز شامل') || facilityType === 'hospital') {
    mainSpecialtyName = 'المستشفيات والمراكز الشاملة';
  } else if (combinedText.includes('أطفال') || combinedText.includes('طفل') || combinedText.includes('خدج')) {
    mainSpecialtyName = 'طب وصحة الأطفال والخدج';
  } else if (combinedText.includes('نسائية') || combinedText.includes('توليد') || combinedText.includes('حمل') || combinedText.includes('عقم')) {
    mainSpecialtyName = 'النسائية والتوليد وصحة المرأة';
  } else if (combinedText.includes('علاج طبيعي') || combinedText.includes('فيزيائي') || combinedText.includes('تأهيل') || facilityType === 'physio') {
    mainSpecialtyName = 'العلاج الطبيعي والتأهيل';
  } else if (combinedText.includes('باطنية') || combinedText.includes('باطن') || combinedText.includes('قلب') || combinedText.includes('غدد') || combinedText.includes('كلى') || combinedText.includes('هضمي') || combinedText.includes('روماتيزم')) {
    mainSpecialtyName = 'الأمراض الباطنية والتخصصات الدقيقة';
  } else if (combinedText.includes('جراحة') || combinedText.includes('جراح') || combinedText.includes('عظام') || combinedText.includes('مسالك') || combinedText.includes('تجميل') || combinedText.includes('مخ وأعصاب')) {
    mainSpecialtyName = 'الجراحة العامة والتخصصات الجراحية';
  } else if (combinedText.includes('نفسي') || combinedText.includes('صرع') || combinedText.includes('توحد') || combinedText.includes('إدمان')) {
    mainSpecialtyName = 'الصحة النفسية والطب العصبي';
  } else if (combinedText.includes('بيطر')) {
    mainSpecialtyName = 'الطب والعيادات البيطرية';
  } else {
    if (business.category && !business.category.includes('صحة وطب') && !business.category.includes('عيادات ومراكز')) {
      mainSpecialtyName = business.category;
    } else {
      mainSpecialtyName = 'العيادات والاستشارات الطبية';
    }
  }

  // 2. Determine Subspecialty (الاختصاص الفرعي)
  const rawSub = (business as any).subCategory || (business as any).subcategory || business.medicalProfile?.doctorProfile?.subspecialty || business.medicalProfile?.doctorsList?.[0]?.subspecialty;

  if (rawSub && typeof rawSub === 'string' && rawSub.trim() && rawSub.trim() !== mainSpecialtyName && rawSub.trim() !== business.category) {
    subSpecialtyName = rawSub.trim();
  } else {
    const matchedSpecObj = MEDICAL_SPECIALTIES.find(s => s.name === mainSpecialtyName);
    if (matchedSpecObj && matchedSpecObj.subspecialties) {
      const foundSub = matchedSpecObj.subspecialties.find(sub => combinedText.includes(sub.toLowerCase().substring(0, 5)));
      if (foundSub) {
        subSpecialtyName = foundSub;
      }
    }

    if (!subSpecialtyName) {
      if (mainSpecialtyName.includes('أسنان')) {
        if (combinedText.includes('تقويم')) subSpecialtyName = 'تقويم الأسنان والفكين';
        else if (combinedText.includes('زراعة')) subSpecialtyName = 'زراعة الأسنان وجراحة الفم';
        else if (combinedText.includes('عصب')) subSpecialtyName = 'علاج العصب والجذور';
        else if (combinedText.includes('تجميل') || combinedText.includes('ابتسام')) subSpecialtyName = 'تجميل الأسنان وابتسامة هوليوود';
        else subSpecialtyName = 'طب وجراحة الأسنان العامة';
      } else if (mainSpecialtyName.includes('عيون') || mainSpecialtyName.includes('الحواس')) {
        if (combinedText.includes('أنف')) subSpecialtyName = 'جراحة الأنف والأذن والحنجرة';
        else if (combinedText.includes('جلدية') || combinedText.includes('بشرة')) subSpecialtyName = 'الأمراض الجلدية والتجميل';
        else subSpecialtyName = 'طب وجراحة العيون وتصحيح النظر';
      } else if (mainSpecialtyName.includes('صيدل')) {
        if (combinedText.includes('24') || combinedText.includes('مناوب')) subSpecialtyName = 'صيدليات 24 ساعة (المناوبة)';
        else subSpecialtyName = 'صيدلية ودواء';
      } else if (mainSpecialtyName.includes('مختبر')) {
        if (combinedText.includes('أشعة')) subSpecialtyName = 'أشعة وتصوير تشخيصي';
        else subSpecialtyName = 'مختبر تحاليل طبية شاملة';
      } else if (mainSpecialtyName.includes('مستشف')) {
        if (combinedText.includes('طوارئ')) subSpecialtyName = 'طوارئ وإسعاف 24 ساعة';
        else subSpecialtyName = 'مجمع عيادات ومستشفى تخصصي';
      } else if (mainSpecialtyName.includes('باطن')) {
        if (combinedText.includes('قلب')) subSpecialtyName = 'أمراض القلب والقسطرة';
        else if (combinedText.includes('غدد') || combinedText.includes('سكري')) subSpecialtyName = 'الغدد الصماء والسكري';
        else if (combinedText.includes('هضمي')) subSpecialtyName = 'الجهاز الهضمي والكبد';
        else subSpecialtyName = 'الباطنية العامة والاستشارات';
      } else if (mainSpecialtyName.includes('جراحة')) {
        if (combinedText.includes('عظام')) subSpecialtyName = 'جراحة العظام والمفاصل';
        else if (combinedText.includes('مسالك')) subSpecialtyName = 'جراحة المسالك البولية والتناسلية';
        else if (combinedText.includes('تجميل')) subSpecialtyName = 'جراحة التجميل والترميم';
        else subSpecialtyName = 'الجراحة العامة والمناظير';
      } else if (mainSpecialtyName.includes('أطفال')) {
        subSpecialtyName = 'طب الأطفال العام والحديثي الولادة';
      } else if (mainSpecialtyName.includes('النسائية')) {
        if (combinedText.includes('عقم') || combinedText.includes('أنابيب')) subSpecialtyName = 'العقم وأطفال الأنابيب';
        else subSpecialtyName = 'النساء والتوليد ومتابعة الحمل';
      } else if (mainSpecialtyName.includes('علاج طبيعي')) {
        subSpecialtyName = 'تأهيل حركي وإصابات ملاعب';
      } else if (mainSpecialtyName.includes('بيطر')) {
        subSpecialtyName = 'عيادة ورعاية بيطرية';
      } else {
        subSpecialtyName = 'استشارات وطب تخصصي';
      }
    }
  }

  if (subSpecialtyName === mainSpecialtyName) {
    if (mainSpecialtyName.includes('صيدل')) subSpecialtyName = 'صيدليات عامة ومناوبة';
    else if (mainSpecialtyName.includes('مختبر')) subSpecialtyName = 'تحاليل وأشعة تشخيصية';
    else if (mainSpecialtyName.includes('مستشف')) subSpecialtyName = 'رعاية شاملة وطوارئ';
    else subSpecialtyName = 'استشارات وعيادات تخصصية';
  }

  return `${mainSpecialtyName} / ${subSpecialtyName}`;
}

/**
 * Returns only the "الاختصاص الفرعي" (medical subspecialty) for medical businesses.
 */
export function getMedicalSubspecialtyOnly(business?: Business | null): string | null {
  if (!business || !isMedicalBusiness(business)) return null;

  const name = (business.name || '').toLowerCase();
  const desc = (business.description || '').toLowerCase();
  const cat = (business.category || '').toLowerCase();
  const subCat = ((business as any).subCategory || (business as any).subcategory || '').toLowerCase();
  const docSub = (
    business.medicalProfile?.doctorProfile?.subspecialty ||
    business.medicalProfile?.doctorsList?.[0]?.subspecialty ||
    ''
  ).toLowerCase();
  const docTitle = (business.medicalProfile?.doctorProfile?.title || '').toLowerCase();
  const facilityType = (business.facilityType || '').toLowerCase();

  const combinedText = `${name} ${cat} ${subCat} ${docSub} ${docTitle} ${desc} ${facilityType}`;

  let mainSpecialtyName = '';
  let subSpecialtyName = '';

  // 1. Determine Main Specialty (القسم الطبي الرئيسي)
  if (combinedText.includes('أسنان') || combinedText.includes('اسنان') || combinedText.includes('تقويم') || combinedText.includes('زراعة أسنان')) {
    mainSpecialtyName = 'طب وجراحة الفم والأسنان';
  } else if (combinedText.includes('عيون') || combinedText.includes('ليزك') || combinedText.includes('تصحيح نظر') || combinedText.includes('أنف وأذن') || combinedText.includes('جلدية') || combinedText.includes('ليزر') || combinedText.includes('بشرة')) {
    mainSpecialtyName = 'التخصصات الدقيقة والحواس';
  } else if (combinedText.includes('صيدل') || combinedText.includes('دواء') || facilityType === 'pharmacy') {
    mainSpecialtyName = 'الصيدليات والدواء';
  } else if (combinedText.includes('مختبر') || combinedText.includes('أشعة') || combinedText.includes('اشعة') || combinedText.includes('تحاليل') || facilityType === 'lab') {
    mainSpecialtyName = 'المختبرات ومراكز الأشعة';
  } else if (combinedText.includes('مستشف') || combinedText.includes('مجمع طبي') || combinedText.includes('مركز شامل') || facilityType === 'hospital') {
    mainSpecialtyName = 'المستشفيات والمراكز الشاملة';
  } else if (combinedText.includes('أطفال') || combinedText.includes('طفل') || combinedText.includes('خدج')) {
    mainSpecialtyName = 'طب وصحة الأطفال والخدج';
  } else if (combinedText.includes('نسائية') || combinedText.includes('توليد') || combinedText.includes('حمل') || combinedText.includes('عقم')) {
    mainSpecialtyName = 'النسائية والتوليد وصحة المرأة';
  } else if (combinedText.includes('علاج طبيعي') || combinedText.includes('فيزيائي') || combinedText.includes('تأهيل') || facilityType === 'physio') {
    mainSpecialtyName = 'العلاج الطبيعي والتأهيل';
  } else if (combinedText.includes('باطنية') || combinedText.includes('باطن') || combinedText.includes('قلب') || combinedText.includes('غدد') || combinedText.includes('كلى') || combinedText.includes('هضمي') || combinedText.includes('روماتيزم')) {
    mainSpecialtyName = 'الأمراض الباطنية والتخصصات الدقيقة';
  } else if (combinedText.includes('جراحة') || combinedText.includes('جراح') || combinedText.includes('عظام') || combinedText.includes('مسالك') || combinedText.includes('تجميل') || combinedText.includes('مخ وأعصاب')) {
    mainSpecialtyName = 'الجراحة العامة والتخصصات الجراحية';
  } else if (combinedText.includes('نفسي') || combinedText.includes('صرع') || combinedText.includes('توحد') || combinedText.includes('إدمان')) {
    mainSpecialtyName = 'الصحة النفسية والطب العصبي';
  } else if (combinedText.includes('بيطر')) {
    mainSpecialtyName = 'الطب والعيادات البيطرية';
  } else {
    if (business.category && !business.category.includes('صحة وطب') && !business.category.includes('عيادات ومراكز')) {
      mainSpecialtyName = business.category;
    } else {
      mainSpecialtyName = 'العيادات والاستشارات الطبية';
    }
  }

  // 2. Determine Subspecialty (الاختصاص الفرعي)
  const rawSub = (business as any).subCategory || (business as any).subcategory || business.medicalProfile?.doctorProfile?.subspecialty || business.medicalProfile?.doctorsList?.[0]?.subspecialty;

  if (rawSub && typeof rawSub === 'string' && rawSub.trim() && rawSub.trim() !== mainSpecialtyName && rawSub.trim() !== business.category) {
    subSpecialtyName = rawSub.trim();
  } else {
    const matchedSpecObj = MEDICAL_SPECIALTIES.find(s => s.name === mainSpecialtyName);
    if (matchedSpecObj && matchedSpecObj.subspecialties) {
      const foundSub = matchedSpecObj.subspecialties.find(sub => combinedText.includes(sub.toLowerCase().substring(0, 5)));
      if (foundSub) {
        subSpecialtyName = foundSub;
      }
    }

    if (!subSpecialtyName) {
      if (mainSpecialtyName.includes('أسنان')) {
        if (combinedText.includes('تقويم')) subSpecialtyName = 'تقويم الأسنان والفكين';
        else if (combinedText.includes('زراعة')) subSpecialtyName = 'زراعة الأسنان وجراحة الفم';
        else if (combinedText.includes('عصب')) subSpecialtyName = 'علاج العصب والجذور';
        else if (combinedText.includes('تجميل') || combinedText.includes('ابتسام')) subSpecialtyName = 'تجميل الأسنان وابتسامة هوليوود';
        else subSpecialtyName = 'طب وجراحة الأسنان العامة';
      } else if (mainSpecialtyName.includes('عيون') || mainSpecialtyName.includes('الحواس')) {
        if (combinedText.includes('أنف')) subSpecialtyName = 'جراحة الأنف والأذن والحنجرة';
        else if (combinedText.includes('جلدية') || combinedText.includes('بشرة')) subSpecialtyName = 'الأمراض الجلدية والتجميل';
        else subSpecialtyName = 'طب وجراحة العيون وتصحيح النظر';
      } else if (mainSpecialtyName.includes('صيدل')) {
        if (combinedText.includes('24') || combinedText.includes('مناوب')) subSpecialtyName = 'صيدليات 24 ساعة (المناوبة)';
        else subSpecialtyName = 'صيدلية ودواء';
      } else if (mainSpecialtyName.includes('مختبر')) {
        if (combinedText.includes('أشعة')) subSpecialtyName = 'أشعة وتصوير تشخيصي';
        else subSpecialtyName = 'مختبر تحاليل طبية شاملة';
      } else if (mainSpecialtyName.includes('مستشف')) {
        if (combinedText.includes('طوارئ')) subSpecialtyName = 'طوارئ وإسعاف 24 ساعة';
        else subSpecialtyName = 'مجمع عيادات ومستشفى تخصصي';
      } else if (mainSpecialtyName.includes('باطن')) {
        if (combinedText.includes('قلب')) subSpecialtyName = 'أمراض القلب والقسطرة';
        else if (combinedText.includes('غدد') || combinedText.includes('سكري')) subSpecialtyName = 'الغدد الصماء والسكري';
        else if (combinedText.includes('هضمي')) subSpecialtyName = 'الجهاز الهضمي والكبد';
        else subSpecialtyName = 'الباطنية العامة والاستشارات';
      } else if (mainSpecialtyName.includes('جراحة')) {
        if (combinedText.includes('عظام')) subSpecialtyName = 'جراحة العظام والمفاصل';
        else if (combinedText.includes('مسالك')) subSpecialtyName = 'جراحة المسالك البولية والتناسلية';
        else if (combinedText.includes('تجميل')) subSpecialtyName = 'جراحة التجميل والترميم';
        else subSpecialtyName = 'الجراحة العامة والمناظير';
      } else if (mainSpecialtyName.includes('أطفال')) {
        subSpecialtyName = 'طب الأطفال العام والحديثي الولادة';
      } else if (mainSpecialtyName.includes('النسائية')) {
        if (combinedText.includes('عقم') || combinedText.includes('أنابيب')) subSpecialtyName = 'العقم وأطفال الأنابيب';
        else subSpecialtyName = 'النساء والتوليد ومتابعة الحمل';
      } else if (mainSpecialtyName.includes('علاج طبيعي')) {
        subSpecialtyName = 'تأهيل حركي وإصابات ملاعب';
      } else if (mainSpecialtyName.includes('بيطر')) {
        subSpecialtyName = 'عيادة ورعاية بيطرية';
      } else {
        subSpecialtyName = 'استشارات وطب تخصصي';
      }
    }
  }

  if (subSpecialtyName === mainSpecialtyName) {
    if (mainSpecialtyName.includes('صيدل')) subSpecialtyName = 'صيدليات عامة ومناوبة';
    else if (mainSpecialtyName.includes('مختبر')) subSpecialtyName = 'تحاليل وأشعة تشخيصية';
    else if (mainSpecialtyName.includes('مستشف')) subSpecialtyName = 'رعاية شاملة وطوارئ';
    else subSpecialtyName = 'استشارات وعيادات تخصصية';
  }

  return subSpecialtyName;
}

/**
 * Checks if a facility is eligible to offer and display Emergency Services (24/7).
 * Restricted to:
 * 1. المستشفيات والمراكز الشاملة (Hospitals and Comprehensive Medical Centers)
 * 2. الصيدليات والدواء (Pharmacies)
 * 3. المختبرات ومراكز الأشعة (Laboratories and Radiology Centers)
 */
export function isEmergencyFacility(
  target?: Business | null | { 
    facilityType?: string; 
    category?: string; 
    subCategory?: string; 
    name?: string; 
    mainSpecialty?: string;
    specialty?: string;
  }
): boolean {
  if (!target) return false;
  const t = target as any;
  const facilityType = (t.facilityType || '').toLowerCase();
  const cat = (t.category || '').toLowerCase();
  const sub = (t.subCategory || '').toLowerCase();
  const name = (t.name || '').toLowerCase();
  const specialty = (t.mainSpecialty || t.specialty || '').toLowerCase();

  // Explicit facility type keys
  if (['hospital', 'medical_center', 'pharmacy', 'lab', 'laboratory'].includes(facilityType)) {
    return true;
  }

  // Explicit specialty IDs from MEDICAL_SPECIALTIES
  if (['hospitals', 'pharmacies', 'laboratories'].includes(specialty)) {
    return true;
  }

  const combined = `${facilityType} ${cat} ${sub} ${name} ${specialty}`;
  return (
    combined.includes('مستشف') ||
    combined.includes('مركز شامل') ||
    combined.includes('مراكز شاملة') ||
    combined.includes('مجمع طبي') ||
    combined.includes('صيدل') ||
    combined.includes('دواء') ||
    combined.includes('مختبر') ||
    combined.includes('أشعة') ||
    combined.includes('اشعة') ||
    combined.includes('hospital') ||
    combined.includes('pharmacy') ||
    combined.includes('lab')
  );
}

/**
 * Checks if a facility is eligible for the Medical Staff Tab & multi-staff management.
 * Explicitly targeted categories:
 * 1. المستشفيات والمراكز الشاملة (Hospitals and Comprehensive Centers)
 * 2. الصيدليات والدواء (Pharmacies and Medicine)
 * 3. المختبرات ومراكز الأشعة (Laboratories and Radiology Centers)
 * 4. العلاج الطبيعي والتأهيل والطب التكميلي (Physical Therapy, Rehabilitation and Complementary Medicine)
 */
export function isStaffTabEligible(
  target?: Business | null | { 
    facilityType?: string; 
    category?: string; 
    subCategory?: string; 
    name?: string; 
    mainSpecialty?: string;
    specialty?: string;
  }
): boolean {
  if (!target) return false;
  const t = target as any;
  const facilityType = (t.facilityType || '').toLowerCase();
  const cat = (t.category || '').toLowerCase();
  const sub = (t.subCategory || '').toLowerCase();
  const name = (t.name || '').toLowerCase();
  const specialty = (t.mainSpecialty || t.specialty || '').toLowerCase();

  // Explicit facility type keys
  if (['hospital', 'medical_center', 'pharmacy', 'lab', 'laboratory', 'physio', 'rehab'].includes(facilityType)) {
    return true;
  }

  // Explicit specialty IDs from MEDICAL_SPECIALTIES
  if (['hospitals', 'pharmacies', 'laboratories', 'rehab'].includes(specialty)) {
    return true;
  }

  const combined = `${facilityType} ${cat} ${sub} ${name} ${specialty}`;
  return (
    combined.includes('مستشف') ||
    combined.includes('مركز شامل') ||
    combined.includes('مراكز شاملة') ||
    combined.includes('مجمع طبي') ||
    combined.includes('صيدل') ||
    combined.includes('دواء') ||
    combined.includes('مختبر') ||
    combined.includes('أشعة') ||
    combined.includes('اشعة') ||
    combined.includes('تحاليل') ||
    combined.includes('علاج طبيعي') ||
    combined.includes('تأهيل') ||
    combined.includes('طب تكميلي') ||
    combined.includes('حجامة') ||
    combined.includes('hospital') ||
    combined.includes('pharmacy') ||
    combined.includes('lab') ||
    combined.includes('physio') ||
    combined.includes('rehab')
  );
}

export function deriveDefaultStaff(business: Business): MedicalDoctor[] {
  const text = ((business.name || '') + ' ' + (business.category || '') + ' ' + (business.description || '')).toLowerCase();
  const facilityName = business.name || 'المنشأة الطبية';

  if (text.includes('صيدل') || text.includes('دواء')) {
    return [
      {
        name: `د. ${business.ownerName || 'محمد الشناق'} (PharmD)`,
        title: 'صيدلي قانوني مسؤول ومدير الصيدلية',
        degrees: ['بكالوريوس دكتور صيدلة (PharmD) - جامعة العلوم والتكنولوجيا', 'ترخيص مزاولة المهنة من نقابة صيادلة الأردن', 'دبلوم الاستشارات الدوائية السريرية'],
        subspecialty: 'الإشراف الصيدلاني، صرف الوصفات، واستشارات التداخلات الدوائية',
        experienceYears: 12,
        bio: `صيدلي مسؤول ذو خبرة طويلة في إدارة الرعاية الصيدلانية وصرف الوصفات التخصصية ومتابعة خطط العلاج الدوائي للمرضى في ${facilityName}.`
      },
      {
        name: 'الصيدلانية رزان البطاينة',
        title: 'صيدلانية سريرية واستشارات تركيبات',
        degrees: ['بكالوريوس صيدلة (BPharm) - جامعة اليرموك', 'شهادة تدريب معتمدة في التركيبات الدوائية والعناية بالبشرة'],
        subspecialty: 'التركيبات الدوائية، مستحضرات العناية التخصصية، وتغذية الأطفال',
        experienceYears: 7,
        bio: 'متخصصة في التركيبات الجلدية والعلاجية وتقديم المشورة حول مستلزمات حديثي الولادة والأمهات.'
      },
      {
        name: 'الصيدلاني أحمد العزام',
        title: 'صيدلاني مناوب ومستشار أجهزة طبية',
        degrees: ['بكالوريوس صيدلة (BPharm)', 'شهادة تدريب في الأجهزة الطبية المنزلية ورعاية كبار السن'],
        subspecialty: 'خدمات الطوارئ والمناوبة، الأجهزة الطبية ومستلزمات السكري والضغط',
        experienceYears: 5,
        bio: 'مسؤول المتابعة والمناوبات وتوفير الأدوية النادرة وشرح تشغيل الأجهزة الطبية المنزلية بدقة للمرضى.'
      }
    ];
  }

  if (text.includes('مختبر') || text.includes('أشعة') || text.includes('تحاليل')) {
    return [
      {
        name: `د. ${business.ownerName || 'أحمد الروسان'}`,
        title: 'استشاري ورئيس قسم التحاليل الطبية والباثولوجي',
        degrees: ['البورد الأردني في علم الأمراض والتحاليل الطبية', 'دكتوراه في المناعة والتشخيص الجزيئي', 'عضو جمعية اختصاصيي المختبرات الطبية'],
        subspecialty: 'علم الأمراض النسيجي، فحوصات الهرمونات والمناعة المتقدمة',
        experienceYears: 16,
        bio: `خبرة سريرية رائدة في الإشراف على دقة التحاليل المخبرية واستشارات التقييم التشخيصي في ${facilityName}.`
      },
      {
        name: 'الأخصائية سوزان القضاة',
        title: 'أخصائية الكيمياء الحيوية والدمويات',
        degrees: ['ماجستير في التحاليل الطبية والدمويات', 'شهادة ضبط الجودة المخبرية العالمية (ISO 15189)'],
        subspecialty: 'فحوصات الدم الشاملة، تجلط الدم، والإنزيمات الحيوية',
        experienceYears: 9,
        bio: 'مسؤولة الجودة وضبط المعايرة للأجهزة المخبرية الآلية وضمان النتائج الدقيقة السريعة.'
      },
      {
        name: 'الأخصائي طارق عبابنة',
        title: 'أخصائي الأشعة والتصوير التشخيصي والموجات فوق الصوتية',
        degrees: ['بكالوريوس تكنولوجيا الأشعة والتصوير الطبي', 'دبلوم تصوير السونار والدوبلر الملون'],
        subspecialty: 'التصوير الإشعاعي الرقمي والأشعة التلفزيونية والدوبلر',
        experienceYears: 11,
        bio: 'خبرة واسعة في التصوير الشعاعي التشخيصي وكتابة التقارير الإشعاعية الدقيقة للحالات الطارئة والروتينية.'
      }
    ];
  }

  if (text.includes('علاج طبيعي') || text.includes('تأهيل') || text.includes('طب تكميلي')) {
    return [
      {
        name: `د. ${business.ownerName || 'يزن عبيدات'}`,
        title: 'استشاري ورئيس قسم العلاج الطبيعي والتأهيل الحركي',
        degrees: ['دكتوراه في العلاج الطبيعي والتأهيل الحركي (DPT)', 'شهادة البورد في تأهيل العمود الفقري والمفاصل', 'عضو الجمعية الأردنية للعلاج الطبيعي'],
        subspecialty: 'علاج آلام الديسك والعمود الفقري، تأهيل ما بعد العمليات الجراحية وتبديل المفاصل',
        experienceYears: 14,
        bio: `يشرف على وضع الخطط العلاجية والتأهيلية المتقدمة واستعادة الوظائف الحركية للمرضى بأحدث الأجهزة في ${facilityName}.`
      },
      {
        name: 'الأخصائية دانا الهنداوي',
        title: 'أخصائية تأهيل إصابات الملاعب والعلاج الوظيفي',
        degrees: ['بكالوريوس علاج طبيعي - جامعة العلوم والتكنولوجيا', 'دبلوم تأهيل الرياضيين والإصابات العضلية - سويسرا'],
        subspecialty: 'إصابات الأربطة والغضاريف، التمارين العلاجية المتقدمة، والعلاج اليدوي',
        experienceYears: 8,
        bio: 'خبرة متميزة في برامج إعادة تأهيل الرياضيين والتعافي السريع من التمزقات العضلية وإصابات الركبة والكتف.'
      },
      {
        name: 'المعالج حمزة التل',
        title: 'أخصائي العلاج اليدوي والطب التكميلي والحجامة الطبية',
        degrees: ['دبلوم العلاج الطبيعي والطب التكميلي المعتمد', 'ترخيص رسمي لممارسة الحجامة العلاجية المعقمة من وزارة الصحة'],
        subspecialty: 'الإبر الجافة (Dry Needling)، الحجامة الوقائية والعلاجية، والمساج العلاجي العميق',
        experienceYears: 10,
        bio: 'متخصص في تخفيف الشد العضلي المزمن وتنشيط الدورة الدموية وفق أعلى معايير التعقيم الطبي.'
      }
    ];
  }

  if (text.includes('مستشف') || text.includes('مركز شامل') || text.includes('مراكز شاملة') || text.includes('مجمع طبي')) {
    return [
      {
        name: `د. ${business.ownerName || 'خالد العزام'}`,
        title: 'المدير الطبي ورئيس الهيئة الاستشارية',
        degrees: ['البورد الأردني والبورد العربي في الجراحة العامة والمناظير', 'زميل كلية الجراحين الملكية (FRCS)', 'استشاري سابق بمستشفى الملك المؤسس'],
        subspecialty: 'إدارة الرعاية الطبية، جراحة المناظير المتقدمة، ورعاية الحالات الحرجة',
        experienceYears: 20,
        bio: `يقود الكادر الطبي في ${facilityName} لضمان تقديم أعلى المعايير العلاجية والجراحية المعتمدة عالمياً.`
      },
      {
        name: 'د. سامر القاسم',
        title: 'استشاري طب الطوارئ والحوادث ورئيس قسم الإسعاف',
        degrees: ['البورد الأردني في طب الطوارئ والإنعاش', 'زمالة الكلية الأمريكية لأطباء الطوارئ (FACEP)'],
        subspecialty: 'طب الطوارئ المتقدم، إنعاش القلب، ورعاية الإصابات والحوادث الحرجة',
        experienceYears: 15,
        bio: 'يشرف على قسم الطوارئ 24 ساعة والتعامل السريع والفوري مع كافة الحالات الإسعافية والطارئة.'
      },
      {
        name: 'د. ليلى الشبول',
        title: 'استشارية أمراض الباطنية والقلب والأوعية الدموية',
        degrees: ['البورد الأردني في الأمراض الباطنية', 'زمالة أمراض القلب وتخطيط صدى القلب المتقدم'],
        subspecialty: 'علاج ارتفاع ضغط الدم، أمراض الشرايين، والقصور القلبي',
        experienceYears: 13,
        bio: 'متابعة شاملة لمرضى القلب والأمراض المزمنة في العيادات الخارجية وأقسام الإقامة الطبية.'
      }
    ];
  }

  return [
    deriveDefaultDoctor(business)
  ];
}

export function getMedicalProfile(business?: Business | null): MedicalFacilityInfo {
  // If business is null/undefined, return safe standard medical profile
  if (!business) {
    return {
      insurances: POPULAR_JORDANIAN_INSURANCES.slice(0, 8),
      acceptsInsuranceDirectBilling: true,
      insuranceNotes: 'نقبل بطاقات التأمين والنقابات المهنية المعتمدة مع خدمة الفحص والموافقة المباشرة.',
      showMedicalStaff: true,
      doctorsList: [],
      doctorProfile: {
        name: 'د. الطبيب الاستشاري المعتمد',
        title: 'استشاري ورئيس الكادر الطبي المعتمد',
        degrees: ['البورد الأردني التخصصي', 'عضو نقابة الأطباء الأردنية', 'خبرة سريرية في كبرى المستشفيات التعليمية'],
        subspecialty: 'الرعاية الطبية والتشخيص السريري المتقدم',
        experienceYears: 15,
        bio: 'طبيب استشاري متخصص يقدم رعاية طبية متكاملة وفق أحدث البروتوكولات الطبية العالمية.'
      },
      licenseNumber: 'JMA-IRB-2024/01',
      accreditationBody: 'منشأة معتمدة ومرخصة رسمياً من وزارة الصحة الأردنية ونقابة الأطباء',
      consultationFee: '15 - 20 د.أ (حسب تسعيرة نقابة الأطباء)',
      followUpPolicy: 'المراجعة الطبية مجانية خلال 14 يوماً من تاريخ الكشف',
      appointmentDurationMinutes: 20,
      appointmentTypes: ['in_clinic', 'urgent', 'telemedicine'],
      bookingNotice: 'يتم تأكيد الموعد فورياً عبر الواتساب أو الهاتف لتحديد التوقيت الأنسب بدون انتظار.',
      procedures: [],
      has24Emergency: false,
      emergencyPhone: '',
      onCallService: true,
      offersHomeVisits: false,
      homeVisitPhone: '',
      showEquipments: true,
      equipments: [],
      showAmenities: true,
      hasWheelchairAccess: true,
      hasElevator: true,
      hasParking: true,
      hasFemaleStaff: true,
      hasKidsArea: false,
      paymentMethods: ['نقد (Cash)', 'بطاقات ائتمان (Visa / MasterCard)', 'كليك (CliQ)', 'تأمين صحي معتمد'],
      medicalRatingMetrics: {
        waitingTimeScore: 4.8,
        doctorListeningScore: 4.9,
        cleanlinessScore: 5.0,
        staffFriendlinessScore: 4.8
      }
    };
  }

  // If business already has explicit medical profile data stored in DB, use it
  if (business.medicalProfile && Object.keys(business.medicalProfile).length > 0) {
    const isStaffElig = isStaffTabEligible(business);
    const existingDoctorsList = business.medicalProfile.doctorsList && business.medicalProfile.doctorsList.length > 0
      ? business.medicalProfile.doctorsList
      : (isStaffElig ? deriveDefaultStaff(business) : []);

    return {
      insurances: business.medicalProfile.insurances || POPULAR_JORDANIAN_INSURANCES.slice(0, 6),
      acceptsInsuranceDirectBilling: business.medicalProfile.acceptsInsuranceDirectBilling ?? true,
      insuranceNotes: business.medicalProfile.insuranceNotes || 'نقبل معظم بطاقات التأمين والنقابات المهنية المعتمدة مع خدمة التأكيد الفوري.',
      showMedicalStaff: business.medicalProfile.showMedicalStaff ?? true,
      doctorsList: existingDoctorsList,
      doctorProfile: business.medicalProfile.doctorProfile || deriveDefaultDoctor(business),
      licenseNumber: business.medicalProfile.licenseNumber || 'JMA-IRB-2024/88',
      accreditationBody: business.medicalProfile.accreditationBody || 'منشأة وكادر طبي مرخص ومعتمد من وزارة الصحة ونقابة الأطباء الأردنية',
      consultationFee: business.medicalProfile.consultationFee || 'حسب تسعيرة نقابة الأطباء الأردنية',
      followUpPolicy: business.medicalProfile.followUpPolicy || 'المراجعة مجانية خلال 14 يوماً من تاريخ الكشف',
      appointmentDurationMinutes: business.medicalProfile.appointmentDurationMinutes || 20,
      appointmentTypes: business.medicalProfile.appointmentTypes || ['in_clinic', 'urgent', 'telemedicine'],
      bookingNotice: business.medicalProfile.bookingNotice || 'يفضل الحجز المسبق لتجنب الانتظار. الحالات الطارئة لها الأولوية.',
      procedures: business.medicalProfile.procedures || deriveDefaultProcedures(business),
      has24Emergency: business.medicalProfile.has24Emergency ?? Boolean(business.workingHours?.isOpen24Hours || (business.category || '').includes('طوارئ') || (business.category || '').includes('مستشفى')),
      emergencyPhone: business.medicalProfile.emergencyPhone || business.phone || '',
      onCallService: business.medicalProfile.onCallService ?? true,
      offersHomeVisits: business.medicalProfile.offersHomeVisits ?? ((business.category || '').includes('علاج طبيعي') || (business.category || '').includes('تمريض')),
      homeVisitPhone: business.medicalProfile.homeVisitPhone || business.phone || '',
      showEquipments: business.medicalProfile.showEquipments ?? true,
      equipments: business.medicalProfile.equipments || deriveDefaultEquipment(business),
      showAmenities: business.medicalProfile.showAmenities ?? true,
      hasWheelchairAccess: business.medicalProfile.hasWheelchairAccess ?? true,
      hasElevator: business.medicalProfile.hasElevator ?? true,
      hasParking: business.medicalProfile.hasParking ?? true,
      hasFemaleStaff: business.medicalProfile.hasFemaleStaff ?? true,
      hasKidsArea: business.medicalProfile.hasKidsArea ?? ((business.category || '').includes('أطفال') || (business.category || '').includes('أسنان')),
      paymentMethods: business.medicalProfile.paymentMethods || ['نقد (Cash)', 'بطاقات ائتمان (Visa / MasterCard)', 'كليك (CliQ)', 'تأمين صحي مباشر'],
      medicalRatingMetrics: business.medicalProfile.medicalRatingMetrics || {
        waitingTimeScore: 4.8,
        doctorListeningScore: 4.9,
        cleanlinessScore: 5.0,
        staffFriendlinessScore: 4.8
      }
    };
  }

  // Derive specialized smart default medical profile based on facility type
  const isDental = ((business.name || '') + (business.category || '') + (business.description || '')).includes('أسنان');
  const isLab = ((business.name || '') + (business.category || '') + (business.description || '')).includes('مختبر');
  const isHospital = ((business.name || '') + (business.category || '') + (business.description || '')).includes('مستشفى') || ((business.name || '') + (business.category || '')).includes('مركز صحي');
  const isPharmacy = ((business.name || '') + (business.category || '') + (business.description || '')).includes('صيدل');
  const isEye = ((business.name || '') + (business.category || '') + (business.description || '')).includes('عيون') || ((business.name || '') + (business.category || '')).includes('بصريات');
  const isRehab = ((business.name || '') + (business.category || '') + (business.description || '')).includes('علاج طبيعي') || ((business.name || '') + (business.category || '')).includes('تأهيل');

  const isStaffElig = isStaffTabEligible(business);

  return {
    insurances: POPULAR_JORDANIAN_INSURANCES.slice(0, 8),
    acceptsInsuranceDirectBilling: true,
    insuranceNotes: 'نقبل بطاقات التأمين والنقابات المهنية المعتمدة مع خدمة الفحص والموافقة المباشرة.',
    showMedicalStaff: true,
    doctorsList: isStaffElig ? deriveDefaultStaff(business) : [],
    doctorProfile: deriveDefaultDoctor(business),
    licenseNumber: `JMA-IRB-${Math.floor(1000 + Math.random() * 9000)}`,
    accreditationBody: 'منشأة معتمدة ومرخصة رسمياً من وزارة الصحة الأردنية ونقابة الأطباء',
    consultationFee: isDental ? 'كشفية وتشخيص مبدئي مجاني / حسب الإجراء' : isLab ? 'حسب الفحوصات المطلوبة وتعرفة وزارة الصحة' : isPharmacy ? 'تسعيرة المؤسسة العامة للغذاء والدواء JFDA' : '15 - 20 د.أ (حسب تسعيرة النقابة)',
    followUpPolicy: isLab || isPharmacy ? 'استلام النتائج والاستشارة التوضيحية مجانية' : 'المراجعة الطبية مجانية خلال 14 يوماً من تاريخ الكشف',
    appointmentDurationMinutes: isDental ? 30 : 20,
    appointmentTypes: ['in_clinic', 'urgent', 'telemedicine'],
    bookingNotice: 'يتم تأكيد الموعد فورياً عبر الواتساب أو الهاتف لتحديد التوقيت الأنسب بدون انتظار.',
    procedures: deriveDefaultProcedures(business),
    has24Emergency: isHospital || isPharmacy || business.workingHours?.isOpen24Hours || false,
    emergencyPhone: business.phone || '0790000000',
    onCallService: true,
    offersHomeVisits: isRehab || isLab || false,
    homeVisitPhone: business.phone || '',
    showEquipments: true,
    equipments: deriveDefaultEquipment(business),
    showAmenities: true,
    hasWheelchairAccess: true,
    hasElevator: true,
    hasParking: true,
    hasFemaleStaff: true,
    hasKidsArea: isDental || (business.category || '').includes('أطفال'),
    paymentMethods: ['نقد (Cash)', 'بطاقات ائتمان (Visa / MasterCard)', 'كليك (CliQ)', 'تأمين صحي معتمد'],
    medicalRatingMetrics: {
      waitingTimeScore: 4.8,
      doctorListeningScore: 4.9,
      cleanlinessScore: 5.0,
      staffFriendlinessScore: 4.8
    }
  };
}

function deriveDefaultDoctor(business: Business): MedicalDoctor {
  const name = business.name || '';
  const desc = business.description || '';
  const isDental = (name + desc).includes('أسنان');
  const isEye = (name + desc).includes('عيون');
  const isPediatric = (name + desc).includes('أطفال');
  const isCardio = (name + desc).includes('قلب');
  const isDerma = (name + desc).includes('جلد');
  const isRehab = (name + desc).includes('علاج طبيعي');

  if (isDental) {
    return {
      name: name.includes('دكتور') || name.includes('د.') ? name : `د. ${business.ownerName || 'محمد الشناق'}`,
      title: 'أخصائي طب وجراحة الفم وزراعة الأسنان',
      degrees: ['البورد الأردني في طب الأسنان', 'عضو الجمعية الأردنية لزراعة الأسنان', 'دبلوم تجميل وزراعة الأسنان - ألمانيا'],
      subspecialty: 'زراعة الأسنان الفورية والتركيبات التجميلية (E-Max & Zirconia)',
      experienceYears: 12,
      bio: 'خبرة طويلة في تقديم أحدث الحلول العلاجية والتجميلية للأسنان باستخدام أحدث تقنيات الليزر والمسح الضوئي الرقمي.'
    };
  }

  if (isEye) {
    return {
      name: name.includes('دكتور') || name.includes('د.') ? name : `د. ${business.ownerName || 'أحمد الروسان'}`,
      title: 'استشاري طب وجراحة العيون وتصحيح البصر والليزك',
      degrees: ['البورد الأردني والبورد العربي في طب وجراحة العيون', 'زميل كلية الجراحين الملكية البريطانية (FRCS)', 'استشاري سابق بمستشفى الملك المؤسس عبدالله الجامعي'],
      subspecialty: 'عمليات تصحيح النظر بالليزك والفيمتوليزك وزراعة العدسات والماء الأبيض',
      experienceYears: 16,
      bio: 'استشاري عيون متمرس أجرى آلاف العمليات الناجحة لتصحيح النظر وسحب الساد بتقنيات الفاكو والموجات فوق الصوتية الحديثة.'
    };
  }

  if (isCardio) {
    return {
      name: name.includes('دكتور') || name.includes('د.') ? name : `د. ${business.ownerName || 'طارق الخصاونة'}`,
      title: 'استشاري أمراض القلب والشرايين والقسطرة العلاجية',
      degrees: ['البورد الأمريكي في أمراض القلب والأوعية الدموية', 'البورد الأردني في أمراض الباطنية والقلب', 'زميل الكلية الأمريكية لطب القلب (FACC)'],
      subspecialty: 'القسطرة القلبية وتركيب الشبكات الذكية وتخطيط الإيكو المتقدم',
      experienceYears: 18,
      bio: 'أخصائي واستشاري قلب رائد في إربد يقدم تقييماً قلبياً شاملاً ورعاية دقيقة لمرضى الضغط والشرايين التاجية.'
    };
  }

  if (isPediatric) {
    return {
      name: name.includes('دكتور') || name.includes('د.') ? name : `د. ${business.ownerName || 'رنا بطاينة'}`,
      title: 'أخصائية طب الأطفال وحديثي الولادة والخدج',
      degrees: ['البورد الأردني في طب الأطفال', 'عضو الجمعية الأردنية لطب الأطفال', 'أخصائية سابقة في مستشفى الأميرة رحمة التعليمي'],
      subspecialty: 'متابعة نمو وتطور الأطفال، الحساسية الصدرية، والتغذية السليمة',
      experienceYears: 10,
      bio: 'رعاية صحية حنونة ومتخصصة للأطفال منذ لحظة الولادة وحتى سن المراهقة، مع متابعة دقيقة لبرامج التطعيم والنمو.'
    };
  }

  return {
    name: name.includes('دكتور') || name.includes('د.') ? name : `د. ${business.ownerName || 'خالد العزام'}`,
    title: 'استشاري ورئيس الكادر الطبي المعتمد',
    degrees: ['البورد الأردني التخصصي', 'عضو نقابة الأطباء الأردنية', 'خبرة سريرية في كبرى المستشفيات التعليمية بالمملكة'],
    subspecialty: business.category || 'الرعاية الطبية والتشخيص السريري المتقدم',
    experienceYears: 14,
    bio: 'طبيب استشاري متخصص يقدم رعاية طبية متكاملة وفق أحدث البرتوكولات العالمية المعتمدة مع الاهتمام بأعلى معايير سلامة المرضى.'
  };
}

function deriveDefaultProcedures(business: Business): MedicalProcedure[] {
  const text = (business.name + ' ' + business.category + ' ' + business.description).toLowerCase();

  if (text.includes('أسنان')) {
    return [
      { id: 'p1', name: 'فحص وتشخيص شامل مع تصوير شعاعي رقمي (Digital X-Ray)', category: 'فحوصات وتشخيص', duration: '20 دقيقة', price: 'مشمول بالتأمين / 10 د.أ', insuranceCovered: true, isPopular: true },
      { id: 'p2', name: 'تنظيف وتلميع الأسنان وإزالة الجير بالموجات فوق الصوتية', category: 'وقاية وعلاج اللثة', duration: '30 دقيقة', price: '20 - 25 د.أ', insuranceCovered: true, isPopular: true },
      { id: 'p3', name: 'علاج وسحب العصب بجلسة واحدة بتقنية Rotary الحديثة', category: 'علاج الجذور والأعصاب', duration: '45 دقيقة', price: 'حسب السن / تعرفة النقابة', insuranceCovered: true },
      { id: 'p4', name: 'زراعة الأسنان الألمانية والسويسرية الفورية مع ضمان', category: 'زراعة وجراحة الفم', duration: 'جلسة جراحية 40 دقيقة', price: 'يبدأ من 250 د.أ', insuranceCovered: false, isPopular: true },
      { id: 'p5', name: 'تبييض الأسنان بالليزر وتصميم ابتسامة هوليوود (E-Max)', category: 'تجميل الأسنان', duration: '45 دقيقة', price: 'عروض حصرية', insuranceCovered: false }
    ];
  }

  if (text.includes('مختبر')) {
    return [
      { id: 'l1', name: 'الفحص الطبي الشامل (Comprehensive Wellness Profile)', category: 'باقات الفحص الشامل', duration: 'نتائج خلال ساعتين', price: 'باقات تبدأ من 20 د.أ', insuranceCovered: true, preparationNotes: 'صيام 10-12 ساعة', isPopular: true },
      { id: 'l2', name: 'فحص وظائف الكبد والكلى والدهنيات والسكر التراكمي (HbA1c)', category: 'فحوصات دورية', duration: 'نتائج فورية', price: 'مغطى بالتأمين', insuranceCovered: true, isPopular: true },
      { id: 'l3', name: 'فحص فيتامين د (Vitamin D) ومخزون الحديد (Ferritin) وفيتامين B12', category: 'الفيتامينات والمعادن', duration: 'نتائج نفس اليوم', price: 'عرض خاص 15 د.أ', insuranceCovered: true },
      { id: 'l4', name: 'خدمة سحب العينات المنزلية لكبار السن والمرضى', category: 'رعاية منزلية', duration: 'حسب الموعد', price: 'مجاناً للمرضى', insuranceCovered: true, isPopular: true }
    ];
  }

  if (text.includes('عيون')) {
    return [
      { id: 'e1', name: 'فحص النظر الرقمي المحوسب وقياس ضغط العين والشبكية', category: 'تشخيص وفحص سريري', duration: '20 دقيقة', price: 'كشفية النقابة', insuranceCovered: true, isPopular: true },
      { id: 'e2', name: 'عمليات تصحيح النظر بالليزر والفيمتو ليزك (Custom Femto-LASIK)', category: 'جراحة تصحيح الإبصار', duration: '15 دقيقة للعينين', price: 'حسب الخطة العلاجية', insuranceCovered: false, isPopular: true },
      { id: 'e3', name: 'إزالة الساد والماء الأبيض بالموجات الصوتية (Phaco) وزراعة عدسات مرنة', category: 'جراحة اليوم الواحد', duration: '20 دقيقة', price: 'مغطى بجميع التأمينات', insuranceCovered: true }
    ];
  }

  return [
    { id: 'g1', name: 'الكشف السريري والتشخيص الطبي الشامل ومراجعة الفحوصات', category: 'استشارات وكشف', duration: '20 دقيقة', price: 'تعرفة نقابة الأطباء', insuranceCovered: true, isPopular: true },
    { id: 'g2', name: 'الفحوصات السريعة في العيادة (ضغط، سكر، تخطيط، علامات حيوية)', category: 'فحوصات سريرية', duration: '10 دقائق', price: 'مشمول مع الكشفية', insuranceCovered: true },
    { id: 'g3', name: 'المراجعة الطبية وتقييم نتائج الأدوية واستجابة المريض', category: 'متابعة دورية', duration: '15 دقيقة', price: 'مجاناً خلال 14 يوماً', insuranceCovered: true, isPopular: true },
    { id: 'g4', name: 'الاستشارة الطبية العاجلة للحالات الطارئة ومتابعة ما بعد العلاج', category: 'طوارئ واستشارات', duration: 'فوري', price: 'متاح على مدار الساعة', insuranceCovered: true }
  ];
}

function deriveDefaultEquipment(business: Business): MedicalEquipment[] {
  const text = (business.name + ' ' + business.category + ' ' + business.description).toLowerCase();

  if (text.includes('أسنان')) {
    return [
      { name: 'جهاز الأشعة البانورامية وثلاثية الأبعاد (3D CBCT)', brandOrOrigin: 'ألماني Sirona', description: 'تصوير رقمي عالي الدقة لتقييم عظام الفك وزراعة الأسنان بأمان تام.' },
      { name: 'الماسح الضوئي الفموي ثلاثي الأبعاد (3D Intraoral Scanner)', brandOrOrigin: '3Shape الدنماركي', description: 'أخذ مقاسات الأسنان والتركيبات رقمياً بدون استخدام معجون الطبعات التقليدي المزعج.' },
      { name: 'جهاز الليزر المائي وجراحة الأنسجة والتعقيم (Biolase WaterLase)', brandOrOrigin: 'أمريكي', description: 'علاج اللثة وتجميل الابتسامة بدون ألم أو نزيف وسرعة التئام مذهلة.' },
      { name: 'أجهزة التعقيم بالأوتوكلاف الفئة B (Class B Autoclave)', brandOrOrigin: 'Euronda إيطالي', description: 'أعلى معايير التعقيم العالمية المعتمدة لضمان أقصى درجات الأمان ومكافحة العدوى.' }
    ];
  }

  if (text.includes('مختبر')) {
    return [
      { name: 'محلل الكيمياء الحيوية الآلي بالكامل (Cobas Auto-Analyzer)', brandOrOrigin: 'Roche السويسري', description: 'دقة فائقة في تحليل السكر والدهون ووظائف الكبد والكلى في دقائق معدودة.' },
      { name: 'جهاز الهرمونات والمناعة الجزيئية (Architect i1000SR)', brandOrOrigin: 'Abbott الأمريكي', description: 'فحص دقيق لهرمونات الغدة الدرقية، الخصوبة، دلالات الأورام، والفيتامينات.' },
      { name: 'محلل الدم الشامل خماسي الفئات (5-Part Hematology Analyzer)', brandOrOrigin: 'Sysmex الياباني', description: 'فحص مكونات الدم وقوة الدم والصفائح الدموية بدقة ميكروسكوبية متقدمة.' }
    ];
  }

  return [
    { name: 'جهاز السونار والدوبلر الملون عالي الدقة (HD Color Ultrasound)', brandOrOrigin: 'GE Healthcare أمريكي', description: 'تشخيص دقيق وفحص سريري فوري للأعضاء الداخلية والأوعية الدموية.' },
    { name: 'جهاز تخطيط القلب الرقمي المتقدم (12-Lead ECG Monitor)', brandOrOrigin: 'Schiller السويسري', description: 'تسجيل وتحليل فوري لنبضات القلب والنشاط الكهربائي بدقة عالية.' },
    { name: 'أنظمة التعقيم والفلترة الهوائية الطبية (HEPA Air Sterilization)', brandOrOrigin: 'معايير WHO الطبية', description: 'تعقيم مستمر لغرف الكشف والانتظار لضمان بيئة صحية وآمنة للمرضى.' }
  ];
}
