import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link, useLocation } from 'react-router';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Business, Review, WorkingHours, JobOffer } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { 
  MapPin, Phone, Star, ArrowRight, MessageSquare, 
  User as UserIcon, Store, Share2, Copy, Check, 
  Clock, ShieldCheck, Tag, Info, Sparkles,
  ExternalLink, EyeOff, Settings, Edit3, X, CheckCircle,
  Crown, BarChart3, UtensilsCrossed, Lock as LockIcon, Globe, Facebook, Instagram, Twitter, Youtube, Smartphone, Send,
  Video, Play, Trash2, Plus, Camera, Image as ImageIcon, ArrowLeft, ChevronLeft, ChevronRight, AtSign,
  Briefcase, Building2, Flame, DollarSign, Award, Users
} from 'lucide-react';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { getGoogleMapsEmbedUrl, getGoogleMapsActionUrls } from '../lib/googleReviewsHelper';
import { DigitalMenuView } from '../components/vip/DigitalMenuView';
import { DigitalMenuManagerModal } from '../components/vip/DigitalMenuManagerModal';
import { VipAnalyticsDashboard } from '../components/vip/VipAnalyticsDashboard';
import { VipAnalyticsModal } from '../components/vip/VipAnalyticsModal';
import { VipUpgradeRequestModal } from '../components/vip/VipUpgradeRequestModal';
import { VerifiedBadge } from '../components/vip/VerifiedBadge';
import { getBusinessVipStatus } from '../lib/vipHelper';
import { getWhatsAppUrl, formatBusinessWhatsAppMessage } from '../lib/contactHelper';
import { ShareButton } from '../components/ShareButton';
import { BusinessCard } from '../components/BusinessCard';
import { DEMO_SEED_DATA } from '../lib/demoDataHelper';
import { trackBusinessInteraction } from '../lib/analyticsTracker';
import { SEO } from '../components/common/SEO';
import { isBotSubmission, checkSubmissionRateLimit, recordSubmissionTime, sanitizeInput, executeReCaptcha } from '../lib/security';

function getLiveWorkingStatus(hours?: WorkingHours) {
  if (!hours || (!hours.isOpen24Hours && !hours.openTime && !hours.closeTime)) {
    return {
      status: "مفتوح الآن 🟢",
      subText: "متاح طوال اليوم للزوار",
      isOpen: true,
      countdownText: ""
    };
  }
  if (hours.isCustomClosed) {
    return {
      status: "مغلق حالياً 🔴",
      subText: "المنشأة مغلقة مؤقتاً",
      isOpen: false,
      countdownText: ""
    };
  }
  if (hours.isOpen24Hours) {
    return {
      status: "مفتوح الآن 🟢",
      subText: "مفتوح على مدار 24 ساعة",
      isOpen: true,
      countdownText: ""
    };
  }

  const openTime = hours.openTime || "09:00";
  const closeTime = hours.closeTime || "23:00";

  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);

  const now = new Date();
  const currentH = now.getHours();
  const currentM = now.getMinutes();

  const currentMinutes = currentH * 60 + currentM;
  const openMinutes = openH * 60 + openM;
  let closeMinutes = closeH * 60 + closeM;

  // Handle overnight closing (e.g. closes at 02:00 AM)
  let isOvernight = false;
  if (closeMinutes < openMinutes) {
    closeMinutes += 24 * 60;
    isOvernight = true;
  }

  let isOpen = false;
  let minutesUntilChange = 0;

  if (isOvernight) {
    if (currentMinutes >= openMinutes || currentMinutes < (closeMinutes % (24 * 60))) {
      isOpen = true;
      const adjustedCurrent = currentMinutes < openMinutes ? currentMinutes + 24 * 60 : currentMinutes;
      minutesUntilChange = closeMinutes - adjustedCurrent;
    } else {
      isOpen = false;
      minutesUntilChange = openMinutes - currentMinutes;
    }
  } else {
    if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
      isOpen = true;
      minutesUntilChange = closeMinutes - currentMinutes;
    } else {
      isOpen = false;
      if (currentMinutes < openMinutes) {
        minutesUntilChange = openMinutes - currentMinutes;
      } else {
        minutesUntilChange = (openMinutes + 24 * 60) - currentMinutes;
      }
    }
  }

  const hoursLeft = Math.floor(minutesUntilChange / 60);
  const minsLeft = minutesUntilChange % 60;

  let countdownText = "";
  if (isOpen) {
    if (hoursLeft > 0) {
      countdownText = `يغلق بعد ${hoursLeft} ساعة و ${minsLeft} دقيقة`;
    } else {
      countdownText = `يغلق بعد ${minsLeft} دقيقة فقط ⚠️`;
    }
  } else {
    if (hoursLeft > 0) {
      countdownText = `يفتح بعد ${hoursLeft} ساعة و ${minsLeft} دقيقة`;
    } else {
      countdownText = `يفتح بعد ${minsLeft} دقيقة`;
    }
  }

  return {
    status: isOpen ? "مفتوح الآن 🟢" : "مغلق حالياً 🔴",
    subText: `ساعات العمل: من ${openTime} إلى ${closeTime}`,
    isOpen,
    countdownText
  };
}

export function BusinessDetail() {
  const { id } = useParams<{ id: string }>();
  const { currentUser, isAdmin } = useAuth();
  const location = useLocation();
  
  const [business, setBusiness] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [similarBusinesses, setSimilarBusinesses] = useState<Business[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [activeTab, setActiveTab] = useState('about');
  const [error, setError] = useState('');
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const [liveStatus, setLiveStatus] = useState(() => getLiveWorkingStatus(business?.workingHours));

  useEffect(() => {
    if (!business) return;
    setLiveStatus(getLiveWorkingStatus(business.workingHours));
    
    const interval = setInterval(() => {
      setLiveStatus(getLiveWorkingStatus(business.workingHours));
    }, 15000); // Check/update status every 15 seconds for responsiveness
    
    return () => clearInterval(interval);
  }, [business?.workingHours, business?.id]);

  // Custom Feature Modals & Form States
  const [activeOffers, setActiveOffers] = useState<any[]>([]);
  const [activeJobs, setActiveJobs] = useState<JobOffer[]>([]);
  const [selectedDetailJob, setSelectedDetailJob] = useState<JobOffer | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
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
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // VIP Reels states
  const [isAddReelOpen, setIsAddReelOpen] = useState(false);
  const [newReelUrl, setNewReelUrl] = useState('');
  const [newReelTitle, setNewReelTitle] = useState('');
  const [submittingReel, setSubmittingReel] = useState(false);
  const [fullScreenReelUrl, setFullScreenReelUrl] = useState<string | null>(null);

  // VIP Photo Gallery states
  const [newGalleryUrl, setNewGalleryUrl] = useState('');
  const [newGalleryCaption, setNewGalleryCaption] = useState('');
  const [submittingGalleryImage, setSubmittingGalleryImage] = useState(false);
  const [fullScreenImageUrl, setFullScreenImageUrl] = useState<string | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Suggest an Edit modal state
  const [isEditSuggestionOpen, setIsEditSuggestionOpen] = useState(false);
  const [suggestForm, setSuggestForm] = useState({
    phone: '',
    address: '',
    workingHours: '',
    notes: ''
  });
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);
  const [suggestionSuccess, setSuggestionSuccess] = useState(false);

  // Report Review modal state
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReviewForReport, setSelectedReviewForReport] = useState<any | null>(null);
  const [reportReason, setReportReason] = useState('تقييم كيدي/غير حقيقي');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Owner reply inline state
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [replyActiveId, setReplyActiveId] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);

  // Reviews Sorting, Filtering, and Pagination States
  const [reviewSortOrder, setReviewSortOrder] = useState<'newest' | 'highest' | 'lowest'>('newest');
  const [reviewRatingFilter, setReviewRatingFilter] = useState<number>(0); // 0 means All
  const [reviewCurrentPage, setReviewCurrentPage] = useState<number>(1);

  // Edit / Privacy Modal State for Business Owner
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Business>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // VIP Feature Modals for Business Owner
  const [isMenuManagerOpen, setIsMenuManagerOpen] = useState(false);
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [copiedHandle, setCopiedHandle] = useState(false);
  const [hpValue, setHpValue] = useState('');

  useEffect(() => {
    async function fetchData() {
      if (!db || !id) {
        setLoading(false);
        return;
      }
      
      try {
        let docSnap: any = null;
        let actualId = id;
        const cleanParam = id.startsWith('@') ? id.substring(1).trim().toLowerCase() : id.trim().toLowerCase();

        // 1. Try finding by Firestore Doc ID
        try {
          const docRef = doc(db, 'businesses', id);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            docSnap = snap;
            actualId = snap.id;
          }
        } catch {
          // If id is not a standard doc id format, ignore and fallback to username query
        }

        // 2. Fallback to querying by custom social username
        if (!docSnap || !docSnap.exists()) {
          const qUsername = query(collection(db, 'businesses'), where('username', '==', cleanParam), limit(1));
          const usernameSnap = await getDocs(qUsername);
          if (!usernameSnap.empty) {
            docSnap = usernameSnap.docs[0];
            actualId = docSnap.id;
          }
        }
        
        if (docSnap && docSnap.exists()) {
          const bizData = docSnap.data();

          // Check if store is hidden by owner
          if (bizData.isHidden && currentUser?.uid !== bizData.userId && !isAdmin) {
            setBusiness(null);
            setError('تم إخفاء صفحة هذا المحل مؤقتاً بواسطة المالك.');
            setLoading(false);
            return;
          }

          setBusiness({ id: docSnap.id, ...bizData } as Business);
          
          // Track view interaction in database
          trackBusinessInteraction(actualId, 'view');
          
          const q = query(
            collection(db, 'reviews'), 
            where('businessId', '==', actualId)
          );
          
          const querySnapshot = await getDocs(q);
          const fetchedReviews: Review[] = [];
          querySnapshot.forEach((docSnapItem) => {
            fetchedReviews.push({ id: docSnapItem.id, ...docSnapItem.data() } as Review);
          });
          
          // Sort client-side to avoid requiring a composite index
          fetchedReviews.sort((a, b) => b.createdAt - a.createdAt);
          
          setReviews(fetchedReviews);

          // Fetch associated offers from 'offers' collection
          const offersSnap1 = await getDocs(query(collection(db, 'offers'), where('businessName', '==', bizData.name)));
          const loadedOffers: any[] = [];
          offersSnap1.forEach(oDoc => {
            loadedOffers.push({ id: oDoc.id, ...oDoc.data() });
          });
          
          const seenIds = new Set(loadedOffers.map(o => o.id));
          const offersSnap2 = await getDocs(query(collection(db, 'offers'), where('businessId', '==', actualId)));
          offersSnap2.forEach(oDoc => {
            if (!seenIds.has(oDoc.id)) {
              loadedOffers.push({ id: oDoc.id, ...oDoc.data() });
            }
          });
          setActiveOffers(loadedOffers);

          // Fetch associated jobs from 'jobs' collection
          try {
            const jobsSnap1 = await getDocs(query(collection(db, 'jobs'), where('businessId', '==', actualId)));
            const loadedJobs: JobOffer[] = [];
            jobsSnap1.forEach(jDoc => {
              loadedJobs.push({ id: jDoc.id, ...jDoc.data() } as JobOffer);
            });
            const seenJobIds = new Set(loadedJobs.map(j => j.id));
            const jobsSnap2 = await getDocs(query(collection(db, 'jobs'), where('company', '==', bizData.name)));
            jobsSnap2.forEach(jDoc => {
              if (!seenJobIds.has(jDoc.id)) {
                loadedJobs.push({ id: jDoc.id, ...jDoc.data() } as JobOffer);
              }
            });
            // Sort by createdAt desc
            loadedJobs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            setActiveJobs(loadedJobs);
          } catch (jobErr) {
            console.warn("Error fetching business jobs:", jobErr);
          }
        } else {
          // Demo seed fallback if id is a demo business
          const demoFound = (DEMO_SEED_DATA.businesses || []).find((b, idx) => `demo-${idx}` === id || `demo-sim-${idx}` === id || b.name === id || (b as any).id === id || (b as any).username === cleanParam);
          if (demoFound) {
            setBusiness({
              id,
              ...demoFound,
              reviewCount: (demoFound as any).reviewCount ?? (demoFound as any).reviewsCount ?? 0,
              createdAt: demoFound.createdAt || Date.now(),
              userId: 'demo'
            } as unknown as Business);

            // Populate demo jobs matching this business
            const demoJobs = (DEMO_SEED_DATA.jobs || [])
              .filter(j => j.company === demoFound.name)
              .map((j, idx) => ({ id: `demo-job-${idx}`, ...j } as JobOffer));
            setActiveJobs(demoJobs);
          } else {
            setBusiness(null);
            setError('المحل غير موجود أو تم حذفه.');
          }
        }
      } catch (err) {
        console.error("Error fetching business details:", err);
        setError('حدث خطأ أثناء جلب التفاصيل.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, currentUser, isAdmin]);

  // Fetch 3 random similar businesses belonging to the same category
  useEffect(() => {
    async function fetchSimilar() {
      if (!business || !business.category) {
        setSimilarBusinesses([]);
        return;
      }

      setLoadingSimilar(true);
      try {
        let matching: Business[] = [];
        
        if (db) {
          try {
            const q = query(
              collection(db, 'businesses'),
              where('category', '==', business.category)
            );
            const snap = await getDocs(q);
            snap.forEach((d) => {
              if (d.id !== business.id) {
                matching.push({ id: d.id, ...d.data() } as Business);
              }
            });
          } catch (e) {
            console.warn('Error querying matching category businesses from firestore:', e);
          }
        }

        // If fewer than 3, fallback or supplement with demo businesses of same category
        if (matching.length < 3) {
          const demoMatches = (DEMO_SEED_DATA.businesses || [])
            .filter(b => b.category === business.category && b.name !== business.name)
            .map((b, idx) => ({
              id: `demo-sim-${idx}`,
              ...b,
              reviewCount: (b as any).reviewCount ?? (b as any).reviewsCount ?? 0,
              createdAt: b.createdAt || Date.now(),
              userId: 'demo'
            } as unknown as Business));
          
          demoMatches.forEach(dm => {
            if (!matching.some(m => m.name === dm.name) && dm.name !== business.name) {
              matching.push(dm);
            }
          });
        }

        // If still fewer than 3, fetch other businesses from firestore to make sure we show 3 items if available
        if (matching.length < 3 && db) {
          try {
            const allSnap = await getDocs(collection(db, 'businesses'));
            allSnap.forEach((d) => {
              if (d.id !== business.id && !matching.some(m => m.id === d.id)) {
                matching.push({ id: d.id, ...d.data() } as Business);
              }
            });
          } catch (e) {
            console.warn('Error querying fallback businesses:', e);
          }
        }

        // Filter out current business
        const filtered = matching.filter(b => b.id !== business.id && b.name !== business.name);

        // Randomize 3 businesses
        const shuffled = [...filtered].sort(() => 0.5 - Math.random());
        setSimilarBusinesses(shuffled.slice(0, 3));
      } catch (err) {
        console.error('Error in fetchSimilar:', err);
      } finally {
        setLoadingSimilar(false);
      }
    }

    fetchSimilar();
  }, [business?.id, business?.category, business?.name]);

  const isOwner = Boolean(
    currentUser && business && (
      business.userId === currentUser.uid ||
      isAdmin
    )
  );

  const handleOpenEditModal = () => {
    if (!business) return;
    setEditForm({
      name: business.name,
      category: business.category,
      description: business.description,
      address: business.address,
      phone: business.phone || '',
      imageUrl: business.imageUrl || '',
      logoUrl: business.logoUrl || '',
      googlePlaceUrl: business.googlePlaceUrl || '',
      hideSiteReviews: Boolean(business.hideSiteReviews),
      workingHours: business.workingHours || {
        isOpen24Hours: false,
        openTime: "09:00",
        closeTime: "23:00",
        days: "طوال أيام الأسبوع",
        isCustomClosed: false
      }
    });
    setIsEditModalOpen(true);
    setUpdateSuccess(false);
  };

  const handleSaveBusinessSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !db || !isOwner) {
      alert("غير مصرح لك بتعديل بيانات هذا المحل!");
      return;
    }

    setIsUpdating(true);
    try {
      const docRef = doc(db, 'businesses', business.id);
      const updatedFields = {
        name: editForm.name || business.name,
        category: editForm.category || business.category,
        description: editForm.description || business.description,
        address: editForm.address || business.address,
        phone: editForm.phone || '',
        imageUrl: editForm.imageUrl || '',
        logoUrl: editForm.logoUrl || '',
        googlePlaceUrl: editForm.googlePlaceUrl?.trim() || '',
        hideSiteReviews: Boolean(editForm.hideSiteReviews),
        workingHours: editForm.workingHours || null,
      };

      await updateDoc(docRef, updatedFields);

      setBusiness({
        ...business,
        ...updatedFields
      });

      setUpdateSuccess(true);
      setTimeout(() => {
        setIsEditModalOpen(false);
        setUpdateSuccess(false);
      }, 1500);
    } catch (err) {
      console.error("Error updating business settings:", err);
      alert("حدث خطأ أثناء حفظ التعديلات.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCopyPhone = () => {
    if (!business?.phone) return;
    navigator.clipboard.writeText(business.phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleShare = async () => {
    if (business?.id) {
      trackBusinessInteraction(business.id, 'share');
    }
    if (navigator.share) {
      try {
        await navigator.share({
          title: business?.name || 'شو في بإربد؟',
          text: business?.description || '',
          url: window.location.href,
        });
      } catch {
        navigator.clipboard.writeText(window.location.href);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 2000);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    }
  };

  const getEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    const cleaned = url.trim();

    // YouTube Shorts / Standard
    if (cleaned.includes('youtube.com/shorts/') || cleaned.includes('youtu.be/')) {
      let videoId = '';
      if (cleaned.includes('shorts/')) {
        const parts = cleaned.split('shorts/');
        videoId = parts[1]?.split(/[?#]/)[0] || '';
      } else {
        const parts = cleaned.split('youtu.be/');
        videoId = parts[1]?.split(/[?#]/)[0] || '';
      }
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    } else if (cleaned.includes('youtube.com/watch')) {
      try {
        const urlObj = new URL(cleaned);
        const videoId = urlObj.searchParams.get('v');
        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}`;
        }
      } catch {
        // Fallback
      }
    }

    // Instagram Reels / Posts
    if (cleaned.includes('instagram.com/reel/') || cleaned.includes('instagram.com/p/')) {
      let code = '';
      if (cleaned.includes('/reel/')) {
        code = cleaned.split('/reel/')[1]?.split('/')[0] || '';
      } else if (cleaned.includes('/p/')) {
        code = cleaned.split('/p/')[1]?.split('/')[0] || '';
      }
      if (code) {
        return `https://www.instagram.com/reel/${code}/embed/?theme=dark&hidecaption=true`;
      }
    }

    // Facebook Reels / Videos
    if (cleaned.includes('facebook.com/') || cleaned.includes('fb.watch/')) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(cleaned)}&show_text=0&width=380`;
    }

    return null;
  };

  const handleSaveReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !db || !newReelUrl.trim()) return;

    setSubmittingReel(true);
    try {
      const docRef = doc(db, 'businesses', business.id);
      const newReel = {
        id: Math.random().toString(36).substring(2, 9),
        url: newReelUrl.trim(),
        title: newReelTitle.trim() || 'فيديو ريلز تفاعلي',
        createdAt: Date.now()
      };
      
      const currentReels = business.reels || [];
      const updatedReels = [newReel, ...currentReels];

      await updateDoc(docRef, { reels: updatedReels });

      setBusiness({
        ...business,
        reels: updatedReels
      });

      setNewReelUrl('');
      setNewReelTitle('');
      setIsAddReelOpen(false);
    } catch (err) {
      console.error("Error adding reel:", err);
      alert("حدث خطأ أثناء حفظ الفيديو.");
    } finally {
      setSubmittingReel(false);
    }
  };

  const handleDeleteReel = async (reelId: string) => {
    if (!business || !db) return;
    if (!window.confirm("هل أنت متأكد من حذف هذا الفيديو؟")) return;

    try {
      const docRef = doc(db, 'businesses', business.id);
      const updatedReels = (business.reels || []).filter(r => r.id !== reelId);

      await updateDoc(docRef, { reels: updatedReels });

      setBusiness({
        ...business,
        reels: updatedReels
      });
    } catch (err) {
      console.error("Error deleting reel:", err);
      alert("حدث خطأ أثناء حذف الفيديو.");
    }
  };

  const handleAddGalleryImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !db || !newGalleryUrl.trim()) return;

    setSubmittingGalleryImage(true);
    try {
      const docRef = doc(db, 'businesses', business.id);
      const newItem = {
        url: newGalleryUrl.trim(),
        caption: newGalleryCaption.trim() || 'صورة من زوايا المحل والجو العام',
        createdAt: Date.now()
      };

      const currentGallery = business.gallery || [];
      const updatedGallery = [newItem, ...currentGallery];

      await updateDoc(docRef, { gallery: updatedGallery });

      setBusiness({
        ...business,
        gallery: updatedGallery as any
      });

      setNewGalleryUrl('');
      setNewGalleryCaption('');
    } catch (err) {
      console.error("Error adding gallery image:", err);
      alert("حدث خطأ أثناء إضافة الصورة لمعرض المحل.");
    } finally {
      setSubmittingGalleryImage(false);
    }
  };

  const handleDeleteGalleryImage = async (imageUrlToDelete: string) => {
    if (!business || !db) return;
    if (!window.confirm("هل أنت متأكد من حذف هذه الصورة من معرض المحل؟")) return;

    try {
      const docRef = doc(db, 'businesses', business.id);
      const currentGallery = business.gallery || [];
      const updatedGallery = currentGallery.filter((item: any) => {
        const itemUrl = typeof item === 'string' ? item : item?.url;
        return itemUrl !== imageUrlToDelete;
      });

      await updateDoc(docRef, { gallery: updatedGallery });

      setBusiness({
        ...business,
        gallery: updatedGallery
      });
    } catch (err) {
      console.error("Error deleting gallery image:", err);
      alert("حدث خطأ أثناء حذف الصورة.");
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !id || !db || !newComment.trim()) return;

    // 1. Honeypot check (Bot protection)
    if (isBotSubmission(hpValue)) {
      // Trick the bot silently
      setNewComment('');
      setNewRating(5);
      return;
    }

    // 2. Rate limit check (Prevention of review spamming)
    const rateLimit = checkSubmissionRateLimit('review_submit', 15);
    if (!rateLimit.allowed) {
      alert(`يرجى الانتظار ${rateLimit.timeLeft} ثانية قبل إضافة تقييم آخر لحماية المنصة من التعليقات العشوائية.`);
      return;
    }

    // 2.5 Google reCAPTCHA v3 check
    try {
      await executeReCaptcha('review_submit');
    } catch (rcError) {
      console.warn("⚠️ reCAPTCHA execution skipped or failed:", rcError);
    }
    
    setSubmittingReview(true);
    try {
      const reviewData = {
        businessId: id,
        userId: currentUser.uid,
        userName: currentUser.displayName || currentUser.email?.split('@')[0] || 'مستخدم',
        rating: newRating,
        comment: sanitizeInput(newComment.trim()),
        createdAt: Date.now()
      };
      
      const docRef = await addDoc(collection(db, 'reviews'), reviewData);
      
      const updatedReviews = [{ id: docRef.id, ...reviewData } as Review, ...reviews];
      setReviews(updatedReviews);
      
      // Update business average rating in local state
      const totalRatings = updatedReviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = totalRatings / updatedReviews.length;
      
      if (business) {
        setBusiness({
          ...business,
          rating: Number(avgRating.toFixed(1)),
          reviewCount: updatedReviews.length
        });
        
        // Update in firestore as well
        const bRef = doc(db, 'businesses', business.id);
        await updateDoc(bRef, {
          rating: Number(avgRating.toFixed(1)),
          reviewCount: updatedReviews.length
        });
      }

      // 4. Record successful submission timestamp for rate limiting
      recordSubmissionTime('review_submit');

      setNewComment('');
      setNewRating(5);
    } catch (err) {
      console.error("Error adding review:", err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAddOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !business || !newOfferForm.title) return;

    // 1. Honeypot check (Bot protection)
    if (isBotSubmission(hpValue)) {
      setIsOfferModalOpen(false);
      return;
    }

    // 2. Rate limit check (Prevention of spamming)
    const rateLimit = checkSubmissionRateLimit('offer_submit', 60);
    if (!rateLimit.allowed) {
      alert(`يرجى الانتظار ${rateLimit.timeLeft} ثانية قبل إضافة عرض ترويجي آخر لتفادي التكرار والسبام.`);
      return;
    }

    setSubmittingOffer(true);
    try {
      const offerData = {
        title: sanitizeInput(newOfferForm.title),
        businessName: business.name,
        businessId: business.id,
        category: business.category,
        discountPercentage: sanitizeInput(newOfferForm.discountPercentage) || '10%',
        oldPrice: newOfferForm.oldPrice ? sanitizeInput(newOfferForm.oldPrice) : undefined,
        newPrice: newOfferForm.newPrice ? sanitizeInput(newOfferForm.newPrice) : undefined,
        code: newOfferForm.code ? sanitizeInput(newOfferForm.code) : undefined,
        expiresIn: sanitizeInput(newOfferForm.expiresIn) || 'لفترة محدودة',
        description: sanitizeInput(newOfferForm.description),
        location: business.district ? `${business.district} - ${business.address}` : business.address,
        phone: sanitizeInput(newOfferForm.phone || business.phone || ''),
        whatsapp: sanitizeInput(newOfferForm.whatsapp || business.phone || ''),
        image: newOfferForm.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=800',
        isHot: Boolean(newOfferForm.isHot),
        isStudent: Boolean(newOfferForm.isStudent),
        createdAt: Date.now()
      };
      const docRef = await addDoc(collection(db, 'offers'), offerData);
      setActiveOffers(prev => [{ id: docRef.id, ...offerData }, ...prev]);
      
      // 4. Record successful submission timestamp for rate limiting
      recordSubmissionTime('offer_submit');

      setIsOfferModalOpen(false);
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

  const handleSuggestEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !business) return;

    // 1. Honeypot check (Bot protection)
    if (isBotSubmission(hpValue)) {
      setIsEditSuggestionOpen(false);
      setSuggestForm({ phone: '', address: '', workingHours: '', notes: '' });
      return;
    }

    // 2. Rate limit check (Prevention of spamming)
    const rateLimit = checkSubmissionRateLimit('suggest_submit', 30);
    if (!rateLimit.allowed) {
      alert(`يرجى الانتظار ${rateLimit.timeLeft} ثانية قبل اقتراح تعديل آخر لحماية البيانات.`);
      return;
    }

    setSubmittingSuggestion(true);
    try {
      const suggestionData = {
        businessId: business.id,
        businessName: business.name,
        userId: currentUser?.uid || 'guest',
        userName: currentUser?.displayName || 'زائر مجهول',
        userEmail: currentUser?.email || 'guest@shofieirbid.com',
        suggestedChanges: {
          phone: suggestForm.phone ? sanitizeInput(suggestForm.phone) : undefined,
          address: suggestForm.address ? sanitizeInput(suggestForm.address) : undefined,
          workingHours: suggestForm.workingHours ? sanitizeInput(suggestForm.workingHours) : undefined,
          notes: suggestForm.notes ? sanitizeInput(suggestForm.notes) : undefined
        },
        status: 'pending',
        createdAt: Date.now()
      };
      await addDoc(collection(db, 'edit_suggestions'), suggestionData);
      
      // 4. Record successful submission timestamp for rate limiting
      recordSubmissionTime('suggest_submit');

      setSuggestionSuccess(true);
      setTimeout(() => {
        setIsEditSuggestionOpen(false);
        setSuggestionSuccess(false);
        setSuggestForm({ phone: '', address: '', workingHours: '', notes: '' });
      }, 2500);
    } catch (err) {
      console.error("Error submitting suggestion:", err);
    } finally {
      setSubmittingSuggestion(false);
    }
  };

  const handleReportReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !selectedReviewForReport || !business) return;

    // 1. Honeypot check (Bot protection)
    if (isBotSubmission(hpValue)) {
      setIsReportModalOpen(false);
      setSelectedReviewForReport(null);
      return;
    }

    // 2. Rate limit check (Prevention of spamming)
    const rateLimit = checkSubmissionRateLimit('report_submit', 30);
    if (!rateLimit.allowed) {
      alert(`يرجى الانتظار ${rateLimit.timeLeft} ثانية قبل تقديم بلاغ آخر لحماية المنصة.`);
      return;
    }

    setSubmittingReport(true);
    try {
      const reportData = {
        reviewId: selectedReviewForReport.id,
        businessId: business.id,
        businessName: business.name,
        reviewComment: selectedReviewForReport.comment,
        reviewAuthorName: selectedReviewForReport.userName,
        reason: sanitizeInput(reportReason),
        reportedByUid: currentUser?.uid || 'guest',
        reportedByEmail: currentUser?.email || 'guest@shofieirbid.com',
        status: 'pending',
        createdAt: Date.now()
      };
      await addDoc(collection(db, 'review_reports'), reportData);
      
      // 4. Record successful submission timestamp for rate limiting
      recordSubmissionTime('report_submit');

      setReportSuccess(true);
      setTimeout(() => {
        setIsReportModalOpen(false);
        setReportSuccess(false);
        setSelectedReviewForReport(null);
        setReportReason('تقييم كيدي/غير حقيقي');
      }, 2500);
    } catch (err) {
      console.error("Error reporting review:", err);
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleSaveOwnerReply = async (reviewId: string) => {
    if (!db || !business || !currentUser) return;
    if (!vipInfo.isVip) {
      setIsUpgradeModalOpen(true);
      return;
    }
    const replyText = replyTextMap[reviewId]?.trim();
    if (!replyText) return;

    setSubmittingReply(true);
    try {
      const reviewRef = doc(db, 'reviews', reviewId);
      const replyData = {
        text: replyText,
        createdAt: Date.now(),
        authorName: business.name,
        authorUid: currentUser.uid
      };
      await updateDoc(reviewRef, {
        reply: replyData
      });

      // Update reviews local state
      setReviews(prev => prev.map(rev => {
        if (rev.id === reviewId) {
          return { ...rev, reply: replyData };
        }
        return rev;
      }));

      setReplyActiveId(null);
    } catch (err) {
      console.error("Error saving owner reply:", err);
    } finally {
      setSubmittingReply(false);
    }
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

  if (!business && !error) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl sm:rounded-[32px] border border-[#e5e1da] p-6">
        <div className="bg-stone-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
          <Store className="h-10 w-10 text-stone-400" />
        </div>
        <h2 className="text-2xl font-bold text-stone-900 mb-2">المحل غير موجود</h2>
        <p className="text-stone-500 mb-8 max-w-md mx-auto">قد يكون تم حذفه، أو أن الرابط غير صحيح، أو بانتظار موافقة الإدارة.</p>
        <Link to="/" className="inline-flex items-center justify-center px-6 py-3 bg-[#1a4d2e] text-white rounded-xl font-bold hover:bg-[#133b22] transition-colors gap-2">
          <ArrowRight className="h-5 w-5" />
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  const hideSite = Boolean(business?.hideSiteReviews);
  const { viewUrl: googleMapsUrl } = business ? getGoogleMapsActionUrls(business) : { viewUrl: '' };
  const embedMapUrl = business ? getGoogleMapsEmbedUrl(business) : '';

  // Calculate actual site rating average
  const validReviews = reviews.filter(r => r && typeof r.rating === 'number' && !isNaN(r.rating));
  let calculatedRating: string | null = null;
  if (validReviews.length > 0) {
    const sum = validReviews.reduce((acc, curr) => acc + curr.rating, 0);
    const avg = sum / validReviews.length;
    calculatedRating = isNaN(avg) ? null : avg.toFixed(1);
  } else if (business?.rating && !isNaN(business.rating)) {
    calculatedRating = business.rating.toFixed(1);
  }

  const vipInfo = getBusinessVipStatus(business);

  const renderSocialMediaButtons = (links?: Business['socialLinks']) => {
    if (!links) return null;
    const entries = Object.entries(links).filter(([_, l]) => l && typeof l === 'string' && l.trim() !== '');
    if (entries.length === 0) return null;

    return (
      <div className="flex flex-wrap items-center gap-2">
        {entries.map(([platform, rawLink]) => {
          if (!rawLink) return null;
          const link = rawLink.trim();
          let href = link;
          if (!link.startsWith("http://") && !link.startsWith("https://")) {
            if (platform === "facebook") href = `https://facebook.com/${link}`;
            else if (platform === "instagram") href = `https://instagram.com/${link.replace('@', '')}`;
            else if (platform === "tiktok") href = `https://tiktok.com/@${link.replace('@', '')}`;
            else if (platform === "snapchat") href = `https://snapchat.com/add/${link.replace('@', '')}`;
            else if (platform === "telegram") href = `https://t.me/${link.replace('@', '')}`;
            else if (platform === "x") href = `https://x.com/${link.replace('@', '')}`;
            else if (platform === "youtube") href = `https://youtube.com/@${link.replace('@', '')}`;
            else if (platform === "whatsapp") href = `https://wa.me/${link.replace(/[^0-9]/g, '')}`;
            else if (platform === "website") href = `https://${link}`;
          }

          let Icon = Globe;
          let colorClass = "text-stone-700 bg-stone-100 hover:bg-stone-200 border-stone-200";
          let label = "الموقع";

          if (platform === "facebook") {
            Icon = Facebook;
            colorClass = "text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-200";
            label = "فيسبوك";
          } else if (platform === "instagram") {
            Icon = Instagram;
            colorClass = "text-pink-600 bg-pink-50 hover:bg-pink-100 border-pink-200";
            label = "إنستغرام";
          } else if (platform === "tiktok") {
            Icon = Smartphone;
            colorClass = "text-stone-900 bg-stone-100 hover:bg-stone-200 border-stone-300";
            label = "تيك توك";
          } else if (platform === "snapchat") {
            Icon = Smartphone;
            colorClass = "text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border-yellow-200";
            label = "سناب شات";
          } else if (platform === "telegram") {
            Icon = Send;
            colorClass = "text-sky-600 bg-sky-50 hover:bg-sky-100 border-sky-200";
            label = "تلغرام";
          } else if (platform === "x") {
            Icon = Twitter;
            colorClass = "text-stone-800 bg-stone-100 hover:bg-stone-200 border-stone-300";
            label = "منصة X";
          } else if (platform === "youtube") {
            Icon = Youtube;
            colorClass = "text-red-600 bg-red-50 hover:bg-red-100 border-red-200";
            label = "يوتيوب";
          } else if (platform === "whatsapp") {
            Icon = MessageSquare;
            colorClass = "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200";
            label = "واتساب";
          }

          return (
            <a
              key={platform}
              href={href}
              target="_blank"
              rel="noreferrer"
              title={label}
              aria-label={label}
              onClick={() => { if (business?.id) trackBusinessInteraction(business.id, platform as any); }}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center border transition-all duration-200 shadow-2xs hover:scale-110 active:scale-95 ${colorClass}`}
            >
              <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
            </a>
          );
        })}
      </div>
    );
  };

  const hasSocialLinks = Boolean(
    business?.socialLinks &&
    Object.values(business.socialLinks).some(link => link && typeof link === 'string' && link.trim() !== '')
  );

  // Reviews sorting, filtering and pagination computations
  const filteredReviews = reviews.filter((review) => {
    if (reviewRatingFilter === 0) return true;
    return review.rating >= reviewRatingFilter;
  });

  const sortedReviews = [...filteredReviews].sort((a, b) => {
    if (reviewSortOrder === 'newest') {
      return b.createdAt - a.createdAt;
    }
    if (reviewSortOrder === 'highest') {
      return b.rating - a.rating;
    }
    if (reviewSortOrder === 'lowest') {
      return a.rating - b.rating;
    }
    return 0;
  });

  const reviewsPerPage = 7;
  const totalReviewPages = Math.ceil(sortedReviews.length / reviewsPerPage);
  const activeReviewPage = Math.min(Math.max(1, reviewCurrentPage), totalReviewPages || 1);

  const paginatedReviews = sortedReviews.slice(
    (activeReviewPage - 1) * reviewsPerPage,
    activeReviewPage * reviewsPerPage
  );

  const handlePageChange = (page: number) => {
    setReviewCurrentPage(page);
    const element = document.getElementById('reviews-section-header');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full space-y-6 sm:space-y-8 pb-24 md:pb-12">
      {/* SEO & Geo AI Optimization for Local Store */}
      {business && (
        <SEO 
          title={business.name}
          description={`${business.name} في ${business.district || 'إربد'}، ${business.address || 'محافظة إربد'}. ${business.description || 'اكتشف تقييمات، ساعات العمل، أرقام التواصل، وقائمة المنتجات والعروض.'}`}
          keywords={[
            business.name, 
            `${business.name} إربد`, 
            `${business.category} إربد`, 
            business.district ? `${business.category} ${business.district}` : 'محلات إربد',
            'إربد', 
            'اربد', 
            'دليل إربد'
          ]}
          ogImage={business.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200'}
          ogType="business.business"
          canonicalUrl={typeof window !== 'undefined' ? window.location.href : undefined}
          schemaData={{
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "@id": typeof window !== 'undefined' ? window.location.href : `https://shofierbid.com/b/${business.id}`,
            "name": business.name,
            "image": business.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1200',
            "description": business.description || `صفحة ${business.name} على دليل شو في بإربد الشامل.`,
            "telephone": business.phone || business.socialLinks?.whatsapp || undefined,
            "address": {
              "@type": "PostalAddress",
              "streetAddress": business.address || business.district || "إربد",
              "addressLocality": "إربد",
              "addressRegion": "محافظة إربد",
              "addressCountry": "JO"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": 32.5568,
              "longitude": 35.8469
            },
            "aggregateRating": business.rating && business.reviewCount ? {
              "@type": "AggregateRating",
              "ratingValue": business.rating,
              "reviewCount": Math.max(1, business.reviewCount)
            } : undefined
          }}
        />
      )}

      {/* Hidden Store Notice for Owner / Admin */}
      {business?.isHidden && (isOwner || isAdmin) && (
        <div className="bg-amber-50 border-2 border-amber-300 text-amber-900 px-4 py-3 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold shadow-xs">
          <div className="flex items-center gap-2">
            <EyeOff className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-black text-sm text-amber-950">تنبيه المالك: صفحة المحل مخفية حالياً 🔒</p>
              <p className="text-amber-800 text-xs">هذا المحل غير مرئي للزوار العاديين ولن يظهر في نتائج البحث حتى تعيد تفعيله.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenEditModal}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-colors shrink-0 cursor-pointer"
          >
            تعديل الظهور
          </button>
        </div>
      )}

      {/* Back Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/" className="inline-flex items-center gap-2 text-stone-600 hover:text-[#1a4d2e] transition-colors text-sm font-bold bg-white border border-[#e5e1da] px-4 py-2 rounded-xl shadow-xs">
          <ArrowRight className="h-4 w-4" />
          العودة للدليل
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {isOwner && (
            <>
              {vipInfo.isVip ? (
                <>
                  <button
                    type="button"
                    onClick={() => setIsAnalyticsModalOpen(true)}
                    className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white transition-colors text-xs font-black px-3.5 py-2 rounded-xl shadow-xs cursor-pointer"
                  >
                    <Crown className="h-4 w-4 fill-white" />
                    <span>إحصائيات VIP</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsMenuManagerOpen(true)}
                    className="inline-flex items-center gap-1.5 bg-[#1a4d2e] text-white hover:bg-[#133b22] transition-colors text-xs font-black px-3.5 py-2 rounded-xl shadow-xs cursor-pointer"
                  >
                    <UtensilsCrossed className="h-4 w-4" />
                    <span>المنيو والكتالوج</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white transition-colors text-xs font-black px-3.5 py-2 rounded-xl shadow-xs cursor-pointer"
                >
                  <Crown className="h-4 w-4 fill-white" />
                  <span>ترقية هذا المحل لـ VIP</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleOpenEditModal}
                className="inline-flex items-center gap-1.5 bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors text-xs font-bold px-3 py-2 rounded-xl shadow-xs cursor-pointer"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>الخصوصية والتعديل</span>
              </button>
            </>
          )}

          <button 
            onClick={handleShare}
            className="inline-flex items-center gap-2 text-stone-600 hover:text-[#1a4d2e] transition-colors text-xs sm:text-sm font-bold bg-white border border-[#e5e1da] px-3.5 py-2 rounded-xl shadow-xs cursor-pointer"
          >
            <Share2 className="h-4 w-4 text-[#1a4d2e]" />
            <span>{shareSuccess ? 'تم نسخ الرابط!' : 'مشاركة'}</span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl font-medium">{error}</div>
      ) : business && (
        <>
          {/* Main Hero Header */}
          <div className="bg-white rounded-2xl sm:rounded-3xl lg:rounded-[32px] border border-[#e5e1da] overflow-hidden shadow-xs relative">
            {/* 1. Cover Image Section */}
            <div className="h-44 sm:h-60 md:h-[280px] lg:h-[320px] bg-stone-100 relative">
              {business.imageUrl ? (
                <img 
                  src={business.imageUrl} 
                  alt={business.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[#1a4d2e]/5">
                  <Store className="h-16 w-16 md:h-24 md:w-24 text-[#1a4d2e]/20" />
                </div>
              )}
            </div>

            {/* 2. Details & Profile Picture Section */}
            <div className="relative px-4 pb-5 sm:px-6 md:px-8 sm:pb-6">
              {/* Profile Picture & Badges/Ratings (overlaps Cover Image) */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-16 mb-4 relative z-20">
                <div className="flex items-end gap-3 sm:gap-4">
                  {/* Circular Profile Picture / Logo */}
                  <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border-4 border-white shadow-md bg-white flex items-center justify-center overflow-hidden shrink-0">
                    {business.logoUrl ? (
                      <img 
                        src={business.logoUrl} 
                        alt={`${business.name} Logo`} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#1a4d2e] to-emerald-600 flex items-center justify-center text-white font-black text-2xl sm:text-4xl shadow-inner">
                        {business.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Badges/Category for desktop/large screens (beside profile picture) */}
                  <div className="hidden sm:block pb-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-[#ff9f1c]/10 text-[#ff9f1c] border border-[#ff9f1c]/20 px-3 py-0.5 rounded-full text-xs font-bold">
                        {business.category}
                      </span>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        معتمد في إربد
                      </span>
                      {isOwner && (
                        <span className="bg-stone-100 text-stone-700 border border-stone-200 px-3 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                          <UserIcon className="h-3.5 w-3.5" />
                          أنت صاحب هذا المحل
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rating card on desktop/large screens */}
                <div className="hidden sm:block">
                  {hideSite ? (
                    <div className="flex items-center gap-2 bg-stone-50 px-3.5 py-2 rounded-xl text-stone-500 font-bold border border-stone-100">
                      <EyeOff className="h-3.5 w-3.5 text-stone-400" />
                      <span className="text-xs">التقييمات معطلة من صاحب المحل</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2.5 bg-stone-50 px-4 py-2 rounded-xl text-[#2d2a26] font-bold border border-stone-100 shadow-3xs">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-[#1a4d2e] font-black text-sm border border-emerald-100">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1">
                          <span className="text-base font-black leading-none text-stone-900">
                            {calculatedRating || 'جديد'}
                          </span>
                        </div>
                        <span className="text-[10px] font-semibold text-stone-500 mt-0.5">
                          تقييمات الموقع ({reviews.length})
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Business Name, Status & Address Block (Mobile-optimized layout) */}
              <div className="space-y-3 mt-2">
                {/* Mobile Badges/Category */}
                <div className="flex flex-wrap items-center gap-1.5 sm:hidden">
                  <span className="bg-[#ff9f1c]/10 text-[#ff9f1c] border border-[#ff9f1c]/25 px-2.5 py-0.5 rounded-md text-[10px] font-black">
                    {business.category}
                  </span>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-0.5">
                    <ShieldCheck className="h-3 w-3" />
                    معتمد في إربد
                  </span>
                  {isOwner && (
                    <span className="bg-stone-50 text-stone-700 border border-stone-200 px-2.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-0.5">
                      <UserIcon className="h-3 w-3" />
                      أنت صاحب هذا المحل
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl sm:text-3xl md:text-4xl font-black tracking-tight text-stone-900 break-words">
                        {business.name}
                      </h1>
                      {vipInfo.isVip && (
                        <VerifiedBadge size="lg" businessName={business.name} />
                      )}
                      {business.username && (
                        <button
                          type="button"
                          onClick={() => {
                            const url = `${window.location.origin}/@${business.username}`;
                            navigator.clipboard.writeText(url);
                            setCopiedHandle(true);
                            setTimeout(() => setCopiedHandle(false), 2000);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-mono font-bold transition-all shadow-2xs cursor-pointer border border-stone-200/80"
                          title="اضغط لنسخ رابط صفحة السوشيال ميديا للمحل"
                        >
                          <AtSign className="h-3.5 w-3.5 text-[#1a4d2e]" />
                          <span>{business.username}</span>
                          {copiedHandle ? <Check className="h-3 w-3 text-emerald-600 ml-0.5" /> : <Copy className="h-3 w-3 text-stone-400 ml-0.5" />}
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {business.address && (
                        <p className="flex items-center gap-1 text-xs sm:text-sm font-medium text-stone-500">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-[#ff9f1c]" />
                          <span>{business.address}</span>
                        </p>
                      )}
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                        liveStatus.isOpen 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${liveStatus.isOpen ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}></span>
                        <span>{liveStatus.isOpen ? 'مفتوح الآن' : 'مغلق حالياً'}</span>
                      </span>
                    </div>

                    {/* Social Media Links in Hero Header */}
                    {hasSocialLinks && (
                      <div className="pt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-bold text-stone-500 flex items-center gap-1.5 pl-1">
                          <Globe className="h-3.5 w-3.5 text-[#1a4d2e]" />
                          <span>التواصل والتواصل الاجتماعي:</span>
                        </span>
                        {renderSocialMediaButtons(business.socialLinks)}
                      </div>
                    )}
                  </div>

                  {/* Rating display on mobile only */}
                  <div className="block sm:hidden border-t border-stone-100 pt-2">
                    {hideSite ? (
                      <p className="text-[11px] text-stone-500 font-bold flex items-center gap-1">
                        <EyeOff className="h-3 w-3" />
                        <span>التقييمات معطلة من صاحب المحل</span>
                      </p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-yellow-50 px-2.5 py-1 rounded-lg border border-yellow-100 text-yellow-700 text-xs font-black">
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          <span>{calculatedRating || 'جديد'}</span>
                        </div>
                        <span className="text-[10px] font-semibold text-stone-500">
                          تقييمات الموقع ({reviews.length})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="border-b border-[#e5e1da] px-4 sm:px-8 flex overflow-x-auto gap-4 sm:gap-8 scrollbar-hide bg-stone-50/50" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <button 
                onClick={() => setActiveTab('about')}
                className={`py-3.5 sm:py-4 font-bold text-sm sm:text-base border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'about' 
                    ? 'border-[#1a4d2e] text-[#1a4d2e]' 
                    : 'border-transparent text-stone-500 hover:text-[#2d2a26]'
                }`}
              >
                <Info className="h-4 w-4" />
                عن المحل
              </button>

              <button 
                onClick={() => setActiveTab('menu')}
                className={`py-3.5 sm:py-4 font-bold text-sm sm:text-base border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'menu' || activeTab === 'products'
                    ? 'border-[#1a4d2e] text-[#1a4d2e]' 
                    : 'border-transparent text-stone-500 hover:text-[#2d2a26]'
                }`}
              >
                <UtensilsCrossed className="h-4 w-4 text-[#1a4d2e]" />
                <span>المنيو والكتالوج الرقمي</span>
                {business.menuItems && business.menuItems.length > 0 && (
                  <span className="bg-[#1a4d2e]/10 text-[#1a4d2e] text-xs px-2 py-0.5 rounded-full font-bold">
                    {business.menuItems.length}
                  </span>
                )}
              </button>

              {((business.category || "").includes('سكنات') || (business.category || "").includes('شقق') || (business.category || "").includes('عقارات')) && (
                <button 
                  onClick={() => setActiveTab('specs')}
                  className={`py-3.5 sm:py-4 font-bold text-sm sm:text-base border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    activeTab === 'specs' 
                      ? 'border-[#1a4d2e] text-[#1a4d2e]' 
                      : 'border-transparent text-stone-500 hover:text-[#2d2a26]'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  مواصفات السكن
                </button>
              )}

              <button 
                onClick={() => setActiveTab('offers')}
                className={`py-3.5 sm:py-4 font-bold text-sm sm:text-base border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'offers' 
                    ? 'border-red-500 text-red-600' 
                    : 'border-transparent text-stone-500 hover:text-red-600'
                }`}
              >
                <Tag className="h-4 w-4 text-red-500" />
                العروض والخصومات
              </button>

              <button 
                onClick={() => setActiveTab('jobs')}
                className={`py-3.5 sm:py-4 font-bold text-sm sm:text-base border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'jobs' 
                    ? 'border-[#1a4d2e] text-[#1a4d2e]' 
                    : 'border-transparent text-stone-500 hover:text-[#2d2a26]'
                }`}
              >
                <Briefcase className="h-4 w-4 text-[#1a4d2e]" />
                <span>وظائف شاغرة</span>
                {activeJobs.length > 0 && (
                  <span className="bg-[#1a4d2e]/10 text-[#1a4d2e] text-xs px-2 py-0.5 rounded-full font-bold">
                    {activeJobs.length}
                  </span>
                )}
              </button>

              <button 
                onClick={() => setActiveTab('reels')}
                className={`py-3.5 sm:py-4 font-bold text-sm sm:text-base border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'reels' 
                    ? 'border-purple-600 text-purple-700 font-black' 
                    : 'border-transparent text-stone-500 hover:text-purple-600'
                }`}
              >
                <Video className="h-4 w-4 text-purple-500" />
                <span>ريلزات المحل</span>
                {business.reels && business.reels.length > 0 && (
                  <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full font-bold">
                    {business.reels.length}
                  </span>
                )}
              </button>

              <button 
                onClick={() => setActiveTab('gallery')}
                className={`py-3.5 sm:py-4 font-bold text-sm sm:text-base border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === 'gallery' 
                    ? 'border-emerald-600 text-emerald-700 font-black' 
                    : 'border-transparent text-stone-500 hover:text-emerald-600'
                }`}
              >
                <Camera className="h-4 w-4 text-emerald-500" />
                <span>صور وجو المحل</span>
                {business.gallery && business.gallery.length > 0 && (
                  <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-bold">
                    {business.gallery.length}
                  </span>
                )}
              </button>

              {isOwner && (
                vipInfo.isVip ? (
                  <button 
                    onClick={() => setActiveTab('analytics')}
                    className={`py-3.5 sm:py-4 font-bold text-sm sm:text-base border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                      activeTab === 'analytics' 
                        ? 'border-amber-500 text-amber-700 font-black' 
                        : 'border-transparent text-amber-600 hover:text-amber-800 font-bold'
                    }`}
                  >
                    <BarChart3 className="h-4 w-4 text-amber-600" />
                    لوحة التحليلات VIP
                  </button>
                ) : (
                  <button 
                    onClick={() => setIsUpgradeModalOpen(true)}
                    className="py-3.5 sm:py-4 font-black text-sm sm:text-base text-amber-700 hover:text-amber-800 transition-colors flex items-center gap-1.5 border-b-2 border-transparent cursor-pointer"
                  >
                    <Crown className="h-4 w-4 fill-amber-500 text-amber-600" />
                    <span>ترقية المحل لـ VIP</span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Desktop/Laptop 2-Column Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
            
            {/* Right Side: Primary Content and Reviews (lg:col-span-2) */}
            <div className="lg:col-span-2 space-y-6 sm:space-y-8">
              
              {/* Tab Content Box */}
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#e5e1da] p-6 sm:p-8 shadow-xs">
                {activeTab === 'about' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-lg sm:text-xl font-bold text-[#2d2a26] mb-3 flex items-center gap-2">
                        <Info className="h-5 w-5 text-[#1a4d2e]" />
                        نبذة عن المحل والخدمات
                      </h2>
                      <div className="text-stone-600 text-base sm:text-lg leading-relaxed whitespace-pre-line break-words">
                        {business.description || "لا يوجد وصف متوفر حالياً لهذا المحل."}
                      </div>
                    </div>
                  </div>
                )}

                {(activeTab === 'menu' || activeTab === 'products') && (
                  vipInfo.isVip || (business.menuItems && business.menuItems.length > 0) ? (
                    <DigitalMenuView
                      business={business}
                      isOwner={isOwner && vipInfo.isVip}
                      onOpenManageMenu={() => setIsMenuManagerOpen(true)}
                    />
                  ) : (
                    <div className="py-12 text-center bg-gradient-to-b from-amber-50/50 to-stone-50 rounded-2xl border border-dashed border-amber-200 p-6">
                      <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <Crown className="h-7 w-7 fill-amber-500 text-amber-600" />
                      </div>
                      <h3 className="text-lg font-black text-stone-800 mb-1">المنيو والكتالوج الرقمي</h3>
                      <p className="text-stone-600 text-sm max-w-md mx-auto mb-4">
                        عرض المنيو والكتالوج الرقمي التفاعلي متاح حصرياً للأنشطة التجارية المشتركة في الباقة الذهبية VIP.
                      </p>
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => setIsUpgradeModalOpen(true)}
                          className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                        >
                          <Crown className="h-4 w-4 fill-white" />
                          <span>ترقية محلك إلى VIP الآن</span>
                        </button>
                      )}
                    </div>
                  )
                )}

                {activeTab === 'specs' && (
                  <div className="py-12 text-center bg-stone-50/70 rounded-2xl border border-dashed border-[#e5e1da]">
                    <div className="w-14 h-14 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <Sparkles className="h-7 w-7" />
                    </div>
                    <h3 className="text-lg font-bold text-stone-800 mb-1">مواصفات السكن والخدمات</h3>
                    <p className="text-stone-500 text-sm max-w-sm mx-auto">
                      استعراض تفصيلي لعدد الغرف، المرافق، السعر الشهري وشروط التأمين.
                    </p>
                  </div>
                )}

                {activeTab === 'offers' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
                      <div>
                        <h3 className="text-lg font-bold text-stone-900">العروض الترويجية والخصومات الحصرية</h3>
                        <p className="text-xs text-stone-500">العروض والصفقات النشطة حالياً لدى هذا المحل</p>
                      </div>
                      {isOwner && (
                        vipInfo.isVip ? (
                          <button
                            onClick={() => setIsOfferModalOpen(true)}
                            className="inline-flex items-center justify-center gap-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                          >
                            <Tag className="h-4 w-4" />
                            <span>إضافة عرض جديد للمحل</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setIsUpgradeModalOpen(true)}
                            className="inline-flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs"
                          >
                            <Crown className="h-4 w-4 text-amber-600 fill-amber-500" />
                            <span>نشر العروض (حصري لباقة VIP) 🔒</span>
                          </button>
                        )
                      )}
                    </div>

                    {activeOffers.length === 0 ? (
                      <div className="py-12 text-center bg-red-50/40 rounded-2xl border border-dashed border-red-200 p-6 space-y-4">
                        <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
                          <Tag className="h-7 w-7" />
                        </div>
                        <h4 className="text-base font-bold text-red-800">لا توجد عروض نشطة حالياً</h4>
                        <p className="text-stone-500 text-xs max-w-sm mx-auto">
                          لم يقم هذا المحل بإدراج خصومات ترويجية في هذه الفترة. ترقبوا الإعلانات القادمة!
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {activeOffers.map((offer) => (
                          <div
                            key={offer.id}
                            className="bg-[#fdfcfb] rounded-2xl border border-stone-200/80 overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                          >
                            <div className="p-5 space-y-3">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className="bg-amber-400 text-stone-900 font-black text-xs px-2.5 py-1 rounded-lg border border-amber-300 shadow-2xs">
                                  خصم {offer.discountPercentage}
                                </span>
                                {offer.expiresIn && (
                                  <span className="text-[10px] font-bold text-orange-600 bg-orange-50 border border-orange-200/50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    <span>{offer.expiresIn}</span>
                                  </span>
                                )}
                              </div>

                              <h4 className="text-base font-bold text-stone-900 leading-snug">
                                {offer.title}
                              </h4>
                              
                              <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                                {offer.description}
                              </p>

                              {(offer.newPrice || offer.oldPrice) && (
                                <div className="flex items-baseline gap-2 bg-stone-50 p-2 rounded-lg border border-stone-100 w-fit">
                                  {offer.newPrice && (
                                    <span className="text-base font-black text-emerald-700">{offer.newPrice}</span>
                                  )}
                                  {offer.oldPrice && (
                                    <span className="text-xs text-stone-400 line-through">{offer.oldPrice}</span>
                                  )}
                                </div>
                              )}

                              {offer.code && (
                                <div className="bg-red-50/50 border border-red-100 p-2 rounded-xl flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-stone-600">الكود: <code className="bg-white px-1.5 py-0.5 rounded text-red-600 font-mono font-bold border border-red-200">{offer.code}</code></span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(offer.code);
                                      alert("تم نسخ كود الخصم: " + offer.code);
                                    }}
                                    className="bg-white hover:bg-stone-100 text-stone-700 text-[10px] font-bold px-2 py-1 rounded-lg border border-stone-200 transition-colors"
                                  >
                                    نسخ الكود
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="p-4 bg-stone-50 border-t border-stone-100 flex items-center gap-2">
                              <a
                                href={getWhatsAppUrl(offer.whatsapp || offer.phone || business.phone || '', `مرحباً، أود الاستفسار عن عرضكم: ${offer.title}`)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-1 inline-flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3 rounded-lg text-xs font-bold transition-colors"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>استفسار واتساب</span>
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'reels' && (
                  vipInfo.isVip ? (
                    <div className="space-y-6 text-right">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
                        <div>
                          <h3 className="text-lg font-black text-[#2d2a26] flex items-center gap-2">
                            <Video className="h-5 w-5 text-purple-600" />
                            <span>ريلزات وفيديوهات المحل التفاعلية</span>
                          </h3>
                          <p className="text-xs text-stone-500">شاهد اللقطات والفيديوهات الحصرية لهذا المحل لتعيش التجربة التفاعلية</p>
                        </div>
                        {isOwner && (
                          <button
                            onClick={() => setIsAddReelOpen(!isAddReelOpen)}
                            className="inline-flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                          >
                            <Plus className="h-4 w-4" />
                            <span>إضافة فيديو ريلز جديد</span>
                          </button>
                        )}
                      </div>

                      {/* Add Reel Form */}
                      {isOwner && isAddReelOpen && (
                        <form onSubmit={handleSaveReel} className="bg-stone-50 border border-stone-200 p-5 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                          <h4 className="text-xs font-black text-stone-800 uppercase tracking-wider">إضافة فيديو ترويجي جديد (ريلز)</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="block text-xs font-bold text-stone-700">عنوان توضيحي للفيديو</label>
                              <input 
                                type="text"
                                value={newReelTitle}
                                onChange={(e) => setNewReelTitle(e.target.value)}
                                placeholder="مثال: استعراض تشكيلة الملابس الجديدة أو أجواء المحل"
                                className="w-full text-xs px-3.5 py-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:border-purple-600 text-right"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs font-bold text-stone-700">رابط الفيديو (فيسبوك، إنستغرام، يوتيوب شورتس)</label>
                              <input 
                                type="url"
                                required
                                value={newReelUrl}
                                onChange={(e) => setNewReelUrl(e.target.value)}
                                placeholder="انسخ الرابط والصقه هنا (مثال: https://www.instagram.com/reel/...)"
                                className="w-full text-xs px-3.5 py-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:border-purple-600 text-left"
                                style={{ direction: 'ltr' }}
                              />
                            </div>
                          </div>
                          
                          <div className="bg-purple-50 text-purple-950 p-3 rounded-xl text-[11px] leading-relaxed border border-purple-100 flex items-start gap-2">
                            <Sparkles className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
                            <p>
                              <strong>ملاحظة للمبرمج التاجر:</strong> النظام يدعم روابط الفيديوهات المباشرة من 
                              <span className="font-bold"> فيسبوك ريلز</span>، 
                              <span className="font-bold"> إنستغرام ريلز</span>، و 
                              <span className="font-bold"> يوتيوب شورتس (YouTube Shorts)</span>. سيتم تضمين الفيديو تلقائياً بشكل أنيق لزوار الصفحة.
                            </p>
                          </div>

                          <div className="flex items-center gap-2 justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddReelOpen(false);
                                setNewReelUrl('');
                                setNewReelTitle('');
                              }}
                              className="px-4 py-2 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-100 transition-colors"
                            >
                              إلغاء
                            </button>
                            <button
                              type="submit"
                              disabled={submittingReel}
                              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-1.5"
                            >
                              {submittingReel ? 'جاري الحفظ...' : 'حفظ ونشر الفيديو'}
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Reels Grid */}
                      {(!business.reels || business.reels.length === 0) ? (
                        <div className="py-14 text-center bg-stone-50/50 rounded-2xl border border-dashed border-stone-200 p-6 space-y-4">
                          <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto">
                            <Video className="h-6 w-6" />
                          </div>
                          <h4 className="text-base font-bold text-stone-800">لا توجد ريلزات ترويجية للمحل بعد</h4>
                          <p className="text-stone-500 text-xs max-w-sm mx-auto">
                            {isOwner ? "قم بإضافة أول فيديو ريلز لعرض منتجاتك وجذب العملاء بطريقة مرئية وتفاعلية مذهلة!" : "لم يقم صاحب المحل بإضافة لقطات ريلز تفاعلية بعد."}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                          {business.reels.map((reel) => {
                            const embedUrl = getEmbedUrl(reel.url);
                            const isInstagram = reel.url.includes('instagram.com');
                            return (
                              <div key={reel.id} className="bg-white rounded-3xl border border-[#e5e1da] overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between p-4 space-y-4">
                                {/* Vertical Video Container */}
                                <div className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-stone-200/60 shadow-inner group">
                                  {embedUrl ? (
                                    <div className="absolute inset-0 w-full h-full overflow-hidden rounded-2xl">
                                      <iframe 
                                        src={embedUrl} 
                                        className="w-full h-full absolute"
                                        allowFullScreen
                                        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                                        style={isInstagram ? {
                                          border: 'none', 
                                          overflow: 'hidden',
                                          position: 'absolute',
                                          top: '-55px',
                                          left: '-2px',
                                          width: 'calc(100% + 4px)',
                                          height: 'calc(100% + 245px)',
                                          pointerEvents: 'auto'
                                        } : { 
                                          border: 'none', 
                                          overflow: 'hidden',
                                          position: 'absolute',
                                          inset: 0,
                                          width: '100%',
                                          height: '100%'
                                        }}
                                        scrolling="no"
                                      ></iframe>
                                      {isInstagram && (
                                        <div className="absolute inset-0 bg-transparent pointer-events-none rounded-2xl ring-1 ring-inset ring-black/10"></div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-5 text-stone-400 space-y-3 bg-stone-900">
                                      <Video className="h-10 w-10 text-stone-600" />
                                      <p className="text-xs">يتوفر رابط تشغيل خارجي فقط</p>
                                    </div>
                                  )}
                                </div>

                                {/* Reel Footer Info */}
                                <div className="space-y-3 text-right">
                                  <h4 className="font-bold text-xs text-stone-800 line-clamp-2 leading-relaxed">
                                    {reel.title}
                                  </h4>
                                  
                                  <div className="flex flex-col gap-2 pt-1 border-t border-stone-100">
                                    {embedUrl && (
                                      <button
                                        onClick={() => setFullScreenReelUrl(embedUrl)}
                                        className="w-full inline-flex items-center justify-center gap-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 py-2 px-3 rounded-xl text-xs font-black transition-colors cursor-pointer"
                                      >
                                        <Play className="h-3.5 w-3.5 fill-purple-700 text-purple-700" />
                                        <span>مشاهدة شاشة كاملة</span>
                                      </button>
                                    )}

                                    <a
                                      href={reel.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="w-full inline-flex items-center justify-center gap-1.5 bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 py-2 px-3 rounded-xl text-xs font-bold transition-colors"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                      <span>مشاهدة على المنصة الأصلية</span>
                                    </a>

                                    {isOwner && (
                                      <button
                                        onClick={() => handleDeleteReel(reel.id)}
                                        className="w-full inline-flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 py-1.5 px-3 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        <span>حذف الفيديو</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="py-14 text-center bg-gradient-to-b from-amber-50/50 to-stone-50 rounded-2xl border border-dashed border-amber-200 p-6">
                      <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <Crown className="h-7 w-7 fill-amber-500 text-amber-600" />
                      </div>
                      <h3 className="text-lg font-black text-stone-800 mb-1">منصة ريلزات المحل التفاعلية 🎬</h3>
                      <p className="text-stone-600 text-sm max-w-md mx-auto mb-5">
                        عرض فيديوهات ريلز ترويجية من فيسبوك وإنستغرام ويوتيوب شورتس متاح حصرياً للمشتركين في الباقة الذهبية VIP لتقديم تجربة تسوق تفاعلية تضاعف الطلبات!
                      </p>
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => setIsUpgradeModalOpen(true)}
                          className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                        >
                          <Crown className="h-4 w-4 fill-white" />
                          <span>ترقية محلك إلى VIP لتفعيل ريلزاتك</span>
                        </button>
                      )}
                    </div>
                  )
                )}

                {activeTab === 'analytics' && isOwner && vipInfo.isVip && (
                  <VipAnalyticsDashboard business={business} isOwner={true} />
                )}

                {activeTab === 'jobs' && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
                      <div>
                        <h3 className="text-lg font-bold text-stone-900">الوظائف والفرص الشاغرة لدى المحل</h3>
                        <p className="text-xs text-stone-500">تقديم الطلبات والتواصل المباشر مع شؤون الموظفين</p>
                      </div>
                      <Link
                        to="/jobs"
                        className="inline-flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs"
                      >
                        <Briefcase className="h-4 w-4 text-[#1a4d2e]" />
                        <span>عرض كافة وظائف إربد</span>
                      </Link>
                    </div>

                    {activeJobs.length === 0 ? (
                      <div className="py-12 text-center bg-stone-50/70 rounded-2xl border border-dashed border-stone-200 p-6 space-y-4">
                        <div className="w-14 h-14 bg-stone-100 text-stone-400 rounded-2xl flex items-center justify-center mx-auto">
                          <Briefcase className="h-7 w-7" />
                        </div>
                        <h4 className="text-base font-bold text-stone-700">لا توجد شواغر معلنة حالياً</h4>
                        <p className="text-stone-500 text-xs max-w-sm mx-auto">
                          لم يقم هذا المحل بنشر وظائف شاغرة حالياً. يمكنك متابعة الصفحة لتبقى على اطلاع بجديد الوظائف!
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {activeJobs.map((job) => (
                          <div
                            key={job.id}
                            onClick={() => setSelectedDetailJob(job)}
                            className="bg-stone-50/50 rounded-2xl p-5 border border-stone-200/80 hover:border-[#1a4d2e]/40 hover:shadow-md transition-all duration-300 flex flex-col justify-between group relative cursor-pointer text-right"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className="bg-stone-100 text-stone-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                  {job.category}
                                </span>
                                {job.isUrgent && (
                                  <span className="bg-red-50 text-red-600 border border-red-200 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0 animate-pulse">
                                    <Flame className="h-3 w-3 fill-red-600" />
                                    شاغر عاجل
                                  </span>
                                )}
                              </div>

                              <div>
                                <h4 className="font-black text-base text-[#2d2a26] group-hover:text-[#1a4d2e] transition-colors line-clamp-1">
                                  {job.title}
                                </h4>
                                <div className="flex items-center gap-1 text-[11px] font-bold text-stone-500 mt-0.5">
                                  <Building2 className="h-3 w-3 text-[#ff9f1c] shrink-0" />
                                  <span className="truncate">{job.company}</span>
                                </div>
                              </div>

                              <p className="text-stone-600 text-xs leading-relaxed line-clamp-2">
                                {job.description}
                              </p>

                              <div className="pt-2 border-t border-stone-100 space-y-1 text-xs text-stone-500">
                                <div className="flex items-center gap-1.5">
                                  <MapPin className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                                  <span className="truncate">{job.location}</span>
                                </div>
                                {job.workHours && (
                                  <div className="flex items-center gap-1.5 text-stone-600 font-bold">
                                    <Clock className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                                    <span className="truncate">{job.workHours}</span>
                                  </div>
                                )}
                                {job.salary && (
                                  <div className="text-emerald-700 font-black">
                                    الراتب: {job.salary}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'gallery' && (
                  vipInfo.isVip ? (
                    <div className="space-y-6 text-right">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
                        <div>
                          <h3 className="text-lg font-black text-[#2d2a26] flex items-center gap-2">
                            <Camera className="h-5 w-5 text-emerald-600" />
                            <span>صور وجو المحل من الداخل والخارج</span>
                          </h3>
                          <p className="text-xs text-stone-500">استعرض المعرض الحقيقي لتعيش تفاصيل وأجواء المكان بالكامل</p>
                        </div>
                        {isOwner && (
                          <div className="bg-stone-50 border border-stone-200 p-2.5 rounded-xl text-[11px] font-bold text-stone-600 flex items-center gap-1.5">
                            <Crown className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                            <span>بصفتك المالك، يمكنك إدارة المعرض أدناه</span>
                          </div>
                        )}
                      </div>

                      {/* Owner Add Photo Section */}
                      {isOwner && (
                        <form onSubmit={handleAddGalleryImage} className="bg-stone-50 border border-stone-200 p-5 rounded-2xl space-y-4 animate-in fade-in duration-200">
                          <h4 className="text-xs font-black text-stone-800 uppercase tracking-wider flex items-center gap-1">
                            <Plus className="h-3.5 w-3.5 text-emerald-600" />
                            <span>إضافة صورة جديدة للمعرض والجو العام</span>
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="block text-xs font-bold text-stone-700">رابط الصورة المباشر (URL)</label>
                              <input 
                                type="url"
                                required
                                value={newGalleryUrl}
                                onChange={(e) => setNewGalleryUrl(e.target.value)}
                                placeholder="https://example.com/image.jpg"
                                className="w-full text-xs px-3.5 py-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:border-emerald-600 text-left"
                                style={{ direction: 'ltr' }}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs font-bold text-stone-700">وصف الصورة (التعليق)</label>
                              <input 
                                type="text"
                                value={newGalleryCaption}
                                onChange={(e) => setNewGalleryCaption(e.target.value)}
                                placeholder="مثال: جلسات الطابق الثاني الهادئة أو تفاصيل الديكور الخارجي"
                                className="w-full text-xs px-3.5 py-2 rounded-xl border border-stone-200 bg-white focus:outline-none focus:border-emerald-600 text-right"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 justify-end pt-1">
                            <button
                              type="submit"
                              disabled={submittingGalleryImage || !newGalleryUrl.trim()}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                            >
                              {submittingGalleryImage ? 'جاري الإضافة...' : 'إضافة الصورة ونشرها'}
                            </button>
                          </div>
                        </form>
                      )}

                      {/* Photo Gallery 3D Slideshow */}
                      {(() => {
                        const galleryItems = business.gallery && business.gallery.length > 0 
                          ? business.gallery 
                          : [
                              ...((business.category || '').includes('مطاعم') || (business.category || '').includes('كافيهات') || (business.category || '').includes('أكل') || (business.category || '').includes('حلويات')
                                ? [
                                    { url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800', caption: 'صالة الاستقبال الرئيسية والترتيب الأنيق للمكان' },
                                    { url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800', caption: 'جلسات عائلية مريحة وراقية للأفراد والمجموعات' },
                                    { url: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=800', caption: 'زوايا المحل الهادئة وإضاءة تمنح الدفء والراحة لرواد المكان' },
                                    { url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800', caption: 'الجلسات الخارجية اللطيفة للاستمتاع بالهواء الطلق المبهج' }
                                  ]
                                : (business.category || '').includes('سكنات') || (business.category || '').includes('شقق') || (business.category || '').includes('عقارات')
                                ? [
                                    { url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=800', caption: 'غرفة معيشة مؤثثة بالكامل ومكيفة مخصصة للطلاب' },
                                    { url: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&q=80&w=800', caption: 'غرفة دراسة ونوم هادئة ومكيفة لضمان التركيز والإنتاجية' },
                                    { url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=800', caption: 'مطبخ مجهز بالكامل بكافة الخدمات والأدوات الأساسية' },
                                    { url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800', caption: 'مرافق صحية حديثة ونظيفة ومطهرة بشكل مستمر' }
                                  ]
                                : (business.category || '').includes('ملابس') || (business.category || '').includes('أزياء') || (business.category || '').includes('تسوق') || (business.category || '').includes('أحذية')
                                ? [
                                    { url: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=800', caption: 'صالة عرض الأزياء الأنيقة والمنظمة بشكل متكامل' },
                                    { url: 'https://images.unsplash.com/photo-1479064555552-3ef4979f8908?auto=format&fit=crop&q=80&w=800', caption: 'تشكيلات وتصاميم عصرية جاهزة ترضي كافة الأذواق الراقية' },
                                    { url: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=800', caption: 'واجهة العرض الأنيقة وجو التسوق الممتع والرحب' }
                                  ]
                                : [
                                    { url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=800', caption: 'زوايا المنشأة وجلساتها الهادئة لاستقبال الزوار والعملاء' },
                                    { url: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&q=80&w=800', caption: 'مساحات الاستقبال والراحة المصممة بعناية لخدمتكم' },
                                    { url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&q=80&w=800', caption: 'البيئة العصرية المجهزة بأحدث المرافق والخدمات المتنوعة' }
                                  ]
                              )
                            ];

                        // Ensure current slide index is within bounds of possibly updated gallery items
                        const activeIndex = currentSlideIndex >= galleryItems.length ? 0 : currentSlideIndex;

                        return (
                          <div className="space-y-6">
                            {business.gallery && business.gallery.length === 0 && (
                              <div className="bg-emerald-50 text-emerald-950 p-3.5 rounded-2xl text-[11px] leading-relaxed border border-emerald-100/50 flex items-start gap-2 text-right">
                                <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5 animate-pulse" />
                                <p>
                                  <strong>مظهر تجريبي مميز:</strong> يعرض النظام حالياً صوراً تفاعلية منسقة لتعكس طابع المحل بشكل احترافي، بصفته مشتركاً مميزاً بـ VIP. يمكنك البدء في رفع صورك الخاصة لتستبدل الصور الافتراضية فوراً.
                                </p>
                              </div>
                            )}

                            {/* 3D Stacked Slideshow Stage */}
                            <div className="relative h-[220px] sm:h-[320px] md:h-[380px] w-full flex items-center justify-center overflow-hidden py-2 select-none">
                              {galleryItems.map((item: any, idx: number) => {
                                const itemUrl = typeof item === 'string' ? item : item?.url;
                                const itemCaption = typeof item === 'string' ? 'صورة من زوايا المحل والجو العام' : (item?.caption || 'صورة من زوايا المحل والجو العام');
                                
                                // Determine 3D layout position
                                let position = "inactive"; // inactive, center, prev, next
                                if (idx === activeIndex) {
                                  position = "center";
                                } else if (idx === (activeIndex - 1 + galleryItems.length) % galleryItems.length) {
                                  position = "prev";
                                } else if (idx === (activeIndex + 1) % galleryItems.length) {
                                  position = "next";
                                }

                                // Style mapping based on position for stacked deck effect
                                let cardStyle = "opacity-0 scale-75 z-0 translate-x-0 pointer-events-none invisible";
                                if (position === "center") {
                                  cardStyle = "opacity-100 scale-100 z-30 translate-x-0 cursor-pointer pointer-events-auto shadow-2xl border-2 border-emerald-500/10";
                                } else if (position === "prev") {
                                  cardStyle = "opacity-35 scale-80 z-10 -translate-x-[25%] sm:-translate-x-[35%] cursor-pointer pointer-events-auto hover:opacity-55";
                                } else if (position === "next") {
                                  cardStyle = "opacity-35 scale-80 z-10 translate-x-[25%] sm:translate-x-[35%] cursor-pointer pointer-events-auto hover:opacity-55";
                                }

                                // Avoid doubling on dual-item gallery
                                if (galleryItems.length === 2 && idx !== activeIndex) {
                                  cardStyle = "opacity-35 scale-80 z-10 translate-x-[25%] sm:translate-x-[35%] cursor-pointer pointer-events-auto hover:opacity-55";
                                }

                                return (
                                  <div
                                    key={idx}
                                    onClick={() => {
                                      if (position === "center") {
                                        setFullScreenImageUrl(itemUrl);
                                      } else {
                                        setCurrentSlideIndex(idx);
                                      }
                                    }}
                                    className={`absolute w-[72%] sm:w-[62%] max-w-lg aspect-video bg-white rounded-2xl border border-stone-200/80 overflow-hidden transition-all duration-500 ease-in-out transform flex flex-col ${cardStyle}`}
                                  >
                                    <div className="relative w-full h-full bg-stone-100 overflow-hidden">
                                      <img 
                                        src={itemUrl} 
                                        alt={itemCaption} 
                                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                                        referrerPolicy="no-referrer"
                                      />
                                      {position === "center" && (
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                                          <span className="bg-white/95 text-stone-800 text-[10px] sm:text-xs font-black px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1">
                                            <ImageIcon className="h-3.5 w-3.5 text-emerald-600" />
                                            عرض الصورة كاملة 🔍
                                          </span>
                                        </div>
                                      )}

                                      {/* Owner Delete Button */}
                                      {isOwner && business.gallery && business.gallery.length > 0 && position === "center" && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteGalleryImage(itemUrl);
                                            setCurrentSlideIndex(0);
                                          }}
                                          className="absolute top-3 right-3 bg-red-600/95 hover:bg-red-700 text-white p-2 rounded-xl shadow-md transition-all z-40 cursor-pointer"
                                          title="حذف الصورة"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Navigation Controls */}
                              {galleryItems.length > 1 && (
                                <>
                                  {/* Right Chevron (Arabic Previous - Right to Left) */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCurrentSlideIndex((prev) => (prev - 1 + galleryItems.length) % galleryItems.length);
                                    }}
                                    className="absolute right-2 sm:right-6 bg-white/90 hover:bg-white text-stone-800 p-2.5 sm:p-3 rounded-full shadow-lg border border-stone-100 z-40 transition-transform transform hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center"
                                    aria-label="الصورة السابقة"
                                  >
                                    <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6 text-stone-700 stroke-[2.5]" />
                                  </button>

                                  {/* Left Chevron (Arabic Next - Left to Right) */}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCurrentSlideIndex((prev) => (prev + 1) % galleryItems.length);
                                    }}
                                    className="absolute left-2 sm:left-6 bg-white/90 hover:bg-white text-stone-800 p-2.5 sm:p-3 rounded-full shadow-lg border border-stone-100 z-40 transition-transform transform hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center"
                                    aria-label="الصورة التالية"
                                  >
                                    <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6 text-stone-700 stroke-[2.5]" />
                                  </button>
                                </>
                              )}
                            </div>

                            {/* Active Caption & Dot Indicators */}
                            {galleryItems.length > 0 && (
                              <div className="space-y-4 max-w-lg mx-auto text-center pt-2">
                                <div className="bg-emerald-50/40 border border-emerald-100/50 p-4 rounded-2xl shadow-xs transition-all duration-300">
                                  <p className="text-sm sm:text-base font-bold text-stone-800 leading-relaxed text-center">
                                    {(() => {
                                      const currentItem = galleryItems[activeIndex];
                                      return typeof currentItem === 'string' 
                                        ? 'صورة من زوايا المحل والجو العام' 
                                        : (currentItem?.caption || 'صورة من زوايا المحل والجو العام');
                                    })()}
                                  </p>
                                  <span className="inline-block text-[10px] text-stone-500 font-bold mt-1.5 bg-white/80 border border-stone-100 px-2.5 py-0.5 rounded-full">
                                    الصورة {activeIndex + 1} من {galleryItems.length}
                                  </span>
                                </div>

                                {galleryItems.length > 1 && (
                                  <div className="flex items-center justify-center gap-1.5 pb-2">
                                    {galleryItems.map((_, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setCurrentSlideIndex(idx)}
                                        className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                                          idx === activeIndex 
                                            ? 'w-6 bg-emerald-600' 
                                            : 'w-2 bg-stone-300 hover:bg-stone-400'
                                        }`}
                                        title={`الانتقال للصورة ${idx + 1}`}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="py-14 text-center bg-gradient-to-b from-amber-50/50 to-stone-50 rounded-2xl border border-dashed border-amber-200 p-6 space-y-4 text-right">
                      <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <Crown className="h-7 w-7 fill-amber-500 text-amber-600" />
                      </div>
                      <h3 className="text-xl font-black text-stone-800 mb-1 text-center">معرض صور وجو المحل (VIP)</h3>
                      <p className="text-stone-600 text-sm max-w-md mx-auto leading-relaxed text-center">
                        ميزة حصرية وخاصة بمشتركي الباقة الذهبية VIP! تتيح هذه الميزة لزبائن إربد استكشاف أجواء محلك، تفاصيل الجلسات، جودة الديكور والبيئة المحيطة من الداخل والخارج قبل الحضور الفعلي.
                      </p>
                      
                      {/* Blurred gallery mockup */}
                      <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto opacity-30 select-none pointer-events-none filter blur-xs py-2">
                        <div className="aspect-video bg-stone-300 rounded-xl"></div>
                        <div className="aspect-video bg-stone-300 rounded-xl"></div>
                      </div>

                      {isOwner ? (
                        <div className="pt-2 text-center">
                          <button
                            type="button"
                            onClick={() => setIsUpgradeModalOpen(true)}
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-black px-6 py-3 rounded-xl shadow-md transition-all cursor-pointer"
                          >
                            <Crown className="h-4 w-4 fill-white" />
                            <span>ترقية هذا المحل إلى VIP لتفعيل معرض الصور الخاص بك</span>
                          </button>
                        </div>
                      ) : (
                        <p className="text-stone-400 text-xs italic text-center">
                          لم يقم هذا المحل بتفعيل الباقة الذهبية لعرض الصور بعد.
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>

              {/* Reviews Section: Platform Community Reviews Only */}
              <div className="space-y-6">
                
                {hideSite ? (
                  <div className="bg-white p-8 sm:p-10 rounded-2xl sm:rounded-3xl border border-[#e5e1da] text-center space-y-4 shadow-xs">
                    <div className="w-16 h-16 bg-stone-100 text-stone-500 rounded-full flex items-center justify-center mx-auto">
                      <EyeOff className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-[#2d2a26]">التقييمات معطلة لهذا النشاط التجاري</h3>
                    <p className="text-stone-500 text-sm max-w-md mx-auto leading-relaxed">
                      قام صاحب هذا المحل باختيار إخفاء التقييمات والتعليقات. يمكنك التواصل مع المحل عبر الهاتف أو زيارة موقعه مباشرة.
                    </p>
                    {isOwner && (
                      <div className="pt-2">
                        <button
                          onClick={handleOpenEditModal}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1a4d2e] text-white rounded-xl text-sm font-bold hover:bg-[#133b22] transition-colors shadow-xs"
                        >
                          <Settings className="h-4 w-4" />
                          <span>تعديل خيارات ظهور التقييمات</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Reviews Header */}
                    <div id="reviews-section-header" className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#e5e1da] shadow-xs flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <MessageSquare className="h-6 w-6 text-[#1a4d2e]" />
                        <h2 className="text-xl sm:text-2xl font-bold text-[#2d2a26]">تقييمات وآراء الزوار</h2>
                      </div>
                      
                      <div className="flex items-center gap-2 bg-emerald-50 text-[#1a4d2e] font-bold text-xs sm:text-sm px-3.5 py-1.5 rounded-xl border border-emerald-200">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{calculatedRating ? `${calculatedRating} من 5` : 'لا توجد تقييمات'}</span>
                        <span className="text-stone-400 mr-1 font-normal">({reviews.length} تقييم)</span>
                      </div>
                    </div>
                    
                    {/* Add Review Form */}
                    {currentUser ? (
                      <form onSubmit={handleSubmitReview} className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-[#e5e1da] shadow-xs space-y-5">
                        {/* Honeypot field - 100% hidden from humans, bots will fill it */}
                        <div className="absolute opacity-0 -z-50 pointer-events-none" style={{ width: 0, height: 0, overflow: 'hidden' }}>
                          <label htmlFor="review_website_hp">لا تقم بتعبئة هذا الحقل إذا كنت بشراً</label>
                          <input
                            type="text"
                            id="review_website_hp"
                            name="review_website_hp"
                            tabIndex={-1}
                            autoComplete="off"
                            value={hpValue}
                            onChange={(e) => setHpValue(e.target.value)}
                          />
                        </div>
                        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                          <h3 className="text-lg font-bold text-[#2d2a26]">أضف تقييمك ورأيك في المحل</h3>
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            تقييم معتمد
                          </span>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-bold text-stone-600 mb-2">ما هو تقييمك العام؟</label>
                          <div className="flex items-center gap-1 sm:gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setNewRating(star)}
                                className="p-1 focus:outline-none transition-transform hover:scale-110 active:scale-95"
                              >
                                <Star className={cn("h-7 w-7 sm:h-8 sm:w-8 transition-colors", star <= newRating ? "fill-yellow-400 text-yellow-400" : "text-stone-200")} />
                              </button>
                            ))}
                            <span className="text-sm font-bold text-stone-600 mr-2">
                              ({newRating} من 5 نجوم)
                            </span>
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="comment" className="block text-sm font-bold text-stone-600 mb-2">رأيك بالتفصيل</label>
                          <textarea
                            id="comment"
                            rows={3}
                            required
                            className="block w-full p-4 border border-[#e5e1da] rounded-2xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none transition-all resize-none text-[#2d2a26] text-base"
                            placeholder="اكتب تعليقك، ملاحظاتك عن الخدمة، الجودة، أو الأسعار..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                          ></textarea>
                        </div>
                        
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={submittingReview || !newComment.trim()}
                            className="w-full sm:w-auto px-7 py-3 bg-[#1a4d2e] text-white rounded-xl font-bold hover:bg-[#133b22] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs"
                          >
                            {submittingReview ? 'جاري النشر...' : 'نشر التقييم في المنصة'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="bg-white p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-[#e5e1da] text-center flex flex-col items-center justify-center">
                        <div className="bg-stone-100 p-3.5 rounded-full mb-3 text-stone-500">
                          <UserIcon className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-bold text-[#2d2a26] mb-1">هل جربت هذا المكان؟</h3>
                        <p className="text-stone-500 text-sm mb-4 max-w-sm">سجل دخولك لتتمكن من إضافة تقييمك ورأيك للآخرين على منصة شو في بإربد.</p>
                        <Link to="/login" state={{ from: location.pathname + location.search }} className="px-6 py-2.5 bg-[#1a4d2e] text-white rounded-xl font-bold hover:bg-[#133b22] transition-colors text-sm shadow-xs">
                          تسجيل الدخول للتقييم
                        </Link>
                      </div>
                    )}

                    {/* Sorting & Smart Filtering Controls */}
                    {reviews.length > 0 && (
                      <div className="bg-stone-50 border border-[#e5e1da] p-4 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between text-right">
                        {/* Rating Filter Tabs */}
                        <div className="w-full sm:w-auto flex flex-col gap-1.5">
                          <span className="text-xs font-bold text-stone-500">فلترة حسب التقييم:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: 'الكل', value: 0 },
                              { label: '4 فأكثر ⭐', value: 4 },
                              { label: '1 فأكثر ⭐', value: 1 }
                            ].map((tab) => (
                              <button
                                key={tab.value}
                                type="button"
                                onClick={() => {
                                  setReviewRatingFilter(tab.value);
                                  setReviewCurrentPage(1); // Reset page on filter change
                                }}
                                className={`text-xs px-3.5 py-2 rounded-xl font-bold transition-all border cursor-pointer ${
                                  reviewRatingFilter === tab.value
                                    ? 'bg-[#1a4d2e] border-[#1a4d2e] text-white shadow-xs'
                                    : 'bg-white border-[#e5e1da] text-stone-700 hover:bg-stone-100'
                                }`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Sorting Dropdown */}
                        <div className="w-full sm:w-auto flex flex-col gap-1.5 self-stretch sm:self-auto">
                          <span className="text-xs font-bold text-stone-500">ترتيب التقييمات:</span>
                          <div className="relative">
                            <select
                              value={reviewSortOrder}
                              onChange={(e) => {
                                setReviewSortOrder(e.target.value as any);
                                setReviewCurrentPage(1);
                              }}
                              className="w-full sm:w-[180px] bg-white border border-[#e5e1da] rounded-xl px-3 py-2 text-xs font-bold text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] cursor-pointer appearance-none text-right pr-2 pl-8"
                            >
                              <option value="newest">الأحدث أولاً</option>
                              <option value="highest">الأعلى تقييماً أولاً</option>
                              <option value="lowest">الأقل تقييماً أولاً</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-stone-500">
                              <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Site Platform Reviews Stream */}
                    <div className="space-y-4">
                      {reviews.length === 0 ? (
                        <div className="text-center py-12 text-stone-500 bg-white rounded-2xl sm:rounded-3xl border border-[#e5e1da] border-dashed">
                          لا توجد تقييمات على المنصة بعد. كن أول من يضيف تقييماً لهذا المحل!
                        </div>
                      ) : sortedReviews.length === 0 ? (
                        <div className="text-center py-12 text-stone-500 bg-white rounded-2xl sm:rounded-3xl border border-[#e5e1da] border-dashed space-y-3">
                          <p>لا توجد تقييمات مطابقة للخيارات المحددة.</p>
                          <button
                            onClick={() => {
                              setReviewRatingFilter(0);
                              setReviewSortOrder('newest');
                              setReviewCurrentPage(1);
                            }}
                            className="text-xs font-bold text-[#1a4d2e] underline hover:text-[#133b22]"
                          >
                            عرض جميع التقييمات
                          </button>
                        </div>
                      ) : (
                        paginatedReviews.map((review) => (
                          <div key={review.id} className="bg-white p-5 sm:p-6 rounded-2xl sm:rounded-3xl border border-[#e5e1da] shadow-xs space-y-3">
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-[#1a4d2e]/10 text-[#1a4d2e] rounded-xl flex items-center justify-center font-bold text-base shrink-0">
                                  {review.userName.charAt(0)}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-[#2d2a26] text-base">{review.userName}</span>
                                    <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-md border border-emerald-100">
                                      عضو المنصة
                                    </span>
                                  </div>
                                  <div className="text-xs text-stone-400 mt-0.5">
                                    {formatDistanceToNow(review.createdAt, { addSuffix: true, locale: ar })}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="flex items-center gap-1 bg-stone-50 border border-[#e5e1da] px-2.5 py-1 rounded-lg">
                                  <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs font-bold text-stone-700">{review.rating}</span>
                                </div>
                                
                                {/* Report review button */}
                                {currentUser && currentUser.uid !== review.userId && (
                                  <button
                                    onClick={() => {
                                      setSelectedReviewForReport(review);
                                      setIsReportModalOpen(true);
                                    }}
                                    className="p-1.5 hover:bg-red-50 text-stone-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                                    title="إبلاغ عن تقييم كيدي"
                                  >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            <p className="text-stone-700 text-base leading-relaxed bg-[#fdfcfb] p-3.5 rounded-xl border border-stone-100 break-words">
                              {review.comment}
                            </p>

                            {/* Existing Owner Reply */}
                            {review.reply && (
                              <div className="bg-emerald-50/75 border-r-4 border-[#1a4d2e] p-4 rounded-l-2xl mt-3 space-y-1">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                                  <Store className="h-3.5 w-3.5" />
                                  <span>رد المنشأة ({review.reply.authorName}):</span>
                                </div>
                                <p className="text-stone-700 text-sm leading-relaxed">{review.reply.text}</p>
                              </div>
                            )}

                            {/* Owner Reply Form / Control */}
                            {isOwner && (
                              <div className="mt-2.5 pt-2 flex items-center justify-end border-t border-dashed border-stone-100">
                                {vipInfo.isVip ? (
                                  replyActiveId === review.id ? (
                                    <div className="w-full space-y-2">
                                      <textarea
                                        rows={2}
                                        className="block w-full p-3 border border-[#e5e1da] rounded-xl focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-sm resize-none"
                                        placeholder="اكتب رد صاحب العمل هنا بكل لباقة..."
                                        value={replyTextMap[review.id] || ''}
                                        onChange={(e) => setReplyTextMap(prev => ({ ...prev, [review.id]: e.target.value }))}
                                      />
                                      <div className="flex justify-end gap-2">
                                        <button
                                          onClick={() => setReplyActiveId(null)}
                                          className="px-3.5 py-1.5 bg-stone-100 text-stone-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                        >
                                          إلغاء
                                        </button>
                                        <button
                                          onClick={() => handleSaveOwnerReply(review.id)}
                                          disabled={submittingReply || !(replyTextMap[review.id] || '').trim()}
                                          className="px-4 py-1.5 bg-[#1a4d2e] text-white rounded-lg text-xs font-bold disabled:opacity-50 transition-colors cursor-pointer"
                                        >
                                          {submittingReply ? 'جاري الحفظ...' : 'حفظ الرد'}
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setReplyActiveId(review.id);
                                        setReplyTextMap(prev => ({ ...prev, [review.id]: review.reply?.text || '' }));
                                      }}
                                      className="inline-flex items-center gap-1 text-xs font-bold text-[#1a4d2e] hover:underline cursor-pointer"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                      <span>{review.reply ? 'تعديل رد صاحب العمل' : 'الرد على هذا التقييم كصاحب عمل'}</span>
                                    </button>
                                  )
                                ) : (
                                  <button
                                    onClick={() => setIsUpgradeModalOpen(true)}
                                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200 transition-colors cursor-pointer"
                                    title="ميزة الرد الرسمي على تقييمات الزبائن متاحة حصرياً للباقة الذهبية VIP"
                                  >
                                    <LockIcon className="h-3.5 w-3.5 text-amber-600" />
                                    <span>الرد الرسمي على التقييمات (حصري للباقة الذهبية VIP) 👑</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}

                      {/* Pagination Controls */}
                      {totalReviewPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-6 border-t border-[#e5e1da]">
                          {/* Previous Button (Points to Right in RTL) */}
                          <button
                            type="button"
                            disabled={activeReviewPage === 1}
                            onClick={() => handlePageChange(activeReviewPage - 1)}
                            className="p-2.5 border border-[#e5e1da] bg-white rounded-xl text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer flex items-center justify-center"
                            title="الصفحة السابقة"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>

                          {/* Page Numbers */}
                          {Array.from({ length: totalReviewPages }).map((_, idx) => {
                            const pageNumber = idx + 1;
                            return (
                              <button
                                key={pageNumber}
                                type="button"
                                onClick={() => handlePageChange(pageNumber)}
                                className={`h-9 w-9 rounded-xl font-bold text-xs transition-all flex items-center justify-center border cursor-pointer ${
                                  activeReviewPage === pageNumber
                                    ? 'bg-[#1a4d2e] border-[#1a4d2e] text-white shadow-xs'
                                    : 'bg-white border-[#e5e1da] text-stone-700 hover:bg-stone-50'
                                }`}
                              >
                                {pageNumber}
                              </button>
                            );
                          })}

                          {/* Next Button (Points to Left in RTL) */}
                          <button
                            type="button"
                            disabled={activeReviewPage === totalReviewPages}
                            onClick={() => handlePageChange(activeReviewPage + 1)}
                            className="p-2.5 border border-[#e5e1da] bg-white rounded-xl text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:hover:bg-white transition-all cursor-pointer flex items-center justify-center"
                            title="الصفحة التالية"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Left Side: Sticky Information & Location Action Box (lg:col-span-1) */}
            <div className="space-y-6 lg:sticky lg:top-28">
              
              {/* Owner Quick Control Box */}
              {isOwner && (
                <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl sm:rounded-3xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
                      <Settings className="h-4 w-4 text-amber-700" />
                      <span>إدارة هذا المحل</span>
                    </div>
                    <span className="text-[11px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md font-bold">
                      {isAdmin ? 'صلاحية مدير' : 'صاحب المحل'}
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    يمكنك تعديل بيانات المحل، أو إخفاء/إظهار تقييمات الموقع في أي وقت.
                  </p>
                  
                  {/* Subscription status section */}
                  <div className="bg-white border border-amber-200 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="font-bold text-stone-800 border-b border-stone-100 pb-1.5 flex items-center justify-between">
                      <span>باقة المحل الحالية</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        vipInfo.isVip ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-600"
                      }`}>
                        {vipInfo.isVip ? '👑 الباقة الذهبية VIP' : '📦 الباقة الأساسية'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between text-stone-600">
                      <span>حالة الصلاحيات:</span>
                      <span className={`font-bold ${
                        vipInfo.isVip ? "text-emerald-600" : "text-stone-500"
                      }`}>
                        {vipInfo.isVip ? 'ميزات VIP الذهبية مفعّلة' : 'صلاحيات الباقة الأساسية فقط'}
                      </span>
                    </div>

                    {vipInfo.expiresAt && (
                      <div className="flex justify-between text-stone-600">
                        <span>تاريخ انتهاء VIP:</span>
                        <span className="font-bold font-mono">
                          {new Date(vipInfo.expiresAt).toLocaleDateString('ar-JO')}
                        </span>
                      </div>
                    )}

                    {!vipInfo.isVip && (
                      <button
                        onClick={() => setIsUpgradeModalOpen(true)}
                        className="w-full mt-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors shadow-xs cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Crown className="h-4 w-4 fill-white" />
                        <span>ترقية المحل للباقة الذهبية VIP</span>
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleOpenEditModal}
                    className="w-full flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-800 text-white py-2.5 px-4 rounded-xl font-bold text-xs transition-colors shadow-xs"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>تعديل المحل وإعدادات التقييمات</span>
                  </button>
                </div>
              )}

              {/* Quick Contact & Action Card */}
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#e5e1da] p-5 sm:p-6 shadow-xs space-y-5">
                <h3 className="text-lg font-bold text-[#2d2a26] border-b border-[#e5e1da] pb-3 flex items-center gap-2">
                  <Phone className="h-5 w-5 text-[#1a4d2e]" />
                  معلومات التواصل السريع
                </h3>

                {/* Call & WhatsApp Buttons */}
                {business.phone ? (
                  <div className="space-y-2">
                    {/* Live Chat Feature for Gold/VIP stores */}
                    {vipInfo.isVip ? (
                      currentUser ? (
                        <Link
                          to={`/messages?businessId=${business.id}`}
                          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-[#1a4d2e] hover:from-amber-600 hover:to-[#133b22] text-white py-3.5 px-4 rounded-xl font-black text-base transition-all shadow-xs hover:shadow-sm cursor-pointer"
                        >
                          <MessageSquare className="h-5 w-5 text-white animate-pulse" />
                          <span>راسل المحل مباشرة (شات حي)</span>
                        </Link>
                      ) : (
                        <Link
                          to="/login"
                          state={{ from: location.pathname + location.search }}
                          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-[#1a4d2e] hover:from-amber-600 hover:to-[#133b22] text-white py-3.5 px-4 rounded-xl font-black text-base transition-all shadow-xs hover:shadow-sm cursor-pointer"
                        >
                          <MessageSquare className="h-5 w-5 text-white animate-pulse" />
                          <span>راسل المحل مباشرة (شات حي)</span>
                        </Link>
                      )
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          alert("⚠️ ميزة الرسائل والمحادثات الحية متوفرة حصرياً للمحلات والمطاعم ذات الباقة الذهبية VIP 👑. يمكنك التواصل مع هذا المحل عبر الواتساب أو الهاتف مباشرة.");
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-stone-50 hover:bg-stone-100 text-stone-400 py-3 px-4 rounded-xl font-bold text-xs transition-colors border border-stone-200 cursor-pointer"
                      >
                        <LockIcon className="h-4 w-4 text-stone-300" />
                        <span>المحادثات المباشرة (حصري للباقة الذهبية)</span>
                      </button>
                    )}

                    <a
                      href={getWhatsAppUrl(business.phone, formatBusinessWhatsAppMessage(business.name))}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => { if (business?.id) trackBusinessInteraction(business.id, 'whatsapp'); }}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-xl font-bold text-sm transition-colors shadow-xs cursor-pointer"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>واتساب مباشر بضغطة زر</span>
                    </a>

                    <a
                      href={`tel:${business.phone}`}
                      onClick={() => { if (business?.id) trackBusinessInteraction(business.id, 'call'); }}
                      className="w-full flex items-center justify-center gap-2 bg-[#1a4d2e] hover:bg-[#133b22] text-white py-3 px-4 rounded-xl font-bold text-sm transition-colors shadow-xs"
                    >
                      <Phone className="h-4 w-4" />
                      <span>اتصال موصول ({business.phone})</span>
                    </a>
                    
                    <button
                      onClick={handleCopyPhone}
                      className="w-full flex items-center justify-center gap-2 bg-stone-50 hover:bg-stone-100 text-stone-700 py-2 px-4 rounded-xl font-semibold text-xs transition-colors border border-[#e5e1da] cursor-pointer"
                    >
                      {copiedPhone ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-green-600" />
                          <span className="text-green-600">تم نسخ الرقم!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-stone-500" />
                          <span>نسخ رقم الهاتف</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-sm text-stone-500 bg-stone-50 p-3 rounded-xl text-center">
                    رقم الهاتف غير متاح حالياً
                  </div>
                )}

                {/* Social Links */}
                {hasSocialLinks && (
                  <div className="pt-3 border-t border-stone-100 space-y-2">
                    <h4 className="text-xs font-bold text-stone-600 flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-[#1a4d2e]" />
                      <span>حسابات المحل الرسمية</span>
                    </h4>
                    {renderSocialMediaButtons(business.socialLinks)}
                  </div>
                )}

                {/* Address details & Interactive Map */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3 text-sm">
                    <div className="p-2 bg-[#1a4d2e]/10 text-[#1a4d2e] rounded-xl shrink-0 mt-0.5">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-stone-800 block">العنوان والموقع:</span>
                      <span className="text-stone-600 block break-words">{business.address || "إربد"}</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-sm">
                    <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${liveStatus.isOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      <Clock className={`h-4 w-4 ${liveStatus.isOpen ? 'animate-pulse' : ''}`} />
                    </div>
                    <div className="space-y-1">
                      <span className="font-bold text-stone-800 block">الحالة وساعات العمل:</span>
                      <div className="flex flex-col gap-1">
                        <span className={`font-black text-xs px-2.5 py-0.5 rounded-md w-fit ${
                          liveStatus.isOpen 
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          {liveStatus.status}
                        </span>
                        {liveStatus.countdownText && (
                          <span className="text-xs font-bold text-stone-700 flex items-center gap-1">
                            <span>⏱️</span>
                            <span>{liveStatus.countdownText}</span>
                          </span>
                        )}
                        <span className="text-xs text-stone-500">
                          {liveStatus.subText}
                        </span>
                        {business.workingHours?.days && (
                          <span className="text-xs text-stone-400">
                            🗓️ {business.workingHours.days}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Interactive Map Embed Frame */}
                  <div className="mt-3 rounded-2xl overflow-hidden border border-[#e5e1da] shadow-2xs bg-stone-100 relative group">
                    <iframe
                      title={`خريطة ${business.name}`}
                      width="100%"
                      height="180"
                      className="w-full h-44 border-0 block"
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={embedMapUrl}
                    ></iframe>
                    
                    <div className="p-2.5 bg-white flex items-center justify-between border-t border-[#e5e1da]">
                      <span className="text-[11px] font-bold text-stone-600 flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-red-500" />
                        <span>موقع المحل على الخريطة</span>
                      </span>
                      <a
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => { if (business?.id) trackBusinessInteraction(business.id, 'direction'); }}
                        className="text-[11px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                      >
                        <span>تكبير الخريطة</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Direct Map Action Button */}
                <div className="pt-1">
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => { if (business?.id) trackBusinessInteraction(business.id, 'direction'); }}
                    className="w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-black text-white py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-colors shadow-2xs"
                  >
                    <MapPin className="h-4 w-4 text-[#ff9f1c]" />
                    <span>فتح الموقع والاتجاهات على الخريطة</span>
                  </a>
                </div>

                {/* Public Suggest an Edit */}
                <div className="pt-2 border-t border-dashed border-[#e5e1da]">
                  <button
                    onClick={() => {
                      setSuggestForm({
                        phone: business.phone || '',
                        address: business.address || '',
                        workingHours: 'مفتوح يومياً للزوار',
                        notes: ''
                      });
                      setIsEditSuggestionOpen(true);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 py-2.5 px-4 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Edit3 className="h-3.5 w-3.5 text-stone-500" />
                    <span>اقتراح تعديل في معلومات المحل</span>
                  </button>
                </div>
              </div>

              {/* Verified Badge info */}
              <div className="bg-[#1a4d2e]/5 border border-[#1a4d2e]/15 rounded-2xl p-4 sm:p-5 text-sm text-stone-700 space-y-2">
                <div className="flex items-center gap-2 font-bold text-[#1a4d2e]">
                  <ShieldCheck className="h-5 w-5" />
                  <span>دليل موثوق في إربد</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  يتم التحقق من بيانات المحلات دورياً لتوفير معلومات دقيقة لأهل إربد وزوارها.
                </p>
              </div>

            </div>

          </div>

          {/* Similar Businesses Section - محلات مشابهة */}
          <div className="pt-8 sm:pt-12 border-t border-[#e5e1da]/80 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-[#1a4d2e]/10 text-[#1a4d2e] rounded-xl">
                    <Store className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-[#2d2a26]">
                    محلات مشابهة
                  </h2>
                </div>
                <p className="text-sm text-stone-500 mt-1 font-medium">
                  استكشف محلات وأماكن أخرى مشابهة ضمن تصنيف <span className="font-bold text-[#1a4d2e]">"{business.category}"</span> في إربد
                </p>
              </div>

              <Link
                to={`/?category=${encodeURIComponent(business.category)}`}
                className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#1a4d2e] hover:text-[#133b22] bg-[#1a4d2e]/5 hover:bg-[#1a4d2e]/10 px-4 py-2 rounded-xl transition-colors shrink-0 self-start sm:self-auto"
              >
                <span>عرض جميع محلات {business.category}</span>
                <ArrowRight className="h-4 w-4 rotate-180" />
              </Link>
            </div>

            {loadingSimilar ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(n => (
                  <div key={n} className="h-64 bg-stone-100 animate-pulse rounded-3xl border border-stone-200"></div>
                ))}
              </div>
            ) : similarBusinesses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {similarBusinesses.map(simBiz => (
                  <BusinessCard key={simBiz.id} business={simBiz} />
                ))}
              </div>
            ) : (
              <div className="bg-stone-50 rounded-2xl p-8 text-center border border-dashed border-stone-200">
                <Store className="h-10 w-10 text-stone-300 mx-auto mb-2" />
                <p className="text-stone-500 font-bold text-sm">لا توجد محلات مشابهة أخرى في هذا القسم حالياً</p>
                <Link
                  to="/"
                  className="inline-block mt-3 text-xs font-bold text-[#1a4d2e] hover:underline"
                >
                  تصفح كافة الأقسام والمحلات في إربد
                </Link>
              </div>
            )}
          </div>

          {/* Business Owner Quick Edit / Privacy Settings Modal */}
          {isEditModalOpen && typeof document !== 'undefined' && createPortal(
            <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 md:p-6 overflow-y-auto" dir="rtl">
              <div className="bg-white rounded-t-[32px] sm:rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-8 shadow-2xl border border-stone-200 sm:my-auto relative animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-200">
                {/* Mobile Drag Indicator */}
                <div className="w-12 h-1 bg-stone-200 rounded-full mx-auto -mt-1 mb-3 sm:hidden" />
                
                {/* Header */}
                <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1a4d2e]/10 text-[#1a4d2e] flex items-center justify-center">
                      <Settings className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#2d2a26]">تعديل بيانات المحل والتقييمات</h3>
                      <p className="text-xs text-stone-500">التحكم في بيانات المحل وخيارات خصوصية التقييمات</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsEditModalOpen(false)}
                    className="p-2 text-stone-400 hover:text-stone-600 rounded-xl hover:bg-stone-100 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {updateSuccess ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="h-8 w-8" />
                    </div>
                    <h4 className="text-lg font-bold text-stone-900">تم حفظ التعديلات بنجاح!</h4>
                    <p className="text-sm text-stone-500">تم تحديث بيانات المحل مباشرة.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSaveBusinessSettings} className="space-y-5">
                    
                    {/* Basic Info */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1.5">اسم المحل / النشاط التجاري</label>
                        <input
                          type="text"
                          required
                          value={editForm.name || ''}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-[#e5e1da] focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-sm font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1.5">رقم الهاتف للتواصل السريع</label>
                        <input
                          type="text"
                          value={editForm.phone || ''}
                          onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-[#e5e1da] focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-sm font-medium"
                          placeholder="079XXXXXXX"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1.5">العنوان بالتفصيل</label>
                        <input
                          type="text"
                          value={editForm.address || ''}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-[#e5e1da] focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-sm font-medium"
                          placeholder="إربد - شارع الجامعة..."
                        />
                      </div>

                      {/* Google Maps Location URL */}
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1.5">
                          رابط موقع المحل على الخريطة (Google Maps)
                        </label>
                        <input
                          type="url"
                          dir="ltr"
                          value={editForm.googlePlaceUrl || ''}
                          onChange={(e) => setEditForm({ ...editForm, googlePlaceUrl: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-[#e5e1da] focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs font-medium text-stone-800"
                          placeholder="https://maps.app.goo.gl/..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1.5">رابط صورة غلاف المحل (العريضة)</label>
                          <input
                            type="url"
                            value={editForm.imageUrl || ''}
                            onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-[#e5e1da] focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-sm font-medium"
                            placeholder="https://images.unsplash.com/..."
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-stone-700 mb-1.5">رابط الصورة الشخصية / الشعار (الدائرية)</label>
                          <input
                            type="url"
                            value={editForm.logoUrl || ''}
                            onChange={(e) => setEditForm({ ...editForm, logoUrl: e.target.value })}
                            className="w-full px-4 py-2.5 rounded-xl border border-[#e5e1da] focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-sm font-medium"
                            placeholder="https://images.unsplash.com/..."
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1.5">نبذة عن المحل</label>
                        <textarea
                          rows={3}
                          value={editForm.description || ''}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-[#e5e1da] focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-sm font-medium resize-none"
                          placeholder="اكتب نبذة تعريفية بالخدمات والمنتجات..."
                        />
                      </div>

                      {/* Live Working Hours Subsection */}
                      <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3">
                        <div className="flex items-center gap-2 font-bold text-stone-800 text-sm">
                          <Clock className="h-4 w-4 text-[#1a4d2e]" />
                          <span>ساعات وأيام العمل الحية</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-stone-200 cursor-pointer hover:border-emerald-500 transition-colors">
                            <input
                              type="checkbox"
                              checked={Boolean(editForm.workingHours?.isOpen24Hours)}
                              onChange={(e) => setEditForm({
                                ...editForm,
                                workingHours: {
                                  isOpen24Hours: e.target.checked,
                                  openTime: e.target.checked ? "" : (editForm.workingHours?.openTime || "09:00"),
                                  closeTime: e.target.checked ? "" : (editForm.workingHours?.closeTime || "23:00"),
                                  days: editForm.workingHours?.days || "طوال أيام الأسبوع",
                                  isCustomClosed: e.target.checked ? false : Boolean(editForm.workingHours?.isCustomClosed)
                                }
                              })}
                              className="h-4 w-4 rounded text-[#1a4d2e] focus:ring-[#1a4d2e] border-stone-300"
                            />
                            <span className="text-xs font-bold text-stone-700">مفتوح 24 ساعة 🕒</span>
                          </label>

                          <label className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-stone-200 cursor-pointer hover:border-red-500 transition-colors">
                            <input
                              type="checkbox"
                              checked={Boolean(editForm.workingHours?.isCustomClosed)}
                              onChange={(e) => setEditForm({
                                ...editForm,
                                workingHours: {
                                  isOpen24Hours: e.target.checked ? false : Boolean(editForm.workingHours?.isOpen24Hours),
                                  openTime: editForm.workingHours?.openTime || "09:00",
                                  closeTime: editForm.workingHours?.closeTime || "23:00",
                                  days: editForm.workingHours?.days || "طوال أيام الأسبوع",
                                  isCustomClosed: e.target.checked
                                }
                              })}
                              className="h-4 w-4 rounded text-red-600 focus:ring-red-500 border-stone-300"
                            />
                            <span className="text-xs font-bold text-red-700">مغلق مؤقتاً 🔴</span>
                          </label>
                        </div>

                        {!editForm.workingHours?.isOpen24Hours && !editForm.workingHours?.isCustomClosed && (
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                              <label className="block text-[11px] font-bold text-stone-600 mb-1">وقت الفتح اليومي</label>
                              <input
                                type="time"
                                value={editForm.workingHours?.openTime || "09:00"}
                                onChange={(e) => setEditForm({
                                  ...editForm,
                                  workingHours: {
                                    ...(editForm.workingHours || {}),
                                    openTime: e.target.value
                                  }
                                })}
                                className="w-full px-3 py-2 rounded-lg border border-[#e5e1da] focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs font-medium"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-stone-600 mb-1">وقت الإغلاق اليومي</label>
                              <input
                                type="time"
                                value={editForm.workingHours?.closeTime || "23:00"}
                                onChange={(e) => setEditForm({
                                  ...editForm,
                                  workingHours: {
                                    ...(editForm.workingHours || {}),
                                    closeTime: e.target.value
                                  }
                                })}
                                className="w-full px-3 py-2 rounded-lg border border-[#e5e1da] focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs font-medium"
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-[11px] font-bold text-stone-600 mb-1">أيام العمل الأسبوعية</label>
                          <input
                            type="text"
                            value={editForm.workingHours?.days || "طوال أيام الأسبوع"}
                            onChange={(e) => setEditForm({
                              ...editForm,
                              workingHours: {
                                ...(editForm.workingHours || {}),
                                days: e.target.value
                              }
                            })}
                            className="w-full px-3 py-2 rounded-lg border border-[#e5e1da] focus:ring-2 focus:ring-[#1a4d2e]/20 focus:border-[#1a4d2e] outline-none text-xs font-medium"
                            placeholder="مثال: طوال أيام الأسبوع أو من السبت إلى الخميس"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Review Visibility Privacy Options */}
                    <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-3">
                      <div className="flex items-center gap-2 font-bold text-stone-800 text-sm">
                        <EyeOff className="h-4 w-4 text-stone-600" />
                        <span>خيارات خصوصية وظهور التقييمات</span>
                      </div>

                      <div className="space-y-2.5 pt-1">
                        {/* Hide Site Reviews */}
                        <label className="flex items-start gap-3 p-3 bg-white rounded-xl border border-stone-200 cursor-pointer hover:border-emerald-500 transition-colors">
                          <input
                            type="checkbox"
                            checked={Boolean(editForm.hideSiteReviews)}
                            onChange={(e) => setEditForm({ ...editForm, hideSiteReviews: e.target.checked })}
                            className="mt-0.5 h-4 w-4 rounded text-[#1a4d2e] focus:ring-[#1a4d2e] border-stone-300"
                          />
                          <div className="text-xs">
                            <span className="font-bold text-stone-800 block">إخفاء تقييمات وتعليقات الموقع</span>
                            <span className="text-stone-500 block mt-0.5">عند تفعيل هذا الخيار، لن يتمكن الزوار من إضافة تقييمات ولن تظهر التعليقات في صفحة المحل.</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => setIsEditModalOpen(false)}
                        className="px-5 py-2.5 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold hover:bg-stone-50 transition-colors"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        disabled={isUpdating}
                        className="px-6 py-2.5 rounded-xl bg-[#1a4d2e] text-white text-xs font-bold hover:bg-[#133b22] disabled:opacity-50 transition-colors shadow-xs"
                      >
                        {isUpdating ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                      </button>
                    </div>

                  </form>
                )}

              </div>
            </div>,
            document.body
          )}

          {/* Owner Digital Menu Manager Modal */}
          {business && isOwner && (
            <DigitalMenuManagerModal
              isOpen={isMenuManagerOpen}
              onClose={() => setIsMenuManagerOpen(false)}
              business={business}
              onMenuUpdated={(updatedItems) => {
                setBusiness(prev => prev ? { ...prev, menuItems: updatedItems } : null);
              }}
            />
          )}

          {/* Owner VIP Analytics Modal */}
          {business && isOwner && (
            <VipAnalyticsModal
              isOpen={isAnalyticsModalOpen}
              onClose={() => setIsAnalyticsModalOpen(false)}
              business={business}
              onOpenMenuManager={() => setIsMenuManagerOpen(true)}
            />
          )}

          {/* Owner VIP Upgrade Request Modal */}
          {business && isOwner && (
            <VipUpgradeRequestModal
              isOpen={isUpgradeModalOpen}
              onClose={() => setIsUpgradeModalOpen(false)}
              business={business}
            />
          )}

          {/* Full Screen Reels Overlay Player */}
          {fullScreenReelUrl && (
            <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 p-4">
              {/* Close Button */}
              <button 
                onClick={() => setFullScreenReelUrl(null)}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white hover:text-stone-200 p-2.5 rounded-full transition-all cursor-pointer z-50 border border-white/10"
                title="إغلاق"
              >
                <X className="h-6 w-6" />
              </button>

              {/* Video Wrapper */}
              <div className="relative w-full max-w-[450px] aspect-[9/16] bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="absolute inset-0 w-full h-full overflow-hidden rounded-3xl">
                  <iframe 
                    src={fullScreenReelUrl} 
                    className="w-full h-full absolute"
                    allowFullScreen
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                    style={fullScreenReelUrl.includes('instagram.com') ? {
                      border: 'none', 
                      overflow: 'hidden',
                      position: 'absolute',
                      top: '-55px',
                      left: '-2px',
                      width: 'calc(100% + 4px)',
                      height: 'calc(100% + 245px)',
                      pointerEvents: 'auto'
                    } : { 
                      border: 'none', 
                      overflow: 'hidden',
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%'
                    }}
                    scrolling="no"
                  ></iframe>
                  {fullScreenReelUrl.includes('instagram.com') && (
                    <div className="absolute inset-0 bg-transparent pointer-events-none rounded-3xl ring-1 ring-inset ring-black/10"></div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 1. Add Promo Deal Modal (For Business Owners) */}
          {business && isOwner && isOfferModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Tag className="h-5 w-5 text-emerald-700" />
                    <h3 className="text-lg font-bold text-stone-900">إضافة عرض ترويجي أو خصم جديد</h3>
                  </div>
                  <button
                    onClick={() => setIsOfferModalOpen(false)}
                    className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <form onSubmit={handleAddOffer} className="space-y-4">
                  {/* Honeypot field - 100% hidden from humans, bots will fill it */}
                  <div className="absolute opacity-0 -z-50 pointer-events-none" style={{ width: 0, height: 0, overflow: 'hidden' }}>
                    <label htmlFor="offer_website_hp">لا تقم بتعبئة هذا الحقل إذا كنت بشراً</label>
                    <input
                      type="text"
                      id="offer_website_hp"
                      name="offer_website_hp"
                      tabIndex={-1}
                      autoComplete="off"
                      value={hpValue}
                      onChange={(e) => setHpValue(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">عنوان العرض *</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: خصم 25% على كافة الوجبات العائلية"
                      value={newOfferForm.title}
                      onChange={(e) => setNewOfferForm(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-xs font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">نسبة الخصم (اختياري)</label>
                      <input
                        type="text"
                        placeholder="مثال: 20%"
                        value={newOfferForm.discountPercentage}
                        onChange={(e) => setNewOfferForm(prev => ({ ...prev, discountPercentage: e.target.value }))}
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">صلاحية العرض</label>
                      <input
                        type="text"
                        placeholder="مثال: ينتهي خلال 3 أيام"
                        value={newOfferForm.expiresIn}
                        onChange={(e) => setNewOfferForm(prev => ({ ...prev, expiresIn: e.target.value }))}
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">السعر الأصلي (اختياري)</label>
                      <input
                        type="text"
                        placeholder="مثال: 15 دينار"
                        value={newOfferForm.oldPrice}
                        onChange={(e) => setNewOfferForm(prev => ({ ...prev, oldPrice: e.target.value }))}
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">السعر بعد الخصم (اختياري)</label>
                      <input
                        type="text"
                        placeholder="مثال: 12 دينار"
                        value={newOfferForm.newPrice}
                        onChange={(e) => setNewOfferForm(prev => ({ ...prev, newPrice: e.target.value }))}
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">كود الخصم (إن وجد)</label>
                      <input
                        type="text"
                        placeholder="مثال: IRBID20"
                        value={newOfferForm.code}
                        onChange={(e) => setNewOfferForm(prev => ({ ...prev, code: e.target.value }))}
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-xs font-medium font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">صورة العرض (رابط ويب)</label>
                      <input
                        type="url"
                        placeholder="رابط صورة ترويجية (اختياري)"
                        value={newOfferForm.image}
                        onChange={(e) => setNewOfferForm(prev => ({ ...prev, image: e.target.value }))}
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-xs font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer p-2 bg-stone-50 rounded-xl border border-stone-200 hover:bg-stone-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={newOfferForm.isHot}
                        onChange={(e) => setNewOfferForm(prev => ({ ...prev, isHot: e.target.checked }))}
                        className="h-4 w-4 rounded text-emerald-700 focus:ring-emerald-500 border-stone-300"
                      />
                      <span className="text-[11px] font-bold text-stone-700">عرض ساخن 🔥</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 bg-stone-50 rounded-xl border border-stone-200 hover:bg-stone-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={newOfferForm.isStudent}
                        onChange={(e) => setNewOfferForm(prev => ({ ...prev, isStudent: e.target.checked }))}
                        className="h-4 w-4 rounded text-emerald-700 focus:ring-emerald-500 border-stone-300"
                      />
                      <span className="text-[11px] font-bold text-stone-700">خصم خاص بالطلاب 🎓</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">تفاصيل وشروط العرض *</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="اكتب بالتفصيل ما الذي يتضمنه العرض وكيف يمكن الاستفادة منه..."
                      value={newOfferForm.description}
                      onChange={(e) => setNewOfferForm(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-xs font-medium resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                    <button
                      type="button"
                      onClick={() => setIsOfferModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold hover:bg-stone-50 cursor-pointer"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      disabled={submittingOffer}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-colors cursor-pointer"
                    >
                      {submittingOffer ? 'جاري النشر...' : 'نشر العرض في المنصة'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* 2. Suggest an Edit Modal */}
          {business && isEditSuggestionOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-5 w-5 text-amber-600" />
                    <h3 className="text-base sm:text-lg font-bold text-stone-900">اقتراح تعديل في معلومات المحل</h3>
                  </div>
                  <button
                    onClick={() => setIsEditSuggestionOpen(false)}
                    className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {suggestionSuccess ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto animate-bounce">
                      <Check className="h-6 w-6" />
                    </div>
                    <h4 className="text-base font-bold text-stone-900">شكراً لك! تم إرسال اقتراحك بنجاح</h4>
                    <p className="text-stone-500 text-xs max-w-xs mx-auto">
                      سيقوم فريق مراجعة المحتوى في دليل "شو في بإربد" بالتحقق من المعلومات وتحديثها قريباً.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSuggestEdit} className="space-y-4">
                    {/* Honeypot field - 100% hidden from humans, bots will fill it */}
                    <div className="absolute opacity-0 -z-50 pointer-events-none" style={{ width: 0, height: 0, overflow: 'hidden' }}>
                      <label htmlFor="suggest_website_hp">لا تقم بتعبئة هذا الحقل إذا كنت بشراً</label>
                      <input
                        type="text"
                        id="suggest_website_hp"
                        name="suggest_website_hp"
                        tabIndex={-1}
                        autoComplete="off"
                        value={hpValue}
                        onChange={(e) => setHpValue(e.target.value)}
                      />
                    </div>
                    <p className="text-xs text-stone-500 leading-relaxed">
                      هل لاحظت خطأ في بيانات المحل؟ ساعدنا في الحفاظ على صحة الدليل وموثوقيته باقتراح التعديلات الصحيحة.
                    </p>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">رقم الهاتف الصحيح</label>
                      <input
                        type="text"
                        placeholder="مثال: 0791234567"
                        value={suggestForm.phone}
                        onChange={(e) => setSuggestForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">العنوان أو الحي الصحيح</label>
                      <input
                        type="text"
                        placeholder="مثال: شارع الجامعة - خلف مجمع عمان الجديد"
                        value={suggestForm.address}
                        onChange={(e) => setSuggestForm(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">ساعات العمل الصحيحة</label>
                      <input
                        type="text"
                        placeholder="مثال: من 10 صباحاً وحتى 11 مساءً"
                        value={suggestForm.workingHours}
                        onChange={(e) => setSuggestForm(prev => ({ ...prev, workingHours: e.target.value }))}
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-xs font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-1">ملاحظات أو تفاصيل إضافية</label>
                      <textarea
                        rows={2.5}
                        placeholder="صف التغيير المطلوب أو أضف أي روابط أو مصادر للتحقق من المعلومة..."
                        value={suggestForm.notes}
                        onChange={(e) => setSuggestForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full px-3.5 py-2 rounded-xl border border-stone-200 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-xs font-medium resize-none"
                      />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => setIsEditSuggestionOpen(false)}
                        className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold hover:bg-stone-50 cursor-pointer"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        disabled={submittingSuggestion}
                        className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                      >
                        {submittingSuggestion ? 'جاري الإرسال...' : 'إرسال الاقتراح'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* 3. Report Review Modal (Review Moderation / Anti-Spam) */}
          {business && isReportModalOpen && selectedReviewForReport && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 animate-in fade-in duration-200">
              <div className="bg-white rounded-t-[28px] sm:rounded-2xl border border-stone-200 shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4 max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-200">
                {/* Mobile Drag Handle */}
                <div className="w-10 h-1 bg-stone-200 rounded-full mx-auto -mt-1 mb-2 sm:hidden" />
                
                <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                  <div className="flex items-center gap-2">
                    <EyeOff className="h-5 w-5 text-red-600" />
                    <h3 className="text-base sm:text-lg font-bold text-stone-900">مكافحة التقييمات الكيدية والإبلاغ</h3>
                  </div>
                  <button
                    onClick={() => {
                      setIsReportModalOpen(false);
                      setSelectedReviewForReport(null);
                    }}
                    className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {reportSuccess ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="w-12 h-12 bg-red-100 text-red-700 rounded-full flex items-center justify-center mx-auto">
                      <Check className="h-6 w-6" />
                    </div>
                    <h4 className="text-base font-bold text-stone-900">تم تسجيل بلاغك بنجاح</h4>
                    <p className="text-stone-500 text-xs max-w-xs mx-auto">
                      سيقوم المشرفون بالتحقق فوراً من صحة التقييم والتعليق ومراجعة سلوك الحساب. شكراً لمساعدتنا في مكافحة المحتوى الكيدي.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleReportReview} className="space-y-4">
                    {/* Honeypot field - 100% hidden from humans, bots will fill it */}
                    <div className="absolute opacity-0 -z-50 pointer-events-none" style={{ width: 0, height: 0, overflow: 'hidden' }}>
                      <label htmlFor="report_website_hp">لا تقم بتعبئة هذا الحقل إذا كنت بشراً</label>
                      <input
                        type="text"
                        id="report_website_hp"
                        name="report_website_hp"
                        tabIndex={-1}
                        autoComplete="off"
                        value={hpValue}
                        onChange={(e) => setHpValue(e.target.value)}
                      />
                    </div>
                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs space-y-1">
                      <div className="font-bold text-stone-800">التعليق المُبلَغ عنه:</div>
                      <div className="text-stone-500 italic">"{selectedReviewForReport.comment}"</div>
                      <div className="text-stone-400 text-[10px] pt-1">بواسطة: {selectedReviewForReport.userName}</div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-700 mb-2">سبب الإبلاغ</label>
                      <div className="space-y-2">
                        {['تقييم كيدي/غير حقيقي', 'ألفاظ غير لائقة أو مسيئة', 'محتوى سبام / ترويجي', 'أخرى'].map((reasonOption) => (
                          <label key={reasonOption} className="flex items-center gap-2.5 p-2.5 bg-white border border-stone-200 rounded-xl cursor-pointer hover:bg-stone-50 transition-colors">
                            <input
                              type="radio"
                              name="reportReason"
                              checked={reportReason === reasonOption}
                              onChange={() => setReportReason(reasonOption)}
                              className="h-4 w-4 text-red-600 focus:ring-red-500 border-stone-300"
                            />
                            <span className="text-xs font-medium text-stone-700">{reasonOption}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-100">
                      <button
                        type="button"
                        onClick={() => {
                          setIsReportModalOpen(false);
                          setSelectedReviewForReport(null);
                        }}
                        className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-bold hover:bg-stone-50 cursor-pointer"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        disabled={submittingReport}
                        className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                      >
                        {submittingReport ? 'جاري الإبلاغ...' : 'تسجيل الإبلاغ'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
          {/* 1️⃣ شريط الاتصال العائم والسريع على الجوال (Floating Quick Action Bar) */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-[#e5e1da] p-3 px-4 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] flex items-center justify-between gap-2.5 animate-in slide-in-from-bottom-5 duration-300">
            {business.phone ? (
              <>
                <a
                  href={`tel:${business.phone}`}
                  onClick={() => { if (business?.id) trackBusinessInteraction(business.id, 'call'); }}
                  className="flex-1 flex flex-col items-center justify-center gap-1 bg-[#1a4d2e] text-white py-2 px-1 rounded-2xl font-bold text-xs shadow-xs active:scale-95 transition-transform min-w-0"
                >
                  <Phone className="h-4.5 w-4.5 text-white animate-bounce" />
                  <span className="text-[10px] font-black whitespace-nowrap">اتصال</span>
                </a>

                <a
                  href={getWhatsAppUrl(business.phone, formatBusinessWhatsAppMessage(business.name))}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => { if (business?.id) trackBusinessInteraction(business.id, 'whatsapp'); }}
                  className="flex-1 flex flex-col items-center justify-center gap-1 bg-emerald-600 text-white py-2 px-1 rounded-2xl font-bold text-xs shadow-xs active:scale-95 transition-transform min-w-0"
                >
                  <MessageSquare className="h-4.5 w-4.5 text-white" />
                  <span className="text-[10px] font-black whitespace-nowrap">واتساب</span>
                </a>
              </>
            ) : null}

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              onClick={() => { if (business?.id) trackBusinessInteraction(business.id, 'direction'); }}
              className="flex-1 flex flex-col items-center justify-center gap-1 bg-stone-900 text-white py-2 px-1 rounded-2xl font-bold text-xs shadow-xs active:scale-95 transition-transform min-w-0"
            >
              <MapPin className="h-4.5 w-4.5 text-[#ff9f1c]" />
              <span className="text-[10px] font-black whitespace-nowrap">الاتجاهات</span>
            </a>

            {vipInfo.isVip && (
              currentUser ? (
                <Link
                  to={`/messages?businessId=${business.id}`}
                  className="flex-1 flex flex-col items-center justify-center gap-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white py-2 px-1 rounded-2xl font-black text-xs shadow-xs active:scale-95 transition-transform min-w-0"
                >
                  <MessageSquare className="h-4.5 w-4.5 fill-white text-white animate-pulse" />
                  <span className="text-[10px] font-black whitespace-nowrap">دردشة</span>
                </Link>
              ) : (
                <Link
                  to="/login"
                  state={{ from: location.pathname + location.search }}
                  className="flex-1 flex flex-col items-center justify-center gap-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white py-2 px-1 rounded-2xl font-black text-xs shadow-xs active:scale-95 transition-transform min-w-0"
                >
                  <MessageSquare className="h-4.5 w-4.5 fill-white text-white animate-pulse" />
                  <span className="text-[10px] font-black whitespace-nowrap">دردشة</span>
                </Link>
              )
            )}
          </div>

          {/* Lightbox Modal for Gallery Images */}
          {fullScreenImageUrl && (
            <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 z-50 animate-in fade-in duration-200">
              <button
                onClick={() => setFullScreenImageUrl(null)}
                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors cursor-pointer"
                title="إغلاق"
              >
                <X className="h-6 w-6" />
              </button>
              
              <div className="max-w-4xl w-full max-h-[80vh] flex items-center justify-center relative p-2">
                <img 
                  src={fullScreenImageUrl} 
                  alt="Full screen view" 
                  className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Caption or label */}
              {(() => {
                const activeItem = (business.gallery || []).find((item: any) => 
                  (typeof item === 'string' ? item : item?.url) === fullScreenImageUrl
                ) as any;
                const caption = activeItem && typeof activeItem !== 'string' ? activeItem.caption : 'صورة من زوايا المحل والجو العام';
                return (
                  <div className="bg-black/40 border border-white/10 text-white/90 px-6 py-2.5 rounded-full text-xs font-bold mt-4 max-w-md text-center leading-relaxed">
                    {caption}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Comprehensive Job Details Modal */}
          {selectedDetailJob && typeof document !== 'undefined' && createPortal(
            <div className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto" dir="rtl">
              <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-stone-200 space-y-6 relative my-auto animate-in fade-in zoom-in-95">
                
                {/* Header */}
                <div className="flex items-start justify-between border-b border-[#e5e1da] pb-4">
                  <div className="space-y-2 text-right">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-[#1a4d2e]/10 text-[#1a4d2e] text-xs font-black px-2.5 py-0.5 rounded-md">
                        {selectedDetailJob.category}
                      </span>
                      <span className="bg-stone-100 text-stone-600 text-xs font-bold px-2.5 py-0.5 rounded-md">
                        {selectedDetailJob.jobType}
                      </span>
                      {selectedDetailJob.isUrgent && (
                        <span className="bg-red-600 text-white text-xs font-black px-2.5 py-0.5 rounded-md flex items-center gap-1">
                          <Flame className="h-3 w-3 fill-white" />
                          شاغر عاجل وفوري
                        </span>
                      )}
                    </div>

                    <h3 className="text-2xl font-black text-[#2d2a26]">
                      {selectedDetailJob.title}
                    </h3>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm font-bold text-stone-700 flex items-center gap-1.5">
                        <Building2 className="h-4 w-4 text-[#ff9f1c]" />
                        <span>{selectedDetailJob.company}</span>
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedDetailJob(null)}
                    className="p-2 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Comprehensive Meta Specs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-stone-50 p-4 rounded-2xl border border-[#e5e1da] text-right">
                  
                  <div className="space-y-0.5">
                    <span className="text-[11px] text-stone-400 font-bold block">الموقع في إربد:</span>
                    <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5 justify-start">
                      <MapPin className="h-3.5 w-3.5 text-[#ff9f1c]" />
                      {selectedDetailJob.location}
                    </span>
                  </div>

                  {selectedDetailJob.salary && (
                    <div className="space-y-0.5">
                      <span className="text-[11px] text-stone-400 font-bold block">الراتب / الأجر:</span>
                      <span className="text-xs font-black text-emerald-700 flex items-center gap-1.5 justify-start">
                        <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                        {selectedDetailJob.salary}
                      </span>
                    </div>
                  )}

                  {selectedDetailJob.workHours && (
                    <div className="space-y-0.5">
                      <span className="text-[11px] text-stone-400 font-bold block">أوقات العمل والشفت:</span>
                      <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5 justify-start">
                        <Clock className="h-3.5 w-3.5 text-sky-600" />
                        {selectedDetailJob.workHours}
                      </span>
                    </div>
                  )}

                  {selectedDetailJob.experienceLevel && (
                    <div className="space-y-0.5">
                      <span className="text-[11px] text-stone-400 font-bold block">الخبرة المطلوبة:</span>
                      <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5 justify-start">
                        <Award className="h-3.5 w-3.5 text-purple-600" />
                        {selectedDetailJob.experienceLevel}
                      </span>
                    </div>
                  )}

                  {selectedDetailJob.genderPreference && (
                    <div className="space-y-0.5">
                      <span className="text-[11px] text-stone-400 font-bold block">الجنس:</span>
                      <span className="text-xs font-bold text-stone-700 flex items-center gap-1.5 justify-start">
                        <Users className="h-3.5 w-3.5 text-stone-500" />
                        {selectedDetailJob.genderPreference === 'males' ? 'ذكور فقط' : selectedDetailJob.genderPreference === 'females' ? 'إناث فقط' : 'متاح للذكور والإناث'}
                      </span>
                    </div>
                  )}

                </div>

                {/* Benefits if available */}
                {selectedDetailJob.benefits && selectedDetailJob.benefits.length > 0 && (
                  <div className="space-y-2 text-right">
                    <h4 className="font-black text-xs text-stone-700 uppercase tracking-wider">
                      المزايا والحوافز المقدمة:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-emerald-50/40 p-3 rounded-2xl border border-emerald-100">
                      {selectedDetailJob.benefits.map((benefit, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs font-bold text-emerald-950">
                          <Check className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Job Description */}
                <div className="space-y-2 text-right">
                  <h4 className="font-black text-xs text-stone-700 uppercase tracking-wider">
                    الوصف الوظيفي والمسؤوليات:
                  </h4>
                  <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-line bg-white p-4 rounded-2xl border border-stone-200">
                    {selectedDetailJob.description}
                  </p>
                </div>

                {/* Requirements */}
                {selectedDetailJob.requirements && selectedDetailJob.requirements.length > 0 && (
                  <div className="space-y-2 text-right">
                    <h4 className="font-black text-xs text-stone-700 uppercase tracking-wider">
                      المتطلبات والشروط:
                    </h4>
                    <ul className="space-y-2 text-sm text-stone-700 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                      {selectedDetailJob.requirements.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-[#1a4d2e] shrink-0 mt-0.5" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* How to apply */}
                {selectedDetailJob.howToApply && (
                  <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 text-right">
                    <span className="font-black block mb-0.5">طريقة التقديم المحددة من صاحب العمل:</span>
                    <span>{selectedDetailJob.howToApply}</span>
                  </div>
                )}

                {/* Contact & Apply Footer */}
                <div className="pt-4 border-t border-[#e5e1da] flex flex-col sm:flex-row items-center justify-between gap-4 text-right">
                  <div className="text-xs text-stone-500">
                    <span>لأي استفسار يمكنك التواصل مع جهة التوظيف مباشرة:</span>
                    <span className="block font-black text-stone-800 text-sm mt-0.5" dir="ltr">{selectedDetailJob.contactPhone}</span>
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <a
                      href={`https://wa.me/${(selectedDetailJob.contactWhatsapp || selectedDetailJob.contactPhone).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`مرحباً، أود التقدم لوظيفة (${selectedDetailJob.title}) المعلنة على دليل شو في بإربد.`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 sm:flex-initial inline-flex justify-center items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>قدم عبر الواتساب الآن</span>
                    </a>

                    <a
                      href={`tel:${selectedDetailJob.contactPhone}`}
                      className="inline-flex justify-center items-center gap-2 px-4 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-sm rounded-xl transition-colors cursor-pointer"
                    >
                      <Phone className="h-4 w-4" />
                      <span>اتصال</span>
                    </a>
                  </div>
                </div>

              </div>
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
}
