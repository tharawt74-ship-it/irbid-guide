import React, { useState, useMemo } from 'react';
import { 
  Stethoscope, 
  Building2, 
  Search, 
  Filter, 
  Plus, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Phone, 
  MessageSquare, 
  MapPin, 
  Edit3, 
  Trash2, 
  Star, 
  ExternalLink, 
  Pill, 
  Microscope, 
  Heart, 
  Activity, 
  AlertCircle, 
  Check, 
  X, 
  Award,
  DollarSign,
  Eye
} from 'lucide-react';
import { RequestDetailsModal } from './RequestDetailsModal';
import { Business, MedicalFacilityInfo, MedicalProcedure } from '../../types';
import { doc, updateDoc, deleteDoc, setDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { invalidateCache } from '../../lib/dataCache';
import { deleteBusinessCascading } from '../../lib/businessDeleteHelper';
import { useConfirm } from '../../contexts/ConfirmContext';
import { Link } from 'react-router';
import { getWhatsAppUrl } from '../../lib/contactHelper';
import { WhatsAppIcon } from '../common/WhatsAppIcon';
import { recordAuditLog } from '../../lib/auditLogHelper';
import { applyNewBusinessWelcomeGift } from '../../lib/vipHelper';
import { compressAndSanitizeFirestorePayload } from '../../lib/firestoreHelper';

interface MedicalFacilitiesManagerProps {
  businesses: Business[];
  requests?: any[];
  initialSubTab?: 'facilities' | 'requests';
  onRefresh: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  currentUserEmail?: string;
  userRole?: string;
}

export function MedicalFacilitiesManager({
  businesses,
  requests = [],
  initialSubTab = 'facilities',
  onRefresh,
  showToast,
  currentUserEmail,
  userRole
}: MedicalFacilitiesManagerProps) {
  const { confirm } = useConfirm();

  // Active Sub-Tab (Facilities vs Requests)
  const [activeSubTab, setActiveSubTab] = useState<'facilities' | 'requests'>(initialSubTab);

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'featured' | 'emergency'>('all');
  const [regionFilter, setRegionFilter] = useState('all');

  // Edit Modal State
  const [editingFacility, setEditingFacility] = useState<Business | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: '',
    category: '',
    district: '',
    address: '',
    phone: '',
    whatsapp: '',
    doctorName: '',
    doctorTitle: '',
    degrees: '',
    licenseNumber: '',
    consultationFee: '',
    emergency24h: false,
    showMedicalStaff: true,
    showEquipments: true,
    showAmenities: true,
    isVerified: true,
    isFeatured: false
  });

  // Request Details Modal state
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedRequestForDetails, setSelectedRequestForDetails] = useState<any | null>(null);

  // Extract all medical requests
  const medicalRequests = useMemo(() => {
    const fromReqs = requests.filter((r: any) => {
      if (r.requestType === 'medical_facility_registration') return true;
      if (r.medicalProfile) return true;
      const cat = (r.category || r.subCategory || '').toLowerCase();
      const name = (r.name || '').toLowerCase();
      const desc = (r.description || '').toLowerCase();
      return (
        cat.includes('طب') ||
        cat.includes('صحة') ||
        cat.includes('عياد') ||
        cat.includes('مستشف') ||
        cat.includes('مختبر') ||
        cat.includes('صيدل') ||
        cat.includes('علاج طبيعي') ||
        cat.includes('أسنان') ||
        cat.includes('تجميل') ||
        cat.includes('رعاية') ||
        name.includes('دكتور') ||
        name.includes('عيادة') ||
        name.includes('مركز طبي') ||
        name.includes('صيدلية') ||
        name.includes('مختبر') ||
        desc.includes('طبيب') ||
        desc.includes('طبي')
      );
    });

    const pendingBusinesses = businesses.filter((b: any) => {
      if (b.status !== 'pending') return false;
      if (b.medicalProfile) return true;
      const cat = (b.category || b.subCategory || '').toLowerCase();
      const name = (b.name || '').toLowerCase();
      const desc = (b.description || '').toLowerCase();
      return (
        cat.includes('طب') ||
        cat.includes('صحة') ||
        cat.includes('عياد') ||
        cat.includes('مستشف') ||
        cat.includes('مختبر') ||
        cat.includes('صيدل') ||
        cat.includes('علاج طبيعي') ||
        cat.includes('أسنان') ||
        cat.includes('تجميل') ||
        cat.includes('رعاية') ||
        name.includes('دكتور') ||
        name.includes('عيادة') ||
        name.includes('مركز طبي') ||
        name.includes('صيدلية') ||
        name.includes('مختبر') ||
        desc.includes('طبيب') ||
        desc.includes('طبي')
      );
    });

    const map = new Map<string, any>();
    fromReqs.forEach(r => map.set(r.id, r));
    pendingBusinesses.forEach(b => {
      if (!map.has(b.id) && !map.has(b.requestId)) {
        map.set(b.id, b);
      }
    });

    return Array.from(map.values());
  }, [requests, businesses]);

  const pendingRequestsCount = useMemo(() => {
    return medicalRequests.filter((r: any) => r.status === 'pending').length;
  }, [medicalRequests]);

  const handleApproveMedicalRequest = async (req: any) => {
    try {
      let targetId = req.id;
      const now = Date.now();
      const existingBiz = businesses.find(b => b.id === req.id || b.requestId === req.id);
      
      let chosenPlan: 'basic' | 'golden' = 'basic';
      if (
        req.isVipTrial || 
        req.selectedPackagePlan === 'basic' || 
        req.packagePlan === 'basic' || 
        existingBiz?.selectedPackagePlan === 'basic' ||
        existingBiz?.packagePlan === 'basic' || 
        existingBiz?.isVipTrial ||
        req.billingPeriod === 'lifetime'
      ) {
        chosenPlan = 'basic';
      } else if (
        req.packagePlan === 'golden' || 
        req.packagePlan === 'vip' || 
        req.selectedPackagePlan === 'golden' || 
        req.selectedPackagePlan === 'vip' || 
        existingBiz?.packagePlan === 'golden'
      ) {
        chosenPlan = 'golden';
      } else {
        chosenPlan = 'basic';
      }

      const billingPeriod = chosenPlan === 'basic' ? 'lifetime' : (req.billingPeriod || existingBiz?.billingPeriod || 'yearly');
      const gift = applyNewBusinessWelcomeGift(chosenPlan, billingPeriod, now);

      if (existingBiz) {
        targetId = existingBiz.id;
        await updateDoc(doc(db, 'businesses', existingBiz.id), {
          status: 'approved',
          packagePlan: gift.packagePlan,
          selectedPackagePlan: chosenPlan,
          isVip: gift.isVip,
          isVipTrial: gift.isVipTrial,
          billingPeriod: billingPeriod,
          vipSubscriptionStartsAt: gift.vipSubscriptionStartsAt,
          vipSubscriptionExpiresAt: gift.vipSubscriptionExpiresAt,
          isVerified: gift.isVerified,
          isFeatured: gift.isFeatured,
          featuredStartDate: gift.featuredStartDate || null,
          featuredExpiryDate: gift.featuredExpiryDate || null,
          updatedAt: now
        });
      } else {
        const docRef = doc(collection(db, 'businesses'));
        targetId = docRef.id;
        const newBizData: Partial<Business> = {
          name: req.name,
          category: req.category || 'عيادات ومراكز طبية',
          description: req.description || '',
          address: req.address || 'إربد',
          district: req.district || 'شارع الجامعة',
          phone: req.phone || '',
          ownerName: req.ownerName || '',
          ownerEmail: req.userEmail || req.ownerEmail || '',
          imageUrl: req.imageUrl || req.coverImageUrl || 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=600',
          isVerified: gift.isVerified,
          isFeatured: gift.isFeatured,
          featuredStartDate: gift.featuredStartDate || null,
          featuredExpiryDate: gift.featuredExpiryDate || null,
          packagePlan: gift.packagePlan,
          selectedPackagePlan: chosenPlan,
          isVip: gift.isVip,
          isVipTrial: gift.isVipTrial,
          billingPeriod: billingPeriod,
          vipSubscriptionStartsAt: gift.vipSubscriptionStartsAt,
          vipSubscriptionExpiresAt: gift.vipSubscriptionExpiresAt,
          paymentMethods: req.paymentMethods || (req.medicalProfile?.paymentMethods) || ['كاش', 'فيزا', 'كليك'],
          status: 'approved',
          createdAt: req.createdAt || now,
          ...(req.googlePlaceUrl ? { googlePlaceUrl: req.googlePlaceUrl } : {}),
          medicalProfile: req.medicalProfile || {
            doctorProfile: {
              name: req.ownerName || req.name,
              title: 'طبيب اختصاصي / استشاري',
              degrees: []
            },
            has24Emergency: false
          }
        };
        const sanitized = await compressAndSanitizeFirestorePayload(newBizData, false);
        await setDoc(docRef, sanitized);
      }

      if (req.id) {
        try {
          await updateDoc(doc(db, 'businessRequests', req.id), { status: 'approved' });
        } catch (e) {
          // Record might be in businesses only
        }
      }

      // Broadcast welcome notification to all users and visitors
      try {
        const notifMessage = gift.isFeatured
          ? `انضمت منشأة ${req.name} رسمياً إلى دليل الرعاية الطبية بالباقة الذهبية VIP مع ميزة (صدارة البحث والإطار المميز) وعلامة ممول مجاناً لمدة أسبوع!`
          : `انضمت منشأة ${req.name} رسمياً إلى دليل الرعاية الطبية والصحية في شو في بإربد! أهلاً وسهلاً بهم.`;

        const notifDoc = {
          title: `تم توثيق منشأة طبية جديدة: ${req.name} 🩺`,
          message: notifMessage,
          type: 'business',
          link: `/business/${targetId}`,
          badge: gift.isFeatured ? 'صدارة وممول ⭐' : 'منشأة طبية جديدة 🩺',
          userId: 'all',
          businessId: targetId,
          businessName: req.name,
          businessLogoUrl: req.imageUrl || req.coverImageUrl || req.image || req.logoUrl || '',
          createdAt: now
        };
        const sanitizedNotif = await compressAndSanitizeFirestorePayload(notifDoc, false);
        await addDoc(collection(db, 'notifications'), sanitizedNotif);
      } catch (notifErr) {
        console.warn("Could not create approval broadcast notification:", notifErr);
      }

      invalidateCache();
      const toastMsg = gift.isFeatured
        ? `تم قبول وتوثيق (${req.name}) بالباقة الذهبية مع ميزة (المميز/صدارة البحث) بالإطار الذهبي وعلامة ممول لمدة أسبوع!`
        : `تم قبول وتوثيق (${req.name}) بالباقة الأساسية بنجاح!`;

      showToast(toastMsg, 'success');
      recordAuditLog({
        action: 'APPROVE_MEDICAL_REQUEST',
        actionAr: 'الموافقة وتوثيق منشأة طبية جديدة',
        details: `تم توثيق وإنشاء المنشأة الطبية ${req.name}`,
        performedBy: currentUserEmail || userRole || 'المشرف',
        userRole,
        targetId,
        targetName: req.name,
        timestamp: Date.now()
      });
      onRefresh();
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء تفعيل المنشأة الطبية', 'error');
    }
  };

  const handleRejectMedicalRequest = async (reqId: string, reqName: string) => {
    if (!(await confirm({ message: `هل أنت متأكد من رفض طلب المنشأة الطبية (${reqName})؟` }))) return;
    try {
      try {
        await updateDoc(doc(db, 'businessRequests', reqId), { status: 'rejected' });
      } catch (e) {}
      try {
        await updateDoc(doc(db, 'businesses', reqId), { status: 'rejected' });
      } catch (e) {}
      invalidateCache();
      showToast(`تم رفض الطلب (${reqName})`, 'info');
      onRefresh();
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء رفض الطلب', 'error');
    }
  };

  // Extract all medical businesses
  const medicalBusinesses = useMemo(() => {
    return businesses.filter(b => {
      if (b.medicalProfile) return true;
      const cat = (b.category || '').toLowerCase();
      const name = (b.name || '').toLowerCase();
      const desc = (b.description || '').toLowerCase();
      return (
        cat.includes('طب') ||
        cat.includes('صحة') ||
        cat.includes('عياد') ||
        cat.includes('مستشف') ||
        cat.includes('مختبر') ||
        cat.includes('صيدل') ||
        cat.includes('علاج طبيعي') ||
        cat.includes('أسنان') ||
        name.includes('دكتور') ||
        name.includes('عيادة') ||
        name.includes('مركز طبي') ||
        name.includes('صيدلية') ||
        name.includes('مختبر') ||
        desc.includes('طبيب')
      );
    });
  }, [businesses]);

  // Filtered List
  const filteredList = useMemo(() => {
    return medicalBusinesses.filter(b => {
      // Type Filter
      if (typeFilter !== 'all') {
        const cat = (b.category || '').toLowerCase();
        if (typeFilter === 'clinic' && !cat.includes('عياد')) return false;
        if (typeFilter === 'hospital' && !cat.includes('مستشف')) return false;
        if (typeFilter === 'pharmacy' && !cat.includes('صيدل')) return false;
        if (typeFilter === 'lab' && !cat.includes('مختبر')) return false;
        if (typeFilter === 'physio' && !cat.includes('طبيعي')) return false;
      }

      // Status Filter
      if (statusFilter === 'verified' && !b.isVerified) return false;
      if (statusFilter === 'featured' && !b.isFeatured) return false;
      if (statusFilter === 'emergency' && !b.medicalProfile?.has24Emergency) return false;

      // Region Filter
      if (regionFilter !== 'all') {
        if (b.district !== regionFilter && !b.address?.includes(regionFilter)) return false;
      }

      // Search Filter
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const docName = b.medicalProfile?.doctorProfile?.name?.toLowerCase() || '';
        const docTitle = b.medicalProfile?.doctorProfile?.title?.toLowerCase() || '';
        const name = b.name?.toLowerCase() || '';
        const addr = b.address?.toLowerCase() || '';
        const phone = b.phone || '';
        const spec = b.medicalProfile?.procedures?.map(p => p.name.toLowerCase()).join(' ') || '';

        const match = 
          name.includes(q) || 
          docName.includes(q) || 
          docTitle.includes(q) || 
          addr.includes(q) || 
          phone.includes(q) || 
          spec.includes(q);

        if (!match) return false;
      }

      return true;
    });
  }, [medicalBusinesses, typeFilter, statusFilter, regionFilter, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    const total = medicalBusinesses.length;
    const clinics = medicalBusinesses.filter(b => (b.category || '').includes('عياد') || !b.category).length;
    const hospitals = medicalBusinesses.filter(b => (b.category || '').includes('مستشف')).length;
    const pharmacies = medicalBusinesses.filter(b => (b.category || '').includes('صيدل')).length;
    const labs = medicalBusinesses.filter(b => (b.category || '').includes('مختبر')).length;
    const emergency24h = medicalBusinesses.filter(b => b.medicalProfile?.has24Emergency).length;
    const verified = medicalBusinesses.filter(b => b.isVerified).length;
    return { total, clinics, hospitals, pharmacies, labs, emergency24h, verified };
  }, [medicalBusinesses]);

  // Actions
  const handleToggleVerified = async (b: Business) => {
    try {
      const nextState = !b.isVerified;
      await updateDoc(doc(db, 'businesses', b.id), { isVerified: nextState });
      invalidateCache();
      showToast(nextState ? `تم توثيق المنشأة (${b.name}) بنجاح 🛡️` : `تم إلغاء توثيق المنشأة (${b.name})`, 'success');
      recordAuditLog({
        action: 'VERIFY_BUSINESS',
        actionAr: 'تغيير حالة توثيق منشأة طبية',
        details: `تم ${nextState ? 'توثيق' : 'إلغاء توثيق'} ${b.name}`,
        performedBy: currentUserEmail || userRole || 'المشرف',
        userRole,
        targetId: b.id,
        targetName: b.name,
        timestamp: Date.now()
      });
      onRefresh();
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء تعديل التوثيق', 'error');
    }
  };

  const handleToggleFeatured = async (b: Business) => {
    try {
      const nextState = !b.isFeatured;
      await updateDoc(doc(db, 'businesses', b.id), { isFeatured: nextState });
      invalidateCache();
      showToast(nextState ? `تم تمييز المنشأة (${b.name}) في صدارة البحث ⭐` : `تم إلغاء تمييز المنشأة (${b.name})`, 'success');
      onRefresh();
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء تعديل التمييز', 'error');
    }
  };

  const handleDelete = async (b: Business) => {
    if (!(await confirm({ message: `تحذير: هل أنت متأكد من حذف المنشأة الطبية (${b.name}) نهائياً وكافة بياناتها وعروضها الملحقة من قاعدة البيانات؟` }))) return;

    try {
      await deleteBusinessCascading(b.id, b.name);
      invalidateCache();
      showToast(`تم حذف المنشأة (${b.name}) وكافة بياناتها الملحقة بنجاح`, 'info');
      recordAuditLog({
        action: 'DELETE_BUSINESS',
        actionAr: 'حذف منشأة طبية',
        details: `تم حذف المنشأة الطبية ${b.name}`,
        performedBy: currentUserEmail || userRole || 'المشرف',
        userRole,
        targetId: b.id,
        targetName: b.name,
        timestamp: Date.now()
      });
      onRefresh();
    } catch (err) {
      console.error(err);
      showToast('تعذر حذف المنشأة الطبية', 'error');
    }
  };

  const openEditModal = (b: Business) => {
    setEditingFacility(b);
    setEditFormData({
      name: b.name || '',
      category: b.category || 'عيادات ومراكز طبية',
      district: b.district || 'شارع الجامعة',
      address: b.address || '',
      phone: b.phone || '',
      whatsapp: b.socialLinks?.whatsapp || (b as any).whatsapp || '',
      doctorName: b.medicalProfile?.doctorProfile?.name || b.ownerName || '',
      doctorTitle: b.medicalProfile?.doctorProfile?.title || 'طبيب اختصاصي / استشاري',
      degrees: (b.medicalProfile?.doctorProfile?.degrees || []).join('، '),
      licenseNumber: b.medicalProfile?.doctorProfile?.licenseNumber || '',
      consultationFee: b.medicalProfile?.consultationFee || '',
      emergency24h: b.medicalProfile?.has24Emergency || false,
      showMedicalStaff: b.medicalProfile?.showMedicalStaff ?? true,
      showEquipments: b.medicalProfile?.showEquipments ?? true,
      showAmenities: b.medicalProfile?.showAmenities ?? true,
      isVerified: b.isVerified ?? true,
      isFeatured: b.isFeatured ?? false
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFacility) return;

    try {
      const parsedDegrees = editFormData.degrees.split(/[,،\n]/).map(d => d.trim()).filter(Boolean);
      
      const updatedMedicalProfile: MedicalFacilityInfo = {
        ...(editingFacility.medicalProfile || {}),
        doctorProfile: {
          ...(editingFacility.medicalProfile?.doctorProfile || { degrees: [] }),
          name: editFormData.doctorName,
          title: editFormData.doctorTitle,
          degrees: parsedDegrees,
          licenseNumber: editFormData.licenseNumber
        },
        has24Emergency: editFormData.emergency24h,
        consultationFee: editFormData.consultationFee,
        showMedicalStaff: editFormData.showMedicalStaff,
        showEquipments: editFormData.showEquipments,
        showAmenities: editFormData.showAmenities
      };

      await updateDoc(doc(db, 'businesses', editingFacility.id), {
        name: editFormData.name,
        category: editFormData.category,
        district: editFormData.district,
        address: editFormData.address,
        phone: editFormData.phone,
        'socialLinks.whatsapp': editFormData.whatsapp || null,
        medicalProfile: updatedMedicalProfile,
        isVerified: editFormData.isVerified,
        isFeatured: editFormData.isFeatured
      });

      invalidateCache();
      showToast(`تم تحديث بيانات المنشأة (${editFormData.name}) بنجاح`, 'success');
      setIsEditModalOpen(false);
      setEditingFacility(null);
      onRefresh();
    } catch (err) {
      console.error(err);
      showToast('حدث خطأ أثناء حفظ التعديلات', 'error');
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      
      {/* Top Header Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-[#1a4d2e] text-white shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shrink-0">
            <Stethoscope className="h-6 w-6 text-emerald-300 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <span>إدارة الرعاية والمنشآت الطبية</span>
              <span className="text-xs bg-emerald-500/30 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                {stats.total} منشأة مسجلة
              </span>
            </h2>
            <p className="text-xs text-emerald-100/80 font-bold mt-0.5">
              لوحة تحكم منفصلة لمتابعة الأطباء، العيادات، المستشفيات، الصيدليات والمختبرات المعتمدة في إربد.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
          <Link
            to="/medical/register"
            target="_blank"
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black shadow-xs transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>تسجيل منشأة طبية جديدة</span>
          </Link>
          <Link
            to="/medical"
            target="_blank"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-colors"
          >
            <span>عرض دليل الرعاية</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Sub-Tabs Selector Bar for Medical Care */}
      <div className="bg-stone-100 p-1.5 rounded-2xl border border-stone-200/80 flex items-center gap-1.5 shadow-inner">
        <button
          onClick={() => setActiveSubTab('facilities')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            activeSubTab === 'facilities'
              ? 'bg-[#1a4d2e] text-white shadow-xs scale-101'
              : 'text-stone-600 hover:bg-stone-200 hover:text-stone-900 bg-white border border-stone-200/60'
          }`}
        >
          <Stethoscope className="h-4 w-4 text-[#ff9f1c]" />
          <span>إدارة ودليل المنشآت الطبية ({medicalBusinesses.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('requests')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer relative ${
            activeSubTab === 'requests'
              ? 'bg-[#1a4d2e] text-white shadow-xs scale-101'
              : 'text-stone-600 hover:bg-stone-200 hover:text-stone-900 bg-white border border-stone-200/60'
          }`}
        >
          <Building2 className="h-4 w-4 text-[#ff9f1c]" />
          <span>طلبات تسجيل المنشآت الطبية ({medicalRequests.length})</span>
          {pendingRequestsCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse shadow-xs mr-1">
              {pendingRequestsCount} جديد
            </span>
          )}
        </button>
      </div>

      {activeSubTab === 'facilities' && (
        <div className="space-y-6">
          {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-3xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold mb-1">
            <span>العيادات الخاصة</span>
            <Stethoscope className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-stone-900">{stats.clinics}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-3xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold mb-1">
            <span>المستشفيات والمراكز</span>
            <Building2 className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-stone-900">{stats.hospitals}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-3xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold mb-1">
            <span>الصيدليات المعتمدة</span>
            <Pill className="h-4 w-4 text-teal-600" />
          </div>
          <div className="text-xl font-black text-stone-900">{stats.pharmacies}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-3xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold mb-1">
            <span>المختبرات والتحاليل</span>
            <Microscope className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-xl font-black text-stone-900">{stats.labs}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-3xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold mb-1">
            <span>طوارئ 24 ساعة</span>
            <Activity className="h-4 w-4 text-red-600" />
          </div>
          <div className="text-xl font-black text-red-600">{stats.emergency24h}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-stone-200/80 shadow-3xs">
          <div className="flex items-center justify-between text-stone-500 text-xs font-bold mb-1">
            <span>منشآت موثقة 🛡️</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-xl font-black text-emerald-700">{stats.verified}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-stone-200/80 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="h-4 w-4 text-stone-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="ابحث باسم الطبيب، العيادة، الصيدلية، الهاتف، أو الاختصاص..."
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl pr-10 pl-4 py-2.5 text-xs sm:text-sm font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700 font-bold"
              >
                مسح ×
              </button>
            )}
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">جميع أنواع المنشآت ({stats.total})</option>
            <option value="clinic">عيادات خاصة</option>
            <option value="hospital">مستشفيات ومراكز طبية</option>
            <option value="pharmacy">صيدليات</option>
            <option value="lab">مختبرات وأشعة</option>
            <option value="physio">علاج طبيعي وتأهيل</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-stone-50 border border-stone-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">كل الحالات</option>
            <option value="verified">الموثقة فقط 🛡️</option>
            <option value="featured">المميزة VIP ⭐</option>
            <option value="emergency">طوارئ 24 ساعة 🚨</option>
          </select>
        </div>
      </div>

      {/* Facilities Table / List */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-stone-200/80 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-stone-900">
              قائمة المنشآت الطبية المسجلة ({filteredList.length})
            </h3>
          </div>
          <span className="text-[11px] font-bold text-stone-500">
            بيانات مباشرة من قاعدة بيانات Firestore
          </span>
        </div>

        {filteredList.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <Stethoscope className="h-8 w-8" />
            </div>
            <h4 className="text-base font-black text-stone-800">لا توجد منشآت طبية مطابقة لفلتر البحث</h4>
            <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
              يمكنك تغيير معايير البحث أو إضافة أول منشأة طبية جديدة فورياً من النموذج المعتمد.
            </p>
            <Link
              to="/medical/register"
              target="_blank"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-2xl bg-[#1a4d2e] hover:bg-[#143d24] text-white text-xs font-black shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>إضافة منشأة طبية الآن</span>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-50 text-stone-500 font-bold border-b border-stone-200/60">
                <tr>
                  <th className="py-3 px-4">المنشأة والطبيب</th>
                  <th className="py-3 px-4">التصنيف والمنطقة</th>
                  <th className="py-3 px-4">التأمينات والخدمات</th>
                  <th className="py-3 px-4">الهاتف والطوارئ</th>
                  <th className="py-3 px-4">الحالة والتوثيق</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-bold text-stone-700">
                {filteredList.map(b => {
                  const docProfile = b.medicalProfile?.doctorProfile;
                  const insurancesCount = b.medicalProfile?.insurances?.length || 0;
                  const is24h = b.medicalProfile?.has24Emergency;
                  const whatsappNumber = b.socialLinks?.whatsapp || (b as any).whatsapp;

                  return (
                    <tr key={b.id} className="hover:bg-emerald-50/30 transition-colors">
                      
                      {/* Name & Doctor */}
                      <td className="py-3.5 px-4 min-w-[220px]">
                        <div className="flex items-center gap-3">
                          <img
                            src={b.imageUrl || 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&q=80&w=200'}
                            alt={b.name}
                            className="w-11 h-11 rounded-xl object-cover border border-stone-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <Link
                              to={`/business/${b.id}`}
                              target="_blank"
                              className="text-xs font-black text-stone-900 hover:text-emerald-700 transition-colors block truncate max-w-[200px]"
                            >
                              {b.name}
                            </Link>
                            {docProfile?.name && (
                              <div className="text-[11px] text-emerald-800 font-bold flex items-center gap-1 mt-0.5">
                                <Stethoscope className="h-3 w-3 text-emerald-600 shrink-0" />
                                <span className="truncate">{docProfile.name}</span>
                              </div>
                            )}
                            {docProfile?.title && (
                              <span className="text-[10px] text-stone-400 font-bold block truncate">
                                {docProfile.title}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Category & Region */}
                      <td className="py-3.5 px-4 min-w-[150px]">
                        <span className="inline-block px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700 text-[10px] font-black mb-1">
                          {b.category || 'رعاية طبية'}
                        </span>
                        <div className="text-[11px] text-stone-500 font-bold flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-stone-400 shrink-0" />
                          <span className="truncate max-w-[140px]">{b.district || b.address}</span>
                        </div>
                      </td>

                      {/* Insurances & Procedures */}
                      <td className="py-3.5 px-4 min-w-[160px]">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-[11px] text-emerald-900 font-bold">
                              {insurancesCount > 0 ? `${insurancesCount} تأمين معتمد` : 'دفع نقدي'}
                            </span>
                          </div>
                          {is24h && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[9px] font-black">
                              <Activity className="h-2.5 w-2.5 animate-pulse" />
                              <span>طوارئ 24 ساعة</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Phone & Contacts */}
                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="space-y-1">
                          <a
                            href={`tel:${b.phone}`}
                            className="text-[11px] text-stone-800 hover:text-emerald-700 font-black flex items-center gap-1"
                          >
                            <Phone className="h-3 w-3 text-stone-400" />
                            <span>{b.phone}</span>
                          </a>
                          {whatsappNumber && (
                            <a
                              href={getWhatsAppUrl(whatsappNumber, `السلام عليكم، بخصوص منشأتكم الطبية (${b.name}) عبر منصة شو في بإربد`)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] text-emerald-600 hover:underline flex items-center gap-1"
                            >
                              <WhatsAppIcon className="h-2.5 w-2.5" />
                              <span>مراسلة واتساب</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Status Badges */}
                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className="flex flex-col gap-1 items-start">
                          <button
                            type="button"
                            onClick={() => handleToggleVerified(b)}
                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                              b.isVerified
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-stone-100 text-stone-400 border border-stone-200'
                            }`}
                          >
                            <ShieldCheck className="h-3 w-3" />
                            <span>{b.isVerified ? 'موثقة رسمياً 🛡️' : 'غير موثقة'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleFeatured(b)}
                            className={`px-2.5 py-0.5 rounded-md text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                              b.isFeatured
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-stone-100 text-stone-400 border border-stone-200'
                            }`}
                          >
                            <Star className="h-3 w-3" />
                            <span>{b.isFeatured ? 'مميزة VIP ⭐' : 'عادية'}</span>
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(b)}
                            className="p-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors cursor-pointer"
                            title="تعديل المنشأة الطبية"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>

                          <Link
                            to={`/business/${b.id}`}
                            target="_blank"
                            className="p-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors"
                            title="معاينة الصفحة"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>

                          <button
                            onClick={() => handleDelete(b)}
                            className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                            title="حذف نهائي"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>
      )}

      {/* SUB-TAB 2: MEDICAL REGISTRATION REQUESTS */}
      {activeSubTab === 'requests' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-[#e5e1da] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-stone-900 flex items-center gap-2">
                <span>طلبات الانضمام والتوثيق للمنشآت الطبية</span>
                <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full border border-amber-200">
                  {pendingRequestsCount} معلق ينتظر المراجعة
                </span>
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                طلبات انضمام الأطباء، العيادات والمراكز الطبية والصيدليات والمختبرات المقدمة من أصحاب العلاقة.
              </p>
            </div>
          </div>

          {medicalRequests.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border border-[#e5e1da] text-center space-y-3">
              <Building2 className="h-12 w-12 text-stone-300 mx-auto" />
              <h4 className="text-base font-black text-stone-800">لا توجد طلبات تسجيل طبية حالياً</h4>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                جميع طلبات الانضمام الطبية تمت مراجعتها أو لا توجد طلبات معلقة جديدة في الانتظار.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {medicalRequests.map((req: any) => (
                <div 
                  key={req.id} 
                  className="bg-white rounded-3xl border border-stone-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black shrink-0 border border-emerald-100">
                          <Stethoscope className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div>
                          <h4 className="font-black text-sm text-stone-900 leading-snug">{req.name}</h4>
                          <span className="inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 mt-1">
                            {req.category || req.subCategory || 'منشأة طبية'}
                          </span>
                        </div>
                      </div>

                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                        req.status === 'approved' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : req.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-amber-100 text-amber-800 animate-pulse'
                      }`}>
                        {req.status === 'approved' ? 'مقبول وموثق' : req.status === 'rejected' ? 'مرفوض' : 'في الانتظار ⏳'}
                      </span>
                    </div>

                    <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed bg-stone-50 p-2.5 rounded-xl border border-stone-100">
                      {req.description || 'لا يوجد وصف تفصيلي مرفق مع الطلب.'}
                    </p>

                    <div className="space-y-1.5 text-xs text-stone-600 pt-1 border-t border-stone-100">
                      {req.ownerName && (
                        <div className="flex items-center gap-1.5 font-bold text-stone-800">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>المسؤول/الطبيب: {req.ownerName}</span>
                        </div>
                      )}
                      {req.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-stone-400" />
                          <span dir="ltr" className="font-mono font-bold text-stone-800">{req.phone}</span>
                        </div>
                      )}
                      {req.district && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-stone-400" />
                          <span>المنطقة: {req.district} {req.address ? `• ${req.address}` : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-stone-100 space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRequestForDetails(req);
                        setIsDetailsModalOpen(true);
                      }}
                      className="w-full bg-stone-100 hover:bg-emerald-50 text-stone-800 hover:text-emerald-900 border border-stone-200 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5 text-emerald-700" />
                      <span>عرض النموذج والتفاصيل</span>
                    </button>

                    <div className="flex items-center gap-2">
                      {req.status !== 'approved' && (
                        <button
                          onClick={() => handleApproveMedicalRequest(req)}
                          className="flex-1 bg-[#1a4d2e] hover:bg-[#143e25] text-white px-3 py-2 rounded-xl text-xs font-black transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1"
                        >
                          <ShieldCheck className="h-3.5 w-3.5 text-[#ff9f1c]" />
                          <span>موافقة وتوثيق 🛡️</span>
                        </button>
                      )}

                      {req.status !== 'rejected' && (
                        <button
                          onClick={() => handleRejectMedicalRequest(req.id, req.name)}
                          className="bg-stone-100 hover:bg-rose-50 text-stone-700 hover:text-rose-700 px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                        >
                          رفض
                        </button>
                      )}
                    </div>

                    {req.phone && (
                      <div className="flex items-center gap-2">
                        <a
                          href={getWhatsAppUrl(req.phone, `مرحباً بكم من إدارة منصة شو في بإربد بشأن طلب تسجيل منشأتكم الطبية (${req.name})`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors"
                        >
                          <WhatsAppIcon className="h-3.5 w-3.5 text-emerald-600" />
                          <span>تواصل واتساب</span>
                        </a>

                        <a
                          href={`tel:${req.phone}`}
                          className="inline-flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-colors"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          <span>اتصال</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EDIT MEDICAL FACILITY MODAL */}
      {isEditModalOpen && (
        <div 
          className="fixed inset-0 z-[100000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200 relative flex flex-col max-h-[90vh] overflow-hidden my-auto"
            onClick={e => e.stopPropagation()}
            dir="rtl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-stone-200 bg-stone-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">تعديل بيانات المنشأة الطبية</h3>
                  <p className="text-xs text-stone-500 font-bold">{editFormData.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 rounded-xl bg-white hover:bg-stone-200 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveEdit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-stone-800">اسم المنشأة *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs font-bold text-stone-800 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-stone-800">التصنيف</label>
                  <select
                    value={editFormData.category}
                    onChange={e => setEditFormData({ ...editFormData, category: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs font-bold text-stone-800 focus:bg-white"
                  >
                    <option value="عيادات ومراكز طبية">عيادات ومراكز طبية</option>
                    <option value="مستشفيات ومراكز شاملة">مستشفيات ومراكز شاملة</option>
                    <option value="صيدليات ورعاية صحية">صيدليات ورعاية صحية</option>
                    <option value="مختبرات وتحاليل طبية">مختبرات وتحاليل طبية</option>
                    <option value="علاج طبيعي وتأهيل">علاج طبيعي وتأهيل</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-stone-800">اسم الطبيب / المشرف</label>
                  <input
                    type="text"
                    value={editFormData.doctorName}
                    onChange={e => setEditFormData({ ...editFormData, doctorName: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs font-bold text-stone-800 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-stone-800">المسمى المهني</label>
                  <input
                    type="text"
                    value={editFormData.doctorTitle}
                    onChange={e => setEditFormData({ ...editFormData, doctorTitle: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs font-bold text-stone-800 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-stone-800">الشهادات والبورد</label>
                  <input
                    type="text"
                    value={editFormData.degrees}
                    onChange={e => setEditFormData({ ...editFormData, degrees: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs font-bold text-stone-800 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-stone-800">رقم ترخيص مزاولة المهنة</label>
                  <input
                    type="text"
                    value={editFormData.licenseNumber}
                    onChange={e => setEditFormData({ ...editFormData, licenseNumber: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs font-bold text-stone-800 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-black text-stone-800">رقم الهاتف *</label>
                  <input
                    type="tel"
                    required
                    value={editFormData.phone}
                    onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs font-bold text-stone-800 focus:bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-stone-800">رسوم الكشفية</label>
                  <input
                    type="text"
                    value={editFormData.consultationFee}
                    onChange={e => setEditFormData({ ...editFormData, consultationFee: e.target.value })}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs font-bold text-stone-800 focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-black text-stone-800">العنوان في إربد</label>
                <input
                  type="text"
                  value={editFormData.address}
                  onChange={e => setEditFormData({ ...editFormData, address: e.target.value })}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-xs font-bold text-stone-800 focus:bg-white"
                />
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2">
                <label className="flex items-center gap-2 p-3 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.isVerified}
                    onChange={e => setEditFormData({ ...editFormData, isVerified: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-stone-800">توثيق رسمي 🛡️</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.isFeatured}
                    onChange={e => setEditFormData({ ...editFormData, isFeatured: e.target.checked })}
                    className="rounded text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-xs font-bold text-stone-800">تمييز VIP ⭐</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.emergency24h}
                    onChange={e => setEditFormData({ ...editFormData, emergency24h: e.target.checked })}
                    className="rounded text-red-600 focus:ring-red-500"
                  />
                  <span className="text-xs font-bold text-stone-800">طوارئ 24 س 🚨</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.showMedicalStaff}
                    onChange={e => setEditFormData({ ...editFormData, showMedicalStaff: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-stone-800">تاب الكادر الطبي 👥</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.showEquipments}
                    onChange={e => setEditFormData({ ...editFormData, showEquipments: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-stone-800">قسم الأجهزة والتقنيات 🔬</span>
                </label>

                <label className="flex items-center gap-2 p-3 rounded-xl border border-stone-200 bg-stone-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editFormData.showAmenities}
                    onChange={e => setEditFormData({ ...editFormData, showAmenities: e.target.checked })}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-xs font-bold text-stone-800">تسهيلات الراحة ♿</span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#1a4d2e] hover:bg-[#143d24] text-white text-xs font-black shadow-xs cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Request Details Modal */}
      <RequestDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedRequestForDetails(null);
        }}
        request={selectedRequestForDetails}
        onApprove={(req) => handleApproveMedicalRequest(req)}
        onReject={(reqId, reqName) => handleRejectMedicalRequest(reqId, reqName)}
      />

    </div>
  );
}
