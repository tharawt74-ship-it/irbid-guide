import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, deleteDoc, orderBy, setDoc } from 'firebase/firestore';
import { Business, JobOffer, HousingItem } from '../types';
import { Link, useLocation } from 'react-router';
import { 
  Store, User, Mail, Edit3, X, CheckCircle, EyeOff, MessageSquare, 
  Globe, Settings, TrendingUp, Bell, Image as ImageIcon, Smartphone, 
  Megaphone, Rocket, Check, Briefcase, Plus, Flame, MapPin, DollarSign, 
  Trash2, ExternalLink, Clock, Users, Award, Crown, BarChart3, UtensilsCrossed,
  Lock, Tag, Info, Sparkles, ChevronLeft, ChevronRight, Phone, MessageCircle, Star,
  Home
} from 'lucide-react';
import { JobFormModal } from '../components/jobs/JobFormModal';
import { VipAnalyticsModal } from '../components/vip/VipAnalyticsModal';
import { VipAnalyticsDashboard } from '../components/vip/VipAnalyticsDashboard';
import { DigitalMenuManagerModal } from '../components/vip/DigitalMenuManagerModal';
import { VipUpgradeRequestModal } from '../components/vip/VipUpgradeRequestModal';
import { getBusinessVipStatus } from '../lib/vipHelper';
import { ensureBusinessAnalyticsSaved } from '../lib/analyticsTracker';
import { BUSINESS_CATEGORIES, MainCategory, IRBID_REGIONS_CATEGORIZED } from '../lib/categories';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { WorkingHoursEditor } from '../components/ui/WorkingHoursEditor';
import { SocialLinksEditor } from '../components/ui/SocialLinksEditor';
import { StoreEditForm } from '../components/profile/StoreEditForm';
import { SocialLinks, WorkingHours } from '../types';
import { VisitorFavoritesTab } from '../components/profile/VisitorFavoritesTab';
import { VisitorReviewsTab } from '../components/profile/VisitorReviewsTab';
import { VisitorHousingsTab } from '../components/profile/VisitorHousingsTab';
import { ShieldCheck, Heart, MessageSquareText, Building2, Shield, Printer, QrCode, Calendar, Copy } from 'lucide-react';
import { RoiCampaignTracker } from '../components/profile/RoiCampaignTracker';
import { PrintableQrPosterModal } from '../components/profile/PrintableQrPosterModal';
import { MultiBranchModal } from '../components/profile/MultiBranchModal';
import { ScheduledNotificationModal } from '../components/profile/ScheduledNotificationModal';

export function Profile() {
  const { currentUser, isAdmin, isSupervisor, isStaff, userRole, supervisorPermissions } = useAuth();
  const location = useLocation();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [userJobs, setUserJobs] = useState<JobOffer[]>([]);
  const [userHousings, setUserHousings] = useState<HousingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileMainTab, setProfileMainTab] = useState<'visitor' | 'merchant' | 'staff'>('visitor');
  const [visitorSubTab, setVisitorSubTab] = useState<'favorites' | 'reviews' | 'housings' | 'account'>('favorites');
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [editForm, setEditForm] = useState<Partial<Business>>({});
  
  // Homepage Banner Form State
  const [isEditingBannerForm, setIsEditingBannerForm] = useState(false);
  const [bannerForm, setBannerForm] = useState<{
    bannerType: 'business' | 'image_only' | 'animated_image' | 'text_and_button';
    bannerTitle: string;
    bannerSubtitle: string;
    bannerImageUrl: string;
    buttonText: string;
    buttonLink: string;
    badgeText: string;
  }>({
    bannerType: 'business',
    bannerTitle: '',
    bannerSubtitle: '',
    bannerImageUrl: '',
    buttonText: 'معاينة المحل',
    buttonLink: '',
    badgeText: 'موصى به ⭐'
  });
  const [submittingBanner, setSubmittingBanner] = useState(false);
  const [mainCategory, setMainCategory] = useState<MainCategory>('🍔 مأكولات ومشروبات');
  const [subCategory, setSubCategory] = useState<string>('مطاعم وجبات سريعة (شاورما، برجر، سناكات)');
  const [workingHours, setWorkingHours] = useState<WorkingHours>({
    isOpen24Hours: false,
    openTime: '09:00',
    closeTime: '23:00',
    days: 'طوال أيام الأسبوع',
    isCustomClosed: false
  });
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [isSavingBusiness, setIsSavingBusiness] = useState(false);
  const [serviceRequestSuccess, setServiceRequestSuccess] = useState<string | null>(null);
  const [selectedBusinessIdForService, setSelectedBusinessIdForService] = useState<string>("");

  // Marketing Popup Modal state
  const [isMarketingModalOpen, setIsMarketingModalOpen] = useState(false);
  const [activeMarketingModalType, setActiveMarketingModalType] = useState<string | null>(null);
  const [activeMarketingModalName, setActiveMarketingModalName] = useState<string>("");
  const [activeMarketingModalSuccess, setActiveMarketingModalSuccess] = useState<string>("");
  const [submittingMarketingRequest, setSubmittingMarketingRequest] = useState(false);
  const [marketingForm, setMarketingForm] = useState({
    contactWhatsapp: '',
    durationWeeks: 'أسبوع واحد',
    publishTimeOption: 'immediately' as 'immediately' | 'scheduled',
    publishStartDate: '',
    targetKeywords: '',
    notes: '',
    notificationTitle: '',
    notificationBody: '',
    scheduledTime: '',
    targetLink: '',
    quantity: '1',
    address: '',
    logoInstructions: '',
    campaignGoal: '',
    preferredFilmingDate: '',
    highlightPoints: '',
    // banner specific (if they order homepage banner through marketing card)
    bannerType: 'business' as 'business' | 'image_only' | 'animated_image' | 'text_and_button',
    bannerTitle: '',
    bannerSubtitle: '',
    bannerImageUrl: '',
    buttonText: 'معاينة المحل',
    buttonLink: '',
    badgeText: 'موصى به ⭐'
  });

  // Job Modal state
  const [isJobModalOpen, setIsJobModalOpen] = useState(false);
  const [jobToEdit, setJobToEdit] = useState<JobOffer | null>(null);
  const [defaultBusinessIdForJob, setDefaultBusinessIdForJob] = useState<string | undefined>(undefined);
  const [jobSuccessMessage, setJobSuccessMessage] = useState<string | null>(null);
  const [deleteJobConfirmId, setDeleteJobConfirmId] = useState<string | null>(null);

  // VIP Feature Modals state
  const [selectedBusinessForAnalytics, setSelectedBusinessForAnalytics] = useState<Business | null>(null);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [selectedBusinessForMenu, setSelectedBusinessForMenu] = useState<Business | null>(null);
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [selectedBusinessForUpgrade, setSelectedBusinessForUpgrade] = useState<Business | null>(null);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Merchant Tool Modals state
  const [isQrPosterOpen, setIsQrPosterOpen] = useState(false);
  const [isMultiBranchOpen, setIsMultiBranchOpen] = useState(false);
  const [isScheduledNotifOpen, setIsScheduledNotifOpen] = useState(false);

  // Active business management state
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [activeSectionTab, setActiveSectionTab] = useState<'overview' | 'edit_info' | 'offers' | 'jobs' | 'marketing' | 'reviews' | 'homepage_banner'>('overview');

  // Custom Banner request state
  const [currentBannerRequest, setCurrentBannerRequest] = useState<any | null>(null);
  const [loadingBannerRequest, setLoadingBannerRequest] = useState(false);

  // Business reviews & merchant replies state
  const [businessReviews, setBusinessReviews] = useState<any[]>([]);
  const [loadingBusinessReviews, setLoadingBusinessReviews] = useState(false);
  const [replyTexts, setReplyTexts] = useState<{[reviewId: string]: string}>({});

  // Offer management state
  const [offers, setOffers] = useState<any[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [isAddingOffer, setIsAddingOffer] = useState(false);
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [newOfferForm, setNewOfferForm] = useState({
    title: '',
    discountPercentage: '',
    oldPrice: '',
    newPrice: '',
    code: '',
    expiresIn: '',
    description: '',
    phone: '',
    whatsapp: '',
    image: '',
    isHot: false,
    isStudent: false
  });

  useEffect(() => {
    if (selectedBusiness) {
      fetchOffersForBusiness(selectedBusiness.id);
      setEditForm(selectedBusiness);
      
      // Parse category
      let foundMain: MainCategory | null = null;
      if (selectedBusiness.category) {
        for (const [main, subs] of Object.entries(BUSINESS_CATEGORIES)) {
          if ((subs as string[]).includes(selectedBusiness.category)) {
            foundMain = main as MainCategory;
            break;
          }
        }
      }
      
      if (foundMain) {
        setMainCategory(foundMain);
        setSubCategory(selectedBusiness.category);
      } else {
        setMainCategory('🍔 مأكولات ومشروبات');
        setSubCategory(selectedBusiness.category || 'مطاعم وجبات سريعة (شاورما، برجر، سناكات)');
      }

      setWorkingHours({
        isOpen24Hours: selectedBusiness.workingHours?.isOpen24Hours || false,
        openTime: selectedBusiness.workingHours?.openTime || '09:00',
        closeTime: selectedBusiness.workingHours?.closeTime || '23:00',
        days: selectedBusiness.workingHours?.days || 'طوال أيام الأسبوع',
        isCustomClosed: selectedBusiness.workingHours?.isCustomClosed || false
      });
      setSocialLinks(selectedBusiness.socialLinks || {});

      // Synchronize with marketing requests selection
      setSelectedBusinessIdForService(selectedBusiness.id);
    }
  }, [selectedBusiness]);

  const fetchOffersForBusiness = async (businessId: string) => {
    if (!db) return;
    setLoadingOffers(true);
    try {
      const q = query(collection(db, 'offers'), where('businessId', '==', businessId));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setOffers(list);
    } catch (err) {
      console.error("Error fetching offers:", err);
    } finally {
      setLoadingOffers(false);
    }
  };

  const fetchReviewsForBusiness = async (businessId: string) => {
    if (!db) return;
    setLoadingBusinessReviews(true);
    try {
      const q = query(collection(db, 'businesses', businessId, 'reviews'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() });
      });
      setBusinessReviews(list);
    } catch (err) {
      console.warn("Error fetching reviews:", err);
    } finally {
      setLoadingBusinessReviews(false);
    }
  };

  const handlePostReply = async (reviewId: string) => {
    const replyText = replyTexts[reviewId];
    if (!db || !replyText?.trim() || !selectedBusiness) return;
    try {
      const reviewRef = doc(db, 'businesses', selectedBusiness.id, 'reviews', reviewId);
      await updateDoc(reviewRef, {
        merchantReply: replyText,
        merchantReplyAt: new Date().toISOString()
      });
      setReplyTexts(prev => ({ ...prev, [reviewId]: '' }));
      fetchReviewsForBusiness(selectedBusiness.id);
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err) {
      console.error("Error posting merchant reply:", err);
    }
  };

  const handleDeleteReply = async (reviewId: string) => {
    if (!db || !selectedBusiness || !window.confirm('هل أنت متأكد من حذف هذا الرد؟')) return;
    try {
      const reviewRef = doc(db, 'businesses', selectedBusiness.id, 'reviews', reviewId);
      await updateDoc(reviewRef, {
        merchantReply: null,
        merchantReplyAt: null
      });
      fetchReviewsForBusiness(selectedBusiness.id);
    } catch (err) {
      console.error("Error deleting merchant reply:", err);
    }
  };

  const fetchBannerRequestForBusiness = async (businessId: string) => {
    if (!db) return;
    setLoadingBannerRequest(true);
    try {
      const q = query(
        collection(db, 'marketingRequests'), 
        where('businessId', '==', businessId), 
        where('serviceType', '==', 'homepage_banner')
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docs: any[] = [];
        snap.forEach(d => {
          docs.push({ id: d.id, ...d.data() });
        });
        docs.sort((a, b) => b.createdAt - a.createdAt);
        setCurrentBannerRequest(docs[0]);
      } else {
        setCurrentBannerRequest(null);
      }
    } catch (err) {
      console.error("Error fetching banner request:", err);
    } finally {
      setLoadingBannerRequest(false);
    }
  };

  useEffect(() => {
    if (selectedBusiness && activeSectionTab === 'reviews') {
      fetchReviewsForBusiness(selectedBusiness.id);
    }
  }, [selectedBusiness, activeSectionTab]);

  useEffect(() => {
    if (selectedBusiness && activeSectionTab === 'homepage_banner') {
      fetchBannerRequestForBusiness(selectedBusiness.id);
    }
  }, [selectedBusiness, activeSectionTab]);

  useEffect(() => {
    if (selectedBusiness) {
      if (currentBannerRequest) {
        setBannerForm({
          bannerType: currentBannerRequest.bannerType || 'business',
          bannerTitle: currentBannerRequest.bannerTitle || selectedBusiness.name,
          bannerSubtitle: currentBannerRequest.bannerSubtitle || selectedBusiness.description || '',
          bannerImageUrl: currentBannerRequest.bannerImageUrl || selectedBusiness.imageUrl || '',
          buttonText: currentBannerRequest.buttonText || 'معاينة المحل',
          buttonLink: currentBannerRequest.buttonLink || `/business/${selectedBusiness.id}`,
          badgeText: currentBannerRequest.badgeText || 'موصى به ⭐'
        });
      } else {
        setBannerForm({
          bannerType: 'business',
          bannerTitle: selectedBusiness.name,
          bannerSubtitle: selectedBusiness.description || '',
          bannerImageUrl: selectedBusiness.imageUrl || '',
          buttonText: 'معاينة المحل',
          buttonLink: `/business/${selectedBusiness.id}`,
          badgeText: 'موصى به ⭐'
        });
      }
    }
  }, [currentBannerRequest, selectedBusiness]);

  const handleSaveBannerRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !selectedBusiness || !currentUser) return;
    
    if (bannerForm.bannerType !== 'image_only' && bannerForm.bannerType !== 'animated_image' && !bannerForm.bannerTitle.trim()) {
      alert("يرجى إدخال عنوان الإعلان الرئيسي");
      return;
    }
    if (!bannerForm.bannerImageUrl.trim()) {
      alert("يرجى تزويدنا برابط صورة الإعلان");
      return;
    }

    setSubmittingBanner(true);
    try {
      const requestPayload: any = {
        businessId: selectedBusiness.id,
        businessName: selectedBusiness.name,
        userId: currentUser.uid,
        userEmail: currentUser.email || '',
        serviceType: 'homepage_banner',
        serviceName: 'طلب بانر إعلاني مميز',
        status: 'pending', // status goes back to pending for review!
        createdAt: currentBannerRequest ? (currentBannerRequest.createdAt || Date.now()) : Date.now(),
        bannerType: bannerForm.bannerType,
        bannerTitle: bannerForm.bannerTitle.trim(),
        bannerSubtitle: bannerForm.bannerSubtitle.trim(),
        bannerImageUrl: bannerForm.bannerImageUrl.trim(),
        buttonText: bannerForm.buttonText.trim(),
        buttonLink: bannerForm.buttonLink.trim(),
        badgeText: bannerForm.badgeText.trim()
      };

      if (currentBannerRequest?.id) {
        // Edit existing request
        await setDoc(doc(db, 'marketingRequests', currentBannerRequest.id), requestPayload);
        alert("تم تحديث طلب البانر الإعلاني بنجاح وأرسل للمراجعة والاعتماد ✨");
      } else {
        // Add new request
        await addDoc(collection(db, 'marketingRequests'), requestPayload);
        alert("تم تقديم طلب حجز البانر الإعلاني للمراجعة بنجاح 🎉");
      }
      
      setIsEditingBannerForm(false);
      fetchBannerRequestForBusiness(selectedBusiness.id);
    } catch (err) {
      console.error("Error saving banner request:", err);
      alert("تعذر حفظ طلب البانر الإعلاني، يرجى المحاولة لاحقاً.");
    } finally {
      setSubmittingBanner(false);
    }
  };

  const handleDeleteBannerRequest = async () => {
    if (!db || !selectedBusiness || !currentBannerRequest?.id) return;
    if (!window.confirm("هل أنت متأكد من رغبتك في إلغاء وحذف هذا الطلب والبانر الخاص بك نهائياً؟")) return;
    
    try {
      // 1. Delete marketing request
      await deleteDoc(doc(db, 'marketingRequests', currentBannerRequest.id));
      
      // 2. Delete the approved live banner if any exists
      await deleteDoc(doc(db, 'banners', `business_banner_${selectedBusiness.id}`));
      
      alert("تم حذف وإلغاء طلب البانر الإعلاني بنجاح.");
      setCurrentBannerRequest(null);
      setIsEditingBannerForm(false);
    } catch (err) {
      console.error("Error deleting banner request:", err);
      alert("تعذر حذف وإلغاء الطلب.");
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !selectedBusiness || !newOfferForm.title || !currentUser) return;
    if (selectedBusiness.userId !== currentUser.uid && !isAdmin) {
      alert("غير مصرح لك بإضافة عروض لهذا المحل!");
      return;
    }
    const vipInfo = getBusinessVipStatus(selectedBusiness);
    if (!vipInfo.isVip) {
      setSelectedBusinessForUpgrade(selectedBusiness);
      setIsUpgradeModalOpen(true);
      return;
    }
    setSubmittingOffer(true);
    try {
      const offerData = {
        title: newOfferForm.title,
        businessName: selectedBusiness.name,
        businessId: selectedBusiness.id,
        category: selectedBusiness.category,
        discountPercentage: newOfferForm.discountPercentage || '10%',
        oldPrice: newOfferForm.oldPrice || '',
        newPrice: newOfferForm.newPrice || '',
        code: newOfferForm.code || '',
        expiresIn: newOfferForm.expiresIn || 'لفترة محدودة',
        description: newOfferForm.description,
        location: selectedBusiness.district ? `${selectedBusiness.district} - ${selectedBusiness.address}` : selectedBusiness.address,
        phone: newOfferForm.phone || selectedBusiness.phone || '',
        whatsapp: newOfferForm.whatsapp || selectedBusiness.phone || '',
        image: newOfferForm.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800',
        isHot: Boolean(newOfferForm.isHot),
        isStudent: Boolean(newOfferForm.isStudent),
        createdAt: Date.now()
      };
      const docRef = await addDoc(collection(db, 'offers'), offerData);
      setOffers(prev => [{ id: docRef.id, ...offerData }, ...prev]);
      setIsAddingOffer(false);
      setJobSuccessMessage('تم نشر العرض الترويجي للمحل بنجاح!');
      setTimeout(() => setJobSuccessMessage(null), 5000);
      setNewOfferForm({
        title: '',
        discountPercentage: '',
        oldPrice: '',
        newPrice: '',
        code: '',
        expiresIn: '',
        description: '',
        phone: '',
        whatsapp: '',
        image: '',
        isHot: false,
        isStudent: false
      });
    } catch (err) {
      console.error("Error adding offer:", err);
    } finally {
      setSubmittingOffer(false);
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!db || !selectedBusiness || !currentUser) return;
    if (selectedBusiness.userId !== currentUser.uid && !isAdmin) {
      alert("غير مصرح لك بحذف عروض هذا المحل!");
      return;
    }
    try {
      await deleteDoc(doc(db, 'offers', id));
      setOffers(prev => prev.filter(o => o.id !== id));
      setJobSuccessMessage('تم حذف العرض بنجاح');
      setTimeout(() => setJobSuccessMessage(null), 4000);
    } catch (err) {
      console.error("Error deleting offer:", err);
    }
  };

  useEffect(() => {
    if (businesses.length > 0 && !selectedBusinessIdForService) {
      setSelectedBusinessIdForService(businesses[0].id);
    }
  }, [businesses]);

  const handleOpenMarketingModal = (serviceType: string, serviceName: string, successMessage: string) => {
    if (!currentUser || !selectedBusinessIdForService) {
      alert("يرجى اختيار المحل المستهدف أولاً");
      return;
    }
    const business = businesses.find(b => b.id === selectedBusinessIdForService);
    if (!business) return;
    if (business.userId !== currentUser.uid && !isAdmin) {
      alert("غير مصرح لك بإرسال طلبات تسويق لغير محلك!");
      return;
    }

    // Set initial form states
    setMarketingForm({
      contactWhatsapp: business.phone || '',
      durationWeeks: 'أسبوع واحد',
      publishTimeOption: 'immediately',
      publishStartDate: new Date(Date.now() + 3600000).toISOString().slice(0, 16), // 1 hour from now
      targetKeywords: '',
      notes: '',
      notificationTitle: `عرض مميز من ${business.name}`,
      notificationBody: `تفضلوا بزيارتنا للاستفادة من أقوى العروض والخصومات الجديدة!`,
      scheduledTime: new Date(Date.now() + 86400000).toISOString().slice(0, 16), // tomorrow
      targetLink: `/business/${business.id}`,
      quantity: '1',
      address: business.address || '',
      logoInstructions: '',
      campaignGoal: 'إشهار وجذب زوار جدد للمحل',
      preferredFilmingDate: new Date(Date.now() + 172800000).toISOString().slice(0, 10), // in 2 days
      highlightPoints: '',
      bannerType: 'business',
      bannerTitle: business.name,
      bannerSubtitle: business.description || '',
      bannerImageUrl: business.imageUrl || '',
      buttonText: 'معاينة المحل',
      buttonLink: `/business/${business.id}`,
      badgeText: 'موصى به ⭐'
    });

    setActiveMarketingModalType(serviceType);
    setActiveMarketingModalName(serviceName);
    setActiveMarketingModalSuccess(successMessage);
    setIsMarketingModalOpen(true);
  };

  const handleMarketingRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedBusinessIdForService || !db || !activeMarketingModalType) return;
    const business = businesses.find(b => b.id === selectedBusinessIdForService);
    if (!business) return;

    setSubmittingMarketingRequest(true);
    try {
      // Build request payload dynamically depending on active serviceType
      const basePayload: any = {
        businessId: business.id,
        businessName: business.name,
        userId: currentUser.uid,
        userEmail: currentUser.email || '',
        serviceType: activeMarketingModalType,
        serviceName: activeMarketingModalName,
        status: "pending",
        createdAt: Date.now(),
        contactWhatsapp: marketingForm.contactWhatsapp.trim()
      };

      if (activeMarketingModalType === 'sponsored') {
        basePayload.durationWeeks = marketingForm.durationWeeks;
        basePayload.targetKeywords = marketingForm.targetKeywords.trim();
        basePayload.notes = marketingForm.notes.trim();
        basePayload.publishTimeOption = marketingForm.publishTimeOption;
        basePayload.publishStartDate = marketingForm.publishTimeOption === 'scheduled' ? marketingForm.publishStartDate : '';
      } else if (activeMarketingModalType === 'push_notifications') {
        basePayload.notificationTitle = marketingForm.notificationTitle.trim();
        basePayload.notificationBody = marketingForm.notificationBody.trim();
        basePayload.publishTimeOption = marketingForm.publishTimeOption;
        basePayload.scheduledTime = marketingForm.publishTimeOption === 'scheduled' ? marketingForm.publishStartDate : 'immediately';
        basePayload.targetLink = marketingForm.targetLink.trim();
      } else if (activeMarketingModalType === 'homepage_banner') {
        basePayload.bannerType = marketingForm.bannerType;
        basePayload.bannerTitle = marketingForm.bannerTitle.trim();
        basePayload.bannerSubtitle = marketingForm.bannerSubtitle.trim();
        basePayload.bannerImageUrl = marketingForm.bannerImageUrl.trim();
        basePayload.buttonText = marketingForm.buttonText.trim();
        basePayload.buttonLink = marketingForm.buttonLink.trim();
        basePayload.badgeText = marketingForm.badgeText.trim();
        basePayload.durationWeeks = marketingForm.durationWeeks;
        basePayload.publishTimeOption = marketingForm.publishTimeOption;
        basePayload.publishStartDate = marketingForm.publishTimeOption === 'scheduled' ? marketingForm.publishStartDate : '';
      } else if (activeMarketingModalType === 'nfc_stands') {
        basePayload.quantity = marketingForm.quantity;
        basePayload.address = marketingForm.address.trim();
        basePayload.logoInstructions = marketingForm.logoInstructions.trim();
      } else if (activeMarketingModalType === 'social_media') {
        basePayload.campaignGoal = marketingForm.campaignGoal.trim();
        basePayload.preferredFilmingDate = marketingForm.preferredFilmingDate;
        basePayload.highlightPoints = marketingForm.highlightPoints.trim();
      }

      await addDoc(collection(db, "marketingRequests"), basePayload);
      
      setIsMarketingModalOpen(false);
      setServiceRequestSuccess(activeMarketingModalSuccess);
      setTimeout(() => setServiceRequestSuccess(null), 6000);
      alert("تم تقديم طلبك للخدمة التسويقية بنجاح مع كافة تفاصيل النموذج! سنقوم بالتواصل معك قريباً جداً لتفعيلها.");
    } catch (error) {
      console.error("Error submitting marketing request:", error);
      alert("عذراً، حدث خطأ أثناء تقديم الطلب. يرجى المحاولة لاحقاً.");
    } finally {
      setSubmittingMarketingRequest(false);
    }
  };

  const handlePremiumMessagingUpgrade = async (plan: '1_month' | '3_months' | '6_months' | '1_year') => {
    if (!currentUser || !selectedBusinessIdForService || !db) return;
    const business = businesses.find(b => b.id === selectedBusinessIdForService);
    if (!business) return;
    if (business.userId !== currentUser.uid && !isAdmin) {
      alert("غير مصرح لك بترقية باقة محل لا تملكه!");
      return;
    }

    try {
      // Submit marketing request for Admin approval
      await addDoc(collection(db, "marketingRequests"), {
        businessId: business.id,
        businessName: business.name,
        userId: currentUser.uid,
        userEmail: currentUser.email,
        serviceType: 'premium_messaging',
        serviceName: `طلب ترقية باقة الرسائل المتقدمة (${plan === '1_month' ? 'شهر' : plan === '3_months' ? '3 أشهر' : plan === '6_months' ? '6 أشهر' : 'سنة'})`,
        status: "pending",
        createdAt: Date.now()
      });

      setServiceRequestSuccess(`تم إرسال طلب ترقية باقة الرسائل لـ ${business.name} بنجاح! سيقوم فريق الإدارة بمراجعة الطلب وتفعيل الباقة فور الاعتماد.`);
      setTimeout(() => setServiceRequestSuccess(null), 8000);
    } catch (error) {
      console.error("Error upgrading messaging:", error);
      alert("حدث خطأ أثناء إرسال الطلب.");
    }
  };

  const fetchUserJobs = async (userBizList: Business[]) => {
    if (!currentUser) return;
    try {
      let jobsList: JobOffer[] = [];
      if (db) {
        // Query jobs by userId
        const q = query(collection(db, 'jobs'), where('userId', '==', currentUser.uid));
        const snap = await getDocs(q);
        snap.forEach(d => {
          jobsList.push({ id: d.id, ...d.data() } as JobOffer);
        });
      }

      // Check localStorage fallback
      const localJobs = localStorage.getItem('irbid_jobs_listings_v1');
      if (localJobs) {
        try {
          const parsed: JobOffer[] = JSON.parse(localJobs);
          const bizNames = userBizList.map(b => b.name.toLowerCase());
          parsed.forEach(pj => {
            if (pj.userId === currentUser.uid || (pj.businessId && userBizList.some(b => b.id === pj.businessId)) || bizNames.includes(pj.company.toLowerCase())) {
              if (!jobsList.some(existing => existing.id === pj.id)) {
                jobsList.push(pj);
              }
            }
          });
        } catch {
          // ignore
        }
      }

      setUserJobs(jobsList);
    } catch (err) {
      console.error("Error fetching user jobs:", err);
    }
  };

  const fetchUserHousings = async () => {
    if (!currentUser || !db) return;
    try {
      const q = query(collection(db, 'housings'), where('userId', '==', currentUser.uid));
      const snap = await getDocs(q);
      const list: HousingItem[] = [];
      snap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as HousingItem);
      });
      setUserHousings(list);
    } catch (err) {
      console.error("Error fetching user housings:", err);
    }
  };

  useEffect(() => {
    async function fetchUserBusinesses() {
      if (!currentUser || !db) return;
      try {
        // Strict Data Isolation: Users only query their own stores where userId == currentUser.uid
        const q = query(collection(db, 'businesses'), where('userId', '==', currentUser.uid));
        const snapshot = await getDocs(q);
        const userBusinesses: Business[] = [];
        snapshot.forEach(doc => {
          userBusinesses.push({ id: doc.id, ...doc.data() } as Business);
        });
        
        setBusinesses(userBusinesses);
        if (userBusinesses.length > 0) {
          setSelectedBusiness(userBusinesses[0]);
          setProfileMainTab('merchant');
        } else if (isStaff) {
          setProfileMainTab('staff');
        } else {
          setProfileMainTab('visitor');
        }
        fetchUserJobs(userBusinesses);
        fetchUserHousings();
      } catch (err) {
        console.error("Error fetching profile businesses:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchUserBusinesses();
  }, [currentUser, isStaff]);

  const handleEditClick = (business: Business) => {
    setEditingBusiness(business);
    setEditForm(business);
    setUpdateSuccess(false);
  };

  const handleOpenAddJobForBusiness = (businessId?: string) => {
    setJobToEdit(null);
    setDefaultBusinessIdForJob(businessId);
    setIsJobModalOpen(true);
  };

  const handleEditJob = (job: JobOffer) => {
    setJobToEdit(job);
    setDefaultBusinessIdForJob(job.businessId);
    setIsJobModalOpen(true);
  };

  const handleJobSaved = (savedJob: JobOffer) => {
    if (jobToEdit) {
      setUserJobs(prev => prev.map(j => j.id === savedJob.id ? savedJob : j));
      setJobSuccessMessage('تم تحديث بيانات الشاغر الوظيفي بنجاح!');
    } else {
      setUserJobs(prev => [savedJob, ...prev]);
      setJobSuccessMessage('تم نشر الوظيفة بنجاح وستظهر فوراً في صفحة الوظائف!');
    }
    setTimeout(() => setJobSuccessMessage(null), 5000);
  };

  const handleDeleteJob = async (id: string) => {
    try {
      if (db) {
        try {
          await deleteDoc(doc(db, 'jobs', id));
        } catch (e) {
          console.error(e);
        }
      }
      setUserJobs(prev => prev.filter(j => j.id !== id));
      
      // Update local storage
      const local = localStorage.getItem('irbid_jobs_listings_v1');
      if (local) {
        try {
          const parsed = JSON.parse(local).filter((j: any) => j.id !== id);
          localStorage.setItem('irbid_jobs_listings_v1', JSON.stringify(parsed));
        } catch {}
      }

      setDeleteJobConfirmId(null);
      setJobSuccessMessage('تم حذف الوظيفة بنجاح');
      setTimeout(() => setJobSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBusiness = async (businessId: string) => {
    if (!db || !currentUser) return;
    const target = businesses.find(b => b.id === businessId);
    if (!target) return;
    if (target.userId !== currentUser.uid && !isAdmin) {
      alert("غير مصرح لك بحذف هذا المحل!");
      return;
    }

    try {
      await deleteDoc(doc(db, 'businesses', businessId));
      setBusinesses(prev => prev.filter(b => b.id !== businessId));
      if (selectedBusiness?.id === businessId) {
        const remaining = businesses.filter(b => b.id !== businessId);
        setSelectedBusiness(remaining.length > 0 ? remaining[0] : null);
        setActiveSectionTab('overview');
      }
      setEditingBusiness(null);
      setJobSuccessMessage(`تم حذف صفحة المحل "${target.name}" بنجاح.`);
      setTimeout(() => setJobSuccessMessage(null), 4000);
    } catch (err) {
      console.error("Error deleting business:", err);
      alert("حدث خطأ أثناء حذف صفحة المحل، يرجى المحاولة مرة أخرى.");
    }
  };

  const handleSaveStoreData = async (updatedData: {
    name: string;
    ownerName?: string;
    username?: string;
    isHidden?: boolean;
    category: string;
    description: string;
    district: string;
    address: string;
    phone?: string;
    imageUrl?: string;
    googlePlaceUrl?: string;
    workingHours?: WorkingHours;
    socialLinks?: SocialLinks;
    hideSiteReviews?: boolean;
    hideGoogleReviews?: boolean;
  }) => {
    const targetBusiness = editingBusiness || selectedBusiness;
    if (!targetBusiness || !db || !currentUser) return;
    
    // Security check: Only store owner or Admin can modify store data
    if (targetBusiness.userId !== currentUser.uid && !isAdmin) {
      alert("غير مصرح لك بتعديل بيانات هذا المحل!");
      return;
    }
    
    setIsSavingBusiness(true);
    try {
      const docRef = doc(db, 'businesses', targetBusiness.id);
      await updateDoc(docRef, {
        name: updatedData.name,
        ownerName: updatedData.ownerName || '',
        username: updatedData.username || '',
        isHidden: !!updatedData.isHidden,
        description: updatedData.description,
        category: updatedData.category,
        address: updatedData.address,
        district: updatedData.district || 'شارع الجامعة',
        phone: updatedData.phone || '',
        imageUrl: updatedData.imageUrl || '',
        googlePlaceUrl: updatedData.googlePlaceUrl || '',
        hideSiteReviews: !!updatedData.hideSiteReviews,
        hideGoogleReviews: !!updatedData.hideGoogleReviews,
        workingHours: updatedData.workingHours,
        socialLinks: updatedData.socialLinks,
      });
      
      setBusinesses(prev => prev.map(b => b.id === targetBusiness.id ? { 
        ...b, 
        ...updatedData
      } as Business : b));

      if (selectedBusiness && selectedBusiness.id === targetBusiness.id) {
        setSelectedBusiness(prev => prev ? {
          ...prev,
          ...updatedData
        } as Business : null);
      }

      setUpdateSuccess(true);
      setJobSuccessMessage('تم تحديث بيانات المحل بنجاح! 🎉');
      setTimeout(() => {
        setEditingBusiness(null);
        setUpdateSuccess(false);
        setJobSuccessMessage(null);
      }, 1500);
    } catch (err) {
      console.error("Error updating business:", err);
      alert("حدث خطأ أثناء التحديث، يرجى المحاولة مرة أخرى.");
    } finally {
      setIsSavingBusiness(false);
    }
  };

  const handleUpdateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetBusiness = editingBusiness || selectedBusiness;
    if (!targetBusiness) return;
    await handleSaveStoreData({
      name: editForm.name || targetBusiness.name,
      ownerName: editForm.ownerName || targetBusiness.ownerName || '',
      category: subCategory || targetBusiness.category,
      description: editForm.description || targetBusiness.description,
      district: editForm.district || targetBusiness.district || 'شارع الجامعة',
      address: editForm.address || targetBusiness.address,
      phone: editForm.phone || targetBusiness.phone || '',
      imageUrl: editForm.imageUrl || targetBusiness.imageUrl || '',
      googlePlaceUrl: editForm.googlePlaceUrl || targetBusiness.googlePlaceUrl || '',
      workingHours: workingHours,
      socialLinks: socialLinks,
      hideSiteReviews: !!editForm.hideSiteReviews,
      hideGoogleReviews: !!editForm.hideGoogleReviews,
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-[#e5e1da]"></div>
          <div className="absolute inset-0 rounded-full border-4 border-[#1a4d2e] border-t-transparent animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="text-center py-20 bg-white rounded-[32px] border border-[#e5e1da]">
        <h2 className="text-2xl font-bold text-[#2d2a26] mb-4">يجب تسجيل الدخول</h2>
        <Link to="/login" state={{ from: location.pathname + location.search }} className="inline-flex px-6 py-3 bg-[#1a4d2e] text-white rounded-xl font-bold">تسجيل الدخول</Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-20 sm:pb-16 min-w-0 px-0.5 sm:px-0" dir="rtl">
      
      {/* Toast Alert */}
      {jobSuccessMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1a4d2e] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-emerald-500/30 animate-in fade-in zoom-in-95 max-w-[92vw]">
          <Check className="h-5 w-5 text-[#ff9f1c] shrink-0" />
          <span className="font-bold text-xs sm:text-sm">{jobSuccessMessage}</span>
        </div>
      )}

      {/* Profile Header */}
      <div className="bg-white p-5 sm:p-8 rounded-3xl md:rounded-[32px] border border-[#e5e1da] shadow-sm flex flex-col md:flex-row items-center gap-4 sm:gap-6 min-w-0 overflow-hidden">
        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shrink-0 ${
          isAdmin 
            ? 'bg-amber-500/10 text-amber-600' 
            : isSupervisor 
            ? 'bg-blue-500/10 text-blue-600'
            : businesses.length > 0 
            ? 'bg-emerald-500/10 text-[#1a4d2e]' 
            : 'bg-stone-100 text-stone-700'
        }`}>
          {isAdmin ? <ShieldCheck className="h-8 w-8 sm:h-10 sm:w-10" /> : isSupervisor ? <Shield className="h-8 w-8 sm:h-10 sm:w-10" /> : businesses.length > 0 ? <Store className="h-8 w-8 sm:h-10 sm:w-10" /> : <User className="h-8 w-8 sm:h-10 sm:w-10" />}
        </div>
        <div className="text-center md:text-right flex-1 min-w-0 space-y-1.5 w-full">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <h1 className="text-xl sm:text-3xl font-black text-[#2d2a26] break-words">{currentUser.displayName || 'مستخدم المنصة'}</h1>
            {isAdmin ? (
              <span className="bg-amber-500 text-white px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-black shadow-2xs">
                مدير عام المنصة (Super Admin)
              </span>
            ) : isSupervisor ? (
              <span className="bg-blue-600 text-white px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-black shadow-2xs">
                مشرف معتمد (Supervisor)
              </span>
            ) : businesses.length > 0 ? (
              <span className="bg-[#1a4d2e] text-white px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-black shadow-2xs">
                صاحب متجر معتمد ({businesses.length} منشأة)
              </span>
            ) : (
              <span className="bg-stone-200 text-stone-800 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold">
                عضو زائر
              </span>
            )}
          </div>
          <div className="flex items-center justify-center md:justify-start gap-1.5 text-stone-500 text-xs font-mono break-all" dir="ltr">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate max-w-full">{currentUser.email}</span>
          </div>
        </div>

        {/* Profile Quick Settings Action Button */}
        <div className="flex items-center justify-center shrink-0 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-stone-100">
          <Link
            to="/profile/settings"
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-800 px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-bold border border-stone-200/80 transition-all shadow-3xs hover:scale-102 active:scale-98 cursor-pointer"
          >
            <Settings className="h-4 w-4 text-stone-600" />
            <span>إعدادات الحساب</span>
          </Link>
        </div>
      </div>

      {/* Main Profile Tabs Selector */}
      <div className="bg-white p-1.5 sm:p-2 rounded-2xl border border-[#e5e1da] shadow-xs flex flex-wrap sm:flex-nowrap gap-1.5 sm:gap-2 min-w-0">
        <button
          type="button"
          onClick={() => setProfileMainTab('visitor')}
          className={`flex-1 min-w-[120px] py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
            profileMainTab === 'visitor'
              ? 'bg-[#1a4d2e] text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
          }`}
        >
          <Heart className="h-4 w-4 text-[#ff9f1c] shrink-0" />
          <span className="truncate">تفاعلاتي ومفضلتي</span>
        </button>

        <button
          type="button"
          onClick={() => setProfileMainTab('merchant')}
          className={`flex-1 min-w-[120px] py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
            profileMainTab === 'merchant'
              ? 'bg-[#1a4d2e] text-white shadow-xs'
              : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
          }`}
        >
          <Store className="h-4 w-4 shrink-0" />
          <span className="truncate">محلاتي ومنشآتي ({businesses.length})</span>
        </button>

        {isStaff && (
          <button
            type="button"
            onClick={() => setProfileMainTab('staff')}
            className={`flex-1 min-w-[120px] py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl text-[11px] sm:text-xs font-black transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer ${
              profileMainTab === 'staff'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
            }`}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span className="truncate">بوابة الإشراف والإدارة</span>
          </button>
        )}
      </div>

      {/* TAB 1: VISITOR HUB */}
      {profileMainTab === 'visitor' && (
        <div className="space-y-6">
          {/* Sub-tabs */}
          <div className="flex border-b border-stone-200 gap-4 sm:gap-6 text-xs font-bold overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setVisitorSubTab('favorites')}
              className={`pb-3 relative transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                visitorSubTab === 'favorites' ? 'text-[#1a4d2e] font-black' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
              <span>المحلات المحفوظة بالمفضلة</span>
              {visitorSubTab === 'favorites' && (
                <div className="absolute bottom-0 right-0 left-0 h-0.5 bg-[#1a4d2e] rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setVisitorSubTab('reviews')}
              className={`pb-3 relative transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                visitorSubTab === 'reviews' ? 'text-[#1a4d2e] font-black' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <MessageSquareText className="h-4 w-4 text-blue-500" />
              <span>تقييماتي وآرائي المنشورة</span>
              {visitorSubTab === 'reviews' && (
                <div className="absolute bottom-0 right-0 left-0 h-0.5 bg-[#1a4d2e] rounded-full" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setVisitorSubTab('housings')}
              className={`pb-3 relative transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                visitorSubTab === 'housings' ? 'text-[#1a4d2e] font-black' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Home className="h-4 w-4 text-emerald-600" />
              <span>عقاراتي وسكناتي ({userHousings.length})</span>
              {visitorSubTab === 'housings' && (
                <div className="absolute bottom-0 right-0 left-0 h-0.5 bg-[#1a4d2e] rounded-full" />
              )}
            </button>
          </div>

          {visitorSubTab === 'favorites' && <VisitorFavoritesTab />}
          {visitorSubTab === 'reviews' && <VisitorReviewsTab />}
          {visitorSubTab === 'housings' && (
            <VisitorHousingsTab 
              housings={userHousings} 
              onRefresh={fetchUserHousings} 
            />
          )}
        </div>
      )}

      {/* TAB 3: STAFF PORTAL */}
      {profileMainTab === 'staff' && isStaff && (
        <div className="bg-white p-8 rounded-[32px] border border-amber-200 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-stone-900">
                {isAdmin ? 'مدير المنظومة العام' : 'مشرف معتمد في شو في بإربد'}
              </h3>
              <p className="text-xs text-stone-500">
                لديك وصول إداري معتمد إلى لوحة تحكم المنصة وقبول طلبات التسجيل.
              </p>
            </div>
          </div>

          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
            <div className="font-bold text-xs text-stone-800">الصلاحيات المعتمدة لحسابك:</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>{isAdmin || supervisorPermissions?.canApproveShops ? 'مراجعة واعتماد المحلات الجديدة' : 'لا تملك صلاحية اعتماد المحلات'}</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>{isAdmin || supervisorPermissions?.canModerateJobs ? 'مراجعة وتعديل الوظائف الشاغرة' : 'لا تملك صلاحية إدارة الوظائف'}</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>{isAdmin || supervisorPermissions?.canModerateReviews ? 'مراجعة التقييمات والبلاغات' : 'لا تملك صلاحية مراقبة التقييمات'}</span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-stone-200 flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>{isAdmin ? 'إدارة المشرفين والإعدادات والنسخ الاحتياطي' : 'إدارة الحسابات العامة (المدير العام فقط)'}</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-6 py-3 rounded-2xl font-black text-sm shadow-md transition-all cursor-pointer"
            >
              <span>فتح لوحة التحكم والإشراف الشاملة</span>
              <ExternalLink className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* TAB 2: MERCHANT HUB */}
      {profileMainTab === 'merchant' && (
        <div className="space-y-6 sm:space-y-8 min-w-0">
          <div className="bg-[#fdfcfb] border border-[#e5e1da] rounded-3xl md:rounded-[32px] p-4 sm:p-8 shadow-sm space-y-5 sm:space-y-6 min-w-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#2d2a26] flex items-center gap-2">
              <Store className="h-5 w-5 sm:h-6 sm:w-6 text-[#1a4d2e] shrink-0" />
              <span>لوحة تحكم المنشآت والشركاء</span>
            </h2>
            <p className="text-xs text-stone-500 mt-1">أهلاً بك في مركز التحكم بمحلاتك وعروضك والوظائف الشاغرة</p>
          </div>
          <Link to="/contact" className="inline-flex items-center justify-center gap-1 bg-[#1a4d2e]/10 text-[#1a4d2e] px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-[#1a4d2e]/15 transition-all self-start sm:self-auto">
            <Plus className="h-4 w-4 shrink-0" />
            <span>تسجيل محل جديد</span>
          </Link>
        </div>

        {businesses.length === 0 ? (
          <div className="text-center py-12 bg-stone-50 rounded-2xl border border-dashed border-[#e5e1da]">
            <Store className="h-12 w-12 text-[#1a4d2e]/30 mx-auto mb-3" />
            <p className="text-stone-500 font-bold mb-4">لم تقم بإضافة أي محلات مسجلة في إربد بعد.</p>
            <Link to="/contact" className="inline-flex px-6 py-3 bg-[#1a4d2e] text-white rounded-xl font-bold hover:bg-[#133b22] transition-colors">
              سجّل محلك الأول الآن مجاناً
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Business Selector (Horizontal Tabs if multiple) */}
            {businesses.length > 1 && (
              <div className="bg-stone-50 p-1.5 rounded-2xl border border-stone-200/60 flex flex-wrap gap-1">
                {businesses.map((biz) => {
                  const isActive = selectedBusiness?.id === biz.id;
                  const isVip = getBusinessVipStatus(biz).isVip;
                  return (
                    <button
                      key={biz.id}
                      onClick={() => {
                        setSelectedBusiness(biz);
                        setActiveSectionTab('overview');
                        setIsAddingOffer(false);
                      }}
                      className={`flex-1 min-w-[140px] text-right p-3 rounded-xl transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-white shadow-sm border border-stone-200 font-black text-[#1a4d2e]' 
                          : 'hover:bg-stone-100/70 text-stone-600 font-bold'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs">{biz.name}</span>
                        {isVip && <Crown className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Currently Selected Store WorkSpace */}
            {selectedBusiness && (() => {
              const vipInfo = getBusinessVipStatus(selectedBusiness);
              return (
                <div className="border border-stone-200/80 rounded-2xl bg-white overflow-hidden shadow-2xs">
                  {/* Shop Info Header Banner */}
                  <div className="bg-[#1a4d2e]/5 p-5 border-b border-stone-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-black text-[#2d2a26]">{selectedBusiness.name}</h3>
                        {vipInfo.isVip ? (
                          <span className="text-[10px] bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-2xs">
                            <Crown className="h-3 w-3 fill-white" />
                            VIP الذهبي
                          </span>
                        ) : (
                          <span className="text-[10px] bg-stone-100 border border-stone-200 text-stone-500 font-bold px-2 py-0.5 rounded-full">
                            باقة أساسية
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 mt-1">{selectedBusiness.category} • {selectedBusiness.address}</p>
                    </div>

                    <div className="flex gap-2">
                      <Link 
                        to={`/business/${selectedBusiness.id}`}
                        className="inline-flex items-center gap-1 bg-stone-100 hover:bg-stone-200 text-stone-700 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors"
                      >
                        <span>معاينة صفحة المحل</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>

                      {!vipInfo.isVip && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBusinessForUpgrade(selectedBusiness);
                            setIsUpgradeModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-2xs transition-colors cursor-pointer"
                        >
                          <Crown className="h-3.5 w-3.5 fill-white" />
                          <span>ترقية لـ VIP</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Dashboard Workspace Tab Navigation */}
                  <div className="flex border-b border-stone-200 overflow-x-auto bg-stone-50/50">
                    <button
                      type="button"
                      onClick={() => { setActiveSectionTab('overview'); setIsAddingOffer(false); }}
                      className={`flex-1 min-w-[90px] py-3 text-center text-xs font-bold border-b-2 transition-all cursor-pointer ${
                        activeSectionTab === 'overview' 
                          ? 'border-[#1a4d2e] text-[#1a4d2e] bg-white font-black' 
                          : 'border-transparent text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      📊 ملخص الأداء
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveSectionTab('edit_info'); setIsAddingOffer(false); }}
                      className={`flex-1 min-w-[90px] py-3 text-center text-xs font-bold border-b-2 transition-all cursor-pointer ${
                        activeSectionTab === 'edit_info' 
                          ? 'border-[#1a4d2e] text-[#1a4d2e] bg-white font-black' 
                          : 'border-transparent text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      ✍️ تعديل المعلومات
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveSectionTab('offers'); setIsAddingOffer(false); }}
                      className={`flex-1 min-w-[90px] py-3 text-center text-xs font-bold border-b-2 transition-all cursor-pointer ${
                        activeSectionTab === 'offers' 
                          ? 'border-[#1a4d2e] text-[#1a4d2e] bg-white font-black' 
                          : 'border-transparent text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      🏷️ العروض والتنزيلات ({offers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveSectionTab('reviews'); setIsAddingOffer(false); }}
                      className={`flex-1 min-w-[120px] py-3 text-center text-xs font-bold border-b-2 transition-all cursor-pointer ${
                        activeSectionTab === 'reviews' 
                          ? 'border-[#1a4d2e] text-[#1a4d2e] bg-white font-black' 
                          : 'border-transparent text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      💬 إدارة التقييمات والردود ({businessReviews.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveSectionTab('homepage_banner'); setIsAddingOffer(false); }}
                      className={`flex-1 min-w-[130px] py-3 text-center text-xs font-bold border-b-2 transition-all cursor-pointer ${
                        activeSectionTab === 'homepage_banner' 
                          ? 'border-[#1a4d2e] text-[#1a4d2e] bg-white font-black' 
                          : 'border-transparent text-stone-500 hover:text-stone-800'
                      }`}
                    >
                      📢 بانر الصفحة الرئيسية
                    </button>
                  </div>

                  {/* Active Panel Content */}
                  <div className="p-5 min-h-[220px]">
                    {/* 1. OVERVIEW PANEL */}
                    {activeSectionTab === 'overview' && (
                      <div className="space-y-6">
                        {/* Core Stats Overview */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="bg-stone-50 border border-stone-100 p-4 rounded-xl text-right">
                            <span className="text-[10px] font-bold text-stone-400 block mb-1">الزيارات والمشاهدات المسجلة</span>
                            <span className="text-xl font-black text-[#1a4d2e]">
                              {(selectedBusiness.analytics?.views ?? selectedBusiness.views ?? 0).toLocaleString('ar-JO')}
                            </span>
                            <span className="text-[10px] text-stone-500 block mt-1">إجمالي مشاهدات بطاقة المحل</span>
                          </div>
                          <div className="bg-stone-50 border border-stone-100 p-4 rounded-xl text-right">
                            <span className="text-[10px] font-bold text-stone-400 block mb-1">تخفيضات وعروض فعالة</span>
                            <span className="text-xl font-black text-amber-600">{offers.length}</span>
                            <span className="text-[10px] text-stone-500 block mt-1">عروض ترويجية نشطة</span>
                          </div>
                          <div className="bg-stone-50 border border-stone-100 p-4 rounded-xl text-right">
                            <span className="text-[10px] font-bold text-stone-400 block mb-1">شواغر التوظيف</span>
                            <span className="text-xl font-black text-indigo-600">
                              {userJobs.filter(j => j.businessId === selectedBusiness.id).length}
                            </span>
                            <span className="text-[10px] text-stone-500 block mt-1">فرص عمل منشورة</span>
                          </div>
                        </div>

                        {/* NEW Merchant Tools Row: QR Poster, Scheduled Push, Multi-Branch */}
                        <div className="p-4 bg-gradient-to-r from-emerald-900 via-[#1a4d2e] to-[#123821] rounded-2xl text-white space-y-3 shadow-md">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4 text-[#ff9f1c]" />
                              <span className="text-xs font-black text-white">أدوات إدارية سريعة لصاحب المحل</span>
                            </div>
                            <span className="text-[10px] font-bold bg-white/15 px-2.5 py-0.5 rounded-full text-emerald-200">
                              ميزات متقدمة
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <button
                              type="button"
                              onClick={() => setIsQrPosterOpen(true)}
                              className="inline-flex items-center justify-center gap-2 bg-white text-stone-900 hover:bg-stone-100 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer"
                            >
                              <Printer className="h-4 w-4 text-[#1a4d2e]" />
                              <span>🖨️ طباعة ملصق وطاولات QR</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setIsScheduledNotifOpen(true)}
                              className="inline-flex items-center justify-center gap-2 bg-[#ff9f1c] hover:bg-[#e0890f] text-stone-950 px-3.5 py-2.5 rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer"
                            >
                              <Calendar className="h-4 w-4 text-stone-950" />
                              <span>📅 حجز موعد إشعار ترويجي</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setIsMultiBranchOpen(true)}
                              className="inline-flex items-center justify-center gap-2 bg-emerald-800/90 hover:bg-emerald-700 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all border border-emerald-500/30 cursor-pointer"
                            >
                              <Building2 className="h-4 w-4 text-emerald-300" />
                              <span>🏢 إضافة وتكرار فرع جديد</span>
                            </button>
                          </div>
                        </div>

                        {/* VIP Exclusive Live Analytics or Non-VIP Upgrade Callout */}
                        {vipInfo.isVip ? (
                          <div className="space-y-5 pt-2">
                            <div className="bg-amber-50/50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between flex-wrap gap-3">
                              <div className="flex items-center gap-2">
                                <Crown className="h-5 w-5 text-amber-600 fill-amber-500" />
                                <div>
                                  <h4 className="text-sm font-black text-amber-950">لوحة إحصائيات VIP الذهبية الحية</h4>
                                  <p className="text-xs text-stone-500">مؤشرات أداء مسجلة ومحدثة تلقائياً في قاعدة البيانات</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => { setSelectedBusinessForMenu(selectedBusiness); setIsMenuModalOpen(true); }}
                                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                >
                                  <UtensilsCrossed className="h-3.5 w-3.5" />
                                  <span>إدارة المنيو الرقمي</span>
                                </button>
                              </div>
                            </div>

                            {/* Embedded Real VIP Analytics Dashboard */}
                            <VipAnalyticsDashboard business={selectedBusiness} isOwner={true} />
                          </div>
                        ) : (
                          <div className="bg-gradient-to-r from-stone-50 via-amber-50/30 to-amber-50/60 border border-amber-200/80 p-5 rounded-2xl space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                              <div className="space-y-1 text-right">
                                <span className="text-sm font-black text-amber-950 flex items-center gap-1.5">
                                  <Crown className="h-4 w-4 text-amber-500 fill-amber-500" />
                                  ترقية المحل للباقة الذهبية VIP 👑
                                </span>
                                <p className="text-xs text-stone-600 leading-relaxed">
                                  تحصل الباقة الذهبية على تقارير تفصيلية شاملة مسجلة في قاعدة البيانات لجميع تفاعلات الزوار.
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => { setSelectedBusinessForUpgrade(selectedBusiness); setIsUpgradeModalOpen(true); }}
                                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black px-5 py-2.5 rounded-xl shrink-0 shadow-xs transition-colors cursor-pointer"
                              >
                                اكتشف باقة VIP الذهبية 👑
                              </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-amber-200/50">
                              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-100 text-right">
                                <span className="text-[10px] text-stone-500 font-bold block">محادثات الواتساب</span>
                                <span className="text-xs font-black text-amber-800">ميزة VIP 🔒</span>
                              </div>
                              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-100 text-right">
                                <span className="text-[10px] text-stone-500 font-bold block">الاتصالات الهاتفية</span>
                                <span className="text-xs font-black text-amber-800">ميزة VIP 🔒</span>
                              </div>
                              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-100 text-right">
                                <span className="text-[10px] text-stone-500 font-bold block">الاتجاهات والخريطة</span>
                                <span className="text-xs font-black text-amber-800">ميزة VIP 🔒</span>
                              </div>
                              <div className="bg-white/80 p-2.5 rounded-xl border border-amber-100 text-right">
                                <span className="text-[10px] text-stone-500 font-bold block">استعراض المنيو</span>
                                <span className="text-xs font-black text-amber-800">ميزة VIP 🔒</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Simple Toggle Settings */}
                        <div className="border-t border-stone-100 pt-4 space-y-3">
                          <h4 className="text-xs font-bold text-stone-700 flex items-center gap-1">
                            <Settings className="h-3.5 w-3.5 text-stone-400" />
                            إعدادات الخصوصية السريعة:
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className="flex items-center gap-2.5 p-2.5 bg-stone-50/70 border border-stone-200/80 rounded-xl cursor-pointer hover:bg-stone-50 transition-colors">
                              <input 
                                type="checkbox"
                                checked={!!editForm.hideSiteReviews}
                                onChange={async (e) => {
                                  const updated = { ...editForm, hideSiteReviews: e.target.checked };
                                  setEditForm(updated);
                                  if (db) {
                                    await updateDoc(doc(db, 'businesses', selectedBusiness.id), { hideSiteReviews: e.target.checked });
                                    setBusinesses(prev => prev.map(b => b.id === selectedBusiness.id ? { ...b, hideSiteReviews: e.target.checked } : b));
                                    setSelectedBusiness({ ...selectedBusiness, hideSiteReviews: e.target.checked });
                                  }
                                }}
                                className="h-4 w-4 rounded text-[#1a4d2e] focus:ring-[#1a4d2e] border-stone-300"
                              />
                              <span className="text-xs font-bold text-stone-700">إخفاء تقييمات المنصة</span>
                            </label>

                            <label className="flex items-center gap-2.5 p-2.5 bg-stone-50/70 border border-stone-200/80 rounded-xl cursor-pointer hover:bg-stone-50 transition-colors">
                              <input 
                                type="checkbox"
                                checked={!!editForm.hideGoogleReviews}
                                onChange={async (e) => {
                                  const updated = { ...editForm, hideGoogleReviews: e.target.checked };
                                  setEditForm(updated);
                                  if (db) {
                                    await updateDoc(doc(db, 'businesses', selectedBusiness.id), { hideGoogleReviews: e.target.checked });
                                    setBusinesses(prev => prev.map(b => b.id === selectedBusiness.id ? { ...b, hideGoogleReviews: e.target.checked } : b));
                                    setSelectedBusiness({ ...selectedBusiness, hideGoogleReviews: e.target.checked });
                                  }
                                }}
                                className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-stone-300"
                              />
                              <span className="text-xs font-bold text-stone-700">إخفاء تقييمات قوقل مابس</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. EDIT INFO PANEL */}
                    {activeSectionTab === 'edit_info' && (
                      <div className="p-4 sm:p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-stone-100">
                          <div>
                            <h3 className="text-base font-black text-[#2d2a26] flex items-center gap-2">
                              <Edit3 className="h-5 w-5 text-[#1a4d2e]" />
                              تعديل وتحديث بيانات المحل ({selectedBusiness.name})
                            </h3>
                            <p className="text-xs text-stone-500 mt-0.5">
                              تحكم بجميع تفاصيل المنشأة من الاسم والتصنيف والموقع، إلى ساعات العمل وحسابات التواصل الاجتماعي
                            </p>
                          </div>
                          <Link 
                            to={`/business/${selectedBusiness.id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors"
                          >
                            <span>معاينة صفحة المحل</span>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </div>

                        <StoreEditForm
                          business={selectedBusiness}
                          onSave={handleSaveStoreData}
                          onDelete={handleDeleteBusiness}
                          isSaving={isSavingBusiness}
                        />
                      </div>
                    )}

                    {/* 3. OFFERS & DEALS PANEL */}
                    {activeSectionTab === 'offers' && (
                      vipInfo.isVip ? (
                        <div className="space-y-4">
                        {isAddingOffer ? (
                          // Add Offer Inline Form
                          <form onSubmit={handleCreateOffer} className="space-y-4 border border-amber-200 bg-amber-50/10 p-5 rounded-2xl animate-in fade-in zoom-in-95">
                            <div className="flex justify-between items-center pb-2 border-b border-stone-100">
                              <h4 className="text-sm font-black text-stone-800 flex items-center gap-1.5">
                                <Tag className="h-4 w-4 text-amber-500" />
                                إضافة وتصميم عرض ترويجي جديد لمحلك
                              </h4>
                              <button 
                                type="button"
                                onClick={() => setIsAddingOffer(false)}
                                className="text-stone-400 hover:text-stone-600 text-xs font-bold"
                              >
                                إلغاء وتراجع
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold text-stone-700 mb-1">عنوان العرض الترويجي الجذاب</label>
                                <input 
                                  type="text"
                                  required
                                  value={newOfferForm.title}
                                  onChange={e => setNewOfferForm({...newOfferForm, title: e.target.value})}
                                  placeholder="مثال: خصم 30% على وجبة الشاورما العائلية"
                                  className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-stone-700 mb-1">شارة نسبة الخصم</label>
                                <input 
                                  type="text"
                                  required
                                  value={newOfferForm.discountPercentage}
                                  onChange={e => setNewOfferForm({...newOfferForm, discountPercentage: e.target.value})}
                                  placeholder="مثال: 30% أو خصم 5 دنانير"
                                  className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs font-bold text-stone-700 mb-1">السعر الأصلي قبل الخصم (اختياري)</label>
                                <input 
                                  type="text"
                                  value={newOfferForm.oldPrice}
                                  onChange={e => setNewOfferForm({...newOfferForm, oldPrice: e.target.value})}
                                  placeholder="مثال: 12 دينار"
                                  className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-stone-700 mb-1">السعر الجديد بعد الخصم (اختياري)</label>
                                <input 
                                  type="text"
                                  value={newOfferForm.newPrice}
                                  onChange={e => setNewOfferForm({...newOfferForm, newPrice: e.target.value})}
                                  placeholder="مثال: 8.5 دينار"
                                  className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-stone-700 mb-1">كود الخصم (اختياري)</label>
                                <input 
                                  type="text"
                                  value={newOfferForm.code}
                                  onChange={e => setNewOfferForm({...newOfferForm, code: e.target.value})}
                                  placeholder="مثال: IRBID20"
                                  className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-left focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-bold text-stone-700 mb-1">مدة صلاحية العرض</label>
                                <input 
                                  type="text"
                                  value={newOfferForm.expiresIn}
                                  onChange={e => setNewOfferForm({...newOfferForm, expiresIn: e.target.value})}
                                  placeholder="مثال: لغاية نهاية الأسبوع الحالي"
                                  className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-stone-700 mb-1">رقم واتساب لإرسال العرض</label>
                                <input 
                                  type="tel"
                                  dir="ltr"
                                  value={newOfferForm.whatsapp}
                                  onChange={e => setNewOfferForm({...newOfferForm, whatsapp: e.target.value})}
                                  placeholder="أدخل هاتف الواتساب للمحل للتواصل"
                                  className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-right focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-stone-700 mb-1">تفاصيل العرض وشروطه</label>
                              <textarea 
                                required
                                rows={2}
                                value={newOfferForm.description}
                                onChange={e => setNewOfferForm({...newOfferForm, description: e.target.value})}
                                placeholder="اكتب لزبائنك تفاصيل الوجبة أو المنتج وما يشمله العرض من مزايا..."
                                className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none"
                              ></textarea>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-stone-700 mb-1">رابط صورة العرض (أو اتركه لعرض صورة افتراضية)</label>
                              <input 
                                type="url"
                                dir="ltr"
                                value={newOfferForm.image}
                                onChange={e => setNewOfferForm({...newOfferForm, image: e.target.value})}
                                placeholder="https://example.com/offer-image.jpg"
                                className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-left focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                              />
                            </div>

                            {/* Options */}
                            <div className="flex flex-wrap gap-4 pt-1">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={newOfferForm.isHot}
                                  onChange={e => setNewOfferForm({...newOfferForm, isHot: e.target.checked})}
                                  className="h-4 w-4 rounded text-red-600 focus:ring-red-500 border-stone-300"
                                />
                                <span className="text-xs font-bold text-stone-700 flex items-center gap-1">
                                  <Flame className="h-3.5 w-3.5 text-red-500" />
                                  تصنيف كعرض ناري عاجل 🔥
                                </span>
                              </label>

                              <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={newOfferForm.isStudent}
                                  onChange={e => setNewOfferForm({...newOfferForm, isStudent: e.target.checked})}
                                  className="h-4 w-4 rounded text-sky-600 focus:ring-sky-500 border-stone-300"
                                />
                                <span className="text-xs font-bold text-stone-700 flex items-center gap-1">
                                  <Award className="h-3.5 w-3.5 text-sky-500" />
                                  عرض خاص للطلاب والجامعات 🎓
                                </span>
                              </label>
                            </div>

                            <div className="flex gap-3 pt-2">
                              <button
                                type="submit"
                                disabled={submittingOffer}
                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white px-5 py-3 rounded-xl text-xs font-black transition-colors cursor-pointer shadow-2xs"
                              >
                                {submittingOffer ? 'جاري النشر...' : 'انشر العرض فوراً للجميع 🚀'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsAddingOffer(false)}
                                className="bg-stone-100 hover:bg-stone-200 text-stone-600 px-4 py-3 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                              >
                                تراجع
                              </button>
                            </div>
                          </form>
                        ) : (
                          // Offers List Render
                          <div className="space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-bold text-stone-500">العروض المعروضة حالياً على المنصة لمحلّك:</span>
                              <button
                                type="button"
                                onClick={() => setIsAddingOffer(true)}
                                className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-2 rounded-xl text-xs font-black shadow-2xs cursor-pointer transition-colors"
                              >
                                <Plus className="h-4 w-4" />
                                <span>صمّم وانشر عرضاً جديداً 🔥</span>
                              </button>
                            </div>

                            {loadingOffers ? (
                              <div className="text-center py-6">
                                <div className="inline-block w-6 h-6 rounded-full border-2 border-stone-200 border-t-[#1a4d2e] animate-spin"></div>
                              </div>
                            ) : offers.length === 0 ? (
                              <div className="text-center py-10 bg-amber-50/20 rounded-2xl border border-dashed border-amber-200/50 p-6 space-y-2 text-stone-500">
                                <Tag className="h-8 w-8 text-amber-500/40 mx-auto" />
                                <h4 className="text-xs font-bold text-stone-800">لم تنشر أي عرض خاص أو تخفيض لمحلك حتى الآن!</h4>
                                <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
                                  العروض الترويجية والخصومات هي سلاحك الذهبي لجلب آلاف الزبائن الجدد من مستخدمي المنصة وطلاب جامعات إربد.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => setIsAddingOffer(true)}
                                  className="inline-flex items-center gap-1.5 text-xs font-black text-amber-600 bg-amber-100/50 px-4 py-2 rounded-xl mt-2 hover:bg-amber-100 transition-colors cursor-pointer"
                                >
                                  انشر أول عرض ترويجي لمحلك الآن 🔥
                                </button>
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {offers.map((offer) => (
                                  <div 
                                    key={offer.id}
                                    className="border-2 border-dashed border-stone-200 bg-[#fdfcfb] rounded-2xl p-4.5 relative overflow-hidden flex flex-col justify-between text-right shadow-2xs hover:border-amber-400/40 transition-colors"
                                  >
                                    <div className="absolute top-1/2 -translate-y-1/2 -right-2.5 w-5 h-5 rounded-full bg-white border-l-2 border-dashed border-stone-200"></div>
                                    <div className="absolute top-1/2 -translate-y-1/2 -left-2.5 w-5 h-5 rounded-full bg-white border-r-2 border-dashed border-stone-200"></div>

                                    <div>
                                      <div className="flex justify-between items-start gap-2 mb-2">
                                        <span className="text-[10px] font-black bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md shadow-3xs">
                                          خصم {offer.discountPercentage}
                                        </span>
                                        <div className="flex gap-1">
                                          {offer.isHot && <span className="text-[9px] font-black bg-red-100 text-red-700 px-1.5 py-0.5 rounded">عاجل 🔥</span>}
                                          {offer.isStudent && <span className="text-[9px] font-black bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded">طلاب 🎓</span>}
                                        </div>
                                      </div>

                                      <h4 className="text-xs font-black text-stone-900 mb-1">{offer.title}</h4>
                                      <p className="text-[11px] text-stone-500 line-clamp-2 mb-3 leading-relaxed">{offer.description}</p>
                                    </div>

                                    <div className="pt-3 border-t border-dashed border-stone-200/80 mt-auto flex justify-between items-center">
                                      <div className="text-xs">
                                        {offer.newPrice && (
                                          <div className="flex items-center gap-1">
                                            <span className="text-stone-400 line-through text-[10px]">{offer.oldPrice}</span>
                                            <span className="text-emerald-700 font-black">{offer.newPrice}</span>
                                          </div>
                                        )}
                                        {offer.code && <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded font-mono">كود: {offer.code}</span>}
                                      </div>

                                      <button 
                                        type="button"
                                        onClick={() => handleDeleteOffer(offer.id)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                                        title="حذف العرض"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="py-10 px-6 text-center bg-gradient-to-br from-amber-50/50 via-white to-stone-50 rounded-2xl border border-dashed border-amber-300 space-y-4">
                        <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                          <Crown className="h-8 w-8 fill-amber-500 text-amber-600" />
                        </div>
                        <div className="max-w-md mx-auto space-y-2">
                          <h4 className="text-lg font-black text-amber-950">نشر العروض والخصومات ميزة حصرية للباقة الذهبية VIP</h4>
                          <p className="text-xs text-stone-600 leading-relaxed">
                            محلك الحالي مشترك في <span className="font-bold text-stone-900">الباقة الأساسية</span>. للتمكن من تصميم ونشر العروض الترويجية والخصومات الخاصة في صفحة العروض والتطبيق وجذب آلاف الزبائن، يرجى الترقية إلى الباقة الذهبية.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBusinessForUpgrade(selectedBusiness);
                            setIsUpgradeModalOpen(true);
                          }}
                          className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs px-6 py-3 rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          <Crown className="h-4 w-4 fill-white" />
                          <span>ترقية {selectedBusiness.name} إلى باقة VIP الذهبية الآن 👑</span>
                        </button>
                      </div>
                    ))}

                    {/* 4. REVIEWS PANEL */}
                    {activeSectionTab === 'reviews' && (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center pb-4 border-b border-stone-100">
                          <div>
                            <h3 className="text-base font-black text-[#2d2a26] flex items-center gap-2">
                              <MessageSquare className="h-5 w-5 text-[#1a4d2e]" />
                              مركز إدارة التقييمات والردود على المراجعات
                            </h3>
                            <p className="text-xs text-stone-500 mt-0.5">
                              تابع آراء الزبائن وتفاعل مع تقييماتهم بكتابة ردود ترحيبية أو توضيحية لتعزيز ثقتهم بمحلك
                            </p>
                          </div>
                        </div>

                        {loadingBusinessReviews ? (
                          <div className="text-center py-12">
                            <div className="inline-block w-8 h-8 rounded-full border-2 border-stone-200 border-t-[#1a4d2e] animate-spin"></div>
                            <p className="text-xs font-bold text-stone-500 mt-3">جاري تحميل مراجعات الزبائن...</p>
                          </div>
                        ) : businessReviews.length === 0 ? (
                          <div className="text-center py-12 bg-stone-50/50 rounded-2xl border border-dashed border-stone-200 p-6 space-y-2 text-stone-500">
                            <MessageSquare className="h-8 w-8 text-stone-300 mx-auto" />
                            <h4 className="text-xs font-bold text-stone-800">لا توجد أي مراجعات أو تقييمات منشورة لمحلك حالياً!</h4>
                            <p className="text-[11px] text-stone-500 max-w-sm mx-auto">
                              شجع زوار محلك على كتابة آرائهم وتقييم تجربتهم على المنصة لتبني سمعة رقمية قوية وتكسب ثقة زبائن جدد.
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {businessReviews.map((review) => (
                              <div key={review.id} className="p-4.5 rounded-2xl bg-white border border-stone-200 shadow-3xs space-y-3.5 text-right">
                                <div className="flex justify-between items-start gap-4">
                                  <div>
                                    <h4 className="text-xs font-black text-stone-900">{review.authorName || 'زائر كريم'}</h4>
                                    <span className="text-[10px] text-stone-400 block mt-0.5">
                                      {review.createdAt ? new Date(review.createdAt).toLocaleDateString('ar-JO', { dateStyle: 'long' }) : ''}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-0.5 text-[#ff9f1c]">
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <Star key={i} className={`h-3.5 w-3.5 ${i < (review.rating || 5) ? 'fill-[#ff9f1c]' : 'text-stone-200'}`} />
                                    ))}
                                  </div>
                                </div>

                                <p className="text-xs text-stone-700 leading-relaxed font-medium bg-stone-50/50 p-3 rounded-xl border border-stone-100">
                                  "{review.comment}"
                                </p>

                                {/* Existing Reply Block */}
                                {review.merchantReply ? (
                                  <div className="bg-[#1a4d2e]/5 p-3.5 rounded-xl border border-[#1a4d2e]/15 space-y-1.5 relative">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[11px] font-black text-[#1a4d2e] flex items-center gap-1">
                                        💬 ردّك على هذا التقييم:
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteReply(review.id)}
                                        className="text-red-500 hover:text-red-700 text-[10px] font-bold p-1 rounded hover:bg-red-50 transition-colors cursor-pointer"
                                      >
                                        حذف الرد
                                      </button>
                                    </div>
                                    <p className="text-xs text-stone-800 leading-relaxed font-bold">{review.merchantReply}</p>
                                    {review.merchantReplyAt && (
                                      <span className="text-[9px] text-stone-400 block">
                                        تم الرد في: {new Date(review.merchantReplyAt).toLocaleString('ar-JO', { dateStyle: 'medium', timeStyle: 'short' })}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  /* Write Reply Form */
                                  <div className="space-y-2 pt-1 border-t border-stone-100">
                                    <textarea
                                      value={replyTexts[review.id] || ''}
                                      onChange={(e) => setReplyTexts(prev => ({ ...prev, [review.id]: e.target.value }))}
                                      placeholder="اكتب ردّك اللطيف والمحترف والمرحب بالزبون الكريم هنا..."
                                      rows={2}
                                      className="w-full bg-white border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20"
                                    ></textarea>
                                    <div className="flex justify-end">
                                      <button
                                        type="button"
                                        disabled={!(replyTexts[review.id] || '').trim()}
                                        onClick={() => handlePostReply(review.id)}
                                        className="inline-flex items-center gap-1.5 bg-[#1a4d2e] hover:bg-[#133b22] disabled:bg-stone-100 disabled:text-stone-400 text-white px-3.5 py-1.5 rounded-xl text-xs font-black shadow-3xs cursor-pointer transition-colors"
                                      >
                                        <span>نشر الرد العام 💬</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 5. HOMEPAGE BANNER PANEL */}
                    {activeSectionTab === 'homepage_banner' && (
                      <div className="space-y-6">
                        <div className="flex justify-between items-center pb-4 border-b border-stone-100">
                          <div>
                            <h3 className="text-base font-black text-[#2d2a26] flex items-center gap-2">
                              <Megaphone className="h-5 w-5 text-[#1a4d2e]" />
                              إدارة إعلان البانر على الصفحة الرئيسية
                            </h3>
                            <p className="text-xs text-stone-500 mt-0.5">
                              احجز مساحة إعلانية بارزة في أعلى صفحة الموقع الرئيسية لزيادة تفاعل وزيادة زوار محلك التجاري.
                            </p>
                          </div>
                        </div>

                        {loadingBannerRequest ? (
                          <div className="text-center py-12">
                            <div className="inline-block w-8 h-8 rounded-full border-2 border-stone-200 border-t-[#1a4d2e] animate-spin"></div>
                            <p className="text-xs font-bold text-stone-500 mt-3">جاري تحميل تفاصيل طلب الإعلان...</p>
                          </div>
                        ) : !isEditingBannerForm && currentBannerRequest ? (
                          // If request exists and not editing
                          <div className="space-y-6">
                            {/* Current Status Banner */}
                            <div className={`p-5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-right ${
                              currentBannerRequest.status === 'completed' || currentBannerRequest.status === 'approved'
                                ? 'bg-emerald-50/50 border-emerald-200'
                                : currentBannerRequest.status === 'contacted'
                                ? 'bg-blue-50/50 border-blue-200'
                                : currentBannerRequest.status === 'rejected'
                                ? 'bg-red-50/50 border-red-200'
                                : 'bg-amber-50/50 border-amber-200'
                            }`}>
                              <div className="space-y-1 text-right">
                                <div className="flex items-center gap-2 font-black text-sm justify-start">
                                  <span>حالة الطلب الإعلاني:</span>
                                  <span className={`px-2.5 py-0.5 rounded-full text-xs ${
                                    currentBannerRequest.status === 'completed' || currentBannerRequest.status === 'approved'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : currentBannerRequest.status === 'contacted'
                                      ? 'bg-blue-100 text-blue-800'
                                      : currentBannerRequest.status === 'rejected'
                                      ? 'bg-red-100 text-red-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}>
                                    {currentBannerRequest.status === 'completed' || currentBannerRequest.status === 'approved'
                                      ? 'مفعّل ومعروض حالياً ✅'
                                      : currentBannerRequest.status === 'contacted'
                                      ? 'تم التواصل وقيد التنسيق 📞'
                                      : currentBannerRequest.status === 'rejected'
                                      ? 'تم رفض الطلب ❌'
                                      : 'بانتظار مراجعة الإدارة ⏳'}
                                  </span>
                                </div>
                                <p className="text-xs text-stone-600 leading-relaxed max-w-xl">
                                  {currentBannerRequest.status === 'completed' || currentBannerRequest.status === 'approved'
                                    ? 'إعلانك معتمد ومفعّل الآن في سلايدر أعلى الصفحة الرئيسية لمنصة "شو في بإربد" وهو يعرض للزوار على مدار الساعة.'
                                    : currentBannerRequest.status === 'contacted'
                                    ? 'تم استلام طلبك وبدأ التنسيق معك. سيتم تفعيل البانر مباشرة على الصفحة الرئيسية فور اعتماد الدفع والتصميم.'
                                    : currentBannerRequest.status === 'rejected'
                                    ? 'عذراً، تم رفض الطلب من قبل الإدارة. يرجى مراجعة محتوى الإعلان أو الصورة، وتعديل البيانات وإرسالها للمراجعة مجدداً.'
                                    : 'تم استلام طلبك وهو قيد المراجعة والتحقق من قبل فريق الإدارة. سنقوم بالتواصل معك وتفعيل البانر خلال 24 ساعة.'}
                                </p>
                              </div>

                              <div className="flex sm:flex-col gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setIsEditingBannerForm(true)}
                                  className="flex-1 bg-stone-900 hover:bg-stone-800 text-white text-xs font-black px-4 py-2.5 rounded-xl transition-colors cursor-pointer text-center"
                                >
                                  تعديل البانر ✍️
                                </button>
                                <button
                                  type="button"
                                  onClick={handleDeleteBannerRequest}
                                  className="flex-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors cursor-pointer text-center"
                                >
                                  إلغاء وحذف الطلب 🗑️
                                </button>
                              </div>
                            </div>

                            {/* Live Preview Section */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-black text-stone-700 flex items-center gap-1 justify-start">
                                <Sparkles className="h-4 w-4 text-[#ff9f1c]" />
                                معاينة البانر التفاعلية (كيف يظهر للزوار على الصفحة الرئيسية):
                              </h4>
                              
                              <div className="relative w-full aspect-[21/9] sm:aspect-[2.39/1] min-h-[160px] max-h-[360px] rounded-2xl overflow-hidden border border-stone-200 shadow-sm bg-stone-950 group">
                                <img
                                  src={currentBannerRequest.bannerImageUrl || selectedBusiness?.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'}
                                  alt="Preview background"
                                  className="absolute inset-0 w-full h-full object-cover opacity-85 transition-transform duration-700 group-hover:scale-105"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                                {/* Interactive contents based on bannerType */}
                                {(currentBannerRequest.bannerType === 'business' || currentBannerRequest.bannerType === 'text_and_button' || !currentBannerRequest.bannerType) ? (
                                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 md:p-8 text-right text-white space-y-2 max-w-2xl">
                                    <div className="flex flex-wrap items-center gap-2 justify-start">
                                      {currentBannerRequest.badgeText && (
                                        <span className="bg-[#ff9f1c] text-stone-950 text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full shadow-xs">
                                          {currentBannerRequest.badgeText}
                                        </span>
                                      )}
                                      {currentBannerRequest.bannerType === 'business' && (
                                        <span className="bg-stone-900/60 backdrop-blur-xs text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border border-stone-700/50 inline-flex items-center gap-1">
                                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                          {selectedBusiness?.rating || 5}
                                        </span>
                                      )}
                                    </div>

                                    <h2 className="text-base sm:text-2xl md:text-3xl font-black text-white drop-shadow-xs line-clamp-1">
                                      {currentBannerRequest.bannerTitle || selectedBusiness?.name}
                                    </h2>

                                    <p className="text-xs sm:text-sm text-stone-200 drop-shadow-2xs line-clamp-2 max-w-xl font-medium leading-relaxed">
                                      {currentBannerRequest.bannerSubtitle || selectedBusiness?.description}
                                    </p>

                                    <div className="pt-1">
                                      <button
                                        type="button"
                                        className="bg-white hover:bg-stone-100 text-stone-900 text-xs font-black px-4 sm:px-5 py-2 rounded-xl transition-all shadow-xs inline-flex items-center gap-1"
                                      >
                                        <span>{currentBannerRequest.buttonText || 'معاينة المحل'}</span>
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  /* Image Only or Animated Image Preview info */
                                  <div className="absolute top-3 right-3 bg-stone-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-bold text-white border border-stone-700">
                                    بانر إعلاني (تصميم كامل)
                                  </div>
                                )}
                              </div>
                              <p className="text-[10px] text-stone-400 text-center">
                                * القياسات مجهزة ومحسّنة تلقائياً لتناسب أجهزة الكمبيوتر والموبايل بكفاءة كاملة.
                              </p>
                            </div>
                          </div>
                        ) : (
                          // Form Mode (isEditingBannerForm or no request exists)
                          <form onSubmit={handleSaveBannerRequest} className="space-y-6">
                            <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 flex items-center justify-between">
                              <p className="text-xs font-bold text-stone-600">
                                {currentBannerRequest 
                                  ? "تعديل محتوى وتصميم البانر الإعلاني الحالي" 
                                  : "تعبئة بيانات طلب البانر الإعلاني الجديد"}
                              </p>
                              {currentBannerRequest && (
                                <button
                                  type="button"
                                  onClick={() => setIsEditingBannerForm(false)}
                                  className="text-stone-500 hover:text-stone-900 text-xs font-bold"
                                >
                                  إلغاء التعديل ❌
                                </button>
                              )}
                            </div>

                            {/* 1. Selector of banner type */}
                            <div className="space-y-2">
                              <label className="text-xs font-black text-stone-700 block">نوع وتصميم البانر الإعلاني:</label>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {[
                                  { id: 'business', label: 'ربط بالمتجر', desc: 'عنوان ووصف وتقييم متجرك تلقائياً' },
                                  { id: 'text_and_button', label: 'نصوص وأزرار', desc: 'نصوص مخصصة مع زر تفاعلي مخصص' },
                                  { id: 'image_only', label: 'صورة إعلانية ثابتة', desc: 'تصميم إعلاني كامل وثابت' },
                                  { id: 'animated_image', label: 'صورة متحركة GIF', desc: 'تصميم متحرك جذاب للغاية' }
                                ].map((typeOpt) => (
                                  <button
                                    key={typeOpt.id}
                                    type="button"
                                    onClick={() => setBannerForm(prev => ({ ...prev, bannerType: typeOpt.id as any }))}
                                    className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-1.5 cursor-pointer ${
                                      bannerForm.bannerType === typeOpt.id
                                        ? 'bg-[#1a4d2e]/5 border-[#1a4d2e] shadow-2xs'
                                        : 'bg-white border-stone-200 hover:border-stone-300'
                                    }`}
                                  >
                                    <span className="text-xs font-black text-stone-900">{typeOpt.label}</span>
                                    <span className="text-[10px] text-stone-500 font-medium leading-relaxed">{typeOpt.desc}</span>
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* 2. Banner Form Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Title */}
                              {bannerForm.bannerType !== 'image_only' && bannerForm.bannerType !== 'animated_image' && (
                                <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-stone-700 block">العنوان الإعلاني الرئيسي:</label>
                                  <input
                                    type="text"
                                    value={bannerForm.bannerTitle}
                                    onChange={(e) => setBannerForm(prev => ({ ...prev, bannerTitle: e.target.value }))}
                                    placeholder="مثال: خصم 50% على جميع المنتجات!"
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20"
                                  />
                                </div>
                              )}

                              {/* Image URL */}
                              <div className="space-y-1.5">
                                <label className="text-xs font-bold text-stone-700 block">رابط صورة البانر (URL):</label>
                                <input
                                  type="text"
                                  value={bannerForm.bannerImageUrl}
                                  onChange={(e) => setBannerForm(prev => ({ ...prev, bannerImageUrl: e.target.value }))}
                                  placeholder="أدخل رابط صورة عالي الجودة أو ارفعها أولاً"
                                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20"
                                />
                              </div>

                              {/* Subtitle */}
                              {bannerForm.bannerType !== 'image_only' && bannerForm.bannerType !== 'animated_image' && (
                                <div className="space-y-1.5 md:col-span-2 col-span-1">
                                  <label className="text-xs font-bold text-stone-700 block">وصف الإعلان / النص الفرعي:</label>
                                  <textarea
                                    value={bannerForm.bannerSubtitle}
                                    onChange={(e) => setBannerForm(prev => ({ ...prev, bannerSubtitle: e.target.value }))}
                                    placeholder="اكتب وصفاً جذاباً ومختصراً يلفت انتباه الزبائن..."
                                    rows={2.5}
                                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20"
                                  ></textarea>
                                </div>
                              )}

                              {/* Button details */}
                              {bannerForm.bannerType !== 'image_only' && bannerForm.bannerType !== 'animated_image' && (
                                <>
                                  <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-stone-700 block">نص زر التفاعل:</label>
                                    <input
                                      type="text"
                                      value={bannerForm.buttonText}
                                      onChange={(e) => setBannerForm(prev => ({ ...prev, buttonText: e.target.value }))}
                                      placeholder="مثال: اطلب الآن / اتصل بنا"
                                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20"
                                    />
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-stone-700 block">رابط الزر (رابط صفحة، واتساب، الخ):</label>
                                    <input
                                      type="text"
                                      value={bannerForm.buttonLink}
                                      onChange={(e) => setBannerForm(prev => ({ ...prev, buttonLink: e.target.value }))}
                                      placeholder="أدخل رابط توجيه الزبائن عند النقر على الزر"
                                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20"
                                    />
                                  </div>

                                  <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-stone-700 block">الشارة الإعلانية المرافقة (اختياري):</label>
                                    <input
                                      type="text"
                                      value={bannerForm.badgeText}
                                      onChange={(e) => setBannerForm(prev => ({ ...prev, badgeText: e.target.value }))}
                                      placeholder="مثال: خصم خاص / الأكثر طلباً"
                                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20"
                                    />
                                  </div>
                                </>
                              )}
                            </div>

                            {/* 3. Live Form Preview */}
                            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 space-y-3 text-right">
                              <span className="text-[11px] font-black text-stone-500 block">👁️ معاينة البانر الإعلاني التفاعلية أثناء الكتابة:</span>
                              
                              <div className="relative w-full aspect-[21/9] sm:aspect-[2.39/1] min-h-[160px] max-h-[360px] rounded-2xl overflow-hidden border border-stone-200 shadow-3xs bg-stone-950">
                                {bannerForm.bannerImageUrl ? (
                                  <img
                                    src={bannerForm.bannerImageUrl}
                                    alt="Live input background"
                                    className="absolute inset-0 w-full h-full object-cover opacity-85"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="absolute inset-0 bg-stone-800 flex items-center justify-center text-xs font-bold text-stone-400">
                                    [ بانتظار إدخال رابط صورة البانر ]
                                  </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

                                {(bannerForm.bannerType === 'business' || bannerForm.bannerType === 'text_and_button') && (
                                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6 md:p-8 text-right text-white space-y-2 max-w-2xl">
                                    <div className="flex flex-wrap items-center gap-2 justify-start">
                                      {bannerForm.badgeText && (
                                        <span className="bg-[#ff9f1c] text-stone-950 text-[10px] sm:text-xs font-black px-2.5 py-0.5 rounded-full">
                                          {bannerForm.badgeText}
                                        </span>
                                      )}
                                      {bannerForm.bannerType === 'business' && (
                                        <span className="bg-stone-900/60 backdrop-blur-xs text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full border border-stone-700/50 inline-flex items-center gap-1">
                                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                          {selectedBusiness?.rating || 5}
                                        </span>
                                      )}
                                    </div>

                                    <h2 className="text-base sm:text-2xl md:text-3xl font-black text-white drop-shadow-xs line-clamp-1">
                                      {bannerForm.bannerTitle || selectedBusiness?.name || 'العنوان الرئيسي'}
                                    </h2>

                                    <p className="text-xs sm:text-sm text-stone-200 drop-shadow-2xs line-clamp-2 max-w-xl font-medium leading-relaxed">
                                      {bannerForm.bannerSubtitle || selectedBusiness?.description || 'هنا سيتم إظهار الوصف أو النص الفرعي الجذاب'}
                                    </p>

                                    <div className="pt-1">
                                      <button
                                        type="button"
                                        className="bg-white text-stone-900 text-xs font-black px-4 sm:px-5 py-2 rounded-xl transition-all shadow-xs"
                                      >
                                        <span>{bannerForm.buttonText || 'معاينة المحل'}</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Actions buttons */}
                            <div className="flex justify-end gap-2 pt-4 border-t border-stone-100">
                              <button
                                type="submit"
                                disabled={submittingBanner}
                                className="bg-[#1a4d2e] hover:bg-[#133b22] disabled:bg-stone-200 disabled:text-stone-400 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-xs cursor-pointer transition-colors inline-flex items-center gap-2"
                              >
                                {submittingBanner ? (
                                  <>
                                    <div className="inline-block w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                                    <span>جاري تقديم الطلب...</span>
                                  </>
                                ) : (
                                  <>
                                    <span>تقديم البانر للمراجعة والاعتماد 🚀</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Dedicated Section: User's Jobs Management */}
      <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-[#e5e1da] shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#2d2a26] flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-[#ff9f1c]" />
              وظائف وشواغر محلاتي
            </h2>
            <p className="text-xs text-stone-500 mt-1">
              إدارة الوظائف التي نشرتها لموظفي محلك ومتابعة طلبات التقديم والتواصل
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/jobs"
              className="inline-flex items-center gap-1 text-xs font-bold text-[#1a4d2e] bg-stone-50 hover:bg-stone-100 px-3 py-2 rounded-xl border border-stone-200"
            >
              <span>صفحة الوظائف العامة</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>

            <button
              onClick={() => handleOpenAddJobForBusiness()}
              className="inline-flex items-center gap-1.5 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-4 py-2 rounded-xl text-xs font-black transition-colors cursor-pointer shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5 text-[#ff9f1c]" />
              <span>نشر شاغر جديد</span>
            </button>
          </div>
        </div>

        {userJobs.length === 0 ? (
          <div className="text-center py-10 bg-emerald-50/40 rounded-2xl border border-dashed border-emerald-200/80 p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#1a4d2e] flex items-center justify-center mx-auto">
              <Briefcase className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-stone-800">هل تبحث عن موظفين أو باريستا أو كاشير لمحلك؟</h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
              انشر إعلان وظيفة بتفاصيل كاملة (الراتب، الشفت، المزايا) وسيظهر فوراً لآلاف الباحثين عن عمل والطلبة في محافظة إربد مجاناً.
            </p>
            <button
              onClick={() => handleOpenAddJobForBusiness()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a4d2e] text-white rounded-xl font-bold text-xs hover:bg-[#133b22] transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4 text-[#ff9f1c]" />
              <span>نشر وظيفة جديدة الآن</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {userJobs.map(job => (
              <div 
                key={job.id} 
                className="p-4 sm:p-5 rounded-2xl border border-stone-200 bg-white hover:border-[#1a4d2e]/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-black bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded-md">
                      {job.category}
                    </span>
                    <span className="text-[11px] font-bold bg-emerald-50 text-[#1a4d2e] px-2.5 py-0.5 rounded-md">
                      {job.jobType}
                    </span>
                    {job.isUrgent && (
                      <span className="text-[10px] font-black bg-red-100 text-red-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Flame className="h-3 w-3" />
                        شاغر عاجل
                      </span>
                    )}
                    <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-md">
                      متاح للتقديم ✓
                    </span>
                  </div>

                  <h3 className="text-base font-black text-[#2d2a26]">{job.title}</h3>
                  
                  <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 font-bold">
                    <span className="flex items-center gap-1">
                      <Store className="h-3.5 w-3.5 text-[#ff9f1c]" />
                      {job.company}
                    </span>
                    {job.salary && (
                      <span className="flex items-center gap-1 text-emerald-700">
                        <DollarSign className="h-3.5 w-3.5" />
                        {job.salary}
                      </span>
                    )}
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-stone-400" />
                        {job.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Job Action Controls */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <Link
                    to="/jobs"
                    className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                    title="مشاهدة على صفحة الوظائف"
                  >
                    <Globe className="h-3.5 w-3.5 text-sky-600" />
                    <span className="hidden sm:inline">معاينة</span>
                  </Link>

                  <button
                    onClick={() => handleEditJob(job)}
                    className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    title="تعديل الشاغر"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-[#1a4d2e]" />
                    <span className="hidden sm:inline">تعديل</span>
                  </button>

                  <button
                    onClick={() => setDeleteJobConfirmId(job.id)}
                    className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                    title="حذف الشاغر"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">حذف</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Marketing Services Section */}
      {businesses.length > 0 && (
        <div className="bg-white p-8 rounded-[32px] border border-[#e5e1da] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-[#ff9f1c]/10 p-2 rounded-xl">
              <Rocket className="h-6 w-6 text-[#ff9f1c]" />
            </div>
            <h2 className="text-2xl font-bold text-[#2d2a26]">
              خدمات التسويق وتطوير الأعمال
            </h2>
          </div>
          <p className="text-stone-500 mb-8 max-w-2xl text-sm leading-relaxed">
            ارفع مبيعاتك وضاعف وصولك للزبائن في إربد من خلال طلب إحدى خدماتنا الإعلانية. تدفع مرة واحدة لكل خدمة تختارها.
          </p>

          {businesses.length > 1 && (
            <div className="mb-6 bg-stone-50 p-4 rounded-xl border border-stone-200">
              <label className="block text-sm font-bold text-stone-700 mb-2">اختر المحل الذي تريد التسويق له:</label>
              <select
                value={selectedBusinessIdForService}
                onChange={(e) => setSelectedBusinessIdForService(e.target.value)}
                className="w-full md:w-1/2 p-2.5 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] focus:border-transparent text-sm"
              >
                {businesses.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          {serviceRequestSuccess && (
            <div className="mb-6 p-4 bg-green-50 text-green-800 rounded-2xl border border-green-200 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              <span className="font-bold">{serviceRequestSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Sponsored Listing */}
            <div className="border border-[#e5e1da] rounded-2xl p-5 hover:border-[#ff9f1c]/30 transition-all flex flex-col group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#ff9f1c] opacity-5 rounded-bl-full -z-10 group-hover:scale-110 transition-transform duration-500"></div>
              <div className="flex items-center justify-between mb-4">
                <div className="bg-stone-50 p-2.5 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-[#1a4d2e]" />
                </div>
                <span className="text-xs font-bold bg-[#ff9f1c] text-white px-2.5 py-1 rounded-full shadow-sm">الأكثر طلباً</span>
              </div>
              <h3 className="font-black text-lg text-[#2d2a26] mb-1">صدارة البحث (Sponsored)</h3>
              <p className="text-stone-500 text-xs mb-4 flex-1">ظهور محلك في أولى نتائج البحث لضمان وصول أكبر عدد من الزبائن الجدد لك.</p>
              
              <div className="space-y-1 mb-5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600"><Check className="h-3.5 w-3.5 text-[#1a4d2e]"/> ظهور أعلى المنافسين</div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600"><Check className="h-3.5 w-3.5 text-[#1a4d2e]"/> شارة "ممول" مخصصة</div>
              </div>

              <div className="flex items-center justify-between mt-auto">
                <div className="text-sm font-black text-[#1a4d2e]">15 دينار <span className="text-[10px] text-stone-400 font-normal">/ أسبوع</span></div>
                <button 
                  onClick={() => handleOpenMarketingModal('sponsored', 'صدارة البحث (Sponsored)', 'تم استلام طلبك لخدمة "صدارة البحث". سيتواصل معك فريقنا قريباً لإتمام الدفع وتفعيل الخدمة.')}
                  className="bg-stone-100 hover:bg-[#1a4d2e] hover:text-white text-stone-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  اطلب الآن
                </button>
              </div>
            </div>

            {/* 2. Push Notifications */}
            <div className="border border-[#e5e1da] rounded-2xl p-5 hover:border-[#1a4d2e]/30 transition-all flex flex-col group relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-stone-50 p-2.5 rounded-xl">
                  <Bell className="h-6 w-6 text-sky-600" />
                </div>
              </div>
              <h3 className="font-black text-lg text-[#2d2a26] mb-1">إشعارات جماعية</h3>
              <p className="text-stone-500 text-xs mb-4 flex-1">أرسل إشعاراً مباشراً (Push Notification) لجميع مستخدمي التطبيق للإعلان عن عرضك الجديد.</p>
              
              <div className="space-y-1 mb-5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600"><Check className="h-3.5 w-3.5 text-sky-600"/> رسالة نصية مخصصة</div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600"><Check className="h-3.5 w-3.5 text-sky-600"/> توجيه مباشر لصفحة محلك</div>
              </div>

              <div className="flex items-center justify-between mt-auto">
                <div className="text-sm font-black text-sky-700">10 دنانير <span className="text-[10px] text-stone-400 font-normal">/ للإشعار</span></div>
                <button 
                  onClick={() => handleOpenMarketingModal('push_notifications', 'إشعارات جماعية', 'تم استلام طلبك لخدمة "إشعارات جماعية". سيتواصل معك فريقنا قريباً.')}
                  className="bg-stone-100 hover:bg-sky-600 hover:text-white text-stone-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  اطلب الآن
                </button>
              </div>
            </div>

            {/* 3. Homepage Banner */}
            <div className="border border-[#e5e1da] rounded-2xl p-5 hover:border-purple-300 transition-all flex flex-col group relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-stone-50 p-2.5 rounded-xl">
                  <ImageIcon className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <h3 className="font-black text-lg text-[#2d2a26] mb-1">بانر إعلاني مميز</h3>
              <p className="text-stone-500 text-xs mb-4 flex-1">احجز مساحة إعلانية كبيرة في الصفحة الرئيسية للفت انتباه كل من يدخل الموقع.</p>
              
              <div className="space-y-1 mb-5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600"><Check className="h-3.5 w-3.5 text-purple-600"/> تصميم احترافي مجاني</div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600"><Check className="h-3.5 w-3.5 text-purple-600"/> رابط خارجي أو داخلي</div>
              </div>

              <div className="flex items-center justify-between mt-auto">
                <div className="text-sm font-black text-purple-700">25 دينار <span className="text-[10px] text-stone-400 font-normal">/ أسبوع</span></div>
                <button 
                  onClick={() => handleOpenMarketingModal('homepage_banner', 'بانر إعلاني مميز', 'تم استلام طلبك لخدمة "بانر إعلاني مميز". سيتواصل معك فريقنا قريباً.')}
                  className="bg-stone-100 hover:bg-purple-600 hover:text-white text-stone-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  اطلب الآن
                </button>
              </div>
            </div>

            {/* 4. NFC Stands */}
            <div className="border border-[#e5e1da] rounded-2xl p-5 hover:border-stone-400 transition-all flex flex-col group relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-stone-50 p-2.5 rounded-xl">
                  <Smartphone className="h-6 w-6 text-stone-700" />
                </div>
              </div>
              <h3 className="font-black text-lg text-[#2d2a26] mb-1">ستاندات وبطاقات NFC</h3>
              <p className="text-stone-500 text-xs mb-4 flex-1">سهّل على زبائنك الوصول للمنيو أو صفحتك بمجرد ملامسة هواتفهم للستاند الذكي.</p>
              
              <div className="space-y-1 mb-5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600"><Check className="h-3.5 w-3.5 text-stone-700"/> ستاند أكريليك أنيق</div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600"><Check className="h-3.5 w-3.5 text-stone-700"/> برمجة وتجهيز مجاني</div>
              </div>

              <div className="flex items-center justify-between mt-auto">
                <div className="text-sm font-black text-stone-700">8 دنانير <span className="text-[10px] text-stone-400 font-normal">/ للستاند</span></div>
                <button 
                  onClick={() => handleOpenMarketingModal('nfc_stands', 'ستاندات وبطاقات NFC', 'تم استلام طلبك لخدمة "ستاندات NFC". سيتواصل معك فريقنا قريباً.')}
                  className="bg-stone-100 hover:bg-stone-700 hover:text-white text-stone-700 px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  اطلب الآن
                </button>
              </div>
            </div>

            {/* Premium Messaging Add-on Card */}
            <div className="border-2 border-amber-400 bg-amber-50/20 rounded-2xl p-5 hover:border-[#1a4d2e]/40 transition-all flex flex-col group relative overflow-hidden">
              <div className="absolute top-0 left-0 bg-amber-400 text-amber-950 text-[10px] font-black px-3 py-1 rounded-br-xl flex items-center gap-1 shadow-xs">
                <Crown className="h-3 w-3 fill-amber-950" />
                <span>باقة رسائل مطورة 💬</span>
              </div>
              
              <div className="flex items-center justify-between mb-4 mt-2">
                <div className="bg-amber-100 p-2.5 rounded-xl">
                  <MessageSquare className="h-6 w-6 text-amber-700" />
                </div>
              </div>
              
              <h3 className="font-black text-lg text-[#2d2a26] mb-1">ترقية الرسائل والوسائط</h3>
              <p className="text-stone-500 text-xs mb-4 flex-1">
                طور نظام المراسلة واستقبل الصور من زبائنك لطلب المنتجات مباشرة، وزد من مدة بقاء رسائلك لأكثر من أسبوع!
              </p>
              
              {/* Selected Business Status */}
              {selectedBusinessIdForService && (() => {
                const b = businesses.find(x => x.id === selectedBusinessIdForService);
                if (!b) return null;
                const isUpgraded = b.premiumMessagingEnabled;
                return (
                  <div className="mb-4 bg-white/80 p-2.5 rounded-xl border border-amber-200 text-[11px] font-bold text-stone-700 space-y-1">
                    <div className="flex items-center justify-between">
                      <span>حالة المحل الحالي:</span>
                      {isUpgraded ? (
                        <span className="text-emerald-700 font-black bg-emerald-50 px-2 py-0.5 rounded">مفعلة ✓ ({b.premiumMessagingPlan === '1_month' ? 'شهر' : b.premiumMessagingPlan === '3_months' ? '3 أشهر' : b.premiumMessagingPlan === '6_months' ? '6 أشهر' : 'سنة'})</span>
                      ) : (
                        <span className="text-stone-400 font-bold bg-stone-100 px-2 py-0.5 rounded">باقة مجانية (7 أيام)</span>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-1 mb-5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600"><Check className="h-3.5 w-3.5 text-amber-600"/> استقبال الصور والمستندات 📷</div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600"><Check className="h-3.5 w-3.5 text-amber-600"/> الاحتفاظ بالرسائل لفترة أطول (شهر+)</div>
              </div>

              {/* Plan Choice dropdown */}
              <div className="mb-4">
                <label className="block text-[10px] font-bold text-stone-500 mb-1">اختر باقة الاشتراك الخاصة بك:</label>
                <select
                  id="messaging-plan-select"
                  className="w-full p-2 rounded-lg border border-stone-200 bg-white text-xs font-bold text-stone-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  defaultValue="1_month"
                >
                  <option value="1_month">اشتراك شهري: 5 دنانير (وسائط ✓ | الاحتفاظ 1 شهر)</option>
                  <option value="3_months">اشتراك 3 أشهر: 12 دينار (وفر 20% | الاحتفاظ 3 أشهر)</option>
                  <option value="6_months">اشتراك 6 أشهر: 20 دينار (وفر 33% | الاحتفاظ 6 أشهر)</option>
                  <option value="1_year">اشتراك سنوي: 35 دينار (وفر 40% | الاحتفاظ 1 سنة)</option>
                </select>
              </div>

              <div className="flex items-center justify-between mt-auto">
                <div className="text-xs font-black text-amber-800">تفعيل وتطوير فوري</div>
                <button 
                  onClick={() => {
                    const selectEl = document.getElementById('messaging-plan-select') as HTMLSelectElement;
                    const plan = (selectEl?.value || '1_month') as '1_month' | '3_months' | '6_months' | '1_year';
                    handlePremiumMessagingUpgrade(plan);
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-xl text-xs font-black transition-colors cursor-pointer"
                >
                  ترقية الآن
                </button>
              </div>
            </div>

            {/* 5. Social Media Shoutout */}
            <div className="border border-[#e5e1da] rounded-2xl p-5 hover:border-pink-300 transition-all flex flex-col group relative overflow-hidden lg:col-span-2">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="bg-stone-50 p-2.5 rounded-xl">
                    <Megaphone className="h-6 w-6 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-[#2d2a26] mb-0.5">تغطية سوشيال ميديا شاملة</h3>
                    <p className="text-stone-500 text-xs">حملة إعلانية ضخمة على قنواتنا في تيك توك وإنستغرام (أكثر من 100 ألف متابع).</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4 mb-4 flex-1">
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                  <span className="block text-[10px] text-stone-400 font-bold mb-1">المنصات</span>
                  <div className="text-xs font-black text-stone-700">TikTok, Instagram Reels, Facebook</div>
                </div>
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                  <span className="block text-[10px] text-stone-400 font-bold mb-1">تشمل</span>
                  <div className="text-xs font-black text-stone-700">تصوير احترافي + مونتاج + تقديم</div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-auto pt-2 border-t border-stone-100">
                <div className="text-sm font-black text-pink-700">50 دينار <span className="text-[10px] text-stone-400 font-normal">/ للتغطية</span></div>
                <button 
                  onClick={() => handleOpenMarketingModal('social_media', 'تغطية سوشيال ميديا شاملة', 'تم استلام طلبك لخدمة "تغطية سوشيال ميديا". سيتواصل معك فريقنا لتحديد موعد التصوير.')}
                  className="bg-stone-100 hover:bg-pink-600 hover:text-white text-stone-700 px-5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  احجز موعد التغطية
                </button>
              </div>
            </div>

          </div>

          {/* ROI Campaign Tracker Component */}
          <div className="mt-8">
            <RoiCampaignTracker businessId={selectedBusiness.id} isVip={getBusinessVipStatus(selectedBusiness).isVip} />
          </div>
        </div>
      )}
        </div>
      )}

      {/* Shop Edit Modal */}
      {editingBusiness && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-200 relative my-auto animate-in fade-in zoom-in-95">
            <button 
              onClick={() => setEditingBusiness(null)}
              className="absolute top-6 left-6 p-2 bg-stone-100 text-stone-500 hover:bg-stone-200 rounded-full transition-colors z-10"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="mb-6">
              <h2 className="text-2xl font-black text-[#2d2a26] flex items-center gap-2">
                <Edit3 className="h-6 w-6 text-[#1a4d2e]" />
                تعديل بيانات المحل ({editingBusiness.name})
              </h2>
              <p className="text-xs text-stone-500 mt-1">تحديث وتعديل جميع تفاصيل المتجر المعروضة لرواد منصة إربد</p>
            </div>

            {updateSuccess ? (
              <div className="py-12 text-center">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-[#2d2a26]">تم تحديث البيانات بنجاح!</h3>
              </div>
            ) : (
              <StoreEditForm
                business={editingBusiness}
                onSave={handleSaveStoreData}
                isSaving={isSavingBusiness}
                onCancel={() => setEditingBusiness(null)}
                inModal={true}
              />
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Reusable Job Form Modal for the Business Owner */}
      <JobFormModal
        isOpen={isJobModalOpen}
        onClose={() => setIsJobModalOpen(false)}
        onJobSaved={handleJobSaved}
        editingJob={jobToEdit}
        defaultBusinessId={defaultBusinessIdForJob}
        userBusinesses={businesses}
      />

      {/* Delete Job Confirmation */}
      {deleteJobConfirmId && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-red-100 space-y-4 my-auto animate-in fade-in zoom-in-95 text-center">
            <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="h-7 w-7" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-stone-900">هل أنت متأكد من حذف هذا الشاغر؟</h3>
              <p className="text-stone-500 text-sm">
                سيتم إزالة الشاغر نهائياً من قائمة الوظائف ومن ملف محلك.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-3">
              <button
                onClick={() => setDeleteJobConfirmId(null)}
                className="px-5 py-2.5 rounded-xl border border-stone-200 font-bold text-sm text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDeleteJob(deleteJobConfirmId)}
                className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors shadow-xs cursor-pointer"
              >
                نعم، احذف الشاغر
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* VIP Analytics Modal for Business Owner */}
      {selectedBusinessForAnalytics && (
        <VipAnalyticsModal
          isOpen={isAnalyticsModalOpen}
          onClose={() => {
            setIsAnalyticsModalOpen(false);
            setSelectedBusinessForAnalytics(null);
          }}
          business={selectedBusinessForAnalytics}
          onOpenMenuManager={() => {
            setSelectedBusinessForMenu(selectedBusinessForAnalytics);
            setIsMenuModalOpen(true);
          }}
        />
      )}

      {/* Digital Menu & Catalog Manager Modal for Business Owner */}
      {selectedBusinessForMenu && (
        <DigitalMenuManagerModal
          isOpen={isMenuModalOpen}
          onClose={() => {
            setIsMenuModalOpen(false);
            setSelectedBusinessForMenu(null);
          }}
          business={selectedBusinessForMenu}
          onMenuUpdated={(updatedItems) => {
            setBusinesses(prev => prev.map(b => b.id === selectedBusinessForMenu.id ? { ...b, menuItems: updatedItems } : b));
          }}
        />
      )}

      {/* Upgrade Request Modal for Non-VIP Business Owner */}
      {selectedBusinessForUpgrade && (
        <VipUpgradeRequestModal
          isOpen={isUpgradeModalOpen}
          onClose={() => {
            setIsUpgradeModalOpen(false);
            setSelectedBusinessForUpgrade(null);
          }}
          business={selectedBusinessForUpgrade}
        />
      )}

      {/* Printable Store QR Poster Builder Modal */}
      {selectedBusiness && (
        <PrintableQrPosterModal
          business={selectedBusiness}
          isOpen={isQrPosterOpen}
          onClose={() => setIsQrPosterOpen(false)}
        />
      )}

      {/* Scheduled Notification Slot Modal */}
      {selectedBusiness && (
        <ScheduledNotificationModal
          business={selectedBusiness}
          isOpen={isScheduledNotifOpen}
          onClose={() => setIsScheduledNotifOpen(false)}
          onScheduled={(msg) => {
            setServiceRequestSuccess(msg);
            setTimeout(() => setServiceRequestSuccess(null), 6000);
          }}
        />
      )}

      {/* Multi-Branch Manager Duplication Modal */}
      {selectedBusiness && (
        <MultiBranchModal
          parentBusiness={selectedBusiness}
          isOpen={isMultiBranchOpen}
          onClose={() => setIsMultiBranchOpen(false)}
          onBranchAdded={() => {
            // Re-fetch user businesses
            if (currentUser && db) {
              const q = query(collection(db, 'businesses'), where('userId', '==', currentUser.uid));
              getDocs(q).then(snap => {
                const list: Business[] = [];
                snap.forEach(d => list.push({ id: d.id, ...d.data() } as Business));
                setBusinesses(list);
              });
            }
          }}
        />
      )}

      {/* Marketing Form Popup Modal */}
      {isMarketingModalOpen && activeMarketingModalType && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto animate-in fade-in" dir="rtl">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-200 relative my-auto animate-in fade-in zoom-in-95">
            <button 
              type="button"
              onClick={() => setIsMarketingModalOpen(false)}
              className="absolute top-6 left-6 p-2 bg-stone-100 text-stone-500 hover:bg-stone-200 rounded-full transition-colors z-10 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-6">
              <span className="inline-block py-1 px-3 rounded-full bg-purple-50 text-purple-700 text-xs font-bold mb-2">
                طلب وتخصيص خدمة ترويجية 🚀
              </span>
              <h2 className="text-2xl font-black text-[#2d2a26] flex items-center gap-2">
                <Rocket className="h-6 w-6 text-[#1a4d2e]" />
                {activeMarketingModalName}
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                املأ تفاصيل الخدمة أدناه لتصل للإدارة بدقة ونقوم بالبدء بالتواصل معك وتفعيلها فوراً
              </p>
            </div>

            <form onSubmit={handleMarketingRequestSubmit} className="space-y-5 text-right">
              
              {/* WhatsApp Number (For all services) */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5 font-black">رقم الواتساب للتنسيق والمتابعة: <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Phone className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                  <input
                    type="tel"
                    required
                    value={marketingForm.contactWhatsapp}
                    onChange={e => setMarketingForm(prev => ({ ...prev, contactWhatsapp: e.target.value }))}
                    placeholder="مثال: 079xxxxxxx"
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl pr-10 pl-4 py-2.5 text-xs font-bold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                  />
                </div>
                <p className="text-[10px] text-stone-400 mt-1">سيستخدمه المشرف للتواصل وتأكيد الحجز وتفعيل الإعلان</p>
              </div>

              {/* SERVICE SPECIFIC FIELDS */}
              
              {/* 1. Sponsored */}
              {activeMarketingModalType === 'sponsored' && (
                <div className="space-y-4 pt-2 border-t border-stone-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5 font-black">المدة الإعلانية المطلوبة:</label>
                      <select
                        value={marketingForm.durationWeeks}
                        onChange={e => setMarketingForm(prev => ({ ...prev, durationWeeks: e.target.value }))}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-700"
                      >
                        <option value="أسبوع واحد">أسبوع واحد (15 دينار)</option>
                        <option value="أسبوعين">أسبوعين (30 دينار)</option>
                        <option value="شهر كامل">شهر كامل (50 دينار - وفر 10 دنانير)</option>
                        <option value="3 أشهر">3 أشهر (130 دينار - وفر 50 دينار)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5 font-black">الكلمات الدلالية المفضلة (مفصولة بفاصلة):</label>
                      <input
                        type="text"
                        value={marketingForm.targetKeywords}
                        onChange={e => setMarketingForm(prev => ({ ...prev, targetKeywords: e.target.value }))}
                        placeholder="برجر، عشاء، مطعم عائلي"
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#1a4d2e] mb-1.5 font-black">توقيت النشر المطلوب:</label>
                      <select
                        value={marketingForm.publishTimeOption}
                        onChange={e => setMarketingForm(prev => ({ ...prev, publishTimeOption: e.target.value as any }))}
                        className="w-full bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs font-bold text-amber-900 focus:outline-none"
                      >
                        <option value="immediately">فورا بعد موافقة الإدارة وتفعيلها ⚡</option>
                        <option value="scheduled">جدولة وتحديد تاريخ البدء يدوياً 📅</option>
                      </select>
                    </div>

                    {marketingForm.publishTimeOption === 'scheduled' && (
                      <div className="animate-in slide-in-from-top-2 duration-200">
                        <label className="block text-xs font-bold text-amber-950 mb-1.5 font-black">تاريخ ووقت بدء النشر المطلوب:</label>
                        <input
                          type="datetime-local"
                          required={marketingForm.publishTimeOption === 'scheduled'}
                          value={marketingForm.publishStartDate}
                          onChange={e => setMarketingForm(prev => ({ ...prev, publishStartDate: e.target.value }))}
                          className="w-full bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5 font-black">ملاحظات أو تصنيفات مخصصة:</label>
                    <textarea
                      value={marketingForm.notes}
                      onChange={e => setMarketingForm(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      placeholder="أي معلومات إضافية ترغب بذكرها..."
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                    />
                  </div>
                </div>
              )}

              {/* 2. Push Notifications */}
              {activeMarketingModalType === 'push_notifications' && (
                <div className="space-y-4 pt-2 border-t border-stone-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5 font-black">عنوان الإشعار المقترح: <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={marketingForm.notificationTitle}
                        onChange={e => setMarketingForm(prev => ({ ...prev, notificationTitle: e.target.value }))}
                        placeholder="مثال: خصم 50% على جميع قطع البيتزا اليوم!"
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5 font-black">رابط توجيه المستخدم عند الضغط:</label>
                      <input
                        type="text"
                        value={marketingForm.targetLink}
                        onChange={e => setMarketingForm(prev => ({ ...prev, targetLink: e.target.value }))}
                        placeholder="صفحة محلك الافتراضية محددة تلقائياً"
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#1a4d2e] mb-1.5 font-black">توقيت إرسال الإشعار المطلوب:</label>
                      <select
                        value={marketingForm.publishTimeOption}
                        onChange={e => setMarketingForm(prev => ({ ...prev, publishTimeOption: e.target.value as any }))}
                        className="w-full bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs font-bold text-amber-900 focus:outline-none"
                      >
                        <option value="immediately">فورا بعد موافقة الإدارة وتفعيلها ⚡</option>
                        <option value="scheduled">جدولة وتحديد تاريخ الإرسال يدوياً 📅</option>
                      </select>
                    </div>

                    {marketingForm.publishTimeOption === 'scheduled' && (
                      <div className="animate-in slide-in-from-top-2 duration-200">
                        <label className="block text-xs font-bold text-amber-950 mb-1.5 font-black">تاريخ ووقت إرسال الإشعار المطلوب:</label>
                        <input
                          type="datetime-local"
                          required={marketingForm.publishTimeOption === 'scheduled'}
                          value={marketingForm.publishStartDate}
                          onChange={e => setMarketingForm(prev => ({ ...prev, publishStartDate: e.target.value }))}
                          className="w-full bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5 font-black">محتوى رسالة الإشعار الترويجي: <span className="text-red-500">*</span></label>
                    <textarea
                      required
                      value={marketingForm.notificationBody}
                      onChange={e => setMarketingForm(prev => ({ ...prev, notificationBody: e.target.value }))}
                      rows={3}
                      placeholder="اكتب المحتوى المشجع الذي سيظهر للمستخدمين على شاشات هواتفهم..."
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                    />
                  </div>
                </div>
              )}

              {/* 3. Homepage Banner */}
              {activeMarketingModalType === 'homepage_banner' && (
                <div className="space-y-4 pt-2 border-t border-stone-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5 font-black">نوع تصميم البانر المطلوب:</label>
                      <select
                        value={marketingForm.bannerType}
                        onChange={e => setMarketingForm(prev => ({ ...prev, bannerType: e.target.value as any }))}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-700"
                      >
                        <option value="business">ربط تلقائي بصفحة المحل وتفاصيله</option>
                        <option value="text_and_button">نصوص مخصصة مع زر تفاعلي خارجي</option>
                        <option value="image_only">صورة إعلانية ثابتة (بدون نصوص وزر)</option>
                        <option value="animated_image">صورة متحركة GIF جذابة</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5 font-black">الشارة الإعلانية الجاذبة:</label>
                      <input
                        type="text"
                        value={marketingForm.badgeText}
                        onChange={e => setMarketingForm(prev => ({ ...prev, badgeText: e.target.value }))}
                        placeholder="مثال: موصى به ⭐ ، عرض الجمعة ✨"
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5 font-black">العنوان الرئيسي للإعلان: <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={marketingForm.bannerTitle}
                        onChange={e => setMarketingForm(prev => ({ ...prev, bannerTitle: e.target.value }))}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5 font-black">العنوان الفرعي أو الوصف: <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={marketingForm.bannerSubtitle}
                        onChange={e => setMarketingForm(prev => ({ ...prev, bannerSubtitle: e.target.value }))}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5 font-black">نص الزر التفاعلي:</label>
                      <input
                        type="text"
                        value={marketingForm.buttonText}
                        onChange={e => setMarketingForm(prev => ({ ...prev, buttonText: e.target.value }))}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5 font-black">رابط توجيه الزر التفاعلي:</label>
                      <input
                        type="text"
                        value={marketingForm.buttonLink}
                        onChange={e => setMarketingForm(prev => ({ ...prev, buttonLink: e.target.value }))}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] ltr"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5 font-black">رابط الصورة الإعلانية المصممة:</label>
                    <input
                      type="url"
                      value={marketingForm.bannerImageUrl}
                      onChange={e => setMarketingForm(prev => ({ ...prev, bannerImageUrl: e.target.value }))}
                      placeholder="أدخل رابط صورة الإعلان (بأبعاد 21:9 للحفاظ على الأناقة)"
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e] ltr"
                    />
                    <p className="text-[10px] text-stone-400 mt-1">تنبيه: يمكنك تزويدنا بالتصميم أيضاً لاحقاً عبر الواتساب في حال لم يكن الرابط جاهزاً.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5 font-black">المدة الإعلانية المطلوبة لبقاء البانر:</label>
                      <select
                        value={marketingForm.durationWeeks}
                        onChange={e => setMarketingForm(prev => ({ ...prev, durationWeeks: e.target.value }))}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-700"
                      >
                        <option value="أسبوع واحد">أسبوع واحد (25 دينار)</option>
                        <option value="أسبوعين">أسبوعين (45 دينار)</option>
                        <option value="شهر كامل">شهر كامل (80 دينار - وفر 20 دينار)</option>
                        <option value="3 أشهر">3 أشهر (200 دينار - وفر 50 دينار)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1a4d2e] mb-1.5 font-black">توقيت نشر البانر المطلوب:</label>
                      <select
                        value={marketingForm.publishTimeOption}
                        onChange={e => setMarketingForm(prev => ({ ...prev, publishTimeOption: e.target.value as any }))}
                        className="w-full bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs font-bold text-amber-900 focus:outline-none"
                      >
                        <option value="immediately">فورا بعد موافقة الإدارة وتفعيلها ⚡</option>
                        <option value="scheduled">جدولة وتحديد تاريخ البدء يدوياً 📅</option>
                      </select>
                    </div>
                  </div>

                  {marketingForm.publishTimeOption === 'scheduled' && (
                    <div className="animate-in slide-in-from-top-2 duration-200">
                      <label className="block text-xs font-bold text-amber-950 mb-1.5 font-black">تاريخ ووقت بدء نشر البانر المطلوب:</label>
                      <input
                        type="datetime-local"
                        required={marketingForm.publishTimeOption === 'scheduled'}
                        value={marketingForm.publishStartDate}
                        onChange={e => setMarketingForm(prev => ({ ...prev, publishStartDate: e.target.value }))}
                        className="w-full bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* 4. NFC Stands */}
              {activeMarketingModalType === 'nfc_stands' && (
                <div className="space-y-4 pt-2 border-t border-stone-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5 font-black">الكمية المطلوبة:</label>
                      <select
                        value={marketingForm.quantity}
                        onChange={e => setMarketingForm(prev => ({ ...prev, quantity: e.target.value }))}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-700"
                      >
                        <option value="1">ستاند واحد (8 دنانير)</option>
                        <option value="3">3 ستاندات (20 دينار - خصم خاص)</option>
                        <option value="5">5 ستاندات (30 دينار - توصيل وبرمجة مجانية)</option>
                        <option value="10">10 ستاندات (55 دينار - العرض الأقوى)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5 font-black">عنوان التوصيل في إربد: <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        required
                        value={marketingForm.address}
                        onChange={e => setMarketingForm(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="مثال: شارع الجامعة، بجانب مبنى..."
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5 font-black">تعليمات التصميم أو الشعار المفضل طباعته:</label>
                    <textarea
                      value={marketingForm.logoInstructions}
                      onChange={e => setMarketingForm(prev => ({ ...prev, logoInstructions: e.target.value }))}
                      rows={3}
                      placeholder="هل تريد طباعة باركود جوجل مابس أم لوجو المحل أم كلاهما؟ اذكر رغبتك هنا..."
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                    />
                  </div>
                </div>
              )}

              {/* 5. Social Media */}
              {activeMarketingModalType === 'social_media' && (
                <div className="space-y-4 pt-2 border-t border-stone-100">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5 font-black">هدف التغطية الرئيسي: <span className="text-red-500">*</span></label>
                      <select
                        value={marketingForm.campaignGoal}
                        onChange={e => setMarketingForm(prev => ({ ...prev, campaignGoal: e.target.value }))}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-700"
                      >
                        <option value="إشهار وجذب زوار جدد للمحل">إشهار وجذب زوار جدد للمحل</option>
                        <option value="إطلاق صنف أو منتج جديد">إطلاق صنف أو منتج جديد بالكامل</option>
                        <option value="إعلان خصومات وعروض نهاية الموسم">إعلان خصومات وعروض محدودة</option>
                        <option value="صناعة براند وهوية بصرية ممتازة">تعزيز اسم البراند وهوية المحل</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1.5 font-black">تاريخ التصوير المفضل:</label>
                      <input
                        type="date"
                        value={marketingForm.preferredFilmingDate}
                        onChange={e => setMarketingForm(prev => ({ ...prev, preferredFilmingDate: e.target.value }))}
                        className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1.5 font-black">تفاصيل المنتجات والنقاط التي تريد تسليط الضوء عليها: <span className="text-red-500">*</span></label>
                    <textarea
                      required
                      value={marketingForm.highlightPoints}
                      onChange={e => setMarketingForm(prev => ({ ...prev, highlightPoints: e.target.value }))}
                      rows={3}
                      placeholder="اذكر الأصناف الأكثر مبيعاً، الجو العائلي، الأسعار المنافسة التي تريد من المصوّر والمقدّم التركيز عليها وإبرازها..."
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsMarketingModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-stone-200 font-bold text-xs text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
                >
                  إلغاء التراجع
                </button>
                <button
                  type="submit"
                  disabled={submittingMarketingRequest}
                  className="px-6 py-2.5 rounded-xl bg-[#1a4d2e] hover:bg-[#143e25] disabled:bg-stone-300 text-white font-black text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {submittingMarketingRequest ? (
                    <span>جاري إرسال الطلب... ⏳</span>
                  ) : (
                    <>
                      <span>تقديم الطلب الآن 📢</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
